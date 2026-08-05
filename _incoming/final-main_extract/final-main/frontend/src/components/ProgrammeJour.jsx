import React from "react";
import { Calendar } from "lucide-react";

const toneStyle = {
  gold:   { bg: "rgba(201,164,73,0.18)",  color: "#C9A449" },
  sage:   { bg: "rgba(94,138,90,0.20)", color: "#8fa876" },
  navy:   { bg: "rgba(120,145,190,0.16)", color: "#7a9dcc" },
  danger: { bg: "rgba(139,58,58,0.16)", color: "#e0a5a5" },
};

export default function ProgrammeJour({ programme = [] }) {
  return (
    <div className="glass-card" data-testid="programme-jour-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="card-label">
            <Calendar size={13} />
            Programme du jour
          </div>
          <p style={{ fontSize: 11, color: "var(--txt-muted)", margin: "0 0 6px" }}>
            {programme.length} événements
          </p>
        </div>
        <Calendar size={14} style={{ color: "#C9A449" }} />
      </div>

      <div style={{ marginTop: 4 }}>
        {programme.map((p, i) => {
          const tone = toneStyle[p.tone] || toneStyle.navy;
          return (
            <div key={i} data-testid={`programme-${i}`}
                 style={{
                   display: "flex", alignItems: "center", gap: 12,
                   padding: "9px 0",
                   borderBottom: i !== programme.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                 }}>
              <div style={{
                fontSize: 16, fontWeight: 300, color: "var(--txt)",
                width: 52, flexShrink: 0, letterSpacing: "-0.01em",
              }}>{p.time}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--txt)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.title}
                </div>
                <div style={{ fontSize: 11, color: "var(--txt-muted)" }}>{p.sub}</div>
              </div>
              <span style={{
                padding: "3px 8px", borderRadius: 999,
                background: tone.bg, color: tone.color,
                fontSize: 10, fontWeight: 500, flexShrink: 0,
              }}>{p.tag}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
