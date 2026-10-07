import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Sun, Church } from "lucide-react";
import { fetchMindsetJour } from "@/lib/kairosApi";
import { useKairos } from "@/context/KairosContext";

// Carte « Ta pratique du jour » du cockpit : 1 clic vers la carte du jour (ou
// vers la suggestion du moment : journée allégée, rebondir, revenus…).
//
// Une seule pratique par jour. Quand « Ma Foi » est activée, c'est ELLE la pratique :
// avant, le cockpit poussait vers Mindset pendant que Ma Foi proposait son propre
// geste du jour — deux disciplines à tenir dans une application qui promet de ne pas
// épuiser. L'utilisateur a déjà choisi dans ses réglages ; on respecte son choix.
export default function PratiqueDuJour() {
  const navigate = useNavigate();
  const { contexte } = useKairos();
  const [d, setD] = useState(null);
  useEffect(() => { fetchMindsetJour().then(setD).catch(() => {}); }, []);

  if (contexte?.parcours_foi === true) {
    return (
      <button onClick={() => navigate("/app/ma-foi")} data-testid="cockpit-pratique-du-jour"
        className="glass mb-5 flex w-full items-center gap-4 rounded-2xl p-4 text-left transition hover:border-gold/40 animate-fade-up sm:p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold"><Church className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10.5px] font-semibold uppercase tracking-[0.2em] text-gold">Ta pratique du jour · Ma Foi</span>
          <span className="mt-0.5 block truncate font-display text-[16px] font-bold text-offwhite">Le verset et les gestes du jour</span>
          <span className="block truncate text-[12.5px] text-offwhite/60">Ta pause, ta mémoire, ton parcours — au même endroit.</span>
        </span>
        <span className="hidden shrink-0 items-center gap-1 rounded-full border border-white/20 px-3 py-1.5 text-[12px] font-medium text-offwhite sm:inline-flex">Ouvrir <ArrowRight className="h-3.5 w-3.5" /></span>
      </button>
    );
  }

  // Une réponse incomplète ne doit JAMAIS emporter la page d'accueil. Ici,
  // `d.carte.titre` plantait dès que la réponse arrivait sans `carte` — et comme
  // cette carte est montée au milieu du cockpit, sans barrière d'erreur au-dessus,
  // c'est l'accueil ENTIER qui devenait blanc. Un champ manquant vaut une carte
  // en moins, pas une page en moins.
  const s = d?.suggestion;
  const titre = s?.type === "carte" ? s.carte?.titre
    : s?.type === "parcours" ? `Parcours « ${s.parcours?.titre || "en cours"} »`
    : d?.carte?.titre;
  if (!titre) return null;
  const sous = s ? s.raison : d.pratique_faite ? "Fait pour aujourd'hui — bravo." : "Une idée, un exercice de 5 minutes.";
  const aller = () => navigate(s?.type === "parcours" && s.parcours?.id ? `/app/bien-etre?tab=parcours&p=${s.parcours.id}` : "/app/bien-etre");
  return (
    <button onClick={aller} data-testid="cockpit-pratique-du-jour"
      className="glass mb-5 flex w-full items-center gap-4 rounded-2xl p-4 text-left transition hover:border-gold/40 animate-fade-up sm:p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
        {d.pratique_faite && !s ? <CheckCircle2 className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
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
