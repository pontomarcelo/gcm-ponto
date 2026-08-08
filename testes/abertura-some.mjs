/* Simula o cenário do bug: main.jsx ANTIGO, que não sabe remover a abertura.
   O app monta em #root e a abertura precisa sumir mesmo assim. */
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
const dom = new JSDOM(fs.readFileSync('../dist/index.html','utf8'),
  { url:'https://gcm-ponto.netlify.app/', runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:new VirtualConsole() });
const w = dom.window, d = w.document;

console.log('início        → abertura na tela?', !!d.getElementById('abertura'));

// React monta sem tocar na abertura (comportamento do main.jsx antigo)
const app = d.createElement('div');
app.textContent = 'Bem-vindo, guarda';
d.getElementById('root').appendChild(app);
console.log('app montou    → abertura ainda lá?', !!d.getElementById('abertura'));

await new Promise(r => setTimeout(r, 250));
console.log('250ms depois  → marcada para sair?', d.getElementById('abertura')?.className || '(removida)');
await new Promise(r => setTimeout(r, 400));
console.log('650ms depois  → abertura removida?', !d.getElementById('abertura'));
console.log('app visível   →', d.getElementById('root').textContent);
process.exit(d.getElementById('abertura') ? 1 : 0);
