const CACHE_NAME = 'cafeworking-v37';
const CORE_ASSETS = ['/', '/offline.html', '/assets/css/style.css', '/assets/js/main.js'];

/* Duas estrategias, pelo tipo de arquivo:
 *
 *  - imagem em /assets/img/  -> cache primeiro. Sao os arquivos mais pesados do
 *    site e nao mudam de conteudo (foto nova = arquivo novo), entao servir do
 *    cache deixa a navegacao instantanea e economiza dados no celular.
 *  - todo o resto (HTML, CSS, JS) -> rede primeiro, com o cache como reserva.
 *    Assim uma publicacao nova aparece na hora e o site continua abrindo offline.
 */
const ehImagem = url => url.pathname.startsWith('/assets/img/');

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function guardar(request, response) {
  // So guarda resposta propria e bem-sucedida; erro e redirect nao entram no cache.
  if (!response || !response.ok || response.type !== 'basic') return response;
  const copia = response.clone();
  caches.open(CACHE_NAME).then(cache => cache.put(request, copia));
  return response;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (ehImagem(url)) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(r => guardar(request, r)))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(r => guardar(request, r))
      .catch(() => caches.match(request).then(cached => cached || caches.match('/offline.html')))
  );
});
