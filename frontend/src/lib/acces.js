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

// Offre Rêveur : Vision Board, Idées et chat IA (le chat est dans l'en-tête).
// Ma Foi n'est plus dans cette liste : elle suit désormais la même règle
// d'accès payant que le reste de /app (voir AccesGate.jsx).
// Idées est maintenant l'onglet du Plan d'action : Rêveur y accède (onglets Idées et Objectifs).
export const PAGES_REVEUR = ["/app/vision", "/app/actions", "/app/ideas", "/app/sources"];
export const pageAutorisee = (plan, pathname) =>
  plan !== "reveur" || !pathname.startsWith("/app") || PAGES_REVEUR.some((p) => pathname.startsWith(p));
// Clés du menu accessibles en Rêveur.
export const MENU_REVEUR = ["vision", "actions"];
