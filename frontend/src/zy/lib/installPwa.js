// Garde l'invite d'installation du navigateur (beforeinstallprompt). Elle n'est envoyée qu'UNE fois, très tôt :
// sans ce module, la bannière « Installer Zayado » la consommait et Paramètres n'avait plus rien à proposer.
let invite = null;
const abonnes = new Set();

export const dejaInstalle = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);

export const estIOS = () =>
  typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

export const estAndroid = () => typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

export const invitePrete = () => invite;

export function surChangement(fn) {
  abonnes.add(fn);
  return () => abonnes.delete(fn);
}

export async function installer() {
  if (!invite) return "indisponible";
  const e = invite;
  invite = null;
  e.prompt();
  let choix = "ferme";
  try { choix = (await e.userChoice)?.outcome === "accepted" ? "installe" : "refuse"; } catch { /* invite fermée */ }
  abonnes.forEach((f) => f());
  return choix;
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    invite = e;
    abonnes.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => { invite = null; abonnes.forEach((f) => f()); });
}
