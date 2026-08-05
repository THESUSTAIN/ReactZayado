import React from "react";
import { UserPlus, FilePen, CreditCard, Radar, ChevronRight } from "lucide-react";

const iconMap = { UserPlus, FilePen, CreditCard };

const tileStyle = {
  blue:  { bg: "rgba(120,145,190,0.16)",  color: "#7a9dcc" },
  gold:  { bg: "rgba(201,164,73,0.18)",   color: "#C9A449" },
  green: { bg: "rgba(94,138,90,0.20)",  color: "#8fa876" },
};

export default function ActiviteRecente({ items = [] }) {
  return (
    <div className="glass-card" data-testid="activite-recente-card">
      <div className="card-label">
        <Radar size={13} />
        Activité récente
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((a, i) => {
          const Icon = iconMap[a.icon] || FilePen;
          const tile = tileStyle[a.tile] || tileStyle.blue;
          return (
            <li key={i} data-testid={`activite-${i}`}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "9px 0",
                  borderBottom: i !== items.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                }}>
              <span style={{
                width: 32, height: 32, borderRadius: 8,
                background: tile.bg, color: tile.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Icon size={14} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: "var(--txt)", fontWeight: 500, margin: 0 }}>{a.title}</p>
                <p style={{ fontSize: 11, color: "var(--txt-muted)", margin: 0 }}>{a.desc}</p>
              </div>
              <span style={{ fontSize: 10, color: "var(--txt-muted)", flexShrink: 0 }}>{a.time}</span>
            </li>
          );
        })}
      </ul>

      {items.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--txt-muted)", margin: "4px 0 0" }} data-testid="activite-empty">
          Aucune activité récente pour l&rsquo;instant.
        </p>
      )}
    </div>
  );
}
