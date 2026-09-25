import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Compass, Lightbulb, CheckSquare, Heart, Users, Settings, CalendarCheck, Radar, Lock,
} from "lucide-react";
import { chargerAbonnement, MENU_REVEUR } from "@/lib/acces";
import { BottomNav } from "./BottomNav";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "@/i18n";
import { fetchActualite } from "@/lib/kairosApi";

// Forme "île" avec scoops (encoches en haut/bas) — portée depuis
// cap-vivant-scoops-light, un projet précédent où elle existait déjà.
// "Scoops" retiré comme bouton (ce n'était pas un vrai lien, juste
// l'ancien porteur de l'alerte actualité — déplacée sur "today").
// La marketplace publique est gérée par Shopify et ne fait pas partie du cockpit privé.
const ITEMS = [
  { key: "today", name: "Aujourd'hui", Icon: LayoutDashboard },
  { key: "vision", name: "Vision", Icon: Compass },
  { key: "radar", name: "Radar", Icon: Radar },
  { key: "review", name: "Revue hebdo", Icon: CalendarCheck },
  { key: "ideas", name: "Idées", Icon: Lightbulb },
  { key: "actions", name: "Plan d'action", Icon: CheckSquare },
  { key: "wellbeing", name: "Bien-être & Mindset", Icon: Heart },
  { key: "collab", name: "Collaborateur", Icon: Users },
  // Le chat « Collaborateur IA » s'ouvre depuis le bouton de l'en-tête (présent
  // sur toutes les pages) : l'entrée en double dans ce rail a été retirée.
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [actualiteNonVue, setActualiteNonVue] = useState(false);
  useEffect(() => {
    fetchActualite().then((data) => {
      const aujourdHui = new Date().toISOString().slice(0, 10);
      const dernierVu = localStorage.getItem("actualite_vue_le");
      const aDuContenu = !data?.masque && !data?.erreur && (data?.articles?.length || 0) > 0;
      setActualiteNonVue(aDuContenu && dernierVu !== aujourdHui);
    }).catch(() => setActualiteNonVue(false));
  }, [location.pathname]);
  const itemsAvecAlerte = ITEMS.map((item) => item.key === "today" ? { ...item, alert: actualiteNonVue } : item);
  const deriveActive = useCallback(() => {
    if (location.pathname.startsWith("/app/radar")) return "radar";
    if (location.pathname.startsWith("/app/revue")) return "review";
    if (location.pathname.startsWith("/app/vision")) return "vision";
    if (location.pathname.startsWith("/app/bien-etre")) return "wellbeing";
    if (location.pathname.startsWith("/app/actions") || location.pathname.startsWith("/app/processus")) return "actions";
    if (location.pathname.startsWith("/app/collaborateurs")) return "collab";
    if (location.pathname.startsWith("/app/ideas") || location.pathname.startsWith("/app/sources")) return "ideas";
    if (location.pathname === "/parametres") return "settings";
    return "today";
  }, [location.pathname]);
  const { t } = useI18n();
  const [planActuel, setPlanActuel] = useState(null);
  useEffect(() => { chargerAbonnement().then((a) => setPlanActuel(a.plan)).catch(() => {}); }, []);
  const verrouille = (key) => planActuel === "reveur" && !MENU_REVEUR.includes(key);
  const [active, setActive] = useState(deriveActive());
  useEffect(() => { setActive(deriveActive()); }, [deriveActive]);

  // Hors saveur SaaS, le rail du cockpit n'a pas lieu d'être.
  if ((process.env.REACT_APP_FLAVOR || "saas") !== "saas") return null;

  const go = (key) => {
    setActive(key);
    if (key === "today") {
      localStorage.setItem("actualite_vue_le", new Date().toISOString().slice(0, 10));
      setActualiteNonVue(false);
      navigate("/app");
    }
    else if (key === "vision") navigate("/app/vision");
    else if (key === "radar") navigate("/app/radar");
    else if (key === "actions") navigate("/app/actions");
    else if (key === "collab") navigate("/app/collaborateurs");
    else if (key === "review") navigate("/app/revue");
    else if (key === "wellbeing") navigate("/app/bien-etre");
    else if (key === "ideas") navigate("/app/ideas");
  };

  return (
    <>
    <BottomNav />
    <aside className="side-nav hidden lg:flex" data-testid="sidebar">
      <button onClick={() => navigate("/")} className="mt-3.5 mb-3 flex h-12 w-12 items-center justify-center" aria-label="Accueil">
        <img src="/logo.png" alt="Zayado" className="h-12 w-12 object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.35)]" />
      </button>
      <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-gold mb-2">Zayado</p>

      <div className="side-inner">
        <div className="menu-island relative w-full">
          <svg className="menu-scoop-top absolute left-0 top-[-30px] -rotate-90 pointer-events-none" width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
            <path d="M30 0H0V30C0 13.431 13.431 0 30 0Z" />
          </svg>
          <svg className="menu-scoop-bottom absolute left-0 bottom-[-30px] pointer-events-none" width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
            <path d="M30 0H0V30C0 13.431 13.431 0 30 0Z" />
          </svg>
          <nav className="relative z-10 flex w-full flex-col items-center" aria-label="Navigation principale">
            {itemsAvecAlerte.map((item) => {
              const { Icon } = item;
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => go(item.key)}
                  data-testid={`nav-${item.key}`}
                  title={t(`nav.${item.key}`)}
                  className={`group relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-br from-[#F1E2CC] to-[#DEC2A3] text-navy-900 shadow-[0_8px_22px_-8px_rgba(222,194,163,0.6)]"
                      : "text-offwhite/60 hover:bg-white/10 hover:text-offwhite"
                  }`}
                >
                  <Icon size={19} className={verrouille(item.key) ? "opacity-40" : ""} />
                  {verrouille(item.key) && <Lock size={10} className="absolute bottom-1.5 right-1.5 text-gold" data-testid={`nav-lock-${item.key}`} />}
                  {item.alert && !verrouille(item.key) && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-alert ring-2 ring-navy-900 shadow-[0_0_8px_2px_rgba(211,47,47,0.6)]" data-testid="scoop-alert-dot" />
                  )}
                  <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg border border-white/15 bg-navy-800 px-2.5 py-1.5 text-xs text-offwhite opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                    {t(`nav.${item.key}`)}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <LanguageSwitcher variant="icon" className="mb-2 mt-3" />

      <button
        onClick={() => { setActive("settings"); navigate("/parametres"); }}
        data-testid="nav-settings"
        title={t("nav.settings")}
        className={`group relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all mb-3 ${
          active === "settings" ? "bg-white/12 text-offwhite" : "text-offwhite/60 hover:bg-white/10 hover:text-offwhite"
        }`}
      >
        <Settings size={19} />
        <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg border border-white/15 bg-navy-800 px-2.5 py-1.5 text-xs text-offwhite opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
          {t("nav.settings")}
        </span>
      </button>
    </aside>
    </>
  );
}
