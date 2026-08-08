/* Confere que uma falha de carregamento vira mensagem na tela. */
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
const dom = new JSDOM(fs.readFileSync('../dist/index.html','utf8'),
  { url:'https://gcm-ponto.netlify.app/', runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:new VirtualConsole() });
const w = dom.window;

// 1) script que não baixa
const s = w.document.createElement('script');
s.src = '/assets/index-INEXISTENTE.js';
w.document.body.appendChild(s);
s.dispatchEvent(new w.Event('error', { bubbles: false }));
await new Promise(r => setTimeout(r, 100));
const p1 = w.document.getElementById('painel-erro');
console.log('falha de download → mostrou?', !!p1);
console.log('  título :', p1?.querySelector('strong')?.textContent);
console.log('  detalhe:', p1?.querySelector('pre')?.textContent);

// 2) erro de execução
p1?.remove();
w.dispatchEvent(Object.assign(new w.Event('error'), { message: 'undefined is not an object', filename: 'https://x/assets/index-abc.js', lineno: 42 }));
await new Promise(r => setTimeout(r, 100));
const p2 = w.document.getElementById('painel-erro');
console.log('erro de execução → mostrou?', !!p2);
console.log('  detalhe:', JSON.stringify(p2?.querySelector('pre')?.textContent));

// 3) app montou: nada deve aparecer
p2?.remove();
w.__gcmMontou = true;
w.dispatchEvent(Object.assign(new w.Event('error'), { message: 'ruído depois de montar' }));
await new Promise(r => setTimeout(r, 100));
console.log('depois de montar → ficou quieto?', !w.document.getElementById('painel-erro'));
process.exit(0);
