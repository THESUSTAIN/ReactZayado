import React, { useState, useEffect, useCallback } from "react";
import TopNav from "@/components/layout/TopNav";
import FloatingBottomBar from "@/components/layout/FloatingBottomBar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import LeafBackdrop from "@/components/dashboard/LeafBackdrop";
import EspacePanel from "@/components/panels/EspacePanel";
import EnergiePanel from "@/components/panels/EnergiePanel";
import CollaborateurPanel from "@/components/panels/CollaborateurPanel";
import { useAuth } from "@/context/AuthContext";
import { visionApi, visionCardsApi, visionBrainApi, dashboardApi, tasksApi } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import useVisionEvents from "@/hooks/useVisionEvents";
import usePageTitle from "@/hooks/usePageTitle";
import useWelcomeModal from "@/hooks/useWelcomeModal";
import WelcomeModal from "@/components/WelcomeModal";
import { toast } from "sonner";
import {
  Eye, Target, TrendingUp, Star, Heart, Quote, Sparkles,
  Plus, Image as ImageIcon, PieChart, ArrowRight, X, Loader2, Pencil, CheckCircle2,
  PenSquare, Type as TypeIcon, Square, Circle as CircleIcon, Trash2, ChevronUp, ChevronDown,
  Upload, Wand2, RefreshCw, AlertTriangle, Link2, Unlink, BarChart3, History, Share2, Copy,
} from "lucide-react";

const TABS = [
  { id: "vision",        label: "Vision",        icon: Eye },
  { id: "objectifs",     label: "Objectifs",     icon: Target },
  { id: "trajectoire",   label: "Trajectoire",   icon: TrendingUp },
  { id: "kpi",           label: "KPI Vision",    icon: BarChart3 },
  { id: "canvas",        label: "Canvas",        icon: PenSquare },
  { id: "flipbook",      label: "Vision Board IA", icon: Sparkles },
];

export default function VisionBoard() {
  usePageTitle("Vision Board");
  const { user } = useAuth();
  const welcome = useWelcomeModal("vision");
  const firstName = user?.first_name || "Julien";
  const [tab, setTab] = useState("vision");
  const [panel, setPanel] = useState(null);
  const [vision, setVision] = useState(null);
  const [loading, setLoading] = useState(false);  // ← non-blocking : on rend la page tout de suite
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [editing, setEditing] = useState(null); // "summary" | "why" | "vision_10y" | "values" | "keywords" | "domains"

  const loadVision = useCallback(async () => {
    try {
      const v = await visionApi.get();
      setVision(v);
    } catch (e) { /* silent — pas de blocage */ }
  }, []);

  useEffect(() => {
    // Parallélisation : on lance les 3 fetch en parallèle sans bloquer le render
    Promise.allSettled([
      visionApi.get().then(setVision),
      dashboardApi.summary().then(setSummary),
      tasksApi.list().then((d) => setTasks(d.items || [])),
    ]).finally(() => setLoading(false));
     
  }, []);

  const patch = async (payload) => {
    const v = await visionApi.patch(payload);
    setVision(v);
    setEditing(null);
    // Fix #1 — widgets dynamiques : si l'objectif change, on régénère le
    // flipbook en tâche de fond avec les métriques à jour (silencieux).
    if ("objective_90d" in payload || "vision_10y" in payload) {
      visionApi.flipbookRefresh().catch(() => {});
    }
  };

  if (false) {
    // Loader désactivé — rendu immédiat (cf. setLoading(false) initial)
    return (
      <div className="min-h-screen canvas-bg grid place-items-center">
        <Loader2 className="animate-spin text-navy" />
      </div>
    );
  }

  return (
    <div className="min-h-screen canvas-bg relative overflow-x-hidden">
      <TopNav onOpenChat={() => setPanel("collaborateur")} />
      <LeafBackdrop />

      <main className="relative z-10 pt-[100px] pb-48 px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1400px]">
          {/* Header */}
          <section className="mb-8 rise" data-testid="vision-header">
            <h1 className="font-display text-[36px] md:text-[44px] leading-[1.1] text-navy">
              Vision <span className="font-serif-italic text-gold-deep">Board</span>
            </h1>
            <p className="mt-3 text-ink-soft text-[15px]">Clarifiez votre vision et votre pourquoi.</p>
          </section>

          {/* Tabs */}
          <div className="mb-8 inline-flex bg-white/85 backdrop-blur-sm border border-sand-200 rounded-full p-1.5 shadow-soft flex-wrap gap-1" data-testid="vision-tabs">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  data-testid={`vision-tab-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-2 px-5 h-11 rounded-full text-[13.5px] font-medium transition-all ${
                    isActive ? "bg-navy text-cream shadow-soft" : "text-ink hover:bg-cream-soft"
                  }`}
                >
                  <Icon size={15} strokeWidth={1.8} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === "vision" && (
            <VisionTab vision={vision} patch={patch} editing={editing} setEditing={setEditing} onReload={loadVision} />
          )}
          {tab === "objectifs" && (
            <ObjectifsTab vision={vision} summary={summary} tasks={tasks} patch={patch} editing={editing} setEditing={setEditing} />
          )}
          {tab === "trajectoire" && (
            <TrajectoireTab vision={vision} summary={summary} />
          )}
          {tab === "kpi" && (
            <KpiVisionTab />
          )}
          {tab === "canvas" && (
            <CanvasTab />
          )}
          {tab === "flipbook" && (
            <FlipbookTab user={user} />
          )}
        </div>
      </main>

      <FloatingBottomBar activePanel={panel} onOpen={(id) => setPanel(id)} />
      <MobileBottomNav />
      <EspacePanel open={panel === "espace"} onClose={() => setPanel(null)} />
      <EnergiePanel open={panel === "energie"} onClose={() => setPanel(null)} onSave={() => setPanel(null)} />
      <CollaborateurPanel open={panel === "collaborateur"} onClose={() => setPanel(null)} context="Vision Board" userFirstName={firstName} />
      <WelcomeModal open={welcome.show} onClose={welcome.close} {...(welcome.content || {})} />
    </div>
  );
}

/* ─────────────────── Tab : VISION ─────────────────── */
function VisionTab({ vision, patch, editing, setEditing, onReload }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {/* Ma Vision Globale */}
        <EditableCard
          testid="card-vision-globale"
          eyebrow={{ icon: Sparkles, label: "Ma Vision Globale" }}
          isEditing={editing === "summary"}
          onEdit={() => setEditing("summary")}
          onCancel={() => setEditing(null)}
          onSave={(val) => patch({ summary: val })}
          field="summary"
          initialValue={vision?.summary || ""}
          placeholder="Décrivez votre vision en 2-3 lignes…"
          multiline
        >
          <Quote className="text-navy/15 mt-4 mb-2" size={28} />
          {vision?.summary ? (
            <p className="text-ink leading-relaxed text-[15px] whitespace-pre-line" data-testid="vision-summary-text">{vision.summary}</p>
          ) : (
            <p className="text-ink-soft italic text-[14px]">Aucune vision encore enregistrée — cliquez sur ✎ pour commencer.</p>
          )}
          {vision?.objective_90d && (
            <p className="mt-4 text-[12.5px] text-gold-deep italic">
              <Sparkles size={11} className="inline mr-1" /> Cap 90 jours : {vision.objective_90d}
            </p>
          )}
        </EditableCard>

        {/* Mon Pourquoi (valeurs) */}
        <EditableCard
          testid="card-pourquoi"
          eyebrow={{ icon: Heart, label: "Mon Pourquoi" }}
          isEditing={editing === "values"}
          onEdit={() => setEditing("values")}
          onCancel={() => setEditing(null)}
          onSave={(val) => patch({ values: val })}
          field="values"
          initialValue={vision?.values || []}
          customEditor={ValuesEditor}
        >
          <p className="text-[12.5px] text-ink-soft mt-3 mb-4">Ce qui me motive chaque jour.</p>
          <ul className="space-y-4">
            {(vision?.values || []).map((v, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-2xl shrink-0 leading-none mt-0.5">{v.icon}</span>
                <div className="flex-1">
                  <p className="font-display text-[15.5px] text-navy">{v.label}</p>
                  <p className="text-[13px] text-ink-soft leading-snug mt-0.5">{v.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </EditableCard>

        {/* Vision en 1 phrase + 10 ans + Mots-clés */}
        <div className="card-cream p-7 rise" data-testid="card-vision-phrase">
          <Eyebrow icon={Quote} label="Ma Vision en 1 Phrase" />
          <EditableInline
            multiline
            field="why"
            value={vision?.why}
            placeholder="Je construis…"
            onSave={(val) => patch({ why: val })}
            editing={editing === "why"}
            onEdit={() => setEditing("why")}
            onCancel={() => setEditing(null)}
          >
            {vision?.why ? (
              <p className="font-display text-[18px] leading-snug text-navy" data-testid="vision-why-text">{vision.why}</p>
            ) : (
              <p className="text-ink-soft italic">Ajoutez votre phrase de vision.</p>
            )}
          </EditableInline>

          <div className="mt-5">
            <Eyebrow icon={TrendingUp} label="Vision à 10 ans" small />
            <EditableInline
              multiline
              field="vision_10y"
              value={vision?.vision_10y}
              placeholder="En 2036…"
              onSave={(val) => patch({ vision_10y: val })}
              editing={editing === "vision_10y"}
              onEdit={() => setEditing("vision_10y")}
              onCancel={() => setEditing(null)}
            >
              <p className="text-[13px] text-ink-soft leading-relaxed mt-2">{vision?.vision_10y || <span className="italic">Décrivez votre vision à 10 ans.</span>}</p>
            </EditableInline>
          </div>

          <div className="mt-5">
            <p className="text-[10.5px] tracking-[0.22em] uppercase text-ink-soft font-semibold mb-2">Mots-clés</p>
            <KeywordsEditor
              keywords={vision?.keywords || []}
              editing={editing === "keywords"}
              onEdit={() => setEditing("keywords")}
              onCancel={() => setEditing(null)}
              onSave={(val) => patch({ keywords: val })}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Board */}
        <div className="md:col-span-2 card-cream p-7 rise" data-testid="card-board">
          <Eyebrow icon={ImageIcon} label="Mon Vision Board" />
          <p className="text-[12.5px] text-ink-soft mt-1 mb-4">Les images qui représentent votre vision.</p>
          <BoardEditor
            board={vision?.board || []}
            editing={editing === "board"}
            onEdit={() => setEditing("board")}
            onCancel={() => setEditing(null)}
            onSave={(val) => patch({ board: val })}
            onReload={onReload}
          />
        </div>

        {/* Domaines */}
        <div className="card-cream p-7 rise" data-testid="card-domains">
          <div className="flex items-center justify-between">
            <Eyebrow icon={PieChart} label="Vision par domaines" />
            <button onClick={() => setEditing("domains")} className="text-navy/60 hover:text-navy" data-testid="edit-domains-btn">
              <Pencil size={14} />
            </button>
          </div>
          {editing === "domains" ? (
            <DomainsEditor
              domains={vision?.domains || []}
              onSave={(val) => patch({ domains: val })}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <ul className="space-y-3.5 mt-4">
              {(vision?.domains || []).map((d) => (
                <li key={d.label}>
                  <div className="flex items-center justify-between text-[13px] mb-1.5">
                    <span className="text-ink">{d.label}</span>
                    <span className="font-semibold text-navy tabular-nums">{d.value}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-sand-200 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-navy to-navy-bright rounded-full transition-all" style={{ width: `${d.value}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────── Tab : OBJECTIFS ─────────────────── */
function ObjectifsTab({ vision, summary, patch, editing, setEditing }) {
  const ca = summary?.pilotage?.ca_month_eur || 0;
  const objective = summary?.pilotage?.objective_eur || 10000;
  const caPct = Math.min(100, Math.round((ca / objective) * 100));
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="card-cream p-7" data-testid="objectif-90d">
        <Eyebrow icon={Target} label="Objectif 90 jours" />
        <EditableInline
          field="objective_90d"
          value={vision?.objective_90d}
          placeholder="Ex : Acquérir 10 nouveaux clients en 90 jours"
          onSave={(val) => patch({ objective_90d: val })}
          editing={editing === "objective_90d"}
          onEdit={() => setEditing("objective_90d")}
          onCancel={() => setEditing(null)}
        >
          <p className="text-[20px] font-display text-navy mt-3">{vision?.objective_90d || <span className="italic text-ink-soft">Non défini</span>}</p>
        </EditableInline>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <KpiTile label="Missions" value={`${summary?.missions?.done || 0}/${summary?.missions?.total || 0}`} />
          <KpiTile label="CA mois" value={`${new Intl.NumberFormat("fr-FR").format(ca)} €`} />
          <KpiTile label="Prospects" value={summary?.developpement?.prospects || 0} />
        </div>
      </div>

      <div className="card-cream p-7" data-testid="objectif-annuel">
        <Eyebrow icon={TrendingUp} label="Objectif financier annuel" />
        <p className="text-[36px] font-display text-navy mt-3 leading-none">
          {new Intl.NumberFormat("fr-FR").format(objective * 12)} <span className="text-gold-deep">€</span>
        </p>
        <p className="text-[12.5px] text-ink-soft mt-2">Estimation basée sur l&apos;objectif mensuel courant.</p>
        <div className="mt-5">
          <div className="flex items-center justify-between text-[12.5px] mb-1.5">
            <span className="text-ink-soft">Avancement mois</span>
            <span className="font-semibold text-navy">{caPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-sand-200 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-navy to-navy-bright rounded-full" style={{ width: `${caPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Tab : ANALYSE ─────────────────── */
/* ─────────────────── Tab : TRAJECTOIRE ─────────────────── */
function TrajectoireTab({ vision, summary }) {
  const milestones = [
    { date: "Aujourd'hui",   label: "Position actuelle",                achieved: true,  detail: `${summary?.missions?.done || 0} missions accomplies` },
    { date: "90 jours",      label: vision?.objective_90d || "Objectif 90 jours à définir", achieved: false },
    { date: "1 an",          label: "Atteindre la rentabilité visée",   achieved: false },
    { date: "10 ans",        label: vision?.vision_10y || "Vision à 10 ans à définir",  achieved: false },
  ];
  return (
    <div className="card-cream p-7" data-testid="trajectoire">
      <Eyebrow icon={TrendingUp} label="Trajectoire" />
      <ol className="mt-6 relative border-l-2 border-sand-200 pl-8 space-y-8">
        {milestones.map((m, i) => (
          <li key={i} className="relative">
            <span className={`absolute -left-[40px] w-6 h-6 rounded-full grid place-items-center ${m.achieved ? "bg-navy text-cream" : "bg-cream-soft border-2 border-sand-200 text-ink-soft"}`}>
              {m.achieved ? <CheckCircle2 size={12} /> : <span className="w-1.5 h-1.5 bg-ink-muted rounded-full" />}
            </span>
            <p className="text-[10.5px] tracking-[0.22em] uppercase text-gold-deep font-semibold">{m.date}</p>
            <p className="font-display text-[18px] text-navy mt-1">{m.label}</p>
            {m.detail && <p className="text-[13px] text-ink-soft mt-1">{m.detail}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ─────────────────── KPI Vision — historique + prévision (backlog #21) ───────────────────
   La prévision (pointillés) est une simple régression linéaire côté backend
   sur les points d'historique existants — présentée explicitement comme une
   projection, jamais comme une donnée réelle (légende dédiée, style visuel
   différent). Aucune projection tant qu'il y a moins de 3 points d'historique. */
function KpiVisionTab() {
  const [state, setState] = useState({ loading: true, history: [], forecast: [], has_data: false });

  useEffect(() => {
    let alive = true;
    visionBrainApi.scoreHistory(90)
      .then((d) => { if (alive) setState({ loading: false, ...d }); })
      .catch(() => { if (alive) setState({ loading: false, history: [], forecast: [], has_data: false }); });
    return () => { alive = false; };
  }, []);

  if (state.loading) {
    return <div className="card-cream p-7" data-testid="kpi-vision-loading"><p className="text-ink-soft text-[13px]">Chargement…</p></div>;
  }

  if (!state.has_data) {
    return (
      <div className="card-cream p-7" data-testid="kpi-vision-empty">
        <Eyebrow icon={BarChart3} label="KPI Vision" />
        <p className="text-[13px] text-ink-soft mt-4">
          Pas encore assez d'historique pour un graphe. Votre Score Business est
          enregistré une fois par jour à chaque visite du Panneau IA — revenez
          dans quelques jours pour voir votre courbe se dessiner.
        </p>
      </div>
    );
  }

  const chartData = [
    ...state.history.map((h) => ({ date: h.date, réel: h.score })),
    ...(state.forecast || []).map((f) => ({ date: f.date, projection: f.score })),
  ];
  if (state.forecast?.length && state.history.length) {
    const last = state.history[state.history.length - 1];
    const anchorIdx = chartData.findIndex((d) => d.date === last.date);
    if (anchorIdx >= 0) chartData[anchorIdx].projection = last.score;
  }

  return (
    <div className="card-cream p-7" data-testid="kpi-vision-tab">
      <Eyebrow icon={BarChart3} label="KPI Vision" />
      <p className="text-[13px] text-ink-soft mt-2 mb-6">
        Évolution de votre Score Business sur {state.history.length} jour{state.history.length > 1 ? "s" : ""} d'historique
        {state.forecast?.length ? ", avec une projection à 30 jours (tendance linéaire, pas une garantie)." : "."}
      </p>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EFE8D7" />
            <XAxis dataKey="date" tick={{ fontSize: 10.5 }} minTickGap={30} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10.5 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="réel" name="Score réel" stroke="#1A3A6E" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="projection" name="Projection" stroke="#C9A449" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─────────────────── Helpers ─────────────────── */
function Eyebrow({ icon: Icon, label, small }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={small ? 13 : 15} strokeWidth={1.8} className="text-navy" />
      <p className={`uppercase ${small ? "text-[10px]" : "text-[11px]"} tracking-[0.22em] font-semibold text-navy`}>{label}</p>
    </div>
  );
}

function KpiTile({ label, value }) {
  return (
    <div className="p-3 rounded-2xl bg-cream-soft border border-sand-200">
      <p className="text-[10px] tracking-[0.22em] uppercase text-ink-soft">{label}</p>
      <p className="font-display text-[20px] text-navy mt-1">{value}</p>
    </div>
  );
}

function EditableCard({ testid, eyebrow, children, isEditing, onEdit, onCancel, onSave, field, initialValue, placeholder, multiline, customEditor: CustomEditor }) {
  // Bug #11/#13 : scroll la card en vue au clic Modifier pour éviter que les boutons
  // Enregistrer/Annuler soient cachés par la FloatingBottomBar
  const cardRef = React.useRef(null);
  const handleEdit = () => {
    onEdit();
    setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  };
  return (
    <div ref={cardRef} className="card-cream p-7 rise" data-testid={testid}>
      <div className="flex items-center justify-between">
        <Eyebrow icon={eyebrow.icon} label={eyebrow.label} />
        {!isEditing && (
          <button onClick={handleEdit} className="text-navy/60 hover:text-navy" data-testid={`edit-${field}-btn`}>
            <Pencil size={14} />
          </button>
        )}
      </div>
      {isEditing ? (
        <EditableCardEditor
          key={`editor-${field}`}
          field={field}
          initialValue={initialValue}
          placeholder={placeholder}
          multiline={multiline}
          CustomEditor={CustomEditor}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : children}
    </div>
  );
}

function EditableCardEditor({ field, initialValue, placeholder, multiline, CustomEditor, onSave, onCancel }) {
  const [value, setValue] = useState(initialValue);
  return (
    <>
      {CustomEditor ? (
        <CustomEditor value={value} onChange={setValue} />
      ) : multiline ? (
        <textarea
          data-testid={`edit-${field}-input`}
          value={value || ""}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          rows={5}
          className="mt-4 w-full bg-white border border-sand-200 rounded-2xl p-4 text-[14px] text-ink focus:outline-none focus:border-navy/40"
        />
      ) : (
        <input
          data-testid={`edit-${field}-input`}
          value={value || ""}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="mt-4 w-full bg-white border border-sand-200 rounded-2xl px-4 py-3 text-[14px] text-ink focus:outline-none focus:border-navy/40"
        />
      )}
      <div className="mt-4 mb-6 flex gap-2">
        <button onClick={() => onSave(value)} data-testid={`save-${field}-btn`} className="flex-1 px-4 h-10 rounded-full bg-navy text-cream text-[13px] font-semibold hover:bg-navy-bright transition">Enregistrer</button>
        <button onClick={onCancel} className="px-4 h-10 rounded-full bg-cream-soft text-ink text-[13px] font-medium hover:bg-sand-200 transition">Annuler</button>
      </div>
    </>
  );
}

function EditableInline({ children, value, placeholder, onSave, editing, onEdit, onCancel, field, multiline }) {
  if (!editing) {
    return (
      <div className="group relative mt-4 p-4 rounded-2xl bg-cream-soft border border-sand-200">
        {children}
        <button onClick={onEdit} data-testid={`edit-inline-${field}`} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition text-navy/60 hover:text-navy">
          <Pencil size={13} />
        </button>
      </div>
    );
  }
  return (
    <EditableInlineEditor key={`inline-${field}`} field={field} value={value} placeholder={placeholder} multiline={multiline} onSave={onSave} onCancel={onCancel} />
  );
}

function EditableInlineEditor({ field, value, placeholder, multiline, onSave, onCancel }) {
  const [v, setV] = useState(value || "");
  return (
    <div className="mt-3 space-y-2">
      {multiline ? (
        <textarea data-testid={`edit-inline-input-${field}`} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} rows={3} className="w-full bg-white border border-sand-200 rounded-2xl p-3 text-[14px] text-ink focus:outline-none focus:border-navy/40" />
      ) : (
        <input data-testid={`edit-inline-input-${field}`} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="w-full bg-white border border-sand-200 rounded-2xl px-3 py-2 text-[14px] text-ink focus:outline-none focus:border-navy/40" />
      )}
      <div className="flex gap-2">
        <button onClick={() => onSave(v)} data-testid={`save-inline-${field}`} className="px-4 h-9 rounded-full bg-navy text-cream text-[12px] font-semibold">Enregistrer</button>
        <button onClick={onCancel} className="px-4 h-9 rounded-full bg-cream-soft text-ink text-[12px]">Annuler</button>
      </div>
    </div>
  );
}

function ValuesEditor({ value, onChange }) {
  const items = Array.isArray(value) ? value : [];
  const update = (i, patch) => onChange(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const add = () => onChange([...items, { icon: "✨", label: "Nouvelle valeur", desc: "" }]);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div className="mt-4 space-y-3">
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-2 p-3 rounded-2xl bg-cream-soft border border-sand-200">
          <input value={it.icon} onChange={(e) => update(i, { icon: e.target.value })} className="w-12 text-center text-2xl bg-white rounded-lg border border-sand-200" maxLength={2} />
          <div className="flex-1 space-y-1.5">
            <input value={it.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Nom" className="w-full bg-white border border-sand-200 rounded-lg px-3 py-1.5 text-[14px]" />
            <input value={it.desc} onChange={(e) => update(i, { desc: e.target.value })} placeholder="Description" className="w-full bg-white border border-sand-200 rounded-lg px-3 py-1.5 text-[13px]" />
          </div>
          <button onClick={() => remove(i)} className="text-rose-600 hover:bg-rose-50 p-1 rounded"><X size={14} /></button>
        </div>
      ))}
      <button onClick={add} className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-2xl border-2 border-dashed border-sand-300 text-ink-soft hover:border-navy/40 hover:text-navy">
        <Plus size={14} /> Ajouter une valeur
      </button>
    </div>
  );
}

function KeywordsEditor({ keywords, editing, onEdit, onCancel, onSave }) {
  if (!editing) {
    return (
      <div className="group relative">
        <div className="flex flex-wrap gap-2">
          {keywords.map((k) => (
            <span key={k} className="px-3 py-1 rounded-full bg-cream-soft border border-sand-200 text-[12px] text-navy font-medium">{k}</span>
          ))}
        </div>
        <button onClick={onEdit} className="absolute -top-1 right-0 opacity-0 group-hover:opacity-100 transition text-navy/60 hover:text-navy" data-testid="edit-keywords">
          <Pencil size={12} />
        </button>
      </div>
    );
  }
  return <KeywordsEditorActive key="kwds-edit" initial={keywords} onSave={onSave} onCancel={onCancel} />;
}

function KeywordsEditorActive({ initial, onSave, onCancel }) {
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {items.map((k, i) => (
          <span key={k} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cream-soft border border-sand-200 text-[12px] text-navy font-medium">
            {k}
            <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-rose-500"><X size={11} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { setItems([...items, draft.trim()]); setDraft(""); } }} placeholder="+ mot-clé" className="flex-1 bg-white border border-sand-200 rounded-full px-3 py-1.5 text-[12px]" />
        <button onClick={() => onSave(items)} className="px-3 py-1.5 rounded-full bg-navy text-cream text-[12px] font-semibold">OK</button>
        <button onClick={onCancel} className="px-3 py-1.5 rounded-full bg-cream-soft text-ink text-[12px]">Annuler</button>
      </div>
    </div>
  );
}

function DomainsEditor({ domains, onSave, onCancel }) {
  const [items, setItems] = useState(domains);
  return (
    <div className="mt-4 space-y-3">
      {items.map((d, i) => (
        <div key={d.label} className="space-y-1.5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-ink">{d.label}</span>
            <span className="font-semibold text-navy">{d.value}%</span>
          </div>
          <input type="range" min={0} max={100} value={d.value} onChange={(e) => setItems(items.map((it, idx) => idx === i ? { ...it, value: Number(e.target.value) } : it))} className="w-full slider-zen" data-testid={`domain-slider-${i}`} />
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <button onClick={() => onSave(items)} className="flex-1 px-4 h-10 rounded-full bg-navy text-cream text-[13px] font-semibold">Enregistrer</button>
        <button onClick={onCancel} className="px-4 h-10 rounded-full bg-cream-soft text-ink text-[13px]">Annuler</button>
      </div>
    </div>
  );
}

function BoardEditor({ board, editing, onEdit, onCancel, onSave, onReload }) {
  if (!editing) {
    return <BoardDisplay board={board} onEdit={onEdit} onDelete={(id) => visionApi.boardDelete(id).then(onReload)} onTransform={onReload} />;
  }
  return <BoardEditorActive key="board-edit" initial={board} onSave={onSave} onCancel={onCancel} onReload={onReload} />;
}

function BoardDisplay({ board, onEdit, onDelete, onTransform }) {
  const [transforming, setTransforming] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  const doTransform = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    try {
      await visionApi.boardTransform({ item_id: transforming, prompt: prompt.trim() });
      setTransforming(null);
      setPrompt("");
      onTransform && onTransform();
    } catch (e) {
      alert("Échec : " + (e?.detail || e?.message || "génération impossible"));
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {board.map((it) => (
          <div key={it.id || it.src} className="relative overflow-hidden rounded-2xl aspect-[3/4] group">
            <img src={it.src} alt={it.label} loading="lazy" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/10 to-transparent" />
            <p className="absolute bottom-2 left-2 right-2 text-cream text-[11.5px] font-semibold leading-tight">{it.label}</p>
            {it.id && (
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                {it.src?.startsWith("data:") && (
                  <button onClick={() => setTransforming(it.id)} title="Transformer avec l'IA" className="bg-gold text-navy rounded-full w-7 h-7 grid place-items-center hover:scale-110 transition">
                    <Sparkles size={12} />
                  </button>
                )}
                <button onClick={() => onDelete(it.id)} title="Supprimer" className="bg-rose-600/90 text-white rounded-full w-7 h-7 grid place-items-center hover:scale-110 transition">
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
        <button onClick={onEdit} data-testid="edit-board-btn" className="flex flex-col items-center justify-center gap-2 rounded-2xl aspect-[3/4] border-2 border-dashed border-sand-300 text-ink-soft hover:border-navy/40 hover:text-navy transition-colors">
          <Plus size={28} strokeWidth={1.5} />
          <span className="text-[11.5px] font-medium">Ajouter<br />une image</span>
        </button>
      </div>

      {transforming && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm grid place-items-center p-4">
          <div className="bg-cream rounded-3xl p-7 max-w-md w-full border border-sand-200 shadow-soft">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="text-gold-deep" size={18} />
              <p className="font-display text-[20px] text-navy">Transformer cette image</p>
            </div>
            <p className="text-[13px] text-ink-soft mb-4">Demandez à l&apos;IA ce qu&apos;elle doit modifier.</p>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ex : ajoute des montagnes au loin, rends l&apos;ambiance plus luminious…" rows={4} className="w-full bg-white border border-sand-200 rounded-2xl p-3 text-[14px] text-ink focus:outline-none focus:border-navy/40" data-testid="transform-prompt" />
            <div className="mt-4 mb-6 flex gap-2">
              <button onClick={doTransform} disabled={busy || !prompt.trim()} className="flex-1 px-4 h-11 rounded-full bg-navy text-cream text-[13px] font-semibold disabled:opacity-50" data-testid="transform-submit">
                {busy ? <Loader2 size={14} className="animate-spin inline" /> : "Transformer"}
              </button>
              <button onClick={() => { setTransforming(null); setPrompt(""); }} className="px-4 h-11 rounded-full bg-cream-soft text-ink text-[13px] font-medium">Annuler</button>
            </div>
          </div>
        </div>
      )}

      <p className="mt-4 text-[11.5px] text-ink-soft italic">
        <Sparkles size={11} className="inline mr-1 text-gold-deep" />
        Conseil : survolez une image générée par l&apos;IA pour la transformer ou la supprimer.
      </p>
    </>
  );
}

function BoardEditorActive({ initial, onSave, onCancel, onReload }) {
  const [items, setItems] = useState(initial);
  const [mode, setMode] = useState("ia"); // "ia" | "url"
  const [prompt, setPrompt] = useState("");
  const [label, setLabel] = useState("");
  const [draftSrc, setDraftSrc] = useState("");
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    try {
      const r = await visionApi.boardGenerate({ prompt: prompt.trim(), label: label.trim() || prompt.slice(0, 60) });
      // r.item is the new entry, also persisted server-side. Refresh from server via onReload.
      setItems([...items, r.item]);
      setPrompt(""); setLabel("");
      onReload && onReload();
    } catch (e) {
      alert("Échec : " + (e?.detail || e?.message || "génération impossible"));
    } finally { setBusy(false); }
  };

  const addUrl = () => {
    if (!draftSrc.trim()) return;
    setItems([...items, { id: "local-" + Date.now(), src: draftSrc.trim(), label: label.trim() || "Image" }]);
    setDraftSrc(""); setLabel("");
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {items.map((it, i) => (
          <div key={it.id || it.src || i} className="relative overflow-hidden rounded-2xl aspect-[3/4] group">
            <img src={it.src} alt={it.label} loading="lazy" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/10 to-transparent" />
            <p className="absolute bottom-2 left-2 right-2 text-cream text-[11.5px] font-semibold leading-tight">{it.label}</p>
            <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 bg-rose-600/90 text-white rounded-full w-7 h-7 grid place-items-center">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-5 p-5 rounded-2xl bg-cream-soft border border-sand-200">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setMode("ia")} data-testid="board-mode-ia" className={`px-4 h-9 rounded-full text-[12.5px] font-semibold transition ${mode === "ia" ? "bg-navy text-cream" : "bg-white border border-sand-200 text-ink"}`}>
            <Sparkles size={12} className="inline mr-1" /> Générer avec l&apos;IA
          </button>
          <button onClick={() => setMode("url")} data-testid="board-mode-url" className={`px-4 h-9 rounded-full text-[12.5px] font-semibold transition ${mode === "url" ? "bg-navy text-cream" : "bg-white border border-sand-200 text-ink"}`}>
            <ImageIcon size={12} className="inline mr-1" /> Coller une URL
          </button>
        </div>

        {mode === "ia" ? (
          <div className="space-y-2">
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Décrivez l&apos;image que vous voulez. Ex : une vue cinématique d&apos;une maison au bord de l&apos;océan au coucher de soleil" rows={3} className="w-full bg-white border border-sand-200 rounded-2xl p-3 text-[14px] text-ink focus:outline-none focus:border-navy/40" data-testid="board-ia-prompt" />
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Légende (optionnel)" className="w-full bg-white border border-sand-200 rounded-lg px-3 py-2 text-[13px]" />
            <div className="flex gap-2">
              <button onClick={generate} disabled={busy || !prompt.trim()} className="flex-1 px-4 h-10 rounded-full bg-gold text-navy text-[13px] font-semibold disabled:opacity-50" data-testid="board-ia-generate">
                {busy ? <><Loader2 size={14} className="animate-spin inline" /> Génération en cours… (10-30s)</> : <><Sparkles size={14} className="inline mr-1" /> Générer l&apos;image</>}
              </button>
              <button onClick={() => onSave(items)} className="px-4 h-10 rounded-full bg-navy text-cream text-[13px] font-semibold" data-testid="save-board-btn">Terminer</button>
              <button onClick={onCancel} className="px-4 h-10 rounded-full bg-white border border-sand-200 text-ink text-[13px]">Annuler</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <input value={draftSrc} onChange={(e) => setDraftSrc(e.target.value)} placeholder="https://..." className="w-full bg-white border border-sand-200 rounded-lg px-3 py-2 text-[13px]" data-testid="board-src-input" />
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Légende" className="w-full bg-white border border-sand-200 rounded-lg px-3 py-2 text-[13px]" />
            <div className="flex gap-2">
              <button onClick={addUrl} className="px-4 h-10 rounded-full bg-navy text-cream text-[13px] font-semibold">+ Ajouter</button>
              <button onClick={() => onSave(items)} className="flex-1 px-4 h-10 rounded-full bg-gold text-navy text-[13px] font-semibold" data-testid="save-board-btn">Enregistrer le board</button>
              <button onClick={onCancel} className="px-4 h-10 rounded-full bg-white border border-sand-200 text-ink text-[13px]">Annuler</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   CanvasTab — Canvas WYSIWYG libre (drag & drop, texte, formes, calques)
   Remplace la simple grille d'upload par un vrai éditeur repositionnable.
   ───────────────────────────────────────────────────────────────── */

// Cartes "aggregate" du modèle unifié (backend: routes/vision_cards.py) → module
// cible au clic. Même mapping que LiveCardsStrip.jsx (routage cohérent).
const AGGREGATE_MODULE = { ca_month: "pilotage", wellness_latest: "bien-etre", prospects_count: "croissance" };

/**
 * Trouve un emplacement libre (sans chevauchement) pour une carte de taille
 * (w × h) sur le canvas, en balayant une grille et en testant contre les
 * rectangles des éléments déjà posés. Fallback : empile sous le plus bas
 * élément existant plutôt que d'échouer silencieusement.
 */
function findFreeSlot(existingRects, w, h, canvasW = 900, canvasH = 620, step = 24) {
  const overlaps = (x, y) =>
    existingRects.some((r) => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y);
  for (let y = 20; y + h <= canvasH - 10; y += step) {
    for (let x = 20; x + w <= canvasW - 20; x += step) {
      if (!overlaps(x, y)) return { x, y };
    }
  }
  const maxY = existingRects.length ? Math.max(...existingRects.map((r) => r.y + r.h)) : 0;
  return { x: 20, y: maxY + 20 };
}

/* Traduit une VisionCard (backend) en élément canvas plat pour le rendu. */
function cardToElement(c) {
  const style = c.style || {};
  return {
    id: c.id, entity_type: c.entity_type || null, entity_id: c.entity_id || null,
    card_type: c.card_type, title: c.title, content: c.manual_content,
    live: !!c.live, orphan: !!c.orphan,
    label: c.label, value: c.value, sub: c.sub, progress: c.progress,
    x: c.x ?? 40, y: c.y ?? 40, width: c.width ?? 180, height: c.height ?? 180,
    rotation: c.rotation || 0, z: c.z || 0,
    connections: Array.isArray(c.connections) ? c.connections : [],
    color: style.color, font_size: style.font_size, font_family: style.font_family,
    src: style.src, shape: style.shape, fill: style.fill, stroke: style.stroke,
  };
}

// Positions par défaut posées par migrate-legacy pour les 3 cartes agrégées —
// sert à détecter si l'utilisateur les a déjà déplacées (voir autoPoseCards).
const DEFAULT_AGG_POS = { ca_month: { x: 40, y: 40 }, wellness_latest: { x: 300, y: 40 }, prospects_count: { x: 560, y: 40 } };

/* ─────────────────────────────────────────────────────────────────
   CanvasTab — persistance : modèle unifié par carte (backlog #1 → #3).
   Chaque élément du canvas EST une ligne `vision_cards` en base (plus de
   blob JSON global `/vision/board/canvas` pour les éléments — cet ancien
   endpoint reste utilisé UNIQUEMENT pour la couleur de fond, qui n'a pas
   encore sa propre colonne). Conséquences :
     - create/update/delete individuels via visionCardsApi, plus de PUT
       global à chaque frappe : moins de risque d'écraser une modif faite
       depuis un autre onglet/appareil entre-temps.
     - les cartes "aggregate" (CA/Bien-être/Prospects) sont résolues en
       direct par le backend à chaque `list()` : plus besoin d'un type
       `smart_card` séparé côté client, une carte "live" est juste une
       VisionCard avec `entity_type` renseigné.
     - rafraîchissement multi-onglets via SSE (`useVisionEvents`) : les
       valeurs live (label/value/sub/progress) se mettent à jour toutes
       seules sans toucher aux positions en cours d'édition locale.
   ───────────────────────────────────────────────────────────────── */
function CanvasTab() {
  const [elements, setElements] = useState([]);
  const [background, setBackground] = useState("#FAF8F3");
  const [selected, setSelected] = useState(null);
  const [linking, setLinking] = useState(null); // id de la carte source en cours de liaison
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoPosing, setAutoPosing] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  // Historique / versioning (backlog #22)
  const [historyOpen, setHistoryOpen] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  // Partage public (backlog #23)
  const [shareOpen, setShareOpen] = useState(false);
  const [publicStatus, setPublicStatus] = useState({ enabled: false, slug: null });
  const [togglingShare, setTogglingShare] = useState(false);
  const dragRef = React.useRef(null); // { id, offsetX, offsetY, mode: "move"|"resize" }
  const fileInputRef = React.useRef(null);
  const surfaceRef = React.useRef(null);
  const patchTimers = React.useRef({});   // id -> timeout du debounce d'update
  const pendingPatch = React.useRef({});  // id -> patch backend accumulé en attente d'envoi
  const activeSaves = React.useRef(0);
  const bgSaveTimer = React.useRef(null);

  const beginSave = () => { activeSaves.current += 1; setSaving(true); };
  const endSave = () => { activeSaves.current = Math.max(0, activeSaves.current - 1); if (activeSaves.current === 0) setSaving(false); };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // Idempotent : ne recrée rien si ce board a déjà des vision_cards.
        await visionCardsApi.migrateLegacy().catch(() => {});
        const [cardsRes, boardMeta] = await Promise.all([
          visionCardsApi.list().catch(() => ({ cards: [] })),
          visionApi.canvasGet().catch(() => ({})),
        ]);
        if (!alive) return;
        setElements((cardsRes.cards || []).map(cardToElement));
        setBackground(boardMeta?.background || "#FAF8F3");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* Rafraîchit uniquement les valeurs live (label/value/sub/progress/orphan)
     des cartes liées à une entité — jamais x/y/width/height, pour ne jamais
     entrer en conflit avec un drag/resize en cours localement. Appelé au
     clic sur "Rafraîchir" ET automatiquement via SSE (tick / card_update). */
  const refreshLive = useCallback(async () => {
    try {
      const { cards = [] } = await visionCardsApi.list();
      const byId = new Map(cards.map((c) => [c.id, c]));
      setElements((prev) => prev.map((el) => {
        const c = byId.get(el.id);
        if (!c) return el; // supprimée côté serveur entre-temps : nettoyée au prochain montage
        return { ...el, live: !!c.live, orphan: !!c.orphan, label: c.label, value: c.value, sub: c.sub, progress: c.progress };
      }));
    } catch { /* silencieux : ce n'est qu'un rafraîchissement best-effort */ }
  }, []);

  // Temps réel multi-onglets (backlog #2) : dès qu'une VisionCard change côté
  // serveur (autre onglet, mobile...), ou toutes les 60s par sécurité.
  useVisionEvents({ onTick: refreshLive, onCardUpdate: refreshLive });

  const scheduleBackgroundSave = (bg) => {
    clearTimeout(bgSaveTimer.current);
    bgSaveTimer.current = setTimeout(async () => {
      beginSave();
      try { await visionApi.canvasSave({ elements: [], background: bg }); }
      catch {} finally { endSave(); }
    }, 600);
  };

  /* Débounce l'écriture backend d'un patch déjà en champs `vision_cards`
     (x/y/width/height/rotation/z/manual_content/style — jamais de champs
     UI bruts). `style` doit toujours être envoyé complet : le backend
     remplace la colonne entière, il ne fusionne pas. */
  const schedulePatch = (id, backendPatch) => {
    pendingPatch.current[id] = { ...(pendingPatch.current[id] || {}), ...backendPatch };
    clearTimeout(patchTimers.current[id]);
    patchTimers.current[id] = setTimeout(async () => {
      const p = pendingPatch.current[id];
      delete pendingPatch.current[id];
      if (!p) return;
      beginSave();
      try { await visionCardsApi.update(id, p); }
      catch {} finally { endSave(); }
    }, 600);
  };

  const fullStyleOf = (el) => ({
    color: el.color, font_size: el.font_size, font_family: el.font_family,
    src: el.src, shape: el.shape, fill: el.fill, stroke: el.stroke,
  });

  const STYLE_KEYS = ["color", "font_size", "font_family", "src", "shape", "fill", "stroke"];
  const POS_KEYS = ["x", "y", "width", "height", "rotation", "z"];

  /* Édition depuis le panneau de propriétés (couleur, taille, contenu...) :
     mise à jour optimiste locale + patch debouncé vers le backend. */
  const patchElement = (id, uiPatch) => {
    setElements((prev) => {
      const next = prev.map((el) => (el.id === id ? { ...el, ...uiPatch } : el));
      const el = next.find((e) => e.id === id);
      if (el) {
        const backendPatch = {};
        for (const k of Object.keys(uiPatch)) {
          if (POS_KEYS.includes(k)) backendPatch[k] = el[k];
          else if (k === "content") backendPatch.manual_content = el.content;
          else if (k === "connections") backendPatch.connections = el.connections;
          else if (STYLE_KEYS.includes(k)) backendPatch.style = fullStyleOf(el);
        }
        schedulePatch(id, backendPatch);
      }
      return next;
    });
  };

  const addElement = async (partial) => {
    const z = Math.max(0, ...elements.map((e) => e.z || 0)) + 1;
    const payload = {
      board_id: "main", card_type: partial.card_type, entity_type: null, entity_id: null,
      title: null, manual_content: partial.manual_content ?? null,
      x: 60, y: 60, width: partial.width || 180, height: partial.height || 180,
      rotation: 0, z, style: partial.style || {}, connections: [],
    };
    try {
      const card = await visionCardsApi.create(payload);
      const el = cardToElement(card);
      setElements((prev) => [...prev, el]);
      setSelected(el.id);
    } catch { /* création échouée : rien à afficher, l'utilisateur peut réessayer */ }
  };

  const addText = () => addElement({ card_type: "text", manual_content: "Votre texte…", width: 220, height: 60, style: { color: "#1A3A6E", font_size: 20 } });
  const addShape = (shape) => addElement({ card_type: "shape", width: 140, height: shape === "line" ? 4 : 140, style: { shape, fill: "#EFE8D7", stroke: "#1A3A6E" } });

  const onFilePicked = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => addElement({ card_type: "image", width: 220, height: 260, style: { src: reader.result } });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const deleteElement = async (id) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    if (selected === id) setSelected(null);
    clearTimeout(patchTimers.current[id]);
    delete pendingPatch.current[id];
    try { await visionCardsApi.remove(id); } catch { /* la carte réapparaîtra au prochain rechargement si l'appel a échoué */ }
  };

  const reorder = (id, dir) => {
    const maxZ = Math.max(0, ...elements.map((e) => e.z || 0));
    patchElement(id, { z: dir === "front" ? maxZ + 1 : -1 });
  };

  /* ── Connecteurs entre cartes (backlog #2 — "connecteurs" jamais fait) ───
     Mode liaison : clic sur "Lier des cartes", puis clic sur une carte
     source, puis une carte cible → ajoute cible dans `connections` de la
     source. Un second clic sur la même paire retire le lien (toggle).
     Stocké directement dans la colonne `connections` de la VisionCard
     source (déjà présente dans le modèle depuis le backlog #1, jamais
     utilisée jusqu'ici). */
  const toggleLinkMode = () => setLinking((cur) => (cur ? null : "picking-source"));

  const handleCardClickForLink = (id) => {
    if (!linking) return false; // pas en mode liaison : laisser le clic normal (sélection/drag) faire son travail
    if (linking === "picking-source") {
      setLinking(id);
      return true;
    }
    if (linking === id) { setLinking(null); return true; } // reclique la même carte : annule
    const source = elements.find((e) => e.id === linking);
    if (!source) { setLinking(null); return true; }
    const already = (source.connections || []).includes(id);
    const nextConnections = already
      ? source.connections.filter((cid) => cid !== id)
      : [...(source.connections || []), id];
    patchElement(source.id, { connections: nextConnections });
    setLinking(null);
    return true;
  };

  const removeConnection = (sourceId, targetId) => {
    const source = elements.find((e) => e.id === sourceId);
    if (!source) return;
    patchElement(sourceId, { connections: (source.connections || []).filter((cid) => cid !== targetId) });
  };

  /* ── Auto-pose des cartes agrégées (backlog #3, migration complète) ──────
     Les 3 cartes CA / Bien-être / Prospects existent déjà en base dès le
     premier `migrate-legacy` (avec une position par défaut fixe). Ce bouton
     ne les CRÉE plus (elles existent déjà et s'affichent automatiquement) —
     il repère celles encore à leur position d'usine (= jamais déplacées par
     l'utilisateur) et leur trouve une place sans chevauchement, en persistant
     directement la nouvelle position sur la ligne `vision_cards`. */
  const autoPoseCards = async () => {
    setAutoPosing(true);
    try {
      const untouched = elements.filter((e) => {
        const d = e.entity_type === "aggregate" && DEFAULT_AGG_POS[e.entity_id];
        return d && e.x === DEFAULT_AGG_POS[e.entity_id].x && e.y === DEFAULT_AGG_POS[e.entity_id].y;
      });
      if (!untouched.length) return;
      const canvasW = surfaceRef.current?.clientWidth || 900;
      const canvasH = surfaceRef.current?.clientHeight || 620;
      const placedRects = elements.filter((e) => !untouched.includes(e)).map((e) => ({ x: e.x, y: e.y, w: e.width, h: e.height }));
      for (const el of untouched) {
        const { x, y } = findFreeSlot(placedRects, el.width, el.height, canvasW, canvasH);
        placedRects.push({ x, y, w: el.width, h: el.height });
        setElements((prev) => prev.map((e) => (e.id === el.id ? { ...e, x, y } : e)));
        try { await visionCardsApi.update(el.id, { x, y }); } catch { /* best-effort, la carte reste visible localement */ }
      }
    } finally {
      setAutoPosing(false);
    }
  };

  /* Rafraîchit les valeurs live (bouton manuel) — même logique que le
     rafraîchissement automatique SSE, avec un spinner visible. */
  const resyncSmartCards = async () => {
    if (!elements.some((e) => e.entity_type)) return;
    setResyncing(true);
    try { await refreshLive(); } finally { setResyncing(false); }
  };

  /* ── Historique / versioning (backlog #22) ── */
  const loadSnapshots = async () => {
    try { const { snapshots: s } = await visionCardsApi.listSnapshots(); setSnapshots(s || []); } catch { /* liste vide, pas bloquant */ }
  };
  const openHistory = () => { setHistoryOpen(true); loadSnapshots(); };
  const saveSnapshot = async () => {
    setSavingSnapshot(true);
    try {
      const label = window.prompt("Nom de cette version (optionnel) :", "");
      await visionCardsApi.createSnapshot(label || undefined);
      await loadSnapshots();
    } catch { /* échec silencieux : l'utilisateur peut réessayer */ }
    finally { setSavingSnapshot(false); }
  };
  const restoreSnapshot = async (id) => {
    if (!window.confirm("Restaurer cette version ? L'état actuel du canvas sera remplacé.")) return;
    setRestoringId(id);
    try {
      await visionCardsApi.restoreSnapshot(id);
      const { cards = [] } = await visionCardsApi.list();
      setElements(cards.map(cardToElement));
      setHistoryOpen(false);
    } catch { /* best-effort */ }
    finally { setRestoringId(null); }
  };
  const removeSnapshot = async (id) => {
    try { await visionCardsApi.deleteSnapshot(id); await loadSnapshots(); } catch { /* best-effort */ }
  };

  /* ── Partage public (backlog #23) ── */
  const openShare = async () => {
    setShareOpen(true);
    try { setPublicStatus(await visionCardsApi.getPublicStatus()); } catch { /* état par défaut : désactivé */ }
  };
  const toggleShare = async (enabled) => {
    setTogglingShare(true);
    try { setPublicStatus(await visionCardsApi.setPublicStatus(enabled)); }
    catch { /* best-effort */ }
    finally { setTogglingShare(false); }
  };
  const publicUrl = publicStatus.slug ? `${window.location.origin}/vision-public/${publicStatus.slug}` : null;
  const copyPublicUrl = () => {
    if (!publicUrl) return;
    navigator.clipboard?.writeText(publicUrl).then(() => toast.success("Lien copié")).catch(() => toast.error("Impossible de copier le lien"));
  };

  // ── Drag & resize (pointer events, sans lib externe) ──
  const onPointerDownMove = (e, el) => {
    e.stopPropagation();
    if (handleCardClickForLink(el.id)) return; // en mode liaison : ne pas démarrer un drag
    setSelected(el.id);
    dragRef.current = { id: el.id, mode: "move", startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const onPointerDownResize = (e, el) => {
    e.stopPropagation();
    setSelected(el.id);
    dragRef.current = { id: el.id, mode: "resize", startX: e.clientX, startY: e.clientY, origW: el.width, origH: el.height };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (d.mode === "move") {
      setElements((prev) => prev.map((el) => (el.id === d.id ? { ...el, x: Math.max(0, d.origX + dx), y: Math.max(0, d.origY + dy) } : el)));
    } else {
      setElements((prev) => prev.map((el) => (el.id === d.id ? { ...el, width: Math.max(30, d.origW + dx), height: Math.max(20, d.origH + dy) } : el)));
    }
  };

  // Le déplacement/redimensionnement n'est envoyé au backend qu'UNE fois,
  // au relâchement — pas à chaque pixel — pour ne pas saturer l'API.
  const onPointerUp = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    setElements((prev) => {
      const el = prev.find((e) => e.id === d.id);
      if (el) schedulePatch(d.id, d.mode === "move" ? { x: el.x, y: el.y } : { width: el.width, height: el.height });
      return prev;
    });
  };

  const selectedEl = elements.find((e) => e.id === selected);

  return (
    <div data-testid="canvas-tab">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <p className="uppercase-eyebrow">Canvas WYSIWYG</p>
          <h2 className="font-display text-[26px] text-navy mt-1">Composez votre <span className="font-serif-italic text-gold-deep">tableau de vision</span></h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-white border border-sand-200 text-[12.5px] font-semibold text-ink hover:border-navy/40" data-testid="canvas-add-image">
            <Upload size={13} /> Image
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onFilePicked} />
          <button onClick={addText} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-white border border-sand-200 text-[12.5px] font-semibold text-ink hover:border-navy/40" data-testid="canvas-add-text">
            <TypeIcon size={13} /> Texte
          </button>
          <button onClick={() => addShape("rect")} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-white border border-sand-200 text-[12.5px] font-semibold text-ink hover:border-navy/40" data-testid="canvas-add-rect">
            <Square size={13} /> Forme
          </button>
          <button onClick={() => addShape("circle")} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-white border border-sand-200 text-[12.5px] font-semibold text-ink hover:border-navy/40" data-testid="canvas-add-circle">
            <CircleIcon size={13} /> Cercle
          </button>
          <button onClick={autoPoseCards} disabled={autoPosing} data-testid="canvas-auto-pose"
            title="Pose automatiquement les cartes CA / Bien-être / Prospects sur le canvas, sans chevauchement"
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-navy text-white text-[12.5px] font-semibold hover:bg-navy/90 disabled:opacity-60">
            {autoPosing ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
            Auto-poser mes cartes
          </button>
          {elements.some((e) => e.entity_type) && (
            <button onClick={resyncSmartCards} disabled={resyncing} data-testid="canvas-resync-cards"
              title="Recharge les valeurs live des cartes intelligentes déjà posées"
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-white border border-sand-200 text-[12.5px] font-semibold text-ink hover:border-navy/40 disabled:opacity-60">
              <RefreshCw size={13} className={resyncing ? "animate-spin" : ""} />
            </button>
          )}
          <button onClick={toggleLinkMode} data-testid="canvas-link-mode"
            title="Cliquez une carte source puis une carte cible pour les relier (recliquez la même paire pour retirer le lien)"
            className={`inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-[12.5px] font-semibold border ${linking ? "bg-gold-deep text-white border-gold-deep" : "bg-white border-sand-200 text-ink hover:border-navy/40"}`}>
            <Link2 size={13} /> {linking ? "Cliquez la carte cible…" : "Lier des cartes"}
          </button>
          <button onClick={openHistory} data-testid="canvas-history-btn"
            title="Sauvegarder ou restaurer une version antérieure du canvas"
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-white border border-sand-200 text-[12.5px] font-semibold text-ink hover:border-navy/40">
            <History size={13} /> Historique
          </button>
          <button onClick={openShare} data-testid="canvas-share-btn"
            title="Partager ce board en lecture seule via un lien public"
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-white border border-sand-200 text-[12.5px] font-semibold text-ink hover:border-navy/40">
            <Share2 size={13} /> Partager
          </button>
          <label className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-white border border-sand-200 text-[12px] text-ink-soft">
            Fond
            <input type="color" value={background} onChange={(e) => { const bg = e.target.value; setBackground(bg); scheduleBackgroundSave(bg); }} className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer" />
          </label>
          <span className="text-[11px] text-ink-muted italic">{saving ? "Enregistrement…" : "Enregistré"}</span>
        </div>
      </div>

      {/* ── Panneau Historique (backlog #22) ── */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setHistoryOpen(false)} data-testid="canvas-history-panel">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-[18px] text-navy">Historique du canvas</h3>
              <button onClick={() => setHistoryOpen(false)} className="text-ink-soft hover:text-navy"><X size={16} /></button>
            </div>
            <button onClick={saveSnapshot} disabled={savingSnapshot} data-testid="canvas-save-snapshot"
              className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-full bg-navy text-white text-[12.5px] font-semibold mb-4 disabled:opacity-60">
              {savingSnapshot ? <Loader2 size={13} className="animate-spin" /> : <History size={13} />} Sauvegarder une version
            </button>
            {snapshots.length === 0 ? (
              <p className="text-[12.5px] text-ink-soft italic">Aucune version sauvegardée pour l'instant.</p>
            ) : (
              <div className="space-y-2">
                {snapshots.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-sand-50 border border-sand-200" data-testid={`snapshot-${s.id}`}>
                    <div className="min-w-0">
                      <p className="text-[12.5px] text-ink font-semibold truncate">{s.label}</p>
                      <p className="text-[11px] text-ink-soft">{s.card_count} carte{s.card_count > 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => restoreSnapshot(s.id)} disabled={restoringId === s.id}
                        className="px-3 h-7 rounded-full bg-white border border-sand-200 text-[11px] font-semibold text-ink hover:border-navy/40 disabled:opacity-60">
                        {restoringId === s.id ? "…" : "Restaurer"}
                      </button>
                      <button onClick={() => removeSnapshot(s.id)} className="text-rose-500 hover:text-rose-700"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Panneau Partage (backlog #23) ── */}
      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShareOpen(false)} data-testid="canvas-share-panel">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-[18px] text-navy">Partager ce board</h3>
              <button onClick={() => setShareOpen(false)} className="text-ink-soft hover:text-navy"><X size={16} /></button>
            </div>
            <p className="text-[12.5px] text-ink-soft mb-4">
              Un lien public affiche ce canvas en lecture seule, avec les vraies valeurs de vos cartes
              (CA, objectifs...). N'importe qui avec le lien peut le voir, sans se connecter.
            </p>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] text-ink font-semibold">Lien public activé</span>
              <button onClick={() => toggleShare(!publicStatus.enabled)} disabled={togglingShare} data-testid="canvas-share-toggle"
                className={`w-11 h-6 rounded-full relative transition-colors ${publicStatus.enabled ? "bg-navy" : "bg-sand-200"} disabled:opacity-60`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${publicStatus.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            {publicStatus.enabled && publicUrl && (
              <div className="flex items-center gap-2">
                <input readOnly value={publicUrl} className="zinput flex-1 text-[12px]" data-testid="canvas-public-url" />
                <button onClick={copyPublicUrl} className="px-3 h-9 rounded-full bg-white border border-sand-200 text-ink hover:border-navy/40"><Copy size={14} /></button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,220px] gap-5">
        <div
          ref={surfaceRef}
          onClick={() => setSelected(null)}
          className="relative rounded-2xl border border-sand-200 shadow-soft overflow-hidden"
          style={{ background, height: "620px" }}
          data-testid="canvas-surface"
        >
          {loading && <div className="absolute inset-0 grid place-items-center"><Loader2 className="animate-spin text-navy" /></div>}
          {/* Traits de connexion entre cartes (backlog #2). Dessinés du centre
              de la carte source vers le centre de la carte cible ; sous les
              cartes (pointer-events désactivés) pour ne pas gêner le drag. */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} data-testid="canvas-connections">
            {elements.flatMap((el) =>
              (el.connections || []).map((targetId) => {
                const target = elements.find((e) => e.id === targetId);
                if (!target) return null;
                const x1 = el.x + el.width / 2, y1 = el.y + el.height / 2;
                const x2 = target.x + target.width / 2, y2 = target.y + target.height / 2;
                return (
                  <line key={`${el.id}-${targetId}`} x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="#C9A449" strokeWidth={2} strokeDasharray="6 4" strokeOpacity={0.7} />
                );
              })
            )}
          </svg>
          {[...elements].sort((a, b) => (a.z || 0) - (b.z || 0)).map((el) => (
            <div
              key={el.id}
              onPointerDown={(e) => onPointerDownMove(e, el)}
              className={`absolute cursor-move select-none ${selected === el.id ? "ring-2 ring-navy" : ""}`}
              style={{ left: el.x, top: el.y, width: el.width, height: el.height, transform: `rotate(${el.rotation || 0}deg)`, zIndex: el.z || 0 }}
            >
              {el.card_type === "image" && <img src={el.src} alt="" className="w-full h-full object-cover rounded-lg pointer-events-none" />}
              {el.card_type === "text" && (
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => patchElement(el.id, { content: e.target.innerText })}
                  className="w-full h-full outline-none font-display leading-tight"
                  style={{ fontSize: el.font_size, color: el.color, fontFamily: el.font_family }}
                >
                  {el.content}
                </div>
              )}
              {el.card_type === "shape" && el.shape === "rect" && (
                <div className="w-full h-full rounded-md" style={{ background: el.fill, border: `2px solid ${el.stroke}` }} />
              )}
              {el.card_type === "shape" && el.shape === "circle" && (
                <div className="w-full h-full rounded-full" style={{ background: el.fill, border: `2px solid ${el.stroke}` }} />
              )}
              {el.card_type === "shape" && el.shape === "line" && (
                <div className="w-full" style={{ height: 4, background: el.stroke }} />
              )}
              {el.entity_type === "aggregate" && (
                <a
                  href={AGGREGATE_MODULE[el.entity_id] ? `/${AGGREGATE_MODULE[el.entity_id]}` : "#"}
                  onClick={(e) => { if (dragRef.current) e.preventDefault(); }}
                  className="flex h-full w-full flex-col justify-between rounded-xl border border-navy/15 bg-white/95 p-3 no-underline shadow-soft"
                  data-testid={`canvas-smart-card-${el.entity_id}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-muted">
                    <span className={`h-1.5 w-1.5 rounded-full ${el.orphan ? "bg-rose-400" : "bg-gold-deep animate-pulse"}`} />
                    {el.label}
                    {el.orphan && <AlertTriangle size={11} className="text-rose-500" />}
                  </div>
                  <div className="text-lg font-semibold text-navy leading-tight">{el.value}</div>
                  <div className="text-[11px] text-ink-soft">{el.sub}</div>
                  {el.progress != null && (
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-sand-200">
                      <div className="h-full rounded-full bg-gold-deep" style={{ width: `${Math.min(100, el.progress)}%` }} />
                    </div>
                  )}
                </a>
              )}
              {selected === el.id && (
                <div
                  onPointerDown={(e) => onPointerDownResize(e, el)}
                  className="absolute -right-1.5 -bottom-1.5 w-4 h-4 rounded-full bg-navy cursor-se-resize"
                />
              )}
            </div>
          ))}
        </div>

        {/* Panneau propriétés / calques */}
        <div className="card-cream p-4 space-y-4">
          <Eyebrow icon={PenSquare} label="Propriétés" small />
          {!selectedEl && <p className="text-[12.5px] text-ink-soft italic">Sélectionnez un élément sur le canvas.</p>}
          {selectedEl && (
            <div className="space-y-3">
              {(selectedEl.type === "text") && (
                <>
                  <label className="block text-[11px] text-ink-soft uppercase tracking-wide">Couleur
                    <input type="color" value={selectedEl.color} onChange={(e) => patchElement(selectedEl.id, { color: e.target.value })} className="w-full h-8 mt-1 rounded border-0 cursor-pointer" />
                  </label>
                  <label className="block text-[11px] text-ink-soft uppercase tracking-wide">Taille
                    <input type="range" min="10" max="64" value={selectedEl.font_size} onChange={(e) => patchElement(selectedEl.id, { font_size: Number(e.target.value) })} className="w-full" />
                  </label>
                </>
              )}
              {selectedEl.type === "shape" && (
                <>
                  <label className="block text-[11px] text-ink-soft uppercase tracking-wide">Remplissage
                    <input type="color" value={selectedEl.fill} onChange={(e) => patchElement(selectedEl.id, { fill: e.target.value })} className="w-full h-8 mt-1 rounded border-0 cursor-pointer" />
                  </label>
                  <label className="block text-[11px] text-ink-soft uppercase tracking-wide">Contour
                    <input type="color" value={selectedEl.stroke} onChange={(e) => patchElement(selectedEl.id, { stroke: e.target.value })} className="w-full h-8 mt-1 rounded border-0 cursor-pointer" />
                  </label>
                </>
              )}
              <div className="flex gap-2">
                <button onClick={() => reorder(selectedEl.id, "front")} className="flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-full bg-white border border-sand-200 text-[11.5px]"><ChevronUp size={12} />Devant</button>
                <button onClick={() => reorder(selectedEl.id, "back")} className="flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-full bg-white border border-sand-200 text-[11.5px]"><ChevronDown size={12} />Derrière</button>
              </div>
              {(selectedEl.connections || []).length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-ink-soft uppercase tracking-wide">Liens sortants</p>
                  {selectedEl.connections.map((cid) => {
                    const t = elements.find((e) => e.id === cid);
                    return (
                      <div key={cid} className="flex items-center justify-between gap-2 px-2.5 h-7 rounded-full bg-sand-50 border border-sand-200 text-[11.5px] text-ink-soft">
                        <span className="truncate">{t?.label || t?.title || t?.content || "Carte liée"}</span>
                        <button onClick={() => removeConnection(selectedEl.id, cid)} title="Retirer ce lien" className="text-rose-500 hover:text-rose-700 flex-shrink-0"><Unlink size={12} /></button>
                      </div>
                    );
                  })}
                </div>
              )}
              <button onClick={() => deleteElement(selectedEl.id)} className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[12.5px] font-semibold"><Trash2 size={13} />Supprimer</button>
            </div>
          )}
          <p className="text-[11px] text-ink-muted italic pt-2 border-t border-sand-200">Glissez un élément pour le déplacer, tirez le coin bleu pour le redimensionner.</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FlipbookTab — Sélecteur de templates + formulaire + iframe Heyzine
   ───────────────────────────────────────────────────────────────── */

const TEMPLATES = [
  {
    id: "magazine",
    emoji: "📖",
    name: "Magazine du Futur",
    desc: "Couverture de magazine premium. Viral LinkedIn.",
    best: "Hook fort · partage · vision aspirationnelle",
    color: "from-[#1a1408] to-[#0d0d0d]",
    textColor: "text-amber-300",
  },
  {
    id: "trajectoire",
    emoji: "🛣️",
    name: "Trajectoire",
    desc: "Feuille de route 90j / 1an / 3ans avec KPIs.",
    best: "Entrepreneurs · clarté · accountability",
    color: "from-[#1a2744] to-[#0f1a30]",
    textColor: "text-blue-300",
  },
  {
    id: "arbre",
    emoji: "🌳",
    name: "Arbre de Vie",
    desc: "Valeurs → Mission → 4 branches → Fruits.",
    best: "Profondeur · équilibre · signature Zayado",
    color: "from-[#1a2a0f] to-[#0f1f08]",
    textColor: "text-green-300",
  },
];

const FIELDS = {
  magazine: [
    { key: "name", label: "Votre prénom / nom", placeholder: "Julien Martin" },
    { key: "year", label: "Année cible", placeholder: "2029" },
    { key: "headline", label: "Titre de une", placeholder: "Comment Julien a bâti Zayado" },
    { key: "subtitle", label: "Sous-titre inspirant", placeholder: "Du rêve à l'impact…" },
    { key: "achievement1", label: "Accomplissement #1", placeholder: "10 000 entrepreneurs accompagnés" },
    { key: "achievement2", label: "Accomplissement #2", placeholder: "CA × 10 en 3 ans" },
    { key: "achievement3", label: "Accomplissement #3", placeholder: "Liberté totale" },
    { key: "quote", label: "Votre citation clé", placeholder: "« J'ai arrêté de subir. »" },
    { key: "project", label: "Nom de votre projet", placeholder: "Zayado" },
  ],
  trajectoire: [
    { key: "name", label: "Votre prénom", placeholder: "Julien" },
    { key: "mission", label: "Mission en une phrase", placeholder: "Transformer la façon dont…" },
    { key: "today_status", label: "Situation aujourd'hui", placeholder: "Lancement · Premiers clients" },
    { key: "j90_goal", label: "Objectif 90 jours", placeholder: "1 000 utilisateurs actifs" },
    { key: "j90_kpi1", label: "KPI 90j #1", placeholder: "MRR : 5 000 €" },
    { key: "j90_kpi2", label: "KPI 90j #2", placeholder: "NPS > 60" },
    { key: "an1_goal", label: "Objectif 1 an", placeholder: "10 000 utilisateurs" },
    { key: "an1_kpi1", label: "KPI 1an #1", placeholder: "ARR : 120 000 €" },
    { key: "an1_kpi2", label: "KPI 1an #2", placeholder: "Équipe : 3 personnes" },
    { key: "an3_goal", label: "Vision 3 ans", placeholder: "Leader européen" },
    { key: "an3_kpi1", label: "KPI 3ans #1", placeholder: "ARR : 2 M€" },
    { key: "an3_kpi2", label: "KPI 3ans #2", placeholder: "100 000 solopreneurs" },
    { key: "freedom_vision", label: "Votre vision de liberté", placeholder: "Travailler 4h/jour depuis…" },
  ],
  arbre: [
    { key: "name", label: "Votre prénom", placeholder: "Julien" },
    { key: "valeur1", label: "Valeur fondamentale #1", placeholder: "Liberté" },
    { key: "valeur2", label: "Valeur fondamentale #2", placeholder: "Impact" },
    { key: "valeur3", label: "Valeur fondamentale #3", placeholder: "Authenticité" },
    { key: "mission", label: "Mission (tronc)", placeholder: "Accompagner 10 000 entrepreneurs…" },
    { key: "branch_business", label: "Branche Business", placeholder: "Zayado · SaaS · 1M ARR" },
    { key: "branch_sante", label: "Branche Santé", placeholder: "Sport quotidien · Énergie max" },
    { key: "branch_famille", label: "Branche Famille", placeholder: "Présent · Épanoui · Modèle" },
    { key: "branch_impact", label: "Branche Impact", placeholder: "Communauté · Livre" },
    { key: "fruit1", label: "Fruit #1", placeholder: "Liberté financière" },
    { key: "fruit2", label: "Fruit #2", placeholder: "Famille heureuse" },
    { key: "fruit3", label: "Fruit #3", placeholder: "Héritage durable" },
  ],
};

function FlipbookTab({ user }) {
  const [step, setStep] = React.useState("select"); // select | form | generating | result
  const [selectedTpl, setSelectedTpl] = React.useState(null);
  const [formData, setFormData] = React.useState({});
  const [generating, setGenerating] = React.useState(false);
  const [flipbook, setFlipbook] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [previewSrc, setPreviewSrc] = React.useState(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);
  const [liveMetrics, setLiveMetrics] = React.useState(null);
  const [refreshing, setRefreshing] = React.useState(false);

  // Charger un flipbook existant au montage — si `stale` (objectif/leads/CA
  // ont changé depuis la dernière génération), régénère automatiquement le PDF
  // avec les métriques live (widgets dynamiques, fix #1).
  React.useEffect(() => {
    fetch("/api/vision/board/flipbook", {
      headers: { Authorization: `Bearer ${localStorage.getItem("zayado_token") || ""}` },
    })
      .then((r) => r.json())
      .then(async (d) => {
        if (d?.live_metrics) setLiveMetrics(d.live_metrics);
        if (d?.flipbook) {
          setFlipbook(d.flipbook);
          setStep("result");
          if (d.flipbook.stale) {
            setRefreshing(true);
            try {
              const rr = await visionApi.flipbookRefresh();
              if (rr?.flipbook) setFlipbook(rr.flipbook);
              if (rr?.live_metrics) setLiveMetrics(rr.live_metrics);
            } catch { /* silent — pas grave si le refresh échoue */ }
            finally { setRefreshing(false); }
          }
        }
      })
      .catch(() => {});
  }, []);

  // Rafraîchit les métriques live périodiquement pour la bannière (sans régénérer le PDF)
  React.useEffect(() => {
    const poll = setInterval(() => {
      visionApi.liveMetrics().then(setLiveMetrics).catch(() => {});
    }, 60000);
    return () => clearInterval(poll);
  }, []);

  // Pré-remplir le prénom
  React.useEffect(() => {
    if (user?.name || user?.first_name) {
      const firstName = (user.first_name || user.name || "").split(" ")[0];
      setFormData((p) => ({ ...p, name: firstName }));
    }
  }, [user]);

  const loadPreview = async (tplId) => {
    setLoadingPreview(true);
    setPreviewSrc(null);
    try {
      const r = await fetch(`/api/vision/board/preview-html?template=${tplId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("zayado_token") || ""}` },
      });
      if (r.ok) {
        const html = await r.text();
        const blob = new Blob([html], { type: "text/html" });
        setPreviewSrc(URL.createObjectURL(blob));
      }
    } catch {}
    setLoadingPreview(false);
  };

  const selectTemplate = (tpl) => {
    setSelectedTpl(tpl);
    setStep("form");
    loadPreview(tpl.id);
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    setStep("generating");
    try {
      const r = await fetch("/api/vision/board/generate-flipbook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("zayado_token") || ""}`,
        },
        body: JSON.stringify({ template: selectedTpl.id, data: formData }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.detail || "Erreur de génération");
      setFlipbook(json.flipbook);
      setStep("result");
    } catch (e) {
      setError(e.message);
      setStep("form");
    } finally {
      setGenerating(false);
    }
  };

  const deleteFlipbook = async () => {
    if (!window.confirm("Supprimer votre Vision Board ?")) return;
    await fetch("/api/vision/board/flipbook", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("zayado_token") || ""}` },
    });
    setFlipbook(null);
    setSelectedTpl(null);
    setFormData({});
    setPreviewSrc(null);
    setStep("select");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(flipbook?.url || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(flipbook?.url || "")}`, "_blank");
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`🎯 Mon Vision Board ${selectedTpl?.name || ""} — ${flipbook?.url}\n🔐 Mot de passe : ${flipbook?.password}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // ── STEP: select template ──
  if (step === "select") return (
    <div data-testid="flipbook-select">
      <div className="mb-8">
        <p className="uppercase-eyebrow">Vision Board IA</p>
        <h2 className="font-display text-[32px] text-navy mt-1">
          Choisissez votre <span className="font-serif-italic text-gold-deep">style</span>
        </h2>
        <p className="text-[14px] text-ink-soft mt-2">
          3 templates distincts · généré en PDF · lien flipbook Heyzine protégé par mot de passe
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            data-testid={`tpl-card-${tpl.id}`}
            onClick={() => selectTemplate(tpl)}
            className="text-left rounded-3xl overflow-hidden border border-sand-200 hover:border-navy/40 hover:shadow-float transition-all group rise"
          >
            <div className={`bg-gradient-to-br ${tpl.color} p-8 pb-6`}>
              <div className="text-5xl mb-4">{tpl.emoji}</div>
              <h3 className={`font-display text-[22px] ${tpl.textColor} leading-tight`}>{tpl.name}</h3>
            </div>
            <div className="bg-white p-5">
              <p className="text-[13.5px] text-ink leading-relaxed">{tpl.desc}</p>
              <p className="text-[11.5px] text-ink-soft mt-2 italic">{tpl.best}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-navy group-hover:gap-3 transition-all">
                Choisir ce template <ArrowRight size={13} />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ── STEP: form ──
  if (step === "form") return (
    <div data-testid="flipbook-form" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Formulaire */}
      <div className="card-cream p-7 rise">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep("select")} className="w-9 h-9 grid place-items-center rounded-full hover:bg-sand-200 text-ink-soft">
            <X size={16} />
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-ink-soft">Template sélectionné</p>
            <h3 className="font-display text-[20px] text-navy">{selectedTpl?.emoji} {selectedTpl?.name}</h3>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {(FIELDS[selectedTpl?.id] || []).map((f) => (
            <label key={f.key} className="block">
              <span className="text-[11px] uppercase tracking-[0.18em] text-ink-soft font-semibold block mb-1.5">{f.label}</span>
              <input
                data-testid={`field-${f.key}`}
                value={formData[f.key] || ""}
                onChange={(e) => setFormData((p) => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full h-10 px-3 rounded-xl bg-white border border-sand-300 text-[13.5px] focus:outline-none focus:border-navy/50"
              />
            </label>
          ))}
        </div>

        <button
          data-testid="generate-btn"
          onClick={generate}
          disabled={generating}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-navy text-cream font-semibold hover:bg-navy-bright transition-colors disabled:opacity-50"
        >
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generating ? "Génération en cours…" : "Générer mon Vision Board"}
        </button>
        <p className="text-[11.5px] text-ink-muted mt-3 text-center">
          PDF généré · uploadé sur Heyzine · lien protégé par mot de passe
        </p>
      </div>

      {/* Aperçu template */}
      <div className="rise" style={{ animationDelay: "120ms" }}>
        <p className="uppercase-eyebrow mb-3">Aperçu du template</p>
        <div className="rounded-2xl overflow-hidden border border-sand-200 shadow-soft bg-white"
          style={{ height: "600px", position: "relative" }}>
          {loadingPreview && (
            <div className="absolute inset-0 grid place-items-center bg-cream-soft">
              <Loader2 className="animate-spin text-navy" />
            </div>
          )}
          {previewSrc && (
            <iframe
              src={previewSrc}
              title="Aperçu template"
              className="w-full h-full border-0"
              style={{ transform: "scale(0.76)", transformOrigin: "top left", width: "132%", height: "132%" }}
            />
          )}
        </div>
        <p className="text-[11.5px] text-ink-muted mt-2 text-center italic">
          Aperçu avec données exemple — votre version sera personnalisée
        </p>
      </div>
    </div>
  );

  // ── STEP: generating ──
  if (step === "generating") return (
    <div className="card-cream p-16 text-center rise" data-testid="flipbook-generating">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-navy text-cream mb-6">
        <Loader2 size={32} className="animate-spin" />
      </div>
      <h2 className="font-display text-[28px] text-navy mb-2">Génération en cours…</h2>
      <p className="text-[14px] text-ink-soft max-w-md mx-auto leading-relaxed">
        Votre Vision Board est en cours de création. Le PDF est généré, puis uploadé sur Heyzine.
        Cela prend environ 15-30 secondes.
      </p>
      <div className="mt-8 space-y-2 max-w-xs mx-auto text-left">
        {["Rendu HTML → PDF…", "Upload sur Heyzine…", "Protection par mot de passe…", "Finalisation du lien…"].map((s, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-cream-soft border border-sand-200 text-[13px] text-ink fade-up"
            style={{ animationDelay: `${i * 800}ms` }}>
            <Loader2 size={12} className="animate-spin text-navy flex-shrink-0" />
            {s}
          </div>
        ))}
      </div>
    </div>
  );

  // ── STEP: result ──
  if (step === "result" && flipbook) return (
    <div data-testid="flipbook-result">
      {liveMetrics && (
        <div className="mb-5 p-4 rounded-2xl bg-navy text-cream flex flex-wrap items-center justify-between gap-3" data-testid="live-metrics-banner">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-gold" />
            <span className="text-[13px]">
              Objectif CA&nbsp;: <strong>{Math.round(liveMetrics.ca_month_eur).toLocaleString("fr-FR")}€ / {Math.round(liveMetrics.objective_eur).toLocaleString("fr-FR")}€</strong> ({liveMetrics.progress_percent}%)
            </span>
          </div>
          <span className="text-[13px]">Leads&nbsp;: <strong>{liveMetrics.leads_count}</strong></span>
          <span className="text-[11px] opacity-70">{refreshing ? "Mise à jour du Vision Board…" : "Mis à jour automatiquement"}</span>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Infos + actions */}
        <div className="card-cream p-7 rise">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-700 font-semibold">Vision Board prêt</p>
          </div>
          <h2 className="font-display text-[26px] text-navy mb-1">
            {TEMPLATES.find((t) => t.id === flipbook.template)?.emoji}{" "}
            {TEMPLATES.find((t) => t.id === flipbook.template)?.name || flipbook.template}
          </h2>
          <p className="text-[13px] text-ink-soft mb-6">
            Créé le {flipbook.created_at ? new Date(flipbook.created_at).toLocaleDateString("fr-FR") : "—"}
          </p>

          {/* URL */}
          <div className="p-4 rounded-2xl bg-cream-soft border border-sand-200 mb-4">
            <p className="text-[11px] uppercase tracking-wider text-ink-soft mb-2">Lien Heyzine</p>
            <div className="flex items-center gap-2">
              <a href={flipbook.url} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-[13px] text-navy font-medium truncate hover:underline">
                {flipbook.url}
              </a>
              <button onClick={copyLink} data-testid="copy-link-btn"
                className="w-9 h-9 grid place-items-center rounded-full hover:bg-sand-200 text-ink-soft flex-shrink-0">
                {copied ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Plus size={15} />}
              </button>
            </div>
          </div>

          {/* Mot de passe */}
          <div className="p-4 rounded-2xl bg-navy/5 border border-navy/15 mb-6">
            <p className="text-[11px] uppercase tracking-wider text-ink-soft mb-2">Mot de passe</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[16px] font-semibold text-navy tracking-widest">
                {showPassword ? flipbook.password : "••••••••"}
              </span>
              <button onClick={() => setShowPassword((v) => !v)}
                className="text-[12px] text-ink-soft hover:text-navy ml-auto">
                {showPassword ? "Masquer" : "Afficher"}
              </button>
            </div>
            <p className="text-[11px] text-ink-muted mt-1">
              Partagez ce mot de passe avec les personnes à qui vous envoyez le lien
            </p>
          </div>

          {/* Actions partage */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button onClick={shareLinkedIn} data-testid="share-linkedin"
              className="inline-flex items-center justify-center gap-2 h-10 rounded-full bg-[#0077b5] text-white text-[13px] font-semibold hover:opacity-90 transition">
              <Star size={14} /> LinkedIn
            </button>
            <button onClick={shareWhatsApp} data-testid="share-whatsapp"
              className="inline-flex items-center justify-center gap-2 h-10 rounded-full bg-[#25d366] text-white text-[13px] font-semibold hover:opacity-90 transition">
              <Heart size={14} /> WhatsApp
            </button>
          </div>
          <div className="flex gap-2">
            <a href={flipbook.url} target="_blank" rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-full bg-navy text-cream text-[13px] font-semibold hover:bg-navy-bright transition"
              data-testid="open-flipbook-btn">
              <ArrowRight size={14} /> Ouvrir le flipbook
            </a>
            <button onClick={deleteFlipbook} data-testid="delete-flipbook-btn"
              className="w-10 h-10 grid place-items-center rounded-full border border-red-200 text-red-500 hover:bg-red-50">
              <X size={14} />
            </button>
          </div>
          <button onClick={() => { setFlipbook(null); setStep("select"); }} className="mt-3 w-full text-[12.5px] text-ink-soft hover:text-navy text-center">
            Créer un nouveau Vision Board
          </button>
        </div>

        {/* Iframe flipbook */}
        <div className="rise" style={{ animationDelay: "120ms" }}>
          <p className="uppercase-eyebrow mb-3">Votre flipbook</p>
          <div className="rounded-2xl overflow-hidden border border-sand-200 shadow-float" style={{ height: "580px" }}>
            <iframe
              src={flipbook.url}
              title="Vision Board Flipbook"
              className="w-full h-full border-0"
              allow="fullscreen"
              data-testid="flipbook-iframe"
            />
          </div>
          <p className="text-[11.5px] text-ink-muted mt-2 text-center">
            Le visiteur devra entrer le mot de passe pour consulter votre Vision Board
          </p>
        </div>
      </div>
    </div>
  );

  return null;
}
