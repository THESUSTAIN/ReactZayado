import React from "react";
import { Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/**
 * Badge d'essai — branché sur user.trial_days_left (backend).
 *
 * Règles :
 *   - Guest (mode aperçu) → masqué
 *   - Utilisateur payant (plan != "free") → masqué
 *   - Utilisateur free avec essai actif → "X j d'essai gratuit restants"
 *   - Utilisateur free avec essai terminé → "Essai terminé — choisir un plan"
 *
 * La durée d'essai est configurée côté backend via env TRIAL_DURATION_DAYS (défaut 14).
 * Le clic redirige vers /parametres (page plans & facturation).
 */
export default function TrialBadge() {
  const navigate = useNavigate();
  const { user, guest } = useAuth();

  // Masqué pour les invités et les utilisateurs payants
  if (!user || guest) return null;
  if (user.plan && user.plan !== "free") return null;

  const daysLeft = user.trial_days_left;
  // Si le backend n'a pas fourni la valeur (ex: legacy), on masque le badge
  if (daysLeft === null || daysLeft === undefined) return null;

  const urgent = daysLeft <= 3;
  const ended = daysLeft <= 0 || user.trial_active === false;

  return (
    <button
      onClick={() => navigate("/parametres")}
      data-testid="trial-badge"
      title={ended ? "Votre période d'essai est terminée" : "Toutes les fonctionnalités, sans carte bancaire"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        height: 30, padding: "0 12px", borderRadius: 999,
        border: (ended || urgent) ? "1px solid rgba(224,80,80,0.4)" : "1px solid rgba(201,164,73,0.35)",
        background: (ended || urgent) ? "rgba(224,80,80,0.10)" : "rgba(201,164,73,0.10)",
        color: (ended || urgent) ? "#e05050" : "#C9A449",
        fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        flexShrink: 0,
      }}>
      <Clock size={13} />
      {ended
        ? "Essai terminé — choisir un plan"
        : `${daysLeft} j d'essai gratuit restants`}
    </button>
  );
}
