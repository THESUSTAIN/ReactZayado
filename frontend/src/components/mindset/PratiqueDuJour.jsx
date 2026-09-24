import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Sun } from "lucide-react";
import { fetchMindsetJour } from "@/lib/kairosApi";

// Carte « Ta pratique du jour » du cockpit : 1 clic vers la carte du jour (ou
// vers la suggestion du moment : journée allégée, rebondir, revenus…).
export default function PratiqueDuJour() {
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  useEffect(() => { fetchMindsetJour().then(setD).catch(() => {}); }, []);
  if (!d) return null;
  const s = d.suggestion;
  const titre = s?.type === "carte" ? s.carte.titre : s?.type === "parcours" ? `Parcours « ${s.parcours.titre} »` : d.carte.titre;
  const sous = s ? s.raison : d.carte_faite ? "Fait pour aujourd'hui — bravo." : "Une idée, un exercice de 5 minutes.";
  const aller = () => navigate(s?.type === "parcours" ? `/app/bien-etre?tab=parcours&p=${s.parcours.id}` : "/app/bien-etre");
  return (
    <button onClick={aller} data-testid="cockpit-pratique-du-jour"
      className="glass mb-5 flex w-full items-center gap-4 rounded-2xl p-4 text-left transition hover:border-gold/40 animate-fade-up sm:p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
        {d.carte_faite && !s ? <CheckCircle2 className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10.5px] font-semibold uppercase tracking-[0.2em] text-gold">Ta pratique du jour · Mindset</span>
        <span className="mt-0.5 block truncate font-display text-[16px] font-bold text-offwhite">{titre}</span>
        <span className="block truncate text-[12.5px] text-offwhite/60">{sous}</span>
      </span>
      <span className="hidden shrink-0 items-center gap-1 rounded-full border border-white/20 px-3 py-1.5 text-[12px] font-medium text-offwhite sm:inline-flex">5 min <ArrowRight className="h-3.5 w-3.5" /></span>
    </button>
  );
}
