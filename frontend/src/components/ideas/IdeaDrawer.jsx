import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { X, Target, Trash2, Zap, Gauge, ArrowRight, Loader2, CheckSquare, Flag, ExternalLink, Sparkles, Plug, Check, Users, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { STATUTS, statutMeta, statutAffiche, scoreLabel } from "./constants";
import { updateIdee, deleteIdee, transformerIdee, fetchTrello, partagerIdee } from "@/lib/kairosApi";
import { analyserEtGarder, lireAnalyse } from "@/lib/analyseIdee";

export function IdeaDrawer({ idee, objectifs, equipe, onPartage, onClose, onUpdated, onDeleted }) {
  const [local, setLocal] = useState(idee);
  const [savingStatut, setSavingStatut] = useState(false);
  const [highlightObj, setHighlightObj] = useState(false);
  const [launching, setLaunching] = useState("");
  const partage = Boolean(equipe?.mes_partages?.includes(idee.id));
  const basculerPartage = async () => {
    try { await partagerIdee(idee.id, !partage); onPartage?.(idee.id, !partage); toast.success(partage ? "Plus partagée." : "Partagée avec ton équipe."); }
    catch (e) { toast.error(e.detail || "Partage impossible pour le moment."); }
  };
  // Partage natif du téléphone (WhatsApp, Mail, Teams…), sinon copie dans le presse-papiers : fonctionne pour tout le monde.
  const partagerAilleurs = async () => {
    const texte = [local.titre, local.description].filter(Boolean).join("\n\n");
    try {
      if (navigator.share) { await navigator.share({ title: local.titre, text: texte }); return; }
      await navigator.clipboard.writeText(texte);
      toast.success("Idée copiée : colle-la où tu veux.");
    } catch (e) { if (e?.name !== "AbortError") toast.error("Partage impossible sur cet appareil."); }
  };
  const [analyse, setAnalyse] = useState(null);       // résultat de l'analyse IA
  const [analyseEnCours, setAnalyseEnCours] = useState(false);
  const [trello, setTrello] = useState(null);         // { relie, liste } : où partira l'action
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  useEffect(() => { setLocal(idee); setAnalyse(lireAnalyse(idee.id)); }, [idee]);
  // L'IA évalue l'idée toute seule à la 1re ouverture (une fois, puis résultat gardé) : la personne n'a plus à deviner son effort.
  useEffect(() => {
    if (!idee?.id || idee.statut === "realisee" || lireAnalyse(idee.id)) return undefined;
    let vivant = true;
    setAnalyseEnCours(true);
    analyserEtGarder(idee.id).then((r) => { if (vivant && r?.ia) setAnalyse(r); }).catch(() => {}).finally(() => { if (vivant) setAnalyseEnCours(false); });
    return () => { vivant = false; };
  }, [idee?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchTrello().then(setTrello).catch(() => setTrello({ relie: false })); }, []);
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

  // Décider : l'idée devient une action (ou un objectif) du Plan d'action, une seule fois.
  const transformer = async (vers) => {
    setLaunching(vers);
    try {
      const r = await transformerIdee(idee.id, vers, vers === "action" && local.objectif_id ? { objectif_id: local.objectif_id } : {});
      setLocal(r.idee); onUpdated?.(r.idee);
      toast.success(vers === "action"
        ? `Action ajoutée à ton Plan d'action${r.pushed_to?.length ? ` · envoyée sur ${r.pushed_to.join(", ")}` : ""}.`
        : "Objectif créé dans ton Plan d'action.");
    } catch (e) { toast.error(e.detail || "Impossible pour le moment."); }
    setLaunching("");
  };
  const realisee = local.statut === "realisee";

  // L'IA fait l'analyse : impact, effort, pourquoi, risque, première étape. La personne valide ou ajuste.
  const analyser = async () => {
    setAnalyseEnCours(true);
    try {
      const r = await analyserEtGarder(idee.id);
      if (!r.ia) toast(r.detail || "Analyse indisponible pour le moment.");
      else setAnalyse(r);
    } catch (e) { toast.error(e.detail || "Analyse impossible pour le moment."); }
    setAnalyseEnCours(false);
  };
  const appliquerAnalyse = async () => {
    const patch = { impact: analyse.impact, effort: analyse.effort };
    if (analyse.objectif_id && !local.objectif_id) patch.objectif_id = analyse.objectif_id;
    merge(patch);
    try { await persist(patch); toast.success("Scores appliqués."); } catch { /* déjà signalé */ }
  };
  const ajouterEtape = async () => {
    const note = `${(local.description || "").trim()}${local.description ? "\n\n" : ""}Première étape : ${analyse.premiere_etape}`;
    merge({ description: note });
    try { await persist({ description: note }); toast.success("Ajoutée à tes notes."); } catch { /* déjà signalé */ }
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
        className="glass-strong fixed right-0 top-0 z-[61] flex h-[100dvh] w-full max-w-md flex-col overflow-y-auto overscroll-contain border-l border-white/10 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6 [&>*]:shrink-0"
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
          className="mb-5 min-h-[76px] w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 font-display text-lg font-bold text-offwhite outline-none focus:border-gold/40"
        />

        {/* Statut : À explorer → À tester, puis décision */}
        {realisee ? (
          <div className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.08] p-3.5" data-testid="idea-drawer-realisee">
            <p className="text-sm font-semibold text-emerald-200">{local.vers_type === "objectif" ? "Devenue un objectif" : "Devenue une action"} du Plan d'action</p>
            <button onClick={() => { onClose(); navigate(local.vers_type === "objectif" ? "/app/actions?tab=objectifs" : "/app/actions?tab=actions"); }}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-gold hover:underline">Voir dans le Plan d'action <ExternalLink size={12} /></button>
          </div>
        ) : (
          <>
            <label className="mb-2 block text-[13px] font-semibold text-offwhite/85">Où en est l'idée ?</label>
            <div className="mb-2 flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1" data-testid="idea-drawer-statut">
              {STATUTS.map((s, i) => {
                const active = statutAffiche(local.statut) === s.id;
                return (
                  <React.Fragment key={s.id}>
                    <button onClick={() => changeStatut(s.id)} disabled={savingStatut} data-testid={`idea-drawer-statut-${s.id}`}
                      className={`flex-1 rounded-lg px-1 py-2 text-xs font-semibold transition ${active ? "text-navy-900" : "text-offwhite/60 hover:text-offwhite"}`}
                      style={active ? { background: s.color } : {}}>
                      {s.label}
                    </button>
                    {i < STATUTS.length - 1 && <ArrowRight size={11} className="shrink-0 text-offwhite/25" />}
                  </React.Fragment>
                );
              })}
            </div>
            <p className="mb-5 text-[12.5px] text-offwhite/70">{statutMeta(local.statut).desc}</p>
          </>
        )}

        {/* Objectif lié */}
        <label className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-offwhite/85">
          <Target size={13} className="text-gold" /> Objectif servi
          <span className="font-normal text-offwhite/65">— facultatif, repris dans l'action</span>
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

        {/* Partage d'équipe : désactivé par défaut, l'auteur reste maître */}
        {equipe?.equipe && !equipe.seul && !realisee && (
          <button onClick={basculerPartage} data-testid="idea-partager"
            className={`mb-5 flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-[13.5px] font-semibold transition ${partage ? "border-gold bg-gold/15 text-gold" : "border-white/15 text-offwhite/85 hover:bg-white/10"}`}>
            <span className="inline-flex items-center gap-2"><Users size={15} /> Partager avec mon équipe</span>
            <span className="text-[12.5px]">{partage ? "Partagée" : "Privée"}</span>
          </button>
        )}

        {/* Partager ailleurs : menu de partage du téléphone (ou copie). Toujours disponible, avec ou sans équipe. */}
        <button onClick={partagerAilleurs} data-testid="idea-partager-natif"
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 px-4 py-3 text-[13.5px] font-semibold text-offwhite/85 transition hover:bg-white/10">
          <Share2 size={15} /> Partager cette idée
        </button>

        {/* Analyse IA : c'est l'IA qui travaille, pas seulement la personne */}
        {!realisee && (
          <div className="mb-5 rounded-2xl border border-gold/30 bg-gold/[0.07] p-4" data-testid="idea-analyse">
            {!analyse ? (
              <>
                <p className="text-[13px] leading-relaxed text-offwhite/85">Laisse l'IA évaluer cette idée : impact, effort, risque et première étape, d'après ton profil et tes objectifs.</p>
                <button onClick={analyser} disabled={analyseEnCours} data-testid="idea-analyser"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-3 py-2.5 text-sm font-bold text-navy-900 disabled:opacity-60">
                  {analyseEnCours ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} {analyseEnCours ? "Analyse en cours…" : "Analyser avec l'IA"}
                </button>
              </>
            ) : (
              <div className="space-y-2.5 text-[13px] leading-relaxed text-offwhite/90">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold"><Sparkles size={13} /> Analyse de l'IA</p>
                <p>{analyse.pourquoi}</p>
                {analyse.risque && <p><b className="text-offwhite">Risque :</b> {analyse.risque}</p>}
                {analyse.premiere_etape && <p><b className="text-offwhite">Première étape :</b> {analyse.premiere_etape}</p>}
                <p className="text-offwhite/75">Impact proposé <b className="text-gold">{analyse.impact}</b> · Effort proposé <b className="text-offwhite">{analyse.effort}</b>{analyse.objectif_titre ? <> · Objectif proche : <b className="text-offwhite">{analyse.objectif_titre}</b></> : null}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={appliquerAnalyse} data-testid="idea-analyse-appliquer" className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-3 py-2 text-[12.5px] font-bold text-navy-900"><Check size={13} /> Appliquer les scores</button>
                  {analyse.premiere_etape && <button onClick={ajouterEtape} className="rounded-lg border border-gold/40 px-3 py-2 text-[12.5px] font-semibold text-gold hover:bg-gold/10">Ajouter l'étape aux notes</button>}
                  <button onClick={analyser} disabled={analyseEnCours} className="rounded-lg px-2 py-2 text-[12.5px] text-offwhite/70 hover:text-offwhite">Refaire</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Impact / Effort / Score */}
        <div className="mb-5 grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-offwhite/85"><Zap size={13} className="text-gold" /> Impact</span>
              <span className="font-display font-bold text-gold">{local.impact}</span>
            </div>
            <input type="range" min="1" max="10" value={local.impact} onChange={(e) => changeSlider("impact", Number(e.target.value))} data-testid="idea-drawer-impact" className="h-8 w-full" style={{ accentColor: "#DEC2A3" }} />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-offwhite/85"><Gauge size={13} className="text-offwhite/70" /> Effort</span>
              <span className="font-display font-bold text-offwhite">{local.effort}</span>
            </div>
            <input type="range" min="1" max="10" value={local.effort} onChange={(e) => changeSlider("effort", Number(e.target.value))} data-testid="idea-drawer-effort" className="h-8 w-full" style={{ accentColor: "#4a6a9e" }} />
          </div>
        </div>
        <p className="-mt-2 mb-4 text-[12.5px] leading-relaxed text-offwhite/70" data-testid="idea-aide-effort">
          <b className="text-offwhite/85">Effort</b> : 1 = quelques minutes · 3 = une demi-journée · 5 = quelques jours · 8 = plusieurs semaines · 10 = un gros chantier.
          <b className="ml-1 text-offwhite/85">Impact</b> : 1 = anecdotique · 10 = change vraiment ton activité. L'IA propose les deux ci-dessus : tu valides ou tu ajustes.
        </p>
        <div className="mb-5 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <span className="text-xs text-offwhite/60">Score <span className="text-offwhite/65">(impact / effort)</span></span>
          <span className={`font-display text-xl font-bold ${sc.tone}`} data-testid="idea-drawer-score">{score} · {sc.label}</span>
        </div>

        {/* Description */}
        <label className="mb-2 block text-[13px] font-semibold text-offwhite/85">Notes</label>
        <textarea
          value={local.description || ""}
          onChange={(e) => merge({ description: e.target.value })}
          onBlur={(e) => persist({ description: e.target.value }).catch(() => {})}
          rows={4}
          placeholder="Contexte, prochaines étapes…"
          data-testid="idea-drawer-description"
          className="mb-6 min-h-[112px] w-full resize-y rounded-xl border border-white/10 bg-white/5 p-3 text-[15px] text-offwhite outline-none focus:border-gold/40 placeholder:text-offwhite/65"
        />

        {!realisee && (
          <div className="sticky bottom-0 -mx-5 mt-auto mb-3 border-t border-white/10 bg-navy-900/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:px-6">
            <p className="mb-2 text-sm font-semibold text-offwhite">Tu te lances ?</p>
            <p className="mb-2 flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-offwhite/75" data-testid="idea-destination">
              <Plug size={13} className="text-gold" />
              {trello?.relie
                ? <>L'action partira aussi sur ton Trello{trello.liste ? <> (liste « {trello.liste} »)</> : null}.</>
                : <>Pas encore reliée à Trello ou Teams. <button onClick={() => { onClose(); navigate("/parametres#connexions"); }} className="font-semibold text-gold hover:underline" data-testid="idea-relier">Relier mes outils</button></>}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => transformer("action")} disabled={!!launching} data-testid="idea-drawer-vers-action"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-3 py-3 text-sm font-bold text-navy-900 transition hover:opacity-90 disabled:opacity-60">
                {launching === "action" ? <Loader2 size={15} className="animate-spin" /> : <CheckSquare size={15} />} En faire une action
              </button>
              <button onClick={() => transformer("objectif")} disabled={!!launching} data-testid="idea-drawer-vers-objectif"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gold/40 px-3 py-3 text-sm font-semibold text-gold transition hover:bg-gold/10 disabled:opacity-60">
                {launching === "objectif" ? <Loader2 size={15} className="animate-spin" /> : <Flag size={15} />} En faire un objectif
              </button>
            </div>
          </div>
        )}

        <button onClick={remove} data-testid="idea-drawer-delete"
          className={`${realisee ? "mt-auto" : ""} inline-flex items-center justify-center gap-2 rounded-xl border border-alert/30 bg-alert/10 px-4 py-2.5 text-sm font-semibold text-alert transition hover:bg-alert/20`}>
          <Trash2 size={15} /> Supprimer l'idée
        </button>
        {savingStatut && <p className="mt-2 flex items-center justify-center gap-1.5 text-[12.5px] text-offwhite/70"><Loader2 size={11} className="animate-spin" /> Mise à jour…</p>}
      </motion.aside>
    </AnimatePresence>
  );
}
