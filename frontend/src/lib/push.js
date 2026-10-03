// Notifications Web Push (VAPID) côté navigateur.
// Le token d'auth est ajouté automatiquement aux appels /api par le wrapper de index.js.
const API = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");

const supporte = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function base64UrlVersUint8(base64Url) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

export const pushSupporte = supporte;

export async function pushStatut() {
  if (!supporte()) return { actif: false, disponible: false, supporte: false };
  try {
    const r = await fetch(`${API}/api/push/statut`);
    if (!r.ok) return { actif: false, disponible: false, supporte: true };
    return { ...(await r.json()), supporte: true };
  } catch {
    return { actif: false, disponible: false, supporte: true };
  }
}

// Choix explicite de l'utilisateur de couper les notifications sur CET appareil :
// l'activation automatique (voir activerPushAuto) ne les remet alors pas.
const CLE_REFUS = "zayado_push_refus";
const CLE_DEMANDE = "zayado_push_demande_le";
const lire = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const ecrire = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* stockage indisponible */ } };

export async function activerPush() {
  if (!supporte()) throw new Error("Ton navigateur ne supporte pas les notifications.");
  ecrire(CLE_REFUS, null);
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Autorise les notifications dans ton navigateur.");

  const registration = await navigator.serviceWorker.ready;
  const { publicKey } = await fetch(`${API}/api/push/public-key`).then((r) => r.json());
  if (!publicKey) throw new Error("Notifications non configurées côté serveur.");

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlVersUint8(publicKey),
    });
  }
  const r = await fetch(`${API}/api/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!r.ok) throw new Error("Enregistrement de l'abonnement impossible.");
  return true;
}

export async function desactiverPush() {
  if (!supporte()) return;
  ecrire(CLE_REFUS, "1");
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await fetch(`${API}/api/push/subscribe`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  }).catch(() => {});
  await subscription.unsubscribe().catch(() => {});
}

export async function testerPush() {
  const r = await fetch(`${API}/api/push/test`, { method: "POST" });
  if (!r.ok) throw new Error("Active d'abord les notifications.");
  return r.json();
}

// ── Activation PAR DÉFAUT ──────────────────────────────────────────────
// Les notifications fonctionnent sans passer par les Paramètres :
// - permission déjà accordée → on abonne l'appareil en silence ;
// - permission jamais demandée → on la demande au premier geste de l'utilisateur
//   (obligatoire sur Safari / iOS, et mieux acceptée par Chrome), au plus une fois par semaine ;
// - permission refusée dans le navigateur, ou coupée à la main dans Paramètres → on ne force rien.
const UNE_SEMAINE = 7 * 24 * 3600 * 1000;
// App installée (PWA, écran d'accueil) : sur iOS c'est le SEUL cas où le push existe, et l'utilisateur
// a déjà choisi l'app → on redemande à chaque ouverture tant qu'il n'a ni accepté ni refusé.
const enPwa = () => {
  try { return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; } catch { return false; }
};
const delaiOk = () => enPwa() || Date.now() - Number(lire(CLE_DEMANDE) || 0) >= UNE_SEMAINE;

async function abonnerSilencieusement() {
  const registration = await navigator.serviceWorker.ready;
  const { publicKey } = await fetch(`${API}/api/push/public-key`).then((r) => r.json());
  if (!publicKey) return false;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlVersUint8(publicKey) });
  }
  // Idempotent côté serveur : (ré)enregistre l'abonnement pour le compte connecté.
  const r = await fetch(`${API}/api/push/subscribe`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()),
  });
  return r.ok;
}

// Retourne une fonction de nettoyage (retire l'écouteur de premier geste).
export function activerPushAuto({ notificationsActives = true } = {}) {
  if (!supporte() || !notificationsActives) return () => {};
  if (lire(CLE_REFUS) === "1" || Notification.permission === "denied") return () => {};
  let annule = false;

  const demarrer = async () => {
    try {
      const st = await pushStatut();
      if (annule || !st.disponible) return;       // clés VAPID absentes côté serveur : rien à faire
      if (Notification.permission === "granted") { await abonnerSilencieusement(); return; }
    } catch { /* silencieux : réessai à la prochaine ouverture */ }
  };

  const surPremierGeste = async () => {
    if (annule || Notification.permission !== "default") return;
    if (!delaiOk()) return;
    ecrire(CLE_DEMANDE, String(Date.now()));
    try {
      const st = await pushStatut();
      if (!st.disponible) return;
      await activerPush();
    } catch { /* refus ou fermeture de la fenêtre : on redemandera dans une semaine */ }
  };

  demarrer();
  const aDemander = Notification.permission === "default" && delaiOk();
  if (aDemander) {
    const options = { once: true, passive: true };
    window.addEventListener("pointerdown", surPremierGeste, options);
    window.addEventListener("keydown", surPremierGeste, options);
  }
  return () => {
    annule = true;
    window.removeEventListener("pointerdown", surPremierGeste);
    window.removeEventListener("keydown", surPremierGeste);
  };
}
