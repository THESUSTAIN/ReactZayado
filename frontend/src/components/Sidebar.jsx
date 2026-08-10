import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Compass, TrendingUp, Activity, HeartPulse, Gem, Briefcase, MessageCircle, User } from "lucide-react";
import { usePrefs } from "@/context/PrefsContext";

// Architecture V1 : un seul projet actif
// 5 piliers : Cockpit · Vision · Croissance · Espace de travail · DAF IA (+ Co-pilote)
// "Moi" (bien-être) est accessible via l'avatar/profil (menu Header).
const ITEMS = [
  { id: "cockpit",    tkey: "nav_cockpit",    Icon: Home,          path: "/" },
  { id: "vision",     tkey: "nav_vision",     Icon: Compass,       path: "/vision-board" },
  { id: "croissance", tkey: "nav_croissance", Icon: TrendingUp,    path: "/croissance" },
  { id: "travail",    tkey: "nav_travail",    Icon: Briefcase,     path: "/travail" },
  { id: "dafia",      tkey: "nav_dafia",      Icon: Activity,      path: "/pilotage" },
  { id: "copilote",   tkey: "nav_copilote",   Icon: MessageCircle, action: "open-cockpit-chat" },
];

const COLLAPSE_KEY = "zayado_sidebar_collapsed";
const HINT_KEY = "zayado_sidebar_hint_seen";

export default function Sidebar({ onSettingsOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = usePrefs();
  const isActive = (item) =>
    item.path
      ? (item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path))
      : false;

  // Repli type Samsung Edge : les icônes glissent hors écran, mais on garde
  // (1) le LOGO ancré tout en haut au niveau du header et
  // (2) une fine bande gris translucide sur toute la hauteur de l'ancien
  // menu pour rappeler à l'utilisateur qu'il y a une nav à ré-ouvrir.
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === "1"; }
    catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0"); } catch { /* noop */ }
  }, [collapsed]);

  // Micro-hint : petite pulsation dorée sur la poignée « ‹ » au 1er chargement
  // pour faire découvrir le geste de repli. S'éteint dès la 1ʳᵉ interaction
  // avec la poignée ou après ~12s (auto-timeout, pour ne pas être intrusive).
  const [showHint, setShowHint] = useState(() => {
    try { return localStorage.getItem(HINT_KEY) !== "1"; }
    catch { return true; }
  });
  useEffect(() => {
    if (!showHint) return;
    const id = setTimeout(() => {
      setShowHint(false);
      try { localStorage.setItem(HINT_KEY, "1"); } catch { /* noop */ }
    }, 12000);
    return () => clearTimeout(id);
  }, [showHint]);
  const markHintSeen = () => {
    if (!showHint) return;
    setShowHint(false);
    try { localStorage.setItem(HINT_KEY, "1"); } catch { /* noop */ }
  };

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => !c);
    // La première interaction avec la poignée marque le hint comme vu
    if (showHint) {
      setShowHint(false);
      try { localStorage.setItem(HINT_KEY, "1"); } catch { /* noop */ }
    }
  }, [showHint]);

  // Geste tactile : swipe horizontal (>= 40px)
  const touchStart = useRef({ x: 0, y: 0 });
  const onTouchStart = (e) => {
    const t0 = e.touches[0];
    touchStart.current = { x: t0.clientX, y: t0.clientY };
  };
  const onTouchEnd = (e) => {
    const t1 = (e.changedTouches && e.changedTouches[0]);
    if (!t1) return;
    const dx = t1.clientX - touchStart.current.x;
    const dy = Math.abs(t1.clientY - touchStart.current.y);
    if (dy > 40) return;
    if (dx <= -40 && !collapsed) setCollapsed(true);
    else if (dx >= 40 && collapsed) setCollapsed(false);
  };

  const onItemClick = (item) => {
    if (item.action === "open-cockpit-chat") {
      window.dispatchEvent(new Event("zayado:open-cockpit-chat"));
      return;
    }
    if (item.path) navigate(item.path);
  };

  return (
    <aside
      data-testid="side-nav"
      data-collapsed={collapsed ? "1" : "0"}
      className={`side-nav ${collapsed ? "is-collapsed" : ""}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Logo Zayado — ancré tout en haut du rail, au niveau du header.
          Cliquable pour ouvrir ET fermer la sidebar (toggle) — plus de
          navigation vers / au clic : l'icône Home du menu s'en charge. */}
      <button
        type="button"
        onClick={toggleCollapsed}
        title={collapsed ? "Ouvrir le menu" : "Replier le menu"}
        aria-label={collapsed ? "Ouvrir le menu" : "Replier le menu"}
        aria-expanded={!collapsed}
        data-testid="side-logo"
        className="side-logo-btn"
      >
        <img src="/logo-zayado.png" alt="myextension-ai by Zayado" className="side-logo-img" />
      </button>

      {/* Bande grise translucide visible UNIQUEMENT en mode replié : rappelle
          la présence du menu façon Samsung Edge Panel handle. Un clic dessus
          re-déplie la sidebar. */}
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label="Ouvrir le menu"
        title="Ouvrir le menu"
        data-testid="side-edge-strip"
        className="side-edge-strip"
        tabIndex={collapsed ? 0 : -1}
      />

      {/* Contenu principal : centré verticalement, se replie/déplie */}
      <div className="side-inner">
        <div className="menu-island relative w-full rounded-r-3xl py-3 px-2.5 flex items-center justify-center">
          <svg className="menu-scoop-top absolute left-0 top-[-30px] -rotate-90 pointer-events-none" width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M30 0H0V30C0 13.431 13.431 0 30 0Z" />
          </svg>
          <svg className="menu-scoop-bottom absolute left-0 bottom-[-30px] pointer-events-none" width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M30 0H0V30C0 13.431 13.431 0 30 0Z" />
          </svg>

          <ul className="relative z-10 flex flex-col gap-1.5 items-center w-full">
            {ITEMS.map((item) => {
              const active = isActive(item);
              const Icon = item.Icon;
              return (
                <li key={item.id} className="w-full flex justify-center">
                  <button
                    onClick={() => onItemClick(item)}
                    data-testid={`side-${item.id}`}
                    data-nav-type={item.action ? "action" : "page"}
                    className={`menu-link group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${active ? "active" : ""} ${item.action ? "menu-link-action" : ""}`}
                  >
                    <Icon size={17} strokeWidth={1.9} />
                    <span className="menu-tooltip pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md text-white text-xs px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                      {t(item.tkey)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Simulation Client retirée de la sidebar : module bêta hors du
            flux quotidien, ne mérite pas une entrée permanente dans la
            nav. Route /simulation reste accessible directement. */}
        {/* Réglages */}
        <div className="w-full flex items-center justify-center pt-0.5">
          <button
            onClick={onSettingsOpen}
            data-testid="side-settings"
            title={t("settings")}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-[#d4b78c] to-[#c4a374] flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          >
            <Gem className="w-4 h-4 text-[#0a1f4e]" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Poignée '‹' à droite du rail — visible seulement en mode déplié */}
      {!collapsed && (
        <button
          type="button"
          className={`side-collapse-handle ${showHint ? "has-hint" : ""}`}
          onClick={toggleCollapsed}
          onMouseEnter={markHintSeen}
          title="Replier le menu"
          aria-label="Replier le menu"
          data-testid="side-collapse-handle"
          data-hint={showHint ? "1" : "0"}
        >
          <span aria-hidden="true">‹</span>
        </button>
      )}
    </aside>
  );
}
