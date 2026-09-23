import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Map, Plus, Eye, EyeOff, Check, Clock, Circle, Sparkles, X, Trash2, Edit3, Lock } from "lucide-react";
import { toast } from "sonner";
import { useKairos } from "@/context/KairosContext";

const ADMIN_EMAILS = ["thomas@zayado.net", "admin@zayado.net"];
const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
const ADMIN_KEY_LOCAL = "zayado_admin_key";

const QUARTERS = ["Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026"];
const STATUS = {
  planned: { icon: Circle, label: "Prévu", color: "text-white/40", bg: "bg-white/5" },
  wip:     { icon: Clock,  label: "En cours", color: "text-amber-300", bg: "bg-amber-400/10" },
  done:    { icon: Check,  label: "Livré", color: "text-emerald-300", bg: "bg-emerald-400/10" },
};

const adminHeaders = (user) => {
  const stored = localStorage.getItem(ADMIN_KEY_LOCAL) || "thomas-zayado-2025";
  return {
    "Content-Type": "application/json",
    "x-admin-key": stored,
    "x-user-email": user?.email || (user?.firstName === "Thomas" ? "thomas@zayado.net" : ""),
  };
};

export default function Roadmap() {
  const { user } = useKairos();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/roadmap`, { headers: adminHeaders(user) });
      const j = await r.json();
      setItems(j.items || []);
      setIsAdmin(!!j.admin);
    } catch (e) {
      toast.error("Impossible de charger la roadmap");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.email]);

  const toggleVisible = async (it) => {
    try {
      await fetch(`${BACKEND}/api/roadmap/${it.id}`, {
        method: "PATCH", headers: adminHeaders(user), body: JSON.stringify({ visible: !it.visible }),
      });
      toast.success(!it.visible ? "Publié aux utilisateurs" : "Masqué — collaborateurs seulement");
      load();
    } catch { toast.error("Erreur"); }
  };

  const cycleStatus = async (it) => {
    const order = ["planned", "wip", "done"];
    const next = order[(order.indexOf(it.status) + 1) % 3];
    await fetch(`${BACKEND}/api/roadmap/${it.id}`, {
      method: "PATCH", headers: adminHeaders(user), body: JSON.stringify({ status: next }),
    });
    load();
  };

  const saveItem = async (item) => {
    try {
      if (item.id) {
        await fetch(`${BACKEND}/api/roadmap/${item.id}`, {
          method: "PATCH", headers: adminHeaders(user), body: JSON.stringify(item),
        });
      } else {
        await fetch(`${BACKEND}/api/roadmap`, {
          method: "POST", headers: adminHeaders(user), body: JSON.stringify(item),
        });
      }
      setEditing(null);
      toast.success("Enregistré");
      load();
    } catch { toast.error("Erreur d'enregistrement"); }
  };

  const removeItem = async (id) => {
    if (!window.confirm("Supprimer cet élément ?")) return;
    await fetch(`${BACKEND}/api/roadmap/${id}`, { method: "DELETE", headers: adminHeaders(user) });
    toast.success("Supprimé");
    load();
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-navy-900/70 px-6 py-4 backdrop-blur-2xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 ring-1 ring-gold/30">
            <Map size={18} className="text-gold" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">Zayado · Feuille de route</p>
            <h1 className="font-display text-xl font-bold text-offwhite sm:text-2xl">Roadmap produit</h1>
          </div>
          {isAdmin && (
            <button onClick={() => setEditing({})} className="ml-auto btn-gold px-4 py-2 text-sm">
              <Plus size={15} /> Nouvel item
            </button>
          )}
        </header>

        <main className="mx-auto max-w-5xl px-6 py-8">
          {isAdmin && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/[0.08] px-4 py-3 text-[13px] text-offwhite/85">
              <Lock size={14} className="text-gold" />
              <span>Espace <b>Collaborateurs Zayado</b>. Toggle l'œil <Eye size={12} className="inline text-gold" /> pour publier un item aux utilisateurs.</span>
            </div>
          )}

          {loading && <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-offwhite/60">Chargement…</div>}

          {!loading && QUARTERS.map((q, qi) => {
            const qItems = items.filter((it) => it.quarter === q);
            if (qItems.length === 0) return null;
            const doneCount = qItems.filter((it) => it.status === "done").length;
            return (
              <section key={q} className="mb-10 animate-fade-up" style={{ animationDelay: `${qi * 60}ms` }}>
                <div className="mb-4 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-3">
                    <h2 className="font-serif-italic italic text-[26px] text-white">{q}</h2>
                    <span className="text-[11px] uppercase tracking-[0.2em] text-gold">{doneCount}/{qItems.length} livrés</span>
                  </div>
                  <div className="h-1 flex-1 mx-6 rounded-full bg-white/5 overflow-hidden max-w-[240px]">
                    <span className="block h-full bg-gradient-to-r from-gold/60 to-gold" style={{ width: `${(doneCount / qItems.length) * 100}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  {qItems.map((it) => {
                    const S = STATUS[it.status] || STATUS.planned;
                    return (
                      <div key={it.id} className={`group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 transition hover:border-gold/30 hover:bg-white/[0.06] ${!it.visible && isAdmin ? "opacity-60" : ""}`}>
                        <button onClick={() => isAdmin && cycleStatus(it)} className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${S.bg} ${S.color} ${isAdmin ? "cursor-pointer hover:scale-110" : ""} transition`}>
                          <S.icon size={15} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-display text-[15px] font-semibold text-white">{it.title}</h3>
                            <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider ${S.bg} ${S.color}`}>{S.label}</span>
                            {isAdmin && !it.visible && (
                              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-rose-300">Masqué</span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[13px] leading-relaxed text-offwhite/60">{it.desc}</p>
                        </div>
                        {isAdmin && (
                          <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                            <button onClick={() => toggleVisible(it)} title={it.visible ? "Masquer aux utilisateurs" : "Publier"}
                              className={`rounded-lg p-1.5 transition ${it.visible ? "text-emerald-300 hover:bg-emerald-400/10" : "text-rose-300 hover:bg-rose-400/10"}`}>
                              {it.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                            </button>
                            <button onClick={() => setEditing(it)} title="Modifier" className="rounded-lg p-1.5 text-offwhite/60 hover:bg-white/10 hover:text-gold">
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => removeItem(it.id)} title="Supprimer" className="rounded-lg p-1.5 text-offwhite/60 hover:bg-rose-400/10 hover:text-rose-300">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {!loading && items.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center text-offwhite/60">
              <Sparkles size={22} className="mx-auto mb-3 text-gold" />
              <p>La roadmap sera publiée ici prochainement.</p>
            </div>
          )}
        </main>
      </div>

      {editing !== null && (
        <RoadmapEditor item={editing} onSave={saveItem} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function RoadmapEditor({ item, onSave, onClose }) {
  const [f, setF] = useState({
    id: item.id || null,
    quarter: item.quarter || QUARTERS[1],
    title: item.title || "",
    desc: item.desc || "",
    status: item.status || "planned",
    visible: item.visible !== false,
  });
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong relative w-full max-w-lg rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 text-offwhite/60 hover:text-white"><X size={18} /></button>
        <h3 className="font-display text-lg font-bold text-white">{item.id ? "Modifier" : "Nouvel item"}</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-offwhite/60">Trimestre</label>
            <select value={f.quarter} onChange={(e) => setF({ ...f, quarter: e.target.value })}
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">
              {QUARTERS.map((q) => <option key={q}>{q}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-offwhite/60">Titre</label>
            <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-gold" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-offwhite/60">Description</label>
            <textarea rows={3} value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })}
              className="mt-1 w-full resize-none rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-gold" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[11px] uppercase tracking-wider text-offwhite/60">Statut</label>
              <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">
                <option value="planned">Prévu</option>
                <option value="wip">En cours</option>
                <option value="done">Livré</option>
              </select>
            </div>
            <label className="flex items-center gap-2 pt-6">
              <input type="checkbox" checked={f.visible} onChange={(e) => setF({ ...f, visible: e.target.checked })}
                className="h-4 w-4 rounded border-white/30 bg-white/5" />
              <span className="text-sm text-offwhite/80">Visible utilisateurs</span>
            </label>
          </div>
        </div>
        <button onClick={() => f.title.trim() && onSave(f)} disabled={!f.title.trim()}
          className="btn-gold mt-5 w-full disabled:opacity-50">Enregistrer</button>
      </div>
    </div>
  );
}
