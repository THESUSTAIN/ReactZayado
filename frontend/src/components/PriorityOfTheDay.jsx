import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Zap, Check, RefreshCw, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { tasksApi, onboardingApi } from "@/lib/api";
import { toast } from "sonner";

/**
 * Priorité du jour — widget Dashboard
 *
 * Sélectionne 1 tâche prioritaire pour aujourd'hui :
 *  - En priorité : les tâches "urgent" en retard ou dues aujourd'hui.
 *  - Fallback : la tâche urgente la plus ancienne non terminée.
 *  - Fallback ultime : la 1ère tâche "todo".
 *
 * L'utilisateur peut :
 *  - la cocher (=> marque comme done, une nouvelle est choisie).
 *  - la remplacer par la suivante (bouton "Autre").
 *  - ouvrir Mon Bureau pour choisir manuellement.
 */
export default function PriorityOfTheDay({ tasksProp }) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState(tasksProp || null);
  const [loading, setLoading] = useState(!tasksProp);
  const [skipIndex, setSkipIndex] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (tasksProp) { setTasks(tasksProp); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await tasksApi.list();
        let list = Array.isArray(r) ? r : (r.items || r.tasks || []);
        const open = list.filter((t) => !(t.done || t.status === "done"));
        // Aucun (0) tâche ouverte + onboarding terminé → l'IA génère les 3 priorités.
        if (open.length === 0) {
          let onboarded = false;
          try {
            const ob = await onboardingApi.get();
            onboarded = !!(ob?.onboarding_done || ob?.completed);
          } catch { /* ignore */ }
          if (onboarded && !cancelled) {
            setGenerating(true);
            try {
              await tasksApi.generate();
              const r2 = await tasksApi.list();
              list = Array.isArray(r2) ? r2 : (r2.items || r2.tasks || []);
            } catch { /* garde l'état vide propre */ }
            finally { if (!cancelled) setGenerating(false); }
          }
        }
        if (!cancelled) setTasks(list);
      } catch {
        if (!cancelled) setTasks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tasksProp]);

  const candidates = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const rank = (t) => {
      if (t.done || t.status === "done") return -1;
      let score = 0;
      const due = t.due_at ? new Date(t.due_at) : null;
      if (due && !isNaN(due)) {
        const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
        const diffDays = Math.round((startDue - today) / 86400000);
        if (diffDays < 0) score += 1000 + Math.abs(diffDays); // en retard
        else if (diffDays === 0) score += 800;                // aujourd'hui
        else if (diffDays <= 3) score += 500 - diffDays * 30; // bientôt
        else score += 200;
      }
      if (t.priority === "high" || t.priority === "urgent") score += 300;
      else if (t.priority === "medium" || t.priority === "normal") score += 100;
      if (t.in_progress || t.status === "in_progress") score += 50;
      return score;
    };
    return tasks
      .filter((t) => rank(t) > 0)
      .map((t) => ({ t, s: rank(t) }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.t);
  }, [tasks]);

  const complete = async (t) => {
    if (!t) return;
    setCompleting(true);
    try {
      await tasksApi.update(t.id, { done: true, status: "done" });
      setTasks((prev) => (prev || []).map((x) => (x.id === t.id ? { ...x, done: true, status: "done" } : x)));
      toast.success("Bravo ! Priorité validée. 🎯");
      setSkipIndex(0);
    } catch {
      toast.error("Impossible de valider — réessaie.");
    } finally {
      setCompleting(false);
    }
  };

  const reporter = async () => {
    const t = top3[0];
    if (!t) { toast("Aucune priorité à reporter."); return; }
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    try {
      await tasksApi.update(t.id, { due_at: tomorrow.toISOString() });
      setTasks((prev) => (prev || []).map((x) => (x.id === t.id ? { ...x, due_at: tomorrow.toISOString() } : x)));
      toast.success("Priorité reportée à demain.");
    } catch { toast.error("Impossible de reporter."); }
  };

  const confierIA = async () => {
    setGenerating(true);
    try {
      // Régénération : on retire les priorités IA ouvertes puis on en génère 3 nouvelles.
      const openAi = (tasks || []).filter((t) => !(t.done || t.status === "done") && (t.source === "ai" || !t.source));
      await Promise.all(openAi.map((t) => tasksApi.remove(t.id).catch(() => {})));
      await tasksApi.generate();
      const r = await tasksApi.list();
      const list = Array.isArray(r) ? r : (r.items || r.tasks || []);
      setTasks(list);
      setSkipIndex(0);
      toast.success("L'IA a préparé 3 nouvelles priorités. 🤖");
    } catch {
      toast.error("Régénération impossible — réessaie.");
    } finally {
      setGenerating(false);
    }
  };

  const dueLabel = (task) => {
    if (!task.due_at) return null;
    const d = new Date(task.due_at);
    if (isNaN(d)) return null;
    const now = new Date();
    const st = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((sd - st) / 86400000);
    if (diff < 0) return { text: `Retard ${Math.abs(diff)}j`, color: "#e05050" };
    if (diff === 0) return { text: "Aujourd'hui", color: "#f59e0b" };
    if (diff === 1) return { text: "Demain", color: "#f59e0b" };
    if (diff <= 6) return { text: `${diff}j`, color: "#94a3b8" };
    return { text: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }), color: "#94a3b8" };
  };

  const top3 = candidates.slice(0, 3);

  const PRIO = {
    high:   { label: "Priorité haute",   color: "#e05050" },
    urgent: { label: "Priorité haute",   color: "#e05050" },
    medium: { label: "Priorité moyenne", color: "#f59e0b" },
    normal: { label: "Priorité normale", color: "#94a3b8" },
  };

  if (loading) return null;

  return (
    <motion.div
      data-testid="priority-of-the-day"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="glass-card"
      style={{ padding: 20, border: "1px solid rgba(201,164,73,0.35)",
        background: "linear-gradient(135deg, rgba(201,164,73,0.08), rgba(30,58,138,0.14))" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={16} style={{ color: "#C9A449" }} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--txt)", margin: 0 }}>Vos priorités du jour</h3>
        </div>
        <span data-testid="priority-ratio" className="zchip" style={{
          fontSize: 11, fontWeight: 700, color: "#C9A449",
          background: "rgba(201,164,73,0.15)", padding: "3px 9px", whiteSpace: "nowrap",
        }}>70% humain · 30% IA</span>
      </div>

      {top3.length === 0 ? (
        generating ? (
          <p data-testid="priority-generating-line" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--txt-muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
            <Loader2 size={14} className="spin" /> L'IA prépare vos 3 priorités du jour…
          </p>
        ) : (
          <p data-testid="priority-empty-line" style={{ fontSize: 13, color: "var(--txt-muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
            Aucune priorité en attente. L'IA en proposera automatiquement dès que votre profil
            (onboarding &amp; paramètres) sera complété.
          </p>
        )
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {top3.map((t, i) => {
            const dl = dueLabel(t);
            const p = PRIO[t.priority] || PRIO.normal;
            const dur = t.duration_min ? `${t.duration_min} min` : null;
            return (
              <div key={t.id || i} data-testid={`priority-item-${i}`} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(201,164,73,0.16)" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#C9A449" }}>{i + 1}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--txt)", lineHeight: 1.35 }}>{t.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: p.color }}>{p.label}</span>
                    {dur && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>· {dur}</span>}
                    {dl && <span style={{ fontSize: 11, fontWeight: 600, color: dl.color }}>· {dl.text}</span>}
                  </div>
                </div>
                <button data-testid={`priority-done-${i}`} onClick={() => complete(t)} disabled={completing}
                  title="Marquer comme fait" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--glass-soft)", color: "#5DCAA5", cursor: "pointer", flexShrink: 0 }}>
                  <Check size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button data-testid="priority-start-day" onClick={() => navigate("/bureau")} style={{
          display: "inline-flex", alignItems: "center", gap: 6, height: 40, padding: "0 18px", borderRadius: 999,
          border: "none", background: "#0B1F3A", color: "#F6F2EA", fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}>
          <ArrowRight size={14} /> Commencer ma journée
        </button>
        <button data-testid="priority-reporter" onClick={reporter} style={{
          display: "inline-flex", alignItems: "center", gap: 6, height: 40, padding: "0 16px", borderRadius: 999,
          border: "1px solid var(--glass-border)", background: "var(--glass-soft)", color: "var(--txt)", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>
          <RefreshCw size={13} /> Reporter
        </button>
        <button data-testid="priority-confier-ia" onClick={confierIA} disabled={generating} style={{
          display: "inline-flex", alignItems: "center", gap: 6, height: 40, padding: "0 16px", borderRadius: 999,
          border: "1px solid rgba(201,164,73,0.4)", background: "rgba(201,164,73,0.12)", color: "var(--gold-strong)", fontSize: 13, fontWeight: 600, cursor: generating ? "wait" : "pointer", opacity: generating ? 0.7 : 1,
        }}>
          {generating ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />} {generating ? "Régénération…" : "Confier à l'IA"}
        </button>
      </div>
    </motion.div>
  );
}

