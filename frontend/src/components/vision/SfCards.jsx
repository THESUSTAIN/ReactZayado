import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Calendar, Check, ExternalLink, Loader2, Play, Plus, Sparkles, Trash2, Trophy } from "lucide-react";
import {
  fetchState, fetchObjectifs, fetchTaches, fetchPouls, fetchRoadmap, fetchIdees, fetchWheel, toggleTache,
  creerTache, fetchVictoires,
} from "@/lib/kairosApi";

/* ───────────────────────── Étiquettes pastel ─────────────────────────
   Comme Storyflow : texte foncé sur fond pastel. La couleur est déduite
   du libellé (stable), pour qu'une même étiquette ait toujours la même. */
export const LABEL_COLORS = [
  { bg: "#EDE7F6", fg: "#4C1D95" }, // violet
  { bg: "#E0F2E9", fg: "#14532D" }, // vert
  { bg: "#E3ECFA", fg: "#1E3A8A" }, // bleu
  { bg: "#FBEFD9", fg: "#7C2D12" }, // ambre
  { bg: "#FBE7F0", fg: "#831843" }, // rose
  { bg: "#DDF3F1", fg: "#134E4A" }, // turquoise
  { bg: "#ECEEF1", fg: "#334155" }, // gris
];
export const labelColor = (label = "") => {
  let h = 0;
  for (const ch of String(label).toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return LABEL_COLORS[h % LABEL_COLORS.length];
};

export function Label({ children }) {
  const c = labelColor(String(children));
  return <span className="sf-label" style={{ background: c.bg, color: c.fg }}>{children}</span>;
}

export const fmtDate = (s) => {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

export function DateChip({ value }) {
  if (!value) return null;
  return <span className="sf-date"><Calendar size={13} /> {fmtDate(value)}</span>;
}

export function Bar({ value = 0, color = "#34D399", h = 6 }) {
  return (
    <div className="sf-track w-full" style={{ height: h }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

function Sparkline({ points, color }) {
  if (!points || points.length < 2) return null;
  const w = 400, h = 64, max = 5, min = 1;
  const step = w / (points.length - 1);
  const y = (v) => h - ((v - min) / (max - min)) * (h - 8) - 4;
  const d = points.map((p, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" preserveAspectRatio="none" aria-hidden>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={color} opacity="0.14" />
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* Texte riche minimal : **gras** et cases « [ ] » / « [x] » cliquables. */
function Inline({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>));
}

const CHECK_RE = /^\s*(?:[-•*]\s*)?\[( |x|X)\]\s?(.*)$/;

export function RichBody({ text, onToggleLine }) {
  if (!text) return null;
  const lines = String(text).split("\n");
  const blocks = [];
  let para = [];
  const flush = (k) => { if (para.length) { blocks.push(<p key={`p${k}`} className="sf-text whitespace-pre-line"><Inline text={para.join("\n")} /></p>); para = []; } };
  lines.forEach((line, i) => {
    const m = line.match(CHECK_RE);
    if (m) {
      flush(i);
      const on = m[1].toLowerCase() === "x";
      blocks.push(
        <button key={`c${i}`} type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => onToggleLine?.(i)}
          className="flex w-full items-start gap-3 text-left">
          <span className="sf-check" data-on={on ? "true" : "false"}>{on && <Check size={12} strokeWidth={3} />}</span>
          <span className={`sf-text ${on ? "line-through opacity-50" : ""}`}><Inline text={m[2]} /></span>
        </button>
      );
    } else para.push(line);
  });
  flush("end");
  return <div className="space-y-1">{blocks}</div>;
}

export const toggleChecklistLine = (text, idx) => {
  const lines = String(text || "").split("\n");
  const m = lines[idx]?.match(CHECK_RE);
  if (!m) return text;
  lines[idx] = lines[idx].replace(/\[( |x|X)\]/, m[1].trim() ? "[ ]" : "[x]");
  return lines.join("\n");
};

/* ───────────────────────── Carte Note (Storyflow) ───────────────────────── */

const tv = (v, lang = "fr") => (v == null ? "" : typeof v === "string" ? v : v[lang] ?? v.fr ?? v.en ?? "");

export function NoteCard({ card, lang, editing, onPatch, onDone }) {
  const title = tv(card.title, lang);
  const body = tv(card.body, lang);
  const labels = Array.isArray(card.labels) ? card.labels : [];
  const setText = (field, val) => onPatch({ [field]: { ...(typeof card[field] === "object" && card[field] ? card[field] : {}), [lang]: val } });

  if (editing) {
    return (
      <div className="sf-card sf-card-sel space-y-3" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
        <input autoFocus defaultValue={title} placeholder="Titre" onBlur={(e) => setText("title", e.target.value)} className="sf-input sf-title" />
        <textarea defaultValue={body} rows={Math.max(4, body.split("\n").length + 1)} placeholder={"Écris ici…\n**gras** · [ ] case à cocher"}
          onBlur={(e) => setText("body", e.target.value)} className="sf-input sf-text" />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input defaultValue={labels.join(", ")} placeholder="Étiquettes (séparées par des virgules)"
            onBlur={(e) => onPatch({ labels: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} className="sf-field" />
          <input type="date" defaultValue={card.date || ""} onChange={(e) => onPatch({ date: e.target.value || null })} className="sf-field w-[150px]" />
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={onDone} className="sf-btn sf-btn-primary">Terminé</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sf-card" style={card.color ? { boxShadow: `inset 3px 0 0 ${card.color}` } : undefined}>
      {title && <p className="sf-title mb-2">{title}</p>}
      {body ? <RichBody text={body} onToggleLine={(i) => setText("body", toggleChecklistLine(body, i))} />
        : !title && <p className="sf-small">Double-clique pour écrire…</p>}
      {(labels.length > 0 || card.date) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {labels.map((l) => <Label key={l}>{l}</Label>)}
          <DateChip value={card.date} />
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Tableau ───────────────────────── */

export function TableCard({ card, editing, onPatch, onDone }) {
  const cols = card.columns?.length ? card.columns : ["Colonne 1", "Colonne 2"];
  const rows = card.rows?.length ? card.rows : [["", ""]];
  const setCell = (r, c, v) => onPatch({ rows: rows.map((row, i) => (i === r ? cols.map((_, j) => (j === c ? v : row[j] ?? "")) : row)) });
  const setCol = (c, v) => onPatch({ columns: cols.map((x, j) => (j === c ? v : x)) });

  return (
    <div className={`sf-table-wrap ${editing ? "sf-card-sel" : ""}`} onPointerDown={(e) => editing && e.stopPropagation()}>
      <div className="flex items-center gap-2 px-5 pb-3 pt-4">
        {editing ? <input defaultValue={card.title || ""} onBlur={(e) => onPatch({ title: e.target.value })} placeholder="Titre du tableau" className="sf-input sf-title" />
          : <p className="sf-title">{card.title || "Tableau"}</p>}
      </div>
      <table className="sf-table sf-num">
        <thead><tr>{cols.map((c, j) => <th key={j}>{editing ? <input defaultValue={c} onBlur={(e) => setCol(j, e.target.value)} /> : c}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>{cols.map((_, j) => <td key={j}>{editing ? <input defaultValue={row[j] ?? ""} onBlur={(e) => setCell(i, j, e.target.value)} /> : (row[j] ?? "")}</td>)}</tr>
          ))}
        </tbody>
      </table>
      {editing && (
        <div className="flex flex-wrap items-center gap-1 border-t px-3 py-2" style={{ borderColor: "var(--sf-line)" }}>
          <button type="button" className="sf-btn" onClick={() => onPatch({ rows: [...rows, cols.map(() => "")] })}><Plus size={14} /> Ligne</button>
          <button type="button" className="sf-btn" onClick={() => onPatch({ columns: [...cols, `Colonne ${cols.length + 1}`], rows: rows.map((r) => [...r, ""]) })}><Plus size={14} /> Colonne</button>
          {rows.length > 1 && <button type="button" className="sf-btn" onClick={() => onPatch({ rows: rows.slice(0, -1) })}><Trash2 size={14} /> Dernière ligne</button>}
          <button type="button" onClick={onDone} className="sf-btn sf-btn-primary ml-auto">Terminé</button>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Vidéo (YouTube / Vimeo / lien) ───────────────────────── */

export const youtubeId = (url = "") => {
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  return m ? m[1] : null;
};

export function VideoCard({ card, editing, onPatch, onDone }) {
  const [playing, setPlaying] = useState(false);
  const id = youtubeId(card.url);
  if (editing || !card.url) {
    return (
      <div className="sf-card sf-card-sel space-y-3" onPointerDown={(e) => e.stopPropagation()}>
        <p className="sf-title">Vidéo</p>
        <input autoFocus defaultValue={card.url || ""} placeholder="Colle un lien YouTube…" className="sf-field"
          onKeyDown={(e) => { if (e.key === "Enter") { onPatch({ url: e.target.value.trim() }); onDone(); } }}
          onBlur={(e) => onPatch({ url: e.target.value.trim() })} />
        <div className="flex justify-end"><button type="button" onClick={onDone} className="sf-btn sf-btn-primary">Terminé</button></div>
      </div>
    );
  }
  return (
    <div className="sf-card" style={{ padding: 12 }}>
      <div className="relative aspect-video w-full overflow-hidden rounded-[14px] bg-black">
        {id && playing ? (
          <iframe title="vidéo" className="absolute inset-0 h-full w-full" src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        ) : (
          <>
            {id && <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" draggable={false} className="h-full w-full object-cover" />}
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => (id ? setPlaying(true) : window.open(card.url, "_blank", "noopener"))}
              className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/70">
              <Play size={26} fill="currentColor" />
            </button>
          </>
        )}
      </div>
      <a href={card.url} target="_blank" rel="noopener noreferrer" onPointerDown={(e) => e.stopPropagation()} className="sf-small mt-2.5 flex items-center gap-2 truncate px-1 hover:underline">
        <ExternalLink size={13} className="shrink-0" /> <span className="truncate">{card.url}</span>
      </a>
    </div>
  );
}

/* ───────────────────────── Données pro en direct ───────────────────────── */

/**
 * Données live du Vision Board. Avec `override` (page publique en lecture
 * seule), on n'appelle rien : les données sont fournies telles quelles.
 */
export function useVisionLive(override) {
  const [data, setData] = useState(override || {});
  const [loading, setLoading] = useState(!override);
  const load = useCallback(async () => {
    if (override) return;
    setLoading(true);
    const keys = ["state", "objectifs", "taches", "pouls", "roadmap", "idees", "wheel", "victoires"];
    const res = await Promise.allSettled([fetchState(), fetchObjectifs(), fetchTaches(), fetchPouls(), fetchRoadmap(), fetchIdees(), fetchWheel(), fetchVictoires()]);
    const next = {};
    res.forEach((r, i) => { next[keys[i]] = r.status === "fulfilled" ? r.value : null; });
    setData(next);
    setLoading(false);
  }, [override]);
  useEffect(() => {
    if (override) { setData(override); setLoading(false); return undefined; }
    load();
    const id = setInterval(load, 120000);
    return () => clearInterval(id);
  }, [load, override]);
  const toggleTask = useCallback(async (t) => {
    if (override) return;
    const done = t.statut !== "fait";
    setData((d) => ({ ...d, taches: { items: (d.taches?.items || []).map((x) => (x.id === t.id ? { ...x, statut: done ? "fait" : "a_faire" } : x)) } }));
    try { await toggleTache(t.id); } catch { load(); }
  }, [load, override]);
  /** « + Mission » : crée une vraie tâche reliée à l'objectif. */
  const createMission = useCallback(async (objectif, titre) => {
    if (override) return false;
    try {
      await creerTache((titre || objectif.titre).slice(0, 300), 30, objectif.id);
      await load();
      return true;
    } catch { return false; }
  }, [load, override]);
  return { data, loading, reload: load, toggleTask, createMission, readOnly: !!override };
}

export const LIVE_SOURCES = [
  { id: "score",       label: "Score « Vision réalisée »", route: "/app/roadmap" },
  { id: "alertes",     label: "À surveiller (alertes)",    route: "/app" },
  { id: "vision",      label: "Ma vision & mon pourquoi",  route: "/onboarding" },
  { id: "objectifs",   label: "Objectifs du trimestre",    route: "/app/roadmap" },
  { id: "trajectoire", label: "Trajectoire (Q1 → Vision)", route: "/app/vision?view=roadmap" },
  { id: "actions",     label: "Actions (cases à cocher)",  route: "/app/actions" },
  { id: "energie",     label: "Énergie du moment",         route: "/app/bien-etre" },
  { id: "roue",        label: "Roue de l'équilibre",       route: "/app/vision?view=wheel" },
  { id: "finances",    label: "Objectif de revenu",        route: "/app" },
  { id: "suivi",       label: "Suivi financier (tableau)", route: "/app" },
  { id: "idees",       label: "Idées à fort impact",       route: "/app/ideas" },
  { id: "victoires",   label: "Victoires",                 route: "/app/revue" },
];
const SOURCE_LABEL = Object.fromEntries(LIVE_SOURCES.map((s) => [s.id, s.label]));

const eur = (v) => (typeof v === "number" ? `${v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €` : "—");
const MODE_LABEL = { elan: "Élan", equilibre: "Équilibre", refuge: "Refuge", recuperation: "Récupération" };
const listObjectifs = (data) => (Array.isArray(data.objectifs) ? data.objectifs : (data.objectifs?.items || []));

/** Score « Vision réalisée » : moyenne de l'avancement des objectifs. */
export const visionScore = (data) => {
  const list = listObjectifs(data);
  if (!list.length) return null;
  return Math.round(list.reduce((s, o) => s + Math.max(0, Math.min(100, o.progression || 0)), 0) / list.length);
};
export const PALIERS = [25, 50, 75, 100];

/** Alertes calculées à partir des vraies données (rien d'inventé). */
export function computeAlerts(data, today = new Date()) {
  const out = [];
  const objs = listObjectifs(data).filter((o) => o.statut !== "termine" && (o.progression || 0) < 100);
  const tasks = data.taches?.items || [];
  const day = 86400000;
  objs.forEach((o) => {
    if (!o.echeance) return;
    const d = new Date(o.echeance);
    if (Number.isNaN(d.getTime())) return;
    const left = Math.ceil((d - today) / day);
    if (left < 0) out.push({ level: "rouge", text: `« ${o.titre} » : échéance dépassée (${o.progression || 0} %).` });
    else if (left <= 21 && (o.progression || 0) < 60) out.push({ level: left <= 7 ? "rouge" : "ambre", text: `« ${o.titre} » : échéance dans ${left} j, seulement ${o.progression || 0} %.` });
  });
  if (data.taches) {
    const sans = objs.filter((o) => !tasks.some((t) => t.objectif_id === o.id && t.statut !== "fait"));
    if (sans.length === 1) out.push({ level: "ambre", text: `« ${sans[0].titre} » n'a aucune action en cours. Ajoute une mission.` });
    else if (sans.length > 1) out.push({ level: "ambre", text: `${sans.length} objectifs n'ont aucune action en cours. Ajoute une mission à chacun.` });
    if (!tasks.some((t) => t.statut !== "fait")) out.push({ level: "ambre", text: "Aucune action ouverte : ton cockpit tourne à vide." });
  }
  const p = data.pouls;
  if (p && p.ca_objectif > 0) {
    const dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const attendu = Math.round((today.getDate() / dim) * 100);
    if ((p.avancement || 0) < attendu - 15) out.push({ level: "ambre", text: `CA à ${p.avancement || 0} % de l'objectif alors que le mois est écoulé à ${attendu} %.` });
  }
  const tr = (data.state?.trend || []).map((x) => x.value);
  if (tr.length >= 3) {
    const [a, b, c] = tr.slice(-3);
    if (a > b && b > c) out.push({ level: "ambre", text: "Énergie en baisse depuis 3 check-ins : allège la semaine." });
    else if ((a + b + c) / 3 <= 2.3) out.push({ level: "rouge", text: "Énergie basse depuis plusieurs jours : priorité à la récupération." });
  }
  return out;
}

function LiveHead({ title, source, onOpen, readOnly, right }) {
  return (
    <>
      <div className="sf-live-band">
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => !readOnly && onOpen(source)}
          className={`sf-live ${readOnly ? "" : "hover:underline"}`} title={readOnly ? "Données en direct" : "Données en direct — ouvrir le module"}>
          Live · {SOURCE_LABEL[source] || source}
        </button>
        {right}
      </div>
      {title && <p className="sf-title mb-3">{title}</p>}
    </>
  );
}

function LiveEmpty({ title, text, source, onOpen, readOnly, cta }) {
  return (
    <div className="sf-card sf-live-card">
      <LiveHead title={title} source={source} onOpen={onOpen} readOnly={readOnly} />
      <p className="sf-small">{text}</p>
      {cta && !readOnly && (
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => onOpen(source)} className="sf-btn sf-btn-outline mt-3" style={{ height: 34, fontSize: 14 }}>
          {cta} <ExternalLink size={13} />
        </button>
      )}
    </div>
  );
}

function MissionButton({ objectif, live }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState("");
  if (live.readOnly) return null;
  const go = async () => {
    setBusy(true);
    const ok = await live.createMission(objectif, titre.trim() || undefined);
    setBusy(false);
    setOpen(false); setTitre("");
    if (ok) toast.success("Mission créée et reliée à l'objectif");
    else toast.error("Impossible de créer la mission pour le moment.");
  };
  if (open) {
    return (
      <div className="mt-2 flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
        <input autoFocus value={titre} onChange={(e) => setTitre(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") go(); if (e.key === "Escape") setOpen(false); }}
          placeholder={`Prochaine action pour « ${objectif.titre.slice(0, 30)} »`} className="sf-field" />
        <button type="button" onClick={go} disabled={busy} className="sf-btn sf-btn-primary shrink-0" style={{ height: 34 }}>{busy ? <Loader2 size={14} className="animate-spin" /> : "Créer"}</button>
      </div>
    );
  }
  return (
    <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => setOpen(true)} data-testid={`mission-add-${objectif.id}`}
      className="sf-date hover:brightness-125" style={{ color: "var(--sf-accent)" }}>
      <Plus size={13} /> Mission
    </button>
  );
}

export function LiveCard({ card, live, onOpen }) {
  const { data, loading, toggleTask, readOnly } = live;
  const src = card.source;
  const st = data.state || {};
  const common = { source: src, onOpen, readOnly };
  if (loading && !Object.keys(data).length) {
    return <div className="sf-card sf-live-card animate-pulse"><div className="h-4 w-1/2 rounded bg-white/10" /><div className="mt-4 h-3 w-full rounded bg-white/5" /><div className="mt-2 h-3 w-4/5 rounded bg-white/5" /></div>;
  }

  if (src === "score") {
    const score = visionScore(data);
    if (score == null) return <LiveEmpty title="Vision réalisée" text="Fixe tes objectifs du trimestre : leur avancement calcule ton score." cta="Fixer mes objectifs" {...common} />;
    const next = PALIERS.find((p) => p > score);
    const r = 34, c = 2 * Math.PI * r;
    return (
      <div className="sf-card sf-live-card">
        <LiveHead {...common} />
        <div className="flex items-center gap-5">
          <div className="relative h-24 w-24 shrink-0">
            <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
              <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" style={{ stroke: "rgba(255,255,255,0.09)" }} />
              <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" stroke="#DEC2A3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ transition: "stroke-dashoffset 1s ease" }} />
            </svg>
            <span className="sf-num absolute inset-0 flex items-center justify-center" style={{ fontSize: 22, fontWeight: 600 }}>{score} %</span>
          </div>
          <div>
            <p className="sf-title">Vision réalisée</p>
            <p className="sf-small mt-1">{next ? `Prochain palier : ${next} %` : "Tous les paliers sont franchis 🎉"}</p>
            <div className="mt-2 flex gap-1.5">{PALIERS.map((p) => <span key={p} className="h-1.5 w-7 rounded-full" style={{ background: score >= p ? "#DEC2A3" : "rgba(255,255,255,0.12)" }} />)}</div>
          </div>
        </div>
      </div>
    );
  }

  if (src === "alertes") {
    if (!data.objectifs && !data.taches && !data.pouls) return <LiveEmpty title="À surveiller" text="Les alertes s'afficheront dès que tes données seront disponibles." {...common} />;
    const alerts = computeAlerts(data);
    return (
      <div className="sf-card sf-live-card">
        <LiveHead title={alerts.length ? `À surveiller · ${alerts.length}` : "À surveiller"} {...common} />
        {alerts.length ? (
          <ul className="space-y-2.5">
            {alerts.slice(0, 5).map((a, i) => (
              <li key={i} className="flex gap-3">
                <AlertTriangle size={17} className="mt-[5px] shrink-0" style={{ color: a.level === "rouge" ? "#F87171" : "#FBBF24" }} />
                <span className="sf-text" style={{ lineHeight: 1.55 }}>{a.text}</span>
              </li>
            ))}
          </ul>
        ) : <p className="sf-text flex items-center gap-2"><Check size={17} className="text-emerald-400" /> Rien d'alarmant cette semaine.</p>}
      </div>
    );
  }

  if (src === "vision") {
    const v = st.vision || {};
    if (!v.texte && !v.pourquoi) return <LiveEmpty title="Ma vision" text="Ta vision et ton « pourquoi » ne sont pas encore écrits. Complète-les pour qu'ils s'affichent ici." cta="Écrire ma vision" {...common} />;
    return (
      <div className="sf-card sf-live-card">
        <LiveHead title="Ma vision" {...common} />
        {v.texte && <p className="sf-text whitespace-pre-line">{v.texte}</p>}
        {v.pourquoi && <><p className="sf-title mb-1.5 mt-5">Pourquoi je me suis lancé</p><p className="sf-text whitespace-pre-line">{v.pourquoi}</p></>}
        {v.valeurs?.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{v.valeurs.map((x) => <Label key={x}>{x}</Label>)}</div>}
      </div>
    );
  }

  if (src === "objectifs") {
    const list = listObjectifs(data);
    if (!list.length) return <LiveEmpty title="Objectifs du trimestre" text="Aucun objectif pour l'instant. Trois maximum : tout le reste attend." cta="Fixer mes objectifs" {...common} />;
    const tasks = data.taches?.items || [];
    return (
      <div className="sf-card sf-live-card">
        <LiveHead title="Objectifs du trimestre" {...common} />
        <div className="space-y-5">
          {list.slice(0, 5).map((o, i) => {
            const mine = tasks.filter((t) => t.objectif_id === o.id);
            const open = mine.filter((t) => t.statut !== "fait").length;
            const done = o.statut === "termine" || (o.progression || 0) >= 100;
            return (
              <div key={o.id} data-testid={`live-objectif-${o.id}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className={`sf-text ${done ? "line-through opacity-60" : ""}`}>{o.titre}</p>
                  <span className="sf-small sf-num shrink-0">{o.progression || 0} %</span>
                </div>
                <div className="mt-1.5"><Bar value={o.progression} /></div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <Label>{`Priorité ${i + 1}`}</Label>
                  <DateChip value={o.echeance} />
                  {data.taches && !done && (
                    <span className="sf-date" style={open ? undefined : { color: "#FBBF24" }} title="Actions reliées à cet objectif">
                      {open ? `${open} action${open > 1 ? "s" : ""}` : "0 action"}{mine.length > open ? ` · ${mine.length - open} faite${mine.length - open > 1 ? "s" : ""}` : ""}
                    </span>
                  )}
                  {!done && <MissionButton objectif={o} live={live} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (src === "trajectoire") {
    const r = data.roadmap || {};
    const tasks = data.taches?.items || [];
    const faites = tasks.filter((t) => t.statut === "fait").length;
    const score = visionScore(data);
    const Q = [["q1", "Q1 · Fondations"], ["q2", "Q2 · Traction"], ["q3", "Q3 · Accélération"], ["q4", "Q4 · Consolidation"]];
    const steps = [
      { label: "Aujourd'hui", detail: `${faites} action${faites > 1 ? "s" : ""} bouclée${faites > 1 ? "s" : ""}${score != null ? ` · ${score} % de la vision` : ""}`, state: "done" },
      ...Q.map(([k, label]) => {
        const items = r[k] || [];
        const d = items.filter((x) => x.done).length;
        const next = items.find((x) => !x.done);
        return { label, detail: items.length ? `${d}/${items.length} jalons${next ? ` · prochain : ${next.titre}` : ""}` : "Aucun jalon posé", state: items.length && d === items.length ? "done" : d ? "partial" : "todo" };
      }),
      { label: "Ma vision", detail: (st.vision?.texte || "À écrire").slice(0, 110) + ((st.vision?.texte || "").length > 110 ? "…" : ""), state: "goal" },
    ];
    const color = { done: "#34D399", partial: "#FBBF24", todo: "rgba(255,255,255,0.22)", goal: "#DEC2A3" };
    return (
      <div className="sf-card sf-live-card">
        <LiveHead title="Trajectoire" {...common} />
        <ol className="relative ml-1.5 border-l pl-6" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
          {steps.map((s, i) => (
            <li key={i} className={i < steps.length - 1 ? "pb-4" : ""}>
              <span className="absolute -left-[7px] mt-[7px] h-3 w-3 rounded-full" style={{ background: color[s.state], boxShadow: "0 0 0 3px var(--sf-card)" }} />
              <p className="sf-text" style={{ fontWeight: 600, lineHeight: 1.5 }}>{s.label}</p>
              <p className="sf-small" style={{ fontSize: 14 }}>{s.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (src === "actions") {
    const items = data.taches?.items || [];
    if (!items.length) return <LiveEmpty title="Actions" text="Aucune action. Découpe ton premier objectif en une action de 15 minutes." cta="Ajouter une action" {...common} />;
    const sorted = [...items.filter((t) => t.statut === "en_cours"), ...items.filter((t) => t.statut === "a_faire"), ...items.filter((t) => t.statut === "fait")];
    const done = items.filter((t) => t.statut === "fait").length;
    const objTitle = Object.fromEntries(listObjectifs(data).map((o) => [o.id, o.titre]));
    return (
      <div className="sf-card sf-live-card">
        <LiveHead title={`Actions · ${done}/${items.length}`} {...common} />
        <div className="space-y-1.5">
          {sorted.slice(0, 8).map((t) => {
            const on = t.statut === "fait";
            return (
              <button key={t.id} type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => toggleTask(t)} disabled={readOnly} className="flex w-full items-start gap-3 text-left">
                <span className="sf-check" data-on={on ? "true" : "false"}>{on && <Check size={12} strokeWidth={3} />}</span>
                <span className={`flex-1 ${on ? "line-through opacity-50" : ""}`}>
                  <span className="sf-text">{t.titre}</span>
                  {t.objectif_id && objTitle[t.objectif_id] && <span className="sf-small block" style={{ fontSize: 13, lineHeight: 1.3 }}>→ {objTitle[t.objectif_id]}</span>}
                </span>
                {t.statut === "en_cours" && <span className="mt-1"><Label>En cours</Label></span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (src === "energie") {
    const e = st.energy;
    if (e?.masque) return <LiveEmpty title="Énergie du moment" text="Masqué sur ce lien partagé." {...common} />;
    if (!e?.a_checkin) return <LiveEmpty title="Énergie du moment" text="Aucun check-in d'énergie encore. Un check-in par jour suffit pour voir ta courbe ici." cta="Faire mon check-in" {...common} />;
    return (
      <div className="sf-card sf-live-card">
        <LiveHead title="Énergie du moment" {...common} />
        <p className="sf-num" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1 }}>{e.score}<span className="sf-small"> / 5</span></p>
        {st.trend?.length > 1 && <div className="mt-3"><Sparkline points={st.trend} color="#2DD4BF" /></div>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Label>{`Mode ${MODE_LABEL[e.mode] || e.mode}`}</Label>
          {e.recuperation && <Label>Vigilance</Label>}
        </div>
        {st.balance && (
          <div className="mt-5">
            <div className="sf-small sf-num mb-1.5 flex justify-between"><span>Pro {st.balance.pro} %</span><span>Perso {st.balance.perso} %</span></div>
            <div className="sf-track flex h-2 w-full"><div style={{ width: `${st.balance.pro}%`, background: "#60A5FA" }} /><div style={{ width: `${st.balance.perso}%`, background: "#2DD4BF" }} /></div>
          </div>
        )}
      </div>
    );
  }

  if (src === "roue") {
    const pillars = data.wheel?.pillars || [];
    if (!pillars.length) return <LiveEmpty title="Roue de l'équilibre" text="Ta roue de l'équilibre n'est pas encore remplie." cta="Remplir ma roue" {...common} />;
    return (
      <div className="sf-card sf-live-card">
        <LiveHead title="Roue de l'équilibre" {...common} />
        <div className="space-y-3">
          {pillars.map((p) => (
            <div key={p.name}>
              <div className="mb-1 flex justify-between"><span className="sf-text" style={{ lineHeight: 1.4 }}>{p.name}</span><span className="sf-small sf-num">{p.score}</span></div>
              <Bar value={p.score} color={p.color || "#2DD4BF"} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (src === "finances" || src === "suivi") {
    const p = data.pouls;
    const title = src === "suivi" ? "Suivi financier" : "Objectif de revenu";
    if (!p || !(p.ca_objectif > 0 || p.ca_mensuel > 0)) {
      return <LiveEmpty title={title} text="Ton CA du mois et ton objectif ne sont pas encore renseignés (saisie manuelle ou Qonto, depuis le Cockpit)." cta="Renseigner mon CA" {...common} />;
    }
    if (src === "suivi") {
      return (
        <div className="sf-table-wrap sf-live-card">
          <div className="px-6 pb-2 pt-5"><LiveHead title="Suivi du mois" {...common} /></div>
          <table className="sf-table sf-num">
            <thead><tr><th>Indicateur</th><th>Valeur</th></tr></thead>
            <tbody>
              <tr><td>CA du mois</td><td>{eur(p.ca_mensuel)}</td></tr>
              <tr><td>Objectif</td><td>{eur(p.ca_objectif)}</td></tr>
              <tr><td>Trésorerie</td><td>{eur(p.tresorerie)}</td></tr>
              <tr><td>Factures en attente</td><td>{p.factures_en_attente}</td></tr>
            </tbody>
          </table>
        </div>
      );
    }
    return (
      <div className="sf-card sf-live-card">
        <LiveHead title={title} {...common} />
        <p className="sf-text"><strong className="sf-num">{eur(p.ca_mensuel)}</strong> encaissés sur <strong className="sf-num">{eur(p.ca_objectif)}</strong> ce mois-ci.</p>
        <div className="mt-3"><Bar value={p.avancement} color="#FBBF24" h={8} /></div>
        {p.phrase_ia && <p className="sf-small mt-3 flex gap-2"><Sparkles size={14} className="mt-1 shrink-0" /> {p.phrase_ia}</p>}
        <div className="mt-4 flex flex-wrap gap-2"><Label>Finances</Label><Label>{`Source : ${p.source || "manuel"}`}</Label></div>
      </div>
    );
  }

  if (src === "idees") {
    const list = [...(Array.isArray(data.idees) ? data.idees : [])].sort((a, b) => (b.score || 0) - (a.score || 0));
    if (!list.length) return <LiveEmpty title="Idées" text="Aucune idée capturée. Note-les au fil de l'eau : l'IA les classe par impact / effort." cta="Noter une idée" {...common} />;
    return (
      <div className="sf-card sf-live-card">
        <LiveHead title="Idées à fort impact" {...common} />
        <div className="space-y-4">
          {list.slice(0, 4).map((it) => (
            <div key={it.id}>
              <p className="sf-text" style={{ fontWeight: 600 }}>{it.titre}</p>
              {it.description && <p className="sf-small mt-0.5 line-clamp-2">{it.description}</p>}
              <div className="mt-2 flex flex-wrap gap-2"><Label>{`Score ${it.score}`}</Label>{it.objectif_titre && <Label>{it.objectif_titre}</Label>}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (src === "victoires") {
    const list = Array.isArray(data.victoires) ? data.victoires : [];
    if (!list.length) return <LiveEmpty title="Victoires" text="Aucune victoire notée pour l'instant. Note-les chaque semaine dans ta revue : elles te porteront les jours sans énergie." cta="Ouvrir la revue" {...common} />;
    return (
      <div className="sf-card sf-live-card">
        <LiveHead title="Mes victoires" {...common} />
        <div className="space-y-4">
          {list.slice(0, 4).map((v) => (
            <div key={v.id}>
              <p className="sf-text flex gap-2" style={{ lineHeight: 1.55 }}><Trophy size={16} className="mt-[5px] shrink-0" style={{ color: "#DEC2A3" }} /> <span>{v.texte}</span></p>
              <div className="ml-6 mt-1.5 flex items-center gap-2"><DateChip value={v.date} />{v.detail && <span className="sf-small truncate" style={{ fontSize: 13 }}>{v.detail}</span>}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <div className="sf-card sf-small">Source inconnue.</div>;
}
