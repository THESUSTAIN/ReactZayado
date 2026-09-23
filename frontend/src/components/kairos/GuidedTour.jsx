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
  { sel: "[data-testid=nav-today]", title: "Aujourd'hui", text: "Ton point de départ : énergie, équilibre pro/perso, priorités et pouls business du jour." },
  { sel: "[data-testid=nav-vision]", title: "Vision Board", text: "Ton tableau façon Storyflow : murs, cartes et cartes Live reliées à tes objectifs, tes actions et tes finances." },
  { sel: "[data-testid=nav-radar]", title: "Radar", text: "Les signaux de ton marché et les opportunités repérées pour toi." },
  { sel: "[data-testid=nav-review]", title: "Revue hebdo", text: "Cinq minutes par semaine pour regarder en arrière sans te juger, puis choisir la suite." },
  { sel: "[data-testid=nav-ideas]", title: "Idées", text: "Capture une idée en deux secondes ; l'IA t'aide à la trier et à la transformer en action." },
  { sel: "[data-testid=nav-actions]", title: "Actions", text: "Tes tâches, reliées à tes objectifs : chaque action fait avancer ta vision." },
  { sel: "[data-testid=nav-wellbeing]", title: "Bien-être", text: "Respiration, check-ins et rituels pour tenir le rythme sans t'épuiser." },
  { sel: "[data-testid=nav-collab]", title: "Collaborateurs", text: "Demande de l'aide à un expert humain : faire avec toi, préparer ou exécuter après ta validation." },
  { sel: "[data-testid=nav-chat]", title: "Collaborateur IA", text: "Ton copilote IA, disponible sur toutes les pages : pose une question, valide ses décisions, lis l'actualité du jour." },
  { sel: "[data-testid=mobile-nav]", title: "Navigation", text: "Toutes les sections de Zayado, à portée de pouce." },
  { sel: "[data-testid=header-search]", title: "Recherche rapide", text: "Tape le nom d'une page puis Entrée. Raccourci : Ctrl + K (⌘ + K sur Mac)." },
  { sel: "[data-testid=header-chat]", title: "Chat", text: "Ouvre le Collaborateur IA sans quitter la page." },
  { sel: "[data-testid=header-bell]", title: "Notifications", text: "Actualité du jour et décisions qui attendent ton feu vert." },
  { sel: "[data-testid=open-checkin-btn]", title: "Check-in énergie", text: "Chaque jour, note ton énergie : Zayado adapte le rythme et les conseils." },
  { sel: "[data-testid=header-profile]", title: "Ton profil", text: "Paramètres, Mon espace, déconnexion… et cette visite, à relancer quand tu veux." },
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

  const begin = useCallback(() => {
    if (location.pathname !== "/app") navigate("/app");
    setTimeout(() => {
      const ok = STEPS.filter((s) => !s.sel || visible(document.querySelector(s.sel)));
      setSteps(ok); setI(0);
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
    const t = setTimeout(begin, 1600);
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
        className="absolute rounded-2xl border border-white/15 bg-[#101a34]/[0.97] p-5 text-offwhite shadow-[0_20px_50px_rgba(0,0,0,.45)] backdrop-blur-xl transition-all duration-300"
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
