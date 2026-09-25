import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles, Menu, X, ArrowRight, ChevronLeft, ChevronRight, Mail,
  ShoppingBag, LayoutDashboard, Newspaper, Compass, Check, Linkedin, Instagram,
} from "lucide-react";
import { useSeo } from "@/lib/useSeo";

const START = "/login?next=%2Fonboarding";
const BOUTIQUE = "https://zayado.net";
const CONTACT = "mailto:contact@zayado.net?subject=Hub%20Zayado";

const CAROUSEL = [
  { src: "/screenshots/cockpit.webp", legende: "Le cockpit — ton point du jour chaque matin" },
  { src: "/screenshots/radar.webp", legende: "Le Radar — 3 opportunités qualifiées par jour" },
  { src: "/screenshots/vision.webp", legende: "Le Vision Board — ton cap toujours sous les yeux" },
  { src: "/screenshots/bien-etre.webp", legende: "Bien-être — ton énergie pilotée, pas subie" },
];

const DOULEURS = [
  "La charge mentale qui ne s'éteint jamais",
  "Le sentiment de tout faire seul·e",
  "Les urgences qui remplacent les priorités",
  "La prospection repoussée au lendemain",
];

const INTEGRATIONS = [
  "Qonto", "Stripe", "Trello", "Jira", "HubSpot", "WhatsApp", "Telegram", "Google Calendar", "Shopify",
];

const FAQ = [
  { q: "Pour qui est Zayado ?", r: "Pour les entrepreneurs et indépendants qui veulent rentabiliser sans s'épuiser : solopreneurs, indépendants avec clients, et petites équipes jusqu'à 5 personnes." },
  { q: "Puis-je résilier quand je veux ?", r: "Oui. Sans engagement, en deux clics depuis tes paramètres. L'essai « 1 mois pour 1 € » te laisse tout tester tranquillement." },
  { q: "Mes données sont-elles en sécurité ?", r: "Oui : hébergées en Europe, chiffrées, exportables à tout moment (RGPD). L'IA prépare — c'est toujours toi qui décides." },
];

export default function HubZayado() {
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [slide, setSlide] = useState(0);
  const menuRef = useRef(null);

  useSeo({
    title: "Zayado — Le hub des entrepreneurs qui veulent durer",
    description: "Un seul hub : ton cockpit IA pour piloter ton entreprise sans t'épuiser, et la boutique Zayado. Point du jour, copilote IA avec actualité de ton marché, radar d'opportunités, rituels bien-être.",
    path: "/hub",
  });

  useEffect(() => {
    const fermer = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", fermer);
    return () => document.removeEventListener("mousedown", fermer);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % CAROUSEL.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden text-offwhite" data-testid="hub-page">
      {/* Barre du haut — modèle : lien discret + bouton doré, hamburger identique à l'accueil */}
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2" data-testid="hub-logo">
          <img src="/logo.png" alt="Zayado" className="h-9 w-9 object-contain" />
          <span className="hidden font-display text-lg font-bold sm:inline">Zayado</span>
        </Link>
        <div className="flex items-center gap-3" ref={menuRef}>
          <Link to="/decouvrir-zayado" className="hidden items-center gap-1.5 text-[13.5px] font-medium text-offwhite/80 transition hover:text-gold sm:inline-flex" data-testid="hub-lien-decouvrir">
            Découvrir Zayado <ArrowRight size={14} />
          </Link>
          <button onClick={() => navigate(START)} className="hidden h-10 items-center gap-2 rounded-full bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-5 text-[13.5px] font-semibold text-navy-900 transition hover:brightness-105 sm:inline-flex" data-testid="hub-cta-header">
            Créer mon cockpit
          </button>
          <button onClick={() => setMenu((v) => !v)} aria-label="Menu" className="rounded-lg p-2 text-offwhite hover:bg-white/10" data-testid="hub-menu">
            {menu ? <X size={24} /> : <Menu size={24} />}
          </button>
          {menu && (
            <nav className="fenetre absolute right-5 top-[68px] w-60 rounded-2xl p-2 sm:right-8" data-testid="hub-menu-liste">
              {[["/pricing", "Tarifs"], [START, "Créer mon cockpit"], ["/login", "Se connecter"]].map(([to, label]) => (
                <Link key={label} to={to} onClick={() => setMenu(false)} className="block rounded-xl px-4 py-2.5 text-[14px] text-offwhite/85 hover:bg-white/10">{label}</Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
        {/* Héros split — modèle Melissa : titre géant + visuel à gauche, carrousel à droite */}
        <section className="grid items-start gap-8 pt-6 lg:grid-cols-2 lg:pt-10" data-testid="hub-hero">
          <div>
            <h1 className="font-display text-[64px] font-bold leading-[0.95] sm:text-[88px]" data-testid="hub-titre">
              Le hub<br /><em className="italic text-gold">Zayado</em>
            </h1>
            <p className="mt-5 text-[15px] font-medium text-offwhite/75" data-testid="hub-tags">
              Vision · Actions · Prospection · Énergie — un seul endroit
            </p>
            {/* Les deux portes */}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button onClick={() => navigate(START)} className="inline-flex h-13 items-center gap-2 rounded-full bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-7 py-3.5 text-[15px] font-semibold text-navy-900 transition hover:brightness-105" data-testid="hub-btn-cockpit">
                <LayoutDashboard size={17} /> Entrer dans le cockpit
              </button>
              <a href={BOUTIQUE} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/[0.06] px-7 py-3.5 text-[15px] font-semibold text-offwhite transition hover:bg-white/12" data-testid="hub-btn-boutique">
                <ShoppingBag size={17} /> Visiter la boutique
              </a>
            </div>
            <div className="mt-6 flex items-center gap-3" data-testid="hub-sociaux">
              <a href="https://zayado.net" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="rounded-xl border border-white/20 bg-white/[0.08] p-2.5 text-offwhite/80 transition hover:text-gold" data-testid="hub-social-linkedin"><Linkedin size={18} /></a>
              <a href="https://zayado.net" target="_blank" rel="noreferrer" aria-label="Instagram" className="rounded-xl border border-white/20 bg-white/[0.08] p-2.5 text-offwhite/80 transition hover:text-gold" data-testid="hub-social-instagram"><Instagram size={18} /></a>
              <a href={CONTACT} aria-label="E-mail" className="rounded-xl border border-white/20 bg-white/[0.08] p-2.5 text-offwhite/80 transition hover:text-gold" data-testid="hub-social-mail"><Mail size={18} /></a>
            </div>
            {/* Grand visuel produit, cadre doré délibéré */}
            <div className="mt-8 overflow-hidden rounded-[24px] border-2 border-[#DEC2A3]/70 shadow-[0_24px_70px_rgba(4,10,28,0.45)]" data-testid="hub-visuel">
              <img src="/screenshots/cockpit-accueil.webp" alt="Le cockpit Zayado" className="block aspect-[4/3] w-full object-cover object-top" />
            </div>
          </div>

          <div className="space-y-5">
            {/* Carrousel */}
            <div className="overflow-hidden rounded-[20px] border border-white/20 bg-white/[0.08] backdrop-blur-xl" data-testid="hub-carrousel">
              <div className="relative">
                <img src={CAROUSEL[slide].src} alt={CAROUSEL[slide].legende} className="block aspect-[16/9] w-full object-cover object-top" />
                <button onClick={() => setSlide((s) => (s - 1 + CAROUSEL.length) % CAROUSEL.length)} aria-label="Précédent" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-offwhite backdrop-blur transition hover:bg-white/25" data-testid="hub-carrousel-prev"><ChevronLeft size={18} /></button>
                <button onClick={() => setSlide((s) => (s + 1) % CAROUSEL.length)} aria-label="Suivant" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-offwhite backdrop-blur transition hover:bg-white/25" data-testid="hub-carrousel-next"><ChevronRight size={18} /></button>
              </div>
              <p className="px-4 py-3 text-center text-[13px] text-offwhite/70">{CAROUSEL[slide].legende}</p>
            </div>

            <Link to="/decouvrir-zayado" className="block rounded-full bg-gradient-to-r from-[#DEC2A3] to-[#c9a875] py-3.5 text-center text-[14.5px] font-semibold text-navy-900 transition hover:brightness-105" data-testid="hub-btn-decouvrir">
              Découvrir tout Zayado
            </Link>

            {/* Deux cartes — modèle Melissa */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="overflow-hidden rounded-[18px] border border-white/20 bg-white/[0.08] backdrop-blur-xl" data-testid="hub-carte-actualite">
                <img src="/screenshots/copilote-actualite.png" alt="Actualité du Copilote IA" className="block aspect-[16/10] w-full object-cover object-top" />
                <div className="p-4">
                  <h3 className="font-display text-[17px] font-bold">L'actualité de ton marché</h3>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-offwhite/60">Le Copilote IA veille ton secteur chaque matin et te résume l'essentiel.</p>
                  <Link to="/decouvrir-zayado" className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-gold hover:underline" data-testid="hub-carte-actualite-lien">En savoir plus <ArrowRight size={12} /></Link>
                </div>
              </div>
              <div className="overflow-hidden rounded-[18px] border border-white/20 bg-white/[0.08] backdrop-blur-xl" data-testid="hub-carte-vision">
                <img src="/screenshots/vision.webp" alt="Vision Board" className="block aspect-[16/10] w-full object-cover object-top" />
                <div className="p-4">
                  <h3 className="font-display text-[17px] font-bold">Ta vision, visible</h3>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-offwhite/60">Un board vivant généré par l'IA : cap 3 ans, feuille de route 90 jours.</p>
                  <Link to="/decouvrir-zayado" className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-gold hover:underline" data-testid="hub-carte-vision-lien">En savoir plus <ArrowRight size={12} /></Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Douleurs */}
        <section className="mt-16 sm:mt-20" data-testid="hub-douleurs">
          <p className="text-center font-hand text-[22px] text-gold/90">Pensé pour tes vraies journées</p>
          <div className="mx-auto mt-6 grid max-w-3xl gap-2.5 sm:grid-cols-2">
            {DOULEURS.map((d) => (
              <div key={d} className="flex items-start gap-3 rounded-2xl border border-white/20 bg-white/[0.08] px-4 py-3.5 backdrop-blur-xl" data-testid={`hub-douleur-${d.slice(0, 10)}`}>
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <span className="text-[14px] leading-snug text-offwhite/85">{d}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Intégrations */}
        <section className="mt-16 text-center sm:mt-20" data-testid="hub-integrations">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Connecté à tes outils</h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-offwhite/60">Le cockpit branche ta trésorerie, tes projets et tes messages — tu ne recopies plus rien.</p>
          <div className="mx-auto mt-7 flex max-w-3xl flex-wrap justify-center gap-2.5">
            {INTEGRATIONS.map((i) => (
              <span key={i} className="rounded-full border border-white/20 bg-white/[0.08] px-4 py-2 text-[13px] font-medium text-offwhite/80 backdrop-blur-xl" data-testid={`hub-integration-${i.toLowerCase()}`}>{i}</span>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto mt-16 max-w-3xl sm:mt-20" data-testid="hub-faq">
          <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">Les questions qu'on nous pose</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((f) => (
              <div key={f.q} className="rounded-2xl border border-white/20 bg-white/[0.08] p-5 backdrop-blur-xl" data-testid={`hub-faq-${f.q.slice(0, 12)}`}>
                <p className="text-[15px] font-semibold text-offwhite">{f.q}</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-offwhite/65">{f.r}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final + contact */}
        <section className="mx-auto mt-16 max-w-3xl pb-20 text-center sm:mt-24" data-testid="hub-cta-final">
          <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">Deux portes, un seul hub</h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-offwhite/65">Le cockpit pour piloter. La boutique pour découvrir. Et une équipe qui répond vraiment.</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => navigate(START)} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-8 py-3.5 text-[15px] font-semibold text-navy-900 transition hover:brightness-105" data-testid="hub-cta-cockpit">
              Je me lance — 1 € le 1er mois <ArrowRight size={17} />
            </button>
            <a href={BOUTIQUE} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/[0.06] px-8 py-3.5 text-[15px] font-semibold text-offwhite transition hover:bg-white/12" data-testid="hub-cta-boutique">
              <ShoppingBag size={17} /> La boutique
            </a>
            <a href={CONTACT} className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-8 py-3.5 text-[15px] font-semibold text-gold transition hover:bg-gold/20" data-testid="hub-cta-contact">
              <Mail size={17} /> Contactez-nous
            </a>
          </div>
          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-2 text-[12.5px] text-offwhite/50">
            <Check size={13} className="text-gold" /> Hébergé en Europe · <Check size={13} className="text-gold" /> Données chiffrées · <Check size={13} className="text-gold" /> Résiliable à tout moment
          </p>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-[12.5px] text-offwhite/45">
        © {new Date().getFullYear()} Zayado — SAS TheSustain · <Link to="/" className="hover:text-gold">Accueil</Link> · <a href={BOUTIQUE} target="_blank" rel="noreferrer" className="hover:text-gold">Boutique</a> · <a href={CONTACT} className="hover:text-gold">Contact</a>
      </footer>
    </div>
  );
}
