import {
  catalogue, comparer, marquerRecite, versetsARevoir, statut, niveauJoueur, serieEnCours,
  construireQuete, appliquerRecitation, normaliserJeu, jeuParDefaut, INTERVALLES, jourPlus,
} from "./memoireLogic";

const J = "2026-10-03";
const cat = catalogue([{ ref: "Mon verset 1", text: "Texte perso." }]);

test("catalogue : versets de l'appli + versets perso, sans doublon", () => {
  const refs = cat.map((v) => v.ref);
  expect(new Set(refs).size).toBe(refs.length);
  expect(refs).toContain("Jean 3:16");
  expect(refs).toContain("Mon verset 1");
  expect(cat.length).toBeGreaterThan(30);
});

test("comparer : tolère accents, majuscules, ponctuation ; signale les oublis", () => {
  expect(comparer("« Je puis tout par celui qui me fortifie. »", "je puis tout par celui qui me fortifie").ratio).toBe(1);
  const r = comparer("Je puis tout par celui qui me fortifie", "je puis tout fortifie");
  expect(r.nb).toBe(4);
  expect(r.total).toBe(8);
});

test("révision espacée J+1, J+3, J+7, J+14, J+30 ; échec = demain", () => {
  let p = {};
  const attendus = INTERVALLES;
  attendus.forEach((n, i) => {
    p = marquerRecite(p, "X", true, J);
    expect(p.X.niveau).toBe(i + 1);
    expect(p.X.prochain).toBe(jourPlus(J, n));
  });
  p = marquerRecite(p, "X", false, J);
  expect(p.X.niveau).toBe(0);
  expect(p.X.prochain).toBe(jourPlus(J, 1));
  expect(p.X.dernier_ok).toBe(J);
});

test("statuts", () => {
  expect(statut(undefined, J)).toBe("nouveau");
  expect(statut(marquerRecite({}, "A", false, J).A, J)).toBe("encours");
  expect(statut(marquerRecite({}, "A", true, J).A, J)).toBe("appris");
  expect(statut(marquerRecite({}, "A", true, jourPlus(J, -5)).A, J)).toBe("revoir");
  let p = {}; for (let i = 0; i < 5; i++) p = marquerRecite(p, "A", true, J);
  expect(statut(p.A, J)).toBe("maitrise");
});

test("niveaux et série", () => {
  expect(niveauJoueur(0).niveau).toBe(1);
  expect(niveauJoueur(50).niveau).toBe(2);
  expect(niveauJoueur(199).niveau).toBe(2);
  expect(niveauJoueur(200).niveau).toBe(3);
  expect(serieEnCours([jourPlus(J, -2), jourPlus(J, -1), J], J)).toBe(3);
  expect(serieEnCours([jourPlus(J, -2), jourPlus(J, -1)], J)).toBe(2); // pas encore pratiqué aujourd'hui : la série tient
  expect(serieEnCours([jourPlus(J, -3)], J)).toBe(0);
});

test("récitation : XP, première fois, pas de farm dans la journée, badges", () => {
  let etat = { progress: {}, jeu: jeuParDefaut() };
  let r = appliquerRecitation(etat, { ref: "Jean 3:16", ratio: 1, cat, jour: J });
  expect(r.resultat.ok).toBe(true);
  expect(r.resultat.gain).toBe(30); // 20 + 10 première fois
  expect(r.etat.jeu.xp).toBe(30);
  expect(r.resultat.nouveauxBadges.map((b) => b.id)).toContain("premier");
  etat = r.etat;
  r = appliquerRecitation(etat, { ref: "Jean 3:16", ratio: 1, cat, jour: J });
  expect(r.resultat.deja).toBe(true);
  expect(r.resultat.gain).toBe(0);
  r = appliquerRecitation(etat, { ref: "Romains 8:28", ratio: 0.6, cat, jour: J });
  expect(r.resultat.ok).toBe(false);
  expect(r.resultat.gain).toBe(5);
  r = appliquerRecitation(etat, { ref: "Romains 8:28", ratio: 0.2, cat, jour: J });
  expect(r.resultat.gain).toBe(0);
});

test("quête du jour : 3 versets max, bonus une seule fois", () => {
  let etat = { progress: {}, jeu: jeuParDefaut() };
  let q = construireQuete(etat.progress, cat, J, "Proverbes 16:3");
  expect(q.length).toBe(3);
  expect(q.every((x) => !x.fait)).toBe(true);
  let bonus = 0;
  q.forEach((x) => {
    const r = appliquerRecitation(etat, { ref: x.ref, ratio: 1, cat, jour: J });
    etat = r.etat;
    if (r.resultat.queteNouvelle) bonus++;
  });
  expect(bonus).toBe(1);
  expect(etat.jeu.quetes).toBe(1);
  expect(etat.jeu.badges.map((b) => b.id)).toContain("quete");
  const apres = appliquerRecitation(etat, { ref: q[0].ref, ratio: 1, cat, jour: J });
  expect(apres.resultat.queteNouvelle).toBe(false);
});

test("versets à revoir triés par échéance ; normaliserJeu robuste", () => {
  let p = marquerRecite({}, "A", true, jourPlus(J, -10));
  p = marquerRecite(p, "B", true, jourPlus(J, -4));
  expect(versetsARevoir(p, J)).toEqual(["A", "B"]);
  expect(normaliserJeu("n'importe quoi").mode_jeu).toBe(true);
  expect(normaliserJeu({ xp: -5, mode_jeu: false }).xp).toBe(0);
  expect(normaliserJeu({ mode_jeu: false }).mode_jeu).toBe(false);
});
