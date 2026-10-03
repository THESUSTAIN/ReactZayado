import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Compass, CheckSquare, Heart, Settings, CalendarCheck, Radar, Lock, HandHeart, Bot,
} from "lucide-react";
import { chargerEspace, enPro, menusPro } from "@/lib/espace";
import { chargerAbonnement } from "@/lib/acces";
import { aDroit, planEffectif } from "@/lib/droits";
import { BottomNav } from "./BottomNav";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "@/i18n";
import { fetchActualite } from "@/lib/kairosApi";
import { useKairos } from "@/context/KairosContext";

// Agent Business (chatbot client) : inclus à partir de l'offre Pro.
export const OFFRES_AGENT = ["pro", "business", "entreprise"];
// « Agents IA » (mes agents + Agent Business) : dès l'offre Solo.
export const OFFRES_AGENTS_IA = ["serenite", "pro", "business", "entreprise"];

// Forme "île" avec scoops (encoches en haut/bas) — portée depuis
// cap-vivant-scoops-light, un projet précédent où elle existait déjà.
// "Scoops" retiré comme bouton (ce n'était pas un vrai lien, juste
// l'ancien porteur de l'alerte actualité — déplacée sur "today").
// La marketplace publique est gérée par Shopify et ne fait pas partie du cockpit privé.
const ITEMS = [
  { key: "today", name: "Aujourd'hui", Icon: LayoutDashboard },
  { key: "vision", name: "Vision", Icon: Compass },
  { key: "radar", name: "Radar", Icon: Radar },
  { key: "actions", name: "Plan d'action", Icon: CheckSquare },
  { key: "wellbeing", name: "Bien-être & Mindset", Icon: Heart },
  // ✝️ Ma Foi (par TheSustain) — module spirituel optionnel, ajouté de façon additive.
  { key: "mafoi", name: "Ma Foi", Icon: HandHeart },
  // Agent Business : produit à part (chatbot pour TES clients), visible à partir de Pro.
  { key: "agent", name: "Agents IA", Icon: Bot },
  // « Collaborateur » retiré du rail (doublon) : le même accès existe déjà
  // via le bouton « Collaborateur » en haut du chat IA, présent partout.
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [actualiteNonVue, setActualiteNonVue] = useState(false);
  useEffect(() => {
    fetchActualite("", { bref: false }).then((data) => {
      const aujourdHui = new Date().toISOString().slice(0, 10);
      const dernierVu = localStorage.getItem("actualite_vue_le");
      const aDuContenu = !data?.masque && !data?.erreur && (data?.articles?.length || 0) > 0;
      setActualiteNonVue(aDuContenu && dernierVu !== aujourdHui);
    }).catch(() => setActualiteNonVue(false));
  }, [location.pathname]);
  const { contexte } = useKairos();
  const [abo, setAbo] = useState(null);
  useEffect(() => { chargerAbonnement().then(setAbo).catch(() => {}); }, []);
  // Espace Pro : seules les entrées des modules ouverts par l'entreprise.
  const [menusEntreprise, setMenusEntreprise] = useState(null);
  useEffect(() => { if (enPro()) chargerEspace().then((e) => setMenusEntreprise(e?.entreprise ? menusPro(e.entreprise.modules) : null)).catch(() => {}); }, []);
  // Ma Foi est optionnelle : visible seulement si activée sur le compte (onboarding, Paramètres, Bien-être).
  // Agent Business : seulement pour les offres qui l'incluent.
  const visible = (key) => {
    if (menusEntreprise) return menusEntreprise.includes(key);
    if (key === "mafoi") return contexte?.parcours_foi === true;
    if (key === "agent") return !!abo;
    return true;
  };
  const itemsAvecAlerte = ITEMS.filter((item) => visible(item.key)).map((item) => item.key === "today" ? { ...item, alert: actualiteNonVue } : item);
  const deriveActive = useCallback(() => {
    if (location.pathname.startsWith("/app/radar")) return "radar";
    if (location.pathname.startsWith("/app/revue")) return "review";
    if (location.pathname.startsWith("/app/vision")) return "vision";
    if (location.pathname.startsWith("/app/bien-etre")) return "wellbeing";
    if (location.pathname.startsWith("/app/ma-foi")) return "mafoi";
    if (location.pathname.startsWith("/app/chatbot-b2b") || location.pathname.startsWith("/app/agents")) return "agent";
    if (location.pathname.startsWith("/app/actions") || location.pathname.startsWith("/app/processus")
      || location.pathname.startsWith("/app/ideas") || location.pathname.startsWith("/app/sources")) return "actions";
    if (location.pathname.startsWith("/app/collaborateurs")) return "collab";
    if (location.pathname === "/parametres") return "settings";
    return "today";
  }, [location.pathname]);
  const { t } = useI18n();
  const [planActuel, setPlanActuel] = useState(null);
  useEffect(() => { chargerAbonnement().then((a) => setPlanActuel(planEffectif(a))).catch(() => {}); }, []);
  // Verrou « Inclus dès … » selon l'offre (toutes les offres, plus seulement Rêveur).
  const MOD_MENU = { today: "cockpit", vision: "vision", radar: "radar", actions: "idees", wellbeing: "bienetre", mafoi: "mafoi", agent: "agents" };
  const verrouille = (key) => !menusEntreprise && !!planActuel && !aDroit(planActuel, MOD_MENU[key]);
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
    else if (key === "mafoi") navigate("/app/ma-foi");
    else if (key === "agent") navigate("/app/agents");
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
                  title={(["mafoi", "agent"].includes(item.key) ? item.name : t(`nav.${item.key}`))}
                  className={`group relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 ${
                    isActive
                      ? "bg-white text-navy-900 ring-2 ring-[#DEC2A3] shadow-[0_0_20px_rgba(222,194,163,0.45),0_8px_22px_-8px_rgba(255,255,255,0.35)]"
                      : "text-offwhite/60 hover:bg-white/10 hover:text-offwhite"
                  }`}
                >
                  <Icon size={19} className={verrouille(item.key) ? "opacity-40" : ""} />
                  {verrouille(item.key) && <Lock size={10} className="absolute bottom-1.5 right-1.5 text-gold" data-testid={`nav-lock-${item.key}`} />}
                  {item.alert && !verrouille(item.key) && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-alert ring-2 ring-navy-900 shadow-[0_0_8px_2px_rgba(211,47,47,0.6)]" data-testid="scoop-alert-dot" />
                  )}
                  <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg border border-white/15 bg-navy-800 px-2.5 py-1.5 text-xs text-offwhite opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                    {(["mafoi", "agent"].includes(item.key) ? item.name : t(`nav.${item.key}`))}
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
          active === "settings" ? "bg-white text-navy-900 ring-2 ring-[#DEC2A3] shadow-[0_0_20px_rgba(222,194,163,0.45)]" : "text-offwhite/60 hover:bg-white/10 hover:text-offwhite"
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
