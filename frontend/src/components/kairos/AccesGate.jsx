import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { fetchState, getToken } from "@/lib/kairosApi";
import { chargerAbonnement, oublierAbonnement } from "@/lib/acces";
import { aDroit, moduleDePage, NOMS_OFFRES, offreMin, planEffectif } from "@/lib/droits";
import { accueilPro, chargerEspace, enPro, pagesPro } from "@/lib/espace";

// Plus d'offre gratuite : sans offre active (ni rôle interne), l'espace /app
// renvoie d'abord vers l'onboarding si le projet n'a jamais été raconté,
// puis seulement vers /activer (essai 1 mois pour 1 € ou offre).
// Offre Rêveur : seules Vision, Idées (et le chat de l'en-tête) sont ouvertes.
export const oublierAcces = oublierAbonnement;

export default function AccesGate() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!pathname.startsWith("/app") || !getToken()) return;
    // Ma Foi suit la même règle d'accès que le reste de /app (offre active),
    // SAUF pour un membre TheSustain connecté par SSO (a.thesustain).
    Promise.all([chargerAbonnement(), chargerEspace()]).then(([a, esp]) => {
      // Espace Pro (entreprise) : seulement les pages des modules ouverts par le titulaire.
      if (esp?.entreprise && enPro()) {
        const ok = pagesPro(esp.entreprise.modules).some((p) => pathname.startsWith(p));
        if (!ok) navigate(accueilPro(esp.entreprise.modules), { replace: true });
        return;
      }
      if (a.acces === "aucun") {
        // Membre TheSustain (connecté par SSO) : Ma Foi reste ouverte sans offre Zayado.
        if (a.thesustain && pathname.startsWith("/app/ma-foi")) return;
        fetchState()
          .then((s) => navigate(s?.onboarded ? "/activer" : "/onboarding", { replace: true }))
          .catch(() => navigate("/activer", { replace: true }));
        return;
      }
      // Droits par offre : page au-dessus de l'offre → retour à une page autorisée + verrou expliqué.
      const plan = planEffectif(a);
      const mod = moduleDePage(pathname);
      if (mod && !aDroit(plan, mod)) {
        const repli = mod === "agent_business" && aDroit(plan, "agents") ? "/app/agents" : aDroit(plan, "cockpit") ? "/app" : "/app/vision";
        navigate(repli, { replace: true });
        toast(`Cette partie est incluse dès l'offre ${offreMin(mod)}`, {
          id: `verrou-${mod}`,
          description: `Ton offre actuelle : ${NOMS_OFFRES[plan] || plan}.`,
          action: { label: "Voir les offres", onClick: () => navigate("/pricing") },
        });
      }
    }).catch(() => {});
  }, [pathname, navigate]);
  return null;
}
