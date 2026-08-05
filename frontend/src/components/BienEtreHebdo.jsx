import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from "recharts";
import { HeartPulse, ArrowRight } from "lucide-react";

export default function BienEtreHebdo({ bienetre = {} }) {
  const {
    series = [], streak = 0, focus_pct = 0, energy_avg = 0,
  } = bienetre;
  const hasData = series.length > 0;

  return (
    <div className="glass-card" data-testid="bienetre-card"
         style={{
           background: "linear-gradient(135deg, rgba(30,60,130,0.55), rgba(60,100,180,0.35))",
           borderColor: "rgba(255,255,255,0.15)",
         }}>
      <div className="card-label" style={{ color: "#E5C887" }}>
        <HeartPulse size={13} />
        Bien-être · cette semaine
      </div>

      <h3 style={{
        fontSize: 18, fontWeight: 300, color: "var(--txt)",
        margin: "2px 0 8px", lineHeight: 1.2,
      }}>Ton énergie cette semaine</h3>

      {!hasData ? (
        <p style={{ fontSize: 12, color: "var(--txt-muted)", margin: "8px 0 4px" }} data-testid="bienetre-empty">
          Pas encore de check-in cette semaine. Ton premier check-in fera apparaître ta courbe d&rsquo;énergie ici.
        </p>
      ) : (
        <>
          <div style={{ height: 110 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={110}>
              <LineChart data={series}>
                <Line type="monotone" dataKey="value"
                      stroke="#E5C887" strokeWidth={2.5}
                      dot={{ r: 3, fill: "#E5C887", strokeWidth: 2, stroke: "#E5C887" }} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.6)" }}
                       axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{
                  background: "rgba(20,30,50,0.9)", border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8, color: "var(--txt)", fontSize: 11,
                  backdropFilter: "blur(12px)",
                }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
            marginTop: 8, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.10)",
          }}>
            <Stat label="Streak" value={`${streak} j`} />
            <Stat label="Focus" value={`${focus_pct}%`} />
            <Stat label="Énergie" value={`${energy_avg}/100`} />
          </div>
        </>
      )}

      <div className="card-link" data-testid="bienetre-link" style={{ color: "#E5C887" }}>
        <span>{hasData ? "Voir mon espace Énergie" : "Faire mon premier check-in"}</span>
        <ArrowRight size={14} className="arrow" />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 400, color: "var(--txt)", letterSpacing: "-0.01em" }}>{value}</div>
      <div style={{ fontSize: 9, letterSpacing: "0.15em",
                    textTransform: "uppercase", color: "var(--txt-muted)", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}
