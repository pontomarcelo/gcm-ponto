/* Percorre TODAS as janelas do app e confere que cada uma fecha. */
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
fs.writeFileSync('/tmp/bj.mjs', fs.readFileSync(path.join('../dist/assets',b),'utf8'));
await import('/tmp/bj.mjs');
const esperar=ms=>new Promise(r=>setTimeout(r,ms));
const d=w.document;
const proto=el=>el.tagName==='TEXTAREA'?w.HTMLTextAreaElement.prototype:w.HTMLInputElement.prototype;
const set=(id,v)=>{const el=d.getElementById(id);Object.getOwnPropertyDescriptor(proto(el),'value').set.call(el,v);el.dispatchEvent(new w.Event('input',{bubbles:true}));};
const clique=el=>el?.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const btn=(t,e='')=>[...d.querySelectorAll(e+' button')].find(x=>x.textContent.includes(t));
const nav=n=>[...d.querySelectorAll('.nav button')].find(x=>x.textContent.includes(n));
let ok=0;
const conf=(n,c)=>{ if(c){ok++;console.log('  ok  │ '+n);} else {erros.push(n);console.log('FALHA │ '+n);} };
await esperar(1400);
set('nome','Marcelino'); set('matricula','61129'); set('municipio','Itapaje'); set('unidade','Base');
await esperar(150); clique(btn('Começar a usar')); await esperar(600);

/** abre uma janela, confere os 3 botões, testa o × e garante que sumiu */
async function testarJanela(nome, abrir) {
  await abrir(); await esperar(450);
  const sheet = d.querySelector('.sheet');
  if (!sheet) { erros.push(nome+': não abriu'); console.log('FALHA │ '+nome+' não abriu'); return; }
  const bg = d.querySelector('.sheet-bg');
  const noBody = bg?.parentElement === d.body;
  const botoes = [...sheet.querySelectorAll('.sheet-btn')].map(x=>x.getAttribute('aria-label'));
  const temFechar = botoes.includes('Fechar');
  conf(`${nome}: montada no body (fora da página)`, noBody);
  conf(`${nome}: tem Minimizar, Maximizar e Fechar`, botoes.length===3 && temFechar);
  clique([...sheet.querySelectorAll('.sheet-btn')].find(x=>x.getAttribute('aria-label')==='Fechar'));
  await esperar(350);
  conf(`${nome}: o × fecha`, !d.querySelector('.sheet'));
}

await testarJanela('Novo lançamento', async()=>clique(btn('Lançar')));
await testarJanela('Competência', async()=>{ const t=[...d.querySelectorAll('button')].find(x=>x.textContent.includes('Agosto de 2026')); clique(t); });
// cria um lançamento para abrir a janela do dia no calendário
clique(btn('Lançar')); await esperar(400);
set('data','2026-08-12'); set('entrada','07:00'); set('saida','13:00'); await esperar(200);
clique(btn('Registrar jornada','.sheet')); await esperar(600);
clique(nav('Calendário')); await esperar(450);
await testarJanela('Dia do calendário', async()=>clique([...d.querySelectorAll('.cal-day')].find(x=>x.textContent.trim().startsWith('12'))));
clique(nav('Início')); await esperar(400);
clique(btn('Relatório')); await esperar(500);
await testarJanela('Assinar relatório', async()=>clique(btn('Assinar relatório')));
await testarJanela('Fechar competência', async()=>clique(btn('Fechar Agosto')));
clique(nav('Ajustes')); await esperar(450);
await testarJanela('Apagar dados', async()=>clique(btn('Apagar todos os dados')));

console.log(`\n═══ ${ok} verificações ═══`);
console.log('ERROS: ' + (erros.length ? '\n'+erros.join('\n') : 'nenhum'));
process.exit(erros.length?1:0);
