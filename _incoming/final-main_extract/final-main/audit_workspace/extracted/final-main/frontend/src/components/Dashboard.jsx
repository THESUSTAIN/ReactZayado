import React, { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import VisionDisplay from "@/components/VisionDisplay";
import KpiCards from "@/components/KpiCards";
import AlignmentCelebration from "@/components/AlignmentCelebration";
import PriorityOfTheDay from "@/components/PriorityOfTheDay";
import CockpitGreeting from "@/components/CockpitGreeting";
import { NextSequence, KeyInsights, QuoteBar, NightRecap } from "@/components/CockpitSections";
import { useAuth } from "@/context/AuthContext";

/*
 * Cockpit Zayado — calqué sur la maquette "MyExtension AI".
 * Ordre PC : En-tête | [Priorités | Vision] | KPI | [Valeur IA | Séquence] | Insights (pleine largeur) | Citation
 * Ordre mobile : En-tête, Priorités, KPI, Valeur IA, Séquence, Insights, Vision, Citation
 *   (la Vision Board passe SOUS les insights sur mobile — demande utilisateur).
 * En-tête (CockpitGreeting) inchangé. "Focus compétences" supprimé.
 */
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function Dashboard({ data }) {
  useAuth();

  const [focusMode, setFocusMode] = useState(() => sessionStorage.getItem("zayado_focus_mode") === "1");
  const exitFocusMode = () => {
    sessionStorage.removeItem("zayado_focus_mode");
    setFocusMode(false);
  };
  const [expressMode, setExpressModeState] = useState(() => sessionStorage.getItem("zayado_express_mode") === "1");
  const setExpressMode = (v) => {
    setExpressModeState(v);
    try { sessionStorage.setItem("zayado_express_mode", v ? "1" : "0"); } catch { /* noop */ }
  };
  const compact = focusMode || expressMode;

  return (
    <div data-testid="dashboard-root">
      <AlignmentCelebration score={data.vision?.alignment_percent ?? data.alignment_score ?? 0} />

      {focusMode && (
        <div data-testid="dashboard-focus-mode-banner" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 10, padding: "8px 14px", borderRadius: 10, marginBottom: 10,
          background: "rgba(201,164,73,0.12)", border: "1px solid rgba(201,164,73,0.35)",
          fontSize: 12.5, color: "var(--txt)",
        }}>
          <span>Mode focus activé — vue allégée.</span>
          <button type="button" onClick={exitFocusMode} data-testid="dashboard-focus-mode-exit" style={{
            display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
            background: "transparent", border: "none", color: "var(--txt)", fontSize: 12, fontWeight: 600,
          }}>
            <X size={13} /> Quitter le mode focus
          </button>
        </div>
      )}

      <motion.div className="cockpit-grid" variants={container} initial="hidden" animate="show">
        {/* En-tête (inchangé) */}
        <motion.div variants={item} className="ck-greeting">
          <CockpitGreeting data={data} expressMode={expressMode} setExpressMode={setExpressMode} />
        </motion.div>

        {/* Priorités du jour */}
        <motion.div variants={item} className="ck-priorities">
          <PriorityOfTheDay />
        </motion.div>

        {/* Ma Vision Board (PC: à droite des priorités ; mobile: sous les insights) */}
        <motion.div variants={item} className="ck-vision">
          <VisionDisplay data={data} />
        </motion.div>

        {!compact && (
          <>
            {/* Bandeau KPI */}
            <motion.div variants={item} className="ck-kpis">
              <KpiCards data={data} />
            </motion.div>

            {/* Ce que l'IA a fait pour vous (liste de tâches) */}
            <motion.div variants={item} className="ck-night">
              <NightRecap data={data} />
            </motion.div>

            {/* Prochaine séquence de votre journée */}
            <motion.div variants={item} className="ck-sequence">
              <NextSequence data={data} />
            </motion.div>

            {/* Insights clés pour vous (pleine largeur, 3 cartes de front sur PC) */}
            <motion.div variants={item} className="ck-insights">
              <KeyInsights />
            </motion.div>

            {/* Bandeau citation */}
            <motion.div variants={item} className="ck-quote">
              <QuoteBar data={data} />
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}
