// Service worker mínimo: permite instalar o app, sem cache
// (o cardápio vem sempre atualizado do Firebase).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
