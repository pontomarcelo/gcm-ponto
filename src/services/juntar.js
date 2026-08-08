/**
 * GCM Ponto — Junção de duas versões dos dados.
 *
 * O guarda lança no celular e no computador. Cada aparelho tem a sua cópia, e
 * o Drive guarda uma terceira. Este arquivo decide quem ganha quando as duas
 * discordam. Não fala com o Drive nem com o banco: recebe dois montes de dados
 * e devolve um. Isso é de propósito — assim dá para testar a regra inteira sem
 * internet e sem navegador, que é a parte que não pode errar.
 *
 * As regras, em ordem de importância:
 *
 *  1. NADA SOME POR ACIDENTE. Um lançamento que existe de um lado e não do
 *     outro é mantido. A ausência não é ordem de apagar — pode ser só um
 *     aparelho que ainda não soube.
 *
 *  2. APAGAR É EXPLÍCITO. Quando o guarda exclui um lançamento, fica uma
 *     lápide: o id e a hora da exclusão. É a lápide que apaga do outro
 *     aparelho, não a ausência. Sem isso, o registro voltaria do Drive na
 *     abertura seguinte, e o guarda apagaria o mesmo lançamento para sempre.
 *
 *  3. O MAIS RECENTE GANHA. Editou nos dois lugares? Vale a última edição,
 *     pelo carimbo de hora do próprio registro.
 *
 *  4. RESSUSCITAR VALE. Se a lápide é de ontem e a edição é de hoje, o guarda
 *     apagou e depois lançou de novo. A edição mais nova vence a lápide.
 */

/**
 * Folga para diferença de relógio entre os aparelhos.
 *
 * Celular e computador raramente marcam o mesmo minuto. Sem folga, um relógio
 * adiantado faria um registro velho parecer mais novo que a exclusão, e o
 * lançamento apagado voltaria sozinho. Para vencer uma lápide, a edição
 * precisa ser mais nova com folga — não por um segundo de diferença.
 *
 * Dois minutos cobrem o desencontro normal. Refazer um lançamento leva mais
 * tempo que isso, então quem apagou e lançou de novo de verdade não é afetado.
 */
const MARGEM_RELOGIO = 2 * 60 * 1000;

/** Carimbo de hora de um lançamento. Registros antigos podem não ter. */
const carimboLancamento = (l) => l?.atualizadoEm || l?.criadoEm || 0;

/**
 * Carimbo de uma competência. Os registros mais antigos não têm campo próprio,
 * então vale o mais recente entre fechar, reabrir e assinar.
 */
const carimboCompetencia = (c) => c?.atualizadoEm
  || Math.max(c?.fechadaEm || 0, c?.reabertaEm || 0, c?.assinatura?.assinadoEm || 0);

const carimboPerfil = (p) => p?.atualizadoEm || 0;

/** Junta duas listas de registros com id, ficando com o carimbo mais alto. */
function maisRecentePorId(a = [], b = [], carimbo) {
  const mapa = new Map();
  [...a, ...b].forEach((item) => {
    if (!item?.id) return;
    const atual = mapa.get(item.id);
    if (!atual || carimbo(item) > carimbo(atual)) mapa.set(item.id, item);
  });
  return [...mapa.values()];
}

/** Junta as lápides: mesmo id, fica a exclusão mais recente. */
export function juntarExcluidos(a = [], b = []) {
  const mapa = new Map();
  [...a, ...b].forEach((e) => {
    if (!e?.id) return;
    const atual = mapa.get(e.id);
    if (!atual || (e.em || 0) > (atual.em || 0)) mapa.set(e.id, { id: e.id, em: e.em || 0 });
  });
  return [...mapa.values()];
}

/**
 * Recebe os dados deste aparelho e os do Drive, devolve a versão única.
 * Cada lado é `{ perfil, lancamentos, competencias, excluidos }`.
 */
export function juntar(local = {}, remoto = {}) {
  const excluidos = juntarExcluidos(local.excluidos, remoto.excluidos);
  const lapide = new Map(excluidos.map((e) => [e.id, e.em || 0]));

  const candidatos = maisRecentePorId(
    local.lancamentos, remoto.lancamentos, carimboLancamento
  );

  /* A lápide só perde para uma edição claramente posterior. Na dúvida, quem
     manda é a exclusão — foi uma ordem do guarda, e ele veria o registro
     voltar; já uma hora de serviço perdida, ele não veria. */
  const lancamentos = candidatos.filter((l) => {
    const em = lapide.get(l.id);
    return em === undefined || carimboLancamento(l) > em + MARGEM_RELOGIO;
  });

  /* A lápide que já foi vencida por uma edição mais nova não serve mais. */
  const vivos = new Set(lancamentos.map((l) => l.id));
  const excluidosUteis = excluidos.filter((e) => !vivos.has(e.id));

  const competencias = maisRecentePorId(
    local.competencias, remoto.competencias, carimboCompetencia
  );

  const perfilLocal = local.perfil || null;
  const perfilRemoto = remoto.perfil || null;
  const perfil = carimboPerfil(perfilRemoto) > carimboPerfil(perfilLocal)
    ? perfilRemoto : (perfilLocal || perfilRemoto);

  lancamentos.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));

  return { perfil, lancamentos, competencias, excluidos: excluidosUteis };
}

/**
 * Diz se a junção trouxe alguma novidade em relação a um dos lados.
 * Serve para o app só gravar quando há o que gravar — tanto no banco local
 * quanto no Drive, evitando escrita à toa.
 */
export function mudou(antes = {}, depois = {}) {
  const assinatura = (d) => JSON.stringify({
    p: carimboPerfil(d.perfil),
    l: (d.lancamentos || []).map((x) => `${x.id}:${carimboLancamento(x)}`).sort(),
    c: (d.competencias || []).map((x) => `${x.id}:${carimboCompetencia(x)}`).sort(),
    e: (d.excluidos || []).map((x) => `${x.id}:${x.em}`).sort()
  });
  return assinatura(antes) !== assinatura(depois);
}
