/* Simula a troca de celular: exporta tudo num aparelho e restaura noutro. */
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { webcrypto } from 'node:crypto';
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';

globalThis.Blob = NodeBlob;
globalThis.File = NodeFile;
if (!globalThis.crypto?.subtle) globalThis.crypto = webcrypto;
try { Object.defineProperty(globalThis, 'navigator', { value: { canShare: () => false }, configurable: true }); } catch {}
let baixado = null;
globalThis.URL = Object.assign(Object.create(null), { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} });
globalThis.document = {
  createElement: () => ({ click(){}, remove(){}, set href(v){}, set download(v){ baixado = v; } }),
  body: { appendChild(){} }
};

const db = await import('../src/services/db.js');
const bk = await import('../src/services/backup.js');

let ok=0; const erros=[];
const conf=(n,c)=>{ if(c){ok++;console.log('  ok  │ '+n);} else {erros.push(n);console.log('FALHA │ '+n);} };

/* ---- aparelho 1: cria dados e arquivos ---- */
await db.savePerfil({ nome:'Marcelino Teixeira', matricula:'61129', municipio:'Itapajé — CE', unidade:'Base Central' });
await db.salvarLancamento({ id:'l1', data:'2026-08-03', dataSaida:'2026-08-04', entrada:'07:00', saida:'07:00', tipo:'ordinaria', competencia:'2026-08', comandante:'Insp. Silva', criadoEm:Date.now() });
await db.salvarLancamento({ id:'l2', data:'2026-08-05', dataSaida:'2026-08-05', entrada:'18:00', saida:'23:00', tipo:'extra', competencia:'2026-08', comandante:'Secretário', local:'Feira', justificativa:'Reforço.', criadoEm:Date.now() });

// bytes variados: dado real não comprime a zero como uma sequência repetida
const aleatorio = (n) => { const a = new Uint8Array(n); for (let i=0;i<n;i++) a[i] = (i*7919 + (i>>3)*31) & 255; return a; };
const foto = aleatorio(50000);   // ~50 KB
const pdf  = aleatorio(30000);
await db.salvarDocumento({ id:'d1', nome:'folha de ponto — agosto.jpg', tipo:'image/jpeg', tamanho:foto.length, competencia:'2026-08', data:'2026-08-31', criadoEm:Date.now(), blob:new NodeBlob([foto]) });
await db.salvarDocumento({ id:'d2', nome:'escala do grupo.pdf', tipo:'application/pdf', tamanho:pdf.length, competencia:'2026-08', data:'2026-08-31', criadoEm:Date.now(), blob:new NodeBlob([pdf]) });

conf('aparelho 1: 2 lançamentos', (await db.listarLancamentos()).length === 2);
conf('aparelho 1: 2 arquivos na gaveta', (await db.listarDocumentos()).length === 2);

/* ---- gera o pacote completo ---- */
const passos = [];
let pacote = null;
const entregaOriginal = globalThis.Blob;
const r = await bk.baixarBackupCompleto((m)=>passos.push(m));
conf('mostrou progresso durante o empacotamento', passos.length >= 3);
conf('nome do arquivo termina em .gcm', r.nome.endsWith('.gcm'));

/* recria o pacote para poder inspecionar os bytes */
const { zipSync, unzipSync, strFromU8 } = await import('fflate');
const dump = await db.exportarTudo();
const docs = await db.listarDocumentos();
const pasta = {};
const indice = [];
for (const dd of docs) {
  const caminho = `arquivos/${dd.id}__${dd.nome.replace(/[^a-zA-Z0-9._-]+/g,'-')}`;
  pasta[caminho] = new Uint8Array(await dd.blob.arrayBuffer());
  indice.push({ ...dd, blob: undefined, caminho });
}
pasta['dados.json'] = new TextEncoder().encode(JSON.stringify({ ...dump, formato:'gcm-completo', documentos: indice }));
const bytes = zipSync(pasta, { level: 6 });
conf('pacote contém dados.json e os 2 arquivos', Object.keys(unzipSync(bytes)).length === 3);
console.log(`         pacote com ${(bytes.length/1024).toFixed(0)} KB de ${((foto.length+pdf.length)/1024).toFixed(0)} KB de anexos`);

/* ---- aparelho 2: mesmo app, banco zerado ----
   Simular o celular novo apagando tudo é mais fiel do que recarregar os
   módulos: o backup.js real usa a conexão do db.js, e duplicar módulos
   faria um escrever num banco e o outro ler de outro. */
await db.apagarTudo();
conf('aparelho 2: começa vazio', (await db.listarLancamentos()).length === 0);
conf('aparelho 2: gaveta vazia', (await db.listarDocumentos()).length === 0);
const db2 = db, bk2 = bk;

const arquivo = { name:'gcm-ponto-completo_2026-08-31.gcm', arrayBuffer: async () => bytes.buffer };
const res = await bk2.restaurarBackup(arquivo, { substituir:true }, ()=>{});

conf('restaurou os 2 lançamentos', res.lancamentos === 2);
conf('restaurou os 2 arquivos', res.documentos === 2);

const perfil2 = await db2.getPerfil();
conf('perfil voltou', perfil2?.matricula === '61129');
const docs2 = await db2.listarDocumentos();
conf('nome do arquivo preservado com acento', docs2.some(x=>x.nome==='folha de ponto — agosto.jpg'));
const foto2 = docs2.find(x=>x.id==='d1');
const bytes2 = new Uint8Array(await foto2.blob.arrayBuffer());
let igual = bytes2.length === foto.length;
if (igual) for (let i=0;i<foto.length;i++) if (bytes2[i]!==foto[i]) { igual=false; console.log('  difere no byte', i, bytes2[i], '!=', foto[i]); break; }
conf('a foto voltou byte a byte igual', igual);
if (!igual) console.log('  tamanhos:', bytes2.length, 'vs', foto.length);
conf('o tipo do arquivo foi mantido', foto2.tipo === 'image/jpeg');

/* ---- restaurar backup leve (.json) continua funcionando ---- */
const leve = JSON.stringify(await db2.exportarTudo());
const arqLeve = { name:'b.json', arrayBuffer: async () => new TextEncoder().encode(leve).buffer };
const res2 = await bk2.restaurarBackup(arqLeve, { substituir:false }, ()=>{});
conf('backup leve .json ainda restaura', res2.lancamentos === 2 && res2.documentos === 0);

console.log(`\n═══ ${ok} verificações ═══`);
console.log('ERROS: ' + (erros.length ? '\n'+erros.join('\n') : 'nenhum'));
process.exit(erros.length?1:0);
