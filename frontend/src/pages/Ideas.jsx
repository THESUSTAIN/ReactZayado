import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Lightbulb, FolderSync, Plus, ChevronRight, Sparkles, Wand2, Target, Zap, Gauge, Users } from "lucide-react";
import { CaptureBar } from "@/components/ideas/CaptureBar";
import { IdeaDrawer } from "@/components/ideas/IdeaDrawer";
import { IdeesEquipe } from "@/components/ideas/IdeesEquipe";
import { fetchEspaceEquipe } from "@/lib/kairosApi";
import { STATUTS, REALISEE, statutAffiche, statutMeta, scoreLabel } from "@/components/ideas/constants";
import { fetchIdees, fetchObjectifs, createIdee, suggererIdees } from "@/lib/kairosApi";

const FILTERS = [{ id: "all", label: "En cours" }, ...STATUTS, REALISEE];

// L'ancienne page /app/ideas est devenue l'onglet « Idées » du Plan d'action.
export default function Ideas() {
  return <Navigate to="/app/actions?tab=idees" replace />;
}

export function IdeesContenu({ onChange }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [idees, setIdees] = useState([]);
  const [objectifs, setObjectifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [iaOuverte, setIaOuverte] = useState(false);
  const [equipe, setEquipe] = useState(null);  // { equipe, membres, mes_partages, seul } ou { equipe:false }
  const [vue, setVue] = useState(params.get("vue") === "equipe" ? "equipe" : "mes");
  useEffect(() => { fetchEspaceEquipe().then(setEquipe).catch(() => setEquipe({ equipe: false })); }, []);
  const majPartage = (id, partage) => setEquipe((e) => e && ({ ...e, mes_partages: partage ? [...(e.mes_partages || []), id] : (e.mes_partages || []).filter((x) => x !== id) }));
  const aEquipe = Boolean(equipe?.equipe);
  const captureRef = useRef(null);

  useEffect(() => {
    Promise.all([fetchIdees(), fetchObjectifs()])
      .then(([i, o]) => { setIdees(i); setObjectifs(o); })
      .catch(() => toast.error("Chargement impossible."))
      .finally(() => setLoading(false));
  }, []);

  // Partage mobile (PWA Share Target) : une idée/un lien partagé depuis le téléphone
  // arrive ici en paramètres d'URL → on la capture directement dans « Idées ».
  useEffect(() => {
    const t = params.get("title");
    const txt = params.get("text");
    const u = params.get("url");
    if (!t && !txt && !u) return;
    const titre = (t || txt || u || "").trim().slice(0, 300) || "Idée partagée";
    const desc = [txt && txt !== titre ? txt : null, u].filter(Boolean).join("\n") || undefined;
    createIdee({ titre, description: desc, source: "partage" })
      .then((idee) => { setIdees((p) => [idee, ...p]); onChange?.(); toast.success("Idée capturée depuis le partage 📲"); })
      .catch(() => toast.error("Impossible de capturer l'idée partagée."))
      .finally(() => {
        const np = new URLSearchParams(params);
        ["title", "text", "url"].forEach((k) => np.delete(k));
        np.set("tab", "idees");
        setParams(np, { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const c = { all: idees.filter((i) => i.statut !== "realisee").length, realisee: idees.filter((i) => i.statut === "realisee").length };
    STATUTS.forEach((s) => { c[s.id] = idees.filter((i) => statutAffiche(i.statut) === s.id).length; });
    return c;
  }, [idees]);

  // Les idées décidées quittent la liste (onglet « Réalisée ») ; les autres sont triées par score.
  const visible = (filter === "all" ? idees.filter((i) => i.statut !== "realisee")
    : idees.filter((i) => statutAffiche(i.statut) === filter)).slice().sort((a, b) => (filter === "realisee" ? 0 : b.score - a.score));

  const onCreated = (idee) => { setIdees((p) => [idee, ...p]); toast.success("Idée capturée"); };
  const onUpdated = (u) => { setIdees((p) => p.map((i) => (i.id === u.id ? u : i))); if (u.statut === "realisee") onChange?.(); };
  const onDeleted = (id) => setIdees((p) => p.filter((i) => i.id !== id));

  const focusCapture = () => {
    captureRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => captureRef.current?.querySelector("input")?.focus(), 350);
  };

  return (
    <div>
      <div>
        <div data-testid="ideas-page">
          <div ref={captureRef} className="mb-4">
            <CaptureBar onCreated={onCreated} />
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-2">
            <button onClick={() => setIaOuverte((v) => !v)} data-testid="ideas-ia-toggle"
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition ${iaOuverte ? "border-gold bg-gold/15 text-gold" : "border-white/15 text-offwhite/80 hover:bg-white/10"}`}>
              <Wand2 size={14} /> Idées proposées par l'IA
            </button>
            <button onClick={() => navigate("/app/sources")} data-testid="ideas-sources-entry"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-2 text-[12.5px] font-semibold text-offwhite/80 transition hover:bg-white/10">
              <FolderSync size={14} /> Trier un document
            </button>
            {aEquipe ? (
              <button onClick={() => setVue((v) => (v === "equipe" ? "mes" : "equipe"))} data-testid="ideas-equipe-entry"
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition ${vue === "equipe" ? "border-gold bg-gold/15 text-gold" : "border-white/15 text-offwhite/80 hover:bg-white/10"}`}>
                <Users size={14} /> {vue === "equipe" ? "Retour à mes idées" : "Idées de l'équipe"}
              </button>
            ) : (
              <button onClick={() => navigate("/parametres#offre")} data-testid="ideas-equipe-entry"
                title="Offre Équipe : invite des coéquipiers, chacun a son espace, et vous partagez les idées de votre choix."
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-2 text-[12.5px] font-semibold text-offwhite/80 transition hover:bg-white/10">
                <Users size={14} /> Inviter mon équipe
              </button>
            )}
          </div>
          {iaOuverte && <AISuggestions onCreated={onCreated} />}

          {vue === "equipe" && aEquipe ? (
            <IdeesEquipe equipe={equipe} onInviter={() => navigate("/parametres#offre")} />
          ) : (<>

          {/* Filtres */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-xl border border-white/15 bg-white/5 p-1" data-testid="ideas-filters">
              {FILTERS.map((f) => {
                const active = filter === f.id;
                return (
                  <button key={f.id} onClick={() => setFilter(f.id)} data-testid={`ideas-filter-${f.id}`}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-gold text-navy-900" : "text-offwhite/65 hover:text-offwhite"}`}>
                    {f.label}
                    <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-navy-900/15" : "bg-white/10"}`}>{counts[f.id] || 0}</span>
                  </button>
                );
              })}
            </div>
            {filter !== "realisee" && visible.length > 1 && <span className="text-[12.5px] text-offwhite/70">Triées par score (impact ÷ effort)</span>}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-offwhite/60"><Loader2 size={16} className="animate-spin" /> Chargement…</div>
          ) : visible.length ? (
            <div className="glass overflow-hidden rounded-2xl" data-testid="ideas-grid">
              {visible.map((idee) => <LigneIdee key={idee.id} idee={idee} onOpen={setSelected} />)}
            </div>
          ) : (
            <div className="glass rounded-2xl p-10 text-center" data-testid="ideas-empty">
              <Lightbulb size={26} className="mx-auto mb-3 text-gold/60" />
              <p className="text-sm text-offwhite/70">{filter === "all" ? "Aucune idée en attente." : filter === "realisee" ? "Aucune idée réalisée pour l'instant." : "Rien dans cette catégorie."}</p>
              <p className="mt-1 text-xs text-offwhite/45">Note-la en une phrase ci-dessus, en tapant ou à la voix. Tu décideras plus tard d'en faire une action ou un objectif.</p>
            </div>
          )}
          </>)}
        </div>
      </div>

      {/* FAB mobile */}
      <button onClick={focusCapture} data-testid="ideas-fab" aria-label="Nouvelle idée"
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#F1E2CC] to-[#DEC2A3] text-navy-900 shadow-[0_10px_30px_-6px_rgba(222,194,163,0.6)] transition hover:scale-105 lg:hidden">
        <Plus size={24} />
      </button>

      {selected && (
        <IdeaDrawer idee={selected} objectifs={objectifs} equipe={equipe} onPartage={majPartage}
          onClose={() => setSelected(null)} onUpdated={onUpdated} onDeleted={onDeleted} />
      )}
    </div>
  );
}

// Une idée = une ligne : statut, titre, objectif servi, impact/effort et score. Plus lisible qu'une grille de cartes.
function LigneIdee({ idee, onOpen }) {
  const meta = statutMeta(idee.statut);
  const sc = scoreLabel(idee.score);
  const Barre = ({ v, couleur }) => <span className="block h-1.5 w-12 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full" style={{ width: `${v * 10}%`, background: couleur }} /></span>;
  return (
    <button onClick={() => onOpen(idee)} data-testid={`idea-card-${idee.id}`}
      className="flex w-full items-center gap-3 border-b border-white/10 px-4 py-3.5 text-left transition last:border-0 hover:bg-white/[0.06]">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.color }} title={meta.label} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[14.5px] font-medium ${idee.statut === "realisee" ? "text-offwhite/60" : "text-offwhite"}`}>{idee.titre}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-offwhite/70">
          <span style={{ color: meta.color }}>{meta.label}</span>
          {idee.objectif_titre && <span className="inline-flex items-center gap-1"><Target size={11} className="text-gold" /> {idee.objectif_titre}</span>}
          {idee.statut === "realisee" && <span>→ {idee.vers_type === "objectif" ? "objectif" : "action"} du Plan d'action</span>}
        </p>
      </div>
      <div className="hidden items-center gap-4 text-[12.5px] text-offwhite/70 sm:flex">
        <span className="flex items-center gap-1.5" title={`Impact ${idee.impact}/10`}><Zap size={12} className="text-gold" /><Barre v={idee.impact} couleur="#DEC2A3" /></span>
        <span className="flex items-center gap-1.5" title={`Effort ${idee.effort}/10`}><Gauge size={12} /><Barre v={idee.effort} couleur="#7C93C3" /></span>
      </div>
      {idee.statut !== "realisee" && <span className={`shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-semibold ${sc.tone}`}>{sc.label}</span>}
      <ChevronRight size={16} className="shrink-0 text-offwhite/35" />
    </button>
  );
}

function AISuggestions({ onCreated }) {
  const [loading, setLoading] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState([]);
  const [context, setContext] = React.useState("");

  const generate = async () => {
    setLoading(true);
    setSuggestions([]);
    try {
      // IA côté serveur, avec ton profil (avant : chat détourné et 5 idées toutes faites si l'IA ne répondait pas).
      const r = await suggererIdees(context);
      if (!r.items?.length) toast("L'IA n'est pas disponible pour le moment. Réessaie un peu plus tard.");
      setSuggestions(r.items || []);
    } catch (e) {
      toast.error(e.detail || "IA indisponible, essaie plus tard.");
    } finally {
      setLoading(false);
    }
  };

  const accept = async (s) => {
    try {
      const created = await createIdee({
        titre: s.titre, description: s.description, impact: s.impact || 5, effort: s.effort || 5,
      });
      onCreated(created);
      setSuggestions((p) => p.filter((x) => x.titre !== s.titre));
    } catch {
      toast.error("Impossible d'ajouter");
    }
  };

  return (
    <div className="glass mb-5 rounded-2xl border border-gold/25 p-4" data-testid="ideas-ia-panneau">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold"><Sparkles size={17} /></span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-offwhite">Zayado propose des idées</p>
          <p className="text-[11.5px] text-offwhite/55">Écris ton contexte (optionnel), l'IA propose 5 idées scorées.</p>
        </div>
        <button onClick={generate} disabled={loading}
          className="flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-navy-900 disabled:opacity-60">
          {loading ? <><Loader2 size={14} className="animate-spin" /> Génère…</> : <><Wand2 size={14} /> Génère 5 idées</>}
        </button>
      </div>
      <input value={context} onChange={(e) => setContext(e.target.value)} placeholder="Ex. je suis coach en transition, mes clients me demandent…"
        className="mb-3 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-sm text-white placeholder:text-white/35 focus:border-gold focus:outline-none" />

      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-white">{s.titre}</div>
                <div className="mt-0.5 text-[12px] text-offwhite/60">{s.description}</div>
                <div className="mt-1.5 flex items-center gap-2 text-[10.5px]">
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300">Impact {s.impact}/10</span>
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-300">Effort {s.effort}/10</span>
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 font-semibold text-gold">Score {(s.impact / Math.max(1, s.effort)).toFixed(1)}</span>
                </div>
              </div>
              <button onClick={() => accept(s)}
                className="rounded-lg bg-gold px-3 py-1.5 text-[11.5px] font-semibold text-navy-900">
                Ajouter
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
