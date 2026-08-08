import { useCallback, useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { BottomNav, Toast } from './components/UI.jsx';
import Splash from './pages/Splash.jsx';
import Cadastro from './pages/Cadastro.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Calendario from './pages/Calendario.jsx';
import Historico from './pages/Historico.jsx';
import Estatisticas from './pages/Estatisticas.jsx';
import Relatorio from './pages/Relatorio.jsx';
import Ajustes from './pages/Ajustes.jsx';
import Documentos from './pages/Documentos.jsx';
import Lancamento from './pages/Lancamento.jsx';

const ABAS = ['dashboard', 'calendario', 'historico', 'estatisticas', 'ajustes'];

function Interno() {
  const { pronto, perfil } = useApp();
  const [splash, setSplash] = useState(true);
  const [tela, setTela] = useState('dashboard');
  const [lancamento, setLancamento] = useState(null); // { registro, data } | null

  /* Rota simples via hash: permite atalhos do PWA e o botão voltar do Android. */
  useEffect(() => {
    const aplicarHash = () => {
      const alvo = window.location.hash.replace('#/', '');
      if (alvo === 'lancamento') { setLancamento({ registro: null }); return; }
      if ([...ABAS, 'relatorio', 'documentos'].includes(alvo)) setTela(alvo);
    };
    aplicarHash();
    window.addEventListener('hashchange', aplicarHash);
    return () => window.removeEventListener('hashchange', aplicarHash);
  }, []);

  const ir = useCallback((destino) => {
    setTela(destino);
    window.location.hash = `#/${destino}`;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const abrirLancamento = useCallback((registro = null, data = null) => {
    setLancamento({ registro, data });
  }, []);

  if (splash || !pronto) return <Splash aoTerminar={() => setSplash(false)} />;

  if (!perfil) return <Cadastro aoConcluir={() => ir('dashboard')} />;

  return (
    <div className="app">
      {tela === 'dashboard' && <Dashboard ir={ir} abrirLancamento={abrirLancamento} />}
      {tela === 'calendario' && <Calendario abrirLancamento={abrirLancamento} />}
      {tela === 'historico' && <Historico abrirLancamento={abrirLancamento} />}
      {tela === 'estatisticas' && <Estatisticas />}
      {tela === 'relatorio' && <Relatorio voltar={() => ir('dashboard')} />}
      {tela === 'documentos' && <Documentos />}
      {tela === 'ajustes' && <Ajustes ir={ir} />}

      {lancamento && (
        <Lancamento
          registro={lancamento.registro}
          dataSugerida={lancamento.data}
          fechar={() => setLancamento(null)}
        />
      )}

      <BottomNav atual={ABAS.includes(tela) ? tela : 'dashboard'} ir={ir} />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Interno />
    </AppProvider>
  );
}
