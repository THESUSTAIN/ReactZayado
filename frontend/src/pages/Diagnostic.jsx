import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, RefreshCw, BookOpen, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useKairos } from "@/context/KairosContext";
import { getToken, saveDiagnostic, fetchDiagnostic } from "@/lib/kairosApi";
import { useSeo } from "@/lib/useSeo";
import { ECHELLE, domainesDe, questionsDe, calculer, niveau, garderEnAttente } from "@/lib/diagnostic";

const CLE_BROUILLON = "zayado_diagnostic_brouillon";

// Diagnostic d'équilibre : page publique (tunnel d'entrée, sans compte) ET page de l'app.
export default function Diagnostic({ enApp = false }) {
  const navigate = useNavigate();
  const { contexte } = useKairos();
  useSeo({
    title: "Diagnostic d'équilibre gratuit pour entrepreneurs · Zayado",
    description: "24 questions, 3 minutes : ton score vie pro, vie perso (et vie spirituelle si tu le souhaites), inspiré des meilleurs livres (Covey, Frankl, Dweck, Loehr…).",
    path: "/diagnostic", index: !enApp,
  });

  const brouillon = useMemo(() => { try { return JSON.parse(localStorage.getItem(CLE_BROUILLON) || "null"); } catch { return null; } }, []);
  const [phase, setPhase] = useState(brouillon?.reponses && Object.keys(brouillon.reponses).length ? "questions" : "intro");
  const [spirituel, setSpirituel] = useState(brouillon?.spirituel ?? null);
  const [reponses, setReponses] = useState(brouillon?.reponses || {});
  const [idx, setIdx] = useState(brouillon?.idx || 0);
  const [precedent, setPrecedent] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  // Membres TheSustain / parcours Foi : la vie spirituelle est proposée cochée.
  useEffect(() => { if (spirituel === null && contexte?.parcours_foi) setSpirituel(true); }, [contexte, spirituel]);
  useEffect(() => { if (enApp) fetchDiagnostic().then((d) => setPrecedent(d?.dernier || null)).catch(() => {}); }, [enApp]);

  const questions = useMemo(() => questionsDe(!!spirituel), [spirituel]);
  const q = questions[idx];
  const resultat = useMemo(() => calculer(reponses, !!spirituel), [reponses, spirituel]);

  useEffect(() => {
    try {
      if (phase === "questions") localStorage.setItem(CLE_BROUILLON, JSON.stringify({ spirituel, reponses, idx }));
      if (phase === "resultat") localStorage.removeItem(CLE_BROUILLON);
    } catch { /* stockage indisponible */ }
  }, [phase, spirituel, reponses, idx]);

  const demarrer = (avecSpirituel) => { setSpirituel(avecSpirituel); setReponses({}); setIdx(0); setPhase("questions"); };

  const repondre = (v) => {
    const r = { ...reponses, [q.id]: v };
    setReponses(r);
    setTimeout(() => {
      if (idx + 1 < questions.length) setIdx(idx + 1);
      else terminer(r);
    }, 160);
  };

  const terminer = async (r) => {
    setPhase("resultat");
    const res = calculer(r, !!spirituel);
    const payload = { scores: res.scores, reponses: r, source: enApp ? "app" : "public" };
    if (getToken()) {
      setEnvoi(true);
      try { await saveDiagnostic(payload); toast.success("Diagnostic enregistré : ta roue de l'équilibre est à jour."); }
      catch { garderEnAttente(payload); }
      finally { setEnvoi(false); }
    } else {
      garderEnAttente(payload); // repris automatiquement à l'inscription
    }
  };

  const recommencer = () => { setReponses({}); setIdx(0); setPhase("intro"); };

  return (
    <div className="zayado-blue min-h-screen px-4 pb-16 pt-5" data-testid="diagnostic-page">
      <div className="mx-auto w-full max-w-lg">
        <div className="flex items-center gap-3">
          <button onClick={() => (phase === "questions" && idx > 0 ? setIdx(idx - 1) : navigate(enApp ? "/app/bien-etre" : "/"))} aria-label="Retour"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-offwhite hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" />
          </button>
          {phase === "questions" ? (
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-[#F1E2CC] to-[#DEC2A3] transition-all duration-300" style={{ width: `${(idx / questions.length) * 100}%` }} />
            </div>
          ) : <div className="flex-1" />}
          {!enApp && <img src="/logo.png" alt="Zayado" className="h-9 w-9 object-contain" />}
        </div>

        {phase === "intro" && (
          <div className="mt-10 text-center" data-testid="diagnostic-intro">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold">Diagnostic gratuit · 3 min</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-offwhite sm:text-4xl">Où en est ton équilibre, vraiment ?</h1>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-offwhite/70">
              24 questions sur ta vie pro et ta vie perso. Tu obtiens ton score, ta roue de l'équilibre et 2 priorités concrètes.
            </p>
            <div className="mx-auto mt-5 flex max-w-md flex-wrap justify-center gap-1.5">
              {domainesDe(false).map((d) => <span key={d.cle} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-offwhite/75">{d.emoji} {d.label}</span>)}
            </div>
            <p className="mt-5 inline-flex items-center gap-1.5 text-xs text-offwhite/50"><BookOpen className="h-3.5 w-3.5" /> Inspiré de Covey, Frankl, Dweck, Loehr & Schwartz, Clear…</p>

            <div className="mt-8 rounded-3xl border border-white/12 bg-white/[0.05] p-5 text-left">
              <p className="font-semibold text-offwhite">Ajouter la vie spirituelle ?</p>
              <p className="mt-1 text-sm text-offwhite/60">3 questions de plus : prière ou méditation, repos, foi dans les décisions.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => demarrer(false)} data-testid="diagnostic-sans-spirituel"
                  className={`rounded-full border px-4 py-3 text-sm font-semibold ${spirituel === false || spirituel === null ? "border-white/20 bg-white/10 text-offwhite" : "border-white/15 bg-white/[0.04] text-offwhite/80"}`}>Non, commencer</button>
                <button onClick={() => demarrer(true)} data-testid="diagnostic-avec-spirituel"
                  className={`rounded-full border px-4 py-3 text-sm font-semibold ${spirituel ? "border-gold bg-gold text-navy-900" : "border-white/15 bg-white/[0.04] text-offwhite/80"}`}>Oui, l'ajouter 🕊️</button>
              </div>
            </div>
          </div>
        )}

        {phase === "questions" && q && (
          <div className="mt-8" data-testid="diagnostic-question">
            <div className="flex items-center justify-between">
              <span className="rounded-full px-3 py-1 text-xs font-semibold text-navy-900" style={{ background: q.domaine.couleur }}>{q.domaine.emoji} {q.domaine.label}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-offwhite/45">{idx + 1} / {questions.length}</span>
            </div>
            <h2 className="mt-6 min-h-[96px] font-display text-[26px] font-extrabold leading-snug text-offwhite">{q.texte}</h2>
            <div className="mt-6 space-y-2.5">
              {ECHELLE.map((e) => (
                <button key={e.v} onClick={() => repondre(e.v)} data-testid={`diagnostic-rep-${e.v}`}
                  className={`flex w-full items-center gap-4 rounded-3xl border px-5 py-4 text-left text-[15px] font-semibold transition active:scale-[0.99] ${reponses[q.id] === e.v ? "border-gold bg-gold/15 text-offwhite" : "border-white/12 bg-white/[0.06] text-offwhite/85 hover:border-white/30"}`}>
                  <span className="flex gap-1">{[1, 2, 3, 4, 5].map((k) => <span key={k} className={`h-2.5 w-2.5 rounded-full ${k <= e.v ? "bg-gold" : "bg-white/15"}`} />)}</span>
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "resultat" && resultat.global != null && (
          <Resultat res={resultat} spirituel={!!spirituel} enApp={enApp} precedent={precedent} envoi={envoi}
            onRecommencer={recommencer} onInscription={() => navigate("/login?next=%2Fonboarding")} />
        )}
      </div>
    </div>
  );
}

function Resultat({ res, spirituel, enApp, precedent, envoi, onRecommencer, onInscription }) {
  const domaines = domainesDe(spirituel);
  const tri = domaines.filter((d) => res.scores[d.cle] != null).sort((a, b) => res.scores[a.cle] - res.scores[b.cle]);
  const priorites = tri.slice(0, 2);
  const forces = tri.slice(-2).reverse();
  const delta = precedent?.global != null ? res.global - precedent.global : null;
  return (
    <div className="mt-6" data-testid="diagnostic-resultat">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-gold">Ton diagnostic</p>
      <div className="mt-4 flex flex-col items-center">
        <Jauge valeur={res.global} />
        <p className="mt-2 font-display text-xl font-bold text-offwhite">{niveau(res.global)}</p>
        {delta != null && <p className="text-sm text-offwhite/60">{delta >= 0 ? `+${delta}` : delta} points depuis ton dernier diagnostic</p>}
        {envoi && <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-offwhite/50"><Loader2 className="h-3 w-3 animate-spin" /> Enregistrement…</p>}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2.5" data-testid="diagnostic-pro-perso">
        <Barre label="Vie pro" valeur={res.pro} />
        <Barre label="Vie perso" valeur={res.perso} />
        {spirituel && res.spirituel != null && <div className="col-span-2"><Barre label="Vie spirituelle" valeur={res.spirituel} /></div>}
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <RadarEquilibre domaines={domaines} scores={res.scores} />
      </div>

      <Section titre="Tes 2 priorités" items={priorites} scores={res.scores} avecConseil />
      <Section titre="Tes 2 points forts" items={forces} scores={res.scores} />

      <div className="mt-8 space-y-2.5">
        {enApp ? (
          <Link to="/app/bien-etre" className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#F4EFE6] text-lg font-bold text-navy-900">
            Voir ma roue de l'équilibre <ArrowRight className="h-5 w-5" />
          </Link>
        ) : (
          <button onClick={onInscription} data-testid="diagnostic-inscription"
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#F4EFE6] text-lg font-bold text-navy-900">
            <Sparkles className="h-5 w-5" /> Garder mon résultat et avoir mon plan
          </button>
        )}
        <button onClick={onRecommencer} className="flex w-full items-center justify-center gap-2 py-2 text-sm text-offwhite/60 hover:text-offwhite">
          <RefreshCw className="h-4 w-4" /> Refaire le diagnostic
        </button>
      </div>
      {!enApp && <p className="mt-2 text-center text-xs text-offwhite/45">Ton résultat est gardé et ajouté à ton cockpit dès la création du compte.</p>}
    </div>
  );
}

function Section({ titre, items, scores, avecConseil = false }) {
  return (
    <div className="mt-6">
      <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-offwhite/55">{titre}</p>
      <div className="space-y-2.5">
        {items.map((d) => (
          <div key={d.cle} className="rounded-3xl border border-white/12 bg-white/[0.06] p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-offwhite">{d.emoji} {d.label}</p>
              <span className="font-display text-lg font-extrabold" style={{ color: d.couleur }}>{scores[d.cle]}</span>
            </div>
            {avecConseil && <p className="mt-2 text-sm leading-relaxed text-offwhite/75">{d.conseil}</p>}
            <p className="mt-2 inline-flex items-start gap-1.5 text-[11.5px] text-offwhite/45"><BookOpen className="mt-0.5 h-3 w-3 shrink-0" /> {d.livre}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Barre({ label, valeur }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-offwhite/70">{label}</span>
        <span className="font-display text-xl font-extrabold text-gold">{valeur ?? "–"}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-[#F1E2CC] to-[#DEC2A3]" style={{ width: `${valeur || 0}%` }} />
      </div>
    </div>
  );
}

function Jauge({ valeur }) {
  const r = 70, c = 2 * Math.PI * r;
  return (
    <div className="relative h-44 w-44">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
        <circle cx="80" cy="80" r={r} fill="none" stroke="#DEC2A3" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - valeur / 100)} style={{ transition: "stroke-dashoffset 900ms ease", filter: "drop-shadow(0 0 10px rgba(222,194,163,0.45))" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-5xl font-extrabold text-offwhite">{valeur}</span>
        <span className="text-xs text-offwhite/50">/ 100</span>
      </div>
    </div>
  );
}

function RadarEquilibre({ domaines, scores }) {
  const n = domaines.length, cx = 150, cy = 150, R = 105;
  const pt = (i, v) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v];
  };
  const poly = domaines.map((d, i) => pt(i, (scores[d.cle] || 0) / 100).join(",")).join(" ");
  return (
    <svg viewBox="-50 -5 400 310" className="mx-auto w-full max-w-[380px]" role="img" aria-label="Roue de l'équilibre" data-testid="diagnostic-radar">
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} points={domaines.map((_, i) => pt(i, k).join(",")).join(" ")} fill="none" stroke="rgba(255,255,255,0.10)" />
      ))}
      {domaines.map((_, i) => { const [x, y] = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.07)" />; })}
      <polygon points={poly} fill="rgba(222,194,163,0.22)" stroke="#DEC2A3" strokeWidth="2" />
      {domaines.map((d, i) => {
        const [x, y] = pt(i, (scores[d.cle] || 0) / 100);
        const [lx, ly] = pt(i, 1.24);
        return (
          <g key={d.cle}>
            <circle cx={x} cy={y} r="4" fill={d.couleur} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="10.5" fill="rgba(237,242,255,0.75)">{d.emoji} {d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
