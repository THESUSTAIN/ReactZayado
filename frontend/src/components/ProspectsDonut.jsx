import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { PieChart as PieIcon } from "lucide-react";

export default function ProspectsDonut({ repartition = [], total = 0 }) {
  const data = (repartition.length && repartition.some((r) => r.percent > 0))
    ? repartition
    : [{ percent: 100, color: "var(--txt-muted)" }];

  return (
    <div className="glass-card" data-testid="prospects-donut">
      <div className="card-label">
        <PieIcon size={13} />
        Répartition des prospects
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 6 }}>
        <div style={{ position: "relative", width: 140, height: 140, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={140} minHeight={140}>
            <PieChart>
              <Pie data={data} dataKey="percent" innerRadius={40} outerRadius={62}
                   paddingAngle={2} strokeWidth={0}>
                {data.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ fontSize: 26, fontWeight: 200, color: "var(--txt)", lineHeight: 1 }}>{total}</div>
            <div style={{
              fontSize: 9, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--txt-muted)", marginTop: 4,
            }}>Prospects</div>
          </div>
        </div>

        <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1, fontSize: 12 }}>
          {repartition.map((s) => (
            <li key={s.key} data-testid={`prospect-status-${s.key}`}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "4px 0",
                }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--txt)" }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block",
                }} />
                {s.label}
              </span>
              <span style={{ color: "var(--txt)", fontWeight: 500 }}>
                {s.percent}% <span style={{ color: "var(--txt-muted)", fontWeight: 400 }}>({s.count})</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
