import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Lightbulb, FolderSync, Plus, ChevronRight, Sparkles, Wand2 } from "lucide-react";
import { Sidebar } from "@/components/kairos/Sidebar";
import { CaptureBar } from "@/components/ideas/CaptureBar";
import { IdeaCard } from "@/components/ideas/IdeaCard";
import { IdeaDrawer } from "@/components/ideas/IdeaDrawer";
import { STATUTS } from "@/components/ideas/constants";
import { fetchIdees, fetchObjectifs, createIdee } from "@/lib/kairosApi";

const FILTERS = [{ id: "all", label: "Toutes" }, ...STATUTS];

export default function Ideas() {
  const navigate = useNavigate();
  const [idees, setIdees] = useState([]);
  const [objectifs, setObjectifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const captureRef = useRef(null);

  useEffect(() => {
    Promise.all([fetchIdees(), fetchObjectifs()])
      .then(([i, o]) => { setIdees(i); setObjectifs(o); })
      .catch(() => toast.error("Chargement impossible."))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c = { all: idees.length };
    STATUTS.forEach((s) => { c[s.id] = idees.filter((i) => i.statut === s.id).length; });
    return c;
  }, [idees]);

  const visible = filter === "all" ? idees : idees.filter((i) => i.statut === filter);

  const onCreated = (idee) => { setIdees((p) => [idee, ...p]); toast.success("Idée capturée"); };
  const onUpdated = (u) => setIdees((p) => p.map((i) => (i.id === u.id ? u : i)));
  const onDeleted = (id) => setIdees((p) => p.filter((i) => i.id !== id));

  const focusCapture = () => {
    captureRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => captureRef.current?.querySelector("input")?.focus(), 350);
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-navy-900/70 px-4 py-3 backdrop-blur-2xl sm:px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold"><Lightbulb size={17} /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">Zayado</p>
            <h1 className="truncate font-display text-lg font-bold text-offwhite sm:text-xl">Idées</h1>
          </div>
          <button onClick={() => navigate("/app")} className="ml-auto hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-offwhite/80 transition hover:bg-white/10 sm:inline-flex" data-testid="ideas-back-cockpit">
            Retour au Cockpit
          </button>
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 sm:px-6" data-testid="ideas-page">
          <div ref={captureRef} className="mb-4">
            <CaptureBar onCreated={onCreated} />
          </div>

          {/* IA propose des idées */}
          <AISuggestions onCreated={onCreated} />

          {/* Sources connectées */}
          <button onClick={() => navigate("/app/sources")} data-testid="ideas-sources-entry"
            className="glass mb-5 flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition hover:border-gold/40">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 text-gold"><FolderSync size={17} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-offwhite">Sources connectées · SharePoint</p>
              <p className="text-xs text-offwhite/50">Colle un lien ou un texte, l'IA propose un classement — tu valides.</p>
            </div>
            <ChevronRight size={18} className="text-offwhite/40" />
          </button>

          {/* Filtres */}
          <div className="mb-5 flex flex-wrap gap-2" data-testid="ideas-filters">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button key={f.id} onClick={() => setFilter(f.id)} data-testid={`ideas-filter-${f.id}`}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-gradient-to-br from-[#F1E2CC] to-[#DEC2A3] text-navy-900" : "border border-white/10 bg-white/5 text-offwhite/60 hover:bg-white/10"}`}>
                  {f.label}
                  <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-navy-900/20" : "bg-white/10"}`}>{counts[f.id] || 0}</span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-offwhite/60"><Loader2 size={16} className="animate-spin" /> Chargement…</div>
          ) : visible.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="ideas-grid">
              {visible.map((idee, i) => <IdeaCard key={idee.id} idee={idee} index={i} onOpen={setSelected} />)}
            </div>
          ) : (
            <div className="glass rounded-2xl p-10 text-center" data-testid="ideas-empty">
              <Lightbulb size={26} className="mx-auto mb-3 text-gold/60" />
              <p className="text-sm text-offwhite/70">{filter === "all" ? "Aucune idée pour l'instant." : "Rien dans cette catégorie."}</p>
              <p className="mt-1 text-xs text-offwhite/40">Capture ta première idée ci-dessus — en tapant ou à la voix.</p>
            </div>
          )}
        </main>
      </div>

      {/* FAB mobile */}
      <button onClick={focusCapture} data-testid="ideas-fab"
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#F1E2CC] to-[#DEC2A3] text-navy-900 shadow-[0_10px_30px_-6px_rgba(222,194,163,0.6)] transition hover:scale-105 lg:hidden">
        <Plus size={24} />
      </button>

      {selected && (
        <IdeaDrawer idee={selected} objectifs={objectifs}
          onClose={() => setSelected(null)} onUpdated={onUpdated} onDeleted={onDeleted} />
      )}
    </div>
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
      const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
      // Try Copilote chat with structured prompt
      const prompt = `Propose 5 idées business courtes et concrètes pour un entrepreneur solo${context ? ` dans le contexte : "${context}"` : ""}. Format JSON strict : [{"titre":"...","description":"une phrase courte","impact":4,"effort":2}] — impact et effort de 1 à 5. Réponds UNIQUEMENT avec le JSON, sans commentaire.`;
      const r = await fetch(`${BACKEND}/api/copilote/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, stream: false }),
      });
      const text = await r.text();
      // Try parse JSON from response
      let json = null;
      try {
        const m = text.match(/\[[\s\S]*\]/);
        if (m) json = JSON.parse(m[0]);
      } catch {}
      if (!json || !Array.isArray(json)) {
        // Fallback local suggestions
        json = [
          { titre: "Créer une offre premium 90 jours", description: "Accompagnement structuré haut de gamme pour 5 clients", impact: 5, effort: 3 },
          { titre: "Lancer un podcast Zayado", description: "Un épisode par semaine, 20 min, entrepreneurs solo sensibles", impact: 4, effort: 3 },
          { titre: "Newsletter apaisée", description: "Un email dimanche soir, doux, personnel, sans pression", impact: 4, effort: 2 },
          { titre: "Partenariat cabinet compta", description: "Cross-sell clients, com. sur la sérénité", impact: 4, effort: 2 },
          { titre: "Groupe WhatsApp premium", description: "Mastermind exclusif pour clients SERENITY", impact: 3, effort: 1 },
        ];
      }
      setSuggestions(json);
    } catch (e) {
      toast.error("IA indisponible, essaie plus tard");
    } finally {
      setLoading(false);
    }
  };

  const accept = async (s) => {
    try {
      const created = await createIdee({
        titre: s.titre, description: s.description, impact: s.impact || 3, effort: s.effort || 2,
      });
      onCreated(created);
      setSuggestions((p) => p.filter((x) => x.titre !== s.titre));
    } catch {
      toast.error("Impossible d'ajouter");
    }
  };

  return (
    <div className="glass mb-5 rounded-2xl p-4 border border-gold/20">
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
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300">Impact {s.impact || 3}/5</span>
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-300">Effort {s.effort || 2}/5</span>
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 font-semibold text-gold">Score {(((s.impact || 3) / (s.effort || 2)) * 10).toFixed(0)}</span>
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
