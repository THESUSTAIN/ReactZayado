/**
 * Modèle « Cockpit Vision A → Z » — murs numérotés façon Storyflow,
 * pré-remplis de cartes LIVE branchées sur les données pro de l'utilisateur
 * (objectifs, actions, énergie, finances, idées) + quelques notes-règles
 * que l'utilisateur réécrit à sa façon.
 */
export const WALL_COLORS = ["#A78BFA", "#34D399", "#FBBF24", "#60A5FA", "#2DD4BF", "#F472B6", "#94A3B8", "#DEC2A3"];

export function cockpitTemplate({ originX = 140, originY = 140 } = {}) {
  const t = Date.now();
  let n = 0;
  const id = () => `cp_${t}_${n++}`;
  const note = (title, body, labels = []) => ({ type: "note", title: { fr: title, en: title }, body: { fr: body, en: body }, labels });
  const live = (source) => ({ type: "live", source });

  // Ordre pensé « entrepreneur » : le sens, le cap, l'argent, l'action, l'énergie, la suite.
  const walls = [
    ["Vision & Pourquoi", [live("score"), live("vision"), note("Ma boussole", "Quand j'hésite, je me demande : **est-ce que ça me rapproche de la vie que je décris ici ?** Si non, c'est non.", ["Cap"])]],
    ["Objectifs du trimestre", [live("alertes"), live("objectifs"), live("trajectoire"), note("La règle des 3 priorités", "Trois objectifs maximum par trimestre, tout le reste attend. Chaque mission acceptée doit servir **au moins un** de ces objectifs.", ["Focus"])]],
    ["Finances", [live("finances"), live("suivi")]],
    ["Missions & Actions", [live("actions"), note("Pipeline sain", "Maximum **2 missions en parallèle**. Si une troisième arrive, je négocie une date plutôt que de remplir le week-end.", ["Règle"])]],
    ["Énergie & Santé", [live("energie"), live("roue"), note("Mes non-négociables", "[ ] Dormir 7h+ cette semaine\n[ ] Bouger 3 fois\n[ ] Une vraie pause déjeuner sans écran", ["Vigilance"])]],
    ["Idées & Victoires", [live("victoires"), live("idees")]],
  ];

  const items = [{
    id: id(), type: "heading", x: originX, y: originY - 10, w: 1200,
    // {prenom} est remplacé à l'affichage par le prénom du profil (données live)
    text: "Le cockpit de {prenom} · Vision A → Z",
  }];

  walls.forEach(([title, cards], i) => {
    const wallId = id();
    items.push({ id: wallId, type: "wall", x: originX + i * 540, y: originY + 90, w: 500, title, color: WALL_COLORS[i % WALL_COLORS.length] });
    cards.forEach((c, k) => items.push({ id: id(), parent: wallId, order: k, tags: [], ...c }));
  });
  return items;
}
