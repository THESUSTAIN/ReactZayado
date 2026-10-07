// Espace Perso / Pro (entreprise) : un seul compte, deux espaces.
// L'espace choisi est mémorisé sur cet appareil et envoyé au backend (en-tête X-Zayado-Espace),
// qui ne l'applique qu'aux modules autorisés par le titulaire.
const CLE = "zayado_espace";
const RH_URL = process.env.REACT_APP_RH_URL || "https://rh.zayado.net";

export const getEspace = () => { try { return localStorage.getItem(CLE) === "pro" ? "pro" : "perso"; } catch { return "perso"; } };
export const enPro = () => getEspace() === "pro";
export const setEspace = (v) => { try { localStorage.setItem(CLE, v === "pro" ? "pro" : "perso"); } catch { /* stockage indisponible */ } };

// Pages de l'app ouvertes en espace Pro, par module, et l'entrée du menu correspondante.
export const PAGES_MODULE = {
  actions: { pages: ["/app/actions", "/app/ideas", "/app/sources", "/app/processus"], menu: "actions", accueil: "/app/actions" },
  agents: { pages: ["/app/agents", "/app/chatbot-b2b"], menu: "agent", accueil: "/app/agents" },
  rh: { pages: [], menu: null, accueil: null, externe: RH_URL },
};
export const RH = RH_URL;

export const pagesPro = (modules = []) => modules.flatMap((m) => PAGES_MODULE[m]?.pages || []);
export const menusPro = (modules = []) => modules.map((m) => PAGES_MODULE[m]?.menu).filter(Boolean);
export const accueilPro = (modules = []) => modules.map((m) => PAGES_MODULE[m]?.accueil).find(Boolean) || "/compte";

let cache = { t: 0, data: null, promesse: null };
export function chargerEspace() {
  if (cache.data && Date.now() - cache.t < 60_000) return Promise.resolve(cache.data);
  if (cache.promesse) return cache.promesse;
  const API = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;
  cache.promesse = fetch(`${API}/espace/moi`, { headers: { "x-zayado-espace": "perso" } })
    .then((r) => (r.ok ? r.json() : { entreprise: null, perso: true }))
    .then((d) => {
      // Collègue sans accès perso : toujours dans l'espace de l'entreprise.
      if (d.entreprise && !d.perso && !enPro()) setEspace("pro");
      // Plus rattaché à une entreprise : retour à l'espace perso.
      if (!d.entreprise && enPro()) setEspace("perso");
      cache = { t: Date.now(), data: d, promesse: null };
      return d;
    })
    .catch(() => { cache.promesse = null; return { entreprise: null, perso: true }; });
  return cache.promesse;
}
export const oublierEspace = () => { cache = { t: 0, data: null, promesse: null }; };

// Bascule : on recharge l'app pour repartir sur des données propres à l'espace.
export function basculerEspace(v, destination) {
  setEspace(v);
  oublierEspace();
  window.location.assign(destination || (v === "pro" ? "/app/actions" : "/app"));
}
