import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Check, Trash2, Flag } from "lucide-react";
import { fetchRoadmap, addRoadmapItem, patchRoadmapItem, deleteRoadmapItem } from "@/lib/kairosApi";

const QUARTERS = [
  { id: "q1", label: "Q1", hint: "Fondations", color: "#4a6a9e" },
  { id: "q2", label: "Q2", hint: "Traction", color: "#2FB89A" },
  { id: "q3", label: "Q3", hint: "Accélération", color: "#DEC2A3" },
  { id: "q4", label: "Q4", hint: "Consolidation", color: "#8b6fbf" },
];

function Column({ q, items, onAdd, onToggle, onDelete }) {
  const [value, setValue] = useState("");
  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onAdd(q.id, v);
    setValue("");
  };
  return (
    <div className="glass flex min-h-[300px] flex-col rounded-2xl p-4" data-testid={`roadmap-col-${q.id}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-navy-900" style={{ background: q.color }}>
          {q.label}
        </span>
        <div>
          <p className="font-display text-sm font-bold text-offwhite">{q.label}</p>
          <p className="text-[10px] uppercase tracking-wide text-offwhite/50">{q.hint}</p>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        {items.map((it) => (
          <div key={it.id} className="group flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2.5" data-testid={`roadmap-item-${it.id}`}>
            <button
              onClick={() => onToggle(it)}
              data-testid={`roadmap-toggle-${it.id}`}
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${it.done ? "border-emerald-400 bg-emerald-400/80" : "border-white/30 hover:border-gold"}`}
            >
              {it.done && <Check size={11} className="text-navy-900" />}
            </button>
            <span className={`flex-1 text-sm leading-snug ${it.done ? "text-offwhite/40 line-through" : "text-offwhite/85"}`}>{it.titre}</span>
            <button
              onClick={() => onDelete(it)}
              data-testid={`roadmap-delete-${it.id}`}
              className="mt-0.5 text-offwhite/30 opacity-0 transition hover:text-alert group-hover:opacity-100"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {!items.length && <p className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-offwhite/40">Aucun jalon ici pour l'instant.</p>}
      </div>

      <div className="mt-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ajouter un jalon…"
          data-testid={`roadmap-input-${q.id}`}
          className="flex-1 bg-transparent px-1.5 text-sm text-offwhite outline-none placeholder:text-offwhite/40"
        />
        <button onClick={submit} data-testid={`roadmap-add-${q.id}`} className="flex h-7 w-7 items-center justify-center rounded-full bg-gold text-navy-900 transition hover:bg-gold-hover">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

export function RoadmapBoard() {
  const [data, setData] = useState({ q1: [], q2: [], q3: [], q4: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoadmap()
      .then((r) => setData({ q1: r.q1 || [], q2: r.q2 || [], q3: r.q3 || [], q4: r.q4 || [] }))
      .catch(() => toast.error("Impossible de charger la feuille de route."))
      .finally(() => setLoading(false));
  }, []);

  const onAdd = async (quarter, titre) => {
    try {
      const item = await addRoadmapItem(quarter, titre);
      setData((d) => ({ ...d, [quarter]: [...d[quarter], item] }));
    } catch {
      toast.error("Ajout impossible.");
    }
  };
  const onToggle = async (it) => {
    setData((d) => ({ ...d, [it.quarter]: d[it.quarter].map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)) }));
    try { await patchRoadmapItem(it.id, { done: !it.done }); } catch { toast.error("Mise à jour impossible."); }
  };
  const onDelete = async (it) => {
    setData((d) => ({ ...d, [it.quarter]: d[it.quarter].filter((x) => x.id !== it.id) }));
    try { await deleteRoadmapItem(it.id); } catch { toast.error("Suppression impossible."); }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-offwhite/60" data-testid="roadmap-loading">
        <Loader2 size={16} className="animate-spin" /> Chargement…
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl animate-fade-up" data-testid="roadmap-board">
      <p className="mb-5 flex items-center gap-2 text-sm text-offwhite/60">
        <Flag size={15} className="text-gold" /> Répartis tes jalons stratégiques sur l'année, sans transformer chaque idée en urgence.
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {QUARTERS.map((q) => (
          <Column key={q.id} q={q} items={data[q.id]} onAdd={onAdd} onToggle={onToggle} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}
