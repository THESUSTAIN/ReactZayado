// Service worker Zayado — installabilité PWA, sûr pour le hot-reload.
// Règle d'or : ne JAMAIS mettre en cache le JS/CSS hashé (cause d'écran blanc
// sur l'ancien sw.js). On fait du network-first pour les navigations, avec une
// coquille (shell) de secours hors-ligne. Tout le reste passe par le réseau.
const CACHE = "zayado-shell-v4";
// Contenu reçu par le menu « Partager » du téléphone (images, lien, texte), gardé le temps de choisir où le ranger.
const CACHE_PARTAGE = "zayado-partage-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE && k !== CACHE_PARTAGE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Réception d'un partage (Web Share Target, méthode POST) : on garde les fichiers dans le cache du navigateur,
// puis on ouvre la page « Envoyer vers mon Vision Board » où la personne choisit la destination.
async function recevoirPartage(req) {
  try {
    const form = await req.formData();
    const cache = await caches.open(CACHE_PARTAGE);
    for (const k of await cache.keys()) await cache.delete(k); // un seul partage en attente à la fois
    const fichiers = form.getAll("medias").filter((f) => f && typeof f === "object" && f.size > 0).slice(0, 8);
    for (let i = 0; i < fichiers.length; i += 1) {
      await cache.put(`/_partage/fichier/${i}`, new Response(fichiers[i], {
        headers: { "Content-Type": fichiers[i].type || "application/octet-stream", "X-Nom": encodeURIComponent(fichiers[i].name || `image-${i}`) },
      }));
    }
    const meta = { title: String(form.get("title") || ""), text: String(form.get("text") || ""), url: String(form.get("url") || ""), n: fichiers.length, le: Date.now() };
    await cache.put("/_partage/meta", new Response(JSON.stringify(meta), { headers: { "Content-Type": "application/json" } }));
  } catch (e) { /* partage illisible : la page s'ouvre quand même, vide */ }
  return Response.redirect(new URL("/app/partager?depuis=partage", self.location.origin).href, 303);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method === "POST" && url.origin === self.location.origin && url.pathname === "/app/partager") {
    event.respondWith(recevoirPartage(req));
    return;
  }
  if (req.method !== "GET") return; // ne jamais toucher aux autres POST/PUT (API)
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
      icon: "/notif-icon.png",
      badge: "/notif-badge.png",
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
