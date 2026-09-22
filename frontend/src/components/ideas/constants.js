export const STATUTS = [
  { id: "idee", label: "Idée", color: "#4a6a9e", desc: "Une piste à explorer." },
  { id: "test", label: "Test", color: "#4AC0E0", desc: "On vérifie que ça vaut le coup." },
  { id: "projet", label: "Projet", color: "#DEC2A3", desc: "Une initiative structurée, liée à un objectif." },
  { id: "action", label: "Action", color: "#2FB89A", desc: "Une tâche concrète, liée à un objectif." },
];

export const statutMeta = (id) => STATUTS.find((s) => s.id === id) || STATUTS[0];

export const scoreLabel = (score) => {
  if (score >= 2) return { label: "Quick win", tone: "text-emerald-300" };
  if (score >= 1) return { label: "Équilibré", tone: "text-gold" };
  return { label: "Coûteux", tone: "text-offwhite/50" };
};
