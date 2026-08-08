import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import * as db from '../services/db.js';
import {
  calcularCompetencia, competenciaAtual, competenciaDe, estatisticas, novoId
} from '../services/calc.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [pronto, setPronto] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [fechamentos, setFechamentos] = useState([]);
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [tema, setTema] = useState('light');
  const [toast, setToast] = useState(null);

  /* --------------------------------------------------------- Carga inicial */
  useEffect(() => {
    (async () => {
      try {
        const [p, l, c, t] = await Promise.all([
          db.getPerfil(), db.listarLancamentos(), db.listarCompetencias(), db.getConfig('tema', 'light')
        ]);
        setPerfil(p || null);
        setLancamentos(l || []);
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
    return registro;
  }, []);

  const excluirLancamento = useCallback(async (id) => {
    await db.excluirLancamento(id);
    setLancamentos((atual) => atual.filter((l) => l.id !== id));
  }, []);

  const duplicarLancamento = useCallback(async (l) => {
    const copia = { ...limpar(l), id: novoId(), criadoEm: Date.now(), atualizadoEm: Date.now() };
    await db.salvarLancamento(copia);
    setLancamentos((atual) => [...atual, copia]);
    return copia;
  }, []);

  const fecharCompetencia = useCallback(async (id, resumo) => {
    const reg = {
      id,
      fechada: true,
      fechadaEm: Date.now(),
      totalNormais: resumo.totalNormais,
      totalExtras: resumo.totalExtras,
      total: resumo.total,
      diasTrabalhados: resumo.diasTrabalhados
    };
    await db.salvarCompetencia(reg);
    setFechamentos((a) => [...a.filter((c) => c.id !== id), reg]);
  }, []);

  const reabrirCompetencia = useCallback(async (id) => {
    const reg = { id, fechada: false, reabertaEm: Date.now() };
    await db.salvarCompetencia(reg);
    setFechamentos((a) => [...a.filter((c) => c.id !== id), reg]);
  }, []);

  const registrarAssinatura = useCallback(async (id, assinatura) => {
    const atual = (await db.getCompetencia(id)) || { id };
    const reg = { ...atual, assinatura };
    await db.salvarCompetencia(reg);
    setFechamentos((a) => [...a.filter((c) => c.id !== id), reg]);
  }, []);

  const alternarTema = useCallback(async () => {
    const novo = tema === 'dark' ? 'light' : 'dark';
    setTema(novo);
    await db.setConfig('tema', novo);
  }, [tema]);

  const recarregar = useCallback(async () => {
    const [p, l, c] = await Promise.all([db.getPerfil(), db.listarLancamentos(), db.listarCompetencias()]);
    setPerfil(p || null);
    setLancamentos(l || []);
    setFechamentos(c || []);
  }, []);

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
    fechamentos.forEach((f) => set.add(f.id));
    return [...set].filter(Boolean).sort().reverse();
  }, [lancamentos, fechamentos]);

  const valor = {
    pronto, perfil, lancamentos, competencia, setCompetencia,
    daCompetencia, resumo, stats, fechamento, competenciaFechada,
    competenciasDisponiveis, fechamentos, tema, toast, avisar,
    salvarPerfil, salvarLancamento, excluirLancamento, duplicarLancamento,
    fecharCompetencia, reabrirCompetencia, registrarAssinatura,
    alternarTema, recarregar
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
