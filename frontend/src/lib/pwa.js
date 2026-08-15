// PWA — enregistrement du service worker + abonnement Web Push (VAPID).
// Le backend expose /api/push/public-key et /api/push/subscribe (déjà en place).
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => {
        // Recharge automatiquement quand une NOUVELLE version du SW est installée
        // alors qu'une version tournait déjà (déploiement) → l'utilisateur récupère
        // le code/les couleurs à jour sans avoir à vider le cache manuellement.
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              window.location.reload();
            }
          });
        });
      })
      .catch((err) => console.warn("[PWA] SW registration failed:", err));
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// À appeler suite à une action utilisateur (ex: bouton "Activer les notifications").
export async function subscribeToPush(getUidHeader = {}) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, error: "Push non supporté par ce navigateur" };
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, error: "Permission refusée" };

  const reg = await navigator.serviceWorker.ready;
  let key = process.env.REACT_APP_VAPID_PUBLIC_KEY;
  if (!key) {
    try { key = (await axios.get(`${API}/push/public-key`)).data.public_key; } catch (e) { /* noop */ }
  }
  if (!key) return { ok: false, error: "Clé VAPID indisponible" };

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });
  await axios.post(`${API}/push/subscribe`, sub.toJSON(), { headers: getUidHeader });
  return { ok: true };
}
