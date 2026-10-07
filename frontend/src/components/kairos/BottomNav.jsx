import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchMoi } from "@/lib/kairosApi";
import { chargerEspaceEntreprise, sectionsVisibles } from "@/lib/sectionsEntreprise";
import { LayoutDashboard, Compass, Radar, CheckSquare, MoreHorizontal, Heart, Settings, X, Sparkles, HandHeart, Bot, Building2 } from "lucide-react";
import { chargerAbonnement, estSalarie } from "@/lib/acces";
import { aDroit, planEffectif } from "@/lib/droits";
import { useKairos } from "@/context/KairosContext";
import { chargerEspace, enPro, menusPro } from "@/lib/espace";

// Menu mobile en bas d'écran. Correction UX : on n'affiche plus de "tabs morts"
// avec cadenas — uniquement les modules accessibles à l'offre, plus un bouton
// "Plus" qui ouvre les autres entrées accessibles + un CTA "Débloquer" élégant.
// Le chat reste dans l'en-tête (pas de doublon).
const TOUS = [
  { key: "today", label: "Aujourd'hui", Icon: LayoutDashboard, path: "/app", mod: "cockpit" },
  { key: "vision", label: "Vision", Icon: Compass, path: "/app/vision", mod: "vision" },
  { key: "radar", label: "Radar", Icon: Radar, path: "/app/radar", mod: "radar" },
  { key: "actions", label: "Plan d'action", Icon: CheckSquare, path: "/app/actions", mod: "idees" },
  { key: "wellbeing", label: "Bien-être", Icon: Heart, path: "/app/bien-etre", mod: "bienetre" },
  { key: "mafoi", label: "Ma Foi", Icon: HandHeart, path: "/app/ma-foi", mod: "mafoi" },
  { key: "agent", label: "Agents IA", Icon: Bot, path: "/app/agents", mod: "agents" },
  // Équipe « Ton entreprise » : seul espace d'un salarié invité (aucune offre à payer).
  { key: "equipe", label: "Entreprise", Icon: Building2, path: "/app/entreprise", mod: null },
  // Dans « Plus » (après les 4 entrées principales)
  { key: "settings", label: "Paramètres", Icon: Settings, path: "/parametres", mod: null },
];

export function BottomNav() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [plus, setPlus] = useState(false);
  const [interne, setInterne] = useState(false);
  useEffect(() => { fetchMoi().then((m) => setInterne(["admin", "vendeur"].includes(m?.role))).catch(() => {}); }, []);
  const [plan, setPlan] = useState(null);
  const [equipe, setEquipe] = useState({ membre: false, seul: false });
  const { contexte } = useKairos();
  useEffect(() => { chargerAbonnement().then((a) => { setPlan(planEffectif(a)); setEquipe({ membre: Boolean(a?.salarie), seul: estSalarie(a) }); }).catch(() => {}); }, []);
  const [espace, setEspace] = useState(null);
  const espaceEnt = pathname.startsWith("/app/entreprise");
  useEffect(() => { chargerEspaceEntreprise().then(setEspace).catch(() => {}); }, [espaceEnt, search]);
  const [menusEntreprise, setMenusEntreprise] = useState(null);
  useEffect(() => { if (enPro()) chargerEspace().then((e) => setMenusEntreprise(e?.entreprise ? menusPro(e.entreprise.modules) : null)).catch(() => {}); }, []);

  const masque = pathname.startsWith("/app/vision") && new URLSearchParams(search).get("view");
  useEffect(() => {
    document.body.classList.toggle("avec-nav-bas", !masque);
    return () => document.body.classList.remove("avec-nav-bas");
  }, [masque]);
  useEffect(() => { setPlus(false); }, [pathname]);
  if (masque) return null;

  const vueEnt = new URLSearchParams(search).get("vue") || "aujourdhui";
  const actif = (p) => (p.includes("?vue=") ? espaceEnt && p.endsWith(`=${vueEnt === "temps" ? "chrono" : vueEnt}`)
    : p === "/app" ? pathname === "/app" : pathname.startsWith(p));
  const aUneEntreprise = Boolean(espace?.moi?.actif) || equipe.membre || ["business", "entreprise"].includes(plan) || interne;

  // Visibilité de base (Ma Foi seulement si activée ; entreprise = menus ouverts).
  const visible = (it) => equipe.seul
    ? (it.key === "equipe" || it.key === "settings")           // salarié sans offre : équipe + paramètres, rien d'autre
    : it.key === "equipe" ? aUneEntreprise                      // dirigeant ou membre d'une entreprise (avant : salariés seulement)
    : menusEntreprise
    ? (menusEntreprise.includes(it.key) || it.key === "settings")
    : (it.key === "mafoi" ? contexte?.parcours_foi === true : true);
  // Accessible selon l'offre (plan null = en cours de chargement → tout visible).
  const accessible = (it) => (equipe.seul || menusEntreprise) ? true : (it.mod == null || aDroit(plan, it.mod));

  // Dans « Ton entreprise » : la barre du bas montre les sections de l'entreprise (+ retour au cockpit pour le dirigeant)
  const dispo = espaceEnt && espace?.moi?.actif ? [
    ...(equipe.seul ? [] : [{ key: "cockpit", label: "Perso", Icon: LayoutDashboard, path: "/app" }]),
    ...sectionsVisibles(espace).map((x) => ({ key: x.key, label: x.libelle, Icon: x.Icon, path: `/app/entreprise?vue=${x.key}`, nb: x.nb })),
    ...TOUS.filter((it) => it.key === "settings"),
  ] : TOUS.filter((it) => visible(it) && accessible(it) && (!it.interne || interne));
  const principaux = dispo.filter((it) => it.key !== "settings").slice(0, 4);
  const reste = dispo.filter((it) => !principaux.includes(it));
  const yAVerrou = !menusEntreprise && !equipe.seul && !!plan && TOUS.some((it) => visible(it) && it.mod && !aDroit(plan, it.mod));
  const plusActif = reste.some((it) => actif(it.path)) || pathname.startsWith("/app/debloquer");

  const Item = ({ it }) => (
    <button key={it.key} onClick={() => navigate(it.path)} data-testid={`bottomnav-${it.key}`} aria-current={actif(it.path) ? "page" : undefined}
      className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium ${actif(it.path) ? "text-white" : "text-offwhite/55"}`}>
      {actif(it.path) && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[#DEC2A3] shadow-[0_0_8px_rgba(222,194,163,0.8)]" />}
      <it.Icon className="h-5 w-5" /> {it.label}
    </button>
  );

  return (
    <>
      {plus && (
        <div className="fixed inset-0 z-[55] bg-[#0b1a3d]/60 backdrop-blur-sm lg:hidden" onClick={() => setPlus(false)}>
          <div className="fenetre absolute inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] rounded-2xl p-2" onClick={(e) => e.stopPropagation()} data-testid="bottomnav-plus-menu">
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-offwhite/55">Plus</p>
              <button onClick={() => setPlus(false)} aria-label="Fermer" className="rounded-lg p-1 text-offwhite/60"><X size={16} /></button>
            </div>
            {reste.map((it) => (
              <button key={it.key} onClick={() => navigate(it.path)} data-testid={`bottomnav-${it.key}`}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[14.5px] ${actif(it.path) ? "bg-white text-navy-900 ring-1 ring-[#DEC2A3]" : "text-offwhite/85"}`}>
                <it.Icon size={18} /> <span className="flex-1">{it.label}</span>
              </button>
            ))}
            {yAVerrou && (
              <button onClick={() => navigate("/pricing")} data-testid="bottomnav-debloquer"
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[14.5px] font-semibold text-navy-900"
                style={{ background: "linear-gradient(to bottom,#F1E2CC,#DEC2A3)" }}>
                <Sparkles size={18} /> <span className="flex-1">Débloquer plus de modules</span>
              </button>
            )}
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-[56] border-t border-white/10 bg-[#0f1b3a]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Navigation principale" data-testid="bottomnav">
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {principaux.map((it) => <Item key={it.key} it={it} />)}
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
