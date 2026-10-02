import React, { useState } from "react";
import {
  Sun, Compass, Radar, Bot, Heart, Activity, ArrowUpRight, ShieldCheck, Sparkles, X,
} from "lucide-react";
import { BRAND, FEATURES } from "../mock";
import ModulePreview from "./ModulePreview";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "./ui/dialog";

const ICONS = { Sun, Compass, Radar, Bot, Heart, Activity };

const FeatureTile = ({ feature, onClick, index }) => {
  const Icon = ICONS[feature.icon];
  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${0.15 + index * 0.08}s` }}
      className="zy-rise group relative flex flex-col items-start overflow-hidden rounded-[22px] zy-glass p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[var(--zy-gold)]/50 hover:bg-white/[0.11]"
    >
      <span
        className="mb-5 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform duration-300 group-hover:scale-110"
        style={{ background: feature.accent }}
      >
        <Icon className="h-6 w-6 text-white" strokeWidth={2} />
      </span>
      <h3 className="font-display text-xl font-semibold text-offwhite">{feature.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-offwhite/60">{feature.desc}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-gold opacity-0 transition-all duration-300 group-hover:opacity-100">
        Voir l'aperçu <ArrowUpRight className="h-3.5 w-3.5" />
      </span>
    </button>
  );
};

export default function Landing() {
  const [active, setActive] = useState(null);
  const activeFeature = FEATURES.find((f) => f.id === active);
  const ActiveIcon = activeFeature ? ICONS[activeFeature.icon] : null;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-zy-fond text-offwhite">
      {/* Aurora background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 aurora-drift" />
        <div className="absolute inset-0 zy-noise" />
      </div>

      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl zy-gold-grad">
            <Sparkles className="h-4.5 w-4.5 text-navy-900" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">Zayado</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-offwhite/70 md:flex">
          <a href="#modules" className="transition hover:text-gold">Modules</a>
          <a href="#" className="transition hover:text-gold">Offres</a>
          <a href="#" className="transition hover:text-gold">Diagnostic</a>
        </nav>
        <a
          href="#"
          className="rounded-full zy-gold-grad px-5 py-2 text-sm font-semibold text-navy-900 transition hover:brightness-105"
        >
          Je me lance
        </a>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pt-10 text-center sm:pt-16">
        <p className="zy-rise font-display text-[13px] italic uppercase tracking-[0.22em] text-gold">
          {BRAND.eyebrow}
        </p>
        <h1 className="zy-rise mt-5 font-display text-[52px] font-bold leading-[1.05] tracking-tight sm:text-[76px]" style={{ animationDelay: "0.05s" }}>
          {BRAND.title}
        </h1>
        <p className="zy-rise mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-offwhite/65 sm:text-[18px]" style={{ animationDelay: "0.12s" }}>
          {BRAND.subtitle}
        </p>
        <div className="zy-rise mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "0.18s" }}>
          <a href="#modules" className="inline-flex items-center rounded-full zy-gold-grad px-8 py-3.5 text-[15px] font-semibold text-navy-900 shadow-[0_10px_30px_rgba(222,194,163,0.25)] transition hover:brightness-105">
            Explorer le cockpit
          </a>
          <span className="inline-flex items-center gap-2 text-[13.5px] text-offwhite/70">
            <ShieldCheck className="h-4 w-4 text-gold" /> Sans engagement, hébergé en Europe
          </span>
        </div>
      </section>

      {/* Modules grid */}
      <section id="modules" className="mx-auto mt-16 max-w-5xl px-5 sm:mt-24">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FeatureTile key={f.id} feature={f} index={i} onClick={() => setActive(f.id)} />
          ))}
        </div>
      </section>

      {/* Tagline */}
      <section className="mx-auto mt-20 max-w-3xl px-5 text-center sm:mt-28">
        <div className="inline-flex items-center gap-2 rounded-full zy-glass px-5 py-2.5">
          <Sparkles className="h-4 w-4 text-gold" />
          <span className="text-[13px] font-semibold uppercase tracking-[0.18em] text-offwhite/85">
            {BRAND.tagline}
          </span>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto mt-16 max-w-5xl px-5 pb-16 text-center">
        <a
          href="https://app.zayado.net"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[15px] font-medium text-gold underline underline-offset-4 transition hover:brightness-110"
        >
          {BRAND.url}
        </a>
        <p className="mt-3 text-xs text-offwhite/40">
          © {new Date().getFullYear()} Zayado · Le cockpit IA des entrepreneurs apaisés
        </p>
      </footer>

      {/* Preview modal */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="zy-scroll max-h-[88vh] overflow-y-auto border-white/15 bg-[#0b1430]/95 p-0 text-offwhite backdrop-blur-2xl sm:max-w-lg">
          {activeFeature && (
            <>
              <DialogHeader className="sticky top-0 z-10 border-b border-white/10 bg-[#0b1430]/95 px-6 py-5 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full"
                    style={{ background: activeFeature.accent }}
                  >
                    {ActiveIcon && <ActiveIcon className="h-5.5 w-5.5 text-white" />}
                  </span>
                  <div className="text-left">
                    <DialogTitle className="font-display text-xl font-semibold text-offwhite">
                      {activeFeature.title}
                    </DialogTitle>
                    <p className="text-xs text-offwhite/55">{activeFeature.desc}</p>
                  </div>
                </div>
              </DialogHeader>
              <div className="px-6 py-6">
                <ModulePreview feature={activeFeature} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
