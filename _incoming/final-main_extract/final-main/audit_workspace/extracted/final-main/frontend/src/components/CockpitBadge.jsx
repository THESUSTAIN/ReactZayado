import React, { useEffect, useMemo, useState } from "react";
import { Rocket } from "lucide-react";
import axios from "axios";
import { API, getUid } from "@/lib/api";
import { usePrefs } from "@/context/PrefsContext";
import { useAuth } from "@/context/AuthContext";

/**
 * Badge doré discret "Cockpit X/8" affiché dans le Header.
 * - S'affiche uniquement pour les utilisateurs connectés (pas guest)
 *   dont la checklist n'est pas complète et pas dismiss.
 * - Cliquable → réouvre la modale via l'event global `zayado:open-checklist`
 *   (écouté dans AppShell).
 * - Se cache automatiquement quand 8/8 ou dismiss.
 */
export default function CockpitBadge() {
  const { prefs } = usePrefs();
  const { user, guest } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!user || guest) return;
    axios.get(`${API}/dashboard?user_id=${encodeURIComponent(getUid())}`)
      .then((r) => setData(r.data))
      .catch(() => setData({}));
    const onRefresh = () => {
      axios.get(`${API}/dashboard?user_id=${encodeURIComponent(getUid())}`)
        .then((r) => setData(r.data)).catch(() => {});
    };
    window.addEventListener("zayado:refresh-checklist", onRefresh);
    return () => window.removeEventListener("zayado:refresh-checklist", onRefresh);
  }, [user, guest]);

  const doneCount = useMemo(() => {
    if (!data) return 0;
    const board = data?.vision_board || {};
    const profile = data?.profile || {};
    const items = [
      Boolean(prefs.inspiration_photo || board.ikigai_citation || board.mission || data?.vision_phrase),
      Array.isArray(data?.trajectoire) && data.trajectoire.length > 0,
      Boolean(prefs.inspiration_photo),
      Boolean(profile?.name && profile?.email),
      prefs.notifications_enabled === true || prefs.push_enabled === true,
      (Array.isArray(data?.livrables) && data.livrables.length > 0)
        || (data?.projects_count && data.projects_count > 0),
      Boolean(data?.first_action_done)
        || (Array.isArray(data?.programme_jour) && data.programme_jour.some((a) => a?.done)),
      prefs.explored_modules === true,
    ];
    return items.filter(Boolean).length;
  }, [data, prefs]);

  const total = 8;

  // Conditions d'affichage : logged-in, pas dismiss, pas 8/8, data chargée
  if (!user || guest) return null;
  if (prefs.cockpit_checklist_dismissed) return null;
  if (data === null) return null;
  if (doneCount >= total) return null;

  return (
    <button
      data-testid="cockpit-badge"
      onClick={() => window.dispatchEvent(new CustomEvent("zayado:open-checklist"))}
      title="Configure ton cockpit"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 11px",
        borderRadius: 999,
        border: "1px solid rgba(201,164,73,0.4)",
        background: "linear-gradient(135deg, rgba(201,164,73,0.16), rgba(214,168,95,0.08))",
        color: "#C9A449",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        transition: "background 0.2s, transform 0.15s, border-color 0.2s",
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "linear-gradient(135deg, rgba(201,164,73,0.26), rgba(214,168,95,0.14))";
        e.currentTarget.style.borderColor = "rgba(201,164,73,0.65)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "linear-gradient(135deg, rgba(201,164,73,0.16), rgba(214,168,95,0.08))";
        e.currentTarget.style.borderColor = "rgba(201,164,73,0.4)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <Rocket size={12} />
      <span>Cockpit {doneCount}/{total}</span>
    </button>
  );
}
