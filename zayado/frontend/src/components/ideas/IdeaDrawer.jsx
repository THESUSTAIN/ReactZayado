import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { X, Target, Trash2, Zap, Gauge, ArrowRight, Loader2, Rocket } from "lucide-react";
import { STATUTS, statutMeta, scoreLabel } from "./constants";
import { updateIdee, deleteIdee, lancerIdee } from "@/lib/kairosApi";

export function IdeaDrawer({ idee, objectifs, onClose, onUpdated, onDeleted }) {
  const [local, setLocal] = useState(idee);
  const [savingStatut, setSavingStatut] = useState(false);
  const [highlightObj, setHighlightObj] = useState(false);
  const [launching, setLaunching] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => { setLocal(idee); }, [idee]);
  if (!idee) return null;

  const merge = (patch) => setLocal((l) => ({ ...l, ...patch }));

  const persist = async (patch) => {
    try {
      const updated = await updateIdee(idee.id, patch);
      setLocal(updated);
      onUpdated?.(updated);
      return updated;
    } catch (e) {
      toast.error(e.detail || "Mise à jour impossible.");
      if (e.detail && /objectif/i.test(e.detail)) setHighlightObj(true);
      throw e;
    }
  };

  const changeStatut = async (statut) => {
    if (statut === local.statut) return;
    setSavingStatut(true);
    try { await persist({ statut }); setHighlightObj(false); }
    catch { /* handled */ }
    setSavingStatut(false);
  };

  const changeObjectif = (objectif_id) => {
    merge({ objectif_id });
    setHighlightObj(false);
    persist({ objectif_id: objectif_id || null }).catch(() => {});
  };

  const changeSlider = (field, val) => {
    merge({ [field]: val });
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persist({ [field]: val }).catch(() => {}), 500);
  };

  const remove = async () => {
    try { await deleteIdee(idee.id); onDeleted?.(idee.id); toast.success("Idée supprimée"); onClose(); }
    catch { toast.error("Suppression impossible."); }
  };

  const lancer = async () => {
    if (local.statut !== "action") { toast.error("Passe d'abord l'idée en statut Action."); return; }
    setLaunching(true);
    try {
      const r = await lancerIdee(idee.id);
      const parts = [];
      parts.push("Tâche créée dans ton agenda du jour.");
      if (r.pushed_to?.length) parts.push(`Poussée sur : ${r.pushed_to.join(", ")}.`);
      if (r.skipped?.length)   parts.push(`Non connecté : ${r.skipped.join(", ")}.`);
      toast.success(parts.join(" "));
    } catch (e) { toast.error(e.detail || "Lancement impossible."); }
    setLaunching(false);
  };

  const score = Math.round((local.impact / Math.max(1, local.effort)) * 100) / 100;
  const sc = scoreLabel(score);
  const objLie = objectifs.find((o) => o.id === local.objectif_id);

  return (
    <AnimatePresence>
      <motion.div key="idea-drawer-overlay" className="fixed inset-0 z-[60] bg-navy-900/70 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} data-testid="idea-drawer-overlay" />
      <motion.aside
        key="idea-drawer-panel"
        className="glass-strong fixed right-0 top-0 z-[61] flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/10 p-6"
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        data-testid="idea-drawer"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Fiche idée</p>
          <button onClick={onClose} data-testid="idea-drawer-close" className="flex h-8 w-8 items-center justify-center rounded-lg text-offwhite/60 hover:bg-white/10"><X size={18} /></button>
        </div>

        <textarea
          value={local.titre}
          onChange={(e) => merge({ titre: e.target.value })}
          onBlur={(e) => e.target.value.trim() && persist({ titre: e.target.value.trim() }).catch(() => {})}
          rows={2}
          data-testid="idea-drawer-title"
          className="mb-5 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 font-display text-lg font-bold text-offwhite outline-none focus:border-gold/40"
        />

        {/* Flux de statut */}
        <label className="mb-2 block text-xs font-semibold text-offwhite/70">Statut</label>
        <div className="mb-2 flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1" data-testid="idea-drawer-statut">
          {STATUTS.map((s, i) => {
            const active = local.statut === s.id;
            return (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => changeStatut(s.id)}
                  disabled={savingStatut}
                  data-testid={`idea-drawer-statut-${s.id}`}
                  className={`flex-1 rounded-lg px-1 py-2 text-xs font-semibold transition ${active ? "text-navy-900" : "text-offwhite/60 hover:text-offwhite"}`}
                  style={active ? { background: s.color } : {}}
                >
                  {s.label}
                </button>
                {i < STATUTS.length - 1 && <ArrowRight size={11} className="shrink-0 text-offwhite/25" />}
              </React.Fragment>
            );
          })}
        </div>
        <p className="mb-5 text-[11px] text-offwhite/50">{statutMeta(local.statut).desc}</p>

        {/* Objectif lié */}
        <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-offwhite/70">
          <Target size={13} className="text-gold" /> Objectif lié
          <span className="font-normal text-offwhite/40">— requis pour Projet / Action</span>
        </label>
        <select
          value={local.objectif_id || ""}
          onChange={(e) => changeObjectif(e.target.value)}
          data-testid="idea-drawer-objectif"
          className={`mb-5 w-full rounded-xl border bg-white/5 px-3 py-2.5 text-sm text-offwhite outline-none focus:border-gold/40 ${highlightObj ? "border-alert ring-1 ring-alert" : "border-white/10"}`}
        >
          <option value="" className="bg-navy-800">— Aucun objectif —</option>
          {objectifs.map((o) => (
            <option key={o.id} value={o.id} className="bg-navy-800">{o.titre}</option>
          ))}
        </select>

        {/* Impact / Effort / Score */}
        <div className="mb-5 grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-offwhite/70"><Zap size={13} className="text-gold" /> Impact</span>
              <span className="font-display font-bold text-gold">{local.impact}</span>
            </div>
            <input type="range" min="1" max="10" value={local.impact} onChange={(e) => changeSlider("impact", Number(e.target.value))} data-testid="idea-drawer-impact" className="w-full" style={{ accentColor: "#DEC2A3" }} />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-offwhite/70"><Gauge size={13} className="text-offwhite/50" /> Effort</span>
              <span className="font-display font-bold text-offwhite">{local.effort}</span>
            </div>
            <input type="range" min="1" max="10" value={local.effort} onChange={(e) => changeSlider("effort", Number(e.target.value))} data-testid="idea-drawer-effort" className="w-full" style={{ accentColor: "#4a6a9e" }} />
          </div>
        </div>
        <div className="mb-5 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <span className="text-xs text-offwhite/60">Score <span className="text-offwhite/40">(impact / effort)</span></span>
          <span className={`font-display text-xl font-bold ${sc.tone}`} data-testid="idea-drawer-score">{score} · {sc.label}</span>
        </div>

        {/* Description */}
        <label className="mb-2 block text-xs font-semibold text-offwhite/70">Notes</label>
        <textarea
          value={local.description || ""}
          onChange={(e) => merge({ description: e.target.value })}
          onBlur={(e) => persist({ description: e.target.value }).catch(() => {})}
          rows={4}
          placeholder="Contexte, prochaines étapes…"
          data-testid="idea-drawer-description"
          className="mb-6 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-offwhite outline-none focus:border-gold/40 placeholder:text-offwhite/40"
        />

        {local.statut === "action" && (
          <button
            onClick={lancer}
            disabled={launching}
            data-testid="idea-drawer-lancer"
            className="mt-auto mb-3 inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-bold text-navy-900 shadow-[0_10px_28px_-8px_rgba(222,194,163,0.6)] transition hover:opacity-90 disabled:opacity-60"
          >
            {launching ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
            Lancer maintenant
          </button>
        )}

        <button onClick={remove} data-testid="idea-drawer-delete"
          className={`${local.statut === "action" ? "" : "mt-auto"} inline-flex items-center justify-center gap-2 rounded-xl border border-alert/30 bg-alert/10 px-4 py-2.5 text-sm font-semibold text-alert transition hover:bg-alert/20`}>
          <Trash2 size={15} /> Supprimer l'idée
        </button>
        {savingStatut && <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-offwhite/50"><Loader2 size={11} className="animate-spin" /> Mise à jour…</p>}
      </motion.aside>
    </AnimatePresence>
  );
}
