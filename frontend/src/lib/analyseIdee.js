import { analyserIdee } from "@/lib/kairosApi";

// Analyse IA d'une idée : lancée UNE SEULE FOIS automatiquement (à la création ou à la 1re ouverture),
// puis gardée sur cet appareil. Pas de nouvel appel à chaque ouverture : on ne consomme pas de jetons pour rien.
// « Refaire » dans la fiche reste possible, à la demande.
const cle = (id) => `zayado_analyse_idee_${id}`;

export function lireAnalyse(id) {
  try { const brut = localStorage.getItem(cle(id)); return brut ? JSON.parse(brut) : null; } catch { return null; }
}
export function garderAnalyse(id, r) {
  try { localStorage.setItem(cle(id), JSON.stringify(r)); } catch { /* stockage indisponible : l'analyse reste affichée à l'écran */ }
}
export function oublierAnalyse(id) {
  try { localStorage.removeItem(cle(id)); } catch { /* rien */ }
}

// Demandes en cours (évite deux appels simultanés pour la même idée).
const enCours = new Map();
export function analyserEtGarder(id) {
  if (enCours.has(id)) return enCours.get(id);
  const p = analyserIdee(id)
    .then((r) => { if (r?.ia) garderAnalyse(id, r); return r; })
    .finally(() => enCours.delete(id));
  enCours.set(id, p);
  return p;
}
