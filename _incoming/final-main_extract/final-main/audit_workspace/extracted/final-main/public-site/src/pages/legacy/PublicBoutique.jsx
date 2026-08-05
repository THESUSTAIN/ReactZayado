/* Wrapper public boutique — style Kiabi : top bar promo + header (logo/nav/search/icons)
   + mega-menu catégories sous le header.
   Inspiré de kiabi.com : promo bar navy en haut, header blanc fin, nav rouge en-dessous
   (mais on garde la palette Zayado navy/or). */
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ShoppingBag, Search, User, Heart, Truck, ChevronDown, Menu, X, ChevronRight,
} from "lucide-react";
import Boutique from "@/pages/Boutique";
import BoutiqueProduct from "@/pages/BoutiqueProduct";
import BoutiqueSearch from "@/pages/BoutiqueSearch";
import ShopSeoCategory from "@/pages/ShopSeoCategory";
import Favorites from "@/pages/Favorites";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Contact from "@/pages/Contact";
import Apropos from "@/pages/Apropos";
import FAQ from "@/pages/FAQ";
import CGV from "@/pages/legal/CGV";
import LivraisonRetours from "@/pages/legal/LivraisonRetours";
import Confidentialite from "@/pages/legal/Confidentialite";
import MentionsLegales from "@/pages/legal/MentionsLegales";
import ConditionsUtilisation from "@/pages/legal/ConditionsUtilisation";
import Account from "@/pages/Account";
import Blog from "@/pages/Blog";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CartDrawer from "@/components/CartDrawer";
import CookieBanner from "@/components/CookieBanner";
import { getFavorites } from "@/lib/favorites";

const NAVY = "var(--zayado-navy)";
const GOLD = "var(--zayado-gold)";
const MUTED = "var(--zayado-muted)";

// Mega-menu : structure catégories par univers
const MEGA_MENU = {
  corps: {
    label: "Corps",
    columns: [
      { title: "Vue", links: ["Lunettes anti-lumière bleue", "Lunettes lecture", "Étuis & nettoyants"] },
      { title: "Ergonomie", links: ["Supports d'écran", "Souris ergonomiques", "Claviers", "Repose-poignets"] },
      { title: "Posture", links: ["Coussins lombaires", "Tapis ergonomiques", "Repose-pieds"] },
      { title: "Aromathérapie", links: ["Huiles essentielles BIO", "Diffuseurs", "Sprays apaisants", "Coffrets découverte"] },
    ],
    feature: {
      img: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?auto=format&w=400&q=80",
      title: "Nouveau · Z-Focus",
      desc: "La lunette qui filtre la lumière bleue toute la journée.",
    },
  },
  ame: {
    label: "Âme",
    columns: [
      { title: "Méditation", links: ["Coussins zafu", "Tapis de yoga", "Bols tibétains", "Encens & porte-encens"] },
      { title: "Lithothérapie", links: ["Améthyste", "Quartz rose", "Tourmaline noire", "Coffrets pierres"] },
      { title: "Bougies & senteurs", links: ["Bougies cire de soja", "Bougies parfumées", "Brumes d'intérieur"] },
      { title: "Lecture & sons", links: ["Livres essentiels", "Audio focus & sommeil", "Cartes oracle"] },
    ],
    feature: {
      img: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&w=400&q=80",
      title: "Coup de cœur",
      desc: "Bougie sauge & cèdre, 35h de combustion, mèche en bois.",
    },
  },
  rituel: {
    label: "Rituel",
    columns: [
      { title: "Composez votre rituel", links: ["Matin · Énergie & clarté", "Pause · Recentrage 5min", "Soir · Décompression"] },
      { title: "Coffrets prêts", links: ["Coffret Entrepreneur Apaisé", "Coffret Bureau Conscient", "Coffret Premier Pas"] },
    ],
    feature: {
      img: "https://images.unsplash.com/photo-1545389336-cf090694435e?auto=format&w=400&q=80",
      title: "5 minutes le matin",
      desc: "Découvrir le rituel Zayado.",
    },
  },
};

function MegaMenu({ active, onClose }) {
  if (!active || !MEGA_MENU[active]) return null;
  const m = MEGA_MENU[active];
  return (
    <div
      onMouseLeave={onClose}
      className="absolute left-0 right-0 top-full bg-white border-t border-[var(--zayado-border)] shadow-lg z-50 animate-in fade-in duration-150"
      data-testid={`megamenu-${active}`}
    >
      <div className="max-w-[1280px] mx-auto px-6 py-8 grid grid-cols-[1fr_280px] gap-10">
        <div className="grid grid-cols-4 gap-6">
          {m.columns.map((col) => (
            <div key={col.title}>
              <div className="text-xs uppercase tracking-wider font-bold mb-3 pb-2 border-b border-[var(--zayado-border)]" style={{ color: NAVY }}>
                {col.title}
              </div>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l}>
                    <Link to={`/boutique?u=${active}`} className="text-sm hover:underline" style={{ color: "var(--zayado-text)" }}>
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {/* Feature card */}
        <Link to={`/boutique?u=${active}`} className="group block rounded-lg overflow-hidden border border-[var(--zayado-border)]">
          <div className="aspect-[4/3]">
            <img src={m.feature.img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          </div>
          <div className="p-3 bg-white">
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: GOLD }}>À découvrir</div>
            <div className="text-sm font-medium mb-1" style={{ color: "var(--zayado-text)" }}>{m.feature.title}</div>
            <div className="text-xs" style={{ color: MUTED }}>{m.feature.desc}</div>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function PublicBoutique() {
  const loc = useLocation();
  const path = loc.pathname;
  const [activeMenu, setActiveMenu] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  // Drawer mobile (style Kiabi : hamburger → drawer latéral catégories)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSubmenu, setMobileSubmenu] = useState(null); // clé MEGA_MENU active
  // Bloque le scroll du body quand drawer ouvert
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);
  // Ferme le drawer à chaque changement de page
  useEffect(() => { setMobileMenuOpen(false); setMobileSubmenu(null); }, [path]);

  // Sync la search bar du header avec ?q= de l'URL pour la page recherche
  useEffect(() => {
    if (path === "/boutique/recherche") {
      const q = new URLSearchParams(loc.search).get("q") || "";
      setSearchQ(q);
    }
  }, [path, loc.search]);

  // Compteurs panier + favoris réactifs
  useEffect(() => {
    const readCounts = () => {
      try {
        const c = JSON.parse(localStorage.getItem("zay_cart") || "[]");
        setCartCount(c.reduce((s, it) => s + (it.quantity || 0), 0));
      } catch { setCartCount(0); }
      setFavCount(getFavorites().length);
    };
    readCounts();
    const onCart = () => readCounts();
    const onFav = () => readCounts();
    window.addEventListener("zayado:cart-updated", onCart);
    window.addEventListener("zayado:cart-add", onCart);
    window.addEventListener("zayado:favorites-updated", onFav);
    window.addEventListener("storage", readCounts);
    return () => {
      window.removeEventListener("zayado:cart-updated", onCart);
      window.removeEventListener("zayado:cart-add", onCart);
      window.removeEventListener("zayado:favorites-updated", onFav);
      window.removeEventListener("storage", readCounts);
    };
  }, []);

  // Soumission de la search bar → /boutique/recherche?q=...
  const onSubmitSearch = (e) => {
    e.preventDefault();
    const q = (searchQ || "").trim();
    if (q) window.location.href = `/boutique/recherche?q=${encodeURIComponent(q)}`;
  };

  // On masque la search bar du header sur la page de recherche pour éviter
  // le doublon avec la grosse barre dédiée de la page.
  const hideHeaderSearch = false; // toujours visible (style Kiabi)

  let Content;
  // Slugs des pages catégories SEO Boutique (les 6 dossiers éditoriaux)
  const SEO_SLUGS = new Set([
    "concentration-bien-etre", "ergonomie", "pause-spirituelle",
    "amenagement", "mobilite-nomade", "coffrets-thematiques",
  ]);
  // Cas spécial : /shop/<seo-slug> → page catégorie SEO
  // (et non page produit). On évite /boutique/ qui reste mappé sur fiche produit.
  const shopSeoMatch = path.match(/^\/shop\/([^/]+)$/);
  if (shopSeoMatch && SEO_SLUGS.has(shopSeoMatch[1])) {
    Content = <ShopSeoCategory seoSlug={shopSeoMatch[1]} />;
  }
  else if (path === "/boutique" || path === "/boutique/") Content = <Boutique />;
  else if (path === "/boutique/recherche") Content = <BoutiqueSearch />;
  else if (path === "/favoris") Content = <Favorites />;
  else if (path.startsWith("/boutique/")) Content = <BoutiqueProduct />;
  else if (path === "/panier") Content = <Cart />;
  else if (path === "/checkout") Content = <Checkout />;
  else if (path === "/contact") Content = <Contact />;
  else if (path === "/a-propos") Content = <Apropos />;
  else if (path === "/faq") Content = <FAQ />;
  else if (path === "/legal/cgv") Content = <CGV />;
  else if (path === "/legal/livraison-retours") Content = <LivraisonRetours />;
  else if (path === "/legal/confidentialite") Content = <Confidentialite />;
  else if (path === "/legal/mentions-legales") Content = <MentionsLegales />;
  else if (path === "/legal/conditions-utilisation") Content = <ConditionsUtilisation />;
  else if (path === "/compte" || path.startsWith("/compte/")) Content = <Account />;
  else if (path === "/blog" || path.startsWith("/blog/")) Content = <Blog />;
  else Content = <Boutique />;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--zayado-cream)" }} data-testid="public-boutique-wrapper">
      {/* Top bar utilitaire (Kiabi style — fin, navy) */}
      <div className="text-white text-xs" style={{ background: NAVY }} data-testid="public-topbar">
        <div className="max-w-[1280px] mx-auto px-4 py-1.5 flex items-center justify-between gap-3">
          <div className="hidden md:flex items-center gap-1.5 opacity-90">
            <Truck size={11} /> <span>Livraison offerte dès 50€ · Retours 30j gratuits</span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <Link to="/faq" className="hover:underline opacity-90">Aide</Link>
            <Link to="/contact" className="hover:underline opacity-90">Contact</Link>
            <Link to="/a-propos" className="hover:underline opacity-90 hidden md:inline">À propos</Link>
            <div className="border-l border-white/20 pl-3 ml-1">
              <LanguageSwitcher variant="dark" />
            </div>
          </div>
        </div>
      </div>

      {/* Header principal (logo + search + icons) */}
      <header className="bg-white border-b border-[var(--zayado-border)] sticky top-0 z-40">
        <div className="max-w-[1280px] mx-auto px-4 py-3 md:py-4 flex items-center justify-between gap-3 md:gap-6">
          {/* Hamburger mobile (style Kiabi) */}
          <button onClick={() => setMobileMenuOpen(true)}
                  className="md:hidden p-2 -ml-2 rounded-full hover:bg-[var(--zayado-cream)]"
                  aria-label="Ouvrir le menu"
                  data-testid="header-mobile-menu">
            <Menu size={22} />
          </button>

          <Link to="/" className="font-display italic text-xl md:text-3xl tracking-tight shrink-0 mx-auto md:mx-0"
                style={{ fontFamily: "var(--font-serif, 'DM Serif Display', serif)", color: NAVY }}
                data-testid="public-shop-logo">
            Zayado
          </Link>

          {/* Search bar large — masquée sur la page /boutique/recherche */}
          {!hideHeaderSearch ? (
            <form onSubmit={onSubmitSearch} className="hidden md:flex flex-1 max-w-[560px] relative" data-testid="header-search-form">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Rechercher un produit, une marque, une catégorie…"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-full bg-[var(--zayado-cream)] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[var(--zayado-navy)]"
                data-testid="header-search"
              />
            </form>
          ) : (
            <div className="hidden md:flex flex-1 max-w-[560px]" />
          )}

          {/* Icons */}
          <nav className="flex items-center gap-1 md:gap-3">
            {!hideHeaderSearch && (
              <Link to="/boutique/recherche" className="md:hidden p-2 rounded-full hover:bg-[var(--zayado-cream)]" aria-label="Rechercher" data-testid="header-search-mobile">
                <Search size={18} />
              </Link>
            )}
            <Link to="/compte" className="flex flex-col items-center text-xs hover:text-[var(--zayado-navy)] transition-colors p-1.5"
                  data-testid="header-account">
              <User size={18} />
              <span className="hidden md:inline text-[10px] mt-0.5">Compte</span>
            </Link>
            <Link to="/favoris" className="relative hidden md:flex flex-col items-center text-xs hover:text-[var(--zayado-navy)] transition-colors p-1.5"
                  data-testid="header-favorites">
              <Heart size={18} />
              <span className="text-[10px] mt-0.5">Favoris</span>
              {favCount > 0 && (
                <span className="absolute top-0 right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                      style={{ background: "var(--zayado-red)" }} data-testid="header-favorites-badge">{favCount}</span>
              )}
            </Link>
            <button onClick={() => window.dispatchEvent(new CustomEvent("zayado:cart-open"))}
                    className="relative flex flex-col items-center text-xs hover:text-[var(--zayado-navy)] transition-colors p-1.5 bg-transparent border-0 cursor-pointer"
                    aria-label="Ouvrir le panier"
                    data-testid="header-cart">
              <ShoppingBag size={18} />
              <span className="hidden md:inline text-[10px] mt-0.5">Panier</span>
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 md:right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                      style={{ background: "var(--zayado-red)" }} data-testid="header-cart-badge">{cartCount}</span>
              )}
            </button>
            <Link to="/login" className="ml-2 px-4 py-2 rounded-full text-white text-sm font-medium hidden md:inline-block"
                  style={{ background: NAVY }} data-testid="public-shop-login">
              SaaS
            </Link>
          </nav>
        </div>

        {/* Mobile search expanded */}
        {searchOpen && (
          <div className="md:hidden px-4 pb-3 border-t border-[var(--zayado-border)]">
            <form onSubmit={onSubmitSearch} className="relative">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
              <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Rechercher…"
                     className="w-full pl-10 pr-4 py-2.5 text-sm rounded-full bg-[var(--zayado-cream)] focus:outline-none" />
            </form>
          </div>
        )}

        {/* Nav catégories Kiabi-style — barre en-dessous, navy fond.
            Masquée sur mobile (le drawer hamburger prend le relais). */}
        <nav className="relative border-t border-[var(--zayado-border)] hidden md:block" style={{ background: "white" }} data-testid="public-nav">
          <div className="max-w-[1280px] mx-auto px-4 flex items-center gap-1 overflow-x-auto">
            <Link to="/boutique"
                  className="px-4 py-3 text-sm font-medium whitespace-nowrap hover:bg-[var(--zayado-cream)]"
                  style={{ color: path === "/boutique" ? NAVY : "var(--zayado-text)",
                           borderBottom: path === "/boutique" ? `2px solid ${NAVY}` : "2px solid transparent" }}
                  data-testid="nav-tout">
              Tout voir
            </Link>
            {Object.entries(MEGA_MENU).map(([k, m]) => (
              <button key={k}
                      onMouseEnter={() => setActiveMenu(k)}
                      onClick={() => setActiveMenu(activeMenu === k ? null : k)}
                      className="px-4 py-3 text-sm font-medium whitespace-nowrap hover:bg-[var(--zayado-cream)] inline-flex items-center gap-1"
                      style={{ color: activeMenu === k ? NAVY : "var(--zayado-text)",
                               borderBottom: activeMenu === k ? `2px solid ${NAVY}` : "2px solid transparent" }}
                      data-testid={`nav-${k}`}>
                {m.label}
                <ChevronDown size={12} style={{ transform: activeMenu === k ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
              </button>
            ))}
            <Link to="/blog" className="px-4 py-3 text-sm font-medium whitespace-nowrap hover:bg-[var(--zayado-cream)] ml-auto" style={{ color: "var(--zayado-text)" }}>
              Le journal
            </Link>
            <Link to="/boutique" className="px-4 py-3 text-sm font-bold whitespace-nowrap hover:bg-[var(--zayado-cream)]" style={{ color: "var(--zayado-red)" }}>
              ★ Promos
            </Link>
          </div>

          {/* Mega menu */}
          <MegaMenu active={activeMenu} onClose={() => setActiveMenu(null)} />
        </nav>
      </header>

      {/* ── Drawer mobile (style Kiabi) ───────────────────────────── */}
      {mobileMenuOpen && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/50 z-50 md:hidden"
               onClick={() => { setMobileMenuOpen(false); setMobileSubmenu(null); }}
               data-testid="mobile-menu-overlay" />

          {/* Drawer */}
          <aside className="fixed top-0 left-0 bottom-0 w-[88%] max-w-[380px] bg-white z-50 md:hidden overflow-y-auto shadow-2xl flex flex-col"
                 data-testid="mobile-menu-drawer">
            {/* Header drawer */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--zayado-border)]">
              {mobileSubmenu ? (
                <button onClick={() => setMobileSubmenu(null)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium"
                        style={{ color: NAVY }}
                        data-testid="mobile-menu-back">
                  <ChevronDown size={14} className="rotate-90" />
                  <span>Retour</span>
                </button>
              ) : (
                <div className="font-display italic text-xl" style={{ color: NAVY }}>
                  Zayado
                </div>
              )}
              <button onClick={() => { setMobileMenuOpen(false); setMobileSubmenu(null); }}
                      className="p-1 -mr-1 rounded-full hover:bg-[var(--zayado-cream)]"
                      aria-label="Fermer"
                      data-testid="mobile-menu-close">
                <X size={20} />
              </button>
            </div>

            {/* Niveau 1 — liste catégories principales */}
            {!mobileSubmenu && (
              <div className="flex-1 py-2">
                <Link to="/boutique"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--zayado-border)] font-medium text-base"
                      style={{ color: NAVY }}
                      data-testid="mobile-menu-tout">
                  Tout voir
                  <ChevronRight size={16} style={{ color: MUTED }} />
                </Link>

                {Object.entries(MEGA_MENU).map(([key, m]) => (
                  <button key={key}
                          onClick={() => setMobileSubmenu(key)}
                          className="flex items-center justify-between w-full px-5 py-3.5 border-b border-[var(--zayado-border)] text-base font-medium text-left hover:bg-[var(--zayado-cream)]"
                          style={{ color: NAVY }}
                          data-testid={`mobile-menu-${key}`}>
                    {m.label}
                    <ChevronRight size={16} style={{ color: MUTED }} />
                  </button>
                ))}

                {/* Section secondaire — pages éditoriales */}
                <div className="px-5 pt-5 pb-2 text-[10px] uppercase tracking-[0.25em]" style={{ color: GOLD }}>
                  Découvrir
                </div>
                {[
                  { to: "/blog", label: "Le journal" },
                  { to: "/groupement", label: "Groupement" },
                  { to: "/groupement/mutuelle", label: "Diagnostic mutuelle" },
                  { to: "/partenaires", label: "Nos partenaires" },
                  { to: "/a-propos", label: "À propos" },
                  { to: "/faq", label: "FAQ" },
                  { to: "/contact", label: "Contact" },
                ].map((l) => (
                  <Link key={l.to} to={l.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-5 py-3 border-b border-[var(--zayado-border)] text-sm"
                        style={{ color: "var(--zayado-text)" }}>
                    {l.label}
                  </Link>
                ))}

                {/* Compte & favoris (raccourcis utiles sur mobile) */}
                <div className="px-5 pt-5 pb-2 text-[10px] uppercase tracking-[0.25em]" style={{ color: GOLD }}>
                  Mon espace
                </div>
                <Link to="/compte"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-5 py-3 border-b border-[var(--zayado-border)] text-sm"
                      style={{ color: "var(--zayado-text)" }}>
                  <User size={16} /> Mon compte
                </Link>
                <Link to="/favoris"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-5 py-3 border-b border-[var(--zayado-border)] text-sm"
                      style={{ color: "var(--zayado-text)" }}>
                  <Heart size={16} /> Mes favoris {favCount > 0 && <span className="text-xs opacity-60">({favCount})</span>}
                </Link>

                {/* CTA SaaS */}
                <div className="p-5">
                  <Link to="/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block w-full text-center py-3 rounded-full text-white text-sm font-medium"
                        style={{ background: NAVY }}
                        data-testid="mobile-menu-saas-cta">
                    Accéder à l'application SaaS
                  </Link>
                </div>
              </div>
            )}

            {/* Niveau 2 — sous-menu d'une catégorie */}
            {mobileSubmenu && MEGA_MENU[mobileSubmenu] && (
              <div className="flex-1 overflow-y-auto py-2">
                <div className="px-5 pt-3 pb-2 font-display italic text-2xl" style={{ color: NAVY }}>
                  {MEGA_MENU[mobileSubmenu].label}
                </div>
                <Link to={`/boutique?u=${mobileSubmenu}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block mx-5 mb-4 text-sm font-medium px-4 py-2.5 rounded-full text-center border"
                      style={{ borderColor: NAVY, color: NAVY }}>
                  Voir tout {MEGA_MENU[mobileSubmenu].label.toLowerCase()}
                </Link>

                {MEGA_MENU[mobileSubmenu].columns.map((col) => (
                  <div key={col.title} className="px-5 py-3 border-t border-[var(--zayado-border)]">
                    <div className="text-[11px] uppercase tracking-wider font-bold mb-2.5" style={{ color: GOLD }}>
                      {col.title}
                    </div>
                    <ul className="space-y-2.5">
                      {col.links.map((l) => (
                        <li key={l}>
                          <Link to={`/boutique?u=${mobileSubmenu}`}
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-sm block py-1"
                                style={{ color: "var(--zayado-text)" }}>
                            {l}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </>
      )}

      <main className="flex-1">{Content}</main>

      {/* Cart Drawer global — s'ouvre auto via event zayado:cart-add */}
      <CartDrawer />

      {/* Bandeau cookies RGPD */}
      <CookieBanner />

      {/* Footer (un seul) — dégradé navy TheSustain */}
      <footer className="mt-16 text-white" style={{ background: "var(--zayado-navy-gradient)" }} data-testid="public-shop-footer">
        <div className="max-w-[1280px] mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12">
          <div className="col-span-2">
            <div className="font-display italic text-2xl mb-3" style={{ fontFamily: "var(--font-serif, 'DM Serif Display', serif)" }}>
              Zayado
            </div>
            <p className="text-xs leading-relaxed max-w-xs mb-4 text-white/70">
              L'essentiel pour les entrepreneurs qui construisent leur trajectoire avec <em style={{ color: GOLD, fontStyle: "italic" }}>calme.</em>
            </p>
            <div className="text-[11px] text-white/50">
              Conçu en France · Petites séries · Production locale
            </div>
          </div>
          {[
            { title: "Boutique", links: [["Tout voir","/boutique"],["Corps","/boutique?u=corps"],["Âme","/boutique?u=ame"],["Rituel","/boutique?u=rituel"]] },
            { title: "Service", links: [["Contact","/contact"],["FAQ","/faq"],["Livraison & retours","/legal/livraison-retours"],["Suivi de commande","/contact"]] },
            { title: "Légal", links: [["CGU","/legal/conditions-utilisation"],["CGV","/legal/cgv"],["Mentions légales","/legal/mentions-legales"],["Confidentialité","/legal/confidentialite"]] },
          ].map((col) => (
            <div key={col.title}>
              <div className="text-xs uppercase tracking-wider font-bold mb-4" style={{ color: GOLD }}>{col.title}</div>
              <ul className="space-y-2">
                {col.links.map(([l, href]) => (
                  <li key={l}><Link to={href} className="text-xs hover:text-white text-white/70">{l}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-[1280px] mx-auto px-6 pb-6 border-t border-white/10 pt-5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-white/60">
          <div>© {new Date().getFullYear()} Zayado · Boutique propulsée par WooCommerce</div>
          <div className="flex items-center gap-3">
            <span>Paiement sécurisé</span>
            <span>·</span>
            <span>CB · Apple Pay · PayPal</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
