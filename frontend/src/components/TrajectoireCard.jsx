import React from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Check, ArrowRight } from "lucide-react";

export default function TrajectoireCard({ steps = [] }) {
  const navigate = useNavigate();

  if (steps.length === 0) {
    return (
      <div className="glass-card" data-testid="trajectoire-card" style={{ display: "flex", flexDirection: "column" }}>
        <div className="card-label">
          <Compass size={13} />
          Ma trajectoire
        </div>
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", textAlign: "center",
          gap: 12, padding: "28px 16px", minHeight: 180,
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: "50%",
            background: "rgba(201,164,73,0.12)", border: "1px solid rgba(201,164,73,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#C9A449",
          }}>
            <Compass size={20} />
          </div>
          <p style={{ fontSize: 14, color: "var(--txt)", fontWeight: 500, margin: 0 }}>
            Trace ta feuille de route en 4 caps
          </p>
          <p style={{ fontSize: 12, color: "var(--txt-muted)", margin: 0, maxWidth: 340, lineHeight: 1.5 }}>
            Définis tes grandes étapes dans ton Vision Board pour voir ta trajectoire s'afficher ici.
          </p>
          <button
            onClick={() => navigate("/vision-board")}
            data-testid="trajectoire-empty-cta"
            style={{
              marginTop: 4, height: 38, padding: "0 18px", borderRadius: 12,
              background: "linear-gradient(135deg, #C9A449, #E5C887)", border: "none",
              color: "#1a2f4a", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6,
            }}>
            Définir ma trajectoire <ArrowRight size={13} />
          </button>
        </div>
      </div>
    );
  }
  const currentIdx = Math.max(0, steps.findIndex((s) => (s.done || 0) < (s.items || []).length));

  return (
    <div className="glass-card" data-testid="trajectoire-card">
      <div className="card-label">
        <Compass size={13} />
        Ma trajectoire
      </div>

      {/* Timeline */}
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", padding: "16px 8px 8px" }}>
        <div style={{
          position: "absolute", left: "10%", right: "10%", top: 26,
          height: 2, background: "rgba(255,255,255,0.15)", borderRadius: 2,
        }} />
        <div style={{
          position: "absolute", left: "10%", top: 26, height: 2,
          background: "linear-gradient(90deg, #C9A449, #E5C887)",
          width: `${(currentIdx / Math.max(1, steps.length - 1)) * 80}%`,
          transition: "width 1s ease",
        }} />
        {steps.map((s, i) => {
          const current = i === currentIdx;
          return (
            <div key={s.step} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              zIndex: 2, flex: 1, textAlign: "center",
            }} data-testid={`traj-step-${s.step}`}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: current ? "linear-gradient(135deg, #C9A449, #E5C887)" : "rgba(255,255,255,0.1)",
                border: current ? "2px solid #C9A449" : "1.5px solid rgba(255,255,255,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 500,
                color: current ? "#1a2f4a" : "rgba(255,255,255,0.75)",
                boxShadow: current ? "0 0 0 4px rgba(201,164,73,0.15)" : "none",
              }}>{s.step}</div>
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 500, color: "var(--txt)" }}>{s.label}</div>
              <div style={{ fontSize: 10, color: "var(--txt-muted)", marginTop: 2, padding: "0 2px" }}>
                {s.goal}
              </div>
            </div>
          );
        })}
      </div>

      {/* Items grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 12, marginTop: 14, paddingTop: 14,
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}>
        {steps.map((s) => (
          <div key={s.step} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(s.items || []).map((it, k) => {
              const done = k < (s.done || 0);
              return (
                <div key={k} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: "50%",
                    background: done ? "linear-gradient(135deg,#C9A449,#E5C887)" : "transparent",
                    border: done ? "none" : "1px solid rgba(255,255,255,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginTop: 2, flexShrink: 0,
                  }}>
                    {done && <Check size={9} color="#1a2f4a" strokeWidth={3} />}
                  </div>
                  <span style={{
                    fontSize: 11, lineHeight: 1.35,
                    color: done ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)",
                    fontWeight: done ? 500 : 400,
                  }}>{it}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
