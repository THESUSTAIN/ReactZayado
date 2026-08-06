import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Wallet, TrendingUp, TrendingDown, Euro, Target, Inbox, AlertTriangle,
  Plus, Sparkles, Gauge, ShieldCheck, PieChart, Trophy, CheckCircle2, X, Loader2, Radio,
  Download, Calculator,
} from "lucide-react";
import { pilotageApi } from "@/lib/api";
import DecisionBanner from "@/components/DecisionBanner";
import { toast } from "sonner";

const fmt = (v) => `${Math.round(Number(v || 0)).toLocaleString("fr-FR")} €`;
const TONE = { gold: "#C9A449", sage: "#5e8a5a", navy: "#4a6a9e", danger: "#c26b4a" };
const PERIODS = [
  { id: "semaine", label: "Semaine" }, { id: "mois", label: "Mois" },
  { id: "trimestre", label: "Trimestre" }, { id: "annee", label: "Année" },
];
const ALERT_TONE = { danger: "#c26b4a", warn: "#C9A449", ok: "#5e8a5a" };

// Export comptable — format compatible Pennylane/Indy/Comptastart (CSV standard)
function exportComptable(ov) {
  if (!ov) return;
  const rows = [
    ["Date", "Libellé", "Catégorie", "Type", "Montant"],
    ...(ov.entries || []).map(e => [e.date, e.label, e.category, e.type === "revenu" ? "Recette" : "Dépense", e.amount]),
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `zayado-pilotage-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Pilotage() {
  const [period, setPeriod] = useState("mois");
  const [ov, setOv] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "revenu", label: "", amount: "", category: "Général" });
  const [simContracts, setSimContracts] = useState(0);
  const [simAmount, setSimAmount] = useState(500);

  const load = useCallback((p) => {
    pilotageApi.overview(p).then(setOv).catch(() => setOv(null));
  }, []);
  useEffect(() => { load(period); }, [period, load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.label || !form.amount) return toast.error("Renseigne un libellé et un montant");
    try {
      await pilotageApi.addEntry({ ...form, amount: Number(form.amount) });
      toast.success(form.type === "revenu" ? "Revenu ajouté" : "Dépense ajoutée");
      setForm({ type: "revenu", label: "", amount: "", category: "Général" });
      setShowForm(false);
      load(period);
    } catch { toast.error("Ajout impossible"); }
  };

  const caPct = ov ? Math.min(100, Math.round((ov.ca_month / ov.ca_objective) * 100)) : 0;
  const salPct = ov ? Math.min(100, Math.round((ov.salary_possible / ov.salary_target) * 100)) : 0;
  const s = ov?.summary;

  return (
    <motion.div className="page" data-testid="page-pilotage"
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">DAF IA — Pilotage financier</h1>
          <p className="page-sub">Ta santé financière en un coup d'œil. Un tableau de bord, pas un logiciel de compta — tu visualises, et Zayado peut superviser.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => window.dispatchEvent(new Event("zayado:open-cockpit-chat"))} className="zbtn" data-testid="daf-supervision-btn" title="Faire superviser mes chiffres par Zayado (comptabilité, optimisation)"><ShieldCheck size={16} /> Faire superviser par Zayado</button>
          <button onClick={() => exportComptable(ov)} className="zbtn" data-testid="export-comptable-btn"><Download size={16} /> Export comptable</button>
          <button onClick={() => setShowForm((v) => !v)} className="zbtn zbtn-primary" data-testid="add-entry-btn"><Plus size={16} /> Ajouter une entrée</button>
        </div>
      </div>

      {/* Sélecteur de période */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }} data-testid="period-selector">
        {PERIODS.map((p) => (
          <button key={p.id} onClick={() => setPeriod(p.id)} data-testid={`period-${p.id}`}
            className={period === p.id ? "zbtn zbtn-primary" : "zbtn"} style={{ height: 38 }}>{p.label}</button>
        ))}
      </div>

      {/* Décision d'abord — signature Zayado. Runway et CA vs objectif
          alimentent la phrase du jour. */}
      <DecisionBanner
        page="pilotage"
        data={{
          treasury_runway_days: s?.runway_days ?? ov?.runway_days ?? 0,
          ca_month: s?.ca_month ?? 0,
          ca_objective: s?.ca_objective ?? 0,
        }}
      />

      {/* Sources connectées */}
      {ov && (
        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 16 }} data-testid="sources-strip">
          <span className="card-label" style={{ margin: 0 }}><Radio size={14} /> Sources connectées</span>
          {ov.sources.map((src) => (
            <span key={src.id} data-testid={`source-${src.id}`} title={src.connected ? `Sync ${src.last_sync}` : "Non connecté"}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999, background: "var(--glass-soft)", border: "1px solid var(--glass-border)", opacity: src.connected ? 1 : 0.5 }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: src.color, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{src.letter}</span>
              <span style={{ fontSize: 13, color: "var(--txt)" }}>{src.name}</span>
              {src.connected ? <CheckCircle2 size={13} style={{ color: "#5e8a5a" }} /> : <span className="muted" style={{ fontSize: 11 }}>—</span>}
            </span>
          ))}
        </div>
      )}

      {/* Formulaire d'ajout */}
      {showForm && (
        <form onSubmit={submit} className="glass-card" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }} data-testid="entry-form">
          <div style={{ display: "flex", gap: 6 }}>
            {["revenu", "depense"].map((t) => (
              <button type="button" key={t} onClick={() => setForm({ ...form, type: t })}
                className={form.type === t ? "zbtn zbtn-primary" : "zbtn"} style={{ height: 44 }} data-testid={`entry-type-${t}`}>
                {t === "revenu" ? "Revenu" : "Dépense"}
              </button>
            ))}
          </div>
          <input className="zinput" style={{ flex: 1, minWidth: 160 }} placeholder="Libellé" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} data-testid="entry-label" />
          <input className="zinput" type="number" style={{ width: 130 }} placeholder="Montant €" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="entry-amount" />
          <button type="submit" className="zbtn zbtn-primary" data-testid="entry-submit">Ajouter</button>
          <button type="button" onClick={() => setShowForm(false)} className="zbtn" style={{ width: 44, padding: 0, justifyContent: "center" }}><X size={16} /></button>
        </form>
      )}

      {/* KPIs */}
      <div className="pgrid pgrid-4" style={{ marginBottom: 16 }}>
        {(ov?.kpis || []).map((k) => {
          const up = k.delta >= 0;
          return (
            <div key={k.id} className="glass-card" data-testid={`kpi-${k.id}`}>
              <div className="card-label" style={{ color: TONE[k.tone] }}>{k.label}</div>
              <div style={{ fontSize: 26, fontWeight: 300, color: "var(--txt)", marginTop: 4 }}>{fmt(k.value)}</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, marginTop: 6, color: up ? "#5e8a5a" : "#c26b4a" }}>
                {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {Math.abs(k.delta)}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Coach + Verdict + Alertes */}
      <div className="pgrid pgrid-3" style={{ marginBottom: 16 }}>
        <div className="glass-card" data-testid="coach-card">
          <div className="card-label" style={{ color: TONE.gold }}><Sparkles size={14} /> Coach IA du jour</div>
          <p style={{ fontSize: 14, color: "var(--txt)", marginTop: 8, lineHeight: 1.5 }}>{ov?.coach?.message}</p>
        </div>
        <div className="glass-card" data-testid="verdict-card">
          <div className="card-label"><Gauge size={14} /> Verdict hebdo IA</div>
          <div style={{ fontSize: 22, fontWeight: 300, color: TONE.gold, margin: "6px 0" }}>{ov?.verdict?.level || "—"}</div>
          <p className="muted" style={{ fontSize: 13 }}>{ov?.verdict?.message}</p>
        </div>
        <div className="glass-card" data-testid="alerts-card">
          <div className="card-label"><AlertTriangle size={14} /> Alertes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {(ov?.alerts || []).map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--txt)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: ALERT_TONE[a.tone], marginTop: 5, flexShrink: 0 }} />{a.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CA chart (barres CSS) */}
      <div className="glass-card" style={{ marginBottom: 16 }} data-testid="ca-chart">
        <div className="card-label"><Euro size={14} /> Évolution du chiffre d'affaires · {PERIODS.find((p) => p.id === period)?.label}</div>
        {ov && (() => {
          const max = Math.max(...ov.monthly.map((m) => m.ca), 1);
          return (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 210, marginTop: 16 }}>
                {ov.monthly.map((m, i) => {
                  const h = Math.max(4, Math.round((m.ca / max) * 100));
                  const last = i === ov.monthly.length - 1;
                  return <div key={i} title={fmt(m.ca)} style={{ flex: 1, display: "flex", alignItems: "flex-end", height: "100%" }}>
                    <div style={{ width: "100%", height: `${h}%`, borderRadius: "6px 6px 0 0", background: last ? "linear-gradient(180deg,#E5C887,#C9A449)" : "rgba(201,164,73,0.35)", transition: "height 0.6s cubic-bezier(0.22,1,0.36,1)" }} />
                  </div>;
                })}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                {ov.monthly.map((m, i) => <span key={i} className="muted" style={{ flex: 1, textAlign: "center", fontSize: 10 }}>{m.month}</span>)}
              </div>
            </>
          );
        })()}
      </div>

      {/* Simulateur de trésorerie — "si je signe X contrats ce mois" */}
      <div className="glass-card" style={{ marginBottom: 16 }} data-testid="cashflow-simulator">
        <div className="card-label" style={{ color: TONE.navy }}><Calculator size={14} /> Simulateur — si je signe des contrats en plus</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 14 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
              <span className="muted">Nombre de contrats supplémentaires</span>
              <strong style={{ color: "var(--txt)" }}>{simContracts}</strong>
            </div>
            <input type="range" min="0" max="10" value={simContracts} onChange={(e) => setSimContracts(Number(e.target.value))}
              style={{ width: "100%" }} data-testid="sim-contracts-slider" />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
              <span className="muted">Montant moyen par contrat</span>
              <strong style={{ color: "var(--txt)" }}>{fmt(simAmount)}</strong>
            </div>
            <input type="range" min="100" max="5000" step="100" value={simAmount} onChange={(e) => setSimAmount(Number(e.target.value))}
              style={{ width: "100%" }} data-testid="sim-amount-slider" />
          </div>
          {ov && (() => {
            const extra = simContracts * simAmount;
            const newCa = (ov.ca_month || 0) + extra;
            const newSalary = (ov.salary_possible || 0) + extra * 0.6; // ~60% après charges, approximation
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "14px", background: "rgba(74,106,158,0.06)", borderRadius: 12, border: "1px solid rgba(74,106,158,0.2)" }}>
                <div>
                  <p className="muted" style={{ fontSize: 11, margin: 0 }}>Nouveau CA du mois</p>
                  <p style={{ fontSize: 20, fontWeight: 300, color: TONE.navy, margin: "2px 0 0" }}>{fmt(newCa)}</p>
                </div>
                <div>
                  <p className="muted" style={{ fontSize: 11, margin: 0 }}>Nouveau salaire possible (estimation)</p>
                  <p style={{ fontSize: 20, fontWeight: 300, color: TONE.sage, margin: "2px 0 0" }}>{fmt(newSalary)}</p>
                </div>
              </div>
            );
          })()}
          <p className="muted" style={{ fontSize: 11, fontStyle: "italic" }}>Estimation indicative — le salaire possible réel dépend de vos charges exactes.</p>
        </div>
      </div>

      <div className="pgrid pgrid-2">
        {/* Résumé santé financière */}
        <div className="glass-card" data-testid="summary-card">
          <div className="card-label"><PieChart size={14} /> Résumé de ta santé financière</div>
          <div className="pgrid pgrid-4" style={{ marginTop: 12, gap: 12 }}>
            <div><div style={{ display: "flex", alignItems: "center", gap: 6, color: "#8b6fbf" }}><Trophy size={14} /><span className="muted" style={{ fontSize: 11 }}>Score</span></div><div style={{ fontSize: 22, fontWeight: 300, color: "var(--txt)" }}>{s?.score ?? "—"}<span className="muted" style={{ fontSize: 12 }}>/100</span></div></div>
            <div><div style={{ display: "flex", alignItems: "center", gap: 6, color: TONE.navy }}><Euro size={14} /><span className="muted" style={{ fontSize: 11 }}>Revenus</span></div><div style={{ fontSize: 20, fontWeight: 300, color: "var(--txt)" }}>{fmt(s?.revenus)}</div></div>
            <div><div style={{ display: "flex", alignItems: "center", gap: 6, color: TONE.gold }}><PieChart size={14} /><span className="muted" style={{ fontSize: 11 }}>Marge</span></div><div style={{ fontSize: 20, fontWeight: 300, color: "var(--txt)" }}>{s?.marge ?? "—"} %</div></div>
            <div><div style={{ display: "flex", alignItems: "center", gap: 6, color: TONE.sage }}><ShieldCheck size={14} /><span className="muted" style={{ fontSize: 11 }}>Trésorerie</span></div><div style={{ fontSize: 20, fontWeight: 300, color: "var(--txt)" }}>{fmt(s?.tresorerie)}</div></div>
          </div>
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><span className="muted">CA vs objectif</span><span style={{ color: "var(--txt)" }}>{fmt(ov?.ca_month)} / {fmt(ov?.ca_objective)}</span></div>
            <div className="progress-bar"><div className="progress-bar-fill yellow" style={{ width: `${caPct}%` }} /></div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><span className="muted">Salaire possible</span><span style={{ color: "var(--txt)" }}>{fmt(ov?.salary_possible)} / {fmt(ov?.salary_target)}</span></div>
            <div className="progress-bar"><div className="progress-bar-fill green" style={{ width: `${salPct}%` }} /></div>
          </div>
        </div>

        {/* Mouvements récents */}
        <div className="glass-card" data-testid="recent-card">
          <div className="card-label"><Inbox size={14} /> Mouvements récents</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {(ov?.entries || []).map((e) => (
              <div key={e.id} data-testid={`entry-${e.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--glass-soft)" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, color: "var(--txt)", margin: 0 }}>{e.label}</p>
                  <p className="muted" style={{ fontSize: 11, margin: "2px 0 0" }}>{e.category} · {e.date}</p>
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap", color: e.type === "revenu" ? "#5e8a5a" : "#c26b4a" }}>
                  {e.type === "revenu" ? "+" : "−"}{fmt(e.amount)}
                </span>
              </div>
            ))}
            {(ov?.entries || []).length === 0 && <p className="muted" style={{ fontSize: 13, textAlign: "center", padding: 12 }}>Aucun mouvement.</p>}
          </div>
        </div>
      </div>

      {/* À venir */}
      <div className="glass-card" style={{ marginTop: 16 }} data-testid="pilotage-echeances">
        <div className="card-label"><Wallet size={14} /> À venir</div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 10 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--txt)" }}><Wallet size={16} /> Factures en attente <strong>{fmt(ov?.pending_invoices)}</strong></span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--txt)" }}><AlertTriangle size={16} style={{ color: "#c26b4a" }} /> Charges ({ov?.charges_next_date}) <strong>{fmt(ov?.charges_due)}</strong></span>
        </div>
      </div>
    </motion.div>
  );
}
