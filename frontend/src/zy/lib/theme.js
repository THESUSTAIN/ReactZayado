// Thème de l'app : « clair » (ivoire, dans le style des pages publiques) ou « sombre » (bleu nuit).
// Choisi à l'inscription, modifiable dans Réglages ou le menu. Mémorisé sur l'appareil ET dans
// le profil (contexte_metier.theme) pour suivre la personne du téléphone à l'ordinateur.
import { saveProfile } from "@/zy/lib/kairosApi";

const CLE = "kairos_theme";

export function themeActuel() {
  try { return localStorage.getItem(CLE) === "clair" ? "clair" : "sombre"; } catch { return "sombre"; }
}

/** Applique le thème tout de suite ; `sauver` l'enregistre aussi dans le profil (compte connecté). */
export function appliquerTheme(theme, { sauver = false } = {}) {
  const clair = theme === "clair";
  if (typeof document !== "undefined") document.body.classList.toggle("theme-clair", clair);
  try { localStorage.setItem(CLE, clair ? "clair" : "sombre"); } catch { /* stockage indisponible */ }
  if (sauver) saveProfile({ contexte_metier: { theme: clair ? "clair" : "sombre" } }).catch(() => {});
}
