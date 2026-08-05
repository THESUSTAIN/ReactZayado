import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Check, ChevronRight, X, Sparkles, Target, User, Bell,
  FolderPlus, Compass, Zap, Rocket,
} from "lucide-react";
import { usePrefs } from "@/context/PrefsContext";

/**
 * Modale "Configure ton cockpit X/8"
 *
 * Ouverte automatiquement après la connexion (une fois par session tant que non complétée).
 * L'utilisateur peut :
 *  - cliquer sur une étape → navigation vers le bon écran (modale se ferme).
 *  - fermer avec la croix ou "Plus tard" → n'apparaît plus dans cette session.
 *  - cocher "Ne plus me montrer" → dismiss permanent (persisté dans prefs).
 * Ne s'ouvre jamais si toutes les étapes (8/8) sont complétées.
 */
export default function CockpitChecklist({ open, onClose, data }) {
  const { prefs, setPref } = usePrefs();
  const navigate = useNavigate();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // ─── Détection automatique des items complétés ───
  const items = useMemo(() => {
    const board = data?.vision_board || {};
    const profile = data?.profile || {};
    return [
      {
        id: "vision",
        label: "Définir ma vision",
        desc: "Écris ta phrase de vision ou ton ikigaï",
        Icon: Compass,
        done: Boolean(prefs.inspiration_photo || board.ikigai_citation || board.mission || data?.vision_phrase),
        action: () => navigate("/vision-board"),
      },
      {
        id: "objectifs",
        label: "Fixer mes objectifs",
        desc: "Trajectoire à 4 caps",
        Icon: Target,
        done: Array.isArray(data?.trajectoire) && data.trajectoire.length > 0,
        action: () => navigate("/pilotage"),
      },
      {
        id: "photo",
        label: "Photo d'inspiration",
        desc: "Ajoute ton image qui te motive",
        Icon: Sparkles,
        done: Boolean(prefs.inspiration_photo),
        action: () => navigate("/parametres"),
      },
      {
        id: "profil",
        label: "Compléter mon profil",
        desc: "Nom + email affichés dans le cockpit",
        Icon: User,
        done: Boolean(profile?.name && profile?.email),
        action: () => navigate("/parametres"),
      },
      {
        id: "notifications",
        label: "Activer les notifications",
        desc: "Ne rate aucun rappel important",
        Icon: Bell,
        done: prefs.notifications_enabled === true || prefs.push_enabled === true,
        action: () => navigate("/parametres"),
      },
      {
        id: "projet",
        label: "Créer mon 1ᵉʳ projet",
        desc: "Valide une idée ou lance un livrable",
        Icon: FolderPlus,
        done: (Array.isArray(data?.livrables) && data.livrables.length > 0)
          || (data?.projects_count && data.projects_count > 0),
        action: () => navigate("/validation/new"),
      },
      {
        id: "action",
        label: "Cocher ma 1ʳᵉ action",
        desc: "Une petite victoire aujourd'hui",
        Icon: Zap,
        done: Boolean(data?.first_action_done)
          || (Array.isArray(data?.programme_jour) && data.programme_jour.some((a) => a?.done)),
        action: () => navigate("/pilotage"),
      },
      {
        id: "explorer",
        label: "Explorer les modules",
        desc: "Croissance, Bien-être, Bureau…",
        Icon: Rocket,
        done: prefs.explored_modules === true,
        action: () => {
          setPref({ explored_modules: true });
          navigate("/croissance");
        },
      },
    ];
  }, [data, prefs, navigate, setPref]);

  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = Math.round((doneCount / total) * 100);
  const allDone = doneCount === total;

  const handleClose = () => {
    if (dontShowAgain) setPref({ cockpit_checklist_dismissed: true });
    onClose?.();
  };

  const handleItemClick = (action) => {
    onClose?.();
    action?.();
  };

  if (!open || allDone) return null;

  return (
    <AnimatePresence>
      <motion.div
        data-testid="cockpit-checklist-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 900,
          background: "rgba(11,31,58,0.72)",
          backdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16, overflow: "auto",
        }}
      >
        <motion.div
          initial={{ y: 24, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 12, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 620,
            maxHeight: "88vh",
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(135deg, rgba(30,58,138,0.35), rgba(11,31,58,0.9))",
            border: "1px solid rgba(201,164,73,0.35)",
            borderRadius: 22,
            boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }}
        >
          {/* ─── HEADER ─── */}
          <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid rgba(246,242,234,0.08)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: 44, height: 44, borderRadius: 12,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "linear-gradient(135deg, rgba(201,164,73,0.3), rgba(201,164,73,0.1))",
                    border: "1px solid rgba(201,164,73,0.35)",
                    flexShrink: 0,
                  }}
                >
                  <Rocket size={22} style={{ color: "#C9A449" }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#F6F2EA", margin: 0 }}>
                      Configure ton cockpit
                    </h2>
                    <span
                      data-testid="cockpit-checklist-progress"
                      className="zchip"
                      style={{
                        fontSize: 12,
                        background: "rgba(201,164,73,0.22)",
                        color: "#C9A449",
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: 999,
                      }}
                    >
                      {doneCount}/{total}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(246,242,234,0.65)", margin: "4px 0 0", lineHeight: 1.5 }}>
                    Prends 3 minutes pour prendre tes marques et débloquer tout le potentiel de ton cockpit.
                  </p>
                </div>
              </div>
              <button
                data-testid="cockpit-checklist-close"
                onClick={handleClose}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "rgba(246,242,234,0.65)", padding: 6, display: "flex",
                  alignItems: "center", flexShrink: 0, borderRadius: 8,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(246,242,234,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                title="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Progress bar */}
            <div
              style={{
                marginTop: 16, height: 6, borderRadius: 999,
                background: "rgba(246,242,234,0.08)", overflow: "hidden",
              }}
            >
              <motion.div
                data-testid="cockpit-checklist-bar"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, #C9A449, #D6A85F)",
                  boxShadow: "0 0 12px rgba(201,164,73,0.4)",
                }}
              />
            </div>
          </div>

          {/* ─── LISTE DES ÉTAPES ─── */}
          <div style={{ padding: "16px 24px", overflowY: "auto", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map(({ id, label, desc, Icon, done, action }) => (
                <button
                  key={id}
                  data-testid={`cockpit-check-${id}`}
                  onClick={() => !done && handleItemClick(action)}
                  disabled={done}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: 12,
                    border: done
                      ? "1px solid rgba(94,138,90,0.35)"
                      : "1px solid rgba(246,242,234,0.1)",
                    background: done
                      ? "rgba(94,138,90,0.08)"
                      : "rgba(11,31,58,0.35)",
                    cursor: done ? "default" : "pointer",
                    textAlign: "left",
                    transition: "background 0.2s, transform 0.15s, border-color 0.2s",
                    opacity: done ? 0.7 : 1,
                    width: "100%",
                  }}
                  onMouseEnter={(e) => {
                    if (!done) {
                      e.currentTarget.style.background = "rgba(11,31,58,0.55)";
                      e.currentTarget.style.borderColor = "rgba(201,164,73,0.35)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!done) {
                      e.currentTarget.style.background = "rgba(11,31,58,0.35)";
                      e.currentTarget.style.borderColor = "rgba(246,242,234,0.1)";
                    }
                  }}
                >
                  <div
                    style={{
                      width: 34, height: 34, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: done ? "#5e8a5a" : "rgba(201,164,73,0.15)",
                      flexShrink: 0,
                      transition: "background 0.3s",
                    }}
                  >
                    {done
                      ? <Check size={17} style={{ color: "#F6F2EA" }} />
                      : <Icon size={16} style={{ color: "#C9A449" }} />}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p
                      style={{
                        fontSize: 13.5, fontWeight: 600, margin: 0,
                        color: "#F6F2EA",
                        textDecoration: done ? "line-through" : "none",
                      }}
                    >
                      {label}
                    </p>
                    <p style={{
                      fontSize: 11.5, margin: "2px 0 0", lineHeight: 1.4,
                      color: "rgba(246,242,234,0.6)",
                    }}>
                      {desc}
                    </p>
                  </div>
                  {!done && <ChevronRight size={16} style={{ color: "rgba(246,242,234,0.5)", flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          </div>

          {/* ─── FOOTER ─── */}
          <div
            style={{
              padding: "14px 24px 18px",
              borderTop: "1px solid rgba(246,242,234,0.08)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, flexWrap: "wrap",
            }}
          >
            <label
              data-testid="cockpit-checklist-dont-show"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                fontSize: 12.5, color: "rgba(246,242,234,0.65)",
                cursor: "pointer", userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                style={{ accentColor: "#C9A449", cursor: "pointer" }}
              />
              Ne plus me montrer cette checklist
            </label>
            <button
              data-testid="cockpit-checklist-later"
              onClick={handleClose}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "9px 20px", borderRadius: 999,
                border: "1px solid rgba(246,242,234,0.2)",
                background: "transparent", color: "#F6F2EA",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(246,242,234,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              Plus tard
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
