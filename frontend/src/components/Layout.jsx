/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X, ShoppingBag, ArrowUpRight } from "lucide-react";
import { SAAS_URL } from "../lib/api.js";

const NAV = [
  { to: "/", label: "Accueil" },
  { to: "/boutique", label: "Boutique" },
  { to: "/tarifs", label: "Tarifs" },
  { to: "/blog", label: "Blog" },
  { to: "/a-propos", label: "À propos" },
  { to: "/contact", label: "Contact" },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header open={open} setOpen={setOpen} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function Header({ open, setOpen }) {
  return (
    <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-sand-200/80">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 h-[72px] flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 shrink-0" data-testid="pub-logo">
          <div className="w-8 h-8 rounded-full bg-navy-gradient grid place-items-center text-cream font-display text-[15px]">Z</div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold text-navy">Zayado</div>
            <div className="text-[10px] tracking-[0.22em] uppercase text-ink-soft">Cockpit fondateurs</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={`pub-nav-${n.label.toLowerCase().replace(/\s/g, '-')}`}
              className={({ isActive }) =>
                `relative px-3.5 py-2 text-[14px] transition-colors ${
                  isActive ? "text-navy font-semibold" : "text-ink-soft hover:text-navy"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <a
            href={SAAS_URL}
            target="_blank"
            rel="noreferrer"
            data-testid="pub-cockpit-cta"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-navy text-cream text-[13.5px] font-medium hover:bg-[#0c1d33] transition-colors shadow-soft"
          >
            Cockpit <ArrowUpRight size={14} />
          </a>
          <button
            className="md:hidden w-10 h-10 grid place-items-center rounded-full hover:bg-cream-soft text-navy"
            onClick={() => setOpen((v) => !v)}
            data-testid="pub-mobile-toggle"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-sand-200 bg-cream">
          <div className="px-6 py-3 flex flex-col">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="py-2.5 text-[15px] text-ink hover:text-navy"
              >
                {n.label}
              </Link>
            ))}
            <a href={SAAS_URL} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center justify-center gap-2 px-4 h-11 rounded-full bg-navy text-cream font-medium">
              Cockpit <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-navy-gradient text-cream/90 mt-20">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-full bg-gold/90 grid place-items-center text-navy font-display text-[16px]">Z</div>
            <div className="font-display text-[20px] text-cream">Zayado</div>
          </div>
          <p className="text-[13px] text-cream/70 leading-relaxed">
            L&apos;IA prépare 70 % du travail. Vous apportez le jugement, la vision, le sens.
          </p>
        </div>

        <FooterCol title="Produit" links={[
          ["Boutique", "/boutique"],
          ["Tarifs", "/tarifs"],
          ["Blog", "/blog"],
        ]} />
        <FooterCol title="Société" links={[
          ["À propos", "/a-propos"],
          ["Contact", "/contact"],
        ]} />
        <FooterCol title="Légal" links={[
          ["Mentions légales", "/legal/mentions-legales"],
          ["Confidentialité", "/legal/confidentialite"],
          ["CGV", "/legal/cgv"],
        ]} />
      </div>
      <div className="border-t border-cream/10">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-5 text-[12px] text-cream/60 flex flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} Zayado · Tous droits réservés</span>
          <a href={SAAS_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-gold">
            <ShoppingBag size={12} /> Accéder au cockpit
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 className="text-[11px] tracking-[0.22em] uppercase text-gold/90 font-semibold mb-3">{title}</h4>
      <ul className="space-y-2">
        {links.map(([label, to]) => (
          <li key={to}>
            <Link to={to} className="text-[13.5px] text-cream/80 hover:text-cream">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
