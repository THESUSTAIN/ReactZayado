import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GlassCard } from "@/components/kairos/GlassCard";
import { Chip } from "@/components/kairos/Chip";
import { useKairos } from "@/context/KairosContext";
import { valuesLibrary } from "@/mock/data";
import { saveProfile } from "@/lib/kairosApi";
import { Sparkles, ArrowRight, ArrowLeft, Plus, X, Target, Clock, Heart, Check, Loader2, Rocket, User, Briefcase, TrendingUp } from "lucide-react";
import { savePouls } from "@/lib/kairosApi";

const STEPS = ["Bienvenue", "Identité", "Activité", "Cap financier", "Vision", "Objectifs 90j", "Valeurs & rituel", "Ton offre", "C'est prêt"];

const PLANS = [
  { key: "essentielle", name: "Essentielle", price: "0€", period: "pour toujours",
    features: ["Cockpit quotidien", "3 priorités & check-in énergie", "Vision Board"], highlight: false },
  { key: "serenite", name: "Sérénité", price: "19€", period: "/ mois",
    features: ["Tout l'Essentiel", "Copilote IA (plafond équitable)", "Radar du jour (3 opportunités)", "Pouls Business & revue hebdo"], highlight: true },
  { key: "pro", name: "Pro", price: "49€", period: "/ mois",
    features: ["Tout Sérénité", "1 chatbot marque blanche", "Validation Telegram & WhatsApp", "Espace vendeur marketplace"], highlight: false },
  { key: "business", name: "Business", price: "99€", period: "/ mois",
    features: ["Tout Pro", "3 chatbots marque blanche", "IA sur ta base de connaissance"], highlight: false },
  { key: "entreprise", name: "Entreprise", price: "149€", period: "/ mois",
    features: ["Tout Business", "Chatbots illimités, ton domaine", "SLA dédié"], highlight: false },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, setOnboardingData } = useKairos();
  const [step, setStep] = useState(0);

  const [vision, setVision] = useState("");
  const [why, setWhy] = useState("");
  const [goals, setGoals] = useState([""]);
  const [values, setValues] = useState([]);
  const [checkinHour, setCheckinHour] = useState("08:30");
  // Corrigé : le paramètre ?plan= de l'URL (venu de la page Tarifs) n'était
  // jamais lu — quelqu'un choisissant "Pro" à 49€ atterrissait ici
  // silencieusement remis sur le plan gratuit par défaut.
  const planParam = searchParams.get("plan");
  const [plan, setPlan] = useState(PLANS.some((p) => p.key === planParam) ? planParam : "essentielle");
  const [saving, setSaving] = useState(false);
  const [savePhase, setSavePhase] = useState(0);
  const [saveError, setSaveError] = useState("");
  // Nouveau wizard 3 étapes : Identité / Activité / Cap financier
  const [identite, setIdentite] = useState({ prenom: user.firstName || "", entreprise: "", role: "" });
  const [activite, setActivite] = useState({ type: "", cible: "", offre: "", marche: "france" });
  const [capFin, setCapFin]     = useState({ ca_objectif: 0, ca_mensuel: 0, tresorerie: 0 });

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = async () => {
    const startedAt = Date.now();
    setSaveError("");
    setSaving(true);
    try {
      await saveProfile({
        prenom: identite.prenom || user.firstName,
        texte_vision: vision,
        pourquoi: why,
        valeurs: values,
        heure_checkin: checkinHour,
        plan,
        objectifs: goals.filter(Boolean),
        contexte_metier: {
          entreprise: identite.entreprise, role: identite.role,
          activite_type: activite.type, cible: activite.cible, offre: activite.offre,
          marche: activite.marche,
        },
        onboarded: true,
      });
      // Pré-remplit le Pouls Business avec le cap financier saisi
      if (capFin.ca_objectif || capFin.ca_mensuel || capFin.tresorerie) {
        try { await savePouls({
          ca_mensuel: capFin.ca_mensuel || 0,
          ca_objectif: capFin.ca_objectif || 0,
          tresorerie: capFin.tresorerie || 0,
          source: "manuel",
        }); } catch (_) {}
      }
    } catch (error) {
      setSaving(false);
      setSaveError(error?.message || "Impossible d'enregistrer ton espace pour le moment. Vérifie ta connexion puis réessaie.");
      return;
    }
    // L’écran d’analyse doit être perceptible même lorsque l’API répond très vite.
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, 1800 - (Date.now() - startedAt))));
    setOnboardingData({ vision, why, goals: goals.filter(Boolean), values, checkinHour, plan });
    navigate("/app");
  };

  useEffect(() => {
    if (!saving) return undefined;
    const timer = setInterval(() => setSavePhase((p) => (p + 1) % 4), 900);
    return () => clearInterval(timer);
  }, [saving]);

  const addGoal = () => goals.length < 3 && setGoals([...goals, ""]);
  const updateGoal = (i, v) => setGoals(goals.map((g, idx) => (idx === i ? v : g)));
  const removeGoal = (i) => setGoals(goals.filter((_, idx) => idx !== i));

  const toggleValue = (v) => {
    setValues((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : prev.length < 5 ? [...prev, v] : prev));
  };

  const canProceed = [
    true,
    identite.prenom.trim().length > 0,           // 1 Identité
    activite.type.trim().length > 0,              // 2 Activité
    true,                                          // 3 Cap financier (optionnel)
    vision.trim().length > 0,                     // 4 Vision
    goals.some((g) => g.trim()),                  // 5 Objectifs
    values.length > 0,                            // 6 Valeurs
    true,                                          // 7 Offre
    true,                                          // 8 Prêt
  ][step];

  return (
    <div className="zayado-blue relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      {/* Progress */}
      <div className="mb-8 flex w-full max-w-xl items-center gap-2" data-testid="onboarding-progress">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col gap-2">
            <div className={`h-1 rounded-full transition-all ${i <= step ? "bg-gold" : "bg-white/10"}`} />
            <span className={`text-[10px] font-medium ${i === step ? "text-gold" : "text-offwhite/40"}`}>{label}</span>
          </div>
        ))}
      </div>

      <GlassCard className="w-full max-w-xl animate-fade-up" data-testid={`onboarding-step-${step}`}>
        {step === 0 && (
          <div className="py-4 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/15 ring-1 ring-gold/30">
              <Sparkles className="h-8 w-8 text-gold" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Bienvenue</span>
            <h1 className="mt-3 font-display text-3xl font-extrabold text-offwhite">Bienvenue dans l'univers Kairos</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-offwhite/70">
              Ici, on transforme ta vision en action — sans jamais oublier de prendre soin de toi.
              Quelques minutes pour poser tes fondations, à ton rythme.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="py-2" data-testid="onboarding-identite">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gold" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Identité</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-offwhite">Comment tu t'appelles ?</h2>
            <p className="mt-1 text-sm text-offwhite/60">Kairos te parlera avec ce prénom.</p>
            <div className="mt-4 space-y-3">
              <input value={identite.prenom} onChange={(e) => setIdentite({ ...identite, prenom: e.target.value })}
                placeholder="Ton prénom" data-testid="onboarding-prenom"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30" />
              <input value={identite.entreprise} onChange={(e) => setIdentite({ ...identite, entreprise: e.target.value })}
                placeholder="Nom de ton entreprise (facultatif)" data-testid="onboarding-entreprise"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30" />
              <input value={identite.role} onChange={(e) => setIdentite({ ...identite, role: e.target.value })}
                placeholder="Ton rôle (ex. Fondateur·rice, Coach…)" data-testid="onboarding-role"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="py-2" data-testid="onboarding-activite">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-gold" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Activité</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-offwhite">Que fais-tu, pour qui ?</h2>
            <p className="mt-1 text-sm text-offwhite/60">Une ligne suffit — le radar s'en servira pour te proposer des opportunités alignées.</p>
            <div className="mt-4 space-y-3">
              <input value={activite.type} onChange={(e) => setActivite({ ...activite, type: e.target.value })}
                placeholder="Type d'activité (ex. Coaching business, SaaS B2B…)" data-testid="onboarding-activite-type"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30" />
              <input value={activite.cible} onChange={(e) => setActivite({ ...activite, cible: e.target.value })}
                placeholder="Ta cible idéale (ex. entrepreneurs sensibles)" data-testid="onboarding-activite-cible"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30" />
              <textarea value={activite.offre} onChange={(e) => setActivite({ ...activite, offre: e.target.value })}
                placeholder="Ton offre phare (facultatif)" rows={2} data-testid="onboarding-activite-offre"
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30" />
              <div>
                <label className="mb-1.5 block text-xs text-offwhite/50">Ton pays / marché — pour l'actualité et le contexte économique</label>
                <select value={activite.marche} onChange={(e) => setActivite({ ...activite, marche: e.target.value })} data-testid="onboarding-activite-marche"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-offwhite focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30">
                  <option value="france">France</option>
                  <option value="senegal">Sénégal</option>
                  <option value="cote_ivoire">Côte d'Ivoire</option>
                  <option value="cameroun">Cameroun</option>
                  <option value="maroc">Maroc</option>
                  <option value="belgique">Belgique</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="py-2" data-testid="onboarding-cap-financier">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gold" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Cap financier</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-offwhite">Où en es-tu, où vas-tu ?</h2>
            <p className="mt-1 text-sm text-offwhite/60">Ces 3 chiffres alimentent ton widget Pouls Business. Tu peux tout modifier plus tard.</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumField label="Objectif CA mensuel (€)"  value={capFin.ca_objectif} onChange={(v) => setCapFin({ ...capFin, ca_objectif: v })} testid="onboarding-ca-objectif" />
              <NumField label="CA du mois en cours (€)"  value={capFin.ca_mensuel}  onChange={(v) => setCapFin({ ...capFin, ca_mensuel: v })}  testid="onboarding-ca-mensuel" />
              <NumField label="Trésorerie actuelle (€)"  value={capFin.tresorerie}  onChange={(v) => setCapFin({ ...capFin, tresorerie: v })}  testid="onboarding-tresorerie" />
            </div>
            <p className="mt-3 rounded-xl border border-gold/20 bg-gold/5 px-3 py-2 text-[11px] italic text-offwhite/70">
              Astuce : dans Paramètres → Intégrations, connecte Qonto ou Pennylane pour que ces chiffres se mettent à jour tout seuls.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="py-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Vision & Pourquoi</span>
            <h2 className="mt-2 font-display text-2xl font-bold text-offwhite">Quelle est ta vision ?</h2>
            <p className="mt-1 text-sm text-offwhite/60">En une phrase, où veux-tu être dans un an ?</p>
            <textarea
              value={vision} onChange={(e) => setVision(e.target.value)} rows={3}
              placeholder="Ex : Vivre sereinement de mon activité de coaching, avec un impact réel."
              data-testid="onboarding-vision-input"
              className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
            />
            <p className="mt-5 text-sm text-offwhite/60">Et ton « pourquoi » profond ?</p>
            <textarea
              value={why} onChange={(e) => setWhy(e.target.value)} rows={2}
              placeholder="Ce qui te fait tenir même les jours difficiles…"
              data-testid="onboarding-why-input"
              className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
            />
          </div>
        )}

        {step === 5 && (
          <div className="py-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-gold" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Objectifs · 90 jours</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-offwhite">Tes objectifs clés</h2>
            <p className="mt-1 text-sm text-offwhite/60">Maximum 3. Moins, mais mieux.</p>
            <div className="mt-4 space-y-3">
              {goals.map((g, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-sm font-bold text-gold">{i + 1}</span>
                  <input
                    value={g} onChange={(e) => updateGoal(i, e.target.value)}
                    placeholder="Ex : Atteindre 5 clients récurrents"
                    data-testid={`onboarding-goal-input-${i}`}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-offwhite placeholder:text-offwhite/40 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
                  />
                  {goals.length > 1 && (
                    <button onClick={() => removeGoal(i)} className="rounded-lg p-2 text-offwhite/40 hover:text-alert" data-testid={`onboarding-goal-remove-${i}`}>
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {goals.length < 3 && (
              <button onClick={addGoal} className="btn-ghost mt-3 text-sm" data-testid="onboarding-add-goal">
                <Plus className="h-4 w-4" /> Ajouter un objectif
              </button>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="py-2">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-gold" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Valeurs & rituel</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-offwhite">Qu'est-ce qui compte pour toi ?</h2>
            <p className="mt-1 text-sm text-offwhite/60">Choisis jusqu'à 5 valeurs fondamentales.</p>
            <div className="mt-4 flex flex-wrap gap-2" data-testid="onboarding-values">
              {valuesLibrary.map((v) => (
                <button key={v} onClick={() => toggleValue(v)} data-testid={`onboarding-value-${v}`}>
                  <Chip active={values.includes(v)}>
                    {values.includes(v) && <Check className="h-3 w-3" />} {v}
                  </Chip>
                </button>
              ))}
            </div>

            <div className="mt-6">
              <p className="flex items-center gap-2 text-sm text-offwhite/70">
                <Clock className="h-4 w-4 text-gold" /> Ton heure de check-in quotidien
              </p>
              <input
                type="time" value={checkinHour} onChange={(e) => setCheckinHour(e.target.value)}
                data-testid="onboarding-checkin-time"
                className="mt-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-offwhite focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
              />
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="py-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Ton offre</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-offwhite">Choisis ton rythme</h2>
            <p className="mt-1 text-sm text-offwhite/60">Commence gratuitement. Change d'avis quand tu veux, sans pression.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="onboarding-plans">
              {PLANS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPlan(p.key)}
                  data-testid={`onboarding-plan-${p.key}`}
                  className={`relative flex min-h-[150px] w-full flex-col items-start rounded-2xl border p-4 text-left transition-all ${p.highlight ? "sm:col-span-2" : ""} ${
                    plan === p.key ? "border-gold/60 bg-gold/10 ring-1 ring-gold/30" : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <span className={`absolute right-4 top-4 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${plan === p.key ? "border-gold bg-gold text-navy-900" : "border-white/30"}`}>
                    {plan === p.key && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <div className="pr-8">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base font-bold text-offwhite">{p.name}</span>
                      {p.highlight && <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-navy-900">Recommandé</span>}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-offwhite/60">{p.features.join(" · ")}</p>
                  </div>
                  <div className="mt-auto pt-4 text-left">
                    {p.old && <span className="block text-xs text-offwhite/40 line-through">{p.old}</span>}
                    <span className="font-display text-lg font-extrabold text-offwhite">{p.price}</span>
                    <span className="ml-1 text-[10px] text-offwhite/50">{p.period}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="py-6 text-center" data-testid="onboarding-final">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/15 ring-1 ring-gold/30">
              <Rocket className="h-8 w-8 text-gold" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">C'est prêt</span>
            <h2 className="mt-3 font-display text-2xl font-bold text-offwhite">Ton espace s'actualise avec tes infos</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-offwhite/70">
              On personnalise ton cockpit avec ta vision, tes objectifs et tes valeurs.
              Ton Copilote IA Zayado s'appuiera dessus pour t'accompagner, à ton rythme.
            </p>
            <div className="mx-auto mt-6 max-w-sm space-y-2 text-left">
              {[
                vision ? "Ta vision est enregistrée" : "Vision à compléter plus tard",
                `${goals.filter(Boolean).length} objectif(s) à 90 jours`,
                `${values.length} valeur(s) · check-in à ${checkinHour}`,
                `Offre choisie : ${PLANS.find((p) => p.key === plan)?.name}`,
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-offwhite/80">
                  <Check className="h-4 w-4 shrink-0 text-gold" /> {t}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <button onClick={back} className="btn-ghost" data-testid="onboarding-back">
              <ArrowLeft className="h-4 w-4" /> Retour
            </button>
          ) : (
            <button onClick={() => navigate("/")} className="btn-ghost" data-testid="onboarding-skip">Passer</button>
          )}

          {step < STEPS.length - 1 ? (
            <button onClick={next} disabled={!canProceed} className="btn-gold disabled:opacity-40" data-testid="onboarding-next">
              Continuer <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={finish} disabled={saving} className="btn-gold disabled:opacity-60" data-testid="onboarding-finish">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Entrer dans Kairos <Sparkles className="h-4 w-4" /></>}
            </button>
          )}
        </div>
        {saveError && (
          <div className="mt-4 rounded-xl border border-red-300/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-100" role="alert" data-testid="onboarding-save-error">
            <p>{saveError}</p>
            <button onClick={finish} className="mt-2 text-xs font-semibold text-gold underline" data-testid="onboarding-retry">Réessayer l'enregistrement</button>
          </div>
        )}
      </GlassCard>
      {saving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071a31]/90 p-5 backdrop-blur-md" data-testid="onboarding-processing">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#102945] p-7 text-center shadow-2xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/15 ring-1 ring-gold/30">
              <Sparkles className="h-8 w-8 animate-pulse text-gold" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Kairos prépare ton espace</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-offwhite">On relie tes informations</h2>
            <p className="mt-2 text-sm text-offwhite/60">{["Lecture de ta vision…", "Structuration de tes objectifs…", "Préparation de ton cockpit…", "Dernières vérifications…"][savePhase]}</p>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10"><div className="onboarding-progress-shimmer h-full rounded-full bg-gold" /></div>
            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-offwhite/45"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Cela prend quelques secondes</div>
          </div>
        </div>
      )}
    </div>
  );
}

function NumField({ label, value, onChange, testid }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] text-offwhite/70">{label}</label>
      <input type="number" min={0} step={100} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value || "0"))}
        data-testid={testid}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-offwhite focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30" />
    </div>
  );
}
