import { Link, useLocation } from "react-router-dom";
import { LogoFull } from "./Logo";
import { BRAND } from "@/data/content";

const MINI_LINKS = [
  { to: "/services", label: "Accompagnement" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/cockpit", label: "Cockpit" },
  { to: "/journal", label: "Journal" },
  { to: "/maison", label: "La Maison" },
  { to: "/diagnostic", label: "Diagnostic gratuit" },
];

function MinimalFooter() {
  return (
    <footer className="border-t" style={{ borderColor: "var(--line)", background: "var(--paper)" }} data-testid="footer-minimal">
      <div className="mx-auto max-w-6xl px-5 py-10 text-center">
        <div className="flex justify-center">
          <LogoFull />
        </div>
        <p className="font-hand mt-3 text-xl" style={{ color: "var(--gold)" }}>
          {BRAND.slogan}
        </p>
        <nav className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] font-medium">
          {MINI_LINKS.map((l) => (
            <Link key={l.to} to={l.to} data-testid={`footer-minimal-link-${l.to.slice(1)}`} className="opacity-75 hover:opacity-100">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="mt-6 text-xs opacity-50">© Zayado — Démo V1. Textes, visuels et prix : placeholders à affiner.</p>
      </div>
    </footer>
  );
}

export default function Footer() {
  const { pathname } = useLocation();
  if (pathname === "/") return <MinimalFooter />;

  return (
    <footer className="bg-navy-grad text-[var(--paper-2)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <LogoFull light />
          <p className="font-hand mt-5 text-2xl" style={{ color: "var(--gold-soft)" }}>
            {BRAND.slogan}
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed opacity-70">
            Zayado, {BRAND.maison.toLowerCase()} : accompagnement, marketplace et cockpit — au service de votre
            équilibre vie perso / vie pro.
          </p>
        </div>
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] opacity-60">Le parcours</p>
          <ul className="space-y-2.5 text-[15px]">
            <li><Link to="/diagnostic" data-testid="footer-link-diagnostic" className="opacity-80 hover:opacity-100">Diagnostic gratuit</Link></li>
            <li><Link to="/services" data-testid="footer-link-services" className="opacity-80 hover:opacity-100">Accompagnement</Link></li>
            <li><Link to="/tunnel/acquisition" data-testid="footer-link-tunnel-acquisition" className="opacity-80 hover:opacity-100">Tunnel — Acquisition</Link></li>
            <li><Link to="/tunnel/optimisation" data-testid="footer-link-tunnel-optimisation" className="opacity-80 hover:opacity-100">Tunnel — Optimisation</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] opacity-60">Marketplace</p>
          <ul className="space-y-2.5 text-[15px]">
            <li><Link to="/marketplace" data-testid="footer-link-marketplace" className="opacity-80 hover:opacity-100">Toute la marketplace</Link></li>
            <li><Link to="/marketplace/entreprise" data-testid="footer-link-entreprise" className="opacity-80 hover:opacity-100">Pour l’entreprise</Link></li>
            <li><Link to="/marketplace/entrepreneur" data-testid="footer-link-entrepreneur" className="opacity-80 hover:opacity-100">Pour l’entrepreneur</Link></li>
            <li><Link to="/box" data-testid="footer-link-box" className="opacity-80 hover:opacity-100">Box saisonnières</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] opacity-60">La maison</p>
          <ul className="space-y-2.5 text-[15px]">
            <li><Link to="/journal" data-testid="footer-link-journal" className="opacity-80 hover:opacity-100">Le Journal</Link></li>
            <li><Link to="/cockpit" data-testid="footer-link-cockpit" className="opacity-80 hover:opacity-100">Le Cockpit</Link></li>
            <li><Link to="/maison" data-testid="footer-link-maison" className="opacity-80 hover:opacity-100">La Maison — le modèle</Link></li>
            <li><Link to="/vision" data-testid="footer-link-vision" className="opacity-80 hover:opacity-100">Vision & valeurs</Link></li>
            <li><Link to="/coming-soon" data-testid="footer-link-coming-soon" className="opacity-80 hover:opacity-100">La boutique — Coming soon</Link></li>
            <li><Link to="/hero-choix" data-testid="footer-link-hero-choix" className="opacity-80 hover:opacity-100">Choix de l’image hero <span className="font-hand text-base" style={{ color: "var(--gold-soft)" }}>(interne)</span></Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t px-5 py-5 text-center text-xs opacity-50" style={{ borderColor: "rgba(253,252,248,0.12)" }}>
        © Zayado — Démo V1. Textes, visuels, prix et témoignages : placeholders à affiner.
      </div>
    </footer>
  );
}
