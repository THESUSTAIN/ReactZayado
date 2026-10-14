import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, Gauge, Gift, Globe, Heart, HelpCircle, Instagram, Linkedin, Menu, Search, ShoppingBag, Star, Truck, User, X } from "lucide-react";
import { LogoFull, LogoWordmark } from "./Logo";
import { IMG } from "@/data/images";
import { COLLECTIONS, MARKET_ITEMS, collectionDe, estPromo } from "@/data/catalogue";
import { useCart, useFav } from "@/context/CartContext";

const APP_URL = process.env.REACT_APP_APP_URL || "https://app.zayado.net";

const slug = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

const LIENS_DROITE = [
  { to: "/journal", label: "Le journal" },
  { to: "/services", label: "Services Pro" },
  { to: "/services", label: "Partenaires" },
];

const COLLECTION_DESC = {
  corps: "Ce qui soutient l'effort : le dos, l'énergie, la récupération.",
  ame: "Ce qui clarifie la tête : focus, calme, cap.",
  rituel: "Ce qui rythme les journées : box, carnets, pauses qui reprennent.",
};

export default function Nav() {
  const [mega, setMega] = useState(null); // clé de collection | null
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const closeTimer = useRef(null);
  const { count } = useCart();
  const { count: favCount } = useFav();

  useEffect(() => {
    setDrawer(false);
    setMega(null);
  }, [pathname]);

  useEffect(() => {
    if (drawer) {
      window.__lenis ? window.__lenis.stop() : null;
      document.body.style.overflow = "hidden";
    } else {
      window.__lenis ? window.__lenis.start() : null;
      document.body.style.overflow = "";
    }
    return () => {
      window.__lenis ? window.__lenis.start() : null;
      document.body.style.overflow = "";
    };
  }, [drawer]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const openMega = (key) => {
    clearTimeout(closeTimer.current);
    setMega(key);
  };
  const scheduleClose = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMega(null), 180);
  };

  const search = (e) => {
    e.preventDefault();
    navigate(`/marketplace${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
    setDrawer(false);
  };

  const IconBtn = ({ to, icon: Icon, label, badge, testid, hideMobile = false }) => (
    <Link to={to} data-testid={testid} className={`group relative flex-col items-center gap-0.5 px-2 text-[var(--navy)] ${hideMobile ? "hidden sm:flex" : "flex"}`}>
      <span className="relative rounded-full p-1.5 transition-colors group-hover:bg-[var(--paper-2)]">
        <Icon size={19} />
        {badge > 0 && (
          <span data-testid={`${testid}-badge`} className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9.5px] font-bold text-white" style={{ background: "#C0392B" }}>
            {badge}
          </span>
        )}
      </span>
      <span className="text-[10.5px] font-medium opacity-75">{label}</span>
    </Link>
  );

  const megaItems = (key) => MARKET_ITEMS.filter((i) => collectionDe(i) === key).slice(0, 3);

  return (
    <>
    <header className="sticky top-0 z-50" data-testid="nav-header">
      {/* BARRE 1 — navy : paysage, promo, réseaux */}
      <div className="bg-navy-grad hidden text-[var(--paper-2)] sm:block" style={{ fontSize: 12 }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-2">
          <p className="flex items-center gap-1.5 opacity-80"><Globe size={13} /> France · EUR</p>
          <p className="flex items-center gap-1.5 font-semibold tracking-wide"><Truck size={13} style={{ color: "var(--gold-soft)" }} /> LIVRAISON EXPRESS OFFERTE DÈS 120€</p>
          <div className="flex items-center gap-3 opacity-80">
            <a href="https://www.instagram.com/zayado/" aria-label="Instagram" className="hover:opacity-70"><Instagram size={14} /></a>
            <a href="https://www.linkedin.com/company/zayado/" aria-label="LinkedIn" className="hover:opacity-70"><Linkedin size={14} /></a>
          </div>
        </div>
      </div>

      {/* BARRE 2 — logo, recherche, compte/favoris/panier, besoin */}
      <div className="border-b backdrop-blur-md" style={{ background: "rgba(253,252,248,0.95)", borderColor: "var(--line)" }}>
        <div className="mx-auto flex max-w-6xl items-center gap-5 px-5 py-3">
          <button className="rounded-full border p-2.5 md:hidden" style={{ borderColor: "var(--line)", color: "var(--navy)" }} onClick={() => setDrawer(true)} data-testid="nav-menu-button" aria-label="Menu">
            <Menu size={19} />
          </button>
          <Link to="/" data-testid="nav-logo" aria-label="Zayado — accueil" className="flex-none">
            <LogoFull />
          </Link>

          <form onSubmit={search} className="hidden flex-1 justify-center md:flex" data-testid="header-search-form">
            <div className="relative w-full max-w-xl">
              <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 opacity-50" style={{ color: "var(--ink)" }} />
              <input
                className="field" style={{ borderRadius: 999, paddingLeft: 46, paddingTop: 12, paddingBottom: 12, fontSize: 14.5 }}
                placeholder="Rechercher un produit, une catégorie, un besoin…"
                value={q} onChange={(e) => setQ(e.target.value)} data-testid="header-search-input"
              />
            </div>
          </form>

          <div className="flex flex-1 items-center justify-end gap-1 md:flex-none">
            <IconBtn to="/cockpit" icon={Gauge} label="Cockpit" testid="nav-cockpit" hideMobile />
            <a href={`${APP_URL}/compte`} data-testid="nav-compte" className="group hidden flex-col items-center gap-0.5 px-2 text-[var(--navy)] sm:flex">
              <span className="rounded-full p-1.5 transition-colors group-hover:bg-[var(--paper-2)]"><User size={19} /></span>
              <span className="text-[10.5px] font-medium opacity-75">Compte</span>
            </a>
            <IconBtn to="/favoris" icon={Heart} label="Favoris" badge={favCount} testid="nav-favoris" hideMobile />
            <IconBtn to="/panier" icon={ShoppingBag} label="Panier" badge={count} testid="nav-cart" />
            <Link to="/besoins" data-testid="nav-besoin-cta" className="btn btn-gold ml-2 hidden items-center gap-2 px-5 py-3 text-[13.5px] lg:inline-flex">
              <HelpCircle size={15} /> Quel est mon besoin&nbsp;?
            </Link>
          </div>
        </div>
      </div>

      {/* BARRE 3 — catalogues + liens éditoriaux */}
      <div className="hidden border-b backdrop-blur-md md:block" style={{ background: "rgba(253,252,248,0.95)", borderColor: "var(--line)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-2.5">
          <nav className="flex items-center gap-7" data-testid="nav-catalog-row">
            <Link to="/marketplace" data-testid="nav-cat-all" className="text-[14.5px] font-semibold" style={{ color: pathname === "/marketplace" ? "var(--gold)" : "var(--ink)" }}>
              Tout voir
            </Link>
            {COLLECTIONS.map((c) => (
              <div key={c.key} onMouseEnter={() => openMega(c.key)} onMouseLeave={scheduleClose} className="relative">
                <Link
                  to={`/marketplace?collection=${c.key}`}
                  data-testid={`nav-cat-${c.key}`}
                  className="inline-flex items-center gap-1.5 text-[14.5px] font-medium transition-colors"
                  style={{ color: mega === c.key ? "var(--gold)" : "var(--ink)" }}
                >
                  {c.label}
                  <motion.span animate={{ rotate: mega === c.key ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={14} />
                  </motion.span>
                </Link>
              </div>
            ))}
            <Link to="/marketplace?collection=promos" data-testid="nav-cat-promos" className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold" style={{ color: "var(--gold)" }}>
              <Star size={14} fill="currentColor" /> Promos
            </Link>
          </nav>
          <nav className="flex items-center gap-7">
            {LIENS_DROITE.map((l) => (
              <Link key={l.label} to={l.to} data-testid={`nav-right-${slug(l.label)}`} className="text-[14px] font-medium opacity-80 transition-opacity hover:opacity-100">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* MÉGA-MENU de collection — rayons réels uniquement */}
        <AnimatePresence>
          {mega && COLLECTIONS.some((c) => c.key === mega) && (
            <motion.div
              key={mega}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-x-0 top-full border-b shadow-[0_30px_60px_-30px_rgba(13,31,56,0.35)]"
              style={{ background: "var(--paper)", borderColor: "var(--line)" }}
              onMouseEnter={() => openMega(mega)}
              onMouseLeave={scheduleClose}
              data-testid="nav-megamenu"
            >
              <div className="mx-auto grid max-w-6xl gap-10 px-5 py-8 lg:grid-cols-[0.9fr_1.4fr]">
                <div>
                  <p className="font-display text-2xl font-semibold text-[var(--navy)]">{COLLECTIONS.find((c) => c.key === mega)?.label}</p>
                  <p className="mt-2 text-[14px] leading-relaxed opacity-65">{COLLECTION_DESC[mega]}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {MARKET_ITEMS.filter((i) => collectionDe(i) === mega).map((i) => i.besoin).filter((b, k, arr) => arr.indexOf(b) === k).map((b) => (
                      <Link key={b} to={`/marketplace?collection=${mega}&besoin=${encodeURIComponent(b)}`} data-testid={`mega-besoin-${slug(b)}`} className="rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors" style={{ borderColor: "var(--line)", background: "var(--paper-2)", color: "var(--ink)" }}>
                        {b}
                      </Link>
                    ))}
                  </div>
                  <Link to={`/marketplace?collection=${mega}`} data-testid={`mega-all-${mega}`} className="btn btn-ghost mt-5 px-5 py-2.5 text-[13px]">
                    Tout {COLLECTIONS.find((c) => c.key === mega)?.label.toLowerCase()} <ArrowRight size={14} />
                  </Link>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {megaItems(mega).map((i) => (
                    <Link key={i.id} to={`/fiche/${i.id}`} data-testid={`mega-item-${i.id}`} className="card group overflow-hidden p-0 transition-shadow hover:shadow-[0_24px_50px_-30px_rgba(13,31,56,0.4)]">
                      <img src={IMG[i.img]} alt={i.nom} className="h-28 w-full object-cover" />
                      <div className="flex flex-col p-4">
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--gold)" }}>{i.besoin}</p>
                        <p className="mt-1.5 text-[14.5px] font-semibold leading-snug text-[var(--navy)]">{i.nom}</p>
                        <p className="font-display mt-2 text-[16px] font-extrabold text-[var(--navy)]">{i.prixLabel}</p>
                        <p className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold opacity-60 transition-opacity group-hover:opacity-100">
                          Voir la fiche <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>

    {/* TIROIR MOBILE */}
    <AnimatePresence>
      {drawer && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[70]" style={{ background: "rgba(13,31,56,0.45)", backdropFilter: "blur(2px)" }}
            onClick={() => setDrawer(false)} data-testid="nav-drawer-overlay"
          />
          <motion.aside
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-0 top-0 z-[71] h-full w-[min(420px,94vw)] overflow-y-auto px-6 py-6" style={{ background: "var(--paper)" }}
            data-testid="nav-drawer"
          >
            <div className="flex items-center justify-between">
              <Link to="/" data-testid="nav-drawer-logo" aria-label="Zayado"><LogoWordmark /></Link>
              <button onClick={() => setDrawer(false)} data-testid="nav-drawer-close" aria-label="Fermer le menu" className="rounded-full border p-2.5" style={{ borderColor: "var(--line)", color: "var(--navy)" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={search} className="mt-6" data-testid="header-search-form">
              <div className="relative w-full">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" style={{ color: "var(--ink)" }} />
                <input className="field" style={{ borderRadius: 999, paddingLeft: 42, paddingTop: 10, paddingBottom: 10, fontSize: 14 }} placeholder="Rechercher un produit, un besoin…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="header-search-input" />
              </div>
            </form>

            <Link to="/besoins" data-testid="drawer-link-besoin" className="btn btn-gold mt-5 flex items-center justify-center gap-2 px-5 py-3.5 text-[15px]">
              <HelpCircle size={16} /> Quel est mon besoin ?
            </Link>

            <nav className="mt-7 space-y-6 pb-10">
              <div data-testid="drawer-section-catalogues">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-45">Catalogues</p>
                <div className="mt-3 space-y-2.5">
                  <Link to="/marketplace" data-testid="drawer-link-tout-voir" className="block text-[18px] font-semibold text-[var(--navy)]">Tout voir</Link>
                  {COLLECTIONS.map((c) => (
                    <Link key={c.key} to={`/marketplace?collection=${c.key}`} data-testid={`drawer-cat-${c.key}`} className="block text-[18px] font-semibold text-[var(--navy)]">{c.label}</Link>
                  ))}
                  <Link to="/marketplace?collection=promos" data-testid="drawer-cat-promos" className="block text-[18px] font-semibold" style={{ color: "var(--gold)" }}>★ Promos</Link>
                </div>
              </div>

              <div className="h-px" style={{ background: "var(--line)" }} />

              <div className="space-y-2.5">
                <Link to="/journal" data-testid="drawer-link-journal" className="block text-[18px] font-semibold text-[var(--navy)]">Le journal</Link>
                <Link to="/services" data-testid="drawer-link-services" className="block text-[18px] font-semibold text-[var(--navy)]">Services Pro</Link>
                <Link to="/services" data-testid="drawer-link-partenaires" className="block text-[18px] font-semibold text-[var(--navy)]">Partenaires</Link>
                <Link to="/cockpit" data-testid="drawer-link-cockpit" className="block text-[18px] font-semibold text-[var(--navy)]">Le Cockpit — l'application</Link>
                <Link to="/maison" data-testid="drawer-link-maison" className="block text-[18px] font-semibold text-[var(--navy)]">La Maison</Link>
              </div>

              <div className="h-px" style={{ background: "var(--line)" }} />

              <a href={`${APP_URL}/compte`} data-testid="drawer-link-compte" className="btn btn-primary flex items-center justify-center gap-2 px-6 py-3.5 text-[15px]">
                <User size={16} /> Mon compte — ouvrir l'appli
              </a>
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
