import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { prefsApi, makeT } from "@/lib/i18n";

const PrefsCtx = createContext(null);
export const usePrefs = () => useContext(PrefsCtx);

const DEFAULTS = { theme: "dark", menu_position: "bottom", language: "fr", onboarded: false };

// Détection simple et fiable via la langue du navigateur — pas de dépendance externe
function detectLanguageFromBrowser() {
  const browserLang = (navigator.language || navigator.userLanguage || "fr").slice(0, 2).toLowerCase();
  return browserLang === "fr" ? "fr" : "en";
}

export function PrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const touchedRef = useRef(false); // l'utilisateur a-t-il déjà modifié une préf ?

  useEffect(() => {
    const storedLang = (typeof window !== "undefined" && localStorage.getItem("zayado_lang")) || null;
    prefsApi.get().then((p) => {
      // Ne jamais écraser un choix déjà fait par l'utilisateur pendant le chargement.
      if (touchedRef.current) return;
      // Priorité : choix backend explicite > choix client persisté (sélecteur) > navigateur
      if (p && p.language_set_manually === true) {
        setPrefs({ ...DEFAULTS, ...p });
      } else {
        setPrefs({ ...DEFAULTS, ...p, language: storedLang || p?.language || detectLanguageFromBrowser() });
      }
    }).catch(() => {
      if (storedLang && !touchedRef.current) setPrefs((prev) => ({ ...prev, language: storedLang }));
    }).finally(() => setLoaded(true));
  }, []);

  const setPref = useCallback((patch) => {
    touchedRef.current = true;
    // Si l'utilisateur choisit sa langue manuellement, on ne la re-détecte plus jamais
    const finalPatch = patch.language ? { ...patch, language_set_manually: true } : patch;
    if (patch.language && typeof window !== "undefined") localStorage.setItem("zayado_lang", patch.language);
    setPrefs((prev) => ({ ...prev, ...finalPatch }));
    prefsApi.save(finalPatch).catch(() => {});
  }, []);

  const t = makeT(prefs.language);
  const ambiance = prefs.theme === "light" ? "clarte" : "sens";

  // Synchronise la classe shadcn `.dark` sur <html> pour que les composants
  // rendus en portal (Dialog, Select, Popover, Toast…) suivent le thème.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (prefs.theme === "light") root.classList.remove("dark");
    else root.classList.add("dark");
  }, [prefs.theme]);

  return (
    <PrefsCtx.Provider value={{ prefs, setPref, t, ambiance, loaded }}>
      {children}
    </PrefsCtx.Provider>
  );
}
