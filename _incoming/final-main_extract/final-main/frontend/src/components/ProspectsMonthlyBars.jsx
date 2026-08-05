import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { BarChart3 } from "lucide-react";

export default function ProspectsMonthlyBars({ monthly = [] }) {
  const total = monthly.reduce((a, b) => a + (b.received || 0), 0);
  return (
    <div className="glass-card" data-testid="prospects-monthly">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="card-label">
            <BarChart3 size={13} />
            Prospects reçus · 12 mois
          </div>
          <div style={{ fontSize: 11, color: "var(--txt-muted)", marginBottom: 6 }}>
            {total} prospects sur les 12 derniers mois
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 10, color: "var(--txt-soft)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#8fa876" }} />Reçus
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C9A449" }} />Clients
          </span>
        </div>
      </div>

      <div style={{ height: 180, marginTop: 8 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={180}>
          <BarChart data={monthly} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.65)" }}
                   axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.55)" }}
                   axisLine={false} tickLine={false} width={28} />
            <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }}
                     contentStyle={{
                       background: "rgba(20,30,50,0.9)",
                       border: "1px solid rgba(255,255,255,0.15)",
                       borderRadius: 8, fontSize: 11, color: "var(--txt)",
                       backdropFilter: "blur(12px)",
                     }} />
            <Bar dataKey="received" fill="#8fa876" radius={[3, 3, 0, 0]} barSize={10} />
            <Bar dataKey="clients"  fill="#C9A449" radius={[3, 3, 0, 0]} barSize={10} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
