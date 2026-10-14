// Idées = boîte d'entrée : ce qui n'est pas encore décidé. Une idée décidée devient
// une action ou un objectif du Plan d'action (statut « realisee »), une seule fois.
export const STATUTS = [
  { id: "idee", label: "À explorer", color: "#4a6a9e", desc: "Une piste, pas encore décidée." },
  { id: "test", label: "À tester", color: "#4AC0E0", desc: "On vérifie que ça vaut le coup avant de s'engager." },
];
export const REALISEE = { id: "realisee", label: "Réalisée", color: "#2FB89A", desc: "Devenue une action ou un objectif du Plan d'action." };

// Anciennes idées en « Projet » / « Action » (avant la fusion) : traitées comme « À tester ».
export const statutAffiche = (id) => (id === "projet" || id === "action" ? "test" : id);
export const statutMeta = (id) => (id === "realisee" ? REALISEE : STATUTS.find((s) => s.id === statutAffiche(id)) || STATUTS[0]);

export const scoreLabel = (score) => {
  if (score >= 2) return { label: "Quick win", tone: "text-emerald-300" };
  if (score >= 1) return { label: "Équilibré", tone: "text-gold" };
  return { label: "Coûteux", tone: "text-offwhite/50" };
};
