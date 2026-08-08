import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { TopBar, Vazio, SeletorCompetencia } from '../components/UI.jsx';
import {
  horasCurto, tipoPorId, formatarData, DIAS_SEMANA, diaSemana, nomeCompetencia, TIPOS, faixaHoraria
} from '../services/calc.js';
import { IcoSearch, IcoCopy, IcoPlus } from '../components/Icons.jsx';

export default function Historico({ abrirLancamento }) {
  const { resumo, competencia, duplicarLancamento, avisar } = useApp();
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [seletor, setSeletor] = useState(false);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return [...resumo.itens]
      .reverse()
      .filter((l) => (filtroTipo === 'todos' ? true : l.tipo === filtroTipo))
      .filter((l) => {
        if (!termo) return true;
        const alvo = [
          l.data, formatarData(l.data), l.comandante, l.local, l.observacao,
          l.justificativa, tipoPorId(l.tipo).nome, l.entrada, l.saida
        ].filter(Boolean).join(' ').toLowerCase();
        return alvo.includes(termo);
      });
  }, [resumo, busca, filtroTipo]);

  const duplicar = async (e, l) => {
    e.stopPropagation();
    await duplicarLancamento(l);
    avisar('Cópia criada no mesmo dia. Toque para ajustar a data.');
  };

  return (
    <>
      <TopBar titulo="Histórico" subtitulo={`${resumo.itens.length} lançamento(s) em ${nomeCompetencia(competencia)}`} />

      <div className="screen">
        <div className="pull-up">
          <div className="card">
            <div style={{ position: 'relative' }}>
              <IcoSearch size={18} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--muted)' }} />
              <input
                className="input"
                style={{ paddingLeft: 42 }}
                placeholder="Data, comandante, local ou observação"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                aria-label="Pesquisar lançamentos"
              />
            </div>

            <div className="chips mt-14">
              <button className={`chip ${filtroTipo === 'todos' ? 'on' : ''}`} onClick={() => setFiltroTipo('todos')}>Todos</button>
              {TIPOS.map((t) => (
                <button key={t.id} className={`chip ${filtroTipo === t.id ? 'on' : ''}`} onClick={() => setFiltroTipo(t.id)}>
                  {t.nome}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-20">
          <SeletorCompetencia aberto={seletor} abrir={() => setSeletor(true)} fechar={() => setSeletor(false)} />
        </div>

        <div className="section-title">
          {lista.length} resultado{lista.length === 1 ? '' : 's'}
          {busca && ` para “${busca}”`}
        </div>

        {lista.length ? lista.map((l) => (
          <div key={l.id} className="item" onClick={() => abrirLancamento(l)}>
            <div className="item-date">
              <b>{l.data.slice(8, 10)}</b>
              <span>{DIAS_SEMANA[diaSemana(l.data)]}</span>
            </div>

            <div className="item-main">
              <div className="t">
                {tipoPorId(l.tipo).nome}
                {l.foraDaJornada && l.horas > 0 && <span className="tag tag-blue" style={{ marginLeft: 6 }}>fora da folha</span>}
                {l.dividido && <span className="tag tag-orange" style={{ marginLeft: 6 }}>dividido</span>}
                {l.horasExcedentes > 0 && <span className="tag tag-red" style={{ marginLeft: 6 }}>acima do teto</span>}
              </div>
              <div className="s">
                {l.horas > 0 ? faixaHoraria(l) : 'sem carga'}
                {l.comandante ? ` · ${l.comandante}` : ''}
                {l.local ? ` · ${l.local}` : ''}
              </div>
              {l.observacao && <div className="s" style={{ opacity: .8 }}>{l.observacao}</div>}
              {l.dividido && (
                <div className="s" style={{ color: 'var(--orange)' }}>
                  {horasCurto(l.horasNormais)} normais + {horasCurto(l.horasExtras)} extras
                </div>
              )}
            </div>

            <div className="item-right">
              <div className="h">{l.horas > 0 ? horasCurto(l.horas) : '—'}</div>
              <button className="icon-btn" style={{ width: 30, height: 30, background: 'var(--surface-2)', color: 'var(--muted)', marginTop: 6 }}
                onClick={(e) => duplicar(e, l)} aria-label="Duplicar lançamento">
                <IcoCopy size={15} />
              </button>
            </div>
          </div>
        )) : (
          <Vazio
            titulo={busca ? 'Nada encontrado' : 'Sem lançamentos neste mês'}
            texto={busca ? 'Tente outro termo ou limpe a busca.' : 'Registre a primeira jornada da competência.'}
            acao={busca
              ? <button className="btn btn-ghost" style={{ maxWidth: 200, margin: '0 auto' }} onClick={() => setBusca('')}>Limpar busca</button>
              : <button className="btn btn-primary" style={{ maxWidth: 240, margin: '0 auto' }} onClick={() => abrirLancamento()}>
                <IcoPlus size={18} /> Registrar jornada
              </button>}
          />
        )}
      </div>
    </>
  );
}
