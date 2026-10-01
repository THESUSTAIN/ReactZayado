import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Compass, Radar, CheckSquare, MoreHorizontal, Heart, CalendarCheck, Users, Settings, X, Lock, HandHeart, Bot } from "lucide-react";
import { chargerAbonnement, MENU_REVEUR } from "@/lib/acces";
import { useKairos } from "@/context/KairosContext";

// Menu mobile en bas d'écran (toutes les pages de l'app). Le chat reste dans l'en-tête
// (pas de doublon). Masqué dans l'éditeur de Vision Board, qui a sa propre barre d'outils.
const PRINCIPAUX = [
  { key: "today", label: "Aujourd'hui", Icon: LayoutDashboard, path: "/app" },
  { key: "vision", label: "Vision", Icon: Compass, path: "/app/vision" },
  { key: "radar", label: "Radar", Icon: Radar, path: "/app/radar" },
  { key: "actions", label: "Plan d'action", Icon: CheckSquare, path: "/app/actions" },
];
const PLUS = [
  { key: "wellbeing", label: "Bien-être & Mindset", Icon: Heart, path: "/app/bien-etre" },
  { key: "mafoi", label: "Ma Foi", Icon: HandHeart, path: "/app/ma-foi" },
  { key: "agent", label: "Agents IA", Icon: Bot, path: "/app/agents" },
  { key: "review", label: "Revue hebdo", Icon: CalendarCheck, path: "/app/revue" },
  { key: "settings", label: "Paramètres", Icon: Settings, path: "/parametres" },
];

export function BottomNav() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [plus, setPlus] = useState(false);
  const [plan, setPlan] = useState(null);
  const [acces, setAcces] = useState(null);
  const { contexte } = useKairos();
  useEffect(() => { chargerAbonnement().then((a) => { setPlan(a.plan); setAcces(a.acces); }).catch(() => {}); }, []);
  const visible = (k) => (k === "mafoi" ? contexte?.parcours_foi === true
    : k === "agent" ? ["serenite", "pro", "business", "entreprise"].includes(plan) && (acces == null || acces === "actif") : true);
  const masque = pathname.startsWith("/app/vision") && new URLSearchParams(search).get("view");
  useEffect(() => {
    document.body.classList.toggle("avec-nav-bas", !masque);
    return () => document.body.classList.remove("avec-nav-bas");
  }, [masque]);
  useEffect(() => { setPlus(false); }, [pathname]);
  if (masque) return null;
  const actif = (p) => (p === "/app" ? pathname === "/app" : pathname.startsWith(p));
  const verrou = (k) => plan === "reveur" && !MENU_REVEUR.includes(k) && k !== "settings";
  const plusActif = PLUS.some((i) => actif(i.path));
  return (
    <>
      {plus && (
        <div className="fixed inset-0 z-[55] bg-[#0b1a3d]/60 backdrop-blur-sm lg:hidden" onClick={() => setPlus(false)}>
          <div className="fenetre absolute inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] rounded-2xl p-2" onClick={(e) => e.stopPropagation()} data-testid="bottomnav-plus-menu">
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-offwhite/55">Plus</p>
              <button onClick={() => setPlus(false)} aria-label="Fermer" className="rounded-lg p-1 text-offwhite/60"><X size={16} /></button>
            </div>
            {PLUS.filter((i) => visible(i.key)).map(({ key, label, Icon, path }) => (
              <button key={key} onClick={() => navigate(path)} data-testid={`bottomnav-${key}`}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[14.5px] ${actif(path) ? "bg-white text-navy-900 ring-1 ring-[#DEC2A3]" : "text-offwhite/85"}`}>
                <Icon size={18} /> <span className="flex-1">{label}</span>{verrou(key) && <Lock size={13} className="text-gold" />}
              </button>
            ))}
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-[56] border-t border-white/10 bg-[#0f1b3a]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Navigation principale" data-testid="bottomnav">
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {PRINCIPAUX.map(({ key, label, Icon, path }) => (
            <button key={key} onClick={() => navigate(path)} data-testid={`bottomnav-${key}`} aria-current={actif(path) ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium ${actif(path) ? "text-white" : "text-offwhite/55"}`}>
              {actif(path) && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[#DEC2A3] shadow-[0_0_8px_rgba(222,194,163,0.8)]" />}
              <Icon className={`h-5 w-5 ${verrou(key) ? "opacity-40" : ""}`} />
              {label}
              {verrou(key) && <Lock size={9} className="absolute right-[28%] top-2 text-gold" />}
            </button>
          ))}
          <button onClick={() => setPlus((v) => !v)} data-testid="bottomnav-plus" aria-expanded={plus}
            className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium ${plus || plusActif ? "text-white" : "text-offwhite/55"}`}>
            {plusActif && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[#DEC2A3] shadow-[0_0_8px_rgba(222,194,163,0.8)]" />}
            <MoreHorizontal className="h-5 w-5" /> Plus
          </button>
        </div>
      </nav>
    </>
  );
}
