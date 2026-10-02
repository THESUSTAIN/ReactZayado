import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MindsetAujourdhui from "@/components/mindset/MindsetAujourdhui";
import MindsetParcours from "@/components/mindset/MindsetParcours";
import MindsetCarnet from "@/components/mindset/MindsetCarnet";
import SensEquilibre from "@/components/kairos/SensEquilibre";
import { Sidebar } from "@/components/kairos/Sidebar";
import { Header } from "@/components/kairos/Header";
import BreathingSession, { PROTOCOLES } from "@/components/kairos/BreathingSession";
import { AMBIANCES_SON, jouerAmbiance, arreterAmbiance } from "@/lib/ambiance";
import { usePlanEffectif } from "@/lib/droits";
import { Lock as LockIcon, Sparkles as SparklesIcon } from "lucide-react";
import {
  Heart, Battery, Activity, Moon, Wind, Coffee, BookOpen, Music,
  Sparkles, ChevronRight, Plus, Check, Waves, Cloud, Leaf, Play,
  TrendingUp, Zap, Flame, Volume2, Square, Smile, PenLine, Loader2,
  Sun, Route, Wrench, NotebookPen, CalendarPlus, X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useKairos } from "@/context/KairosContext";
import { EnergyCheckin } from "@/components/kairos/EnergyCheckin";
import { fetchState, completerCheckin, fetchRituels, basculerRituel, fetchCourbeEnergie, fetchWheel, saveProfile, bloquerPause } from "@/lib/kairosApi";

const GOLD = "#DEC2A3";
const MOOD_FACES = ["😞", "🙁", "😐", "🙂", "😊"];

// Couleurs de la variante CLAIRE : celles du thème clair existant (theme-clair),
// la maquette ne sert que de gabarit de forme, pas de palette.
const L_NAVY = "var(--be-ink)";
const L_MUTED = "var(--be-muted)";
const L_FAINT = "var(--be-muted)";
const L_GOLD = "var(--be-accent)";

// Palette apaisée (retour Marie Esther : le vert fluo piquait les yeux) —
// sauge douce, bleu ardoise, terracotta feutré, beige doré.
const VITALS_LABEL = {
  energy:  { label: "Énergie", icon: Battery,   color: "#7A9E7E", desc: "Ta capacité d'action", reverse: false },
  stress:  { label: "Stress",  icon: Activity,  color: "#B9524E", desc: "Charge émotionnelle",  reverse: true },
  sleep:   { label: "Sommeil", icon: Moon,      color: "#7C93C3", desc: "Qualité de récup",     reverse: false },
  load:    { label: "Charge",  icon: Heart,     color: "#C9A66B", desc: "Volume de travail",    reverse: true },
};

const RITUALS = [
  { id: "r1", icon: Wind,      title: "Respiration 4-7-8",    desc: "5 min · Poser ton système nerveux",                time: "05:00" },
  { id: "r2", icon: BookOpen,  title: "Journal des 3",         desc: "7 min · 3 gratitudes, 3 apprentissages, 3 intentions", time: "07:00" },
  { id: "r3", icon: Coffee,    title: "Pause consciente",      desc: "3 min · Une pause vraie, sans écran",              time: "03:00" },
  { id: "r4", icon: Moon,      title: "Pensée d'ancrage",      desc: "3 min · Une phrase pour fermer la journée",        time: "03:00" },
  { id: "r5", icon: Waves,     title: "Marche méditative",     desc: "15 min · Dehors, sans casque",                     time: "15:00" },
  { id: "r6", icon: Sparkles,  title: "Visualisation Refuge",  desc: "8 min · Ton lieu-refuge intérieur",                time: "08:00" },
];
// Jour de repos (Paramètres › Notifications) : seulement les rituels calmes, sans objectif de productivité.
const RITUELS_CALMES = ["r1", "r3", "r5", "r6"];

// Suggestion du moment : selon le check-in (énergie, stress), l'heure et le jour de repos.
function suggestionDuMoment({ vitals, aCheckin, repos, heure }) {
  if (repos) return { texte: "Jour de repos : pas de to-do aujourd'hui. Une marche dehors ou un moment avec tes proches.", action: "marche", bouton: "Marche méditative" };
  if (!aCheckin) return { texte: "Commence par ton check-in (30 secondes) : la suite s'adapte à ton énergie.", action: "checkin", bouton: "Faire mon check-in" };
  if (vitals?.stress >= 4) return { texte: "Ton stress est haut : 3 minutes de cohérence cardiaque maintenant, avant ta prochaine tâche.", action: "respirer", bouton: "Respirer · 3 min" };
  if (vitals?.energy != null && vitals.energy <= 2) return { texte: "Énergie basse : allège ta fin de journée et protège une vraie pause de 20 minutes.", action: "creneau", bouton: "Bloquer une pause", duree: 20 };
  if (vitals?.sleep != null && vitals.sleep <= 2) return { texte: "Nuit courte : fais ta tâche la plus difficile tôt, puis garde l'après-midi pour le léger.", action: "priorites", bouton: "Voir mes priorités" };
  if (heure < 11) return { texte: "Tu es dans ta meilleure fenêtre : attaque ta priorité n° 1 avant de lire tes messages.", action: "priorites", bouton: "Voir mes priorités" };
  if (heure < 14) return { texte: "Pause déjeuner loin de l'écran : ton après-midi sera plus clair.", action: "creneau", bouton: "Bloquer ma pause", duree: 30 };
  if (heure < 18) return { texte: "Le creux de l'après-midi arrive : une pause courte maintenant garde ton énergie stable.", action: "creneau", bouton: "Bloquer une pause", duree: 15 };
  return { texte: "Ferme ta journée : une pensée d'ancrage, et tu décroches.", action: "ancrage", bouton: "Pensée d'ancrage" };
}

/** Suit la classe theme-clair posée sur <body> par le bouton lune/soleil du header. */
function useThemeClair() {
  const [clair, setClair] = useState(() => document.body.classList.contains("theme-clair"));
  useEffect(() => {
    const sync = () => setClair(document.body.classList.contains("theme-clair"));
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return clair;
}

export default function BienEtre() {
  const clair = useThemeClair();
  const { aCheckin, energy, contexte } = useKairos();
  const navigate = useNavigate();
  const [creneau, setCreneau] = useState(null);
  const repos = typeof contexte?.jour_repos === "number" && contexte.jour_repos === new Date().getDay();
  // Mesures réelles du jour (serveur). null = pas encore mesuré — « — », jamais un faux chiffre.
  const [vitals, setVitals] = useState(null);
  const [checked, setChecked] = useState({});  // ritual id → true (enregistré côté serveur)
  const [serie, setSerie] = useState(null);
  const [courbe, setCourbe] = useState(null);
  const [seance, setSeance] = useState(null);   // { protocole, ambiance, duree } quand la séance est lancée
  const [showCheckin, setShowCheckin] = useState(false);
  const [energieOpen, setEnergieOpen] = useState(false);
  const [breathingOpen, setBreathingOpen] = useState(false);
  // Onglets (dans l'URL : ?tab=parcours&p=oser-vendre — utilisable depuis le Radar ou le cockpit)
  const [params, setParams] = useSearchParams();
  const brut = params.get("tab") === "sens" ? "outils" : params.get("tab");
  const onglet = ["aujourdhui", "rituels", "parcours", "outils", "carnet"].includes(brut) ? brut : "aujourdhui";
  const parcoursOuvert = params.get("p") || null;
  const allerA = (tab, p = null) => { setParams(p ? { tab, p } : { tab }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  // Offre Rêveur (15 €) : seule la carte du jour est ouverte. Parcours, rituels,
  // outils et carnet restent payants — on affiche un bel encart « Débloquer ».
  const plan = usePlanEffectif();
  const reveur = plan === "reveur";
  const BE_VERROU = ["rituels", "parcours", "outils", "carnet"];
  const ongletVerrou = reveur && BE_VERROU.includes(onglet);

  // Historique réel : les 7 derniers jours avec leur vrai jour de semaine (serveur).
  const semaine = courbe?.semaine || [];
  const history = semaine.filter((j) => j.energie != null).map((j) => j.energie);

  const chargerVitals = () => fetchState().then((d) => {
    const today = new Date().toISOString().slice(0, 10);
    const v = d.energy?.vitals;
    const duJour = v && v.date === today;
    setVitals({
      energy: d.energy?.a_checkin && duJour ? d.energy.score : null,
      stress: duJour ? v.stress : null, sleep: duJour ? v.sommeil : null, load: duJour ? v.charge : null,
    });
  }).catch(() => setVitals({}));

  const chargerRituels = () => fetchRituels().then((d) => {
    setChecked(Object.fromEntries((d.faits || []).map((id) => [id, true])));
    setSerie(d.serie);
  }).catch(() => {});

  const chargerCourbe = () => fetchCourbeEnergie().then(setCourbe).catch(() => setCourbe({ semaine: [] }));

  useEffect(() => {
    chargerVitals();
    chargerRituels();
    chargerCourbe();
    try { localStorage.removeItem("kairos_vitals"); } catch { /* stockage indisponible */ }
  }, [energy?.score]); // eslint-disable-line react-hooks/exhaustive-deps

  const ouvrirVital = (k) => {
    if (k === "energy" || vitals?.energy == null) { setEnergieOpen(true); return; }
    setShowCheckin(k);
  };

  const saveVital = async (k, v) => {
    const champ = { stress: "stress", sleep: "sommeil", load: "charge" }[k];
    if (!champ) return;
    setVitals((x) => ({ ...x, [k]: v }));
    try { await completerCheckin({ [champ]: v }); }
    catch { toast.error("Fais d'abord ton check-in énergie du jour."); setEnergieOpen(true); chargerVitals(); }
  };

  const toggleRitual = async (id) => {
    setChecked((x) => ({ ...x, [id]: !x[id] }));
    try {
      const r = await basculerRituel(id);
      setChecked((x) => ({ ...x, [id]: r.fait }));
      setSerie(r.serie);
      if (r.fait) toast.success(r.serie?.jours > 1 ? `Rituel accompli · série de ${r.serie.jours} jours` : "Rituel accompli. Bravo à toi.");
    } catch { setChecked((x) => ({ ...x, [id]: !x[id] })); toast.error("Impossible d'enregistrer pour le moment."); }
  };
  // Une séance terminée coche le rituel correspondant (et compte dans la série).
  const seanceTerminee = (protocole) => {
    const id = protocole === "refuge" ? "r6" : "r1";
    if (!checked[id]) toggleRitual(id);
  };

  const doneCount = Object.values(checked).filter(Boolean).length;
  const totalRituals = RITUALS.length;
  const avgEnergy = history.length ? (history.reduce((s, v) => s + v, 0) / history.length).toFixed(1) : null;

  const sugg = suggestionDuMoment({ vitals, aCheckin, repos, heure: new Date().getHours() });
  const agirSuggestion = () => {
    if (sugg.action === "checkin") setEnergieOpen(true);
    else if (sugg.action === "respirer") setSeance({ protocole: "coherence", ambiance: "aucune", duree: 3 });
    else if (sugg.action === "creneau") setCreneau({ duree: sugg.duree || 15 });
    else if (sugg.action === "priorites") navigate("/app");
    else if (sugg.action === "ancrage") { if (!checked.r4) toggleRitual("r4"); }
    else if (sugg.action === "marche") { if (!checked.r5) toggleRitual("r5"); }
  };
  const ritualsDuJour = repos ? RITUALS.filter((r) => RITUELS_CALMES.includes(r.id)) : RITUALS;

  // Onglets alignés sur la maquette. Les anciens liens (?tab=sens) restent valables.
  // Sur mobile : icône + libellé court, pour que les 5 tiennent sans défiler.
  const ONGLETS = [["aujourdhui", "Aujourd'hui", "Jour", Sun], ["rituels", "Rituels", "Rituels", Leaf], ["parcours", "Parcours", "Parcours", Route], ["outils", "Outils", "Outils", Wrench], ["carnet", "Carnet", "Carnet", NotebookPen]];

  return (
    <div className="be-page min-h-screen" data-testid="page-bienetre">
      <Sidebar />
      {/* Thème crème limité au contenu : la barre latérale garde son style. */}
      <div className={`${clair ? "be-clair " : ""}lg:pl-[92px]`}>
        <Header title="Bien-être & Mindset" subtitle="Prendre soin de toi, et de ton état d'esprit d'entrepreneur." />

        <main className="mx-auto max-w-5xl px-4 pb-28 pt-4 sm:px-6 sm:pt-6 lg:pb-12">
          {/* Titre (maquette) — pas de bandeau image : le contenu passe d'abord. */}
          <div className="text-center">
            <p className="font-display text-[20px] font-medium" style={{ color: L_NAVY }}>Zayado</p>
            <h1 className="font-display text-[34px] font-semibold leading-tight sm:text-[44px]" style={{ color: L_NAVY }} data-testid="bienetre-titre">Bien-être &amp; Mindset</h1>
          </div>

          <nav className="be-tabs mt-6" data-testid="bienetre-onglets">
            {ONGLETS.map(([k, l, court, Icone]) => {
              const verrou = reveur && BE_VERROU.includes(k);
              return (
                <button key={k} onClick={() => allerA(k)} data-testid={`bienetre-onglet-${k}`} data-actif={onglet === k ? "true" : "false"} className="be-tab" aria-label={l}>
                  <Icone size={16} className="be-tab-icone" /><span className="hidden sm:inline">{l}</span><span className="sm:hidden">{court}</span>
                  {verrou && <LockIcon size={11} className="ml-1 opacity-60" data-testid={`bienetre-verrou-${k}`} />}
                </button>
              );
            })}
          </nav>

          <div className="mt-5">
            {ongletVerrou ? (
              <div className="mx-auto max-w-xl rounded-3xl border p-7 text-center" style={{ borderColor: "rgba(222,194,163,0.5)", background: "rgba(222,194,163,0.08)" }} data-testid="bienetre-upsell">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(to bottom,#F1E2CC,#DEC2A3)" }}>
                  <SparklesIcon size={24} className="text-navy-900" />
                </span>
                <h2 className="font-display text-2xl font-bold" style={{ color: L_NAVY }}>Parcours, rituels & carnet</h2>
                <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "rgba(11,20,48,0.7)" }}>
                  Ta <b>carte du jour</b> est incluse dans Rêveur. Le parcours 7 jours, les rituels, les outils de respiration et le carnet sont inclus dès l'offre <b>Solo</b>.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Link to="/pricing" className="inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold text-navy-900" style={{ background: "linear-gradient(to bottom,#F1E2CC,#DEC2A3)" }} data-testid="bienetre-upsell-offres">Voir les offres</Link>
                  <button onClick={() => allerA("aujourdhui")} className="inline-flex items-center rounded-full border px-6 py-3 text-sm font-semibold" style={{ borderColor: "rgba(11,20,48,0.2)", color: L_NAVY }}>Revenir à ma carte du jour</button>
                </div>
              </div>
            ) : (<>
            {onglet === "parcours" && <MindsetParcours ouvert={parcoursOuvert} onOuvrir={(id) => allerA("parcours", id)} />}
            {onglet === "carnet" && <MindsetCarnet />}

            {onglet === "aujourdhui" && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <EnergieCard vitals={vitals} mood={energy?.mood} aCheckin={aCheckin} onVital={ouvrirVital} onCheckin={() => setEnergieOpen(true)} />
                  <RoueCard />
                </div>

                <div className="be-suggestion" data-testid="bienetre-suggestion">
                  <div className="min-w-0">
                    <p className="font-display text-[20px] font-semibold" style={{ color: L_NAVY }}>Suggestion du moment</p>
                    <p className="mt-0.5 text-[13px]" style={{ color: L_MUTED }} data-testid="bienetre-suggestion-texte">{sugg.texte}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button onClick={agirSuggestion} className="be-btn-navy" data-testid="bienetre-suggestion-action">{sugg.bouton}</button>
                    {sugg.action !== "creneau" && !repos && (
                      <button onClick={() => setCreneau({ duree: 15 })} className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-semibold" style={{ borderColor: "var(--be-card-border)", color: L_NAVY }} data-testid="bienetre-bloquer-creneau">
                        <CalendarPlus size={14} /> Bloquer une pause
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <button onClick={() => setSeance({ protocole: "4-7-8", ambiance: "aucune", duree: 3 })} className="be-raccourci" data-testid="bienetre-mini-respiration">
                    <Wind size={22} /> <span>Respiration guidée</span>
                  </button>
                  <button onClick={() => allerA("carnet")} className="be-raccourci" data-testid="bienetre-mini-journal">
                    <BookOpen size={22} /> <span>Journal</span>
                  </button>
                  <IntentionDuJour />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <section className="be-card" data-testid="bienetre-rituels-apercu">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-display text-[22px] font-semibold" style={{ color: L_NAVY }}>Tes rituels doux du jour</h2>
                      {serie?.jours > 0 && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--be-accent-soft)", color: L_GOLD }} data-testid="bienetre-serie">
                          <Flame size={12} /> {serie.jours} j
                        </span>
                      )}
                    </div>
                    <ul className="mt-3">
                      {ritualsDuJour.slice(0, 4).map((r) => {
                        const done = !!checked[r.id];
                        return (
                          <li key={r.id} className="border-b last:border-b-0" style={{ borderColor: "var(--be-line)" }}>
                            <button onClick={() => toggleRitual(r.id)} className="flex w-full items-center gap-3 py-2.5 text-left" data-testid={`rituel-${r.id}`}>
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border-2 transition ${done ? "be-check-on" : "be-check-off"}`}>
                                {done && <Check size={12} strokeWidth={3} />}
                              </span>
                              <span className={`text-[15px] ${done ? "line-through opacity-60" : ""}`} style={{ color: L_NAVY }}>{r.title}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <button onClick={() => allerA("rituels")} className="mt-2 text-[12.5px] font-semibold underline underline-offset-4" style={{ color: L_GOLD }}>
                      Tous les rituels · {doneCount}/{totalRituals} aujourd'hui
                    </button>
                  </section>
                  <SeanceCompacte vitals={vitals} onLancer={setSeance} />
                </div>

                <MindsetAujourdhui onOuvrirParcours={(id) => allerA("parcours", id)} onOuvrirCarnet={() => allerA("carnet")} />
              </div>
            )}

            {onglet === "rituels" && (
              <section className="be-card" data-testid="bienetre-rituels">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-display text-[22px] font-semibold" style={{ color: L_NAVY }}>Tes rituels doux</h2>
                    <p className="mt-1 text-[13px]" style={{ color: L_MUTED }}>Coche celui qui t'a fait du bien : chaque jour avec un geste pour toi (rituel, check-in ou exercice) prolonge ta série.</p>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-[20px] font-semibold" style={{ color: L_GOLD }}>{doneCount} / {totalRituals}</div>
                    {serie && <div className="text-[11.5px]" style={{ color: L_MUTED }}>{serie.jours} jour{serie.jours > 1 ? "s" : ""} de suite{serie.record > serie.jours ? ` · record ${serie.record}` : ""}</div>}
                  </div>
                </div>
                <div className="grid gap-2.5 md:grid-cols-2">
                  {repos && <p className="mb-3 rounded-xl px-3 py-2 text-[13px]" style={{ background: "var(--be-accent-soft)", color: L_NAVY }} data-testid="bienetre-repos">Jour de repos : seulement des rituels calmes, et ta série ne se casse pas si tu ne fais rien.</p>}
                  {ritualsDuJour.map((r) => {
                    const done = !!checked[r.id];
                    return (
                      <button key={r.id} onClick={() => toggleRitual(r.id)} data-testid={`rituel-liste-${r.id}`}
                        className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${done ? "be-rituel-on" : "be-rituel-off"}`}>
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border-2 ${done ? "be-check-on" : "be-check-off"}`}>
                          {done && <Check size={12} strokeWidth={3} />}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 text-[14.5px] font-semibold" style={{ color: L_NAVY }}><r.icon size={15} style={{ color: L_GOLD }} /> {r.title}</span>
                          <span className="mt-0.5 block text-[12.5px]" style={{ color: L_MUTED }}>{r.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {onglet === "outils" && (
              <div className="space-y-5">
                <div className="be-seance-dark rounded-[22px]">
                  <SeanceDuMoment vitals={vitals} onLancer={setSeance} />
                </div>
                <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                  <section className="be-card" data-testid="bienetre-courbe">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-display text-[18px] font-semibold" style={{ color: L_NAVY }}>7 derniers jours</h3>
                      {avgEnergy && <span className="text-[12px]" style={{ color: L_MUTED }}>Moyenne {avgEnergy}/5</span>}
                    </div>
                    {history.length === 0 ? (
                      <p className="py-10 text-center text-[13px]" style={{ color: L_MUTED }} data-testid="bienetre-history-empty">Ta courbe d'énergie se dessine ici après tes premiers check-ins.</p>
                    ) : (
                      <div className="flex h-40 items-end justify-between gap-2">
                        {semaine.map((j) => (
                          <div key={j.date} className="flex flex-1 flex-col items-center gap-2">
                            <div className="flex h-32 w-full items-end justify-center">
                              <span className="w-full max-w-[26px] rounded-full" style={{ height: j.energie != null ? `${(j.energie / 5) * 100}%` : "0%", background: j.jour === courbe?.analyse?.creux?.jour?.slice(0, 3) ? "#C98B84" : "var(--be-bar)" }} title={j.energie != null ? `${j.energie}/5` : "non mesuré"} />
                            </div>
                            <span className="text-[10.5px] capitalize" style={{ color: L_MUTED }}>{j.jour}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                  <InsightDuJour history={history} vitals={vitals} analyse={courbe?.analyse} onCheckin={() => setEnergieOpen(true)} onRespirer={() => setBreathingOpen(true)} />
                </div>
                <SensEquilibre />
              </div>
            )}
            </>)}
          </div>
        </main>
      </div>

      {/* Check-in modal */}
      {showCheckin && (
        <CheckinModal focus={typeof showCheckin === "string" ? showCheckin : null}
          vitals={vitals} onSave={(k, v) => { saveVital(k, v); if (typeof showCheckin === "string") setShowCheckin(false); }}
          onClose={() => setShowCheckin(false)} />
      )}
      {breathingOpen && <BreathingSession onClose={() => setBreathingOpen(false)} onTermine={seanceTerminee} />}
      {creneau && <FenetreCreneau duree={creneau.duree} onClose={() => setCreneau(null)} />}
      {seance && <BreathingSession autoStart defaultCycle={seance.protocole} durationMin={seance.duree} ambiance={seance.ambiance}
        onClose={() => setSeance(null)} onTermine={seanceTerminee} />}
      <EnergyCheckin open={energieOpen} onClose={() => { setEnergieOpen(false); setTimeout(() => { chargerVitals(); chargerCourbe(); }, 800); }} />
    </div>
  );
}

/* ── Maquette « Bien-être & Mindset » : cartes du jour (données réelles) ── */
const MOOD_SCORE = { "épuisé": 1, "fatigué": 2, neutre: 3, "aligné": 4, rayonnant: 5 };

function Anneau({ valeur }) {
  const r = 58, c = 2 * Math.PI * r;
  const pct = valeur != null ? valeur / 5 : 0;
  return (
    <svg viewBox="0 0 140 140" className="h-[140px] w-[140px] shrink-0" aria-hidden="true">
      <circle cx="70" cy="70" r={r} fill="none" style={{ stroke: "var(--be-ring-track)" }} strokeWidth="11" />
      <circle cx="70" cy="70" r={r} fill="none" stroke="#D9BE93" strokeWidth="11" strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 70 70)" style={{ transition: "stroke-dasharray .6s ease" }} />
      <text x="70" y="70" textAnchor="middle" dominantBaseline="central" fontFamily="inherit" fontSize="34" fontWeight="600" style={{ fill: L_NAVY }} className="font-display">
        {valeur != null ? `${valeur}/5` : "—"}
      </text>
    </svg>
  );
}

function EnergieCard({ vitals, mood, aCheckin, onVital, onCheckin }) {
  const humeur = aCheckin && vitals?.energy != null ? MOOD_SCORE[mood] ?? null : null;
  const tuiles = [
    { k: "sleep", label: "Sommeil", Icon: Moon, val: vitals?.sleep },
    { k: "stress", label: "Stress", Icon: Activity, val: vitals?.stress },
    { k: "energy", label: "Humeur", Icon: Smile, val: humeur },
    { k: "energy", label: "Énergie", Icon: Zap, val: vitals?.energy },
  ];
  return (
    <section className="be-card" data-testid="bienetre-energie-card">
      <h2 className="font-display text-[22px] font-semibold" style={{ color: L_NAVY }}>Ton énergie</h2>
      {vitals?.energy == null ? (
        <div className="flex flex-col items-center py-6 text-center" data-testid="bienetre-energie-vide">
          <Anneau valeur={null} />
          <p className="mt-3 max-w-[260px] text-[13px]" style={{ color: L_MUTED }}>Ton énergie s'affiche ici après ton check-in du jour — 30 secondes.</p>
          <button onClick={onCheckin} className="be-btn-navy mt-4" data-testid="bienetre-checkin-cta">Faire mon check-in</button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-5 sm:flex-nowrap sm:justify-between">
          <button onClick={onCheckin} aria-label="Refaire mon check-in énergie" data-testid="bienetre-energie-anneau"><Anneau valeur={vitals.energy} /></button>
          <div className="grid grid-cols-2 gap-2.5">
            {tuiles.map((t) => (
              <button key={t.label} onClick={() => onVital(t.k)} className="be-tuile" data-testid={`vital-${t.label.toLowerCase()}`}>
                <t.Icon size={17} style={{ color: L_NAVY }} />
                <span className="text-[11.5px]" style={{ color: L_MUTED }}>{t.label}</span>
                <span className="text-[15px] font-semibold" style={{ color: L_NAVY }}>{t.val != null ? `${t.val}/5` : "—"}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** Roue de l'équilibre : les VRAIS piliers de l'utilisateur (Vision › Roue), en radar. */
function RoueCard() {
  const [piliers, setPiliers] = useState(null);
  useEffect(() => { fetchWheel().then((r) => setPiliers(Array.isArray(r?.pillars) ? r.pillars : [])).catch(() => setPiliers([])); }, []);
  const n = piliers?.length || 0;
  const S = 260, C = S / 2, R = 78;
  const pt = (i, r) => { const a = (Math.PI * 2 * i) / n - Math.PI / 2; return [C + r * Math.cos(a), C + r * Math.sin(a)]; };
  return (
    <section className="be-card" data-testid="bienetre-roue">
      <h2 className="font-display text-[22px] font-semibold" style={{ color: L_NAVY }}>Ta roue de l'équilibre</h2>
      {piliers === null ? (
        <div className="flex h-[220px] items-center justify-center"><Loader2 className="animate-spin" size={18} style={{ color: L_GOLD }} /></div>
      ) : n < 3 ? (
        <p className="py-10 text-center text-[13px]" style={{ color: L_MUTED }}>Note tes piliers de vie pour voir ta roue.</p>
      ) : (
        <Link to="/app/vision?view=wheel" className="mt-1 block" title="Modifier ma roue" data-testid="bienetre-roue-lien">
          <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto h-[230px] w-full max-w-[300px]">
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <polygon key={f} points={piliers.map((_, i) => pt(i, R * f).join(",")).join(" ")} fill="none" style={{ stroke: "var(--be-line)" }} strokeWidth="1" />
            ))}
            {piliers.map((p, i) => {
              const v = Math.max(0.06, (Number(p.score) || 0) / 100);
              const a = pt(i, R * v), b = pt(i + 1, R * Math.max(0.06, (Number(piliers[(i + 1) % n].score) || 0) / 100));
              return <polygon key={`w${i}`} points={`${C},${C} ${a.join(",")} ${b.join(",")}`} fill={p.color || "#D9BE93"} fillOpacity="0.45" stroke={p.color || "#D9BE93"} strokeWidth="1" />;
            })}
            {piliers.map((p, i) => {
              const [x, y] = pt(i, R + 22);
              return <text key={`t${i}`} x={x} y={y} textAnchor={Math.abs(x - C) < 8 ? "middle" : x > C ? "start" : "end"} dominantBaseline="middle" fontSize="10" style={{ fill: L_NAVY }}>{p.name}</text>;
            })}
          </svg>
        </Link>
      )}
      <Link to="/app/diagnostic" className="mt-2 block text-center text-[13px] font-semibold underline-offset-4 hover:underline" style={{ color: L_GOLD }} data-testid="bienetre-diagnostic">
        Faire mon diagnostic d'équilibre (3 min) →
      </Link>
    </section>
  );
}

/** Bloquer une vraie pause : une action dans le Plan d'action + un rappel Telegram si relié. */
function FenetreCreneau({ duree: dureeInit = 15, onClose }) {
  const dans = (min) => { const d = new Date(Date.now() + min * 60000); d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes() % 60).padStart(2, "0")}`; };
  const [heure, setHeure] = useState(dans(30));
  const [duree, setDuree] = useState(dureeInit);
  const [envoi, setEnvoi] = useState(false);
  const valider = async () => {
    setEnvoi(true);
    try {
      const r = await bloquerPause({ heure, duree, rappel: true });
      toast.success(`${r.titre} : ajoutée à ton Plan d'action${r.telegram ? " · rappel Telegram programmé" : ""}.`);
      onClose();
    } catch (e) { toast.error(e.message || "Impossible pour le moment."); setEnvoi(false); }
  };
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose}>
      <div className="fenetre w-full max-w-sm rounded-2xl p-5 text-offwhite" onClick={(e) => e.stopPropagation()} data-testid="bienetre-fenetre-creneau">
        <div className="flex items-center justify-between"><p className="font-display text-lg font-semibold">Bloquer une pause</p><button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 text-offwhite/60 hover:bg-white/10"><X size={18} /></button></div>
        <p className="mt-1 text-[13px] text-offwhite/60">Elle arrive dans ton Plan d'action ; si ton Copilote Telegram est relié, il te prévient à l'heure.</p>
        <label className="mt-4 block text-xs text-offwhite/60">À quelle heure ?</label>
        <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm" data-testid="creneau-heure" />
        <label className="mt-3 block text-xs text-offwhite/60">Combien de temps ?</label>
        <div className="mt-1 flex gap-2">{[10, 15, 20, 30].map((d) => <button key={d} onClick={() => setDuree(d)} className={`flex-1 rounded-xl border px-2 py-2 text-sm ${duree === d ? "border-gold bg-gold text-navy-900" : "border-white/15"}`}>{d} min</button>)}</div>
        <button onClick={valider} disabled={envoi} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-2.5 text-sm font-semibold text-navy-900 disabled:opacity-60" data-testid="creneau-valider">
          {envoi ? <Loader2 size={15} className="animate-spin" /> : <CalendarPlus size={15} />} Bloquer {duree} min à {heure}
        </button>
      </div>
    </div>
  );
}

/** Intention du jour : enregistrée sur le compte (profil), pas dans le navigateur. */
function IntentionDuJour() {
  const auj = new Date().toISOString().slice(0, 10);
  const [texte, setTexte] = useState("");
  const [edition, setEdition] = useState(false);
  useEffect(() => {
    fetchState().then((d) => {
      const cm = d?.vision?.contexte_metier || {};
      if (cm.intention_jour_date === auj) setTexte(cm.intention_jour || "");
    }).catch(() => {});
  }, [auj]);
  const enregistrer = async () => {
    setEdition(false);
    try { await saveProfile({ contexte_metier: { intention_jour: texte.trim().slice(0, 200), intention_jour_date: auj } }); if (texte.trim()) toast.success("Intention posée pour aujourd'hui."); }
    catch { toast.error("Enregistrement impossible."); }
  };
  if (edition) {
    return (
      <div className="be-raccourci !justify-start" data-testid="bienetre-mini-intention">
        <input autoFocus value={texte} onChange={(e) => setTexte(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enregistrer()} onBlur={enregistrer}
          placeholder="Aujourd'hui, je…" maxLength={200} className="be-input w-full rounded-lg border px-2 py-1.5 text-[13px]" data-testid="bienetre-intention-input" />
      </div>
    );
  }
  return (
    <button onClick={() => setEdition(true)} className="be-raccourci" data-testid="bienetre-mini-intention">
      <PenLine size={22} />
      {texte ? <span className="line-clamp-2 font-hand text-[19px] leading-tight">{texte}</span> : <span>Intention du jour</span>}
    </button>
  );
}

/** Séance du moment — version compacte (carte navy de la maquette). */
function SeanceCompacte({ vitals, onLancer }) {
  const conseil = vitals?.stress >= 4 ? "coherence" : vitals?.energy != null && vitals.energy <= 2 ? "4-7-8" : "box";
  const [proto, setProto] = useState(conseil);
  useEffect(() => { setProto(conseil); }, [conseil]);
  return (
    <section className="be-seance-compacte flex flex-col items-center justify-center rounded-[22px] px-6 py-7 text-center" data-testid="seance-du-moment">
      <h2 className="font-display text-[22px] font-semibold" style={{ color: "#F6F1E9" }}>Séance du moment</h2>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {[["4-7-8", "4-7-8"], ["coherence", "Cohérence"], ["box", "Box"]].map(([id, l]) => (
          <button key={id} onClick={() => setProto(id)} data-testid={`seance-protocole-${id}`}
            className="rounded-full border px-4 py-1.5 text-[14px] transition"
            style={proto === id ? { borderColor: "#D9BE93", background: "rgba(217,190,147,0.18)", color: "#F6F1E9" } : { borderColor: "rgba(246,241,233,0.35)", color: "rgba(246,241,233,0.8)" }}>
            {l}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11.5px]" style={{ color: "rgba(246,241,233,0.55)" }}>{PROTOCOLES[proto]?.desc}</p>
      <button onClick={() => onLancer({ protocole: proto, ambiance: "aucune", duree: proto === "coherence" ? 5 : 3 })} data-testid="seance-lancer"
        className="mt-5 flex h-[76px] w-[76px] items-center justify-center rounded-full text-[15px] font-semibold"
        style={{ background: "#D9BE93", color: "#1C2746", boxShadow: "0 0 0 8px rgba(246,241,233,0.12)" }}>
        Commencer
      </button>
    </section>
  );
}

/** Séance du moment : un seul lecteur — protocole, ambiance sonore (vraie, générée en direct) et durée. */
function SeanceDuMoment({ vitals, onLancer }) {
  const heure = new Date().getHours();
  const conseil = vitals?.stress >= 4 ? "coherence" : vitals?.energy != null && vitals.energy <= 2 ? "4-7-8" : heure >= 19 ? "refuge" : "box";
  const [protocole, setProtocole] = useState(conseil);
  const [ambiance, setAmbiance] = useState("pluie");
  const [duree, setDuree] = useState(5);
  const [ecoute, setEcoute] = useState(null);
  useEffect(() => { setProtocole(conseil); }, [conseil]);
  useEffect(() => () => arreterAmbiance(), []);
  const essayer = (id) => {
    if (ecoute === id || id === "aucune") { arreterAmbiance(); setEcoute(null); return; }
    if (jouerAmbiance(id, 0.5)) setEcoute(id);
  };
  const lancer = () => { arreterAmbiance(); setEcoute(null); onLancer({ protocole, ambiance, duree }); };
  const choix = (actif) => `rounded-xl border px-3 py-2 text-left transition ${actif ? "border-[#DEC2A3] bg-[#DEC2A3]/12" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`;
  const raison = { coherence: "ton stress est élevé", "4-7-8": "ton énergie est basse", refuge: "la journée se termine", box: "pour rester concentré" }[conseil];
  return (
    <section className="mt-6 lg:mt-0 relative overflow-hidden rounded-2xl border border-white/12 p-5 sm:p-7" data-testid="seance-du-moment"
      style={{ background: "linear-gradient(135deg, rgba(96,165,250,0.14), rgba(147,197,253,0.08), rgba(56,178,172,0.09))" }}>
      <div className="flex items-center gap-2">
        <Wind size={16} style={{ color: GOLD }} />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.24em]" style={{ color: GOLD }}>Séance du moment</span>
      </div>
      <h3 className="mt-2 font-display text-[22px] font-semibold text-white sm:text-[26px]">Une pause guidée, <span className="font-serif-italic italic" style={{ color: GOLD }}>avec le son</span>.</h3>
      <p className="mt-1 text-[13px] text-white/60">Conseillée maintenant : <b className="text-white/85">{PROTOCOLES[conseil].name}</b>, parce que {raison}.</p>

      <p className="mt-5 mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">Protocole</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(PROTOCOLES).map(([id, p]) => (
          <button key={id} onClick={() => setProtocole(id)} className={choix(protocole === id)} data-testid={`seance-protocole-${id}`}>
            <span className="block text-[13px] font-semibold text-white">{p.name}</span>
            <span className="block text-[11.5px] text-white/55">{p.desc}</span>
          </button>
        ))}
      </div>

      <p className="mt-5 mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">Ambiance sonore · touche pour écouter</p>
      <div className="flex flex-wrap gap-2">
        {AMBIANCES_SON.map((a) => (
          <button key={a.id} onClick={() => { setAmbiance(a.id); essayer(a.id); }} data-testid={`seance-son-${a.id}`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] transition ${ambiance === a.id ? "border-[#DEC2A3] bg-[#DEC2A3]/15 text-white" : "border-white/15 text-white/70 hover:border-white/30"}`}>
            {ecoute === a.id ? <Square size={11} fill="currentColor" /> : a.id !== "aucune" ? <Volume2 size={13} /> : null} {a.label}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">Durée</span>
        {[3, 5, 8, 12].map((m) => (
          <button key={m} onClick={() => setDuree(m)} className={`rounded-full px-3 py-1 text-[12px] font-semibold ${duree === m ? "text-navy-900" : "border border-white/15 text-white/70"}`}
            style={duree === m ? { background: GOLD } : {}}>{m} min</button>
        ))}
        <button onClick={lancer} className="ml-auto inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold text-navy-900" style={{ background: GOLD }} data-testid="seance-lancer">
          <Play size={15} fill="currentColor" /> Lancer · {duree} min
        </button>
      </div>
    </section>
  );
}

/** Insight calculé sur tes vrais check-ins (avant : une phrase inventée, identique pour tout le monde). */
function InsightDuJour({ history, vitals, analyse, onCheckin, onRespirer }) {
  let titre, texte, action = null;
  const n = history.length;
  if (n < 3) {
    titre = n === 0 ? "Pas encore assez de mesures" : `${n} check-in${n > 1 ? "s" : ""} sur 3`;
    texte = "Dès 3 check-ins, Zayado repère ta tendance d'énergie et te propose le bon rythme pour la journée.";
    action = { label: "Faire mon check-in", onClick: onCheckin };
  } else {
    const moy = history.reduce((a, b) => a + b, 0) / n;
    const recents = history.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const avant = n > 3 ? history.slice(0, -3).reduce((a, b) => a + b, 0) / (n - 3) : recents;
    const tendance = recents - avant >= 0.5 ? "en hausse" : avant - recents >= 0.5 ? "en baisse" : "stable";
    titre = `Énergie moyenne ${moy.toFixed(1)}/5 · ${tendance}`;
    if (recents <= 2.5 || (vitals?.stress && vitals.stress >= 4)) {
      texte = "Tes derniers jours sont exigeants. Allège ta liste d'aujourd'hui à une seule priorité et offre-toi 5 minutes de respiration.";
      action = { label: "Respirer 5 min", onClick: onRespirer };
    } else if (tendance === "en baisse") {
      texte = "Ton énergie baisse depuis quelques jours : garde tes tâches exigeantes pour le matin et protège une vraie pause.";
      action = { label: "Faire une pause guidée", onClick: onRespirer };
    } else {
      texte = "Bonne dynamique : c'est le bon moment pour avancer sur ta priorité la plus importante.";
    }
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6" data-testid="bienetre-insight">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={15} style={{ color: GOLD }} />
        <h3 className="font-display text-[15px] font-semibold">Insight du jour</h3>
      </div>
      <p className="font-serif-italic italic text-[16px] leading-snug text-white/90">{titre}</p>
      <p className="mt-3 text-[13px] leading-relaxed text-white/60">{texte}</p>
      {analyse?.creux && (
        <p className="mt-3 rounded-xl border border-rose-300/25 bg-rose-300/[0.07] px-3 py-2 text-[12.5px] leading-relaxed text-white/85" data-testid="bienetre-creux">
          <b className="capitalize">{analyse.creux.jour}</b> = ton creux ({analyse.creux.moyenne}/5) → planifie léger ce jour-là.
        </p>
      )}
      {analyse?.fort && (
        <p className="mt-2 rounded-xl border border-emerald-300/25 bg-emerald-300/[0.07] px-3 py-2 text-[12.5px] leading-relaxed text-white/85" data-testid="bienetre-fort">
          <b className="capitalize">{analyse.fort.jour}</b> = ton jour fort ({analyse.fort.moyenne}/5) → garde-le pour prospecter et vendre.
        </p>
      )}
      {action && (
        <button onClick={action.onClick} className="mt-4 w-full rounded-lg py-2 text-[12px] font-semibold text-navy-900" style={{ background: GOLD }}>{action.label}</button>
      )}
    </div>
  );
}

const PALIER_MOTS = {
  energy: ["À plat", "Basse", "Moyenne", "Bonne", "Au top"],
  stress: ["Zen", "Léger", "Présent", "Fort", "Écrasant"],
  sleep:  ["Très mal", "Mal", "Moyen", "Bien", "Très bien"],
  load:   ["Légère", "Calme", "Chargée", "Lourde", "Débordée"],
};

function CheckinModal({ focus, vitals, onSave, onClose }) {
  const [tab, setTab] = useState(focus && focus !== "energy" ? focus : "stress");
  const v = VITALS_LABEL[tab];
  const [choix, setChoix] = useState(null);
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0b1a3d]/70 backdrop-blur-sm p-4 sm:items-center" onClick={onClose}>
      <div className="fenetre w-full max-w-md rounded-t-2xl p-6 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${v.color}22` }}>
            <v.icon size={20} style={{ color: v.color }} />
          </div>
          <div>
            <div className="font-display text-[17px] font-semibold text-white">Check-in {v.label.toLowerCase()}</div>
            <div className="text-[12px] text-white/55">{v.desc}</div>
          </div>
        </div>
        {!focus && (
          <div className="mb-4 flex gap-1 rounded-lg bg-white/5 p-1">
            {Object.entries(VITALS_LABEL).filter(([k]) => k !== "energy").map(([k, val]) => (
              <button key={k} onClick={() => { setTab(k); setChoix(null); }}
                className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition ${tab === k ? "text-navy-900" : "text-white/70 hover:text-white"}`}
                style={tab === k ? { background: val.color } : {}}>
                {val.label}
              </button>
            ))}
          </div>
        )}
        <p className="mb-2 text-center text-[12px] text-white/60">Choisis le mot qui te ressemble — pas besoin de penser en chiffres.</p>
        <div className="mb-2 flex justify-between gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => { setChoix(n); onSave(tab, n); toast.success(`${v.label} : ${PALIER_MOTS[tab][n - 1]}`); }}
              data-testid={`checkin-vital-${tab}-${n}`}
              className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl border-2 py-2.5 transition ${(choix ?? vitals?.[tab]) === n ? "border-transparent text-navy-900" : "border-white/15 text-white hover:border-white/40"}`}
              style={(choix ?? vitals?.[tab]) === n ? { background: v.color } : {}}>
              <span className="font-display text-[20px] font-semibold leading-none">{n}</span>
              <span className={`text-[9px] font-medium leading-tight text-center ${(choix ?? vitals?.[tab]) === n ? "text-navy-900/80" : "text-white/55"}`}>{PALIER_MOTS[tab][n - 1]}</span>
            </button>
          ))}
        </div>
        <p className="text-center text-[12px] text-white/50 font-serif-italic italic">
          Aucune obligation. Juste une lecture douce de toi.
        </p>
      </div>
    </div>
  );
}
