import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import * as db from '../services/db.js';
import * as drive from '../services/drive.js';
import {
  calcularCompetencia, competenciaAtual, competenciaDe, estatisticas, novoId,
  proximaCompetencia
} from '../services/calc.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

/**
 * A competência passou a ser 21→20. Lançamentos gravados antes dessa mudança
 * carregam o carimbo do mês do calendário — um serviço do dia 25 de julho está
 * marcado como julho, quando pertence a agosto.
 *
 * Isto corrige o carimbo uma vez só, na abertura. A DATA do serviço nunca é
 * tocada: só o mês a que ele pertence. Roda em silêncio e, quando não há nada
 * fora do lugar, não escreve no banco.
 */
async function recarimbar(lista) {
  const fora = lista.filter((l) => l.data && l.competencia !== competenciaDe(l.data));
  if (!fora.length) return lista;

  const corrigidos = fora.map((l) => ({ ...l, competencia: competenciaDe(l.data) }));
  await Promise.all(corrigidos.map((l) => db.salvarLancamento(l)));

  const porId = new Map(corrigidos.map((l) => [l.id, l]));
  return lista.map((l) => porId.get(l.id) || l);
}

export function AppProvider({ children }) {
  const [pronto, setPronto] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [fechamentos, setFechamentos] = useState([]);
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [tema, setTema] = useState('light');
  const [toast, setToast] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSync, setUltimaSync] = useState(null);
  const agendado = useRef(null);

  /* --------------------------------------------------------- Carga inicial */
  useEffect(() => {
    (async () => {
      try {
        const [p, l, c, t] = await Promise.all([
          db.getPerfil(), db.listarLancamentos(), db.listarCompetencias(), db.getConfig('tema', 'light')
        ]);
        setPerfil(p || null);
        setLancamentos(await recarimbar(l || []));
        setFechamentos(c || []);
        setTema(t || 'light');
      } catch (e) {
        console.error('Falha ao abrir o banco local', e);
      } finally {
        setPronto(true);
      }
    })();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', tema === 'dark' ? '#071426' : '#0B2545');
  }, [tema]);

  const avisar = useCallback((texto) => {
    setToast(texto);
    setTimeout(() => setToast((t) => (t === texto ? null : t)), 2800);
  }, []);

  const recarregar = useCallback(async () => {
    const [p, l, c] = await Promise.all([db.getPerfil(), db.listarLancamentos(), db.listarCompetencias()]);
    setPerfil(p || null);
    setLancamentos(l || []);
    setFechamentos(c || []);
  }, []);

  /* ---------------------------------------------------- Sincronização */

  /**
   * Sincroniza com o Drive e recarrega a tela se veio novidade.
   *
   * Falhar aqui NUNCA pode atrapalhar o guarda: sem internet, o app segue
   * funcionando offline como sempre. Por isso a versão automática é muda —
   * só avisa quando ele mesmo pediu, apertando o botão.
   */
  const sincronizar = useCallback(async ({ avisando = false } = {}) => {
    if (!(await drive.conectado())) return null;
    setSincronizando(true);
    try {
      const r = await drive.sincronizar({ interativo: avisando });
      if (r.ok) {
        if (r.mudouAqui) await recarregar();
        setUltimaSync(r.quando);
        if (avisando) {
          avisar(r.baixados > 0
            ? `Sincronizado. ${r.baixados} lançamento(s) vieram do outro aparelho.`
            : 'Tudo sincronizado.');
        }
      } else if (avisando) {
        avisar(r.erro);
      }
      return r;
    } finally {
      setSincronizando(false);
    }
  }, [recarregar, avisar]);

  /* Depois de mexer nos dados, espera o guarda parar de digitar e sobe. Se ele
     lançar três jornadas seguidas, sobe uma vez só, no fim. */
  const agendarSync = useCallback(() => {
    clearTimeout(agendado.current);
    agendado.current = setTimeout(() => { sincronizar(); }, 4000);
  }, [sincronizar]);

  /* -------------------------------------------------------------- Ações */

  const salvarPerfil = useCallback(async (dados) => {
    await db.savePerfil(dados);
    setPerfil({ ...dados, id: 'me' });
  }, []);

  /** Os campos de rateio são derivados: nunca vão para o banco. */
  const limpar = (l) => {
    const {
      horas, horasNormais, horasExtras, horasExcedentes, dividido,
      acumuladoNormais, acumuladoExtras, classe, ...puro
    } = l;
    return puro;
  };

  const salvarLancamento = useCallback(async (dados) => {
    const registro = {
      ...limpar(dados),
      id: dados.id || novoId(),
      competencia: competenciaDe(dados.data),
      criadoEm: dados.criadoEm || Date.now(),
      atualizadoEm: Date.now()
    };
    await db.salvarLancamento(registro);
    setLancamentos((atual) => {
      const semEle = atual.filter((l) => l.id !== registro.id);
      return [...semEle, registro];
    });
    agendarSync();
    return registro;
  }, [agendarSync]);

  const excluirLancamento = useCallback(async (id) => {
    await db.excluirLancamento(id);
    setLancamentos((atual) => atual.filter((l) => l.id !== id));
    agendarSync();
  }, [agendarSync]);

  const duplicarLancamento = useCallback(async (l) => {
    const copia = { ...limpar(l), id: novoId(), criadoEm: Date.now(), atualizadoEm: Date.now() };
    await db.salvarLancamento(copia);
    setLancamentos((atual) => [...atual, copia]);
    agendarSync();
    return copia;
  }, [agendarSync]);

  const fecharCompetencia = useCallback(async (id, resumo) => {
    const reg = {
      id,
      fechada: true,
      fechadaEm: Date.now(),
      atualizadoEm: Date.now(),
      totalNormais: resumo.totalNormais,
      totalExtras: resumo.totalExtras,
      total: resumo.total,
      diasTrabalhados: resumo.diasTrabalhados
    };
    await db.salvarCompetencia(reg);
    setFechamentos((a) => [...a.filter((c) => c.id !== id), reg]);

    /* Mês fechado é arquivo: fica guardado e consultável, mas a tela segue
       para a competência seguinte. Sem isso o guarda continuaria olhando um
       mês travado, sem lugar para lançar o serviço do dia 21. */
    setCompetencia((atual) => (atual === id ? proximaCompetencia(id) : atual));
  }, []);

  const reabrirCompetencia = useCallback(async (id) => {
    const reg = { id, fechada: false, reabertaEm: Date.now(), atualizadoEm: Date.now() };
    await db.salvarCompetencia(reg);
    setFechamentos((a) => [...a.filter((c) => c.id !== id), reg]);
  }, []);

  const registrarAssinatura = useCallback(async (id, assinatura) => {
    const atual = (await db.getCompetencia(id)) || { id };
    const reg = { ...atual, assinatura, atualizadoEm: Date.now() };
    await db.salvarCompetencia(reg);
    setFechamentos((a) => [...a.filter((c) => c.id !== id), reg]);
  }, []);

  const alternarTema = useCallback(async () => {
    const novo = tema === 'dark' ? 'light' : 'dark';
    setTema(novo);
    await db.setConfig('tema', novo);
  }, [tema]);


  /* Ao abrir o app: primeiro conclui a autorização, se o guarda acabou de
     voltar do Google; só então puxa o que foi lançado no outro aparelho. */
  useEffect(() => {
    if (!pronto) return;
    (async () => {
      const volta = await drive.concluirRetorno();
      if (volta?.erro) avisar(volta.erro);
      else if (volta?.conta) avisar(`Conectado como ${volta.conta}.`);
      await sincronizar({ avisando: !!volta?.conta });
    })();
    return () => clearTimeout(agendado.current);
  }, [pronto]);   // eslint-disable-line react-hooks/exhaustive-deps

  /* Voltou para o app depois de ficar em segundo plano: confere de novo. */
  useEffect(() => {
    const aoVoltar = () => { if (document.visibilityState === 'visible') sincronizar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => document.removeEventListener('visibilitychange', aoVoltar);
  }, [sincronizar]);

  /* ------------------------------------------------------------ Derivados */

  const daCompetencia = useMemo(
    () => lancamentos.filter((l) => l.competencia === competencia),
    [lancamentos, competencia]
  );

  const resumo = useMemo(() => calcularCompetencia(daCompetencia), [daCompetencia]);
  const stats = useMemo(() => estatisticas(resumo), [resumo]);

  const fechamento = useMemo(
    () => fechamentos.find((c) => c.id === competencia) || null,
    [fechamentos, competencia]
  );
  const competenciaFechada = !!fechamento?.fechada;

  /** Todas as competências com lançamento, da mais nova para a mais antiga. */
  const competenciasDisponiveis = useMemo(() => {
    const set = new Set(lancamentos.map((l) => l.competencia));
    set.add(competenciaAtual());
    fechamentos.forEach((f) => {
      set.add(f.id);
      /* Fechou agosto? Setembro passa a existir na lista mesmo sem lançamento
         nenhum — é para onde o app leva o guarda, e ele precisa poder voltar. */
      if (f.fechada) set.add(proximaCompetencia(f.id));
    });
    return [...set].filter(Boolean).sort().reverse();
  }, [lancamentos, fechamentos]);

  const valor = {
    pronto, perfil, lancamentos, competencia, setCompetencia,
    daCompetencia, resumo, stats, fechamento, competenciaFechada,
    competenciasDisponiveis, fechamentos, tema, toast, avisar,
    salvarPerfil, salvarLancamento, excluirLancamento, duplicarLancamento,
    fecharCompetencia, reabrirCompetencia, registrarAssinatura,
    alternarTema, recarregar,
    sincronizar, sincronizando, ultimaSync
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
