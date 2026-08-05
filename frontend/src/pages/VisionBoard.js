import React, { useState, useEffect, useCallback } from "react";
import TopNav from "@/components/layout/TopNav";
import FloatingBottomBar from "@/components/layout/FloatingBottomBar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import LeafBackdrop from "@/components/dashboard/LeafBackdrop";
import EspacePanel from "@/components/panels/EspacePanel";
import EnergiePanel from "@/components/panels/EnergiePanel";
import CollaborateurPanel from "@/components/panels/CollaborateurPanel";
import { useAuth } from "@/context/AuthContext";
import { visionApi, dashboardApi, tasksApi } from "@/lib/api";
import usePageTitle from "@/hooks/usePageTitle";
import useWelcomeModal from "@/hooks/useWelcomeModal";
import WelcomeModal from "@/components/WelcomeModal";
import {
  Eye, Target, TrendingUp, Star, Heart, Quote, Sparkles,
  Plus, Image as ImageIcon, PieChart, ArrowRight, X, Loader2, Pencil, CheckCircle2,
  PenSquare, Type as TypeIcon, Square, Circle as CircleIcon, Trash2, ChevronUp, ChevronDown,
  Upload,
} from "lucide-react";

const TABS = [
  { id: "vision",        label: "Vision",        icon: Eye },
  { id: "objectifs",     label: "Objectifs",     icon: Target },
  { id: "trajectoire",   label: "Trajectoire",   icon: TrendingUp },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

function uid() { return Math.random().toString(36).slice(2, 10); }

function CanvasTab() {
  const [elements, setElements] = useState([]);
  const [background, setBackground] = useState("#FAF8F3");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const dragRef = React.useRef(null); // { id, offsetX, offsetY, mode: "move"|"resize" }
  const fileInputRef = React.useRef(null);
  const saveTimer = React.useRef(null);

  useEffect(() => {
    visionApi.canvasGet()
      .then((d) => { setElements(d?.elements || []); setBackground(d?.background || "#FAF8F3"); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scheduleSave = useCallback((els, bg) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try { await visionApi.canvasSave({ elements: els, background: bg }); }
      catch {} finally { setSaving(false); }
    }, 700);
  }, []);

  const updateElements = (next) => {
    setElements(next);
    scheduleSave(next, background);
  };

  const addElement = (partial) => {
    const el = { id: uid(), x: 60, y: 60, width: 180, height: 180, rotation: 0, z: elements.length, ...partial };
    updateElements([...elements, el]);
    setSelected(el.id);
  };

  const addText = () => addElement({ type: "text", content: "Votre texte…", width: 220, height: 60, font_size: 20, color: "#1A3A6E" });
  const addShape = (shape) => addElement({ type: "shape", shape, width: 140, height: shape === "line" ? 4 : 140, fill: "#EFE8D7", stroke: "#1A3A6E" });

  const onFilePicked = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => addElement({ type: "image", src: reader.result, width: 220, height: 260 });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const patchElement = (id, patch) => {
    const next = elements.map((el) => (el.id === id ? { ...el, ...patch } : el));
    updateElements(next);
  };

  const deleteElement = (id) => {
    updateElements(elements.filter((el) => el.id !== id));
    if (selected === id) setSelected(null);
  };

  const reorder = (id, dir) => {
    const maxZ = Math.max(0, ...elements.map((e) => e.z || 0));
    patchElement(id, { z: dir === "front" ? maxZ + 1 : -1 });
  };

  // ── Drag & resize (pointer events, sans lib externe) ──
  const onPointerDownMove = (e, el) => {
    e.stopPropagation();
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

  const onPointerUp = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    dragRef.current = null;
    setElements((prev) => { scheduleSave(prev, background); return prev; });
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
          <label className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-white border border-sand-200 text-[12px] text-ink-soft">
            Fond
            <input type="color" value={background} onChange={(e) => { setBackground(e.target.value); scheduleSave(elements, e.target.value); }} className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer" />
          </label>
          <span className="text-[11px] text-ink-muted italic">{saving ? "Enregistrement…" : "Enregistré"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,220px] gap-5">
        <div
          onClick={() => setSelected(null)}
          className="relative rounded-2xl border border-sand-200 shadow-soft overflow-hidden"
          style={{ background, height: "620px" }}
          data-testid="canvas-surface"
        >
          {loading && <div className="absolute inset-0 grid place-items-center"><Loader2 className="animate-spin text-navy" /></div>}
          {[...elements].sort((a, b) => (a.z || 0) - (b.z || 0)).map((el) => (
            <div
              key={el.id}
              onPointerDown={(e) => onPointerDownMove(e, el)}
              className={`absolute cursor-move select-none ${selected === el.id ? "ring-2 ring-navy" : ""}`}
              style={{ left: el.x, top: el.y, width: el.width, height: el.height, transform: `rotate(${el.rotation || 0}deg)`, zIndex: el.z || 0 }}
            >
              {el.type === "image" && <img src={el.src} alt="" className="w-full h-full object-cover rounded-lg pointer-events-none" />}
              {el.type === "text" && (
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
              {el.type === "shape" && el.shape === "rect" && (
                <div className="w-full h-full rounded-md" style={{ background: el.fill, border: `2px solid ${el.stroke}` }} />
              )}
              {el.type === "shape" && el.shape === "circle" && (
                <div className="w-full h-full rounded-full" style={{ background: el.fill, border: `2px solid ${el.stroke}` }} />
              )}
              {el.type === "shape" && el.shape === "line" && (
                <div className="w-full" style={{ height: 4, background: el.stroke }} />
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
