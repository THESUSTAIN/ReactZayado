import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { Brain, Workflow, Music2, Puzzle, Sparkles, RefreshCw, Check, Loader2, Play, MapPin, Film, Pencil, RotateCcw, Eye, EyeOff } from "lucide-react";
import { useLocal } from "./store";

// ───── Génération locale (pas d'appel réseau requis pour carte/quiz/mnémo) ─────
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

function genererMnemonique(texte) {
  const mots = texte.replace(/[«»"“”.,;:!?()]/g, "").split(/\s+/).filter(Boolean);
  return mots.map((m) => m[0].toUpperCase()).join("");
}

// Renvoie les mots (avec séparateurs conservés) + un jeu d'indices de mots à masquer.
function genererTrous(texte, ratio = 0.28) {
  const segments = texte.split(/(\s+)/);
  const indicesMots = segments.map((m, i) => (m.trim() ? i : null)).filter((i) => i !== null);
  const nbTrous = Math.max(1, Math.round(indicesMots.length * ratio));
  const trous = new Set();
  while (trous.size < nbTrous && trous.size < indicesMots.length) {
    trous.add(indicesMots[Math.floor(Math.random() * indicesMots.length)]);
  }
  return { segments, trous };
}

const LIEUX_DEFAUT = ["Entrée", "Salon", "Cuisine", "Couloir", "Chambre", "Bureau", "Salle de bain", "Jardin"];

// Gabarits de phrases absurdes pour relier deux mots-clés consécutifs (technique du chaînage narratif).
const GABARITS_CHAINE = [
  (a, b) => `Un ${a} gigantesque surgit et se transforme soudain en ${b}.`,
  (a, b) => `Imaginez ${a} qui danse au ralenti avec ${b}.`,
  (a, b) => `${a} grandit démesurément puis avale ${b} d'un coup.`,
  (a, b) => `${a} se met à briller très fort, et devient ${b} sous vos yeux.`,
  (a, b) => `Une pluie de ${a} tombe du ciel et fait pousser ${b} instantanément.`,
  (a, b) => `${a} explose en confettis qui retombent en formant ${b}.`,
];

const TABS = [
  { id: "carte", label: "Carte mentale", Icon: Workflow },
  { id: "palais", label: "Palais de mémoire", Icon: MapPin },
  { id: "histoire", label: "Histoire en chaîne", Icon: Film },
  { id: "musique", label: "Musique IA", Icon: Music2 },
  { id: "quiz", label: "Texte à trous", Icon: Puzzle },
  { id: "mnemo", label: "Mnémotechnique", Icon: Sparkles },
];

export function AideMemoire({ verset, className = "" }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("carte");

  return (
    <div className={className}>
      <button
        onClick={() => setOpen((v) => !v)}
        data-testid="mafoi-aide-memoire-toggle"
        className="inline-flex items-center gap-1.5 rounded-xl border border-gold/30 bg-gold/[0.08] px-3 py-1.5 text-xs font-medium text-gold transition hover:bg-gold/[0.14]"
      >
        <Brain className="h-3.5 w-3.5" /> {open ? "Fermer l'aide à la mémoire" : "Aide à la mémoire"}
      </button>

      {open && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4" data-testid="mafoi-aide-memoire-panel">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setMode(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  mode === t.id ? "border-gold/40 bg-gold/15 text-gold" : "border-white/10 bg-white/[0.03] text-offwhite/60 hover:text-offwhite"
                }`}
              >
                <t.Icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>
          {mode === "carte" && <CarteMentale verset={verset} />}
          {mode === "palais" && <PalaisMemoire verset={verset} />}
          {mode === "histoire" && <HistoireChaine verset={verset} />}
          {mode === "musique" && <MusiqueIA verset={verset} />}
          {mode === "quiz" && <TexteATrous verset={verset} />}
          {mode === "mnemo" && <Mnemonique verset={verset} />}
        </div>
      )}
    </div>
  );
}

/* ─── Carte mentale : le verset éclaté en mots-clés autour de la référence ─── */
function CarteMentale({ verset }) {
  const mots = useMemo(() => motsCles(verset.text), [verset.text]);
  const rayon = 96;
  const cx = 130, cy = 130;
  return (
    <div>
      <p className="mb-3 text-xs text-offwhite/55">Le verset réduit à ses mots-clés : mémorisez la structure, le texte exact revient plus vite ensuite.</p>
      <div className="relative mx-auto" style={{ width: 260, height: 260 }}>
        <svg viewBox="0 0 260 260" className="absolute inset-0 h-full w-full">
          {mots.map((_, i) => {
            const angle = (2 * Math.PI * i) / mots.length - Math.PI / 2;
            const x = cx + rayon * Math.cos(angle);
            const y = cy + rayon * Math.sin(angle);
            return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(222,194,163,0.35)" strokeWidth="1.5" />;
          })}
        </svg>
        <div className="absolute flex items-center justify-center rounded-full border border-gold/40 bg-gold/15 text-center" style={{ left: cx - 44, top: cy - 44, width: 88, height: 88 }}>
          <span className="px-1 text-[11px] font-semibold leading-tight text-gold">{verset.ref}</span>
        </div>
        {mots.map((m, i) => {
          const angle = (2 * Math.PI * i) / mots.length - Math.PI / 2;
          const x = cx + rayon * Math.cos(angle);
          const y = cy + rayon * Math.sin(angle);
          return (
            <div key={m} className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-medium text-offwhite" style={{ left: x, top: y }}>
              {m}
            </div>
          );
        })}
      </div>
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

/* ─── Histoire visuelle en chaîne : les mots-clés liés par une scène absurde et mémorable ─── */
function HistoireChaine({ verset }) {
  const mots = useMemo(() => motsCles(verset.text, 6), [verset.text]);
  const [tirage, setTirage] = useState(() => mots.map(() => Math.floor(Math.random() * GABARITS_CHAINE.length)));

  const regenerer = () => setTirage(mots.map(() => Math.floor(Math.random() * GABARITS_CHAINE.length)));

  if (mots.length < 2) {
    return <p className="text-xs text-offwhite/55">Ce verset est trop court pour construire une chaîne d'images.</p>;
  }

  return (
    <div>
      <p className="mb-3 text-xs text-offwhite/55">Visualisez cette scène dans l'ordre, une image entraînant la suivante — le cerveau retient mieux une histoire absurde qu'une liste de mots.</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {mots.map((m) => <span key={m} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-offwhite/70">{m}</span>)}
      </div>
      <ol className="space-y-2">
        {mots.slice(0, -1).map((m, i) => (
          <li key={i} className="flex gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm leading-relaxed text-offwhite/85">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-[10px] font-semibold text-gold">{i + 1}</span>
            <span>{GABARITS_CHAINE[tirage[i]](m, mots[i + 1])}</span>
          </li>
        ))}
      </ol>
      <button onClick={regenerer} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs text-offwhite hover:bg-white/10" data-testid="mafoi-histoire-regenerer"><RefreshCw className="h-3.5 w-3.5" /> Régénérer l'histoire</button>
    </div>
  );
}

/* ─── Musique IA (Mammoth) — prototype d'appel, à brancher côté serveur ─── */
function MusiqueIA({ verset }) {
  const [statut, setStatut] = useState("idle"); // idle | generation | prete
  const generer = () => {
    setStatut("generation");
    // TODO (Lot suivant) : brancher sur l'API Mammoth AI côté backend
    // (POST /api/foi/musique-verset avec { texte, ref }) puis remplacer
    // ce minuteur par la vraie réponse (URL audio).
    setTimeout(() => { setStatut("prete"); toast.success("Musique générée pour ce verset."); }, 1400);
  };
  return (
    <div>
      <p className="mb-3 text-xs text-offwhite/55">Une courte mélodie chantant ce verset, pour le retenir en l'écoutant plutôt qu'en le relisant.</p>
      {statut === "idle" && (
        <button onClick={generer} className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-gold-hover" data-testid="mafoi-musique-generer">
          <Music2 className="h-4 w-4" /> Générer une musique de ce verset
        </button>
      )}
      {statut === "generation" && (
        <div className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-offwhite/70">
          <Loader2 className="h-4 w-4 animate-spin" /> Composition en cours…
        </div>
      )}
      {statut === "prete" && (
        <div className="rounded-xl border border-gold/25 bg-gold/[0.06] p-3">
          <div className="flex items-center gap-3">
            <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-navy-900" aria-label="Écouter" data-testid="mafoi-musique-play">
              <Play className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-offwhite">Chant — {verset.ref}</p>
              <p className="text-[11px] text-offwhite/50">Prototype — le lecteur audio réel arrivera avec le branchement Mammoth AI.</p>
            </div>
          </div>
          <button onClick={() => setStatut("idle")} className="mt-2 inline-flex items-center gap-1.5 text-xs text-offwhite/50 hover:text-offwhite"><RefreshCw className="h-3 w-3" /> Régénérer</button>
        </div>
      )}
    </div>
  );
}

/* ─── Texte à trous ─── */
function TexteATrous({ verset }) {
  const [tirage, setTirage] = useState(() => genererTrous(verset.text));
  const [reponses, setReponses] = useState({});
  const [verifie, setVerifie] = useState(false);

  const relancer = () => { setTirage(genererTrous(verset.text)); setReponses({}); setVerifie(false); };
  const nettoie = (s) => s.trim().toLowerCase().replace(/[«»"“”.,;:!?()]/g, "");

  return (
    <div>
      <p className="mb-3 text-xs text-offwhite/55">Complétez les mots manquants, puis vérifiez.</p>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm leading-relaxed text-offwhite/90">
        {tirage.segments.map((seg, i) =>
          tirage.trous.has(i) ? (
            <input
              key={i}
              value={reponses[i] || ""}
              onChange={(e) => setReponses({ ...reponses, [i]: e.target.value })}
              className={`mx-0.5 inline-block w-24 rounded-md border bg-white/[0.06] px-1.5 py-0.5 text-center text-sm outline-none ${
                verifie ? (nettoie(reponses[i] || "") === nettoie(seg) ? "border-emerald-400 text-emerald-300" : "border-rose-400 text-rose-300") : "border-white/20 text-offwhite"
              }`}
            />
          ) : (
            <span key={i}>{seg}</span>
          )
        )}
      </div>
      <p className="mt-2 text-right text-xs text-gold">— {verset.ref}</p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => setVerifie(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2 text-xs font-semibold text-navy-900" data-testid="mafoi-quiz-verifier"><Check className="h-3.5 w-3.5" /> Vérifier</button>
        <button onClick={relancer} className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs text-offwhite hover:bg-white/10"><RefreshCw className="h-3.5 w-3.5" /> Nouveau tirage</button>
      </div>
    </div>
  );
}

/* ─── Mnémotechnique : initiales du verset ─── */
function Mnemonique({ verset }) {
  const sigle = useMemo(() => genererMnemonique(verset.text), [verset.text]);
  return (
    <div>
      <p className="mb-3 text-xs text-offwhite/55">Retenez d'abord l'initiale de chaque mot, le verset complet suit naturellement.</p>
      <div className="rounded-xl border border-gold/25 bg-gold/[0.06] p-4 text-center">
        <p className="break-all font-display text-lg font-bold tracking-wide text-gold">{sigle}</p>
      </div>
      <p className="mt-3 text-sm italic leading-relaxed text-offwhite/80">{verset.text}</p>
      <p className="mt-1 text-xs text-gold">— {verset.ref}</p>
    </div>
  );
}
