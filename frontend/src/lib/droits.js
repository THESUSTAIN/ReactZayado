// Droits par offre — source unique côté interface.
// Chaque module a une offre minimale ; une page ou un bouton au-dessus de l'offre du
// compte affiche un verrou « Inclus dès … » (avant : seule l'offre Rêveur était filtrée).
// Le serveur applique les mêmes règles (paywall IA, quotas d'agents et de chatbots).
import { useEffect, useState } from "react";
import { chargerAbonnement } from "@/lib/acces";

export const ORDRE_OFFRES = ["essentielle", "reveur", "serenite", "pro", "business", "entreprise"];
export const NOMS_OFFRES = { essentielle: "Sans offre", reveur: "Rêveur", serenite: "Solo", pro: "Pro", business: "Équipe", entreprise: "Entreprise" };

export const MODULES_MIN = {
  vision: "reveur", idees: "reveur", chat: "reveur",
  cockpit: "serenite", actions: "serenite", radar: "serenite", revue: "serenite", bienetre: "serenite",
  agents: "serenite", documents: "serenite", mafoi: "serenite",
  agent_business: "pro", alertes: "pro",
  rh: "business", equipe: "business",
};

// Page → module (le plus précis d'abord).
const PAGES = [
  ["/app/chatbot-b2b", "agent_business"], ["/app/agents", "agents"], ["/app/radar", "radar"],
  ["/app/revue", "revue"], ["/app/bien-etre", "bienetre"], ["/app/ma-foi", "mafoi"],
  ["/app/vision", "vision"], ["/app/actions", "idees"], ["/app/ideas", "idees"], ["/app/sources", "idees"],
  ["/app/processus", "actions"], ["/app/collaborateurs", "cockpit"],
];
export const moduleDePage = (pathname) => (pathname === "/app" ? "cockpit" : (PAGES.find(([p]) => pathname.startsWith(p)) || [])[1] || null);

// « Voir l'app comme… » : un admin peut prévisualiser une offre (seulement dans l'interface).
const CLE_APERCU = "zayado_apercu_plan";
export const apercuPlan = () => { try { return localStorage.getItem(CLE_APERCU) || null; } catch { return null; } };
export const setApercuPlan = (p) => { try { if (p) localStorage.setItem(CLE_APERCU, p); else localStorage.removeItem(CLE_APERCU); } catch { /* */ } };

export function planEffectif(abo) {
  if (!abo) return null;
  const ap = apercuPlan();
  if (abo.role_interne) return ap && ORDRE_OFFRES.includes(ap) ? ap : "entreprise";
  if (abo.equipe) return "serenite";
  if (abo.acces !== "actif") return "essentielle";
  return abo.plan || "essentielle";
}
export const aDroit = (plan, module) =>
  plan == null || ORDRE_OFFRES.indexOf(plan) >= ORDRE_OFFRES.indexOf(MODULES_MIN[module] || "reveur");
export const offreMin = (module) => NOMS_OFFRES[MODULES_MIN[module]] || "Solo";

export function usePlanEffectif() {
  const [plan, setPlan] = useState(null);
  useEffect(() => { chargerAbonnement().then((a) => setPlan(planEffectif(a))).catch(() => {}); }, []);
  return plan;
}
