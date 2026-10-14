import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus, ArrowUp, ArrowDown, Trash2, X, Image as ImageIcon, StickyNote,
  Link2, Type, Table2, Video, Star, Loader2, Heading1, Quote, Music,
} from "lucide-react";
import { fetchBoard, saveBoard, fetchBoardPartage, saveBoardPartage, televerserFichier, supprimerFichier, getToken, API_BASE_URL } from "@/zy/lib/kairosApi";
import { BoardSwitcher } from "@/zy/components/vision/BoardSwitcher";

// Pièce du mur : soit une URL publique, soit un fichier téléversé qu'on
// récupère en blob authentifié (une balise <img>/<video>/<audio> ne sait pas
// envoyer d'en-tête). Hook partagé par les photos, vidéos et audios.
export function useBlobMedia(chemin) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (!chemin || chemin.startsWith("http")) return;
    let url = null;
    let vivant = true;
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/files/${chemin}`, { headers: { Authorization: `Bearer ${getToken()}` } });
        if (!r.ok) return;
        url = URL.createObjectURL(await r.blob());
        if (vivant) setSrc(url);
      } catch { /* média manquant : le placeholder reste */ }
    })();
    return () => { vivant = false; if (url) URL.revokeObjectURL(url); };
  }, [chemin]);
  return src;
}

export function ImageMur({ chemin, alt, className }) {
  const src = useBlobMedia(chemin);
  const placeh = `${className || ""} grid place-items-center bg-white/[0.05] text-offwhite/25`;
  if (!chemin) return <div className={placeh} aria-hidden><ImageIcon size={22} /></div>;
  if (chemin.startsWith("http")) return <img src={chemin} alt={alt || ""} className={className} loading="lazy" />;
  return src ? <img src={src} alt={alt || ""} className={className} />
    : <div className={placeh} aria-hidden><ImageIcon size={22} /></div>;
}

// Vidéo / audio du mur : même récupération authentifiée, lecteurs natifs.
export function MediaMur({ chemin, kind = "video", className }) {
  const src = useBlobMedia(chemin);
  if (!chemin) return null;
  const reel = chemin.startsWith("http") ? chemin : src;
  if (kind === "audio") {
    return reel ? <audio src={reel} controls preload="metadata" className={className} /> : null;
  }
  return reel ? <video src={reel} controls preload="metadata" playsInline className={className} /> : null;
}

// ── Board en liste (modèle « Vision claire ») ──────────────────────────────
// L'ancien canvas façon Storyflow exigeait un glisser-déposer impossible au
// doigt. Ici : des rangées, des flèches ↑↓ pour l'ordre, un tap pour éditer.
// Les murs, lignes et dessins du canvas sont de la décoration sans texte —
// ils n'ont pas de place dans une liste et sont masqués.

const TYPES = {
  note:     { icone: StickyNote, nom: "Note",    pastille: "border-blue-400/40 bg-blue-400/15 text-blue-300" },
  sticky:   { icone: Star,       nom: "Post-it", pastille: "border-violet-400/40 bg-violet-400/15 text-violet-300" },
  image:    { icone: ImageIcon,  nom: "Photo",   pastille: "border-gold/40 bg-gold/10 text-gold" },
  polaroid: { icone: ImageIcon,  nom: "Photo",   pastille: "border-gold/40 bg-gold/10 text-gold" },
  link:     { icone: Link2,      nom: "Lien",    pastille: "border-sky-400/40 bg-sky-400/15 text-sky-300" },
  heading:  { icone: Heading1,   nom: "Titre",   pastille: "border-white/25 bg-white/10 text-offwhite/80" },
  table:    { icone: Table2,     nom: "Tableau", pastille: "border-white/25 bg-white/10 text-offwhite/80" },
  video:    { icone: Video,      nom: "Vidéo",   pastille: "border-white/25 bg-white/10 text-offwhite/80" },
};

const titreDe = (c) => c?.title?.fr || c?.label || c?.caption || c?.text || c?.titre
  || (c?.type === "link" ? (c?.url || "Lien") : "") || "Sans titre";
const detailDe = (c) => c?.body?.fr || c?.caption || "";
const visible = (c) => TYPES[c?.type];

export function BoardListe({ board = "perso", partage = false, owner, onSwitch }) {
  const [cards, setCards] = useState(null);
  const [saving, setSaving] = useState(false);
  const [edition, setEdition] = useState(null); // carte en cours d'édition
  const [ajout, setAjout] = useState(false);

  useEffect(() => {
    setCards(null);
    (partage ? fetchBoardPartage(board, owner) : fetchBoard(board))
      .then((d) => setCards(Array.isArray(d) ? d : d?.cards || []))
      .catch(() => setCards([]));
  }, [board, partage, owner]);

  const persister = async (nouvelles) => {
    setCards(nouvelles);
    setSaving(true);
    try {
      if (partage) await saveBoardPartage(nouvelles, board, owner);
      else await saveBoard(nouvelles, board);
    } catch { toast.error("Sauvegarde impossible — vérifie ta connexion."); }
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
    setEdition(null);
    toast.success("Carte enregistrée.");
  };

  const supprimer = (carte) => {
    if (!window.confirm("Supprimer cette carte du board ?")) return;
    // Photo / audio / vidéo téléversés : soft-delete du fichier pour éviter les orphelins.
    const chemin = carte?.image || carte?.media;
    if (chemin && !chemin.startsWith("http")) supprimerFichier(chemin).catch(() => { /* sans gravité */ });
    persister(cards.filter((c) => c.id !== carte.id));
    setEdition(null);
  };

  const carteVisible = cards ? cards.filter(visible) : [];
  const lectureSeule = partage && !owner;

  return (
    <div className="space-y-5" data-testid="vision-board-liste">
      <div className="flex flex-wrap items-center gap-3">
        {!partage && <BoardSwitcher current={board} onSwitch={(k) => onSwitch?.(k)} />}
        {saving && <span className="flex items-center gap-1.5 text-[12px] text-offwhite/45"><Loader2 size={12} className="animate-spin" /> sauvegarde…</span>}
        {!partage && (
          <button onClick={() => setAjout(true)} data-testid="vision-carte-ajouter" className="btn-gold ml-auto !px-4 !py-2 !text-[12.5px]">
            <Plus size={14} /> Nouvelle carte
          </button>
        )}
      </div>

      {lectureSeule && (
        <p className="rounded-xl border border-sky-500/25 bg-sky-500/[0.05] px-4 py-3 text-[13px] text-offwhite/70">
          Board partagé — tu le consultes sans pouvoir le modifier.
        </p>
      )}

      {cards === null ? (
        <div className="flex h-40 items-center justify-center text-sm text-offwhite/50">Chargement du board…</div>
      ) : carteVisible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gold/30 p-8 text-center" data-testid="vision-board-vide">
          <p className="text-sm text-offwhite/60">Ton board est vide. Ajoute ta première carte — une note, un lien, une intention.</p>
          {!partage && <button onClick={() => setAjout(true)} className="btn-gold mt-4 !px-4 !py-2 !text-[12.5px]">Ajouter une carte</button>}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 sm:p-5 md:rounded-3xl" data-testid="vision-cartes">
          <div className="space-y-2">
            {carteVisible.map((c, i) => {
              const T = TYPES[c.type];
              const Ic = T.icone;
              const img = c.image || (c.type === "polaroid" ? c.image : null);
              return (
                <div key={c.id || i} className="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.05] p-3 transition hover:border-gold/30" data-testid={`vision-carte-${c.id || i}`}>
                  {img ? (
                    <img src={img} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-white/10 object-cover" />
                  ) : (
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${T.pastille}`} aria-hidden><Ic size={16} /></span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-offwhite/95">{titreDe(c)}</p>
                    <p className="truncate text-[12px] text-offwhite/45">{T.nom}{detailDe(c) ? ` · ${detailDe(c)}` : ""}</p>
                  </div>
                  {!lectureSeule && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button onClick={() => deplacer(i, -1)} disabled={i === 0} title="Monter" data-testid={`vision-carte-up-${c.id || i}`}
                        className="rounded-lg border border-white/12 p-1.5 text-offwhite/55 transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-25">
                        <ArrowUp size={13} />
                      </button>
                      <button onClick={() => deplacer(i, 1)} disabled={i === carteVisible.length - 1} title="Descendre" data-testid={`vision-carte-down-${c.id || i}`}
                        className="rounded-lg border border-white/12 p-1.5 text-offwhite/55 transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-25">
                        <ArrowDown size={13} />
                      </button>
                      <button onClick={() => setEdition(c)} title="Modifier" data-testid={`vision-carte-edit-${c.id || i}`}
                        className="rounded-lg border border-white/12 p-1.5 text-offwhite/55 transition-colors hover:border-gold/40 hover:text-gold">
                        <StickyNote size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(edition || ajout) && (
        <PanneauCarte
          carte={ajout ? { id: `c${Date.now()}`, type: "note", w: 420, title: { fr: "", en: "" }, body: { fr: "", en: "" } } : edition}
          nouveau={!!ajout}
          onClose={() => { setEdition(null); setAjout(false); }}
          onSave={enregistrer}
          onDelete={supprimer}
        />
      )}
    </div>
  );
}

// Panneau d'édition au tap — remplace les 10 outils du canvas : un type,
// un titre, un texte. Le même panneau sur mobile et sur PC. Exporté pour
// le mur d'Élan (même geste, mêmes types + citation).
export function PanneauCarte({ carte, nouveau, onClose, onSave, onDelete }) {
  const [type, setType] = useState(carte.type || "note");
  const [titre, setTitre] = useState(carte.title?.fr || "");
  const [texte, setTexte] = useState(carte.body?.fr || "");
  const [lien, setLien] = useState(carte.url || "");
  const [image, setImage] = useState(carte.image || null);
  const [media, setMedia] = useState(carte.media || null);
  const [envoiPhoto, setEnvoiPhoto] = useState(false);
  const [envoiMedia, setEnvoiMedia] = useState(false);

  const enregistrer = () => {
    const t = titre.trim();
    if (type === "link" && !lien.trim()) { toast.error("Ajoute l'adresse du lien."); return; }
    if (type === "image" && !image) { toast.error("Ajoute une photo depuis ton téléphone, ou une adresse."); return; }
    if ((type === "video" || type === "audio") && !media) { toast.error("Ajoute un fichier depuis ton téléphone."); return; }
    if (type !== "link" && type !== "image" && type !== "video" && type !== "audio" && !t && !texte.trim()) { toast.error("Écris au moins un titre ou un texte."); return; }
    const base = nouveau ? { ...carte, type } : { ...carte, type };
    base.title = { fr: t, en: t };
    base.body = { fr: texte, en: texte };
    if (type === "link") { base.url = lien.trim(); base.titre = t; }
    if (type === "image") base.image = image; else base.image = null;
    if (type === "video" || type === "audio") base.media = media; else base.media = null;
    onSave(base);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose} data-testid="vision-panneau">
      <div className="w-full max-w-lg rounded-t-2xl border border-white/12 bg-[#12224a] p-5 shadow-2xl sm:rounded-2xl md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-base font-semibold text-offwhite">{nouveau ? "Nouvelle carte" : "Modifier la carte"}</p>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg border border-white/12 p-1.5 text-offwhite/60 hover:text-offwhite"><X size={15} /></button>
        </div>

        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/50">Type de carte</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[["note", StickyNote, "Note"], ["sticky", Star, "Post-it"], ["citation", Quote, "Citation"], ["link", Link2, "Lien"], ["image", ImageIcon, "Photo"], ["video", Video, "Vidéo"], ["audio", Music, "Audio"], ["heading", Type, "Titre"]].map(([k, Ic, nom]) => (
            <button key={k} onClick={() => setType(k)} data-testid={`vision-type-${k}`}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition ${type === k ? "border-gold/60 bg-gold/15 text-gold" : "border-white/12 bg-white/[0.05] text-offwhite/65 hover:bg-white/10"}`}>
              <Ic size={12} /> {nom}
            </button>
          ))}
        </div>

        {type === "image" ? (
          <>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/50">Ta photo (appareil ou galerie)</p>
            <label className="mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/12 bg-white/[0.06] px-3.5 py-3 text-[13px] text-offwhite/70 hover:border-gold/40">
              <span className="flex items-center gap-2"><ImageIcon size={15} className="text-gold" /> {envoiPhoto ? "Envoi en cours…" : (image ? "Photo choisie — changer" : "Choisir depuis le téléphone")}</span>
              {envoiPhoto && <Loader2 size={15} className="animate-spin text-gold" />}
              <input type="file" accept="image/*" className="hidden" data-testid="vision-panneau-photo-input"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setEnvoiPhoto(true);
                  try {
                    const r = await televerserFichier(f);
                    setImage(r.path);
                    toast.success("Photo ajoutée.");
                  } catch (err) { toast.error(err.detail || "Envoi impossible pour le moment."); }
                  setEnvoiPhoto(false);
                }} />
            </label>
            {image && <div className="mt-3 overflow-hidden rounded-xl border border-white/10"><ImageMur chemin={image} className="h-36 w-full object-cover" /></div>}
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/50">…ou par adresse</p>
            <input value={image && image.startsWith("http") ? image : (image || "")} onChange={(e) => setImage(e.target.value)} placeholder="https://…" data-testid="vision-panneau-image-url"
              className={`${CHAMP_CLAIR} mt-2`} />
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/50">Légende (optionnel)</p>
            <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. : mon atelier dans 2 ans" data-testid="vision-panneau-titre"
              className={`${CHAMP_CLAIR} mt-2`} />
          </>
        ) : type === "video" || type === "audio" ? (
          <>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/50">{type === "video" ? "Ta vidéo (appareil ou galerie)" : "Ton audio (mémo vocal, musique…)"}</p>
            <label className="mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/12 bg-white/[0.06] px-3.5 py-3 text-[13px] text-offwhite/70 hover:border-gold/40">
              <span className="flex items-center gap-2">{type === "video" ? <Video size={15} className="text-gold" /> : <Music size={15} className="text-gold" />} {envoiMedia ? "Envoi en cours…" : (media ? "Fichier choisi — changer" : "Choisir depuis le téléphone")}</span>
              {envoiMedia && <Loader2 size={15} className="animate-spin text-gold" />}
              <input type="file" accept={type === "video" ? "video/*" : "audio/*"} className="hidden" data-testid={type === "video" ? "vision-panneau-video-input" : "vision-panneau-audio-input"}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setEnvoiMedia(true);
                  try {
                    const r = await televerserFichier(f);
                    setMedia(r.path);
                    toast.success(type === "video" ? "Vidéo ajoutée." : "Audio ajouté.");
                  } catch (err) { toast.error(err.detail || "Envoi impossible pour le moment."); }
                  setEnvoiMedia(false);
                }} />
            </label>
            {media && type === "video" && <div className="mt-3 overflow-hidden rounded-xl border border-white/10"><MediaMur chemin={media} kind="video" className="h-36 w-full bg-black/40" /></div>}
            {media && type === "audio" && <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3"><MediaMur chemin={media} kind="audio" className="w-full" /></div>}
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/50">Étiquette (optionnel)</p>
            <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder={type === "video" ? "Ex. : mon pitch en 30 secondes" : "Ex. : pourquoi je tiens"} data-testid="vision-panneau-titre"
              className={`${CHAMP_CLAIR} mt-2`} />
          </>
        ) : type === "link" ? (
          <>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/50">Adresse du lien</p>
            <input value={lien} onChange={(e) => setLien(e.target.value)} placeholder="https://…" data-testid="vision-panneau-lien"
              className={`${CHAMP_CLAIR} mt-2`} />
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/50">Nom du lien</p>
            <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. : le local idéal" className={`${CHAMP_CLAIR} mt-2`} />
          </>
        ) : (
          <>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/50">Titre</p>
            <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. : ce que je veux ressentir" data-testid="vision-panneau-titre"
              className={`${CHAMP_CLAIR} mt-2`} />
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/50">Texte</p>
            <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={4} placeholder="Écris librement…" data-testid="vision-panneau-texte"
              className={`${CHAMP_CLAIR} mt-2 resize-none`} />
          </>
        )}

        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <button onClick={enregistrer} data-testid="vision-panneau-enregistrer" className="btn-gold !px-4 !py-2 !text-[12.5px]">Enregistrer</button>
          {!nouveau && (
            <button onClick={() => onDelete(carte)} data-testid="vision-panneau-supprimer"
              className="rounded-lg border border-white/[0.09] px-3.5 py-2 text-[12px] font-semibold text-rose-300 hover:text-rose-200">Supprimer</button>
          )}
        </div>
      </div>
    </div>
  );
}

const CHAMP_CLAIR = "w-full rounded-xl border border-white/12 bg-white/[0.06] px-3.5 py-2.5 text-[13.5px] text-offwhite placeholder:text-offwhite/35 focus:border-gold/50 focus:outline-none";
