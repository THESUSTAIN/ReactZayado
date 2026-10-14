import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Logo, Social } from "../components/Brand";
import { LINKS, PRODUCTS, SOCIALS, HERO_IMAGE } from "../data/content";

const toneMap = {
  cream: "bg-cream-deep text-navy",
  terracotta: "bg-terracotta text-cream",
};

const LinkCard = ({ link, index, onClick }) => {
  const Icon = link.icon;
  return (
    <motion.button
      type="button"
      data-testid={`link-card-${link.slug}`}
      onClick={onClick}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group relative w-full text-left bg-card rounded-[1.4rem] shadow-[0_8px_24px_-14px_rgba(31,58,99,0.35)] ring-1 ring-black/5 overflow-hidden hover:-translate-y-1 hover:shadow-[0_18px_40px_-16px_rgba(31,58,99,0.45)] transition-[transform,box-shadow] duration-300"
    >
      <div className="flex items-stretch">
        <div className="flex items-center pl-4 pr-3 py-4">
          <span className={`grid place-items-center h-12 w-12 rounded-full ${toneMap[link.tone]} shadow-inner shrink-0`}>
            <Icon className="h-6 w-6" strokeWidth={1.8} />
          </span>
        </div>
        <div className="flex-1 py-4 pr-2 min-w-0">
          <h3 className="font-serif text-navy text-lg sm:text-xl font-semibold leading-tight">
            {link.title}
          </h3>
          <p className="text-muted-foreground text-sm mt-0.5 pr-2 leading-snug">
            {link.desc}
          </p>
        </div>
        <div className="relative w-24 sm:w-32 shrink-0 overflow-hidden">
          <img
            src={link.image}
            alt={link.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-card/10 to-card" />
        </div>
      </div>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center h-9 w-9 rounded-full bg-white shadow-md text-navy group-hover:bg-navy group-hover:text-cream transition-colors duration-300">
        <ChevronRight className="h-5 w-5" strokeWidth={2.4} />
      </span>
    </motion.button>
  );
};

const ProductCard = ({ product, index, onClick }) => (
  <motion.button
    type="button"
    data-testid={`product-card-${product.id}`}
    onClick={onClick}
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.05 * index, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    className="group text-left bg-card rounded-[1.3rem] overflow-hidden ring-1 ring-black/5 shadow-[0_8px_24px_-16px_rgba(31,58,99,0.35)] hover:-translate-y-1 hover:shadow-[0_18px_36px_-18px_rgba(31,58,99,0.45)] transition-[transform,box-shadow] duration-300"
  >
    <div className="aspect-[4/3] overflow-hidden">
      <img src={product.image} alt={product.name} loading="lazy"
        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
    </div>
    <div className="p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-serif text-navy text-base sm:text-lg font-semibold leading-tight">{product.name}</h3>
        <span className="font-serif text-terracotta font-semibold whitespace-nowrap">{product.price}</span>
      </div>
      <p className="text-muted-foreground text-sm mt-1 leading-snug line-clamp-2">{product.desc}</p>
    </div>
  </motion.button>
);

export default function Home() {
  const [tab, setTab] = useState("liens");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen grain-bg bg-background">
      <div className="mx-auto w-full max-w-xl px-4 pb-16">
        {/* Hero */}
        <header className="relative -mx-4 overflow-hidden">
          <div className="absolute inset-0">
            <img src={HERO_IMAGE} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-cream/70 backdrop-blur-[1px]" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
          </div>
          <div className="relative pt-12 pb-8 px-4 flex flex-col items-center text-center">
            <Logo />
            <p className="font-serif italic text-navy/90 text-lg sm:text-xl mt-3 leading-snug max-w-xs">
              Entreprendre avec sens,<br />clarté financière et équilibre
            </p>
            <div className="h-px w-16 bg-gold my-4" />
            <div className="flex items-center gap-6 text-terracotta">
              {SOCIALS.map((s) => (
                <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                  data-testid={`social-${s.icon}`} aria-label={s.name}
                  className="hover:scale-110 hover:text-navy transition-[transform,color] duration-300">
                  <Social type={s.icon} className="h-6 w-6" />
                </a>
              ))}
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="relative z-10 -mt-2 flex justify-center">
          <div className="inline-flex items-center bg-white rounded-full p-1.5 shadow-[0_10px_30px_-12px_rgba(31,58,99,0.4)] ring-1 ring-black/5">
            <button data-testid="tab-liens" onClick={() => setTab("liens")}
              className={`px-7 sm:px-9 py-2.5 rounded-full font-serif text-base sm:text-lg font-semibold transition-colors duration-300 ${tab === "liens" ? "bg-navy text-cream" : "text-navy/70 hover:text-navy"}`}>
              Liens
            </button>
            <button data-testid="tab-boutique" onClick={() => setTab("boutique")}
              className={`px-7 sm:px-9 py-2.5 rounded-full font-serif text-base sm:text-lg font-semibold transition-colors duration-300 ${tab === "boutique" ? "bg-terracotta text-cream" : "text-terracotta/80 hover:text-terracotta"}`}>
              Boutique
            </button>
          </div>
        </div>

        {/* Content */}
        <main className="mt-7">
          {tab === "liens" ? (
            <div className="space-y-4" data-testid="links-list">
              {LINKS.map((link, i) => (
                <LinkCard key={link.slug} link={link} index={i}
                  onClick={() => (link.isShop ? setTab("boutique") : navigate(`/${link.slug}`))} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4" data-testid="shop-grid">
              {PRODUCTS.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i}
                  onClick={() => navigate(`/boutique/${p.id}`)} />
              ))}
            </div>
          )}
        </main>

        {/* Footer signature */}
        <footer className="mt-12 text-center">
          <div className="mx-auto h-px w-10 bg-gold mb-4" />
          <p className="font-script text-terracotta text-2xl sm:text-3xl" data-testid="footer-signature">
            Réconcilier sens, travail et bien-être
          </p>
        </footer>
      </div>
    </div>
  );
}
