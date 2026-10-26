import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { Brain, Flame, Trophy, Award, Lock, Plus, Trash2, Sparkles, Check, ChevronRight, Gamepad2, Target } from "lucide-react";
import { useMemoire, changerModeJeu, ajouterVersetPerso, supprimerVersetPerso } from "./memoireStore";
import {
  catalogue, construireQuete, statut, STATUTS, niveauJoueur, serieEnCours, nbSus, nbMaitrises, BADGES,
  NIVEAU_MAX, libelleDelai, versetsARevoir,
} from "./memoireLogic";
import { Atelier, Anneau } from "./MemoireAide";
import { cleDuJour } from "./thesustainData";

/* Page « Mémoire » de Ma Foi : tableau de bord (niveau, série, badges), quête du jour et tous les versets de
   l'appli (Lecture biblique, Sagesse, parcours de 7 jours, versets personnels) avec leur progression.
   Tout est lu et enregistré sur le compte de l'utilisateur. */

const FILTRES = [
  { id: "tous", label: "Tous" },
  { id: "revoir", label: "À revoir" },
  { id: "encours", label: "En cours" },
  { id: "appris", label: "Appris" },
  { id: "maitrise", label: "Maîtrisés" },
  { id: "nouveau", label: "Nouveaux" },
];
const PAGE = 12;

const COULEUR_STATUT = {
  nouveau: "border-white/10 text-offwhite/50",
  encours: "border-sky-300/30 text-sky-200",
  appris: "border-emerald-300/30 text-emerald-200",
  revoir: "border-gold/50 bg-gold/10 text-gold",
  maitrise: "border-gold/40 text-gold",
};

function Interrupteur({ actif, onChange }) {
  return (
    <button role="switch" aria-checked={actif} onClick={() => onChange(!actif)} data-testid="memoire-mode-jeu"
      className="inline-flex min-h-[44px] items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-4 pr-2 text-sm text-offwhite/80">
      <span className="inline-flex items-center gap-1.5"><Gamepad2 className="h-4 w-4 text-gold" /> Mode jeu</span>
      <span className={`relative h-7 w-12 rounded-full transition-colors ${actif ? "bg-gold" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${actif ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function CarteJoueur({ jeu, progress }) {
  const niv = niveauJoueur(jeu.xp);
  const serie = serieEnCours(jeu.jours);
  const obtenus = new Set(jeu.badges.map((b) => b.id));
  return (
    <section className="rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/[0.09] to-white/[0.02] p-5" data-testid="memoire-joueur">
      <div className="flex items-center gap-4">
        <Anneau part={niv.part} taille={84} epaisseur={7}>
          <span className="text-center leading-none"><span className="block text-[10px] uppercase tracking-wider text-offwhite/50">Niv.</span><span className="font-display text-3xl font-extrabold text-offwhite">{niv.niveau}</span></span>
        </Anneau>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-bold text-offwhite">{niv.titre}</p>
          <p className="mt-0.5 text-sm text-offwhite/60">{niv.xpDansNiveau} / {niv.xpPourSuivant} XP vers le niveau {niv.niveau + 1}</p>
          <p className="mt-0.5 text-xs text-offwhite/40">{jeu.xp} XP au total</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { Icone: Flame, valeur: serie, label: serie > 1 ? "jours de suite" : "jour de suite" },
          { Icone: Check, valeur: nbSus(progress), label: "versets sus" },
          { Icone: Target, valeur: nbMaitrises(progress), label: "maîtrisés" },
        ].map(({ Icone, valeur, label }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3">
            <Icone className="mx-auto h-4 w-4 text-gold" />
            <p className="mt-1 font-display text-2xl font-extrabold text-offwhite">{valeur}</p>
            <p className="text-[11px] text-offwhite/50">{label}</p>
          </div>
        ))}
      </div>
      {jeu.meilleure_serie > 1 && <p className="mt-2 text-center text-xs text-offwhite/45">Meilleure série : {jeu.meilleure_serie} jours. Un jour de pause ne te fait rien perdre d'autre que la série.</p>}

      <div className="mt-4">
        <p className="mb-2 text-xs uppercase tracking-wider text-offwhite/45">Badges · {obtenus.size} / {BADGES.length}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BADGES.map((b) => {
            const ok = obtenus.has(b.id);
            return (
              <div key={b.id} title={b.desc} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${ok ? "border-gold/40 bg-gold/10" : "border-white/10 bg-white/[0.02]"}`} data-testid={`memoire-badge-${b.id}`}>
                {ok ? <Award className="h-4 w-4 shrink-0 text-gold" /> : <Lock className="h-4 w-4 shrink-0 text-offwhite/30" />}
                <span className="min-w-0"><span className={`block truncate text-xs font-semibold ${ok ? "text-offwhite" : "text-offwhite/45"}`}>{b.titre}</span><span className="block truncate text-[10px] text-offwhite/40">{b.desc}</span></span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CarteQuete({ quete, parRef, jeuActif, onOuvrir }) {
  const faits = quete.filter((q) => q.fait).length;
  const fini = quete.length > 0 && faits === quete.length;
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5" data-testid="memoire-quete">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-offwhite">
          {fini ? <Trophy className="h-5 w-5 text-gold" /> : <Sparkles className="h-5 w-5 text-gold" />}
          {jeuActif ? "Quête du jour" : "À réciter aujourd'hui"}
        </h2>
        <span className="text-sm font-semibold text-gold">{faits} / {quete.length}</span>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gold" style={{ width: `${quete.length ? (faits / quete.length) * 100 : 0}%`, transition: "width .6s ease" }} />
      </div>
      {fini && <p className="mt-3 text-sm text-emerald-200">{jeuActif ? "Quête accomplie. À demain !" : "Tout est récité pour aujourd'hui. À demain !"}</p>}
      <ul className="mt-3 space-y-2">
        {quete.map((q) => {
          const v = parRef[q.ref];
          if (!v) return null;
          return (
            <li key={q.ref}>
              <button onClick={() => onOuvrir(v)} className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:bg-white/[0.07]" data-testid="memoire-quete-verset">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${q.fait ? "border-emerald-300/50 bg-emerald-400/15 text-emerald-200" : "border-white/20 text-offwhite/30"}`}>{q.fait ? <Check className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}</span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-offwhite">{v.ref}</span><span className="line-clamp-1 text-xs text-offwhite/50">{v.text}</span></span>
                {!q.fait && <span className="shrink-0 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-navy-900">Réciter</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CarteVerset({ v, suivi, jour, onOuvrir, onSupprimer }) {
  const s = statut(suivi, jour);
  return (
    <div className="relative">
      <button onClick={() => onOuvrir(v)} className="flex h-full min-h-[104px] w-full items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-left transition hover:border-gold/30 hover:bg-white/[0.06]" data-testid="memoire-verset">
        <Anneau part={(suivi?.niveau || 0) / NIVEAU_MAX} taille={44} epaisseur={4}>
          <span className="text-xs font-bold text-offwhite">{suivi?.niveau || 0}</span>
        </Anneau>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-offwhite">{v.ref}</span>
          <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-offwhite/55">{v.text}</span>
          <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${COULEUR_STATUT[s]}`}>{STATUTS[s]}</span>
            {suivi?.prochain && s !== "revoir" && <span className="text-[10px] text-offwhite/40">révision {libelleDelai(suivi.prochain, jour)}</span>}
            <span className="truncate text-[10px] text-offwhite/35">{v.source}</span>
          </span>
        </span>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-offwhite/30" />
      </button>
      {onSupprimer && (
        <button onClick={onSupprimer} aria-label={`Retirer ${v.ref}`} className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full text-offwhite/35 hover:bg-rose-400/10 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
      )}
    </div>
  );
}

function AjoutPerso({ onFini }) {
  const [ref, setRef] = useState("");
  const [texte, setTexte] = useState("");
  const ajouter = () => {
    const r = ajouterVersetPerso(ref, texte);
    if (!r.ok) { toast.error(r.raison); return; }
    toast.success(`${r.ref} ajouté à ta liste`);
    onFini();
  };
  const champ = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-offwhite outline-none placeholder:text-offwhite/35 focus:border-gold/50";
  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4" data-testid="memoire-ajout">
      <label className="mb-1 block text-xs text-offwhite/55">Référence</label>
      <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Ex. Psaume 23:1" maxLength={60} className={champ} data-testid="memoire-ajout-ref" />
      <label className="mb-1 mt-3 block text-xs text-offwhite/55">Texte du verset</label>
      <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={3} maxLength={600} placeholder="Écris le verset tel que tu veux l'apprendre" className={champ} data-testid="memoire-ajout-texte" />
      <div className="mt-3 flex gap-2">
        <button onClick={ajouter} className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-gold px-5 text-sm font-semibold text-navy-900" data-testid="memoire-ajout-valider"><Plus className="h-4 w-4" /> Ajouter</button>
        <button onClick={onFini} className="min-h-[48px] rounded-2xl border border-white/15 bg-white/[0.06] px-5 text-sm text-offwhite">Annuler</button>
      </div>
    </div>
  );
}

export default function Memoire() {
  const { progress, jeu, pret } = useMemoire();
  const [filtre, setFiltre] = useState("tous");
  const [limite, setLimite] = useState(PAGE);
  const [atelier, setAtelier] = useState(null);
  const [ajout, setAjout] = useState(false);
  const jour = cleDuJour();

  const cat = useMemo(() => catalogue(jeu.perso), [jeu.perso]);
  const parRef = useMemo(() => Object.fromEntries(cat.map((v) => [v.ref, v])), [cat]);
  const quete = useMemo(() => construireQuete(progress, cat, jour), [progress, cat, jour]);
  const persoRefs = useMemo(() => new Set(jeu.perso.map((v) => v.ref)), [jeu.perso]);
  const nbRevoir = versetsARevoir(progress, jour).length;

  const compte = useMemo(() => {
    const c = { tous: cat.length, revoir: 0, encours: 0, appris: 0, maitrise: 0, nouveau: 0 };
    cat.forEach((v) => { c[statut(progress[v.ref], jour)] += 1; });
    return c;
  }, [cat, progress, jour]);
  const visibles = useMemo(() => {
    const l = cat.filter((v) => filtre === "tous" || statut(progress[v.ref], jour) === filtre);
    // À revoir d'abord, puis le reste dans l'ordre du catalogue.
    return filtre === "tous" ? [...l].sort((a, b) => (statut(progress[b.ref], jour) === "revoir") - (statut(progress[a.ref], jour) === "revoir")) : l;
  }, [cat, filtre, progress, jour]);

  const retirer = (v) => {
    if (window.confirm(`Retirer « ${v.ref} » de ta liste ? Sa progression sera effacée.`)) supprimerVersetPerso(v.ref);
  };

  return (
    <div className="animate-fade-up mx-auto max-w-3xl" data-testid="mafoi-memoire">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-offwhite sm:text-4xl">Mémoire</h1>
          <p className="mt-1 text-sm text-offwhite/60">Apprends des versets par cœur, un peu chaque jour. Ta progression est enregistrée sur ton compte.</p>
        </div>
        <Interrupteur actif={jeu.mode_jeu} onChange={changerModeJeu} />
      </div>

      {!pret && <p className="mb-4 text-xs text-offwhite/40">Chargement de ta progression…</p>}

      <div className="space-y-4">
        {jeu.mode_jeu && <CarteJoueur jeu={jeu} progress={progress} />}
        <CarteQuete quete={quete} parRef={parRef} jeuActif={jeu.mode_jeu} onOuvrir={setAtelier} />
      </div>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-offwhite"><Brain className="h-5 w-5 text-gold" /> Mes versets</h2>
          {nbRevoir > 0 && <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold">{nbRevoir} à revoir</span>}
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar" role="tablist" aria-label="Filtrer les versets">
          {FILTRES.map((f) => (
            <button key={f.id} role="tab" aria-selected={filtre === f.id} onClick={() => { setFiltre(f.id); setLimite(PAGE); }} data-testid={`memoire-filtre-${f.id}`}
              className={`min-h-[40px] shrink-0 rounded-full border px-4 text-sm ${filtre === f.id ? "border-gold/50 bg-gold/15 text-gold" : "border-white/10 text-offwhite/60 hover:text-offwhite"}`}>
              {f.label} <span className="ml-1 text-xs opacity-60">{compte[f.id]}</span>
            </button>
          ))}
        </div>

        {visibles.length === 0
          ? <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center text-sm text-offwhite/50">Aucun verset dans cette catégorie pour l'instant.</p>
          : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {visibles.slice(0, limite).map((v) => (
                <CarteVerset key={v.ref} v={v} suivi={progress[v.ref]} jour={jour} onOuvrir={setAtelier} onSupprimer={persoRefs.has(v.ref) ? () => retirer(v) : null} />
              ))}
            </div>
          )}
        {visibles.length > limite && (
          <button onClick={() => setLimite(limite + PAGE)} className="mt-3 min-h-[48px] w-full rounded-2xl border border-white/15 bg-white/[0.05] text-sm text-offwhite hover:bg-white/10" data-testid="memoire-voir-plus">Voir plus ({visibles.length - limite})</button>
        )}

        {ajout
          ? <AjoutPerso onFini={() => setAjout(false)} />
          : <button onClick={() => setAjout(true)} className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-gold/40 text-sm font-medium text-gold hover:bg-gold/[0.06]" data-testid="memoire-ajouter"><Plus className="h-4 w-4" /> Ajouter mon propre verset</button>}
      </section>

      {atelier && <Atelier verset={atelier} onClose={() => setAtelier(null)} />}
    </div>
  );
}
