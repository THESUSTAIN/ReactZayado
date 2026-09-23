import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import { TabBar } from "@/components/kairos/TabBar";
import { ChatPanel, ChatBubble } from "@/components/kairos/ChatAssistant";
import { EnergyCheckin } from "@/components/kairos/EnergyCheckin";
import { GlassCard } from "@/components/kairos/GlassCard";
import { RingProgress } from "@/components/kairos/RingProgress";
import { DurationChip } from "@/components/kairos/Chip";
import { BalanceDial } from "@/components/kairos/BalanceDial";
import { TrendChart } from "@/components/kairos/TrendChart";
import { useKairos } from "@/context/KairosContext";
import { GoalCountdown } from "@/components/kairos/GoalCountdown";
import PoulsBusinessWidget from "@/components/kairos/PoulsBusinessWidget";
import RadarWidget from "@/components/kairos/RadarWidget";
import ImpactBanner from "@/components/kairos/ImpactBanner";
import { useI18n } from "@/i18n";
import PinnedVisionCards from "@/components/vision/PinnedVisionCards";
import { fetchPointDuJour } from "@/lib/kairosApi";
import {
  BatteryMedium, Check, Trophy, Target, Sparkles, TrendingUp,
  Scale, ChevronRight, Sun, Leaf, Zap, FileText, Users, Footprints, CheckSquare,
} from "lucide-react";

export default function Cockpit() {
  const { user, energy, balance, priorities, goal, victory, trend, mode, modeInfo, isRecovery, aCheckin } = useKairos();
  const { t } = useI18n();
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const navigate = useNavigate();

  const energyPercent = (energy.score / 5) * 100;
  const doneCount = priorities.filter((p) => p.done).length;
  const focusPriority = priorities.find((p) => !p.done) || priorities[0];

  return (
    <div className="min-h-screen">
      <Sidebar />
      <ChatPanel />

      <div className="lg:pl-[92px] xl:pr-[360px]">
        <Header />

        <main className="mx-auto max-w-4xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          {/* Salutation */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 animate-fade-up">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{t("cockpit.label")}</p>
              <h1 className="mt-1 font-display text-3xl font-extrabold text-offwhite sm:text-4xl">
                {t("cockpit.greeting")}, {user.firstName}
              </h1>
            </div>
            <button onClick={() => setCheckinOpen(true)} className="btn-ghost" data-testid="open-checkin-btn">
              <BatteryMedium className="h-4 w-4 text-gold" /> {t("cockpit.checkin")}
            </button>
          </div>

          {isRecovery ? (
            <RecoveryLayout modeInfo={modeInfo} priority={focusPriority} energyPercent={energyPercent} energyScore={energy.score} />
          ) : (
            <>
              {/* Bento haut */}
              <div className="mb-5 grid gap-4 sm:grid-cols-2 animate-fade-up" style={{ animationDelay: "60ms" }}>
                <GlassCard data-testid="energy-card">
                  <p className="mb-2 text-center font-display text-base font-semibold text-offwhite">Énergie</p>
                  {aCheckin ? (
                    <div className="flex flex-col items-center">
                      <RingProgress value={energyPercent} size={128} stroke={9}>
                        <Zap className="mb-0.5 h-5 w-5 text-gold" fill="#DEC2A3" />
                        <span className="font-display text-2xl font-extrabold text-offwhite">{energy.score}/5</span>
                      </RingProgress>
                      <p className="mt-2 inline-flex items-center gap-1 text-sm text-offwhite/70">
                        Niveau d'énergie <span className="text-gold">↗</span>
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-2 text-center" data-testid="energy-empty">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold"><Zap className="h-5 w-5" /></span>
                      <p className="mt-3 text-sm font-medium text-offwhite">Aucune mesure pour l'instant</p>
                      <p className="mt-1 text-xs text-offwhite/55">Ton énergie s'affiche ici après ton premier check-in — 30 secondes, chaque matin.</p>
                      <button onClick={() => setCheckinOpen(true)} className="btn-gold mt-3 !px-5 !py-2 text-xs" data-testid="energy-first-checkin">Faire mon premier check-in</button>
                    </div>
                  )}
                </GlassCard>

                <GlassCard data-testid="balance-card">
                  <p className="mb-2 text-center font-display text-base font-semibold text-offwhite">Équilibre vie pro / perso</p>
                  {aCheckin ? (
                    <BalanceDial pro={balance.pro} perso={balance.perso} />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center py-2 text-center" data-testid="balance-empty">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold"><Scale className="h-5 w-5" /></span>
                      <p className="mt-3 text-sm font-medium text-offwhite">Pas encore de mesure</p>
                      <p className="mt-1 max-w-[240px] text-xs text-offwhite/55">Ton équilibre pro/perso se calcule à partir de tes check-ins quotidiens.</p>
                    </div>
                  )}
                </GlassCard>
              </div>

              {/* Objectif 3 ans + revue hebdomadaire */}
              <div className="mb-5 grid gap-4 sm:grid-cols-2 animate-fade-up" style={{ animationDelay: "100ms" }}>
                <GoalCountdown />
                <button
                  onClick={() => navigate("/app/revue")}
                  data-testid="cockpit-weekly-review"
                  className="glass flex flex-col items-start justify-center gap-2 rounded-2xl p-5 text-left transition hover:border-gold/40"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold">
                    <Sparkles className="h-[17px] w-[17px]" />
                  </span>
                  <p className="font-display text-base font-bold text-offwhite">{t("review.title")}</p>
                  <p className="text-[12.5px] leading-relaxed text-offwhite/60">{t("review.intro")}</p>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-gold">
                    {t("review.open")} <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              </div>

              {/* Cartes Live épinglées depuis le Vision Board */}
              <PinnedVisionCards />

              {/* Point du jour (brief IA, sur Aujourd'hui) */}
              <PointDuJourCard modeInfo={modeInfo} />

              {/* Nouveaux widgets business : Pouls + Radar */}
              <div className="mb-5 grid gap-4 sm:grid-cols-2 animate-fade-up" style={{ animationDelay: "140ms" }}>
                <PoulsBusinessWidget />
                <RadarWidget />
              </div>

              {/* Bandeau d'impact 7 jours */}
              <div className="mb-5 animate-fade-up" style={{ animationDelay: "160ms" }}>
                <ImpactBanner />
              </div>

              {/* Tes 3 priorités */}
              <section className="mb-5 animate-fade-up" style={{ animationDelay: "180ms" }}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold text-offwhite">Tes 3 priorités</h2>
                  {priorities.length > 0 && <span className="text-sm text-offwhite/50">{doneCount}/{priorities.length} accomplies</span>}
                </div>
                {priorities.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-3">
                    {priorities.map((p) => (
                      <PriorityCard key={p.id} priority={p} />
                    ))}
                  </div>
                ) : (
                  <GlassCard className="flex flex-col items-center py-6 text-center" data-testid="priorities-empty">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/15 text-gold"><CheckSquare className="h-5 w-5" /></span>
                    <p className="mt-3 text-sm font-medium text-offwhite">Aucune priorité pour aujourd'hui</p>
                    <p className="mt-1 max-w-xs text-xs text-offwhite/55">Choisis 1 à 3 actions qui comptent vraiment — elles apparaîtront ici chaque matin.</p>
                    <button onClick={() => navigate("/app/actions")} className="btn-gold mt-3 !px-5 !py-2 text-xs" data-testid="priorities-add">Ajouter ma première priorité</button>
                  </GlassCard>
                )}
              </section>

              {/* Objectif principal + Dernière victoire */}
              <div className="mb-5 grid gap-4 sm:grid-cols-2 animate-fade-up" style={{ animationDelay: "240ms" }}>
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
                    <div className="flex flex-col items-center py-3 text-center" data-testid="goal-empty">
                      <p className="text-sm font-medium text-offwhite">Pas encore d'objectif à 90 jours</p>
                      <p className="mt-1 max-w-[250px] text-xs text-offwhite/55">C'est la boussole de tes priorités quotidiennes — définis-le sur ta Vision.</p>
                      <button onClick={() => navigate("/app/vision")} className="btn-gold mt-3 !px-5 !py-2 text-xs" data-testid="goal-define">Définir mon objectif</button>
                    </div>
                  )}
                </GlassCard>

                <GlassCard className="relative overflow-hidden" data-testid="victory-card">
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gold/10 blur-2xl" />
                  <div className="mb-3 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-gold" />
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Dernière victoire</p>
                  </div>
                  {victory.title ? (
                    <>
                      <p className="font-display text-lg font-bold text-offwhite">{victory.title}</p>
                      <p className="mt-2 text-sm leading-relaxed text-offwhite/70">{victory.detail}</p>
                      <p className="mt-4 text-xs text-offwhite/40">{victory.date}</p>
                    </>
                  ) : (
                    <div className="py-3 text-center" data-testid="victory-empty">
                      <p className="text-sm font-medium text-offwhite">Ta première victoire s'affichera ici</p>
                      <p className="mx-auto mt-1 max-w-[250px] text-xs text-offwhite/55">Chaque étape accomplie est célébrée — même les petites.</p>
                    </div>
                  )}
                </GlassCard>
              </div>

              {/* Tendance énergie 14 jours — seulement avec de vraies mesures */}
              {trend.length > 0 ? (
                <GlassCard className="animate-fade-up" style={{ animationDelay: "300ms" }} data-testid="trend-card">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-gold" />
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Tendance énergie · {trend.length} jour{trend.length > 1 ? "s" : ""}</p>
                    </div>
                    <span className="text-sm text-offwhite/50">Moyenne {(trend.reduce((s, p) => s + (p.value || 0), 0) / trend.length).toFixed(1).replace(".", ",")} / 5</span>
                  </div>
                  <TrendChart data={trend} />
                </GlassCard>
              ) : (
                <GlassCard className="animate-fade-up" style={{ animationDelay: "300ms" }} data-testid="trend-empty">
                  <div className="flex items-center gap-3 py-1">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold"><TrendingUp className="h-4 w-4" /></span>
                    <p className="text-xs leading-relaxed text-offwhite/60">Ta tendance énergie sur 14 jours apparaîtra ici après quelques check-ins.</p>
                  </div>
                </GlassCard>
              )}
            </>
          )}
        </main>
      </div>

      <TabBar
        active="today"
        onSelect={(key) => {
          if (key === "today") navigate("/app");
          else if (key === "vision") navigate("/app/vision");
          else if (key === "ideas") navigate("/app/ideas");
          else if (key === "wellbeing") navigate("/app/bien-etre");
        }}
        onOpenChat={() => setChatOpen(true)}
      />
      <ChatBubble open={chatOpen} onClose={() => setChatOpen(false)} />
      <EnergyCheckin open={checkinOpen} onClose={() => setCheckinOpen(false)} />
    </div>
  );
}

function PointDuJourCard({ modeInfo }) {
  const [texte, setTexte] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let on = true;
    fetchPointDuJour().then((d) => { if (on) { setTexte(d.texte || modeInfo.banner); setLoading(false); } }).catch(() => { if (on) { setTexte(modeInfo.banner); setLoading(false); } });
    return () => { on = false; };
  }, [modeInfo.banner]);
  return (
    <GlassCard className="mb-5 animate-fade-up" style={{ animationDelay: "120ms", borderColor: `${modeInfo.color}55` }} data-testid="point-du-jour-card">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${modeInfo.color}22` }}>
          <Sun className="h-5 w-5" style={{ color: modeInfo.color }} />
        </div>
        <div className="flex-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">Ton point du jour</p>
          <p className="whitespace-pre-wrap font-display text-[15.5px] font-medium leading-8 text-offwhite" data-testid="point-du-jour-texte">
            {loading ? "Kairos prépare ton point du jour…" : texte}
          </p>
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
        <div className="flex items-center gap-2">
          <span className={`min-w-0 flex-1 truncate text-sm font-medium ${priority.done ? "text-offwhite/50 line-through" : "text-offwhite"}`}>
            {priority.title}
          </span>
          <DurationChip minutes={priority.duration} className="shrink-0" />
        </div>
        <div className="mt-2.5 flex items-center gap-3">
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
        <div className="flex items-center gap-4">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white/25" />
          <span className="flex-1 text-sm font-medium text-offwhite">{priority?.title}</span>
          {priority && <DurationChip minutes={priority.duration} />}
        </div>
        <p className="mt-4 flex items-center gap-2 text-sm text-offwhite/60">
          <Sparkles className="h-4 w-4 text-gold" /> Le reste peut attendre. Tu as le droit de te reposer.
        </p>
      </GlassCard>
    </div>
  );
}
