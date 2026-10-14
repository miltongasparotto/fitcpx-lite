// Service worker mínimo do painel do personal. Existe só para o navegador oferecer "Instalar aplicativo".
// NÃO guarda nada em cache, de propósito: o sistema sempre vem da rede, então nunca serve JS ou CSS velho
// (o cache do navegador já causou tela preta antes; ver o ?v= nos scripts de index.html). Consequência: sem modo offline.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request));
});
