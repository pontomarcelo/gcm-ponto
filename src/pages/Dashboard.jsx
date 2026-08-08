import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { TopBar, SeletorCompetencia, Vazio } from '../components/UI.jsx';
import Gauge, { GraficoMes, Termometro } from '../components/Gauge.jsx';
import {
  CARGA_MENSAL, LIMITE_EXTRA, ALERTAS_EXTRA, horasCurto, nomeCompetencia, alertaExtras,
  serieDiaria, formatarData, tipoPorId, DIAS_SEMANA, diaSemana, faixaHoraria
} from '../services/calc.js';
import { IcoPlus, IcoDoc, IcoCalendar, IcoList, IcoAlert, IcoCheck, IcoLock, IcoPasta } from '../components/Icons.jsx';

export default function Dashboard({ ir, abrirLancamento }) {
  const { perfil, resumo, competencia, competenciaFechada } = useApp();
  const [seletor, setSeletor] = useState(false);

  const alerta = alertaExtras(resumo.totalExtras);
  const serie = serieDiaria(resumo, competencia);
  const ultimos = [...resumo.itens].reverse().slice(0, 4);

  return (
    <>
      <TopBar
        titulo={perfil?.nome?.split(' ').slice(0, 2).join(' ') || 'Guarda'}
        subtitulo={`Matrícula ${perfil?.matricula || '—'} · ${perfil?.unidade || ''}`}
      />

      <div className="screen">
        <div className="pull-up">
          <div className="card">
            <div className="spread" style={{ marginBottom: 4 }}>
              <span className="card-title" style={{ margin: 0 }}>{nomeCompetencia(competencia)}</span>
              {competenciaFechada
                ? <span className="tag tag-gray"><IcoLock size={11} style={{ verticalAlign: -1 }} /> Fechada</span>
                : <span className="tag tag-green">Em andamento</span>}
            </div>

            <Gauge
              normais={resumo.totalNormais}
              extras={resumo.totalExtras}
              meta={CARGA_MENSAL}
              tetoExtra={LIMITE_EXTRA}
              estourou={resumo.estourouExtras}
            />

          </div>
        </div>

        {alerta && (
          <div className={`alert alert-${alerta.nivel} mt-14`}>
            <IcoAlert size={19} style={{ flex: 'none', marginTop: 1 }} />
            <div><b>{alerta.titulo}</b>{alerta.texto}</div>
          </div>
        )}

        {resumo.cumpriuCarga && !alerta && (
          <div className="alert alert-green mt-14">
            <IcoCheck size={19} style={{ flex: 'none', marginTop: 1 }} />
            <div><b>Carga mensal cumprida</b>As {CARGA_MENSAL} horas estão fechadas. A partir daqui tudo entra como hora extra.</div>
          </div>
        )}

        <div className="section-title">Termômetro de hora extra</div>
        <div className="card">
          <Termometro extras={resumo.totalExtras} teto={LIMITE_EXTRA} marcos={ALERTAS_EXTRA.slice(0, 2)} />
        </div>

        <div className="quick">
          <button onClick={() => abrirLancamento()}><IcoPlus size={21} /> Lançar</button>
          <button onClick={() => ir('calendario')}><IcoCalendar size={21} /> Calendário</button>
          <button onClick={() => ir('historico')}><IcoList size={21} /> Histórico</button>
          <button onClick={() => ir('relatorio')}><IcoDoc size={21} /> Relatório</button>
          <button onClick={() => ir('documentos')}><IcoPasta size={21} /> Gaveta</button>
        </div>

        <div className="section-title">Contagem do mês</div>
        <div className="grid-2">
          <div className="metric accent-blue">
            <div className="k">Faltam para a carga</div>
            <div className="v">{horasCurto(resumo.restanteNormais)}</div>
          </div>
          {resumo.extrasConvocadas > 0 && resumo.extrasExcedentes > 0 && (
            <div className="metric accent-orange" style={{ gridColumn: 'span 2' }}>
              <div className="k">De onde vieram as extras</div>
              <div className="v" style={{ fontSize: 15, fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                {horasCurto(resumo.extrasConvocadas)} convocadas + {horasCurto(resumo.extrasExcedentes)} acima das {CARGA_MENSAL}h
              </div>
            </div>
          )}
          <div className={`metric ${resumo.estourouExtras ? 'accent-red' : 'accent-blue'}`}>
            <div className="k">Extras disponíveis</div>
            <div className="v">
              {resumo.estourouExtras ? `-${horasCurto(resumo.excedenteExtras)}` : horasCurto(resumo.restanteExtras)}
            </div>
          </div>
          <div className="metric">
            <div className="k">Dias trabalhados</div>
            <div className="v">{resumo.diasTrabalhados}</div>
          </div>
          <div className="metric">
            <div className="k">Total na folha</div>
            <div className="v">{horasCurto(resumo.total)}</div>
          </div>
          {resumo.totalDiarias > 0 && (
            <div className="metric accent-blue" style={{ gridColumn: 'span 2' }}>
              <div className="k">Diárias (fora da folha)</div>
              <div className="v">
                {horasCurto(resumo.totalDiarias)}
                <small>em {resumo.qtdDiarias} {resumo.qtdDiarias === 1 ? 'registro' : 'registros'}</small>
              </div>
            </div>
          )}
        </div>

        <div className="section-title">Horas por dia</div>
        <div className="card">
          {resumo.itens.length
            ? <GraficoMes serie={serie} />
            : <p className="hint" style={{ textAlign: 'center', margin: '18px 0' }}>Registre a primeira jornada para o gráfico aparecer.</p>}
        </div>

        <div className="section-title">Últimos lançamentos</div>
        {ultimos.length ? (
          <>
            {ultimos.map((l) => (
              <div key={l.id} className="item" onClick={() => abrirLancamento(l)}>
                <div className="item-date">
                  <b>{l.data.slice(8, 10)}</b>
                  <span>{DIAS_SEMANA[diaSemana(l.data)]}</span>
                </div>
                <div className="item-main">
                  <div className="t">{tipoPorId(l.tipo).nome}{l.local ? ` · ${l.local}` : ''}</div>
                  <div className="s">{l.horas > 0 ? faixaHoraria(l) : formatarData(l.data)}{l.comandante ? ` · ${l.comandante}` : ''}</div>
                </div>
                <div className="item-right">
                  <div className="h">{l.horas > 0 ? horasCurto(l.horas) : '—'}</div>
                  {l.foraDaJornada && l.horas > 0
                    ? <span className="tag tag-blue">fora da folha</span>
                    : l.dividido
                    ? <span className="tag tag-orange">dividido</span>
                    : l.horasExcedentes > 0
                      ? <span className="tag tag-red">acima</span>
                      : l.horasExtras > 0
                        ? <span className="tag tag-orange">extra</span>
                        : l.horas > 0
                          ? <span className="tag tag-green">normal</span>
                          : <span className="tag tag-gray">{tipoPorId(l.tipo).nome.toLowerCase()}</span>}
                </div>
              </div>
            ))}
            <button className="btn btn-ghost mt-14" onClick={() => ir('historico')}>Ver todo o histórico</button>
          </>
        ) : (
          <Vazio
            titulo="Nenhuma jornada neste mês"
            texto="Registre a entrada e a saída do serviço. O app faz a conta das 135h sozinho."
            acao={<button className="btn btn-primary" style={{ maxWidth: 240, margin: '0 auto' }}
              onClick={() => abrirLancamento()}>Registrar jornada</button>}
          />
        )}

        <div className="section-title">Competência</div>
        <SeletorCompetencia aberto={seletor} abrir={() => setSeletor(true)} fechar={() => setSeletor(false)} />
      </div>
    </>
  );
}
