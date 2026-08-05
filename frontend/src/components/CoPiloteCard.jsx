import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Sparkles, Clock, CircleCheck } from "lucide-react";

export default function CoPiloteCard({ copilote = {} }) {
  const {
    ia_percent = null,
    breakdown = [],
    en_attente = 0,
    valides = 0,
    temps_gagne_h = 0,
  } = copilote;
  // Pas de faux pourcentage : si le backend ne renvoie pas de données IA, on affiche "—".
  const iaDisplay = (typeof ia_percent === "number") ? `${ia_percent}%` : "—";

  return (
    <div className="glass-card" data-testid="copilote-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="card-label">
          <Sparkles size={13} />
          Ton Co-pilote
        </div>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 10px", borderRadius: 999,
          background: "rgba(201,164,73,0.20)",
          color: "#C9A449", fontSize: 11, fontWeight: 600,
        }} data-testid="ai-ratio-tag">
          <Sparkles size={11} /> {iaDisplay}{typeof ia_percent === "number" ? " IA" : ""}
        </span>
      </div>

      <p style={{ fontSize: 11, color: "var(--txt-muted)", margin: "2px 0 8px" }}>
        Travail avec l&rsquo;IA
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "8px 0" }}>
        <div style={{ position: "relative", width: 150, height: 150 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={150} minHeight={150}>
            <PieChart>
              <Pie data={breakdown} dataKey="percent" innerRadius={52} outerRadius={70}
                   paddingAngle={2} strokeWidth={0}>
                {breakdown.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles size={14} color="#C9A449" style={{ marginBottom: 2 }} />
            <div style={{ fontSize: 26, fontWeight: 200, color: "var(--txt)", lineHeight: 1 }}>{iaDisplay}</div>
            <div style={{
              fontSize: 9, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "var(--txt-muted)", marginTop: 3,
            }}>avec l&apos;IA</div>
          </div>
        </div>
      </div>

      <div className="copilote-breakdown">
        {breakdown.map((s) => (
          <div key={s.label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            gap: 8, minWidth: 0,
          }} data-testid={`copilote-mix-${s.label.toLowerCase()}`}>
            <span style={{
              display: "flex", alignItems: "center", gap: 5, color: "var(--txt)",
              minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</span>
            </span>
            <b style={{ color: "var(--txt-muted)", fontWeight: 500, flexShrink: 0 }}>{s.percent}%</b>
          </div>
        ))}
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
        marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)",
      }}>
        <Tile icon={<Sparkles size={13} />} value={en_attente} label="En attente" color="#C9A449" />
        <Tile icon={<CircleCheck size={13} />} value={valides} label="Validés" color="#8fa876" />
        <Tile icon={<Clock size={13} />} value={`${temps_gagne_h}h`} label="Temps gagné" color="#7a9dcc" />
      </div>
    </div>
  );
}

function Tile({ icon, value, label, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center" }}>
      <span style={{
        width: 30, height: 30, borderRadius: 8,
        background: `${color}22`, color,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{icon}</span>
      <div style={{ fontSize: 16, fontWeight: 300, color: "var(--txt)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--txt-muted)" }}>
        {label}
      </div>
    </div>
  );
}
