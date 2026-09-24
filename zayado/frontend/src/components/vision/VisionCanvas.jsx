import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus, Minus, MousePointer2, Hand, Loader2, Check, AlertTriangle, X, Send,
  Type, Image as ImageIcon, ListChecks, Palette, FileText,
  LayoutTemplate, Quote, FileDown, ArrowRight, Wand2, RefreshCw, Maximize2, Heart,
  Undo2, Redo2, Spline, PenTool, Trash2, LayoutGrid, Columns3, Table2, Video, Heading1,
  Activity, ChevronLeft, ChevronRight, Presentation, Download, RotateCcw, StickyNote,
  Pencil, Pin, PinOff, Share2, Map as MapIcon, Copy, Filter, BookOpen, Search, Files, Upload,
} from "lucide-react";
import {
  fetchBoard, saveBoard, fetchStarterTemplates, generateAiDoc, generateBoard, fetchInspire, searchUnsplash,
  fetchShare, saveShare, revokeShare, saveGeneratedDocument,
} from "@/lib/kairosApi";
import { useI18n } from "@/i18n";
import {
  CardStyleMenu, CardTagBadges, TagFilterBar, STICKY_PALETTE, stickyOf, usesPaperPalette,
} from "@/components/vision/CardStyleMenu";
import { BoardSwitcher } from "@/components/vision/BoardSwitcher";
import { AiImageRow } from "@/components/vision/AiImageRow";
import { VoiceCapture } from "@/components/vision/VoiceCapture";
import { NoteCard, TableCard, VideoCard, LiveCard, LIVE_SOURCES, useVisionLive, visionScore, PALIERS } from "@/components/vision/SfCards";
import { cockpitTemplate, WALL_COLORS } from "@/components/vision/cockpitTemplate";
import "./sf.css";

/* ─────────────────────────────────────────────────────────────
   Canvas Vision — refonte inspirée de Storyflow
   · Murs (colonnes numérotées) dans lesquels on glisse les cartes
   · Cartes Storyflow : titre, texte, **gras**, cases à cocher,
     étiquettes pastel, date, tableau, vidéo, image
   · Cartes LIVE reliées aux données pro (objectifs, actions,
     énergie, finances, idées) — jamais de chiffres inventés
   · Lignes entre cartes, dessin libre, corbeille, annuler/rétablir,
     présentation mur par mur, export PNG/PDF cadré sur le contenu
   Rétro-compatible : post-it, polaroïd, pilier KPI, image, palette
   et document IA des anciens boards s'affichent toujours.
   ───────────────────────────────────────────────────────────── */

const BOARD_W = 6400;
const BOARD_H = 4200;
const MIN_Z = 0.2;
const MAX_Z = 1.6;
const BOARD_STORAGE = "kairos_board_key";
const MM_W = 176;
const MM_H = Math.round((MM_W * BOARD_H) / BOARD_W);

const tv = (v, lang = "fr") => (v == null ? "" : typeof v === "string" ? v : v[lang] ?? v.fr ?? v.en ?? "");
const clampZ = (z) => Math.min(MAX_Z, Math.max(MIN_Z, +z.toFixed(2)));
const uid = (p = "u") => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

/** Types qui peuvent vivre dans un mur. */
const DROPPABLE = new Set(["note", "table", "video", "live", "image", "sticky", "polaroid", "kpi", "color", "ai-doc"]);
const EDITABLE = new Set(["note", "table", "video", "heading", "wall", "image", "ai-doc", "sticky", "kpi", "polaroid"]);

const AI_DOC_TYPES = ["note", "brief", "plan", "positioning", "swot"];
const AI_DOC_KEYS = { note: "t1", brief: "t2", plan: "t3", positioning: "t4", swot: "t5" };

const itemName = (it, lang) => {
  if (it.type === "wall") return `Mur · ${it.title || "Sans titre"}`;
  if (it.type === "heading") return it.text || "Titre";
  if (it.type === "live") return `Live · ${LIVE_SOURCES.find((s) => s.id === it.source)?.label || it.source}`;
  if (it.type === "draw") return "Dessin";
  if (it.type === "table") return it.title || "Tableau";
  if (it.type === "video") return "Vidéo";
  return tv(it.title, lang) || it.label || it.caption || tv(it.body, lang).slice(0, 40) || it.type;
};

/**
 * Migration : la version précédente gardait murs et liaisons dans le
 * localStorage du navigateur (perdus sur un autre appareil). On les
 * reprend une fois dans le board sauvegardé côté serveur, puis on nettoie.
 * Les 3 murs par défaut (jamais personnalisés) ne sont pas repris.
 */
const LEGACY_LAYOUT_KEY = "kairos_vision_layout_v1";
const LEGACY_DEFAULT_WALLS = new Set(["wall_vision", "wall_objectifs", "wall_actions"]);
function migrateLocalLayout(boardKey, cards) {
  let all;
  try { all = JSON.parse(localStorage.getItem(LEGACY_LAYOUT_KEY) || "{}"); } catch (_) { return cards; }
  const layout = all?.[boardKey];
  if (!layout) return cards;
  const ids = new Set(cards.map((c) => c.id));
  const walls = (layout.walls || [])
    .filter((w) => !LEGACY_DEFAULT_WALLS.has(w.id) && !ids.has(w.id))
    .map((w) => ({ id: w.id, type: "wall", x: w.x, y: w.y, w: w.w || 500, color: w.color, title: String(w.title || "Mur").replace(/^\s*\d+\s*·\s*/, "") }));
  const lines = (layout.connections || [])
    .filter((c) => ids.has(c.from) && ids.has(c.to) && !ids.has(c.id))
    .map((c) => ({ id: c.id, type: "line", from: c.from, to: c.to }));
  try { delete all[boardKey]; localStorage.setItem(LEGACY_LAYOUT_KEY, JSON.stringify(all)); } catch (_) {}
  return walls.length || lines.length ? [...cards, ...walls, ...lines] : cards;
}

/** Titre avec jeton {prenom} (modèle cockpit) → prénom du profil, ou « Mon cockpit ». */
const headingText = (text, prenom) => {
  const s = text || "Titre";
  if (!s.includes("{prenom}")) return s;
  return prenom ? s.replace("{prenom}", prenom) : s.replace("Le cockpit de {prenom}", "Mon cockpit").replace("{prenom}", "");
};

/* ───────────────────────── Document IA (modale) ───────────────────────── */

function AiDocModal({ open, onClose, onGenerated }) {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState("");
  const [docType, setDocType] = useState("note");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const k = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);

  const generate = async () => {
    const value = prompt.trim();
    if (value.length < 3) return toast.error(t("vision.aiDoc.short"));
    setLoading(true);
    try {
      const res = await generateAiDoc(value, docType);
      onGenerated({ title: res.title, content: res.content, docType: res.doc_type });
      try {
        const sync = await saveGeneratedDocument(res.title, res.content);
        if (sync?.ok && !sync.skipped) {
          window.dispatchEvent(new CustomEvent("zayado:cloud-sync", { detail: { provider: sync.provider, name: sync.name, url: sync.url } }));
          toast.success("Document ajouté au tableau et transmis dans ton cloud.");
        }
      } catch { toast.info("Document ajouté au tableau. Active une destination cloud dans Paramètres pour l’enregistrer automatiquement."); }
      onClose();
      setPrompt("");
      toast.success(t("vision.aiDoc.added"));
    } catch {
      toast.error(t("vision.aiDoc.error"));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#060a18]/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="sf sf-menu relative w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()} data-testid="vision-ai-doc-modal">
        <button onClick={onClose} className="sf-btn absolute right-3 top-3" data-testid="vision-ai-doc-close"><X size={16} /></button>
        <p className="sf-title" style={{ fontSize: 18 }}>{t("vision.aiDoc.title")}</p>
        <p className="sf-small mb-4">{t("vision.aiDoc.lead")}</p>
        <div className="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {AI_DOC_TYPES.map((id) => (
            <button key={id} onClick={() => setDocType(id)} data-testid={`vision-ai-doc-type-${id}`}
              className="rounded-xl border px-3 py-2 text-left transition"
              style={{ borderColor: docType === id ? "var(--sf-accent)" : "var(--sf-line)", background: docType === id ? "rgba(222,194,163,0.12)" : "var(--sf-card)" }}>
              <div className="text-[13px] font-semibold">{t(`vision.aiDoc.${AI_DOC_KEYS[id]}`)}</div>
              <div className="sf-small mt-0.5" style={{ fontSize: 12, lineHeight: 1.35 }}>{t(`vision.aiDoc.${AI_DOC_KEYS[id]}h`)}</div>
            </button>
          ))}
        </div>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} autoFocus
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate(); }}
          placeholder={t("vision.aiDoc.placeholder")} data-testid="vision-ai-doc-prompt" className="sf-field" style={{ fontSize: 15 }} />
        <button onClick={generate} disabled={loading} data-testid="vision-ai-doc-generate" className="sf-btn sf-btn-primary mt-3 h-10 w-full">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
          {loading ? t("vision.aiDoc.generating") : t("vision.aiDoc.generate")}
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Menu flottant ───────────────────────── */

function Popover({ open, onClose, className = "", style, children, testid }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-[55]" onPointerDown={onClose} />
      <div className={`sf-menu absolute z-[56] p-1.5 ${className}`} style={style} data-testid={testid} onPointerDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </>
  );
}

/* ───────────────────────── Composant principal ───────────────────────── */

/** Petit écran : un mur par écran au lieu du canvas libre. */
function useIsSmall() {
  const [small, setSmall] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const on = () => setSmall(window.innerWidth < 768);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return small;
}

const MINIMAP_KEY = "kairos_vision_minimap";
const ONBOARD_KEY = "kairos_vision_onboard_dismissed";
const PALIER_KEY = "kairos_vision_palier";

/**
 * @param readOnly     page publique (lien partagé) : aucune modification possible
 * @param initialItems cartes fournies (lecture seule)
 * @param liveData     données live fournies (lecture seule)
 */
export function VisionCanvas({ readOnly = false, initialItems = null, liveData = null } = {}) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const live = useVisionLive(readOnly ? (liveData || {}) : undefined);
  const isSmall = useIsSmall();
  const prenom = live.data?.state?.profile?.prenom || "";

  const [boardKey, setBoardKey] = useState(() => {
    try { return localStorage.getItem(BOARD_STORAGE) || "perso"; } catch (_) { return "perso"; }
  });
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [zoom, setZoom] = useState(0.6);
  const [mode, setMode] = useState("select"); // select | hand | line | draw
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [styleMenuId, setStyleMenuId] = useState(null);
  const [wallColorId, setWallColorId] = useState(null);
  const [tagFilter, setTagFilter] = useState("all");
  const [menu, setMenu] = useState(null); // all | live | images | trash | export | add
  const [aiDocOpen, setAiDocOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [viewport, setViewport] = useState({ left: 0, top: 0, w: 0, h: 0 });
  const [rects, setRects] = useState({});
  const [dropTarget, setDropTarget] = useState(null); // { wall, index }
  const [lineFrom, setLineFrom] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [drawPts, setDrawPts] = useState(null);
  const [presenting, setPresenting] = useState(false);
  const [presentIdx, setPresentIdx] = useState(0);
  const [, setHistVer] = useState(0);
  const [unsplash, setUnsplash] = useState({ q: "", results: [], loading: false });
  const [showMinimap, setShowMinimap] = useState(() => { try { return localStorage.getItem(MINIMAP_KEY) === "1"; } catch (_) { return false; } });
  const [shareOpen, setShareOpen] = useState(false);
  const [onboardHidden, setOnboardHidden] = useState(() => { try { return localStorage.getItem(ONBOARD_KEY) === "1"; } catch (_) { return false; } });
  const [mobileWall, setMobileWall] = useState(0);
  const [docsOpen, setDocsOpen] = useState(false);
  const [docQuery, setDocQuery] = useState("");
  const [fileOver, setFileOver] = useState(false);
  const fileInputRef = useRef(null);

  const rootRef = useRef(null);
  const scrollRef = useRef(null);
  const boardRef = useRef(null);
  const dragRef = useRef(null);
  const dropRef = useRef(null);
  const panRef = useRef(null);
  const rotateRef = useRef(null);
  const resizeRef = useRef(null);
  const drawRef = useRef(null);
  const rectsRef = useRef({});
  const skipSaveRef = useRef(false);
  const needScrollRef = useRef(true);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  // Historique (annuler / rétablir)
  const stableRef = useRef(null);
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const histSkipRef = useRef(false);

  /* ── Chargement du board courant ── */
  const loadBoard = useCallback((key) => {
    if (readOnly) {
      skipSaveRef.current = true;
      needScrollRef.current = true;
      setItems(Array.isArray(initialItems) ? initialItems : []);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    skipSaveRef.current = true;
    needScrollRef.current = true;
    stableRef.current = null; pastRef.current = []; futureRef.current = [];
    fetchBoard(key)
      .then((r) => {
        let cards = Array.isArray(r.cards) ? r.cards : [];
        const migrated = migrateLocalLayout(key, cards);
        if (migrated !== cards) skipSaveRef.current = false; // sauvegarder tout de suite la reprise
        cards = migrated;
        // Board perso vide → on démarre sur le cockpit A → Z relié aux données
        setItems(cards.length === 0 && key === "perso" ? cockpitTemplate({}) : cards);
      })
      .catch(() => setItems([]))
      .finally(() => setLoaded(true));
  }, [readOnly, initialItems]);

  useEffect(() => { loadBoard(boardKey); }, [boardKey, loadBoard]);

  const switchBoard = (key) => {
    if (key === boardKey) return;
    try { localStorage.setItem(BOARD_STORAGE, key); } catch (_) {}
    setStyleMenuId(null); setEditingId(null); setSelectedId(null);
    setBoardKey(key);
  };

  /* ── Sauvegarde auto (debounce, pas pendant un glisser) ── */
  useEffect(() => {
    if (!loaded || readOnly) return;
    if (skipSaveRef.current) { skipSaveRef.current = false; return; }
    if (draggingId) return;
    setSaving(true);
    const id = setTimeout(() => {
      saveBoard(items, boardKey).then(() => setSaveError(false)).catch(() => setSaveError(true)).finally(() => setSaving(false));
    }, 700);
    return () => clearTimeout(id);
  }, [items, loaded, boardKey, draggingId, readOnly]);

  /* ── Historique ── */
  useEffect(() => {
    if (!loaded || draggingId) return;
    if (stableRef.current === null) { stableRef.current = items; return; }
    if (histSkipRef.current) { histSkipRef.current = false; stableRef.current = items; return; }
    const id = setTimeout(() => {
      if (stableRef.current !== items) {
        pastRef.current.push(stableRef.current);
        if (pastRef.current.length > 80) pastRef.current.shift();
        futureRef.current = [];
        stableRef.current = items;
        setHistVer((v) => v + 1);
      }
    }, 350);
    return () => clearTimeout(id);
  }, [items, loaded, draggingId]);

  const undo = useCallback(() => {
    if (readOnly) return;
    const cur = itemsRef.current;
    const prev = stableRef.current && stableRef.current !== cur ? stableRef.current : pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push(cur);
    histSkipRef.current = true;
    setItems(prev);
    setEditingId(null);
    setHistVer((v) => v + 1);
  }, [readOnly]);
  const redo = useCallback(() => {
    if (readOnly) return;
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(itemsRef.current);
    histSkipRef.current = true;
    setItems(next);
    setHistVer((v) => v + 1);
  }, [readOnly]);
  const canUndo = pastRef.current.length > 0 || (stableRef.current !== null && stableRef.current !== items);
  const canRedo = futureRef.current.length > 0;

  /* ── Dérivés ── */
  const trashedIds = useMemo(() => new Set(items.filter((i) => i.trashed).map((i) => i.id)), [items]);
  const activeItems = useMemo(() => items.filter((i) => !i.trashed && !(i.parent && trashedIds.has(i.parent))), [items, trashedIds]);
  const walls = useMemo(() => activeItems.filter((i) => i.type === "wall"), [activeItems]);
  const wallIds = useMemo(() => new Set(walls.map((w) => w.id)), [walls]);
  const wallNumber = useMemo(() => {
    const m = {};
    [...walls].sort((a, b) => a.x - b.x || a.y - b.y).forEach((w, i) => { m[w.id] = i + 1; });
    return m;
  }, [walls]);
  const lines = useMemo(() => activeItems.filter((i) => i.type === "line"), [activeItems]);
  const trashItems = useMemo(() => items.filter((i) => i.trashed && i.type !== "line"), [items]);
  // Tiroir « Documents » : documents IA + notes longues du board courant.
  const docItems = useMemo(() => activeItems.filter((i) => i.type === "ai-doc" || (i.type === "note" && ((i.body?.fr || i.body || "") + "").length > 280)), [activeItems]);

  const isVisible = useCallback((card) => {
    if (tagFilter === "all" || ["wall", "heading", "draw", "live"].includes(card.type)) return true;
    const tags = Array.isArray(card.tags) ? card.tags : [];
    if (tagFilter === "none") return tags.length === 0;
    return tags.includes(tagFilter);
  }, [tagFilter]);

  const freeItems = useMemo(
    () => activeItems.filter((i) => i.type !== "wall" && i.type !== "line" && (!i.parent || !wallIds.has(i.parent)) && isVisible(i)),
    [activeItems, wallIds, isVisible],
  );
  const childrenOf = useCallback(
    (wid) => activeItems.filter((i) => i.parent === wid && isVisible(i)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [activeItems, isVisible],
  );

  const tagCounts = useMemo(() => {
    const c = { all: 0, elan: 0, refuge: 0, none: 0 };
    activeItems.forEach((it) => {
      if (["wall", "line", "heading", "draw", "live"].includes(it.type)) return;
      c.all += 1;
      const tags = Array.isArray(it.tags) ? it.tags : [];
      if (!tags.length) c.none += 1;
      if (tags.includes("elan")) c.elan += 1;
      if (tags.includes("refuge")) c.refuge += 1;
    });
    return c;
  }, [activeItems]);

  /* ── Mesure des positions réelles (y compris cartes dans les murs) ── */
  const measure = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const br = board.getBoundingClientRect();
    const z = zoomRef.current;
    const next = {};
    board.querySelectorAll("[data-item-id]").forEach((el) => {
      const r = el.getBoundingClientRect();
      next[el.dataset.itemId] = { x: (r.left - br.left) / z, y: (r.top - br.top) / z, w: r.width / z, h: r.height / z };
    });
    rectsRef.current = next;
    setRects((prev) => {
      const a = Object.keys(prev), b = Object.keys(next);
      const same = a.length === b.length && b.every((k) => prev[k] && Math.abs(prev[k].x - next[k].x) < 0.5 && Math.abs(prev[k].y - next[k].y) < 0.5 && Math.abs(prev[k].w - next[k].w) < 0.5 && Math.abs(prev[k].h - next[k].h) < 0.5);
      return same ? prev : next;
    });
  }, []);

  useLayoutEffect(() => { measure(); }, [items, zoom, editingId, tagFilter, measure, live.data]);
  useEffect(() => {
    const board = boardRef.current;
    if (!board || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => measure());
    board.querySelectorAll("[data-item-id]").forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [items, loaded, measure]);

  /* Au chargement : zoom lisible ajusté pour ~3 murs, puis se placer sur le contenu */
  useEffect(() => {
    if (!loaded || !needScrollRef.current || !scrollRef.current) return;
    const vals = Object.values(rects);
    if (!vals.length && activeItems.length) return;
    needScrollRef.current = false;
    const el = scrollRef.current;
    const minX = vals.length ? Math.min(...vals.map((r) => r.x)) : 0;
    const minY = vals.length ? Math.min(...vals.map((r) => r.y)) : 0;
    const ws = walls.map((w) => rectsRef.current[w.id]).filter(Boolean).sort((a, b) => a.x - b.x);
    let z = 0.8;
    if (ws.length) {
      const last = ws[Math.min(2, ws.length - 1)];
      const span = last.x + last.w - ws[0].x;
      z = clampZ(Math.max(0.55, Math.min(1, (el.clientWidth - 150) / span)));
    }
    setZoom(z);
    requestAnimationFrame(() => {
      el.scrollLeft = Math.max(0, minX * z - (readOnly ? 40 : 120));
      el.scrollTop = Math.max(0, minY * z - 70);
    });
  }, [loaded, rects, activeItems.length, walls, readOnly]);

  /* Paliers « Vision réalisée » : 25 / 50 / 75 / 100 % → message de célébration */
  useEffect(() => {
    if (readOnly) return;
    const score = visionScore(live.data || {});
    if (score == null) return;
    const reached = [...PALIERS].reverse().find((p) => score >= p) || 0;
    let prev = null;
    try { prev = localStorage.getItem(PALIER_KEY); } catch (_) {}
    if (prev !== null && reached > Number(prev)) {
      toast.success(`🎉 Palier franchi : ${reached} % de ta vision réalisée !`, { duration: 6000 });
    }
    try { localStorage.setItem(PALIER_KEY, String(reached)); } catch (_) {}
  }, [live.data, readOnly]);

  /* ── Viewport / mini-carte ── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const update = () => setViewport({ left: el.scrollLeft, top: el.scrollTop, w: el.clientWidth, h: el.clientHeight });
    update();
    el.addEventListener("scroll", update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [loaded]);

  const toBoard = useCallback((clientX, clientY) => {
    const br = boardRef.current?.getBoundingClientRect();
    if (!br) return { x: 0, y: 0 };
    return { x: (clientX - br.left) / zoomRef.current, y: (clientY - br.top) / zoomRef.current };
  }, []);

  /** Zoom en gardant le centre de l'écran fixe. */
  const zoomTo = useCallback((nz) => {
    const el = scrollRef.current;
    const z0 = zoomRef.current;
    const z1 = clampZ(nz);
    if (!el || z1 === z0) { setZoom(z1); return; }
    const cx = (el.scrollLeft + el.clientWidth / 2) / z0;
    const cy = (el.scrollTop + el.clientHeight / 2) / z0;
    setZoom(z1);
    requestAnimationFrame(() => {
      el.scrollLeft = cx * z1 - el.clientWidth / 2;
      el.scrollTop = cy * z1 - el.clientHeight / 2;
    });
  }, []);

  const viewCenter = () => {
    const el = scrollRef.current;
    if (!el) return { x: 600, y: 400 };
    return { x: (el.scrollLeft + el.clientWidth / 2) / zoom, y: (el.scrollTop + el.clientHeight / 2) / zoom };
  };

  /* ── Aller à une carte (tiroir Documents) ── */
  const focusItem = (id) => {
    const it = itemsRef.current.find((i) => i.id === id);
    const r = rectsRef.current[id] || (it?.parent && rectsRef.current[it.parent]);
    const el = scrollRef.current;
    setSelectedId(id);
    if (el && r) {
      el.scrollTo({ left: Math.max(0, (r.x + r.w / 2) * zoomRef.current - el.clientWidth / 2), top: Math.max(0, r.y * zoomRef.current - 90), behavior: "smooth" });
    }
    if (isSmall) setDocsOpen(false);
  };

  /* ── Images depuis l'ordinateur (glisser-déposer ou bouton) ──
     Pas de stockage de fichiers côté serveur : l'image est réduite (1400 px,
     JPEG) puis gardée dans le board, pour rester légère à sauvegarder. */
  const imageToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        const max = 1400;
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve({ url: c.toDataURL("image/jpeg", 0.82), ratio: c.height / c.width });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  const addImageFiles = async (files, point) => {
    const list = Array.from(files || []).filter((f) => /^image\//.test(f.type)).slice(0, 6);
    if (!list.length) { toast.error("Dépose une image (JPG, PNG, WebP…)."); return; }
    const poids = itemsRef.current.filter((i) => typeof i.image === "string" && i.image.startsWith("data:")).reduce((n, i) => n + i.image.length, 0);
    if (poids > 6_000_000) { toast.error("Ce board contient déjà beaucoup d'images importées : colle plutôt un lien d'image."); return; }
    const base = point || viewCenter();
    let n = 0;
    for (const f of list) {
      try {
        const { url, ratio } = await imageToDataUrl(f);
        const w = 380;
        addItem({ type: "image", w, h: Math.round(w * ratio), image: url, title: { fr: "", en: "" }, x: Math.max(20, base.x - w / 2 + n * 40), y: Math.max(20, base.y - 120 + n * 40) }, { intoWall: false });
        n += 1;
      } catch { /* image illisible : on passe à la suivante */ }
    }
    if (n) toast.success(n > 1 ? `${n} images ajoutées` : "Image ajoutée");
  };
  const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes("Files");
  const onFileDragOver = (e) => { if (readOnly || !hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; if (!fileOver) setFileOver(true); };
  const onFileDragLeave = (e) => { if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) setFileOver(false); };
  const onFileDrop = (e) => {
    if (readOnly || !hasFiles(e)) return;
    e.preventDefault();
    setFileOver(false);
    const el = scrollRef.current;
    let point = null;
    if (el) {
      const r = el.getBoundingClientRect();
      point = { x: (e.clientX - r.left + el.scrollLeft) / zoomRef.current, y: (e.clientY - r.top + el.scrollTop) / zoomRef.current };
    }
    addImageFiles(e.dataTransfer.files, point);
  };

  /* ── Création d'éléments ── */
  const targetWall = () => {
    const sel = items.find((i) => i.id === selectedId);
    if (!sel) return null;
    if (sel.type === "wall") return sel.id;
    if (sel.parent && wallIds.has(sel.parent)) return sel.parent;
    return null;
  };

  const addItem = (item, { edit = false, intoWall = true, wall = null } = {}) => {
    const id = item.id || uid();
    let it = { tags: [], ...item, id };
    const wid = DROPPABLE.has(it.type) ? (wall || (intoWall ? targetWall() : null)) : null;
    if (wid) {
      const order = Math.max(-1, ...items.filter((i) => i.parent === wid).map((i) => i.order ?? 0)) + 1;
      it = { ...it, parent: wid, order };
    } else if (it.x == null) {
      const c = viewCenter();
      const w = it.w || 420;
      it = { ...it, x: Math.max(20, c.x - w / 2 + (Math.random() * 60 - 30)), y: Math.max(20, c.y - 140 + (Math.random() * 60 - 30)), w };
    }
    setItems((prev) => [...prev, it]);
    setSelectedId(id);
    if (edit) setTimeout(() => setEditingId(id), 40);
    return id;
  };

  const addByTool = (toolId, opts = {}) => {
    setMenu(null);
    const L = (fr, en) => ({ fr, en: en || fr });
    switch (toolId) {
      case "note":
        return addItem({ type: "note", w: 420, title: L(""), body: L("") }, { edit: true, ...opts });
      case "list":
        return addItem({ type: "note", w: 420, title: L("Ma liste", "My list"), body: L("[ ] Étape 1\n[ ] Étape 2\n[ ] Étape 3", "[ ] Step 1\n[ ] Step 2\n[ ] Step 3") }, { edit: true });
      case "wall": {
        const c = viewCenter();
        const id = addItem({ type: "wall", x: c.x - 250, y: c.y - 220, w: 500, title: "Nouveau mur", color: WALL_COLORS[walls.length % WALL_COLORS.length] }, { intoWall: false });
        setTimeout(() => setEditingId(id), 40);
        return id;
      }
      case "heading":
        return addItem({ type: "heading", w: 900, text: "Titre du board" }, { edit: true, intoWall: false });
      case "table":
        return addItem({ type: "table", w: 460, title: "Suivi mensuel", columns: ["Mois", "Revenu"], rows: [["Juillet", ""], ["Août", ""], ["Objectif", ""]] }, { edit: true });
      case "video":
        return addItem({ type: "video", w: 460, url: "" }, { edit: true });
      case "polaroid": {
        const seed = Math.floor(Math.random() * 1000);
        return addItem({ type: "polaroid", w: 280, h: 280, rotate: (Math.random() - 0.5) * 8, image: `https://picsum.photos/seed/${seed}/600/500`, caption: "Liberté" });
      }
      case "sticky": {
        const colors = ["cream", "pink", "green", "orange", "blue", "purple"];
        return addItem({ type: "sticky", w: 240, h: 220, rotate: (Math.random() - 0.5) * 8, stickyColor: colors[Math.floor(Math.random() * colors.length)], label: "MA NOTE", body: L("Écris ton idée ici…", "Write your idea here…") }, { edit: true });
      }
      case "kpi":
        return addItem({ type: "kpi", w: 260, h: 200, stickyColor: "green", label: "SANTÉ & ÉNERGIE", body: L("Sport 4x / semaine\nMéditation quotidienne\nAlimentation saine", "Sport 4x / week\nDaily meditation\nHealthy food"), progress: 65 });
      case "color":
        return addItem({ type: "color", w: 320, title: L("Palette"), colors: ["#0f1b3a", "#4a6a9e", "#DEC2A3", "#F1E2CC"] });
      case "cockpit": {
        const vals = Object.values(rectsRef.current);
        const maxX = vals.length ? Math.max(...vals.map((r) => r.x + r.w)) : 0;
        const minY = vals.length ? Math.min(...vals.map((r) => r.y)) : 140;
        const tpl = cockpitTemplate({ prenom: live.data.state?.profile?.prenom, originX: vals.length ? Math.min(maxX + 200, BOARD_W - 3400) : 140, originY: Math.max(120, minY) });
        setItems((prev) => [...prev, ...tpl]);
        setTimeout(() => {
          const el = scrollRef.current;
          if (el) { el.scrollLeft = Math.max(0, tpl[0].x * zoomRef.current - 110); el.scrollTop = Math.max(0, tpl[0].y * zoomRef.current - 80); }
        }, 80);
        toast.success("Modèle « Cockpit Vision A → Z » ajouté");
        return null;
      }
      default:
        return null;
    }
  };

  const addLive = (source) => { setMenu(null); addItem({ type: "live", source, w: 440 }); };

  /* ── Capture vocale → carte ── */
  const handleVoice = (texte) => {
    addItem({ type: "note", w: 420, tags: ["elan"], source: "vocale", title: { fr: t("vision.voice.label"), en: t("vision.voice.label") }, body: { fr: texte, en: texte }, labels: ["Vocal"] });
    toast.success(t("vision.voice.added"));
  };

  const handleAiDocGenerated = ({ title, content, docType }) => {
    addItem({ type: "ai-doc", w: 440, h: 360, color: "#DEC2A3", docType, title: { fr: title, en: title }, body: { fr: content, en: content } });
  };

  const handleGenerateBoard = async () => {
    const value = prompt.trim();
    if (!value) return toast.error(t("vision.describeProject"));
    setGenerating(true);
    try {
      const res = await generateBoard(value);
      const c = viewCenter();
      const jitter = () => Math.round((Math.random() - 0.5) * 60);
      const newCards = (res.cards || []).map((card, i) => ({ id: uid(`gen${i}`), tags: [], ...card, x: Math.max(20, c.x - 700 + (card.x || 0) + jitter()), y: Math.max(20, c.y - 450 + (card.y || 0) + jitter()) }));
      setItems((prev) => [...prev, ...newCards]);
      setPrompt("");
      toast.success(t("vision.generated", { n: newCards.length }));
    } catch {
      toast.error(t("vision.generateError"));
    } finally {
      setGenerating(false);
    }
  };

  const handleInspire = async () => {
    setMenu(null);
    try {
      const { quote, author } = await fetchInspire();
      const text = `« ${quote} »\n— ${author}`;
      addItem({ type: "note", w: 420, tags: ["refuge"], title: { fr: "Citation", en: "Quote" }, body: { fr: text, en: text }, labels: ["Inspiration"] });
      toast.success(t("vision.quoteAi"));
    } catch {
      toast.error(t("common.unavailable"));
    }
  };

  const openTemplates = () => {
    setMenu(null);
    setTplOpen(true);
    if (!templates.length) {
      setTplLoading(true);
      fetchStarterTemplates().then((r) => setTemplates(r.templates || [])).catch(() => toast.error(t("vision.templates.unavailable"))).finally(() => setTplLoading(false));
    }
  };

  // Modèles toujours visibles au-dessus de la barre IA (comme final) : chargés une fois.
  useEffect(() => {
    if (readOnly || isSmall || templates.length) return;
    fetchStarterTemplates().then((r) => setTemplates(r.templates || [])).catch(() => {});
  }, [readOnly, isSmall]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyTemplate = (tpl) => {
    if (!tpl?.cards?.length) return;
    if (activeItems.length && !window.confirm(t("vision.templates.replace", { name: tpl.label }))) return;
    setItems((prev) => [...prev.filter((i) => i.trashed), ...tpl.cards.map((c, i) => ({ h: 130, tags: [], ...c, id: uid(`tpl${i}`), x: (c.x || 0) + 200, y: (c.y || 0) + 200 }))]);
    needScrollRef.current = true;
    setTplOpen(false);
    toast.success(t("vision.templates.applied", { name: tpl.label }));
  };

  /* ── Modification / corbeille ── */
  const patchCard = useCallback((id, patch) => {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const editBody = (id, text) =>
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, body: { ...(typeof c.body === "object" && c.body ? c.body : {}), [lang]: text } } : c)));

  const editImage = (id, url) => { if (url?.trim()) patchCard(id, { image: url.trim() }); setEditingId(null); };

  const trashItem = useCallback((id) => {
    const it = itemsRef.current.find((c) => c.id === id);
    if (!it) return;
    if (it.type === "line") {
      setItems((prev) => prev.filter((c) => c.id !== id));
    } else {
      setItems((prev) => prev.map((c) => (c.id === id ? { ...c, trashed: true, trashedAt: Date.now() } : c)));
      toast(it.type === "wall" ? "Mur mis à la corbeille (avec ses cartes)" : "Mis à la corbeille", {
        action: { label: t("vision.undo"), onClick: () => setItems((prev) => prev.map((c) => (c.id === id ? { ...c, trashed: false } : c))) },
      });
    }
    setEditingId((e) => (e === id ? null : e));
    setSelectedId((s) => (s === id ? null : s));
    setStyleMenuId((s) => (s === id ? null : s));
    setSelectedLine((s) => (s === id ? null : s));
  }, [t]);

  const restoreItem = (id) => setItems((prev) => prev.map((c) => (c.id === id ? { ...c, trashed: false } : c)));
  const purgeItem = (id) => setItems((prev) => prev.filter((c) => c.id !== id && c.parent !== id && c.from !== id && c.to !== id));
  const emptyTrash = () => {
    if (!trashItems.length || !window.confirm(`Supprimer définitivement ${trashItems.length} élément(s) ?`)) return;
    const ids = new Set(trashItems.map((i) => i.id));
    setItems((prev) => prev.filter((c) => !ids.has(c.id) && !ids.has(c.parent) && !ids.has(c.from) && !ids.has(c.to)));
  };

  /* ── Glisser-déposer (cartes libres, cartes dans les murs, murs) ── */
  const onPointerDownItem = (e, item) => {
    if (readOnly) return;
    if (isSmall) { setSelectedId(item.id); return; } // mobile : on défile, on ne glisse pas
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (mode === "line") {
      e.stopPropagation();
      if (!lineFrom) { setLineFrom(item.id); return; }
      if (lineFrom !== item.id) {
        setItems((prev) => [...prev, { id: uid("line"), type: "line", from: lineFrom, to: item.id }]);
        toast.success("Ligne ajoutée");
      }
      setLineFrom(null);
      return;
    }
    if (mode !== "select" || editingId === item.id) return;
    e.stopPropagation();
    setSelectedId(item.id);
    setSelectedLine(null);
    dragRef.current = { id: item.id, startX: e.clientX, startY: e.clientY, started: false, origX: item.x, origY: item.y };
  };

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (d) {
        const dxs = e.clientX - d.startX;
        const dys = e.clientY - d.startY;
        if (!d.started) {
          if (Math.hypot(dxs, dys) < 5) return;
          d.started = true;
          const moving = itemsRef.current.find((i) => i.id === d.id);
          if (moving?.parent) {
            // La carte sort de son mur : elle devient libre là où elle est affichée
            const r = rectsRef.current[d.id];
            d.origX = r ? r.x : 0;
            d.origY = r ? r.y : 0;
            setItems((prev) => prev.map((c) => (c.id === d.id ? { ...c, parent: undefined, x: d.origX, y: d.origY, w: r ? r.w : c.w, rotate: 0 } : c)));
          }
          setDraggingId(d.id);
        }
        const z = zoomRef.current;
        const nx = Math.max(0, Math.min(BOARD_W - 80, (d.origX || 0) + dxs / z));
        const ny = Math.max(0, Math.min(BOARD_H - 80, (d.origY || 0) + dys / z));
        setItems((prev) => prev.map((c) => (c.id === d.id ? { ...c, x: nx, y: ny } : c)));
        // Mur survolé → emplacement de dépôt
        const cur = itemsRef.current.find((i) => i.id === d.id);
        if (cur && DROPPABLE.has(cur.type)) {
          const p = toBoard(e.clientX, e.clientY);
          const hit = itemsRef.current
            .filter((w) => w.type === "wall" && !w.trashed)
            .find((w) => { const r = rectsRef.current[w.id]; return r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; });
          let next = null;
          if (hit) {
            const sibs = itemsRef.current.filter((c) => c.parent === hit.id && !c.trashed && c.id !== d.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            let index = sibs.length;
            for (let k = 0; k < sibs.length; k += 1) {
              const r = rectsRef.current[sibs[k].id];
              if (r && p.y < r.y + r.h / 2) { index = k; break; }
            }
            next = { wall: hit.id, index };
          }
          const prevDrop = dropRef.current;
          if ((prevDrop?.wall !== next?.wall) || (prevDrop?.index !== next?.index)) {
            dropRef.current = next;
            setDropTarget(next);
          }
        }
      }
      const r = rotateRef.current;
      if (r) {
        let deg = Math.atan2(e.clientY - r.cy, e.clientX - r.cx) * (180 / Math.PI) + 90;
        deg = Math.round(deg / 2) * 2;
        setItems((prev) => prev.map((it) => (it.id === r.id ? { ...it, rotate: deg } : it)));
      }
      const rs = resizeRef.current;
      if (rs) {
        const z = zoomRef.current;
        const nw = Math.max(rs.minW, Math.min(1400, rs.origW + (e.clientX - rs.startX) / z));
        const nh = rs.origH != null ? Math.max(80, Math.min(1200, rs.origH + (e.clientY - rs.startY) / z)) : null;
        setItems((prev) => prev.map((it) => (it.id === rs.id ? { ...it, w: nw, ...(nh != null ? { h: nh } : {}) } : it)));
      }
      const p = panRef.current;
      if (p && scrollRef.current) {
        scrollRef.current.scrollLeft = p.left - (e.clientX - p.startX);
        scrollRef.current.scrollTop = p.top - (e.clientY - p.startY);
      }
      if (drawRef.current) {
        drawRef.current.push(toBoard(e.clientX, e.clientY));
        setDrawPts([...drawRef.current]);
      }
    };
    const onUp = () => {
      const d = dragRef.current;
      const dt = dropRef.current;
      if (d?.started && dt) {
        setItems((prev) => {
          const moving = prev.find((c) => c.id === d.id);
          if (!moving) return prev;
          const sibs = prev.filter((c) => c.parent === dt.wall && !c.trashed && c.id !== d.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          sibs.splice(dt.index, 0, moving);
          const orders = new Map(sibs.map((c, i) => [c.id, i]));
          return prev.map((c) => (orders.has(c.id) ? { ...c, parent: dt.wall, order: orders.get(c.id), ...(c.id === d.id ? { rotate: 0 } : {}) } : c));
        });
      }
      dropRef.current = null;
      setDropTarget(null);
      if (drawRef.current) {
        const pts = drawRef.current;
        drawRef.current = null;
        setDrawPts(null);
        if (pts.length > 2) {
          const xs = pts.map((q) => q.x), ys = pts.map((q) => q.y);
          const minX = Math.min(...xs) - 6, minY = Math.min(...ys) - 6;
          const w = Math.max(...xs) - minX + 6, h = Math.max(...ys) - minY + 6;
          setItems((prev) => [...prev, { id: uid("draw"), type: "draw", x: minX, y: minY, w, h, color: "#DEC2A3", points: pts.map((q) => [+(q.x - minX).toFixed(1), +(q.y - minY).toFixed(1)]) }]);
        }
      }
      dragRef.current = null; rotateRef.current = null; resizeRef.current = null; panRef.current = null;
      setDraggingId(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp); };
  }, [toBoard]);

  const onRotateStart = (e, item) => {
    e.stopPropagation();
    const el = e.currentTarget.closest("[data-item-id]");
    if (!el) return;
    const rect = el.getBoundingClientRect();
    rotateRef.current = { id: item.id, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
    setDraggingId(item.id);
  };
  const onResizeStart = (e, item, heightToo) => {
    e.stopPropagation();
    resizeRef.current = {
      id: item.id, startX: e.clientX, startY: e.clientY,
      origW: item.w || rectsRef.current[item.id]?.w || 400,
      origH: heightToo ? (item.h || rectsRef.current[item.id]?.h || 200) : null,
      minW: item.type === "wall" ? 320 : 180,
    };
    setDraggingId(item.id);
  };

  /* Fond : se déplacer (glisser) ou dessiner */
  const onSurfacePointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 1) return;
    if (mode === "draw") {
      e.preventDefault();
      drawRef.current = [toBoard(e.clientX, e.clientY)];
      setDrawPts([...drawRef.current]);
      return;
    }
    if (!scrollRef.current) return;
    setSelectedId(null); setSelectedLine(null); setEditingId(null); setLineFrom(null);
    panRef.current = { startX: e.clientX, startY: e.clientY, left: scrollRef.current.scrollLeft, top: scrollRef.current.scrollTop };
  };

  const onWheelZoom = useCallback((e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    zoomTo(zoomRef.current - e.deltaY * 0.0015);
  }, [zoomTo]);

  /* ── Présentation mur par mur ── */
  const presentWalls = useMemo(() => [...walls].sort((a, b) => a.x - b.x || a.y - b.y), [walls]);
  const startPresent = () => {
    setMenu(null);
    if (!presentWalls.length) { toast("Ajoute au moins un mur pour présenter."); return; }
    setSelectedId(null); setEditingId(null);
    setPresentIdx(0);
    setPresenting(true);
    try { rootRef.current?.requestFullscreen?.()?.catch?.(() => {}); } catch (_) {}
  };
  const stopPresent = useCallback(() => {
    setPresenting(false);
    try { if (document.fullscreenElement) document.exitFullscreen?.(); } catch (_) {}
  }, []);
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement) setPresenting(false); };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);
  useEffect(() => {
    if (!presenting) return undefined;
    const w = presentWalls[Math.min(presentIdx, presentWalls.length - 1)];
    const el = scrollRef.current;
    const id = setTimeout(() => {
      const r = rectsRef.current[w?.id];
      if (!r || !el) return;
      const z = clampZ(Math.min(1.1, (el.clientHeight - 100) / r.h, (el.clientWidth - 120) / r.w));
      setZoom(z);
      requestAnimationFrame(() => {
        el.scrollLeft = r.x * z - (el.clientWidth - r.w * z) / 2;
        el.scrollTop = r.y * z - Math.max(30, (el.clientHeight - 70 - r.h * z) / 2);
      });
    }, 150);
    return () => clearTimeout(id);
  }, [presenting, presentIdx, presentWalls]);

  /* ── Clavier ── */
  useEffect(() => {
    const onKey = (e) => {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) || e.target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !typing) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y" && !typing) { e.preventDefault(); redo(); return; }
      if (typing) return;
      if (readOnly && !["Escape", "ArrowLeft", "ArrowRight", " "].includes(e.key)) return;
      if (e.key === "Escape") {
        if (presenting) stopPresent();
        setMode("select"); setLineFrom(null); setSelectedId(null); setSelectedLine(null); setEditingId(null); setMenu(null);
        return;
      }
      if (presenting) {
        if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); setPresentIdx((i) => Math.min(presentWalls.length - 1, i + 1)); }
        if (e.key === "ArrowLeft") { e.preventDefault(); setPresentIdx((i) => Math.max(0, i - 1)); }
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && (selectedId || selectedLine)) { e.preventDefault(); trashItem(selectedLine || selectedId); return; }
      if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomTo(zoomRef.current + 0.1); }
      if (e.key === "-" || e.key === "_") { e.preventDefault(); zoomTo(zoomRef.current - 0.1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, selectedId, selectedLine, trashItem, zoomTo, presenting, presentWalls.length, stopPresent, readOnly]);

  /* ── Export PNG / PDF (cadré sur le contenu) ── */
  const handleExport = async (kind) => {
    setMenu(null);
    const vals = Object.values(rectsRef.current);
    if (!vals.length) { toast("Le board est vide."); return; }
    setExporting(true);
    const prevZoom = zoomRef.current;
    const prevSel = selectedId;
    setSelectedId(null);
    try {
      setZoom(1);
      await new Promise((r) => setTimeout(r, 300));
      const box = Object.values(rectsRef.current);
      const pad = 60;
      const minX = Math.max(0, Math.min(...box.map((r) => r.x)) - pad);
      const minY = Math.max(0, Math.min(...box.map((r) => r.y)) - pad);
      const maxX = Math.min(BOARD_W, Math.max(...box.map((r) => r.x + r.w)) + pad);
      const maxY = Math.min(BOARD_H, Math.max(...box.map((r) => r.y + r.h)) + pad);
      const { default: html2canvas } = await import("html2canvas");
      const bg = getComputedStyle(rootRef.current).getPropertyValue("--sf-canvas-solid").trim() || "#0a1230";
      const scale = Math.min(2, 8000 / Math.max(maxX - minX, maxY - minY));
      rootRef.current?.classList.add("sf-exporting");
      const full = await html2canvas(boardRef.current, { backgroundColor: bg, useCORS: true, scale, logging: false, width: maxX, height: maxY });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round((maxX - minX) * scale);
      canvas.height = Math.round((maxY - minY) * scale);
      canvas.getContext("2d").drawImage(full, minX * scale, minY * scale, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
      const name = `vision-board-${boardKey}-${new Date().toISOString().slice(0, 10)}`;
      if (kind === "png") {
        const link = document.createElement("a");
        link.download = `${name}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } else {
        const jsPdfMod = await import("jspdf");
        const JsPDF = jsPdfMod.jsPDF || jsPdfMod.default;
        const pdf = new JsPDF({ orientation: canvas.width >= canvas.height ? "landscape" : "portrait", unit: "mm", format: "a3" });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const ratio = canvas.width / canvas.height;
        let w = pageW - margin * 2;
        let h = w / ratio;
        if (h > pageH - margin * 2) { h = pageH - margin * 2; w = h * ratio; }
        pdf.setFillColor(bg);
        pdf.rect(0, 0, pageW, pageH, "F");
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", (pageW - w) / 2, (pageH - h) / 2, w, h, undefined, "FAST");
        pdf.save(`${name}.pdf`);
      }
      toast.success(`${kind.toUpperCase()} ✓`);
    } catch {
      toast.error(t("common.unavailable"));
    } finally {
      rootRef.current?.classList.remove("sf-exporting");
      setZoom(prevZoom);
      setSelectedId(prevSel);
      setExporting(false);
    }
  };

  /* ── Images ── */
  const doUnsplash = async (q) => {
    if (!q.trim()) return;
    setUnsplash((u) => ({ ...u, loading: true }));
    try { const { images } = await searchUnsplash(q, 9); setUnsplash({ q, results: images || [], loading: false }); }
    catch { setUnsplash((u) => ({ ...u, loading: false })); toast.error(t("vision.unsplash.unavailable")); }
  };
  const addImageFromUrl = (url) => {
    if (!url?.trim()) return;
    setMenu(null);
    addItem({ type: "image", w: 420, h: 300, image: url.trim(), title: { fr: "", en: "" } });
  };

  /* ── Vision Book : un PDF paysage, une page de garde puis un mur par page ── */
  const handleVisionBook = async () => {
    setMenu(null);
    const ws = walls.filter((w) => rectsRef.current[w.id]);
    if (!ws.length) { toast("Ajoute au moins un mur pour créer ton Vision Book."); return; }
    setExporting(true);
    const prevZoom = zoomRef.current;
    const prevSel = selectedId;
    setSelectedId(null);
    try {
      setZoom(1);
      await new Promise((r) => setTimeout(r, 350));
      const { default: html2canvas } = await import("html2canvas");
      const jsPdfMod = await import("jspdf");
      const JsPDF = jsPdfMod.jsPDF || jsPdfMod.default;
      const bg = getComputedStyle(rootRef.current).getPropertyValue("--sf-canvas-solid").trim() || "#0a1230";
      const pdf = new JsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      // Les polices standard du PDF ne couvrent que le Latin-1 : « → » sortait en « !' ».
      const pdfTxt = (x) => String(x || "").replace(/→/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^\x20-\xFF]/g, "");
      const titre = pdfTxt((activeItems.find((i) => i.type === "heading")?.text || "Mon Vision Board").replace(/\{prenom\}/g, prenom || ""));
      rootRef.current?.classList.add("sf-exporting");
      // Page de garde
      pdf.setFillColor(bg); pdf.rect(0, 0, W, H, "F");
      pdf.setTextColor(222, 194, 163); pdf.setFontSize(11); pdf.text("ZAYADO · VISION BOOK", 20, 30);
      pdf.setTextColor(255, 255, 255); pdf.setFontSize(30); pdf.text(pdf.splitTextToSize(titre, W - 40), 20, H / 2 - 10);
      pdf.setFontSize(12); pdf.setTextColor(200, 205, 220);
      pdf.text(`${ws.length} mur${ws.length > 1 ? "s" : ""} · ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`, 20, H / 2 + 12);
      for (let i = 0; i < ws.length; i += 1) {
        const node = boardRef.current?.querySelector(`[data-item-id="${ws[i].id}"]`);
        if (!node) continue;
        const shot = await html2canvas(node, { backgroundColor: bg, useCORS: true, scale: 2, logging: false });
        // Mur haut et étroit → page portrait, sinon paysage : le mur remplit la page.
        pdf.addPage("a4", shot.width / shot.height < 1 ? "portrait" : "landscape");
        const W = pdf.internal.pageSize.getWidth();
        const H = pdf.internal.pageSize.getHeight();
        pdf.setFillColor(bg); pdf.rect(0, 0, W, H, "F");
        const m = 12;
        const ratio = shot.width / shot.height;
        let w = W - m * 2; let h = w / ratio;
        if (h > H - m * 2 - 8) { h = H - m * 2 - 8; w = h * ratio; }
        pdf.addImage(shot.toDataURL("image/jpeg", 0.9), "JPEG", (W - w) / 2, m, w, h, undefined, "FAST");
        pdf.setFontSize(9); pdf.setTextColor(160, 170, 190);
        pdf.text(`${i + 1} / ${ws.length}`, W - m, H - 6, { align: "right" });
      }
      pdf.save(`vision-book-${boardKey}-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Vision Book prêt ✓");
    } catch {
      toast.error(t("common.unavailable"));
    } finally {
      rootRef.current?.classList.remove("sf-exporting");
      setZoom(prevZoom);
      setSelectedId(prevSel);
      setExporting(false);
    }
  };

  const jumpToMiniMap = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = ((e.clientX - rect.left) / rect.width) * BOARD_W * zoom - viewport.w / 2;
    el.scrollTop = ((e.clientY - rect.top) / rect.height) * BOARD_H * zoom - viewport.h / 2;
  };

  const openLiveModule = (source) => {
    const s = LIVE_SOURCES.find((x) => x.id === source);
    if (s) navigate(s.route);
  };

  /* ───────────────────────── Contenu d'une carte ───────────────────────── */

  const renderBody = (card, inWall) => {
    const isEditing = !readOnly && editingId === card.id;
    const done = () => setEditingId(null);
    const patch = readOnly ? () => {} : (p) => patchCard(card.id, p);
    switch (card.type) {
      case "note":
        return <NoteCard card={card} lang={lang} editing={isEditing} onPatch={patch} onDone={done} />;
      case "table":
        return <TableCard card={card} editing={isEditing} onPatch={patch} onDone={done} />;
      case "video":
        return <VideoCard card={card} editing={isEditing} onPatch={patch} onDone={done} />;
      case "live":
        return <LiveCard card={card} live={live} onOpen={openLiveModule} onPatch={patch} />;
      case "heading":
        return isEditing ? (
          <input autoFocus defaultValue={card.text} onPointerDown={(e) => e.stopPropagation()}
            onBlur={(e) => { patch({ text: e.target.value }); done(); }} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="sf-input sf-heading" />
        ) : <p className="sf-heading">{headingText(card.text, prenom)}</p>;
      case "draw": {
        const d = (card.points || []).map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
        return (
          <svg width={card.w} height={card.h} className="block overflow-visible">
            <path d={d} fill="none" stroke={card.color || "#DEC2A3"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      }
      case "sticky": {
        const c = stickyOf(card.stickyColor || "cream");
        const isHand = card.style === "handwritten";
        return (
          <div className="paper-note relative" style={{ background: c.bg, minHeight: inWall ? undefined : card.h, padding: 18, borderRadius: inWall ? 18 : undefined }}>
            {!inWall && <span className="push-pin" />}
            <div className="mb-2 text-[12px] font-bold tracking-[0.12em]" style={{ color: c.label }}>{card.label || "MA NOTE"}</div>
            {isEditing ? (
              <textarea autoFocus defaultValue={tv(card.body, lang)} rows={4} onPointerDown={(e) => e.stopPropagation()}
                onBlur={(e) => { editBody(card.id, e.target.value); done(); }}
                className={`w-full resize-none bg-transparent outline-none ${isHand ? "font-hand text-[26px] leading-tight" : "text-[16px] leading-relaxed"}`} style={{ color: c.text }} />
            ) : (
              <p className={`whitespace-pre-line ${isHand ? "font-hand text-[26px] leading-tight" : "text-[16px] leading-relaxed"}`} style={{ color: c.text }}>{tv(card.body, lang)}</p>
            )}
          </div>
        );
      }
      case "polaroid": {
        const frame = card.stickyColor ? stickyOf(card.stickyColor).bg : "#fafafa";
        return (
          <div className="polaroid-frame relative" style={{ height: inWall ? undefined : card.h, background: frame, borderRadius: inWall ? 18 : undefined }}>
            {!inWall && <span className="push-pin red" />}
            <img src={card.image} alt={card.caption || ""} draggable={false} className="w-full rounded-sm object-cover" style={{ height: inWall ? 260 : (card.h || 240) - (card.caption ? 54 : 26) }} />
            {card.caption ? (
              <div className="pt-2 text-center">
                {isEditing ? (
                  <input autoFocus defaultValue={card.caption} onPointerDown={(e) => e.stopPropagation()}
                    onBlur={(e) => { patch({ caption: e.target.value }); done(); }}
                    className="w-full bg-transparent text-center font-serif-italic text-[26px] leading-none text-navy-900 outline-none" />
                ) : <span className="font-serif-italic text-[26px] leading-none text-navy-900">{card.caption}</span>}
              </div>
            ) : <div className="h-[24px]" />}
            <Heart size={16} className="absolute bottom-3 right-3 fill-pink-500 text-pink-500" />
          </div>
        );
      }
      case "kpi": {
        const c = stickyOf(card.stickyColor || "green");
        const kLines = tv(card.body, lang).split("\n").filter(Boolean);
        return (
          <div className="paper-note relative" style={{ background: c.bg, minHeight: inWall ? 200 : card.h, padding: "18px 20px", borderRadius: inWall ? 18 : undefined }}>
            <div className="mb-2 text-[12px] font-bold tracking-[0.12em]" style={{ color: c.label }}>{card.label || "KPI"}</div>
            {isEditing ? (
              <textarea autoFocus defaultValue={tv(card.body, lang)} rows={4} onPointerDown={(e) => e.stopPropagation()}
                onBlur={(e) => { editBody(card.id, e.target.value); done(); }} className="w-full resize-none bg-transparent text-[15px] leading-snug outline-none" style={{ color: c.text }} />
            ) : (
              <ul className="mb-9 space-y-1">
                {kLines.map((line, k) => (
                  <li key={k} className="flex gap-2 text-[15px] leading-snug" style={{ color: c.text }}><span style={{ color: c.label }}>•</span><span>{line.replace(/^[•\-*]\s*/, "")}</span></li>
                ))}
              </ul>
            )}
            <div className="absolute bottom-3 left-4 right-4">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/50"><span className="block h-full" style={{ width: `${card.progress || 60}%`, background: c.label }} /></div>
              <div className="mt-0.5 text-right text-[12px] font-semibold" style={{ color: c.label }}>{card.progress || 60}%</div>
            </div>
          </div>
        );
      }
      case "image":
        return (
          <div className="sf-card relative overflow-hidden" style={{ padding: 12 }}>
            <img src={card.image} alt="" draggable={false} className="w-full rounded-[14px] object-cover" style={{ height: inWall ? 260 : Math.max(120, (card.h || 300) - (tv(card.title, lang) ? 60 : 24)) }} />
            {tv(card.title, lang) && <p className="sf-title px-1 pt-3">{tv(card.title, lang)}</p>}
            {isEditing && (
              <div className="absolute inset-0 flex flex-col justify-start gap-2 overflow-y-auto bg-black/85 p-4" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <input placeholder={t("vision.unsplash.search")} data-testid="vision-unsplash-query" onKeyDown={(e) => e.key === "Enter" && doUnsplash(e.target.value)} className="sf-field" />
                  {unsplash.loading && <Loader2 size={15} className="animate-spin text-white" />}
                </div>
                {unsplash.results.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {unsplash.results.map((im) => (
                      <button key={im.thumb} onClick={() => editImage(card.id, im.url)} data-testid="vision-unsplash-pick" className="overflow-hidden rounded-lg border border-white/10 hover:border-[var(--sf-accent)]">
                        <img src={im.thumb} alt={im.alt} className="h-16 w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                <AiImageRow onPick={(url) => editImage(card.id, url)} />
                <p className="sf-small" style={{ fontSize: 12 }}>{t("vision.unsplash.orUrl")}</p>
                <input defaultValue={card.image} placeholder="https://…" onKeyDown={(e) => e.key === "Enter" && editImage(card.id, e.target.value)}
                  onBlur={(e) => e.target.value !== card.image && editImage(card.id, e.target.value)} className="sf-field" />
                <input defaultValue={tv(card.title, lang)} placeholder="Légende (optionnel)" onBlur={(e) => patch({ title: { fr: e.target.value, en: e.target.value } })} className="sf-field" />
                <button onClick={done} className="sf-btn sf-btn-primary self-end">Terminé</button>
              </div>
            )}
          </div>
        );
      case "color":
        return (
          <div className="sf-card">
            <p className="sf-title mb-3">{tv(card.title, lang)}</p>
            <div className="flex gap-2">{(card.colors || []).map((col) => <span key={col} className="h-12 flex-1 rounded-xl" style={{ background: col }} />)}</div>
          </div>
        );
      case "ai-doc":
        return (
          <div className="sf-card flex flex-col overflow-hidden" style={{ padding: 0, height: inWall ? 420 : card.h }}>
            <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: "var(--sf-line)" }}>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${card.color || "#DEC2A3"}22`, color: card.color || "#DEC2A3" }}><FileText size={17} /></span>
              <div className="min-w-0 flex-1">
                <p className="sf-title truncate">{tv(card.title, lang)}</p>
                <p className="sf-small" style={{ fontSize: 12 }}>IA · {t(`vision.aiDoc.${AI_DOC_KEYS[card.docType] || "t1"}`)}</p>
              </div>
            </div>
            <div className="sf-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4" onPointerDown={(e) => { if (isEditing) e.stopPropagation(); }} onWheel={(e) => e.stopPropagation()}>
              {isEditing ? (
                <textarea autoFocus defaultValue={tv(card.body, lang)} onPointerDown={(e) => e.stopPropagation()} onBlur={(e) => { editBody(card.id, e.target.value); done(); }} className="sf-input sf-text h-full" />
              ) : <p className="sf-text whitespace-pre-wrap">{tv(card.body, lang)}</p>}
            </div>
          </div>
        );
      default:
        return <div className="sf-card sf-small">Élément non pris en charge ({card.type})</div>;
    }
  };

  /** Enveloppe commune (fonction, pas composant, pour ne jamais remonter les champs en cours d'édition). */
  const renderShell = (card, inWall) => {
    const isDragging = draggingId === card.id;
    const isEditing = editingId === card.id;
    const isSelected = selectedId === card.id || lineFrom === card.id;
    const free = !inWall;
    const rot = free && ["sticky", "polaroid"].includes(card.type) ? card.rotate || 0 : 0;
    const canEdit = !readOnly && EDITABLE.has(card.type);
    const pos = free
      ? { position: "absolute", left: card.x, top: card.y, width: card.w || 420, zIndex: isDragging ? 50 : styleMenuId === card.id || isEditing ? 40 : card.type === "draw" ? 3 : 4, transform: `rotate(${rot}deg)${isDragging ? " scale(1.02)" : ""}` }
      : { position: "relative" };
    return (
      <div key={card.id} data-item-id={card.id} data-selected={isSelected ? "true" : "false"}
        onPointerDown={(e) => onPointerDownItem(e, card)}
        onDoubleClick={(e) => { e.stopPropagation(); if (canEdit) setEditingId(card.id); }}
        data-testid={`vision-card-${card.id}`}
        className={`sf-item group select-none ${free ? "sf-free" : ""}`}
        style={{ ...pos, touchAction: isSmall || readOnly ? "auto" : "none", cursor: readOnly || isSmall ? "default" : mode === "line" ? "crosshair" : mode !== "select" ? "inherit" : isEditing ? "default" : "grab", filter: isDragging ? "drop-shadow(0 18px 30px rgba(0,0,0,.45))" : undefined }}>
        <div style={isSelected && !isEditing ? { borderRadius: 24, boxShadow: "0 0 0 2px var(--sf-accent)" } : undefined}>
          {renderBody(card, inWall)}
        </div>
        {card.tags?.length > 0 && <CardTagBadges tags={card.tags} />}
        {!presenting && !isEditing && !readOnly && (
          <div className="sf-handles sf-hide-present">
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => trashItem(card.id)} title="Mettre à la corbeille" data-testid={`vision-card-delete-${card.id}`}
              className="sf-handle absolute -right-3 -top-3 z-40 hover:!text-red-400"><X size={15} /></button>
            {canEdit && (
              <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setEditingId(card.id)} title="Modifier" data-testid={`vision-card-edit-${card.id}`}
                className="sf-handle absolute -top-3 right-7 z-40"><Pencil size={13} /></button>
            )}
            {card.type === "live" && (
              <button onPointerDown={(e) => e.stopPropagation()} onClick={() => { patchCard(card.id, { pinned: !card.pinned }); toast.success(card.pinned ? "Retirée du Cockpit" : "Épinglée sur le Cockpit"); }}
                title={card.pinned ? "Retirer du Cockpit" : "Épingler au Cockpit"} data-testid={`vision-card-pin-${card.id}`}
                className="sf-handle absolute -top-3 right-7 z-40" style={card.pinned ? { color: "var(--sf-accent)", display: "flex" } : undefined}>
                {card.pinned ? <PinOff size={13} /> : <Pin size={13} />}
              </button>
            )}
            {!["live", "draw", "heading"].includes(card.type) && (
              <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setStyleMenuId((id) => (id === card.id ? null : card.id))}
                title={t("vision.color.title")} data-testid={`vision-card-palette-${card.id}`} className="sf-handle absolute -left-3 -top-3 z-40"><Palette size={14} /></button>
            )}
            {free && ["sticky", "polaroid"].includes(card.type) && (
              <button onPointerDown={(e) => onRotateStart(e, card)} title={t("vision.rotate")} className="sf-handle absolute -top-11 left-1/2 z-40 -translate-x-1/2"><RefreshCw size={13} /></button>
            )}
            {free && card.type !== "draw" && (
              <button onPointerDown={(e) => onResizeStart(e, card, ["sticky", "polaroid", "kpi", "image", "ai-doc"].includes(card.type))} title={t("vision.resize")}
                className="sf-handle absolute -bottom-3 -right-3 z-40" style={{ cursor: "nwse-resize" }}><Maximize2 size={13} /></button>
            )}
          </div>
        )}
        {styleMenuId === card.id && (
          <CardStyleMenu card={card} onChange={(p) => patchCard(card.id, p)} onClose={() => setStyleMenuId(null)} />
        )}
      </div>
    );
  };

  /* ───────────────────────── Mur ───────────────────────── */
  const renderWall = (w) => {
    const isDragging = draggingId === w.id;
    const isEditing = editingId === w.id;
    const isSelected = selectedId === w.id || lineFrom === w.id;
    const kids = childrenOf(w.id).filter((k) => k.id !== draggingId);
    const dt = dropTarget && dropTarget.wall === w.id ? dropTarget : null;
    const list = [];
    kids.forEach((k, i) => {
      if (dt && dt.index === i) list.push(<div key="drop" className="sf-drop-marker" />);
      list.push(renderShell(k, true));
    });
    if (dt && dt.index >= kids.length) list.push(<div key="drop" className="sf-drop-marker" />);
    return (
      <div key={w.id} data-item-id={w.id} data-selected={isSelected ? "true" : "false"} data-testid={`vision-wall-${w.id}`}
        className={`sf-item sf-wall group ${dt ? "sf-wall-drop" : ""}`}
        onPointerDown={(e) => onPointerDownItem(e, w)}
        style={isSmall
          ? { position: "relative", width: "100%", touchAction: "auto" }
          : { position: "absolute", left: w.x, top: w.y, width: w.w || 500, zIndex: isDragging ? 45 : 1, touchAction: readOnly ? "auto" : "none", cursor: readOnly ? "default" : mode === "line" ? "crosshair" : mode === "select" ? "grab" : "inherit", boxShadow: isSelected && !readOnly ? "0 0 0 2px var(--sf-accent)" : undefined }}>
        <div className="mb-4 flex items-center gap-3 px-2" onDoubleClick={(e) => { e.stopPropagation(); if (!readOnly) setEditingId(w.id); }}>
          <span className="sf-wall-bar" style={{ background: w.color || "#94A3B8" }} />
          {isEditing ? (
            <input autoFocus defaultValue={w.title} onPointerDown={(e) => e.stopPropagation()} data-testid={`vision-wall-title-${w.id}`}
              onBlur={(e) => { patchCard(w.id, { title: e.target.value || "Sans titre" }); setEditingId(null); }}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} className="sf-input sf-wall-title" />
          ) : (
            <h3 className="sf-wall-title min-w-0 flex-1 truncate">{wallNumber[w.id]} · {w.title || "Sans titre"}</h3>
          )}
        </div>
        <div className="flex flex-col gap-3">
          {list}
          {!kids.length && !dt && !readOnly && <p className="sf-small px-2 py-6 text-center">{isSmall ? "Aucune carte dans ce mur" : "Glisse des cartes ici"}</p>}
          {!readOnly && <button onPointerDown={(e) => e.stopPropagation()} onClick={() => addByTool("note", { wall: w.id })}
            className="sf-hide-present flex items-center gap-2 rounded-2xl px-4 py-3 text-left text-[15px] font-medium text-[var(--sf-muted)] transition hover:bg-white/5 hover:text-[var(--sf-text)]"
            data-testid={`vision-wall-add-${w.id}`}>
            <Plus size={17} /> Ajouter une note
          </button>}
        </div>
        {!presenting && !readOnly && !isSmall && (
          <div className="sf-handles sf-hide-present">
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => trashItem(w.id)} title="Mettre le mur à la corbeille" data-testid={`vision-wall-delete-${w.id}`}
              className="sf-handle absolute -right-3 -top-3 z-40 hover:!text-red-400"><X size={15} /></button>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setWallColorId((id) => (id === w.id ? null : w.id))} title="Couleur du mur"
              className="sf-handle absolute -left-3 -top-3 z-40"><Palette size={14} /></button>
            <button onPointerDown={(e) => onResizeStart(e, w, false)} title="Largeur" className="sf-handle absolute -right-3 top-1/2 z-40 -translate-y-1/2" style={{ cursor: "ew-resize" }}><Maximize2 size={13} /></button>
          </div>
        )}
        {wallColorId === w.id && (
          <Popover open onClose={() => setWallColorId(null)} className="left-0 top-12 flex gap-1.5 p-2">
            {WALL_COLORS.map((c) => (
              <button key={c} onClick={() => { patchCard(w.id, { color: c }); setWallColorId(null); }} className="h-7 w-7 rounded-full border-2" style={{ background: c, borderColor: w.color === c ? "#fff" : "transparent" }} />
            ))}
          </Popover>
        )}
      </div>
    );
  };

  /* ───────────────────────── Lignes ───────────────────────── */
  const linePath = (a, b) => {
    const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
    const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const dx = bc.x - ac.x;
    const dy = bc.y - ac.y;
    let p1; let p2; let c1; let c2;
    if (Math.abs(dx) >= Math.abs(dy)) {
      const s = Math.sign(dx) || 1;
      p1 = { x: s > 0 ? a.x + a.w : a.x, y: ac.y };
      p2 = { x: s > 0 ? b.x : b.x + b.w, y: bc.y };
      const k = Math.max(40, Math.abs(p2.x - p1.x) / 2);
      c1 = { x: p1.x + s * k, y: p1.y }; c2 = { x: p2.x - s * k, y: p2.y };
    } else {
      const s = Math.sign(dy) || 1;
      p1 = { x: ac.x, y: s > 0 ? a.y + a.h : a.y };
      p2 = { x: bc.x, y: s > 0 ? b.y : b.y + b.h };
      const k = Math.max(40, Math.abs(p2.y - p1.y) / 2);
      c1 = { x: p1.x, y: p1.y + s * k }; c2 = { x: p2.x, y: p2.y - s * k };
    }
    return { d: `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`, mid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 } };
  };

  /* ───────────────────────── Barres d'outils ───────────────────────── */

  const RAIL = [
    { id: "note", icon: Type, label: "Note", action: () => addByTool("note") },
    { id: "wall", icon: Columns3, label: "Mur", action: () => addByTool("wall") },
    { id: "line", icon: Spline, label: "Ligne", action: () => { setMode((m) => (m === "line" ? "select" : "line")); setLineFrom(null); }, active: mode === "line" },
    { id: "all", icon: LayoutGrid, label: "Outils", action: () => setMenu((m) => (m === "all" || m === "live" ? null : "all")), active: menu === "all" || menu === "live" },
    { sep: true },
    { id: "draw", icon: PenTool, label: "Dessin", action: () => setMode((m) => (m === "draw" ? "select" : "draw")), active: mode === "draw" },
    { id: "images", icon: ImageIcon, label: "Images", action: () => setMenu((m) => (m === "images" ? null : "images")), active: menu === "images" },
    { id: "docs", icon: Files, label: "Docs", action: () => { setMenu(null); setDocsOpen((v) => !v); }, active: docsOpen, badge: docItems.length },
    { id: "trash", icon: Trash2, label: "Corbeille", action: () => setMenu((m) => (m === "trash" ? null : "trash")), active: menu === "trash", badge: trashItems.length },
  ];

  const ALL_TOOLS = [
    { title: "Contenu" },
    { id: "heading", icon: Heading1, label: "Titre", action: () => addByTool("heading") },
    { id: "list", icon: ListChecks, label: "Liste à cocher", action: () => addByTool("list") },
    { id: "table", icon: Table2, label: "Tableau", action: () => addByTool("table") },
    { id: "video", icon: Video, label: "Vidéo YouTube", action: () => addByTool("video") },
    { id: "live", icon: Activity, label: "Carte live (données pro)", action: () => setMenu("live"), accent: true },
    { title: "Inspiration" },
    { id: "sticky", icon: StickyNote, label: t("vision.tools.sticky"), action: () => addByTool("sticky") },
    { id: "polaroid", icon: ImageIcon, label: t("vision.tools.polaroid"), action: () => addByTool("polaroid") },
    { id: "kpi", icon: ListChecks, label: t("vision.tools.kpi"), action: () => addByTool("kpi") },
    { id: "palette", icon: Palette, label: t("vision.tools.palette"), action: () => addByTool("color") },
    { id: "quote", icon: Quote, label: t("vision.quoteAi"), action: handleInspire },
    { title: "IA & modèles" },
    { id: "ai-doc", icon: FileText, label: t("vision.tools.aiDoc"), action: () => { setMenu(null); setAiDocOpen(true); } },
    { id: "cockpit", icon: LayoutGrid, label: "Modèle « Cockpit Vision A → Z »", action: () => addByTool("cockpit"), accent: true },
    { id: "starter", icon: LayoutTemplate, label: t("vision.tools.templates"), action: openTemplates },
  ];

  const zoomPct = Math.round(zoom * 100);
  const modeHint = mode === "line" ? (lineFrom ? "Clique sur la 2ᵉ carte à relier · Échap pour annuler" : "Clique sur la 1ʳᵉ carte (ou le mur) à relier")
    : mode === "draw" ? "Dessine librement sur le board · Échap pour quitter" : null;

  const menuList = (list) => list.map((it, i) => (it.title ? (
    <p key={`t${i}`} className="sf-menu-title">{it.title}</p>
  ) : (
    <button key={it.id} onClick={it.action} className="sf-menu-item" data-testid={`vision-tool-${it.id}`}>
      <span className="sf-mi-ico" style={it.accent ? { background: "rgba(222,194,163,0.18)" } : undefined}><it.icon size={15} /></span>
      <span className="flex-1">{it.label}</span>
      {it.id === "live" && <ChevronRight size={14} className="opacity-60" />}
    </button>
  )));

  const trashPanel = (
    <>
      <div className="flex items-center justify-between px-2 pb-1 pt-1">
        <p className="sf-menu-title" style={{ padding: 0 }}>Corbeille · {trashItems.length}</p>
        {trashItems.length > 0 && <button onClick={emptyTrash} className="sf-btn" style={{ height: 28, fontSize: 12 }}>Vider</button>}
      </div>
      {!trashItems.length && <p className="sf-small px-2 py-4" style={{ fontSize: 13 }}>La corbeille est vide.</p>}
      <div className="sf-scroll max-h-[300px] overflow-y-auto">
        {[...trashItems].sort((a, b) => (b.trashedAt || 0) - (a.trashedAt || 0)).map((it) => (
          <div key={it.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5">
            <span className="min-w-0 flex-1 truncate text-[13px]">{itemName(it, lang)}</span>
            <button onClick={() => restoreItem(it.id)} className="sf-btn" style={{ height: 26, minWidth: 26, padding: 0 }} title="Restaurer"><RotateCcw size={13} /></button>
            <button onClick={() => purgeItem(it.id)} className="sf-btn hover:!text-red-400" style={{ height: 26, minWidth: 26, padding: 0 }} title="Supprimer définitivement"><X size={13} /></button>
          </div>
        ))}
      </div>
    </>
  );

  const livePanel = (
    <>
      <div className="flex items-center gap-2 px-1 pb-1">
        <button onClick={() => setMenu("all")} className="sf-btn" style={{ height: 28, minWidth: 28, padding: 0 }}><ChevronLeft size={15} /></button>
        <p className="sf-menu-title" style={{ padding: 0 }}>Reliées à tes données</p>
      </div>
      {LIVE_SOURCES.map((s) => (
        <button key={s.id} onClick={() => addLive(s.id)} className="sf-menu-item" data-testid={`vision-live-${s.id}`}>
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> <span className="flex-1">{s.label}</span>
        </button>
      ))}
      <p className="sf-small px-2.5 pb-1 pt-2" style={{ fontSize: 12, lineHeight: 1.4 }}>Astuce : sélectionne un mur avant d'ajouter une carte pour la poser dedans.</p>
    </>
  );

  /* ───────────────────────── Rendu ───────────────────────── */

  const liveEmpty = live.data && !live.loading && Object.keys(live.data).length > 0
    && !live.data.state?.vision?.texte && !(Array.isArray(live.data.objectifs) && live.data.objectifs.length) && !(live.data.taches?.items || []).length;
  const showOnboard = !readOnly && loaded && liveEmpty && !onboardHidden;
  const toggleMinimap = () => setShowMinimap((v) => { try { localStorage.setItem(MINIMAP_KEY, v ? "0" : "1"); } catch (_) {} return !v; });
  const hideOnboard = () => { setOnboardHidden(true); try { localStorage.setItem(ONBOARD_KEY, "1"); } catch (_) {} };

  /* Vue mobile : un mur par écran (+ « Libre » pour les cartes hors murs) */
  const mobileCols = [...presentWalls];
  const looseCards = freeItems.filter((c) => !["draw"].includes(c.type));
  const headingCard = looseCards.find((c) => c.type === "heading");
  const looseOthers = looseCards.filter((c) => c.type !== "heading");
  const mobilePages = [...mobileCols.map((w) => ({ key: w.id, label: w.title || "Mur", wall: w })), ...(looseOthers.length ? [{ key: "_libre", label: "Libre", wall: null }] : [])];
  const mobileRef = useRef(null);
  const goMobile = (i) => {
    const el = mobileRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  const currentMobileWallId = mobilePages[mobileWall]?.wall?.id || null;

  return (
    <div ref={rootRef} data-testid="vision-canvas-container"
      onDragOver={onFileDragOver} onDragLeave={onFileDragLeave} onDrop={onFileDrop}
      className={`sf relative overflow-hidden ${presenting ? "sf-present fixed inset-0 z-[80] h-[100dvh] w-screen" : readOnly ? "h-full" : "h-[calc(100dvh-120px)] md:h-[calc(100dvh-150px)] md:rounded-2xl md:border md:border-white/10"}`}>
      {!readOnly && (
        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden data-testid="vision-file-input"
          onChange={(e) => { addImageFiles(e.target.files); e.target.value = ""; setMenu(null); }} />
      )}
      {fileOver && (
        <div className="pointer-events-none absolute inset-3 z-[45] flex items-center justify-center rounded-3xl border-2 border-dashed" style={{ borderColor: "var(--sf-accent)", background: "rgba(10,18,48,0.55)" }} data-testid="vision-drop-overlay">
          <p className="sf-chrome flex items-center gap-2 rounded-full px-5 py-3 text-[15px] font-semibold"><Upload size={17} style={{ color: "var(--sf-accent)" }} /> Dépose tes images ici</p>
        </div>
      )}
      {/* ── Tiroir Documents (documents IA + notes longues) ── */}
      {docsOpen && !readOnly && (
        <div className="sf-hide-present sf-chrome absolute bottom-3 right-3 top-16 z-40 flex w-[min(92vw,340px)] flex-col rounded-2xl p-3" data-testid="vision-docs-drawer">
          <div className="mb-2 flex items-center justify-between">
            <p className="sf-title" style={{ fontSize: 16 }}>Documents <span className="sf-small" style={{ fontSize: 13 }}>· {docItems.length}</span></p>
            <button onClick={() => setDocsOpen(false)} className="sf-btn" title="Fermer"><X size={15} /></button>
          </div>
          <div className="relative mb-2">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--sf-muted)" }} />
            <input value={docQuery} onChange={(e) => setDocQuery(e.target.value)} placeholder="Rechercher dans les documents" className="sf-field" style={{ paddingLeft: 32 }} data-testid="vision-docs-search" />
          </div>
          <div className="sf-scroll min-h-0 flex-1 space-y-2 overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
            {docItems
              .filter((d) => { const q = docQuery.trim().toLowerCase(); return !q || (tv(d.title, lang) + " " + tv(d.body, lang)).toLowerCase().includes(q); })
              .map((d) => (
                <button key={d.id} onClick={() => focusItem(d.id)} className="w-full rounded-xl p-3 text-left transition hover:brightness-110" style={{ background: "var(--sf-card)", border: "1px solid var(--sf-card-border, var(--sf-line))" }} data-testid={`vision-doc-${d.id}`}>
                  <p className="sf-text truncate" style={{ fontWeight: 600, fontSize: 14 }}>{tv(d.title, lang) || "Sans titre"}</p>
                  <p className="sf-small mt-0.5" style={{ fontSize: 12 }}>{d.type === "ai-doc" ? `IA · ${t(`vision.aiDoc.${AI_DOC_KEYS[d.docType] || "t1"}`)}` : "Note"}</p>
                  <p className="sf-small mt-1 line-clamp-2" style={{ fontSize: 12.5 }}>{tv(d.body, lang).slice(0, 160)}</p>
                </button>
              ))}
            {!docItems.length && (
              <div className="rounded-xl p-4 text-center" style={{ background: "var(--sf-card)" }}>
                <p className="sf-small" style={{ fontSize: 13 }}>Aucun document sur ce board. Demande à l'IA un brief, un plan 30 jours ou un positionnement.</p>
                <button onClick={() => { setDocsOpen(false); setAiDocOpen(true); }} className="sf-btn sf-btn-primary mt-3" style={{ height: 34 }}><FileText size={14} /> Créer un document IA</button>
              </div>
            )}
          </div>
          {docItems.length > 0 && (
            <button onClick={() => { setDocsOpen(false); setAiDocOpen(true); }} className="sf-btn sf-btn-outline mt-2" style={{ height: 34 }}><Plus size={14} /> Nouveau document IA</button>
          )}
        </div>
      )}
      {!readOnly && <AiDocModal open={aiDocOpen} onClose={() => setAiDocOpen(false)} onGenerated={handleAiDocGenerated} />}
      {shareOpen && <ShareDialog board={boardKey} onClose={() => setShareOpen(false)} />}

      {/* ── Rail d'outils (gauche, ordinateur) ── */}
      {!readOnly && !isSmall && (
        <div className="sf-hide-present sf-chrome absolute left-3 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-0.5 rounded-[18px] p-1.5" data-testid="vision-rail">
          {RAIL.map((it, i) => (it.sep ? <span key={`s${i}`} className="my-1.5 h-px w-10" style={{ background: "var(--sf-line)" }} /> : (
            <button key={it.id} onClick={it.action} className="sf-tool relative" data-active={it.active ? "true" : "false"} data-testid={`vision-rail-${it.id}`} title={it.label}>
              <span className="sf-tool-ico"><it.icon size={17} /></span>
              {it.label}
              {it.badge > 0 && <span className="absolute right-1.5 top-1 rounded-full px-1.5 text-[10px] font-semibold" style={{ background: "var(--sf-accent)", color: "#0f1b3a" }}>{it.badge}</span>}
            </button>
          )))}
          <span className="my-1.5 h-px w-10" style={{ background: "var(--sf-line)" }} />
          <div className="flex flex-col items-center pb-1"><VoiceCapture onTranscribed={handleVoice} /><span className="mt-1 text-[11.5px] font-medium" style={{ color: "var(--sf-text-2)" }}>Vocal</span></div>

          <Popover open={menu === "all"} onClose={() => setMenu(null)} className="left-full top-0 ml-3 max-h-[70vh] w-[290px] overflow-y-auto" testid="vision-all-tools">
            {menuList(ALL_TOOLS)}
            <p className="sf-menu-title">Filtrer Élan / Refuge</p>
            <div className="px-1.5 pb-1.5"><TagFilterBar value={tagFilter} onChange={setTagFilter} counts={tagCounts} /></div>
          </Popover>
          <Popover open={menu === "live"} onClose={() => setMenu(null)} className="left-full top-0 ml-3 max-h-[70vh] w-[300px] overflow-y-auto" testid="vision-live-menu">{livePanel}</Popover>
          <Popover open={menu === "images"} onClose={() => setMenu(null)} className="bottom-0 left-full ml-3 w-[330px] p-3" testid="vision-images-menu">
            <p className="sf-menu-title" style={{ padding: "0 0 8px" }}>Images</p>
            <div className="flex items-center gap-2">
              <input autoFocus placeholder={t("vision.unsplash.search")} onKeyDown={(e) => e.key === "Enter" && doUnsplash(e.target.value)} className="sf-field" />
              {unsplash.loading && <Loader2 size={15} className="animate-spin" />}
            </div>
            {unsplash.results.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {unsplash.results.map((im) => (
                  <button key={im.thumb} onClick={() => addImageFromUrl(im.url)} className="overflow-hidden rounded-lg border border-transparent hover:border-[var(--sf-accent)]">
                    <img src={im.thumb} alt={im.alt} className="h-16 w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3"><AiImageRow onPick={addImageFromUrl} /></div>
            <input placeholder="…ou colle l'URL d'une image" onKeyDown={(e) => e.key === "Enter" && addImageFromUrl(e.target.value)} className="sf-field mt-3" />
            <button onClick={() => fileInputRef.current?.click()} className="sf-btn sf-btn-outline mt-2 w-full justify-center" style={{ height: 34 }} data-testid="vision-import-image"><Upload size={14} /> Importer depuis l'ordinateur</button>
            <p className="sf-small mt-1.5 text-center" style={{ fontSize: 11.5 }}>Astuce : glisse une image directement sur le canvas.</p>
          </Popover>
          <Popover open={menu === "trash"} onClose={() => setMenu(null)} className="bottom-0 left-full ml-3 w-[330px] p-2" testid="vision-trash">{trashPanel}</Popover>
        </div>
      )}

      {/* ── Barre unique (haut droite) : statut · board · modes · zoom · annuler · carte · exporter · partager · présenter ── */}
      <div className="sf-hide-present absolute right-3 top-3 z-30 flex max-w-[calc(100%-24px)] flex-wrap items-center justify-end gap-2">
        {readOnly && (
          <span className="sf-chrome flex h-9 items-center gap-2 rounded-xl px-3 text-[13px]" style={{ color: "var(--sf-text-2)" }}>Lecture seule</span>
        )}
        <div className="sf-chrome flex items-center gap-0.5 rounded-xl p-1" data-testid="vision-topbar">
          {!readOnly && (
            <span data-testid="vision-save-status" title={saving ? t("common.saving") : saveError ? t("common.saveError") : t("common.saved")}
              className="flex h-8 items-center gap-1.5 px-2 text-[13px]">
              {saving ? <Loader2 size={14} className="animate-spin" style={{ color: "var(--sf-accent)" }} />
                : saveError ? <><AlertTriangle size={14} className="text-red-400" /><span className="text-red-400">{t("common.saveError")}</span></>
                : <Check size={14} className="text-emerald-400" />}
            </span>
          )}
          {!readOnly && <><span className="mx-0.5 h-5 w-px" style={{ background: "var(--sf-line)" }} /><BoardSwitcher current={boardKey} onSwitch={switchBoard} /></>}
          {!readOnly && !isSmall && (
            <>
              <span className="mx-1 h-5 w-px" style={{ background: "var(--sf-line)" }} />
              <button onClick={() => setMode("select")} title={t("vision.select")} data-testid="vision-tool-select" className="sf-btn" data-active={mode === "select" ? "true" : "false"}><MousePointer2 size={15} /></button>
              <button onClick={() => setMode("hand")} title={t("vision.pan")} data-testid="vision-tool-hand" className="sf-btn" data-active={mode === "hand" ? "true" : "false"}><Hand size={15} /></button>
            </>
          )}
          {!isSmall && (
            <>
              <span className="mx-1 h-5 w-px" style={{ background: "var(--sf-line)" }} />
              <button onClick={() => zoomTo(zoom - 0.1)} title={t("vision.zoomOut")} data-testid="vision-zoom-out" className="sf-btn"><Minus size={15} /></button>
              <button onClick={() => { needScrollRef.current = true; setRects((r) => ({ ...r })); }} className="sf-btn sf-num w-12 text-[12px]" title="Ajuster à l'écran" data-testid="vision-zoom-value">{zoomPct}%</button>
              <button onClick={() => zoomTo(zoom + 0.1)} title={t("vision.zoomIn")} data-testid="vision-zoom-in" className="sf-btn"><Plus size={15} /></button>
            </>
          )}
          {!readOnly && (
            <>
              <span className="mx-1 h-5 w-px" style={{ background: "var(--sf-line)" }} />
              <button onClick={undo} disabled={!canUndo} title="Annuler (Ctrl+Z)" data-testid="vision-undo" className="sf-btn"><Undo2 size={15} /></button>
              <button onClick={redo} disabled={!canRedo} title="Rétablir (Ctrl+Maj+Z)" data-testid="vision-redo" className="sf-btn"><Redo2 size={15} /></button>
            </>
          )}
          {!isSmall && <button onClick={toggleMinimap} title={showMinimap ? "Masquer la mini-carte" : "Afficher la mini-carte"} data-testid="vision-minimap-toggle" className="sf-btn" data-active={showMinimap ? "true" : "false"}><MapIcon size={15} /></button>}
          <span className="mx-1 h-5 w-px" style={{ background: "var(--sf-line)" }} />
          <div className="relative">
            <button onClick={() => setMenu((m) => (m === "export" ? null : "export"))} disabled={exporting} className="sf-btn" title="Exporter" data-testid="vision-export">
              {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            </button>
            <Popover open={menu === "export"} onClose={() => setMenu(null)} className="right-0 top-full mt-2 w-[220px]">
              <button onClick={() => handleExport("png")} className="sf-menu-item" data-testid="vision-export-png"><span className="sf-mi-ico"><ImageIcon size={15} /></span>{t("vision.exportPng")}</button>
              <button onClick={() => handleExport("pdf")} className="sf-menu-item" data-testid="vision-export-pdf"><span className="sf-mi-ico"><FileDown size={15} /></span>{t("vision.exportPdf")}</button>
              <button onClick={handleVisionBook} className="sf-menu-item" data-testid="vision-export-book"><span className="sf-mi-ico"><BookOpen size={15} /></span>Vision Book (PDF, un mur par page)</button>
            </Popover>
          </div>
          {!readOnly && <button onClick={() => setShareOpen(true)} className="sf-btn" title="Partager en lecture seule" data-testid="vision-share"><Share2 size={15} /></button>}
          {!isSmall && <button onClick={startPresent} className="sf-btn sf-btn-primary ml-1 h-8" data-testid="vision-present"><Presentation size={15} /> <span className="hidden lg:inline">Présenter</span></button>}
        </div>
      </div>

      {modeHint && !isSmall && (
        <div className="sf-chrome pointer-events-none absolute left-1/2 top-16 z-30 -translate-x-1/2 rounded-full px-4 py-2 text-[13px] font-medium">{modeHint}</div>
      )}

      {/* ── Premier contact : 3 étapes plutôt que des cartes vides ── */}
      {showOnboard && (
        <div className="sf-menu absolute left-1/2 top-1/2 z-40 w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 p-6" data-testid="vision-onboard">
          <button onClick={hideOnboard} className="sf-btn absolute right-3 top-3" title="Fermer"><X size={16} /></button>
          <p className="sf-menu-title" style={{ padding: 0 }}>Bienvenue</p>
          <p className="sf-title mt-1" style={{ fontSize: 20 }}>Démarre ton cockpit en 3 étapes</p>
          <p className="sf-small mt-1" style={{ fontSize: 14 }}>Tes murs se remplissent tout seuls avec tes vraies données.</p>
          <ol className="mt-4 space-y-2">
            {[
              ["1", "Écris ta vision et ton pourquoi", "/onboarding"],
              ["2", "Fixe 3 objectifs pour ce trimestre", "/app/roadmap"],
              ["3", "Ajoute ta première action de 15 minutes", "/app/actions"],
            ].map(([n, label, route]) => (
              <li key={n}>
                <button onClick={() => navigate(route)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:brightness-110" style={{ background: "var(--sf-card)" }}>
                  <span className="sf-num flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold" style={{ background: "rgba(222,194,163,0.16)", color: "var(--sf-accent)" }}>{n}</span>
                  <span className="flex-1 text-[15px] font-medium">{label}</span>
                  <ArrowRight size={16} style={{ color: "var(--sf-muted)" }} />
                </button>
              </li>
            ))}
          </ol>
          <button onClick={hideOnboard} className="sf-small mt-4 hover:underline" style={{ fontSize: 13 }}>Plus tard, je découvre le board</button>
        </div>
      )}

      {/* ── Barre IA (bas) ── */}
      {!readOnly && (
        <div className={`sf-hide-present absolute left-1/2 z-30 -translate-x-1/2 ${isSmall ? "bottom-3 w-[calc(100%-24px)]" : "bottom-4 w-[min(94vw,620px)]"}`} data-testid="vision-prompt-bar">
          {!isSmall && (
            <div className="sf-chrome mx-auto mb-2 flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-full p-1" data-testid="vision-template-strip" style={{ scrollbarWidth: "none" }}>
              <span className="shrink-0 pl-2.5 pr-1 text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--sf-muted)" }}>Modèles</span>
              <button onClick={() => addByTool("cockpit")} className="shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition hover:bg-white/10" style={{ color: "var(--sf-accent)", background: "rgba(222,194,163,0.12)" }}>Cockpit A → Z</button>
              {templates.slice(0, 5).map((tpl) => (
                <button key={tpl.id || tpl.label} onClick={() => applyTemplate(tpl)} className="shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition hover:bg-white/10" data-testid={`vision-tpl-chip-${tpl.id || tpl.label}`}>{tpl.label}</button>
              ))}
              <button onClick={openTemplates} className="shrink-0 rounded-full px-3 py-1.5 text-[12.5px] transition hover:bg-white/10" style={{ color: "var(--sf-text-2)" }}>Tous <ArrowRight size={12} className="inline" /></button>
            </div>
          )}
          <div className="sf-chrome flex items-center gap-2 rounded-full px-2 py-1.5">
            <button onClick={() => setMenu((m) => (m === "add" ? null : "add"))} title={t("common.add")} data-testid="vision-prompt-add"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition" style={{ background: "rgba(222,194,163,0.18)", color: "var(--sf-accent)" }}><Plus size={17} /></button>
            <input value={prompt} onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerateBoard(); } }}
              placeholder={isSmall ? "Décris ton projet…" : t("vision.promptPlaceholder")} data-testid="vision-prompt-input" className="sf-input min-w-0 flex-1 px-2 text-[14px]" />
            <VoiceCapture onTranscribed={handleVoice} compact />
            <button onClick={handleGenerateBoard} disabled={!prompt.trim() || generating} data-testid="vision-prompt-submit"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40" style={{ background: "var(--sf-accent)", color: "#0f1b3a" }}>
              {generating ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
          <Popover open={menu === "add"} onClose={() => setMenu(null)} className="bottom-full left-0 mb-2 max-h-[60vh] w-[290px] overflow-y-auto" testid="vision-add-menu">
            {menuList([
              { title: isSmall && currentMobileWallId ? `Ajouter dans « ${mobilePages[mobileWall]?.label} »` : "Ajouter" },
              { id: "m-note", icon: Type, label: "Note", action: () => addByTool("note", isSmall && currentMobileWallId ? { wall: currentMobileWallId } : {}) },
              { id: "m-wall", icon: Columns3, label: "Mur", action: () => addByTool("wall") },
              { id: "m-images", icon: ImageIcon, label: "Image", action: () => setMenu("images-m") },
              ...ALL_TOOLS,
              { id: "m-trash", icon: Trash2, label: `Corbeille (${trashItems.length})`, action: () => setMenu("trash-m") },
            ])}
          </Popover>
          <Popover open={menu === "images-m"} onClose={() => setMenu(null)} className="bottom-full left-0 mb-2 w-[300px] p-3">
            <input autoFocus placeholder="Colle l'URL d'une image" onKeyDown={(e) => e.key === "Enter" && addImageFromUrl(e.target.value)} className="sf-field" />
            <button onClick={() => fileInputRef.current?.click()} className="sf-btn sf-btn-outline mt-2 w-full justify-center" style={{ height: 34 }}><Upload size={14} /> Importer une photo</button>
            <div className="mt-3"><AiImageRow onPick={addImageFromUrl} /></div>
          </Popover>
          <Popover open={menu === "live" && isSmall} onClose={() => setMenu(null)} className="bottom-full left-0 mb-2 max-h-[60vh] w-[300px] overflow-y-auto">{livePanel}</Popover>
          <Popover open={menu === "trash-m"} onClose={() => setMenu(null)} className="bottom-full left-0 mb-2 w-[300px] p-2">{trashPanel}</Popover>
        </div>
      )}

      {/* ── Modèles de départ ── */}
      {tplOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-[#060a18]/70 backdrop-blur-sm" onClick={() => setTplOpen(false)} data-testid="vision-templates-overlay" />
          <div className="sf sf-menu fixed left-1/2 top-1/2 z-[61] max-h-[80vh] w-[min(94vw,640px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-6" data-testid="vision-templates-panel">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="sf-title flex items-center gap-2" style={{ fontSize: 18 }}><LayoutTemplate size={18} style={{ color: "var(--sf-accent)" }} /> {t("vision.templates.title")}</p>
                <p className="sf-small">{t("vision.templates.lead")}</p>
              </div>
              <button onClick={() => setTplOpen(false)} data-testid="vision-templates-close" className="sf-btn"><X size={18} /></button>
            </div>
            <button onClick={() => { setTplOpen(false); addByTool("cockpit"); }} className="mb-3 flex w-full items-center gap-3 rounded-2xl p-4 text-left transition hover:brightness-110" style={{ background: "var(--sf-card)", boxShadow: "inset 0 0 0 1px rgba(222,194,163,0.4)" }}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(222,194,163,0.16)", color: "var(--sf-accent)" }}><Activity size={18} /></span>
              <span className="flex-1"><span className="sf-title block">Cockpit Vision A → Z</span><span className="sf-small block" style={{ fontSize: 13 }}>6 murs reliés en direct à tes objectifs, finances, actions, énergie, idées et victoires.</span></span>
              <ArrowRight size={16} />
            </button>
            {tplLoading ? (
              <div className="sf-small flex items-center justify-center gap-2 py-12"><Loader2 size={16} className="animate-spin" /> {t("common.loading")}</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {templates.map((tpl) => (
                  <button key={tpl.id} onClick={() => applyTemplate(tpl)} data-testid={`vision-template-${tpl.id}`}
                    className="flex flex-col items-start gap-1.5 rounded-2xl p-4 text-left transition hover:brightness-110" style={{ background: "var(--sf-card)" }}>
                    <span className="text-2xl">{tpl.emoji}</span>
                    <span className="sf-title">{tpl.label}</span>
                    <span className="sf-small" style={{ fontSize: 13 }}>{tpl.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Présentation ── */}
      {presenting && (
        <div className="sf-chrome absolute bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full p-1.5">
          <button onClick={() => setPresentIdx((i) => Math.max(0, i - 1))} disabled={presentIdx === 0} className="sf-btn"><ChevronLeft size={17} /></button>
          <span className="sf-num px-2 text-[13px] font-medium">{Math.min(presentIdx + 1, presentWalls.length)} / {presentWalls.length} · {presentWalls[presentIdx]?.title}</span>
          <button onClick={() => setPresentIdx((i) => Math.min(presentWalls.length - 1, i + 1))} disabled={presentIdx >= presentWalls.length - 1} className="sf-btn"><ChevronRight size={17} /></button>
          <span className="mx-1 h-5 w-px" style={{ background: "var(--sf-line)" }} />
          <button onClick={stopPresent} className="sf-btn" data-testid="vision-present-exit"><X size={16} /> Quitter</button>
        </div>
      )}

      {isSmall ? (
        /* ───────── Mobile : un mur par écran ───────── */
        <div className="sf-surface flex h-full flex-col" data-testid="vision-mobile">
          <div className="sf-scroll flex shrink-0 gap-1.5 overflow-x-auto px-3 pb-2 pt-[60px]" data-testid="vision-mobile-tabs">
            {mobilePages.map((pg, i) => (
              <button key={pg.key} onClick={() => goMobile(i)} ref={i === mobileWall ? (el) => el?.scrollIntoView?.({ block: "nearest", inline: "nearest" }) : undefined} className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition"
                style={i === mobileWall ? { background: "rgba(222,194,163,0.18)", color: "var(--sf-accent)" } : { background: "var(--sf-chrome)", color: "var(--sf-text-2)" }}>
                {i + 1} · {pg.label}
              </button>
            ))}
          </div>
          <div ref={mobileRef} className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden" style={{ scrollbarWidth: "none" }}
            onScroll={(e) => { const el = e.currentTarget; const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth)); if (i !== mobileWall) setMobileWall(i); }}>
            {mobilePages.map((pg) => (
              <div key={pg.key} className="sf-scroll h-full w-full shrink-0 snap-start overflow-y-auto px-3 pb-28">
                {pg.wall && pg === mobilePages[0] && headingCard && <p className="sf-heading mb-3 px-1" style={{ fontSize: 22 }}>{headingText(headingCard.text, prenom)}</p>}
                {pg.wall ? renderWall(pg.wall) : (
                  <div className="sf-wall"><h3 className="sf-wall-title mb-4 px-2">Libre</h3><div className="flex flex-col gap-3">{looseOthers.map((c) => renderShell(c, true))}</div></div>
                )}
              </div>
            ))}
            {!mobilePages.length && loaded && <p className="sf-small w-full p-6 text-center">Ce board est vide.</p>}
          </div>
        </div>
      ) : (
        <>
          {/* ── Mini-carte (sur demande) ── */}
          {showMinimap && (
            <div onClick={jumpToMiniMap} data-testid="vision-minimap" className="sf-hide-present sf-chrome absolute bottom-3 right-3 z-30 cursor-pointer overflow-hidden rounded-xl" style={{ width: MM_W, height: MM_H }}>
              <div className="relative h-full w-full">
                {activeItems.filter((it) => !it.parent && rects[it.id]).map((it) => {
                  const r = rects[it.id];
                  return <div key={`mm-${it.id}`} className="absolute rounded-sm" style={{ left: (r.x / BOARD_W) * MM_W, top: (r.y / BOARD_H) * MM_H, width: Math.max(2, (r.w / BOARD_W) * MM_W), height: Math.max(2, (r.h / BOARD_H) * MM_H), background: it.type === "wall" ? (it.color || "#94A3B8") : "#DEC2A3", opacity: it.type === "wall" ? 0.45 : 0.7 }} />;
                })}
                <div className="absolute rounded-sm border" style={{ borderColor: "var(--sf-accent)", left: (viewport.left / (BOARD_W * zoom)) * MM_W, top: (viewport.top / (BOARD_H * zoom)) * MM_H, width: Math.min(MM_W, (viewport.w / (BOARD_W * zoom)) * MM_W), height: Math.min(MM_H, (viewport.h / (BOARD_H * zoom)) * MM_H) }} />
              </div>
            </div>
          )}

          {/* ── Surface ── */}
          <div ref={scrollRef} onWheel={onWheelZoom}
            onPointerDown={(e) => { if (e.target === e.currentTarget || e.target.dataset?.bg) onSurfacePointerDown(e); }}
            onContextMenu={(e) => { e.preventDefault(); if (!readOnly) setMode((m) => (m === "hand" ? "select" : "hand")); }}
            className={["sf-surface sf-scroll relative h-full w-full overflow-auto", mode === "hand" || readOnly ? "cursor-grab" : ""].join(" ")}
            style={{ backgroundSize: `${28 * zoom}px ${28 * zoom}px` }}>
            <div style={{ width: BOARD_W * zoom, height: BOARD_H * zoom }} data-bg="1">
              <div ref={boardRef} data-bg="1" className="relative" style={{ width: BOARD_W, height: BOARD_H, transform: `scale(${zoom})`, transformOrigin: "top left", userSelect: draggingId ? "none" : "auto" }}>

                {!loaded && <div className="sf-small absolute left-[300px] top-[200px] flex items-center gap-2" style={{ fontSize: 18 }}><Loader2 size={18} className="animate-spin" /> {t("common.loading")}</div>}

                {walls.map(renderWall)}

                {/* Lignes entre cartes */}
                <svg className="absolute inset-0" width={BOARD_W} height={BOARD_H} style={{ pointerEvents: "none", zIndex: 2 }}>
                  <defs>
                    <marker id="sf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(222,194,163,0.85)" />
                    </marker>
                  </defs>
                  {lines.map((l) => {
                    const a = rects[l.from];
                    const b = rects[l.to];
                    if (!a || !b) return null;
                    const { d } = linePath(a, b);
                    const sel = selectedLine === l.id;
                    return (
                      <g key={l.id}>
                        {!readOnly && <path d={d} fill="none" stroke="transparent" strokeWidth="18" style={{ pointerEvents: "stroke", cursor: "pointer" }}
                          onPointerDown={(e) => { e.stopPropagation(); setSelectedLine(l.id); setSelectedId(null); }} />}
                        <path d={d} fill="none" stroke={sel ? "#F1E2CC" : "rgba(222,194,163,0.7)"} strokeWidth={sel ? 3.5 : 2.5} markerEnd="url(#sf-arrow)" />
                      </g>
                    );
                  })}
                  {drawPts && drawPts.length > 1 && (
                    <path d={drawPts.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ")} fill="none" stroke="#DEC2A3" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
                {selectedLine && !readOnly && (() => {
                  const l = lines.find((x) => x.id === selectedLine);
                  const a = l && rects[l.from];
                  const b = l && rects[l.to];
                  if (!a || !b) return null;
                  const { mid } = linePath(a, b);
                  return (
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={() => trashItem(selectedLine)} className="sf-handle absolute z-40 hover:!text-red-400"
                      style={{ left: mid.x - 15, top: mid.y - 15, display: "flex" }} title="Supprimer la ligne" data-testid="vision-line-delete"><X size={15} /></button>
                  );
                })()}

                {freeItems.map((card) => renderShell(card, false))}

                {tagFilter !== "all" && loaded && !freeItems.length && !walls.length && (
                  <div className="sf-chrome absolute left-[300px] top-[200px] rounded-xl px-4 py-3 text-[15px]">{t("vision.tags.empty")}</div>
                )}

                {/* Calque de dessin : capte le tracé même au-dessus des cartes */}
                {mode === "draw" && !readOnly && (
                  <div className="absolute inset-0" style={{ zIndex: 60, cursor: "crosshair" }} onPointerDown={onSurfacePointerDown} />
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ───────────────────────── Partage en lecture seule ───────────────────────── */

function ShareDialog({ board, onClose }) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [opts, setOpts] = useState({ hide_finances: true, hide_energie: true });
  useEffect(() => {
    fetchShare(board).then((s) => { setState(s); if (s?.active) setOpts({ hide_finances: s.hide_finances, hide_energie: s.hide_energie }); })
      .catch(() => setState({ active: false, error: true }));
  }, [board]);
  const url = state?.active ? `${window.location.origin}/v/${state.token}` : "";
  const save = async (next = opts) => {
    setBusy(true);
    try { const s = await saveShare({ board, ...next }); setState(s); }
    catch { toast.error("Partage impossible pour le moment (compte requis)."); }
    finally { setBusy(false); }
  };
  const revoke = async () => {
    if (!window.confirm("Désactiver ce lien ? Les personnes qui l'ont ne pourront plus voir le board.")) return;
    setBusy(true);
    try { await revokeShare(board); setState({ active: false }); toast("Lien désactivé"); } catch { toast.error("Impossible de désactiver le lien."); } finally { setBusy(false); }
  };
  const copy = () => navigator.clipboard?.writeText(url).then(() => toast.success("Lien copié")).catch(() => {});
  const setOpt = (k) => { const next = { ...opts, [k]: !opts[k] }; setOpts(next); if (state?.active) save(next); };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#060a18]/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="sf sf-menu relative w-full max-w-md p-6" onClick={(e) => e.stopPropagation()} data-testid="vision-share-dialog">
        <button onClick={onClose} className="sf-btn absolute right-3 top-3"><X size={16} /></button>
        <p className="sf-title" style={{ fontSize: 18 }}>Partager en lecture seule</p>
        <p className="sf-small mt-1" style={{ fontSize: 14 }}>Pour un coach, un associé ou un banquier : ils voient le board sans compte et ne peuvent rien modifier.</p>
        <div className="mt-4 space-y-2">
          {[["hide_finances", "Masquer les finances et le SWOT (CA, trésorerie, analyse)"], ["hide_energie", "Masquer l'énergie et la roue de l'équilibre"]].map(([k, label]) => (
            <label key={k} className="flex cursor-pointer items-center gap-3 rounded-xl p-3" style={{ background: "var(--sf-card)" }}>
              <input type="checkbox" checked={opts[k]} onChange={() => setOpt(k)} className="h-4 w-4 accent-[#DEC2A3]" />
              <span className="text-[14px]">{label}</span>
            </label>
          ))}
        </div>
        {!state ? (
          <div className="sf-small mt-4 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Chargement…</div>
        ) : state.active ? (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <input readOnly value={url} className="sf-field" onFocus={(e) => e.target.select()} data-testid="vision-share-url" />
              <button onClick={copy} className="sf-btn sf-btn-primary shrink-0" style={{ height: 36 }}><Copy size={14} /> Copier</button>
            </div>
            <button onClick={revoke} disabled={busy} className="sf-small mt-3 hover:underline" style={{ fontSize: 13, color: "#F87171" }}>Désactiver le lien</button>
          </div>
        ) : (
          <button onClick={() => save()} disabled={busy} className="sf-btn sf-btn-primary mt-4 h-10 w-full" data-testid="vision-share-create">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />} Créer le lien de partage
          </button>
        )}
      </div>
    </div>
  );
}

export { STICKY_PALETTE, stickyOf, usesPaperPalette };
