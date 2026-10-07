import { useEffect, useState } from "react";

// Thème des espaces pro (admin, vendeur) : clair par défaut, sombre si l'utilisateur le choisit.
const CLE = "zayado_theme_pro";
const lire = () => { try { return localStorage.getItem(CLE) === "sombre" ? "sombre" : "clair"; } catch { return "clair"; } };

export function useThemePro() {
  const [theme, setTheme] = useState(lire);
  useEffect(() => {
    const f = () => setTheme(lire());
    window.addEventListener("zayado-theme-pro", f);
    return () => window.removeEventListener("zayado-theme-pro", f);
  }, []);
  const basculer = () => {
    const suivant = theme === "clair" ? "sombre" : "clair";
    try { localStorage.setItem(CLE, suivant); } catch { /* stockage indisponible */ }
    setTheme(suivant);
    window.dispatchEvent(new Event("zayado-theme-pro"));
  };
  return [theme, basculer];
}
