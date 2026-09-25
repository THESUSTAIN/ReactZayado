import { createBoard, saveBoard, fetchState, fetchObjectifs } from "@/lib/kairosApi";

// Modèle « Carte mentale » : un board prêt à compléter, en arborescence connectée.
// Au centre ta vision, 4 branches (clients, offre, chiffres, énergie), et sous
// chaque branche des sous-idées reliées par des lignes. Tout reste modifiable.
const L = (t) => ({ fr: t, en: t });
let n = 0;
const id = (p) => `${p}_${Date.now().toString(36)}_${(n++).toString(36)}`;

export function construireCarteMentale({ vision, objectifs = [], entreprise } = {}) {
  const CX = 2900, CY = 1900;
  const centre = { id: id("mm"), type: "sticky", x: CX - 150, y: CY - 100, w: 300, h: 200, rotate: 0, stickyColor: "sand",
    label: "MA VISION", body: L(vision || (entreprise ? `${entreprise} : où je veux aller` : "Où je veux emmener mon activité")) };
  const obj = objectifs.map((o) => o.titre).filter(Boolean);
  const branches = [
    { titre: "Mes clients", couleur: "blue", dx: -390, dy: -250, sous: ["Qui j'aide exactement ?", "Où je les trouve (Radar, réseau, prescripteurs)", "Ce qu'ils me disent le plus souvent"] },
    { titre: "Mon offre", couleur: "green", dx: 390, dy: -250, sous: ["Mon offre signature", "Mon prix et pourquoi il est juste", "Ce qui me rend différent"] },
    { titre: "Mes chiffres", couleur: "orange", dx: -390, dy: 250, sous: obj.length ? obj.slice(0, 3) : ["CA mensuel visé", "Nombre de clients visé", "Échéance"] },
    { titre: "Mon énergie", couleur: "pink", dx: 390, dy: 250, sous: ["Ce qui me recharge", "Ce que je délègue ou j'arrête", "Mon rituel de la semaine"] },
  ];
  const cartes = [centre];
  const lignes = [];
  branches.forEach((b) => {
    const bx = CX + b.dx, by = CY + b.dy;
    const br = { id: id("mm"), type: "sticky", x: bx - 105, y: by - 75, w: 210, h: 150, rotate: 0, stickyColor: b.couleur, label: b.titre.toUpperCase(), body: L("") };
    cartes.push(br);
    lignes.push({ id: id("line"), type: "line", from: centre.id, to: br.id });
    const sens = Math.sign(b.dx);
    b.sous.forEach((texte, i) => {
      const sx = bx + sens * 300, sy = by + (i - 1) * 105 + Math.sign(b.dy) * 40;
      const s = { id: id("mm"), type: "note", x: sx - 120, y: sy - 35, w: 240, title: L(texte), body: L("") };
      cartes.push(s);
      lignes.push({ id: id("line"), type: "line", from: br.id, to: s.id });
    });
  });
  return [...cartes, ...lignes];
}

/** Crée un board « Carte mentale » pré-rempli et renvoie sa clé. */
export async function creerCarteMentale() {
  const [etat, objectifs] = await Promise.all([
    fetchState().catch(() => ({})),
    fetchObjectifs().then((d) => d.items || d || []).catch(() => []),
  ]);
  const v = etat?.vision || {};
  const b = await createBoard({ nom: "Carte mentale", emoji: "🧠" });
  const key = b.key || b.board?.key;
  await saveBoard(construireCarteMentale({
    vision: (v.texte || v.pourquoi || "").slice(0, 160),
    objectifs: Array.isArray(objectifs) ? objectifs : [],
    entreprise: v.contexte_metier?.entreprise,
  }), key);
  return { key };
}

/** Modèle « Cockpit stratégique » : 6 murs reliés en direct (objectifs, finances, actions, énergie, idées). */
export async function creerCockpitStrategique() {
  const { cockpitTemplate } = await import("@/components/vision/cockpitTemplate");
  const b = await createBoard({ nom: "Cockpit stratégique", emoji: "📊" });
  const key = b.key || b.board?.key;
  await saveBoard(cockpitTemplate({ originX: 140, originY: 160 }), key);
  return { key };
}
