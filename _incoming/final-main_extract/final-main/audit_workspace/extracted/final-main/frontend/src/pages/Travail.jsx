import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Briefcase, Plus, CheckCircle2, Circle, Clock, Calendar, Users, Euro,
  TrendingUp, TrendingDown, FileText, Lightbulb, ChevronRight, Loader2,
  Target, Trash2, X, BarChart3, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { travailApi, tasksApi, projectsApi, documentsApi } from "@/lib/api";

const GOLD = "#C9A449", SAGE = "#5DCAA5", CORAL = "#F0808A", PLUM = "#8b6fbf", BLUE = "#5B8DEF";

const STAGE_META = {
  nouveau:     { label: "Nouveaux",     color: BLUE },
  contacte:    { label: "Contactés",    color: SAGE },
  proposition: { label: "Propositions", color: GOLD },
  negociation: { label: "Négociation",  color: PLUM },
  gagne:       { label: "Gagnés",       color: "#3FB68B" },
  perdu:       { label: "Perdus",       color: CORAL },
};
const STAGES = ["nouveau", "contacte", "proposition", "negociation", "gagne", "perdu"];

const TABS = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "crm", label: "CRM" },
  { id: "projets", label: "Projets" },
  { id: "documents", label: "Documents" },
  { id: "dafia", label: "DAF IA" },
];

const eur = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} €`;

function Delta({ value, invert }) {
  if (value == null) return <span className="muted" style={{ fontSize: 11 }}>—</span>;
  const positive = invert ? value < 0 : value > 0;
  const Icon = value >= 0 ? TrendingUp : TrendingDown;
  const color = positive ? SAGE : value === 0 ? "var(--muted)" : CORAL;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color }}>
      <Icon size={11} /> {value > 0 ? "+" : ""}{value}%
    </span>
  );
}

function KpiCard({ icon: Icon, value, label, delta, deltaText, color, testid }) {
  return (
    <div className="glass-card" data-testid={testid} style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: `${color}1e`, color, flexShrink: 0 }}><Icon size={16} /></span>
        <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 300, color: "var(--txt)", lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: 6 }}>{delta !== undefined ? <Delta value={delta} /> : <span className="muted" style={{ fontSize: 11 }}>{deltaText}</span>}</div>
    </div>
  );
}

function PipelineDonut({ pipeline, total }) {
  const segs = STAGES.filter((s) => (pipeline?.[s] || 0) > 0).map((s) => ({ s, v: pipeline[s], ...STAGE_META[s] }));
  const sum = segs.reduce((a, b) => a + b.v, 0);
  const R = 52, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: 130, height: 130, flexShrink: 0 }}>
        <svg viewBox="0 0 130 130" style={{ transform: "rotate(-90deg)" }} width="130" height="130">
          <circle cx="65" cy="65" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
          {sum > 0 && segs.map((seg) => {
            const len = (seg.v / sum) * C;
            const el = <circle key={seg.s} cx="65" cy="65" r={R} fill="none" stroke={seg.color} strokeWidth="14"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />;
            offset += len;
            return el;
          })}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 30, fontWeight: 300, color: "var(--txt)" }}>{total}</span>
          <span className="muted" style={{ fontSize: 11 }}>Leads</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 150, display: "flex", flexDirection: "column", gap: 7 }}>
        {STAGES.filter((s) => s !== "perdu").map((s) => {
          const v = pipeline?.[s] || 0;
          const pct = sum > 0 ? Math.round((v / sum) * 100) : 0;
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: STAGE_META[s].color, flexShrink: 0 }} />
              <span style={{ flex: 1, color: "var(--txt)" }}>{STAGE_META[s].label}</span>
              <span className="muted">{v} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionCard({ title, action, onAction, children, testid }) {
  return (
    <div className="glass-card" data-testid={testid} style={{ alignSelf: "start" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 className="sec-title" style={{ fontSize: 16, margin: 0 }}>{title}</h3>
        {action && <button onClick={onAction} className="tv-link" data-testid={`${testid}-action`} style={{ background: "none", border: "none", cursor: "pointer", color: GOLD, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>{action} <ChevronRight size={13} /></button>}
      </div>
      {children}
    </div>
  );
}

const PRIO = {
  high: { label: "Haute", color: CORAL }, haute: { label: "Haute", color: CORAL },
  normal: { label: "Moyenne", color: BLUE }, moyenne: { label: "Moyenne", color: BLUE },
  low: { label: "Basse", color: "var(--muted)" },
};

// ─── QUICK CREATE MODAL ────────────────────────────────────────
function QuickCreate({ type, onClose, onDone }) {
  const [f, setF] = useState({ label: "", priority: "normal", name: "", stage: "nouveau", value: "", title: "", time: "", kind: "visio" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const titles = { task: "Nouvelle tâche", lead: "Nouveau lead", event: "Nouveau rendez-vous" };

  const submit = async () => {
    setBusy(true);
    try {
      if (type === "task") {
        if (!f.label.trim()) { setBusy(false); return; }
        await tasksApi.create({ label: f.label.trim(), priority: f.priority });
      } else if (type === "lead") {
        if (!f.name.trim()) { setBusy(false); return; }
        await travailApi.addLead({ name: f.name.trim(), stage: f.stage, value: parseFloat(f.value) || 0 });
      } else {
        if (!f.title.trim()) { setBusy(false); return; }
        await travailApi.addEvent({ title: f.title.trim(), time: f.time, kind: f.kind });
      }
      toast.success("Ajouté ✦");
      onDone();
      onClose();
    } catch { toast.error("Ajout impossible"); } finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(11,31,58,0.6)", backdropFilter: "blur(6px)", zIndex: 950, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} data-testid="quick-create-modal">
      <div onClick={(e) => e.stopPropagation()} className="glass-card" style={{ width: "100%", maxWidth: 440, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, margin: 0, color: "var(--txt)" }}>{titles[type]}</h3>
          <button onClick={onClose} data-testid="quick-create-close" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {type === "task" && (<>
            <input className="zinput" autoFocus placeholder="Intitulé de la tâche" value={f.label} onChange={set("label")} data-testid="qc-task-label" />
            <select className="zinput" value={f.priority} onChange={set("priority")} data-testid="qc-task-priority">
              <option value="high">Priorité haute</option><option value="normal">Priorité moyenne</option><option value="low">Priorité basse</option>
            </select>
          </>)}
          {type === "lead" && (<>
            <input className="zinput" autoFocus placeholder="Nom du prospect / client" value={f.name} onChange={set("name")} data-testid="qc-lead-name" />
            <select className="zinput" value={f.stage} onChange={set("stage")} data-testid="qc-lead-stage">
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_META[s].label}</option>)}
            </select>
            <input className="zinput" type="number" placeholder="Valeur potentielle (€)" value={f.value} onChange={set("value")} data-testid="qc-lead-value" />
          </>)}
          {type === "event" && (<>
            <input className="zinput" autoFocus placeholder="Titre du rendez-vous" value={f.title} onChange={set("title")} data-testid="qc-event-title" />
            <input className="zinput" type="time" value={f.time} onChange={set("time")} data-testid="qc-event-time" />
            <select className="zinput" value={f.kind} onChange={set("kind")} data-testid="qc-event-kind">
              <option value="visio">Visioconférence</option><option value="présentiel">Présentiel</option>
              <option value="focus">Bloc de concentration</option><option value="récurrent">Travail récurrent</option>
            </select>
          </>)}
          <button onClick={submit} disabled={busy} className="zbtn zbtn-primary" style={{ justifyContent: "center" }} data-testid="qc-submit">
            {busy ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE ──────────────────────────────────────────────────────
export default function Travail() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";
  const setTab = (t) => setParams(t === "overview" ? {} : { tab: t });

  const [ov, setOv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [recos, setRecos] = useState([]);
  const [crm, setCrm] = useState(null);
  const [docs, setDocs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [newMenu, setNewMenu] = useState(false);
  const [quick, setQuick] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, t, e, r] = await Promise.all([
        travailApi.overview().catch(() => null),
        tasksApi.list().catch(() => ({ items: [] })),
        travailApi.events("today").catch(() => ({ items: [] })),
        travailApi.recommendations().catch(() => ({ items: [] })),
      ]);
      setOv(o); setTasks(t.items || []); setEvents(e.items || []); setRecos(r.items || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (tab === "crm") travailApi.crm().then(setCrm).catch(() => setCrm({ items: [], pipeline: {}, total: 0 }));
    if (tab === "documents") documentsApi.list().then((d) => setDocs(d.items || d || [])).catch(() => setDocs([]));
    if (tab === "projets") projectsApi.list().then((d) => setProjects(d.items || d.projects || d || [])).catch(() => setProjects([]));
  }, [tab]);

  const toggleTask = async (t) => {
    setTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, done: !x.done } : x));
    try { await tasksApi.update(t.id, { done: !t.done }); load(); } catch { load(); }
  };
  const changeStage = async (lead, stage) => {
    setCrm((c) => ({ ...c, items: c.items.map((l) => l.id === lead.id ? { ...l, stage } : l) }));
    try { await travailApi.updateLead(lead.id, { stage }); travailApi.crm().then(setCrm); travailApi.overview().then(setOv); } catch { /* noop */ }
  };
  const delLead = async (lead) => {
    setCrm((c) => ({ ...c, items: c.items.filter((l) => l.id !== lead.id) }));
    try { await travailApi.removeLead(lead.id); travailApi.crm().then(setCrm); } catch { /* noop */ }
  };

  const fin = ov?.finance || {};
  const pending = tasks.filter((t) => !t.done);

  return (
    <motion.div className="page" data-testid="page-travail" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Header */}
      <div className="page-head">
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}><Briefcase size={26} style={{ color: GOLD }} /> Travail</h1>
          <p className="page-sub">Organisez, développez et pilotez votre activité efficacement.</p>
        </div>
        <div style={{ position: "relative" }}>
          <button onClick={() => setNewMenu((v) => !v)} className="zbtn zbtn-primary" data-testid="travail-new-btn" style={{ height: 38, gap: 6 }}>
            <Plus size={15} /> Nouveau
          </button>
          {newMenu && (
            <>
              <div onClick={() => setNewMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div className="glass-card" style={{ position: "absolute", right: 0, top: 44, zIndex: 50, padding: 6, minWidth: 190, display: "flex", flexDirection: "column", gap: 2 }} data-testid="travail-new-menu">
                {[{ t: "task", l: "Nouvelle tâche", i: CheckCircle2 }, { t: "lead", l: "Nouveau lead", i: Users }, { t: "event", l: "Nouveau rendez-vous", i: Calendar }].map((m) => (
                  <button key={m.t} onClick={() => { setQuick(m.t); setNewMenu(false); }} data-testid={`travail-new-${m.t}`}
                    style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 9, background: "none", border: "none", cursor: "pointer", color: "var(--txt)", fontSize: 13, textAlign: "left" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--glass-soft)"} onMouseLeave={(e) => e.currentTarget.style.background = "none"}>
                    <m.i size={15} style={{ color: GOLD }} /> {m.l}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="moi-tabs" data-testid="travail-tabs" style={{ display: "flex", gap: 8, margin: "4px 0 20px", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`travail-tab-${t.id}`} style={{
            padding: "8px 18px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 600,
            border: `1px solid ${tab === t.id ? "rgba(201,164,73,0.5)" : "var(--glass-border)"}`,
            background: tab === t.id ? "rgba(201,164,73,0.14)" : "var(--glass-soft)",
            color: tab === t.id ? "var(--gold-strong)" : "var(--muted)", transition: "background-color 0.2s, color 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      {loading && tab === "overview" ? (
        <p className="muted"><Loader2 size={14} className="spin" style={{ display: "inline" }} /> Chargement…</p>
      ) : (
        <div className="tv-anim" key={tab}>
          {/* ══════════ VUE D'ENSEMBLE ══════════ */}
          {tab === "overview" && ov && (<>
            <div className="grid-5-cards" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 16 }}>
              <KpiCard icon={Target} value={ov.projects.active} label="Projets actifs" deltaText={ov.projects.new_this_month > 0 ? `+${ov.projects.new_this_month} ce mois` : "Aucun ce mois"} color={BLUE} testid="kpi-projects" />
              <KpiCard icon={CheckCircle2} value={ov.tasks.pending} label="Tâches à faire" deltaText={ov.tasks.created_today > 0 ? `+${ov.tasks.created_today} aujourd'hui` : "À jour"} color={SAGE} testid="kpi-tasks" />
              <KpiCard icon={Calendar} value={ov.appointments.today} label="Rendez-vous" deltaText="Aujourd'hui" color={PLUM} testid="kpi-appointments" />
              <KpiCard icon={Euro} value={eur(fin.ca)} label="Chiffre d'affaires" delta={fin.ca_delta} color={GOLD} testid="kpi-ca" />
              <KpiCard icon={BarChart3} value={`${fin.marge ?? 0} %`} label="Marge moyenne" delta={fin.marge_delta} color="#3FB68B" testid="kpi-marge" />
            </div>

            <div className="tv-3col" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              {/* Tâches prioritaires */}
              <SectionCard title="Tâches prioritaires" action={pending.length ? `Voir toutes (${pending.length})` : null} testid="section-tasks">
                {tasks.length === 0 ? (
                  <p className="muted" style={{ fontSize: 13, padding: "12px 0" }}>Aucune tâche. Cliquez sur « Nouveau » pour en ajouter.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {tasks.slice(0, 6).map((t) => {
                      const p = PRIO[t.priority] || PRIO.normal;
                      return (
                        <div key={t.id} data-testid={`task-row-${t.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--glass-border)" }}>
                          <button onClick={() => toggleTask(t)} data-testid={`task-toggle-${t.id}`} style={{ background: "none", border: "none", cursor: "pointer", color: t.done ? SAGE : "var(--muted)", padding: 0, flexShrink: 0 }}>
                            {t.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                          </button>
                          <span style={{ flex: 1, fontSize: 13, color: "var(--txt)", textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.55 : 1 }}>{t.label}</span>
                          <span className="zchip" style={{ background: t.done ? `${SAGE}18` : `${p.color}18`, color: t.done ? SAGE : p.color, fontSize: 11 }}>{t.done ? "Terminée" : p.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button onClick={() => setQuick("task")} data-testid="add-task-inline" style={{ marginTop: 12, background: "none", border: "none", cursor: "pointer", color: GOLD, fontSize: 12.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}><Plus size={13} /> Ajouter une tâche</button>
              </SectionCard>

              {/* Agenda du jour */}
              <SectionCard title="Agenda du jour" testid="section-agenda">
                {events.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <Calendar size={26} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <p className="muted" style={{ fontSize: 12.5 }}>Aucun rendez-vous aujourd'hui.</p>
                    <button onClick={() => setQuick("event")} data-testid="add-event-inline" style={{ marginTop: 8, background: "none", border: "none", cursor: "pointer", color: GOLD, fontSize: 12.5, fontWeight: 600 }}>+ Planifier</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {events.map((e) => (
                      <div key={e.id} data-testid={`event-row-${e.id}`} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--glass-border)" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: GOLD, minWidth: 42, flexShrink: 0 }}>{e.time || "--:--"}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, color: "var(--txt)", margin: 0 }}>{e.title}</p>
                          <p className="muted" style={{ fontSize: 11, margin: 0, textTransform: "capitalize" }}>{e.kind}</p>
                        </div>
                        <button onClick={() => travailApi.removeEvent(e.id).then(() => travailApi.events("today").then((d) => setEvents(d.items || [])))} data-testid={`event-del-${e.id}`} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Pipeline CRM */}
              <SectionCard title="Pipeline CRM" action="Voir le CRM" onAction={() => setTab("crm")} testid="section-pipeline">
                {(ov.crm.total || 0) === 0 ? (
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <Users size={26} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <p className="muted" style={{ fontSize: 12.5 }}>Aucun lead. Construisez votre pipeline commercial.</p>
                    <button onClick={() => setQuick("lead")} data-testid="add-lead-inline" style={{ marginTop: 8, background: "none", border: "none", cursor: "pointer", color: GOLD, fontSize: 12.5, fontWeight: 600 }}>+ Ajouter un lead</button>
                  </div>
                ) : <PipelineDonut pipeline={ov.crm.pipeline} total={ov.crm.total} />}
              </SectionCard>
            </div>

            <div className="tv-3col" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", gap: 16 }}>
              {/* Performance financière */}
              <SectionCard title="Performance financière (ce mois)" action="Voir le DAF IA" onAction={() => setTab("dafia")} testid="section-finance">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {[
                    { k: "CA", v: eur(fin.ca), d: fin.ca_delta },
                    { k: "Dépenses", v: eur(fin.depenses), d: fin.depenses_delta, inv: true },
                    { k: "Résultat net", v: eur(fin.net), d: fin.net_delta },
                    { k: "Marge", v: `${fin.marge ?? 0} %`, d: fin.marge_delta },
                  ].map((r) => (
                    <div key={r.k}>
                      <p className="muted" style={{ fontSize: 11, margin: 0 }}>{r.k}</p>
                      <p style={{ fontSize: 19, fontWeight: 300, color: "var(--txt)", margin: "2px 0" }}>{r.v}</p>
                      <Delta value={r.d} invert={r.inv} />
                    </div>
                  ))}
                </div>
                {(!fin.ca || fin.ca === 0) && <p className="muted" style={{ fontSize: 11.5, marginTop: 12, fontStyle: "italic" }}>Ajoutez vos revenus & dépenses dans le Pilotage pour alimenter ces chiffres.</p>}
              </SectionCard>

              {/* Documents récents */}
              <SectionCard title="Documents récents" action="Voir tous" onAction={() => setTab("documents")} testid="section-documents">
                {docs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <FileText size={26} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <p className="muted" style={{ fontSize: 12.5 }}>Aucun document généré pour l'instant.</p>
                  </div>
                ) : docs.slice(0, 5).map((d, i) => (
                  <div key={d.id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--glass-border)" }}>
                    <FileText size={16} style={{ color: GOLD, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12.5, color: "var(--txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title || d.name || d.filename || "Document"}</span>
                  </div>
                ))}
              </SectionCard>

              {/* Recommandations IA */}
              <SectionCard title="Recommandations IA" testid="section-recos">
                {recos.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <Lightbulb size={26} style={{ opacity: 0.3, marginBottom: 8, color: GOLD }} />
                    <p className="muted" style={{ fontSize: 12.5 }}>Vos recommandations apparaîtront ici au fil de votre activité.</p>
                  </div>
                ) : recos.map((r) => (
                  <button key={r.id} onClick={() => navigate(r.route)} data-testid={`reco-${r.id}`}
                    style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--glass-border)", background: "none", border: "none", borderBottomStyle: "solid", cursor: "pointer", textAlign: "left", width: "100%" }}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(201,164,73,0.15)", color: GOLD }}><Lightbulb size={15} /></span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--txt)", margin: 0 }}>{r.title}</p>
                      <p className="muted" style={{ fontSize: 11.5, margin: "2px 0 0", lineHeight: 1.4 }}>{r.desc}</p>
                    </div>
                    <ChevronRight size={15} style={{ color: "var(--muted)", flexShrink: 0, marginTop: 4 }} />
                  </button>
                ))}
              </SectionCard>
            </div>
          </>)}

          {/* ══════════ CRM ══════════ */}
          {tab === "crm" && (
            crm == null ? <p className="muted"><Loader2 size={14} className="spin" style={{ display: "inline" }} /> Chargement…</p> : (
              <div data-testid="crm-tab">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                  <p className="muted" style={{ fontSize: 13, margin: 0 }}>{crm.total} lead(s) · {eur(crm.won_value)} gagnés</p>
                  <button onClick={() => setQuick("lead")} className="zbtn zbtn-primary" style={{ height: 34 }} data-testid="crm-add-lead"><Plus size={14} /> Nouveau lead</button>
                </div>
                {crm.items.length === 0 ? (
                  <div className="glass-card" style={{ textAlign: "center", padding: "40px 20px" }}>
                    <Users size={34} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <p style={{ fontSize: 15, color: "var(--txt)", margin: "0 0 6px" }}>Votre pipeline est vide</p>
                    <p className="muted" style={{ fontSize: 13, maxWidth: 340, margin: "0 auto" }}>Ajoutez vos prospects et suivez-les de « Nouveau » à « Gagné ». Aucune donnée fictive : vous construisez votre vrai CRM.</p>
                  </div>
                ) : (
                  <div className="tv-kanban" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                    {STAGES.map((s) => {
                      const list = crm.items.filter((l) => (l.stage || "nouveau") === s);
                      return (
                        <div key={s} className="glass-card" data-testid={`crm-col-${s}`} style={{ alignSelf: "start", padding: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 3, background: STAGE_META[s].color }} />
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--txt)" }}>{STAGE_META[s].label}</span>
                            <span className="muted" style={{ fontSize: 11, marginLeft: "auto" }}>{list.length}</span>
                          </div>
                          {list.length === 0 ? <p className="muted" style={{ fontSize: 11.5, fontStyle: "italic" }}>—</p> : list.map((l) => (
                            <div key={l.id} data-testid={`lead-${l.id}`} style={{ background: "var(--glass-soft)", borderRadius: 10, padding: "9px 10px", marginBottom: 8, border: `1px solid ${STAGE_META[s].color}33` }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                                <span style={{ fontSize: 13, color: "var(--txt)", fontWeight: 600 }}>{l.name}</span>
                                <button onClick={() => delLead(l)} data-testid={`lead-del-${l.id}`} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><Trash2 size={12} /></button>
                              </div>
                              {l.value > 0 && <p className="muted" style={{ fontSize: 11, margin: "3px 0" }}>{eur(l.value)}</p>}
                              <select value={s} onChange={(ev) => changeStage(l, ev.target.value)} data-testid={`lead-stage-${l.id}`}
                                style={{ marginTop: 6, width: "100%", fontSize: 11, padding: "3px 6px", borderRadius: 6, background: "var(--glass-bg)", color: "var(--txt)", border: "1px solid var(--glass-border)" }}>
                                {STAGES.map((st) => <option key={st} value={st}>{STAGE_META[st].label}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          )}

          {/* ══════════ PROJETS ══════════ */}
          {tab === "projets" && (
            <div data-testid="projets-tab">
              {projects.length === 0 ? (
                <div className="glass-card" style={{ textAlign: "center", padding: "40px 20px" }}>
                  <Target size={34} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <p style={{ fontSize: 15, color: "var(--txt)", margin: "0 0 6px" }}>Aucun projet actif</p>
                  <p className="muted" style={{ fontSize: 13, maxWidth: 360, margin: "0 auto 14px" }}>Gérez vos projets et leur temps depuis Mon Bureau.</p>
                  <button onClick={() => navigate("/bureau")} className="zbtn zbtn-primary" data-testid="goto-bureau"><ArrowRight size={14} /> Ouvrir Mon Bureau</button>
                </div>
              ) : (
                <div className="pgrid pgrid-3">
                  {projects.map((p) => (
                    <div key={p.id} className="glass-card" data-testid={`project-${p.id}`}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color || GOLD }} />
                        <h3 style={{ fontSize: 15, margin: 0, color: "var(--txt)" }}>{p.name}</h3>
                      </div>
                      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{Math.round((p.total_time_seconds || 0) / 3600 * 10) / 10}h suivies{p.is_running ? " · en cours" : ""}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════ DOCUMENTS ══════════ */}
          {tab === "documents" && (
            <div data-testid="documents-tab">
              {docs.length === 0 ? (
                <div className="glass-card" style={{ textAlign: "center", padding: "40px 20px" }}>
                  <FileText size={34} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <p style={{ fontSize: 15, color: "var(--txt)", margin: "0 0 6px" }}>Aucun document</p>
                  <p className="muted" style={{ fontSize: 13, maxWidth: 360, margin: "0 auto 14px" }}>Générez propositions, contrats et briefs depuis Mon Bureau.</p>
                  <button onClick={() => navigate("/bureau")} className="zbtn zbtn-primary" data-testid="goto-bureau-docs"><ArrowRight size={14} /> Ouvrir Mon Bureau</button>
                </div>
              ) : (
                <div className="glass-card">
                  {docs.map((d, i) => (
                    <div key={d.id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < docs.length - 1 ? "1px solid var(--glass-border)" : "none" }} data-testid={`doc-${i}`}>
                      <FileText size={18} style={{ color: GOLD, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13.5, color: "var(--txt)" }}>{d.title || d.name || d.filename || "Document"}</span>
                      {d.created_at && <span className="muted" style={{ fontSize: 11 }}>{new Date(d.created_at).toLocaleDateString("fr-FR")}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════ DAF IA ══════════ */}
          {tab === "dafia" && (
            <div data-testid="dafia-tab">
              <div className="pgrid pgrid-2" style={{ marginBottom: 16 }}>
                <div className="glass-card">
                  <div className="card-label" style={{ color: GOLD }}><Euro size={14} /> Synthèse financière du mois</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }}>
                    {[
                      { k: "Chiffre d'affaires", v: eur(fin.ca), d: fin.ca_delta },
                      { k: "Dépenses", v: eur(fin.depenses), d: fin.depenses_delta, inv: true },
                      { k: "Résultat net", v: eur(fin.net), d: fin.net_delta },
                      { k: "Marge", v: `${fin.marge ?? 0} %`, d: fin.marge_delta },
                    ].map((r) => (
                      <div key={r.k}>
                        <p className="muted" style={{ fontSize: 12, margin: 0 }}>{r.k}</p>
                        <p style={{ fontSize: 24, fontWeight: 300, color: "var(--txt)", margin: "2px 0" }}>{r.v}</p>
                        <Delta value={r.d} invert={r.inv} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="glass-card" style={{ borderLeft: `3px solid ${PLUM}` }}>
                  <div className="card-label" style={{ color: PLUM }}><BarChart3 size={14} /> Votre DAF IA</div>
                  <p style={{ fontSize: 14, color: "var(--txt)", margin: "10px 0", lineHeight: 1.5 }}>Le pilotage financier complet (prévisions, trésorerie, catégories, import CSV/banque) vit dans le module Pilotage.</p>
                  <button onClick={() => navigate("/pilotage")} className="zbtn zbtn-primary" data-testid="goto-pilotage"><ArrowRight size={14} /> Ouvrir le Pilotage financier</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {quick && <QuickCreate type={quick} onClose={() => setQuick(null)} onDone={load} />}
    </motion.div>
  );
}
