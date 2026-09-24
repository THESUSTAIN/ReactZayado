import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { fetchIaStatut } from "@/lib/kairosApi";

/**
 * Bandeau d'alerte « IA en repli ».
 *
 * Pourquoi : sans MAMMOTH_API_KEY, l'application ne tombe pas en erreur —
 * le Copilote IA, le Radar et l'Agent Business basculent silencieusement
 * sur un texte générique. Un prospect pouvait donc recevoir « Merci pour
 * votre message ! Je le transmets à l'équipe » à la place d'une vraie
 * réponse tarifaire, sans que rien ne l'indique à l'écran.
 *
 * Ne rend RIEN quand l'IA fonctionne : aucun bruit visuel en temps normal.
 */
export default function AiFallbackBanner() {
  const [statut, setStatut] = useState(null);

  useEffect(() => {
    let vivant = true;
    fetchIaStatut()
      .then((d) => {
        if (vivant) setStatut(d);
      })
      .catch(() => {
        // Statut indisponible : on reste silencieux plutôt que d'afficher
        // une fausse alerte.
      });
    return () => {
      vivant = false;
    };
  }, []);

  if (!statut || statut.ia_active !== false) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="bandeau-ia-repli"
      className="flex items-start gap-3 rounded-[18px] border border-amber-400/40 bg-amber-500/10 p-4 backdrop-blur-sm"
    >
      <AlertTriangle
        className="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400">
          IA en mode repli
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-offwhite/70">
          {statut.message ||
            "L'IA est en mode repli : le Copilote, le Radar et l'Agent Business répondent un texte générique."}
        </p>
      </div>
    </div>
  );
}
