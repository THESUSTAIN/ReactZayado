import React from "react";
import {
  ArrowRight, Calendar, Lightbulb, AlertTriangle, TrendingUp, Sparkles, Quote,
  Bot, CheckCircle2, Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const GOLD = "#C9A449";
const SAGE = "#8fa876";
const CORAL = "#d98a6a";
const BLUE = "#4f6fb0";

function clampPct(n) {
  const v = Math.round(Number(n) || 0);
  return Math.max(0, Math.min(100, v));
}

/* ── Anneau de progression (SVG) ──────────────────────────── */
function Ring({ value, color, label, sub }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = clampPct(value);
  const dash = (pct / 100) * c;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
      <div style={{ position: "relative", width: 68, height: 68 }}>
        <svg width="68" height="68" viewBox="0 0 68 68">
          <circle cx="34" cy="34" r={r} fill="none" stroke="var(--glass-border)" strokeWidth="6" />
          <circle
            cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round" strokeDasharray={`${dash} ${c}`}
            transform="rotate(-90 34 34)"
          />
        </svg>
        <span style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 15, fontWeight: 700, color: "var(--txt)",
        }}>{pct}%</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--txt)", lineHeight: 1.2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10.5, color: "var(--txt-muted)" }}>{sub}</div>}
    </div>
  );
}

function SectionHead({ icon: Icon, title, action, onAction }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {Icon && <Icon size={16} color={GOLD} />}
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--txt)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</h3>
      </div>
      {action && (
        <button type="button" onClick={onAction} data-testid="section-head-action" style={{
          display: "inline-flex", alignItems: "center", gap: 4, background: "transparent",
          border: "none", color: "#3b5aa6", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
        }}>{action} <ArrowRight size={13} /></button>
      )}
    </div>
  );
}

/* ── Prochaine séquence de la journée ─────────────────────── */
export function NextSequence({ data }) {
  const navigate = useNavigate();
  const checklist = Array.isArray(data?.ia_checklist) ? data.ia_checklist : [];
  const items = checklist.slice(0, 4).map((it, i) => ({
    time: it.time || ["09:30", "10:30", "14:00", "16:00"][i] || "",
    title: it.title || it.label || it.text || `Étape ${i + 1}`,
    tag: it.priority || (i % 3 === 0 ? "Priorité haute" : i % 3 === 1 ? "Priorité moyenne" : "Préparation"),
  }));
  const tagColor = (t) => t.includes("haute") ? CORAL : t.includes("moyenne") ? GOLD : BLUE;
  return (
    <div className="glass-card" data-testid="cockpit-next-sequence" style={{ padding: 20 }}>
      <SectionHead icon={Calendar} title="Prochaine séquence de votre journée" action="Voir mon agenda" onAction={() => navigate("/bureau")} />
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--txt-muted)", margin: 0 }}>Aucune séquence planifiée pour aujourd'hui. Ajoutez vos priorités pour construire votre journée.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }} data-testid={`sequence-item-${i}`}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--txt-muted)", width: 44 }}>{it.time}</span>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "var(--txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999,
                color: tagColor(it.tag), background: `${tagColor(it.tag)}1f`, whiteSpace: "nowrap",
              }}>{it.tag}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Focus compétences cette semaine ──────────────────────── */
export function SkillsFocus({ data }) {
  const navigate = useNavigate();
  const caProgress = data?.ca_objective > 0 ? (Number(data.ca_month) / Number(data.ca_objective)) * 100 : 0;
  const missions = data?.missions || {};
  const orga = missions.total > 0 ? (missions.done / missions.total) * 100 : 0;
  const prospects = data?.prospects_total > 0 ? (Number(data.prospects_active) / Number(data.prospects_total)) * 100 : 0;
  const skills = Array.isArray(data?.skills) && data.skills.length
    ? data.skills
    : [
        { label: "Stratégie", value: data?.vision?.alignment_percent || 0, color: SAGE },
        { label: "Relation client", value: prospects, color: GOLD },
        { label: "Gestion financière", value: caProgress, color: BLUE },
        { label: "Organisation", value: orga, color: SAGE },
      ];
  return (
    <div className="glass-card" data-testid="cockpit-skills-focus" style={{ padding: 20 }}>
      <SectionHead icon={Sparkles} title="Focus compétences cette semaine" action="Voir tout" onAction={() => navigate("/pilotage")} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {skills.slice(0, 4).map((s, i) => (
          <Ring key={i} value={s.value} color={s.color || GOLD} label={s.label} sub="En progrès" />
        ))}
      </div>
    </div>
  );
}

/* ── Insights clés pour vous ───────────────────────────────────────────
 * Avant correction : 3 cartes 100% codées en dur ("Augmenter vos tarifs de
 * 15%...", "Délai moyen de paiement en hausse (+4 jours)"...), affichées à
 * tous les utilisateurs quel que soit leur état réel — le composant ne
 * recevait même pas `data` en prop. Maintenant : consomme `data.insights`,
 * calculé côté backend (dashboard.py::_compute_dashboard) à partir de
 * règles simples sur les métriques réelles (CA vs objectif, prospects,
 * bien-être, tâches). Aucune valeur inventée : si le backend n'a rien de
 * significatif à signaler, la liste est vide et l'état vide honnête
 * s'affiche (même logique que NightRecap ci-dessus). */
const INSIGHT_STYLE = {
  opportunite: { label: "Opportunité", color: SAGE, icon: TrendingUp },
  attention: { label: "Attention", color: CORAL, icon: AlertTriangle },
  idee: { label: "Idée du jour", color: GOLD, icon: Lightbulb },
};

export function KeyInsights({ data }) {
  const navigate = useNavigate();
  const raw = Array.isArray(data?.insights) ? data.insights : [];
  const insights = raw.map((ins) => ({
    ...INSIGHT_STYLE[ins.kind] || INSIGHT_STYLE.idee,
    label: ins.label || (INSIGHT_STYLE[ins.kind] || INSIGHT_STYLE.idee).label,
    text: ins.text,
    cta: ins.cta || "Voir",
    to: ins.to || "/croissance",
  }));
  return (
    <div className="glass-card" data-testid="cockpit-key-insights" style={{ padding: 20 }}>
      <SectionHead icon={Lightbulb} title="Insights clés pour vous" action="Voir tout" onAction={() => navigate("/croissance")} />
      {insights.length === 0 ? (
        <p data-testid="key-insights-empty" style={{ fontSize: 12.5, color: "var(--txt-muted)", margin: 0, lineHeight: 1.5 }}>
          Rien à signaler pour l'instant. Renseignez votre objectif de CA, vos prospects et
          votre bien-être pour que le Cockpit vous remonte des alertes et opportunités ici.
        </p>
      ) : (
        <div className="cockpit-insights-grid">
          {insights.map((ins, i) => {
            const Icon = ins.icon;
            return (
              <div key={i} data-testid={`insight-card-${i}`} style={{
                padding: 14, borderRadius: 14, background: "var(--glass-soft)",
                border: `1px solid ${ins.color}33`, borderLeft: `3px solid ${ins.color}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Icon size={14} color={ins.color} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: ins.color }}>{ins.label}</span>
                </div>
                <p style={{ fontSize: 12.5, color: "var(--txt)", margin: "0 0 10px", lineHeight: 1.5 }}>{ins.text}</p>
                <button type="button" onClick={() => navigate(ins.to)} style={{
                  background: "transparent", border: "none", color: "#3b5aa6", fontSize: 12,
                  fontWeight: 600, cursor: "pointer", padding: 0,
                }}>{ins.cta} →</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Ce que l'IA a fait pour vous (liste de tâches réelles) ──────────── */
export function NightRecap({ data }) {
  const vg = data?.value_generated || {};
  const activity = Array.isArray(data?.activite_recente) ? data.activite_recente : [];

  // Liste des tâches réellement effectuées par l'IA (aucune donnée inventée).
  let tasks = activity
    .map((a) => ({
      text: a.label || a.title || a.text || a.message || "",
      time: a.time || a.when || a.date || "",
    }))
    .filter((t) => t.text)
    .slice(0, 5);

  if (tasks.length === 0 && vg.has_data) {
    tasks = [];
    if (Number(vg.ai_tasks) > 0) tasks.push({ text: `${vg.ai_tasks} réponse(s) générée(s) par le Co-pilote`, time: "" });
    if (Number(vg.automated_tasks) > 0) tasks.push({ text: `${vg.automated_tasks} tâche(s) automatisée(s)`, time: "" });
    if (Number(vg.time_saved_min) > 0) {
      const m = Number(vg.time_saved_min);
      const label = m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}` : `${m} min`;
      tasks.push({ text: `${label} de temps gagné grâce à l'automatisation`, time: "" });
    }
  }

  return (
    <div className="glass-card" data-testid="cockpit-night-recap" style={{
      padding: 20, border: "1px solid rgba(93,202,165,0.28)",
      background: "linear-gradient(135deg, rgba(93,202,165,0.10), rgba(30,58,138,0.14))",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <Bot size={16} color={SAGE} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--txt)", margin: 0 }}>Ce que l'IA a fait pour vous</h3>
        </div>
        <span data-testid="night-recap-ratio" style={{
          fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
          color: SAGE, background: `${SAGE}1f`, whiteSpace: "nowrap",
        }}>70% humain · 30% IA</span>
      </div>

      {/* Valeur générée par l'IA (chiffres réels) */}
      <div data-testid="night-recap-value" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        {[
          { label: "Temps gagné", val: (Number(vg.time_saved_min) || 0) >= 60 ? `${Math.floor((vg.time_saved_min) / 60)}h${String((vg.time_saved_min) % 60).padStart(2, "0")}` : `${Number(vg.time_saved_min) || 0} min` },
          { label: "Tâches automatisées", val: Number(vg.automated_tasks) || 0 },
          { label: "Réponses IA", val: Number(vg.ai_tasks) || 0 },
        ].map((m, i) => (
          <div key={i} data-testid={`night-value-${i}`} style={{ flex: 1, minWidth: 90, padding: "10px 12px", borderRadius: 12, background: "var(--glass-soft)", border: "1px solid var(--glass-border)" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--txt)" }}>{m.val}</div>
            <div style={{ fontSize: 10.5, color: "var(--txt-muted)" }}>{m.label}</div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11.5, fontWeight: 700, color: "var(--txt-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Tâches effectuées</p>
      {tasks.length === 0 ? (
        <p data-testid="night-recap-empty" style={{ fontSize: 12.5, color: "var(--txt-muted)", margin: 0, lineHeight: 1.5 }}>
          L'IA n'a pas encore agi. Complétez votre profil (onboarding &amp; paramètres) pour activer le
          Co-pilote — ses actions s'afficheront ici (mise à jour de vos données, tâches préparées…).
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tasks.map((t, i) => (
            <div key={i} data-testid={`night-task-${i}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle2 size={16} color={SAGE} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: "var(--txt)", lineHeight: 1.4 }}>{t.text}</span>
              {t.time && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--txt-muted)", whiteSpace: "nowrap" }}>
                  <Clock size={11} /> {t.time}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Bandeau citation ─────────────────────────────────────── */
export function QuoteBar({ data }) {
  const navigate = useNavigate();
  const q = data?.citation_du_jour || {
    text: "La foi, c'est prendre le premier pas, même quand on ne voit pas tout l'escalier.",
    author: "Martin Luther King",
  };
  return (
    <div className="glass-card cockpit-quote-bar" data-testid="cockpit-quote-bar" style={{ padding: "16px 20px", marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <Quote size={20} color={GOLD} style={{ flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: 14, color: "var(--txt)", fontStyle: "italic", lineHeight: 1.4 }}>
          {q.text} <span style={{ color: "var(--txt-muted)", fontStyle: "normal" }}>— {q.author}</span>
        </p>
      </div>
      <button type="button" onClick={() => navigate("/vision-board")} data-testid="cockpit-inspiration-btn" style={{
        display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
        background: "var(--glass-soft)", border: "1px solid var(--glass-border)",
        borderRadius: 999, padding: "8px 16px", color: "var(--txt)", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
      }}>
        <Sparkles size={14} color={GOLD} /> Inspiration du jour →
      </button>
    </div>
  );
}
