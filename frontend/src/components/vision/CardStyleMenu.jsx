import React, { useEffect, useRef, useState } from "react";
import { Palette, Check, Flame, Leaf } from "lucide-react";
import { useI18n } from "@/i18n";

/* Palettes papier (sticky / kpi / polaroid) */
export const STICKY_PALETTE = {
  cream:  { bg: "#fdf4d3", text: "#3f2b04", label: "#7a5a12" },
  pink:   { bg: "#ffd9d9", text: "#4a1a1a", label: "#8f2b2b" },
  green:  { bg: "#d7f2df", text: "#0f3f22", label: "#256b3d" },
  mint:   { bg: "#e5f5e6", text: "#0f3f22", label: "#256b3d" },
  orange: { bg: "#ffe1c9", text: "#4a2405", label: "#8a4a12" },
  blue:   { bg: "#d7e6f5", text: "#0f2547", label: "#1e468b" },
  navy:   { bg: "#cbd9f0", text: "#102945", label: "#1a3a6e" },
  yellow: { bg: "#fef3c7", text: "#3f2b04", label: "#7a5a12" },
  slate:  { bg: "#dde3ea", text: "#17222f", label: "#3f5468" },
  coral:  { bg: "#ffdfd3", text: "#4a1d0d", label: "#9c3d1b" },
  sky:    { bg: "#d4eefb", text: "#0b2b3a", label: "#1b6684" },
  sand:   { bg: "#F1E2CC", text: "#3a2a14", label: "#8a6a35" },
};
export const STICKY_KEYS = Object.keys(STICKY_PALETTE);
export const stickyOf = (name) => STICKY_PALETTE[name] || STICKY_PALETTE.cream;

/* Palette hex (note / ai-doc / image) */
export const HEX_PALETTE = [
  "#DEC2A3", "#4a6a9e", "#2FB89A", "#1a3a6e", "#E4A33A",
  "#D6604D", "#3FA7D6", "#7BA05B", "#C56B8E", "#8A8F98",
];

/* Tags produit — les deux polarités du cockpit Zayado */
export const CARD_TAGS = [
  { id: "elan", Icon: Flame, color: "#E4A33A", bg: "rgba(228,163,58,0.16)" },
  { id: "refuge", Icon: Leaf, color: "#2FB89A", bg: "rgba(47,184,154,0.16)" },
];

/** Renvoie true si la carte utilise la palette papier plutôt qu'une couleur hex. */
export const usesPaperPalette = (type) => ["sticky", "kpi", "polaroid"].includes(type);

/**
 * Menu contextuel par carte : couleur + tags Élan / Refuge.
 * Rendu en absolu au-dessus de la carte ; ne se ferme pas au drag.
 */
export function CardStyleMenu({ card, onChange, onClose }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const [custom, setCustom] = useState(card.color || "#DEC2A3");
  const paper = usesPaperPalette(card.type);
  const tags = Array.isArray(card.tags) ? card.tags : [];

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose?.(); };
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onEsc); };
  }, [onClose]);

  const pickPaper = (key) => onChange({ stickyColor: key });
  const pickHex = (hex) => onChange({ color: hex });
  const toggleTag = (id) =>
    onChange({ tags: tags.includes(id) ? tags.filter((x) => x !== id) : [...tags, id] });

  return (
    <div
      ref={ref}
      data-testid={`vision-card-style-${card.id}`}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className="absolute left-0 top-full z-[60] mt-2 w-[228px] rounded-xl fenetre p-3"
      style={{ transform: `rotate(${-(card.rotate || 0)}deg)`, transformOrigin: "top left" }}
    >
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gold">
        {t("vision.color.title")}
      </p>

      {paper ? (
        <div className="grid grid-cols-6 gap-1.5">
          {STICKY_KEYS.map((key) => {
            const c = STICKY_PALETTE[key];
            const active = (card.stickyColor || "cream") === key;
            return (
              <button
                key={key}
                onClick={() => pickPaper(key)}
                title={t(`vision.color.${key}`)}
                data-testid={`vision-color-${key}`}
                className={`relative flex h-7 w-7 items-center justify-center rounded-md border transition ${
                  active ? "border-gold ring-1 ring-gold/60" : "border-white/15 hover:border-white/40"
                }`}
                style={{ background: c.bg }}
              >
                {active && <Check size={12} style={{ color: c.label }} />}
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-1.5">
            {HEX_PALETTE.map((hex) => {
              const active = (card.color || "").toLowerCase() === hex.toLowerCase();
              return (
                <button
                  key={hex}
                  onClick={() => pickHex(hex)}
                  data-testid={`vision-color-${hex.replace("#", "")}`}
                  className={`relative flex h-7 w-7 items-center justify-center rounded-md border transition ${
                    active ? "border-gold ring-1 ring-gold/60" : "border-white/15 hover:border-white/40"
                  }`}
                  style={{ background: hex }}
                >
                  {active && <Check size={12} className="text-navy-900" />}
                </button>
              );
            })}
          </div>
          <label className="mt-2 flex items-center gap-2 text-[10.5px] text-offwhite/60">
            <input
              type="color"
              value={custom}
              onChange={(e) => { setCustom(e.target.value); pickHex(e.target.value); }}
              data-testid="vision-color-custom"
              className="h-6 w-8 cursor-pointer rounded border border-white/15 bg-transparent p-0"
            />
            {t("vision.color.custom")}
          </label>
        </>
      )}

      <div className="mt-3 border-t border-white/10 pt-2.5">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gold">
          {t("vision.tags.title")}
        </p>
        <div className="flex gap-1.5">
          {CARD_TAGS.map(({ id, Icon, color, bg }) => {
            const active = tags.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggleTag(id)}
                title={t(`vision.tags.${id}Hint`)}
                data-testid={`vision-tag-${id}`}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
                  active ? "border-transparent" : "border-white/12 text-offwhite/55 hover:border-white/30"
                }`}
                style={active ? { background: bg, color, borderColor: `${color}66` } : undefined}
              >
                <Icon size={12} /> {t(`vision.tags.${id}`)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Pastilles de tags affichées en permanence sur la carte. */
export function CardTagBadges({ tags }) {
  const { t } = useI18n();
  const list = (Array.isArray(tags) ? tags : []).map((id) => CARD_TAGS.find((x) => x.id === id)).filter(Boolean);
  if (!list.length) return null;
  return (
    <div className="pointer-events-none absolute -left-1.5 -top-2.5 z-30 flex gap-1">
      {list.map(({ id, Icon, color, bg }) => (
        <span
          key={id}
          data-testid={`vision-card-tag-${id}`}
          title={t(`vision.tags.${id}`)}
          className="flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-md"
          style={{ background: bg, color, borderColor: `${color}55`, backdropFilter: "blur(4px)" }}
        >
          <Icon size={9} /> {t(`vision.tags.${id}`)}
        </span>
      ))}
    </div>
  );
}

/** Barre de filtre Tous / Élan / Refuge / Sans tag. */
export function TagFilterBar({ value, onChange, counts = {} }) {
  const { t } = useI18n();
  const opts = [
    { id: "all", label: t("vision.tags.all") },
    ...CARD_TAGS.map(({ id, Icon, color }) => ({ id, label: t(`vision.tags.${id}`), Icon, color })),
    { id: "none", label: t("vision.tags.none") },
  ];
  return (
    <div className="flex items-center gap-1 rounded-xl fenetre p-1" data-testid="vision-tag-filter">
      {opts.map((o) => {
        const active = value === o.id;
        const n = counts[o.id];
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            data-testid={`vision-filter-${o.id}`}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
              active ? "bg-gold/20 text-gold" : "text-offwhite/60 hover:bg-white/10"
            }`}
          >
            {o.Icon && <o.Icon size={11} style={active ? undefined : { color: o.color }} />}
            {o.label}
            {typeof n === "number" && <span className="opacity-60">{n}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default CardStyleMenu;
