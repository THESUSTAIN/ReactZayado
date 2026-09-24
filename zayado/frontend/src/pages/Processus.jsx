import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import {
  Workflow, Plus, Play, Pause, Edit3, Trash2, Users, Package, Truck,
  ClipboardList, Mail, DollarSign, HeadphonesIcon, ArrowRight, Check,
  Circle, ChevronRight, X, Sparkles, FileText, Loader2,
} from "lucide-react";
import { toast } from "sonner";

const GOLD = "#DEC2A3";

const STORAGE_KEY = "zayado_processus_v1";

const SEED = [
  { id: "p1", name: "Onboarding client", icon: "Users", color: "#60a5fa", steps: [
    { title: "Envoi email de bienvenue", assignee: "IA", done: true },
    { title: "Envoi contrat + facture", assignee: "IA", done: true },
    { title: "Création compte + accès", assignee: "Toi", done: false },
    { title: "Kick-off 30 min", assignee: "Toi", done: false },
    { title: "Suivi J+7", assignee: "IA", done: false },
  ], active: true },
  { id: "p2", name: "Prospection commerciale", icon: "Mail", color: "#DEC2A3", steps: [
    { title: "Identification prospect", assignee: "Toi", done: true },
    { title: "Recherche préalable", assignee: "IA", done: true },
    { title: "Premier contact (email)", assignee: "IA", done: false },
    { title: "Relance J+3", assignee: "IA", done: false },
    { title: "Appel de qualification", assignee: "Toi", done: false },
  ], active: true },
  { id: "p3", name: "Facturation mensuelle", icon: "DollarSign", color: "#a3e635", steps: [
    { title: "Compilation heures/prestations", assignee: "IA", done: true },
    { title: "Génération factures", assignee: "IA", done: false },
    { title: "Envoi automatique clients", assignee: "IA", done: false },
    { title: "Suivi paiements", assignee: "IA", done: false },
    { title: "Relances impayés J+15", assignee: "IA", done: false },
  ], active: true },
  { id: "p4", name: "Livraison de mission", icon: "Package", color: "#f472b6", steps: [
    { title: "Brief client validé", assignee: "Toi", done: false },
    { title: "Réalisation", assignee: "Toi", done: false },
    { title: "Revue interne", assignee: "IA", done: false },
    { title: "Envoi livrable", assignee: "Toi", done: false },
    { title: "Demande de feedback", assignee: "IA", done: false },
  ], active: false },
];

const ICON_MAP = { Users, Mail, DollarSign, Package, Truck, ClipboardList, HeadphonesIcon };

export default function Processus() {
  const [processes, setProcesses] = useState(SEED);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) setProcesses(JSON.parse(s)); } catch {}
  }, []);
  const persist = (p) => { setProcesses(p); localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); };

  const toggleStep = (pid, idx) => {
    const next = processes.map((p) => p.id === pid ? {
      ...p, steps: p.steps.map((s, i) => i === idx ? { ...s, done: !s.done } : s),
    } : p);
    persist(next);
  };

  const toggleActive = (pid) => {
    persist(processes.map((p) => p.id === pid ? { ...p, active: !p.active } : p));
    const p = processes.find((x) => x.id === pid);
    toast.success(p.active ? "Processus mis en pause" : "Processus activé");
  };

  const remove = (pid) => {
    if (!window.confirm("Supprimer ce processus ?")) return;
    persist(processes.filter((p) => p.id !== pid));
    if (selected?.id === pid) setSelected(null);
  };

  const active = processes.filter((p) => p.active).length;
  const totalSteps = processes.reduce((s, p) => s + p.steps.length, 0);
  const doneSteps = processes.reduce((s, p) => s + p.steps.filter((x) => x.done).length, 0);

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <Header title="Processus" subtitle="Organise ton entreprise, l'IA suit pour toi." />

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {/* Hero */}
          <div className="mb-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 sm:p-8">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.24em]" style={{ color: GOLD }}>Automatisation douce</p>
            <h1 className="mt-2 font-display text-[26px] font-semibold leading-tight sm:text-[34px]">
              Chaque processus a un <span className="font-serif-italic italic" style={{ color: GOLD }}>chemin</span>, un rythme.
            </h1>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-white/60">
              Onboarding, prospection, facturation, livraison… Crée tes processus une seule fois. L'IA (L'Organisateur) et toi les jouez ensemble, étape par étape.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Stat icon={Workflow} label="Processus actifs" value={active} fg={GOLD} />
              <Stat icon={Check} label="Étapes accomplies" value={`${doneSteps}/${totalSteps}`} fg="#a3e635" />
              <Stat icon={Sparkles} label="Auto par IA" value={`${processes.reduce((s, p) => s + p.steps.filter((x) => x.assignee === "IA").length, 0)}`} fg="#60a5fa" />
            </div>
          </div>

          {/* Grid + Detail */}
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            {/* Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[17px] font-semibold">Mes processus</h2>
                <button className="flex items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2 text-[12px] font-semibold text-navy-900">
                  <Plus size={13} /> Nouveau
                </button>
              </div>
              {processes.map((p) => {
                const Ico = ICON_MAP[p.icon] || Workflow;
                const done = p.steps.filter((s) => s.done).length;
                return (
                  <button key={p.id} onClick={() => setSelected(p)}
                    className={`group flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${selected?.id === p.id ? "border-gold bg-gold/[0.06]" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${p.color}22` }}>
                      <Ico size={18} style={{ color: p.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-[14.5px] font-semibold text-white">{p.name}</h3>
                        {p.active ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">Actif</span>
                        ) : (
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/50">Pause</span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11.5px] text-white/55">
                        <span>{done}/{p.steps.length} étapes</span>
                        <div className="h-1 flex-1 max-w-[100px] rounded-full bg-white/10 overflow-hidden">
                          <span className="block h-full" style={{ width: `${(done / p.steps.length) * 100}%`, background: p.color }} />
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-white/40" />
                  </button>
                );
              })}
            </div>

            {/* Detail */}
            {selected && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 h-fit sticky top-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-[15.5px] font-semibold text-white">{selected.name}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => toggleActive(selected.id)} className="rounded-lg p-1.5 text-white/60 hover:bg-white/5 hover:text-white">
                      {selected.active ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button onClick={() => remove(selected.id)} className="rounded-lg p-1.5 text-white/60 hover:bg-rose-400/10 hover:text-rose-300"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="space-y-2">
                  {selected.steps.map((s, i) => (
                    <div key={i} className={`flex items-start gap-3 rounded-xl border p-3 ${s.done ? "border-emerald-500/25 bg-emerald-500/[0.05]" : "border-white/10 bg-white/[0.02]"}`}>
                      <button onClick={() => toggleStep(selected.id, i)}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${s.done ? "border-emerald-500 bg-emerald-500" : "border-white/25 bg-transparent"}`}>
                        {s.done && <Check size={11} className="text-navy-900" strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[13px] ${s.done ? "line-through text-white/50" : "text-white"}`}>{s.title}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px]">
                          <span className={`rounded-full px-1.5 py-0.5 ${s.assignee === "IA" ? "bg-blue-500/15 text-blue-300" : "bg-gold/15"}`} style={s.assignee !== "IA" ? { color: GOLD } : {}}>
                            {s.assignee === "IA" ? "🤖 L'Organisateur" : "👤 Toi"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="mt-4 w-full rounded-lg border border-white/15 py-2 text-[12px] text-white/70 hover:border-gold/40 hover:text-white">
                  <Plus size={12} className="inline mr-1" /> Ajouter une étape
                </button>
              </div>
            )}
            {!selected && (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center text-white/50 h-fit">
                <div>
                  <Workflow size={28} className="mx-auto mb-3" style={{ color: GOLD }} />
                  <p className="text-[13px]">Sélectionne un processus pour voir ses étapes</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, fg }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${fg}22` }}>
        <Icon size={16} style={{ color: fg }} />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div>
        <div className="font-display text-[18px] font-semibold" style={{ color: fg }}>{value}</div>
      </div>
    </div>
  );
}
