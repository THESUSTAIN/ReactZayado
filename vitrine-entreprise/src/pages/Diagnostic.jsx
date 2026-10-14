import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpen, Check, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import usePageMeta from "@/hooks/usePageMeta";
import { envoyerLead } from "@/lib/api";
import { ECHELLE, domainesDe, questionsDe, calculer, niveau } from "@/data/diagnosticLib";

const OFF = "#EDF2FF";
const GOLD = "#DEC2A3";

// Jauge circulaire (portée de l'appli)
function Jauge({ valeur }) {
  const r = 70, c = 2 * Math.PI * r;
  return (
    <div className="relative h-44 w-44">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
        <circle cx="80" cy="80" r={r} fill="none" stroke={GOLD} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - (valeur || 0) / 100)} style={{ transition: "stroke-dashoffset 900ms ease", filter: `drop-shadow(0 0 10px rgba(222,194,163,0.45))` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-5xl font-extrabold">{valeur ?? "–"}</span>
        <span className="text-xs opacity-50">/ 100</span>
      </div>
    </div>
  );
}

function Barre({ label, valeur }) {
  return (
    <div className="glass-navy rounded-2xl p-3.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm opacity-70">{label}</span>
        <span className="font-display text-xl font-extrabold" style={{ color: GOLD }}>{valeur ?? "–"}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-[#F1E2CC] to-[#DEC2A3]" style={{ width: `${valeur || 0}%` }} />
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
      {domaines.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.07)" />;
      })}
      <polygon points={poly} fill="rgba(222,194,163,0.22)" stroke={GOLD} strokeWidth="2" />
      {domaines.map((d, i) => {
        const [x, y] = pt(i, (scores[d.cle] || 0) / 100);
        const [lx, ly] = pt(i, 1.24);
        return (
          <g key={d.cle}>
            <circle cx={x} cy={y} r="4" fill={d.couleur} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="10.5" fill="rgba(237,242,255,0.75)">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function SectionDomaines({ titre, items, scores, avecConseil = false }) {
  return (
    <div className="mt-6">
      <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] opacity-55">{titre}</p>
      <div className="space-y-2.5">
        {items.map((d) => (
          <div key={d.cle} className="glass-navy rounded-3xl p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{d.label}</p>
              <span className="font-display text-lg font-extrabold" style={{ color: d.couleur }}>{scores[d.cle]}</span>
            </div>
            {avecConseil && <p className="mt-2 text-sm leading-relaxed opacity-75">{d.conseil}</p>}
            <p className="mt-2 inline-flex items-start gap-1.5 text-[11.5px] opacity-45"><BookOpen className="mt-0.5 h-3 w-3 flex-none" /> {d.livre}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Diagnostic() {
  usePageMeta(
    "Diagnostic d'équilibre gratuit pour entrepreneurs · Zayado",
    "16 questions, 2 minutes : ton score vie pro, vie perso (et vie spirituelle si tu le souhaites), ta roue de l'équilibre et 2 priorités concrètes."
  );

  const [spirituel, setSpirituel] = useState(null);
  const [phase, setPhase] = useState("intro");
  const [reponses, setReponses] = useState({});
  const [idx, setIdx] = useState(0);
  const [email, setEmail] = useState("");
  const [prenom, setPrenom] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const questions = useMemo(() => questionsDe(!!spirituel), [spirituel]);
  const q = questions[idx];
  const resultat = useMemo(() => calculer(reponses, !!spirituel), [reponses, spirituel]);

  const demarrer = (avecSpirituel) => {
    setSpirituel(avecSpirituel);
    setReponses({});
    setIdx(0);
    setPhase("questions");
  };

  const repondre = (v) => {
    const r = { ...reponses, [q.id]: v };
    setReponses(r);
    setTimeout(() => {
      if (idx + 1 < questions.length) setIdx(idx + 1);
      else setPhase("email");
    }, 160);
  };

  const envoyer = async (e) => {
    e.preventDefault();
    if (!/.+@.+\..+/.test(email) || envoi) return;
    setEnvoi(true);
    const res = await envoyerLead({ email, prenom, source: "diagnostic" });
    setEnvoi(false);
    if (res.ok && res.mode === "brevo") toast.success("Ton résultat t'arrive aussi par email.");
    setPhase("resultat");
  };

  const tri = domainesDe(!!spirituel).filter((d) => resultat.scores[d.cle] != null).sort((a, b) => resultat.scores[a.cle] - resultat.scores[b.cle]);
  const priorites = tri.slice(0, 2);
  const forces = tri.slice(-2).reverse();
  const APP_URL = process.env.REACT_APP_APP_URL || "https://app.zayado.net";

  return (
    <div className="zayado-app-bg min-h-screen px-4 pb-20 pt-6 text-[#EDF2FF]" data-testid="diagnostic-page">
      <div className="mx-auto w-full max-w-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (phase === "questions" && idx > 0 ? setIdx(idx - 1) : setPhase(phase === "questions" ? "intro" : phase))}
            aria-label="Retour"
            className="glass-navy flex h-10 w-10 flex-none items-center justify-center rounded-full hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          {phase === "questions" ? (
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10" data-testid="diagnostic-progress">
              <div className="h-full rounded-full bg-gradient-to-r from-[#F1E2CC] to-[#DEC2A3] transition-all duration-300" style={{ width: `${(idx / questions.length) * 100}%` }} />
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: GOLD }}>Zayado</span>
        </div>

        {phase === "intro" && (
          <div className="mt-10 text-center" data-testid="diagnostic-intro">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: GOLD }}>Diagnostic gratuit · 2 min</p>
            <h1 className="font-display mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">Où en est ton équilibre, vraiment ?</h1>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed opacity-70">
              16 questions sur ta vie pro et ta vie perso. Tu obtiens ton score, ta roue de l’équilibre et 2 priorités concrètes.
            </p>
            <div className="mt-8 glass-navy rounded-3xl p-5 text-left">
              <p className="font-semibold">Ajouter la vie spirituelle ?</p>
              <p className="mt-1 text-sm opacity-60">2 questions de plus : prière ou méditation, foi dans les décisions.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => demarrer(false)} data-testid="diagnostic-sans-spirituel" className="btn inline-flex items-center justify-center border border-white/20 px-4 py-3 text-sm font-semibold" style={{ color: OFF }}>
                  Non, commencer
                </button>
                <button onClick={() => demarrer(true)} data-testid="diagnostic-avec-spirituel" className="btn inline-flex items-center justify-center gap-1.5 border px-4 py-3 text-sm font-semibold" style={spirituel ? { borderColor: GOLD, background: GOLD, color: "#0B1F3A" } : { borderColor: "rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.04)", color: OFF }}>
                  Oui, l’ajouter
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === "questions" && q && (
          <div className="mt-8" data-testid="diagnostic-question">
            <div className="flex items-center justify-between">
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: q.domaine.couleur, color: "#0B1F3A" }}>{q.domaine.label}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] opacity-45" data-testid="diagnostic-compteur">{idx + 1} / {questions.length}</span>
            </div>
            <h2 className="font-display mt-6 min-h-[88px] text-[25px] font-extrabold leading-snug">{q.texte}</h2>
            <div className="mt-6 space-y-2.5">
              {ECHELLE.map((e) => (
                <button key={e.v} onClick={() => repondre(e.v)} data-testid={`diagnostic-rep-${e.v}`}
                  className={`flex w-full items-center gap-4 rounded-3xl border px-5 py-4 text-left text-[15px] font-semibold transition active:scale-[0.99] ${reponses[q.id] === e.v ? "border-[#DEC2A3] bg-white/10" : "glass-navy hover:border-white/30"}`}
                  style={{ color: OFF }}>
                  <span className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((k) => (
                      <span key={k} className={`h-2.5 w-2.5 rounded-full ${k <= e.v ? "bg-[#DEC2A3]" : "bg-white/15"}`} />
                    ))}
                  </span>
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "email" && (
          <div className="mt-10 text-center" data-testid="diagnostic-email">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: GOLD }}>Dernière étape</p>
            <h2 className="font-display mt-3 text-3xl font-extrabold leading-tight">Ton résultat est prêt.</h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed opacity-70">
              Laisse ton email pour le recevoir avec les conseils détaillés — et pouvoir le comparer la prochaine fois.
            </p>
            <form className="glass-navy mx-auto mt-6 max-w-md space-y-3 rounded-3xl p-5 text-left" onSubmit={envoyer}>
              <input className="w-full rounded-full border border-white/20 bg-white/10 px-5 py-3 text-[15px] outline-none placeholder:opacity-45 focus:border-[#DEC2A3]" style={{ color: OFF }} placeholder="Ton prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} data-testid="diagnostic-email-prenom" />
              <input className="w-full rounded-full border border-white/20 bg-white/10 px-5 py-3 text-[15px] outline-none placeholder:opacity-45 focus:border-[#DEC2A3]" style={{ color: OFF }} type="email" placeholder="ton@email.fr" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="diagnostic-email-value" />
              <button className="btn btn-creme w-full px-6 py-3.5 text-[15px]" data-testid="diagnostic-email-submit" disabled={envoi}>
                {envoi ? "Un instant…" : "Voir mon résultat"}
              </button>
            </form>
            <button onClick={() => setPhase("resultat")} className="mt-4 text-[13px] opacity-50 underline hover:opacity-80" data-testid="diagnostic-email-skip">
              Voir mon résultat sans laisser mon email
            </button>
          </div>
        )}

        {phase === "resultat" && resultat.global != null && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mt-8" data-testid="diagnostic-resultat">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: GOLD }}>Ton diagnostic</p>
            <div className="mt-4 flex flex-col items-center">
              <Jauge valeur={resultat.global} />
              <p className="font-display mt-2 text-xl font-bold">{niveau(resultat.global)}</p>
              {envoi && <p className="mt-1 text-xs opacity-50">Enregistrement…</p>}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2.5" data-testid="diagnostic-pro-perso">
              <Barre label="Vie pro" valeur={resultat.pro} />
              <Barre label="Vie perso" valeur={resultat.perso} />
              {spirituel && resultat.spirituel != null && <div className="col-span-2"><Barre label="Vie spirituelle" valeur={resultat.spirituel} /></div>}
            </div>

            <div className="glass-navy mt-6 rounded-3xl p-4">
              <RadarEquilibre domaines={domainesDe(!!spirituel)} scores={resultat.scores} />
            </div>

            <SectionDomaines titre="Tes 2 priorités" items={priorites} scores={resultat.scores} avecConseil />
            <SectionDomaines titre="Tes 2 points forts" items={forces} scores={resultat.scores} />

            <div className="mt-8 space-y-2.5">
              <a href={`${APP_URL}/login?next=${encodeURIComponent("/onboarding")}`} data-testid="diagnostic-cta-compte" className="btn btn-creme flex h-14 w-full items-center justify-center gap-2 text-lg font-bold">
                <Sparkles className="h-5 w-5" /> Garder mon résultat et avoir mon plan
              </a>
              <Link to="/marketplace" data-testid="diagnostic-cta-marketplace" className="btn inline-flex h-14 w-full items-center justify-center gap-2 border border-white/25 text-[15px]" style={{ color: OFF }}>
                Explorer la marketplace <ArrowRight className="h-4 w-4" />
              </Link>
              <button onClick={() => { setReponses({}); setIdx(0); setSpirituel(null); setPhase("intro"); }} className="flex w-full items-center justify-center gap-2 py-2 text-sm opacity-60 hover:opacity-100" data-testid="diagnostic-restart">
                <RefreshCw className="h-4 w-4" /> Refaire le diagnostic
              </button>
            </div>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs opacity-45">
              <Check className="h-3 w-3" /> Ton résultat est gardé et ajouté à ton cockpit dès la création du compte.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
