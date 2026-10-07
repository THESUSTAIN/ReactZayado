import { CalendarDays, Calculator, FileText, Handshake, Home, Palmtree, Settings2, Timer, UserRound, Users } from "lucide-react";
import { entMoi, entApercu, entReprise, fetchBoardsPartages } from "@/lib/kairosApi";

// Les sections de « Ton entreprise », affichées DANS le menu principal de l'appli (rail à gauche sur PC, barre du bas
// sur téléphone) quand on est dans l'espace entreprise — pas dans un second menu à l'intérieur de la page.
// L'assistant n'y est pas : il s'ouvre avec la bulle de chat de l'en-tête.
export const SECTIONS_ENTREPRISE = [
  { key: "aujourdhui", nom: "Aujourd'hui", Icon: Home, droit: null },
  { key: "pieces", nom: "Pièces", nomMembre: "Mes pièces", Icon: FileText, droit: "saisir_soi", alerte: (a) => (a?.pieces_a_fournir || 0) + (a?.pieces_a_verifier || 0) },
  { key: "planning", nom: "Planning", Icon: CalendarDays, droit: null, alerte: (a) => a?.plannings_a_regarder || 0 },
  { key: "chrono", nom: "Temps de travail", Icon: Timer, droit: "saisir_soi" },
  { key: "absences", nom: "Absences", Icon: Palmtree, droit: "saisir_soi", alerte: (a) => a?.absences_a_decider || 0 },
  { key: "decompte", nom: "Décompte du mois", Icon: Calculator, droit: "saisir_soi" },
  { key: "dossier", nom: "Mes infos", Icon: UserRound, droit: "saisir_soi" },
  // Ce que l'entreprise PARTAGE avec l'équipe (Radar, Vision) n'est PLUS une
  // entrée de menu : ça faisait deux boutons de plus pour des écrans qu'on
  // consulte, pas qu'on remplit. C'est désormais présenté dans « Aujourd'hui »,
  // d'où on ouvre le détail. Le menu ne garde que ce sur quoi on agit.
  { key: "equipe", nom: "Équipe", Icon: Users, droit: null },
  { key: "reprise", nom: "Acquisition & transmission", nomMembre: "Mon acquisition", Icon: Handshake, droit: "reprise" },
  { key: "reglages", nom: "Réglages", Icon: Settings2, droit: "parametres" },
];

let _cache = null;
let _cacheT = 0;
// Une seule lecture pour le rail, la barre du bas et la page (30 s de cache)
export async function chargerEspaceEntreprise(force = false) {
  if (!force && _cache && Date.now() - _cacheT < 30000) return _cache;
  const moi = await entMoi();
  let apercu = null;
  let reprises = [];
  let boards = [];
  if (moi?.actif) {
    [apercu, reprises, boards] = await Promise.all([entApercu().catch(() => null), entReprise().then((r) => r.dossiers || []).catch(() => []),
      fetchBoardsPartages().then((r) => r.boards || []).catch(() => [])]);
  }
  _cache = { moi, apercu, reprises, boards };
  _cacheT = Date.now();
  return _cache;
}
export const oublierEspaceEntreprise = () => { _cache = null; };

export function sectionsVisibles(espace) {
  const d = espace?.moi?.droits || {};
  if (!espace?.moi?.actif) return [];
  const ok = (s) => {
    // Visible pour le conseiller Zayado (c'est son outil de travail) ET pour le
    // client qui a au moins un dossier accompagné. Avant, le conseiller devait
    // sortir de l'espace entreprise et passer par un menu personnel.
    if (s.droit === "reprise") return Boolean(espace.moi?.conseiller) || (espace.reprises || []).length > 0;
    if (s.droit === "radar") return Boolean(espace.moi?.marque?.partage_radar) && espace.moi?.role !== "partenaire";
    if (s.droit === "vision") return (espace.boards || []).length > 0;  // seulement si des boards sont partagés avec moi
    return !s.droit || d[s.droit];
  };
  return SECTIONS_ENTREPRISE.filter(ok)
    .map((s) => ({ ...s, libelle: !d.gerer_equipe && s.nomMembre ? s.nomMembre : s.nom, nb: s.alerte ? s.alerte(espace.apercu) : 0 }));
}
