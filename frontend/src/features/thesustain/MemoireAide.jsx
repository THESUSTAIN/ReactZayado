import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Brain, BookOpen, Target, RefreshCw, Pencil, Check, Loader2, Play, MapPin, RotateCcw, Eye, EyeOff,
  ArrowLeft, ArrowRight, X, Sparkles, Flame, Trophy, Award,
} from "lucide-react";
import { useLocal } from "./store";
import { useMemoire, reciter } from "./memoireStore";
import {
  nettoyer, mots, norm, motsCles, comparer, statut, STATUTS, niveauJoueur, libelleDelai, SEUIL_REUSSITE,
} from "./memoireLogic";

/* Apprendre un verset par cœur, dans un « atelier » plein écran : une étape à la fois (lire, comprendre,
   répéter, réciter), gros textes et gros boutons, lisible sur téléphone. La progression, les XP, la série et
   les badges sont enregistrés sur le compte (voir memoireStore.js). */

const LIEUX_DEFAUT = ["Entrée", "Salon", "Cuisine", "Couloir", "Chambre", "Bureau", "Salle de bain", "Jardin"];

const ETAPES = [
  { id: "lire", label: "Lire", Icon: BookOpen },
  { id: "comprendre", label: "Comprendre", Icon: Target },
  { id: "repeter", label: "Répéter", Icon: RefreshCw },
  { id: "reciter", label: "Réciter", Icon: Pencil },
];

const btnPrimaire = "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-gold px-5 text-sm font-semibold text-navy-900 transition hover:bg-gold-hover disabled:opacity-40";
const btnSecondaire = "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-5 text-sm text-offwhite transition hover:bg-white/10 disabled:opacity-30";

/* Anneau de progression (utilisé ici et sur la page Mémoire). */
export function Anneau({ part = 0, taille = 48, epaisseur = 4, className = "", children }) {
  const r = (taille - epaisseur) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, part));
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${className}`} style={{ width: taille, height: taille }}>
      <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`} className="-rotate-90" aria-hidden="true">
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={epaisseur} />
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="currentColor" strokeWidth={epaisseur} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: "stroke-dashoffset .8s ease" }} className="text-gold" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </span>
  );
}

/* ───────────────────────── L'atelier ───────────────────────── */
export function Atelier({ verset, onClose }) {
  const [etape, setEtape] = useState(0);
  const { jeu } = useMemoire();
  const niv = niveauJoueur(jeu.xp);

  useEffect(() => {
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const touche = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", touche);
    return () => { document.body.style.overflow = avant; window.removeEventListener("keydown", touche); };
  }, [onClose]);

  const derniere = etape === ETAPES.length - 1;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-navy-900 text-offwhite" role="dialog" aria-modal="true" aria-label={`Apprendre ${verset.ref}`} data-testid="mafoi-atelier">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)]">
        <button onClick={onClose} aria-label="Fermer" data-testid="mafoi-atelier-fermer" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-offwhite/80 hover:text-offwhite"><X className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold text-gold">{verset.ref}</p>
          <p className="text-xs text-offwhite/55">Étape {etape + 1} sur {ETAPES.length} · {ETAPES[etape].label}</p>
        </div>
        {jeu.mode_jeu && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold" data-testid="mafoi-atelier-niveau">
            <Sparkles className="h-3.5 w-3.5" /> Niv. {niv.niveau} · {jeu.xp} XP
          </span>
        )}
      </header>

      <div className="flex gap-1.5 px-4 py-3" role="tablist" aria-label="Étapes">
        {ETAPES.map((e, i) => (
          <button key={e.id} role="tab" aria-selected={i === etape} aria-label={`Étape ${i + 1} : ${e.label}`} onClick={() => setEtape(i)} data-testid={`mafoi-memoire-etape-${e.id}`}
            className="group flex flex-1 flex-col gap-1.5 text-left">
            <span className={`h-2 w-full rounded-full transition-colors ${i <= etape ? "bg-gold" : "bg-white/10"}`} />
            <span className={`hidden text-[11px] sm:block ${i === etape ? "text-gold" : "text-offwhite/40"}`}>{e.label}</span>
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto px-4 pb-6 pt-2">
        <div className="mx-auto w-full max-w-xl">
          {etape === 0 && <Lire verset={verset} />}
          {etape === 1 && <Comprendre verset={verset} />}
          {etape === 2 && <Repeter verset={verset} />}
          {etape === 3 && <Reciter verset={verset} />}
        </div>
      </main>

      <footer className="flex gap-3 border-t border-white/10 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <button onClick={() => setEtape(Math.max(0, etape - 1))} disabled={etape === 0} className={`${btnSecondaire} flex-1 sm:flex-none`}><ArrowLeft className="h-4 w-4" /> Précédent</button>
        {derniere
          ? <button onClick={onClose} className={`${btnPrimaire} flex-1`} data-testid="mafoi-atelier-terminer"><Check className="h-4 w-4" /> Terminer</button>
          : <button onClick={() => setEtape(etape + 1)} className={`${btnPrimaire} flex-1`} data-testid="mafoi-atelier-suivant">{ETAPES[etape + 1].label} <ArrowRight className="h-4 w-4" /></button>}
      </footer>
    </div>,
    document.body,
  );
}

/* Petit déclencheur utilisé dans la Sagesse et la Lecture biblique : ouvre l'atelier. */
export function AideMemoire({ verset, className = "" }) {
  const { progress } = useMemoire();
  const [ouvert, setOuvert] = useState(false);
  const suivi = progress[verset.ref];
  const s = statut(suivi);
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setOuvert(true)} data-testid="mafoi-aide-memoire-toggle"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-gold/30 bg-gold/[0.08] px-4 text-sm font-medium text-gold transition hover:bg-gold/[0.14]">
          <Brain className="h-4 w-4" /> {suivi ? "Réviser ce verset" : "Apprendre ce verset par cœur"}
        </button>
        {suivi && <span className={`text-xs ${s === "revoir" ? "font-semibold text-gold" : "text-offwhite/50"}`} data-testid="mafoi-aide-memoire-statut">{STATUTS[s]}{s === "appris" || s === "maitrise" ? ` · prochaine révision ${libelleDelai(suivi.prochain)}` : ""}</span>}
      </div>
      {ouvert && <Atelier verset={verset} onClose={() => setOuvert(false)} />}
    </div>
  );
}

/* 1 · Lire, et écouter à voix haute (synthèse vocale du navigateur, en français). */
function Lire({ verset }) {
  const dispo = typeof window !== "undefined" && "speechSynthesis" in window;
  const [lecture, setLecture] = useState(false);
  const [lent, setLent] = useState(true);
  useEffect(() => () => { try { window.speechSynthesis.cancel(); } catch { /* */ } }, []);
  const ecouter = () => {
    if (!dispo) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(`${nettoyer(verset.text)}. ${verset.ref}.`);
    u.lang = "fr-FR"; u.rate = lent ? 0.8 : 1;
    const voix = window.speechSynthesis.getVoices().find((v) => v.lang?.startsWith("fr"));
    if (voix) u.voice = voix;
    u.onend = () => setLecture(false); u.onerror = () => setLecture(false);
    setLecture(true);
    window.speechSynthesis.speak(u);
  };
  const stop = () => { window.speechSynthesis.cancel(); setLecture(false); };
  return (
    <div className="animate-fade-up">
      <p className="mb-4 text-sm text-offwhite/60">Lis le verset deux ou trois fois, lentement, à voix haute si tu peux. Écoute-en le sens avant de chercher à le retenir.</p>
      <div className="rounded-2xl border border-gold/20 bg-gold/[0.05] p-5">
        <p className="font-display text-2xl leading-snug text-offwhite">{verset.text}</p>
        <p className="mt-3 text-sm font-medium text-gold">— {verset.ref}</p>
      </div>
      {dispo && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!lecture
            ? <button onClick={ecouter} data-testid="mafoi-musique-generer" className={btnSecondaire}><Play className="h-4 w-4" /> Écouter le verset</button>
            : <button onClick={stop} data-testid="mafoi-musique-stop" className={btnSecondaire}><Loader2 className="h-4 w-4 animate-spin" /> Lecture… (arrêter)</button>}
          <label className="inline-flex min-h-[44px] items-center gap-2 text-sm text-offwhite/65"><input type="checkbox" className="h-4 w-4" checked={lent} onChange={(e) => setLent(e.target.checked)} /> Lecture lente</label>
        </div>
      )}
    </div>
  );
}

/* 2 · Comprendre : les idées qui portent le verset, dans leur ordre. */
function Comprendre({ verset }) {
  const cles = useMemo(() => new Set(motsCles(nettoyer(verset.text), 8).map(norm)), [verset.text]);
  const ordre = useMemo(() => mots(verset.text).filter((m) => cles.has(norm(m))), [verset.text, cles]);
  return (
    <div className="animate-fade-up">
      <p className="mb-4 text-sm text-offwhite/60">Les mots qui portent le sens sont en doré. Retiens d'abord cette ossature : le reste de la phrase s'y accroche ensuite.</p>
      <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-xl leading-relaxed text-offwhite/60">
        {mots(verset.text).map((m, i) => <span key={i} className={cles.has(norm(m)) ? "font-semibold text-gold" : ""}>{m} </span>)}
      </p>
      <p className="mt-4 text-sm text-offwhite/55">Dans l'ordre : <span className="text-offwhite/85">{ordre.join(" · ")}</span></p>
      <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-offwhite/65">Une question utile : que dit ce verset sur Dieu, et que me demande-t-il aujourd'hui ?</p>
    </div>
  );
}

/* 3 · Répéter : on cache de plus en plus de mots, on touche un mot caché pour le révéler. */
const NIVEAUX = [
  { id: 1, label: "Mots clés cachés" },
  { id: 2, label: "Un mot sur deux" },
  { id: 3, label: "Initiales seulement" },
];
function Repeter({ verset }) {
  const [niveau, setNiveau] = useState(1);
  const [reveles, setReveles] = useState({});
  const liste = useMemo(() => mots(verset.text), [verset.text]);
  const cles = useMemo(() => new Set(motsCles(nettoyer(verset.text), 8).map(norm)), [verset.text]);
  const cache = (m, i) => (niveau === 1 ? cles.has(norm(m)) : niveau === 2 ? i % 2 === 1 : true);
  const changer = (n) => { setNiveau(n); setReveles({}); };
  return (
    <div className="animate-fade-up">
      <p className="mb-4 text-sm text-offwhite/60">Lis la phrase en complétant de tête les mots cachés. Touche un mot pour le vérifier, puis passe au niveau suivant quand tu es à l'aise.</p>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {NIVEAUX.map((n) => (
          <button key={n.id} onClick={() => changer(n.id)} className={`min-h-[44px] rounded-xl border px-2 text-xs font-medium ${niveau === n.id ? "border-gold/50 bg-gold/15 text-gold" : "border-white/10 text-offwhite/55 hover:text-offwhite"}`}>{n.label}</button>
        ))}
      </div>
      <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-xl leading-[2.4] text-offwhite/90">
        {liste.map((m, i) => {
          if (!cache(m, i) || reveles[i]) return <span key={i}>{m} </span>;
          const txt = niveau === 3 ? `${m[0]}${"·".repeat(Math.max(1, m.length - 1))}` : "·····";
          return <button key={i} onClick={() => setReveles({ ...reveles, [i]: true })} className="mx-0.5 min-h-[36px] rounded-lg border border-white/20 bg-white/[0.08] px-2 text-offwhite/65 hover:text-offwhite" aria-label="Révéler le mot">{txt}</button>;
        })}
      </p>
      <button onClick={() => setReveles({})} className="mt-3 inline-flex min-h-[44px] items-center gap-2 text-sm text-offwhite/55 hover:text-offwhite"><RotateCcw className="h-4 w-4" /> Tout recacher</button>

      <details className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
        <summary className="cursor-pointer text-sm text-offwhite/60">Une autre méthode : le trajet familier</summary>
        <div className="mt-3"><PalaisMemoire verset={verset} /></div>
      </details>
    </div>
  );
}

/* 4 · Réciter de mémoire : on écrit le verset, on voit les mots oubliés, et on gagne de l'XP si le mode jeu est actif. */
function Reciter({ verset }) {
  const { jeu } = useMemoire();
  const [saisie, setSaisie] = useState("");
  const [res, setRes] = useState(null);
  const [bilan, setBilan] = useState(null);

  const verifier = () => {
    if (!saisie.trim()) { toast.error("Écris le verset de mémoire, même en partie."); return; }
    const r = comparer(verset.text, saisie);
    setRes(r);
    setBilan(reciter(verset.ref, r.ratio));
  };
  const recommencer = () => { setSaisie(""); setRes(null); setBilan(null); };

  return (
    <div className="animate-fade-up">
      {!res ? (
        <>
          <p className="mb-3 text-sm text-offwhite/60">Sans regarder le verset, écris-le comme il te revient. La ponctuation et les accents n'ont pas d'importance.</p>
          <textarea value={saisie} onChange={(e) => setSaisie(e.target.value)} rows={5} placeholder="Écris le verset de mémoire…" data-testid="mafoi-recitation" autoFocus
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-offwhite outline-none placeholder:text-offwhite/35 focus:border-gold/50" />
          <button onClick={verifier} data-testid="mafoi-quiz-verifier" className={`${btnPrimaire} mt-3 w-full`}><Check className="h-4 w-4" /> Vérifier</button>
        </>
      ) : (
        <Bilan verset={verset} res={res} bilan={bilan} jeu={jeu} onRecommencer={recommencer} />
      )}
    </div>
  );
}

function BarreXP({ avant, apres, niveauSup }) {
  const [w, setW] = useState(avant.part);
  useEffect(() => { const t = setTimeout(() => setW(niveauSup ? 1 : apres.part), 120); return () => clearTimeout(t); }, [apres.part, niveauSup]);
  return (
    <div className="h-3 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(w * 100)}>
      <div className="h-full rounded-full bg-gradient-to-r from-gold/70 to-gold" style={{ width: `${Math.round(w * 100)}%`, transition: "width .9s ease" }} />
    </div>
  );
}

function Bilan({ verset, res, bilan, jeu, onRecommencer }) {
  const ok = bilan.ok;
  return (
    <div data-testid="mafoi-bilan">
      <div className={`rounded-2xl border p-5 text-center ${ok ? "border-emerald-400/30 bg-emerald-400/[0.07]" : "border-amber-300/25 bg-amber-300/[0.05]"}`}>
        <p className="font-display text-2xl font-bold text-offwhite">{ok ? "Verset su" : "Pas encore tout à fait"}</p>
        <p className="mt-1 text-sm text-offwhite/65">{res.nb} mot{res.nb > 1 ? "s" : ""} sur {res.total} retrouvés{ok ? "" : ` (il en faut ${Math.ceil(res.total * SEUIL_REUSSITE)})`}.</p>
        <p className="mt-2 text-xs text-offwhite/55">
          {ok ? `Je te le proposerai de nouveau ${libelleDelai(bilan.prochain)}.` : "Relis les mots soulignés et réessaie. Je te le reproposerai demain."}
        </p>
      </div>

      <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-lg leading-relaxed text-offwhite/90">
        {res.mots.map((m, i) => <span key={i} className={res.justes.has(i) ? "" : "rounded bg-amber-300/15 px-0.5 text-amber-200 underline decoration-amber-300/50 underline-offset-2"}>{m} </span>)}
      </p>
      <p className="mt-2 text-xs text-offwhite/50">Les mots soulignés manquaient. <span className="text-gold">— {verset.ref}</span></p>

      {jeu.mode_jeu && (
        <div className="mt-4 rounded-2xl border border-gold/25 bg-gold/[0.05] p-4" data-testid="mafoi-bilan-jeu">
          {bilan.lignes.length > 0 ? (
            <ul className="space-y-1.5">
              {bilan.lignes.map((l) => (
                <li key={l.label} className="flex items-center justify-between text-sm text-offwhite/85 animate-fade-up">
                  <span>{l.label}</span><span className="font-semibold text-gold">+{l.xp} XP</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-offwhite/65">{bilan.deja ? "Verset déjà validé aujourd'hui : pas d'XP en plus, mais la révision compte pour ta mémoire." : "Pas d'XP cette fois. Réessaie, tu y es presque."}</p>
          )}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs text-offwhite/60">
              <span>Niveau {bilan.niveauApres.niveau} · {bilan.niveauApres.titre}</span>
              <span>{bilan.niveauApres.xpDansNiveau} / {bilan.niveauApres.xpPourSuivant} XP</span>
            </div>
            <BarreXP avant={bilan.niveauAvant} apres={bilan.niveauApres} niveauSup={bilan.niveauSup} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-offwhite/65">
            <span className="inline-flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-gold" /> Série : {bilan.serie} jour{bilan.serie > 1 ? "s" : ""}</span>
            <span className="inline-flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-gold" /> Verset : niveau {bilan.niveauVerset} sur 5</span>
          </div>
          {bilan.niveauSup && <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-gold/15 px-3 py-1.5 text-sm font-semibold text-gold animate-fade-up"><Sparkles className="h-4 w-4" /> Niveau {bilan.niveauApres.niveau} atteint : {bilan.niveauApres.titre}</p>}
          {bilan.queteNouvelle && <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1.5 text-sm font-semibold text-emerald-200 animate-fade-up"><Trophy className="h-4 w-4" /> Quête du jour accomplie</p>}
          {bilan.nouveauxBadges.map((b) => (
            <p key={b.id} className="mt-3 flex items-center gap-2 text-sm text-offwhite/90 animate-fade-up"><Award className="h-4 w-4 shrink-0 text-gold" /> Badge obtenu : <b>{b.titre}</b></p>
          ))}
        </div>
      )}

      <button onClick={onRecommencer} className={`${btnSecondaire} mt-4 w-full`}><RotateCcw className="h-4 w-4" /> Réessayer</button>
    </div>
  );
}

/* ─── Palais de mémoire (méthode des loci) : chaque mot-clé posé sur un lieu familier ─── */
function PalaisMemoire({ verset }) {
  const [lieux, setLieux] = useLocal("palais_lieux", LIEUX_DEFAUT);
  const [edition, setEdition] = useState(false);
  const [brouillon, setBrouillon] = useState(lieux.join(", "));
  const [reveles, setReveles] = useState({});

  const motsDuVerset = useMemo(() => motsCles(verset.text, Math.max(4, lieux.length)), [verset.text, lieux.length]);
  const etapes = motsDuVerset.map((m, i) => ({
    lieu: lieux.length ? lieux[i % lieux.length] : `Lieu ${i + 1}`,
    passage: Math.floor(i / Math.max(lieux.length, 1)) + 1,
    mot: m,
  }));

  const enregistrer = () => {
    const v = brouillon.split(",").map((s) => s.trim()).filter(Boolean);
    if (!v.length) { toast.error("Indique au moins un lieu."); return; }
    setLieux(v);
    setEdition(false);
  };
  const reinitialiser = () => { setLieux(LIEUX_DEFAUT); setBrouillon(LIEUX_DEFAUT.join(", ")); };
  const toggleRevele = (i) => setReveles({ ...reveles, [i]: !reveles[i] });

  return (
    <div>
      <p className="mb-3 text-sm text-offwhite/60">Pose mentalement chaque mot-clé sur une étape d'un trajet que tu connais par cœur. Le même trajet peut resservir pour chaque verset.</p>

      {edition ? (
        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <label className="mb-1.5 block text-xs text-offwhite/55">Tes lieux, dans l'ordre, séparés par des virgules</label>
          <textarea value={brouillon} onChange={(e) => setBrouillon(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-offwhite outline-none focus:border-gold/40" rows={2} />
          <div className="mt-2 flex gap-2">
            <button onClick={enregistrer} className={`${btnPrimaire} min-h-[44px]`} data-testid="mafoi-palais-enregistrer"><Check className="h-4 w-4" /> Enregistrer</button>
            <button onClick={() => setEdition(false)} className={`${btnSecondaire} min-h-[44px]`}>Annuler</button>
          </div>
        </div>
      ) : (
        <div className="mb-3 flex flex-wrap gap-2">
          <button onClick={() => { setBrouillon(lieux.join(", ")); setEdition(true); }} className={`${btnSecondaire} min-h-[44px]`} data-testid="mafoi-palais-personnaliser"><Pencil className="h-4 w-4" /> Personnaliser mon palais</button>
          <button onClick={reinitialiser} className={`${btnSecondaire} min-h-[44px] text-offwhite/60`}><RotateCcw className="h-4 w-4" /> Par défaut</button>
        </div>
      )}

      <div className="space-y-2">
        {etapes.map((e, i) => (
          <button key={i} onClick={() => toggleRevele(i)} className="flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:bg-white/[0.06]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold"><MapPin className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-offwhite/50">{e.lieu}{e.passage > 1 ? ` (${e.passage}ᵉ passage)` : ""}</span>
              <span className="block text-base font-medium text-offwhite">{reveles[i] ? e.mot : "•••••"}</span>
            </span>
            {reveles[i] ? <EyeOff className="h-4 w-4 shrink-0 text-offwhite/40" /> : <Eye className="h-4 w-4 shrink-0 text-offwhite/40" />}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-offwhite/50">Astuce : parcours les lieux les yeux fermés avant de vérifier, puis touche pour révéler.</p>
    </div>
  );
}
