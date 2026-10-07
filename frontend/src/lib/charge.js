// ── La charge du jour : UNE seule règle, pour toute l'application ──
//
// Bien-être calculait un verdict (« Charge suggérée : Légère — une seule tâche
// essentielle aujourd'hui »), et le Plan d'action l'ignorait complètement : il
// affichait les douze mêmes actions, comme si rien n'avait été dit. L'application
// promet de construire « sans s'épuiser » ; sans ce lien, le Bien-être n'était
// qu'un tableau de bord décoratif à côté du vrai travail.
//
// La règle vit ici et nulle part ailleurs. Deux copies qui divergent, c'est un
// écran qui dit « protège ta journée » pendant qu'un autre en demande douze.
//
// Aucun chiffre inventé : tout vient du check-in du jour. Sans check-in, pas de
// verdict (null) — on ne devine pas l'état de quelqu'un.

export function verdictDuJour(vitals) {
  const { energy: e, clarte: c, stress: st } = vitals || {};
  if (e == null) return null;
  // Le check-in est noté sur 5 ; l'anneau du plan parle en pourcentage.
  const energie = Math.round((e / 5) * 100);
  if (e <= 2 || (st != null && st >= 4)) {
    return {
      cle: "legere", energie,
      charge: "Légère",
      couleur: "#B9524E",
      phrase: "Énergie basse ou stress élevé : on protège ta journée.",
      conseils: ["Aucune décision importante aujourd'hui", "Une seule tâche essentielle", "Une vraie pause de 20 min"],
      mot: "On ralentit pour mieux repartir.",
      // Combien d'actions le co-pilote assume de te proposer aujourd'hui.
      actions: 1,
    };
  }
  if (e >= 4 && (c == null || c >= 4) && (st == null || st <= 2)) {
    return {
      cle: "soutenue", energie,
      charge: "Soutenue",
      couleur: "#3E7D5A",
      phrase: "Énergie et clarté au rendez-vous : c'est ta fenêtre pour le sérieux.",
      conseils: ["Ta décision stratégique, avant midi", "Confie 3 tâches répétitives à l'IA", "Protège 2 h sans notifications"],
      mot: "Ce soir, tu seras content·e d'avoir osé.",
      actions: 5,
    };
  }
  return {
    cle: "moderee", energie,
    charge: "Modérée",
    couleur: "#B38A4E",
    phrase: "Une journée correcte : garde l'important pour ta meilleure heure.",
    conseils: ["1 décision importante maximum", "3 tâches à valider (15 min)", "Garde l'après-midi pour le léger"],
    mot: "On ralentit pour décider juste.",
    actions: 3,
  };
}

// Lit le check-in du jour depuis la réponse de /state, en ne gardant QUE celui
// d'aujourd'hui : un check-in d'hier ne doit pas piloter la journée en cours.
export function vitalsDuJour(state) {
  const today = new Date().toISOString().slice(0, 10);
  const v = state?.energy?.vitals;
  const duJour = Boolean(v && v.date === today);
  return {
    energy: state?.energy?.a_checkin && duJour ? state.energy.score : null,
    stress: duJour ? v.stress : null,
    sleep: duJour ? v.sommeil : null,
    load: duJour ? v.charge : null,
    clarte: duJour ? (v.clarte ?? null) : null,
  };
}
