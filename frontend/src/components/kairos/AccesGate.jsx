import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchState, getToken } from "@/lib/kairosApi";
import { chargerAbonnement, oublierAbonnement, PAGES_SALARIE } from "@/lib/acces";
import { aDroit, moduleDePage, planEffectif } from "@/lib/droits";
import { accueilPro, chargerEspace, enPro, pagesPro } from "@/lib/espace";

// Plus d'offre gratuite : sans offre active (ni rôle interne), l'espace /app
// renvoie d'abord vers l'onboarding si le projet n'a jamais été raconté,
// puis seulement vers /activer (essai 1 mois pour 1 € ou offre).
// Offre Rêveur : Vision, Idées, Bien-être, Ma Foi (et le chat de l'en-tête) sont ouvertes.
export const oublierAcces = oublierAbonnement;

export default function AccesGate() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!pathname.startsWith("/app") || !getToken()) return;
    // Page d'invitation : un compte tout neuf (sans offre) doit pouvoir la voir, sinon il part payer avant de rejoindre.
    if (pathname.startsWith("/app/entreprise/rejoindre")) return;
    // Ma Foi est ouverte dès l'offre Rêveur (droits.js) ; un membre TheSustain
    // connecté par SSO (a.thesustain) y accède même sans offre Zayado.
    Promise.all([chargerAbonnement(), chargerEspace()]).then(([a, esp]) => {
      // Espace Pro (entreprise) : seulement les pages des modules ouverts par le titulaire.
      if (esp?.entreprise && enPro()) {
        const ok = pagesPro(esp.entreprise.modules).some((p) => pathname.startsWith(p));
        if (!ok) navigate(accueilPro(esp.entreprise.modules), { replace: true });
        return;
      }
      // Salarié d'une équipe « Ton entreprise » sans offre perso : son seul espace est l'équipe (rien à payer).
      // Invitation d'équipe en attente pour cette adresse : on l'accepte avant tout (jamais de paiement).
      if (a.acces === "aucun" && !a.salarie && a.invitation) {
        navigate(`/app/entreprise/rejoindre?token=${encodeURIComponent(a.invitation)}`, { replace: true });
        return;
      }
      if (a.acces === "aucun" && a.salarie) {
        if (!PAGES_SALARIE.some((p) => pathname.startsWith(p))) navigate("/app/entreprise", { replace: true });
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
      // Droits par offre : page au-dessus de l'offre.
      const plan = planEffectif(a);
      const mod = moduleDePage(pathname);
      if (mod && !aDroit(plan, mod) && !pathname.startsWith("/app/debloquer")) {
        if (mod === "cockpit") {
          // Accueil /app verrouillé (ex. Rêveur) : atterrir sur une page accessible,
          // jamais sur un upsell — on ne pousse l'upsell que sur un clic volontaire.
          const home = aDroit(plan, "vision") ? "/app/vision"
            : aDroit(plan, "bienetre") ? "/app/bien-etre" : "/app/debloquer?m=cockpit";
          navigate(home, { replace: true });
        } else {
          // Module précis cliqué et verrouillé → page d'upsell « Débloquer » (plus agréable qu'un toast).
          navigate(`/app/debloquer?m=${mod}`, { replace: true });
        }
      }
    }).catch(() => {});
  }, [pathname, navigate]);
  return null;
}
