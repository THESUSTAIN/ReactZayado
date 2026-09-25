import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles, Menu, X, ArrowRight, Check, Newspaper, Compass, Radar,
  Heart, LayoutDashboard, CalendarCheck, Bot, Flame, Users, FileText,
} from "lucide-react";
import { useSeo } from "@/lib/useSeo";
import { PLANS, PLAN_ENTREPRISE, prixMois } from "@/lib/plans";

const START = "/login?next=%2Fonboarding";

const DOULEURS = [
  "La charge mentale qui ne s'éteint jamais",
  "Le sentiment de tout faire seul·e",
  "Les idées et les outils dispersés partout",
  "Les urgences qui remplacent les priorités",
  "La prospection repoussée au lendemain",
  "La solitude face aux décisions importantes",
];

const MODULES = [
  {
    id: "cockpit", Icon: LayoutDashboard, titre: "Le Cockpit et son point du jour",
    image: "/screenshots/cockpit.webp",
    douleur: "Tu ouvres ton ordinateur et tu ne sais plus par où commencer.",
    accroche: "Chaque matin, ton point du jour est déjà prêt.",
    benefices: [
      "Priorités, objectif 90 jours, victoires et énergie réunis sur un écran",
      "Une journée structurée autour de l'essentiel, pas des urgences",
      "Le pouls business : trésorerie et semaine d'un coup d'œil",
      "Ton rythme respecté : le cockpit s'adapte à ton énergie",
    ],
  },
  {
    id: "copilote", Icon: Newspaper, titre: "Le Copilote IA — et son Actualité marché",
    image: "/screenshots/copilote-actualite.png",
    douleur: "Tu décides seul·e, et le marché bouge pendant que tu produis.",
    accroche: "Un copilote qui connaît ton projet et veille ton marché chaque jour.",
    benefices: [
      "Actualité de TON marché, résumée chaque jour — jamais un fil d'actus infini",
      "Choisis tes marchés : France, Sénégal, Côte d'Ivoire, Cameroun, Maroc, Belgique…",
      "Un chat contextuel qui clarifie, rédige et prépare tes documents",
      "Chaque article peut devenir une décision ou une opportunité en un clic",
    ],
  },
  {
    id: "vision", Icon: Compass, titre: "Le Vision Board",
    image: "/screenshots/vision.webp",
    douleur: "Ta vision est dans ta tête, donc elle se dilue dans le quotidien.",
    accroche: "Ta vision prend vie sur un board que tu vois chaque jour.",
    benefices: [
      "Vision Board généré par l'IA à partir de tes mots",
      "Roue d'équilibre et feuille de route 90 jours",
      "Compte à rebours de ton objectif 3 ans, toujours visible",
      "Un lien public en lecture seule pour partager ton cap",
    ],
  },
  {
    id: "radar", Icon: Radar, titre: "Le Radar d'opportunités",
    image: "/screenshots/radar.webp",
    douleur: "La prospection passe toujours après tout le reste.",
    accroche: "Chaque jour, 3 opportunités qualifiées t'attendent.",
    benefices: [
      "Opportunités reliées à tes objectifs, avec le message prêt à envoyer",
      "Analyse SWOT de ton activité à la demande",
      "Signaux faibles de ton marché détectés pour toi",
      "De vrais prospects nommés avec l'intégration Apollo (bientôt)",
    ],
  },
  {
    id: "revue", Icon: CalendarCheck, titre: "La Revue hebdo",
    image: "/screenshots/actions.webp",
    douleur: "Les semaines filent sans que tu saches si tu avances vraiment.",
    accroche: "Cinq minutes par semaine pour reprendre la main.",
    benefices: [
      "Synthèse guidée : victoires, apprentissages, obstacles",
      "Une seule priorité choisie pour la semaine qui vient",
      "Historique de tes revues pour voir ta trajectoire",
      "Le Copilote prépare la revue avec tes données de la semaine",
    ],
  },
  {
    id: "bienetre", Icon: Heart, titre: "Bien-être & rituels",
    image: "/screenshots/bien-etre.webp",
    douleur: "Tu tiens le rythme… jusqu'au jour où tu ne tiens plus.",
    accroche: "Ton énergie devient une donnée pilotée, pas une surprise.",
    benefices: [
      "Check-in énergie en 30 secondes chaque matin",
      "Courbe des 7 derniers jours : tes creux deviennent visibles",
      "Rituels doux guidés : respiration 4-7-8, journal, pause consciente",
      "Le cockpit allège ta charge les jours de basse énergie",
    ],
  },
];

const VALEURS = [
  { Icon: Sparkles, texte: "L'IA prépare, tu décides." },
  { Icon: Users, texte: "Jamais seul." },
  { Icon: Heart, texte: "L'équilibre avant la croissance à tout prix." },
  { Icon: Check, texte: "Honnêteté, toujours." },
  { Icon: Flame, texte: "Des valeurs chrétiennes assumées." },
  { Icon: Compass, texte: "Une sélection resserrée, pas un supermarché." },
];

// Prix repris directement de lib/plans.js (source unique) : plus aucun montant
// codé en dur ici, donc plus de risque d'oubli (ex. Rêveur) ou de désaccord
// avec la page /pricing si un tarif change.
const OFFRES = [
  ...PLANS.filter((p) => !p.masque).map((p) => ({
    nom: p.nom, prix: `${prixMois(p, "mensuel")} € TTC/mois`, cible: p.pourQui,
  })),
  { nom: PLAN_ENTREPRISE.nom, prix: "Sur devis", cible: PLAN_ENTREPRISE.pourQui },
];

export default function DecouvrirZayado() {
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);

  useSeo({
    title: "Découvrir Zayado — Le cockpit IA des entrepreneurs qui veulent durer",
    description: "Zayado réunit vision, actions, prospection et énergie dans un seul cockpit IA : point du jour, copilote avec actualité de ton marché, vision board, radar d'opportunités et rituels bien-être. Rentabilise ton entreprise sans te sacrifier.",
    path: "/decouvrir-zayado",
    index: true,
  });

  useEffect(() => {
    const fermer = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", fermer);
    return () => document.removeEventListener("mousedown", fermer);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden text-offwhite" data-testid="decouvrir-page">
      {/* Fond global de l'app (identique à l'accueil) */}

      {/* Barre du haut — identique à la page d'accueil */}
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2" data-testid="decouvrir-logo">
          <img src="/logo.png" alt="Zayado" className="h-9 w-9 object-contain" />
          <span className="hidden font-display text-lg font-bold sm:inline">Zayado</span>
        </Link>
        <div className="flex items-center gap-3" ref={menuRef}>
          <Link to={START} className="inline-flex items-center gap-2 rounded-full border border-white/60 px-4 py-2 text-[14px] font-medium text-offwhite transition hover:bg-white/10" data-testid="decouvrir-copilote">
            <Sparkles size={16} /> Copilote IA
          </Link>
          <button onClick={() => setMenu((v) => !v)} aria-label="Menu" className="rounded-lg p-2 text-offwhite hover:bg-white/10" data-testid="decouvrir-menu">
            {menu ? <X size={24} /> : <Menu size={24} />}
          </button>
          {menu && (
            <nav className="fenetre absolute right-5 top-[68px] w-60 rounded-2xl p-2 sm:right-8" data-testid="decouvrir-menu-liste">
              {[["/pricing", "Tarifs"], [START, "Créer mon cockpit"], ["/login", "Se connecter"]].map(([to, label]) => (
                <Link key={label} to={to} onClick={() => setMenu(false)} className="block rounded-xl px-4 py-2.5 text-[14px] text-offwhite/85 hover:bg-white/10">{label}</Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="relative z-10">
        {/* Héros */}
        <section className="mx-auto max-w-3xl px-5 pt-6 text-center sm:pt-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[12px] font-semibold text-gold" data-testid="decouvrir-badge">
            <Sparkles size={13} /> Découvrir Zayado
          </p>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl" data-testid="decouvrir-titre">
            Rentabilise ton entreprise <em className="italic text-gold">sans te sacrifier</em>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-offwhite/70 sm:text-lg">
            Vision, actions, prospection et énergie réunies dans un seul cockpit IA. Tu n'as plus besoin de dix outils — ni de choisir entre ta santé et ta rentabilité.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => navigate(START)} className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-7 text-[15px] font-semibold text-navy-900 transition hover:brightness-105" data-testid="decouvrir-cta-principal">
              Créer mon cockpit <ArrowRight size={17} />
            </button>
            <Link to="/pricing" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 bg-white/[0.06] px-7 text-[15px] font-semibold text-offwhite transition hover:bg-white/10" data-testid="decouvrir-cta-tarifs">
              Voir les tarifs
            </Link>
          </div>
        </section>

        {/* Douleurs */}
        <section className="mx-auto mt-16 max-w-4xl px-5 sm:mt-20" data-testid="decouvrir-douleurs">
          <p className="text-center font-hand text-[22px] text-gold/90">Tu reconnais ces journées ?</p>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {DOULEURS.map((d) => (
              <div key={d} className="flex items-start gap-3 rounded-2xl border border-white/20 bg-white/[0.08] px-4 py-3.5 backdrop-blur-xl" data-testid={`decouvrir-douleur-${d.slice(0, 12)}`}>
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <span className="text-[14px] leading-snug text-offwhite/85">{d}</span>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-[14.5px] leading-relaxed text-offwhite/60">
            Zayado est né de ces journées-là. Sa fondatrice les a vécues — et a construit l'outil qu'elle aurait voulu avoir : un accompagnement complet pour rentabiliser sans s'épuiser.
          </p>
        </section>

        {/* Modules : douleur → bénéfices */}
        <section className="mx-auto mt-16 max-w-5xl px-5 sm:mt-24">
          <h2 className="text-center font-display text-3xl font-bold sm:text-4xl" data-testid="decouvrir-modules-titre">Un seul cockpit, tout ton pilotage</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-[15px] text-offwhite/60">Chaque module répond à une douleur précise du quotidien d'entrepreneur.</p>
          <div className="mt-10 space-y-6">
            {MODULES.map((m, i) => (
              <div key={m.id} className={`grid items-center gap-6 rounded-[24px] border border-white/20 bg-white/[0.08] p-5 backdrop-blur-xl sm:p-7 lg:grid-cols-2 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`} data-testid={`decouvrir-module-${m.id}`}>
                <div>
                  <p className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-wide text-gold"><m.Icon size={15} /> {m.titre}</p>
                  <p className="mt-3 font-hand text-[20px] leading-snug text-offwhite/60">« {m.douleur} »</p>
                  <h3 className="mt-2 font-display text-[22px] font-bold leading-snug sm:text-2xl">{m.accroche}</h3>
                  <ul className="mt-4 space-y-2">
                    {m.benefices.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-[14px] text-offwhite/80"><Check size={15} className="mt-0.5 shrink-0 text-gold" />{b}</li>
                    ))}
                  </ul>
                </div>
                <div className="overflow-hidden rounded-[18px] border border-white/20 bg-[#16275a]/60">
                  <img src={m.image} alt={`Zayado — ${m.titre}`} loading="lazy" className="block aspect-[16/10] w-full object-cover object-top"
                    onError={(e) => { e.currentTarget.src = "/screenshots/cockpit.webp"; }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bonus humain */}
        <section className="mx-auto mt-14 max-w-5xl px-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[20px] border border-white/20 bg-white/[0.08] p-6 backdrop-blur-xl" data-testid="decouvrir-agent-business">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-gold"><Bot size={16} /> Agent Business</p>
              <p className="mt-2 text-[14px] leading-relaxed text-offwhite/75">Un chatbot en marque blanche pour TES clients, formé sur ton activité. Ton service client répond même quand tu dors.</p>
            </div>
            <div className="rounded-[20px] border border-white/20 bg-white/[0.08] p-6 backdrop-blur-xl" data-testid="decouvrir-collaborateurs">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-gold"><FileText size={16} /> Collaborateurs</p>
              <p className="mt-2 text-[14px] leading-relaxed text-offwhite/75">Un renfort humain de l'équipe Zayado quand tu en as besoin : une relecture, un document, un coup de main ponctuel.</p>
            </div>
          </div>
        </section>

        {/* Valeurs */}
        <section className="mx-auto mt-16 max-w-4xl px-5 text-center sm:mt-20" data-testid="decouvrir-valeurs">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Ce en quoi nous croyons</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {VALEURS.map((v) => (
              <div key={v.texte} className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/[0.08] px-4 py-4 text-left backdrop-blur-xl" data-testid={`decouvrir-valeur-${v.texte.slice(0, 10)}`}>
                <v.Icon size={17} className="shrink-0 text-gold" />
                <span className="text-[13.5px] font-medium text-offwhite/85">{v.texte}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Offres */}
        <section className="mx-auto mt-16 max-w-5xl px-5 sm:mt-20" data-testid="decouvrir-offres">
          <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">Une offre pour chaque étape</h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-[15px] text-offwhite/60">1er mois pour 1 €. Résiliable à tout moment.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OFFRES.map((o) => (
              <Link key={o.nom} to="/pricing" className="group rounded-[20px] border border-white/20 bg-white/[0.08] p-5 backdrop-blur-xl transition hover:bg-white/[0.12]" data-testid={`decouvrir-offre-${o.nom.toLowerCase()}`}>
                <p className="font-display text-[18px] font-bold">{o.nom}</p>
                <p className="mt-1 text-[15px] font-semibold text-gold">{o.prix}</p>
                <p className="mt-2 text-[12.5px] leading-snug text-offwhite/60">{o.cible}</p>
                <p className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-gold group-hover:underline">Découvrir <ArrowRight size={13} /></p>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="mx-auto mt-16 max-w-3xl px-5 pb-20 text-center sm:mt-24" data-testid="decouvrir-cta-final">
          <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">Raconte ton projet.<br />Le cockpit fait le reste.</h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-offwhite/65">Cinq minutes d'onboarding : ta vision, tes objectifs, ton rythme. Demain matin, ton point du jour t'attend.</p>
          <button onClick={() => navigate(START)} className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-8 text-[15px] font-semibold text-navy-900 transition hover:brightness-105" data-testid="decouvrir-cta-final-btn">
            Je me lance — 1 € le 1er mois <ArrowRight size={17} />
          </button>
          <p className="mt-4 text-[12.5px] text-offwhite/50">Hébergé en Europe · Données chiffrées · Résiliable à tout moment</p>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-[12.5px] text-offwhite/45">
        © {new Date().getFullYear()} Zayado · <Link to="/" className="hover:text-offwhite/70">Accueil</Link> · <Link to="/pricing" className="hover:text-offwhite/70">Tarifs</Link> · <Link to="/login" className="hover:text-offwhite/70">Se connecter</Link>
      </footer>
    </div>
  );
}
