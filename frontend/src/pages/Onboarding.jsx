import { ChoixPays } from "@/components/kairos/ChoixPays";
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { useKairos } from "@/context/KairosContext";
import { valuesLibrary } from "@/mock/data";
import { saveProfile, savePouls, postCheckin, fetchTarifsFondateur, fetchState, scellerLettre, fetchBoard, saveBoard } from "@/lib/kairosApi";
import { toast } from "sonner";
import { PLANS, PLANS_LANCEMENT, PLAN_ENTREPRISE, prixFondateurMois, ESSAI, REVEUR_OFFERT, essaiDuree, essaiPeriode } from "@/lib/plans";
import { lancerPaiement } from "@/lib/checkout";
import { activerPush, pushSupporte } from "@/lib/push";
import { THESUSTAIN_URL } from "@/components/kairos/TheSustainInfo";
import {
  Sparkles, ArrowRight, ArrowLeft, Plus, Check, Loader2, Rocket, Briefcase, MessagesSquare, ShoppingBag,
  Building2, Hammer, HeartPulse, Laptop, Palette, UtensilsCrossed, Flame, Zap, CalendarDays, Clock, Info, HeartHandshake, Lock, Bell,
} from "lucide-react";

// Onboarding « jeu » : une question par écran, des choix à toucher, très peu de
// texte à taper (seulement le prénom, et « Autre » quand aucune proposition ne va).
// Chaque étape peut être passée. La première mesure d'énergie devient un vrai check-in.

const ETAPES = ["intro", "prenom", "activite", "cap", "vision", "objectifs", "energie", "rythme", "valeurs", "sens", "lettre", "offre", "pret"];
const NB = ETAPES.length - 1; // l'intro ne compte pas
// « Ta foi » est une valeur à part entière : la choisir ouvre l'étape TheSustain (sinon elle est sautée).
const FOI_VALEUR = "Ta foi";
const IDX_VALEURS = ETAPES.indexOf("valeurs");
const IDX_SENS = ETAPES.indexOf("sens");

const ROLES = ["Fondateur·rice", "Indépendant·e", "Coach / consultant·e", "Commerçant·e", "Artisan", "Salarié·e avec un projet"];
const ACTIVITES = [
  { v: "Coaching & conseil", icon: MessagesSquare },
  { v: "Services aux entreprises", icon: Briefcase },
  { v: "Commerce & e-commerce", icon: ShoppingBag },
  { v: "Immobilier", icon: Building2 },
  { v: "Artisanat & BTP", icon: Hammer },
  { v: "Santé & bien-être", icon: HeartPulse },
  { v: "Tech & digital", icon: Laptop },
  { v: "Création & contenu", icon: Palette },
  { v: "Restauration", icon: UtensilsCrossed },
];
// Lettre à son futur moi : durées proposées (en jours) — la lettre reste scellée jusqu'à la date.
const DUREES_LETTRE = [["3m", "Dans 3 mois", 91], ["6m", "Dans 6 mois", 182], ["12m", "Dans 1 an", 365]];
const dateDans = (jours) => { const d = new Date(); d.setDate(d.getDate() + jours); return d.toISOString().slice(0, 10); };
const CLIENTELES = [["b2c", "Des particuliers"], ["b2b", "Des pros"], ["mixte", "Les deux"]];

const OBJ_CA = [1000, 3000, 5000, 10000, 20000];
const TRANCHES = [["demarrage", "Je démarre"], ["moins_1k", "Moins de 1 000 €"], ["1k_3k", "1 000 – 3 000 €"], ["3k_10k", "3 000 – 10 000 €"], ["plus_10k", "Plus de 10 000 €"]];
const VISIONS = ["Vivre sereinement de mon activité", "Faire grandir mon chiffre d'affaires", "Construire une équipe", "Lancer un nouveau projet", "Retrouver du temps pour moi et mes proches", "Avoir plus d'impact"];
const MOTEURS = ["Ma liberté", "Ma famille", "La sécurité financière", "Avoir un impact", "Transmettre", "Le sens / ma foi"];
const ENERGIES = [
  { mot: "À plat", sous: "On y va doucement", face: "😞" },
  { mot: "Basse", sous: "Petits pas aujourd'hui", face: "🙁" },
  { mot: "Moyenne", sous: "Ça tient la route", face: "😐" },
  { mot: "Bonne", sous: "Prêt·e à avancer", face: "🙂" },
  { mot: "Au top", sous: "On en profite", face: "😊" },
];
const RYTHMES = [
  { min: 5, mot: "Express", sous: "Juste l'essentiel" },
  { min: 10, mot: "Léger", sous: "Tranquille" },
  { min: 15, mot: "Régulier", sous: "Le bon rythme" },
  { min: 30, mot: "Intensif", sous: "À fond" },
];
const JOURS = [["1", "L"], ["2", "M"], ["3", "M"], ["4", "J"], ["5", "V"], ["6", "S"], ["0", "D"]];
const RAPPELS = [["Matin", "08:00"], ["Midi", "12:00"], ["Soir", "20:00"]];

// Réponses pré-cochées selon le métier (on peut enchaîner « Continuer » sans réfléchir).
const PRESETS = {
  "Coaching & conseil": { clientele: "mixte", objectifs: ["Signer 3 nouveaux clients", "Publier 2 fois par semaine"], rythme: 2 },
  "Services aux entreprises": { clientele: "b2b", objectifs: ["Signer 3 nouveaux clients", "Trouver 2 partenaires qui me recommandent"], rythme: 2 },
  "Commerce & e-commerce": { clientele: "b2c", objectifs: ["Publier 2 fois par semaine", "Mettre de l'ordre dans mes finances"], rythme: 1 },
  "Immobilier": { clientele: "b2c", objectifs: ["Signer 3 nouveaux clients", "Trouver 2 partenaires qui me recommandent"], rythme: 2 },
  "Artisanat & BTP": { clientele: "mixte", objectifs: ["Trouver 2 partenaires qui me recommandent", "Mettre de l'ordre dans mes finances"], rythme: 1 },
  "Santé & bien-être": { clientele: "b2c", objectifs: ["Signer 3 nouveaux clients", "Publier 2 fois par semaine"], rythme: 1 },
  "Tech & digital": { clientele: "b2b", objectifs: ["Signer 3 nouveaux clients", "Lancer ma nouvelle offre"], rythme: 3 },
  "Création & contenu": { clientele: "mixte", objectifs: ["Publier 2 fois par semaine", "Lancer ma nouvelle offre"], rythme: 2 },
  "Restauration": { clientele: "b2c", objectifs: ["Publier 2 fois par semaine", "Mettre de l'ordre dans mes finances"], rythme: 0 },
};

// Ce que le Copilote répond selon les choix (il « écoute »).
const PHRASES_ACTIVITE = {
  "Coaching & conseil": { b2b: "Coaching pour des pros ? Je pourrai te proposer des DRH et des dirigeants à contacter.", b2c: "Coaching pour des particuliers ? Je pourrai te montrer ce que les gens cherchent près de chez toi.", mixte: "Pros et particuliers : je pourrai chercher des décideurs ET ce que les gens tapent sur Google." },
  "Services aux entreprises": { _: "Je pourrai te proposer de vraies entreprises à contacter, avec le message prêt. Le nombre dépend de ta formule." },
  "Commerce & e-commerce": { _: "Commerce ? Je pourrai t'aider sur ta visibilité locale, tes avis et tes pubs." },
  "Immobilier": { _: "Immobilier ? Je pourrai suivre les ventes réelles de ta commune et te suggérer des notaires à contacter." },
  "Artisanat & BTP": { _: "Artisan ? Je pourrai te suggérer des prescripteurs : architectes, agences, syndics." },
  "Santé & bien-être": { _: "Je pourrai t'aider à être trouvé·e par ceux qui cherchent déjà un praticien près de chez eux." },
  "Tech & digital": { _: "Je pourrai repérer des entreprises qui recrutent ou qui lèvent des fonds : elles ont des besoins." },
  "Création & contenu": { _: "Je pourrai t'aider à rendre ton travail visible, sans t'épuiser à poster tous les jours." },
  "Restauration": { _: "Je pourrai t'aider à remplir tes tables avec Google, les avis et des idées d'événements." },
};
// Ce que le Radar fait réellement selon la formule (aligné sur backend/apollo_ext.py : QUOTAS_DEFAUT, 0 sans offre).
const RADAR_PAR_PLAN = {
  reveur: "Pas de Radar prospects : cette formule sert à poser ta vision et tes idées.",
  serenite: "Radar : jusqu'à 30 vrais prospects par mois (quota réduit pendant l'essai).",
  pro: "Radar : jusqu'à 90 vrais prospects par mois.",
  business: "Radar : jusqu'à 150 vrais prospects par mois pour toi.",
};
const CLE_BROUILLON = "zayado_onboarding_brouillon";

const fmtEur = (n) => `${n.toLocaleString("fr-FR")} €`;

const construirePlans = (fondateurOuvert) => [
  ...PLANS_LANCEMENT.map((p) => {
    const fonda = fondateurOuvert ? prixFondateurMois(p, "mensuel") : null;
    const essai = ESSAI.plans.includes(p.key);
    const offert = p.key === REVEUR_OFFERT.plan;
    const ttc = p.key === "reveur" ? "TTC" : "HT";
    return {
      key: p.key, court: p.nom, name: essai ? `${p.nom} · ${essaiDuree()} pour ${ESSAI.prix} €` : offert ? `${p.nom} · 1 mois offert` : p.nom,
      price: essai ? `${ESSAI.prix} €` : offert ? "0 €" : `${fonda ?? p.mensuel} €`, old: !essai && !offert && fonda != null ? `${p.mensuel} €` : null,
      period: essai ? `${essaiPeriode()}, puis ${fonda ?? p.mensuel} € HT / mois${fonda != null ? " (tarif fondateur)" : ""}`
        : offert ? `le 1er mois, sans carte bancaire, puis ${p.mensuel} € ${ttc} / mois`
        : (fonda != null ? "HT / mois · tarif fondateur" : "HT / mois"),
      bandeau: essai ? `${essaiDuree()} pour ${ESSAI.prix} €` : offert ? "1 mois offert" : null,
      features: p.points.slice(0, 5), highlight: !!p.star,
    };
  }),
  ...PLANS.filter((p) => p.key === "business").map((p) => ({
    key: p.key, court: p.nom, name: p.nom, price: `${p.mensuel} €`, old: null, period: "HT / mois · toi + 2 comptes Solo",
    features: p.points.slice(0, 5), highlight: false,
  })),
  { key: PLAN_ENTREPRISE.key, court: "Entreprise", name: "Entreprise", price: "Sur contact", period: "", features: ["Au-delà de 3 personnes", "Accompagnement dédié"], highlight: false },
];

// Étape « offre » : onglets en haut, UNE carte détaillée à la fois ; on glisse à gauche / à droite pour changer d'offre.
function ChoixOffre({ plans, plan, setPlan }) {
  const idx = Math.max(0, plans.findIndex((p) => p.key === plan));
  const p = plans[idx] || plans[0];
  const depart = React.useRef(null);
  const aller = (n) => { const k = plans[(idx + n + plans.length) % plans.length]; if (k) setPlan(k.key); };
  return (
    <div data-testid="onboarding-plans">
      <div className="-mx-1 flex justify-center">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/15 bg-white/[0.06] p-1 [scrollbar-width:none]" role="tablist" aria-label="Offres">
          {plans.map((x) => (
            <button key={x.key} role="tab" aria-selected={x.key === p.key} onClick={() => setPlan(x.key)} data-testid={`onboarding-plan-${x.key}`}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${x.key === p.key ? "bg-offwhite text-navy-900" : "text-offwhite/65 hover:text-offwhite"}`}>
              {x.court}
            </button>
          ))}
        </div>
      </div>
      <div key={p.key} className="relative mt-5 rounded-3xl border border-gold/50 bg-white/[0.07] p-5 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.6)]"
        onTouchStart={(e) => { depart.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { if (depart.current == null) return; const d = e.changedTouches[0].clientX - depart.current; depart.current = null; if (Math.abs(d) > 45) aller(d < 0 ? 1 : -1); }}
        data-testid="onboarding-carte-offre">
        {(p.bandeau || p.highlight) && <p className="absolute -top-3 left-5 rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-navy-900">{p.bandeau || "Recommandé"}</p>}
        <p className="font-display text-2xl font-bold text-offwhite">{p.court}</p>
        <p className="mt-3">
          {p.old && <span className="mr-2 text-base text-offwhite/40 line-through">{p.old}</span>}
          <span className="font-display text-4xl font-extrabold text-offwhite">{p.price}</span>
        </p>
        {p.period && <p className="mt-1 text-[12.5px] text-offwhite/65">{p.period}</p>}
        {RADAR_PAR_PLAN[p.key] && <p className="mt-2 text-[12.5px] text-gold/90">{RADAR_PAR_PLAN[p.key]}</p>}
        <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
          {p.features.map((f) => <li key={f} className="flex gap-2.5 text-[14px] text-offwhite/85"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />{f}</li>)}
        </ul>
        <p className="mt-4 flex items-center justify-center gap-2 text-[12px] text-offwhite/45">
          <button type="button" onClick={() => aller(-1)} className="rounded-full px-2 py-1 hover:text-offwhite" aria-label="Offre précédente">‹</button>
          {plans.map((x) => <span key={x.key} className={`h-1.5 rounded-full transition-all ${x.key === p.key ? "w-5 bg-gold" : "w-1.5 bg-white/25"}`} />)}
          <button type="button" onClick={() => aller(1)} className="rounded-full px-2 py-1 hover:text-offwhite" aria-label="Offre suivante">›</button>
        </p>
      </div>
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, setOnboardingData } = useKairos();
  const [i, setI] = useState(0);
  const etape = ETAPES[i];

  const [prenom, setPrenom] = useState(user.firstName && user.firstName !== "toi" ? user.firstName : "");
  // Le prénom connu (inscription, Google…) arrive après le premier rendu : on pré-remplit.
  useEffect(() => {
    if (user.firstName && user.firstName !== "toi") setPrenom((p) => p || user.firstName);
  }, [user.firstName]);
  const [role, setRole] = useState("");
  const [activite, setActivite] = useState("");
  const [activiteAutre, setActiviteAutre] = useState("");
  const [clientele, setClientele] = useState("");
  const [marche, setMarche] = useState("france");
  const [marcheLabel, setMarcheLabel] = useState("France");
  const [caObjectif, setCaObjectif] = useState(0);
  const [tranche, setTranche] = useState("");
  const [visions, setVisions] = useState([]);
  const [visionAutre, setVisionAutre] = useState("");
  const [goals, setGoals] = useState([]);
  const [goalAutre, setGoalAutre] = useState("");
  const [energie, setEnergie] = useState(3);
  const [energieTouchee, setEnergieTouchee] = useState(false);
  const [rythme, setRythme] = useState(2);
  const [jours, setJours] = useState(["1", "2", "3", "4", "5"]);
  const [rappel, setRappel] = useState("08:00");
  const [notifOk, setNotifOk] = useState(false);
  const [notifEnCours, setNotifEnCours] = useState(false);
  const [values, setValues] = useState([]);
  const [moteur, setMoteur] = useState("");
  // Plus de question « Non merci / Ça m'intéresse » : c'est le choix de « Ta foi » dans les valeurs qui décide.
  const sensActif = values.includes(FOI_VALEUR);
  const foiChoix = sensActif ? "oui" : (i > IDX_VALEURS ? "non" : null);
  const totalEtapes = NB - (sensActif ? 0 : 1);
  const positionEtape = i - (!sensActif && i > IDX_SENS ? 1 : 0);
  const [foiMotivation, setFoiMotivation] = useState("");
  const [lettreTexte, setLettreTexte] = useState("");
  const [lettreDuree, setLettreDuree] = useState("6m");
  const [rythmeTouche, setRythmeTouche] = useState(false);
  const [retourMsg, setRetourMsg] = useState("");
  const [pret, setPret] = useState(false); // brouillon restauré (ou absent) : on peut enregistrer
  const [waouh, setWaouh] = useState(null); // 1re opportunité du Radar, montrée avant le paiement

  // ── Reprendre là où on s'est arrêté (ce navigateur, sinon le compte) ──
  const brouillonActuel = () => ({ i, prenom, role, activite, activiteAutre, clientele, marche, marcheLabel, caObjectif, tranche, visions, visionAutre,
    goals, energie, energieTouchee, rythme, rythmeTouche, jours, rappel, values, moteur, foiChoix,
    foiMotivation: foiMotivation.slice(0, 300), lettreTexte: lettreTexte.slice(0, 300), lettreDuree });
  const appliquerBrouillon = (b) => {
    if (!b || !b.i) return false;
    const set = { prenom: setPrenom, role: setRole, activite: setActivite, activiteAutre: setActiviteAutre, clientele: setClientele, marche: setMarche, marcheLabel: setMarcheLabel,
      caObjectif: setCaObjectif, tranche: setTranche, visions: setVisions, visionAutre: setVisionAutre, goals: setGoals, energie: setEnergie,
      energieTouchee: setEnergieTouchee, rythme: setRythme, rythmeTouche: setRythmeTouche, jours: setJours, rappel: setRappel, values: setValues,
      moteur: setMoteur, foiMotivation: setFoiMotivation, lettreTexte: setLettreTexte, lettreDuree: setLettreDuree };
    Object.entries(set).forEach(([k, f]) => { if (b[k] !== undefined && b[k] !== null) f(b[k]); });
    // Ancien brouillon : « Ça m'intéresse » devient la valeur « Ta foi ».
    if (b.foiChoix === "oui") setValues((v) => (v.includes(FOI_VALEUR) ? v : [...v.slice(0, 4), FOI_VALEUR]));
    const etape = Math.min(Number(b.i) || 0, ETAPES.length - 1);
    setI(etape);
    const reste = NB - etape;
    setRetourMsg(reste > 0 ? `Te revoilà ! Il te reste ${reste} question${reste > 1 ? "s" : ""}, on reprend là où tu t'étais arrêté·e.` : "Te revoilà ! Tout est prêt, il ne reste que la validation.");
    return true;
  };

  const planParam = searchParams.get("plan");
  const cycleParam = searchParams.get("cycle") === "annuel" ? "annuel" : "mensuel";
  const [fondateurOuvert, setFondateurOuvert] = useState(false);
  useEffect(() => { fetchTarifsFondateur().then((d) => setFondateurOuvert(!!d.ouverte)).catch(() => {}); }, []);
  // Un compte déjà onboardé ne repasse plus par ce parcours (?refaire=1 pour le forcer).
  useEffect(() => {
    let local = null;
    try { local = JSON.parse(localStorage.getItem(CLE_BROUILLON) || "null"); } catch { /* stockage indisponible */ }
    fetchState().then((s) => {
      if (s?.onboarded && searchParams.get("refaire") !== "1") { navigate("/app", { replace: true }); return; }
      let serveur = null;
      try { serveur = JSON.parse(s?.vision?.contexte_metier?.onboarding_brouillon || "null"); } catch { /* brouillon illisible */ }
      appliquerBrouillon((local?.i || 0) >= (serveur?.i || 0) ? local : serveur);
    }).catch(() => appliquerBrouillon(local)).finally(() => setPret(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Chaque changement d'étape est enregistré : même étape au retour, et relance du Copilote le lendemain.
  useEffect(() => {
    if (!pret || i === 0) return;
    const b = JSON.stringify(brouillonActuel());
    try { localStorage.setItem(CLE_BROUILLON, b); } catch { /* stockage indisponible */ }
    saveProfile({ contexte_metier: { onboarding_etape: i, onboarding_total: NB, onboarding_maj: new Date().toISOString(), onboarding_brouillon: b.slice(0, 1990) } }).catch(() => {});
  }, [i, pret]); // eslint-disable-line react-hooks/exhaustive-deps
  const LISTE_PLANS = construirePlans(fondateurOuvert);
  const [plan, setPlan] = useState(["reveur", "serenite", "pro", "business", "entreprise"].includes(planParam) ? planParam : "serenite");
  const [saving, setSaving] = useState(false);
  const [savePhase, setSavePhase] = useState(0);
  const [saveError, setSaveError] = useState("");

  // L'étape TheSustain n'apparaît que si « Ta foi » a été choisie dans les valeurs.
  const saute = (n) => n === IDX_SENS && !values.includes(FOI_VALEUR);
  const suivant = () => { setRetourMsg(""); setI((s) => { let n = s + 1; if (saute(n)) n += 1; return Math.min(n, ETAPES.length - 1); }); };

  // Choisir un métier pré-coche clientèle, objectifs et rythme (si pas déjà choisis).
  const choisirActivite = (v) => {
    setActivite(v);
    const pr = PRESETS[v];
    if (!pr) return;
    if (!clientele) setClientele(pr.clientele);
    if (!goals.length) setGoals(pr.objectifs);
    if (!rythmeTouche) setRythme(pr.rythme);
    if (!visions.length) setVisions(["Vivre sereinement de mon activité"]);
  };

  const reaction = (() => {
    if (retourMsg) return retourMsg;
    switch (etape) {
      case "prenom": return prenom.trim() ? `Enchanté·e ${prenom.trim()} !${role ? ` ${role}, je vois le genre de journées que tu vis.` : ""}` : "";
      case "activite": {
        const ph = PHRASES_ACTIVITE[activite];
        return ph ? (ph[clientele] || ph._ || ph.b2b) : activite === "Autre" && activiteAutre.trim() ? `${activiteAutre.trim()} : je m'adapte, promis.` : "";
      }
      case "cap": return caObjectif ? `${fmtEur(caObjectif)} par mois, c'est environ ${fmtEur(Math.round(caObjectif / 21))} par jour ouvré. On y va pas à pas.` : "";
      case "vision": return visions.length ? "Beau cap. On va le découper en petites étapes." : "";
      case "objectifs": if (moteur) return `« ${moteur} » : je te le rappellerai les jours difficiles.`; return goals.length >= 3 ? "3 objectifs, parfait : pas un de plus." : goals.length ? "J'ai pré-coché selon ton métier, change si tu veux. Moins, mais mieux." : "";
      case "energie": return !energieTouchee ? "" : energie <= 2 ? "On y va doucement aujourd'hui, promis." : energie >= 4 ? "Belle énergie ! On va en profiter." : "Noté, je cale ta journée là-dessus.";
      case "rythme": return `${RYTHMES[rythme].min} min de point du jour, ${jours.length} jour${jours.length > 1 ? "s" : ""} par semaine : c'est tenable, et c'est ce qui compte.`;
      case "valeurs": return values.length ? `${values[0]} en premier ? Je garde ça en tête pour mes conseils.` : "";
      case "sens": return "Je t'ajouterai la vie spirituelle dans ton diagnostic d'équilibre.";
      case "lettre": return lettreTexte.trim().length >= 10 ? "Elle t'attend. Le jour venu, tu la recevras ici." : "";
      case "offre": return ESSAI.plans.includes(plan) ? `Bon choix : ${essaiDuree()} pour ${ESSAI.prix} € pour tout tester.` : plan === REVEUR_OFFERT.plan ? "Bon choix : ton premier mois est offert, sans carte bancaire." : "";
      default: return "";
    }
  })();
  const retour = () => setI((s) => { let n = s - 1; if (saute(n)) n -= 1; return Math.max(n, 0); });

  // Tout passer : l'onboarding est marqué fait, on file vers l'activation.
  const toutPasser = async () => {
    try { await saveProfile({ onboarded: true, ...(prenom.trim() ? { prenom: prenom.trim() } : {}) }); } catch (_) { /* on laisse passer */ }
    navigate("/activer");
  };

  const activiteFinale = activite === "Autre" ? activiteAutre.trim() : activite;
  const visionTexte = [...visions, visionAutre.trim()].filter(Boolean);
  const suggestionsObjectifs = [
    ...(caObjectif ? [`Atteindre ${fmtEur(caObjectif)} de CA par mois`] : []),
    "Signer 3 nouveaux clients",
    "Lancer ma nouvelle offre",
    "Publier 2 fois par semaine",
    "Mettre de l'ordre dans mes finances",
    "Trouver 2 partenaires qui me recommandent",
    "Libérer une demi-journée par semaine pour moi",
  ];

  const finish = async () => {
    const startedAt = Date.now();
    setSaveError("");
    setSaving(true);
    try {
      await saveProfile({
        prenom: prenom.trim() || (user.firstName !== "toi" ? user.firstName : undefined),
        texte_vision: visionTexte.length ? `Dans un an : ${visionTexte.join(", ").toLowerCase()}.` : undefined,
        pourquoi: moteur || undefined,
        valeurs: values,
        heure_checkin: rappel,
        ...(notifOk ? { notifications: true } : {}),
        plan,
        objectifs: goals,
        contexte_metier: {
          role, activite_type: activiteFinale, marche, marche_label: marcheLabel,
          ...(clientele ? { clientele } : {}),
          ...(tranche ? { ca_tranche: tranche } : {}),
          heure_point: rappel,
          jours_actifs: jours.join(","),
          temps_quotidien: RYTHMES[rythme].min,
          plan_souhaite: plan,
          ...(foiChoix ? { parcours_foi: foiChoix === "oui" } : {}),
          ...(foiChoix === "oui" && foiMotivation.trim() ? { foi_motivation: foiMotivation.trim().slice(0, 600) } : {}),
        },
        onboarded: true,
      });
      // Lettre à son futur moi (facultative) : si elle échoue, l'inscription continue — elle se réécrit depuis le Carnet.
      if (lettreTexte.trim().length >= 10) {
        const jours = DUREES_LETTRE.find(([k]) => k === lettreDuree)?.[2] || 182;
        try { await scellerLettre(lettreTexte.trim(), dateDans(jours)); } catch (_) { /* optionnel */ }
      }
      // La motivation de foi devient aussi une carte du Vision Board (modifiable, déplaçable) : on la voit, on s'en souvient.
      if (foiChoix === "oui" && foiMotivation.trim()) {
        try {
          const b = await fetchBoard("perso");
          const cartes = b.cards || [];
          if (!cartes.some((c) => c.source === "foi_motivation")) {
            const bas = cartes.reduce((m, c) => (typeof c.y === "number" ? Math.max(m, c.y + (c.h || 240)) : m), 0);
            await saveBoard([...cartes, { id: `foi_${Date.now()}`, type: "sticky", source: "foi_motivation", w: 300, h: 240, x: 40, y: bas + 40,
              rotate: -2, stickyColor: "cream", label: "MA FOI & MON ACTIVITÉ", tags: [],
              body: { fr: foiMotivation.trim().slice(0, 600), en: foiMotivation.trim().slice(0, 600) } }], "perso");
          }
        } catch (_) { /* optionnel : le texte reste dans le profil */ }
      }
      if (caObjectif) {
        try { await savePouls({ ca_objectif: caObjectif, source: "manuel" }); } catch (_) { /* optionnel */ }
      }
      // L'énergie choisie ici est une vraie mesure du jour : premier check-in.
      if (energieTouchee) {
        try { await postCheckin({ energie }); } catch (_) { /* optionnel */ }
      }
    } catch (error) {
      setSaving(false);
      setSaveError(error?.message || "Impossible d'enregistrer ton espace pour le moment. Vérifie ta connexion puis réessaie.");
      return;
    }
    try { localStorage.removeItem(CLE_BROUILLON); } catch { /* stockage indisponible */ }
    // Paiement tout de suite : le « merci, ton cockpit se prépare » s'affiche au retour (page /activer).
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, 900 - (Date.now() - startedAt))));
    setOnboardingData({ vision: visionTexte.join(", "), why: moteur, goals, values, checkinHour: rappel, plan });
    await allerPaiement();
  };

  const allerPaiement = async () => {
    if (["reveur", "serenite", "pro", "business"].includes(plan)) {
      if (await lancerPaiement(plan, { cycle: cycleParam, essai: ESSAI.plans.includes(plan) || plan === REVEUR_OFFERT.plan })) return;
    } else if (plan === "entreprise") {
      toast.info("Merci ! L'équipe Zayado te contacte pour préparer ton offre Entreprise.");
    }
    navigate("/activer");
  };

  useEffect(() => {
    if (!saving) return undefined;
    const timer = setInterval(() => setSavePhase((p) => (p + 1) % 4), 900);
    return () => clearInterval(timer);
  }, [saving]);

  // Le rappel n'existe vraiment que si le navigateur a donné son accord (geste de l'utilisateur obligatoire).
  const activerRappel = async () => {
    setNotifEnCours(true);
    try { await activerPush(); setNotifOk(true); toast.success(`Rappel activé : ${rappel.replace(":", "h")} les jours choisis.`); }
    catch (e) { setNotifOk(false); toast.error(e?.message || "Impossible d'activer les notifications."); }
    setNotifEnCours(false);
  };

  const basculer = (liste, setListe, v, max) =>
    setListe(liste.includes(v) ? liste.filter((x) => x !== v) : liste.length < max ? [...liste, v] : liste);

  const peutContinuer = {
    prenom: prenom.trim().length > 0,
    activite: !!activiteFinale,
  }[etape] ?? true;

  const TITRES = {
    prenom: ["Comment je dois t'appeler ?", "Je t'appellerai par ton prénom, tout le long."],
    activite: ["Tu fais quoi, et pour qui ?", "Un tap suffit. Le Radar s'en sert pour tes opportunités."],
    cap: ["Ton cap pour le mois", "Pour ton Pouls Business. Tu pourras tout changer."],
    vision: ["Dans un an, tu veux…", "Choisis jusqu'à 2 réponses."],
    objectifs: ["Tes objectifs à 90 jours", "Jusqu'à 3, puis ce qui te motive à les atteindre."],
    energie: ["Comment va ton énergie, là ?", "Je cale ta journée sur ton énergie réelle."],
    rythme: ["Combien de temps pour Zayado par jour ?", "Ce n'est pas ton temps de travail : c'est le temps que tu veux passer sur ton point du jour. Je cale le nombre d'actions dessus."],
    valeurs: ["Quelles valeurs guident tes décisions ?", "Les principes auxquels tu tiens, jusqu'à 5."],
    sens: ["Ta foi, au cœur de ton activité", null],
    lettre: ["Une lettre à ton futur toi", "Facultatif. Écris-lui quelques lignes : elle reste scellée jusqu'à la date choisie, puis Zayado te la remet."],
    offre: ["Choisis ta formule", `Solo : ${essaiDuree()} pour ${ESSAI.prix} € · Rêveur : 1 mois offert. Sans engagement.`],
    pret: ["Ton récap", "Dernière étape : le paiement sécurisé. Ton cockpit se prépare dès qu'il est validé."],
  };

  return (
    <div className="zayado-blue relative flex min-h-screen flex-col items-center px-4 pb-32 pt-5" data-testid={`onboarding-step-${i}`}>
      <div className="w-full max-w-lg">
        {/* Barre du haut : retour · progression · passer */}
        {etape !== "intro" && (
          <div className="flex items-center gap-3" data-testid="onboarding-progress">
            <button onClick={retour} aria-label="Retour" data-testid="onboarding-back"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-offwhite hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-[#F1E2CC] to-[#DEC2A3] transition-all duration-500" style={{ width: `${(positionEtape / totalEtapes) * 100}%` }} />
            </div>
            {etape !== "pret" && (
              <button onClick={suivant} data-testid="onboarding-passer-etape"
                className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-offwhite/55 hover:bg-white/5 hover:text-offwhite">
                Passer
              </button>
            )}
          </div>
        )}

        {etape === "intro" ? (
          <div className="flex min-h-[80vh] flex-col items-center justify-center text-center" data-testid="onboarding-intro">
            <Guide grand />
            <h1 className="mt-6 font-display text-3xl font-extrabold text-offwhite sm:text-4xl">Salut{prenom ? ` ${prenom}` : ""} !</h1>
            <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-offwhite/70">
              Je suis ton Copilote Zayado. 2 minutes, que des choix à toucher, et ton cockpit est prêt.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-offwhite/60">
              {["⚡ Ton énergie", "🎯 Tes objectifs", "📡 Ton Radar"].map((t) => <span key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{t}</span>)}
            </div>
            <button onClick={toutPasser} data-testid="onboarding-skip" className="mt-8 text-xs text-offwhite/45 underline-offset-4 hover:text-offwhite/80 hover:underline">
              Passer, je remplirai plus tard
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-center gap-3">
              <Guide />
              <div>
                <p className="text-[15px] font-semibold text-offwhite">Copilote Zayado</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-offwhite/45">Étape {positionEtape} / {totalEtapes}</p>
              </div>
            </div>
            <h2 className="mt-5 font-display text-[28px] font-extrabold leading-tight text-offwhite sm:text-3xl">{TITRES[etape][0]}</h2>
            {TITRES[etape][1] && <p className="mt-2 text-[15px] text-offwhite/60">{TITRES[etape][1]}</p>}
            {reaction && (
              <div key={reaction} className="relative mt-4 animate-fade-up rounded-2xl rounded-tl-md border border-gold/25 bg-gold/10 px-4 py-3 text-[14px] leading-relaxed text-offwhite/90" data-testid="onboarding-reaction">
                {reaction}
              </div>
            )}
          </>
        )}

        <div className="mt-6 animate-fade-up" key={etape}>
          {etape === "prenom" && (
            <div className="space-y-6" data-testid="onboarding-identite">
              <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Ton prénom" autoFocus
                data-testid="onboarding-prenom"
                className="h-14 w-full rounded-full border border-white/15 bg-white/[0.07] px-6 text-lg font-semibold text-offwhite placeholder:text-offwhite/35 focus:border-gold/50 focus:outline-none" />
              <Bloc titre="Tu es plutôt…">
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((r) => <Pastille key={r} actif={role === r} onClick={() => setRole(role === r ? "" : r)}>{r}</Pastille>)}
                </div>
              </Bloc>
            </div>
          )}

          {etape === "activite" && (
            <div className="space-y-6" data-testid="onboarding-activite">
              <div className="grid grid-cols-3 gap-2.5">
                {[...ACTIVITES, { v: "Autre", icon: Plus }].map(({ v, icon: Icon }) => (
                  <Tuile key={v} actif={activite === v} onClick={() => choisirActivite(v)} testid={`onboarding-activite-${v}`}>
                    <Icon className="h-6 w-6" />
                    <span className="mt-2 text-[12.5px] font-semibold leading-tight">{v}</span>
                  </Tuile>
                ))}
              </div>
              {activite === "Autre" && (
                <Champ valeur={activiteAutre} onChange={setActiviteAutre} placeholder="Ton activité en quelques mots" testid="onboarding-activite-autre" />
              )}
              <Bloc titre="Tes clients sont…">
                <div className="grid grid-cols-3 gap-2" data-testid="onboarding-clientele">
                  {CLIENTELES.map(([k, l]) => <Pastille key={k} plein actif={clientele === k} onClick={() => setClientele(k)} testid={`onboarding-clientele-${k}`}>{l}</Pastille>)}
                </div>
              </Bloc>
              <Bloc titre="Ton pays">
                <ChoixPays valeur={marche} libelle={marcheLabel} onChange={(k, l) => { setMarche(k); setMarcheLabel(l); }} />
              </Bloc>
            </div>
          )}

          {etape === "cap" && (
            <div className="space-y-6" data-testid="onboarding-cap-financier">
              <Bloc titre="Objectif de chiffre d'affaires par mois">
                <div className="grid grid-cols-3 gap-2">
                  {OBJ_CA.map((v) => <Pastille key={v} plein actif={caObjectif === v} onClick={() => setCaObjectif(caObjectif === v ? 0 : v)} testid={`onboarding-ca-${v}`}>{v >= 20000 ? "20 000 € +" : fmtEur(v)}</Pastille>)}
                  <Pastille plein actif={caObjectif === 0} onClick={() => setCaObjectif(0)}>Pas encore</Pastille>
                </div>
              </Bloc>
              <Bloc titre="Aujourd'hui, tu fais environ…">
                <div className="space-y-2">
                  {TRANCHES.map(([k, l]) => <Ligne key={k} actif={tranche === k} onClick={() => setTranche(k)}>{l} {k !== "demarrage" && <span className="text-offwhite/45">/ mois</span>}</Ligne>)}
                </div>
              </Bloc>
            </div>
          )}

          {etape === "vision" && (
            <div className="space-y-5" data-testid="onboarding-vision">
              <div className="space-y-2">
                {VISIONS.map((v) => <Ligne key={v} actif={visions.includes(v)} onClick={() => basculer(visions, setVisions, v, 2)} multi>{v}</Ligne>)}
              </div>
              <Champ valeur={visionAutre} onChange={setVisionAutre} placeholder="Autre (facultatif)" testid="onboarding-vision-autre" />
            </div>
          )}

          {etape === "objectifs" && (
            <div className="space-y-3" data-testid="onboarding-objectifs">
              {[...suggestionsObjectifs, ...goals.filter((g) => !suggestionsObjectifs.includes(g))].map((g) => (
                <Ligne key={g} actif={goals.includes(g)} onClick={() => basculer(goals, setGoals, g, 3)} multi>{g}</Ligne>
              ))}
              {goals.length < 3 && (
                <form onSubmit={(e) => { e.preventDefault(); const t = goalAutre.trim(); if (t && !goals.includes(t)) setGoals([...goals, t]); setGoalAutre(""); }} className="flex gap-2">
                  <Champ valeur={goalAutre} onChange={setGoalAutre} placeholder="Autre objectif…" testid="onboarding-goal-autre" />
                  <button disabled={!goalAutre.trim()} className="h-12 shrink-0 rounded-full bg-white/10 px-5 text-sm font-semibold text-offwhite disabled:opacity-40">Ajouter</button>
                </form>
              )}
              <p className="text-center text-xs text-offwhite/45">{goals.length} / 3 choisi{goals.length > 1 ? "s" : ""}</p>
              <Bloc titre="Et ce qui te donne l'élan pour y arriver">
                <div className="flex flex-wrap gap-2">
                  {MOTEURS.map((m) => <Pastille key={m} actif={moteur === m} onClick={() => setMoteur(moteur === m ? "" : m)}>{m}</Pastille>)}
                </div>
              </Bloc>
            </div>
          )}

          {etape === "energie" && (
            <div className="flex flex-col items-center" data-testid="onboarding-energie">
              <Anneau valeur={energie / 5}>
                <span className="text-5xl">{ENERGIES[energie - 1].face}</span>
                <span className="mt-1 font-display text-4xl font-extrabold text-gold">{energie}<span className="text-lg text-offwhite/50">/5</span></span>
              </Anneau>
              <p className="mt-6 font-display text-2xl font-bold text-offwhite">{ENERGIES[energie - 1].mot}</p>
              <p className="text-offwhite/55">{ENERGIES[energie - 1].sous}</p>
              <GrosCurseur valeur={energie} min={1} max={5} onChange={(v) => { setEnergie(v); setEnergieTouchee(true); }} testid="onboarding-energie-curseur" />
              <div className="mt-4 grid w-full grid-cols-5 gap-2">
                {ENERGIES.map((e, k) => (
                  <button key={e.mot} type="button" onClick={() => { setEnergie(k + 1); setEnergieTouchee(true); }}
                    className={`flex h-12 items-center justify-center rounded-2xl border text-2xl transition ${energie === k + 1 ? "border-gold/70 bg-gold/15" : "border-white/10 bg-white/[0.04] grayscale"}`}>{e.face}</button>
                ))}
              </div>
            </div>
          )}

          {etape === "rythme" && (
            <div className="space-y-7" data-testid="onboarding-rythme">
              <div className="flex flex-col items-center">
                <Anneau valeur={RYTHMES[rythme].min / 30} petit>
                  <Flame className="h-6 w-6 text-gold" />
                  <span className="font-display text-4xl font-extrabold text-gold">{RYTHMES[rythme].min}<span className="ml-1 text-base text-offwhite/50">min</span></span>
                </Anneau>
                <p className="mt-4 font-display text-xl font-bold text-offwhite">{RYTHMES[rythme].mot}</p>
                <p className="text-sm text-offwhite/55">{RYTHMES[rythme].sous}</p>
                <GrosCurseur valeur={rythme} min={0} max={3} onChange={(v) => { setRythme(v); setRythmeTouche(true); }} testid="onboarding-rythme-curseur" />
              </div>
              <Bloc titre="Quels jours ?">
                <button type="button" onClick={() => setJours(jours.length === 7 ? ["1", "2", "3", "4", "5"] : JOURS.map(([k]) => k))}
                  className={`mb-3 flex w-full items-center gap-3 rounded-3xl border p-3.5 text-left transition ${jours.length === 7 ? "border-gold/60 bg-gold/10" : "border-white/12 bg-white/[0.06]"}`}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/15 text-gold"><CalendarDays className="h-5 w-5" /></span>
                  <span className="flex-1"><span className="block font-semibold text-offwhite">Tous les jours</span><span className="text-xs text-offwhite/55">Sept jours sur sept</span></span>
                  <Rond actif={jours.length === 7} />
                </button>
                <div className="grid grid-cols-7 gap-1.5">
                  {JOURS.map(([k, l]) => (
                    <button key={k} type="button" onClick={() => basculer(jours, setJours, k, 7)} data-testid={`onboarding-jour-${k}`}
                      className={`aspect-square rounded-full border text-base font-bold transition ${jours.includes(k) ? "border-gold bg-gold text-navy-900" : "border-white/15 bg-white/[0.05] text-offwhite"}`}>{l}</button>
                  ))}
                </div>
              </Bloc>
              <Bloc titre="Heure du rappel">
                <div className="grid grid-cols-3 gap-2">
                  {RAPPELS.map(([l, h]) => (
                    <button key={h} type="button" onClick={() => setRappel(h)} data-testid={`onboarding-rappel-${h}`}
                      className={`rounded-2xl border py-3 transition ${rappel === h ? "border-gold bg-gold text-navy-900" : "border-white/12 bg-white/[0.06] text-offwhite"}`}>
                      <span className="block font-semibold">{l}</span><span className="text-sm opacity-70">{h}</span>
                    </button>
                  ))}
                </div>
                <label className="mt-2 flex items-center gap-3 rounded-3xl border border-white/12 bg-white/[0.06] p-3.5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-offwhite/80"><Clock className="h-5 w-5" /></span>
                  <span className="flex-1 font-semibold text-offwhite">Heure précise</span>
                  <input type="time" value={rappel} onChange={(e) => e.target.value && setRappel(e.target.value)} data-testid="onboarding-checkin-time"
                    className="rounded-xl bg-transparent text-xl font-bold text-offwhite focus:outline-none" />
                </label>
                {pushSupporte() && (
                  <button type="button" onClick={activerRappel} disabled={notifOk || notifEnCours} data-testid="onboarding-notifications"
                    className={`mt-2 flex w-full items-center gap-3 rounded-3xl border p-3.5 text-left transition ${notifOk ? "border-gold/60 bg-gold/10" : "border-white/12 bg-white/[0.06] hover:border-white/25"}`}>
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/15 text-gold">{notifEnCours ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bell className="h-5 w-5" />}</span>
                    <span className="flex-1">
                      <span className="block font-semibold text-offwhite">{notifOk ? "Rappel activé" : "Me rappeler par notification"}</span>
                      <span className="text-xs text-offwhite/55">{notifOk ? "Tu le retrouves dans Paramètres." : "Sans ça, l'heure choisie ne déclenche aucun rappel."}</span>
                    </span>
                    <Rond actif={notifOk} />
                  </button>
                )}
              </Bloc>
            </div>
          )}

          {etape === "valeurs" && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2" data-testid="onboarding-values">
                {[...valuesLibrary, FOI_VALEUR].map((v) => (
                  <Pastille key={v} actif={values.includes(v)} onClick={() => basculer(values, setValues, v, 5)} testid={`onboarding-value-${v}`}>
                    {values.includes(v) && <Check className="mr-1 inline h-3.5 w-3.5" />}{v === FOI_VALEUR && <HeartHandshake className="mr-1.5 inline h-3.5 w-3.5" />}{v}
                  </Pastille>
                ))}
              </div>
              <p className="text-center text-xs text-offwhite/45">{values.length} / 5</p>
              {sensActif && <p className="text-center text-[13px] text-gold/90" data-testid="onboarding-foi-note">Ta foi est choisie : à l'étape suivante, tu pourras en dire un mot (facultatif).</p>}
            </div>
          )}

          {etape === "sens" && (
            <div data-testid="onboarding-sens-foi">
              <p className="text-[15px] leading-relaxed text-offwhite/70">
                Tu as choisi « Ta foi » parmi tes valeurs : Zayado peut t'accompagner sur le sens et la foi (perspective chrétienne), avec <b className="text-offwhite">TheSustain</b>.
                C'est facultatif et tu peux changer d'avis quand tu veux dans Paramètres.
              </p>
              <a href={THESUSTAIN_URL} target="_blank" rel="noopener noreferrer" data-testid="onboarding-foi-info"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-[13.5px] font-medium text-gold hover:bg-white/10">
                <Info className="h-4 w-4" /> Découvrir TheSustain
              </a>
              {foiChoix === "oui" && (
                <div className="mt-5" data-testid="onboarding-foi-motivation">
                  <label htmlFor="foi-motivation" className="block text-[15px] font-semibold text-offwhite">
                    Qu'est-ce qui te motive à relier ta foi chrétienne et ton activité ?
                  </label>
                  <p className="mt-1 text-[13.5px] text-offwhite/65">Facultatif. Tes mots serviront à t'encourager les jours difficiles. Tu pourras les modifier dans Paramètres.</p>
                  <textarea id="foi-motivation" value={foiMotivation} onChange={(e) => setFoiMotivation(e.target.value)} rows={4} maxLength={600}
                    placeholder="Ex. Servir mes clients avec intégrité, et faire de mon travail une réponse à ma vocation."
                    data-testid="onboarding-foi-motivation-champ"
                    className="mt-2.5 w-full resize-none rounded-3xl border border-white/15 bg-white/[0.06] px-5 py-3.5 text-[15px] leading-relaxed text-offwhite placeholder:text-offwhite/40 focus:border-gold/50 focus:outline-none" />
                  <p className="mt-1 text-right text-xs text-offwhite/50">{foiMotivation.length} / 600</p>
                </div>
              )}
            </div>
          )}

          {etape === "lettre" && (
            <div data-testid="onboarding-lettre">
              <label htmlFor="lettre-futur" className="sr-only">Ta lettre à ton futur toi</label>
              <textarea id="lettre-futur" value={lettreTexte} onChange={(e) => setLettreTexte(e.target.value)} rows={6} maxLength={4000}
                placeholder="Cher moi du futur, aujourd'hui je me lance parce que… J'espère que tu as…"
                data-testid="onboarding-lettre-texte"
                className="w-full resize-none rounded-3xl border border-white/15 bg-white/[0.06] px-5 py-4 text-[15px] leading-relaxed text-offwhite placeholder:text-offwhite/40 focus:border-gold/50 focus:outline-none" />
              <p className="mt-4 text-[14px] font-semibold text-offwhite">Quand veux-tu la recevoir ?</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {DUREES_LETTRE.map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setLettreDuree(k)} data-testid={`onboarding-lettre-${k}`} aria-pressed={lettreDuree === k}
                    className={`min-h-[48px] rounded-2xl border px-2 text-[14px] font-semibold transition ${lettreDuree === k ? "border-gold/70 bg-gold/10 text-offwhite" : "border-white/12 bg-white/[0.06] text-offwhite/85 hover:border-white/25"}`}>{l}</button>
                ))}
              </div>
              <p className="mt-3 text-[13px] text-offwhite/60">Tu ne pourras pas la relire avant la date : c'est ce qui lui donne du poids. Rien à écrire ? Touche « Passer ».</p>
            </div>
          )}

          {etape === "offre" && (
            <ChoixOffre plans={LISTE_PLANS} plan={plan} setPlan={setPlan} />
          )}

          {etape === "pret" && (
            <div className="space-y-2.5" data-testid="onboarding-final">
              {[
                activiteFinale ? `Activité : ${activiteFinale}` : "Activité à compléter plus tard",
                caObjectif ? `Objectif : ${fmtEur(caObjectif)} / mois` : "Objectif de CA à fixer plus tard",
                `${goals.length} objectif${goals.length > 1 ? "s" : ""} à 90 jours`,
                energieTouchee ? `Énergie du jour : ${ENERGIES[energie - 1].mot}` : "Premier check-in à faire",
                `Point du jour : ${RYTHMES[rythme].min} min · rappel à ${rappel.replace(":", "h")}${notifOk ? " (notification activée)" : ""}`,
                ...(lettreTexte.trim().length >= 10 ? ["Une lettre à ton futur toi, scellée"] : []),
                ...(foiChoix === "oui" && foiMotivation.trim() ? ["Ta motivation de foi, gardée pour t'encourager"] : []),
                `Formule : ${LISTE_PLANS.find((p) => p.key === plan)?.name}`,
              ].map((t) => (
                <div key={t} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-offwhite/85">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-navy-900"><Check className="h-3.5 w-3.5" /></span> {t}
                </div>
              ))}
            </div>
          )}
        </div>

        {saveError && (
          <div className="mt-4 rounded-xl border border-red-300/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-100" role="alert" data-testid="onboarding-save-error">
            <p>{saveError}</p>
            <button onClick={finish} className="mt-2 text-xs font-semibold text-gold underline" data-testid="onboarding-retry">Réessayer l'enregistrement</button>
          </div>
        )}
      </div>

      {/* Gros bouton en bas, toujours au même endroit */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#0a1230] via-[#0a1230]/90 to-transparent px-4 pb-5 pt-8">
        <div className="mx-auto max-w-lg">
          {etape === "pret" ? (<>
            <button onClick={finish} disabled={saving} data-testid="onboarding-finish"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#F4EFE6] text-lg font-bold text-navy-900 shadow-lg transition hover:brightness-105 disabled:opacity-60">
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : plan === "entreprise" ? <>Envoyer ma demande <Rocket className="h-5 w-5" /></> : <>Payer et activer mon cockpit <Lock className="h-5 w-5" /></>}
            </button>
            {plan !== "entreprise" && <p className="mt-2 text-center text-[11.5px] text-offwhite/50" data-testid="onboarding-reassurance">Paiement sécurisé Mollie · sans engagement · tu reviens ici juste après</p>}
          </>) : (
            <button onClick={suivant} disabled={!peutContinuer} data-testid="onboarding-next"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#F4EFE6] text-lg font-bold text-navy-900 shadow-lg transition hover:brightness-105 disabled:opacity-40">
              {etape === "intro" ? "C'est parti" : "Continuer"} <ArrowRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {waouh && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0a1230]/95 px-4 py-10 backdrop-blur-md" data-testid="onboarding-waouh">
          <div className="mx-auto max-w-lg">
            <div className="flex items-center gap-3"><Guide /><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Ton Radar vient de tourner</p></div>
            <h2 className="mt-4 font-display text-[28px] font-extrabold leading-tight text-offwhite">Ta première opportunité{prenom ? `, ${prenom}` : ""} 🎯</h2>
            <p className="mt-2 text-[15px] text-offwhite/65">Tirée de tes réponses. Selon ta formule, ton cockpit pourra t'en proposer d'autres, avec le message prêt à envoyer.</p>
            <div className="mt-6 rounded-3xl border border-gold/40 bg-white/[0.06] p-5 shadow-[0_0_40px_-12px_rgba(222,194,163,0.5)]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-offwhite/50">{waouh.canal || "email"}{waouh.objectif ? ` · pour « ${waouh.objectif} »` : ""}</p>
              <p className="mt-1.5 font-display text-xl font-bold text-offwhite">{waouh.titre}</p>
              {waouh.prospect && <p className="mt-1 text-sm text-offwhite/70">{[waouh.prospect.prenom, waouh.prospect.nom].filter(Boolean).join(" ")}{waouh.prospect.entreprise ? ` · ${waouh.prospect.entreprise}` : ""}</p>}
              {waouh.message && <p className="mt-3 line-clamp-5 border-l-2 border-gold/40 pl-3 font-serif-italic text-[15px] leading-relaxed text-offwhite/75">{waouh.message}</p>}
            </div>
            <button onClick={allerPaiement} data-testid="onboarding-waouh-continuer"
              className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#F4EFE6] text-lg font-bold text-navy-900">
              Activer mon cockpit <ArrowRight className="h-5 w-5" />
            </button>
            <p className="mt-2 text-center text-xs text-offwhite/45">{ESSAI.plans.includes(plan) ? `${essaiDuree()} pour ${ESSAI.prix} €, sans engagement.` : plan === REVEUR_OFFERT.plan ? "1 mois offert, sans carte bancaire." : "Sans engagement, résiliable en 1 clic."}</p>
          </div>
        </div>
      )}
      {saving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1230]/90 p-5 backdrop-blur-md" data-testid="onboarding-processing">
          <div className="w-full max-w-md rounded-3xl fenetre p-7 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/15 ring-1 ring-gold/30">
              <Sparkles className="h-8 w-8 animate-pulse text-gold" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Tes réponses sont enregistrées</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-offwhite">Direction le paiement sécurisé</h2>
            <p className="mt-2 text-sm text-offwhite/60">{["Enregistrement de ta vision…", "Enregistrement de tes objectifs…", "Ouverture du paiement Mollie…", "Encore un instant…"][savePhase]}</p>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10"><div className="onboarding-progress-shimmer h-full rounded-full bg-gold" /></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Guide({ grand = false }) {
  const t = grand ? "h-24 w-24" : "h-12 w-12";
  return (
    <span className={`relative flex ${t} shrink-0 items-center justify-center rounded-full border-2 border-gold/50 bg-gradient-to-b from-white/15 to-white/5 shadow-[0_0_30px_-6px_rgba(222,194,163,0.6)]`}>
      <img src="/logo.png" alt="" className={grand ? "h-16 w-16 object-contain" : "h-8 w-8 object-contain"} />
      <Zap className={`absolute -bottom-1 -right-1 rounded-full bg-gold p-1 text-navy-900 ${grand ? "h-7 w-7" : "h-5 w-5"}`} />
    </span>
  );
}

function Bloc({ titre, children }) {
  return (
    <div>
      <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-offwhite/55">{titre}</p>
      {children}
    </div>
  );
}

function Pastille({ actif, onClick, children, plein = false, testid }) {
  return (
    <button type="button" onClick={onClick} data-testid={testid}
      className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition active:scale-95 ${plein ? "w-full" : ""} ${actif ? "border-gold bg-gold text-navy-900" : "border-white/15 bg-white/[0.06] text-offwhite/85 hover:border-white/30"}`}>
      {children}
    </button>
  );
}

function Tuile({ actif, onClick, children, testid }) {
  return (
    <button type="button" onClick={onClick} data-testid={testid}
      className={`flex aspect-square flex-col items-center justify-center rounded-3xl border p-2 text-center transition active:scale-95 ${actif ? "border-gold bg-gold/15 text-gold ring-2 ring-gold/30" : "border-white/12 bg-white/[0.06] text-offwhite/85 hover:border-white/25"}`}>
      {children}
    </button>
  );
}

function Rond({ actif }) {
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${actif ? "border-gold bg-gold text-navy-900" : "border-white/25"}`}>
      {actif && <Check className="h-4 w-4" />}
    </span>
  );
}

function Ligne({ actif, onClick, children, multi = false, testid }) {
  return (
    <button type="button" onClick={onClick} data-testid={testid}
      className={`flex w-full items-center gap-3 rounded-3xl border px-5 py-4 text-left text-[15px] font-semibold transition active:scale-[0.99] ${actif ? "border-gold/70 bg-gold/10 text-offwhite" : "border-white/12 bg-white/[0.06] text-offwhite/85 hover:border-white/25"}`}>
      <span className="flex-1">{children}</span>
      {multi ? (
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 ${actif ? "border-gold bg-gold text-navy-900" : "border-white/25"}`}>{actif && <Check className="h-3.5 w-3.5" />}</span>
      ) : <Rond actif={actif} />}
    </button>
  );
}

function Champ({ valeur, onChange, placeholder, testid }) {
  return (
    <input value={valeur} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} data-testid={testid}
      className="h-12 w-full rounded-full border border-white/15 bg-white/[0.06] px-5 text-[15px] text-offwhite placeholder:text-offwhite/35 focus:border-gold/50 focus:outline-none" />
  );
}

function Anneau({ valeur, children, petit = false }) {
  const r = 88, c = 2 * Math.PI * r;
  return (
    <div className={`relative ${petit ? "h-48 w-48" : "h-56 w-56"}`}>
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="zyAnneau" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F1E2CC" /><stop offset="100%" stopColor="#C9A66B" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
        <circle cx="100" cy="100" r={r} fill="none" stroke="url(#zyAnneau)" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0.02, Math.min(1, valeur)))}
          style={{ transition: "stroke-dashoffset 500ms cubic-bezier(.22,1,.36,1)", filter: "drop-shadow(0 0 10px rgba(222,194,163,0.45))" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

function GrosCurseur({ valeur, min, max, onChange, testid }) {
  return (
    <SliderPrimitive.Root value={[valeur]} min={min} max={max} step={1} onValueChange={(v) => onChange(v[0])} data-testid={testid}
      className="relative mt-7 flex h-10 w-full touch-none select-none items-center">
      <SliderPrimitive.Track className="relative h-4 w-full grow overflow-hidden rounded-full bg-white/10">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-gradient-to-r from-[#F1E2CC] to-[#DEC2A3]" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb aria-label="Choisir" className="block h-9 w-9 rounded-full border-4 border-[#DEC2A3] bg-[#F4EFE6] shadow-[0_0_18px_rgba(222,194,163,0.6)] focus-visible:outline-none" />
    </SliderPrimitive.Root>
  );
}
