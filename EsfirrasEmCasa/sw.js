const CACHE_VERSION = '1.0.6';
const CACHE_NAME = `esfirras-cache-v${CACHE_VERSION}`;

// caminhos relativos à pasta do sw.js (funciona em /EsfirrasEmCasa/ e em testes locais)
const urlsToCache = [
  './',
  './index.html',
  `./script.js?v=${CACHE_VERSION}`,
  './img/logo-192.png',
  './img/logo-512.png'
];


// Instala
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch(() => {}) // sem internet na instalação não impede o SW de funcionar
  );
  self.skipWaiting();
});

// Ativa e remove caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

// Rede primeiro (sempre a versão mais nova); sem internet, usa o cache.
// Firebase, Tailwind e outros sites externos não passam pelo cache.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copia = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((res) =>
          res || (req.mode === "navigate" ? caches.match("./index.html") : undefined)
        ).then((res) => res || Response.error())
      )
  );
});

// Recebe comando para ativar imediatamente
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
