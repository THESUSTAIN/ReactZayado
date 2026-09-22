import React from "react";
import { Globe } from "lucide-react";
import { useI18n, LANGS } from "@/i18n";

/**
 * Sélecteur FR/EN.
 * variant="pill"  → segmenté FR | EN (landing, header)
 * variant="icon"  → bouton unique qui bascule (rails étroits, mobile)
 */
export function LanguageSwitcher({ variant = "pill", className = "" }) {
  const { lang, setLang, toggleLang } = useI18n();

  if (variant === "icon") {
    return (
      <button
        onClick={toggleLang}
        data-testid="lang-switcher-icon"
        title={lang === "fr" ? "Switch to English" : "Passer en français"}
        className={`flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 text-[11px] font-bold uppercase tracking-wider text-offwhite/75 transition hover:bg-white/10 hover:text-gold ${className}`}
      >
        <Globe size={14} />
        {lang.toUpperCase()}
      </button>
    );
  }

  return (
    <div
      data-testid="lang-switcher"
      className={`inline-flex items-center rounded-lg border border-white/15 bg-white/5 p-0.5 ${className}`}
    >
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          data-testid={`lang-${l.code}`}
          aria-pressed={lang === l.code}
          title={l.label}
          className={`rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
            lang === l.code
              ? "bg-[#DEC2A3] text-[#0B1F3A]"
              : "text-white/60 hover:text-white"
          }`}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;
