/* Landing Zayado — refonte complète avec SEO + design unifié palette navy/or
   Structure :
   1. SEO Head (title, meta, Open Graph, Twitter Cards, JSON-LD)
   2. Hero "Entreprendre, sans rester seul" + 2 CTAs (Boutique + App)
   3. Trust strip 4 valeurs (Calme / Lucidité / Trajectoire / Durabilité)
   4. Section TROIS UNIVERS (Groupement / Boutique / App SaaS) — colonnes équilibrées
   5. Section Tools "Notre écosystème" — défilement animé infini (Microsoft, Google, Brevo…)
   6. Méthode "Quatre étapes" (gardée de l'ancienne version, repolie)
   7. Testimonials nominatifs
   8. CTA final + footer hérité du wrapper public
*/
import React from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { SAAS_URL } from "@/lib/api";
import { useMarketingStats } from "@/hooks/useMarketingStats";
import {
  ArrowRight, ShoppingBag, Sparkles, Users, Compass, Leaf,
  Heart, Check, Mail, Quote, Menu, X, ChevronDown,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/legacy/_stubs";
import CookieBanner from "@/components/CookieBanner";

const NAVY = "var(--zayado-navy)";
const NAVY_GRAD = "var(--zayado-navy-gradient)";
const GOLD = "var(--zayado-gold)";
const GOLD_SOFT = "var(--zayado-gold-soft)";
const MUTED = "var(--zayado-muted)";

const SITE_URL = "https://zayado.net";

// ── SEO Head ──────────────────────────────────────────────────────────────
function SEOHead() {
  const title = "ZAYADO | Entreprendre avec sens, clarté et stabilité";
  const description =
    "ZAYADO, le hub des entrepreneurs : MyExtension AI, votre copilote IA qui transforme votre vision en actions quotidiennes, associé à un accompagnement humain axé performance, intégrité et respect. Pilotez votre activité sans vous épuiser.";
  const ogImg = `${SITE_URL}/og-cover.jpg`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "name": "Zayado",
        "url": SITE_URL,
        "logo": `${SITE_URL}/icons/icon.svg`,
        "description": description,
        "founder": { "@type": "Person", "name": "Zayado" },
        "sameAs": [],
        "contactPoint": { "@type": "ContactPoint", "email": "contact@zayado.net", "contactType": "customer service", "availableLanguage": "French" }
      },
      {
        "@type": "WebSite",
        "url": SITE_URL,
        "name": "Zayado",
        "publisher": { "@id": SITE_URL },
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${SITE_URL}/boutique?q={search_term}`,
          "query-input": "required name=search_term"
        }
      },
      {
        "@type": "Store",
        "name": "Boutique Zayado",
        "url": `${SITE_URL}/boutique`,
        "image": ogImg,
        "description": "Boutique d'objets pour le bien-être des entrepreneurs : lunettes anti-lumière bleue, huiles essentielles, bougies, méditation."
      }
    ]
  };

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content="entrepreneur, bien-être au travail, productivité, méditation, ergonomie bureau, SaaS entrepreneur, Zayado, boutique entrepreneur" />
      <link rel="canonical" href={SITE_URL + "/"} />
      <meta name="robots" content="index, follow, max-image-preview:large" />
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={SITE_URL + "/"} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImg} />
      <meta property="og:locale" content="fr_FR" />
      <meta property="og:site_name" content="Zayado" />
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImg} />
      {/* JSON-LD */}
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}

// ── Header public unifié avec mega-menus hover (style app-main) ─────────────
function PublicHeader() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [openMenu, setOpenMenu] = React.useState(null); // 'services' | 'simulateurs' | 'ressources' | null
  let cartCount = 0;
  try { cartCount = (JSON.parse(localStorage.getItem("zay_cart") || "[]")).reduce((s, it) => s + it.quantity, 0); } catch { /* ignore */ }

  // Hover-based mega-menu (delay close to avoid flicker between trigger ↔ panel)
  const closeTimer = React.useRef(null);
  const openMega = (key) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMenu(key);
  };
  const closeMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 120);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[var(--zayado-border)]" data-testid="landing-header">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-4">
        <Link to="/" className="font-display italic text-2xl md:text-3xl tracking-tight shrink-0"
              style={{ fontFamily: "var(--font-serif, 'DM Serif Display', serif)", color: NAVY }}>
          Zayado
        </Link>

        {/* Desktop nav with hover mega-menus */}
        <nav className="hidden lg:flex items-center gap-5 text-sm">
          <Link to="/" className="hover:opacity-70 font-medium" style={{ color: NAVY }} data-testid="header-accueil">
            Accueil
          </Link>
          <Link to="/boutique" className="hover:opacity-70 font-medium" style={{ color: NAVY }} data-testid="header-boutique">
            Boutique
          </Link>
          <Link to="/myextension-ai" className="hover:opacity-70 font-medium" style={{ color: NAVY }} data-testid="header-extension-ai">
            MyExtension AI
          </Link>

          {/* Mega menu — Nos services */}
          <div className="relative" onMouseEnter={() => openMega("services")} onMouseLeave={closeMega}>
            <button type="button" className="flex items-center gap-1 hover:opacity-70 font-medium py-2" style={{ color: NAVY }} data-testid="header-mega-services">
              Nos services
              <ChevronDown size={14} style={{ transform: openMenu === "services" ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
            {openMenu === "services" && (
              <MegaPanel testid="mega-services" width={760}>
                <div className="grid grid-cols-2 gap-6 p-6">
                  <MegaColumn title="Services">
                    <MegaItem to="/creation-entreprise" testid="mega-creation"
                      label="Création d'entreprise · 1 €" sub="SASU / EURL / MICRO / BIC LMNP-LMP" iconColor="navy" />
                    <MegaItem to="/valider-son-projet" testid="mega-valider"
                      label="Valider son projet" sub="Business model, étude marché" iconColor="navy" />
                    <MegaItem to="/tester-son-projet" testid="mega-tester"
                      label="Tester son projet" sub="Mom Test, sondages clients" iconColor="navy" />
                    <MegaItem to="/expansion-agent" testid="mega-expansion"
                      label="Expansion Agent" sub="Croissance & leads IA" iconColor="navy" />
                    <MegaItem to="/nos-services" testid="mega-mutualisation"
                      label="Mutualisation" sub="Banque, mutuelle, RC Pro" iconColor="navy" />
                    <MegaItem to="/nos-services" testid="mega-adresse-prestige"
                      label="Adresse de Prestige + DAF" sub="10 Rue de la Paix · Paris 2e + compta" iconColor="navy" />
                  </MegaColumn>
                  <MegaColumn title="Offres & tarifs">
                    <MegaItem to="/tarifs" testid="mega-tarif-start"
                      label="Plan START — 29 €/mo" sub="Bilan création offert" iconColor="gold" badge="Welcome 1 €" />
                    <MegaItem to="/tarifs" testid="mega-tarif-grow"
                      label="Plan GROW — 79 €/mo" sub="Croissance & leads" iconColor="gold" badge="Top" />
                    <MegaItem to="/tarifs" testid="mega-tarif-serenity"
                      label="Plan SERENITY — 149 €/mo" sub="Le 30 % Humain inclus" iconColor="gold" />
                    <MegaItem to="/tarifs" testid="mega-tarif-addons"
                      label="Add-ons à la carte" sub="DAF, Adresse de Prestige, compta…" iconColor="gold" />
                  </MegaColumn>
                </div>
                <MegaFooter>
                  <Link to="/nos-services" data-testid="mega-services-footer-discover" style={{ color: NAVY }} className="text-[13px] font-semibold hover:underline">
                    Découvrir tous nos services →
                  </Link>
                  <Link to="/tarifs" data-testid="mega-services-footer-tarifs"
                    className="px-4 py-1.5 rounded-full font-semibold text-[13px] text-white"
                    style={{ background: NAVY }}>
                    Nos tarifs
                  </Link>
                </MegaFooter>
              </MegaPanel>
            )}
          </div>

          {/* Mega menu — Simulateurs */}
          <div className="relative" onMouseEnter={() => openMega("simulateurs")} onMouseLeave={closeMega}>
            <button type="button" className="flex items-center gap-1 hover:opacity-70 font-medium py-2" style={{ color: NAVY }} data-testid="header-mega-simulateurs">
              Simulateurs
              <ChevronDown size={14} style={{ transform: openMenu === "simulateurs" ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
            {openMenu === "simulateurs" && (
              <MegaPanel testid="mega-simulateurs" width={620}>
                <div className="grid grid-cols-2 gap-6 p-6">
                  <MegaColumn title="Outils gratuits">
                    <MegaItem to="/simulateur-rentabilite" testid="mega-sim-rentab"
                      label="Simulateur de rentabilité" sub="Seuil, marge, point mort" iconColor="navy" />
                    <MegaItem to="/simulateur-statut-juridique" testid="mega-sim-statut"
                      label="Simulateur de statut juridique" sub="SASU, EURL ou Micro ?" iconColor="navy" />
                    <MegaItem to="/analyse-sante-financiere" testid="mega-sim-sante"
                      label="Analyse santé financière" sub="Rentabilité, trésorerie, solvabilité" iconColor="navy" />
                  </MegaColumn>
                  <MegaColumn title="Bénéfices">
                    <MegaBenefit label="100 % gratuit" />
                    <MegaBenefit label="Sans inscription" />
                    <MegaBenefit label="Rapport PDF téléchargeable" />
                    <MegaBenefit label="Résultats en 2-3 minutes" />
                  </MegaColumn>
                </div>
                <MegaFooter>
                  <Link to="/simulateurs" data-testid="mega-simulateurs-footer" style={{ color: NAVY }} className="text-[13px] font-semibold hover:underline">
                    Voir tous les simulateurs →
                  </Link>
                </MegaFooter>
              </MegaPanel>
            )}
          </div>

          {/* Mega menu — Ressources */}
          <div className="relative" onMouseEnter={() => openMega("ressources")} onMouseLeave={closeMega}>
            <button type="button" className="flex items-center gap-1 hover:opacity-70 font-medium py-2" style={{ color: NAVY }} data-testid="header-mega-ressources">
              Ressources
              <ChevronDown size={14} style={{ transform: openMenu === "ressources" ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
            {openMenu === "ressources" && (
              <MegaPanel testid="mega-ressources" width={620}>
                <div className="grid grid-cols-2 gap-6 p-6">
                  <MegaColumn title="Contenus">
                    <MegaItem to="/blog" testid="mega-res-blog" label="Blog" sub="Création, fiscalité, bien-être" iconColor="navy" />
                    <MegaItem to="/faq" testid="mega-res-faq" label="FAQ" sub="Questions fréquentes" iconColor="navy" />
                    <MegaItem to="/vision" testid="mega-res-vision" label="Vision Board" sub="Présentation de l'outil SaaS" iconColor="navy" />
                  </MegaColumn>
                  <MegaColumn title="Preuves & aide">
                    <MegaItem to="/tarifs#comparateur" testid="mega-res-comparateur" label="Comparateur de plans" sub="START / GROW / SERENITY" iconColor="navy" />
                    <MegaItem to="/a-propos" testid="mega-res-apropos" label="À propos" sub="Notre vision & équipe" iconColor="navy" />
                    <MegaItem to="/devenir-partenaire" testid="mega-res-partenaire" label="Devenir partenaire" sub="Rejoindre l'écosystème" iconColor="navy" />
                  </MegaColumn>
                </div>
                <MegaFooter>
                  <Link to="/blog" data-testid="mega-ressources-footer" style={{ color: NAVY }} className="text-[13px] font-semibold hover:underline">
                    Toutes les ressources →
                  </Link>
                </MegaFooter>
              </MegaPanel>
            )}
          </div>

          <Link to="/contact" className="hover:opacity-70 font-medium" style={{ color: NAVY }} data-testid="header-contact">
            Contact
          </Link>
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          <a
            href={SAAS_URL + "/login"}
            className="hidden sm:inline-flex px-4 py-2 rounded-full text-white text-sm font-medium hover:opacity-90 transition"
            style={{ background: "var(--zayado-navy)" }}
            data-testid="header-cta-login"
          >
            Se connecter
          </a>
          <Link to="/panier" className="relative p-2 rounded-full hover:bg-[var(--zayado-cream)]" aria-label="Panier" data-testid="header-panier">
            <ShoppingBag size={18} />
            {cartCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                    style={{ background: "var(--zayado-red)" }}>{cartCount}</span>
            )}
          </Link>
          <LanguageSwitcher variant="light" />
          {/* Mobile menu toggle */}
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden p-2 rounded-full hover:bg-[var(--zayado-cream)]"
            data-testid="header-mobile-toggle"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[var(--zayado-border)] bg-white max-h-[80vh] overflow-y-auto" data-testid="header-mobile-drawer">
          <nav className="max-w-[1280px] mx-auto px-4 py-3 flex flex-col gap-1">
            <Link to="/boutique" onClick={() => setMobileOpen(false)} className="px-2 py-2.5 rounded-md hover:bg-[var(--zayado-cream)] text-[15px] font-medium" style={{ color: NAVY }}>Boutique</Link>
            <Link to="/myextension-ai" onClick={() => setMobileOpen(false)} className="px-2 py-2.5 rounded-md hover:bg-[var(--zayado-cream)] text-[15px] font-medium" style={{ color: NAVY }}>MyExtension AI</Link>
            <div className="px-2 pt-3 pb-1 text-[11px] uppercase tracking-[0.18em] font-semibold opacity-65" style={{ color: NAVY }}>Nos services</div>
            <Link to="/creation-entreprise" onClick={() => setMobileOpen(false)} className="pl-4 py-2 rounded-md hover:bg-[var(--zayado-cream)] text-[14px]" style={{ color: NAVY }}>Création d'entreprise · 1 €</Link>
            <Link to="/valider-son-projet" onClick={() => setMobileOpen(false)} className="pl-4 py-2 rounded-md hover:bg-[var(--zayado-cream)] text-[14px]" style={{ color: NAVY }}>Valider son projet</Link>
            <Link to="/tester-son-projet" onClick={() => setMobileOpen(false)} className="pl-4 py-2 rounded-md hover:bg-[var(--zayado-cream)] text-[14px]" style={{ color: NAVY }}>Tester son projet</Link>
            <Link to="/expansion-agent" onClick={() => setMobileOpen(false)} className="pl-4 py-2 rounded-md hover:bg-[var(--zayado-cream)] text-[14px]" style={{ color: NAVY }}>Expansion Agent</Link>
            <Link to="/nos-services" onClick={() => setMobileOpen(false)} className="pl-4 py-2 rounded-md hover:bg-[var(--zayado-cream)] text-[14px]" style={{ color: NAVY }}>Mutualisation & Adresse de Prestige</Link>
            <Link to="/tarifs" onClick={() => setMobileOpen(false)} className="pl-4 py-2 rounded-md hover:bg-[var(--zayado-cream)] text-[14px] font-semibold" style={{ color: NAVY }}>→ Nos tarifs</Link>
            <div className="px-2 pt-3 pb-1 text-[11px] uppercase tracking-[0.18em] font-semibold opacity-65" style={{ color: NAVY }}>Simulateurs</div>
            <Link to="/simulateurs" onClick={() => setMobileOpen(false)} className="pl-4 py-2 rounded-md hover:bg-[var(--zayado-cream)] text-[14px]" style={{ color: NAVY }}>Tous les simulateurs</Link>
            <Link to="/simulateur-rentabilite" onClick={() => setMobileOpen(false)} className="pl-4 py-2 rounded-md hover:bg-[var(--zayado-cream)] text-[14px]" style={{ color: NAVY }}>Rentabilité</Link>
            <Link to="/simulateur-statut-juridique" onClick={() => setMobileOpen(false)} className="pl-4 py-2 rounded-md hover:bg-[var(--zayado-cream)] text-[14px]" style={{ color: NAVY }}>Statut juridique</Link>
            <Link to="/analyse-sante-financiere" onClick={() => setMobileOpen(false)} className="pl-4 py-2 rounded-md hover:bg-[var(--zayado-cream)] text-[14px]" style={{ color: NAVY }}>Santé financière</Link>
            <div className="px-2 pt-3 pb-1 text-[11px] uppercase tracking-[0.18em] font-semibold opacity-65" style={{ color: NAVY }}>Ressources</div>
            <Link to="/blog" onClick={() => setMobileOpen(false)} className="pl-4 py-2 rounded-md hover:bg-[var(--zayado-cream)] text-[14px]" style={{ color: NAVY }}>Blog</Link>
            <Link to="/faq" onClick={() => setMobileOpen(false)} className="pl-4 py-2 rounded-md hover:bg-[var(--zayado-cream)] text-[14px]" style={{ color: NAVY }}>FAQ</Link>
            <Link to="/tarifs#comparateur" onClick={() => setMobileOpen(false)} className="pl-4 py-2 rounded-md hover:bg-[var(--zayado-cream)] text-[14px]" style={{ color: NAVY }}>Comparateur de plans</Link>
            <Link to="/a-propos" onClick={() => setMobileOpen(false)} className="pl-4 py-2 rounded-md hover:bg-[var(--zayado-cream)] text-[14px]" style={{ color: NAVY }}>À propos</Link>
            <Link to="/devenir-partenaire" onClick={() => setMobileOpen(false)} className="pl-4 py-2 rounded-md hover:bg-[var(--zayado-cream)] text-[14px]" style={{ color: NAVY }}>Devenir partenaire</Link>
            <div className="border-t border-[var(--zayado-border)] my-2" />
            <Link to="/contact" onClick={() => setMobileOpen(false)} className="px-2 py-2.5 rounded-md hover:bg-[var(--zayado-cream)] text-[15px] font-medium" style={{ color: NAVY }}>Contact</Link>
            <a
              href={SAAS_URL + "/login"}
              onClick={() => setMobileOpen(false)}
              className="mt-2 px-4 py-2.5 rounded-full text-white text-sm font-medium text-center"
              style={{ background: "var(--zayado-navy)" }}
              data-testid="header-mobile-drawer-cta-login"
            >
              Se connecter
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

// ─── Mega-menu primitives (style app-main) ────────────────────────────────
function MegaPanel({ children, width = 640, testid }) {
  return (
    <div
      data-testid={testid}
      className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-2xl shadow-xl border border-[var(--zayado-border)] z-50 overflow-hidden"
      style={{ width: `${width}px` }}
    >
      {children}
    </div>
  );
}
function MegaColumn({ title, children }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.2em] font-bold text-gray-400 mb-3 pb-2 border-b border-gray-100">
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
function MegaItem({ to, label, sub, testid, iconColor = "navy", badge }) {
  const isNavy = iconColor !== "gold";
  return (
    <Link
      to={to}
      data-testid={testid}
      className="flex items-start gap-3 px-2.5 py-2 rounded-lg hover:bg-gray-50 transition"
    >
      <span
        className="w-7 h-7 shrink-0 rounded-md grid place-items-center mt-0.5"
        style={{
          background: isNavy
            ? "linear-gradient(135deg, #1F3B73 0%, #2A4D8F 100%)"
            : "rgba(201,166,107,0.10)",
          boxShadow: isNavy ? "0 2px 6px rgba(31, 59, 115, 0.25)" : "none",
        }}
      >
        <span
          className="w-2.5 h-2.5 rounded-sm"
          style={{ background: isNavy ? "#F6F3EE" : "#C9A66B", opacity: 0.9 }}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-gray-900 leading-tight">
          {label}
          {badge && (
            <span className="ml-1.5 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: "#C7372F" }}>
              {badge}
            </span>
          )}
        </div>
        <div className="text-[11.5px] text-gray-500 mt-0.5">{sub}</div>
      </div>
    </Link>
  );
}
function MegaBenefit({ label }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-2 text-[13px] text-gray-700">
      <Check size={14} style={{ color: NAVY }} />
      <span>{label}</span>
    </div>
  );
}
function MegaFooter({ children }) {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/50 gap-3">
      {children}
    </div>
  );
}

// ── HERO ──────────────────────────────────────────────────────────────────
function Hero({ entrepreneurs }) {
  return (
    <section className="relative overflow-hidden" data-testid="landing-hero" style={{ background: NAVY_GRAD }}>
      <div className="absolute inset-0 opacity-10"
           style={{ backgroundImage: "url(https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&w=1800&q=80)", backgroundSize: "cover", backgroundPosition: "center", mixBlendMode: "overlay" }} />
      <div className="relative max-w-[1280px] mx-auto px-4 md:px-6 py-20 md:py-32 text-white">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-[11px] uppercase tracking-[0.25em] mb-6"
               style={{ color: GOLD_SOFT }}>
            <Sparkles size={12} /> La maison des entrepreneurs apaisés
          </div>
          <h1 className="font-display leading-[1.0] mb-6 tracking-tight"
              style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}>
            Entreprendre avec <em style={{ color: GOLD_SOFT, fontStyle: "italic" }}>sens, clarté et stabilité.</em>
          </h1>
          <p className="text-base md:text-xl text-white/85 mb-5 max-w-2xl leading-relaxed">
            ZAYADO est l'alliance unique entre l'extension technologique de votre business par <strong>MyExtension AI (70%)</strong> et
            une <strong>collaboration humaine</strong> axée sur la performance, l'intégrité et le respect <strong>(30%)</strong>.
          </p>
          <p className="text-[15px] text-white/70 mb-6 max-w-2xl leading-relaxed">
            Pilotez votre activité en restant fidèle à vos valeurs profondes — une approche qui fusionne gestion business et équilibre de vie.
          </p>
          <p className="text-[12.5px] text-white/65 mb-9 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Sans engagement</span><span>•</span>
            <span>Données sécurisées en France</span><span>•</span>
            <span>1 200+ entrepreneurs accompagnés</span>
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/boutique"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white text-[var(--zayado-navy)] font-medium text-sm btn-press"
                  data-testid="hero-cta-shop">
              <ShoppingBag size={16} /> Découvrir la boutique
            </Link>
            <a href="https://app.zayado.net/login"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-white/40 text-white font-medium text-sm hover:bg-white/10 btn-press"
                  data-testid="hero-cta-app">
              Essayer l'app gratuitement <ArrowRight size={14} />
            </a>
          </div>
          {/* Trust signals row */}
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-white/70">
            <span className="inline-flex items-center gap-1.5"><Check size={12} style={{ color: GOLD_SOFT }} /> Sans engagement</span>
            <span className="inline-flex items-center gap-1.5"><Check size={12} style={{ color: GOLD_SOFT }} /> RGPD strict · données en France</span>
            <span className="inline-flex items-center gap-1.5"><Check size={12} style={{ color: GOLD_SOFT }} /> {entrepreneurs} entrepreneurs accompagnés</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Valeurs strip ─────────────────────────────────────────────────────────
function ValuesStrip() {
  const values = [
    { icon: Heart, title: "Sens", desc: "On ralentit pour décider juste et intégrer ses principes profonds dans son travail." },
    { icon: Compass, title: "Clarté", desc: "On dit la vérité. Une vision nette, sans filtre, sur ses chiffres et sa charge mentale." },
    { icon: Sparkles, title: "Stabilité", desc: "Pas de hacks éphémères. Des fondations juridiques et financières solides pour durer." },
    { icon: Leaf, title: "Durabilité", desc: "Outils ergonomiques, production locale et respect absolu de l'humain." },
  ];
  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-6 py-16" data-testid="landing-values">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {values.map((v, i) => {
          const I = v.icon;
          return (
            <div key={i} className="p-5 rounded-xl border border-[var(--zayado-border)] bg-white">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 shadow-md"
                   style={{
                     background: "linear-gradient(135deg, #1F3B73 0%, #2A4D8F 100%)",
                     color: "#F6F3EE",
                     boxShadow: "0 4px 12px rgba(31, 59, 115, 0.25)",
                   }}>
                <I size={17} />
              </div>
              <div className="font-display text-lg mb-1" style={{ fontFamily: "var(--font-serif, 'DM Serif Display', serif)", color: "var(--zayado-text)" }}>{v.title}</div>
              <div className="text-sm" style={{ color: MUTED }}>{v.desc}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── 3 Univers (Boutique / App / Groupement) ──────────────────────────────
function ThreeUniverses() {
  const tiles = [
    {
      id: "boutique",
      kicker: "Boutique",
      title: "Le corps, l'âme.",
      desc: "Objets, livres, huiles essentielles, lunettes anti-lumière bleue. Petites séries, production locale.",
      cta: "Découvrir la boutique",
      href: "/boutique",
      img: "https://images.unsplash.com/photo-1545389336-cf090694435e?auto=format&w=800&q=85",
    },
    {
      id: "saas",
      kicker: "L'app",
      title: "Piloter, sereinement.",
      desc: "Validation terrain, roadmap, CRM superfans, énergie & focus, collaborateur IA. L'app qui pense avec vous.",
      cta: "Essayer l'app",
      href: "https://app.zayado.net/login",
      img: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&w=800&q=85",
    },
    {
      id: "groupement",
      kicker: "Groupement",
      title: "Avancer ensemble.",
      desc: "Assurance, juridique, comptable, coworking, marketing. 9 partenaires éco-engagés, tarifs négociés.",
      cta: "Voir les partenaires",
      href: "/groupement",
      img: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&w=800&q=85",
    },
  ];
  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-6 py-16" data-testid="landing-three-universes" id="saas">
      <div className="text-center mb-12">
        <div className="text-[11px] uppercase tracking-[0.3em] mb-2" style={{ color: GOLD }}>Trois territoires, une intention</div>
        <h2 className="font-display italic leading-tight"
            style={{ fontFamily: "var(--font-serif, 'DM Serif Display', serif)",
                     fontSize: "clamp(2rem, 4.5vw, 3rem)", color: "var(--zayado-text)" }}>
          Une maison, <em>pas un outil de plus.</em>
        </h2>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {tiles.map((t) => (
          <Link key={t.id} to={t.href} id={t.id === "groupement" ? "groupement" : undefined}
                className="group relative overflow-hidden rounded-xl aspect-[4/5] block"
                data-testid={`universe-${t.id}`}>
            <img src={t.img} alt={t.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(20,42,71,0.2) 0%, rgba(10,29,53,0.85) 100%)" }} />
            <div className="relative h-full flex flex-col justify-end p-6 md:p-8 text-white">
              <div className="text-[11px] uppercase tracking-[0.3em] mb-2" style={{ color: GOLD_SOFT }}>{t.kicker}</div>
              <h3 className="font-display italic mb-3 leading-tight"
                  style={{ fontFamily: "var(--font-serif, 'DM Serif Display', serif)",
                           fontSize: "clamp(1.5rem, 2.5vw, 2rem)" }}>
                {t.title}
              </h3>
              <p className="text-sm text-white/85 mb-4 leading-relaxed">{t.desc}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                {t.cta} <ArrowRight size={14} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ── Section Outils / Écosystème (marquee animé) ───────────────────────────
function ToolsEcosystem() {
  // SVG inline conforme aux brand-guidelines des fournisseurs
  const tools = [
    { name: "WordPress",     svg: <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11" fill="#21759B"/><text x="12" y="16" textAnchor="middle" fontSize="13" fontWeight="700" fill="white" fontFamily="Arial">W</text></svg> },
    { name: "Stripe",        svg: <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#635BFF"/><path d="M11.14 10.5C11.14 9.83 11.8 9.3 12.5 9.3c1.22 0 2.15.85 2.15.85l1.35-1.5S14.6 7.5 12.5 7.5C10.27 7.5 9 8.8 9 10.5c0 3 4.5 2.5 4.5 4.2 0 .68-.67 1.2-1.5 1.2-1.5 0-2.5-1.2-2.5-1.2L8 16S9.3 17.5 11.5 17.5c2.23 0 3.64-1.3 3.64-3 0-3-4-2.5-4-4z" fill="white"/></svg> },
    { name: "Mollie",        svg: <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="6" fill="#0D6EFD"/><circle cx="9" cy="12" r="2.2" fill="white"/><circle cx="15" cy="12" r="2.2" fill="white"/></svg> },
    { name: "Brevo",         svg: <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="5" fill="#0B996E"/><path d="M5 8h2l2.5 6.5L11.5 8h2l-3 9h-2L5 8zm10 0h4.5v2H17v1.5h2.2v2H17v1.5h2.5v2H15V8z" fill="white"/></svg> },
    { name: "Make",          svg: <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="5" fill="#6D00CC"/><path d="M6 6l4 12L14 6l4 12" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/></svg> },
    { name: "Claude AI",     svg: <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="5" fill="#D97757"/><path d="M8.5 16l3.5-8 3.5 8M9.8 13.5h4.4" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    { name: "Google Drive",  svg: <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.433 21L1 15l5.5-9.5L9.933 11 4.433 21z" fill="#0066DA"/><path d="M12 3l5.5 9.5H1L6.5 3H12z" fill="#00AC47"/><path d="M23 15l-3.433 6H4.433L7.867 15H23z" fill="#EA4335"/></svg> },
    { name: "Microsoft 365", svg: <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="10" height="10" fill="#F25022"/><rect x="13" y="1" width="10" height="10" fill="#7FBA00"/><rect x="1" y="13" width="10" height="10" fill="#00A4EF"/><rect x="13" y="13" width="10" height="10" fill="#FFB900"/></svg> },
    { name: "Google Cal",    svg: <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="18" rx="2" fill="white" stroke="#4285F4" strokeWidth="1.5"/><rect x="2" y="4" width="20" height="4" fill="#4285F4"/><text x="12" y="18" textAnchor="middle" fontSize="9" fontWeight="700" fill="#4285F4" fontFamily="Arial">31</text></svg> },
    { name: "WhatsApp",      svg: <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.07L2 22l5.07-1.35A9.93 9.93 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" fill="#25D366"/><path d="M16.75 14.5c-.25-.12-1.47-.72-1.7-.8-.22-.08-.38-.12-.55.12-.17.25-.63.8-.78.97-.14.17-.28.19-.52.06-.25-.12-1.04-.38-1.98-1.22-.73-.66-1.23-1.47-1.37-1.72-.14-.25-.02-.38.1-.5.12-.12.25-.3.38-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.55-1.32-.75-1.8-.2-.47-.4-.4-.55-.41h-.47c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.44 1.03 2.61c.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.22-.16-.47-.28z" fill="white"/></svg> },
    { name: "Telegram",      svg: <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11" fill="#26A5E4"/><path d="M5.5 11.7l13-4.7-2.5 11-3.5-2.5-1.5 2L11 14l-5.5-2.3z" fill="white"/></svg> },
  ];
  // 2 fois pour boucle infinie
  const row = [...tools, ...tools];
  return (
    <section className="py-16 overflow-hidden border-y border-[var(--zayado-border)]"
             style={{ background: "var(--zayado-cream-dark)" }} data-testid="landing-tools">
      <div className="text-center mb-10 px-4">
        <div className="text-[11px] uppercase tracking-[0.3em] mb-2" style={{ color: GOLD }}>Notre écosystème</div>
        <h2 className="font-display italic leading-tight"
            style={{ fontFamily: "var(--font-serif, 'DM Serif Display', serif)",
                     fontSize: "clamp(1.7rem, 3.5vw, 2.5rem)", color: "var(--zayado-text)" }}>
          Connecté aux outils <em>que vous utilisez déjà.</em>
        </h2>
        <p className="text-sm md:text-base mt-3 max-w-2xl mx-auto" style={{ color: MUTED }}>
          WordPress, Stripe, Mollie, Brevo, Make, Google Drive, Microsoft 365,
          Claude AI… Zayado s'intègre nativement à votre stack. Pas de double saisie, pas de friction.
        </p>
      </div>
      {/* Marquee */}
      <div className="relative">
        <div className="flex gap-8 md:gap-12 animate-marquee whitespace-nowrap items-center">
          {row.map((t, i) => (
            <div key={i} className="flex items-center gap-3 shrink-0 px-4 py-2.5 bg-white rounded-lg shadow-md">
              <span className="w-7 h-7 shrink-0 grid place-items-center" aria-label={t.name}>{t.svg}</span>
              <span className="text-sm font-medium whitespace-nowrap" style={{ color: "var(--zayado-text)" }}>{t.name}</span>
            </div>
          ))}
        </div>
        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-16 md:w-32 pointer-events-none"
             style={{ background: "linear-gradient(90deg, var(--zayado-cream-dark) 0%, transparent 100%)" }} />
        <div className="absolute inset-y-0 right-0 w-16 md:w-32 pointer-events-none"
             style={{ background: "linear-gradient(-90deg, var(--zayado-cream-dark) 0%, transparent 100%)" }} />
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee { animation: marquee 35s linear infinite; will-change: transform; }
        .animate-marquee:hover { animation-play-state: paused; }
      `}</style>
    </section>
  );
}

// ── Groupement (9 catégories) ─────────────────────────────────────────────
function GroupementSection() {
  const cats = [
    "Assurance", "Domiciliation", "Outils SaaS",
    "Téléphonie", "Comptabilité", "Juridique",
    "Coworking", "Impression", "Marketing",
  ];
  return (
    <section id="groupement-list" className="max-w-[1280px] mx-auto px-4 md:px-6 py-16" data-testid="landing-groupement">
      <div className="text-center mb-10">
        <div className="text-[11px] uppercase tracking-[0.3em] mb-2" style={{ color: GOLD }}>Le groupement</div>
        <h2 className="font-display italic"
            style={{ fontFamily: "var(--font-serif, 'DM Serif Display', serif)",
                     fontSize: "clamp(1.7rem, 3.5vw, 2.5rem)", color: "var(--zayado-text)" }}>
          9 partenaires <em>éco-engagés.</em>
        </h2>
        <p className="text-sm md:text-base mt-3 max-w-2xl mx-auto" style={{ color: MUTED }}>
          Tarifs négociés, charte stricte, valeurs alignées. Nos partenaires sont des indépendants
          ou des PME françaises, jamais des géants opaques.
        </p>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-9 gap-2 md:gap-3">
        {cats.map((c, i) => (
          <div key={i} className="text-center px-2 py-4 rounded-lg border border-[var(--zayado-border)] bg-white hover:bg-[var(--zayado-cream)] transition-colors cursor-default"
               data-testid={`groupement-cat-${i}`}>
            <div className="text-xs md:text-sm font-medium" style={{ color: "var(--zayado-text)" }}>{c}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Testimonials (AVIS RÉELS Trustpilot + Google) ───────────────────────────
function Testimonials() {
  const items = [
    {
      quote: "Je dis merci à Cindy et à toute son équipe. Étant entrepreneur, Zayado m'a aidé sur plusieurs plans : création d'entreprise, créations des flyers, structuration des idées. Ils sont vraiment professionnels.",
      name: "Theodora",
      role: "FR · Trustpilot · ★★★★★",
      avatarUrl: "https://api.dicebear.com/9.x/personas/svg?seed=Theodora&backgroundColor=bfe7a3&backgroundType=solid",
      badge: "TRUSTPILOT", badgeColor: "#00b67a",
    },
    {
      quote: "Cindy est extrêmement patiente, réactive et très professionnelle. Sans elle je n'aurais jamais réussi à me former et à prendre confiance. Elle dédramatise les problèmes !",
      name: "Consumer",
      role: "FR · Trustpilot · ★★★★★",
      avatarUrl: "https://api.dicebear.com/9.x/personas/svg?seed=ConsumerFR&backgroundColor=cdb2f3&backgroundType=solid",
      badge: "TRUSTPILOT", badgeColor: "#00b67a",
    },
    {
      quote: "J'ai apprécié le professionnalisme, le support et l'efficacité des équipes de Zayado. Ils m'ont accompagnée du début à la fin avec sérieux et bienveillance.",
      name: "Sara DE JESUS",
      role: "Paris · Google · ★★★★★",
      avatarUrl: "https://api.dicebear.com/9.x/personas/svg?seed=SaraDeJesus&backgroundColor=d4b982&backgroundType=solid",
      badge: "GOOGLE", badgeColor: "#4285F4",
    },
  ];
  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-6 py-16" data-testid="landing-testimonials">
      <div className="text-center mb-10">
        <div className="text-[11px] uppercase tracking-[0.3em] mb-2" style={{ color: GOLD }}>Avis vérifiés · 5.0/5</div>
        <h2 className="font-display italic"
            style={{ fontFamily: "var(--font-serif, 'DM Serif Display', serif)",
                     fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)", color: "var(--zayado-text)" }}>
          Ce qu'en disent <em>nos clients.</em>
        </h2>
      </div>
      <div className="grid md:grid-cols-3 gap-4 md:gap-6">
        {items.map((t, i) => (
          <figure key={i} className="bg-white rounded-xl p-6 md:p-7 shadow-md hover:shadow-xl transition" data-testid={`testimonial-${i}`}>
            <div className="flex items-center justify-between mb-3">
              <Quote size={20} style={{ color: GOLD_SOFT }} />
              <span className="text-[9.5px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full"
                    style={{ background: t.badgeColor, color: "#FFFFFF" }}>
                {t.badge}
              </span>
            </div>
            <blockquote className="text-sm md:text-base leading-relaxed italic mb-4"
                        style={{ color: "var(--zayado-text)", fontFamily: "var(--font-serif, 'DM Serif Display', serif)" }}>
              « {t.quote} »
            </blockquote>
            <figcaption className="flex items-center gap-3 pt-3 border-t border-[var(--zayado-border)]">
              <img src={t.avatarUrl} alt={t.name} loading="lazy"
                   className="w-10 h-10 rounded-full object-cover shrink-0"
                   style={{ background: "var(--zayado-gold-bg)" }} />
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--zayado-text)" }}>{t.name}</div>
                <div className="text-xs" style={{ color: MUTED }}>{t.role}</div>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

// ── CTA final ─────────────────────────────────────────────────────────────
function FinalCTA({ entrepreneurs }) {
  return (
    <section className="text-white relative overflow-hidden" style={{ background: NAVY_GRAD }} data-testid="landing-final-cta">
      <div className="absolute inset-0 opacity-10 mix-blend-overlay"
           style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      <div className="relative max-w-[900px] mx-auto px-4 md:px-6 py-20 md:py-28 text-center">
        <h2 className="font-display italic mb-5 leading-[1.05]"
            style={{ fontFamily: "var(--font-serif, 'DM Serif Display', serif)",
                     fontSize: "clamp(2rem, 5vw, 3.4rem)" }}>
          Prêt·e à construire <em style={{ color: GOLD_SOFT }}>avec calme</em> ?
        </h2>
        <p className="text-base md:text-xl text-white/85 mb-9 max-w-2xl mx-auto">
          {`Rejoignez les ${entrepreneurs} entrepreneurs qui ont choisi de ralentir pour aller plus loin.`}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/boutique" className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-white text-[var(--zayado-navy)] font-medium btn-press">
            <ShoppingBag size={16} /> Visiter la boutique
          </Link>
          <a href="https://app.zayado.net/login" className="inline-flex items-center gap-2 px-7 py-4 rounded-full border border-white/40 font-medium hover:bg-white/10 btn-press">
            <Mail size={16} /> Créer mon compte
          </a>
        </div>
      </div>
    </section>
  );
}

// ── Footer unifié ─────────────────────────────────────────────────────────
function UnifiedFooter() {
  return (
    <footer data-testid="zayado-footer" style={{ background: "#0F2244", color: "#cbd5e1", fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-[1280px] mx-auto px-6 py-14">
        {/* Top grid: brand column + 3 nav columns */}
        <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr_1fr_1fr] gap-10 mb-10">
          {/* Brand column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polygon points="12 2 22 8 22 16 12 22 2 16 2 8" stroke="#F6F3EE" strokeWidth="2" fill="#F6F3EE"/></svg>
              <span className="font-display tracking-tight text-[1.25rem] font-bold" style={{ color: "#F6F3EE" }}>ZAYADO</span>
            </div>
            <p className="text-[0.875rem] leading-relaxed mb-6 max-w-xs" style={{ color: "#94a3b8" }}>
              La maison des entrepreneurs apaisés. Un écosystème d'accompagnement humain bâti sur l'éthique, l'intégrité et la clarté pour avancer ensemble.
            </p>
            <div className="border-t border-white/10 pt-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#C9A66B]">⚡</span>
                <span className="font-display font-bold text-[1.05rem]" style={{ color: "#F6F3EE" }}>MyExtension AI</span>
                <sup className="text-[0.65rem]" style={{ color: "#06b6d4" }}>MC</sup>
              </div>
              <p className="text-[0.8125rem] leading-relaxed max-w-xs" style={{ color: "#94a3b8" }}>
                Le cockpit technologique et intelligent de votre activité. Automatisation des flux, Vision Board et indicateurs de charge mentale.
              </p>
            </div>
          </div>

          <FooterCol title="OFFRE" links={[
            ["Tarifs & Plans","/tarifs"], ["MyExtension AI","/myextension-ai"],
            ["Vision Board","/vision"], ["Expansion Agent","/expansion-agent"],
          ]} />
          <FooterCol title="SERVICES" links={[
            ["ZAYADO Création","/creation-entreprise"], ["Adresse de Prestige","/nos-services"],
            ["DAF & Comptabilité","/nos-services"], ["Simulateurs Gratuits","/simulateurs"],
          ]} />
          <FooterCol title="ENTREPRISE" links={[
            ["À propos","/a-propos"], ["Contact","/contact"],
            ["Partenaires","/partenaires"], ["Devenir partenaire","/devenir-partenaire"],
          ]} />
        </div>

        {/* Tagline strip */}
        <div className="border-t border-white/10 pt-8 pb-6 text-center">
          <p className="font-display text-[1.25rem] sm:text-[1.5rem] mb-3 font-bold leading-snug" style={{ color: "#F6F3EE" }}>
            « Entreprendre avec <em className="italic" style={{ color: "#C9A66B", fontStyle: "italic" }}>sens, clarté et stabilité.</em> »
          </p>
          <p className="text-[0.875rem] max-w-3xl mx-auto leading-relaxed" style={{ color: "#94a3b8" }}>
            ZAYADO est l'alliance unique entre l'extension technologique de votre business par <strong style={{ color: "#cbd5e1" }}>MyExtension AI</strong> (70%) et une <strong style={{ color: "#cbd5e1" }}>collaboration humaine</strong>
            axée sur la performance, l'intégrité et le respect (30%). Pilotez votre activité en restant fidèle à vos valeurs profondes,
            une approche unique qui fusionne gestion business et équilibre de vie.
          </p>
        </div>

        {/* Bottom legal row */}
        <div className="border-t border-white/10 pt-5 flex flex-wrap items-center justify-between gap-3 text-[0.75rem]" style={{ color: "#64748b" }} data-testid="footer-legal">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} ZAYADO. Tous droits réservés. Hébergé de manière sécurisée en Europe.</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link to="/legal/mentions-legales" className="hover:text-white" style={{ color: "#64748b" }}>Mentions légales</Link>
            <span>·</span>
            <Link to="/legal/confidentialite" className="hover:text-white" style={{ color: "#64748b" }}>Politique de Confidentialité</Link>
            <span>·</span>
            <Link to="/legal/cgv" className="hover:text-white" style={{ color: "#64748b" }}>CGV</Link>
            <span>·</span>
            <Link to="/legal/conditions-utilisation" className="hover:text-white" style={{ color: "#64748b" }}>CGU</Link>
          </div>
        </div>

        {/* Trust badges row */}
        <div className="border-t border-white/10 mt-5 pt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[0.75rem]" style={{ color: "#64748b" }}>
          <span>Hébergement EU RGPD</span><span>•</span>
          <span>Co-pilote 24/7</span><span>•</span>
          <span>Brevo intégré</span><span>•</span>
          <span>Mollie sécurisé</span><span>•</span>
          <span>RGPD France</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 className="text-[0.75rem] uppercase tracking-[0.15em] font-bold mb-4" style={{ color: "#F6F3EE" }}>{title}</h4>
      <ul className="space-y-3">
        {links.map(([l, href]) => (
          <li key={l}><Link to={href} className="text-[0.875rem] hover:text-white transition" style={{ color: "#94a3b8" }}>{l}</Link></li>
        ))}
      </ul>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────
export { PublicHeader, UnifiedFooter };

export default function Landing() {
  const stats = useMarketingStats();
  const entrepreneurs = stats?.entrepreneurs_count
    ? `${stats.entrepreneurs_count.toLocaleString("fr-FR")}+`
    : "1 200+";
  const partners = stats?.partners_count
    ? `${stats.partners_count}+`
    : "120+";
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--zayado-cream)" }} data-testid="landing-page">
      <SEOHead />
      <PublicHeader />
      <main className="flex-1">
        <Hero entrepreneurs={entrepreneurs} />
        <ValuesStrip />
        <ThreeUniverses />
        <ToolsEcosystem />
        <GroupementSection />
        <Testimonials />
        <FinalCTA entrepreneurs={entrepreneurs} />
      </main>
      <UnifiedFooter />
      <CookieBanner />
    </div>
  );
}
