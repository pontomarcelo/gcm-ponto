/* GCM Ponto — Service Worker
 *
 * Prioridade número um: abrir rápido, sempre.
 *
 * O app é offline por natureza — os dados moram no IndexedDB do aparelho e
 * nada depende de servidor. Logo, esperar a rede antes de desenhar a tela é
 * puro desperdício. Aqui o cache responde primeiro e a atualização acontece
 * em segundo plano, valendo na próxima abertura.
 */

const VERSION = 'gcm-ponto-v1.2.0';
const CACHE_FONTES = 'gcm-ponto-fontes-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './logo/gcm-logo.png',
  './logo/gcm-logo-pdf.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      // addAll falha inteiro se um item falhar; item a item é mais tolerante
      .then((cache) => Promise.allSettled(APP_SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(
        chaves.filter((c) => c !== VERSION && c !== CACHE_FONTES).map((c) => caches.delete(c))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/** Guarda a resposta sem segurar quem está esperando a tela. */
function guardar(cacheNome, request, response) {
  if (response && response.status === 200 && response.type !== 'opaque') {
    const copia = response.clone();
    caches.open(cacheNome).then((c) => c.put(request, copia)).catch(() => {});
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  const ehFonte = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  /* Google Drive e login NUNCA passam pelo cache.
     A regra geral lá embaixo é "cache primeiro", e ela guardaria a resposta do
     Drive: a sincronização passaria a ler para sempre a mesma versão velha do
     arquivo, achando que estava atualizada. Aqui o pedido vai direto à rede. */
  const ehGoogleAPI = url.hostname === 'accounts.google.com'
    || (url.hostname.endsWith('googleapis.com') && !ehFonte);
  if (ehGoogleAPI) return;

  /* Navegação: entrega o app shell do cache na hora.
     A rede continua rodando por trás para a próxima abertura já vir nova. */
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cacheado) => {
        const rede = fetch(request)
          .then((res) => guardar(VERSION, './index.html', res))
          .catch(() => cacheado);

        if (cacheado) {
          event.waitUntil(rede.catch(() => {}));
          return cacheado;
        }
        return rede;
      })
    );
    return;
  }

  /* Fontes do Google: cache próprio, que sobrevive à troca de versão do app.
     Sem isso, a tipografia trava a primeira pintura em conexão ruim. */
  if (ehFonte) {
    event.respondWith(
      caches.match(request).then((cacheado) =>
        cacheado || fetch(request).then((res) => guardar(CACHE_FONTES, request, res)).catch(() => cacheado)
      )
    );
    return;
  }

  /* Demais arquivos: cache primeiro, rede só quando não houver cópia.
     Os nomes gerados pelo Vite têm hash, então cache antigo nunca conflita. */
  event.respondWith(
    caches.match(request).then((cacheado) => {
      if (cacheado) return cacheado;
      return fetch(request).then((res) => guardar(VERSION, request, res));
    })
  );
});
