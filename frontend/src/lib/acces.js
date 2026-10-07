import { fetchAbonnement } from "@/lib/kairosApi";

// État d'abonnement partagé (1 appel par minute au plus) : accès, offre, équipe.
let cache = { t: 0, data: null, promesse: null };
export const oublierAbonnement = () => { cache = { t: 0, data: null, promesse: null }; };

export function chargerAbonnement() {
  if (cache.data && Date.now() - cache.t < 60_000) return Promise.resolve(cache.data);
  if (cache.promesse) return cache.promesse;
  cache.promesse = fetchAbonnement()
    .then((d) => { cache = { t: Date.now(), data: d, promesse: null }; return d; })
    .catch((e) => { cache.promesse = null; throw e; });
  return cache.promesse;
}

// Salarié / invité d'une équipe « Ton entreprise » SANS offre perso : il n'a rien à payer et n'a accès
// qu'à l'espace équipe (présence, absences, planning). Jamais renvoyé vers le Cockpit ni la page de paiement.
export const estSalarie = (a) => Boolean(a?.salarie) && a?.acces !== "actif";
export const PAGES_SALARIE = ["/app/entreprise"];

// Offre Rêveur : Vision Board, Idées et chat IA (le chat est dans l'en-tête).
// Ma Foi est ouverte dès l'offre Rêveur (droits.js : mafoi → « reveur »).
// Idées est maintenant l'onglet du Plan d'action : Rêveur y accède (onglets Idées et Objectifs).
export const PAGES_REVEUR = ["/app/vision", "/app/actions", "/app/ideas", "/app/sources", "/app/bien-etre", "/app/ma-foi", "/app/debloquer"];
export const pageAutorisee = (plan, pathname) =>
  plan !== "reveur" || !pathname.startsWith("/app") || PAGES_REVEUR.some((p) => pathname.startsWith(p));
// Clés du menu accessibles en Rêveur (Bien-être carte du jour incluse).
export const MENU_REVEUR = ["vision", "actions", "wellbeing", "mafoi"];
