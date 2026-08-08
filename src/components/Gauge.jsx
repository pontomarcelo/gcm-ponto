import { horasCurto } from '../services/calc.js';

/**
 * Medidor da jornada — leitura em duas barras.
 * O número grande responde "quanto trabalhei"; as barras respondem
 * "quanto falta" em cada teto. Sem ornamento, direto ao ponto.
 */
export default function Gauge({ normais, extras, meta, tetoExtra, estourou }) {
  const pNormais = Math.min(100, Math.round((normais / meta) * 100));
  const pExtras = Math.min(100, Math.round((extras / tetoExtra) * 100));

  const linha = (rotulo, valor, teto, percentual, cor) => (
    <div style={{ marginBottom: 16 }}>
      <div className="spread" style={{ marginBottom: 7 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{rotulo}</span>
        <span style={{ fontSize: 13.5 }}>
          <b className="num" style={{ color: cor, fontSize: 15 }}>{horasCurto(valor)}</b>
          <span className="num" style={{ color: 'var(--muted)' }}> / {teto}h</span>
        </span>
      </div>
      <div className="bar">
        <span style={{ width: `${percentual}%`, background: cor }} />
      </div>
    </div>
  );

  return (
    <div>
      <div className="center" style={{ padding: '6px 0 20px' }}>
        <div className="num" style={{ fontSize: 40, fontWeight: 700, lineHeight: 1 }}>
          {horasCurto(normais + extras)}
        </div>
        <div className="gauge-label">Horas na folha do mês</div>
      </div>

      {linha('Horas normais', normais, meta, pNormais, 'var(--green)')}
      {linha('Horas extras', extras, tetoExtra, pExtras, estourou ? 'var(--red)' : 'var(--orange)')}
    </div>
  );
}

/** Barra composta: parte verde (normais) + parte laranja (extras). */
export function BarraDupla({ normais, extras, meta, tetoExtra }) {
  const totalEscala = meta + tetoExtra;
  const wN = Math.min(100, (normais / totalEscala) * 100);
  const wE = Math.min(100 - wN, (extras / totalEscala) * 100);
  return (
    <div className="bar">
      <span style={{ width: `${wN}%`, background: 'var(--green)' }} />
      <span style={{ width: `${wE}%`, background: 'var(--orange)' }} />
    </div>
  );
}

/**
 * Gráfico de colunas empilhadas por dia do mês.
 * Sem biblioteca: SVG puro, leve o bastante para rodar offline em aparelho antigo.
 */
export function GraficoMes({ serie }) {
  const max = Math.max(8, ...serie.map((d) => d.normais + d.extras));
  const larguraCol = 100 / serie.length;
  const H = 140;

  return (
    <div>
      <svg className="chart" viewBox={`0 0 100 ${H + 14}`} preserveAspectRatio="none" role="img"
        aria-label="Horas trabalhadas por dia no mês">
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1="0" x2="100" y1={H - H * g} y2={H - H * g}
            stroke="var(--line)" strokeWidth="0.4" />
        ))}
        {serie.map((d, i) => {
          const total = d.normais + d.extras;
          const hN = (d.normais / max) * H;
          const hE = (d.extras / max) * H;
          const x = i * larguraCol + larguraCol * 0.18;
          const w = larguraCol * 0.64;
          return (
            <g key={d.dia}>
              {hN > 0 && <rect className="chart-bar" x={x} y={H - hN} width={w} height={hN} fill="var(--green)" rx="0.6" />}
              {hE > 0 && <rect className="chart-bar" x={x} y={H - hN - hE} width={w} height={hE} fill="var(--orange)" rx="0.6" />}
              {total === 0 && <rect x={x} y={H - 1.5} width={w} height="1.5" fill="var(--line)" rx="0.5" />}
            </g>
          );
        })}
      </svg>
      <div className="gauge-legend" style={{ marginTop: 4 }}>
        <span><i style={{ background: 'var(--green)' }} />Normais</span>
        <span><i style={{ background: 'var(--orange)' }} />Extras</span>
        <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>pico {max}h</span>
      </div>
    </div>
  );
}

/** Barras horizontais para rankings (comandante, tipo, local). */
export function BarrasRanking({ dados, cor = 'var(--blue-500)' }) {
  if (!dados?.length) return <p className="hint">Sem dados neste mês.</p>;
  const max = Math.max(...dados.map((d) => d.horas));
  return (
    <div className="stack-2">
      {dados.slice(0, 8).map((d) => (
        <div key={d.nome}>
          <div className="spread" style={{ fontSize: 13, marginBottom: 5 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nome}</span>
            <b className="num">{horasCurto(d.horas)}</b>
          </div>
          <div className="bar">
            <span style={{ width: `${(d.horas / max) * 100}%`, background: cor }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Termômetro de hora extra.
 *
 * As barras comuns mostram quanto já foi feito. Este mostra outra coisa:
 * o quanto ainda dá para aceitar antes de estourar as 44h. As faixas de
 * atenção (35h), perigo (40h) e teto (44h) ficam desenhadas na régua, então
 * o guarda enxerga a distância até o limite antes de aceitar mais uma escala.
 */
export function Termometro({ extras, teto, marcos = [35, 40] }) {
  // Estourou? A régua estica para o excedente aparecer fora da zona.
  const fimEscala = Math.max(teto, extras) * (extras > teto ? 1.04 : 1);
  const pos = (v) => Math.min(100, (v / fimEscala) * 100);

  const zonas = [
    { ate: marcos[0], cor: 'var(--green)', nome: 'Tranquilo' },
    { ate: marcos[1], cor: '#EAB308', nome: 'Atenção' },
    { ate: teto, cor: 'var(--orange)', nome: 'Perigo' }
  ];

  const estado = extras > teto
    ? { nome: 'Acima do teto', cor: 'var(--red)', classe: 'alert-red' }
    : extras >= teto
      ? { nome: 'No teto', cor: 'var(--red)', classe: 'alert-red' }
      : extras >= marcos[1]
        ? { nome: 'Perigo', cor: 'var(--orange)', classe: 'alert-orange' }
        : extras >= marcos[0]
          ? { nome: 'Atenção', cor: '#B59000', classe: 'alert-orange' }
          : { nome: 'Tranquilo', cor: 'var(--green)', classe: 'alert-green' };

  const perigo = extras >= marcos[1];
  const restante = Math.max(0, teto - extras);

  return (
    <div>
      <div className="spread" style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
          {extras > teto
            ? `${horasCurto(extras - teto)} acima do teto`
            : restante === 0 ? 'Teto atingido' : `Ainda cabem ${horasCurto(restante)}`}
        </span>
        <span className="termo-estado" style={{ color: estado.cor }}>
          <i className={perigo ? 'pulsa' : ''} style={{ background: estado.cor }} />
          {estado.nome}
        </span>
      </div>

      <div className="termo" role="img"
        aria-label={`Hora extra: ${horasCurto(extras)} de ${teto}h. Situação: ${estado.nome}.`}>
        {/* faixas da régua */}
        {zonas.map((z, i) => {
          const de = i === 0 ? 0 : zonas[i - 1].ate;
          return (
            <span key={z.nome} className="termo-zona"
              style={{ left: `${pos(de)}%`, width: `${pos(z.ate) - pos(de)}%`, background: z.cor }} />
          );
        })}
        {extras > teto && (
          <span className="termo-zona" style={{ left: `${pos(teto)}%`, right: 0, background: 'var(--red)' }} />
        )}

        {/* quanto já foi usado */}
        <span className="termo-nivel" style={{ width: `${pos(extras)}%` }} />

        {/* marcos e ponteiro */}
        {[...marcos, teto].map((m) => (
          <span key={m} className="termo-marco" style={{ left: `${pos(m)}%` }} />
        ))}
        <span className={`termo-ponteiro ${perigo ? 'pulsa' : ''}`}
          style={{ left: `${pos(extras)}%`, borderTopColor: estado.cor }} />
      </div>

      <div className="termo-regua">
        <span style={{ left: 0 }}>0h</span>
        {[...marcos, teto].map((m) => (
          <span key={m} style={{ left: `${pos(m)}%` }}>{m}h</span>
        ))}
      </div>
    </div>
  );
}
