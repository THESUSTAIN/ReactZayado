import React, { useState } from "react";
import { toast } from "sonner";
import {
  BookOpen, HandHeart, Compass, Users, ShieldCheck, Sparkles, ArrowLeft, ArrowRight,
  ArrowUpRight, Heart, Plus, Check, Wind, Quote, MessageCircle, Send, Bot, CalendarClock,
  Star, ChevronRight, Target, Moon, Feather, Cloud, ScrollText,
} from "lucide-react";
import {
  modules, sagesse, prayerWallSeed, prayerPrompts, parcours, valeursBibliques,
  buildDiscernementSynthese, cercleCategories, cercleSeed, THESUSTAIN_URL,
  dechargePrompts, dechargeVersets, psaumes, sabbat, association, versetsLecture,
} from "./thesustainData";
import { useLocal, uid, setMaFoiActive } from "./store";
import { AideMemoire } from "./MemoireAide";

const ICONS = { sagesse: BookOpen, priere: HandHeart, parcours: Compass, discernement: ShieldCheck, cercle: Users, repos: Moon, lecture: ScrollText };
const openSustain = () => { toast("Prototype : ouverture de TheSustain."); window.open(THESUSTAIN_URL, "_blank"); };

const Card = ({ className = "", children }) => (
  <div className={`rounded-2xl border border-white/10 bg-white/[0.04] ${className}`}>{children}</div>
);
const GoldBtn = ({ onClick, children, className = "" }) => (
  <button onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-gold-hover ${className}`}>{children}</button>
);
const GhostBtn = ({ onClick, children, className = "" }) => (
  <button onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-offwhite transition hover:bg-white/10 ${className}`}>{children}</button>
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

/* ─── CHOICE (première visite) ─── */
function Choice({ onActivate, onSkip }) {
  const opts = [
    { id: "pilotage", emoji: "📊", label: "Pilotage de mon activité", faith: false },
    { id: "equilibre", emoji: "⚡", label: "Équilibre & énergie", faith: false },
    { id: "foi", emoji: "✝️", label: "Foi chrétienne", faith: true },
    { id: "tout", emoji: "✨", label: "Tout", faith: true },
  ];
  return (
    <div className="mx-auto max-w-2xl animate-fade-up py-6 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-2xl">✝️</div>
      <h1 className="font-display text-3xl font-extrabold text-offwhite">Qu'aimeriez-vous intégrer à votre expérience ?</h1>
      <p className="mt-2 text-sm text-offwhite/60">Zayado s'adapte à vous. La dimension « Ma Foi » est optionnelle, proposée par TheSustain.</p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {opts.map((o) => (
          <button key={o.id} onClick={() => (o.faith ? onActivate() : onSkip())}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-gold/40 hover:bg-white/[0.07]">
            <span className="text-2xl">{o.emoji}</span>
            <span className="font-medium text-offwhite">{o.label}</span>
            {o.faith && <span className="ml-auto rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">active Ma Foi</span>}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-offwhite/40">Vous pourrez changer d'avis à tout moment.</p>
    </div>
  );
}

/* ─── HUB ─── */
function Hub({ go }) {
  return (
    <div className="animate-fade-up">
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[11px] font-semibold text-gold">✝️ par TheSustain</span>
          <h1 className="mt-3 font-display text-4xl font-extrabold text-offwhite sm:text-5xl">Ma Foi</h1>
          <p className="mt-3 text-offwhite/75">Une dimension spirituelle pour les entrepreneurs qui souhaitent intégrer leur foi, leurs valeurs et leur recherche de sens dans leur parcours professionnel.</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <GoldBtn onClick={() => go("sagesse")}>Commencer par la Sagesse <ArrowRight className="h-4 w-4" /></GoldBtn>
            <GhostBtn onClick={openSustain}>Découvrir TheSustain</GhostBtn>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => {
          const Icon = ICONS[m.id];
          return (
            <button key={m.id} onClick={() => go(m.id)} className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-left transition hover:border-gold/40 hover:bg-white/[0.07]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-gold/10 text-gold"><Icon className="h-5 w-5" /></div>
                <span className="text-lg">{m.emoji}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-offwhite">{m.title}</h3>
              <p className="mt-1 text-sm text-offwhite/60">{m.tagline}</p>
              <span className="mt-3 inline-flex items-center text-sm text-gold">Ouvrir <ChevronRight className="ml-0.5 h-4 w-4 transition group-hover:translate-x-0.5" /></span>
            </button>
          );
        })}
      </div>

      <Card className="mt-6 p-6">
        <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto_1fr]">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-offwhite/45">Porte d'entrée</p>
            <p className="mt-1 font-display text-lg font-bold text-offwhite">Zayado</p>
            <p className="text-sm text-offwhite/55">L'application de l'entrepreneur. Ma Foi y est un point d'accès optionnel.</p>
          </div>
          <div className="hidden flex-col items-center text-offwhite/40 sm:flex"><ArrowRight className="h-5 w-5" /><span className="mt-1 text-[10px] uppercase tracking-widest">via API</span></div>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-offwhite/45">Moteur & propriétaire du contenu</p>
            <p className="mt-1 font-display text-lg font-bold text-gold">TheSustain</p>
            <p className="text-sm text-offwhite/55">Contenus chrétiens, prière, parcours, communauté. L'expérience appartient à TheSustain.</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-center gap-2 border-t border-white/10 pt-4 text-xs text-offwhite/50"><Sparkles className="h-3.5 w-3.5 text-gold" /> Powered by TheSustain</div>
      </Card>
    </div>
  );
}

/* ─── SAGESSE ─── */
function Sagesse() {
  const [application, setApplication] = useLocal("sagesse_application", "");
  const [medOpen, setMedOpen] = useState(false);
  return (
    <Section title="Sagesse" subtitle="Une pause pour nourrir votre foi et donner du sens à votre quotidien.">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-6">
            <span className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[11px] font-semibold text-gold">Thème du jour · {sagesse.theme}</span>
            <Quote className="mt-3 h-6 w-6 text-gold/70" />
            <p className="mt-1 font-display text-2xl leading-snug text-offwhite">{sagesse.verse}</p>
            <p className="mt-3 text-sm font-medium text-gold">— {sagesse.reference}</p>
            <AideMemoire className="mt-4" verset={{ text: sagesse.verse, ref: sagesse.reference }} />
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold text-offwhite"><Wind className="h-4 w-4 text-gold" /> Méditation — 3 min</h3>
              <GoldBtn onClick={() => setMedOpen(!medOpen)}>{medOpen ? "Fermer" : "Commencer"}</GoldBtn>
            </div>
            {medOpen ? (
              <div className="mt-4">
                <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gold/15 animate-pulse-glow"><Wind className="h-8 w-8 text-gold" /></div>
                <div className="space-y-2 text-sm leading-relaxed text-offwhite/80">{sagesse.meditation.map((p, i) => <p key={i}>{p}</p>)}</div>
              </div>
            ) : <p className="mt-2 text-sm text-offwhite/55">Un temps guidé pour respirer et laisser ce thème descendre du mental vers le cœur.</p>}
          </Card>
          <Card className="p-6">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-offwhite"><Target className="h-4 w-4 text-gold" /> Application dans mon activité</h3>
            <p className="mt-1 text-sm text-offwhite/55">{sagesse.applicationPrompt}</p>
            <Textarea value={application} onChange={(e) => setApplication(e.target.value)} placeholder="Écrivez comment mettre ce thème en pratique cette semaine…" className="mt-3 min-h-24" />
            <div className="mt-2 flex justify-end"><GhostBtn onClick={() => toast.success("Réflexion enregistrée.")}><Check className="h-4 w-4" /> Enregistrer</GhostBtn></div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="p-6"><h3 className="flex items-center gap-2 font-display text-base font-bold text-offwhite"><HandHeart className="h-4 w-4 text-gold" /> Prière du jour</h3><p className="mt-2 text-sm italic leading-relaxed text-offwhite/80">{sagesse.prayer}</p></Card>
          <Card className="p-6"><h3 className="flex items-center gap-2 font-display text-base font-bold text-offwhite"><Sparkles className="h-4 w-4 text-gold" /> Question de réflexion</h3><p className="mt-2 text-sm leading-relaxed text-offwhite/80">{sagesse.reflectionQuestion}</p></Card>
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
  const v = versetsLecture[i % versetsLecture.length];
  const estFavori = favoris.some((f) => f.ref === v.ref);
  const toggleFavori = () => setFavoris(estFavori ? favoris.filter((f) => f.ref !== v.ref) : [{ ...v }, ...favoris]);

  return (
    <Section title="Lecture biblique" subtitle="Un verset à la fois. Prenez le temps de le lire, puis utilisez l'aide à la mémoire pour le retenir.">
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
  const [saved, setSaved] = useLocal("priere_saved", []);
  const [wall, setWall] = useLocal("priere_wall", prayerWallSeed);
  const [decharges, setDecharges] = useLocal("priere_decharges", []);
  const [newInt, setNewInt] = useState("");
  const [wallText, setWallText] = useState("");
  const [dechargeText, setDechargeText] = useState("");

  const addIntention = () => { if (!newInt.trim()) return; setIntentions([{ id: uid("int"), text: newInt.trim() }, ...intentions]); setNewInt(""); };
  const savePrayer = () => { if (!personal.trim()) return; setSaved([{ id: uid("pr"), text: personal.trim(), date: new Date().toLocaleDateString("fr-FR") }, ...saved]); toast.success("Prière enregistrée."); };
  const postWall = () => { if (!wallText.trim()) return; setWall([{ id: uid("pw"), author: "Vous", text: wallText.trim(), prayingCount: 0, iPrayed: false, time: "à l'instant" }, ...wall]); setWallText(""); toast.success("Publié sur le mur de prière."); };
  const prayFor = (id) => setWall(wall.map((p) => p.id === id ? { ...p, iPrayed: !p.iPrayed, prayingCount: p.prayingCount + (p.iPrayed ? -1 : 1) } : p));
  const deposer = () => { if (!dechargeText.trim()) return; const v = dechargeVersets[Math.floor(Math.random() * dechargeVersets.length)]; setDecharges([{ id: uid("dc"), text: dechargeText.trim(), remis: false, verset: v }, ...decharges]); setDechargeText(""); };
  const remettre = (id) => { setDecharges(decharges.map((x) => x.id === id ? { ...x, remis: true } : x)); toast.success("Remis entre les mains de Dieu 🙏"); };

  const Tab = ({ id, children }) => <button onClick={() => setTab(id)} className={`rounded-xl px-4 py-2 text-sm font-medium transition ${tab === id ? "bg-white text-navy-900" : "text-offwhite/60 hover:text-offwhite"}`}>{children}</button>;

  return (
    <Section title="Ma prière" subtitle="Prière personnelle, intentions, mur de prière et mur des décharges.">
      <div className="mb-4 inline-flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        <Tab id="perso">🙏 Ma prière</Tab><Tab id="mur">🧱 Mur de prière</Tab><Tab id="decharges">🍃 Mur des décharges</Tab>
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
            <div className="mt-4 space-y-2">{intentions.map((it) => <div key={it.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-offwhite"><span>{it.text}</span><button onClick={() => setIntentions(intentions.filter((x) => x.id !== it.id))} className="text-xs text-offwhite/45 hover:text-gold">Répondu</button></div>)}</div>
          </Card>
        </div>
      )}

      {tab === "mur" && (
        <div>
          <Card className="mb-4 p-5"><Textarea value={wallText} onChange={(e) => setWallText(e.target.value)} placeholder="Priez pour mon lancement d'entreprise cette semaine…" className="min-h-20" /><div className="mt-2 flex justify-end"><GoldBtn onClick={postWall}><Send className="h-4 w-4" /> Publier</GoldBtn></div></Card>
          <div className="space-y-3">{wall.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="text-sm font-medium text-offwhite">{p.author} <span className="text-[11px] font-normal text-offwhite/40">· {p.time}</span></div>
              <p className="mt-1.5 text-sm leading-relaxed text-offwhite/80">{p.text}</p>
              <div className="mt-3 flex items-center gap-3">
                <button onClick={() => prayFor(p.id)} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm ${p.iPrayed ? "bg-gold text-navy-900" : "border border-white/15 bg-white/5 text-offwhite hover:bg-white/10"}`}><HandHeart className="h-4 w-4" /> {p.iPrayed ? "Je prie pour toi ✓" : "Je prie pour toi"}</button>
                <span className="text-xs text-offwhite/45">{p.prayingCount} personne(s) prient</span>
              </div>
            </Card>
          ))}</div>
        </div>
      )}

      {tab === "decharges" && (
        <div>
          <Card className="mb-4 p-5">
            <p className="text-sm text-offwhite/70">Déposez ici un fardeau, puis remettez-le symboliquement à Dieu. « Jetez sur lui tous vos soucis. »</p>
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
  const toggleDay = (pid, day) => { const cur = done(pid); const next = cur.includes(day) ? cur.filter((x) => x !== day) : [...cur, day]; setProgress({ ...progress, [pid]: next }); if (!cur.includes(day)) toast.success(`Jour ${day} accompli 🎯`); };
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
  const [decision, setDecision] = useState("");
  const [pourquoi, setPourquoi] = useState("");
  const [craintes, setCraintes] = useState("");
  const [remise, setRemise] = useState("");
  const [dateReeval, setDateReeval] = useState("");
  const [valeurs, setValeurs] = useState([]);
  const [synthese, setSynthese] = useState(null);
  const [saved, setSaved] = useLocal("discernement_saved", []);
  const toggleVal = (v) => setValeurs((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  const structurer = () => { if (!decision.trim() && valeurs.length === 0) { toast.error("Décrivez la décision ou choisissez des valeurs."); return; } setSynthese(buildDiscernementSynthese({ decision: decision.trim(), valeurs, craintes: craintes.trim() })); };
  const saveDecision = () => { if (!decision.trim()) { toast.error("Ajoutez la décision envisagée."); return; } setSaved([{ id: uid("dec"), decision, valeurs, dateReeval, date: new Date().toLocaleDateString("fr-FR") }, ...saved]); toast.success("Décision enregistrée."); setDecision(""); setPourquoi(""); setCraintes(""); setRemise(""); setDateReeval(""); setValeurs([]); setSynthese(null); };

  return (
    <Section title="Discernement" subtitle="Un journal de décision éclairé par des valeurs bibliques.">
      <Card className="mb-5 flex gap-3 border-gold/20 bg-gold/[0.05] p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" /><p className="text-sm text-offwhite/80">Cet espace vous aide à <strong>structurer votre réflexion</strong>. Il ne vous dira jamais « Dieu veut que tu fasses X. » La décision, la prière et l'écoute vous appartiennent.</p></Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="space-y-3 p-6">
            <h3 className="font-display text-base font-bold text-offwhite">Ma décision</h3>
            <div><label className="text-xs text-offwhite/50">Décision envisagée</label><Input value={decision} onChange={(e) => setDecision(e.target.value)} placeholder="ex : Embaucher un premier salarié" className="mt-1" /></div>
            <div><label className="text-xs text-offwhite/50">Pourquoi ?</label><Textarea value={pourquoi} onChange={(e) => setPourquoi(e.target.value)} placeholder="Les raisons qui me poussent…" className="mt-1 min-h-16" /></div>
            <div><label className="text-xs text-offwhite/50">Mes craintes</label><Textarea value={craintes} onChange={(e) => setCraintes(e.target.value)} placeholder="Ce qui me fait hésiter…" className="mt-1 min-h-16" /></div>
          </Card>
          <Card className="p-6"><h3 className="font-display text-base font-bold text-offwhite">Valeurs bibliques à examiner</h3><div className="mt-3 flex flex-wrap gap-2">{valeursBibliques.map((v) => <button key={v} onClick={() => toggleVal(v)} className={`rounded-full border px-3 py-1.5 text-sm transition ${valeurs.includes(v) ? "border-gold/40 bg-gold/15 text-gold" : "border-white/10 bg-white/[0.03] text-offwhite/60 hover:text-offwhite"}`}>{v}</button>)}</div></Card>
          <Card className="space-y-3 p-6">
            <div><label className="text-xs text-offwhite/50">Ce que je veux remettre à Dieu</label><Textarea value={remise} onChange={(e) => setRemise(e.target.value)} placeholder="Ce que je choisis de confier…" className="mt-1 min-h-16" /></div>
            <div><label className="flex items-center gap-1.5 text-xs text-offwhite/50"><CalendarClock className="h-3.5 w-3.5" /> Date de réévaluation</label><Input type="date" value={dateReeval} onChange={(e) => setDateReeval(e.target.value)} className="mt-1" /></div>
            <div className="flex flex-wrap gap-2 pt-1"><GoldBtn onClick={structurer}><Bot className="h-4 w-4" /> Structurer ma réflexion</GoldBtn><GhostBtn onClick={saveDecision}><Check className="h-4 w-4" /> Enregistrer</GhostBtn></div>
          </Card>
        </div>
        <div className="space-y-4">
          {synthese && (
            <Card className="border-gold/20 bg-gold/[0.05] p-6 animate-fade-up">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-offwhite"><Bot className="h-4 w-4 text-gold" /> Mise en forme de votre réflexion</h3>
              <p className="mt-1 text-sm text-offwhite/60">{synthese.intro}</p>
              <div className="mt-4 space-y-2 text-sm">{synthese.elements.map((el, i) => <div key={i} className="flex gap-2"><span className="text-gold">•</span><span className="text-offwhite/85">{el}</span></div>)}</div>
              <div className="mt-4"><div className="mb-1.5 text-xs uppercase tracking-wide text-gold/80">Questions à approfondir dans la prière</div><div className="space-y-1.5">{synthese.questions.map((q, i) => <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-offwhite/85">{q}</div>)}</div></div>
              <p className="mt-3 border-t border-white/10 pt-3 text-xs italic text-offwhite/50">{synthese.disclaimer}</p>
            </Card>
          )}
          <Card className="p-6"><h3 className="font-display text-base font-bold text-offwhite">Mon journal de décisions</h3>
            <div className="mt-3 space-y-2">{saved.length === 0 && <p className="text-sm text-offwhite/50">Vos décisions enregistrées apparaîtront ici, avec leur date de réévaluation.</p>}{saved.map((dd) => (
              <div key={dd.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><div className="flex items-center justify-between"><span className="text-sm font-medium text-offwhite">{dd.decision}</span><span className="text-[11px] text-offwhite/40">{dd.date}</span></div>{dd.valeurs?.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{dd.valeurs.map((v) => <span key={v} className="rounded-full border border-gold/30 px-2 py-0.5 text-[10px] text-gold">{v}</span>)}</div>}{dd.dateReeval && <div className="mt-2 flex items-center gap-1 text-[11px] text-offwhite/45"><CalendarClock className="h-3 w-3" /> Réévaluer le {new Date(dd.dateReeval).toLocaleDateString("fr-FR")}</div>}</div>
            ))}</div>
          </Card>
        </div>
      </div>
    </Section>
  );
}

/* ─── CERCLE ─── */
function Cercle() {
  const [posts, setPosts] = useLocal("cercle_posts", cercleSeed);
  const [cat, setCat] = useState("all");
  const [text, setText] = useState("");
  const [postCat, setPostCat] = useState("foi-travail");
  const [replyOpen, setReplyOpen] = useState({});
  const [replyText, setReplyText] = useState({});
  const filtered = cat === "all" ? posts : posts.filter((p) => p.category === cat);
  const publish = () => { if (!text.trim()) return; setPosts([{ id: uid("c"), category: postCat, author: "Vous", text: text.trim(), time: "à l'instant", encouragements: 0, iEncouraged: false, replies: [], aiSuggestion: null }, ...posts]); setText(""); toast.success("Message publié dans le Cercle."); };
  const encourage = (id) => setPosts(posts.map((p) => p.id === id ? { ...p, iEncouraged: !p.iEncouraged, encouragements: p.encouragements + (p.iEncouraged ? -1 : 1) } : p));
  const sendReply = (id) => { const t = (replyText[id] || "").trim(); if (!t) return; setPosts(posts.map((p) => p.id === id ? { ...p, replies: [...p.replies, { id: uid("r"), author: "Vous", text: t, kind: "encouragement" }] } : p)); setReplyText({ ...replyText, [id]: "" }); };
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
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Partagez une situation, une question, un témoignage…" className="min-h-20" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">{cercleCategories.map((c) => <button key={c.id} onClick={() => setPostCat(c.id)} className={`rounded-full border px-2.5 py-1 text-xs ${postCat === c.id ? "border-gold/40 bg-gold/15 text-gold" : "border-white/10 bg-white/[0.03] text-offwhite/60"}`}>{c.emoji} {c.label}</button>)}</div>
          <GoldBtn onClick={publish}><Send className="h-4 w-4" /> Publier</GoldBtn>
        </div>
      </Card>
      <div className="space-y-3">{filtered.map((p) => { const c = catOf(p.category); return (
        <Card key={p.id} className="p-5">
          <div className="mb-2 flex items-center gap-2"><span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-offwhite/60">{c?.emoji} {c?.label}</span><span className="text-[11px] text-offwhite/45">{p.author} · {p.time}</span></div>
          <p className="text-sm leading-relaxed text-offwhite/90">{p.text}</p>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={() => encourage(p.id)} className={`inline-flex items-center gap-1.5 text-sm ${p.iEncouraged ? "text-gold" : "text-offwhite/55 hover:text-offwhite"}`}><Heart className={`h-4 w-4 ${p.iEncouraged ? "fill-current" : ""}`} /> {p.encouragements}</button>
            <button onClick={() => setReplyOpen({ ...replyOpen, [p.id]: !replyOpen[p.id] })} className="inline-flex items-center gap-1.5 text-sm text-offwhite/55 hover:text-offwhite"><MessageCircle className="h-4 w-4" /> Répondre {p.replies.length > 0 && `(${p.replies.length})`}</button>
          </div>
          {p.aiSuggestion && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-gold/25 bg-gold/[0.06] p-3"><Bot className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><div className="text-sm"><p className="text-offwhite/85">{p.aiSuggestion}</p><button onClick={() => toast("Prototype : ouverture de MyExtension AI.")} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-gold hover:text-gold-hover">→ Analyser avec MyExtension AI <ArrowUpRight className="h-3 w-3" /></button></div></div>
          )}
          {(p.replies.length > 0 || replyOpen[p.id]) && (
            <div className="mt-3 space-y-2 border-l-2 border-white/10 pl-3">
              {p.replies.map((r) => <div key={r.id} className="text-sm"><span className="font-medium text-offwhite">{r.author}</span><span className="ml-2 rounded-full border border-white/15 px-1.5 py-0.5 text-[9px] text-offwhite/55">{r.kind}</span><p className="mt-0.5 text-offwhite/75">{r.text}</p></div>)}
              {replyOpen[p.id] && <div className="flex gap-2 pt-1"><Input value={replyText[p.id] || ""} onChange={(e) => setReplyText({ ...replyText, [p.id]: e.target.value })} onKeyDown={(e) => e.key === "Enter" && sendReply(p.id)} placeholder="Encourager, prier, partager…" /><GoldBtn onClick={() => sendReply(p.id)}><Send className="h-4 w-4" /></GoldBtn></div>}
            </div>
          )}
        </Card>
      ); })}</div>
    </Section>
  );
}

/* ─── REPOS & SABBAT ─── */
function Repos() {
  const [i, setI] = useState(0);
  const [checks, setChecks] = useLocal("sabbat_checks", {});
  const p = psaumes[i];
  const toggle = (idx) => setChecks({ ...checks, [idx]: !checks[idx] });
  return (
    <Section title="Repos & Sabbat" subtitle="Pauses Psaumes et rythme de repos, contre l'épuisement du dirigeant.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-offwhite"><Wind className="h-4 w-4 text-gold" /> Pause Psaume</h3>
          <div className="mx-auto my-5 flex h-20 w-20 items-center justify-center rounded-full bg-gold/15 animate-pulse-glow"><Feather className="h-7 w-7 text-gold" /></div>
          <p className="text-center font-display text-xl leading-snug text-offwhite">{p.text}</p>
          <p className="mt-2 text-center text-sm text-gold">— {p.ref}</p>
          <div className="mt-5 flex justify-center gap-2"><GhostBtn onClick={() => setI((i - 1 + psaumes.length) % psaumes.length)}>Précédent</GhostBtn><GoldBtn onClick={() => setI((i + 1) % psaumes.length)}>Psaume suivant <ArrowRight className="h-4 w-4" /></GoldBtn></div>
        </Card>
        <Card className="p-6">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-offwhite"><Moon className="h-4 w-4 text-gold" /> Mon Sabbat (anti burn-out)</h3>
          <p className="mt-2 text-sm text-offwhite/65">{sabbat.intro}</p>
          <div className="mt-4 space-y-2">{sabbat.engagements.map((e, idx) => (
            <button key={idx} onClick={() => toggle(idx)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-sm text-offwhite/85">
              <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${checks[idx] ? "border-gold bg-gold text-navy-900" : "border-white/25"}`}>{checks[idx] && <Check className="h-3.5 w-3.5" />}</span>
              <span className={checks[idx] ? "text-offwhite" : ""}>{e}</span>
            </button>
          ))}</div>
          <div className="mt-4 rounded-xl border border-gold/20 bg-gold/[0.06] p-3 text-sm"><span className="italic text-offwhite/80">{sabbat.verse.text}</span><div className="mt-1 text-[11px] text-gold">— {sabbat.verse.ref}</div></div>
        </Card>
      </div>
    </Section>
  );
}

/* ─── ROOT ─── */
export default function MaFoiApp({ initialView = "hub" }) {
  const [view, setView] = useState(initialView);
  const go = (v) => { setView(v); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); };

  if (view === "choice") {
    return <Choice onActivate={() => { setMaFoiActive(true); go("hub"); toast.success("Ma Foi activée ✨"); }} onSkip={() => { window.location.href = "/app"; }} />;
  }

  return (
    <div>
      {view !== "hub" && (
        <div className="mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button onClick={() => go("hub")} className="shrink-0 inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-offwhite/60 hover:text-offwhite"><ArrowLeft className="mr-1.5 h-4 w-4" /> Ma Foi</button>
          {modules.map((m) => <button key={m.id} onClick={() => go(m.id)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm border ${view === m.id ? "border-gold/40 bg-white/10 text-offwhite" : "border-white/10 bg-white/[0.03] text-offwhite/60 hover:text-offwhite"}`}>{m.emoji} {m.title}</button>)}
        </div>
      )}
      {view === "hub" && <Hub go={go} />}
      {view === "sagesse" && <Sagesse />}
      {view === "priere" && <Priere />}
      {view === "parcours" && <Parcours />}
      {view === "lecture" && <LectureBiblique />}
      {view === "discernement" && <Discernement />}
      {view === "cercle" && <Cercle />}
      {view === "repos" && <Repos />}

      <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-offwhite/50 sm:flex-row">
        <span className="inline-flex items-center gap-2">✝️ Ma Foi — une expérience <span className="font-medium text-gold">TheSustain</span> dans Zayado</span>
        <button onClick={openSustain} className="inline-flex items-center gap-1.5 hover:text-offwhite">Powered by TheSustain <ArrowUpRight className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

// Expose l'état initial : si non activé, on montre l'écran de choix.
MaFoiApp.startAtChoice = true;
