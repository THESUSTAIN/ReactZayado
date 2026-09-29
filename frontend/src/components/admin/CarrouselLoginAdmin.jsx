import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ExternalLink, Image as ImageIcon, Loader2, Plus, Save, Trash2, Upload, Video } from "lucide-react";
import { fetchLoginCarousel, saveLoginCarousel, uploadMedia, mediaUrl } from "@/lib/kairosApi";

const CHAMP = "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-offwhite outline-none focus:border-gold/50";
const SELECT = "rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-offwhite outline-none focus:border-gold/50";
const VIDE = () => ({ type: "image", src: "", titre: "", description: "", style: { position: "bas", voile: "moyen", taille: "normal" } });

function Apercu({ slide }) {
  if (!slide.src) return <div className="flex h-24 w-40 items-center justify-center rounded-xl bg-white/5 text-offwhite/30"><ImageIcon size={20} /></div>;
  if (slide.type === "video") return <video src={mediaUrl(slide.src)} muted loop autoPlay playsInline className="h-24 w-40 rounded-xl object-cover" />;
  return <img src={mediaUrl(slide.src)} alt="" className="h-24 w-40 rounded-xl object-cover" />;
}

function SlideForm({ slide, index, total, onChange, onMove, onDelete }) {
  const [mode, setMode] = useState(slide.src.startsWith("/api/medias/") ? "upload" : "lien");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const set = (patch) => onChange({ ...slide, ...patch });
  const setStyle = (patch) => onChange({ ...slide, style: { ...slide.style, ...patch } });

  const envoyer = async (f) => {
    if (!f) return;
    setUploading(true);
    try {
      const r = await uploadMedia(f);
      onChange({ ...slide, src: r.url, type: r.type });
      toast.success("Média téléversé.");
    } catch (e) { toast.error(e.message || "Téléversement impossible."); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4" data-testid={`carrousel-slide-${index}`}>
      <div className="flex flex-wrap items-start gap-4">
        <Apercu slide={slide} />
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <select value={slide.type} onChange={(e) => set({ type: e.target.value })} className={SELECT} data-testid={`carrousel-type-${index}`}>
              <option value="image">Image</option>
              <option value="video">Vidéo</option>
            </select>
            <div className="flex overflow-hidden rounded-lg border border-white/15 text-xs">
              <button onClick={() => setMode("lien")} className={`px-2.5 py-1.5 ${mode === "lien" ? "bg-gold/20 text-gold" : "text-offwhite/60"}`} data-testid={`carrousel-mode-lien-${index}`}>Lien</button>
              <button onClick={() => setMode("upload")} className={`px-2.5 py-1.5 ${mode === "upload" ? "bg-gold/20 text-gold" : "text-offwhite/60"}`} data-testid={`carrousel-mode-upload-${index}`}>Upload</button>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => onMove(-1)} disabled={index === 0} className="rounded-lg p-1.5 text-offwhite/50 hover:bg-white/10 hover:text-gold disabled:opacity-30" title="Monter" data-testid={`carrousel-up-${index}`}><ArrowUp size={15} /></button>
              <button onClick={() => onMove(1)} disabled={index === total - 1} className="rounded-lg p-1.5 text-offwhite/50 hover:bg-white/10 hover:text-gold disabled:opacity-30" title="Descendre" data-testid={`carrousel-down-${index}`}><ArrowDown size={15} /></button>
              <button onClick={() => { if (window.confirm(`Supprimer la slide ${index + 1} ?`)) onDelete(); }} disabled={total <= 1} className="rounded-lg p-1.5 text-offwhite/50 hover:bg-white/10 hover:text-red-400 disabled:opacity-30" title="Supprimer" data-testid={`carrousel-del-${index}`}><Trash2 size={15} /></button>
            </div>
          </div>

          {mode === "lien" ? (
            <input value={slide.src.startsWith("/api/medias/") ? "" : slide.src}
              onChange={(e) => set({ src: e.target.value })}
              placeholder={slide.type === "video" ? "https://…/ma-video.mp4" : "https://…/mon-image.jpg"}
              className={CHAMP} data-testid={`carrousel-src-${index}`} />
          ) : (
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept={slide.type === "video" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp,image/gif"}
                onChange={(e) => envoyer(e.target.files?.[0])} className="hidden" data-testid={`carrousel-file-${index}`} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold hover:bg-gold/20 disabled:opacity-50"
                data-testid={`carrousel-upload-${index}`}>
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? "Téléversement…" : slide.src.startsWith("/api/medias/") ? "Remplacer le fichier" : "Choisir un fichier"}
              </button>
              {slide.src.startsWith("/api/medias/") && <span className="truncate text-[11px] text-emerald-400">✓ fichier téléversé</span>}
            </div>
          )}

          <input value={slide.titre} onChange={(e) => set({ titre: e.target.value })} placeholder="Titre de la slide" maxLength={120}
            className={CHAMP} data-testid={`carrousel-titre-${index}`} />
          <textarea value={slide.description} onChange={(e) => set({ description: e.target.value })} placeholder="Description (une phrase)" rows={2} maxLength={300}
            className={`${CHAMP} resize-none`} data-testid={`carrousel-desc-${index}`} />

          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-offwhite/55">
            <label className="flex items-center gap-1.5">Texte
              <select value={slide.style.position} onChange={(e) => setStyle({ position: e.target.value })} className={SELECT} data-testid={`carrousel-position-${index}`}>
                <option value="bas">en bas</option>
                <option value="centre">centré</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5">Voile
              <select value={slide.style.voile} onChange={(e) => setStyle({ voile: e.target.value })} className={SELECT} data-testid={`carrousel-voile-${index}`}>
                <option value="leger">léger</option>
                <option value="moyen">moyen</option>
                <option value="fort">fort</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5">Titre
              <select value={slide.style.taille} onChange={(e) => setStyle({ taille: e.target.value })} className={SELECT} data-testid={`carrousel-taille-${index}`}>
                <option value="normal">normal</option>
                <option value="grand">grand</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CarrouselLoginAdmin() {
  const [slides, setSlides] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLoginCarousel()
      .then((d) => setSlides((d.slides || []).map((s) => ({ ...VIDE(), ...s, style: { ...VIDE().style, ...(s.style || {}) } }))))
      .catch(() => toast.error("Impossible de charger le carrousel."));
  }, []);

  const change = (i, s) => setSlides((p) => p.map((x, idx) => (idx === i ? s : x)));
  const move = (i, dir) => setSlides((p) => {
    const j = i + dir;
    if (j < 0 || j >= p.length) return p;
    const c = [...p];
    [c[i], c[j]] = [c[j], c[i]];
    return c;
  });

  const enregistrer = async () => {
    const incomplet = slides.findIndex((s) => !s.src.trim());
    if (incomplet >= 0) { toast.error(`La slide ${incomplet + 1} n'a pas d'image/vidéo (lien ou upload).`); return; }
    setSaving(true);
    try {
      await saveLoginCarousel(slides);
      toast.success("Carrousel enregistré — visible sur la page de connexion.");
    } catch (e) { toast.error(e.message || "Enregistrement impossible."); }
    finally { setSaving(false); }
  };

  if (!slides) return <Loader2 className="h-5 w-5 animate-spin text-gold" />;

  return (
    <div className="max-w-3xl space-y-4" data-testid="carrousel-admin">
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm text-offwhite/60">
          Les slides du panneau gauche de la page de connexion. Image ou vidéo, par lien ou par upload (max 6 slides, 8 Mo/image, 60 Mo/vidéo).
        </p>
        <a href="/login" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:underline" data-testid="carrousel-voir">
          Voir la page login <ExternalLink size={12} />
        </a>
      </div>

      {slides.map((s, i) => (
        <SlideForm key={i} slide={s} index={i} total={slides.length}
          onChange={(ns) => change(i, ns)} onMove={(d) => move(i, d)}
          onDelete={() => setSlides((p) => p.filter((_, idx) => idx !== i))} />
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setSlides((p) => [...p, VIDE()])} disabled={slides.length >= 6}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-offwhite/80 hover:border-gold/40 hover:text-gold disabled:opacity-40"
          data-testid="carrousel-add">
          <Plus size={14} /> Ajouter une slide
        </button>
        <button onClick={enregistrer} disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-4 py-2 text-xs font-bold text-navy-900 hover:brightness-105 disabled:opacity-50"
          data-testid="carrousel-save">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer le carrousel
        </button>
        <span className="inline-flex items-center gap-1 text-[11px] text-offwhite/40"><Video size={12} /> Les vidéos tournent en boucle, sans son.</span>
      </div>
    </div>
  );
}
