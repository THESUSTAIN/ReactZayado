// Vidéos IA (HeyGen) — reprise de l'onglet de la console admin, avec ce qui manquait :
// format 9:16 / 16:9 / 1:1, qualité 1080p, couleur de fond, vitesse de la voix,
// historique (plus de perte au rechargement), téléchargement de la vidéo et de la voix seule.
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { fetchHeygenAvatars, fetchHeygenVoices } from "@/zy/lib/kairosApi";

const FORMATS = [
  { k: "vertical", l: "Vertical 9:16", d: "Reels, Shorts, TikTok" },
  { k: "horizontal", l: "Horizontal 16:9", d: "YouTube, LinkedIn" },
  { k: "carre", l: "Carré 1:1", d: "Fil Instagram, LinkedIn" },
];
const FONDS = [
  { v: "#0D1F38", l: "Bleu nuit Zayado" },
  { v: "#FDFCF8", l: "Ivoire Zayado" },
  { v: "#00B140", l: "Vert d'incrustation (CapCut)" },
  { v: "#FFFFFF", l: "Blanc" },
];
const VOIX_MAISON = ["Juliette", "Maxime"]; // les deux voix Zayado, proposées en premier

function Carte({ children }) {
  return <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">{children}</div>;
}

async function appel(chemin, options = {}) {
  const r = await fetch(`/api/heygen${chemin}`, {
    ...options,
    credentials: "same-origin", // session Studio (cookie)
    headers: options.body ? { "Content-Type": "application/json" } : {},
  });
  if (!r.ok) {
    let msg = `Erreur ${r.status}`;
    try { msg = (await r.json()).detail || msg; } catch { /* réponse non JSON */ }
    throw new Error(msg);
  }
  return r;
}

async function telecharger(chemin, nom) {
  const r = await appel(chemin);
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const STATUTS = { completed: "Prête", processing: "En cours", pending: "En attente", waiting: "En attente", failed: "Échec" };

export default function VideosIA() {
  const [avatars, setAvatars] = useState([]);
  const [voix, setVoix] = useState([]);
  const [form, setForm] = useState({ avatar_id: "", voice_id: "", titre: "", script: "", format: "vertical", qualite: "1080p", fond: "#0D1F38", vitesse: "1" });
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [historique, setHistorique] = useState(null);
  const [details, setDetails] = useState({}); // video_id → statut détaillé (url, durée…)
  const [occupe, setOccupe] = useState(null);
  const suivi = useRef(null);

  const voixTriees = useMemo(() => {
    const maison = voix.filter((v) => VOIX_MAISON.some((n) => (v.name || "").startsWith(n)));
    const fr = voix.filter((v) => !maison.includes(v) && /french|français/i.test(v.language || ""));
    const autres = voix.filter((v) => !maison.includes(v) && !fr.includes(v));
    return { maison, fr, autres };
  }, [voix]);

  const chargerHistorique = () =>
    appel("/videos").then((r) => r.json()).then((d) => setHistorique(d.videos || [])).catch(() => setHistorique([]));

  useEffect(() => {
    Promise.all([fetchHeygenAvatars(), fetchHeygenVoices()])
      .then(([a, v]) => {
        const la = a.avatars || [];
        const lv = v.voices || [];
        setAvatars(la);
        setVoix(lv);
        const juliette = lv.find((x) => (x.name || "").startsWith("Juliette"));
        setForm((f) => ({ ...f, avatar_id: la[0]?.avatar_id || "", voice_id: (juliette || lv[0])?.voice_id || "" }));
      })
      .catch(() => setErreur("Impossible de charger HeyGen pour le moment (délai dépassé ou erreur du service). Réessayez dans un instant."))
      .finally(() => setChargement(false));
    chargerHistorique();
    return () => clearInterval(suivi.current);
  }, []);

  const statut = async (id) => {
    const d = await (await appel(`/status/${id}`)).json();
    setDetails((x) => ({ ...x, [id]: d }));
    setHistorique((h) => (h || []).map((v) => (v.video_id === id ? { ...v, status: d.status } : v)));
    return d;
  };

  // Suivi automatique de la dernière vidéo lancée, toutes les 10 s, jusqu'à ce qu'elle soit prête.
  const suivre = (id) => {
    clearInterval(suivi.current);
    suivi.current = setInterval(async () => {
      try {
        const d = await statut(id);
        if (d.status === "completed" || d.status === "failed") {
          clearInterval(suivi.current);
          if (d.status === "completed") toast.success("Vidéo prête : vous pouvez la télécharger.");
          else toast.error("HeyGen n'a pas pu générer la vidéo.");
        }
      } catch { /* on réessaie au tour suivant */ }
    }, 10000);
  };

  const generer = async (e) => {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await (await appel("/generate", {
        method: "POST",
        body: JSON.stringify({
          avatar_id: form.avatar_id, voice_id: form.voice_id, script: form.script, title: form.titre || "Zayado",
          format: form.format, qualite: form.qualite, fond: form.fond, vitesse: form.vitesse,
        }),
      })).json();
      toast.success("Vidéo lancée : elle apparaît dans l'historique.");
      setHistorique((h) => [{ video_id: r.video_id, title: r.title, status: "processing", created_at: Date.now() / 1000 }, ...(h || [])]);
      suivre(r.video_id);
    } catch (err) {
      setErreur(`Échec de la génération : ${err.message}`);
    } finally {
      setEnvoi(false);
    }
  };

  const action = async (v, type) => {
    setOccupe(`${v.video_id}:${type}`);
    try {
      const titre = encodeURIComponent(v.title || v.video_id);
      if (type === "video") await telecharger(`/fichier/${v.video_id}?titre=${titre}`, `${v.title || v.video_id}.mp4`);
      else if (type === "audio") await telecharger(`/audio/${v.video_id}?titre=${titre}`, `${v.title || v.video_id}.mp3`);
      else await statut(v.video_id);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOccupe(null);
    }
  };

  if (chargement) return <Carte><p className="text-sm text-offwhite/50">Chargement des avatars et des voix HeyGen…</p></Carte>;

  const champ = "mt-1 w-full rounded-xl border border-white/15 bg-navy-800 px-3 py-2 text-sm";
  const optionsVoix = (liste) => liste.map((v) => <option key={v.voice_id} value={v.voice_id}>{v.name || v.voice_id}{v.language ? ` — ${v.language}` : ""}</option>);

  return (
    <div className="space-y-4" data-testid="studio-videos-ia">
      {erreur && <Carte><p className="text-sm text-red-400">{erreur}</p></Carte>}
      <Carte>
        <form onSubmit={generer} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs text-offwhite/60">
              Voix
              <select value={form.voice_id} onChange={(e) => setForm((f) => ({ ...f, voice_id: e.target.value }))} data-testid="studio-voice-select" className={champ}>
                {voixTriees.maison.length > 0 && <optgroup label="Voix Zayado">{optionsVoix(voixTriees.maison)}</optgroup>}
                {voixTriees.fr.length > 0 && <optgroup label="Autres voix françaises">{optionsVoix(voixTriees.fr)}</optgroup>}
                <optgroup label="Autres langues">{optionsVoix(voixTriees.autres)}</optgroup>
              </select>
            </label>
            <label className="text-xs text-offwhite/60">
              Avatar <span className="text-offwhite/40">(sans importance si vous ne gardez que la voix)</span>
              <select value={form.avatar_id} onChange={(e) => setForm((f) => ({ ...f, avatar_id: e.target.value }))} data-testid="studio-avatar-select" className={champ}>
                {avatars.map((a) => <option key={a.avatar_id} value={a.avatar_id}>{a.avatar_name || a.avatar_id}</option>)}
              </select>
            </label>
          </div>

          <div>
            <p className="text-xs text-offwhite/60">Format</p>
            <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {FORMATS.map((f) => (
                <button type="button" key={f.k} onClick={() => setForm((x) => ({ ...x, format: f.k }))} data-testid={`studio-format-${f.k}`}
                  className={`rounded-xl border px-3 py-2 text-left text-sm ${form.format === f.k ? "border-gold bg-gold/10 text-gold" : "border-white/15 hover:bg-white/5"}`}>
                  <span className="block font-medium">{f.l}</span>
                  <span className="block text-[11px] text-offwhite/50">{f.d}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-xs text-offwhite/60">
              Qualité
              <select value={form.qualite} onChange={(e) => setForm((f) => ({ ...f, qualite: e.target.value }))} data-testid="studio-qualite-select" className={champ}>
                <option value="1080p">1080p (Full HD)</option>
                <option value="720p">720p</option>
              </select>
            </label>
            <label className="text-xs text-offwhite/60">
              Fond
              <div className="mt-1 flex items-center gap-2">
                <select value={FONDS.some((x) => x.v === form.fond) ? form.fond : ""} onChange={(e) => e.target.value && setForm((f) => ({ ...f, fond: e.target.value }))} data-testid="studio-fond-select" className="w-full rounded-xl border border-white/15 bg-navy-800 px-3 py-2 text-sm">
                  {FONDS.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}
                  <option value="">Autre couleur…</option>
                </select>
                <input type="color" value={form.fond} onChange={(e) => setForm((f) => ({ ...f, fond: e.target.value.toUpperCase() }))} aria-label="Couleur de fond" className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-white/15 bg-transparent" />
              </div>
            </label>
            <label className="text-xs text-offwhite/60">
              Vitesse de la voix
              <select value={form.vitesse} onChange={(e) => setForm((f) => ({ ...f, vitesse: e.target.value }))} data-testid="studio-vitesse-select" className={champ}>
                <option value="0.9">Plus posée (0,9)</option>
                <option value="1">Normale</option>
                <option value="1.1">Plus rapide (1,1)</option>
              </select>
            </label>
          </div>

          <input value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} placeholder="Titre, ex. 2026-45_Juliette_bien-etre" data-testid="studio-video-titre-input" className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm" />
          <textarea value={form.script} onChange={(e) => setForm((f) => ({ ...f, script: e.target.value }))} placeholder="Script (max 1500 caractères)…" rows={6} maxLength={1500} data-testid="studio-script-input" className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm" />
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={envoi || !form.script.trim() || !form.voice_id} data-testid="studio-generate-btn" className="rounded-xl bg-gold/15 px-4 py-2 text-sm font-semibold text-gold hover:bg-gold/25 disabled:opacity-40">
              {envoi ? "Envoi à HeyGen…" : "Générer la vidéo"}
            </button>
            <span className="text-[11px] text-offwhite/40">{form.script.length}/1500 caractères · comptez environ 1 minute de génération pour 20 secondes de vidéo</span>
          </div>
        </form>
      </Carte>

      <Carte>
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold">Historique</p>
          <button onClick={chargerHistorique} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/10">Actualiser</button>
        </div>
        {historique === null && <p className="mt-3 text-sm text-offwhite/50">Chargement…</p>}
        {historique?.length === 0 && <p className="mt-3 text-sm text-offwhite/50">Aucune vidéo pour l'instant.</p>}
        <ul className="mt-3 divide-y divide-white/10" data-testid="studio-historique">
          {(historique || []).map((v) => {
            const d = details[v.video_id] || {};
            const prete = v.status === "completed";
            return (
              <li key={v.video_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{v.title || "Sans titre"}</p>
                  <p className="text-[11px] text-offwhite/50">
                    {v.created_at ? new Date(v.created_at * 1000).toLocaleString("fr-FR") : ""} · <span className={prete ? "text-emerald-300" : v.status === "failed" ? "text-red-400" : "text-gold"}>{STATUTS[v.status] || v.status}</span>
                    {d.duration ? ` · ${Math.round(d.duration)} s` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {prete ? (
                    <>
                      <button onClick={() => action(v, "video")} disabled={!!occupe} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/10 disabled:opacity-40">
                        {occupe === `${v.video_id}:video` ? "Préparation…" : "Télécharger la vidéo"}
                      </button>
                      <button onClick={() => action(v, "audio")} disabled={!!occupe} className="rounded-lg bg-gold/15 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/25 disabled:opacity-40">
                        {occupe === `${v.video_id}:audio` ? "Extraction…" : "Voix seule (MP3)"}
                      </button>
                    </>
                  ) : v.status !== "failed" && (
                    <button onClick={() => action(v, "statut")} disabled={!!occupe} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/10 disabled:opacity-40">Rafraîchir</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Carte>
    </div>
  );
}
