import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Lock, Loader2, Trophy } from "lucide-react";
import { fetchParcoursListe, fetchParcours, demarrerParcours } from "@/lib/kairosApi";
import Exercice from "@/components/mindset/Exercice";

// Onglet « Parcours » : 4 programmes de 7 jours, un jour débloqué par jour.
function Liste({ items, onOuvrir }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2" data-testid="mindset-parcours-liste">
      {items.map((p) => (
        <button key={p.id} onClick={() => onOuvrir(p.id)}
          className="group flex flex-col rounded-[22px] border border-white/[0.14] bg-white/[0.08] p-5 text-left backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-gold/45 sm:p-6"
          data-testid={`mindset-parcours-${p.id}`}>
          <span className="h-1.5 w-12 rounded-full" style={{ background: p.couleur }} />
          <p className="mt-4 font-display text-[22px] font-semibold leading-tight">{p.titre}</p>
          <p className="mt-1 text-[13.5px] text-offwhite/70">{p.sous_titre}</p>
          <p className="mt-3 text-[12.5px] leading-relaxed text-offwhite/55">Pour toi si : {p.pour_qui}</p>
          <div className="mt-5 flex items-center gap-3">
            <div className="flex flex-1 gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => <span key={n} className={`h-1.5 flex-1 rounded-full ${p.jours_faits.includes(n) ? "bg-gold" : "bg-white/12"}`} />)}
            </div>
            <span className="text-[12px] font-semibold text-gold">
              {p.termine ? "Terminé ✓" : p.demarre ? `${p.jours_faits.length}/7` : "7 jours"}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function Detail({ id, onRetour }) {
  const [d, setD] = useState(null);
  const [jour, setJour] = useState(null);
  const charger = (choisir = false) => fetchParcours(id).then((x) => {
    setD(x);
    if (choisir || jour == null) setJour(x.demarre ? (x.jour_disponible ? x.prochain_jour : (x.jours_faits.slice(-1)[0] || 1)) : 1);
  }).catch(() => toast.error("Parcours introuvable"));
  useEffect(() => { charger(true); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!d) return <Loader2 size={18} className="animate-spin text-gold" />;
  const demarrer = async () => { await demarrerParcours(id); toast.success("C'est parti : jour 1 !"); charger(true); };
  const j = d.contenu.find((x) => x.n === jour) || d.contenu[0];
  const fait = d.jours_faits.includes(j.n);
  const accessible = d.demarre && (fait || (j.n === d.prochain_jour && d.jour_disponible));

  return (
    <div data-testid="mindset-parcours-detail">
      <button onClick={onRetour} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-offwhite/65 hover:text-offwhite"><ArrowLeft size={15} /> Tous les parcours</button>
      <div className="rounded-[22px] border border-white/[0.16] bg-white/[0.10] p-5 backdrop-blur-xl sm:p-7">
        <span className="h-1.5 w-12 rounded-full block" style={{ background: d.couleur }} />
        <h2 className="mt-4 font-display text-[28px] font-semibold leading-tight sm:text-[34px]">{d.titre}</h2>
        <p className="mt-1 text-[14px] text-offwhite/70">{d.sous_titre}</p>
        {d.termine && <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold/15 px-3 py-1.5 text-[12.5px] font-semibold text-gold"><Trophy size={14} /> Parcours terminé — bravo, c'est dans tes victoires</p>}

        {/* Les 7 jours */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {d.contenu.map((x) => {
            const ok = d.jours_faits.includes(x.n);
            const dispo = d.demarre && x.n === d.prochain_jour && d.jour_disponible;
            const verrou = !ok && !dispo;
            return (
              <button key={x.n} onClick={() => setJour(x.n)} data-testid={`mindset-jour-${x.n}`}
                className={`flex min-w-[88px] flex-1 flex-col items-center gap-1 rounded-2xl border px-2 py-3 transition ${jour === x.n ? "border-gold bg-gold/15" : "border-white/12 bg-white/[0.04] hover:border-white/30"}`}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${ok ? "bg-gold text-navy-900" : dispo ? "border-2 border-gold text-gold" : "bg-white/10 text-offwhite/45"}`}>
                  {ok ? <Check size={14} strokeWidth={3} /> : verrou ? <Lock size={12} /> : x.n}
                </span>
                <span className="text-[11px] text-offwhite/60">Jour {x.n}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 border-t border-white/10 pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Jour {j.n}</p>
          <h3 className="mt-1 font-display text-[22px] font-semibold">{j.titre}</h3>
          {!d.demarre ? (
            <div className="mt-4">
              <p className="font-serif-italic text-[17px] leading-relaxed text-offwhite/85">{d.contenu[0].idee}</p>
              <p className="mt-3 text-[13px] text-offwhite/60">Pour qui : {d.pour_qui}</p>
              <button onClick={demarrer} className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-6 text-[14px] font-semibold text-navy-900" data-testid="mindset-demarrer">
                Commencer le parcours <ArrowRight size={16} />
              </button>
            </div>
          ) : accessible ? (
            <div className="mt-3">
              <Exercice key={`${id}-${j.n}`} source="parcours" refId={`${id}:${j.n}`} idee={j.idee} exercice={j.exercice} questions={j.questions}
                reponses={j.reponses} libelle={`Valider le jour ${j.n}`} onFait={() => charger(true)} />
            </div>
          ) : (
            <p className="mt-4 flex items-center gap-2 text-[14px] text-offwhite/65"><Lock size={15} className="text-gold" />
              {j.n === d.prochain_jour ? "Ce jour se débloque demain : un jour à la fois, c'est ce qui fait la différence." : "Termine d'abord les jours précédents."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MindsetParcours({ ouvert, onOuvrir }) {
  const [items, setItems] = useState(null);
  useEffect(() => { if (!ouvert) fetchParcoursListe().then((d) => setItems(d.items)).catch(() => setItems([])); }, [ouvert]);
  if (ouvert) return <Detail id={ouvert} onRetour={() => onOuvrir(null)} />;
  if (!items) return <Loader2 size={18} className="animate-spin text-gold" />;
  return (
    <div>
      <p className="mb-5 max-w-2xl text-[14px] leading-relaxed text-offwhite/70">Choisis un frein sur lequel avancer. Chaque jour : une idée, un exercice de 5 minutes, tes réponses gardées dans ton carnet. Un jour se débloque chaque jour.</p>
      <Liste items={items} onOuvrir={onOuvrir} />
    </div>
  );
}
