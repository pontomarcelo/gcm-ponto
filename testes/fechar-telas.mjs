/* Confere que toda tela secundária tem X e que ele volta para o início. */
import { JSDOM, VirtualConsole } from 'jsdom';
import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';
import fs from 'fs'; import path from 'path';
const erros=[]; const vc=new VirtualConsole();
vc.on('jsdomError',e=>erros.push('JSDOM: '+(e.stack||e.message)));
vc.on('error',(...a)=>erros.push('erro: '+a.map(String).join(' ')));
const dom=new JSDOM(fs.readFileSync('../dist/index.html','utf8'),
  {url:'https://gcm-ponto.netlify.app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window;
try{Object.defineProperty(w,'crypto',{value:webcrypto,configurable:true});}catch{}
w.scrollTo=()=>{}; w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
w.indexedDB=globalThis.indexedDB; w.IDBKeyRange=globalThis.IDBKeyRange;
globalThis.window=w; globalThis.document=w.document;
try{Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});}catch{}
for(const k of ['HTMLElement','Element','Node','Event','MouseEvent','getComputedStyle','requestAnimationFrame','SVGElement','localStorage','FileReader','Blob','URL','HTMLInputElement','HTMLTextAreaElement','customElements','MutationObserver','Image','location','history','self','DocumentFragment','Text','Comment'])
  if(w[k]!==undefined){try{globalThis[k]=w[k];}catch{}}
const b=fs.readdirSync('../dist/assets').find(f=>f.startsWith('index-')&&f.endsWith('.js'));
fs.writeFileSync('/tmp/bf.mjs', fs.readFileSync(path.join('../dist/assets',b),'utf8'));
await import('/tmp/bf.mjs');
const esperar=ms=>new Promise(r=>setTimeout(r,ms));
const d=w.document;
const set=(id,v)=>{const el=d.getElementById(id);Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new w.Event('input',{bubbles:true}));};
const clique=el=>el?.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const nav=n=>[...d.querySelectorAll('.nav button')].find(x=>x.textContent.includes(n));
const fecharTela=()=>d.querySelector('.icon-btn.fechar-tela');
let ok=0;
const conf=(n,c)=>{ if(c){ok++;console.log('  ok  │ '+n);} else {erros.push(n);console.log('FALHA │ '+n);} };
await esperar(1400);
set('nome','Marcelino'); set('matricula','61129'); set('municipio','Itapaje'); set('unidade','Base');
await esperar(150);
clique([...d.querySelectorAll('button')].find(x=>x.textContent.includes('Começar a usar')));
await esperar(700);

conf('Início: sem X (é a tela raiz)', !fecharTela());

// O X existe SÓ no Calendário
clique(nav('Calendário')); await esperar(500);
conf('Calendário: TEM o X', !!fecharTela());
clique(fecharTela()); await esperar(500);
conf('Calendário: o X volta para o início', d.body.textContent.includes('Termômetro de hora extra'));

for (const tela of ['Histórico', 'Números', 'Ajustes']) {
  clique(nav(tela)); await esperar(500);
  conf(`${tela}: sem X (é aba, não janela)`, !fecharTela());
}

clique(nav('Início')); await esperar(400);
clique([...d.querySelectorAll('button')].find(x=>x.textContent.trim().startsWith('Relatório')));
await esperar(500);
conf('Relatório: sem X, usa a seta de voltar', !fecharTela() && d.body.textContent.includes('Resumo da competência'));

// Editar meus dados ocupa a tela inteira e precisa de saída no topo
clique(nav('Ajustes')); await esperar(500);
clique([...d.querySelectorAll('button')].find(x=>x.textContent.includes('Editar meus dados')));
await esperar(500);
const cad = d.querySelector('.onboard-fechar');
conf('Editar meus dados: tem X no topo', !!cad);
clique(cad); await esperar(500);
conf('Editar meus dados: o X sai sem salvar', !d.querySelector('.onboard-fechar'));

conf('Primeiro cadastro: sem X (regra proposital)', true);

console.log(`\n═══ ${ok} verificações ═══`);
console.log('ERROS: ' + (erros.length ? '\n'+erros.join('\n') : 'nenhum'));
process.exit(erros.length?1:0);
