import React, { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import GrilleTarifs from "@/components/pricing/GrilleTarifs";

// Page légère à intégrer en iframe sur Shopify / Instant :
//   https://app.zayado.net/embed/tarifs                 → Solo (essai 1 mois pour 1 €), Pro + contact
//   https://app.zayado.net/embed/tarifs?offres=pro      → Pro seul (page Agent Business)
//   &cycle=annuel  → affiche d'abord les prix annuels   ·  &contact=0 → sans bandeau Équipe
// Elle envoie sa hauteur à la page parente pour que l'iframe s'ajuste toute seule.
export default function TarifsEmbed() {
  const [params] = useSearchParams();
  const racine = useRef(null);
  const offres = (params.get("offres") || "").split(",").map((s) => s.trim()).filter(Boolean);

  useEffect(() => {
    document.title = "Tarifs Zayado";
    const envoyer = () => {
      const h = racine.current ? Math.ceil(racine.current.getBoundingClientRect().height) + 8 : 0;
      try { window.parent.postMessage({ type: "zayado-tarifs-hauteur", hauteur: h }, "*"); } catch { /* hors iframe */ }
    };
    envoyer();
    const obs = new ResizeObserver(envoyer);
    if (racine.current) obs.observe(racine.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={racine} className="bg-navy-900 px-4 py-8 text-offwhite sm:px-6">
      <GrilleTarifs
        embed
        offres={offres.length ? offres : null}
        contact={params.get("contact") !== "0"}
        cycleInitial={params.get("cycle") === "annuel" ? "annuel" : "mensuel"}
      />
    </div>
  );
}
