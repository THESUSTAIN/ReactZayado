import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Star, Trash2, Link2 } from "lucide-react";
import { call } from "@/lib/part2Api";

// Photos d'un produit vendeur : glisser-déposer ou choisir depuis l'appareil.
// Chaque photo est réduite dans le navigateur (1600 px max, JPEG) puis envoyée
// au serveur, qui la sert à une adresse publique que Shopify importe.
// La 1re photo est la photo principale de la fiche.
const MAX_COTE = 1600;

function reduire(fichier) {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => reject(new Error("Lecture impossible"));
    lecteur.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image illisible"));
      img.onload = () => {
        const r = Math.min(1, MAX_COTE / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height); // fond blanc pour les PNG transparents
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.86));
      };
      img.src = lecteur.result;
    };
    lecteur.readAsDataURL(fichier);
  });
}

export function PhotosProduit({ images, onChange, max = 6 }) {
  const [envoi, setEnvoi] = useState(0);
  const [survol, setSurvol] = useState(false);
  const [lien, setLien] = useState("");
  const input = useRef(null);

  const ajouter = async (fichiers) => {
    const liste = Array.from(fichiers || []).filter((f) => f.type.startsWith("image/"));
    const place = max - images.length;
    if (!liste.length) return;
    if (place <= 0) { toast.error(`${max} photos maximum.`); return; }
    const aEnvoyer = liste.slice(0, place);
    if (liste.length > place) toast.info(`Seules ${place} photo(s) ont été ajoutées (${max} maximum).`);
    setEnvoi(aEnvoyer.length);
    const urls = [];
    for (const f of aEnvoyer) {
      try {
        const data = await reduire(f);
        const r = await call("/vendeur/images", "POST", { data, mime: "image/jpeg" });
        urls.push(r.url);
      } catch (e) { toast.error(`${f.name} : ${e.message || "envoi impossible"}`); }
      setEnvoi((n) => n - 1);
    }
    if (urls.length) onChange([...images, ...urls]);
  };

  const retirer = (u) => onChange(images.filter((x) => x !== u));
  const principale = (u) => onChange([u, ...images.filter((x) => x !== u)]);
  const ajouterLien = () => {
    const u = lien.trim();
    if (!/^https:\/\//.test(u)) { toast.error("L'adresse doit commencer par https://"); return; }
    if (images.length >= max) { toast.error(`${max} photos maximum.`); return; }
    onChange([...images, u]); setLien("");
  };

  return (
    <div data-testid="photos-produit">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {images.map((u, i) => (
          <div key={u} className="group relative aspect-square overflow-hidden rounded-xl border border-white/15 bg-white">
            <img src={u} alt="" className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute left-1 top-1 rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-bold text-navy-900">Principale</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/45 p-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
              {i > 0 && <button type="button" onClick={() => principale(u)} title="Mettre en photo principale" className="rounded-md p-1 text-white hover:bg-white/20"><Star size={13} /></button>}
              <button type="button" onClick={() => retirer(u)} title="Retirer" className="rounded-md p-1 text-white hover:bg-white/20"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {Array.from({ length: envoi }).map((_, i) => (
          <div key={`e${i}`} className="flex aspect-square items-center justify-center rounded-xl border border-white/15 bg-white/5"><Loader2 size={18} className="animate-spin text-gold" /></div>
        ))}
        {images.length + envoi < max && (
          <button type="button" onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setSurvol(true); }} onDragLeave={() => setSurvol(false)}
            onDrop={(e) => { e.preventDefault(); setSurvol(false); ajouter(e.dataTransfer.files); }}
            className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-[11px] transition ${survol ? "border-gold bg-gold/10 text-gold" : "border-white/25 text-offwhite/60 hover:border-gold/60 hover:text-gold"}`}
            data-testid="photos-ajouter">
            <ImagePlus size={20} /> Ajouter
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { ajouter(e.target.files); e.target.value = ""; }} data-testid="photos-input" />
      <p className="mt-2 text-[11px] text-offwhite/50">JPG, PNG ou WebP · {max} photos max · la 1re est la photo principale. Fond clair et produit bien éclairé = plus de ventes.</p>
      <div className="mt-2 flex gap-2">
        <div className="relative flex-1">
          <Link2 size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-offwhite/40" />
          <input value={lien} onChange={(e) => setLien(e.target.value)} placeholder="ou colle l'adresse d'une image (https://…)"
            className="w-full rounded-xl border border-white/15 bg-white/5 py-2 pl-8 pr-3 text-xs text-offwhite outline-none focus:border-gold/50" />
        </div>
        <button type="button" onClick={ajouterLien} className="rounded-xl border border-white/15 px-3 text-xs text-offwhite/80 hover:bg-white/5">Ajouter</button>
      </div>
    </div>
  );
}
