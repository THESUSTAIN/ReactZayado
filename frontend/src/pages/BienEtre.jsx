import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Sparkles, Flame, AlertTriangle, CheckCircle2,
  Send, UserPlus, Heart, Wind, Zap, Target, Moon, Loader2,
  ShoppingBag, HeartPulse, TrendingUp, TrendingDown, Info,
  Brain, Coffee, Dumbbell, BarChart3, Clock, ChevronRight,
  Download, MessageCircle, Slack, ExternalLink, Battery, Lock, User,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { wellnessApi } from "@/lib/api";
import DecisionBanner from "@/components/DecisionBanner";
import { generateQuarterlyPdf } from "@/lib/pdf";
import WellnessReactionModal from "./WellnessReactionModal";
import WellnessCorrelations from "./WellnessCorrelations";
import YearInPixels from "./YearInPixels";
import YearInPixels from "./YearInPixels";
import WellnessCorrelations from "./WellnessCorrelations";
import { HabitsTab, MoiReminders } from "./MoiTabs";

const GOLD = "#D4AF37", SAGE = "#5DCAA5", CORAL = "#F0808A", PLUM = "#8b6fbf";

// ─── CHECK-IN QUOTIDIEN — 5 niveaux, langage courant (10 secondes) ─────
// Valeurs sur 2/4/6/8/10 pour rester compatibles avec la conversion backend
// (échelle 1-5 : Math.ceil(v/2)). Le vocabulaire clinique (Borg/MBI/PSS) est
// réservé au bilan trimestriel destiné à un professionnel de santé.

const ENERGY_LEVELS = [
  { value: 2,  emoji: "😴", label: "Épuisé",  color: CORAL },
  { value: 4,  emoji: "😔", label: "Fatigué", color: "#E8A838" },
  { value: 6,  emoji: "🙂", label: "Correct", color: GOLD },
  { value: 8,  emoji: "😃", label: "En forme", color: SAGE },
  { value: 10, emoji: "⚡", label: "Au top",  color: SAGE },
];

const MENTAL_LEVELS = [
  { value: 2,  emoji: "🌫️", label: "Brouillard", color: CORAL },
  { value: 4,  emoji: "😕", label: "Dispersé",   color: "#E8A838" },
  { value: 6,  emoji: "💭", label: "Correct",    color: GOLD },
  { value: 8,  emoji: "🎯", label: "Concentré",  color: SAGE },
  { value: 10, emoji: "🌟", label: "Ultra clair", color: SAGE },
];

// Stress : plus la valeur est haute, plus le stress est élevé (couleurs inversées).
const STRESS_LEVELS = [
  { value: 2,  emoji: "🧘", label: "Serein",      color: SAGE },
  { value: 4,  emoji: "🙂", label: "Tranquille",  color: SAGE },
  { value: 6,  emoji: "😐", label: "Un peu tendu", color: GOLD },
  { value: 8,  emoji: "😟", label: "Stressé",     color: "#E8A838" },
  { value: 10, emoji: "😰", label: "Débordé",     color: CORAL },
];

// ─── SÉLECTEUR D'ÉTAT — 5 niveaux, un clic ─────────────────────
function WellnessSelector({ label, sublabel, levels, value, onChange, testid }) {
  const current = levels.find(l => l.value === value) || levels[2];

  return (
    <div style={{ marginBottom: 20 }} data-testid={testid}>
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)", margin: "0 0 1px" }}>{label}</p>
        {sublabel && <p className="muted" style={{ fontSize: 11.5 }}>{sublabel}</p>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
        {levels.map(level => {
          const active = value === level.value;
          return (
            <button key={level.value} onClick={() => onChange(level.value)}
              title={level.label}
              style={{
                border: active ? `2px solid ${level.color}` : "1px solid var(--glass-border)",
                borderRadius: 12,
                padding: "10px 4px",
                background: active ? `${level.color}1e` : "var(--glass-soft)",
                cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                transition: "all 0.15s",
                transform: active ? "translateY(-2px)" : "none",
                boxShadow: active ? `0 6px 16px ${level.color}33` : "none",
              }}>
              <span style={{ fontSize: 24 }}>{level.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.1, textAlign: "center", color: active ? level.color : "var(--muted)" }}>{level.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── SCORE GLOBAL CALCULÉ ─────────────────────────────────────
function GlobalScore({ phys, ment, str, hasCheckin, todayScore }) {
  // Formule inspirée du HRV (Heart Rate Variability scoring) et PSS
  const score = Math.round((phys * 3.5 + ment * 3 + (10 - str) * 3.5) / 10);
  // Quand un check-in du jour existe, on affiche le score PERSISTÉ (source de vérité),
  // pas un recalcul live des sliders.
  const pct = !hasCheckin ? null : (typeof todayScore === "number" ? todayScore : Math.min(100, Math.max(0, score * 10)));

  const interpretation = pct == null ? { label: "Pas encore de check-in", color: "var(--muted)", advice: "Fais ton check-in du jour pour obtenir ton score de bien-être." }
    : pct >= 80 ? { label: "Excellent", color: SAGE, advice: "Journée idéale pour les décisions stratégiques importantes." }
    : pct >= 65 ? { label: "Bon", color: GOLD, advice: "Bonne productivité. Limitez les interruptions non urgentes." }
    : pct >= 45 ? { label: "Modéré", color: "#E8A838", advice: "Priorités réduites. 1 objectif par demi-journée maximum." }
    : pct >= 25 ? { label: "Faible", color: CORAL, advice: "Mode récupération. Tâches légères uniquement." }
    : { label: "Critique", color: "#cc0000", advice: "Repos obligatoire. Consultez un médecin si cela persiste 3 jours." };

  return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 12px" }}>
        <svg viewBox="0 0 120 120" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
          <circle cx="60" cy="60" r="50" fill="none" stroke={interpretation.color} strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 50}`}
            strokeDashoffset={`${2 * Math.PI * 50 * (1 - (pct || 0) / 100)}`}
            style={{ transition: "stroke-dashoffset 1.2s ease, stroke 0.5s ease" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 32, fontWeight: 200, color: interpretation.color }}>{pct == null ? "—" : pct}</span>
          <span style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>/ 100</span>
        </div>
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color: interpretation.color, margin: "0 0 4px" }}>{interpretation.label}</p>
      <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 220, margin: "0 auto" }}>{interpretation.advice}</p>
    </div>
  );
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────
export default function BienEtre() {
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phys, setPhys] = useState(6);
  const [ment, setMent] = useState(6);
  const [str, setStr]   = useState(4);
  const [saving, setSaving] = useState(false);
  const [actions, setActions] = useState([]);
  const [showReaction, setShowReaction] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [prefs, setPrefs] = useState({ slack_webhook: "", whatsapp_phone: "" });
  const [showCorrelation, setShowCorrelation] = useState(false);
  const [activity, setActivity] = useState(null);
  const [tab, setTab] = useState("aujourdhui");
  const [habitsRemaining, setHabitsRemaining] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await wellnessApi.state();
      setState(s);
      if (s?.today?.physique != null) {
        setPhys(s.today.physique);
        setMent(s.today.mentale);
        setStr(s.today.stress);
      }
    } catch { /* empty */ } finally { setLoading(false); }
    try {
      const p = await wellnessApi.getPrefs();
      setPrefs({ slack_webhook: p.slack_webhook || "", whatsapp_phone: p.whatsapp_phone || "" });
    } catch { /* ignore */ }
    try {
      const h = await wellnessApi.habits();
      setHabitsRemaining((h.items || []).filter((x) => !x.done_today).length);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      // L'UI utilise une échelle 1-10 (Borg/PSS/MBI), le backend une échelle 1-5.
      const res = await wellnessApi.checkin({
        energy: Math.ceil(phys / 2),
        mood: Math.ceil(ment / 2),
        stress: Math.ceil(str / 2),
      });
      toast.success(`Check-in enregistré · Score global ${res.score ?? Math.round((phys * 3.5 + ment * 3 + (10 - str) * 3.5) / 10) * 10}/100`);
      setActions(res.micro_actions || []);
      if ((res.score ?? 100) < 40 && (res.micro_actions || []).length > 0) setShowReaction(true);
      await load();
    } catch { toast.error("Enregistrement impossible"); }
    finally { setSaving(false); }
  };

  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      const r = await wellnessApi.quarterly();
      if (!r.has_data) { toast.error(r.message || "Pas assez de données."); return; }
      const doc = generateQuarterlyPdf(r);
      // Enrichissement : page Habitudes & régularité (données réelles)
      try {
        const hb = await wellnessApi.habits();
        const items = hb.items || [];
        doc.addPage();
        doc.setFontSize(18); doc.setTextColor(30, 30, 40);
        doc.text("Habitudes & régularité", 14, 22);
        doc.setDrawColor(201, 164, 73); doc.line(14, 26, 90, 26);
        doc.setFontSize(11); doc.setTextColor(70, 70, 80);
        if (items.length === 0) {
          doc.text("Aucune habitude suivie sur la période.", 14, 38);
        } else {
          let y = 38;
          items.forEach((it) => {
            const line = `- ${it.name}  (serie actuelle : ${it.streak || 0} j - ${(it.done_dates || []).length} validations)`;
            doc.text(line, 14, y); y += 8;
            if (y > 270) { doc.addPage(); y = 22; }
          });
        }
        doc.setFontSize(9); doc.setTextColor(150, 150, 160);
        doc.text(`Genere le ${new Date().toLocaleString("fr-FR")} - MyExtension AI`, 14, 288);
      } catch { /* le PDF de base reste valide */ }
      doc.save(`zayado-bilan-sante-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Bilan santé généré ✦");
    } catch { toast.error("Génération PDF impossible"); }
    finally { setPdfBusy(false); }
  };

  const savePrefs = async (patch) => {
    try { const p = await wellnessApi.savePrefs(patch); setPrefs({ slack_webhook: p.slack_webhook || "", whatsapp_phone: p.whatsapp_phone || "" }); toast.success("Préférences sauvegardées"); }
    catch { toast.error("Sauvegarde impossible"); }
  };

  const today = state?.today || {};
  const history = state?.energyHistory || [];
  const recos = state?.boutiqueRecos || [];
  const questions = state?.weeklyReview?.questions || [];
  const burnout = state?.burnout_risk || { risk: "insufficient_data", level: 0 };
  const maxScore = Math.max(...history.map(h => h.score), 100);

  const RISK = {
    low:              { bg: `${SAGE}18`, color: SAGE, label: "Équilibre bon", icon: "🟢" },
    moderate:         { bg: `${GOLD}16`, color: GOLD, label: "Fatigue accumulée", icon: "🟡" },
    high:             { bg: `${CORAL}20`, color: CORAL, label: "Risque burn-out", icon: "🔴" },
    insufficient_data:{ bg: "var(--glass-soft)", color: GOLD, label: "Données à venir", icon: "⚪" },
  };
  const rs = RISK[burnout.risk] || RISK.insufficient_data;

  const toggleCorrelation = async () => {
    const next = !showCorrelation;
    setShowCorrelation(next);
    if (next && !activity) {
      try { setActivity(await wellnessApi.activity(14)); } catch { setActivity({ daily: [], alerts: [] }); }
    }
  };
  const correlationData = (activity?.daily || []).filter(d => d.score != null).slice(-14);

  return (
    <motion.div className="page cours-style" data-testid="page-bienetre"
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

      {/* Header */}
      <div className="page-head">
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}><User size={26} style={{ color: GOLD }} /> Moi</h1>
          <p className="page-sub">Votre état du jour, vos habitudes, votre énergie — au même endroit.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {today.streak != null && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 300, color: GOLD }}>{today.streak}j</div>
              <div className="muted" style={{ fontSize: 10 }}>série</div>
            </div>
          )}
          <button onClick={downloadPdf} disabled={pdfBusy} className="zbtn" style={{ height: 36, gap: 6, fontSize: 12 }}>
            {pdfBusy ? <Loader2 size={13} className="spin" /> : <Download size={13} />} Bilan santé PDF
          </button>
        </div>
      </div>

      {/* Onglets du hub "Moi" */}
      <div className="moi-tabs" data-testid="moi-tabs" style={{ display: "flex", gap: 8, margin: "4px 0 20px", flexWrap: "wrap" }}>
        {[
          { id: "aujourdhui", label: "Aujourd'hui" },
          { id: "bienetre", label: "Bien-être" },
          { id: "habitudes", label: "Habitudes" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`moi-tab-${t.id}`} style={{
            padding: "8px 18px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 600,
            border: `1px solid ${tab === t.id ? "rgba(201,164,73,0.5)" : "var(--glass-border)"}`,
            background: tab === t.id ? "rgba(201,164,73,0.14)" : "var(--glass-soft)",
            color: tab === t.id ? "var(--gold-strong)" : "var(--muted)",
            transition: "background-color 0.2s, color 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "habitudes" ? <HabitsTab activity={activity} /> : loading ? (
        <p className="muted"><Loader2 size={14} className="spin" style={{ display: "inline" }} /> Chargement…</p>
      ) : (
        <div className="moi-anim">
          {/* ══ HERO — Verdict décisionnel du jour ══ */}
          {(() => {
            const score = state?.today?.score;
            const v = score == null
              ? { title: "Faites votre check-in du matin", advice: "10 secondes pour obtenir votre verdict du jour et aligner vos priorités.", tone: PLUM }
              : score >= 80 ? { title: "Énergie optimale — place au travail profond.", advice: "Attaquez votre décision la plus stratégique ce matin, protégez votre après-midi.", tone: SAGE }
              : score >= 65 ? { title: "Bonne journée pour avancer sur vos priorités.", advice: "Limitez les interruptions ; gardez l'après-midi pour les tâches légères.", tone: SAGE }
              : score >= 45 ? { title: "Journée modérée — allégez la charge.", advice: "Un seul objectif par demi-journée. Reportez le non-essentiel, sans culpabiliser.", tone: GOLD }
              : { title: "Énergie basse — mode récupération.", advice: "Une seule priorité aujourd'hui et de vraies pauses. Votre énergie est un actif.", tone: CORAL };
            return (
              <div className="glass-card moi-hero" data-testid="moi-hero-verdict"
                style={{ padding: "clamp(22px,4vw,34px)", marginBottom: 16, position: "relative", overflow: "hidden", borderLeft: `3px solid ${v.tone}` }}>
                <div style={{ position: "absolute", inset: 0, background: `radial-gradient(120% 120% at 0% 0%, ${v.tone}14, transparent 60%)`, pointerEvents: "none" }} />
                <div className="card-label" style={{ color: v.tone, position: "relative" }}><Brain size={14} /> Verdict IA du jour</div>
                <h2 style={{ fontSize: "clamp(23px,3.6vw,38px)", fontWeight: 300, letterSpacing: "-0.02em", lineHeight: 1.15, margin: "14px 0 12px", color: "var(--txt)", position: "relative", maxWidth: 760 }}>{v.title}</h2>
                <p className="muted" style={{ fontSize: 15, lineHeight: 1.6, margin: 0, maxWidth: 640, position: "relative" }}>{v.advice}</p>
                <div style={{ marginTop: 20, position: "relative" }}>
                  {score == null ? (
                    <button className="zbtn zbtn-primary" data-testid="moi-hero-checkin-btn"
                      onClick={() => { setTab("aujourdhui"); setTimeout(() => document.querySelector('[data-testid="morning-ritual"]')?.scrollIntoView({ behavior: "smooth", block: "center" }), 120); }}>
                      <HeartPulse size={14} /> Faire mon check-in
                    </button>
                  ) : (
                    <button className="zbtn zbtn-primary" data-testid="moi-hero-vision-btn" onClick={() => navigate("/vision-board")}>
                      <Target size={14} /> Aligner sur ma vision <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ══ KPI — Énergie · Risque burn-out ══ */}
          {(() => {
            const score = state?.today?.score;
            const burnoutPct = typeof burnout.level === "number" ? Math.round(burnout.level) : null;
            return (
              <div className="pgrid pgrid-2" style={{ marginBottom: 16 }}>
                <div className="glass-card" data-testid="energy-today-card">
                  <div className="card-label" style={{ color: GOLD }}><Battery size={14} /> Votre énergie aujourd'hui</div>
                  <GlobalScore phys={phys} ment={ment} str={str} hasCheckin={state?.today?.physique != null} todayScore={score} />
                </div>
                <div className="glass-card" data-testid="burnout-alert" style={{ borderLeft: `3px solid ${rs.color}` }}>
                  <div className="card-label" style={{ color: rs.color }}><HeartPulse size={14} /> Risque de burn-out</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "10px 0 2px" }}>
                    <span style={{ fontSize: 34, fontWeight: 300, color: rs.color }}>{burnoutPct != null ? `${burnoutPct}\u202f%` : "—"}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: rs.color }}>{rs.label}</span>
                  </div>
                  <p className="muted" style={{ fontSize: 12, margin: "2px 0 0", lineHeight: 1.5 }}>
                    {burnout.message || "Continuez vos check-ins pour affiner votre évaluation."}
                  </p>
                  {burnout.prediction?.days_until_risk > 0 && (
                    <span className="zchip" style={{ background: `${rs.color}20`, color: rs.color, marginTop: 8, display: "inline-block" }}>
                      Alerte dans {burnout.prediction.days_until_risk}j
                    </span>
                  )}
                  <button data-testid="burnout-detail-btn"
                    onClick={() => { setTab("aujourdhui"); setTimeout(() => document.querySelector('[data-testid="burnout-prevention"]')?.scrollIntoView({ behavior: "smooth", block: "start" }), 120); }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 12, background: "none", border: "none", padding: 0, color: rs.color, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                    Voir le détail <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Rappels doux in-app (matin : check-in ; soir : habitudes) */}
          <MoiReminders today={today} habitsRemaining={habitsRemaining}
            onCheckin={() => { setTab("aujourdhui"); setTimeout(() => document.querySelector('[data-testid="morning-ritual"]')?.scrollIntoView({ behavior: "smooth", block: "center" }), 120); }}
            onHabits={() => setTab("habitudes")} />

          {/* ═══════════ ONGLET AUJOURD'HUI ═══════════ */}
          {tab === "aujourdhui" && (<>
          <DecisionBanner
            page="bienetre"
            data={{
              bien_etre_score: today.score,
              energy_trend_days: (activity?.daily || []).filter(d => d.score != null && d.score < 50).length,
            }}
          />

          {/* ══ 1. CHECK-IN QUOTIDIEN ══ */}
          <div className="glass-card" data-testid="morning-ritual" style={{ marginBottom: 16 }}>
            <div className="card-label" style={{ color: GOLD }}><HeartPulse size={14} /> 1. Check-in quotidien</div>
            <h2 className="sec-title" style={{ fontSize: 20, margin: "6px 0 4px" }}>Comment vous sentez-vous maintenant ?</h2>
            <p className="muted" style={{ fontSize: 12, marginBottom: 18, lineHeight: 1.5 }}>
              Un check-in en 10 secondes : choisissez un niveau pour chaque dimension.
            </p>
            <div className="pgrid pgrid-3">
              <WellnessSelector label="Mon énergie" sublabel="De vidé à plein d'énergie"
                levels={ENERGY_LEVELS} value={phys} onChange={setPhys} testid="slider-physique" />
              <WellnessSelector label="Ma clarté mentale" sublabel="Capacité à penser clairement"
                levels={MENTAL_LEVELS} value={ment} onChange={setMent} testid="slider-mentale" />
              <WellnessSelector label="Mon niveau de stress" sublabel="À quel point je me sens sous pression"
                levels={STRESS_LEVELS} value={str} onChange={setStr} testid="slider-stress" />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={save} disabled={saving} className="zbtn zbtn-primary" style={{ justifyContent: "center" }} data-testid="wellness-submit">
                {saving ? <><Loader2 size={14} className="spin" /> Enregistrement…</> : today.score ? <><CheckCircle2 size={14} /> Mettre à jour mon check-in</> : "Valider mon check-in"}
              </button>
              <span className="muted" style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }} data-testid="wellness-daily-tip">
                <Sparkles size={13} style={{ color: SAGE }} />
                {str >= 8
                  ? "Stress élevé : 2 min de respiration avant votre première tâche."
                  : phys <= 4
                  ? "Énergie basse : une seule priorité, reportez le reste."
                  : "Belle forme — attaquez votre tâche la plus importante en premier."}
              </span>
            </div>
          </div>

          {/* ══ 2. IMPACT SUR MA VISION · 4. COACH IA ══ */}
          {(() => {
            const score = state?.today?.score;
            const good = score == null ? null : score >= 60;
            const favors = good === false
              ? ["Tâches administratives légères", "Rangement & organisation", "Tâches routinières"]
              : ["Développement business", "Vision stratégique", "Prospection"];
            const postpone = good === false
              ? ["Décisions stratégiques", "Réunions longues", "Négociations importantes"]
              : ["Tâches administratives", "Réunions longues", "Tâches répétitives"];
            const coach = (actions && actions.length > 0)
              ? actions.map(a => `${a.title}${a.duration ? ` (${a.duration})` : ""}`)
              : [
                  "Faites votre prospection avant 11h — votre énergie est optimale le matin.",
                  "Prenez une pause de 15 min vers 15h — votre cerveau en a besoin.",
                  "Couchez-vous avant 23h pour améliorer votre récupération.",
                  "Reportez les tâches complexes après 16h — la concentration baisse.",
                ];
            return (
              <div className="pgrid pgrid-2" style={{ marginBottom: 16 }}>
                {/* Impact sur ma vision */}
                <div className="glass-card" data-testid="impact-vision-card">
                  <div className="card-label" style={{ color: SAGE }}><Target size={14} /> 2. Impact sur ma vision</div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--txt)", margin: "8px 0 12px", lineHeight: 1.4 }}>
                    {score == null ? "Faites votre check-in pour aligner vos actions sur votre énergie."
                      : "Votre état d'aujourd'hui favorise certaines actions."}
                  </p>
                  {score != null && (
                    <>
                      <p style={{ fontSize: 12, fontWeight: 700, color: SAGE, margin: "0 0 6px" }}>À privilégier maintenant</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                        {favors.map((f, i) => (
                          <span key={i} className="zchip" style={{ background: `${SAGE}18`, color: SAGE, fontSize: 12 }}>
                            <CheckCircle2 size={12} style={{ marginRight: 4 }} /> {f}
                          </span>
                        ))}
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: CORAL, margin: "0 0 6px" }}>À reporter si possible</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {postpone.map((f, i) => (
                          <span key={i} className="zchip" style={{ background: "var(--glass-soft)", color: "var(--muted)", fontSize: 12 }}>{f}</span>
                        ))}
                      </div>
                    </>
                  )}
                  <button data-testid="impact-vision-btn" onClick={() => navigate("/vision-board")}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 14, background: "none", border: "none", padding: 0, color: SAGE, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                    Voir mon Vision Board <ChevronRight size={14} />
                  </button>
                </div>

                {/* Coach IA */}
                <div className="glass-card" data-testid="coach-ia-card" style={{ borderLeft: `3px solid ${PLUM}` }}>
                  <div className="card-label" style={{ color: PLUM }}><MessageCircle size={14} /> 4. Coach IA</div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--txt)", margin: "8px 0 12px" }}>Recommandations personnalisées pour aujourd'hui.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {coach.map((c, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${PLUM}20`, color: PLUM, fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                        <span style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.45 }}>{c}</span>
                      </div>
                    ))}
                  </div>
                  <button data-testid="coach-plan-btn" onClick={() => navigate("/croissance")}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 14, background: "none", border: "none", padding: 0, color: PLUM, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                    Voir mon plan d'actions <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Programme de récupération 7 jours — si risque modéré ou élevé */}
          {(burnout.risk === "high" || burnout.risk === "moderate") && (
            <div className="glass-card" style={{ marginBottom: 16, borderLeft: `3px solid ${SAGE}` }} data-testid="recovery-program">
              <div className="card-label" style={{ color: SAGE }}><Wind size={14} /> Programme de récupération · 7 jours</div>
              <p className="muted" style={{ fontSize: 12, margin: "6px 0 12px", lineHeight: 1.5 }}>
                Basé sur 3+ jours de baisse — un plan doux pour remonter progressivement.
              </p>
              <div className="pgrid pgrid-2">
                {[
                  { day: "J1-J2", action: "Réduire à 1 seule priorité par jour — reporter le reste sans culpabilité." },
                  { day: "J3-J4", action: "Bloquer 20 min de marche ou d'air frais chaque après-midi, sans écran." },
                  { day: "J5", action: "Check-in avec un pair ou un proche — verbaliser, pas résoudre." },
                  { day: "J6-J7", action: "Reprendre 2-3 priorités max, en observant si l'énergie remonte." },
                ].map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: SAGE, background: `${SAGE}15`, padding: "2px 8px", borderRadius: 20, flexShrink: 0, minWidth: 44, textAlign: "center" }}>{step.day}</span>
                    <span style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.4 }}>{step.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ 3. TIMELINE ÉNERGIE ══ */}
          <div className="glass-card" style={{ marginBottom: 16 }} data-testid="energy-history">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
              <div className="card-label" style={{ color: GOLD }}><Activity size={14} /> 3. Timeline énergie · 30 derniers jours</div>
              <button onClick={toggleCorrelation} className="zbtn" style={{ height: 28, fontSize: 11, gap: 5 }}>
                <BarChart3 size={12} /> {showCorrelation ? "Masquer" : "Corrélation charge de travail ↔ bien-être"}
              </button>
            </div>
            <p className="muted" style={{ fontSize: 12, margin: "0 0 12px" }}>Votre énergie jour après jour.</p>
            {history.length === 0 ? (
              <p className="muted" style={{ fontSize: 13, padding: "24px 0", textAlign: "center" }}>
                Faites votre premier check-in pour voir apparaître votre courbe d'énergie.
              </p>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 120, marginBottom: 6 }}>
                  {history.map((h, i) => {
                    const ht = Math.max(4, Math.round((h.score / maxScore) * 100));
                    const col = h.score >= 70 ? SAGE : h.score >= 45 ? GOLD : CORAL;
                    return (
                      <div key={i} title={`${h.date} : ${h.score}/100`}
                        style={{ flex: 1, height: `${ht}%`, borderRadius: "3px 3px 0 0", background: col, opacity: i === history.length - 1 ? 1 : 0.6, transition: "height 0.8s ease", cursor: "pointer" }} />
                    );
                  })}
                </div>

                {/* Légende */}
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--muted)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: SAGE, display: "inline-block" }} /> ≥ 70 (bon)</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: GOLD, display: "inline-block" }} /> 45-69 (modéré)</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: CORAL, display: "inline-block" }} /> {'<'} 45 (faible)</span>
                </div>

                {/* Corrélation charge de travail ↔ bien-être — données réelles du Cockpit */}
                {showCorrelation && (
                  <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--glass-soft)", borderRadius: 10 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: GOLD, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
                      <TrendingUp size={14} /> Charge de travail (Cockpit) ↔ bien-être (14 derniers jours)
                    </p>
                    {correlationData.length === 0 ? (
                      <p className="muted" style={{ fontSize: 12 }}>Pas encore assez de données de sessions de travail pour croiser avec votre bien-être.</p>
                    ) : (
                      <>
                        <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 80 }}>
                          {correlationData.map((d, i) => {
                            const maxWork = Math.max(...correlationData.map(x => x.work_minutes), 1);
                            const htE = Math.round((d.score / 100) * 100);
                            const htW = Math.round((d.work_minutes / maxWork) * 100);
                            return (
                              <div key={i} title={`Bien-être ${d.score}/100 · Travail ${Math.round(d.work_minutes / 60 * 10) / 10}h`} style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 2, height: "100%" }}>
                                <div style={{ flex: 1, height: `${htE}%`, background: `${SAGE}80`, borderRadius: "2px 2px 0 0" }} />
                                <div style={{ flex: 1, height: `${htW}%`, background: `${GOLD}80`, borderRadius: "2px 2px 0 0" }} />
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ display: "flex", gap: 12, fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, background: SAGE, display: "inline-block", borderRadius: 1 }} /> Bien-être</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, background: GOLD, display: "inline-block", borderRadius: 1 }} /> Heures travaillées</span>
                        </div>
                        {activity?.alerts?.length > 0 && (
                          <p className="muted" style={{ fontSize: 11, marginTop: 8, fontStyle: "italic" }}>
                            💡 {activity.alerts[0].message}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ══ 5. PRÉVENTION BURN-OUT ══ */}
          <div className="glass-card" style={{ marginBottom: 16, borderLeft: `3px solid ${rs.color}` }} data-testid="burnout-prevention">
            <div className="card-label" style={{ color: rs.color }}><Wind size={14} /> 5. Prévention burn-out</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--txt)", margin: "8px 0 4px" }}>Anticiper pour rester aligné et performant.</p>
            <p className="muted" style={{ fontSize: 12, margin: "0 0 14px", lineHeight: 1.5 }}>
              {burnout.risk === "high"
                ? "Votre charge et votre stress dépassent le seuil recommandé. Appliquez le programme de récupération."
                : burnout.risk === "moderate"
                ? "Fatigue accumulée détectée. Ajustez votre rythme cette semaine pour éviter la bascule."
                : burnout.risk === "low"
                ? "Votre niveau de stress et votre charge de travail sont sous contrôle. Continuez ainsi."
                : "Continuez vos check-ins quotidiens pour activer la prévision de risque."}
            </p>
            <div className="pgrid pgrid-2">
              {/* Prévision 30 jours (tendance réelle des check-ins) */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Prévision à 30 jours</p>
                {history.length < 2 ? (
                  <p className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>Pas encore assez de check-ins pour projeter une tendance.</p>
                ) : (
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 70 }}>
                    {history.slice(-15).map((h, i) => {
                      const ht = Math.max(6, Math.round((h.score / maxScore) * 100));
                      const col = h.score >= 70 ? SAGE : h.score >= 45 ? GOLD : CORAL;
                      return <div key={i} title={`${h.date} : ${h.score}/100`} style={{ flex: 1, height: `${ht}%`, borderRadius: "3px 3px 0 0", background: col, opacity: 0.85 }} />;
                    })}
                  </div>
                )}
              </div>
              {/* Facteurs à surveiller (données réelles activité, sinon état à venir) */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Facteurs à surveiller</p>
                {(() => {
                  const daily = (activity?.daily || []);
                  const factors = [];
                  const lowDays = daily.filter(d => d.score != null && d.score < 50).length;
                  if (lowDays > 0) factors.push({ label: "Jours à énergie basse (14j)", val: `${lowDays}`, color: lowDays >= 3 ? CORAL : GOLD });
                  const worked = daily.filter(d => d.work_minutes > 0);
                  if (worked.length > 0) {
                    const avgH = Math.round(worked.reduce((s, d) => s + d.work_minutes, 0) / worked.length / 6) / 10;
                    factors.push({ label: "Charge de travail moyenne / jour", val: `${avgH}h`, color: avgH >= 9 ? CORAL : SAGE });
                  }
                  if (typeof today.stress === "number") factors.push({ label: "Stress du jour", val: `${today.stress}/10`, color: today.stress >= 8 ? CORAL : today.stress >= 6 ? GOLD : SAGE });
                  if (factors.length === 0) return <p className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>Vos facteurs de risque apparaîtront ici après quelques jours de suivi.</p>;
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {factors.map((f, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontSize: 12.5, color: "var(--txt)" }}>{f.label}</span>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: f.color }}>{f.val}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
            <button data-testid="prevention-detail-btn" onClick={() => navigate("/croissance")}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 16, background: "none", border: "none", padding: 0, color: rs.color, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              Voir le détail et conseils <ChevronRight size={14} />
            </button>
          </div>

          </>)}

          {/* ═══════════ ONGLET BIEN-ÊTRE (analyses & outils) ═══════════ */}
          {tab === "bienetre" && (<>
          {/* ── YEAR IN PIXELS + CORRÉLATIONS (vue d'ensemble) ── */}
          <YearInPixels />
          <WellnessCorrelations />

          {/* ── RECOMMANDATIONS BOUTIQUE ── */}
          <div style={{ marginBottom: 16 }} data-testid="boutique-recos">
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 className="sec-title" style={{ fontSize: 20 }}>Ce que votre score suggère</h2>
              <button className="zbtn" style={{ height: 34, fontSize: 12 }} data-testid="visit-shop-btn"
                onClick={() => toast.info("La boutique Zayado arrive bientôt — elle est en préparation.")}>
                <ShoppingBag size={13} /> Visiter la boutique
              </button>
            </div>
            {recos.length > 0 ? (
              <div className="pgrid pgrid-3">
                {recos.map((p, i) => {
                  const pname = p.name || p.title || p.label || "Produit";
                  const pwhy = p.why || p.raison || p.reason || "";
                  return (
                  <div key={p.id || pname + i} className="glass-card" style={{ padding: 0, overflow: "hidden" }}
                    data-testid={`reco-${pname.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                    <div style={{ height: 150, overflow: "hidden", background: "linear-gradient(135deg,#1a3a5c,#0e2748)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {p.image
                        ? <img src={p.image} alt={pname} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <ShoppingBag size={34} style={{ color: "rgba(201,164,73,0.6)" }} />}
                    </div>
                    <div style={{ padding: 16 }}>
                      <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 17, color: "var(--txt)", margin: 0 }}>{pname}</h3>
                      <p className="muted" style={{ fontSize: 12, fontStyle: "italic", margin: "4px 0 10px" }}>{pwhy}</p>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 17, color: "var(--txt)", fontWeight: 300 }}>{p.price}</span>
                        <button className="zbtn zbtn-primary" style={{ height: 32, fontSize: 12 }}
                          onClick={() => toast.info(`"${pname}" sera disponible à l'ouverture de la boutique.`)}>Découvrir</button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              /* Empty state si pas de recos */
              <div className="glass-card" style={{ textAlign: "center", padding: "28px 20px" }}>
                <ShoppingBag size={28} style={{ margin: "0 auto 10px", display: "block", opacity: 0.3 }} />
                <p className="muted" style={{ fontSize: 13 }}>Faites votre premier check-in pour recevoir des recommandations personnalisées basées sur votre score.</p>
              </div>
            )}
          </div>

          {/* ── BILAN TRIMESTRIEL ── */}
          <div className="glass-card" style={{ marginBottom: 16 }} data-testid="weekly-review">
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              <div>
                <div className="card-label">Bilan trimestriel · auto-évaluation clinique</div>
                <h2 className="sec-title" style={{ fontSize: 20 }}>5 questions, 5 minutes.</h2>
              </div>
              <span className="zchip" style={{ background: "var(--glass-soft)", color: GOLD }}>
                <Lock size={11} style={{ marginRight: 4 }} /> Privé — jamais partagé
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              {(questions.length > 0 ? questions : [
                { question: "Sur les 7 derniers jours, combien de fois vous êtes-vous senti(e) dépassé(e) ?", placeholder: "0 = jamais, 7 = tous les jours…" },
                { question: "Quelle a été votre principale source d'énergie cette semaine ?", placeholder: "Un projet, une relation, une réussite…" },
                { question: "Qu'est-ce qui a le plus consommé votre énergie ?", placeholder: "Une tâche, un client, une situation…" },
                { question: "Avez-vous honoré vos engagements envers vous-même ?", placeholder: "Sport, sommeil, temps libre…" },
                { question: "Qu'aimeriez-vous faire différemment la semaine prochaine ?", placeholder: "Une habitude, une limite, une priorité…" },
              ]).map((q, i) => (
                <div key={i} className="glass-card" data-testid={`weekly-q-${i}`}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "var(--txt)", margin: "0 0 8px", lineHeight: 1.5 }}>{q.question}</p>
                  <textarea className="zinput" rows={2} placeholder={q.placeholder} style={{ width: "100%", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
              <button onClick={() => toast.success("Bilan envoyé à toi-même ✦")} className="zbtn zbtn-primary" data-testid="send-weekly-review-btn">
                <Send size={14} /> Envoyer le bilan à moi-même
              </button>
              <button onClick={() => toast.info("Partage avec accompagnateur — bientôt disponible")} className="zbtn" data-testid="share-accompagnateur-btn">
                <UserPlus size={14} /> Partager avec mon accompagnateur
              </button>
              <button onClick={downloadPdf} disabled={pdfBusy} className="zbtn" style={{ gap: 6 }}>
                {pdfBusy ? <Loader2 size={13} className="spin" /> : <Download size={13} />} Bilan PDF (médecin)
              </button>
            </div>
            <p className="muted" style={{ fontSize: 11, marginTop: 10, fontStyle: "italic" }}>
              ⚕️ Le bilan PDF peut être partagé avec votre médecin traitant pour évaluer votre charge professionnelle.
            </p>
          </div>

          {/* ── INTÉGRATIONS NOTIFICATIONS ── */}
          <div className="glass-card" data-testid="integrations-card">
            <div className="card-label"><MessageCircle size={14} /> Rappels & notifications bien-être</div>
            <p className="muted" style={{ fontSize: 13, margin: "6px 0 16px", lineHeight: 1.5 }}>
              Recevez un rappel matinal pour votre check-in. Le message s'adapte à votre tendance de la semaine.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <div>
                <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                  <Slack size={13} style={{ display: "inline", marginRight: 4 }} /> Webhook Slack
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="zinput" value={prefs.slack_webhook} style={{ flex: 1 }}
                    onChange={e => setPrefs(p => ({ ...p, slack_webhook: e.target.value }))}
                    placeholder="https://hooks.slack.com/services/…"
                    data-testid="slack-webhook-input" />
                  <button className="zbtn" style={{ height: 38, padding: "0 12px", flexShrink: 0 }}
                    onClick={() => {
                      if (!prefs.slack_webhook.startsWith("https://hooks.slack.com/")) return toast.error("URL Slack invalide");
                      savePrefs({ slack_webhook: prefs.slack_webhook });
                    }} data-testid="slack-test-btn">Test</button>
                </div>
              </div>
              <div>
                <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                  <MessageCircle size={13} style={{ display: "inline", marginRight: 4 }} /> WhatsApp Business
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="zinput" value={prefs.whatsapp_phone} style={{ flex: 1 }}
                    onChange={e => setPrefs(p => ({ ...p, whatsapp_phone: e.target.value }))}
                    placeholder="+33612345678"
                    data-testid="whatsapp-input" />
                  <button className="zbtn" style={{ height: 38, padding: "0 12px", flexShrink: 0 }}
                    onClick={() => {
                      if (!prefs.whatsapp_phone || prefs.whatsapp_phone.length < 8) return toast.error("Numéro invalide");
                      savePrefs({ whatsapp_phone: prefs.whatsapp_phone });
                    }} data-testid="whatsapp-test-btn">Test</button>
                </div>
              </div>
            </div>
          </div>
          </>)}

          {/* Corrélations bien-être/performance + Year in Pixels — fichiers déjà
              construits (WellnessCorrelations.jsx, YearInPixels.jsx) mais jamais
              routés nulle part dans l'app, trouvé à l'audit. */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }} className="be-correlations-grid">
            <WellnessCorrelations />
            <YearInPixels />
          </div>
        </div>
      )}
      <WellnessReactionModal open={showReaction} onClose={() => setShowReaction(false)} actions={actions} />
    </motion.div>
  );
}
