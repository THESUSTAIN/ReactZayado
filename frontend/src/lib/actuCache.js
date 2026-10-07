// Cache de l'onglet Actualité : affichage instantané, rafraîchissement en arrière-plan.
//
// Avant : chaque ouverture du chat relançait « L'IA prépare ton bref du jour… » (spinner plein écran), ce qui
// donnait l'impression que l'IA ne travaillait pas en arrière-plan. Maintenant :
//  - le bref est préchargé dès l'ouverture de l'app (voir Header → prechargerActu) ;
//  - il est gardé en mémoire ET dans le navigateur (survit à un rechargement) ;
//  - à l'ouverture du chat on affiche TOUJOURS ce qu'on a, puis on met à jour discrètement si c'est vieux.
import { fetchActualite } from "@/lib/kairosApi";

const CLE = "zayado_actu_cache_v2";
const VALIDITE_MS = 10 * 60 * 1000;   // au-delà, on rafraîchit en douce (le serveur, lui, garde le bref du jour)

const memoire = {};                    // filtre -> { t, sig, data }
let lu = false;

const stockage = {
  lire() { try { return JSON.parse(localStorage.getItem(CLE) || "{}"); } catch { return {}; } },
  ecrire(o) { try { localStorage.setItem(CLE, JSON.stringify(o)); } catch { /* stockage plein ou indisponible */ } },
  vider() { try { localStorage.removeItem(CLE); } catch { /* */ } },
};

function chargerDepuisStockage() {
  if (lu) return;
  lu = true;
  Object.assign(memoire, stockage.lire());
}

export const signatureActu = (contexte) =>
  JSON.stringify(Object.entries(contexte || {}).filter(([k]) => k.startsWith("actu_") && k !== "actu_bref").sort());

/** Dernier résultat connu pour ce filtre : { data, t, perime } ou null. `perime` = à rafraîchir en douce. */
export function actuConnue(filtre, signature) {
  chargerDepuisStockage();
  const m = memoire[filtre];
  if (!m || m.sig !== signature) return null;
  // Le bref du jour ne change qu'à la prochaine actualisation prévue (demain à l'heure choisie) : ouvrir le chat
  // ne relance plus rien avant cette heure-là. Sans date connue, on garde l'ancienne règle (10 min).
  const prochaine = Date.parse(m.data?.prochaine_maj || "");
  const perime = (Number.isFinite(prochaine) ? Date.now() >= prochaine : Date.now() - m.t > VALIDITE_MS)
    || (m.data?.articles?.length > 0 && !m.data?.ia && Date.now() - m.t > 15 * 60 * 1000);   // bref sans IA : on retente le vrai bref
  return { data: m.data, t: m.t, perime };
}

export function oublierActu() {
  Object.keys(memoire).forEach((k) => delete memoire[k]);
  stockage.vider();
  lu = true;
}

const limiter = (d) => {
  if (d?.articles) d.articles = d.articles.slice(0, Math.max(1, Math.min(3, Number(d?.prefs?.nb) || Number(d?.limite) || 3)));
  return d;
};

const enCours = {};

/** Charge (réseau) et garde en cache. Plusieurs appels simultanés pour le même filtre partagent la même requête. */
export function chargerActu(filtre = "tout", { signature = "", force = false } = {}) {
  const cle = `${filtre}|${force ? "f" : ""}`;
  if (enCours[cle]) return enCours[cle];
  enCours[cle] = fetchActualite(filtre === "tout" ? "" : filtre, { force })
    .then((d) => {
      limiter(d);
      if (!d?.masque && !d?.erreur && d?.configure !== false) {
        chargerDepuisStockage();
        memoire[filtre] = { t: Date.now(), sig: signature, data: d };
        stockage.ecrire(memoire);
      }
      return d;
    })
    .finally(() => { delete enCours[cle]; });
  return enCours[cle];
}

/** À appeler dès que l'app est ouverte : le bref est prêt avant même que le chat ne s'ouvre. */
export function prechargerActu(contexte) {
  const signature = signatureActu(contexte);
  let filtre = "tout";
  try { filtre = localStorage.getItem("zayado_actu_filtre") || "tout"; } catch { /* */ }
  const c = actuConnue(filtre, signature);
  if (c && !c.perime) return;
  chargerActu(filtre, { signature }).catch(() => {});
}

// Autre compte connecté sur ce navigateur : on n'affiche jamais l'actu de la personne précédente.
if (typeof window !== "undefined") {
  window.addEventListener("zayado:token", oublierActu);
}
