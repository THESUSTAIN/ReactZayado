import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { getToken } from "@/lib/kairosApi";

/**
 * Visite guidée Zayado : projecteur sur chaque zone + bulle d'explication.
 * - Démarre seule à la 1re visite du Cockpit (mémorisé dans le navigateur).
 * - Relançable depuis le menu profil ou le bouton « ? » de l'en-tête (startTour()).
 * - Les étapes dont l'élément n'est pas visible (ex. rail sur mobile) sont sautées.
 * - La visite traverse TOUTE l'appli : chaque étape peut ouvrir sa page (`path`), met en lumière
 *   un élément de la page (`focus`) ou, à défaut, le bouton du menu (`sel`). Sans cible visible
 *   (mobile, module non activé), la bulle s'affiche au centre. `req` = bouton du cockpit qui doit
 *   exister pour que l'étape soit proposée (ex. Ma Foi, seulement si activée).
 */
const DONE_KEY = "zayado_visite_guidee_v1";
export const startTour = () => window.dispatchEvent(new Event("zayado:start-tour"));

const STEPS = [
  { path: "/app", title: "Bienvenue dans ton cockpit", text: "En quelques minutes, on fait le tour de toute l'appli : le cockpit, le Vision Board, le Radar, le Plan d'action, le Bien-être, Ma Foi, les Agents et tes réglages. Tu peux passer la visite à tout moment et la relancer depuis ton profil." },
  { path: "/app", sel: "[data-testid=nav-today]", title: "Aujourd'hui", text: "Ton point de départ chaque matin : énergie, point du jour, tes 3 priorités, ton pouls business et ton Radar." },
  { path: "/app", sel: "[data-testid=mobile-nav]", title: "Navigation", text: "Toutes les sections de Zayado, à portée de pouce." },
  { path: "/app", sel: "[data-testid=header-search]", title: "Recherche rapide", text: "Tape le nom d'une page puis Entrée. Raccourci : Ctrl + K (⌘ + K sur Mac)." },
  { path: "/app", sel: "[data-testid=chat-panel]", title: "Ton Copilote", text: "Après cette visite, il te pose quelques questions, une à la fois, pour se régler (ton, rangement des documents, outils). Tu peux le masquer avec la croix." },
  { path: "/app", sel: "[data-testid=header-chat]", title: "Ton Copilote, partout", text: "Ton copilote IA, sur toutes les pages : pose une question, fais-lui créer un document, demande-lui ta revue de la semaine ou n'importe quelle page, il t'en donne le bouton." },
  { path: "/app", sel: "[data-testid=header-bell]", title: "Notifications", text: "Actualité du jour, décisions qui attendent ton feu vert, rappels et encouragements." },
  { path: "/app", sel: "[data-testid=header-profile]", title: "Ton profil", text: "Mon compte, Paramètres, déconnexion… et cette visite, à relancer quand tu veux." },
  { path: "/app/vision?view=hub", focus: "[data-testid=vision-hub]", sel: "[data-testid=nav-vision]", title: "Vision Board : tes boards", text: "Ici, tous tes boards et des modèles prêts à l'emploi : carte mentale, roue de l'équilibre, cockpit stratégique. Tu peux aussi demander à l'IA de composer un board pour toi." },
  { path: "/app/vision?view=canvas&board=perso", focus: "[data-testid=vision-rail]", sel: "[data-testid=nav-vision]", title: "Vision Board : ton canvas", text: "À gauche, tes outils : notes, post-it, images (depuis ton ordinateur, un lien ou l'IA), liens, vidéos, lignes pour relier les cartes, dessin et modèles. Tes idées et tes objectifs s'y retrouvent, reliés au Plan d'action." },
  { path: "/app/radar", sel: "[data-testid=nav-radar]", title: "Radar", text: "Chaque matin, de vraies personnes à contacter avec le message prêt, et les signaux de ton marché." },
  { path: "/app/actions?tab=idees", focus: "[data-testid=plan-onglets]", sel: "[data-testid=nav-actions]", title: "Plan d'action : de l'idée à l'action", text: "Tes idées deviennent des objectifs, puis des actions ; l'avancement se calcule tout seul. Tes idées sont reliées à ton Vision Board, et tu peux relier le tout à Trello." },
  { path: "/app/bien-etre", sel: "[data-testid=nav-wellbeing]", title: "Bien-être & Mindset", text: "Check-ins, rituels, respiration et parcours de 7 jours. Tes réponses restent privées." },
  { path: "/app/ma-foi", req: "[data-testid=nav-mafoi]", sel: "[data-testid=nav-mafoi]", title: "Ma Foi", text: "Ton espace spirituel (avec TheSustain) : il apparaît parce que tu as choisi « Ta foi » parmi tes valeurs. Tu peux l'activer ou le retirer à tout moment dans Paramètres." },
  { path: "/app/agents", req: "[data-testid=nav-agent]", sel: "[data-testid=nav-agent]", title: "Agents IA", text: "Crée tes propres agents (commercial, contenu, finances…), confie-leur une mission chaque jour, et ton chatbot client." },
  { path: "/app/revue", focus: "[data-testid=weekly-review]", title: "Revue de la semaine", text: "Un bilan guidé en quelques minutes : ce qui a avancé, ce qui bloque, et la semaine suivante. Tu peux l'envoyer sur ton Vision Board." },
  { path: "/parametres", focus: "[data-testid=parametres-nav]", title: "Paramètres", text: "Ton profil, tes notifications, tes connexions (WhatsApp, Trello…), Ma Foi, l'installation de l'appli sur ton téléphone et la confidentialité." },
  { path: "/compte", focus: "[data-testid=mon-compte]", title: "Mon compte", text: "Ton abonnement, tes achats et ta déconnexion." },
  { path: "/app", title: "À toi de jouer", text: "Tu as fait le tour de Zayado. Ton Copilote prend le relais pour finir de se régler sur toi." },
];

const visible = (el) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const st = window.getComputedStyle(el);
  return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none";
};

// Cible d'une étape : l'élément de la page (focus) sinon le bouton du menu (sel), s'ils sont visibles.
const cibleDe = (st) => {
  for (const q of [st?.focus, st?.sel]) {
    if (!q) continue;
    const el = document.querySelector(q);
    if (visible(el)) return el;
  }
  return null;
};

export default function GuidedTour() {
  const location = useLocation();
  const navigate = useNavigate();
  const [steps, setSteps] = useState(null);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [invite, setInvite] = useState(false);
  const navRef = useRef(-1); // étape pour laquelle on a déjà changé de page (évite les boucles)

  const begin = useCallback((depart = 0) => {
    const surCockpit = location.pathname === "/app";
    if (!surCockpit) navigate("/app");
    setTimeout(() => {
      // Étapes du cockpit : sautées si l'élément est absent (ex. rail sur mobile).
      // Étapes des autres pages : gardées (bulle centrée si rien à montrer), sauf module non activé (req).
      const ok = STEPS.filter((st) => {
        if (st.req) return visible(document.querySelector(st.req));
        if (st.path === "/app" && st.sel) return visible(document.querySelector(st.sel));
        return true;
      });
      setSteps(ok); setI(Math.min(typeof depart === "number" ? depart : 0, ok.length - 1));
      navRef.current = -1;
    }, surCockpit ? 50 : 900);
  }, [location.pathname, navigate]);

  useEffect(() => {
    const h = () => begin();
    window.addEventListener("zayado:start-tour", h);
    return () => window.removeEventListener("zayado:start-tour", h);
  }, [begin]);

  // Première visite du Cockpit : lancement automatique.
  useEffect(() => {
    if (location.pathname !== "/app" || !getToken()) return;
    let fait = true;
    try { fait = localStorage.getItem(DONE_KEY) === "1"; } catch { /* stockage indisponible */ }
    if (fait) return;
    // Plus de voile plein écran d'office sur le cockpit (il masquait le centre
    // à la 1re connexion) : une petite invitation discrète, en bas, qu'on accepte ou non.
    const t = setTimeout(() => setInvite(true), 900);
    return () => clearTimeout(t);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const step = steps?.[i];
  const measure = useCallback(() => {
    const el = cibleDe(step);
    if (!el) { setRect(null); return; }
    let r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) { el.scrollIntoView({ block: "nearest", inline: "nearest" }); r = el.getBoundingClientRect(); }
    // Grandes zones : le halo reste dans l'écran.
    const x = Math.max(6, r.left - 6), y = Math.max(6, r.top - 6);
    const w = Math.min(window.innerWidth - 6, r.right + 6) - x, h = Math.min(window.innerHeight - 6, r.bottom + 6) - y;
    setRect(w > 0 && h > 0 ? { x, y, w, h } : null);
  }, [step]);

  // Ouvre la page de l'étape (une seule fois), puis attend que la cible apparaisse.
  useEffect(() => {
    if (!steps || !step) return;
    const ici = location.pathname + location.search;
    if (step.path && ici !== step.path && navRef.current !== i) { navRef.current = i; setRect(null); navigate(step.path); return; }
    measure();
    let n = 0;
    const t = setInterval(() => { n += 1; measure(); if (n >= 16) clearInterval(t); }, 160);
    return () => clearInterval(t);
  }, [steps, i, location.pathname, location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    if (!steps) return;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [steps, measure]);

  const close = useCallback(() => {
    try { localStorage.setItem(DONE_KEY, "1"); } catch { /* stockage indisponible */ }
    setSteps(null); setRect(null);
    // Retour au cockpit : le Copilote (qui prend le relais) n'existe qu'une fois la page rechargée.
    const retour = window.location.pathname !== "/app";
    if (retour) navigate("/app");
    setTimeout(() => window.dispatchEvent(new Event("zayado:tour-fini")), retour ? 900 : 0);
  }, [navigate]);
  const next = useCallback(() => (i + 1 >= steps.length ? close() : setI(i + 1)), [i, steps, close]);
  const prev = () => setI((v) => Math.max(0, v - 1));

  useEffect(() => {
    if (!steps) return;
    const k = (e) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [steps, next, close]);

  if (invite && !steps) {
    // Première visite : fenêtre centrée sur fond assombri (avant : petite bulle en bas à gauche,
    // qu'on ne voyait pas au milieu de tout le cockpit).
    const refuser = () => {
      try { localStorage.setItem(DONE_KEY, "1"); } catch { /* */ }
      setInvite(false);
      window.dispatchEvent(new Event("zayado:tour-fini"));
    };
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#05081a]/75 p-4 backdrop-blur-sm" data-testid="tour-invite" role="dialog" aria-modal="true" aria-label="Visite guidée">
        <div className="fenetre w-full max-w-md rounded-3xl p-7 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold ring-1 ring-gold/30"><Sparkles className="h-7 w-7" /></span>
          <h2 className="mt-4 font-display text-2xl font-bold text-offwhite">Bienvenue dans Zayado</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-offwhite/75">Ton cockpit est prêt. On en fait le tour en une minute ? Ensuite, ton Copilote te posera quelques questions, une à la fois, pour se régler sur toi.</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button onClick={() => { setInvite(false); begin(1); }} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-navy-900" data-testid="tour-invite-oui">Faire la visite <ArrowRight className="h-4 w-4" /></button>
            <button onClick={refuser} className="rounded-xl border border-white/15 px-5 py-2.5 text-sm text-offwhite/75 hover:bg-white/10" data-testid="tour-invite-non">Plus tard</button>
          </div>
        </div>
      </div>
    );
  }
  if (!steps || !step) return null;

  // Position de la bulle : à droite de la cible si la place le permet, sinon dessous / dessus.
  const W = Math.min(340, window.innerWidth - 32);
  let pos = { left: (window.innerWidth - W) / 2, top: Math.max(24, window.innerHeight / 2 - 120) };
  const enorme = rect && rect.w > window.innerWidth * 0.6 && rect.h > window.innerHeight * 0.55;
  if (rect && !enorme) {
    if (rect.x + rect.w + 16 + W < window.innerWidth) pos = { left: rect.x + rect.w + 16, top: Math.min(Math.max(16, rect.y), window.innerHeight - 240) };
    else if (rect.y + rect.h + 230 < window.innerHeight) pos = { left: Math.min(Math.max(16, rect.x + rect.w - W), window.innerWidth - W - 16), top: rect.y + rect.h + 12 };
    else pos = { left: Math.min(Math.max(16, rect.x + rect.w - W), window.innerWidth - W - 16), top: Math.max(16, rect.y - 230) };
  }

  return (
    <div className="fixed inset-0 z-[80]" data-testid="guided-tour" role="dialog" aria-modal="true" aria-label="Visite guidée">
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-gold transition-all duration-300"
          style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, boxShadow: "0 0 0 9999px rgba(5,8,26,0.72)" }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#05081a]/72" />
      )}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      <div
        className="fenetre absolute rounded-2xl p-5 text-offwhite transition-all duration-300"
        style={{ width: W, ...pos }}
        data-testid="tour-bubble"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
            <Sparkles className="h-3.5 w-3.5" /> Visite guidée · {i + 1}/{steps.length}
          </span>
          <button onClick={close} className="rounded-lg p-1 text-offwhite/60 hover:bg-white/10 hover:text-offwhite" aria-label="Fermer la visite" data-testid="tour-close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="text-base font-semibold text-offwhite">{step.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-offwhite/75">{step.text}</p>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={close} className="text-xs text-offwhite/55 hover:text-offwhite" data-testid="tour-skip">Passer la visite</button>
          <div className="flex gap-2">
            {i > 0 && (
              <button onClick={prev} className="inline-flex items-center gap-1 rounded-xl border border-white/15 px-3 py-1.5 text-xs text-offwhite/80 hover:bg-white/10" data-testid="tour-prev">
                <ArrowLeft className="h-3.5 w-3.5" /> Précédent
              </button>
            )}
            <button onClick={next} className="inline-flex items-center gap-1 rounded-xl bg-gold px-3.5 py-1.5 text-xs font-semibold text-navy-900 hover:bg-gold-hover" data-testid="tour-next">
              {i + 1 >= steps.length ? "Terminer" : "Suivant"} {i + 1 < steps.length && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
