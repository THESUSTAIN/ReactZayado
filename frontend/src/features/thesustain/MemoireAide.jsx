import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Brain, BookOpen, Target, RefreshCw, Pencil, Check, Loader2, Play, MapPin, RotateCcw, Eye, EyeOff, ArrowLeft, ArrowRight } from "lucide-react";
import { useLocal } from "./store";
import { cleDuJour } from "./thesustainData";

/* Apprendre un verset par cœur : un parcours calme en 4 étapes (lire, comprendre, répéter, réciter).
   Avant : 6 onglets dont une « histoire absurde » générée au hasard, un tirage aléatoire de trous et un
   sigle d'initiales, présentés comme autant de gadgets. Ici : une seule méthode, dans l'ordre où l'on mémorise
   vraiment, et un rythme de révision espacé (J+1, J+3, J+7…) sans points, sans série ni score. */

const MOTS_VIDES = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "et", "à", "au", "aux", "qui", "que", "ce", "cet",
  "cette", "ces", "il", "elle", "ils", "elles", "je", "tu", "nous", "vous", "en", "sur", "dans", "par",
  "pour", "ne", "pas", "est", "sont", "avec", "son", "sa", "ses", "mon", "ma", "mes", "ton", "ta", "tes", "se",
]);

function motsCles(texte, max = 7) {
  const mots = texte
    .replace(/[«»"“”.,;:!?()]/g, "")
    .split(/\s+/)
    .filter((m) => m.length > 2 && !MOTS_VIDES.has(m.toLowerCase()));
  return [...new Set(mots)].slice(0, max);
}


const LIEUX_DEFAUT = ["Entrée", "Salon", "Cuisine", "Couloir", "Chambre", "Bureau", "Salle de bain", "Jardin"];



// ───── Outils de texte ─────
const nettoyer = (t) => String(t || "").replace(/[«»"“”]/g, "").replace(/\s+/g, " ").trim();
const mots = (t) => nettoyer(t).split(" ").filter(Boolean);
const norm = (m) => m.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,;:!?()'’\-—]/g, "");

// Plus longue suite de mots communs : permet de dire quels mots ont été oubliés, sans punir un petit décalage.
function comparer(original, saisi) {
  // On ignore la ponctuation isolée (le « : » à la française) : ce n'est pas un mot à retenir.
  const a = mots(original).filter((m) => norm(m)), b = mots(saisi).filter((m) => norm(m));
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    dp[i][j] = norm(a[i]) === norm(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const justes = new Set();
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (norm(a[i]) === norm(b[j])) { justes.add(i); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return { mots: a, justes, total: n, nb: justes.size };
}

// ───── Révision espacée ─────
const INTERVALLES = [1, 3, 7, 14, 30]; // jours entre deux révisions, selon le niveau atteint
const ajouterJours = (cle, n) => { const d = new Date(`${cle}T12:00:00`); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv-SE"); };

export function marquerRecite(progress, ref, reussi) {
  const jour = cleDuJour();
  const prev = (progress || {})[ref] || { niveau: 0, fois: 0 };
  const niveau = reussi ? Math.min(prev.niveau + 1, INTERVALLES.length) : 0;
  return { ...(progress || {}), [ref]: { niveau, fois: (prev.fois || 0) + 1, dernier: jour, prochain: ajouterJours(jour, INTERVALLES[Math.min(niveau, INTERVALLES.length - 1)]) } };
}
export const versetsARevoir = (progress) => {
  const jour = cleDuJour();
  return Object.entries(progress || {}).filter(([, v]) => v && v.prochain && v.prochain <= jour).map(([ref]) => ref);
};
export const useMemoireProgress = () => useLocal("memoire_versets", {});

const ETAPES = [
  { id: "lire", label: "Lire", Icon: BookOpen },
  { id: "comprendre", label: "Comprendre", Icon: Target },
  { id: "repeter", label: "Répéter", Icon: RefreshCw },
  { id: "reciter", label: "Réciter", Icon: Pencil },
];

export function AideMemoire({ verset, className = "", progress, setProgress }) {
  const [open, setOpen] = useState(false);
  const [etape, setEtape] = useState(0);
  const propre = useMemoireProgress();
  const [prog, setProg] = progress && setProgress ? [progress, setProgress] : propre;
  const suivi = (prog || {})[verset.ref];
  const aRevoir = suivi?.prochain && suivi.prochain <= cleDuJour();

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setOpen((v) => !v)}
          data-testid="mafoi-aide-memoire-toggle"
          className="inline-flex items-center gap-1.5 rounded-xl border border-gold/30 bg-gold/[0.08] px-3 py-1.5 text-xs font-medium text-gold transition hover:bg-gold/[0.14]"
        >
          <Brain className="h-3.5 w-3.5" /> {open ? "Fermer" : "Apprendre ce verset par cœur"}
        </button>
        {suivi && !open && (
          <span className="text-xs text-offwhite/50">
            {aRevoir ? "À revoir aujourd'hui" : `Récité le ${new Date(`${suivi.dernier}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`}
          </span>
        )}
      </div>

      {open && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4" data-testid="mafoi-aide-memoire-panel">
          <ol className="mb-4 flex items-center gap-1 overflow-x-auto no-scrollbar">
            {ETAPES.map((e, i) => (
              <li key={e.id} className="flex items-center gap-1">
                <button onClick={() => setEtape(i)} data-testid={`mafoi-memoire-etape-${e.id}`}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${etape === i ? "bg-gold/15 text-gold" : "text-offwhite/50 hover:text-offwhite"}`}>
                  <span className="text-[10px] opacity-70">{i + 1}</span> {e.label}
                </button>
                {i < ETAPES.length - 1 && <span className="text-offwhite/20">›</span>}
              </li>
            ))}
          </ol>

          {etape === 0 && <Lire verset={verset} />}
          {etape === 1 && <Comprendre verset={verset} />}
          {etape === 2 && <Repeter verset={verset} />}
          {etape === 3 && <Reciter verset={verset} onResultat={(ok) => setProg(marquerRecite(prog, verset.ref, ok))} />}

          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3">
            <button onClick={() => setEtape(Math.max(0, etape - 1))} disabled={etape === 0}
              className="inline-flex items-center gap-1.5 text-xs text-offwhite/55 hover:text-offwhite disabled:opacity-30"><ArrowLeft className="h-3.5 w-3.5" /> Précédent</button>
            {etape < ETAPES.length - 1 && (
              <button onClick={() => setEtape(etape + 1)} className="inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold-hover">{ETAPES[etape + 1].label} <ArrowRight className="h-3.5 w-3.5" /></button>
            )}
          </div>

          <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
            <summary className="cursor-pointer text-xs text-offwhite/55">Une autre méthode : le trajet familier</summary>
            <div className="mt-3"><PalaisMemoire verset={verset} /></div>
          </details>
        </div>
      )}
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
    <div>
      <p className="mb-3 text-xs text-offwhite/55">Lis le verset deux ou trois fois, lentement, à voix haute si tu peux. Prends le temps d'en entendre le sens avant de chercher à le retenir.</p>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="font-display text-lg leading-snug text-offwhite">{verset.text}</p>
        <p className="mt-2 text-xs text-gold">— {verset.ref}</p>
      </div>
      {dispo && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {!lecture ? (
            <button onClick={ecouter} data-testid="mafoi-musique-generer" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs text-offwhite hover:bg-white/10"><Play className="h-3.5 w-3.5" /> Écouter le verset</button>
          ) : (
            <button onClick={stop} data-testid="mafoi-musique-stop" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs text-offwhite"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Lecture… (arrêter)</button>
          )}
          <label className="inline-flex items-center gap-1.5 text-xs text-offwhite/60"><input type="checkbox" checked={lent} onChange={(e) => setLent(e.target.checked)} /> Lecture lente</label>
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
    <div>
      <p className="mb-3 text-xs text-offwhite/55">Les mots qui portent le sens sont en doré. Retiens d'abord cette ossature : le reste de la phrase s'y accroche ensuite plus facilement.</p>
      <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-[15px] leading-relaxed text-offwhite/60">
        {mots(verset.text).map((m, i) => <span key={i} className={cles.has(norm(m)) ? "font-semibold text-gold" : ""}>{m} </span>)}
      </p>
      <p className="mt-3 text-xs text-offwhite/50">Dans l'ordre : <span className="text-offwhite/80">{ordre.join(" · ")}</span></p>
      <p className="mt-3 text-xs text-offwhite/50">Une question utile : que dit ce verset sur Dieu, et que me demande-t-il aujourd'hui ?</p>
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
    <div>
      <p className="mb-3 text-xs text-offwhite/55">Lis la phrase en complétant de tête les mots cachés. Touche un mot pour le vérifier, puis passe au niveau suivant quand tu es à l'aise.</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {NIVEAUX.map((n) => (
          <button key={n.id} onClick={() => changer(n.id)} className={`rounded-full border px-3 py-1 text-xs ${niveau === n.id ? "border-gold/40 bg-gold/15 text-gold" : "border-white/10 text-offwhite/55 hover:text-offwhite"}`}>{n.label}</button>
        ))}
      </div>
      <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-[15px] leading-loose text-offwhite/90">
        {liste.map((m, i) => {
          if (!cache(m, i) || reveles[i]) return <span key={i}>{m} </span>;
          const txt = niveau === 3 ? `${m[0]}${"·".repeat(Math.max(1, m.length - 1))}` : "·····";
          return <button key={i} onClick={() => setReveles({ ...reveles, [i]: true })} className="mx-0.5 rounded-md border border-white/15 bg-white/[0.06] px-1.5 text-offwhite/60 hover:text-offwhite" aria-label="Révéler le mot">{txt}</button>;
        })}
      </p>
      <button onClick={() => setReveles({})} className="mt-2 inline-flex items-center gap-1.5 text-xs text-offwhite/50 hover:text-offwhite"><RotateCcw className="h-3 w-3" /> Tout recacher</button>
    </div>
  );
}

/* 4 · Réciter de mémoire : on écrit le verset, on voit les mots oubliés. Pas de note, pas de points. */
function Reciter({ verset, onResultat }) {
  const [saisie, setSaisie] = useState("");
  const [res, setRes] = useState(null);
  const verifier = () => {
    if (!saisie.trim()) { toast.error("Écris le verset de mémoire, même en partie."); return; }
    const r = comparer(verset.text, saisie);
    setRes(r);
    const ok = r.nb / Math.max(r.total, 1) >= 0.9;
    onResultat(ok);
    toast(ok ? "Verset su. Je te le proposerai de nouveau dans quelques jours." : "Pas encore tout à fait : relis les mots signalés et réessaie.");
  };
  return (
    <div>
      <p className="mb-3 text-xs text-offwhite/55">Sans regarder le verset, écris-le comme il te revient. La ponctuation n'a pas d'importance.</p>
      <textarea value={saisie} onChange={(e) => { setSaisie(e.target.value); setRes(null); }} rows={3} placeholder="Écris le verset de mémoire…" data-testid="mafoi-recitation"
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-offwhite placeholder:text-offwhite/35 outline-none focus:border-gold/40" />
      <button onClick={verifier} data-testid="mafoi-quiz-verifier" className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2 text-xs font-semibold text-navy-900"><Check className="h-3.5 w-3.5" /> Vérifier</button>
      {res && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm leading-relaxed text-offwhite/90">
            {res.mots.map((m, i) => <span key={i} className={res.justes.has(i) ? "" : "rounded bg-amber-300/15 px-0.5 text-amber-200 underline decoration-amber-300/50 underline-offset-2"}>{m} </span>)}
          </p>
          <p className="mt-2 text-xs text-offwhite/55">{res.nb} mot{res.nb > 1 ? "s" : ""} sur {res.total}. {res.nb === res.total ? "Tout y est." : "Les mots soulignés manquaient."} <span className="text-gold">— {verset.ref}</span></p>
        </div>
      )}
    </div>
  );
}

/* ─── Palais de mémoire (méthode des loci) : chaque mot-clé posé sur un lieu familier ─── */
function PalaisMemoire({ verset }) {
  const [lieux, setLieux] = useLocal("palais_lieux", LIEUX_DEFAUT);
  const [edition, setEdition] = useState(false);
  const [brouillon, setBrouillon] = useState(lieux.join(", "));
  const [reveles, setReveles] = useState({});

  const mots = useMemo(() => motsCles(verset.text, Math.max(4, lieux.length)), [verset.text, lieux.length]);
  const etapes = mots.map((m, i) => ({
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
      <p className="mb-3 text-xs text-offwhite/55">Posez mentalement chaque mot-clé sur une étape d'un trajet que vous connaissez par cœur. Le même trajet peut resservir pour chaque verset.</p>

      {edition ? (
        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <label className="mb-1.5 block text-xs text-offwhite/50">Vos lieux, dans l'ordre, séparés par des virgules</label>
          <textarea value={brouillon} onChange={(e) => setBrouillon(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-offwhite outline-none focus:border-gold/40" rows={2} />
          <div className="mt-2 flex gap-2">
            <button onClick={enregistrer} className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-3.5 py-1.5 text-xs font-semibold text-navy-900" data-testid="mafoi-palais-enregistrer"><Check className="h-3.5 w-3.5" /> Enregistrer</button>
            <button onClick={() => setEdition(false)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs text-offwhite hover:bg-white/10">Annuler</button>
          </div>
        </div>
      ) : (
        <div className="mb-3 flex gap-2">
          <button onClick={() => { setBrouillon(lieux.join(", ")); setEdition(true); }} className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-offwhite hover:bg-white/10" data-testid="mafoi-palais-personnaliser"><Pencil className="h-3.5 w-3.5" /> Personnaliser mon palais</button>
          <button onClick={reinitialiser} className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-offwhite/60 hover:text-offwhite"><RotateCcw className="h-3.5 w-3.5" /> Par défaut</button>
        </div>
      )}

      <div className="space-y-2">
        {etapes.map((e, i) => (
          <button key={i} onClick={() => toggleRevele(i)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:bg-white/[0.06]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold"><MapPin className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] text-offwhite/45">{e.lieu}{e.passage > 1 ? ` (${e.passage}ᵉ passage)` : ""}</span>
              <span className="block text-sm font-medium text-offwhite">{reveles[i] ? e.mot : "•••••"}</span>
            </span>
            {reveles[i] ? <EyeOff className="h-4 w-4 shrink-0 text-offwhite/40" /> : <Eye className="h-4 w-4 shrink-0 text-offwhite/40" />}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-offwhite/45">Astuce : parcourez les lieux les yeux fermés avant de vérifier, puis cliquez pour révéler.</p>
    </div>
  );
}
