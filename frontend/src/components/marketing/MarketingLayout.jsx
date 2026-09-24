import React from "react";
import { Link } from "react-router-dom";

// Liens réels uniquement (les anciennes pages /ia… n'existent plus).
const LIENS = [
  { to: "/", label: "Accueil" },
  { href: "https://zayado.net", label: "Boutique" },
  { to: "/pricing", label: "Tarifs" },
  { to: "/login", label: "Se connecter" },
];
const Lien = ({ l, className, testid }) => (l.href
  ? <a href={l.href} className={className} data-testid={testid}>{l.label}</a>
  : <Link to={l.to} className={className} data-testid={testid}>{l.label}</Link>);

export function MarketingLayout({ children }) {
  return (
    <div className="zayado-blue min-h-screen text-offwhite" data-testid="marketing-layout">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2.5" data-testid="mkt-logo">
          <img src="/logo.png" alt="Zayado" className="h-9 w-9 object-contain" />
          <span className="font-display text-base font-bold">Zayado</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {LIENS.map((l) => (
            <Lien key={l.label} l={l} testid={`mkt-nav-${l.label.toLowerCase().replace(/[^a-z]/g, "-")}`} className="text-sm text-offwhite/65 transition-colors hover:text-gold" />
          ))}
        </nav>
        <Link to="/login?next=%2Fonboarding" data-testid="mkt-nav-cta" className="btn-gold !px-5 !py-2.5 text-sm">Essayer 2 mois pour 1 €</Link>
      </header>

      <main>{children}</main>

      <footer className="border-t border-white/10">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-3">
          <div>
            <p className="font-display text-lg font-bold">Zayado</p>
            <p className="mt-2 max-w-xs text-sm text-offwhite/55">La maison des entrepreneurs apaisés : boutique, services et Cockpit IA pour développer son activité sans perdre son équilibre.</p>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">Fonctionnalités</p>
            <ul className="space-y-2 text-sm text-offwhite/60">
              {LIENS.map((l) => <li key={l.label}><Lien l={l} className="hover:text-gold" /></li>)}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">Commencer</p>
            <ul className="space-y-2 text-sm text-offwhite/60">
              <li><Link to="/login?next=%2Fonboarding" className="hover:text-gold">Essayer 2 mois pour 1 €</Link></li>
              <li><Link to="/login" className="hover:text-gold">Se connecter</Link></li>
              <li><Link to="/pricing" className="hover:text-gold">Voir les tarifs</Link></li>
            </ul>
          </div>
        </div>
        <p className="border-t border-white/5 py-5 text-center text-xs text-offwhite/35">© {new Date().getFullYear()} Zayado — Fait avec calme en France.</p>
      </footer>
    </div>
  );
}
