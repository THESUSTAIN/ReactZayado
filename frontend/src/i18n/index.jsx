import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DICTS } from "./translations";

const STORAGE_KEY = "kairos_lang";
export const LANGS = [
  { code: "fr", label: "Français", short: "FR", flag: "🇫🇷" },
  { code: "en", label: "English", short: "EN", flag: "🇬🇧" },
];

function detect() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DICTS[saved]) return saved;
  } catch (_) {}
  // Produit français d'abord : défaut FR tant que l'utilisateur n'a pas
  // choisi EN lui-même (évite l'anglais surprise sur navigateur anglophone).
  return "fr";
}

function lookup(dict, path) {
  return path.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), dict);
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detect);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((code) => {
    if (DICTS[code]) setLangState(code);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((l) => (l === "fr" ? "en" : "fr"));
  }, []);

  /** t("a.b.c", { n: 3 }) — repli FR puis clé brute si absente. */
  const t = useCallback((path, vars) => {
    let val = lookup(DICTS[lang], path);
    if (val === undefined) val = lookup(DICTS.fr, path);
    if (val === undefined) return path;
    if (typeof val !== "string") return val;
    if (!vars) return val;
    return val.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, toggleLang, t, isFr: lang === "fr" }), [lang, setLang, toggleLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Repli silencieux : permet d'utiliser un composant hors Provider (tests, Storybook).
    return { lang: "fr", setLang: () => {}, toggleLang: () => {}, isFr: true, t: (p) => lookup(DICTS.fr, p) ?? p };
  }
  return ctx;
}

export const useT = () => useI18n().t;
