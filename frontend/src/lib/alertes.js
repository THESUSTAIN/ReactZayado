// Alertes de l'app : un petit son + un bandeau quand quelque chose arrive (réponse de l'IA, actu, relance),
// et une vraie notification système quand l'app n'est pas au premier plan.
//
// Avant : le service worker affichait la notification système et c'est tout. Sur ordinateur, l'app ouverte
// ne faisait AUCUN bruit (Chrome/Edge sont souvent muets pour les notifications web) et, à l'inverse,
// rien ne prévenait quand l'IA finissait de répondre pendant que l'onglet était en arrière-plan.
import { toast } from "sonner";

const CLE_SON = "zayado_son_notif";

export const sonActif = () => { try { return localStorage.getItem(CLE_SON) !== "0"; } catch { return true; } };
export const reglerSon = (actif) => { try { localStorage.setItem(CLE_SON, actif ? "1" : "0"); } catch { /* stockage indisponible */ } };

// ── Son (WebAudio : aucun fichier à charger). Les navigateurs exigent un premier geste pour l'autoriser. ──
let contexte = null;
const audio = () => {
  if (contexte) return contexte;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) contexte = new AC();
  } catch { /* pas d'audio */ }
  return contexte;
};

export function debloquerSon() {
  const c = audio();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

if (typeof window !== "undefined") {
  const opts = { once: true, passive: true };
  const premierGeste = () => { debloquerSon(); };
  window.addEventListener("pointerdown", premierGeste, opts);
  window.addEventListener("keydown", premierGeste, opts);
  window.addEventListener("touchstart", premierGeste, opts);
}

// Deux notes douces (sol puis ré aigu), ~0,45 s. Volume discret.
export function jouerSon() {
  if (!sonActif()) return;
  const c = audio();
  if (!c) return;
  try {
    if (c.state === "suspended") c.resume().catch(() => {});
    const t0 = c.currentTime + 0.01;
    [[784, 0], [1174.7, 0.16]].forEach(([freq, decalage]) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + decalage);
      gain.gain.exponentialRampToValueAtTime(0.16, t0 + decalage + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + decalage + 0.3);
      osc.connect(gain).connect(c.destination);
      osc.start(t0 + decalage);
      osc.stop(t0 + decalage + 0.32);
    });
  } catch { /* son impossible : le bandeau suffit */ }
}

// ── Ouverture d'une adresse depuis une alerte (géré par AutoPush, qui a accès au routeur) ──
export const ouvrirAdresse = (url) => window.dispatchEvent(new CustomEvent("zayado:ouvrir-url", { detail: url || "/app" }));

const appAuPremierPlan = () => {
  try { return document.visibilityState === "visible" && document.hasFocus(); } catch { return true; }
};

let dernierSignal = 0;
export const signalRecent = (ms = 20000) => Date.now() - dernierSignal < ms;

/**
 * Prévient l'utilisateur.
 *  - app au premier plan : son + bandeau (avec bouton « Ouvrir ») ;
 *  - app en arrière-plan ou onglet caché : son + notification système (si autorisée).
 * `systeme: false` quand le service worker vient déjà d'afficher la notification système.
 */
export async function signaler({ titre, corps = "", url = "/app", tag = "zayado", systeme = true }) {
  dernierSignal = Date.now();
  jouerSon();
  if (appAuPremierPlan()) {
    toast(titre, {
      description: corps ? String(corps).slice(0, 160) : undefined,
      duration: 8000,
      action: { label: "Ouvrir", onClick: () => ouvrirAdresse(url) },
    });
    return;
  }
  if (!systeme) return;
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && "serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(titre, {
        body: String(corps || "").slice(0, 180), icon: "/logo192.png", badge: "/logo192.png",
        tag, renotify: true, data: { url }, vibrate: [120, 60, 120],
      });
    }
  } catch { /* notification système indisponible */ }
}
