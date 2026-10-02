// Service worker Zayado — installabilité PWA, sûr pour le hot-reload.
// Règle d'or : ne JAMAIS mettre en cache le JS/CSS hashé (cause d'écran blanc
// sur l'ancien sw.js). On fait du network-first pour les navigations, avec une
// coquille (shell) de secours hors-ligne. Tout le reste passe par le réseau.
const CACHE = "zayado-shell-v2";

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
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "" }; }
  const title = data.title || "Zayado";
  const options = {
    body: data.body || "",
    icon: "/logo192.png",
    badge: "/logo192.png",
    tag: data.tag || "zayado",
    data: { url: data.url || "/app" },
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/app", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => new URL(c.url).origin === self.location.origin);
      if (existing) { existing.navigate(target); return existing.focus(); }
      return self.clients.openWindow(target);
    }),
  );
});
