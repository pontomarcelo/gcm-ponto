import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/* A abertura em CSS puro do index.html some assim que o React assume a tela.
   O React já desenha a sua própria splash, então a troca é imperceptível. */
requestAnimationFrame(() => {
  window.__gcmMontou = true;   // desarma a rede de segurança do index.html
  const abertura = document.getElementById('abertura');
  if (!abertura) return;
  abertura.classList.add('saindo');
  setTimeout(() => abertura.remove(), 300);
});

/* Registro do service worker — é o que faz o app abrir sem internet. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL || './';
    navigator.serviceWorker
      .register(`${base}service-worker.js`)
      .then((registro) => {
        // Procura versão nova sem atrapalhar a abertura atual.
        registro.update?.().catch(() => {});

        /* Versão nova baixada com o app aberto: ela assume no lugar da antiga
           e a tela recarrega uma única vez, para não entrar em laço. */
        registro.addEventListener?.('updatefound', () => {
          const novo = registro.installing;
          novo?.addEventListener('statechange', () => {
            if (novo.state === 'installed' && navigator.serviceWorker.controller) {
              novo.postMessage('SKIP_WAITING');
            }
          });
        });
      })
      .catch((e) => console.warn('Service worker não registrado:', e));

    /* Na primeira visita o service worker assume o controle pela primeira vez.
       Recarregar aí seria um susto sem motivo — só recarrega quando havia um
       controlador antes, ou seja, quando uma versão nova substituiu a antiga. */
    const jaTinhaControlador = !!navigator.serviceWorker.controller;
    let recarregou = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!jaTinhaControlador || recarregou) return;
      recarregou = true;
      window.location.reload();
    });
  });
}
