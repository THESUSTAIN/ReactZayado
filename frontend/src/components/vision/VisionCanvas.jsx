import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Plus, Minus, MousePointer2, Hand, Loader2, Check, AlertTriangle, X, Send,
  Type, Image as ImageIcon, ListChecks, Link2, Palette, Sparkles, FileText,
  LayoutTemplate, Quote, FileDown, ArrowRight, Wand2, RefreshCw, Maximize2, Heart, Mic,
  Columns3, Trash2, Presentation, Share2,
} from "lucide-react";
import {
  fetchBoard, saveBoard, fetchStarterTemplates, generateAiDoc, generateBoard, fetchInspire, searchUnsplash,
} from "@/lib/kairosApi";
import { useI18n } from "@/i18n";
import {
  CardStyleMenu, CardTagBadges, TagFilterBar, STICKY_PALETTE, stickyOf, usesPaperPalette,
} from "@/components/vision/CardStyleMenu";
import { BoardSwitcher } from "@/components/vision/BoardSwitcher";
import { AiImageRow } from "@/components/vision/AiImageRow";
import { VoiceCapture } from "@/components/vision/VoiceCapture";
import { GoalCountdown } from "@/components/kairos/GoalCountdown";

const BOARD_W = 3000;
const BOARD_H = 2000;
const CENTER = { x: 660, y: 420 };
const NOTE_COLORS = ["#4a6a9e", "#2FB89A", "#8b6fbf", "#DEC2A3"];
const BOARD_STORAGE = "kairos_board_key";

/** Valeur traduite d'un champ multilingue { fr, en } ou d'une chaîne simple. */
const tv = (v, lang = "fr") => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return v[lang] ?? v.fr ?? v.en ?? "";
};

const AI_DOC_TYPES = ["note", "brief", "plan", "positioning", "swot"];
const AI_DOC_KEYS = { note: "t1", brief: "t2", plan: "t3", positioning: "t4", swot: "t5" };
const VISION_LAYOUT_STORAGE = "kairos_vision_layout_v1";
const DEFAULT_WALLS = [
  { id: "wall_vision", title: "1 · Vision & Pourquoi", x: 120, y: 120, w: 520, h: 760, color: "#DEC2A3" },
  { id: "wall_objectifs", title: "2 · Objectifs", x: 700, y: 120, w: 520, h: 760, color: "#8FB7E8" },
  { id: "wall_actions", title: "3 · Actions & énergie", x: 1280, y: 120, w: 520, h: 760, color: "#8FD6BF" },
];

function loadVisionLayout(boardKey) {
  try {
    const all = JSON.parse(localStorage.getItem(VISION_LAYOUT_STORAGE) || "{}");
    return all[boardKey] || { walls: DEFAULT_WALLS, connections: [] };
  } catch (_) {
    return { walls: DEFAULT_WALLS, connections: [] };
  }
}

function saveVisionLayout(boardKey, layout) {
  try {
    const all = JSON.parse(localStorage.getItem(VISION_LAYOUT_STORAGE) || "{}");
    all[boardKey] = layout;
    localStorage.setItem(VISION_LAYOUT_STORAGE, JSON.stringify(all));
  } catch (_) {}
}

function AiDocModal({ open, onClose, onGenerated }) {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState("");
  const [docType, setDocType] = useState("note");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    const value = prompt.trim();
    if (value.length < 3) return toast.error(t("vision.aiDoc.short"));
    setLoading(true);
    try {
      const res = await generateAiDoc(value, docType);
      onGenerated({ title: res.title, content: res.content, docType: res.doc_type });
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy-900/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong relative w-full max-w-lg rounded-2xl p-6" onClick={(e) => e.stopPropagation()} data-testid="vision-ai-doc-modal">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-offwhite/60 hover:bg-white/10" data-testid="vision-ai-doc-close"><X size={16} /></button>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold"><FileText size={17} /></span>
          <div>
            <h3 className="font-display text-lg font-bold text-offwhite">{t("vision.aiDoc.title")}</h3>
            <p className="text-xs text-offwhite/60">{t("vision.aiDoc.lead")}</p>
          </div>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {AI_DOC_TYPES.map((id) => (
            <button key={id} onClick={() => setDocType(id)} data-testid={`vision-ai-doc-type-${id}`}
              className={["rounded-lg border px-2.5 py-2 text-left transition",
                docType === id ? "border-gold bg-gold/15 text-offwhite" : "border-white/10 bg-white/5 text-offwhite/60 hover:border-gold/50"].join(" ")}>
              <div className="text-[11px] font-semibold text-offwhite">{t(`vision.aiDoc.${AI_DOC_KEYS[id]}`)}</div>
              <div className="mt-0.5 text-[10px] leading-snug opacity-80">{t(`vision.aiDoc.${AI_DOC_KEYS[id]}h`)}</div>
            </button>
          ))}
        </div>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} autoFocus
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate(); }}
          placeholder={t("vision.aiDoc.placeholder")}
          data-testid="vision-ai-doc-prompt"
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-offwhite outline-none focus:border-gold placeholder:text-offwhite/40" />
        <button onClick={generate} disabled={loading} data-testid="vision-ai-doc-generate"
          className="btn-gold mt-3 w-full disabled:opacity-60">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
          {loading ? t("vision.aiDoc.generating") : t("vision.aiDoc.generate")}
        </button>
      </div>
    </div>
  );
}

export function VisionCanvas() {
  const { t, lang } = useI18n();

  const [boardKey, setBoardKey] = useState(() => {
    try { return localStorage.getItem(BOARD_STORAGE) || "perso"; } catch (_) { return "perso"; }
  });
  const [items, setItems] = useState([]);
  const [walls, setWalls] = useState(() => loadVisionLayout(boardKey).walls);
  const [connections, setConnections] = useState(() => loadVisionLayout(boardKey).connections);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [zoom, setZoom] = useState(0.85);
  const [mode, setMode] = useState("select");
  const [draggingId, setDraggingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [styleMenuId, setStyleMenuId] = useState(null);
  const [tagFilter, setTagFilter] = useState("all");
  const [connectMode, setConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [aiDocOpen, setAiDocOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [viewport, setViewport] = useState({ left: 0, top: 0, w: 0, h: 0 });

  const scrollRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const rotateRef = useRef(null);
  const resizeRef = useRef(null);
  const skipSaveRef = useRef(false);

  const seedCards = useCallback((key) => {
    if (key !== "perso") return [];
    return [
      { id: "seed_1", type: "sticky", stickyColor: "cream", x: 200, y: 220, w: 240, h: 220, rotate: -4,
        label: "MA PHRASE DE VIE", style: "handwritten", tags: ["elan"],
        body: { fr: "Construire la liberté financière en aidant le plus de personnes possible.",
                en: "Build financial freedom by helping as many people as possible." } },
      { id: "seed_2", type: "polaroid", x: 470, y: 200, w: 260, h: 260, rotate: 2, caption: "Liberté", tags: ["refuge"],
        image: "https://images.unsplash.com/photo-1603979649806-5299879db16b?w=800&q=80" },
      { id: "seed_3", type: "sticky", stickyColor: "pink", x: 760, y: 220, w: 240, h: 220, rotate: -2,
        label: "OBJECTIF 3 ANS", tags: ["elan"],
        body: { fr: "• Atteindre 1M€ de CA\n• Racheter une entreprise\n• 4h de travail par jour\n• Voyager 6 mois / an",
                en: "• Reach €1M revenue\n• Acquire a company\n• 4 working hours a day\n• Travel 6 months a year" } },
      { id: "seed_4", type: "polaroid", x: 1030, y: 200, w: 240, h: 240, rotate: 3, caption: "",
        image: "https://images.unsplash.com/photo-1505843513577-22bb7d21e455?w=800&q=80" },
      { id: "seed_5", type: "sticky", stickyColor: "green", x: 900, y: 490, w: 230, h: 240, rotate: 2,
        label: "VALEURS", tags: ["refuge"],
        body: { fr: "• Intégrité\n• Excellence\n• Impact positif\n• Liberté\n• Foi",
                en: "• Integrity\n• Excellence\n• Positive impact\n• Freedom\n• Faith" } },
      { id: "seed_6", type: "kpi", stickyColor: "green", x: 200, y: 750, w: 240, h: 190, rotate: 0,
        label: "SANTÉ & ÉNERGIE", tags: ["refuge"],
        body: { fr: "Sport 4x / semaine\nMéditation quotidienne\nAlimentation saine\nSommeil 7h+",
                en: "Sport 4x / week\nDaily meditation\nHealthy food\n7h+ sleep" }, progress: 75 },
      { id: "seed_7", type: "kpi", stickyColor: "orange", x: 470, y: 750, w: 240, h: 190, rotate: 0,
        label: "BUSINESS", tags: ["elan"],
        body: { fr: "3 offres premium\n100 clients actifs\nAutomatiser 80%\nÉquipe de 10 pers.",
                en: "3 premium offers\n100 active clients\nAutomate 80%\nTeam of 10" }, progress: 60 },
      { id: "seed_8", type: "kpi", stickyColor: "yellow", x: 740, y: 750, w: 240, h: 190, rotate: 0,
        label: "FINANCE", tags: ["elan"],
        body: { fr: "CA : 1 000 000 €\nRentabilité > 30%\nInvestissements\nPatrimoine",
                en: "Revenue: €1,000,000\nMargin > 30%\nInvestments\nAssets" }, progress: 40 },
      { id: "seed_9", type: "kpi", stickyColor: "purple", x: 1010, y: 750, w: 240, h: 190, rotate: 0,
        label: "IMPACT",
        body: { fr: "Aider 10 000\nContenu gratuit\nMentorat\nProjets solidaires",
                en: "Help 10,000\nFree content\nMentoring\nSolidarity projects" }, progress: 50 },
      { id: "seed_10", type: "sticky", stickyColor: "blue", x: 200, y: 490, w: 200, h: 180, rotate: -3,
        label: "RAPPEL", style: "handwritten", tags: ["refuge"],
        body: { fr: "Focus sur les actions qui créent le plus de valeur.",
                en: "Focus on the actions that create the most value." } },
    ];
  }, []);

  /* ── Chargement du board courant ── */
  const loadBoard = useCallback((key) => {
    setLoaded(false);
    skipSaveRef.current = true;
    const layout = loadVisionLayout(key);
    setWalls(layout.walls);
    setConnections(layout.connections);
    setConnectSource(null);
    fetchBoard(key)
      .then((r) => {
        const cards = Array.isArray(r.cards) ? r.cards : [];
        setItems(cards.length === 0 ? seedCards(key) : cards);
      })
      .catch(() => setItems([]))
      .finally(() => setLoaded(true));
  }, [seedCards]);

  useEffect(() => { loadBoard(boardKey); }, [boardKey, loadBoard]);

  const switchBoard = (key) => {
    if (key === boardKey) return;
    try { localStorage.setItem(BOARD_STORAGE, key); } catch (_) {}
    setStyleMenuId(null);
    setEditingId(null);
    setBoardKey(key);
  };

  /* ── Sauvegarde auto (debounce) ── */
  useEffect(() => {
    if (!loaded) return;
    if (skipSaveRef.current) { skipSaveRef.current = false; return; }
    setSaving(true);
    const id = setTimeout(() => {
      saveBoard(items, boardKey).then(() => setSaveError(false)).catch(() => setSaveError(true)).finally(() => setSaving(false));
    }, 700);
    return () => clearTimeout(id);
  }, [items, loaded, boardKey]);

  useEffect(() => {
    if (loaded) saveVisionLayout(boardKey, { walls, connections });
  }, [walls, connections, loaded, boardKey]);

  /* ── Zoom clavier ── */
  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName) || e.target.isContentEditable) return;
      if (e.key === "+" || e.key === "=") { e.preventDefault(); setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2))); }
      if (e.key === "-" || e.key === "_") { e.preventDefault(); setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2))); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ── Drag ── */
  const onPointerDownCard = useCallback((e, item) => {
    if (mode !== "select") return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {}
    dragRef.current = { id: item.id, startX: e.clientX, startY: e.clientY, origX: item.x, origY: item.y };
    setDraggingId(item.id);
  }, [mode]);

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (d?.kind === "wall") {
        const dx = (e.clientX - d.startX) / zoom;
        const dy = (e.clientY - d.startY) / zoom;
        setWalls((prev) => prev.map((wall) => wall.id === d.id ? { ...wall, x: d.origX + dx, y: d.origY + dy } : wall));
      } else if (d) {
        const dx = (e.clientX - d.startX) / zoom;
        const dy = (e.clientY - d.startY) / zoom;
        setItems((prev) => prev.map((it) => {
          if (it.id !== d.id) return it;
          const nx = Math.min(BOARD_W - (it.w || 200), Math.max(0, d.origX + dx));
          const ny = Math.min(BOARD_H - (it.h || 150), Math.max(0, d.origY + dy));
          return { ...it, x: nx, y: ny };
        }));
      }
      const r = rotateRef.current;
      if (r) {
        const dx = e.clientX - r.cx;
        const dy = e.clientY - r.cy;
        let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        deg = Math.round(deg / 2) * 2;
        setItems((prev) => prev.map((it) => (it.id === r.id ? { ...it, rotate: deg } : it)));
      }
      const rs = resizeRef.current;
      if (rs) {
        const dx = (e.clientX - rs.startX) / zoom;
        const dy = (e.clientY - rs.startY) / zoom;
        setItems((prev) => prev.map((it) => {
          if (it.id !== rs.id) return it;
          const nw = Math.max(120, Math.min(600, rs.origW + dx));
          const nh = Math.max(80, Math.min(600, rs.origH + dy));
          return { ...it, w: nw, h: nh };
        }));
      }
    };
    const onUp = () => {
      dragRef.current = null; rotateRef.current = null; resizeRef.current = null;
      setDraggingId(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp); };
  }, [zoom]);

  const onRotateStart = (e, item) => {
    e.stopPropagation();
    const el = e.currentTarget.closest("[data-card-el]");
    if (!el) return;
    const rect = el.getBoundingClientRect();
    rotateRef.current = { id: item.id, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
    setDraggingId(item.id);
  };
  const onResizeStart = (e, item) => {
    e.stopPropagation();
    resizeRef.current = { id: item.id, startX: e.clientX, startY: e.clientY, origW: item.w || 200, origH: item.h || 150 };
    setDraggingId(item.id);
  };

  /* ── Pan ── */
  const onCanvasPointerDown = (e) => {
    if (mode !== "hand" || !scrollRef.current) return;
    panRef.current = { startX: e.clientX, startY: e.clientY, left: scrollRef.current.scrollLeft, top: scrollRef.current.scrollTop };
  };
  useEffect(() => {
    const onMove = (e) => {
      const p = panRef.current;
      if (!p || !scrollRef.current) return;
      scrollRef.current.scrollLeft = p.left - (e.clientX - p.startX);
      scrollRef.current.scrollTop = p.top - (e.clientY - p.startY);
    };
    const onUp = () => { panRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const onWheelZoom = useCallback((e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    setZoom((z) => Math.min(1.6, Math.max(0.3, +(z - e.deltaY * 0.0015).toFixed(2))));
  }, []);

  /* ── Mini-map ── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setViewport({ left: el.scrollLeft, top: el.scrollTop, w: el.clientWidth, h: el.clientHeight });
    update();
    el.addEventListener("scroll", update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [loaded]);

  const spawn = () => {
    const a = Math.random() * Math.PI * 2;
    return {
      x: CENTER.x + Math.cos(a) * 340 + (Math.random() * 60 - 30),
      y: CENTER.y + Math.sin(a) * 230 + (Math.random() * 60 - 30),
    };
  };

  const addByTool = (toolId) => {
    const { x, y } = spawn();
    const id = `u_${Date.now()}`;
    let note;
    if (toolId === "image") {
      note = { id, type: "image", x, y, w: 210, h: 160, tags: [], image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=600&q=80", title: { fr: "Nouvelle image", en: "New image" } };
    } else if (toolId === "polaroid") {
      const seed = Math.floor(Math.random() * 1000);
      note = { id, type: "polaroid", x, y, w: 240, h: 240, rotate: (Math.random() - 0.5) * 8, tags: [],
        image: `https://picsum.photos/seed/${seed}/600/500`, caption: "Liberté" };
    } else if (toolId === "sticky") {
      const colors = ["cream", "pink", "green", "orange", "blue", "purple"];
      const cn = colors[Math.floor(Math.random() * colors.length)];
      note = { id, type: "sticky", x, y, w: 220, h: 200, rotate: (Math.random() - 0.5) * 8, tags: [],
        stickyColor: cn, label: "MA NOTE", body: { fr: "Écris ton idée ici…", en: "Write your idea here…" } };
    } else if (toolId === "kpi") {
      note = { id, type: "kpi", x, y, w: 230, h: 180, stickyColor: "green", tags: [],
        label: "SANTÉ & ÉNERGIE", body: { fr: "Sport 4x / semaine\nMéditation quotidienne\nAlimentation saine", en: "Sport 4x / week\nDaily meditation\nHealthy food" }, progress: 65 };
    } else if (toolId === "color") {
      note = { id, type: "color", x, y, w: 220, h: 100, tags: [], title: { fr: "Palette", en: "Palette" }, colors: ["#0B1F3A", "#4a6a9e", "#DEC2A3", "#F1E2CC"] };
    } else if (toolId === "check") {
      note = { id, type: "note", x, y, w: 220, h: 130, color: "#2FB89A", tags: [], title: { fr: "Ma liste", en: "My list" }, body: { fr: "• Étape 1\n• Étape 2\n• Étape 3", en: "• Step 1\n• Step 2\n• Step 3" } };
    } else if (toolId === "link") {
      note = { id, type: "note", x, y, w: 220, h: 110, color: "#4a6a9e", tags: [], title: { fr: "Lien", en: "Link" }, body: { fr: "https://…", en: "https://…" } };
    } else if (toolId === "ai") {
      note = { id, type: "note", x, y, w: 220, h: 120, color: "#8b6fbf", tags: [], title: { fr: "Idée IA", en: "AI idea" }, body: { fr: "Clarifie ton objectif phare du trimestre.", en: "Clarify your flagship goal for the quarter." } };
    } else {
      note = { id, type: "note", x, y, w: 210, h: 110, color: NOTE_COLORS[Math.floor(Math.random() * 4)], tags: [], title: { fr: "Nouvelle idée", en: "New idea" }, body: { fr: "", en: "" } };
    }
    setItems((prev) => [...prev, note]);
    if (note.type !== "color") setTimeout(() => setEditingId(id), 60);
  };

  const addWall = () => {
    const n = walls.length + 1;
    setWalls((prev) => [...prev, {
      id: `wall_${Date.now()}`, title: `${n} · Nouveau mur`, x: 220 + (n % 3) * 560, y: 980,
      w: 520, h: 700, color: ["#DEC2A3", "#8FB7E8", "#8FD6BF", "#C8A7E8"][n % 4],
    }]);
  };

  const toggleConnection = (cardId) => {
    if (!connectSource) {
      setConnectSource(cardId);
      return;
    }
    if (connectSource !== cardId) {
      setConnections((prev) => prev.some((c) => (c.from === connectSource && c.to === cardId) || (c.from === cardId && c.to === connectSource))
        ? prev : [...prev, { id: `connection_${Date.now()}`, from: connectSource, to: cardId }]);
    }
    setConnectSource(null);
  };

  /* ── Capture vocale → carte ── */
  const handleVoice = (texte) => {
    const { x, y } = spawn();
    const id = `voice_${Date.now()}`;
    setItems((prev) => [...prev, {
      id, type: "sticky", stickyColor: "sky", x, y, w: 240, h: 210,
      rotate: (Math.random() - 0.5) * 6, tags: ["elan"], source: "vocale",
      label: t("vision.voice.label"), body: { fr: texte, en: texte },
    }]);
    toast.success(t("vision.voice.added"));
  };

  const handleAiDocGenerated = ({ title, content, docType }) => {
    const { x, y } = spawn();
    setItems((prev) => [...prev, { id: `u_${Date.now()}`, type: "ai-doc", x, y, w: 320, h: 260, color: "#DEC2A3", tags: [], docType, title: { fr: title, en: title }, body: { fr: content, en: content } }]);
  };

  const handleGenerateBoard = async () => {
    const value = prompt.trim();
    if (!value) return toast.error(t("vision.describeProject"));
    setGenerating(true);
    try {
      const res = await generateBoard(value);
      const jitter = () => Math.round((Math.random() - 0.5) * 60);
      const newCards = (res.cards || []).map((c, i) => ({ id: `gen_${Date.now()}_${i}`, tags: [], ...c, x: c.x + jitter(), y: c.y + jitter() }));
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
    try {
      const { quote, author } = await fetchInspire();
      const { x, y } = spawn();
      const text = `« ${quote} »\n— ${author}`;
      setItems((prev) => [...prev, { id: `u_${Date.now()}`, type: "note", x, y, w: 240, h: 130, color: "#DEC2A3", tags: ["refuge"], title: { fr: "Citation", en: "Quote" }, body: { fr: text, en: text } }]);
      toast.success(t("vision.quoteAi"));
    } catch {
      toast.error(t("common.unavailable"));
    }
  };

  const openTemplates = () => {
    setAddMenuOpen(false);
    setTplOpen(true);
    if (!templates.length) {
      setTplLoading(true);
      fetchStarterTemplates().then((r) => setTemplates(r.templates || [])).catch(() => toast.error(t("vision.templates.unavailable"))).finally(() => setTplLoading(false));
    }
  };

  const applyTemplate = (tpl) => {
    if (!tpl?.cards?.length) return;
    if (items.length && !window.confirm(t("vision.templates.replace", { name: tpl.label }))) return;
    setItems(tpl.cards.map((c, i) => ({ h: 130, tags: [], ...c, id: `tpl_${Date.now()}_${i}` })));
    setTplOpen(false);
    toast.success(t("vision.templates.applied", { name: tpl.label }));
  };

  const deleteCard = (id) => {
    const removed = items.find((c) => c.id === id);
    setItems((prev) => prev.filter((c) => c.id !== id));
    if (editingId === id) setEditingId(null);
    if (styleMenuId === id) setStyleMenuId(null);
    if (removed) toast(t("vision.cardDeleted"), { action: { label: t("vision.undo"), onClick: () => setItems((prev) => [...prev, removed]) } });
  };

  const patchCard = useCallback((id, patch) => {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const editBody = (id, text) =>
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, body: { ...(typeof c.body === "object" ? c.body : {}), [lang]: text } } : c)));

  const editImage = (id, url) => { if (url?.trim()) patchCard(id, { image: url.trim() }); setEditingId(null); };

  const [unsplash, setUnsplash] = useState({ q: "", results: [], loading: false });
  const doUnsplash = async (q) => {
    if (!q.trim()) return;
    setUnsplash((u) => ({ ...u, loading: true }));
    try { const { images } = await searchUnsplash(q, 9); setUnsplash({ q, results: images || [], loading: false }); }
    catch { setUnsplash((u) => ({ ...u, loading: false })); toast.error(t("vision.unsplash.unavailable")); }
  };

  const jumpToMiniMap = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = ((e.clientX - rect.left) / rect.width) * BOARD_W * zoom - viewport.w / 2;
    el.scrollTop = ((e.clientY - rect.top) / rect.height) * BOARD_H * zoom - viewport.h / 2;
  };

  const handleExport = async (kind) => {
    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(canvasRef.current, { backgroundColor: "#0B1F3A", useCORS: true, scale: 2, logging: false });
      if (kind === "png") {
        const link = document.createElement("a");
        link.download = `vision-board-${boardKey}-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } else {
        const jsPdfMod = await import("jspdf");
        const JsPDF = jsPdfMod.jsPDF || jsPdfMod.default;
        const pdf = new JsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
        const pageW = 420, pageH = 297, margin = 12;
        const ratio = canvas.width / canvas.height;
        let w = pageW - margin * 2, h = w / ratio;
        if (h > pageH - margin * 2) { h = pageH - margin * 2; w = h * ratio; }
        pdf.setFillColor(11, 31, 58);
        pdf.rect(0, 0, pageW, pageH, "F");
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", (pageW - w) / 2, (pageH - h) / 2, w, h, undefined, "FAST");
        pdf.save(`vision-board-${boardKey}-${new Date().toISOString().slice(0, 10)}.pdf`);
      }
      toast.success(`${kind.toUpperCase()} ✓`);
    } catch {
      toast.error(t("common.unavailable"));
    } finally {
      setExporting(false);
    }
  };

  /* ── Filtre par tag ── */
  const tagCounts = useMemo(() => {
    const c = { all: items.length, elan: 0, refuge: 0, none: 0 };
    items.forEach((it) => {
      const tags = Array.isArray(it.tags) ? it.tags : [];
      if (!tags.length) c.none += 1;
      if (tags.includes("elan")) c.elan += 1;
      if (tags.includes("refuge")) c.refuge += 1;
    });
    return c;
  }, [items]);

  const isVisible = useCallback((card) => {
    if (tagFilter === "all") return true;
    const tags = Array.isArray(card.tags) ? card.tags : [];
    if (tagFilter === "none") return tags.length === 0;
    return tags.includes(tagFilter);
  }, [tagFilter]);

  const visibleItems = useMemo(() => items.filter(isVisible), [items, isVisible]);

  const ctrlBtn = "flex h-8 w-8 items-center justify-center rounded-lg text-offwhite/70 hover:bg-white/10 transition";
  const ctrlActive = "flex h-8 w-8 items-center justify-center rounded-lg bg-gold/20 text-gold";

  const ADD_ITEMS = [
    { id: "starter", icon: LayoutTemplate, label: t("vision.tools.templates"), action: openTemplates },
    { id: "ai", icon: Sparkles, label: t("vision.tools.ai"), action: () => addByTool("ai") },
    { id: "sticky", icon: Type, label: t("vision.tools.sticky"), action: () => addByTool("sticky") },
    { id: "polaroid", icon: ImageIcon, label: t("vision.tools.polaroid"), action: () => addByTool("polaroid") },
    { id: "kpi", icon: ListChecks, label: t("vision.tools.kpi"), action: () => addByTool("kpi") },
    { id: "note", icon: Type, label: t("vision.tools.note"), action: () => addByTool("text") },
    { id: "ai-doc", icon: FileText, label: t("vision.tools.aiDoc"), action: () => setAiDocOpen(true) },
    { id: "image", icon: ImageIcon, label: t("vision.tools.image"), action: () => addByTool("image") },
    { id: "check", icon: ListChecks, label: t("vision.tools.list"), action: () => addByTool("check") },
    { id: "link", icon: Link2, label: t("vision.tools.link"), action: () => addByTool("link") },
    { id: "palette", icon: Palette, label: t("vision.tools.palette"), action: () => addByTool("color") },
  ];

  return (
    <div ref={canvasRef} data-testid="vision-canvas-container"
      className={["relative h-[calc(100dvh-120px)] overflow-hidden bg-[#1F1F1F] md:h-[calc(100dvh-150px)] md:rounded-2xl md:border md:border-white/10", presenting ? "fixed inset-0 z-[80] h-[100dvh] w-[100vw] rounded-none border-0" : ""].join(" ")}>
      <AiDocModal open={aiDocOpen} onClose={() => setAiDocOpen(false)} onGenerated={handleAiDocGenerated} />

      {/* Rail d'outils gauche (desktop) */}
      <div className="absolute left-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-1 rounded-2xl border border-white/10 bg-navy-800/90 p-1.5 shadow-lg backdrop-blur md:flex">
        <button onClick={addWall} title="Ajouter un mur" data-testid="vision-tool-wall"
          className="flex h-11 w-11 flex-col items-center justify-center rounded-xl text-offwhite/60 transition hover:bg-gold/15 hover:text-gold">
          <Columns3 size={17} /><span className="mt-0.5 text-[8px] font-medium">Mur</span>
        </button>
        <button onClick={() => { setConnectMode((v) => !v); setConnectSource(null); }} title="Relier deux cartes" data-testid="vision-tool-line"
          className={["flex h-11 w-11 flex-col items-center justify-center rounded-xl text-offwhite/60 transition hover:bg-gold/15 hover:text-gold", connectMode ? "bg-gold/20 text-gold" : ""].join(" ")}>
          <Link2 size={17} /><span className="mt-0.5 text-[8px] font-medium">Ligne</span>
        </button>
        <div className="my-1 border-t border-white/10" />
        {ADD_ITEMS.slice(1).map((it) => {
          const Icon = it.icon;
          return (
            <button key={it.id} onClick={it.action} title={it.label} data-testid={`vision-tool-${it.id}`}
              className="flex h-11 w-11 flex-col items-center justify-center rounded-xl text-offwhite/60 transition hover:bg-gold/15 hover:text-gold">
              <Icon size={17} />
              <span className="mt-0.5 text-[8px] font-medium">{it.label.split(" ")[0]}</span>
            </button>
          );
        })}
        {/* Capture vocale → carte */}
        <div className="mt-1 flex flex-col items-center border-t border-white/10 pt-1">
          <VoiceCapture onTranscribed={handleVoice} />
          <span className="mt-0.5 text-[8px] font-medium text-offwhite/50">{t("vision.tools.voice").split(" ")[0]}</span>
        </div>
      </div>

      {/* Statut + boards + compte à rebours */}
      <div className="absolute left-3 top-3 z-30 hidden flex-wrap items-center gap-2 md:flex">
        <div data-testid="vision-save-status" className="flex items-center gap-1.5 rounded-full border border-white/10 bg-navy-800/90 px-3 py-1.5 text-xs shadow-lg">
          {saving ? (<><Loader2 size={12} className="animate-spin text-gold" /> <span className="text-offwhite/60">{t("common.saving")}</span></>)
            : saveError ? (<><AlertTriangle size={12} className="text-alert" /> <span className="text-alert">{t("common.saveError")}</span></>)
            : (<><Check size={12} className="text-emerald-400" /> <span className="text-offwhite/60">{t("common.saved")}</span></>)}
        </div>
        <GoalCountdown variant="strip" />
      </div>

      {/* Contrôles haut-droite */}
      <div className="absolute right-3 top-3 z-30 flex flex-wrap items-center justify-end gap-1 rounded-xl border border-white/10 bg-navy-800/90 p-1 shadow-lg backdrop-blur">
        <BoardSwitcher current={boardKey} onSwitch={switchBoard} />
        <span className="mx-1 h-5 w-px bg-white/10" />
        <button onClick={() => setMode("select")} title={t("vision.select")} data-testid="vision-tool-select" className={mode === "select" ? ctrlActive : ctrlBtn}><MousePointer2 size={15} /></button>
        <button onClick={() => setMode("hand")} title={t("vision.pan")} data-testid="vision-tool-hand" className={mode === "hand" ? ctrlActive : ctrlBtn}><Hand size={15} /></button>
        <button onClick={() => setConnectMode((v) => !v)} title="Relier deux cartes" data-testid="vision-tool-line-top" className={connectMode ? ctrlActive : ctrlBtn}><Link2 size={15} /></button>
        <span className="mx-1 h-5 w-px bg-white/10" />
        <button onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))} title={t("vision.zoomOut")} data-testid="vision-zoom-out" className={ctrlBtn}><Minus size={15} /></button>
        <span className="w-10 text-center text-xs font-semibold text-offwhite" data-testid="vision-zoom-value">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))} title={t("vision.zoomIn")} data-testid="vision-zoom-in" className={ctrlBtn}><Plus size={15} /></button>
        <span className="mx-1 h-5 w-px bg-white/10" />
        <button onClick={handleInspire} title={t("vision.quoteAi")} data-testid="vision-inspire" className={ctrlBtn}><Quote size={15} /></button>
        <button onClick={() => { setPresenting((v) => !v); setConnectMode(false); setConnectSource(null); }} title="Présenter" data-testid="vision-present" className={presenting ? ctrlActive : ctrlBtn}><Presentation size={15} /></button>
        <button onClick={() => navigator.clipboard?.writeText(window.location.href).then(() => toast.success("Lien du board copié"))} title="Partager" data-testid="vision-share" className={ctrlBtn}><Share2 size={15} /></button>
        <button onClick={() => handleExport("png")} disabled={exporting} title={t("vision.exportPng")} data-testid="vision-export-png" className={ctrlBtn}>{exporting ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}</button>
        <button onClick={() => handleExport("pdf")} disabled={exporting} title={t("vision.exportPdf")} data-testid="vision-export-pdf" className={ctrlBtn}><FileDown size={15} /></button>
      </div>

      {/* Filtre tags Élan / Refuge */}
      <div className="absolute left-1/2 top-3 z-30 hidden -translate-x-1/2 lg:block">
        <TagFilterBar value={tagFilter} onChange={setTagFilter} counts={tagCounts} />
      </div>

      {/* Commandes mobiles : même logique que la rail desktop, accessible au pouce. */}
      <div className="absolute bottom-[4.75rem] left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/10 bg-navy-800/95 p-1 shadow-xl backdrop-blur md:hidden" data-testid="vision-mobile-toolbar">
        <button onClick={addWall} title="Ajouter un mur" data-testid="vision-mobile-wall" className="flex h-9 w-9 items-center justify-center rounded-xl text-offwhite/70 hover:bg-white/10 hover:text-gold"><Columns3 size={16} /></button>
        <button onClick={() => { setConnectMode((v) => !v); setConnectSource(null); }} title="Relier deux cartes" data-testid="vision-mobile-line" className={["flex h-9 w-9 items-center justify-center rounded-xl text-offwhite/70 hover:bg-white/10 hover:text-gold", connectMode ? "bg-gold/20 text-gold" : ""].join(" ")}><Link2 size={16} /></button>
        <button onClick={() => setMode("select")} title="Sélection" className={mode === "select" ? ctrlActive : ctrlBtn}><MousePointer2 size={16} /></button>
        <button onClick={() => setMode("hand")} title="Déplacer la vue" className={mode === "hand" ? ctrlActive : ctrlBtn}><Hand size={16} /></button>
        <button onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))} title="Zoom arrière" className={ctrlBtn}><Minus size={16} /></button>
        <span className="w-9 text-center text-[10px] font-semibold text-offwhite">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))} title="Zoom avant" className={ctrlBtn}><Plus size={16} /></button>
      </div>

      {/* Barre de prompt bas */}
      <div className="absolute bottom-4 left-1/2 z-30 w-[min(94vw,680px)] -translate-x-1/2" data-testid="vision-prompt-bar">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-navy-800/95 px-2 py-1.5 shadow-xl backdrop-blur">
          <button onClick={() => setAddMenuOpen((v) => !v)} title={t("common.add")} data-testid="vision-prompt-add"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold transition hover:bg-gold hover:text-navy-900"><Plus size={16} /></button>
          <input value={prompt} onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerateBoard(); } }}
            placeholder={t("vision.promptPlaceholder")}
            data-testid="vision-prompt-input"
            className="flex-1 bg-transparent px-2 text-sm text-offwhite outline-none placeholder:text-offwhite/40" />
          <VoiceCapture onTranscribed={handleVoice} compact />
          <button onClick={handleGenerateBoard} disabled={!prompt.trim() || generating} data-testid="vision-prompt-submit"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-offwhite transition hover:opacity-90 disabled:opacity-40">
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        {addMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setAddMenuOpen(false)} />
            <div className="absolute bottom-full left-0 z-50 mb-2 grid w-64 grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-navy-800 p-1.5 shadow-2xl" data-testid="vision-add-menu">
              {ADD_ITEMS.map((it) => {
                const Icon = it.icon;
                return (
                  <button key={it.id} onClick={() => { it.action(); setAddMenuOpen(false); }} data-testid={`vision-add-${it.id}`}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-offwhite transition hover:bg-white/10">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-gold"><Icon size={13} /></span>
                    {it.label}
                  </button>
                );
              })}
              <div className="col-span-2 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-offwhite/70">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-gold"><Mic size={13} /></span>
                <span className="flex-1">{t("vision.tools.voice")}</span>
                <VoiceCapture onTranscribed={(x) => { handleVoice(x); setAddMenuOpen(false); }} compact />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modèles */}
      {tplOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-navy-900/60 backdrop-blur-sm" onClick={() => setTplOpen(false)} data-testid="vision-templates-overlay" />
          <div className="glass-strong fixed left-1/2 top-1/2 z-[61] w-[min(94vw,640px)] max-h-[80vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl p-5" data-testid="vision-templates-panel">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-offwhite"><LayoutTemplate size={18} className="text-gold" /> {t("vision.templates.title")}</h3>
                <p className="text-sm text-offwhite/60">{t("vision.templates.lead")}</p>
              </div>
              <button onClick={() => setTplOpen(false)} data-testid="vision-templates-close" className="flex h-8 w-8 items-center justify-center rounded-lg text-offwhite/60 hover:bg-white/10"><X size={18} /></button>
            </div>
            {tplLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-offwhite/60"><Loader2 size={16} className="animate-spin" /> {t("common.loading")}</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {templates.map((tpl) => (
                  <button key={tpl.id} onClick={() => applyTemplate(tpl)} data-testid={`vision-template-${tpl.id}`}
                    className="group flex flex-col items-start gap-1.5 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-gold/60">
                    <span className="text-2xl">{tpl.emoji}</span>
                    <span className="font-display text-base font-bold text-offwhite">{tpl.label}</span>
                    <span className="text-xs text-offwhite/60">{tpl.description}</span>
                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-gold opacity-0 transition group-hover:opacity-100">{t("vision.templates.use")} <ArrowRight size={12} /></span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Mini-map */}
      <div onClick={jumpToMiniMap} data-testid="vision-minimap" className="absolute bottom-3 right-3 z-30 hidden cursor-pointer overflow-hidden rounded-lg border border-white/10 bg-navy-800 shadow-lg sm:block" style={{ width: 140, height: 93 }}>
        <div className="relative h-full w-full">
          {visibleItems.map((c) => (
            <div key={`mm-${c.id}`} className="absolute rounded-sm" style={{ left: (c.x / BOARD_W) * 140, top: (c.y / BOARD_H) * 93, width: Math.max(2, ((c.w || 200) / BOARD_W) * 140), height: Math.max(2, ((c.h || 120) / BOARD_H) * 93), background: "#DEC2A3", opacity: 0.6 }} />
          ))}
          <div className="absolute border border-gold" style={{ left: (viewport.left / (BOARD_W * zoom)) * 140, top: (viewport.top / (BOARD_H * zoom)) * 93, width: Math.min(140, (viewport.w / (BOARD_W * zoom)) * 140), height: Math.min(93, (viewport.h / (BOARD_H * zoom)) * 93) }} />
        </div>
      </div>

      {/* Surface */}
      <div ref={scrollRef} onMouseDown={onCanvasPointerDown} onWheel={onWheelZoom}
        onContextMenu={(e) => { e.preventDefault(); setMode((m) => (m === "hand" ? "select" : "hand")); }}
        className={["relative h-full w-full overflow-auto", mode === "hand" ? "cursor-grab" : ""].join(" ")}
        style={{ backgroundColor: "#1F1F1F" }}>
        <div className="relative" style={{ width: BOARD_W, height: BOARD_H, transform: `scale(${zoom})`, transformOrigin: "top left", userSelect: draggingId ? "none" : "auto" }}>
          <svg className="absolute inset-0 z-[5] h-full w-full" style={{ pointerEvents: "none" }}>
            {connections.map((connection) => {
              const from = items.find((c) => c.id === connection.from);
              const to = items.find((c) => c.id === connection.to);
              if (!from || !to) return null;
              const x1 = from.x + (from.w || 200) / 2, y1 = from.y + (from.h || 120) / 2;
              const x2 = to.x + (to.w || 200) / 2, y2 = to.y + (to.h || 120) / 2;
              const midY = (y1 + y2) / 2;
              return <path key={connection.id} d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`} fill="none" stroke="rgba(222,194,163,0.75)" strokeWidth="3" strokeLinecap="round" />;
            })}
          </svg>

          {walls.map((wall) => (
            <div key={wall.id} data-testid={`vision-wall-${wall.id}`} className="group absolute z-[1] rounded-[28px] bg-navy-800/90 shadow-inner"
              onPointerDown={(e) => {
                if (mode !== "select" || connectMode) return;
                e.stopPropagation();
                dragRef.current = { kind: "wall", id: wall.id, startX: e.clientX, startY: e.clientY, origX: wall.x, origY: wall.y };
              }} style={{ left: wall.x, top: wall.y, width: wall.w, height: wall.h, borderTop: `5px solid ${wall.color}`, cursor: mode === "select" ? "grab" : "default" }}>
              <div className="pointer-events-none px-5 pt-4 text-[22px] font-semibold tracking-tight text-offwhite">{wall.title}</div>
              <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setWalls((prev) => prev.filter((item) => item.id !== wall.id))}
                className="absolute right-3 top-3 hidden rounded-full p-1.5 text-offwhite/50 hover:bg-white/10 hover:text-alert group-hover:block" title="Supprimer le mur"><Trash2 size={14} /></button>
            </div>
          ))}

          <div className="absolute z-10 flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#F1E2CC] to-[#DEC2A3] px-6 py-4 text-center shadow-xl" style={{ left: CENTER.x, top: CENTER.y, width: 140 }}>
            <span className="font-display text-sm font-bold uppercase tracking-wide text-navy-900">{t("vision.hub")}</span>
          </div>

          {visibleItems.length === 0 && loaded && tagFilter !== "all" && (
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 rounded-xl border border-white/10 bg-navy-800/90 px-4 py-3 text-sm text-offwhite/60">
              {t("vision.tags.empty")}
            </div>
          )}

          {visibleItems.map((card, i) => {
            const isDragging = draggingId === card.id;
            const isEditing = editingId === card.id;
            const rot = card.rotate || 0;
            return (
              <div key={card.id} data-card-el
                onPointerDown={(e) => { if (connectMode) { e.stopPropagation(); toggleConnection(card.id); } else if (!isEditing) onPointerDownCard(e, card); }}
                onDoubleClick={() => ["note", "image", "ai-doc", "sticky", "kpi", "polaroid"].includes(card.type) && setEditingId(card.id)}
                data-testid={`vision-card-${card.id}`}
                className={["group absolute select-none", connectSource === card.id ? "z-50 ring-2 ring-gold" : "", isDragging ? "z-30" : styleMenuId === card.id ? "z-40" : "animate-fade-up"].join(" ")}
                style={{ left: card.x, top: card.y, width: card.w, touchAction: mode === "select" ? "none" : "auto", cursor: mode === "hand" ? "inherit" : isEditing ? "default" : "grab", transform: `rotate(${rot}deg) ${isDragging ? "scale(1.03)" : ""}`, animationDelay: `${Math.min(i * 30, 300)}ms` }}>

                <CardTagBadges tags={card.tags} />

                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => deleteCard(card.id)} data-testid={`vision-card-delete-${card.id}`}
                  className="absolute -right-2 -top-2 z-40 hidden h-6 w-6 items-center justify-center rounded-full bg-navy-900 text-white shadow-md hover:bg-alert group-hover:flex"><X size={13} /></button>

                {/* Couleur + tags de la carte */}
                <button onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setStyleMenuId((id) => (id === card.id ? null : card.id))}
                  title={t("vision.color.title")} data-testid={`vision-card-palette-${card.id}`}
                  className={`absolute -left-2 -top-2 z-40 h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-navy-800 text-offwhite/75 shadow-md hover:text-gold ${styleMenuId === card.id ? "flex" : "hidden group-hover:flex"}`}>
                  <Palette size={12} />
                </button>

                {/* Rotation */}
                <button onPointerDown={(e) => onRotateStart(e, card)} title={t("vision.rotate")}
                  className="absolute -top-8 left-1/2 z-40 hidden h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-white/20 bg-navy-800 text-offwhite/70 shadow-md hover:text-gold group-hover:flex">
                  <RefreshCw size={11} />
                </button>
                {/* Redimensionnement */}
                <button onPointerDown={(e) => onResizeStart(e, card)} title={t("vision.resize")}
                  className="absolute -bottom-2 -right-2 z-40 hidden h-5 w-5 cursor-nwse-resize items-center justify-center rounded-md border border-gold/40 bg-navy-800 text-gold shadow-md group-hover:flex"
                  style={{ cursor: "nwse-resize" }}>
                  <Maximize2 size={10} />
                </button>

                {styleMenuId === card.id && (
                  <CardStyleMenu card={card} onChange={(patch) => patchCard(card.id, patch)} onClose={() => setStyleMenuId(null)} />
                )}

                {/* Post-it */}
                {card.type === "sticky" && (() => {
                  const c = stickyOf(card.stickyColor || "cream");
                  const isHand = card.style === "handwritten";
                  return (
                    <div className="paper-note relative" style={{ background: c.bg, minHeight: card.h, padding: 14 }}>
                      <span className="push-pin" />
                      <div className="mb-1.5 text-[10px] font-bold tracking-[0.15em]" style={{ color: c.label }}>
                        {card.label || "MA NOTE"}
                      </div>
                      {isEditing ? (
                        <textarea autoFocus defaultValue={tv(card.body, lang)} rows={3}
                          onPointerDown={(e) => e.stopPropagation()}
                          onBlur={(e) => { editBody(card.id, e.target.value); setEditingId(null); }}
                          className={`w-full resize-none bg-transparent outline-none ${isHand ? "font-hand text-[22px] leading-tight" : "text-[13px] leading-snug"}`}
                          style={{ color: c.text }} />
                      ) : (
                        <p className={`whitespace-pre-line ${isHand ? "font-hand text-[22px] leading-tight" : "text-[13px] leading-snug"}`} style={{ color: c.text }}>
                          {tv(card.body, lang)}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Polaroïd */}
                {card.type === "polaroid" && (() => {
                  const frame = card.stickyColor ? stickyOf(card.stickyColor).bg : "#fafafa";
                  return (
                    <div className="polaroid-frame relative" style={{ height: card.h, background: frame }}>
                      <span className="push-pin red" />
                      <img src={card.image} alt={card.caption || ""} draggable={false}
                        className="w-full rounded-sm object-cover"
                        style={{ height: (card.h || 240) - (card.caption ? 54 : 26) }} />
                      {card.caption ? (
                        <div className="pt-2 text-center">
                          {isEditing ? (
                            <input autoFocus defaultValue={card.caption} onPointerDown={(e) => e.stopPropagation()}
                              onBlur={(e) => { patchCard(card.id, { caption: e.target.value }); setEditingId(null); }}
                              className="w-full bg-transparent text-center font-serif-italic text-[26px] leading-none text-navy-900 outline-none" />
                          ) : (
                            <span className="font-serif-italic text-[26px] leading-none text-navy-900">{card.caption}</span>
                          )}
                        </div>
                      ) : (
                        <div className="h-[24px]" />
                      )}
                      <Heart size={16} className="absolute bottom-3 right-3 fill-pink-500 text-pink-500" />
                    </div>
                  );
                })()}

                {/* Pilier KPI */}
                {card.type === "kpi" && (() => {
                  const c = stickyOf(card.stickyColor || "green");
                  const lines = tv(card.body, lang).split("\n").filter(Boolean);
                  return (
                    <div className="paper-note relative" style={{ background: c.bg, minHeight: card.h, padding: "12px 14px" }}>
                      <div className="mb-2 text-[10px] font-bold tracking-[0.15em]" style={{ color: c.label }}>
                        {card.label || "KPI"}
                      </div>
                      {isEditing ? (
                        <textarea autoFocus defaultValue={tv(card.body, lang)} rows={4}
                          onPointerDown={(e) => e.stopPropagation()}
                          onBlur={(e) => { editBody(card.id, e.target.value); setEditingId(null); }}
                          className="w-full resize-none bg-transparent text-[12px] leading-snug outline-none"
                          style={{ color: c.text }} />
                      ) : (
                        <ul className="mb-8 space-y-1">
                          {lines.map((line, k) => (
                            <li key={k} className="flex gap-1.5 text-[11.5px]" style={{ color: c.text }}>
                              <span style={{ color: c.label }}>•</span>
                              <span>{line.replace(/^[•\-*]\s*/, "")}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/50">
                          <span className="block h-full" style={{ width: `${card.progress || 60}%`, background: c.label }} />
                        </div>
                        <div className="mt-0.5 text-right text-[10.5px] font-semibold" style={{ color: c.label }}>{card.progress || 60}%</div>
                      </div>
                    </div>
                  );
                })()}

                {card.type === "image" && (
                  <div className={["relative overflow-hidden rounded-xl border bg-navy-800 shadow-md", isDragging || isEditing ? "border-gold" : "border-white/10"].join(" ")}
                    style={card.color ? { borderColor: `${card.color}88` } : undefined}>
                    <img src={card.image} alt="" draggable={false} className="w-full object-cover" style={{ height: (card.h || 160) - 34 }} />
                    <p className="px-2.5 py-2 text-xs font-medium text-offwhite">{tv(card.title, lang)}</p>
                    {isEditing && (
                      <div className="absolute inset-0 flex flex-col justify-start gap-1.5 overflow-y-auto bg-black/80 p-2 backdrop-blur-sm" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <input placeholder={t("vision.unsplash.search")} data-testid="vision-unsplash-query"
                            onKeyDown={(e) => e.key === "Enter" && doUnsplash(e.target.value)}
                            className="min-w-0 flex-1 rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-[11px] text-white outline-none placeholder:text-white/50" />
                          {unsplash.loading && <Loader2 size={13} className="animate-spin text-white" />}
                        </div>
                        {unsplash.results.length > 0 && (
                          <div className="grid grid-cols-3 gap-1">
                            {unsplash.results.map((im) => (
                              <button key={im.thumb} onClick={() => editImage(card.id, im.url)} data-testid="vision-unsplash-pick"
                                className="overflow-hidden rounded border border-white/10 hover:border-gold">
                                <img src={im.thumb} alt={im.alt} className="h-12 w-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                        <AiImageRow onPick={(url) => editImage(card.id, url)} />
                        <p className="text-[9px] text-white/60">{t("vision.unsplash.orUrl")}</p>
                        <input defaultValue={card.image} placeholder="https://…"
                          onKeyDown={(e) => e.key === "Enter" && editImage(card.id, e.target.value)} onBlur={(e) => e.target.value !== card.image && editImage(card.id, e.target.value)}
                          className="w-full rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-[11px] text-white outline-none placeholder:text-white/50" />
                      </div>
                    )}
                  </div>
                )}

                {card.type === "note" && (
                  <div className={["rounded-xl border bg-navy-800 p-3 shadow-md", isDragging || isEditing ? "border-gold" : card.important ? "border-gold/60" : "border-white/10"].join(" ")} style={{ minHeight: card.h }}>
                    <span className="mb-1.5 inline-block h-1.5 rounded-full" style={{ background: card.important ? "#DEC2A3" : card.color, width: card.important ? 36 : 32 }} />
                    <p className="text-xs font-semibold text-offwhite">{tv(card.title, lang)}</p>
                    {isEditing ? (
                      <textarea autoFocus defaultValue={tv(card.body, lang)} rows={3} onPointerDown={(e) => e.stopPropagation()}
                        onBlur={(e) => { editBody(card.id, e.target.value); setEditingId(null); }}
                        className="mt-1 w-full resize-none rounded-md border border-white/10 bg-white/5 p-1.5 text-xs text-offwhite outline-none" />
                    ) : (
                      <p className="mt-1 whitespace-pre-line text-xs text-offwhite/60">{tv(card.body, lang)}</p>
                    )}
                  </div>
                )}

                {card.type === "color" && (
                  <div className={["rounded-xl border bg-navy-800 p-3 shadow-md", isDragging ? "border-gold" : "border-white/10"].join(" ")}>
                    <p className="mb-2 text-xs font-semibold text-offwhite">{tv(card.title, lang)}</p>
                    <div className="flex gap-1.5">{(card.colors || []).map((col) => <span key={col} className="h-8 flex-1 rounded-md" style={{ background: col }} />)}</div>
                  </div>
                )}

                {card.type === "ai-doc" && (
                  <div className={["flex flex-col overflow-hidden rounded-xl border bg-navy-800 shadow-md", isDragging || isEditing ? "border-gold" : "border-white/10"].join(" ")} style={{ height: card.h }}>
                    <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-3 py-2" style={card.color ? { borderColor: `${card.color}55` } : undefined}>
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gold/15 text-gold" style={card.color ? { background: `${card.color}22`, color: card.color } : undefined}><FileText size={13} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-offwhite">{tv(card.title, lang)}</p>
                        <p className="text-[9px] uppercase tracking-wider text-offwhite/50">IA · {t(`vision.aiDoc.${AI_DOC_KEYS[card.docType] || "t1"}`)}</p>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2" onPointerDown={(e) => { if (isEditing) e.stopPropagation(); }} onWheel={(e) => e.stopPropagation()}>
                      {isEditing ? (
                        <textarea defaultValue={tv(card.body, lang)} onPointerDown={(e) => e.stopPropagation()} onBlur={(e) => { editBody(card.id, e.target.value); setEditingId(null); }}
                          className="h-full w-full resize-none bg-transparent text-[11.5px] leading-relaxed text-offwhite outline-none" />
                      ) : (
                        <p className="whitespace-pre-wrap text-[11.5px] leading-relaxed text-offwhite/90">{tv(card.body, lang)}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { STICKY_PALETTE, stickyOf, usesPaperPalette };
