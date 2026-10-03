// Service worker Zayado — installabilité PWA, sûr pour le hot-reload.
// Règle d'or : ne JAMAIS mettre en cache le JS/CSS hashé (cause d'écran blanc
// sur l'ancien sw.js). On fait du network-first pour les navigations, avec une
// coquille (shell) de secours hors-ligne. Tout le reste passe par le réseau.
const CACHE = "zayado-shell-v3";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // ne jamais toucher aux POST/PUT (API, partages)
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // same-origin seulement
  if (url.pathname.startsWith("/api/")) return; // laisser l'API au réseau

  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put("/app", net.clone()).catch(() => {});
        return net;
      } catch {
        const cache = await caches.open(CACHE);
        return (await cache.match("/app")) || (await cache.match(req)) || Response.error();
      }
    })());
  }
  // Assets statiques : pass-through réseau (pas de cache du JS/CSS → pas d'écran blanc).
});

// ── Notifications Web Push (VAPID) ──
// - App au premier plan (onglet visible ET fenêtre active) : pas de notification système, on prévient les
//   pages ouvertes, qui jouent un son et affichent un bandeau (voir src/lib/alertes.js). Avant, rien ne
//   sonnait quand l'app était ouverte sur ordinateur.
// - Sinon (app fermée, en arrière-plan, onglet caché) : vraie notification système, avec vibration.
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "" }; }
  const title = data.title || "Zayado";
  const url = data.url || "/app";
  event.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    fenetres.forEach((c) => c.postMessage({ type: "zayado-push", title, body: data.body || "", url, tag: data.tag || "zayado" }));
    const devant = fenetres.some((c) => c.visibilityState === "visible" && c.focused);
    if (devant) return;
    await self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/logo192.png",
      badge: "/logo192.png",
      tag: data.tag || "zayado",
      data: { url },
      renotify: true,
      silent: false,
      vibrate: [120, 60, 120],
    });
  })());
});

// Clic sur la notification : on ramène l'app au premier plan et on lui demande d'ouvrir la bonne page
// (sans rechargement complet, donc sans perdre la conversation en cours).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/app", self.location.origin).href;
  event.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existante = fenetres.find((c) => new URL(c.url).origin === self.location.origin);
    if (existante) {
      try { await existante.focus(); } catch { /* focus refusé */ }
      existante.postMessage({ type: "zayado-ouvrir", url: target });
      return;
    }
    await self.clients.openWindow(target);
  })());
});
