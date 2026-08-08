import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { TopBar, Sheet } from '../components/UI.jsx';
import {
  nomeCompetencia, horasCurto, hojeISO, formatarDataExtenso, tipoPorId,
  competenciaAtual, MESES, faixaHoraria
} from '../services/calc.js';
import { IcoChevron, IcoBack, IcoPlus } from '../components/Icons.jsx';

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function Calendario({ abrirLancamento }) {
  const { competencia, setCompetencia, resumo } = useApp();
  const [diaAberto, setDiaAberto] = useState(null);

  const [ano, mes] = competencia.split('-').map(Number);
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
  const hoje = hojeISO();

  /* Um dia pode ter mais de um lançamento: a cor segue o mais severo. */
  const porDia = useMemo(() => {
    const mapa = new Map();
    const peso = { normal: 1, extra: 2, over: 3, fora: 1, folga: 0 };
    resumo.itens.forEach((i) => {
      const atual = mapa.get(i.data) || { itens: [], horas: 0, classe: 'folga' };
      atual.itens.push(i);
      atual.horas = Math.round((atual.horas + i.horas) * 100) / 100;
      if (peso[i.classe] > peso[atual.classe]) atual.classe = i.classe;
      mapa.set(i.data, atual);
    });
    return mapa;
  }, [resumo]);

  const mudarMes = (delta) => {
    const d = new Date(ano, mes - 1 + delta, 1);
    setCompetencia(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const celulas = [
    ...Array(primeiroDiaSemana).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1)
  ];

  const dadosDoDia = diaAberto ? porDia.get(diaAberto) : null;

  return (
    <>
      <TopBar titulo="Calendário" subtitulo={nomeCompetencia(competencia)} />

      <div className="screen">
        <div className="pull-up">
          <div className="card">
            <div className="spread" style={{ marginBottom: 16 }}>
              <button className="icon-btn" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
                onClick={() => mudarMes(-1)} aria-label="Mês anterior"><IcoBack size={18} /></button>
              <b style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>
                {MESES[mes - 1]} {ano}
              </b>
              <button className="icon-btn" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
                onClick={() => mudarMes(1)} aria-label="Próximo mês"><IcoChevron size={18} /></button>
            </div>

            <div className="cal-head">
              {SEMANA.map((d, i) => <div key={i}>{d}</div>)}
            </div>

            <div className="cal-grid">
              {celulas.map((dia, i) => {
                if (!dia) return <div key={`v${i}`} className="cal-day empty" />;
                const data = `${competencia}-${String(dia).padStart(2, '0')}`;
                const info = porDia.get(data);
                const classe = info ? info.classe : '';
                return (
                  <button
                    key={data}
                    className={`cal-day ${classe} ${data === hoje ? 'today' : ''}`}
                    onClick={() => (info ? setDiaAberto(data) : abrirLancamento(null, data))}
                    aria-label={`Dia ${dia}${info ? `, ${horasCurto(info.horas)}` : ', sem lançamento'}`}
                  >
                    {dia}
                    {info && info.horas > 0 && (
                      <span className="dot" style={{
                        background: classe === 'over' ? 'var(--red)'
                          : classe === 'extra' ? 'var(--orange)'
                          : classe === 'fora' ? 'var(--blue-500)' : 'var(--green)'
                      }} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="cal-legend">
              <span><i style={{ background: 'var(--green)' }} />Hora normal</span>
              <span><i style={{ background: 'var(--orange)' }} />Hora extra</span>
              <span><i style={{ background: 'var(--red)' }} />Acima do teto</span>
              <span><i style={{ background: 'var(--blue-500)' }} />Diária</span>
              <span><i style={{ background: 'var(--line)' }} />Sem serviço / atestado</span>
            </div>
          </div>
        </div>

        <div className="grid-3 mt-14">
          <div className="metric">
            <div className="k">Dias</div>
            <div className="v">{resumo.diasTrabalhados}</div>
          </div>
          <div className="metric accent-green">
            <div className="k">Normais</div>
            <div className="v" style={{ fontSize: 18 }}>{horasCurto(resumo.totalNormais)}</div>
          </div>
          <div className="metric accent-orange">
            <div className="k">Extras</div>
            <div className="v" style={{ fontSize: 18 }}>{horasCurto(resumo.totalExtras)}</div>
          </div>
        </div>

        <button className="btn btn-primary mt-14" onClick={() => abrirLancamento()}>
          <IcoPlus size={19} /> Nova jornada
        </button>
      </div>

      {diaAberto && dadosDoDia && (
        <Sheet
          titulo={`${horasCurto(dadosDoDia.horas)} no dia`}
          subtitulo={formatarDataExtenso(diaAberto)}
          fechar={() => setDiaAberto(null)}
        >
          {dadosDoDia.itens.map((l) => (
            <div key={l.id} className="item" onClick={() => { setDiaAberto(null); abrirLancamento(l); }}>
              <div className="item-main">
                <div className="t">{tipoPorId(l.tipo).nome}{l.local ? ` · ${l.local}` : ''}</div>
                <div className="s">
                  {l.horas > 0 ? faixaHoraria(l) : 'sem carga horária'}
                  {l.comandante ? ` · ${l.comandante}` : ''}
                </div>
                {l.dividido && (
                  <div className="s" style={{ color: 'var(--orange)' }}>
                    {horasCurto(l.horasNormais)} normais + {horasCurto(l.horasExtras)} extras
                  </div>
                )}
              </div>
              <div className="item-right">
                <div className="h">{l.horas > 0 ? horasCurto(l.horas) : '—'}</div>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost mt-14" onClick={() => { setDiaAberto(null); abrirLancamento(null, diaAberto); }}>
            <IcoPlus size={18} /> Adicionar outra jornada neste dia
          </button>
        </Sheet>
      )}
    </>
  );
}
