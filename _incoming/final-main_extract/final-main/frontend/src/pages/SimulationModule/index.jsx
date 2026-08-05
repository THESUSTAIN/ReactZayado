import React, { useState, useEffect } from "react";
import { Sparkles, Loader2, Send, GraduationCap, Users, History, Download, X } from "lucide-react";
import { toast } from "sonner";
import { simulationApi } from "../../lib/api";

/**
 * Module Simulation — clients virtuels IA adaptatifs à n'importe quel programme
 * (licence, licence pro, bachelor, master, MBA...). Bêta gratuite illimitée
 * (garde-fou anti-abus côté backend : 20 tâches/jour max).
 *
 * Écran 1 : onboarding — l'utilisateur saisit son programme en texte libre.
 * Écran 2 : 3 clients virtuels en colonne, tâche du client sélectionné au centre,
 *           feedback IA + progression à droite.
 */
export default function SimulationModule() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [programme, setProgramme] = useState("");
  const [starting, setStarting] = useState(false);

  const [activeClient, setActiveClient] = useState(null);
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [fetchingTask, setFetchingTask] = useState(false);

  // Historique : jusqu'ici le feedback IA était stocké en base mais jamais
  // ré-affichable — il disparaissait dès qu'on changeait de client ou rechargeait.
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const openHistory = async () => {
    setShowHistory(true);
    if (history) return; // déjà chargé cette session
    setLoadingHistory(true);
    try {
      const h = await simulationApi.history();
      setHistory(h);
    } catch (e) {
      toast.error("Impossible de charger l'historique pour le moment.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const exportHistory = () => {
    if (!history?.items?.length) return;
    const lines = history.items.map((it) => {
      const date = it.submitted_at ? new Date(it.submitted_at).toLocaleString("fr-FR") : "—";
      const fb = it.feedback || {};
      return [
        `Date : ${date}`,
        `Client : ${it.client_name} (${it.client_industry})`,
        `Mission : ${it.task_title}`,
        `Score : ${it.score ?? "—"}/10`,
        `Ma réponse : ${it.response_text}`,
        fb.comments ? `Feedback IA : ${fb.comments}` : null,
        fb.what_went_well?.length ? `Points forts : ${fb.what_went_well.join(" · ")}` : null,
        fb.improvements_needed?.length ? `À améliorer : ${fb.improvements_needed.join(" · ")}` : null,
        fb.learning_point ? `À retenir : ${fb.learning_point}` : null,
        "─".repeat(40),
      ].filter(Boolean).join("\n");
    });
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simulation-client-historique-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Filet de sécurité : si le client actif n'a pas de tâche en attente,
  // on en génère une à la demande (entraînement illimité, jamais de client "vide").
  useEffect(() => {
    if (activeClient && !activeClient.current_task && !fetchingTask) {
      setFetchingTask(true);
      simulationApi.getClientTask(activeClient.id)
        .then((t) => setActiveClient((c) => (c && c.id === activeClient.id ? { ...c, current_task: t } : c)))
        .catch(() => {})
        .finally(() => setFetchingTask(false));
    }
  }, [activeClient, fetchingTask]);

  useEffect(() => {
    simulationApi.state()
      .then((s) => {
        setState(s);
        if (s.started && s.clients?.length) setActiveClient(s.clients.find((c) => c.current_task) || s.clients[0]);
      })
      .catch(() => setState({ started: false }))
      .finally(() => setLoading(false));
  }, []);

  const handleStart = async () => {
    if (programme.trim().length < 3) return toast.error("Décrivez votre programme (ex : Master 2 Marketing Digital).");
    setStarting(true);
    try {
      await simulationApi.start(programme.trim());
      const s = await simulationApi.state();
      setState(s);
      if (s.clients?.length) setActiveClient(s.clients.find((c) => c.current_task) || s.clients[0]);
      toast.success("Vos 3 premiers clients virtuels sont arrivés ✦");
    } catch (e) {
      toast.error("Impossible de démarrer la simulation pour le moment. Réessayez dans un instant.");
    } finally {
      setStarting(false);
    }
  };

  const handleSubmit = async () => {
    if (!activeClient?.current_task) return;
    if (response.trim().length < 10) return toast.error("Développez un peu plus votre réponse.");
    setSubmitting(true);
    try {
      const res = await simulationApi.submitTask(activeClient.current_task.id, response.trim());
      setFeedback(res);
      setResponse("");
      const s = await simulationApi.state();
      setState(s);
      const refreshed = s.clients?.find((c) => c.id === activeClient.id);
      // Si le client actif n'a plus de tâche en attente, on bascule vers un client qui en a une.
      if (refreshed?.current_task) setActiveClient(refreshed);
      else setActiveClient(s.clients?.find((c) => c.current_task) || refreshed || activeClient);
    } catch (e) {
      toast.error("Envoi impossible pour le moment. Réessayez dans un instant.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div>;
  }

  // ── Écran onboarding ──
  if (!state?.started) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-6 text-center">
        <GraduationCap size={40} className="mx-auto mb-3 text-[var(--app-accent)]" />
        <h2 className="font-head text-xl font-semibold text-[var(--app-text)] mb-2">Simulation client virtuel</h2>
        <p className="text-sm text-[var(--app-text-muted)] mb-6">
          Décrivez votre programme (n'importe quel niveau, de la licence au MBA) — l'IA calibre
          automatiquement 3 clients virtuels adaptés à votre domaine. Bêta gratuite.
        </p>
        <input
          value={programme}
          onChange={(e) => setProgramme(e.target.value)}
          placeholder="Ex : Master 2 Marketing Digital, Licence Pro RH, MBA Finance…"
          data-testid="sim-programme-input"
          className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--app-accent)] mb-3"
        />
        <button
          onClick={handleStart}
          disabled={starting}
          data-testid="sim-start-btn"
          className="w-full flex items-center justify-center gap-2 rounded-full bg-[var(--app-navy)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {starting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {starting ? "Génération de vos clients…" : "Démarrer la simulation"}
        </button>
      </div>
    );
  }

  const task = activeClient?.current_task;

  // ── Écran simulation ──
  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
      {/* Clients */}
      <div className="md:col-span-1 bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={15} className="text-[var(--app-accent)]" />
          <h3 className="font-head text-sm font-semibold text-[var(--app-text)]">Vos clients</h3>
        </div>
        <div className="space-y-2">
          {state.clients.map((c) => (
            <button
              key={c.id}
              onClick={() => { setActiveClient(c); setFeedback(null); setResponse(""); }}
              className={`w-full text-left rounded-xl p-3 transition ${
                activeClient?.id === c.id ? "bg-[var(--app-navy)] text-white" : "bg-[var(--app-surface-2)] hover:opacity-80"
              }`}
            >
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="text-xs opacity-70">{c.industry}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-[var(--app-border)] text-xs text-[var(--app-text-muted)]">
          <p>Programme : {state.programme_label}</p>
          <p>Tâches complétées : {state.tasks_completed}</p>
          <p>Score moyen : {state.average_score || "—"}/10</p>
        </div>
        <button
          onClick={openHistory}
          data-testid="sim-history-btn"
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-full border border-[var(--app-border)] px-4 py-2 text-xs font-semibold text-[var(--app-text)] hover:bg-[var(--app-surface-2)]"
        >
          <History size={14} /> Voir mon historique
        </button>
      </div>

      {/* Tâche + réponse */}
      <div className="md:col-span-1 bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] p-4">
        {task ? (
          <>
            <p className="text-xs uppercase tracking-wide text-[var(--app-text-muted)] mb-1">
              {activeClient.name} · difficulté {task.difficulty}/5
            </p>
            <h4 className="font-head text-base font-semibold text-[var(--app-text)] mb-2">{task.title}</h4>
            <p className="text-sm text-[var(--app-text-muted)] mb-4">{task.description}</p>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={6}
              placeholder="Votre réponse au client…"
              data-testid="sim-response-input"
              className="w-full resize-none rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--app-accent)] mb-3"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting}
              data-testid="sim-submit-btn"
              className="flex items-center gap-2 rounded-full bg-[var(--app-navy)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {submitting ? "Envoi…" : "Envoyer ma réponse"}
            </button>
          </>
        ) : fetchingTask ? (
          <div className="flex items-center gap-2 text-sm text-[var(--app-text-muted)]" data-testid="sim-task-loading">
            <Loader2 size={15} className="animate-spin" /> Préparation d'une nouvelle mission…
          </div>
        ) : (
          <p className="text-sm text-[var(--app-text-muted)]" data-testid="sim-no-task">
            Ce client n'a pas de tâche en attente. Sélectionnez un autre client à gauche — une nouvelle mission est en préparation.
          </p>
        )}
      </div>

      {/* Feedback */}
      <div className="md:col-span-1 bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] p-4 md:max-h-[calc(100vh-160px)] md:overflow-y-auto">
        <h3 className="font-head text-sm font-semibold text-[var(--app-text)] mb-3">Feedback</h3>
        {feedback ? (
          <div className="space-y-3 text-sm" data-testid="sim-feedback">
            <p className="font-semibold text-[var(--app-text)]" data-testid="sim-feedback-score">Score : {feedback.score}/10</p>
            <p className="text-[var(--app-text-muted)]">{feedback.comments}</p>
            {feedback.what_went_well?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--app-text-muted)] mb-1">Points forts</p>
                <ul className="list-disc list-inside text-[var(--app-text-muted)]">
                  {feedback.what_went_well.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            )}
            {feedback.improvements_needed?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--app-text-muted)] mb-1">À améliorer</p>
                <ul className="list-disc list-inside text-[var(--app-text-muted)]">
                  {feedback.improvements_needed.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            )}
            {feedback.learning_point && (
              <div className="rounded-xl border border-[var(--app-accent)]/30 bg-[var(--app-accent)]/5 p-3">
                <p className="text-xs font-semibold uppercase text-[var(--app-accent)] mb-1">À retenir</p>
                <p className="text-[var(--app-text-muted)]">{feedback.learning_point}</p>
              </div>
            )}
            {feedback.client_reaction && (
              <div className="rounded-xl bg-[var(--app-surface-2)] p-3 italic text-[var(--app-text-muted)]">
                « {feedback.client_reaction} »
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--app-text-muted)]">Soumettez une réponse pour recevoir votre feedback.</p>
        )}
      </div>

      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowHistory(false)}
          data-testid="sim-history-modal-backdrop"
        >
          <div
            className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] p-5"
            onClick={(e) => e.stopPropagation()}
            data-testid="sim-history-modal"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-head text-base font-semibold text-[var(--app-text)] flex items-center gap-2">
                <History size={16} /> Mon historique de progression
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportHistory}
                  disabled={!history?.items?.length}
                  data-testid="sim-history-export-btn"
                  className="flex items-center gap-1.5 rounded-full bg-[var(--app-navy)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
                >
                  <Download size={13} /> Exporter (.txt)
                </button>
                <button onClick={() => setShowHistory(false)} data-testid="sim-history-close-btn" className="p-1.5 rounded-full hover:bg-[var(--app-surface-2)]">
                  <X size={16} />
                </button>
              </div>
            </div>

            {loadingHistory ? (
              <div className="flex items-center gap-2 text-sm text-[var(--app-text-muted)]">
                <Loader2 size={15} className="animate-spin" /> Chargement…
              </div>
            ) : !history?.items?.length ? (
              <p className="text-sm text-[var(--app-text-muted)]" data-testid="sim-history-empty">
                Aucune mission soumise pour l'instant — ton historique apparaîtra ici dès ta première réponse.
              </p>
            ) : (
              <div className="space-y-3">
                {history.items.map((it) => (
                  <div key={it.response_id} className="rounded-xl border border-[var(--app-border)] p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-[var(--app-text)]">{it.task_title}</p>
                      <span className="text-xs font-semibold text-[var(--app-accent)]">{it.score ?? "—"}/10</span>
                    </div>
                    <p className="text-xs text-[var(--app-text-muted)] mb-2">
                      {it.client_name} · {it.client_industry} ·{" "}
                      {it.submitted_at ? new Date(it.submitted_at).toLocaleDateString("fr-FR") : ""}
                    </p>
                    {it.feedback?.comments && (
                      <p className="text-[var(--app-text-muted)]">{it.feedback.comments}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
