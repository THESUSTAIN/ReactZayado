import React, { useEffect, useRef } from "react";
import ConfidentialiteContenu from "@/components/legal/ConfidentialiteContenu";

// Version légère à intégrer en iframe sur Shopify / Instant :
//   https://app.zayado.net/embed/confidentialite
// Envoie sa hauteur à la page parente pour que l'iframe s'ajuste.
export default function ConfidentialiteEmbed() {
  const racine = useRef(null);
  useEffect(() => {
    document.title = "Politique de confidentialité — Zayado";
    const envoyer = () => {
      const h = racine.current ? Math.ceil(racine.current.getBoundingClientRect().height) + 8 : 0;
      try { window.parent.postMessage({ type: "zayado-confidentialite-hauteur", hauteur: h }, "*"); } catch { /* hors iframe */ }
    };
    envoyer();
    const obs = new ResizeObserver(envoyer);
    if (racine.current) obs.observe(racine.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={racine} className="bg-navy-900 px-4 py-8 text-offwhite sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 font-display text-2xl font-bold text-offwhite">Politique de confidentialité</h1>
        <ConfidentialiteContenu compact />
      </div>
    </div>
  );
}
