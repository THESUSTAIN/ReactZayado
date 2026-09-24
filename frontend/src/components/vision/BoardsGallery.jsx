import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Sparkles, Loader2, X, LayoutGrid } from "lucide-react";
import { fetchBoards, createBoard } from "@/lib/kairosApi";

// Galerie « Mes boards » façon Storyflow : chaque board est montré par une
// vraie miniature de son contenu (murs, notes, images à leur place), jamais
// par une photo décorative.

function ilYa(iso) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  const j = Math.round(s / 86400);
  if (j < 30) return `il y a ${j} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function BoardPreview({ items = [], className = "" }) {
  const vb = useMemo(() => {
    if (!items.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    items.forEach((i) => { x0 = Math.min(x0, i.x); y0 = Math.min(y0, i.y); x1 = Math.max(x1, i.x + i.w); y1 = Math.max(y1, i.y + i.h); });
    const pad = Math.max(60, (x1 - x0) * 0.06);
    let w = x1 - x0 + pad * 2, h = y1 - y0 + pad * 2;
    // cadre 16/10 : on élargit le côté trop court pour centrer le contenu
    const ratio = 1.6;
    let ox = x0 - pad, oy = y0 - pad;
    if (w / h > ratio) { const nh = w / ratio; oy -= (nh - h) / 2; h = nh; } else { const nw = h * ratio; ox -= (nw - w) / 2; w = nw; }
    return { ox, oy, w, h };
  }, [items]);

  return (
    <div className={`relative aspect-[16/10] overflow-hidden rounded-xl bg-[#0c1631] ${className}`}
      style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)", backgroundSize: "14px 14px" }}>
      {!vb ? (
        <div className="absolute inset-3 flex items-center justify-center rounded-lg border border-dashed border-white/15 text-[12px] text-offwhite/40">Board vide</div>
      ) : (
        <svg viewBox={`${vb.ox} ${vb.oy} ${vb.w} ${vb.h}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
          <defs>
            {items.map((i, k) => i.img && (
              <clipPath key={k} id={`cp-${k}-${Math.round(i.x)}`}><rect x={i.x + 10} y={i.y + (i.t === "wall" ? 60 : 10)} width={i.w - 20} height={Math.min(i.h - 20, 260)} rx="14" /></clipPath>
            ))}
          </defs>
          {items.map((i, k) => {
            if (i.t === "wall") {
              const c = i.c || "#DEC2A3";
              return (
                <g key={k}>
                  <rect x={i.x} y={i.y} width={i.w} height={i.h} rx="22" fill="rgba(255,255,255,0.045)" stroke={c} strokeOpacity="0.55" strokeWidth="4" />
                  <rect x={i.x + 24} y={i.y + 22} width={Math.min(i.w * 0.55, 260)} height="18" rx="9" fill={c} fillOpacity="0.8" />
                  {i.img ? (
                    <image href={i.img} x={i.x + 10} y={i.y + 60} width={i.w - 20} height={Math.min(i.h - 20, 260)} preserveAspectRatio="xMidYMid slice" clipPath={`url(#cp-${k}-${Math.round(i.x)})`} />
                  ) : null}
                  {Array.from({ length: Math.max(0, Math.round((i.h - 90) / 170)) }).map((_, n) => (
                    (!i.img || n > 0) && <rect key={n} x={i.x + 24} y={i.y + 70 + n * 170} width={i.w - 48} height="140" rx="16" fill="rgba(255,255,255,0.10)" />
                  ))}
                </g>
              );
            }
            if (i.t === "heading") return <rect key={k} x={i.x} y={i.y + 14} width={Math.min(i.w, 700)} height="30" rx="15" fill="rgba(245,241,234,0.55)" />;
            if (i.img) return <image key={k} href={i.img} x={i.x} y={i.y} width={i.w} height={i.h} preserveAspectRatio="xMidYMid slice" clipPath={`url(#cp-${k}-${Math.round(i.x)})`} />;
            const fond = i.t === "sticky" || i.t === "kpi" ? "rgba(241,226,204,0.85)" : i.t === "image" || i.t === "polaroid" ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.12)";
            return <rect key={k} x={i.x} y={i.y} width={i.w} height={i.h} rx="16" fill={fond} />;
          })}
        </svg>
      )}
    </div>
  );
}

function NouveauBoard({ onClose, onCree }) {
  const [nom, setNom] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const creer = async (e) => {
    e.preventDefault();
    if (nom.trim().length < 2) return;
    setEnvoi(true);
    try {
      const r = await createBoard({ nom: nom.trim().slice(0, 60), emoji: "🧭" });
      onCree({ key: r.key || r.board?.key });
    } catch { toast.error("Création impossible (12 boards maximum)."); setEnvoi(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#060a18]/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <form onSubmit={creer} onClick={(e) => e.stopPropagation()} className="fenetre w-full max-w-md rounded-t-3xl p-6 sm:rounded-3xl" data-testid="vision-nouveau-board">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-xl font-semibold">Nouveau board</p>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-offwhite/60 hover:bg-white/10" aria-label="Fermer"><X size={18} /></button>
        </div>
        <label className="mb-1.5 block text-[12px] text-offwhite/65">Nom du board</label>
        <input autoFocus value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Année 2027, Lancement offre, Maison…"
          className="h-11 w-full rounded-xl border border-white/[0.14] bg-white/[0.08] px-3.5 text-sm text-offwhite outline-none placeholder:text-offwhite/40 focus:border-gold/60" data-testid="vision-nouveau-nom" />
        <button disabled={envoi || nom.trim().length < 2} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] text-sm font-semibold text-navy-900 disabled:opacity-50" data-testid="vision-nouveau-creer">
          {envoi ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Créer et ouvrir
        </button>
      </form>
    </div>
  );
}

export function BoardsGallery({ onOpenBoard, onGenerate }) {
  const [boards, setBoards] = useState(null);
  const [nouveau, setNouveau] = useState(false);
  useEffect(() => { fetchBoards().then((d) => setBoards(d.boards || [])).catch(() => setBoards([])); }, []);

  return (
    <section className="mb-10" data-testid="vision-mes-boards">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-2 font-ui text-[13px] font-semibold text-offwhite/85"><LayoutGrid size={15} className="text-gold" /> Mes boards</h3>
        <div className="ml-auto flex gap-2">
          <button onClick={onGenerate} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/25 bg-white/[0.06] px-3.5 text-[12.5px] font-medium text-offwhite hover:bg-white/10" data-testid="vision-generer">
            <Sparkles size={14} className="text-gold" /> Générer avec l'IA
          </button>
          <button onClick={() => setNouveau(true)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-4 text-[12.5px] font-semibold text-navy-900" data-testid="vision-nouveau">
            <Plus size={15} /> Nouveau board
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {boards === null && [0, 1, 2].map((i) => <div key={i} className="aspect-[16/12] animate-pulse rounded-2xl bg-white/[0.05]" />)}
        {boards?.map((b) => (
          <button key={b.key} onClick={() => onOpenBoard(b)} className="group min-w-0 rounded-2xl border border-white/[0.14] bg-white/[0.06] p-2 text-left sm:p-2.5 transition hover:-translate-y-0.5 hover:border-gold/45 hover:bg-white/[0.09]" data-testid={`vision-board-${b.key}`}>
            <BoardPreview items={b.apercu || []} />
            <div className="px-1 pb-1 pt-2.5 sm:px-1.5 sm:pt-3">
              <p className="truncate text-[14px] font-semibold text-offwhite sm:text-[15px]">{b.nom}</p>
              <p className="mt-0.5 truncate text-[11.5px] text-offwhite/55 sm:text-[12px]">
                {b.count ? `${b.count} élément${b.count > 1 ? "s" : ""}` : "Vide"}{b.updated_at ? ` · modifié ${ilYa(b.updated_at)}` : ""}
              </p>
            </div>
          </button>
        ))}
        {boards && (
          <button onClick={() => setNouveau(true)} className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 text-[13px] text-offwhite/55 transition hover:border-gold/50 hover:text-gold sm:min-h-[200px]" data-testid="vision-nouveau-tuile">
            <Plus size={22} /> Nouveau board
          </button>
        )}
      </div>
      {nouveau && <NouveauBoard onClose={() => setNouveau(false)} onCree={(b) => { setNouveau(false); onOpenBoard(b); }} />}
    </section>
  );
}
