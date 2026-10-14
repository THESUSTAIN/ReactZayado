import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { PanneauCarte, ImageMur, MediaMur } from "@/zy/components/vision/BoardListe";
import { fetchBoard, saveBoard, supprimerFichier } from "@/zy/lib/kairosApi";
import { ArrowUp, ArrowDown, StickyNote, Link2, Image as ImageIcon, Quote, Loader2, Video, Music } from "lucide-react";

// ── Le mur d'inspiration d'Élan ────────────────────────────────────────────
// La grammaire de base, appliquée au mur : cartes navy bordées, pastilles,
// pilules de filtre, flèches pour l'ordre et panneau d'édition au tap —
// zéro glisser-déposer (la leçon de l'ancien canvas). Le mur vit dans les
// boards Vision sous la clé « elan », indépendante des boards Perso/Business.

const MASQUES = ["wall", "line", "draw", "live"]; // décoration de canvas : pas de place dans une grille

const TITRE_DE = (c) => c?.title?.fr || c?.label || c?.caption || c?.text || c?.titre
  || (c?.type === "link" ? (c?.url || "Lien") : "") || "Sans titre";

const TYPE_DE = (c) => {
  if (c?.type === "image" || c?.type === "polaroid") return { nom: "Photo", icone: ImageIcon, pastille: "border-gold/40 bg-gold/10 text-gold" };
  if (c?.type === "video") return { nom: "Vidéo", icone: Video, pastille: "border-white/25 bg-white/10 text-offwhite/80" };
  if (c?.type === "audio") return { nom: "Audio", icone: Music, pastille: "border-emerald-400/40 bg-emerald-400/15 text-emerald-300" };
  if (c?.type === "link") return { nom: "Lien", icone: Link2, pastille: "border-sky-400/40 bg-sky-400/15 text-sky-300" };
  if (c?.type === "sticky") return { nom: "Post-it", icone: StickyNote, pastille: "border-violet-400/40 bg-violet-400/15 text-violet-300" };
  if (c?.type === "citation") return { nom: "Citation", icone: Quote, pastille: "border-gold/40 bg-gold/10 text-gold" };
  return { nom: "Note", icone: StickyNote, pastille: "border-blue-400/40 bg-blue-400/15 text-blue-300" };
};

const FILTRES = [["tout", "Tout"], ["image", "📷 Photos"], ["video", "🎬 Vidéos"], ["audio", "🎧 Audio"], ["link", "🔗 Liens"], ["citation", "❝ Citations"], ["note", "✎ Notes"]];

export function ElanMur() {
  const [cards, setCards] = useState(null);
  const [filtre, setFiltre] = useState("tout");
  const [saving, setSaving] = useState(false);
  const [edition, setEdition] = useState(null);
  const [ajout, setAjout] = useState(false);

  useEffect(() => {
    fetchBoard("elan").then((d) => setCards(Array.isArray(d) ? d : d?.cards || [])).catch(() => setCards([]));
  }, []);

  const persister = async (nouvelles) => {
    setCards(nouvelles);
    setSaving(true);
    try { await saveBoard(nouvelles, "elan"); } catch { toast.error("Sauvegarde impossible — vérifie ta connexion."); }
    finally { setSaving(false); }
  };
  const deplacer = (i, sens) => {
    const j = i + sens;
    if (j < 0 || j >= cards.length) return;
    const copie = [...cards];
    [copie[i], copie[j]] = [copie[j], copie[i]];
    persister(copie);
  };
  const enregistrer = (carte) => {
    const existe = cards.some((c) => c.id === carte.id);
    persister(existe ? cards.map((c) => (c.id === carte.id ? carte : c)) : [...cards, carte]);
    setEdition(null); setAjout(false);
    toast.success("Carte enregistrée.");
  };
  const supprimer = (carte) => {
    if (!window.confirm("Retirer cette pièce du mur ?")) return;
    // La photo / vidéo / audio téléversés ne doivent pas rester orphelins dans le stockage.
    const chemin = carte?.image || carte?.media;
    if (chemin && !chemin.startsWith("http")) supprimerFichier(chemin).catch(() => { /* soft-delete raté : sans gravité */ });
    persister(cards.filter((c) => c.id !== carte.id));
    setEdition(null); setAjout(false);
  };

  const visibles = (cards || []).filter((c) => !MASQUES.includes(c.type))
    .filter((c) => filtre === "tout"
      || (filtre === "image" && (c.type === "image" || c.type === "polaroid"))
      || c.type === filtre);

  return (
    <div className="space-y-5" data-testid="elan-mur">
      <div className="flex flex-wrap items-center gap-2" data-testid="elan-mur-filtres">
        {FILTRES.map(([k, l]) => (
          <button key={k} onClick={() => setFiltre(k)} data-testid={`elan-mur-filtre-${k}`}
            className={`rounded-xl border px-3.5 py-2 text-[12.5px] font-semibold transition ${filtre === k ? "border-transparent bg-gold text-navy-900" : "border-white/12 bg-white/[0.05] text-offwhite/65 hover:bg-white/10"}`}>
            {l}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-3">
          {saving && <span className="flex items-center gap-1.5 text-[12px] text-offwhite/45"><Loader2 size={12} className="animate-spin" /> sauvegarde…</span>}
          <button onClick={() => setAjout(true)} data-testid="elan-mur-ajouter" className="btn-gold !px-4 !py-2 !text-[12.5px]">＋ Ajouter sur le mur</button>
        </span>
      </div>

      {cards === null ? (
        <div className="flex h-40 items-center justify-center text-sm text-offwhite/50">Le mur se prépare…</div>
      ) : visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gold/30 p-8 text-center" data-testid="elan-mur-vide">
          <p className="text-sm text-offwhite/60">Le mur est vide. Pose ce qui te fait tenir : une photo, une citation, une vidéo, un lien.</p>
          <button onClick={() => setAjout(true)} className="btn-gold mt-4 !px-4 !py-2 !text-[12.5px]">Ajouter la première pièce</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((c, i) => {
            const T = TYPE_DE(c);
            return (
              <div key={c.id || i} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] transition hover:border-gold/40 md:rounded-3xl" data-testid={`elan-mur-carte-${c.id || i}`}>
                {c.type === "video" ? (
                  <MediaMur chemin={c.media} kind="video" className="h-44 w-full bg-black/40 object-contain" />
                ) : c.type === "audio" ? (
                  <div className="border-b border-white/[0.06] bg-gradient-to-br from-[#2C4272] to-[#1B2C52] px-4 py-5">
                    <MediaMur chemin={c.media} kind="audio" className="w-full" />
                  </div>
                ) : c.type === "image" || c.type === "polaroid" ? (
                  <ImageMur chemin={c.image} alt={TITRE_DE(c)} className="h-40 w-full object-cover" />
                ) : c.type === "link" ? (
                  <div className="grid h-28 place-items-center border-b border-white/[0.06] bg-gradient-to-br from-[#2C4272] to-[#1B2C52] text-3xl" aria-hidden>🔗</div>
                ) : null}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-bold text-offwhite/95">{TITRE_DE(c)}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-offwhite/45">
                        <T.icone size={11} /> {T.nom}
                      </p>
                    </div>
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${T.pastille}`} aria-hidden><T.icone size={14} /></span>
                  </div>
                  {(c.body?.fr || c.text) && c.type !== "citation" && c.type !== "sticky" && (
                    <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-offwhite/60">{c.body?.fr || c.text}</p>
                  )}
                  {(c.type === "citation" || c.type === "sticky") && (c.body?.fr || c.text) && (
                    <p className="mt-2 border-l-2 border-gold/40 pl-3 text-[12.5px] italic leading-relaxed text-offwhite/70">{c.body?.fr || c.text}</p>
                  )}
                  {c.type === "link" && c.url && (
                    <a href={c.url} target="_blank" rel="noreferrer" className="mt-2 block truncate text-[12px] font-semibold text-sky-300 hover:underline">{c.url}</a>
                  )}
                  <div className="mt-3 flex items-center gap-1.5">
                    <button onClick={() => deplacer(i, -1)} disabled={i === 0} title="Monter" data-testid={`elan-mur-up-${c.id || i}`}
                      className="rounded-lg border border-white/12 p-2 text-offwhite/55 transition hover:border-gold/40 hover:text-gold disabled:opacity-25" aria-label="Monter"><ArrowUp size={14} /></button>
                    <button onClick={() => deplacer(i, 1)} disabled={i === visibles.length - 1} title="Descendre" data-testid={`elan-mur-down-${c.id || i}`}
                      className="rounded-lg border border-white/12 p-2 text-offwhite/55 transition hover:border-gold/40 hover:text-gold disabled:opacity-25" aria-label="Descendre"><ArrowDown size={14} /></button>
                    <button onClick={() => setEdition(c)} title="Modifier" data-testid={`elan-mur-edit-${c.id || i}`}
                      className="ml-auto rounded-lg border border-white/12 p-2 text-offwhite/55 transition hover:border-gold/40 hover:text-gold" aria-label="Modifier"><StickyNote size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(edition || ajout) && (
        <PanneauCarte
          carte={ajout ? { id: `c${Date.now()}`, type: "citation", w: 420, title: { fr: "", en: "" }, body: { fr: "", en: "" } } : edition}
          nouveau={!!ajout}
          onClose={() => { setEdition(null); setAjout(false); }}
          onSave={enregistrer}
          onDelete={supprimer}
        />
      )}
    </div>
  );
}
