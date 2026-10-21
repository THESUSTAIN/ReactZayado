import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, Zap, Scale, Sparkles, X } from "lucide-react";
import { call } from "@/zy/lib/part2Api";
import { VisionCanvas } from "@/zy/components/vision/VisionCanvas";
import { ElanPanneau, ONGLETS_ELAN, useElanEvenement } from "@/zy/components/vision/ElanPanneau";

/* Vision & Élan — UNE seule page : l'atelier plein écran (canvas libre).
   Plus de galerie ni de vue liste. Élan s'ouvre en tiroir sur le côté
   (idées, lettres, mur), sans quitter le board. */
export default function VisionBoard() {
  const [params, setParams] = useSearchParams();
  const board = params.get("board") || undefined;
  const elan = ONGLETS_ELAN.includes(params.get("elan")) ? params.get("elan") : null;

  const maj = useCallback((patch) => {
    setParams((p) => {
      const n = new URLSearchParams(p);
      Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
      n.delete("view");
      return n;
    }, { replace: true });
  }, [setParams]);
  useElanEvenement(useCallback((o) => maj({ elan: o }), [maj]));

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-navy-900" style={{ backgroundImage: "var(--zy-fond)" }} data-testid="vision-page">
      <div className="relative z-[80] flex items-center gap-3 border-b border-white/10 bg-navy-800/90 px-4 py-2.5 backdrop-blur">
        <Link to="/" data-testid="vision-retour-accueil"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 px-3 py-1.5 text-[12.5px] font-semibold text-offwhite/75 transition-colors hover:border-gold/40 hover:text-gold">
          <ChevronLeft size={14} /> Accueil
        </Link>
        <p className="text-[14px] font-bold text-offwhite" data-testid="vision-titre">Vision &amp; Élan</p>
        <span className="hidden text-[12px] text-offwhite/45 md:inline">Ton atelier plein écran — l'IA propose, tu valides.</span>
        <span className="ml-auto" />
        <DecisionsDiscernees />
        <button onClick={() => maj({ elan: elan === "analyser" ? null : "analyser" })} data-testid="vision-analyser" aria-pressed={elan === "analyser"}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${elan === "analyser" ? "bg-[#FAF7F1] text-[#1A2B57]" : "border border-[#EADFC0]/50 text-[#EADFC0] hover:bg-white/10"}`}>
          <Sparkles size={14} /> <span className="hidden sm:inline">Analyser ce projet</span>
        </button>
        <button onClick={() => maj({ elan: elan ? null : "idees" })} data-testid="vision-elan-toggle" aria-pressed={!!elan}
          className={` inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${elan ? "bg-gold text-navy-900" : "border border-gold/40 text-gold hover:bg-gold/10"}`}>
          <Zap size={14} /> Élan
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <VisionCanvas key={board || "defaut"} />
        <ElanPanneau onglet={elan} onOnglet={(o) => maj({ elan: o })} onFermer={() => maj({ elan: null })}
          murActif={board === "elan"} onOuvrirMur={() => maj({ board: "elan" })} />
      </div>
    </div>
  );
}


/* Ma Foi ↔ Vision : les décisions discernées dans Ma Foi éclairent le cap.
   Rien ne s'affiche si Ma Foi n'est pas activée (elle reste facultative). */
function DecisionsDiscernees() {
  const [d, setD] = useState(null);
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => { call("/vision/discernement").then(setD).catch(() => setD(null)); }, []);
  if (!d?.actif || !d.decisions?.length) return null;
  const date = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "");
  return (
    <div className="relative">
      <button onClick={() => setOuvert((v) => !v)} aria-expanded={ouvert} data-testid="vision-decisions"
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 px-3 py-1.5 text-[12.5px] font-semibold text-offwhite/80 hover:border-gold/40">
        <Scale size={14} /> <span className="hidden sm:inline">Décisions</span> {d.decisions.length}
      </button>
      {ouvert && (
        <div className="fixed inset-x-3 top-[58px] z-[90] rounded-2xl border border-white/15 bg-gradient-to-b from-[#213C70] to-[#12254C] p-4 shadow-[0_28px_70px_-10px_rgba(2,8,26,0.75)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[22rem]">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#DEC2A3]">Décisions en discernement</p>
            <button onClick={() => setOuvert(false)} aria-label="Fermer" className="rounded-lg p-1 text-offwhite/60 hover:bg-white/10"><X size={14} /></button>
          </div>
          <ul className="space-y-2.5">
            {d.decisions.map((x) => (
              <li key={x.jour + x.decision} className="border-b border-white/10 pb-2.5 last:border-0 last:pb-0">
                <p className="text-sm font-semibold text-offwhite">{x.decision}</p>
                {x.pourquoi ? <p className="mt-0.5 text-[12.5px] text-offwhite/65">{x.pourquoi}</p> : null}
                {x.reevaluer_le ? <p className="mt-1 text-[11.5px] text-offwhite/50">Faire le point le {date(x.reevaluer_le)} (dans ton Plan d'action)</p> : null}
              </li>
            ))}
          </ul>
          <Link to="/app/ma-foi" className="mt-3 inline-flex text-[12.5px] font-semibold text-[#DEC2A3] hover:underline">Discerner une décision dans Ma Foi →</Link>
        </div>
      )}
    </div>
  );
}
