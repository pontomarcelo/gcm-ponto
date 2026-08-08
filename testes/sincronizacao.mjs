/**
 * O que o banco local passou a fazer por causa da sincronização.
 * Roda com IndexedDB de mentira, sem navegador e sem internet.
 */
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

globalThis.indexedDB = new IDBFactory();

const db = await import('../src/services/db.js');
const { juntar } = await import('../src/services/juntar.js');

let ok = 0; const erros = [];
const conf = (nome, cond) => {
  if (cond) { ok++; console.log('  ok  │ ' + nome); }
  else { erros.push(nome); console.log('FALHA │ ' + nome); }
};

const L = (id, data, em = Date.now()) => ({
  id, data, competencia: data.slice(0, 7), tipo: 'ordinaria',
  entrada: '07:00', saida: '19:00', criadoEm: em, atualizadoEm: em
});
const ONTEM = Date.now() - 24 * 3600 * 1000;

console.log('\n── LÁPIDES ──────────────────────────────────────────────────');

await db.salvarLancamento(L('a', '2026-08-03'));
await db.salvarLancamento(L('b', '2026-08-05'));
conf('dois lançamentos gravados', (await db.listarLancamentos()).length === 2);
conf('nenhuma lápide ainda', (await db.listarExcluidos()).length === 0);

await db.excluirLancamento('a');
conf('sobrou um lançamento', (await db.listarLancamentos()).length === 1);
conf('a exclusão deixou lápide', (await db.listarExcluidos()).length === 1);
conf('a lápide guarda o id certo', (await db.listarExcluidos())[0].id === 'a');
conf('a lápide guarda a hora', (await db.listarExcluidos())[0].em > 0);

console.log('\n── RETRATO PARA SINCRONIZAR ─────────────────────────────────');

await db.savePerfil({ nome: 'Marcelino Teixeira', matricula: '61129' });
const retrato = await db.exportarParaSincronizar();
conf('leva o perfil', retrato.perfil?.matricula === '61129');
conf('leva os lançamentos', retrato.lancamentos.length === 1);
conf('leva as lápides', retrato.excluidos.length === 1);
conf('leva as competências', Array.isArray(retrato.competencias));
conf('NÃO leva o PIN nem a gaveta',
  !('config' in retrato) && !('documentos' in retrato));

console.log('\n── GRAVAR O RESULTADO DA JUNÇÃO ─────────────────────────────');

/* Simula o outro aparelho: tem o "b", tem um "c" que este não conhece, e não
   sabe do "a" apagado. */
const doOutroAparelho = {
  perfil: { id: 'me', nome: 'Marcelino T.', matricula: '61129', atualizadoEm: 1 },
  /* O 'a' é a cópia velha, de antes de o guarda apagar: carimbo de ontem. */
  lancamentos: [L('a', '2026-08-03', ONTEM), L('b', '2026-08-05', ONTEM), L('c', '2026-08-09')],
  competencias: [{ id: '2026-08', fechada: true, fechadaEm: 500, atualizadoEm: 500 }],
  excluidos: []
};

const junto = juntar(await db.exportarParaSincronizar(), doOutroAparelho);
await db.aplicarSincronizado(junto);

const depois = await db.listarLancamentos();
const idsDepois = depois.map((l) => l.id).sort();
conf('o lançamento novo do outro aparelho chegou', idsDepois.includes('c'));
conf('o que estava nos dois continua', idsDepois.includes('b'));
conf('o apagado NÃO ressuscitou', !idsDepois.includes('a'));
conf('ficaram exatamente dois', depois.length === 2);
conf('a competência fechada veio junto', (await db.listarCompetencias()).length === 1);
conf('o perfil mais recente foi mantido', (await db.getPerfil())?.nome === 'Marcelino Teixeira');
conf('a lápide segue guardada', (await db.listarExcluidos()).some((e) => e.id === 'a'));

console.log('\n── SEGUNDA RODADA NÃO DESFAZ A PRIMEIRA ─────────────────────');

const junto2 = juntar(await db.exportarParaSincronizar(), doOutroAparelho);
await db.aplicarSincronizado(junto2);
const idsFinal = (await db.listarLancamentos()).map((l) => l.id).sort();
conf('o apagado continua apagado depois de sincronizar de novo', !idsFinal.includes('a'));
conf('nada foi duplicado', idsFinal.length === 2);

console.log('\n── APAGAR TUDO LIMPA AS LÁPIDES ─────────────────────────────');

await db.apagarTudo();
conf('lançamentos zerados', (await db.listarLancamentos()).length === 0);
conf('lápides zeradas', (await db.listarExcluidos()).length === 0);

console.log('\n── O GOOGLE NÃO PODE PERGUNTAR A CONTA TODA HORA ────────────');

/* Com cinco contas logadas no navegador, o Google abre a lista de contas a cada
   renovação de permissão — de hora em hora — se o app não disser qual usar.
   Estas três linhas são o que mantém a renovação silenciosa. */
const fsD = await import('node:fs');
const dv = fsD.readFileSync(new URL('../src/services/drive.js', import.meta.url), 'utf8');
conf('o app avisa ao Google qual conta usar', /hint: conta \|\| undefined/.test(dv));
conf('e não abre o seletor de contas', /select_account: false/.test(dv));
conf('a conta escolhida fica guardada', /setConfig\('driveConta', conta\)/.test(dv));
conf('desconectar limpa a conta guardada', /setConfig\('driveConta', null\)/.test(dv));
conf('a tela de permissão só aparece sem conta conhecida',
  /prompt: \(interativo && !conta\)/.test(dv));

console.log('\n── O CACHE NÃO PODE ENGOLIR O DRIVE ─────────────────────────');

/* O service worker guarda tudo em cache. Se guardar também a resposta do
   Drive, a sincronização lê a mesma versão velha para sempre e o guarda não
   percebe. Esta regra é fácil de remover sem querer numa limpeza. */
const fs = await import('node:fs');
const sw = fs.readFileSync(new URL("../public/service-worker.js", import.meta.url), "utf8");
conf('service worker deixa o Drive passar direto', /googleapis\.com.*&&\s*!ehFonte/.test(sw));
conf('service worker deixa o login do Google passar direto', sw.includes("'accounts.google.com'"));
conf('e sai antes da regra de cache', /if \(ehGoogleAPI\) return;/.test(sw));

console.log(`\n═══ ${ok} verificações ═══`);
console.log('ERROS: ' + (erros.length ? '\n' + erros.join('\n') : 'nenhum'));
process.exit(erros.length ? 1 : 0);
