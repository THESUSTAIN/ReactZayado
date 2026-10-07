import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen, HandHeart, Compass, Users, ShieldCheck, Sparkles, ArrowLeft, ArrowRight,
  ArrowUpRight, Heart, Plus, Check, Wind, Quote, MessageCircle, Send, Bot, CalendarClock,
  Star, ChevronRight, Target, Moon, Feather, Cloud, ScrollText, Trash2, Loader2, Flag, ListChecks,
  Power, Share2, Brain,
} from "lucide-react";
import {
  fetchFoiPosts, publierFoiPost, soutenirFoiPost, repondreFoiPost, supprimerFoiPost, supprimerFoiReponse,
  signalerFoiPost, fetchFoiPourMoi,
} from "@/lib/kairosApi";
import {
  modules, sagesse, prayerPrompts, parcours, valeursBibliques,
  buildDiscernementSynthese, cercleCategories, THESUSTAIN_URL,
  dechargePrompts, dechargeVersets, psaumes, sabbat, association, versetsLecture,
  themeDuJour, cleDuJour,
} from "./thesustainData";
import { useLocal, uid } from "./store";
import { gesteFoi, jourParcoursFoi } from "@/lib/kairosApi";
import { AideMemoire } from "./MemoireAide";
import MaFoiHub from "./MaFoiHub";
import Memoire from "./MemoirePage";
import { useMemoire } from "./memoireStore";
import { versetsARevoir } from "./memoireLogic";

const ICONS = { sagesse: BookOpen, priere: HandHeart, parcours: Compass, discernement: ShieldCheck, cercle: Users, repos: Moon, lecture: ScrollText, memoire: Brain };
// Ordre de la barre : les gestes quotidiens d'abord (Sagesse, Mémoire, Prière), la mémoire n'est plus au fond de la liste.
const ORDRE_NAV = ["sagesse", "memoire", "priere", "lecture", "parcours", "discernement", "cercle", "repos"];
const openSustain = () => { window.open(THESUSTAIN_URL, "_blank", "noopener"); };

// Date relative lisible (« à l'instant », « il y a 2 h », « hier »…).
const ilYa = (iso) => {
  if (!iso) return "";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  if (h < 48) return "hier";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

// Publications PARTAGÉES entre les membres (Mur de prière, Cercle) — vraies
// données serveur. Avant : faux membres pré-remplis, visibles de soi seul.
function useFoiPosts(espace, categorie) {
  const [items, setItems] = useState(null);
  const charger = useCallback(() => {
    fetchFoiPosts(espace, categorie).then((d) => setItems(d.items || [])).catch(() => setItems([]));
  }, [espace, categorie]);
  useEffect(() => { charger(); }, [charger]);
  const maj = (post) => setItems((l) => (l || []).map((p) => (p.id === post.id ? post : p)));
  const publier = async (texte, extra = {}) => {
    try { const p = await publierFoiPost({ espace, texte, ...extra }); setItems((l) => [p, ...(l || [])]); return true; }
    catch (e) { toast.error(e.message || "Publication impossible."); return false; }
  };
  const soutenir = async (id) => {
    try { const r = await soutenirFoiPost(id); setItems((l) => (l || []).map((p) => (p.id === id ? { ...p, count: r.count, mine_support: r.mine_support } : p))); }
    catch { toast.error("Action impossible pour le moment."); }
  };
  const repondre = async (id, texte, genre) => {
    try { maj(await repondreFoiPost(id, texte, genre)); return true; } catch { toast.error("Réponse impossible."); return false; }
  };
  const supprimer = async (id) => {
    if (!window.confirm("Supprimer cette publication ?")) return;
    try { await supprimerFoiPost(id); setItems((l) => (l || []).filter((p) => p.id !== id)); } catch { toast.error("Suppression impossible."); }
  };
  const supprimerReponse = async (postId, repId) => {
    try { await supprimerFoiReponse(repId); setItems((l) => (l || []).map((p) => (p.id === postId ? { ...p, replies: p.replies.filter((r) => r.id !== repId) } : p))); }
    catch { toast.error("Suppression impossible."); }
  };
  const signaler = async (id) => {
    const motif = window.prompt("Pourquoi signales-tu ce message ? (inapproprié, haineux, spam, données personnelles, autre)", "inapproprié");
    if (motif === null) return;
    const m = motif.toLowerCase();
    const cle = m.includes("hain") ? "haineux" : m.includes("spam") || m.includes("pub") ? "spam" : m.includes("donn") ? "donnees_perso" : m.includes("inap") ? "inapproprie" : "autre";
    try { await signalerFoiPost(id, cle, motif); toast.success("Merci, l'équipe va regarder ce message."); }
    catch (e) { toast.error(e.message || "Signalement impossible."); }
  };
  return { items, publier, soutenir, repondre, supprimer, supprimerReponse, signaler };
}

const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;
const SignalerBtn = ({ onClick }) => (
  <button onClick={onClick} className="inline-flex items-center gap-1 text-[12px] text-offwhite/35 hover:text-rose-300" aria-label="Signaler" title="Signaler ce message"><Flag className="h-3.5 w-3.5" /> Signaler</button>
);

const Card = ({ className = "", children, ...rest }) => (
  <div {...rest} className={`rounded-2xl border border-white/10 bg-white/[0.04] ${className}`}>{children}</div>
);
const GoldBtn = ({ onClick, children, className = "", ...rest }) => (
  <button {...rest} onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-gold-hover ${className}`}>{children}</button>
);
const GhostBtn = ({ onClick, children, className = "", ...rest }) => (
  <button {...rest} onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-offwhite transition hover:bg-white/10 ${className}`}>{children}</button>
);
const SustainLink = ({ label = "Voir dans TheSustain" }) => (
  <button onClick={openSustain} className="inline-flex items-center gap-1.5 text-sm text-gold hover:text-gold-hover">{label} <ArrowUpRight className="h-4 w-4" /></button>
);
const Textarea = (props) => <textarea {...props} className={`w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-offwhite placeholder:text-offwhite/35 outline-none focus:border-gold/40 ${props.className || ""}`} />;
const Input = (props) => <input {...props} className={`w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-offwhite placeholder:text-offwhite/35 outline-none focus:border-gold/40 ${props.className || ""}`} />;

function Section({ title, subtitle, children }) {
  return (
    <div className="animate-fade-up">
      <div className="mb-5">
        <h1 className="font-display text-3xl font-extrabold text-offwhite sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-offwhite/60">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/* ─── CHOIX (Ma Foi pas encore activée sur le compte) ─── */
function Choice({ onActivate, onSkip, enCours }) {
  return (
    <div className="mx-auto max-w-xl animate-fade-up py-8 text-center" data-testid="mafoi-choix">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold"><HandHeart className="h-7 w-7" /></div>
      <h1 className="font-display text-3xl font-extrabold text-offwhite">Ajouter Ma Foi à ton Zayado ?</h1>
      <p className="mt-3 text-sm leading-relaxed text-offwhite/65">Un espace optionnel, créé par TheSustain (association partenaire de Zayado, distincte de lui), pour relier ta foi chrétienne et ton activité : un verset et une pause par jour, la prière, des parcours de 7 jours, un journal de décisions et une communauté d'entrepreneurs.</p>
      <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
        <GoldBtn onClick={onActivate} className="px-6 py-2.5" data-testid="mafoi-activer">{enCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Oui, activer Ma Foi</GoldBtn>
        <GhostBtn onClick={onSkip} className="px-6 py-2.5">Pas pour moi</GhostBtn>
      </div>
      <p className="mt-4 text-xs text-offwhite/45">Tu peux l'activer ou la retirer à tout moment dans Paramètres › Mon Copilote. Le reste de Zayado ne change pas.</p>
    </div>
  );
}

/* ─── AUJOURD'HUI POUR TOI (données réelles du compte) ─── */
function useResumeFoi() {
  const theme = themeDuJour();
  const [progress] = useLocal("parcours_progress", {});
  const [intentions] = useLocal("priere_intentions", []);
  const [decisions] = useLocal("discernement_saved", []);
  const [journal] = useLocal("sagesse_journal", {});
  const memoire = useMemoire();
  const [pourMoi, setPourMoi] = useState(null);
  useEffect(() => { fetchFoiPourMoi().then(setPourMoi).catch(() => setPourMoi(null)); }, []);
  const enCours = parcours.map((p) => ({ p, faits: (progress[p.id] || []).length })).find((x) => x.faits > 0 && x.faits < x.p.days.length);
  const aujourdhui = cleDuJour();
  const aReevaluer = (decisions || []).filter((d) => d.dateReeval && d.dateReeval <= aujourdhui && !d.issue);
  const versetsDus = versetsARevoir(memoire.progress);
  return { theme, enCours, intentions: intentions || [], aReevaluer, pauseFaite: !!(journal || {})[aujourdhui], pourMoi, versetsDus };
}

/* ─── ACCUEIL : voir MaFoiHub.jsx (verset du jour, « Aujourd'hui », mémoire, rubriques groupées, mode jeu) ─── */
function Hub({ go }) {
  const r = useResumeFoi();
  // Seulement ce qui vient des AUTRES membres (prières, réponses) : le reste est déjà dans « Aujourd'hui ».
  const lignes = [
    r.pourMoi?.nouveaux_soutiens ? { Icone: HandHeart, texte: `${pluriel(r.pourMoi.nouveaux_soutiens, "personne prie", "personnes prient")} pour toi depuis ta dernière visite`, vue: "priere" } : null,
    r.pourMoi?.nouvelles_reponses ? { Icone: MessageCircle, texte: `${pluriel(r.pourMoi.nouvelles_reponses, "nouvelle réponse", "nouvelles réponses")} à tes messages`, vue: "cercle" } : null,
  ].filter(Boolean);
  const social = lignes.length ? (
    <section className="mt-4 rounded-3xl border border-gold/25 bg-gold/[0.06] p-3" data-testid="mafoi-pour-toi">
      {lignes.map((l) => (
        <button key={l.vue} onClick={() => go(l.vue)} className="flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm hover:bg-white/[0.05]">
          <l.Icone className="h-4 w-4 shrink-0 text-gold" /><span className="min-w-0 flex-1 text-offwhite/90">{l.texte}</span><ChevronRight className="h-4 w-4 shrink-0 text-offwhite/35" />
        </button>
      ))}
    </section>
  ) : null;
  return <MaFoiHub r={r} go={go} modules={modules} icons={ICONS} social={social} />;
}

/* ─── SAGESSE ─── */
function Sagesse() {
  const theme = themeDuJour();
  const jour = cleDuJour();
  const [journal, setJournal] = useLocal("sagesse_journal", {});
  const [medOpen, setMedOpen] = useState(false);
  const texte = (journal || {})[jour] || "";
  // Ce que la personne écrit ici part AUSSI dans le carnet commun (une entrée
  // « foi » par jour). Avant, Ma Foi tenait son propre journal : ce texte
  // n'apparaissait jamais dans le carnet de Bien-être, et la journée ne comptait
  // pas dans la série du compte — comme si ce geste-là n'existait pas.
  const envoi = useRef(null);
  const ecrire = (v) => {
    setJournal({ ...(journal || {}), [jour]: v });
    clearTimeout(envoi.current);
    envoi.current = setTimeout(() => { if (v.trim()) gesteFoi("pause", [v.trim()]).catch(() => {}); }, 900);
  };
  const precedents = Object.entries(journal || {}).filter(([d, t]) => d !== jour && t).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 5);
  return (
    <Section title="Sagesse" subtitle="Un thème par jour : un verset, une pause, une question, et ce que tu en fais dans ton activité.">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-6">
            <span className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[11px] font-semibold text-gold" data-testid="mafoi-theme-du-jour">Thème du jour · {theme.theme}</span>
            <Quote className="mt-3 h-6 w-6 text-gold/70" />
            <p className="mt-1 font-display text-2xl leading-snug text-offwhite">{theme.verse}</p>
            <p className="mt-3 text-sm font-medium text-gold">— {theme.reference}</p>
            <AideMemoire className="mt-4" verset={{ text: theme.verse, ref: theme.reference }} />
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold text-offwhite"><Wind className="h-4 w-4 text-gold" /> Méditation — 3 min</h3>
              <GoldBtn onClick={() => setMedOpen(!medOpen)}>{medOpen ? "Fermer" : "Commencer"}</GoldBtn>
            </div>
            {medOpen ? (
              <div className="mt-4">
                <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gold/15 animate-pulse-glow"><Wind className="h-8 w-8 text-gold" /></div>
                <div className="space-y-2 text-sm leading-relaxed text-offwhite/80">{theme.meditation.map((p, i) => <p key={i}>{p}</p>)}</div>
              </div>
            ) : <p className="mt-2 text-sm text-offwhite/55">Un temps guidé pour respirer et laisser ce thème descendre du mental vers le cœur.</p>}
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold text-offwhite"><Target className="h-4 w-4 text-gold" /> Dans mon activité</h3>
              {texte && <span className="inline-flex items-center gap-1 text-xs text-emerald-300" data-testid="mafoi-sagesse-enregistre"><Check className="h-3.5 w-3.5" /> Enregistré</span>}
            </div>
            <p className="mt-1 text-sm text-offwhite/55">{theme.applicationPrompt}</p>
            <Textarea value={texte} onChange={(e) => ecrire(e.target.value)} placeholder="Écris comment mettre ce thème en pratique cette semaine…" className="mt-3 min-h-24" data-testid="mafoi-sagesse-texte" />
            {precedents.length > 0 && (
              <div className="mt-4 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] uppercase tracking-wide text-offwhite/45">Mes derniers jours</p>
                <div className="space-y-2">{precedents.map(([d, t]) => <div key={d} className="text-sm"><span className="text-[11px] text-offwhite/45">{new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</span><p className="text-offwhite/75">{t}</p></div>)}</div>
              </div>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="p-6"><h3 className="flex items-center gap-2 font-display text-base font-bold text-offwhite"><HandHeart className="h-4 w-4 text-gold" /> Prière du jour</h3><p className="mt-2 text-sm italic leading-relaxed text-offwhite/80">{theme.prayer}</p></Card>
          <Card className="p-6"><h3 className="flex items-center gap-2 font-display text-base font-bold text-offwhite"><Sparkles className="h-4 w-4 text-gold" /> Question de réflexion</h3><p className="mt-2 text-sm leading-relaxed text-offwhite/80">{theme.reflectionQuestion}</p></Card>
          <Card className="p-6">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-offwhite"><BookOpen className="h-4 w-4 text-gold" /> Articles courts</h3>
            <div className="mt-3 space-y-3">
              {sagesse.teachings.map((t, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between"><span className="text-sm font-medium text-offwhite">{t.title}</span><span className="text-[11px] text-offwhite/45">{t.duration}</span></div>
                  <p className="mt-1 text-xs leading-relaxed text-offwhite/55">{t.text}</p>
                </div>
              ))}
              <SustainLink label="Tous les articles dans TheSustain" />
            </div>
          </Card>
        </div>
      </div>
    </Section>
  );
}

/* ─── LECTURE BIBLIQUE ─── */
function LectureBiblique() {
  const [i, setI] = useLocal("lecture_index", 0);
  const [favoris, setFavoris] = useLocal("lecture_favoris", []);
  const { progress: progMemoire } = useMemoire();
  const v = versetsLecture[i % versetsLecture.length];
  const dus = versetsLecture.map((x, k) => ({ x, k })).filter(({ x }) => versetsARevoir(progMemoire).includes(x.ref));
  const estFavori = favoris.some((f) => f.ref === v.ref);
  const toggleFavori = () => setFavoris(estFavori ? favoris.filter((f) => f.ref !== v.ref) : [{ ...v }, ...favoris]);

  return (
    <Section title="Lecture biblique" subtitle="Un verset à la fois. Prends le temps de le lire, puis apprends-le par cœur si tu le souhaites.">
      {dus.length > 0 && (
        <Card className="mb-4 flex flex-wrap items-center gap-2 border-gold/20 bg-gold/[0.05] p-4" data-testid="mafoi-versets-a-revoir">
          <span className="text-sm text-offwhite/80">À revoir aujourd'hui :</span>
          {dus.map(({ x, k }) => <button key={x.ref} onClick={() => setI(k)} className="rounded-full border border-gold/30 px-3 py-1 text-xs text-gold hover:bg-gold/10">{x.ref}</button>)}
        </Card>
      )}
      <Card className="p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-widest text-offwhite/45">Verset {(i % versetsLecture.length) + 1} / {versetsLecture.length}</span>
          <button onClick={toggleFavori} className={`inline-flex items-center gap-1.5 text-xs ${estFavori ? "text-gold" : "text-offwhite/45 hover:text-offwhite"}`} data-testid="mafoi-lecture-favori">
            <Star className={`h-3.5 w-3.5 ${estFavori ? "fill-current" : ""}`} /> {estFavori ? "Favori" : "Ajouter aux favoris"}
          </button>
        </div>
        <Quote className="mt-3 h-6 w-6 text-gold/70" />
        <p className="mt-1 font-display text-2xl leading-snug text-offwhite">{v.text}</p>
        <p className="mt-3 text-sm font-medium text-gold">— {v.ref}</p>
        <AideMemoire className="mt-4" verset={v} />
        <div className="mt-6 flex justify-center gap-2">
          <GhostBtn onClick={() => setI((i - 1 + versetsLecture.length) % versetsLecture.length)}><ArrowLeft className="h-4 w-4" /> Précédent</GhostBtn>
          <GoldBtn onClick={() => setI((i + 1) % versetsLecture.length)}>Verset suivant <ArrowRight className="h-4 w-4" /></GoldBtn>
        </div>
      </Card>

      {favoris.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 font-display text-base font-bold text-offwhite">Mes versets favoris</h3>
          <div className="space-y-2">
            {favoris.map((f) => (
              <Card key={f.ref} className="p-3.5"><p className="text-sm italic text-offwhite/85">{f.text}</p><p className="mt-1 text-xs text-gold">— {f.ref}</p></Card>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

/* ─── PRIÈRE ─── */
function Priere() {
  const [tab, setTab] = useState("perso");
  const [personal, setPersonal] = useLocal("priere_personal", "");
  const [intentions, setIntentions] = useLocal("priere_intentions", []);
  const [exaucees, setExaucees] = useLocal("priere_exaucees", []);
  const [saved, setSaved] = useLocal("priere_saved", []);
  const mur = useFoiPosts("mur");
  const [anonyme, setAnonyme] = useState(false);
  const [decharges, setDecharges] = useLocal("priere_decharges", []);
  const [newInt, setNewInt] = useState("");
  const [wallText, setWallText] = useState("");
  const [dechargeText, setDechargeText] = useState("");

  // Poser une intention, c'est un geste de la journée : il rejoint le carnet
  // commun et compte dans la série, au lieu de rester dans une liste à part.
  const addIntention = () => {
    if (!newInt.trim()) return;
    const t = newInt.trim();
    setIntentions([{ id: uid("int"), text: t }, ...intentions]);
    setNewInt("");
    gesteFoi("priere", [t]).catch(() => {});
  };
  const savePrayer = () => {
    if (!personal.trim()) return;
    const t = personal.trim();
    setSaved([{ id: uid("pr"), text: t, date: new Date().toLocaleDateString("fr-FR") }, ...saved]);
    gesteFoi("priere", [t]).catch(() => {});
    toast.success("Prière enregistrée.");
  };
  const postWall = async () => { if (!wallText.trim()) return; if (await mur.publier(wallText.trim(), { anonyme })) { setWallText(""); toast.success("Publié sur le mur de prière."); } };
  const deposer = () => { if (!dechargeText.trim()) return; const v = dechargeVersets[Math.floor(Math.random() * dechargeVersets.length)]; setDecharges([{ id: uid("dc"), text: dechargeText.trim(), remis: false, verset: v }, ...decharges]); setDechargeText(""); };
  const remettre = (id) => { setDecharges(decharges.map((x) => x.id === id ? { ...x, remis: true } : x)); toast.success("Remis entre les mains de Dieu."); };
  // « Exaucée » : l'intention rejoint le carnet des prières exaucées (avant : elle disparaissait).
  const exaucer = (it) => {
    setIntentions(intentions.filter((x) => x.id !== it.id));
    setExaucees([{ ...it, exaucee_le: new Date().toISOString(), partagee: false }, ...(exaucees || [])]);
    toast.success("Rendons grâce ! Ajoutée à tes prières exaucées.");
  };
  const partagerTemoignage = async (it) => {
    const texte = window.prompt("Ton témoignage (partagé dans le Cercle, catégorie Témoignages) :", `Prière exaucée : ${it.text}. Merci à ceux qui ont prié !`);
    if (!texte || texte.trim().length < 2) return;
    try {
      await publierFoiPost({ espace: "cercle", categorie: "temoignages", texte: texte.trim() });
      setExaucees(exaucees.map((x) => (x.id === it.id ? { ...x, partagee: true } : x)));
      toast.success("Témoignage partagé dans le Cercle.");
    } catch { toast.error("Partage impossible pour le moment."); }
  };

  const Tab = ({ id, children }) => <button onClick={() => setTab(id)} className={`rounded-xl px-4 py-2 text-sm font-medium transition ${tab === id ? "bg-white text-navy-900" : "text-offwhite/60 hover:text-offwhite"}`}>{children}</button>;

  return (
    <Section title="Ma prière" subtitle="Prière personnelle, intentions, prières exaucées, mur de prière et mur des décharges.">
      <div className="mb-4 inline-flex max-w-full gap-1 overflow-x-auto no-scrollbar rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        <Tab id="perso">🙏 Ma prière</Tab><Tab id="exaucees">✨ Exaucées{exaucees?.length ? ` (${exaucees.length})` : ""}</Tab><Tab id="mur">🧱 Mur de prière</Tab><Tab id="decharges">🍃 Mur des décharges</Tab>
      </div>

      {tab === "perso" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="font-display text-base font-bold text-offwhite">Ma prière personnelle</h3>
            <Textarea value={personal} onChange={(e) => setPersonal(e.target.value)} placeholder="Seigneur…" className="mt-3 min-h-28" />
            <div className="mt-2 flex justify-end"><GhostBtn onClick={savePrayer}><Check className="h-4 w-4" /> Enregistrer</GhostBtn></div>
            {saved.length > 0 && <div className="mt-3 space-y-2">{saved.map((s) => <div key={s.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-offwhite/80">{s.text}<div className="mt-1 text-[11px] text-offwhite/40">{s.date}</div></div>)}</div>}
          </Card>
          <Card className="p-6">
            <h3 className="font-display text-base font-bold text-offwhite">Mes intentions</h3>
            <div className="mt-3 flex gap-2"><Input value={newInt} onChange={(e) => setNewInt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addIntention()} placeholder="Ajouter une intention…" /><GoldBtn onClick={addIntention}><Plus className="h-4 w-4" /></GoldBtn></div>
            <div className="mt-3 flex flex-wrap gap-2">{prayerPrompts.map((p) => <button key={p} onClick={() => setIntentions([{ id: uid("int"), text: p }, ...intentions])} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-offwhite/60 hover:text-offwhite">+ {p}</button>)}</div>
            <div className="mt-4 space-y-2">{intentions.map((it) => <div key={it.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-offwhite"><span>{it.text}</span><span className="flex shrink-0 items-center gap-3"><button onClick={() => exaucer(it)} className="inline-flex items-center gap-1 text-xs text-gold hover:text-gold-hover" data-testid="mafoi-exaucee"><Check className="h-3.5 w-3.5" /> Exaucée</button><button onClick={() => setIntentions(intentions.filter((x) => x.id !== it.id))} className="text-offwhite/35 hover:text-rose-300" aria-label="Retirer"><Trash2 className="h-3.5 w-3.5" /></button></span></div>)}</div>
          </Card>
        </div>
      )}

      {tab === "exaucees" && (
        <div data-testid="mafoi-exaucees">
          {!(exaucees || []).length && <Card className="p-6 text-center text-sm text-offwhite/60">Quand une intention trouve sa réponse, marque-la « Exaucée » : elle s'ajoute ici. Relire ce carnet dans les jours difficiles fait du bien.</Card>}
          <div className="space-y-3">{(exaucees || []).map((x) => (
            <Card key={x.id} className="flex flex-wrap items-center gap-3 p-4">
              <Heart className="h-5 w-5 shrink-0 text-gold" />
              <div className="min-w-0 flex-1"><p className="text-sm text-offwhite">{x.text}</p><p className="text-[11px] text-offwhite/45">Exaucée le {new Date(x.exaucee_le).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p></div>
              {x.partagee ? <span className="text-xs text-emerald-300">Partagée dans le Cercle</span> : <GhostBtn onClick={() => partagerTemoignage(x)}><Share2 className="h-4 w-4" /> Témoigner</GhostBtn>}
            </Card>
          ))}</div>
        </div>
      )}

      {tab === "mur" && (
        <div>
          <Card className="mb-4 p-5">
            <Textarea value={wallText} onChange={(e) => setWallText(e.target.value)} placeholder="Priez pour mon lancement d'entreprise cette semaine…" className="min-h-20" />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-offwhite/60"><input type="checkbox" checked={anonyme} onChange={(e) => setAnonyme(e.target.checked)} data-testid="mafoi-mur-anonyme" /> Publier anonymement</label>
              <GoldBtn onClick={postWall}><Send className="h-4 w-4" /> Publier</GoldBtn>
            </div>
          </Card>
          {mur.items === null && <div className="flex items-center gap-2 text-sm text-offwhite/55"><Loader2 className="h-4 w-4 animate-spin" /> Chargement du mur…</div>}
          {mur.items?.length === 0 && <Card className="p-6 text-center text-sm text-offwhite/60" data-testid="mafoi-mur-vide">Le mur est encore vide. Confie la première intention : les membres pourront prier pour toi.</Card>}
          <div className="space-y-3">{(mur.items || []).map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium text-offwhite">{p.mine ? `${p.author} (toi)` : p.author} <span className="text-[11px] font-normal text-offwhite/40">· {ilYa(p.created_at)}</span></div>
                {p.can_delete ? <button onClick={() => mur.supprimer(p.id)} className="text-offwhite/40 hover:text-rose-300" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button> : <SignalerBtn onClick={() => mur.signaler(p.id)} />}
              </div>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-offwhite/80">{p.text}</p>
              <div className="mt-3 flex items-center gap-3">
                <button onClick={() => mur.soutenir(p.id)} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm ${p.mine_support ? "bg-gold text-navy-900" : "border border-white/15 bg-white/5 text-offwhite hover:bg-white/10"}`}><HandHeart className="h-4 w-4" /> {p.mine_support ? "Je prie pour toi ✓" : "Je prie pour toi"}</button>
                <span className="text-xs text-offwhite/45">{p.count ? pluriel(p.count, "personne prie", "personnes prient") : "Sois le premier à prier"}</span>
              </div>
            </Card>
          ))}</div>
        </div>
      )}

      {tab === "decharges" && (
        <div>
          <Card className="mb-4 p-5">
            <p className="text-sm text-offwhite/70">Dépose ici un fardeau, puis remets-le symboliquement à Dieu. « Jetez sur lui tous vos soucis. » Ce mur est privé : toi seul le vois.</p>
            <div className="mt-3 flex flex-wrap gap-2">{dechargePrompts.map((p) => <button key={p} onClick={() => setDechargeText(p)} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-offwhite/60 hover:text-offwhite">{p}</button>)}</div>
            <Textarea value={dechargeText} onChange={(e) => setDechargeText(e.target.value)} placeholder="Ce que je porte de lourd en ce moment…" className="mt-3 min-h-20" />
            <div className="mt-2 flex justify-end"><GoldBtn onClick={deposer}><Cloud className="h-4 w-4" /> Déposer</GoldBtn></div>
          </Card>
          <div className="space-y-3">{decharges.map((x) => (
            <Card key={x.id} className={`p-5 ${x.remis ? "opacity-70" : ""}`}>
              <p className={`text-sm text-offwhite/85 ${x.remis ? "line-through decoration-gold/50" : ""}`}>{x.text}</p>
              {x.remis ? (
                <div className="mt-2 rounded-xl border border-gold/20 bg-gold/[0.06] p-3 text-sm"><span className="italic text-offwhite/80">{x.verset.text}</span><div className="mt-1 text-[11px] text-gold">— {x.verset.ref} · remis à Dieu 🙏</div></div>
              ) : <div className="mt-3"><GhostBtn onClick={() => remettre(x.id)}><Feather className="h-4 w-4" /> Remettre à Dieu</GhostBtn></div>}
            </Card>
          ))}</div>
        </div>
      )}
    </Section>
  );
}

/* ─── PARCOURS ─── */
function Parcours() {
  const [progress, setProgress] = useLocal("parcours_progress", {});
  const [active, setActive] = useState(null);
  const done = (id) => progress[id] || [];
  // Cocher un jour passe maintenant par le serveur : il range le jour dans le
  // carnet commun, le compte dans la série, et surtout il refuse un second
  // parcours en cours — y compris celui de Bien-être. Deux parcours de 7 jours
  // menés de front, c'est exactement la double discipline qu'on veut supprimer.
  const toggleDay = async (pid, day) => {
    const cur = done(pid);
    const fait = !cur.includes(day);
    try {
      const r = await jourParcoursFoi(pid, day, fait);
      if (r?.progress) setProgress(r.progress);
      else setProgress({ ...progress, [pid]: fait ? [...cur, day] : cur.filter((x) => x !== day) });
      if (fait) toast.success(`Jour ${day} terminé.`, r?.serie?.jours > 1 ? { description: `${r.serie.jours} jours de suite.` } : undefined);
    } catch (e) {
      // Le serveur explique quel parcours bloque : on relaie son message tel quel.
      toast.error(e?.detail || "Impossible de marquer ce jour pour l'instant.");
    }
  };
  const j = active ? parcours.find((p) => p.id === active) : null;

  if (j) {
    const completed = done(j.id); const pct = Math.round((completed.length / j.days.length) * 100);
    return (
      <div className="animate-fade-up">
        <button onClick={() => setActive(null)} className="mb-4 inline-flex items-center text-sm text-offwhite/60 hover:text-offwhite"><ArrowLeft className="mr-1.5 h-4 w-4" /> Tous les parcours</button>
        <Card className="mb-5 p-6"><div className="text-3xl">{j.emoji}</div><h1 className="mt-2 font-display text-3xl font-extrabold text-offwhite">{j.title}</h1><p className="text-offwhite/60">{j.subtitle}</p>
          <div className="mt-4 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gold" style={{ width: `${pct}%` }} /></div><span className="text-xs text-offwhite/50">{completed.length}/{j.days.length} jours</span></div>
        </Card>
        <div className="space-y-4">{j.days.map((day) => {
          const isDone = completed.includes(day.day);
          return (
            <Card key={day.day} className={`p-6 ${isDone ? "ring-1 ring-gold/30" : ""}`}>
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-base font-bold text-offwhite"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">{day.day}</span> Jour {day.day}</h3>
                <button onClick={() => toggleDay(j.id, day.day)} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm ${isDone ? "bg-gold text-navy-900" : "border border-white/15 bg-white/5 text-offwhite hover:bg-white/10"}`}><Check className="h-4 w-4" /> {isDone ? "Accompli" : "Marquer"}</button>
              </div>
              <div className="mt-3 space-y-3 text-sm">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-gold/80">📖 Passage</div>
                  <p className="font-display text-lg leading-snug text-offwhite">{day.passage}</p>
                  <p className="mt-1 text-xs text-gold/80">— {day.reference}</p>
                  <AideMemoire className="mt-3" verset={{ text: day.passage, ref: day.reference }} />
                </div>
                <F label="💭 Réflexion" text={day.reflection} /><F label="🧠 Question" text={day.question} /><F label="🙏 Prière" text={day.prayer} italic />
                <div className="rounded-xl border border-gold/20 bg-gold/[0.05] p-3"><div className="mb-1 text-[11px] uppercase tracking-wide text-gold/80">🎯 Action concrète</div><p className="text-offwhite/90">{day.action}</p></div>
              </div>
            </Card>
          );
        })}</div>
      </div>
    );
  }

  return (
    <Section title="Parcours bibliques" subtitle="Bible & entrepreneuriat : des parcours guidés de 7 jours.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{parcours.map((p) => {
        const completed = done(p.id); const pct = Math.round((completed.length / p.days.length) * 100);
        return (
          <button key={p.id} onClick={() => setActive(p.id)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-gold/40 hover:bg-white/[0.07]">
            <div className="text-2xl">{p.emoji}</div><h3 className="mt-3 font-display font-bold leading-snug text-offwhite">{p.title}</h3><p className="mt-1 text-sm text-offwhite/60">{p.subtitle}</p>
            <div className="mt-4 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gold" style={{ width: `${pct}%` }} /></div><span className="text-[11px] text-offwhite/50">{completed.length}/{p.days.length}</span></div>
            <span className="mt-3 inline-flex items-center text-sm text-gold">{completed.length ? "Continuer" : "Commencer"} <ChevronRight className="ml-0.5 h-4 w-4" /></span>
          </button>
        );
      })}</div>
    </Section>
  );
}
function F({ label, text, italic }) { return <div><div className="mb-1 text-[11px] uppercase tracking-wide text-offwhite/45">{label}</div><p className={`leading-relaxed text-offwhite/80 ${italic ? "italic" : ""}`}>{text}</p></div>; }

/* ─── DISCERNEMENT ─── */
function Discernement() {
  const VIDE = { decision: "", pourquoi: "", craintes: "", remise: "", dateReeval: "", valeurs: [] };
  // Brouillon enregistré sur le compte : on peut changer de module sans rien perdre.
  const [b, setB] = useLocal("discernement_brouillon", VIDE);
  const brouillon = { ...VIDE, ...(b || {}) };
  const maj = (patch) => setB({ ...brouillon, ...patch });
  const [synthese, setSynthese] = useState(null);
  const [saved, setSaved] = useLocal("discernement_saved", []);
  const aujourdhui = cleDuJour();
  const toggleVal = (v) => maj({ valeurs: brouillon.valeurs.includes(v) ? brouillon.valeurs.filter((x) => x !== v) : [...brouillon.valeurs, v] });
  const structurer = () => { if (!brouillon.decision.trim() && brouillon.valeurs.length === 0) { toast.error("Décris la décision ou choisis des valeurs."); return; } setSynthese(buildDiscernementSynthese({ decision: brouillon.decision.trim(), valeurs: brouillon.valeurs, craintes: brouillon.craintes.trim(), pourquoi: brouillon.pourquoi.trim() })); };
  const saveDecision = () => {
    if (!brouillon.decision.trim()) { toast.error("Ajoute la décision envisagée."); return; }
    setSaved([{ id: uid("dec"), ...brouillon, decision: brouillon.decision.trim(), date: new Date().toLocaleDateString("fr-FR") }, ...(saved || [])]);
    // Discerner une décision est un geste de la journée : il rejoint le carnet
    // commun, dans l'ordre des questions attendu par le serveur.
    gesteFoi("decision", [brouillon.decision.trim(), brouillon.pourquoi, brouillon.craintes,
                          brouillon.remise, brouillon.dateReeval]).catch(() => {});
    toast.success(brouillon.dateReeval ? "Décision enregistrée. Elle reviendra dans « Aujourd'hui pour toi » à la date choisie." : "Décision enregistrée.");
    setB(VIDE); setSynthese(null);
  };
  const faireLePoint = (dd) => {
    const issue = window.prompt(`Où en es-tu de « ${dd.decision} » ? Qu'as-tu décidé, et avec quelle paix ?`, "");
    if (issue === null || !issue.trim()) return;
    setSaved(saved.map((x) => (x.id === dd.id ? { ...x, issue: issue.trim(), issue_le: new Date().toLocaleDateString("fr-FR") } : x)));
    toast.success("C'est noté dans ton journal.");
  };

  return (
    <Section title="Discernement" subtitle="Un journal de décision éclairé par des valeurs bibliques.">
      <Card className="mb-5 flex gap-3 border-gold/20 bg-gold/[0.05] p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" /><p className="text-sm text-offwhite/80">Cet espace t'aide à <strong>structurer ta réflexion</strong>. Il ne te dira jamais « Dieu veut que tu fasses X. » La décision, la prière et l'écoute t'appartiennent.</p></Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="space-y-3 p-6">
            <div className="flex items-center justify-between"><h3 className="font-display text-base font-bold text-offwhite">Ma décision</h3>{brouillon.decision && <span className="text-[11px] text-offwhite/45">Brouillon enregistré</span>}</div>
            <div><label className="text-xs text-offwhite/50">Décision envisagée</label><Input value={brouillon.decision} onChange={(e) => maj({ decision: e.target.value })} placeholder="ex : Embaucher un premier salarié" className="mt-1" data-testid="mafoi-decision" /></div>
            <div><label className="text-xs text-offwhite/50">Pourquoi ?</label><Textarea value={brouillon.pourquoi} onChange={(e) => maj({ pourquoi: e.target.value })} placeholder="Les raisons qui me poussent…" className="mt-1 min-h-16" /></div>
            <div><label className="text-xs text-offwhite/50">Mes craintes</label><Textarea value={brouillon.craintes} onChange={(e) => maj({ craintes: e.target.value })} placeholder="Ce qui me fait hésiter…" className="mt-1 min-h-16" /></div>
          </Card>
          <Card className="p-6"><h3 className="font-display text-base font-bold text-offwhite">Valeurs bibliques à examiner</h3><div className="mt-3 flex flex-wrap gap-2">{valeursBibliques.map((v) => <button key={v} onClick={() => toggleVal(v)} className={`rounded-full border px-3 py-1.5 text-sm transition ${brouillon.valeurs.includes(v) ? "border-gold/40 bg-gold/15 text-gold" : "border-white/10 bg-white/[0.03] text-offwhite/60 hover:text-offwhite"}`}>{v}</button>)}</div></Card>
          <Card className="space-y-3 p-6">
            <div><label className="text-xs text-offwhite/50">Ce que je veux remettre à Dieu</label><Textarea value={brouillon.remise} onChange={(e) => maj({ remise: e.target.value })} placeholder="Ce que je choisis de confier…" className="mt-1 min-h-16" /></div>
            <div><label className="flex items-center gap-1.5 text-xs text-offwhite/50"><CalendarClock className="h-3.5 w-3.5" /> Date de réévaluation</label><Input type="date" value={brouillon.dateReeval} onChange={(e) => maj({ dateReeval: e.target.value })} className="mt-1" /><p className="mt-1 text-[11px] text-offwhite/40">Ce jour-là, la décision revient dans « Aujourd'hui pour toi ».</p></div>
            <div className="flex flex-wrap gap-2 pt-1"><GoldBtn onClick={structurer}><ListChecks className="h-4 w-4" /> Mettre en forme</GoldBtn><GhostBtn onClick={saveDecision} data-testid="mafoi-decision-enregistrer"><Check className="h-4 w-4" /> Enregistrer dans mon journal</GhostBtn></div>
          </Card>
        </div>
        <div className="space-y-4">
          {synthese && (
            <Card className="border-gold/20 bg-gold/[0.05] p-6 animate-fade-up">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-offwhite"><ListChecks className="h-4 w-4 text-gold" /> Ta réflexion, mise en forme</h3>
              <p className="mt-1 text-sm text-offwhite/60">{synthese.intro}</p>
              <div className="mt-4 space-y-2 text-sm">{synthese.elements.map((el, i) => <div key={i} className="flex gap-2"><span className="text-gold">•</span><span className="text-offwhite/85">{el}</span></div>)}</div>
              <div className="mt-4"><div className="mb-1.5 text-xs uppercase tracking-wide text-gold/80">Questions à approfondir dans la prière</div><div className="space-y-1.5">{synthese.questions.map((q, i) => <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-offwhite/85">{q}</div>)}</div></div>
              <p className="mt-3 border-t border-white/10 pt-3 text-xs italic text-offwhite/50">{synthese.disclaimer}</p>
            </Card>
          )}
          <Card className="p-6"><h3 className="font-display text-base font-bold text-offwhite">Mon journal de décisions</h3>
            <div className="mt-3 space-y-2" data-testid="mafoi-journal-decisions">{!(saved || []).length && <p className="text-sm text-offwhite/50">Tes décisions enregistrées apparaîtront ici, avec leur date de réévaluation.</p>}{(saved || []).map((dd) => {
              const aFaire = dd.dateReeval && dd.dateReeval <= aujourdhui && !dd.issue;
              return (
                <div key={dd.id} className={`rounded-xl border p-3 ${aFaire ? "border-gold/40 bg-gold/[0.07]" : "border-white/10 bg-white/[0.03]"}`}>
                  <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-offwhite">{dd.decision}</span><span className="shrink-0 text-[11px] text-offwhite/40">{dd.date}</span></div>
                  {dd.pourquoi && <p className="mt-1 text-xs text-offwhite/60"><b className="font-medium text-offwhite/70">Pourquoi :</b> {dd.pourquoi}</p>}
                  {dd.craintes && <p className="mt-0.5 text-xs text-offwhite/60"><b className="font-medium text-offwhite/70">Craintes :</b> {dd.craintes}</p>}
                  {dd.remise && <p className="mt-0.5 text-xs text-offwhite/60"><b className="font-medium text-offwhite/70">Remis à Dieu :</b> {dd.remise}</p>}
                  {dd.valeurs?.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{dd.valeurs.map((v) => <span key={v} className="rounded-full border border-gold/30 px-2 py-0.5 text-[10px] text-gold">{v}</span>)}</div>}
                  {dd.issue ? <p className="mt-2 rounded-lg bg-emerald-400/10 px-2.5 py-1.5 text-xs text-emerald-200">Le {dd.issue_le} : {dd.issue}</p>
                    : dd.dateReeval && <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-offwhite/45"><CalendarClock className="h-3 w-3" /> Réévaluer le {new Date(dd.dateReeval).toLocaleDateString("fr-FR")}{aFaire && <button onClick={() => faireLePoint(dd)} className="ml-auto rounded-lg bg-gold px-2.5 py-1 text-[11px] font-semibold text-navy-900">Faire le point</button>}</div>}
                </div>
              );
            })}</div>
          </Card>
        </div>
      </div>
    </Section>
  );
}

/* ─── CERCLE ─── */
function Cercle() {
  const [cat, setCat] = useState("all");
  const cercle = useFoiPosts("cercle", cat);
  const posts = cercle.items || [];
  const [text, setText] = useState("");
  const [postCat, setPostCat] = useState("foi-travail");
  const [anonyme, setAnonyme] = useState(false);
  const [replyOpen, setReplyOpen] = useState({});
  const [replyText, setReplyText] = useState({});
  const filtered = posts;
  const publish = async () => { if (!text.trim()) return; if (await cercle.publier(text.trim(), { categorie: postCat, anonyme })) { setText(""); toast.success("Message publié dans le Cercle."); } };
  const encourage = (id) => cercle.soutenir(id);
  const sendReply = async (id) => { const t = (replyText[id] || "").trim(); if (!t) return; if (await cercle.repondre(id, t)) setReplyText({ ...replyText, [id]: "" }); };
  const catOf = (id) => cercleCategories.find((c) => c.id === id);

  return (
    <Section title="Le Cercle" subtitle="Une communauté de bâtisseurs : prière, questions, témoignages, entraide.">
      <Card className="mb-4 flex flex-wrap items-center gap-3 border-gold/20 bg-gold/[0.05] p-4">
        <Sparkles className="h-5 w-5 text-gold" />
        <div className="flex-1"><p className="text-sm font-medium text-offwhite">Le Cercle des bâtisseurs — par {association.nom}</p><p className="text-xs text-offwhite/55">{association.pitch}</p></div>
        <SustainLink label="Découvrir TheSustain" />
      </Card>
      <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button onClick={() => setCat("all")} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm border ${cat === "all" ? "border-gold/40 bg-white/10 text-offwhite" : "border-white/10 bg-white/[0.03] text-offwhite/60"}`}>Tout</button>
        {cercleCategories.map((c) => <button key={c.id} onClick={() => setCat(c.id)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm border ${cat === c.id ? "border-gold/40 bg-white/10 text-offwhite" : "border-white/10 bg-white/[0.03] text-offwhite/60"}`}>{c.emoji} {c.label}</button>)}
      </div>
      <Card className="mb-4 p-5">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Partage une situation, une question, un témoignage…" className="min-h-20" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">{cercleCategories.map((c) => <button key={c.id} onClick={() => setPostCat(c.id)} className={`rounded-full border px-2.5 py-1 text-xs ${postCat === c.id ? "border-gold/40 bg-gold/15 text-gold" : "border-white/10 bg-white/[0.03] text-offwhite/60"}`}>{c.emoji} {c.label}</button>)}</div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1.5 text-xs text-offwhite/60"><input type="checkbox" checked={anonyme} onChange={(e) => setAnonyme(e.target.checked)} /> Anonyme</label>
            <GoldBtn onClick={publish}><Send className="h-4 w-4" /> Publier</GoldBtn>
          </div>
        </div>
      </Card>
      {cercle.items === null && <div className="flex items-center gap-2 text-sm text-offwhite/55"><Loader2 className="h-4 w-4 animate-spin" /> Chargement du Cercle…</div>}
      {cercle.items?.length === 0 && <Card className="p-6 text-center text-sm text-offwhite/60" data-testid="mafoi-cercle-vide">Aucun message ici pour l'instant. Lance la conversation : une question, un témoignage, une demande d'entraide.</Card>}
      <div className="space-y-3">{filtered.map((p) => { const c = catOf(p.category); return (
        <Card key={p.id} className="p-5">
          <div className="mb-2 flex items-center gap-2"><span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-offwhite/60">{c?.emoji} {c?.label}</span><span className="text-[11px] text-offwhite/45">{p.mine ? `${p.author} (toi)` : p.author} · {ilYa(p.created_at)}</span>{p.can_delete ? <button onClick={() => cercle.supprimer(p.id)} className="ml-auto text-offwhite/40 hover:text-rose-300" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button> : <span className="ml-auto"><SignalerBtn onClick={() => cercle.signaler(p.id)} /></span>}</div>
          <p className="text-sm leading-relaxed text-offwhite/90">{p.text}</p>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={() => encourage(p.id)} className={`inline-flex items-center gap-1.5 text-sm ${p.mine_support ? "text-gold" : "text-offwhite/55 hover:text-offwhite"}`}><Heart className={`h-4 w-4 ${p.mine_support ? "fill-current" : ""}`} /> {p.count}</button>
            <button onClick={() => setReplyOpen({ ...replyOpen, [p.id]: !replyOpen[p.id] })} className="inline-flex items-center gap-1.5 text-sm text-offwhite/55 hover:text-offwhite"><MessageCircle className="h-4 w-4" /> Répondre {p.replies.length > 0 && `(${p.replies.length})`}</button>
          </div>
          {(p.replies.length > 0 || replyOpen[p.id]) && (
            <div className="mt-3 space-y-2 border-l-2 border-white/10 pl-3">
              {p.replies.map((r) => <div key={r.id} className="text-sm"><span className="font-medium text-offwhite">{r.mine ? `${r.author} (toi)` : r.author}</span>{r.can_delete && <button onClick={() => cercle.supprimerReponse(p.id, r.id)} className="ml-2 text-offwhite/35 hover:text-rose-300" aria-label="Supprimer la réponse"><Trash2 className="inline h-3 w-3" /></button>}<span className="ml-2 rounded-full border border-white/15 px-1.5 py-0.5 text-[9px] text-offwhite/55">{r.kind}</span><p className="mt-0.5 text-offwhite/75">{r.text}</p></div>)}
              {replyOpen[p.id] && <div className="flex gap-2 pt-1"><Input value={replyText[p.id] || ""} onChange={(e) => setReplyText({ ...replyText, [p.id]: e.target.value })} onKeyDown={(e) => e.key === "Enter" && sendReply(p.id)} placeholder="Encourager, prier, partager…" /><GoldBtn onClick={() => sendReply(p.id)}><Send className="h-4 w-4" /></GoldBtn></div>}
            </div>
          )}
        </Card>
      ); })}</div>
    </Section>
  );
}

/* ─── REPOS & SABBAT ─── */
const semaineISO = (d = new Date()) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const j = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - j);
  const debut = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-S${String(Math.ceil(((t - debut) / 86400000 + 1) / 7)).padStart(2, "0")}`;
};
function Repos() {
  const [i, setI] = useState(0);
  const [etat, setEtat] = useLocal("sabbat_checks", {});
  const semaine = semaineISO();
  // Chaque semaine repart de zéro (avant : cochée une fois, la liste restait cochée pour toujours).
  const courant = etat && etat.semaine === semaine ? etat : { semaine, checks: {}, serie: etat?.serie || 0, derniere_complete: etat?.derniere_complete || null };
  const checks = courant.checks || {};
  const p = psaumes[i];
  const total = sabbat.engagements.length;
  const toggle = (idx) => {
    const n = { ...checks, [idx]: !checks[idx] };
    const complete = sabbat.engagements.every((_, k) => n[k]);
    let { serie, derniere_complete: derniere } = courant;
    if (complete && derniere !== semaine) {
      serie = derniere === semaineISO(new Date(Date.now() - 7 * 86400000)) ? (serie || 0) + 1 : 1;
      derniere = semaine;
      toast.success("Ton temps de repos de la semaine est tenu.");
    }
    setEtat({ semaine, checks: n, serie, derniere_complete: derniere });
  };
  const faits = sabbat.engagements.filter((_, k) => checks[k]).length;
  return (
    <Section title="Repos & Sabbat" subtitle="Pauses Psaumes et rythme de repos, contre l'épuisement de l'entrepreneur.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-offwhite"><Wind className="h-4 w-4 text-gold" /> Pause Psaume</h3>
          <div className="mx-auto my-5 flex h-20 w-20 items-center justify-center rounded-full bg-gold/15 animate-pulse-glow"><Feather className="h-7 w-7 text-gold" /></div>
          <p className="text-center font-display text-xl leading-snug text-offwhite">{p.text}</p>
          <p className="mt-2 text-center text-sm text-gold">— {p.ref}</p>
          <div className="mt-5 flex justify-center gap-2"><GhostBtn onClick={() => setI((i - 1 + psaumes.length) % psaumes.length)}>Précédent</GhostBtn><GoldBtn onClick={() => setI((i + 1) % psaumes.length)}>Psaume suivant <ArrowRight className="h-4 w-4" /></GoldBtn></div>
        </Card>
        <Card className="p-6" data-testid="mafoi-sabbat">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-offwhite"><Moon className="h-4 w-4 text-gold" /> Mon Sabbat cette semaine</h3>
            <span className="text-xs text-offwhite/50">{faits}/{total}</span>
          </div>
          <p className="mt-2 text-sm text-offwhite/65">{sabbat.intro}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gold transition-all" style={{ width: `${(faits / total) * 100}%` }} /></div>
          <div className="mt-4 space-y-2">{sabbat.engagements.map((e, idx) => (
            <button key={idx} onClick={() => toggle(idx)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-sm text-offwhite/85">
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checks[idx] ? "border-gold bg-gold text-navy-900" : "border-white/25"}`}>{checks[idx] && <Check className="h-3.5 w-3.5" />}</span>
              <span className={checks[idx] ? "text-offwhite" : ""}>{e}</span>
            </button>
          ))}</div>
          {courant.serie > 1 && <p className="mt-3 text-xs text-offwhite/55">Tu as pris ce temps de repos {courant.serie} semaines de suite.</p>}
          <p className="mt-2 text-[11px] text-offwhite/40">La liste repart à zéro chaque lundi.</p>
          <div className="mt-4 rounded-xl border border-gold/20 bg-gold/[0.06] p-3 text-sm"><span className="italic text-offwhite/80">{sabbat.verse.text}</span><div className="mt-1 text-[11px] text-gold">— {sabbat.verse.ref}</div></div>
        </Card>
      </div>
    </Section>
  );
}

/* ─── ROOT ─── */
export default function MaFoiApp({ initialView = "hub", onActiver, onRefuser, onDesactiver, activation = false }) {
  const [view, setView] = useState(initialView);
  const go = (v) => { setView(v); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); };
  useEffect(() => { if (view === "priere" || view === "cercle") fetchFoiPourMoi(true).catch(() => {}); }, [view]);

  if (view === "choice") {
    return <Choice enCours={activation} onActivate={onActiver} onSkip={onRefuser} />;
  }

  return (
    <div>
      {view !== "hub" && (
        <div className="mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button onClick={() => go("hub")} className="shrink-0 inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-offwhite/60 hover:text-offwhite"><ArrowLeft className="mr-1.5 h-4 w-4" /> Ma Foi</button>
          {ORDRE_NAV.map((id) => modules.find((m) => m.id === id)).filter(Boolean).map((m) => { const Icon = ICONS[m.id]; return <button key={m.id} onClick={() => go(m.id)} data-testid={`mafoi-nav-${m.id}`} className={`shrink-0 inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 py-1.5 text-sm border ${view === m.id ? "border-gold/50 bg-gold/15 font-semibold text-gold" : "border-white/10 bg-white/[0.03] text-offwhite/60 hover:text-offwhite"}`}><Icon className="h-3.5 w-3.5" /> {m.title}</button>; })}
        </div>
      )}
      {view === "hub" && <Hub go={go} />}
      {view === "sagesse" && <Sagesse />}
      {view === "priere" && <Priere />}
      {view === "parcours" && <Parcours />}
      {view === "lecture" && <LectureBiblique />}
      {view === "memoire" && <Memoire />}
      {view === "discernement" && <Discernement />}
      {view === "cercle" && <Cercle />}
      {view === "repos" && <Repos />}

      <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-offwhite/50 sm:flex-row">
        <span className="inline-flex items-center gap-2">Ma Foi, une expérience <button onClick={openSustain} className="font-medium text-gold hover:text-gold-hover">TheSustain</button> dans Zayado</span>
        <div className="flex flex-wrap items-center gap-3">
          {onDesactiver && <button onClick={onDesactiver} className="inline-flex items-center gap-1.5 text-xs text-offwhite/45 hover:text-rose-300" data-testid="mafoi-desactiver"><Power className="h-3.5 w-3.5" /> Retirer Ma Foi</button>}
        </div>
      </div>
    </div>
  );
}
