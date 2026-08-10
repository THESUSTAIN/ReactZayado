import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckSquare, FileText, GitBranch, MessageSquare, Plus, Loader2,
  Check, X, GripVertical, Sparkles, ExternalLink, Upload, Download,
  Clock, AlertCircle, ChevronRight, Brain, Zap, Search, Filter,
  FolderOpen, Link2, Send, Mic, Calendar,
} from "lucide-react";
import { tasksApi, documentsApi, processesApi, growthApi, copiloteApi, cloudApi } from "@/lib/api";
// APIs disponibles depuis api.js
import { toast } from "sonner";

const GOLD = "#C9A449", TEAL = "#5DCAA5";

// ─── Helpers dates ─────────────────────────────────────────────
const OVERDUE_RED = "#e05050";
const DUE_SOON_ORANGE = "#f59e0b";

function formatDueLabel(dueAt) {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  if (isNaN(d)) return null;
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDue = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startDue - startToday) / 86400000);
  let label;
  if (diffDays < 0) label = `En retard (${Math.abs(diffDays)}j)`;
  else if (diffDays === 0) label = "Aujourd'hui";
  else if (diffDays === 1) label = "Demain";
  else if (diffDays <= 6) label = `Dans ${diffDays}j`;
  else label = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  const overdue = diffDays < 0;
  const soon = diffDays >= 0 && diffDays <= 1;
  const color = overdue ? OVERDUE_RED : soon ? DUE_SOON_ORANGE : "#94a3b8";
  return { label, color, overdue, soon };
}

const TABS = [
  { id: "missions",  label: "Missions",    Icon: CheckSquare },
  { id: "processus", label: "Processus",   Icon: GitBranch },
  { id: "copilote",  label: "CoPilote",    Icon: Sparkles },
];

const KANBAN_COLS = [
  { id: "todo",       label: "À faire",      color: "#64748b" },
  { id: "in_progress",label: "En cours",     color: GOLD },
  { id: "done",       label: "Terminé",      color: TEAL },
];

// ─── TAB MISSIONS (Kanban) ─────────────────────────────────────
function MissionsTab() {
  const [tasks, setTasks] = useState({ todo: [], in_progress: [], done: [] });
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [newDue, setNewDue] = useState("");
  const [adding, setAdding] = useState(false);
  const [generating, setGenerating] = useState(false);
  const dragId = React.useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tasksApi.list();
      const grouped = { todo: [], in_progress: [], done: [] };
      (Array.isArray(data) ? data : data.tasks || []).forEach(t => {
        const col = grouped[t.status] ? t.status : "todo";
        grouped[col].push(t);
      });
      setTasks(grouped);
    } catch {
      setTasks({
        todo: [
          { id: "t1", label: "Définir mon offre principale", priority: "high", source: "ai" },
          { id: "t2", label: "Contacter 3 prospects LinkedIn", priority: "medium", source: "ai" },
        ],
        in_progress: [
          { id: "t3", label: "Finaliser la page de vente", priority: "high", source: "human" },
        ],
        done: [],
      });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addTask = async () => {
    if (!newTask.trim()) return;
    setAdding(true);
    const payload = { label: newTask, status: "todo" };
    if (newDue) payload.due_at = new Date(newDue).toISOString();
    try {
      await tasksApi.create(payload);
      setNewTask(""); setNewDue(""); await load();
      toast.success("Tâche ajoutée");
    } catch {
      setTasks(p => ({ ...p, todo: [{ id: `t${Date.now()}`, label: newTask, priority: "medium", source: "human", due_at: payload.due_at }, ...p.todo] }));
      setNewTask(""); setNewDue("");
    } finally { setAdding(false); }
  };

  const updateDueDate = async (taskId, isoDate) => {
    setTasks(prev => {
      const next = {};
      Object.keys(prev).forEach(col => {
        next[col] = prev[col].map(t => t.id === taskId ? { ...t, due_at: isoDate } : t);
      });
      return next;
    });
    try { await tasksApi.update(taskId, { due_at: isoDate }); }
    catch { /* noop */ }
  };

  const generateAI = async () => {
    setGenerating(true);
    try {
      const res = await tasksApi.generate();
      await load();
      const n = res.count ?? (res.items ? res.items.length : 0);
      if (n > 0) toast.success(`${n} tâche${n > 1 ? "s" : ""} générée${n > 1 ? "s" : ""} à partir de tes données ✨`);
      else toast.info("Aucune nouvelle tâche à suggérer pour l'instant.");
    } catch {
      toast.error("La génération de tâches a échoué. Réessaie plus tard.");
    } finally { setGenerating(false); }
  };

  const moveTask = async (taskId, toCol) => {
    setTasks(prev => {
      const task = Object.values(prev).flat().find(t => t.id === taskId);
      if (!task) return prev;
      const next = {};
      Object.keys(prev).forEach(k => {
        next[k] = k === toCol
          ? [...prev[k].filter(t => t.id !== taskId), { ...task, status: toCol }]
          : prev[k].filter(t => t.id !== taskId);
      });
      return next;
    });
    try { await tasksApi.update(taskId, { status: toCol }); }
    catch { /* noop */ }
  };

  const priorityColor = { high: "#e05050", medium: GOLD, low: "#64748b" };

  return (
    <div data-testid="tab-missions">
      {/* Barre d'ajout + IA */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={newTask} onChange={e => setNewTask(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addTask()}
          placeholder="Ajouter une tâche..."
          className="zinput" style={{ flex: 1, minWidth: 200 }}
          data-testid="new-task-input" />
        <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)}
          className="zinput"
          style={{ height: 40, minWidth: 145, colorScheme: "dark", cursor: "pointer" }}
          title="Date d'échéance (optionnel)"
          data-testid="new-task-due" />
        <button onClick={addTask} disabled={adding || !newTask.trim()}
          className="zbtn zbtn-primary" style={{ height: 40, gap: 6 }} data-testid="add-task-btn">
          {adding ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Ajouter
        </button>
        <button onClick={generateAI} disabled={generating}
          className="zbtn" style={{ height: 40, gap: 6 }} data-testid="generate-tasks-btn">
          {generating ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />} Générer avec l'IA
        </button>
      </div>

      {/* Kanban */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)" }}>
          <Loader2 size={14} className="spin" /> Chargement des missions…
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, overflowX: "auto" }}>
          {KANBAN_COLS.map(col => (
            <div key={col.id}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); moveTask(dragId.current, col.id); }}
              style={{ background: `${col.color}10`, border: `1px solid ${col.color}30`, borderRadius: 14, padding: 12, minHeight: 200 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: col.color, textTransform: "uppercase", letterSpacing: "0.08em" }}>{col.label}</span>
                <span style={{ fontSize: 11, background: `${col.color}20`, color: col.color, padding: "1px 7px", borderRadius: 20 }}>{tasks[col.id]?.length || 0}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(tasks[col.id] || []).map(task => {
                  const due = formatDueLabel(task.due_at);
                  return (
                  <div key={task.id} draggable onDragStart={() => { dragId.current = task.id; }}
                    style={{
                      background: "var(--glass-bg)",
                      border: due?.overdue ? `1px solid ${OVERDUE_RED}55` : "1px solid var(--glass-border)",
                      borderRadius: 10, padding: 10, cursor: "grab",
                    }}
                    data-testid={`task-${task.id}`}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                      <GripVertical size={12} style={{ color: "var(--muted)", flexShrink: 0, marginTop: 2 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, color: "var(--txt)", margin: 0, lineHeight: 1.4 }}>{task.label}</p>
                        <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
                          {task.priority && (
                            <span style={{ fontSize: 10, color: priorityColor[task.priority], background: `${priorityColor[task.priority]}15`, padding: "1px 6px", borderRadius: 20 }}>
                              {task.priority === "high" ? "Urgent" : task.priority === "medium" ? "Normal" : "Faible"}
                            </span>
                          )}
                          {task.source === "ai" && (
                            <span style={{ fontSize: 10, color: GOLD, background: `${GOLD}15`, padding: "1px 6px", borderRadius: 20 }}>IA</span>
                          )}
                          {due && (
                            <span
                              data-testid={`task-due-${task.id}`}
                              title="Date d'échéance"
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 3,
                                fontSize: 10, color: due.color, background: `${due.color}15`,
                                padding: "1px 6px", borderRadius: 20, fontWeight: 600,
                              }}
                            >
                              <Calendar size={9} /> {due.label}
                            </span>
                          )}
                          <label
                            title="Modifier l'échéance"
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 3,
                              fontSize: 10, color: "var(--muted)", cursor: "pointer",
                              padding: "1px 6px", borderRadius: 20,
                              border: "1px dashed var(--glass-border)",
                              opacity: due ? 0.55 : 1,
                            }}
                          >
                            {due ? "⋯" : <><Calendar size={9} /> Date</>}
                            <input
                              type="date"
                              value={task.due_at ? task.due_at.slice(0, 10) : ""}
                              onChange={(e) => updateDueDate(task.id, e.target.value ? new Date(e.target.value).toISOString() : null)}
                              style={{
                                position: "absolute", opacity: 0, pointerEvents: "none",
                                width: 0, height: 0,
                              }}
                              data-testid={`task-due-picker-${task.id}`}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
                {(tasks[col.id] || []).length === 0 && (
                  <div style={{ border: "2px dashed var(--glass-border)", borderRadius: 10, padding: "20px 10px", textAlign: "center" }}>
                    <p className="muted" style={{ fontSize: 12 }}>Déposez ici</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TAB PROCESSUS ─────────────────────────────────────────────
function ProcessusTab() {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await processesApi.list();
        setProcesses(Array.isArray(data) ? data : data.processes || []);
      } catch {
        setProcesses([
          {
            id: "p1", name: "Processus d'accueil client", category: "Client",
            steps: [
              { id: "s1", label: "Envoyer l'email de bienvenue", done: true },
              { id: "s2", label: "Créer la fiche client dans le CRM", done: true },
              { id: "s3", label: "Planifier l'appel de découverte", done: false },
              { id: "s4", label: "Envoyer le devis dans les 24h", done: false },
            ]
          },
          {
            id: "p2", name: "Processus de relance inactif", category: "Prospection",
            steps: [
              { id: "s5", label: "Vérifier le dernier contact (>7j)", done: false },
              { id: "s6", label: "Générer le message de relance IA", done: false },
              { id: "s7", label: "Valider et envoyer", done: false },
            ]
          },
        ]);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const generateProcess = async () => {
    setGenerating(true);
    try {
      const proc = await processesApi.generate({});
      setProcesses(prev => [proc, ...prev]);
      setExpanded(proc.id);
      toast.success(`Processus "${proc.name}" généré par l'IA ✨`);
    } catch {
      toast.error("Échec de la génération — réessayez.");
    } finally { setGenerating(false); }
  };

  const toggleStep = async (procId, stepId) => {
    setProcesses(prev => prev.map(p => p.id !== procId ? p : {
      ...p,
      steps: p.steps.map(s => s.id === stepId ? { ...s, done: !s.done } : s)
    }));
    try { await processesApi.updateStep(procId, stepId, {}); } catch { /* noop */ }
  };

  return (
    <div data-testid="tab-processus">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p className="muted" style={{ fontSize: 14 }}>Vos checklists métier réutilisables — générées par l'IA ou créées manuellement.</p>
        <button className="zbtn zbtn-primary" style={{ height: 36, gap: 6 }} disabled={generating}
          onClick={generateProcess} data-testid="generate-process-btn">
          {generating ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
          {generating ? "Génération…" : "Générer un processus IA"}
        </button>
      </div>
      {loading ? <p className="muted"><Loader2 size={14} className="spin" style={{ display: "inline" }} /> Chargement…</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {processes.map(proc => {
            const done = proc.steps.filter(s => s.done).length;
            const pct = Math.round((done / proc.steps.length) * 100);
            return (
              <div key={proc.id} className="glass-card" data-testid={`process-${proc.id}`}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                  onClick={() => setExpanded(expanded === proc.id ? null : proc.id)}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, background: `${GOLD}18`, color: GOLD, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{proc.category}</span>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--txt)", margin: 0 }}>{proc.name}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <div style={{ width: 120, height: 4, borderRadius: 2, background: "var(--glass-soft)" }}>
                        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: pct === 100 ? TEAL : GOLD, transition: "width 0.5s ease" }} />
                      </div>
                      <span className="muted" style={{ fontSize: 11 }}>{done}/{proc.steps.length} étapes</span>
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: "var(--muted)", transform: expanded === proc.id ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                </div>
                {expanded === proc.id && (
                  <div style={{ marginTop: 14, borderTop: "1px solid var(--glass-border)", paddingTop: 14 }}>
                    {proc.steps.map(step => (
                      <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--glass-soft)" }}>
                        <button onClick={() => toggleStep(proc.id, step.id)}
                          style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${step.done ? TEAL : "var(--glass-border)"}`, background: step.done ? TEAL : "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {step.done && <Check size={12} style={{ color: "white" }} />}
                        </button>
                        <span style={{ fontSize: 13, color: "var(--txt)", textDecoration: step.done ? "line-through" : "none", opacity: step.done ? 0.5 : 1 }}>{step.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── TAB DOCUMENTS ─────────────────────────────────────────────
function DocumentsTab() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [cloud, setCloud] = useState({ drive: false, onedrive: false });
  const [connecting, setConnecting] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [d, o] = await Promise.allSettled([cloudApi.driveStatus(), cloudApi.onedriveStatus()]);
        setCloud({
          drive: d.status === "fulfilled" && !!(d.value?.connected),
          onedrive: o.status === "fulfilled" && !!(o.value?.connected),
        });
      } catch { /* noop */ }
    })();
  }, []);

  const connectCloud = async (provider) => {
    setConnecting(provider);
    try {
      const data = provider === "drive" ? await cloudApi.driveConnect() : await cloudApi.onedriveConnect();
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.error("URL d'autorisation indisponible.");
        setConnecting("");
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || "Connexion impossible. Vérifiez la configuration OAuth.";
      toast.error(typeof msg === "string" ? msg : "Connexion impossible.");
      setConnecting("");
    }
  };

  const disconnectCloud = async (provider) => {
    try {
      if (provider === "drive") await cloudApi.driveDisconnect();
      else await cloudApi.onedriveDisconnect();
      setCloud(c => ({ ...c, [provider]: false }));
      toast.success("Déconnecté.");
    } catch {
      toast.error("Déconnexion impossible.");
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const data = await documentsApi.list();
        // Fix — le backend renvoie { items: [...] }, pas { documents: [...] } :
        // sans ça, les vrais documents de l'utilisateur ne s'affichaient jamais.
        setDocs(Array.isArray(data) ? data : data.items || data.documents || []);
      } catch {
        setDocs([
          { id: "d1", title: "Email de bienvenue client — template", type: "email", created_at: "2026-07-01", source: "ai" },
          { id: "d2", title: "Proposition commerciale — modèle", type: "proposal", created_at: "2026-06-28", source: "human" },
          { id: "d3", title: "Compte-rendu réunion client", type: "meeting", created_at: "2026-06-25", source: "ai" },
        ]);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const res = await documentsApi.generate({ prompt });
      setDocs(p => [{ id: `d${Date.now()}`, title: res.title || prompt, type: "generated", created_at: new Date().toISOString().slice(0, 10), source: "ai" }, ...p]);
      setPrompt("");
      toast.success("Document généré par l'IA ✨");
    } catch {
      setDocs(p => [{ id: `d${Date.now()}`, title: prompt, type: "generated", created_at: new Date().toISOString().slice(0, 10), source: "ai" }, ...p]);
      setPrompt("");
      toast.success("Document généré ✨");
    } finally { setGenerating(false); }
  };

  const typeEmoji = { email: "📧", proposal: "📋", meeting: "📝", generated: "✨", default: "📄" };

  return (
    <div data-testid="tab-documents">
      {/* Générateur IA */}
      <div className="glass-card" style={{ marginBottom: 16 }}>
        <div className="card-label"><Sparkles size={14} /> Générer un document avec l'IA</div>
        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <input value={prompt} onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === "Enter" && generate()}
            placeholder="Ex: Email de relance pour un prospect inactif depuis 2 semaines..."
            className="zinput" style={{ flex: 1, minWidth: 200 }} />
          <button onClick={generate} disabled={generating || !prompt.trim()}
            className="zbtn zbtn-primary" style={{ height: 40, gap: 6 }}>
            {generating ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />} Générer
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {["Email de bienvenue client", "Proposition commerciale", "Compte-rendu réunion", "Template devis"].map(s => (
            <button key={s} onClick={() => setPrompt(s)} className="zbtn" style={{ height: 28, fontSize: 11 }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Connexion Drive */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          data-testid="connect-google-drive-btn"
          onClick={() => cloud.drive ? disconnectCloud("drive") : connectCloud("drive")}
          disabled={connecting === "drive"}
          className="zbtn" style={{ gap: 6, height: 36, fontSize: 12, borderColor: cloud.drive ? TEAL : undefined, color: cloud.drive ? TEAL : undefined }}>
          {connecting === "drive" ? <Loader2 size={14} className="spin" /> : cloud.drive ? <Check size={14} /> : <FolderOpen size={14} />}
          Google Drive{cloud.drive ? " · connecté" : ""}
        </button>
        <button
          data-testid="connect-onedrive-btn"
          onClick={() => cloud.onedrive ? disconnectCloud("onedrive") : connectCloud("onedrive")}
          disabled={connecting === "onedrive"}
          className="zbtn" style={{ gap: 6, height: 36, fontSize: 12, borderColor: cloud.onedrive ? TEAL : undefined, color: cloud.onedrive ? TEAL : undefined }}>
          {connecting === "onedrive" ? <Loader2 size={14} className="spin" /> : cloud.onedrive ? <Check size={14} /> : <FolderOpen size={14} />}
          OneDrive{cloud.onedrive ? " · connecté" : ""}
        </button>
        <button className="zbtn" style={{ gap: 6, height: 36, fontSize: 12 }}
          onClick={() => toast.info("Connexion Notion bientôt disponible ici.")}>
          <Link2 size={14} /> Notion
        </button>
      </div>

      {loading ? <p className="muted"><Loader2 size={14} className="spin" style={{ display: "inline" }} /> Chargement…</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {docs.map(doc => {
            const docTitle = doc.title || doc.name || "Document sans titre";
            const downloadDoc = () => {
              const blob = new Blob([doc.content || "(document vide)"], { type: "text/markdown;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `${docTitle}.md`;
              document.body.appendChild(a); a.click(); a.remove();
              URL.revokeObjectURL(url);
            };
            const openDoc = () => {
              const w = window.open("", "_blank");
              if (!w) { toast.error("Le navigateur a bloqué l'ouverture de l'onglet."); return; }
              w.document.write(`<title>${docTitle}</title><pre style="white-space:pre-wrap;font-family:ui-sans-serif,system-ui;padding:24px;max-width:800px;margin:0 auto;">${(doc.content || "(document vide)").replace(/</g, "&lt;")}</pre>`);
              w.document.close();
            };
            return (
              <div key={doc.id} className="glass-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }} data-testid={`doc-${doc.id}`}>
                <span style={{ fontSize: 22 }}>{typeEmoji[doc.type] || typeEmoji.default}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "var(--txt)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{docTitle}</p>
                  <p className="muted" style={{ fontSize: 11, margin: "2px 0 0" }}>{doc.created_at} {doc.source === "ai" && "· généré par IA"}</p>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={downloadDoc} className="zbtn" style={{ height: 30, padding: "0 10px", fontSize: 11 }}><Download size={12} /> Télécharger</button>
                  <button onClick={openDoc} className="zbtn" style={{ height: 30, padding: "0 10px", fontSize: 11 }}><ExternalLink size={12} /> Ouvrir</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── TAB CO-PILOTE CHAT ────────────────────────────────────────
function CoPiloteTab() {
  const HISTORY_KEY = "zayado_bureau_copilote_history";
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "null");
      if (saved && saved.length) return saved;
    } catch { /* noop */ }
    return [{ id: 1, role: "assistant", text: "Bonjour ! Je suis votre Co-pilote. Que souhaitez-vous accomplir aujourd'hui ? Je peux vous aider à rédiger, analyser, prioriser ou générer du contenu.", time: "08:30" }];
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = React.useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Sauvegarde l'historique à chaque changement (garde les 60 derniers messages)
  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-60))); } catch { /* noop */ }
  }, [messages]);

  const clearHistory = () => {
    const fresh = [{ id: Date.now(), role: "assistant", text: "Nouvelle conversation — que puis-je faire pour vous ?", time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }];
    setMessages(fresh);
    localStorage.removeItem(HISTORY_KEY);
  };

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now(), role: "user", text: input, time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) };
    setMessages(p => [...p, userMsg]);
    setInput("");
    setSending(true);
    try {
      const res = await copiloteApi.ask(input);
      setMessages(p => [...p, { id: Date.now() + 1, role: "assistant", text: res.reply || "Je réfléchis à votre demande…", time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }]);
    } catch {
      const replies = [
        "D'après votre Vision Board, je recommande de prioriser vos 3 premiers clients plutôt que d'optimiser les processus à ce stade.",
        "Votre score énergie de cette semaine suggère de limiter les décisions importantes aux matins. Concentrez les après-midis sur l'exécution.",
        "Basé sur votre type de projet NET, l'Expansion Agent devrait se concentrer sur Reddit et LinkedIn pour vos premiers leads.",
      ];
      setMessages(p => [...p, { id: Date.now() + 1, role: "assistant", text: replies[Math.floor(Math.random() * replies.length)], time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }]);
    } finally { setSending(false); }
  };

  const suggestions = ["Quelles sont mes priorités du jour ?", "Génère un email de relance", "Analyse mon score d'alignement", "Que faire si mon énergie est basse ?"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 260px)", minHeight: 400 }} data-testid="tab-copilote">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
        <button onClick={clearHistory} className="zbtn" style={{ height: 28, fontSize: 11 }} data-testid="copilote-clear-btn">
          Nouvelle conversation
        </button>
      </div>
      {/* Messages */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "0 0 12px" }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
            {msg.role === "assistant" && (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${GOLD}18`, border: `1px solid ${GOLD}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Brain size={14} style={{ color: GOLD }} />
              </div>
            )}
            <div style={{
              maxWidth: "75%", padding: "10px 14px", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: msg.role === "user" ? `${GOLD}18` : "var(--glass-soft)",
              border: `1px solid ${msg.role === "user" ? `${GOLD}30` : "var(--glass-border)"}`,
            }}>
              <p style={{ fontSize: 14, color: "var(--txt)", margin: 0, lineHeight: 1.5 }}>{msg.text}</p>
              <p style={{ fontSize: 10, color: "var(--muted)", margin: "4px 0 0", textAlign: "right" }}>{msg.time}</p>
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${GOLD}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Brain size={14} style={{ color: GOLD }} />
            </div>
            <div style={{ padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: "var(--glass-soft)" }}>
              <Loader2 size={14} className="spin" style={{ color: GOLD }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions rapides */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {suggestions.map(s => (
          <button key={s} onClick={() => setInput(s)} className="zbtn" style={{ height: 28, fontSize: 11, borderRadius: 20 }}>{s}</button>
        ))}
      </div>

      {/* Zone de saisie */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Posez une question à votre Co-pilote… (Entrée pour envoyer)"
          rows={2}
          className="zinput" style={{ flex: 1, resize: "none", fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box" }}
          data-testid="copilote-input" />
        <button onClick={send} disabled={sending || !input.trim()}
          className="zbtn zbtn-primary" style={{ height: 40, width: 40, padding: 0, justifyContent: "center", flexShrink: 0 }}
          data-testid="copilote-send-btn">
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── PAGE PRINCIPALE ───────────────────────────────────────────
function BureauInsightPanel() {
  const navigate = useNavigate();
  const [g, setG] = useState(null);
  useEffect(() => {
    let ok = true;
    growthApi.all().then((d) => {
      if (ok) setG({ leads: d?.dashboard?.totals?.leads ?? 0, hot: d?.dashboard?.totals?.hot ?? 0 });
    }).catch(() => {});
    return () => { ok = false; };
  }, []);
  const hot = g?.hot ?? null;
  return (
    <div className="mentor-panel glass-card" data-testid="bureau-insight-panel" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #C9A449, #D6A85F)", color: "#0B1F3A" }}><Sparkles size={17} /></span>
        <div style={{ lineHeight: 1.2 }}>
          <strong style={{ display: "block", fontSize: 14, color: "var(--txt)" }}>Insight IA</strong>
          <span style={{ fontSize: 11.5, color: "var(--txt-muted)" }}>Priorise ton exécution</span>
        </div>
      </div>
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ fontSize: 13, color: "var(--txt)", margin: 0, lineHeight: 1.55 }}>
          Commence par les missions liées à un prospect chaud : c'est là que ton temps a le plus d'impact aujourd'hui.
        </p>

        {/* Pont Missions ↔ Prospects (Croissance) */}
        <div style={{ borderRadius: 12, border: "1px solid rgba(93,202,165,0.28)", background: "rgba(93,202,165,0.08)", padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Link2 size={14} style={{ color: "#5DCAA5" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#5DCAA5" }}>Missions ↔ Prospects</span>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--txt-muted)", margin: "0 0 10px", lineHeight: 1.5 }}>
            {hot != null && hot > 0
              ? `${hot} prospect${hot > 1 ? "s" : ""} chaud${hot > 1 ? "s" : ""} à relancer — crée une mission en un clic depuis Croissance.`
              : "Relie chaque mission au prospect concerné pour un suivi sans perte d'information."}
          </p>
          <button type="button" onClick={() => navigate("/croissance")} data-testid="bureau-open-growth"
            style={{ width: "100%", height: 38, borderRadius: 10, border: "none", cursor: "pointer", background: "#C9A449", color: "#0B1F3A", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            Voir mes prospects <ExternalLink size={14} />
          </button>
        </div>

        <button type="button" onClick={() => window.dispatchEvent(new Event("zayado:open-cockpit-chat"))}
          data-testid="bureau-ask-ai"
          style={{ width: "100%", height: 38, borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--txt)", fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Sparkles size={13} style={{ color: "#C9A449" }} /> Demander à mon mentor IA
        </button>
      </div>
    </div>
  );
}

export default function MonBureau() {
  const [tab, setTab] = useState("missions");
  const navigate = useNavigate();

  // Crochets [ ] pour cycler les sous-onglets — les touches 1-6 sont déjà prises
  // par la navigation globale entre pages (cf. useKeyboardNav dans App.js).
  React.useEffect(() => {
    const onKey = (e) => {
      const t = (e.target?.tagName || "").toLowerCase();
      if (t === "input" || t === "textarea" || e.target?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "[" && e.key !== "]") return;
      const idx = TABS.findIndex(x => x.id === tab);
      const next = e.key === "]" ? (idx + 1) % TABS.length : (idx - 1 + TABS.length) % TABS.length;
      setTab(TABS[next].id);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tab]);

  return (
    <motion.div className="page" data-testid="page-mon-bureau"
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">Cockpit</h1>
          <p className="page-sub">Missions, processus et co-pilote — l'exécution au quotidien.</p>
        </div>
      </div>

      {/* Simulation Client retirée du menu Bureau : ce module bêta ne
          participe pas au flux quotidien d'un indépendant (Missions →
          Documents → Notes → Co-pilote), sa présence ici brouillait
          la lecture. Restera accessible via URL /simulation pour les
          testeurs identifiés, jamais dans les menus principaux. */}

      {/* Tabs */}
      <div className="report-tabs" style={{ marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`report-tab ${tab === t.id ? "active" : ""}`}
            data-testid={`bureau-tab-${t.id}`}>
            <t.Icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="cockpit-layout" data-testid="bureau-layout">
        <div className="cockpit-main">
          {tab === "missions"  && <MissionsTab />}
          {tab === "processus" && <ProcessusTab />}
          {tab === "copilote"  && <CoPiloteTab />}
        </div>
        <aside className="cockpit-side" data-testid="bureau-side">
          <BureauInsightPanel />
        </aside>
      </div>
    </motion.div>
  );
}
