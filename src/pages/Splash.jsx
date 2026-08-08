import { useEffect } from 'react';
import { LOGO } from '../components/UI.jsx';

/* A espera é curta de propósito: o app precisa abrir rápido no bolso do
   guarda. A marca aparece, o banco local carrega, e segue. */
export default function Splash({ aoTerminar, duracao = 700 }) {
  useEffect(() => {
    const t = setTimeout(aoTerminar, duracao);
    return () => clearTimeout(t);
  }, [aoTerminar, duracao]);

  return (
    <div className="splash">
      <img src={LOGO} alt="Brasão da Guarda Municipal de Itapajé" />
      <h1>GCM Ponto</h1>
      <p>Controle Inteligente da Jornada da Guarda Municipal</p>
      <div className="loader"><i /></div>
      <div className="foot">Funciona offline</div>
    </div>
  );
}
