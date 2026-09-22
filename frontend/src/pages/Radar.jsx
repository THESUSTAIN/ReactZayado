import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import Lenis from "lenis";
import {
  Radar as RadarGlyph, Loader2, Send, Linkedin, MessageCircle,
  Sparkles, Copy, RefreshCw, Compass, ArrowLeft, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import { GlassCard } from "@/components/kairos/GlassCard";
import { fetchRadar, genererSwot } from "@/lib/kairosApi";

const CANAL_META = {
  email: { icon: Send, color: "#DEC2A3", label: "Email" },
  linkedin: { icon: Linkedin, color: "#5B8DEF", label: "LinkedIn" },
  whatsapp: { icon: MessageCircle, color: "#25D366", label: "WhatsApp" },
};

const EASE = [0.22, 1, 0.36, 1];

function MaskedLine({ children, delay = 0, className = "" }) {
  return (
    <span className={`block overflow-hidden ${className}`}>
      <motion.span
        className="block"
        initial={{ y: "115%" }}
        animate={{ y: 0 }}
        transition={{ duration: 1, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function Reveal({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.75, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Chapter({ num, title, sub }) {
  return (
    <Reveal className="mb-8 flex items-end gap-4 sm:gap-6">
      <span className="font-display text-6xl font-extrabold leading-none text-white/[0.07] sm:text-8xl" data-testid={`chapter-num-${num}`}>
        {num}
      </span>
      <div className="pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">{sub}</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-offwhite sm:text-3xl">{title}</h2>
      </div>
    </Reveal>
  );
}

const SWOT_QUADRANTS = [
  { cle: "forces", label: "Forces", couleur: "#7A9E7E" },
  { cle: "faiblesses", label: "Faiblesses", couleur: "#B9524E" },
  { cle: "opportunites", label: "Opportunités", couleur: "#DEC2A3" },
  { cle: "menaces", label: "Menaces", couleur: "#7C93C3" },
];

// Branché sur POST /radar/swot — prêt côté serveur depuis un moment,
// jamais relié à l'écran avant (retour Marie Esther : « le SWOT utile ? »).
function SwotSection() {
  const [swot, setSwot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);

  const generer = () => {
    setLoading(true);
    setErreur(null);
    genererSwot()
      .then(setSwot)
      .catch(() => setErreur("Analyse indisponible pour l'instant — réessaie dans un instant."))
      .finally(() => setLoading(false));
  };

  return (
    <section className="pt-20" data-testid="radar-chapter-swot">
      <Chapter num="03" sub="Vue d'ensemble" title="Ton SWOT, généré par l'IA" />
      {!swot && !loading && (
        <GlassCard className="p-6 text-center">
          <p className="text-sm text-offwhite/65">Une analyse forces / faiblesses / opportunités / menaces à partir de ton vrai contexte — pas un modèle générique.</p>
          <button onClick={generer} data-testid="radar-swot-generer" className="btn-gold mt-4 inline-flex items-center gap-2 !px-6 !py-2.5">
            <Sparkles size={15} /> Générer mon SWOT
          </button>
          {erreur && <p className="mt-3 text-xs text-rose-300">{erreur}</p>}
        </GlassCard>
      )}
      {loading && (
        <GlassCard className="flex items-center justify-center gap-2 p-8 text-sm text-offwhite/60">
          <Loader2 size={16} className="animate-spin" /> Analyse en cours…
        </GlassCard>
      )}
      {swot && !loading && (
        <div data-testid="radar-swot-resultat">
          <div className="grid gap-4 sm:grid-cols-2">
            {SWOT_QUADRANTS.map((q) => (
              <GlassCard key={q.cle} className="p-5" data-testid={`radar-swot-${q.cle}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: q.couleur }}>{q.label}</p>
                <ul className="mt-2.5 space-y-1.5">
                  {(swot[q.cle] || []).length === 0 && <li className="text-sm text-offwhite/45">Rien de notable identifié.</li>}
                  {(swot[q.cle] || []).map((item, i) => (
                    <li key={i} className="text-sm leading-relaxed text-offwhite/75">• {item}</li>
                  ))}
                </ul>
              </GlassCard>
            ))}
          </div>
          {swot.synthese && (
            <GlassCard className="mt-4 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Synthèse</p>
              <p className="mt-1.5 text-sm leading-relaxed text-offwhite/80">{swot.synthese}</p>
            </GlassCard>
          )}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] text-offwhite/40">Généré le {new Date(swot.genere_a).toLocaleString("fr-FR")}</p>
            <button onClick={generer} data-testid="radar-swot-regenerer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold hover:underline">
              <RefreshCw size={12} /> Régénérer
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function blipPosition(op, i) {
  const angle = (i * 137.5 + 25) * (Math.PI / 180);
  const rf = 0.3 + (1 - (op.score || 50) / 100) * 0.58;
  return { x: 50 + Math.cos(angle) * 41 * rf, y: 50 + Math.sin(angle) * 41 * rf };
}

function RadarVisual({ opportunities, onSelect }) {
  return (
    <div className="relative aspect-square w-full max-w-[440px]" data-testid="radar-visual">
      <div className="radar-sweep absolute inset-0 rounded-full" />
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full">
        {[60, 110, 160, 194].map((r) => (
          <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="rgba(237,242,255,0.09)" strokeWidth="1" />
        ))}
        <circle cx="200" cy="200" r="194" fill="none" stroke="rgba(222,194,163,0.28)" strokeWidth="1" strokeDasharray="3 6" />
        <line x1="200" y1="6" x2="200" y2="394" stroke="rgba(237,242,255,0.06)" />
        <line x1="6" y1="200" x2="394" y2="200" stroke="rgba(237,242,255,0.06)" />
        <circle cx="200" cy="200" r="4" fill="#DEC2A3" />
      </svg>
      {opportunities.map((op, i) => {
        const meta = CANAL_META[op.canal] || CANAL_META.email;
        const { x, y } = blipPosition(op, i);
        return (
          <motion.button
            key={i}
            onClick={() => onSelect(i)}
            data-testid={`radar-blip-${i}`}
            className="absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-sm"
            style={{
              left: `${x}%`, top: `${y}%`,
              borderColor: `${meta.color}66`, background: `${meta.color}1f`, color: meta.color,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1 + i * 0.25, duration: 0.5, ease: EASE }}
            whileHover={{ scale: 1.25 }}
            title={op.titre}
          >
            <span className="blip-pulse absolute inset-0 rounded-full" style={{ border: `1px solid ${meta.color}` }} />
            {React.createElement(meta.icon, { size: 13 })}
          </motion.button>
        );
      })}
    </div>
  );
}

function Marquee() {
  const words = ["Signaux captés", "Ta Vision", "3 opportunités max", "Le calme avant tout", "Passe à l'action"];
  const row = [...words, ...words, ...words];
  return (
    <div className="overflow-hidden border-y border-white/8 py-4" data-testid="radar-marquee">
      <div className="animate-marquee flex w-max items-center gap-10">
        {[0, 1].map((half) => (
          <div key={half} className="flex items-center gap-10">
            {row.map((w, i) => (
              <span key={`${half}-${i}`} className="flex items-center gap-10 whitespace-nowrap">
                <span className="font-serif-italic text-xl text-offwhite/45 sm:text-2xl">{w}</span>
                <Sparkles size={13} className="text-gold/60" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Radar() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("tous");
  const navigate = useNavigate();
  const lenisRef = useRef(null);
  const heroRef = useRef(null);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yVisual = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const yTitle = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenisRef.current = lenis;
    let raf;
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);

  const load = () => {
    setLoading(true);
    fetchRadar()
      .then(setData)
      .catch(() => toast.error("Radar indisponible"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const opportunities = useMemo(() => data?.opportunities || [], [data]);
  const counts = useMemo(() => {
    const c = { tous: opportunities.length };
    opportunities.forEach((op) => { c[op.canal] = (c[op.canal] || 0) + 1; });
    return c;
  }, [opportunities]);
  const filtered = filter === "tous" ? opportunities : opportunities.filter((op) => op.canal === filter);

  const scrollToOp = (i) => {
    const el = document.getElementById(`radar-op-${i}`);
    if (el && lenisRef.current) lenisRef.current.scrollTo(el, { offset: -110, duration: 1.2 });
  };

  const copyMessage = (op) => {
    navigator.clipboard?.writeText(op.message || "");
    toast.success("Message copié — prêt à envoyer");
  };

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen" data-testid="radar-page">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <Header />

        {/* ── HERO ── */}
        <section ref={heroRef} className="relative overflow-hidden px-4 pb-14 pt-10 sm:px-8 lg:px-14 lg:pt-14">
          <div className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-gold/[0.07] blur-3xl" />
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-6">
            <motion.div style={{ y: yTitle, opacity: heroOpacity }} className="relative z-10 flex-1">
              <button
                onClick={() => navigate("/app")}
                data-testid="radar-back-btn"
                className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs font-medium text-offwhite/70 transition-colors hover:border-gold/40 hover:text-offwhite"
              >
                <ArrowLeft size={13} /> Retour au Cockpit
              </button>
              <MaskedLine delay={0.1}>
                <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-gold">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
                  </span>
                  Scan actif · {today}
                </span>
              </MaskedLine>
              <h1 className="mt-5 font-display font-extrabold leading-[0.92]" data-testid="radar-hero-title">
                <MaskedLine delay={0.22}>
                  <span className="text-gradient-gold text-[19vw] sm:text-[13vw] lg:text-[9.5rem]">RADAR</span>
                </MaskedLine>
                <MaskedLine delay={0.36}>
                  <span className="font-serif-italic text-[9vw] font-normal text-offwhite/85 sm:text-[5.5vw] lg:text-[3.6rem]">
                    du jour, par l'IA
                  </span>
                </MaskedLine>
              </h1>
              <MaskedLine delay={0.55} className="mt-6 max-w-md">
                <p className="text-sm leading-relaxed text-offwhite/65 sm:text-base">
                  Chaque matin, Kairos balaie les signaux autorisés et les croise avec ta Vision.
                  Trois opportunités qualifiées, un message pré-rédigé. Tu valides, c'est envoyé.
                </p>
              </MaskedLine>
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75, duration: 0.7, ease: EASE }}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                <button onClick={load} data-testid="radar-refresh-btn" className="btn-gold">
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                  Relancer le scan
                </button>
                <button onClick={() => navigate("/app/vision")} data-testid="radar-vision-btn" className="btn-ghost">
                  <Compass size={15} className="text-gold" /> Affiner ma Vision
                </button>
              </motion.div>
            </motion.div>

            <motion.div style={{ y: yVisual }} className="flex flex-1 items-center justify-center">
              {loading && !data ? (
                <div className="flex flex-col items-center gap-4 py-16" data-testid="radar-loading">
                  <RadarGlyph className="h-10 w-10 animate-pulse text-gold" />
                  <p className="text-xs uppercase tracking-[0.24em] text-offwhite/50">Balayage des signaux…</p>
                </div>
              ) : (
                <RadarVisual opportunities={opportunities} onSelect={scrollToOp} />
              )}
            </motion.div>
          </div>
        </section>

        <Marquee />

        <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-8 lg:px-14">
          {/* ── CHAPITRE 01 · TON CAP ── */}
          <section className="pt-16" data-testid="radar-chapter-cap">
            <Chapter num="01" sub="La boussole" title="Ton cap, notre référence" />
            <Reveal delay={0.1}>
              <GlassCard gold className="relative overflow-hidden" data-testid="radar-phrase-card">
                <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-gold/10 blur-2xl" />
                <p className="font-serif-italic text-xl leading-relaxed text-offwhite sm:text-2xl">
                  « {data?.phrase_ia || "Le radar écoute ta Vision…"} »
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {(data?.objectifs_utilises || []).map((o, i) => (
                    <span
                      key={i}
                      data-testid={`radar-objectif-${i}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] text-offwhite/75"
                    >
                      <Zap size={11} className="text-gold" /> {o}
                    </span>
                  ))}
                  {(!data?.objectifs_utilises || data.objectifs_utilises.length === 0) && (
                    <span className="text-xs italic text-offwhite/50">
                      Aucun objectif relié — pose ton cap sur la Vision pour activer le radar.
                    </span>
                  )}
                </div>
              </GlassCard>
            </Reveal>
          </section>

          {/* ── CHAPITRE 02 · OPPORTUNITÉS ── */}
          <section className="pt-20" data-testid="radar-chapter-opportunites">
            <Chapter num="02" sub="Le bijou" title="Opportunités qualifiées" />
            <Reveal className="mb-6 flex flex-wrap items-center gap-2">
              {["tous", "email", "linkedin", "whatsapp"].map((c) => {
                const meta = CANAL_META[c];
                const active = filter === c;
                return (
                  <button
                    key={c}
                    onClick={() => setFilter(c)}
                    data-testid={`radar-filter-${c}`}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                      active
                        ? "border-gold/60 bg-gold/15 text-gold"
                        : "border-white/12 bg-white/5 text-offwhite/60 hover:border-white/25 hover:text-offwhite"
                    }`}
                  >
                    {meta && React.createElement(meta.icon, { size: 12, style: { color: meta.color } })}
                    {c === "tous" ? "Tous" : meta.label}
                    <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-gold/25" : "bg-white/10"}`}>
                      {counts[c] || 0}
                    </span>
                  </button>
                );
              })}
            </Reveal>

            {filtered.length === 0 ? (
              <Reveal>
                <GlassCard className="py-14 text-center" data-testid="radar-empty-state">
                  <RadarGlyph className="mx-auto mb-4 h-9 w-9 text-gold/60" />
                  <p className="font-display text-lg font-bold text-offwhite">Le radar n'a rien capté ici</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-offwhite/60">
                    Ajoute des objectifs sur ta Vision ou change de filtre pour voir les opportunités.
                  </p>
                  <button onClick={() => navigate("/app/vision")} data-testid="radar-empty-vision-btn" className="btn-gold mt-6">
                    <Compass size={15} /> Ouvrir ma Vision
                  </button>
                </GlassCard>
              </Reveal>
            ) : (
              <div className="space-y-5">
                {filtered.map((op) => {
                  const i = opportunities.indexOf(op);
                  const meta = CANAL_META[op.canal] || CANAL_META.email;
                  return (
                    <Reveal key={i} delay={i * 0.08}>
                      <div id={`radar-op-${i}`}>
                        <GlassCard
                          className="group relative overflow-hidden transition-all duration-300 hover:border-gold/35"
                          data-testid={`radar-op-card-${i}`}
                        >
                          <span className="pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 font-display text-[7rem] font-extrabold leading-none text-white/[0.045] transition-transform duration-500 group-hover:scale-110 sm:text-[9rem]">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
                            <div className="flex items-center gap-4 sm:flex-col sm:items-center">
                              <span
                                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                                style={{ background: `${meta.color}1c`, color: meta.color, border: `1px solid ${meta.color}44` }}
                              >
                                {React.createElement(meta.icon, { size: 20 })}
                              </span>
                              <div className="text-center">
                                <p className="font-display text-2xl font-extrabold text-gold" data-testid={`radar-op-score-${i}`}>
                                  {op.score}
                                </p>
                                <p className="text-[9px] uppercase tracking-[0.2em] text-offwhite/45">score</p>
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] uppercase tracking-[0.22em] text-offwhite/50">
                                {meta.label} · relié à « {op.objectif} »
                              </p>
                              <h3 className="mt-1.5 font-display text-xl font-bold text-offwhite sm:text-2xl">{op.titre}</h3>
                              <p className="mt-3 max-w-2xl border-l-2 border-gold/30 pl-4 font-serif-italic text-[15px] leading-relaxed text-offwhite/70">
                                {op.message}
                              </p>
                            </div>
                            <div className="flex shrink-0 sm:flex-col sm:items-end">
                              <button
                                onClick={() => copyMessage(op)}
                                data-testid={`radar-copy-btn-${i}`}
                                className="inline-flex items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold transition-all duration-200 hover:bg-gold hover:text-navy-900 active:scale-95"
                              >
                                <Copy size={12} /> Copier le message
                              </button>
                            </div>
                          </div>
                        </GlassCard>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── CHAPITRE 03 · SWOT ── */}
          <SwotSection />

          {/* ── CHAPITRE 04 · ACTION ── */}
          <section className="pt-20" data-testid="radar-chapter-action">
            <Chapter num="04" sub="À toi de jouer" title="Passe à l'action" />
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: RefreshCw, title: "Relancer le scan", testid: "radar-action-rescan",
                  text: "Un nouveau balayage des signaux, aligné sur ta Vision du moment.",
                  action: load,
                },
                {
                  icon: Compass, title: "Affiner ma Vision", testid: "radar-action-vision",
                  text: "Plus ton cap est clair, plus les opportunités sont précises.",
                  action: () => navigate("/app/vision"),
                },
                {
                  icon: ArrowLeft, title: "Retour au Cockpit", testid: "radar-action-cockpit",
                  text: "Retrouve ton énergie, tes priorités et ton point du jour.",
                  action: () => navigate("/app"),
                },
              ].map((c, i) => (
                <Reveal key={c.testid} delay={i * 0.1}>
                  <button
                    onClick={c.action}
                    data-testid={c.testid}
                    className="glass group flex h-full w-full flex-col items-start gap-3 rounded-2xl p-6 text-left transition-all duration-300 hover:border-gold/40 hover:bg-white/[0.07]"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold transition-transform duration-300 group-hover:-translate-y-1">
                      {React.createElement(c.icon, { size: 17 })}
                    </span>
                    <p className="font-display text-base font-bold text-offwhite">{c.title}</p>
                    <p className="text-[12.5px] leading-relaxed text-offwhite/60">{c.text}</p>
                  </button>
                </Reveal>
              ))}
            </div>
            <Reveal className="mt-14 pb-6 text-center">
              <p className="font-serif-italic text-sm text-offwhite/40">
                Trois opportunités par jour, pas une de plus — le calme avant tout.
              </p>
            </Reveal>
          </section>
        </div>
      </div>
    </div>
  );
}
