import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sun, Moon, Sunrise, Flame, CalendarCheck, Clock3, ShoppingBag, Zap, LayoutList } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/**
 * CockpitGreeting — en-tete emotionnel dynamique du Cockpit (fusion InspirationScreen).
 * Remplace le "Bonjour Julien" statique par un accueil vivant, nourri par les
 * vraies donnees (streak, progres de la semaine, derniere connexion).
 * Inclut : bouton Boutique distinct (badge Nouveau) + bascule
 * Resume express / Vue complete + animation d'entree premium.
 */

const BOUTIQUE_URL = "https://zayado.net/boutique";

function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function relativeLastLogin(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 2) return null;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 1) return `Revu il y a ${diffMin} min`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 1) return `Dernier passage il y a ${diffH} h`;
  if (diffD === 1) return "Content de te revoir \u2014 a hier !";
  if (diffD <= 6) return `Content de te revoir apres ${diffD} jours`;
  return "Ravi de te retrouver";
}

export default function CockpitGreeting({ data = {}, expressMode, setExpressMode }) {
  const navigate = useNavigate();
  const { user } = useAuth() || { user: null };

  const now = new Date();
  const h = now.getHours();
  const isNight = h < 5;
  const isMorning = h >= 5 && h < 12;
  const isEvening = h >= 18;
  const greetWord = isNight ? "Bonne nuit" : h < 18 ? "Bonjour" : "Bonsoir";
  const GreetIcon = isNight ? Moon : isMorning ? Sunrise : isEvening ? Moon : Sun;

  const firstName =
    capitalize((user?.name || data?.user?.first_name || data?.first_name || "").trim().split(" ")[0]) || "";

  const gs = data?.greeting_stats || {};
  const streak = Number(gs.streak_days || 0);
  const weekDone = Number(gs.week_done || 0);
  const weekTotal = Number(gs.week_total || 0);
  const lastLoginLabel = relativeLastLogin(gs.last_login);

  const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const chips = [];
  if (streak > 0) {
    chips.push({ key: "streak", icon: Flame, color: "#F59E0B", text: `${streak} jour${streak > 1 ? "s" : ""} d'affilee \uD83D\uDD25` });
  }
  if (weekTotal > 0) {
    chips.push({ key: "week", icon: CalendarCheck, color: "#5DCAA5", text: `${weekDone}/${weekTotal} taches cette semaine` });
  }
  if (lastLoginLabel) {
    chips.push({ key: "login", icon: Clock3, color: "#9db4d8", text: lastLoginLabel });
  }
  if (chips.length === 0) {
    chips.push({ key: "date", icon: CalendarCheck, color: "#9db4d8", text: capitalize(dateStr) });
  }

  const container = {
    hidden: { opacity: 0, y: -14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.07, delayChildren: 0.08 } },
  };
  const child = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <motion.div
      data-testid="cockpit-greeting"
      variants={container}
      initial="hidden"
      animate="show"
      className="glass-card"
      style={{
        padding: "16px 20px", marginBottom: 14,
        border: "1px solid rgba(201,164,73,0.28)",
        background: "linear-gradient(135deg, rgba(201,164,73,0.08), rgba(30,58,138,0.14))",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 16, flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 240, flex: 1 }}>
        <motion.div variants={child} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 36, height: 36, borderRadius: 11, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg, #C9A449, #D6A85F)",
              boxShadow: "0 6px 16px rgba(201,164,73,0.35)", color: "#0B1F3A",
            }}
          >
            <GreetIcon size={19} />
          </span>
          <h2 data-testid="cockpit-greeting-title" style={{ fontSize: 22, fontWeight: 700, color: "var(--txt)", margin: 0, lineHeight: 1.15 }}>
            {greetWord}{firstName ? `, ${firstName}` : ""}{" \uD83D\uDC4B"}
          </h2>
        </motion.div>

        <motion.div variants={child} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {chips.map(({ key, icon: Ic, color, text }) => (
            <span
              key={key}
              data-testid={`cockpit-chip-${key}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 12, fontWeight: 600, color: "var(--txt)",
                background: "var(--glass-soft)", border: "1px solid var(--glass-border)",
                padding: "5px 11px", borderRadius: 999,
              }}
            >
              <Ic size={13} style={{ color }} />
              {text}
            </span>
          ))}
        </motion.div>
      </div>

      <motion.div variants={child} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          data-testid="cockpit-boutique-btn"
          onClick={() => window.open(BOUTIQUE_URL, "_blank", "noopener,noreferrer")}
          title="Decouvrir la Boutique Zayado"
          style={{
            position: "relative", display: "inline-flex", alignItems: "center", gap: 7,
            height: 38, padding: "0 16px", borderRadius: 999,
            border: "1px solid rgba(201,164,73,0.55)",
            background: "rgba(201,164,73,0.16)", color: "var(--gold-strong, #B8860B)",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            transition: "transform .15s, box-shadow .2s, background .2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(201,164,73,0.3)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
        >
          <ShoppingBag size={15} />
          Boutique
          <span
            style={{
              position: "absolute", top: -8, right: -6,
              fontSize: 9, fontWeight: 800, letterSpacing: "0.05em",
              color: "#0B1F3A", background: "#5DCAA5",
              padding: "2px 7px", borderRadius: 999, textTransform: "uppercase",
              boxShadow: "0 3px 8px rgba(93,202,165,0.4)",
            }}
          >
            Nouveau
          </span>
        </button>

        <div
          data-testid="cockpit-view-toggle"
          style={{
            display: "inline-flex", alignItems: "center", gap: 2,
            background: "var(--glass-soft)", border: "1px solid var(--glass-border)",
            borderRadius: 999, padding: 3,
          }}
        >
          <button
            type="button"
            data-testid="cockpit-toggle-express"
            onClick={() => setExpressMode && setExpressMode(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              height: 30, padding: "0 12px", borderRadius: 999, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 700,
              background: expressMode ? "#C9A449" : "transparent",
              color: expressMode ? "#0B1F3A" : "var(--txt-muted)",
              transition: "background .18s, color .18s",
            }}
            title="Vue 30 secondes : l'essentiel uniquement"
          >
            <Zap size={13} /> Express
          </button>
          <button
            type="button"
            data-testid="cockpit-toggle-full"
            onClick={() => setExpressMode && setExpressMode(false)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              height: 30, padding: "0 12px", borderRadius: 999, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 700,
              background: !expressMode ? "#C9A449" : "transparent",
              color: !expressMode ? "#0B1F3A" : "var(--txt-muted)",
              transition: "background .18s, color .18s",
            }}
            title="Vue complete : tous les modules du cockpit"
          >
            <LayoutList size={13} /> Complete
          </button>
        </div>

        <button
          type="button"
          data-testid="cockpit-focus-btn"
          onClick={() => { try { sessionStorage.setItem("zayado_focus_mode", "1"); } catch { /* noop */ } window.location.reload(); }}
          title="Activer le mode focus (vue allégée)"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            height: 36, padding: "0 14px", borderRadius: 999,
            border: "1px solid var(--glass-border)", background: "var(--glass-soft)",
            color: "var(--txt)", fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}
        >
          <Zap size={13} /> Mode focus
        </button>

      </motion.div>
    </motion.div>
  );
}
