import React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";

export default function AlignmentScoreCard({ score = 0, message = "" }) {
  const navigate = useNavigate();
  const r = 60;
  const c = 2 * Math.PI * r;
  const safeScore = typeof score === "number" && !isNaN(score) ? score : 0;
  const hasScore = safeScore > 0;
  const offset = c - (safeScore / 100) * c;

  return (
    <div className="glass-card" data-testid="alignment-card" style={{
      background: "linear-gradient(135deg, rgba(30,60,130,0.5), rgba(60,100,180,0.3))",
      borderColor: "rgba(255,255,255,0.15)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        color: "#E5C887", fontSize: 11, letterSpacing: "0.2em",
        textTransform: "uppercase", fontWeight: 600, marginBottom: 4,
      }}>
        <Sparkles size={12} /> Score d&apos;alignement
      </div>

      <div style={{ display: "flex", justifyContent: "center", flex: 1, alignItems: "center", padding: "12px 0" }}>
        <div style={{ position: "relative", width: 150, height: 150 }}>
          <svg viewBox="0 0 150 150" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
            <circle cx="75" cy="75" r={r} fill="none"
                    stroke="rgba(255,255,255,0.10)" strokeWidth="10" />
            <circle cx="75" cy="75" r={r} fill="none"
                    stroke="url(#alignGrad)" strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 1.2s ease" }} />
            <defs>
              <linearGradient id="alignGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#C9A449" />
                <stop offset="100%" stopColor="#E5C887" />
              </linearGradient>
            </defs>
          </svg>
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              fontSize: 40, fontWeight: 200, color: "var(--txt)",
              lineHeight: 1, letterSpacing: "-0.03em",
            }}>
              {hasScore ? (
                <>{safeScore}<span style={{ fontSize: 20, color: "#E5C887" }}>%</span></>
              ) : (
                <span style={{ fontSize: 32, color: "var(--muted, #9aa4b2)" }}>—</span>
              )}
            </div>
            <div style={{
              fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase",
              color: "#E5C887", marginTop: 6,
            }}>Alignement</div>
          </div>
        </div>
      </div>

      <p style={{
        textAlign: "center", fontSize: 13,
        color: "var(--txt)", lineHeight: 1.45,
        margin: "6px 0 12px",
      }}>{message || (hasScore ? "" : "Complétez votre Vision pour calculer votre score d'alignement.")}</p>

      <button data-testid="alignment-detail-btn" onClick={() => navigate("/vision-board")} style={{
        height: 38, borderRadius: 12,
        background: "rgba(255,255,255,0.10)",
        border: "1px solid rgba(255,255,255,0.15)",
        color: "var(--txt)", fontSize: 12.5, fontWeight: 500,
        cursor: "pointer", fontFamily: "inherit",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        Voir le détail <ArrowRight size={13} />
      </button>
    </div>
  );
}
