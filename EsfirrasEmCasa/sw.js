const CACHE_VERSION = '1.0.2'; 
const CACHE_NAME = `esfirras-cache-v${CACHE_VERSION}`;

const urlsToCache = [
  '/EsfirrasEmCasa/',
  '/EsfirrasEmCasa/index.html',
  `/EsfirrasEmCasa/script.js?v=${CACHE_VERSION}`,
  '/EsfirrasEmCasa/img/logo-192.png',
  '/EsfirrasEmCasa/img/logo-512.png'
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
