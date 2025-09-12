const CACHE_VERSION = '1.0.3'; // aumente sempre que fizer mudanças
const CACHE_NAME = `esfirras-cache-v${CACHE_VERSION}`;

const urlsToCache = [
  '/',
  '/EsfirrasEmCasa/index.html',
  '/script.js?v=1.0.0',
  '/img/logo-192.png',
  '/img/logo-512.png'
];

// Instala
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
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

// Busca do cache ou rede
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((res) => res || fetch(event.request))
  );
});

// Recebe comando para ativar imediatamente
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
