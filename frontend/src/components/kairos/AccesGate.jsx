import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { fetchState, getToken } from "@/lib/kairosApi";
import { chargerAbonnement, oublierAbonnement, pageAutorisee } from "@/lib/acces";

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
    chargerAbonnement().then((a) => {
      if (a.acces === "aucun") {
        fetchState()
          .then((s) => navigate(s?.onboarded ? "/activer" : "/onboarding", { replace: true }))
          .catch(() => navigate("/activer", { replace: true }));
        return;
      }
      if (!pageAutorisee(a.plan, pathname)) {
        navigate("/app/vision", { replace: true });
        if (pathname !== "/app") {
          toast("Cette partie est incluse dans l'offre Solo", {
            id: "reveur-verrou",
            description: "Ton offre Rêveur comprend la Vision, les Idées et le chat IA.",
            action: { label: "Voir Solo", onClick: () => navigate("/pricing") },
          });
        }
      }
    }).catch(() => {});
  }, [pathname, navigate]);
  return null;
}
