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

export async function activerPush() {
  if (!supporte()) throw new Error("Ton navigateur ne supporte pas les notifications.");
  const permission = await Notification.requestPermission();
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
