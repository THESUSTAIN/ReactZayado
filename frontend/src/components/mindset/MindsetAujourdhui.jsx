import React, { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Compass, Sun, Loader2 } from "lucide-react";
import { fetchMindsetJour } from "@/lib/kairosApi";
import Exercice from "@/components/mindset/Exercice";

// Haut de l'onglet « Aujourd'hui » : la suggestion du moment (tirée des vraies
// données : énergie, Radar, Pouls) puis la carte du jour.
export default function MindsetAujourdhui({ onOuvrirParcours, onOuvrirCarnet }) {
  const [d, setD] = useState(null);
  const charger = () => fetchMindsetJour().then(setD).catch(() => setD({ erreur: true }));
  useEffect(() => { charger(); }, []);

  if (!d) return <div className="mb-6 flex items-center gap-2 text-sm text-offwhite/55"><Loader2 size={15} className="animate-spin text-gold" /> Préparation de ta carte du jour…</div>;
  if (d.erreur) return null;
  const s = d.suggestion;
  const carte = s?.type === "carte" ? s.carte : d.carte;

  return (
    <section className="mb-8" data-testid="mindset-aujourdhui">
      {s?.type === "parcours" && (
        <button onClick={() => onOuvrirParcours(s.parcours.id)}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-gold/35 bg-gold/[0.08] px-4 py-3 text-left transition hover:bg-gold/[0.12]" data-testid="mindset-suggestion">
          <Compass size={18} className="shrink-0 text-gold" />
          <span className="min-w-0 flex-1 text-[13.5px] text-offwhite/85">{s.raison} Le parcours <b className="text-gold">« {s.parcours.titre} »</b> peut t'aider.</span>
          <ArrowRight size={16} className="shrink-0 text-gold" />
        </button>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-[22px] border border-white/[0.16] bg-white/[0.10] p-5 backdrop-blur-xl sm:p-7" data-testid="mindset-carte">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
            <Sun size={14} /> {s?.type === "carte" ? s.raison : "Ta carte du jour"}
          </p>
          <h2 className="mt-2 font-display text-[26px] font-semibold leading-tight sm:text-[30px]">{carte.titre}</h2>
          {d.carte_faite && s?.type !== "carte" ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.08] px-4 py-3">
              <CheckCircle2 size={18} className="text-emerald-300" />
              <span className="text-[13.5px] text-offwhite/85">Fait pour aujourd'hui. Une nouvelle carte t'attend demain.</span>
              <button onClick={onOuvrirCarnet} className="ml-auto text-[12.5px] font-semibold text-gold hover:underline">Relire dans mon carnet</button>
            </div>
          ) : (
            <div className="mt-3">
              <Exercice source="carte" refId={carte.id} idee={carte.idee} exercice={carte.exercice} questions={carte.questions} onFait={charger} />
            </div>
          )}
        </div>

        <div className="rounded-[22px] border border-white/[0.14] bg-white/[0.06] p-5 sm:p-6" data-testid="mindset-parcours-actif">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-offwhite/55">Ton parcours</p>
          {d.parcours_actif ? (
            <>
              <p className="mt-2 font-display text-xl font-semibold">{d.parcours_actif.titre}</p>
              <div className="mt-3 flex gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <span key={n} className={`h-2 flex-1 rounded-full ${d.parcours_actif.jours_faits.includes(n) ? "bg-gold" : "bg-white/12"}`} />
                ))}
              </div>
              <p className="mt-2 text-[12.5px] text-offwhite/60">{d.parcours_actif.jours_faits.length} / 7 jours · {d.parcours_actif.jour_disponible ? `Jour ${d.parcours_actif.prochain_jour} disponible` : "prochain jour demain"}</p>
              <button onClick={() => onOuvrirParcours(d.parcours_actif.id)} className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/25 px-4 py-2 text-[12.5px] font-medium hover:bg-white/10">
                {d.parcours_actif.jour_disponible ? "Continuer" : "Revoir"} <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <>
              <p className="mt-2 text-[14px] leading-relaxed text-offwhite/75">7 jours, 5 minutes par jour, pour avancer sur un vrai frein d'entrepreneur : vendre, l'argent, dire non, rebondir.</p>
              <button onClick={() => onOuvrirParcours(null)} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-[12.5px] font-semibold text-navy-900">
                Choisir un parcours <ArrowRight size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
