import React from "react";
import { Pencil, Palette, Copy, Trash2, Lightbulb, StickyNote, Type, Image as ImageIcon, Link2 } from "lucide-react";

/**
 * Barre d'actions de la carte sélectionnée (ordinateur) : modifier, couleur, changer de forme,
 * dupliquer, envoyer vers les Idées, supprimer. Tout est aussi accessible aux poignées de la carte.
 */
const FORMES = [
  { id: "note", label: "Note", Icon: Type },
  { id: "sticky", label: "Post-it", Icon: StickyNote },
  { id: "polaroid", label: "Photo", Icon: ImageIcon },
  { id: "link", label: "Lien", Icon: Link2 },
];
export const FORMES_CONVERTIBLES = ["note", "sticky", "polaroid", "link"];

export function CardToolbar({ card, onEdit, onStyle, onConvert, onDuplicate, onIdee, onDelete }) {
  if (!card) return null;
  const convertible = FORMES_CONVERTIBLES.includes(card.type);
  const peutIdee = ["note", "sticky", "polaroid"].includes(card.type);
  const btn = "sf-btn shrink-0";
  return (
    <div className="sf-hide-present sf-chrome absolute left-1/2 top-3 z-30 flex max-w-[calc(100%-420px)] -translate-x-1/2 flex-wrap items-center gap-0.5 rounded-xl p-1" data-testid="vision-card-toolbar" onPointerDown={(e) => e.stopPropagation()}>
      {["note", "sticky", "polaroid", "link", "image", "table", "video", "kpi", "ai-doc"].includes(card.type) && (
        <button type="button" onClick={onEdit} className={btn} title="Modifier le contenu" data-testid="vision-toolbar-edit"><Pencil size={14} /> <span className="hidden xl:inline">Modifier</span></button>
      )}
      {card.type !== "live" && card.type !== "draw" && card.type !== "heading" && (
        <button type="button" onClick={onStyle} className={btn} title="Couleur et tags" data-testid="vision-toolbar-style"><Palette size={14} /> <span className="hidden xl:inline">Couleur</span></button>
      )}
      {convertible && (
        <>
          <span className="mx-1 h-5 w-px" style={{ background: "var(--sf-line)" }} />
          {FORMES.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => onConvert(id)} className={btn} title={`Transformer en ${label.toLowerCase()}`}
              data-testid={`vision-toolbar-forme-${id}`} style={card.type === id ? { color: "var(--sf-accent)" } : undefined}>
              <Icon size={14} /> <span className="hidden 2xl:inline">{label}</span>
            </button>
          ))}
        </>
      )}
      <span className="mx-1 h-5 w-px" style={{ background: "var(--sf-line)" }} />
      <button type="button" onClick={onDuplicate} className={btn} title="Dupliquer" data-testid="vision-toolbar-duplicate"><Copy size={14} /></button>
      {peutIdee && (
        <button type="button" onClick={onIdee} className={btn} title={card.ideeId ? "Déjà reliée à une idée du Plan d'action" : "Envoyer vers mes Idées (Plan d'action)"} data-testid="vision-toolbar-idee"
          style={card.ideeId ? { color: "var(--sf-accent)" } : undefined}><Lightbulb size={14} /> <span className="hidden xl:inline">{card.ideeId ? "Idée liée" : "→ Idées"}</span></button>
      )}
      <button type="button" onClick={onDelete} className={`${btn} hover:!text-red-400`} title="Supprimer" data-testid="vision-toolbar-delete"><Trash2 size={14} /></button>
    </div>
  );
}
