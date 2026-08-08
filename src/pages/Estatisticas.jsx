import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { TopBar, SeletorCompetencia, Vazio } from '../components/UI.jsx';
import { BarrasRanking } from '../components/Gauge.jsx';
import {
  horasCurto, nomeCompetencia, formatarData, CARGA_MENSAL, LIMITE_EXTRA,
  DIAS_SEMANA, calcularCompetencia, nomeCompetenciaCurto
} from '../services/calc.js';

export default function Estatisticas() {
  const { resumo, stats, competencia, lancamentos, competenciasDisponiveis } = useApp();
  const [seletor, setSeletor] = useState(false);

  /* Comparativo dos últimos 6 meses com lançamento. */
  const historicoMeses = useMemo(() => {
    return competenciasDisponiveis.slice(0, 6).map((c) => {
      const r = calcularCompetencia(lancamentos.filter((l) => l.competencia === c));
      return { comp: c, ...r };
    }).reverse();
  }, [competenciasDisponiveis, lancamentos]);

  const maxMes = Math.max(CARGA_MENSAL, ...historicoMeses.map((m) => m.total));

  if (!resumo.itens.length) {
    return (
      <>
        <TopBar titulo="Números" subtitulo={nomeCompetencia(competencia)} />
        <div className="screen">
          <div className="pull-up">
            <div className="card">
              <SeletorCompetencia aberto={seletor} abrir={() => setSeletor(true)} fechar={() => setSeletor(false)} />
            </div>
          </div>
          <Vazio titulo="Ainda não há números" texto="As estatísticas aparecem depois do primeiro lançamento do mês." />
        </div>
      </>
    );
  }

  const maxSemana = Math.max(...stats.porDiaSemana, 1);

  return (
    <>
      <TopBar titulo="Números" subtitulo={nomeCompetencia(competencia)} />

      <div className="screen">
        <div className="pull-up">
          <div className="card">
            <SeletorCompetencia aberto={seletor} abrir={() => setSeletor(true)} fechar={() => setSeletor(false)} />
          </div>
        </div>

        <div className="section-title">Jornadas</div>
        <div className="grid-2">
          <div className="metric accent-blue">
            <div className="k">Maior jornada</div>
            <div className="v">{horasCurto(stats.maior.horas)}</div>
            <div className="hint">{formatarData(stats.maior.data)}</div>
          </div>
          <div className="metric accent-blue">
            <div className="k">Menor jornada</div>
            <div className="v">{horasCurto(stats.menor.horas)}</div>
            <div className="hint">{formatarData(stats.menor.data)}</div>
          </div>
          <div className="metric">
            <div className="k">Média por serviço</div>
            <div className="v">{horasCurto(stats.media)}</div>
          </div>
          <div className="metric">
            <div className="k">Dias trabalhados</div>
            <div className="v">{resumo.diasTrabalhados}</div>
          </div>
          <div className="metric accent-green">
            <div className="k">Normais</div>
            <div className="v">{horasCurto(resumo.totalNormais)}<small>/{CARGA_MENSAL}h</small></div>
          </div>
          <div className="metric accent-orange">
            <div className="k">Extras</div>
            <div className="v">{horasCurto(resumo.totalExtras)}<small>/{LIMITE_EXTRA}h</small></div>
          </div>
        </div>

        <div className="section-title">Por dia da semana</div>
        <div className="card">
          <svg className="chart" viewBox="0 0 100 120" preserveAspectRatio="none" role="img"
            aria-label="Distribuição de horas por dia da semana">
            {stats.porDiaSemana.map((h, i) => {
              const alt = (h / maxSemana) * 100;
              const larg = 100 / 7;
              return (
                <rect key={i} className="chart-bar" x={i * larg + larg * 0.22} y={105 - alt}
                  width={larg * 0.56} height={Math.max(alt, 1)} rx="0.8"
                  fill={h === maxSemana ? 'var(--blue-500)' : 'var(--navy-600)'} opacity={h ? 1 : .18} />
              );
            })}
          </svg>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
            {DIAS_SEMANA.map((d, i) => (
              <span key={d}>{d}<br /><b className="num" style={{ color: 'var(--ink)' }}>{stats.porDiaSemana[i] || 0}</b></span>
            ))}
          </div>
        </div>

        <div className="section-title">Por comandante</div>
        <div className="card"><BarrasRanking dados={stats.porComandante} cor="var(--navy-600)" /></div>

        <div className="section-title">Por tipo de serviço</div>
        <div className="card"><BarrasRanking dados={stats.porTipo} cor="var(--blue-500)" /></div>

        <div className="section-title">Por local</div>
        <div className="card"><BarrasRanking dados={stats.porLocal} cor="var(--green)" /></div>

        {historicoMeses.length > 1 && (
          <>
            <div className="section-title">Comparativo de meses</div>
            <div className="card">
              <div className="stack-2">
                {historicoMeses.map((m) => (
                  <div key={m.comp}>
                    <div className="spread" style={{ fontSize: 13, marginBottom: 5 }}>
                      <span>{nomeCompetenciaCurto(m.comp)}</span>
                      <b className="num">{horasCurto(m.total)}</b>
                    </div>
                    <div className="bar">
                      <span style={{ width: `${(m.totalNormais / maxMes) * 100}%`, background: 'var(--green)' }} />
                      <span style={{ width: `${(m.totalExtras / maxMes) * 100}%`, background: m.estourouExtras ? 'var(--red)' : 'var(--orange)' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="gauge-legend" style={{ marginTop: 14 }}>
                <span><i style={{ background: 'var(--green)' }} />Normais</span>
                <span><i style={{ background: 'var(--orange)' }} />Extras</span>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
