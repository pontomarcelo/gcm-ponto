/* Guarda regras de CSS que já quebraram o app antes.
   Layout não dá para testar sem navegador, mas dá para garantir que a
   regra que consertou o bug continua no arquivo. */
import fs from 'fs';
const css = fs.readFileSync('../dist/assets/' +
  fs.readdirSync('../dist/assets').find(f => f.endsWith('.css')), 'utf8');

let ok = 0; const erros = [];
const conf = (n, c) => { if (c) { ok++; console.log('  ok  │ ' + n); } else { erros.push(n); console.log('FALHA │ ' + n); } };

conf('grade do calendário usa minmax(0,1fr) — sem isso ela estoura o card',
  /repeat\(7,\s*minmax\(0,\s*1fr\)\)/.test(css));

conf('células do calendário com min-width:0',
  /\.cal-day\{[^}]*min-width:0/.test(css));

conf('sem backdrop-filter na janela — quebra empilhamento no WebKit',
  !/\.sheet-bg\{[^}]*backdrop-filter/.test(css));

conf('html tem cor de fundo própria — senão vaza azul ao rolar',
  /html\{background:var\(--bg\)\}/.test(css));

conf('altura mínima, não travada em 100%',
  /html,body,#root\{min-height:100%\}/.test(css));

conf('cards NÃO cortam o conteúdo (ponteiro do termômetro fica na borda)',
  !/^\.card\{overflow:hidden/.test(css) && !/\.card\{overflow:hidden/.test(css));

conf('atalhos se reorganizam sozinhos — 5 fixos não cabem em tela estreita',
  /\.quick\{[^}]*repeat\(auto-fit,minmax\(74px,1fr\)\)/.test(css));

conf('navegação inferior com minmax(0,1fr)',
  /\.nav\{[^}]*repeat\(5,minmax\(0,1fr\)\)/.test(css));

// o minificador troca translateX(-100%) por translate(-100%): aceitar os dois
conf('rótulo do teto na régua do termômetro não vaza',
  /\.termo-regua span:last-child\{transform:translate(X)?\(-100%\)\}/.test(css));

conf('abertura e fechamento da competência marcados na grade',
  /\.cal-day\.abre\{box-shadow:inset 3px 0 0 var\(--gold\)\}/.test(css)
  && /\.cal-day\.fecha\{box-shadow:inset -3px 0 0 var\(--gold\)\}/.test(css));

conf('três larguras de layout definidas',
  ['720px', '1024px', '1500px'].every((l) => css.includes(l)));

console.log(`\n═══ ${ok} verificações ═══`);
console.log('ERROS: ' + (erros.length ? '\n' + erros.join('\n') : 'nenhum'));
process.exit(erros.length ? 1 : 0);
