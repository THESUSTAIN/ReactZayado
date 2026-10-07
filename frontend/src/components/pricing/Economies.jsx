import React from "react";
import { Check } from "lucide-react";
import { OUTILS_REMPLACES } from "@/lib/plans";

// « Ce que Zayado remplace » : prix publics des outils qu'un indépendant paierait
// séparément. Chiffres indicatifs (septembre 2026), sourcés dans lib/plans.js.
export default function Economies({ compact = false }) {
  return (
    <div data-testid="economies">
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06]">
        {OUTILS_REMPLACES.map((o) => (
          <div key={o.outil} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/[0.08] px-4 py-3 last:border-b-0 sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-offwhite">{o.outil}</p>
              <p className="text-[12px] text-offwhite/55">{o.role}</p>
            </div>
            <p className="text-[14px] text-offwhite/60 line-through decoration-rose-300/60">{o.prix} {o.devise} / mois</p>
            <p className="inline-flex min-w-[112px] items-center justify-end gap-1 text-[12.5px] font-semibold text-gold"><Check size={14} /> inclus dès {o.inclus}</p>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3 bg-gold/[0.10] px-4 py-3.5 sm:px-5">
          <p className="flex-1 text-[14px] font-semibold text-offwhite">Séparément : plus de 200 € / mois</p>
          <p className="text-[14px] font-bold text-gold">Zayado Pro : 69 € HT / mois (49 € au tarif fondateur)</p>
        </div>
      </div>
      {!compact && (
        <p className="mt-2 text-[11px] leading-relaxed text-offwhite/45">
          Prix publics mensuels constatés en septembre 2026 sur les sites des éditeurs (en $ ou en €, hors taxes le plus souvent), donnés à titre indicatif.
          Zayado n'est pas affilié à ces éditeurs ; les quotas et fonctionnalités diffèrent d'un outil à l'autre.
        </p>
      )}
    </div>
  );
}
