import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { getToken } from "@/lib/kairosApi";

/**
 * Visite guidée Zayado : projecteur sur chaque zone + bulle d'explication.
 * - Démarre seule à la 1re visite du Cockpit (mémorisé dans le navigateur).
 * - Relançable depuis le menu profil ou le bouton « ? » de l'en-tête (startTour()).
 * - Les étapes dont l'élément n'est pas visible (ex. rail sur mobile) sont sautées.
 */
const DONE_KEY = "zayado_visite_guidee_v1";
export const startTour = () => window.dispatchEvent(new Event("zayado:start-tour"));

const STEPS = [
  { title: "Bienvenue dans ton cockpit", text: "En une minute, on fait le tour des zones clés de Zayado. Tu peux passer la visite à tout moment et la relancer depuis ton profil." },
  { sel: "[data-testid=nav-today]", title: "Aujourd'hui", text: "Ton point de départ chaque matin : énergie, point du jour, tes 3 priorités, ton pouls business et ton Radar." },
  { sel: "[data-testid=nav-vision]", title: "Vision Board", text: "Tes murs de vision, avec des cartes reliées à tes objectifs, tes actions et tes finances." },
  { sel: "[data-testid=nav-radar]", title: "Radar", text: "Chaque matin, de vraies personnes à contacter avec le message prêt, et les signaux de ton marché." },
  { sel: "[data-testid=nav-actions]", title: "Plan d'action", text: "De l'idée à l'action : tes idées deviennent des objectifs ou des actions, et l'avancement se calcule tout seul. Tu peux le relier à Trello." },
  { sel: "[data-testid=nav-wellbeing]", title: "Bien-être & Mindset", text: "Check-ins, rituels, respiration et parcours de 7 jours. Tes réponses restent privées." },
  { sel: "[data-testid=nav-agent]", title: "Agents IA", text: "Crée tes propres agents (commercial, contenu, finances…), confie-leur une mission chaque jour, et ton chatbot client." },
  { sel: "[data-testid=mobile-nav]", title: "Navigation", text: "Toutes les sections de Zayado, à portée de pouce." },
  { sel: "[data-testid=header-search]", title: "Recherche rapide", text: "Tape le nom d'une page puis Entrée. Raccourci : Ctrl + K (⌘ + K sur Mac)." },
  { sel: "[data-testid=chat-panel]", title: "Ton Copilote", text: "Après cette visite, il te pose quelques questions, une à la fois, pour se régler (ton, rangement des documents, outils). Tu peux le masquer avec la croix." },
  { sel: "[data-testid=header-chat]", title: "Ton Copilote", text: "Ton copilote IA, sur toutes les pages : pose une question, fais-lui créer un document, demande-lui ta revue de la semaine ou n'importe quelle page, il t'en donne le bouton." },
  { sel: "[data-testid=header-bell]", title: "Notifications", text: "Actualité du jour et décisions qui attendent ton feu vert." },
  { sel: "[data-testid=header-profile]", title: "Ton profil", text: "Mon compte, Paramètres, déconnexion… et cette visite, à relancer quand tu veux." },
];

const visible = (el) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const st = window.getComputedStyle(el);
  return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none";
};

export default function GuidedTour() {
  const location = useLocation();
  const navigate = useNavigate();
  const [steps, setSteps] = useState(null);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [invite, setInvite] = useState(false);

  const begin = useCallback((depart = 0) => {
    if (location.pathname !== "/app") navigate("/app");
    setTimeout(() => {
      const ok = STEPS.filter((s) => !s.sel || visible(document.querySelector(s.sel)));
      setSteps(ok); setI(Math.min(typeof depart === "number" ? depart : 0, ok.length - 1));
    }, location.pathname !== "/app" ? 900 : 50);
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
    if (!step?.sel) { setRect(null); return; }
    const el = document.querySelector(step.sel);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    const r = el.getBoundingClientRect();
    setRect({ x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12 });
  }, [step]);

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
    window.dispatchEvent(new Event("zayado:tour-fini"));
  }, []);
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
  if (rect) {
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
