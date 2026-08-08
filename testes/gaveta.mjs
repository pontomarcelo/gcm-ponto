/* Testa a gaveta: guardar, listar, abrir, fechar, apagar. */
import { JSDOM, VirtualConsole } from 'jsdom';
import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';
import fs from 'fs'; import path from 'path';
const erros=[]; const vc=new VirtualConsole();
vc.on('jsdomError',e=>{const t=e.stack||e.message; if(!t.includes('getContext')) erros.push('JSDOM: '+t);});
vc.on('error',(...a)=>{const t=a.map(String).join(' '); if(!t.includes('Not implemented') && !t.includes('getContext')) erros.push('erro: '+t);});
const dom=new JSDOM(fs.readFileSync('../dist/index.html','utf8'),
  {url:'https://gcm-ponto.netlify.app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window;
try{Object.defineProperty(w,'crypto',{value:webcrypto,configurable:true});}catch{}
w.scrollTo=()=>{}; w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
w.indexedDB=globalThis.indexedDB; w.IDBKeyRange=globalThis.IDBKeyRange;
w.URL.createObjectURL = () => 'blob:falso'; w.URL.revokeObjectURL = () => {};
globalThis.window=w; globalThis.document=w.document;
try{Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});}catch{}
for(const k of ['HTMLElement','Element','Node','Event','MouseEvent','getComputedStyle','requestAnimationFrame','SVGElement','localStorage','FileReader','Blob','File','URL','HTMLInputElement','HTMLTextAreaElement','customElements','MutationObserver','Image','location','history','self','DocumentFragment','Text','Comment'])
  if(w[k]!==undefined){try{globalThis[k]=w[k];}catch{}}
const b=fs.readdirSync('../dist/assets').find(f=>f.startsWith('index-')&&f.endsWith('.js'));
fs.writeFileSync('/tmp/bg.mjs', fs.readFileSync(path.join('../dist/assets',b),'utf8'));
await import('/tmp/bg.mjs');
const esperar=ms=>new Promise(r=>setTimeout(r,ms));
const d=w.document;
const set=(id,v)=>{const el=d.getElementById(id);Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new w.Event('input',{bubbles:true}));};
const clique=el=>el?.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const btn=(t,e='')=>[...d.querySelectorAll(e+' button')].find(x=>x.textContent.includes(t));
let ok=0; const conf=(n,c)=>{ if(c){ok++;console.log('  ok  │ '+n);} else {erros.push(n);console.log('FALHA │ '+n);} };
await esperar(1400);
set('nome','Marcelino'); set('matricula','61129'); set('municipio','Itapaje'); set('unidade','Base');
await esperar(150); clique(btn('Começar a usar')); await esperar(700);

conf('atalho "Gaveta" no início', !!btn('Gaveta'));
clique(btn('Gaveta')); await esperar(700);
conf('a gaveta abriu', d.body.textContent.includes('Guardar arquivo'));
conf('avisa que fica só no aparelho', d.body.textContent.includes('só neste aparelho'));
conf('gaveta começa vazia', d.body.textContent.includes('Gaveta vazia neste mês'));

/* simula escolher 2 arquivos da galeria: uma foto e um PDF */
const input = d.querySelector('input[type=file]');
const foto = new w.File([new Uint8Array(2048)], 'folha-ponto-agosto.jpg', { type: 'image/jpeg' });
const pdf  = new w.File([new Uint8Array(4096)], 'escala-do-grupo.pdf', { type: 'application/pdf' });
Object.defineProperty(input, 'files', { value: [foto, pdf], configurable: true });
input.dispatchEvent(new w.Event('change', { bubbles: true }));
await esperar(1200);

conf('os 2 arquivos entraram', d.querySelectorAll('.gaveta-item').length === 2);
conf('mostra o nome da foto', d.body.textContent.includes('folha-ponto-agosto.jpg'));
conf('mostra o nome do PDF', d.body.textContent.includes('escala-do-grupo.pdf'));
conf('PDF sem miniatura mostra a extensão', d.body.textContent.includes('PDF'));

/* abrir o PDF */
const itens = [...d.querySelectorAll('.gaveta-item')];
clique(itens.find(x => x.textContent.includes('escala-do-grupo')));
await esperar(500);
conf('abriu o visualizador', !!d.querySelector('.sheet'));
conf('visualizador está fora da página', d.querySelector('.sheet-bg')?.parentElement === d.body);
const fechar = [...d.querySelectorAll('.sheet-btn')].find(x=>x.getAttribute('aria-label')==='Fechar');
conf('tem botão de fechar', !!fechar);
conf('tem botão de salvar na galeria', !!btn('Salvar na galeria','.sheet'));
conf('tem botão de baixar', !!btn('Baixar','.sheet'));
conf('tem botão de apagar', !!btn('Apagar da gaveta','.sheet'));
clique(fechar); await esperar(400);
conf('o X fecha o visualizador', !d.querySelector('.sheet'));

/* apagar um */
clique([...d.querySelectorAll('.gaveta-item')][0]); await esperar(450);
clique(btn('Apagar da gaveta','.sheet')); await esperar(300);
clique([...d.querySelectorAll('.sheet .btn-danger')].pop()); await esperar(800);
conf('sobrou 1 arquivo depois de apagar', d.querySelectorAll('.gaveta-item').length === 1);

/* persistência: recarrega a lista do banco */
clique([...d.querySelectorAll('.nav button')].find(x=>x.textContent.includes('Início'))); await esperar(400);
clique(btn('Gaveta')); await esperar(800);
conf('o arquivo continua lá depois de sair e voltar', d.querySelectorAll('.gaveta-item').length === 1);

console.log(`\n═══ ${ok} verificações ═══`);
console.log('ERROS: ' + (erros.length ? '\n'+erros.join('\n') : 'nenhum'));
process.exit(erros.length?1:0);
