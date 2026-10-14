// Service worker mínimo do portal do aluno (mesmo do painel). Existe só para o navegador oferecer "Instalar aplicativo".
// NÃO guarda nada em cache, de propósito: o portal sempre vem da rede, então nunca serve JS ou CSS velho.
// Consequência: sem modo offline.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request));
});
