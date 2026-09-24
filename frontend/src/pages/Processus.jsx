import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Workflow, Plus, Play, Pause, Edit3, Trash2, Users, Package, Truck,
  ClipboardList, Mail, DollarSign, HeadphonesIcon, ArrowRight, Check,
  Circle, ChevronRight, X, Sparkles, FileText, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { fetchProcessus, saveProcessus, creerTache } from "@/lib/kairosApi";

const GOLD = "#DEC2A3";

const STORAGE_KEY = "zayado_processus_v1";

// Modèles proposés (ajoutés seulement si tu les choisis) : aucune étape cochée d'office.
const MODELES = [
  { id: "p1", name: "Onboarding client", icon: "Users", color: "#60a5fa", steps: [
    { title: "Envoi email de bienvenue", assignee: "IA", done: false },
    { title: "Envoi contrat + facture", assignee: "IA", done: false },
    { title: "Création compte + accès", assignee: "Toi", done: false },
    { title: "Kick-off 30 min", assignee: "Toi", done: false },
    { title: "Suivi J+7", assignee: "IA", done: false },
  ], active: true },
  { id: "p2", name: "Prospection commerciale", icon: "Mail", color: "#DEC2A3", steps: [
    { title: "Identification prospect", assignee: "Toi", done: false },
    { title: "Recherche préalable", assignee: "IA", done: false },
    { title: "Premier contact (email)", assignee: "IA", done: false },
    { title: "Relance J+3", assignee: "IA", done: false },
    { title: "Appel de qualification", assignee: "Toi", done: false },
  ], active: true },
  { id: "p3", name: "Facturation mensuelle", icon: "DollarSign", color: "#a3e635", steps: [
    { title: "Compilation heures/prestations", assignee: "IA", done: false },
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

const COULEURS = ["#60a5fa", "#DEC2A3", "#a3e635", "#f472b6", "#a78bfa", "#34d399"];
const nouvelId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// L'ancienne page /app/processus est désormais un onglet du Plan d'action.
export default function Processus() {
  return <Navigate to="/app/actions?tab=processus" replace />;
}

// Contenu de l'onglet « Processus » : chaque étape peut devenir une action
// (page Actions), reliée à l'objectif du processus.
export function ProcessusContenu({ objectifs = [], onActionCreee }) {
  const [processes, setProcesses] = useState([]);
  const [charge, setCharge] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [nouveauNom, setNouveauNom] = useState(null); // null = formulaire fermé
  const [nouvelleEtape, setNouvelleEtape] = useState("");
  const [assignee, setAssignee] = useState("Toi");
  const selected = processes.find((p) => p.id === selectedId) || null;

  useEffect(() => {
    fetchProcessus().then(async (d) => {
      let items = d.items || [];
      // Reprise unique des processus créés avant (stockés dans ce navigateur).
      if (!items.length) {
        try {
          const ancien = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
          if (Array.isArray(ancien) && ancien.length) { items = ancien; await saveProcessus(items); }
          localStorage.removeItem(STORAGE_KEY);
        } catch { /* rien à reprendre */ }
      }
      setProcesses(items);
    }).catch(() => toast.error("Impossible de charger tes processus.")).finally(() => setCharge(true));
  }, []);

  const persist = (p) => {
    const avant = processes;
    setProcesses(p);
    saveProcessus(p).catch(() => { toast.error("Enregistrement impossible, réessaie."); setProcesses(avant); });
  };

  const toggleStep = (pid, idx) => {
    persist(processes.map((p) => p.id === pid ? { ...p, steps: p.steps.map((s, i) => i === idx ? { ...s, done: !s.done } : s) } : p));
  };

  const toggleActive = (pid) => {
    const p = processes.find((x) => x.id === pid);
    persist(processes.map((x) => x.id === pid ? { ...x, active: !x.active } : x));
    toast.success(p.active ? "Processus mis en pause" : "Processus activé");
  };

  const remove = (pid) => {
    if (!window.confirm("Supprimer ce processus ?")) return;
    persist(processes.filter((p) => p.id !== pid));
    if (selectedId === pid) setSelectedId(null);
  };

  const creer = (e) => {
    e.preventDefault();
    const nom = (nouveauNom || "").trim();
    if (!nom) return;
    const p = { id: nouvelId(), name: nom.slice(0, 80), icon: "ClipboardList", color: COULEURS[processes.length % COULEURS.length], steps: [], active: true };
    persist([...processes, p]);
    setNouveauNom(null); setSelectedId(p.id);
  };

  const ajouterModele = (m) => {
    const p = { ...m, id: nouvelId(), steps: m.steps.map((s) => ({ ...s, done: false })), active: true };
    persist([...processes, p]);
    setSelectedId(p.id);
    toast.success(`« ${m.name} » ajouté : adapte les étapes à ta façon de faire.`);
  };

  const ajouterEtape = (e) => {
    e.preventDefault();
    const t = nouvelleEtape.trim();
    if (!t || !selected) return;
    persist(processes.map((p) => p.id === selected.id ? { ...p, steps: [...p.steps, { title: t.slice(0, 160), assignee, done: false }] } : p));
    setNouvelleEtape("");
  };

  const relierObjectif = (objectif_id) => {
    persist(processes.map((p) => p.id === selected.id ? { ...p, objectif_id: objectif_id || null } : p));
  };

  const versAction = async (idx) => {
    const etape = selected.steps[idx];
    try {
      const t = await creerTache(`${etape.title} · ${selected.name}`.slice(0, 300), 25, selected.objectif_id || null);
      persist(processes.map((p) => p.id === selected.id ? { ...p, steps: p.steps.map((s, i) => i === idx ? { ...s, action_id: t.id } : s) } : p));
      toast.success(selected.objectif_id ? "Action créée et reliée à l'objectif" : "Action créée dans tes actions");
      onActionCreee?.();
    } catch { toast.error("Création de l'action impossible"); }
  };

  const retirerEtape = (idx) => {
    persist(processes.map((p) => p.id === selected.id ? { ...p, steps: p.steps.filter((_, i) => i !== idx) } : p));
  };

  const active = processes.filter((p) => p.active).length;
  const totalSteps = processes.reduce((s, p) => s + p.steps.length, 0);
  const doneSteps = processes.reduce((s, p) => s + p.steps.filter((x) => x.done).length, 0);

  return (
    <div data-testid="processus-contenu">
          {/* Hero */}
          <div className="mb-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 sm:p-8">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.24em]" style={{ color: GOLD }}>Automatisation douce</p>
            <h2 className="mt-2 font-display text-[24px] font-semibold leading-tight sm:text-[30px]">
              Chaque processus a un <span className="font-serif-italic italic" style={{ color: GOLD }}>chemin</span>, un rythme.
            </h2>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-white/60">
              Onboarding, prospection, facturation, livraison… Crée tes processus une seule fois, puis coche les étapes au fil de l'eau. Relie un processus à un objectif : chaque étape peut devenir une action qui fait avancer cet objectif.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Stat icon={Workflow} label="Processus actifs" value={active} fg={GOLD} />
              <Stat icon={Check} label="Étapes accomplies" value={`${doneSteps}/${totalSteps}`} fg="#a3e635" />
              <Stat icon={Sparkles} label="Étapes confiées à l'IA" value={`${processes.reduce((s, p) => s + p.steps.filter((x) => x.assignee === "IA").length, 0)}`} fg="#60a5fa" />
            </div>
          </div>

          {/* Grid + Detail */}
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            {/* Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[17px] font-semibold">Mes processus</h2>
                <button onClick={() => setNouveauNom("")} data-testid="processus-nouveau" className="flex items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2 text-[12px] font-semibold text-navy-900">
                  <Plus size={13} /> Nouveau
                </button>
              </div>
              {nouveauNom !== null && (
                <form onSubmit={creer} className="flex gap-2 rounded-2xl border border-gold/30 bg-gold/[0.05] p-3">
                  <input autoFocus value={nouveauNom} onChange={(e) => setNouveauNom(e.target.value)} placeholder="Nom du processus (ex. Onboarding client)"
                    className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[13px] text-white outline-none focus:border-gold/50" data-testid="processus-nom" />
                  <button type="submit" className="rounded-lg bg-gold px-3 text-[12px] font-semibold text-navy-900">Créer</button>
                  <button type="button" onClick={() => setNouveauNom(null)} className="rounded-lg px-2 text-white/60 hover:text-white"><X size={15} /></button>
                </form>
              )}
              {charge && processes.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5" data-testid="processus-vide">
                  <p className="text-[13.5px] text-white/80">Aucun processus pour l'instant.</p>
                  <p className="mt-1 text-[12.5px] text-white/50">Crée le tien, ou pars d'un modèle et adapte-le :</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {MODELES.map((m) => (
                      <button key={m.id} onClick={() => ajouterModele(m)} className="rounded-full border border-white/15 px-3 py-1.5 text-[12px] text-white/80 hover:border-gold/50 hover:text-white" data-testid={`processus-modele-${m.id}`}>
                        <Plus size={11} className="mr-1 inline" />{m.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {processes.map((p) => {
                const Ico = ICON_MAP[p.icon] || Workflow;
                const done = p.steps.filter((s) => s.done).length;
                return (
                  <button key={p.id} onClick={() => setSelectedId(p.id)}
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
                          <span className="block h-full" style={{ width: `${p.steps.length ? (done / p.steps.length) * 100 : 0}%`, background: p.color }} />
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
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 h-fit lg:sticky lg:top-24">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-[15.5px] font-semibold text-white">{selected.name}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => toggleActive(selected.id)} className="rounded-lg p-1.5 text-white/60 hover:bg-white/5 hover:text-white">
                      {selected.active ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button onClick={() => remove(selected.id)} className="rounded-lg p-1.5 text-white/60 hover:bg-rose-400/10 hover:text-rose-300"><Trash2 size={14} /></button>
                  </div>
                </div>
                <label className="mb-4 block">
                  <span className="mb-1 block text-[11px] uppercase tracking-wider text-white/50">Fait avancer l'objectif</span>
                  <select value={selected.objectif_id || ""} onChange={(e) => relierObjectif(e.target.value)} data-testid="processus-objectif"
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[12.5px] text-white outline-none focus:border-gold/50">
                    <option value="" className="bg-navy-800">Aucun objectif</option>
                    {objectifs.filter((o) => o.statut !== "termine" || o.id === selected.objectif_id).map((o) => <option key={o.id} value={o.id} className="bg-navy-800">{o.titre}</option>)}
                  </select>
                </label>
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
                            {s.assignee === "IA" ? "IA prépare" : "Toi"}
                          </span>
                        </div>
                      </div>
                      {s.action_id ? (
                        <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300" title="Une action existe pour cette étape">Action ✓</span>
                      ) : !s.done && (
                        <button onClick={() => versAction(i)} className="shrink-0 rounded-full border border-gold/35 px-2 py-0.5 text-[10.5px] font-semibold text-gold hover:bg-gold/10" data-testid={`processus-vers-action-${i}`} title="Créer une action pour cette étape">→ Action</button>
                      )}
                      <button onClick={() => retirerEtape(i)} className="rounded p-1 text-white/30 hover:text-rose-300" aria-label="Retirer l'étape"><X size={12} /></button>
                    </div>
                  ))}
                </div>
                {!selected.steps.length && <p className="text-[12.5px] text-white/50">Aucune étape : ajoute la première ci-dessous.</p>}
                <form onSubmit={ajouterEtape} className="mt-4 space-y-2">
                  <input value={nouvelleEtape} onChange={(e) => setNouvelleEtape(e.target.value)} placeholder="Nouvelle étape (ex. Relance J+3)"
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[12.5px] text-white outline-none focus:border-gold/50" data-testid="processus-etape" />
                  <div className="flex gap-2">
                    {["Toi", "IA"].map((a) => (
                      <button type="button" key={a} onClick={() => setAssignee(a)} className={`rounded-lg px-3 py-1.5 text-[11.5px] ${assignee === a ? "bg-gold/20 text-gold" : "bg-white/5 text-white/60"}`}>
                        {a === "IA" ? "L'IA prépare" : "Moi"}
                      </button>
                    ))}
                    <button type="submit" className="ml-auto rounded-lg border border-white/15 px-3 py-1.5 text-[12px] text-white/80 hover:border-gold/40 hover:text-white">
                      <Plus size={12} className="mr-1 inline" /> Ajouter une étape
                    </button>
                  </div>
                </form>
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
