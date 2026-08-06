import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, LineChart as LineIcon, TrendingUp, HeartPulse, Compass, Briefcase, MessageCircle, User } from "lucide-react";
import { usePrefs } from "@/context/PrefsContext";

// Architecture V1 : un seul projet actif, pas de nav dédiée à "Valider"
// 5 piliers : Cockpit · Vision · Croissance · Espace de travail · DAF IA (+ Co-pilote)
// "Moi" (bien-être) est accessible via l'avatar/profil (menu Header).
const ITEMS = [
  { key: "cockpit",   tkey: "nav_cockpit",   Icon: Home,          path: "/" },
  { key: "vision",    tkey: "nav_vision",    Icon: Compass,       path: "/vision-board" },
  { key: "croissance",tkey: "nav_croissance",Icon: TrendingUp,    path: "/croissance" },
  { key: "travail",   tkey: "nav_travail",   Icon: Briefcase,     path: "/travail" },
  { key: "dafia",     tkey: "nav_dafia",     Icon: LineIcon,      path: "/pilotage" },
  { key: "copilote",  tkey: "nav_copilote",  Icon: MessageCircle, action: "open-cockpit-chat" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = usePrefs();
  const isActive = (item) =>
    item.path
      ? (item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path))
      : false;

  const onItemClick = (item) => {
    if (item.action === "open-cockpit-chat") {
      window.dispatchEvent(new Event("zayado:open-cockpit-chat"));
      return;
    }
    if (item.path) navigate(item.path);
  };

  return (
    <nav className="bottom-nav" data-testid="bottom-nav">
      {ITEMS.map((item) => (
        <button key={item.key} className={isActive(item) ? "active" : ""} onClick={() => onItemClick(item)} data-testid={`nav-${item.key}`}>
          <item.Icon size={14} /> {t(item.tkey)}
        </button>
      ))}
    </nav>
  );
}
