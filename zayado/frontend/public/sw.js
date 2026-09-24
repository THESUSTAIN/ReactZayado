// Service worker de nettoyage (kill-switch).
// L'ancien sw.js ('kairos-v1') renvoyait parfois `undefined` au lieu d'une
// Response : le JS/CSS ne chargeait plus et l'app restait sur un écran blanc.
// Cette version vide tous les caches, se désinscrit et recharge les onglets
// ouverts. Elle n'intercepte plus aucune requête.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url).catch(() => {}));
  })());
});
