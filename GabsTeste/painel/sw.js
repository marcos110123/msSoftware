// O painel antigo usava um service worker que guardava as páginas em cache
// (e continuava mostrando a versão velha). Este arquivo substitui aquele:
// apaga o cache, se desliga e recarrega as abas abertas com a versão nova.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const chaves = await caches.keys();
    await Promise.all(chaves.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const abas = await self.clients.matchAll({ type: "window" });
    abas.forEach((aba) => aba.navigate(aba.url));
  })());
});
