import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Clock, Bot, Zap } from "lucide-react";

/**
 * ValueGenerated — indicateur de valeur generee cumulee (ROI).
 * Prouve le retour sur investissement a l'utilisateur ET a un investisseur en
 * demo : temps gagne, taches automatisees, interactions IA.
 * Principe d'honnetete : si aucune donnee reelle, etat vide encourageant
 * plutot que des chiffres inventes.
 */
function formatDuration(min) {
  const m = Math.max(0, Math.round(min || 0));
  if (m < 60) return { value: String(m), unit: "min" };
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return { value: rem ? `${h}h${String(rem).padStart(2, "0")}` : `${h}`, unit: rem ? "" : "h" };
}

export default function ValueGenerated({ value = {} }) {
  const hasData = !!value.has_data;
  const dur = formatDuration(value.time_saved_min);

  return (
    <motion.div
      data-testid="value-generated"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="glass-card"
      style={{
        padding: "14px 18px", marginBottom: 14,
        border: "1px solid rgba(93,202,165,0.28)",
        background: "linear-gradient(135deg, rgba(93,202,165,0.10), rgba(30,58,138,0.14))",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: hasData ? 12 : 6 }}>
        <Sparkles size={15} style={{ color: "#5DCAA5" }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#5DCAA5" }}>
          Valeur generee avec l'IA
        </span>
      </div>

      {hasData ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
          {[
            { icon: Clock, color: "#C9A449", value: dur.value, unit: dur.unit || "", label: "Temps gagne", tid: "value-time-saved" },
            { icon: Bot, color: "#5DCAA5", value: String(value.automated_tasks || 0), unit: "", label: "Taches automatisees", tid: "value-automated" },
            { icon: Zap, color: "#9db4d8", value: String(value.ai_tasks || 0), unit: "", label: "Interactions IA", tid: "value-ai-tasks" },
          ].map(({ icon: Ic, color, value: v, unit, label, tid }) => (
            <div key={label} data-testid={tid} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,0.06)", color,
                }}
              >
                <Ic size={16} />
              </span>
              <div>
                <div style={{ fontSize: 19, fontWeight: 800, color: "var(--txt)", lineHeight: 1 }}>
                  {v}
                  {unit && <span style={{ fontSize: 12, fontWeight: 600, marginLeft: 2, color: "var(--txt-muted)" }}>{unit}</span>}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--txt-muted)", marginTop: 2 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p data-testid="value-generated-empty" className="muted" style={{ fontSize: 12.5, margin: "2px 0 0", lineHeight: 1.5 }}>
          Vos gains de temps s'afficheront ici des vos premieres actions avec le Co-pilote
          (reponses generees, taches automatisees...). Aucun chiffre invente — uniquement votre ROI reel.
        </p>
      )}
    </motion.div>
  );
}
