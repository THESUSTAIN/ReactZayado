import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ImagePlus, Link2, Loader2, Lightbulb, LayoutGrid, Send, StickyNote, X, Check } from "lucide-react";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import { fetchBoards, fetchBoard, saveBoard, createIdee } from "@/lib/kairosApi";
import { analyserEtGarder } from "@/lib/analyseIdee";

// « Envoyer vers mon Vision Board » : reçoit ce que le menu Partager du téléphone envoie (image, lien, texte),
// ou ce que la personne ajoute à la main ici, puis lui laisse choisir OÙ le ranger :
// un board (perso, pro…), éventuellement un mur précis de ce board, ou ses Idées.
// Le service worker (public/sw.js) garde les fichiers reçus dans le cache « zayado-partage-v1 ».

const CACHE_PARTAGE = "zayado-partage-v1";
const GOLD = "#DEC2A3";
const uid = (p = "u") => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const URL_RE = /https?:\/\/[^\s<>"']+/i;
const YT_RE = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)/i;
const MAX_PX = 1200;
const POIDS_MAX = 6_000_000; // même plafond d'images importées par board que dans le canvas

const adresse = (t) => {
  const m = String(t || "").match(URL_RE);
  return m ? m[0].replace(/[),.;]+$/, "") : "";
};

// Réduit l'image (max 1200 px) en JPEG : un board stocke ses images dans son JSON.
function imageEnDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => reject(new Error("lecture"));
    lecteur.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image"));
      img.onload = () => {
        const k = Math.min(1, MAX_PX / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * k));
        c.height = Math.max(1, Math.round(img.height * k));
        const g = c.getContext("2d");
        g.fillStyle = "#ffffff";
        g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        resolve({ url: c.toDataURL("image/jpeg", 0.82), ratio: c.height / c.width });
      };
      img.src = lecteur.result;
    };
    lecteur.readAsDataURL(blob);
  });
}

async function lirePartageEnAttente() {
  if (typeof caches === "undefined") return { meta: null, fichiers: [] };
  try {
    const cache = await caches.open(CACHE_PARTAGE);
    const rm = await cache.match("/_partage/meta");
    if (!rm) return { meta: null, fichiers: [] };
    const meta = await rm.json();
    // Un partage vieux de plus d'une heure n'est plus celui que la personne attend.
    if (Date.now() - (meta.le || 0) > 3600 * 1000) { await viderPartage(); return { meta: null, fichiers: [] }; }
    const fichiers = [];
    for (let i = 0; i < (meta.n || 0); i += 1) {
      const r = await cache.match(`/_partage/fichier/${i}`);
      if (r) fichiers.push(await r.blob());
    }
    return { meta, fichiers };
  } catch { return { meta: null, fichiers: [] }; }
}

async function viderPartage() {
  if (typeof caches === "undefined") return;
  try { await caches.delete(CACHE_PARTAGE); } catch { /* rien à vider */ }
}

export default function Partager() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const entree = useRef(null);
  const [images, setImages] = useState([]); // [{ id, blob, apercu }]
  const [lien, setLien] = useState("");
  const [note, setNote] = useState("");
  const [boards, setBoards] = useState(null);
  const [dest, setDest] = useState("board"); // board | idee
  const [cle, setCle] = useState("");
  const [murs, setMurs] = useState([]);
  const [mur, setMur] = useState(""); // "" = libre sur le board
  const [envoi, setEnvoi] = useState(false);
  const [recu, setRecu] = useState(false);

  const ajouterBlobs = (liste) => {
    const nouvelles = liste.filter((b) => /^image\//.test(b.type || "")).slice(0, 8)
      .map((blob) => ({ id: uid("p"), blob, apercu: URL.createObjectURL(blob) }));
    if (nouvelles.length) setImages((x) => [...x, ...nouvelles].slice(0, 8));
  };

  // 1) Ce que le téléphone vient d'envoyer (POST géré par le service worker) ou, à défaut, l'ancien format GET.
  useEffect(() => {
    let vivant = true;
    (async () => {
      const { meta, fichiers } = await lirePartageEnAttente();
      if (!vivant) return;
      const titre = meta?.title ?? params.get("title") ?? "";
      const texte = meta?.text ?? params.get("text") ?? "";
      const u = meta?.url || params.get("url") || adresse(texte) || adresse(titre);
      if (fichiers.length) ajouterBlobs(fichiers);
      if (u) setLien(u);
      const reste = [titre, texte].map((t) => String(t || "").replace(u, "").trim()).filter(Boolean);
      const libre = [...new Set(reste)].join("\n");
      if (libre) setNote(libre);
      setRecu(Boolean(fichiers.length || u || libre));
    })();
    return () => { vivant = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2) Les boards (« canaux ») proposés.
  useEffect(() => {
    fetchBoards().then((d) => {
      const l = d.boards || [];
      setBoards(l);
      if (l.length) setCle((c) => c || l[0].key);
    }).catch(() => { setBoards([]); toast.error("Impossible de charger tes boards."); });
  }, []);

  // 3) Les murs du board choisi.
  useEffect(() => {
    if (!cle) return;
    setMur("");
    fetchBoard(cle).then((d) => setMurs((d.cards || []).filter((c) => c.type === "wall" && !c.trashed)))
      .catch(() => setMurs([]));
  }, [cle]);

  useEffect(() => () => images.forEach((i) => URL.revokeObjectURL(i.apercu)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const aEnvoyer = images.length > 0 || lien.trim() || note.trim();
  const resume = useMemo(() => {
    const p = [];
    if (images.length) p.push(`${images.length} image${images.length > 1 ? "s" : ""}`);
    if (lien.trim()) p.push("1 lien");
    if (note.trim()) p.push("1 note");
    return p.join(" + ");
  }, [images, lien, note]);

  const envoyer = async () => {
    if (!aEnvoyer || envoi) return;
    setEnvoi(true);
    try {
      if (dest === "idee") {
        const u = lien.trim();
        if (!note.trim() && !u) { toast.error("Pour une idée, ajoute une phrase ou un lien (les images se rangent dans un board)."); setEnvoi(false); return; }
        if (images.length) toast("Les images ne sont pas gardées dans les idées : choisis un board pour elles.");
        const titre = (note.trim().split("\n")[0] || u || "Idée partagée").slice(0, 300);
        const desc = [note.trim().split("\n").slice(1).join("\n"), u].filter(Boolean).join("\n") || undefined;
        const creee = await createIdee({ titre, description: desc, source: "partage" });
        analyserEtGarder(creee.id).catch(() => {});   // l'IA évalue l'idée tout de suite, en arrière-plan (une seule fois)
        await viderPartage();
        toast.success("Ajouté à tes idées 💡");
        navigate("/app/actions?tab=idees");
        return;
      }
      if (!cle) throw new Error("Choisis un board.");
      // On relit le board juste avant d'écrire : on n'écrase pas ce qui a changé entre-temps.
      const frais = await fetchBoard(cle);
      const cartes = frais.cards || [];
      const poidsActuel = cartes.reduce((n, c) => n + (typeof c.image === "string" && c.image.startsWith("data:") ? c.image.length : 0), 0);

      const nouvelles = [];
      let poids = poidsActuel;
      for (const img of images) {
        try {
          const { url, ratio } = await imageEnDataUrl(img.blob);
          poids += url.length;
          if (poids > POIDS_MAX) { toast.error("Ce board contient déjà beaucoup d'images : certaines n'ont pas été ajoutées."); break; }
          nouvelles.push({ type: "image", w: 380, h: Math.round(380 * ratio), image: url, title: { fr: "", en: "" } });
        } catch { /* image illisible : on passe à la suivante */ }
      }
      const u = lien.trim() && (/^https?:\/\//i.test(lien.trim()) ? lien.trim() : `https://${lien.trim()}`);
      if (u) nouvelles.push(YT_RE.test(u) ? { type: "video", w: 460, url: u } : { type: "link", w: 380, url: u, titre: "" });
      if (note.trim()) nouvelles.push({ type: "note", w: 420, title: { fr: "", en: "" }, body: { fr: note.trim(), en: note.trim() } });
      if (!nouvelles.length) throw new Error("Rien à ajouter.");

      // Placement : dans le mur choisi (à la suite), sinon libre sous les cartes existantes.
      const libres = cartes.filter((c) => !c.parent && c.type !== "line" && typeof c.y === "number");
      const bas = libres.reduce((m, c) => Math.max(m, c.y + (c.h || 260)), 0);
      const ordreMax = mur ? Math.max(-1, ...cartes.filter((c) => c.parent === mur).map((c) => c.order ?? 0)) : -1;
      const ajoutees = nouvelles.map((c, i) => (mur
        ? { tags: [], ...c, id: uid(), parent: mur, order: ordreMax + 1 + i }
        : { tags: [], ...c, id: uid(), x: 40 + i * 36, y: bas + 40 + i * 36 }));

      await saveBoard([...cartes, ...ajoutees], cle);
      await viderPartage();
      const nom = boards?.find((b) => b.key === cle)?.nom || "ton board";
      toast.success(`${ajoutees.length > 1 ? `${ajoutees.length} éléments ajoutés` : "Ajouté"} à « ${nom} » 🌟`);
      navigate(`/app/vision?view=canvas&board=${encodeURIComponent(cle)}`);
    } catch (e) {
      toast.error(e?.message || "Envoi impossible pour le moment.");
    } finally { setEnvoi(false); }
  };

  const puce = (actif) => `inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-medium transition ${actif ? "border-gold bg-gold text-navy-900" : "border-white/20 bg-white/[0.06] text-white/85 hover:border-white/40"}`;
  const champ = "w-full rounded-xl border border-white/20 bg-white/[0.07] px-3.5 py-3 text-[15px] text-white outline-none placeholder:text-white/45 focus:border-gold";

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[92px]">
        <Header title="Envoyer vers mon Vision Board" subtitle="Une image, un lien ou une idée : tu choisis où le ranger." />
        <main className="mx-auto max-w-2xl space-y-5 px-4 py-6 pb-48 sm:px-6 lg:pb-28" data-testid="partager">
          {recu && (
            <p className="flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-[14px] text-emerald-200" data-testid="partager-recu">
              <Check size={16} /> Bien reçu depuis ton téléphone. Choisis maintenant où le ranger.
            </p>
          )}

          {/* 1. Le contenu */}
          <section className="rounded-2xl border border-white/15 bg-white/[0.06] p-4 sm:p-5">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/70">1 · Ce que tu envoies</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {images.map((i) => (
                <span key={i.id} className="relative h-24 w-24 overflow-hidden rounded-xl border border-white/20">
                  <img src={i.apercu} alt="" className="h-full w-full object-cover" />
                  <button type="button" aria-label="Retirer l'image" onClick={() => setImages((x) => x.filter((y) => y.id !== i.id))}
                    className="absolute right-1 top-1 rounded-full bg-black/65 p-1 text-white"><X size={14} /></button>
                </span>
              ))}
              <button type="button" onClick={() => entree.current?.click()} data-testid="partager-ajouter-image"
                className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/35 text-[12px] text-white/75 hover:border-gold hover:text-white">
                <ImagePlus size={22} /> Photo
              </button>
              <input ref={entree} type="file" accept="image/*" multiple hidden onChange={(e) => { ajouterBlobs(Array.from(e.target.files || [])); e.target.value = ""; }} />
            </div>
            <label className="mt-4 flex items-center gap-2 text-[13px] text-white/75"><Link2 size={15} /> Lien</label>
            <input value={lien} onChange={(e) => setLien(e.target.value)} placeholder="https://…" inputMode="url" className={`${champ} mt-1.5`} data-testid="partager-lien" />
            <label className="mt-4 flex items-center gap-2 text-[13px] text-white/75"><StickyNote size={15} /> Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={2000} placeholder="Une phrase, une idée, un mot…" className={`${champ} mt-1.5 min-h-[112px] resize-y`} data-testid="partager-note" />
          </section>

          {/* 2. La destination */}
          <section className="rounded-2xl border border-white/15 bg-white/[0.06] p-4 sm:p-5">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/70">2 · Où le ranger ?</h2>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Destination">
              {boards === null && <Loader2 size={16} className="animate-spin text-white/60" />}
              {(boards || []).map((b) => (
                <button key={b.key} type="button" role="radio" aria-checked={dest === "board" && cle === b.key}
                  onClick={() => { setDest("board"); setCle(b.key); }} className={puce(dest === "board" && cle === b.key)} data-testid={`partager-board-${b.key}`}>
                  <span aria-hidden="true">{b.emoji || "🧭"}</span>{b.nom}
                </button>
              ))}
              <button type="button" role="radio" aria-checked={dest === "idee"} onClick={() => setDest("idee")} className={puce(dest === "idee")} data-testid="partager-idees">
                <Lightbulb size={16} /> Mes idées
              </button>
            </div>
            {dest === "idee" && images.length > 0 && (
              <p className="mt-3 rounded-xl border border-gold/30 bg-gold/10 px-3.5 py-2.5 text-[13px] text-white/85" data-testid="partager-avertissement-images">
                Une idée garde du texte et un lien, pas d'image. Pour garder {images.length > 1 ? "tes images" : "ton image"}, choisis un board.
              </p>
            )}
            {dest === "board" && murs.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 flex items-center gap-2 text-[13px] text-white/75"><LayoutGrid size={15} /> Dans quel mur ?</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setMur("")} className={puce(mur === "")}>Libre sur le board</button>
                  {murs.map((m) => (
                    <button key={m.id} type="button" onClick={() => setMur(m.id)} className={puce(mur === m.id)} data-testid={`partager-mur-${m.id}`}>{m.title || "Mur"}</button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </main>

        {/* Barre d'action fixe : toujours atteignable au pouce, au-dessus de la barre de navigation mobile. */}
        <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[57] border-t border-white/15 bg-[#0d1426]/95 px-4 pb-3 pt-3 backdrop-blur-xl lg:bottom-0 lg:left-[92px]">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <p className="min-w-0 flex-1 truncate text-[13px] text-white/70">{resume || "Rien à envoyer pour l'instant"}</p>
            <button type="button" onClick={envoyer} disabled={!aEnvoyer || envoi || (dest === "board" && !cle)} data-testid="partager-envoyer"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl px-6 text-[15px] font-semibold text-navy-900 disabled:opacity-50" style={{ background: GOLD }}>
              {envoi ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
