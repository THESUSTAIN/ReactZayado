import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import { ChatPanel } from "@/components/kairos/ChatAssistant";
import { EnergyCheckin } from "@/components/kairos/EnergyCheckin";
import { GlassCard } from "@/components/kairos/GlassCard";
import { RingProgress } from "@/components/kairos/RingProgress";
import { DurationChip } from "@/components/kairos/Chip";
import { useKairos } from "@/context/KairosContext";
import { GoalCountdown } from "@/components/kairos/GoalCountdown";
import PoulsBusinessWidget from "@/components/kairos/PoulsBusinessWidget";
import GamificationWidget from "@/components/kairos/GamificationWidget";
import AiFallbackBanner from "@/components/kairos/AiFallbackBanner";
import PlanEnAttenteBanner from "@/components/kairos/PlanEnAttenteBanner";
import RadarWidget from "@/components/kairos/RadarWidget";
import PratiqueDuJour from "@/components/mindset/PratiqueDuJour";
import { Ok } from "@/components/kairos/Ok";
import { useI18n } from "@/i18n";
import PinnedVisionCards from "@/components/vision/PinnedVisionCards";
import CarteEquipe from "@/components/kairos/CarteEquipe";
import { fetchPointDuJour, fetchSerie, fetchChargeTravail, ajouterVictoire, fetchCountdown } from "@/lib/kairosApi";
import { toast } from "sonner";
import {
  BatteryMedium, Check, Trophy, Target, Sparkles, TrendingUp,
  Scale, ChevronRight, Sun, Leaf, Zap, FileText, Users, Footprints, CheckSquare,
  Flame, LifeBuoy, Plus, X,
} from "lucide-react";

// L'anneau d'énergie des maquettes : grand, lisible, sans décor.
function AnneauEnergie({ valeur, vide = false }) {
  const r = 70, c = 2 * Math.PI * r;
  // Au chargement : l'anneau se remplit et le chiffre monte de 0 à la valeur (micro-animation).
  const [parti, setParti] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setParti(true), 250);
    return () => clearTimeout(t);
  }, []);
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    if (!parti || vide) return;
    const cible = Math.max(0, Math.min(100, valeur || 0));
    let ra; const t0 = performance.now();
    const boucle = (t) => {
      const p = Math.min(1, (t - t0) / 1100);
      setN(Math.round(cible * (1 - Math.pow(1 - p, 3))));
      if (p < 1) ra = requestAnimationFrame(boucle);
    };
    ra = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(ra);
  }, [parti, vide, valeur]);
  const offset = c * (1 - (parti ? Math.max(0, Math.min(1, valeur / 100)) : 0));
  return (
    <div className="relative mx-auto" style={{ width: 168, height: 168 }}>
      <svg width="168" height="168" style={{ transform: "rotate(-90deg)" }} aria-hidden>
        <circle cx="84" cy="84" r={r} stroke="rgba(255,255,255,.09)" strokeWidth="11" fill="none" />
        {!vide && (
          <circle cx="84" cy="84" r={r} stroke="#DEC2A3" strokeWidth="11" fill="none" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }} />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[40px] font-semibold leading-none">{vide ? "—" : n}</span>
        <span className="mt-1.5 text-[12px] text-offwhite/62">énergie</span>
      </div>
    </div>
  );
}

// Une carte capteur, calquée sur les grands tableaux de bord (OkyAi & co) :
// label en capitales, chiffre massif, ligne de contexte, icône en pastille
// à droite et une note colorée en bas. Le fond reste navy, l'accent est beige.
function CarteCapteur({ icon: Icone, label, valeur, sous, note, testid }) {
  const [ok, texte] = note || [null, null];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(222,194,163,0.35)]" data-testid={testid}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-offwhite/55">{label}</p>
          <p className="mt-2.5 font-display text-[30px] font-semibold leading-none text-offwhite">{valeur}</p>
          <p className="mt-2.5 text-[12.5px] leading-snug text-offwhite/45">{sous}</p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/[0.07] text-offwhite/70" aria-hidden>
          <Icone size={19} />
        </span>
      </div>
      {texte ? (
        <p className={`mt-3 flex items-center gap-1.5 text-[12px] font-semibold ${ok ? "text-emerald-300" : "text-gold"}`}>
          <TrendingUp size={12} /> {texte}
        </p>
      ) : null}
    </div>
  );
}

export default function Cockpit() {
  const { user, energy, priorities, goal, victory, mode, modeInfo, isRecovery, aCheckin, refresh } = useKairos();
  const [nouvelleVictoire, setNouvelleVictoire] = useState("");
  const [victoireEnvoi, setVictoireEnvoi] = useState(false);
  const [victoireOuverte, setVictoireOuverte] = useState(false);
  const noterVictoire = async (e) => {
    e.preventDefault();
    const texte = nouvelleVictoire.trim();
    if (texte.length < 2) return;
    setVictoireEnvoi(true);
    try { await ajouterVictoire(texte); setNouvelleVictoire(""); setVictoireOuverte(false); await refresh(); toast.success("Victoire notée 🏆"); }
    catch (err) { toast.error(err?.detail || "Connecte-toi pour noter tes victoires."); }
    setVictoireEnvoi(false);
  };
  const { t } = useI18n();
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [serie, setSerie] = useState(null);
  useEffect(() => { fetchSerie().then(setSerie).catch(() => {}); }, [aCheckin]);
  // Le cap à 3 ans est lu ici, et pas seulement dans sa propre carte : sans
  // cette information, l'accueil affichait DEUX cartes vides côte à côte
  // (« Pas encore d'objectif à 90 jours » et « Définir mon objectif »), deux
  // boutons pour la même décision. On ne peut pas le savoir sans le demander.
  const [capLong, setCapLong] = useState(undefined);
  useEffect(() => { fetchCountdown().then((r) => setCapLong(r?.titre || null)).catch(() => setCapLong(null)); }, []);
  const navigate = useNavigate();

  const energyPercent = (energy.score / 5) * 100;
  const doneCount = priorities.filter((p) => p.done).length;
  const focusPriority = priorities.find((p) => !p.done) || priorities[0];
  const dateDuJour = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen">
      <Sidebar />
      <ChatPanel />

      <div className="lg:pl-[92px] xl:pr-[var(--chat-w,360px)] transition-[padding] duration-200">
        <Header />

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          {/* ── EN-TÊTE — surlignage daté, titre serif. Avant : une étiquette en
                 capitales et un titre extra-gras, sans rapport avec la typographie
                 des maquettes. Le titre dit bonjour, la date situe la journée. ── */}
          <div className="mb-7 animate-fade-up">
            <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-gold">{dateDuJour}</p>
            <h1 className="mt-2 font-display text-[30px] font-semibold leading-tight sm:text-[40px]">
              Bonjour, {user.firstName}.
            </h1>
          </div>

          <PlanEnAttenteBanner />

          {isRecovery ? (
            <RecoveryLayout modeInfo={modeInfo} priority={focusPriority} energyPercent={energyPercent} energyScore={energy.score} />
          ) : (
            <>
              {/* Aujourd'hui, allégé : 5 blocs au lieu de 13. L'équilibre pro/perso, la tendance
                  d'énergie et la pratique mindset vivent dans Bien-être ; l'impact 7 jours est
                  résumé dans « Ta semaine ». */}
              <div className="mb-5 animate-fade-up"><AiFallbackBanner /></div>

              {/* ── LE HERO : une seule chose à faire, et l'état qui dit si c'est
                     tenable. Les deux étaient séparés — une carte « Énergie » d'un
                     côté, une liste de priorités de l'autre — alors que c'est leur
                     rapprochement qui fait la décision du matin. ── */}
              <Ok or className="mb-5 animate-fade-up" data-testid="cockpit-hero">
                <div className="flex flex-col gap-8 p-1 sm:flex-row sm:items-center sm:gap-12 sm:p-3">
                  <div className="min-w-0 flex-1">
                    <p className="ok-lab">Ta seule priorité aujourd'hui</p>
                    {focusPriority ? (
                      <>
                        <h2 className="mt-3 font-display text-[24px] font-semibold leading-[1.26] sm:text-[30px]" data-testid="cockpit-hero-titre">
                          {focusPriority.title}
                        </h2>
                        <p className="mt-3 text-[14px] text-offwhite/62">
                          {focusPriority.duration ? `${focusPriority.duration} minutes suffisent. ` : ""}
                          {doneCount > 0 ? `${doneCount} sur ${priorities.length} déjà accomplie${doneCount > 1 ? "s" : ""}.` : "Le reste peut attendre demain."}
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                          <button onClick={() => navigate("/app/actions?tab=actions")} data-testid="cockpit-hero-commencer"
                            className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-navy-900 hover:bg-gold-hover">Commencer</button>
                          <button onClick={() => navigate("/app/bien-etre")}
                            className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-offwhite/70 hover:text-offwhite">
                            Alléger ma journée
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <h2 className="mt-3 font-display text-[24px] font-semibold leading-[1.26] sm:text-[28px]">Rien de décidé pour aujourd'hui.</h2>
                        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-offwhite/62">
                          Choisis une action qui compte vraiment — une seule suffit. Elle s'affichera ici chaque matin.
                        </p>
                        <button onClick={() => navigate("/app/actions")} data-testid="priorities-add"
                          className="mt-6 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-navy-900 hover:bg-gold-hover">Choisir ma priorité</button>
                      </>
                    )}
                  </div>

                  <div className="shrink-0 text-center" data-testid="energy-card">
                    {aCheckin ? (
                      <>
                        <AnneauEnergie valeur={Math.round(energyPercent)} />
                        <button onClick={() => setCheckinOpen(true)} data-testid="open-checkin-btn"
                          className="mt-3 text-[12.5px] font-semibold text-gold hover:underline">Mettre à jour</button>
                      </>
                    ) : (
                      <div className="w-[168px]" data-testid="energy-empty">
                        <AnneauEnergie valeur={0} vide />
                        <button onClick={() => setCheckinOpen(true)} data-testid="energy-first-checkin"
                          className="mt-3 text-[12.5px] font-semibold text-gold hover:underline">Faire mon check-in</button>
                      </div>
                    )}
                  </div>
                </div>
              </Ok>

              {/* ── QUATRE CAPTEURS, façon tableau de bord : l'état de la journée
                     se lit en deux secondes — énergie, série, actions, cap.
                     Tous les chiffres viennent de l'état réel ; s'il n'y a rien
                     à dire, la note dit ce qui manque au lieu d'un zéro flatteur. ── */}
              <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 animate-fade-up" data-testid="cockpit-capteurs">
                <CarteCapteur icon={BatteryMedium} label="Énergie" valeur={`${energy.score}/5`}
                  sous={aCheckin ? `check-in fait · ${Math.round(energyPercent)}% de charge` : "ton check-in du jour attend"} 
                  note={aCheckin ? ["Check-in du jour fait", true] : ["Faire mon check-in", false]} testid="cap-energie" />
                <CarteCapteur icon={Flame} label="Série" valeur={serie && serie.jours > 0 ? `${serie.jours} j` : "0 j"}
                  sous={serie && serie.jours > 0 ? (serie.aujourdhui_fait ? "tenue aujourd'hui — continue" : "à prolonger aujourd'hui") : "ta série démarre avec un geste"}
                  note={serie && serie.aujourdhui_fait ? ["Rythme tenu aujourd'hui", true] : ["Un geste la relance", false]} testid="cap-serie" />
                <CarteCapteur icon={CheckSquare} label="Actions" valeur={`${doneCount}/${priorities.length || 0}`}
                  sous={priorities.length ? (doneCount === priorities.length ? "journée complète, bravo" : "accomplies aujourd'hui") : "rien de posé — ta journée est ouverte"}
                  note={priorities.length ? [`${priorities.length - doneCount} en cours`, true] : ["Poser une action", false]} testid="cap-actions" />
                <CarteCapteur icon={Target} label="Objectif 90 j" valeur={goal?.title ? `${goal.percent || 0}%` : "—"}
                  sous={goal?.title ? goal.title.slice(0, 38) : "ton cap de 90 jours attend d'être posé"}
                  note={capLong ? [`Cap 3 ans relié`, true] : ["Relier ma Vision", false]} testid="cap-objectif" />
              </div>

              {/* ── LA VICTOIRE, EN LIGNE ──────────────────────────────────
                     C'était une carte dorée pleine hauteur : une pastille, un
                     paragraphe d'accueil, un champ de saisie et un bouton vers
                     la revue — quatre éléments pour une information d'un seul
                     mot. Vide, elle occupait le tiers de l'écran pour dire
                     « tu n'as encore rien fait ». Elle devient une ligne : on
                     la lit en passant, et le champ de saisie ne s'ouvre que si
                     on a quelque chose à noter. ── */}
              <div className="ok mb-5 animate-fade-up" data-testid="victory-card">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gold/15 text-gold"><Trophy size={17} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="ok-lab">Ta dernière victoire</p>
                    {victory.title ? (
                      <p className="mt-1 break-words font-display text-[17px] leading-snug">
                        {victory.title}
                        {victory.detail ? <span className="text-offwhite/55"> — {victory.detail}</span> : null}
                      </p>
                    ) : (
                      <p className="mt-1 text-[13.5px] text-offwhite/55" data-testid="victory-empty">
                        Rien de noté pour l'instant. Même les petites comptent.
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={() => setVictoireOuverte((v) => !v)} data-testid="victory-ouvrir"
                      className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 px-3.5 py-1.5 text-[12.5px] font-semibold text-gold hover:bg-gold/10">
                      {victoireOuverte ? <><X size={13} /> Fermer</> : <><Plus size={13} /> Noter</>}
                    </button>
                    <button onClick={() => navigate("/app/revue")} data-testid="cockpit-weekly-review"
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-offwhite/50 hover:text-offwhite">
                      <Sparkles size={13} /> {t("review.open")}
                    </button>
                  </div>
                </div>
                {victoireOuverte && (
                  <form onSubmit={noterVictoire} className="flex gap-2 border-t border-white/10 px-5 py-3.5" data-testid="victory-form">
                    <input value={nouvelleVictoire} onChange={(e) => setNouvelleVictoire(e.target.value)} maxLength={300} autoFocus
                      placeholder="Note une victoire, même petite…" aria-label="Nouvelle victoire"
                      className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2.5 text-[14px] text-offwhite placeholder:text-offwhite/45" />
                    <button type="submit" disabled={victoireEnvoi || nouvelleVictoire.trim().length < 2} data-testid="victory-add"
                      className="shrink-0 rounded-xl bg-gold px-4 text-[13px] font-bold text-navy-900 disabled:opacity-50">Ajouter</button>
                  </form>
                )}
              </div>

              {/* 1. Point du jour */}
              <div className="mb-5 animate-fade-up" style={{ animationDelay: "60ms" }}>
                <div className="[&>*]:!mb-0"><PointDuJourCard modeInfo={modeInfo} /></div>
              </div>

              {/* ── TES PRIORITÉS ───────────────────────────────────────────
                     Affichées seulement quand il y en a. L'état vide vivait ici
                     en grande carte centrée avec son bouton « Ajouter ma
                     première priorité » — alors que le hero, trois blocs plus
                     haut, dit déjà « Rien de décidé pour aujourd'hui » avec le
                     bouton « Choisir ma priorité ». Deux appels à la même
                     action sur le même écran, c'est une hésitation, pas une
                     invitation. ── */}
              {priorities.length > 1 && (() => {
                const autres = priorities.filter((p) => p.id !== focusPriority?.id);
                // L'accueil montre au plus 6 cartes : au-delà, la page devient un
                // back-log illisible. Le reste vit dans le Plan d'action, à un clic.
                const affichees = autres.slice(0, 6);
                return (
                  <section className="mb-5 animate-fade-up" style={{ animationDelay: "180ms" }}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h2 className="font-display text-xl font-bold text-offwhite">Tes autres priorités</h2>
                      <button onClick={() => navigate("/app/actions?tab=actions")} data-testid="priorites-voir-tout"
                        className="shrink-0 text-sm font-semibold text-gold hover:underline">
                        {autres.length > 6 ? `Voir les ${autres.length} dans le Plan d'action →` : "Ouvrir le Plan d'action →"}
                      </button>
                    </div>
                    <div className={`grid gap-4 ${affichees.length >= 3 ? "lg:grid-cols-3" : "sm:grid-cols-2"}`}>
                      {affichees.map((p) => <PriorityCard key={p.id} priority={p} />)}
                    </div>
                  </section>
                );
              })()}

              {/* Ce qui te LIMITE, avant ce qui te pousse : la pratique du jour (Bien-être,
                  ou Ma Foi si elle est activée). Le composant existait depuis longtemps mais
                  n'était monté nulle part : depuis le cockpit, rien ne menait au Bien-être ni
                  à Ma Foi. Une application qui promet « construire sans s'épuiser » ne peut pas
                  cacher la seule page qui pose une limite. */}
              <PratiqueDuJour />

              {/* 3. Business : Pouls + Radar. (La progression/badges est passée en
                     bas de page : elle motive, elle ne fait rien avancer.) */}
              {/* items-start : sans ça, la grille étirait le Pouls à la hauteur du
                     Radar et laissait 400 px de vide sous ses trois chiffres. */}
              <div className="mb-5 grid items-start gap-4 sm:grid-cols-2 animate-fade-up" style={{ animationDelay: "140ms" }}>
                <PoulsBusinessWidget />
                <RadarWidget />
              </div>

              {/* L'équipe aujourd'hui (seulement si la personne a une entreprise) */}
              <CarteEquipe />

              {/* ── TON CAP ─────────────────────────────────────────────────
                     Quand ni le cap à 90 jours ni celui à 3 ans n'est posé,
                     l'accueil affichait deux cartes vides côte à côte, chacune
                     avec son bouton « Définir mon objectif ». Une seule ligne
                     suffit : c'est une seule décision. ── */}
              {(goal.title || capLong) ? (
                <div className="mb-5 grid items-start gap-4 sm:grid-cols-2 animate-fade-up" style={{ animationDelay: "200ms" }}>
                  <GlassCard data-testid="goal-card">
                    <div className="mb-4 flex items-center gap-2">
                      <Target className="h-4 w-4 text-gold" />
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Objectif principal · 90 jours</p>
                    </div>
                    {goal.title ? (
                    <div className="flex items-center gap-5">
                      <RingProgress value={goal.percent} size={104} stroke={8}>
                        <span className="font-display text-xl font-extrabold text-offwhite">{goal.percent}%</span>
                      </RingProgress>
                      <div>
                        <p className="font-display text-base font-bold text-offwhite">{goal.title}</p>
                        <p className="mt-1 text-sm text-offwhite/60">{goal.daysLeft} jours restants</p>
                        <div className="mt-3 space-y-1.5">
                          {goal.substeps.map((s, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className={`flex h-4 w-4 items-center justify-center rounded-full ${s.done ? "bg-gold text-navy-900" : "border border-white/20"}`}>
                                {s.done && <Check className="h-3 w-3" />}
                              </span>
                              <span className={s.done ? "text-offwhite/50 line-through" : "text-offwhite/80"}>{s.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    ) : (
                      <div className="py-2 text-center" data-testid="goal-empty">
                        <p className="text-[13.5px] text-offwhite/55">Pas encore d'objectif à 90 jours.</p>
                        <button onClick={() => navigate("/app/actions?tab=objectifs")} data-testid="goal-define"
                          className="mt-2 text-[12.5px] font-semibold text-gold hover:underline">Le définir →</button>
                      </div>
                    )}
                  </GlassCard>
                  <GoalCountdown />
                </div>
              ) : capLong !== undefined && (
                <div className="ok mb-5 animate-fade-up" data-testid="cap-a-poser" style={{ animationDelay: "200ms" }}>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gold/15 text-gold"><Target size={17} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="ok-lab">Ton cap</p>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-offwhite/58">
                        Rien n'est posé. C'est la boussole de tes priorités — et sans elle, le Radar ne cherche rien.
                      </p>
                    </div>
                    <button onClick={() => navigate("/app/actions?tab=objectifs")} data-testid="goal-define"
                      className="shrink-0 rounded-full bg-gold px-4 py-2 text-[12.5px] font-semibold text-navy-900 hover:bg-gold-hover">
                      Définir mon objectif
                    </button>
                  </div>
                </div>
              )}

              {/* La progression et les badges : en bas, après ce qui fait avancer. */}
              <GamificationWidget />

              {/* Cartes épinglées depuis le Vision Board (seulement s'il y en a) */}
              <PinnedVisionCards />
            </>
          )}
        </main>
      </div>

      <EnergyCheckin open={checkinOpen} onClose={() => setCheckinOpen(false)} />
    </div>
  );
}

function PointDuJourCard({ modeInfo }) {
  const { aCheckin } = useKairos();
  const [texte, setTexte] = useState("");
  const [loading, setLoading] = useState(true);
  const [charge, setCharge] = useState(null);
  // Charge de travail du jour (calcul serveur sans IA) : un conseil concret quand la journée est dense.
  useEffect(() => {
    let on = true;
    fetchChargeTravail().then((c) => { if (on) setCharge(c); }).catch(() => {});
    return () => { on = false; };
  }, [aCheckin]);
  useEffect(() => {
    let on = true;
    fetchPointDuJour().then((d) => { if (on) { setTexte(d.texte || modeInfo.banner); setLoading(false); } }).catch(() => { if (on) { setTexte(modeInfo.banner); setLoading(false); } });
    return () => { on = false; };
  }, [modeInfo.banner, aCheckin]);  // recalculé après le check-in (avant : « aucun check-in » restait affiché)
  // Le point arrive en texte libre (4 lignes en mode IA, un paragraphe en mode
  // dégradé) : on le découpe en segments pour une lecture en un coup d'œil,
  // chaque ligne avec son repère — fini le pavé.
  const lignes = (texte || "").split(/\n+/).map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean);
  // 2 lignes seulement : énergie + plan B. Les priorités et la victoire ont leurs propres cartes (avant : doublon).
  const segments = lignes.length > 1 ? lignes.slice(0, 2) : (texte || "").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean).slice(0, 2);
  const REPERES = [
    { Icon: Zap, label: "Énergie" },
    { Icon: LifeBuoy, label: "Plan B" },
  ];
  return (
    <GlassCard className="mb-5 animate-fade-up" style={{ animationDelay: "120ms", borderColor: `${modeInfo.color}55` }} data-testid="point-du-jour-card">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${modeInfo.color}22` }}>
          <Sun className="h-5 w-5" style={{ color: modeInfo.color }} />
        </div>
        <div className="flex-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">Ton point du jour</p>
          {loading ? (
            <p className="font-display text-[15.5px] font-medium leading-8 text-offwhite" data-testid="point-du-jour-texte">Zayado prépare ton point du jour…</p>
          ) : segments.length <= 1 ? (
            <p className="whitespace-pre-wrap font-display text-[15.5px] font-medium leading-8 text-offwhite" data-testid="point-du-jour-texte">{texte}</p>
          ) : (
            <ul className="space-y-2.5" data-testid="point-du-jour-texte">
              {segments.map((s, i) => {
                const R = REPERES[i] || REPERES[REPERES.length - 1];
                return (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${modeInfo.color}1a` }}>
                      <R.Icon className="h-3.5 w-3.5" style={{ color: modeInfo.color }} />
                    </span>
                    <p className="min-w-0 text-[14px] leading-relaxed text-offwhite">
                      <span className="mr-1.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-offwhite/70">{R.label}</span>
                      {s}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          {charge && charge.niveau !== "leger" && charge.conseil && (
            <p className="mt-3 rounded-xl border border-gold/25 bg-gold/10 px-3 py-2 text-[12.5px] leading-relaxed text-offwhite/90" data-testid="charge-conseil">
              {charge.conseil}
            </p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function PriorityCard({ priority }) {
  const { togglePriority } = useKairos();
  const Icon = { FileText, Users, Footprints }[priority.icon] || CheckSquare;
  const [prog, setProg] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setProg(priority.progress), 180);
    return () => clearTimeout(t);
  }, [priority.progress]);
  return (
    <GlassCard className={`flex items-center gap-4 py-4 transition-all ${priority.done ? "opacity-60" : ""}`} data-testid={`priority-${priority.id}`}>
      <button
        onClick={() => togglePriority(priority.id)}
        data-testid={`priority-checkbox-${priority.id}`}
        aria-label="Basculer la priorité"
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all ${
          priority.done ? "border-gold bg-gold text-navy-900" : "border-white/12 bg-white/5 text-gold hover:border-gold/60"
        }`}
      >
        {priority.done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </button>

      <div className="min-w-0 flex-1">
        {/* Le titre a droit à la largeur : avec la pastille de durée sur la même
            ligne, « Envoyer la proposition à Nova Studio » devenait « Envoyer la
            propositio… » dans une colonne sur trois. La durée descend d'un cran,
            à côté du pourcentage, où elle se lit aussi bien. */}
        <span className={`block text-sm font-medium leading-snug line-clamp-2 ${priority.done ? "text-offwhite/50 line-through" : "text-offwhite"}`}>
          {priority.title}
        </span>
        <div className="mt-2.5 flex items-center gap-3">
          <DurationChip minutes={priority.duration} className="shrink-0" />
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{
                width: `${prog}%`,
                background: "linear-gradient(90deg, #DEC2A3, #F1E2CC)",
                transition: "width 1.6s cubic-bezier(0.22,1,0.36,1)",
              }}
            />
          </div>
          <span className="w-9 shrink-0 text-right text-xs font-medium text-offwhite/60">{priority.progress}%</span>
        </div>
      </div>
    </GlassCard>
  );
}

// Layout Focus (mode récupération, énergie basse).
function RecoveryLayout({ modeInfo, priority, energyPercent, energyScore }) {
  const navigate = useNavigate();
  return (
    <div className="animate-fade-up" data-testid="recovery-layout">
      <GlassCard className="mb-5 text-center" style={{ borderColor: `${modeInfo.color}55` }}>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${modeInfo.color}22` }}>
          <Leaf className="h-7 w-7" style={{ color: modeInfo.color }} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: modeInfo.color }}>Mode récupération</span>
        <h2 className="mt-2 font-display text-2xl font-bold text-offwhite">On ralentit, en douceur.</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-offwhite/70">{modeInfo.banner}</p>
      </GlassCard>

      <div className="mb-5 flex justify-center">
        <RingProgress value={energyPercent} size={140} stroke={10} color="#14B8A6">
          <span className="font-display text-3xl font-extrabold text-offwhite">{energyScore}/5</span>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: "#14B8A6" }}>Énergie</span>
        </RingProgress>
      </div>

      <GlassCard gold data-testid="recovery-priority">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">Ta seule priorité</p>
        {/* Sans priorité posée, cette carte affichait une case à cocher et une ligne vide. */}
        {priority?.title ? (
          <div className="flex items-center gap-4">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white/25" />
            <span className="flex-1 text-sm font-medium text-offwhite">{priority.title}</span>
            <DurationChip minutes={priority.duration} />
          </div>
        ) : (
          <p className="text-sm text-offwhite/60" data-testid="recovery-sans-priorite">
            Tu n'as pas encore désigné ta priorité du jour. Aujourd'hui, une seule suffit.
          </p>
        )}
        <p className="mt-4 flex items-center gap-2 text-sm text-offwhite/60">
          <Sparkles className="h-4 w-4 text-gold" /> Le reste peut attendre. Tu as le droit de te reposer.
        </p>
        {/* Le mode récupération s'arrêtait là : une phrase bienveillante et aucune
            porte. C'est précisément le jour où « le reste peut attendre » doit être
            exécutable — le Plan d'action sait maintenant réduire la journée, et la
            pratique du jour est à un clic. */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <button onClick={() => navigate("/app/actions?tab=actions")} className="rounded-full border border-white/20 px-4 py-2 text-[12.5px] font-semibold text-offwhite/85 hover:bg-white/10" data-testid="recovery-vers-plan">
            Alléger ma journée dans le Plan d'action
          </button>
          <button onClick={() => navigate("/app/bien-etre")} className="rounded-full border border-white/20 px-4 py-2 text-[12.5px] font-semibold text-offwhite/85 hover:bg-white/10" data-testid="recovery-vers-bienetre">
            Prendre soin de moi
          </button>
        </div>
      </GlassCard>

      <div className="mt-5"><PratiqueDuJour /></div>
    </div>
  );
}
