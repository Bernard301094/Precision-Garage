self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  // Estratégia de rede primeiro para garantir que a API sempre funcione
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
