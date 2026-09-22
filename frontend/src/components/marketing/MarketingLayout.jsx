import React from "react";
import { Link } from "react-router-dom";

const LIENS = [
  { to: "/fonctionnalites/vision-objectifs", label: "Vision & Objectifs" },
  { to: "/fonctionnalites/prospection-croissance", label: "Prospection" },
  { to: "/fonctionnalites/bien-etre-dirigeant", label: "Bien-être" },
  { to: "/pricing", label: "Tarifs" },
];

export function MarketingLayout({ children }) {
  return (
    <div className="zayado-blue min-h-screen text-offwhite" data-testid="marketing-layout">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2.5" data-testid="mkt-logo">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#F1E2CC] to-[#DEC2A3] font-wordmark text-lg font-bold text-navy-900">K</span>
          <span className="font-display text-base font-bold">Kairos <span className="font-normal text-offwhite/50">by Zayado</span></span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {LIENS.map((l) => (
            <Link key={l.to} to={l.to} data-testid={`mkt-nav-${l.label.toLowerCase().replace(/[^a-z]/g, "-")}`} className="text-sm text-offwhite/65 transition-colors hover:text-gold">
              {l.label}
            </Link>
          ))}
        </nav>
        <Link to="/onboarding" data-testid="mkt-nav-cta" className="btn-gold !px-5 !py-2.5 text-sm">Essayer gratuitement</Link>
      </header>

      <main>{children}</main>

      <footer className="border-t border-white/10">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-3">
          <div>
            <p className="font-display text-lg font-bold">Kairos by Zayado</p>
            <p className="mt-2 max-w-xs text-sm text-offwhite/55">Le cockpit apaisé de l'entrepreneur : ta vision, ton énergie et ta croissance au même endroit.</p>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">Fonctionnalités</p>
            <ul className="space-y-2 text-sm text-offwhite/60">
              {LIENS.map((l) => <li key={l.to}><Link to={l.to} className="hover:text-gold">{l.label}</Link></li>)}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">Commencer</p>
            <ul className="space-y-2 text-sm text-offwhite/60">
              <li><Link to="/onboarding" className="hover:text-gold">Créer mon cockpit</Link></li>
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
