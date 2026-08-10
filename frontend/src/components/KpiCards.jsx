import React from "react";
import { Euro, Wallet, Users, HeartPulse, TrendingUp, Clock } from "lucide-react";

function Card({ icon: Icon, label, value, sub, progress, chart, chartColor, delta, testId }) {
  return (
    <div className="glass-card" data-testid={testId} style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{
          width: 34, height: 34, borderRadius: "50%",
          border: "1.5px solid rgba(201,164,73,0.5)",
          color: "#C9A449",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={15} strokeWidth={2} />
        </span>
        <span style={{
          fontSize: 12, fontWeight: 600, color: "var(--txt-muted)",
          letterSpacing: "0.02em",
        }}>{label}</span>
      </div>

      <div style={{
        fontSize: 26, fontWeight: 300, color: "var(--txt)", lineHeight: 1,
        letterSpacing: "-0.02em",
      }}>{value}</div>
      {sub && (
        <p style={{ fontSize: 11.5, color: "var(--txt-muted)", margin: "6px 0 0" }}>
          {sub}
        </p>
      )}

      {chart === "energie-bars" ? (
        <div style={{ display: "flex", gap: 4, height: 6, marginTop: 12 }}>
          <span style={{ flex: 1, borderRadius: 999, background: "#8fa876" }} />
          <span style={{ flex: 1, borderRadius: 999, background: "#8fa876" }} />
          <span style={{ flex: 1, borderRadius: 999, background: "#C9A449" }} />
          <span style={{ flex: 1, borderRadius: 999, background: "rgba(255,255,255,0.15)" }} />
        </div>
      ) : progress !== undefined ? (
        <div style={{
          marginTop: 12, height: 6, borderRadius: 999,
          background: "rgba(255,255,255,0.15)", overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${Math.min(100, progress || 0)}%`,
            background: "linear-gradient(90deg, #C9A449, #E5C887)",
            borderRadius: 999,
          }} />
        </div>
      ) : null}

      {delta !== undefined && delta !== null && (
        <p style={{
          fontSize: 11.5, color: "#8fa876", fontWeight: 500,
          marginTop: 8, display: "flex", alignItems: "center", gap: 4,
        }}>
          <TrendingUp size={12} />
          {delta >= 0 ? "+" : ""}{delta}% vs mois dernier
        </p>
      )}
    </div>
  );
}

export default function KpiCards({ data }) {
  const caMonth = Number(data.ca_month) || 0;
  const caObjective = Number(data.ca_objective) || 0;
  const kpiCa = {
    value: caMonth,
    objective: caObjective,
    progress: caObjective > 0 ? Math.round((caMonth / caObjective) * 100) : 0,
    delta: data.ca_delta_pct,
  };
  const treasury = Number(data.treasury_30d) || 0;
  const prospectsTotal = Number(data.prospects_total) || 0;
  const prospectsActive = Number(data.prospects_active) || 0;
  const prospectsRelaunch = Number(data.prospects_to_relaunch) || 0;
  const bienEtreScore = data.bien_etre_score != null ? data.bien_etre_score : "—";
  const timeSavedMin = Number(data.value_generated?.time_saved_min) || 0;
  const timeSavedLabel = timeSavedMin >= 60
    ? `${Math.floor(timeSavedMin / 60)}h${String(timeSavedMin % 60).padStart(2, "0")}`
    : `${timeSavedMin} min`;
  return (
    <div className="grid-5-cards" data-testid="kpi-cards">
      <Card
        testId="kpi-ca"
        icon={Euro}
        label="CA du mois"
        value={`${Math.round(kpiCa.value).toLocaleString("fr-FR")} €`}
        sub={caObjective > 0 ? `Objectif : ${Math.round(caObjective).toLocaleString("fr-FR")} €` : "Objectif à définir"}
        progress={kpiCa.progress}
        delta={kpiCa.delta}
      />
      <Card
        testId="kpi-net"
        icon={Wallet}
        label="Trésorerie nette"
        value={`${Math.round(treasury).toLocaleString("fr-FR")} €`}
        sub={`Solde projeté à J+30`}
        delta={data.treasury_delta_pct}
      />
      <Card
        testId="kpi-prospects"
        icon={Users}
        label="Prospects"
        value={String(prospectsTotal)}
        sub={`${prospectsActive} actifs · ${prospectsRelaunch} à relancer`}
        delta={data.prospects_delta_pct}
      />
      <Card
        testId="kpi-time-saved"
        icon={Clock}
        label="Temps gagné (IA)"
        value={timeSavedLabel}
        sub="cette semaine"
        chart={timeSavedMin > 0 ? "energie-bars" : undefined}
      />
      <Card
        testId="kpi-bienetre"
        icon={HeartPulse}
        label="Score bien-être"
        value={<>{bienEtreScore}<span style={{ fontSize: 15, color: "var(--txt-muted)" }}> /100</span></>}
        sub={data.bien_etre_label || (bienEtreScore === "—" ? "Fais ton check-in" : "Score du jour")}
        chart={bienEtreScore === "—" ? undefined : "energie-bars"}
        delta={undefined}
      />
    </div>
  );
}
