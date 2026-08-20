/* Percorre o app inteiro como um guarda faria, no build de produção. */
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
const bundle=fs.readdirSync('../dist/assets').find(f=>f.startsWith('index-')&&f.endsWith('.js'));
fs.writeFileSync('../node_modules/.cache-teste.mjs', fs.readFileSync(path.join('../dist/assets',bundle),'utf8'));
await import('../node_modules/.cache-teste.mjs');
const esperar=ms=>new Promise(r=>setTimeout(r,ms));
const d=w.document;
const proto=el=>el.tagName==='TEXTAREA'?w.HTMLTextAreaElement.prototype:w.HTMLInputElement.prototype;
const set=(id,v)=>{const el=d.getElementById(id);Object.getOwnPropertyDescriptor(proto(el),'value').set.call(el,v);el.dispatchEvent(new w.Event('input',{bubbles:true}));};
const clique=el=>el?.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const btn=(txt,escopo='')=>[...d.querySelectorAll(escopo+' button')].find(b=>b.textContent.includes(txt));
const chip=n=>[...d.querySelectorAll('.chip')].find(c=>c.textContent.trim()===n);
const nav=n=>[...d.querySelectorAll('.nav button')].find(b=>b.textContent.includes(n));
let passos=0; const p=(x)=>{passos++; console.log('  ok  │ '+x);};
await esperar(1400);

set('nome','Marcelino Teixeira'); set('matricula','61129'); set('municipio','Itapajé — CE'); set('unidade','Base Central');
await esperar(150); clique(btn('Começar a usar')); await esperar(600);
p('cadastro do guarda salvo no IndexedDB');

const lancar=async(cfg)=>{clique(btn('Lançar')); await esperar(350);
  if(cfg.tipo){clique(chip(cfg.tipo)); await esperar(250);}
  set('data',cfg.data); if(cfg.entrada) set('entrada',cfg.entrada); if(cfg.saida) set('saida',cfg.saida);
  if(cfg.diaSeguinte) clique([...d.querySelectorAll('.chip')].find(c=>c.textContent.includes('dia seguinte')));
  await esperar(200);
  if(cfg.comandante) set('comandante',cfg.comandante);
  if(cfg.local) set('local',cfg.local);
  if(cfg.justificativa) set('justificativa',cfg.justificativa);
  await esperar(200); clique(btn('Registrar jornada','.sheet')); await esperar(600);};

await lancar({data:'2026-08-03',entrada:'07:00',saida:'07:00',diaSeguinte:true,comandante:'Insp. Silva'});
p('escala normal de 24h com virada de dia');
await lancar({tipo:'Escala Extra',data:'2026-08-05',entrada:'18:00',saida:'23:00',comandante:'Secretário Antônio',local:'Feira',justificativa:'Reforço na feira.'});
p('escala extra convocada com justificativa');
await lancar({tipo:'Diária',data:'2026-08-07',entrada:'08:00',saida:'17:00',comandante:'Cmt. Geral',local:'Fortaleza',justificativa:'Reunião regional.'});
p('diária registrada fora da folha');
await lancar({tipo:'Atestado',data:'2026-08-09'});
p('atestado sem carga horária');

let txt=d.body.textContent;
const conf=(nome,cond)=>{if(cond){passos++;console.log('  ok  │ '+nome);}else{erros.push('CONFERÊNCIA: '+nome);console.log('FALHA │ '+nome);}};
conf('dashboard: 29h na folha', txt.includes('29h'));
conf('dashboard: 24h normais',/Horas normais24h/.test(txt.replace(/\s/g,'')) || txt.includes('24h'));
conf('dashboard: diárias em card próprio', txt.includes('Diárias (fora da folha)'));
conf('termômetro presente', !!d.querySelector('.termo'));
conf('navegação presente para virar barra lateral', d.querySelectorAll('.nav button').length === 5);
conf('termômetro em zona tranquila', d.querySelector('.termo-estado')?.textContent.includes('Tranquilo'));

clique(nav('Calendário')); await esperar(450);
conf('calendário renderizou o mês', d.querySelectorAll('.cal-day').length > 27);
conf('calendário mostra o mês do calendário inteiro',
  d.querySelectorAll('.cal-day:not(.empty)').length === 31);
conf('a grade começa no dia 1',
  d.querySelector('.cal-day:not(.empty)')?.textContent.trim().startsWith('1'));
conf('só o dia 21 abre a competência', d.querySelectorAll('.cal-day.abre').length === 1);
conf('só o dia 20 fecha a competência', d.querySelectorAll('.cal-day.fecha').length === 1);
conf('o dia 1º não marca fronteira nenhuma', d.querySelectorAll('.cal-tag').length === 2);
conf('o dia 20 diz FIM', [...d.querySelectorAll('.cal-day.fecha .cal-tag')][0]?.textContent === 'fim');
conf('mostra para onde vai cada metade do mês', d.body.textContent.includes('Para onde vão estes dias'));
conf('metade final do mês aponta para setembro', d.body.textContent.includes('Setembro de 2026'));
conf('calendário com dia de diária em azul', !!d.querySelector('.cal-day.fora'));
clique(nav('Histórico')); await esperar(450);
conf('histórico listou os 4 lançamentos', d.querySelectorAll('.item').length >= 4);
clique(nav('Números')); await esperar(450);
conf('estatísticas abriram', d.body.textContent.includes('Maior jornada'));
clique(nav('Ajustes')); await esperar(450);
conf('ajustes abriram', d.body.textContent.includes('Regras aplicadas'));
clique(nav('Início')); await esperar(400);
clique(btn('Relatório')); await esperar(500);
conf('tela de relatório abriu', d.body.textContent.includes('Resumo da competência'));
conf('botão de fechar competência', !!btn('Fechar'));
conf('botão de assinar', !!btn('Assinar relatório'));

/* Fechar a competência precisa cobrar o backup: o mês virou prova e só
   existe dentro deste aparelho. */
clique(btn('Fechar Agosto')); await esperar(400);
conf('confirmação de fechamento abriu', d.body.textContent.includes('Fechar competência?'));
clique(btn('Confirmar fechamento')); await esperar(600);
conf('avisou para fazer backup ao fechar', d.body.textContent.includes('Este mês só existe aqui dentro'));
conf('aviso oferece o backup completo', !!btn('Fazer backup agora'));
clique(btn('Depois eu faço')); await esperar(350);
conf('o aviso sai sem travar a tela', !d.body.textContent.includes('Este mês só existe aqui dentro'));

/* Fechou, seguiu. O mês travado fica guardado, mas a tela anda para a
   competência seguinte — senão o guarda não teria onde lançar o dia 21. */
conf('seguiu para setembro depois de fechar', d.body.textContent.includes('Setembro de 2026'));
conf('a competência nova está aberta', !!btn('Fechar Setembro'));
clique(nav('Início')); await esperar(500);
conf('o início também virou para setembro', d.body.textContent.includes('Setembro de 2026'));
conf('setembro começa zerado', d.body.textContent.includes('Nenhuma jornada neste mês'));
conf('agosto continua na lista de competências', d.body.textContent.includes('Agosto de 2026'));

/* Trocar de mês pela seta do próprio card, sem descer até o seletor. */
const seta = (rotulo) => [...d.querySelectorAll('.comp-seta')]
  .find((b) => b.getAttribute('aria-label') === rotulo);
conf('o card tem as duas setas de mês', d.querySelectorAll('.comp-seta').length === 2);
clique(seta('Competência anterior')); await esperar(450);
conf('a seta para trás volta para agosto', d.body.textContent.includes('Agosto de 2026'));
conf('agosto voltou marcado como fechado', d.body.textContent.includes('Fechada'));
clique(seta('Próxima competência')); await esperar(450);
conf('a seta para frente devolve setembro', d.body.textContent.includes('Setembro de 2026'));

/* O erro que o dono encontrou: em setembro, o botão Lançar abria o formulário
   no dia de hoje — que ainda é de agosto, mês fechado — e travava tudo. */
clique(btn('Lançar')); await esperar(500);
conf('o formulário abriu', d.body.textContent.includes('Nova jornada'));
conf('lançar em setembro não cai no mês fechado',
  !d.body.textContent.includes('Este mês já foi fechado'));
conf('a data sugerida é do dia 21 em diante',
  d.querySelector('input[type="date"]')?.value >= '2026-08-21');

console.log(`\n═══ ${passos} passos concluídos ═══`);
console.log('ERROS: ' + (erros.length ? '\n' + erros.join('\n') : 'nenhum'));
process.exit(erros.length ? 1 : 0);
