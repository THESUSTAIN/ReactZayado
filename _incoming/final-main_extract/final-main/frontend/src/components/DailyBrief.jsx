import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, CalendarClock, ArrowRight, X } from "lucide-react";
import { dailyBriefApi } from "@/lib/api";

/**
 * « Le Point du jour » — bannière proactive du Cockpit.
 * Accueille l'utilisateur avec l'échéance la plus proche (moteur de règles fiable)
 * puis, au clic, ouvre le chat co-pilote pré-rempli avec le brief complet.
 * Masquable pour la journée (localStorage).
 */
export default function DailyBrief() {
  const [brief, setBrief] = useState(null);
  const todayKey = new Date().toISOString().slice(0, 10);
  const dismissKey = `zayado_brief_dismissed_${todayKey}`;
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(dismissKey) === "1");

  useEffect(() => {
    dailyBriefApi.get().then(setBrief).catch(() => {});
  }, []);

  if (!brief || dismissed) return null;

  const openBrief = () => {
    window.dispatchEvent(new CustomEvent("zayado:open-cockpit-chat", { detail: { brief } }));
  };
  const dismiss = (e) => {
    e.stopPropagation();
    localStorage.setItem(dismissKey, "1");
    setDismissed(true);
  };

  const urgent = brief.has_urgent;

  return (
    <motion.div
      data-testid="daily-brief-banner"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onClick={openBrief}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") openBrief(); }}
      style={{
        position: "relative", cursor: "pointer", marginBottom: 14,
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
        padding: "14px 18px", borderRadius: 16,
        border: `1px solid ${urgent ? "rgba(199,55,47,0.4)" : "rgba(201,164,73,0.32)"}`,
        background: urgent
          ? "linear-gradient(135deg, rgba(199,55,47,0.10), rgba(30,58,138,0.12))"
          : "linear-gradient(135deg, rgba(201,164,73,0.10), rgba(30,58,138,0.12))",
        transition: "transform .15s, box-shadow .2s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 22px rgba(20,33,61,0.12)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <span
        style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, #C9A449, #D6A85F)",
          color: "#0B1F3A", boxShadow: "0 6px 16px rgba(201,164,73,0.35)",
        }}
      >
        <Sparkles size={20} />
      </span>

      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <strong data-testid="daily-brief-title" style={{ fontSize: 15, color: "var(--txt)" }}>
            Le Point du jour
          </strong>
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase",
            color: "#0B1F3A", background: urgent ? "#F0B429" : "#5DCAA5",
            padding: "2px 7px", borderRadius: 999,
          }}>
            {urgent ? "À traiter" : "Nouveau"}
          </span>
        </div>
        <p data-testid="daily-brief-headline" style={{ margin: "4px 0 0", fontSize: 13, color: "var(--txt-muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <CalendarClock size={14} style={{ flexShrink: 0, color: urgent ? "#C7372F" : "#B8860B" }} />
          {brief.headline}
        </p>
      </div>

      <button
        type="button"
        data-testid="daily-brief-open-chat"
        onClick={(e) => { e.stopPropagation(); openBrief(); }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          height: 38, padding: "0 16px", borderRadius: 999, border: "none", cursor: "pointer",
          background: "#14213d", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0,
        }}
      >
        Ouvrir dans le chat <ArrowRight size={15} />
      </button>

      <button
        type="button"
        data-testid="daily-brief-dismiss"
        aria-label="Masquer pour aujourd'hui"
        onClick={dismiss}
        style={{
          position: "absolute", top: 8, right: 8, width: 24, height: 24,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "transparent", border: "none", cursor: "pointer",
          color: "var(--txt-muted)", borderRadius: 6,
        }}
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}
