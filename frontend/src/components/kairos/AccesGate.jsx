import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchAbonnement, getToken } from "@/lib/kairosApi";

// Plus d'offre gratuite : sans offre active (ni rôle interne), l'espace /app
// renvoie vers /activer (essai 2 mois pour 1 € ou offre). Paramètres, Mon espace
// et l'onboarding restent accessibles (facturation, export des données).
let cache = { t: 0, acces: null };
export const oublierAcces = () => { cache = { t: 0, acces: null }; };

export default function AccesGate() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!pathname.startsWith("/app") || !getToken()) return;
    const verifier = (acces) => { if (acces === "aucun") navigate("/activer", { replace: true }); };
    if (cache.acces && Date.now() - cache.t < 60_000) { verifier(cache.acces); return; }
    fetchAbonnement().then((a) => { cache = { t: Date.now(), acces: a.acces }; verifier(a.acces); }).catch(() => {});
  }, [pathname, navigate]);
  return null;
}
