import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import BreathingSession from "@/components/kairos/BreathingSession";
import {
  Heart, Battery, Activity, Moon, Wind, Coffee, BookOpen, Music,
  Sparkles, ChevronRight, Plus, Check, Waves, Cloud, Leaf, Play,
  TrendingUp, Zap, Calendar, ArrowRight, Circle, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useKairos } from "@/context/KairosContext";

const GOLD = "#DEC2A3";

// Palette apaisée (retour Marie Esther : le vert fluo piquait les yeux) —
// sauge douce, bleu ardoise, terracotta feutré, beige doré.
const VITALS_LABEL = {
  energy:  { label: "Énergie", icon: Battery,   color: "#7A9E7E", desc: "Ta capacité d'action", reverse: false },
  stress:  { label: "Stress",  icon: Activity,  color: "#B9524E", desc: "Charge émotionnelle",  reverse: true },
  sleep:   { label: "Sommeil", icon: Moon,      color: "#7C93C3", desc: "Qualité de récup",     reverse: false },
  load:    { label: "Charge",  icon: Heart,     color: "#C9A66B", desc: "Volume de travail",    reverse: true },
};

const RITUALS = [
  { id: "r1", icon: Wind,      title: "Respiration 4-7-8",    desc: "5 min · Poser ton système nerveux",                time: "05:00" },
  { id: "r2", icon: BookOpen,  title: "Journal des 3",         desc: "7 min · 3 gratitudes, 3 apprentissages, 3 intentions", time: "07:00" },
  { id: "r3", icon: Coffee,    title: "Pause consciente",      desc: "3 min · Une pause vraie, sans écran",              time: "03:00" },
  { id: "r4", icon: Moon,      title: "Pensée d'ancrage",      desc: "3 min · Une phrase pour fermer la journée",        time: "03:00" },
  { id: "r5", icon: Waves,     title: "Marche méditative",     desc: "15 min · Dehors, sans casque",                     time: "15:00" },
  { id: "r6", icon: Sparkles,  title: "Visualisation Refuge",  desc: "8 min · Ton lieu-refuge intérieur",                time: "08:00" },
];

const AMBIENCES = [
  { icon: Waves, label: "Vagues" },
  { icon: Cloud, label: "Pluie douce" },
  { icon: Leaf,  label: "Forêt" },
  { icon: Music, label: "Piano lo-fi" },
];

export default function BienEtre() {
  const { user, trend, aCheckin } = useKairos();
  // null = jamais mesuré — on affiche « — » plutôt qu'un faux 4/5 de démo.
  const [vitals, setVitals] = useState(null);
  const [ambience, setAmbience] = useState("Vagues");
  const [checked, setChecked] = useState({});  // ritual id → true
  const [showCheckin, setShowCheckin] = useState(false);
  const [breathingOpen, setBreathingOpen] = useState(false);

  // Historique réel : les check-ins énergie du compte (14 derniers jours).
  const history = (trend || []).slice(-7).map((p) => p.value);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("kairos_vitals");
      if (saved) setVitals(JSON.parse(saved));
      const c = localStorage.getItem("kairos_rituals_done_" + new Date().toISOString().slice(0, 10));
      if (c) setChecked(JSON.parse(c));
    } catch {}
  }, []);

  const saveVital = (k, v) => {
    const next = { ...vitals, [k]: v };
    setVitals(next);
    localStorage.setItem("kairos_vitals", JSON.stringify(next));
  };

  const toggleRitual = (id) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    localStorage.setItem("kairos_rituals_done_" + new Date().toISOString().slice(0, 10), JSON.stringify(next));
    if (next[id]) toast.success("Rituel accompli. Bravo à toi.");
  };

  const doneCount = Object.values(checked).filter(Boolean).length;
  const totalRituals = 3;
  const avgEnergy = history.length ? (history.reduce((s, v) => s + v, 0) / history.length).toFixed(1) : null;

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <Header title="Bien-être" subtitle="Prends soin de toi, doucement." />

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {/* Hero citation */}
          <div className="mb-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.24em]" style={{ color: GOLD }}>Aujourd'hui · Vitals</p>
                <h1 className="mt-2 font-display text-[26px] font-semibold leading-[1.12] sm:text-[34px]">
                  Tes 4 indicateurs, en <span className="font-serif-italic italic" style={{ color: GOLD }}>lecture douce</span>
                </h1>
                <p className="mt-2 font-hand text-[22px] leading-tight text-white/85 sm:text-[26px]">
                  Écoute. Ajuste. Repose.
                </p>
              </div>
              <button onClick={() => setShowCheckin(true)}
                className="hidden shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-[13px] font-semibold text-navy-900 shadow-lg sm:flex"
                style={{ background: GOLD }}>
                <Plus size={14} /> Check-in maintenant
              </button>
            </div>
          </div>

          {/* 4 vitals cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(VITALS_LABEL).map(([key, v]) => {
              const val = vitals?.[key] ?? null;
              const good = val !== null && (v.reverse ? val <= 2 : val >= 4);
              return (
                <button key={key} onClick={() => setShowCheckin(key)}
                  className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-white/25 hover:bg-white/[0.06]"
                  data-testid={`vital-${key}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${v.color}22` }}>
                      <v.icon size={17} style={{ color: v.color }} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">{v.label}</span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-display text-[44px] font-semibold leading-none">{val ?? "—"}</span>
                    {val !== null && <span className="text-[13px] text-white/50">/ 5</span>}
                  </div>
                  <div className="mt-3 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className="h-1.5 flex-1 rounded-full transition"
                        style={{ background: val !== null && n <= val ? v.color : "rgba(255,255,255,0.08)" }} />
                    ))}
                  </div>
                  <div className="mt-2.5 flex items-center gap-1 text-[11px]" style={{ color: good ? "#7A9E7E" : "rgba(255,255,255,0.5)" }}>
                    {val === null ? <>À mesurer — touche pour renseigner</> : good ? <><Sparkles size={11} /> {v.reverse ? "Bas, c'est bien" : "En forme"}</> : <>{v.desc}</>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Rituels doux du jour — Pro checklist */}
          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="font-display text-[20px] font-semibold sm:text-[22px]">Tes 3 rituels doux du jour</h2>
                <p className="mt-1 text-[13px] text-white/55">Coche celui qui t'a fait du bien. Aucun objectif, pas de pression.</p>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-white/45">Aujourd'hui</div>
                <div className="font-display text-[18px] font-semibold" style={{ color: GOLD }}>{doneCount} / {totalRituals}</div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
              <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/5">
                <span className="block h-full transition-all duration-500" style={{ width: `${Math.min(100, (doneCount / totalRituals) * 100)}%`, background: `linear-gradient(90deg, ${GOLD}, ${GOLD}aa)` }} />
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {RITUALS.slice(0, 3).map((r) => {
                  const done = !!checked[r.id];
                  return (
                    <div key={r.id} className={`group flex items-start gap-3 rounded-xl border p-4 transition ${done ? "border-emerald-500/30 bg-emerald-500/[0.06]" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}>
                      <button onClick={() => toggleRitual(r.id)}
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${done ? "border-emerald-500 bg-emerald-500" : "border-white/25 bg-transparent hover:border-white/50"}`}>
                        {done && <Check size={13} className="text-navy-900" strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <r.icon size={15} style={{ color: done ? "#a3e635" : GOLD }} />
                          <h3 className={`text-[13.5px] font-semibold ${done ? "text-emerald-100 line-through decoration-emerald-500/40" : "text-white"}`}>{r.title}</h3>
                        </div>
                        <p className="mt-1 text-[11.5px] text-white/55">{r.desc}</p>
                      </div>
                      <button className="text-white/40 hover:text-white transition opacity-0 group-hover:opacity-100"><Play size={13} /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Big breathing hero card */}
          <section className="mt-6 relative overflow-hidden rounded-2xl border border-white/10 p-6 sm:p-8"
            style={{ background: "linear-gradient(135deg, rgba(129,140,248,0.15), rgba(196,168,229,0.10), rgba(56,178,172,0.10))" }}>
            <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full opacity-40 blur-3xl"
              style={{ background: "radial-gradient(circle, rgba(196,168,229,0.6), transparent 70%)" }} />
            <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-lg">
                <div className="flex items-center gap-2">
                  <Wind size={16} style={{ color: GOLD }} />
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.24em]" style={{ color: GOLD }}>Respiration guidée</span>
                </div>
                <h3 className="mt-3 font-display text-[24px] font-semibold text-white sm:text-[30px]">
                  Une <span className="font-serif-italic italic" style={{ color: GOLD }}>bulle</span> pour respirer.
                </h3>
                <p className="mt-2 font-hand text-[22px] leading-tight text-white/85">Inspire. Retiens. Expire. Recommence.</p>
                <p className="mt-2 text-[13px] text-white/60">3 protocoles : 4-7-8 (calme), Box (focus), Cohérence (anti-stress). Ambiance sonore optionnelle.</p>
              </div>
              <button onClick={() => setBreathingOpen(true)}
                className="group relative flex h-32 w-32 items-center justify-center rounded-full transition hover:scale-105 sm:h-36 sm:w-36"
                style={{
                  background: "radial-gradient(circle at 40% 35%, rgba(255,255,255,0.95), rgba(220,220,235,0.75) 55%, rgba(180,180,220,0.55))",
                  boxShadow: "0 0 50px rgba(196,168,229,0.5), inset 0 0 30px rgba(129,140,248,0.25)",
                }}>
                <span className="font-display text-[22px] font-bold text-navy-900 sm:text-[26px]">Begin</span>
              </button>
            </div>
          </section>

          {/* Layout 2 cols: 14 jours + Insight */}
          <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-[15px] font-semibold">7 derniers jours</h3>
                {avgEnergy && (
                  <div className="flex items-center gap-3 text-[11px] text-white/55">
                    <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: GOLD }} /> Moy. {avgEnergy}/5</div>
                  </div>
                )}
              </div>
              {history.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-center" data-testid="bienetre-history-empty">
                  <TrendingUp size={18} className="text-gold" />
                  <p className="mt-2 max-w-xs text-xs leading-relaxed text-white/55">Aucune mesure pour l'instant — ta courbe d'énergie se dessine ici après tes premiers check-ins.</p>
                </div>
              ) : (
              <div className="relative">
                <svg viewBox="0 0 400 140" className="w-full h-40">
                  <defs>
                    <linearGradient id="ge" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={GOLD} stopOpacity="0.5" />
                      <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <line key={n} x1="0" x2="400" y1={140 - n * 26} y2={140 - n * 26} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" />
                  ))}
                  {(() => {
                    const points = history.map((v, i) => `${(i * 60) + 20},${140 - v * 26}`);
                    const line = points.join(" ");
                    const area = `M20,140 L${line.replace(/ /g, " L")} L${20 + (history.length - 1) * 60},140 Z`;
                    return (
                      <>
                        <path d={area} fill="url(#ge)" />
                        <polyline points={line} fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        {history.map((v, i) => (
                          <circle key={i} cx={(i * 60) + 20} cy={140 - v * 26} r="4" fill={GOLD} />
                        ))}
                      </>
                    );
                  })()}
                </svg>
                <div className="mt-2 flex justify-between px-4 text-[10px] text-white/40">
                  {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i}>{d}</span>)}
                </div>
              </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={15} style={{ color: GOLD }} />
                <h3 className="font-display text-[15px] font-semibold">Insight du jour</h3>
              </div>
              <p className="font-serif-italic italic text-[16px] leading-snug text-white/90">
                « Ton énergie est plus haute après tes marches du matin. »
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-white/60">
                J'ai bloqué <b className="text-white">20 min lundi 7h30</b> pour toi. Tu peux annuler d'un clic si ça ne te dit pas.
              </p>
              <div className="mt-4 flex gap-2">
                <button className="flex-1 rounded-lg py-2 text-[12px] font-semibold text-navy-900" style={{ background: GOLD }}>Accepter</button>
                <button className="rounded-lg border border-white/20 px-3 py-2 text-[12px] text-white/70 hover:bg-white/5">Reporter</button>
              </div>
            </div>
          </div>

          {/* Ambience & séance */}
          <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-4 flex items-center gap-2">
              <Cloud size={15} style={{ color: GOLD }} />
              <h3 className="font-display text-[15px] font-semibold">Ambiance du Refuge</h3>
            </div>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
              {AMBIENCES.map((a) => {
                const active = ambience === a.label;
                return (
                  <button key={a.label} onClick={() => setAmbience(a.label)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${active ? "border-[color:var(--g)] bg-[color:var(--g)]/10" : "border-white/10 bg-white/[0.02] hover:border-white/25"}`}
                    style={{ "--g": GOLD }}>
                    <a.icon size={18} style={{ color: active ? GOLD : "rgba(255,255,255,0.6)" }} />
                    <span className="text-[12px] text-white/80">{a.label}</span>
                  </button>
                );
              })}
            </div>
            <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold text-navy-900" style={{ background: GOLD }}>
              <Play size={14} fill="currentColor" /> Lancer la séance · {ambience} · 8 min
            </button>
          </section>

          {/* Rituels bonus */}
          <section className="mt-6">
            <h3 className="mb-3 font-display text-[15px] font-semibold text-white/80">Autres rituels doux</h3>
            <div className="grid gap-2 md:grid-cols-3">
              {RITUALS.slice(3).map((r) => (
                <button key={r.id} onClick={() => toggleRitual(r.id)}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${checked[r.id] ? "border-emerald-500/30 bg-emerald-500/[0.06]" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `${GOLD}22` }}>
                    <r.icon size={15} style={{ color: GOLD }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-white">{r.title}</div>
                    <div className="text-[11px] text-white/50">{r.desc}</div>
                  </div>
                  {checked[r.id] ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Circle size={16} className="text-white/25" />}
                </button>
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* Check-in modal */}
      {showCheckin && (
        <CheckinModal focus={typeof showCheckin === "string" ? showCheckin : null}
          vitals={vitals} onSave={(k, v) => { saveVital(k, v); if (typeof showCheckin === "string") setShowCheckin(false); }}
          onClose={() => setShowCheckin(false)} />
      )}
      {breathingOpen && <BreathingSession onClose={() => setBreathingOpen(false)} />}
    </div>
  );
}

const PALIER_MOTS = {
  energy: ["À plat", "Basse", "Moyenne", "Bonne", "Au top"],
  stress: ["Zen", "Léger", "Présent", "Fort", "Écrasant"],
  sleep:  ["Très mal", "Mal", "Moyen", "Bien", "Très bien"],
  load:   ["Légère", "Calme", "Chargée", "Lourde", "Débordée"],
};

function CheckinModal({ focus, vitals, onSave, onClose }) {
  const [tab, setTab] = useState(focus || "energy");
  const v = VITALS_LABEL[tab];
  const [choix, setChoix] = useState(null);
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl border border-white/15 p-6 sm:rounded-2xl" style={{ background: "#111f38" }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${v.color}22` }}>
            <v.icon size={20} style={{ color: v.color }} />
          </div>
          <div>
            <div className="font-display text-[17px] font-semibold text-white">Check-in {v.label.toLowerCase()}</div>
            <div className="text-[12px] text-white/55">{v.desc}</div>
          </div>
        </div>
        {!focus && (
          <div className="mb-4 flex gap-1 rounded-lg bg-white/5 p-1">
            {Object.entries(VITALS_LABEL).map(([k, val]) => (
              <button key={k} onClick={() => { setTab(k); setChoix(null); }}
                className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition ${tab === k ? "text-navy-900" : "text-white/70 hover:text-white"}`}
                style={tab === k ? { background: val.color } : {}}>
                {val.label}
              </button>
            ))}
          </div>
        )}
        <p className="mb-2 text-center text-[12px] text-white/60">Choisis le mot qui te ressemble — pas besoin de penser en chiffres.</p>
        <div className="mb-2 flex justify-between gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => { setChoix(n); onSave(tab, n); toast.success(`${v.label} : ${PALIER_MOTS[tab][n - 1]}`); }}
              data-testid={`checkin-vital-${tab}-${n}`}
              className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl border-2 py-2.5 transition ${(choix ?? vitals?.[tab]) === n ? "border-transparent text-navy-900" : "border-white/15 text-white hover:border-white/40"}`}
              style={(choix ?? vitals?.[tab]) === n ? { background: v.color } : {}}>
              <span className="font-display text-[20px] font-semibold leading-none">{n}</span>
              <span className={`text-[9px] font-medium leading-tight text-center ${(choix ?? vitals?.[tab]) === n ? "text-navy-900/80" : "text-white/55"}`}>{PALIER_MOTS[tab][n - 1]}</span>
            </button>
          ))}
        </div>
        <p className="text-center text-[12px] text-white/50 font-serif-italic italic">
          Aucune obligation. Juste une lecture douce de toi.
        </p>
      </div>
    </div>
  );
}
