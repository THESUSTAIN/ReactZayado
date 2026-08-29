import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

const LINKS = [
  { to: "/bienvenue", label: "Accueil" },
  { to: "/fonctionnalites", label: "Fonctionnalités" },
  { to: "/copilote-agent-ia", label: "Copilote IA" },
  { to: "/produit-vision", label: "Vision" },
  { to: "/tarifs", label: "Tarifs" },
  { to: "/demo", label: "Démo" },
];

export default function LpShell({ title, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { if (title) document.title = title; }, [title]);
  return (
    <div className="lp-root" data-testid="lp-shell">
      <header className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <Link to="/bienvenue" className="lp-brand">
            <img src="/logo-icon.png" alt="MyExtension Business" className="lp-brand-logo" />
            <span className="lp-brand-text">MyExtension <b>Business</b><span className="lp-brand-by">by Zayado</span></span>
          </Link>
          <nav className="lp-nav-links">
            {LINKS.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
          </nav>
          <div className="lp-nav-actions">
            <Link to="/login" className="lp-btn lp-btn-ghost">Se connecter</Link>
            <Link to="/login" className="lp-btn lp-btn-gold">Essayer gratuitement</Link>
          </div>
          <button className="lp-burger" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menuOpen && (
          <div className="lp-mobile-menu">
            {LINKS.map((l) => <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}>{l.label}</Link>)}
            <Link to="/login" className="lp-btn lp-btn-gold w-full">Essayer gratuitement</Link>
          </div>
        )}
      </header>

      {children}

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-brand">
            <img src="/logo-icon.png" alt="" className="lp-brand-logo" />
            <span className="lp-brand-text">MyExtension <b>Business</b></span>
          </div>
          <p className="lp-footer-copy">© {new Date().getFullYear()} Zayado · Entreprendre avec sens, clarté et équilibre.</p>
          <Link to="/login" className="lp-footer-link">Se connecter</Link>
        </div>
      </footer>
    </div>
  );
}
