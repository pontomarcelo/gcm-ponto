import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { TopBar, Sheet } from '../components/UI.jsx';
import {
  nomeCompetencia, horasCurto, hojeISO, formatarDataExtenso, tipoPorId,
  competenciaDe, calcularCompetencia, MESES, MESES_CURTO, faixaHoraria, DIA_VIRADA
} from '../services/calc.js';
import { IcoChevron, IcoBack, IcoPlus } from '../components/Icons.jsx';

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function Calendario({ abrirLancamento }) {
  const { competencia, setCompetencia, lancamentos } = useApp();
  const [diaAberto, setDiaAberto] = useState(null);

  /* A grade é o mês do calendário de parede — dia 1 ao 30 ou 31 —, e não a
     competência. O guarda pensa em "julho", não em "21 de junho a 20 de julho".
     A virada aparece marcada DENTRO do mês, no dia 21, para ele ver de relance
     onde um mês de folha acaba e o outro começa. */
  const [mesVisivel, setMesVisivel] = useState(() => hojeISO().slice(0, 7));
  const [ano, mes] = mesVisivel.split('-').map(Number);
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
  const hoje = hojeISO();

  /* O mês na tela atravessa DUAS competências: os dias até 20 fecham uma, os
     de 21 em diante já contam para a seguinte. Por isso a pintura não pode sair
     do resumo da competência selecionada — cada lançamento é calculado dentro
     da competência a que pertence, e só então vai para o calendário. */
  const porDia = useMemo(() => {
    const mapa = new Map();
    const peso = { normal: 1, extra: 2, over: 3, fora: 1, folga: 0 };
    const competencias = new Set(lancamentos.map((l) => l.competencia));

    competencias.forEach((c) => {
      const resumoDela = calcularCompetencia(lancamentos.filter((l) => l.competencia === c));
      resumoDela.itens.forEach((i) => {
        const atual = mapa.get(i.data) || { itens: [], horas: 0, classe: 'folga' };
        atual.itens.push(i);
        atual.horas = Math.round((atual.horas + i.horas) * 100) / 100;
        if (peso[i.classe] > peso[atual.classe]) atual.classe = i.classe;
        mapa.set(i.data, atual);
      });
    });
    return mapa;
  }, [lancamentos]);

  const mudarMes = (delta) => {
    const d = new Date(ano, mes - 1 + delta, 1);
    setMesVisivel(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const celulas = [
    ...Array(primeiroDiaSemana).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1)
  ];

  /* As duas metades do mês e a competência que cada uma alimenta. */
  const metades = useMemo(() => {
    const fatia = (de, ate) => {
      const dias = [];
      for (let d = de; d <= ate; d++) dias.push(`${mesVisivel}-${String(d).padStart(2, '0')}`);
      const itens = dias.map((d) => porDia.get(d)).filter(Boolean);
      return {
        comp: competenciaDe(dias[0]),
        de: String(de).padStart(2, '0'),
        ate: String(ate).padStart(2, '0'),
        horas: Math.round(itens.reduce((t, i) => t + i.horas, 0) * 100) / 100,
        dias: itens.filter((i) => i.horas > 0).length
      };
    };
    return [fatia(1, DIA_VIRADA - 1), fatia(DIA_VIRADA, diasNoMes)];
  }, [mesVisivel, diasNoMes, porDia]);

  const dadosDoDia = diaAberto ? porDia.get(diaAberto) : null;

  return (
    <>
      <TopBar titulo="Calendário" subtitulo={`${MESES[mes - 1]} de ${ano}`} />

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
                const data = `${mesVisivel}-${String(dia).padStart(2, '0')}`;
                const info = porDia.get(data);
                const classe = info ? info.classe : '';

                /* Duas datas falam sozinhas dentro da grade: o dia 20 fecha a
                   competência, o dia 21 abre a seguinte e diz qual é. O dia 1º
                   não marca nada — a competência dele começou no mês anterior. */
                const abre = dia === DIA_VIRADA;
                const fecha = dia === DIA_VIRADA - 1;
                const marca = abre ? 'abre' : fecha ? 'fecha' : '';
                const etiqueta = abre
                  ? MESES_CURTO[Number(competenciaDe(data).slice(5, 7)) - 1]
                  : fecha ? 'fim' : null;

                return (
                  <button
                    key={data}
                    className={`cal-day ${classe} ${data === hoje ? 'today' : ''} ${marca}`}
                    onClick={() => (info ? setDiaAberto(data) : abrirLancamento(null, data))}
                    aria-label={
                      `Dia ${dia}`
                      + (abre ? `, começa a competência de ${nomeCompetencia(competenciaDe(data))}` : '')
                      + (fecha ? `, fecha a competência de ${nomeCompetencia(competenciaDe(data))}` : '')
                      + (info ? `, ${horasCurto(info.horas)}` : ', sem lançamento')
                    }
                  >
                    {dia}
                    {info && info.horas > 0 && (
                      <span className="dot" style={{
                        background: classe === 'over' ? 'var(--red)'
                          : classe === 'extra' ? 'var(--orange)'
                          : classe === 'fora' ? 'var(--blue-500)' : 'var(--green)'
                      }} />
                    )}
                    {etiqueta && <span className="cal-tag">{etiqueta}</span>}
                  </button>
                );
              })}
            </div>

            <div className="cal-legend">
              <span><i style={{ background: 'var(--green)' }} />Hora normal</span>
              <span><i style={{ background: 'var(--orange)' }} />Hora extra</span>
              <span><i style={{ background: 'var(--red)' }} />Acima do teto</span>
              <span><i style={{ background: 'var(--blue-500)' }} />Diária</span>
              <span><i style={{ background: 'var(--gold)' }} />Abre e fecha a competência</span>
            </div>
          </div>
        </div>

        {/* Onde cada metade deste mês vai cair na folha. Tocar troca o mês
            mostrado no Início e no Relatório. */}
        <div className="section-title">Para onde vão estes dias</div>
        <div className="stack-2">
          {metades.map((m) => (
            <button key={m.comp} className="item" style={{ width: '100%' }}
              onClick={() => setCompetencia(m.comp)}>
              <div className="item-date"><b>{m.de}</b><span>a {m.ate}</span></div>
              <div className="item-main">
                <div className="t">{nomeCompetencia(m.comp)}</div>
                <div className="s">
                  {m.dias ? `${m.dias} dia(s) lançado(s)` : 'nenhum lançamento ainda'}
                  {m.comp === competencia ? ' · aberta no Início' : ''}
                </div>
              </div>
              <div className="item-right">
                <div className="h">{m.horas > 0 ? horasCurto(m.horas) : '—'}</div>
              </div>
            </button>
          ))}
        </div>

        <p className="hint">
          Na grade, o dia {DIA_VIRADA - 1} traz <b style={{ display: 'inline' }}>FIM</b> com a
          barra dourada à direita: ali a competência fecha. O dia {DIA_VIRADA} traz a
          barra à esquerda e o nome do mês de folha que começa. Os dias entre um e
          outro seguem a competência que já estava correndo.
        </p>

        <button className="btn btn-primary mt-14" onClick={() => abrirLancamento()}>
          <IcoPlus size={19} /> Nova jornada
        </button>
      </div>

      {diaAberto && dadosDoDia && (
        <Sheet
          titulo={`${horasCurto(dadosDoDia.horas)} no dia`}
          subtitulo={`${formatarDataExtenso(diaAberto)} · conta em ${nomeCompetencia(competenciaDe(diaAberto))}`}
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
