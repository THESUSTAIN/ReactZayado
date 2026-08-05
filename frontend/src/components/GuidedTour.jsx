import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Check, MousePointerClick } from "lucide-react";
import { markTourSeen } from "@/constants/tours";

/**
 * <GuidedTour>
 *
 * Vraie visite guidée avec SPOTLIGHT sur les vrais boutons.
 * Le backdrop est un SVG plein-écran avec un trou rectangulaire animé
 * autour de la cible. Un halo doré pulse autour du bouton et une
 * bulle-tooltip apparaît au bord, avec une petite flèche vers la cible.
 *
 *   props:
 *     - steps: Array<{selector, title, body, side?, pad?, centerFallback?, beforeShow?}>
 *     - onClose(): appelé à la fermeture (fin ou X)
 *     - path: pathname courant (pour marquer "vu" en localStorage)
 */
export default function GuidedTour({ steps, onClose, path }) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState(null);        // rect de la cible, ou null → mode centré
  const [tick, setTick] = useState(0);           // re-render forcé sur resize
  const [ready, setReady] = useState(false);
  const stepRef = useRef(null);                  // conserve le node ciblé pour cleanup pulse

  const step = steps[idx] || null;
  const isLast = idx >= steps.length - 1;

  // ── Résolution du sélecteur : essaie chaque partie séparée par "|"
  const resolveTarget = useCallback((selector) => {
    if (!selector) return null;
    const parts = selector.split("|").map(s => s.trim()).filter(Boolean);
    for (const s of parts) {
      try {
        const el = document.querySelector(s);
        if (el && el.getBoundingClientRect().width > 0) return el;
      } catch { /* invalid selector, skip */ }
    }
    return null;
  }, []);

  // ── Mesure la cible + gère la pulse animation
  const measure = useCallback(async () => {
    if (!step) return;
    setReady(false);
    if (step.beforeShow) {
      try { await step.beforeShow(); } catch { /* noop */ }
    }
    // laisse 60ms pour que le DOM se stabilise après beforeShow
    await new Promise(r => setTimeout(r, 60));
    // cleanup pulse précédent
    if (stepRef.current) {
      stepRef.current.classList.remove("zayado-tour-pulse");
      stepRef.current = null;
    }
    const el = resolveTarget(step.selector);
    if (el) {
      // scroll pour ramener la cible dans le viewport (avec marge)
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      // attendre la fin du scroll (approx 300ms)
      await new Promise(r => setTimeout(r, 350));
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      el.classList.add("zayado-tour-pulse");
      stepRef.current = el;
    } else {
      setRect(null); // → mode centré (fallback)
    }
    setReady(true);
  }, [step, resolveTarget]);

  useLayoutEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // Suivre resize et scroll pour repositionner le halo
  useEffect(() => {
    const onChange = () => setTick(t => t + 1);
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, []);

  useEffect(() => {
    if (!stepRef.current) return;
    const r = stepRef.current.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [tick]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      if (stepRef.current) {
        stepRef.current.classList.remove("zayado-tour-pulse");
        stepRef.current = null;
      }
    };
  }, []);

  const finish = useCallback((completed = true) => {
    if (completed && path) markTourSeen(path);
    onClose?.();
  }, [path, onClose]);

  // Escape pour fermer
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") finish(false);
      if (e.key === "ArrowRight" && !isLast) setIdx(i => i + 1);
      if (e.key === "ArrowLeft" && idx > 0) setIdx(i => i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, isLast, finish]);

  if (!step) return null;

  const pad = step.pad ?? 10;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;

  // Position du halo (spotlight) et de la tooltip
  const hasRect = !!rect;
  const spotTop = hasRect ? rect.top - pad : 0;
  const spotLeft = hasRect ? rect.left - pad : 0;
  const spotW = hasRect ? rect.width + pad * 2 : 0;
  const spotH = hasRect ? rect.height + pad * 2 : 0;

  // Choix intelligent du côté de la tooltip
  const TIP_W = Math.min(340, vw - 32);
  const TIP_ESTIMATE_H = 200; // estimation, la tooltip peut être un peu +/-
  let side = step.side || "auto";
  if (side === "auto") {
    if (!hasRect) side = "center";
    else if (rect.top > TIP_ESTIMATE_H + 24) side = "top";
    else if (vh - (rect.top + rect.height) > TIP_ESTIMATE_H + 24) side = "bottom";
    else if (rect.left > TIP_W + 24) side = "left";
    else side = "right";
  }

  // Position de la tooltip
  let tipStyle = { position: "fixed", zIndex: 10001, width: TIP_W };
  if (side === "center" || !hasRect) {
    tipStyle = { ...tipStyle, top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  } else if (side === "top") {
    tipStyle.top = Math.max(16, spotTop - TIP_ESTIMATE_H - 16);
    tipStyle.left = Math.max(16, Math.min(vw - TIP_W - 16, rect.left + rect.width / 2 - TIP_W / 2));
  } else if (side === "bottom") {
    tipStyle.top = Math.min(vh - TIP_ESTIMATE_H - 16, spotTop + spotH + 16);
    tipStyle.left = Math.max(16, Math.min(vw - TIP_W - 16, rect.left + rect.width / 2 - TIP_W / 2));
  } else if (side === "left") {
    tipStyle.left = Math.max(16, spotLeft - TIP_W - 16);
    tipStyle.top = Math.max(16, Math.min(vh - TIP_ESTIMATE_H - 16, rect.top + rect.height / 2 - TIP_ESTIMATE_H / 2));
  } else if (side === "right") {
    tipStyle.left = Math.min(vw - TIP_W - 16, spotLeft + spotW + 16);
    tipStyle.top = Math.max(16, Math.min(vh - TIP_ESTIMATE_H - 16, rect.top + rect.height / 2 - TIP_ESTIMATE_H / 2));
  }

  const arrowStyle = _arrowStyle(side, rect, pad, TIP_W);

  return createPortal(
    <>
      {/* ─── Backdrop assombri avec "trou" au niveau de la cible ─── */}
      <svg
        style={{
          position: "fixed", inset: 0, zIndex: 10000,
          width: "100vw", height: "100vh", pointerEvents: "none",
        }}
        data-testid="guided-tour-backdrop"
      >
        <defs>
          <mask id="zayado-tour-hole">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {hasRect && (
              <rect
                x={spotLeft} y={spotTop}
                width={spotW} height={spotH}
                rx="16" ry="16" fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(6, 18, 40, 0.78)"
          mask="url(#zayado-tour-hole)"
        />
        {/* Halo doré autour du trou */}
        {hasRect && ready && (
          <rect
            x={spotLeft - 4} y={spotTop - 4}
            width={spotW + 8} height={spotH + 8}
            rx="20" ry="20"
            fill="none"
            stroke="#C9A449"
            strokeWidth="2.5"
            style={{ filter: "drop-shadow(0 0 12px rgba(201,164,73,0.65))" }}
          >
            <animate attributeName="stroke-opacity" values="0.9;0.35;0.9" dur="1.8s" repeatCount="indefinite" />
          </rect>
        )}
      </svg>

      {/* ─── Tooltip ─── */}
      <div
        data-testid="guided-tour-tooltip"
        style={{
          ...tipStyle,
          background: "linear-gradient(180deg, rgba(11,31,58,0.98) 0%, rgba(9,26,50,0.98) 100%)",
          color: "#F0E6C9",
          border: "1px solid rgba(201,164,73,0.55)",
          borderRadius: 18,
          padding: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(201,164,73,0.15)",
          backdropFilter: "blur(6px)",
        }}
      >
        {/* Flèche */}
        {arrowStyle && <div style={arrowStyle} />}

        {/* Header : compteur + close */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 26, height: 26, borderRadius: 999,
              background: "#C9A449", color: "#0a1f4e",
              fontWeight: 800, fontSize: 12,
            }}>{idx + 1}</span>
            <span style={{ fontSize: 11.5, letterSpacing: 1, textTransform: "uppercase", color: "rgba(240,230,201,0.55)", fontWeight: 600 }}>
              Étape {idx + 1} sur {steps.length}
            </span>
          </div>
          <button
            data-testid="guided-tour-close"
            onClick={() => finish(false)}
            aria-label="Fermer la visite"
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,230,201,0.6)", padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Corps */}
        <h3 style={{ fontSize: 17, fontWeight: 700, color: "#FBEFC5", margin: "0 0 8px", lineHeight: 1.3 }}>
          {step.title}
        </h3>
        <p style={{ fontSize: 13.5, color: "rgba(240,230,201,0.82)", lineHeight: 1.55, margin: 0 }}>
          {step.body}
        </p>

        {/* Fallback: cible non trouvée */}
        {!hasRect && ready && (
          <p style={{
            marginTop: 10, padding: "8px 10px",
            background: "rgba(240,176,145,0.1)",
            border: "1px solid rgba(240,176,145,0.3)",
            borderRadius: 10, fontSize: 12, color: "#F0B091",
          }}>
            <MousePointerClick size={12} style={{ display: "inline", marginRight: 6 }} />
            Cette zone n'est pas visible sur cette page actuellement.
          </p>
        )}

        {/* Footer : navigation */}
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          {idx > 0 && (
            <button
              data-testid="guided-tour-prev"
              onClick={() => setIdx(i => i - 1)}
              style={_navBtn()}
            >
              <ChevronLeft size={14} /> Précédent
            </button>
          )}
          <div style={{ flex: 1 }} />
          {!isLast ? (
            <button
              data-testid="guided-tour-next"
              onClick={() => setIdx(i => i + 1)}
              style={_navBtnPrimary()}
            >
              Suivant <ChevronRight size={14} />
            </button>
          ) : (
            <button
              data-testid="guided-tour-finish"
              onClick={() => finish(true)}
              style={_navBtnPrimary()}
            >
              <Check size={14} /> Terminer
            </button>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

function _navBtn() {
  return {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "8px 14px", borderRadius: 999,
    background: "rgba(255,255,255,0.06)", color: "#F0E6C9",
    border: "1px solid rgba(201,164,73,0.35)",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  };
}
function _navBtnPrimary() {
  return {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "8px 16px", borderRadius: 999,
    background: "linear-gradient(180deg, #E5C887 0%, #C9A449 100%)",
    color: "#0a1f4e",
    border: "1px solid rgba(201,164,73,0.7)",
    fontSize: 13, fontWeight: 700, cursor: "pointer",
    boxShadow: "0 4px 14px rgba(201,164,73,0.35)",
  };
}

// Petit triangle flèche pointant vers la cible
function _arrowStyle(side, rect, pad, tipW) {
  if (!rect || side === "center") return null;
  const base = {
    position: "absolute",
    width: 0, height: 0,
    borderStyle: "solid",
    zIndex: 1,
  };
  const gold = "#C9A449";
  if (side === "top") {
    return {
      ...base,
      bottom: -8, left: "50%", transform: "translateX(-50%)",
      borderWidth: "8px 8px 0 8px",
      borderColor: `${gold} transparent transparent transparent`,
    };
  }
  if (side === "bottom") {
    return {
      ...base,
      top: -8, left: "50%", transform: "translateX(-50%)",
      borderWidth: "0 8px 8px 8px",
      borderColor: `transparent transparent ${gold} transparent`,
    };
  }
  if (side === "left") {
    return {
      ...base,
      right: -8, top: "50%", transform: "translateY(-50%)",
      borderWidth: "8px 0 8px 8px",
      borderColor: `transparent transparent transparent ${gold}`,
    };
  }
  if (side === "right") {
    return {
      ...base,
      left: -8, top: "50%", transform: "translateY(-50%)",
      borderWidth: "8px 8px 8px 0",
      borderColor: `transparent ${gold} transparent transparent`,
    };
  }
  return null;
}
