import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext.jsx';
import { nomeCompetencia, nomeCompetenciaCurto } from '../services/calc.js';
import {
  IcoHome, IcoCalendar, IcoChart, IcoList, IcoGear, IcoMoon, IcoSun, IcoBack, IcoChevron,
  IcoMinus, IcoMaximize, IcoClose
} from './Icons.jsx';

export const LOGO = './logo/gcm-logo.png';

/* -------------------------------------------------------------- Cabeçalho */

export function TopBar({ titulo, subtitulo, voltar, acoes }) {
  const { tema, alternarTema } = useApp();

  /* O X de sair fica só no Calendário.
     As outras telas da navegação (Histórico, Números, Ajustes) são abas:
     você troca de aba, não "fecha" uma. O Calendário é diferente porque o
     guarda entra nele para consultar um dia e quer voltar direto.
     A rota vive no hash da URL, então sair é reescrever o hash;
     o App já escuta essa mudança e troca a tela. */
  const rota = typeof window !== 'undefined'
    ? window.location.hash.replace('#/', '')
    : '';
  const podeFechar = rota === 'calendario';
  const sair = () => { window.location.hash = '#/dashboard'; };

  return (
    <header className="topbar">
      <div className="topbar-row">
        {voltar ? (
          <button className="icon-btn" onClick={voltar} aria-label="Voltar"><IcoBack /></button>
        ) : (
          <div className="topbar-badge"><img src={LOGO} alt="Brasão da Guarda Municipal" /></div>
        )}
        <div style={{ minWidth: 0 }}>
          <h1>{titulo}</h1>
          {subtitulo && <div className="sub">{subtitulo}</div>}
        </div>
        <div className="topbar-actions">
          {acoes}
          <button className="icon-btn" onClick={alternarTema} aria-label="Alternar modo escuro">
            {tema === 'dark' ? <IcoSun size={20} /> : <IcoMoon size={20} />}
          </button>
          {podeFechar && (
            <button
              className="icon-btn fechar-tela"
              onClick={sair}
              aria-label="Fechar e voltar para o início"
              title="Fechar"
            >
              <IcoClose size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------- Navegação */

const ABAS = [
  { id: 'dashboard', nome: 'Início', Icone: IcoHome },
  { id: 'calendario', nome: 'Calendário', Icone: IcoCalendar },
  { id: 'historico', nome: 'Histórico', Icone: IcoList },
  { id: 'estatisticas', nome: 'Números', Icone: IcoChart },
  { id: 'ajustes', nome: 'Ajustes', Icone: IcoGear }
];

export function BottomNav({ atual, ir }) {
  return (
    <nav className="nav" aria-label="Navegação principal">
      {ABAS.map(({ id, nome, Icone }) => (
        <button key={id} className={atual === id ? 'on' : ''} onClick={() => ir(id)}
          aria-current={atual === id ? 'page' : undefined}>
          <Icone size={21} weight={atual === id ? 2.3 : 1.8} />
          {nome}
        </button>
      ))}
    </nav>
  );
}

/* ---------------------------------------------------------- Folha modal */

export function Sheet({ titulo, subtitulo, fechar, children }) {
  // três alturas: recolhido (só a barra), padrão e tela cheia
  const [estado, setEstado] = useState('normal');
  const minimizado = estado === 'minimo';

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') fechar(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [fechar]);

  useEffect(() => {
    // recolhido, a página atrás volta a rolar normalmente
    const anterior = document.body.style.overflow;
    document.body.style.overflow = minimizado ? anterior : 'hidden';
    return () => { document.body.style.overflow = anterior; };
  }, [minimizado]);

  /* A janela é montada direto no <body>, fora da árvore da página.
     Dentro dela, qualquer card com z-index próprio pode acabar desenhado
     por cima — foi o que aconteceu com o calendário no iPhone. */
  return createPortal((
    <div className={`sheet-bg ${minimizado ? 'recolhido' : ''}`}
      onClick={() => !minimizado && fechar()} role="dialog" aria-modal={!minimizado} aria-label={titulo}>
      <div className={`sheet ${estado}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />

        <div className="sheet-head">
          {titulo && <h3>{titulo}</h3>}
          <div className="sheet-botoes">
            <button className="sheet-btn" aria-label={minimizado ? 'Restaurar' : 'Minimizar'}
              onClick={() => setEstado(minimizado ? 'normal' : 'minimo')}>
              {minimizado ? <IcoChevron size={15} /> : <IcoMinus size={15} />}
            </button>
            <button className="sheet-btn" aria-label={estado === 'cheio' ? 'Restaurar' : 'Maximizar'}
              onClick={() => setEstado(estado === 'cheio' ? 'normal' : 'cheio')}>
              <IcoMaximize size={15} />
            </button>
            <button className="sheet-btn fechar" aria-label="Fechar" onClick={fechar}>
              <IcoClose size={15} />
            </button>
          </div>
        </div>

        {!minimizado && (
          <>
            {subtitulo && <p className="sheet-sub">{subtitulo}</p>}
            {children}
          </>
        )}
      </div>
    </div>
  ), document.body);
}

/* ------------------------------------------------------------------ Toast */

export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return <div className="toast" role="status">{toast}</div>;
}

/* -------------------------------------------------- Seletor de competência */

export function SeletorCompetencia({ aberto, abrir, fechar }) {
  const { competencia, setCompetencia, competenciasDisponiveis, fechamentos } = useApp();

  return (
    <>
      <button className="btn btn-ghost" onClick={abrir} style={{ justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IcoCalendar size={18} />
          {nomeCompetencia(competencia)}
        </span>
        <IcoChevron size={16} />
      </button>

      {aberto && (
        <Sheet titulo="Competência" subtitulo="Cada mês tem contagem própria. Anos anteriores continuam consultáveis." fechar={fechar}>
          <div className="stack-2">
            {competenciasDisponiveis.map((c) => {
              const f = fechamentos.find((x) => x.id === c);
              return (
                <button key={c} className="item" style={{ width: '100%', textAlign: 'left' }}
                  onClick={() => { setCompetencia(c); fechar(); }}>
                  <div className="item-date"><b>{nomeCompetenciaCurto(c).split('/')[0]}</b><span>{c.slice(0, 4)}</span></div>
                  <div className="item-main">
                    <div className="t">{nomeCompetencia(c)}</div>
                    <div className="s">{f?.fechada ? 'Competência fechada' : 'Em andamento'}</div>
                  </div>
                  {c === competencia && <span className="tag tag-green">Atual</span>}
                </button>
              );
            })}
          </div>
        </Sheet>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ Vazio */

export function Vazio({ titulo, texto, acao }) {
  return (
    <div className="empty">
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18M12 14v4M10 16h4" />
      </svg>
      <b>{titulo}</b>
      <p style={{ margin: '0 0 16px' }}>{texto}</p>
      {acao}
    </div>
  );
}
