import React, { useCallback, useEffect, useState } from "react";
import { Sparkles, Loader2, PenLine, Lightbulb, Copy, Store, Trash2, CheckCircle2, ArrowLeft, Eye, Code2, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import {
  proposerIdeesArticles, redigerArticle, fetchArticlesJournal, majArticleJournal, supprimerArticleJournal, articleVersShopify,
} from "@/zy/lib/kairosApi";

// Admin › Articles du Journal.
// L'IA lit les newsletters reçues (Admin › Newsletters), propose des sujets, rédige un brouillon complet
// (SEO compris). Vous relisez, puis l'envoyez en brouillon dans le blog « journal » de Shopify.

const Carte = ({ children, className = "" }) => <section className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${className}`}>{children}</section>;
const CHAMP = "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-offwhite placeholder:text-offwhite/30 focus:border-[#DEC2A3]/60 focus:outline-none";
const BTN = "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50";
const BTN_PLEIN = `${BTN} admin-btn-plein`;
const BTN_LIGNE = `${BTN} border border-white/15 hover:border-[#DEC2A3]/60`;

const STATUTS = { brouillon: ["Brouillon", "bg-white/10 text-offwhite/70"], pret: ["Sur Shopify (non publié)", "bg-sky-500/15 text-sky-300"], publie: ["Publié", "bg-emerald-500/15 text-emerald-300"] };
const Badge = ({ s }) => { const [l, c] = STATUTS[s] || [s, "bg-white/10"]; return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c}`}>{l}</span>; };
const dateFr = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "");

function Compteur({ v = "", max }) {
  const n = (v || "").length;
  return <span className={`text-[11px] tabular-nums ${n > max ? "text-amber-300" : "text-offwhite/40"}`}>{n}/{max}</span>;
}

function Editeur({ article, onRetour, onChange }) {
  const [a, setA] = useState(article);
  const [vue, setVue] = useState("apercu");
  const [envoi, setEnvoi] = useState(false);
  const maj = (k, v) => setA((x) => ({ ...x, [k]: v }));

  const sauver = async (extra = {}) => {
    setEnvoi(true);
    try {
      const r = await majArticleJournal(a.id, { titre: a.titre, titre_seo: a.titre_seo, meta_description: a.meta_description, extrait: a.extrait, handle: a.handle, html: a.html, ...extra });
      setA(r); onChange(); toast.success("Enregistré.");
    } catch (e) { toast.error(e?.message || "Échec."); }
    setEnvoi(false);
  };
  const shopify = async () => {
    setEnvoi(true);
    try { await sauver(); const r = await articleVersShopify(a.id); setA(r); onChange(); toast.success("Créé en brouillon dans le blog « journal » de Shopify : relisez puis publiez là-bas."); }
    catch (e) { toast.error(e?.message || "Shopify indisponible."); }
    setEnvoi(false);
  };
  const copier = async (texte, quoi) => { try { await navigator.clipboard.writeText(texte || ""); toast.success(`${quoi} copié.`); } catch { toast.error("Copie impossible."); } };

  return (
    <div className="space-y-4" data-testid="article-editeur">
      <button type="button" onClick={onRetour} className="inline-flex items-center gap-1.5 text-xs text-offwhite/60 hover:text-offwhite"><ArrowLeft size={14} /> Tous les articles</button>
      <Carte>
        <div className="mb-4 flex flex-wrap items-center gap-2"><Badge s={a.statut} /><span className="text-xs text-offwhite/45">{a.type === "note" ? "Note de la maison" : "Article"}{a.categorie ? ` · rubrique : ${a.categorie}` : ""}{a.mot_cle ? ` · mot-clé : ${a.mot_cle}` : ""}</span></div>
        <div className="space-y-3">
          <label className="block"><span className="mb-1 block text-xs font-semibold text-offwhite/60">Titre</span><input className={`${CHAMP} text-base font-semibold`} value={a.titre || ""} onChange={(e) => maj("titre", e.target.value)} /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-offwhite/60">Chapô (extrait affiché dans la liste)</span><textarea rows={2} className={CHAMP} value={a.extrait || ""} onChange={(e) => maj("extrait", e.target.value)} /></label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block"><span className="mb-1 flex justify-between text-xs font-semibold text-offwhite/60">Titre Google <Compteur v={a.titre_seo} max={60} /></span><input className={CHAMP} value={a.titre_seo || ""} onChange={(e) => maj("titre_seo", e.target.value)} /></label>
            <label className="block"><span className="mb-1 block text-xs font-semibold text-offwhite/60">Adresse (handle)</span><input className={CHAMP} value={a.handle || ""} onChange={(e) => maj("handle", e.target.value)} /></label>
          </div>
          <label className="block"><span className="mb-1 flex justify-between text-xs font-semibold text-offwhite/60">Description Google <Compteur v={a.meta_description} max={155} /></span><textarea rows={2} className={CHAMP} value={a.meta_description || ""} onChange={(e) => maj("meta_description", e.target.value)} /></label>
        </div>
      </Carte>
      <Carte>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Texte</p>
          <div className="inline-flex rounded-full border border-white/10 p-0.5 text-xs">
            <button type="button" onClick={() => setVue("apercu")} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${vue === "apercu" ? "bg-white/10" : "opacity-60"}`}><Eye size={12} /> Aperçu</button>
            <button type="button" onClick={() => setVue("html")} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${vue === "html" ? "bg-white/10" : "opacity-60"}`}><Code2 size={12} /> HTML</button>
          </div>
        </div>
        {vue === "html"
          ? <textarea rows={18} className={`${CHAMP} font-mono text-xs leading-relaxed`} value={a.html || ""} onChange={(e) => maj("html", e.target.value)} />
          : <div className="article-apercu max-w-none rounded-xl bg-[#FDFCF8] p-5 text-[15px] leading-relaxed text-[#24364F] sm:p-7" dangerouslySetInnerHTML={{ __html: a.html || "<p><em>Vide</em></p>" }} />}
        <p className="mt-2 text-[11px] text-offwhite/40">Relisez les faits : l'IA a pour consigne de n'inventer aucun chiffre ni témoignage, mais c'est vous qui signez.</p>
      </Carte>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={envoi} onClick={() => sauver()} className={BTN_PLEIN}>{envoi ? <Loader2 size={13} className="animate-spin" /> : null} Enregistrer</button>
        <button type="button" disabled={envoi} onClick={shopify} className={BTN_LIGNE}><Store size={13} /> {a.shopify_id ? "Recréer sur Shopify" : "Créer sur Shopify (brouillon)"}</button>
        <button type="button" onClick={() => copier(a.html, "HTML")} className={BTN_LIGNE}><Copy size={13} /> Copier le HTML</button>
        {a.statut !== "publie" ? <button type="button" disabled={envoi} onClick={() => sauver({ statut: "publie" })} className={BTN_LIGNE}><CheckCircle2 size={13} /> Marquer publié</button> : null}
      </div>
    </div>
  );
}

export default function AdminArticles() {
  const [liste, setListe] = useState(null);
  const [mode, setMode] = useState("article");
  const [theme, setTheme] = useState("");
  const [idees, setIdees] = useState(null);
  const [form, setForm] = useState({ titre: "", angle: "", mot_cle: "", notes: "", categorie: "tresorerie" });
  const [occupe, setOccupe] = useState("");
  const [ouvert, setOuvert] = useState(null);

  const charger = useCallback(() => { fetchArticlesJournal().then(setListe).catch(() => setListe([])); }, []);
  useEffect(() => { charger(); }, [charger]);

  const proposer = async () => {
    setOccupe("idees"); setIdees(null);
    try { const r = await proposerIdeesArticles(theme); setIdees(r.idees || []); if (!r.idees?.length) toast("Aucune idée : précisez un thème."); }
    catch (e) { toast.error(e?.message || "Impossible de proposer des sujets."); }
    setOccupe("");
  };
  const rediger = async (donnees) => {
    setOccupe("redaction");
    try { const a = await redigerArticle({ type: mode, categorie: mode === "article" ? form.categorie : "", ...donnees }); toast.success("Brouillon prêt."); charger(); setOuvert(a); setForm({ ...form, titre: "", angle: "", mot_cle: "", notes: "" }); }
    catch (e) { toast.error(e?.message || "Rédaction impossible."); }
    setOccupe("");
  };
  const supprimer = async (id) => {
    if (!window.confirm("Supprimer ce brouillon ?")) return;
    try { await supprimerArticleJournal(id); charger(); } catch (e) { toast.error(e?.message || "Échec."); }
  };

  if (ouvert) return <div className="max-w-4xl"><Editeur article={ouvert} onRetour={() => { setOuvert(null); charger(); }} onChange={charger} /></div>;

  const ceMois = (liste || []).filter((a) => a.cree_le && new Date(a.cree_le).getMonth() === new Date().getMonth()).length;

  return (
    <div className="max-w-4xl space-y-4" data-testid="admin-articles">
      <Carte>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={15} className="text-[#DEC2A3]" /> Préparer un texte pour le Journal</p>
            <p className="mt-1 text-xs text-offwhite/55">Rythme conseillé : 2 articles par mois et 1 note de la maison. Ce mois-ci : {ceMois} préparé{ceMois > 1 ? "s" : ""}.</p>
          </div>
          <div className="inline-flex rounded-full border border-white/10 p-0.5 text-xs" role="tablist">
            <button type="button" onClick={() => setMode("article")} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 ${mode === "article" ? "bg-white/10 font-semibold" : "opacity-60"}`}><PenLine size={12} /> Article</button>
            <button type="button" onClick={() => setMode("note")} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 ${mode === "note" ? "bg-white/10 font-semibold" : "opacity-60"}`}><NotebookPen size={12} /> Note de la maison</button>
          </div>
        </div>

        {mode === "article" ? (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold text-offwhite/70">1. Des idées tirées de l'actualité reçue</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input className={CHAMP} placeholder="Thème (facultatif) : trésorerie, reprise, prospection…" value={theme} onChange={(e) => setTheme(e.target.value)} />
                <button type="button" onClick={proposer} disabled={!!occupe} className={`${BTN_PLEIN} shrink-0`} data-testid="articles-idees">
                  {occupe === "idees" ? <Loader2 size={13} className="animate-spin" /> : <Lightbulb size={13} />} Proposer 5 sujets
                </button>
              </div>
              {idees?.length ? (
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {idees.map((i) => (
                    <div key={i.titre} className="flex flex-col gap-1.5 rounded-xl border border-white/10 p-4">
                      <p className="text-sm font-semibold leading-snug">{i.titre}</p>
                      <p className="text-xs text-offwhite/60">{i.angle}</p>
                      {i.mot_cle ? <p className="text-[11px] text-[#DEC2A3]">Mot-clé : {i.mot_cle}</p> : null}
                      <button type="button" disabled={!!occupe} onClick={() => rediger({ titre: i.titre, angle: i.angle, mot_cle: i.mot_cle || "" })} className={`${BTN_LIGNE} mt-1 self-start`}>
                        {occupe === "redaction" ? <Loader2 size={12} className="animate-spin" /> : <PenLine size={12} />} Rédiger cet article
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="border-t border-white/[0.06] pt-5">
              <p className="mb-2 text-xs font-semibold text-offwhite/70">2. Ou votre propre sujet</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <input className={CHAMP} placeholder="Titre ou sujet" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
                <input className={CHAMP} placeholder="Mot-clé Google visé (facultatif)" value={form.mot_cle} onChange={(e) => setForm({ ...form, mot_cle: e.target.value })} />
                <select className={CHAMP} value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} data-testid="articles-categorie" aria-label="Rubrique du Journal">
                  <option value="tresorerie">Rubrique : Trésorerie</option><option value="clients">Rubrique : Clients</option>
                  <option value="energie">Rubrique : Énergie</option><option value="organisation">Rubrique : Organisation</option>
                </select>
              </div>
              <textarea rows={3} className={`${CHAMP} mt-2`} placeholder="Angle, exemples réels, chiffres vérifiés à intégrer (facultatif)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <button type="button" disabled={!!occupe || !form.titre.trim()} onClick={() => rediger(form)} className={`${BTN_PLEIN} mt-2`} data-testid="articles-rediger">
                {occupe === "redaction" ? <Loader2 size={13} className="animate-spin" /> : <PenLine size={13} />} Rédiger le brouillon
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-xs text-offwhite/60">Écrivez comme ça vient : une idée, une scène vécue, ce que vous en retenez. L'IA ordonne et resserre, sans rien inventer, et garde votre voix.</p>
            <input className={CHAMP} placeholder="Titre (facultatif)" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
            <textarea rows={7} className={`${CHAMP} mt-2`} placeholder="Vos notes en vrac…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <button type="button" disabled={!!occupe || form.notes.trim().length < 40} onClick={() => rediger({ titre: form.titre, notes: form.notes })} className={`${BTN_PLEIN} mt-2`}>
              {occupe === "redaction" ? <Loader2 size={13} className="animate-spin" /> : <NotebookPen size={13} />} Mettre en forme
            </button>
          </div>
        )}
        {occupe === "redaction" ? <p className="mt-3 text-xs text-offwhite/50">Rédaction en cours (30 à 60 secondes)…</p> : null}
      </Carte>

      <Carte>
        <p className="mb-3 text-sm font-semibold">Brouillons</p>
        {!liste ? <p className="text-xs text-offwhite/50">Chargement…</p> : liste.length === 0 ? (
          <p className="text-xs text-offwhite/50">Aucun brouillon. Commencez par « Proposer 5 sujets ».</p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {liste.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3">
                <button type="button" onClick={() => setOuvert(a)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold">{a.titre}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-offwhite/45"><Badge s={a.statut} /> {a.type === "note" ? "Note" : "Article"} · {dateFr(a.cree_le)}</p>
                </button>
                <button type="button" onClick={() => supprimer(a.id)} aria-label="Supprimer" className="rounded-lg p-2 text-offwhite/40 hover:bg-white/5 hover:text-red-300"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </Carte>
    </div>
  );
}
