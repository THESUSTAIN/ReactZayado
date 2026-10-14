/* Mémoire (Ma Foi) : logique pure, sans React ni réseau, pour pouvoir la tester.
   - révision espacée (J+1, J+3, J+7, J+14, J+30),
   - mode jeu : XP, niveaux, série de jours, badges, quête du jour,
   - catalogue de versets alimenté par les données de l'appli (Lecture biblique, thèmes de la Sagesse,
     parcours de 7 jours, versets personnels de l'utilisateur). */
import { cleDuJour, versetsLecture, themesSagesse, parcours, themeDuJour } from "./thesustainData";

export const INTERVALLES = [1, 3, 7, 14, 30]; // jours avant la prochaine révision, selon le niveau atteint
export const NIVEAU_MAX = INTERVALLES.length;
export const XP = { reussi: 20, premiere: 10, partiel: 5, quete: 15 };
export const SEUIL_REUSSITE = 0.9; // part des mots à retrouver pour considérer le verset « su »
export const SEUIL_PARTIEL = 0.5;
export const TAILLE_QUETE = 3;

// ───── Outils de texte ─────
export const nettoyer = (t) => String(t || "").replace(/[«»"“”]/g, "").replace(/\s+/g, " ").trim();
export const mots = (t) => nettoyer(t).split(" ").filter(Boolean);
export const norm = (m) => m.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,;:!?()'’\-—]/g, "");

const MOTS_VIDES = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "et", "à", "au", "aux", "qui", "que", "ce", "cet",
  "cette", "ces", "il", "elle", "ils", "elles", "je", "tu", "nous", "vous", "en", "sur", "dans", "par",
  "pour", "ne", "pas", "est", "sont", "avec", "son", "sa", "ses", "mon", "ma", "mes", "ton", "ta", "tes", "se",
]);
export function motsCles(texte, max = 7) {
  const liste = texte.replace(/[«»"“”.,;:!?()]/g, "").split(/\s+/)
    .filter((m) => m.length > 2 && !MOTS_VIDES.has(m.toLowerCase()));
  return [...new Set(liste)].slice(0, max);
}

// Plus longue suite de mots communs : dit quels mots ont été oubliés sans punir un petit décalage.
export function comparer(original, saisi) {
  const a = mots(original).filter((m) => norm(m)), b = mots(saisi).filter((m) => norm(m));
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    dp[i][j] = norm(a[i]) === norm(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const justes = new Set();
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (norm(a[i]) === norm(b[j])) { justes.add(i); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return { mots: a, justes, total: n, nb: justes.size, ratio: n ? justes.size / n : 0 };
}

// ───── Dates ─────
export const jourPlus = (cle, n) => {
  const d = new Date(`${cle}T12:00:00`);
  d.setDate(d.getDate() + n);
  return cleDuJour(d);
};
export const ecartJours = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 86400000);

// ───── Catalogue de versets (données de l'appli) ─────
export function catalogue(perso = []) {
  const vus = new Set();
  const sortie = [];
  const ajouter = (ref, text, source) => {
    const r = String(ref || "").trim();
    const t = String(text || "").trim();
    if (!r || !t || vus.has(r)) return;
    vus.add(r);
    sortie.push({ ref: r, text: t, source });
  };
  versetsLecture.forEach((v) => ajouter(v.ref, v.text, "Lecture biblique"));
  themesSagesse.forEach((t) => ajouter(t.reference, t.verse, "Sagesse"));
  parcours.forEach((p) => p.days.forEach((d) => ajouter(d.reference, d.passage, `Parcours · ${p.title}`)));
  (perso || []).forEach((v) => ajouter(v.ref, v.text, "Mon verset"));
  return sortie;
}

// ───── État ─────
export const jeuParDefaut = () => ({
  xp: 0, jours: [], meilleure_serie: 0, badges: [], quetes: 0, quete_jour: null, perso: [], mode_jeu: true,
});

export function normaliserJeu(brut) {
  const d = jeuParDefaut();
  if (!brut || typeof brut !== "object") return d;
  return {
    xp: Number.isFinite(brut.xp) ? Math.max(0, Math.floor(brut.xp)) : 0,
    jours: Array.isArray(brut.jours) ? [...new Set(brut.jours.filter((x) => typeof x === "string"))].sort().slice(-120) : [],
    meilleure_serie: Number.isFinite(brut.meilleure_serie) ? brut.meilleure_serie : 0,
    badges: Array.isArray(brut.badges) ? brut.badges.filter((b) => b && typeof b.id === "string") : [],
    quetes: Number.isFinite(brut.quetes) ? brut.quetes : 0,
    quete_jour: typeof brut.quete_jour === "string" ? brut.quete_jour : null,
    perso: Array.isArray(brut.perso) ? brut.perso.filter((v) => v && v.ref && v.text).slice(0, 50) : [],
    mode_jeu: brut.mode_jeu !== false,
  };
}

export const normaliserProgress = (brut) => (brut && typeof brut === "object" && !Array.isArray(brut) ? brut : {});

// ───── Révision espacée ─────
export function marquerRecite(progress, ref, reussi, jour = cleDuJour()) {
  const prev = (progress || {})[ref] || { niveau: 0, fois: 0 };
  const niveau = reussi ? Math.min((prev.niveau || 0) + 1, NIVEAU_MAX) : 0;
  const delai = reussi ? INTERVALLES[niveau - 1] : 1; // échec : on retente demain
  return {
    ...(progress || {}),
    [ref]: {
      niveau, fois: (prev.fois || 0) + 1, dernier: jour,
      dernier_ok: reussi ? jour : prev.dernier_ok || null,
      prochain: jourPlus(jour, delai),
    },
  };
}

export const versetsARevoir = (progress, jour = cleDuJour()) =>
  Object.entries(progress || {})
    .filter(([, v]) => v && v.prochain && v.prochain <= jour)
    .sort((x, y) => (x[1].prochain < y[1].prochain ? -1 : 1))
    .map(([ref]) => ref);

// nouveau · encours (pas encore réussi) · appris (programmé) · revoir (échéance atteinte) · maitrise
export function statut(p, jour = cleDuJour()) {
  if (!p) return "nouveau";
  if (p.prochain && p.prochain <= jour) return "revoir";
  if ((p.niveau || 0) >= NIVEAU_MAX) return "maitrise";
  if (!p.dernier_ok) return "encours";
  return "appris";
}
export const STATUTS = {
  nouveau: "Nouveau", encours: "En cours", appris: "Appris", revoir: "À revoir", maitrise: "Maîtrisé",
};

export const nbSus = (progress) => Object.values(progress || {}).filter((p) => p && p.dernier_ok).length;
export const nbMaitrises = (progress) => Object.values(progress || {}).filter((p) => p && (p.niveau || 0) >= NIVEAU_MAX).length;

// ───── Niveaux, série ─────
export const TITRES = ["Débutant", "Semeur", "Disciple", "Veilleur", "Bâtisseur", "Gardien de la Parole"];
const seuil = (n) => 50 * (n - 1) * (n - 1); // niveau 1 : 0 · 2 : 50 · 3 : 200 · 4 : 450 · 5 : 800…
export function niveauJoueur(xp) {
  const n = Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
  const debut = seuil(n), fin = seuil(n + 1);
  return {
    niveau: n, titre: TITRES[Math.min(n - 1, TITRES.length - 1)], xp,
    xpDansNiveau: xp - debut, xpPourSuivant: fin - debut, part: (xp - debut) / (fin - debut),
  };
}

export function serieEnCours(jours, jour = cleDuJour()) {
  const set = new Set(jours || []);
  let courant = set.has(jour) ? jour : jourPlus(jour, -1);
  let n = 0;
  while (set.has(courant)) { n++; courant = jourPlus(courant, -1); }
  return n;
}
function meilleureSerie(jours) {
  const l = [...new Set(jours || [])].sort();
  let best = 0, run = 0;
  l.forEach((j, i) => { run = i > 0 && ecartJours(l[i - 1], j) === 1 ? run + 1 : 1; best = Math.max(best, run); });
  return best;
}

// ───── Badges ─────
export const BADGES = [
  { id: "premier", titre: "Premier verset", desc: "Réciter un verset de mémoire", ok: (c) => c.sus >= 1 },
  { id: "cinq", titre: "Cinq versets", desc: "Savoir 5 versets", ok: (c) => c.sus >= 5 },
  { id: "dix", titre: "Dix versets", desc: "Savoir 10 versets", ok: (c) => c.sus >= 10 },
  { id: "maitre", titre: "Verset maîtrisé", desc: "Réussir un verset 5 fois, de plus en plus espacées", ok: (c) => c.maitrises >= 1 },
  { id: "serie3", titre: "3 jours de suite", desc: "Pratiquer 3 jours d'affilée", ok: (c) => c.meilleure >= 3 },
  { id: "serie7", titre: "Une semaine", desc: "Pratiquer 7 jours d'affilée", ok: (c) => c.meilleure >= 7 },
  { id: "quete", titre: "Quête accomplie", desc: "Terminer une quête du jour", ok: (c) => c.quetes >= 1 },
];

// ───── Quête du jour ─────
// Jusqu'à 3 versets : ceux déjà réussis aujourd'hui, puis ceux à revoir, puis le verset du jour, puis un nouveau.
export function construireQuete(progress, cat, jour = cleDuJour(), refDuJour = themeDuJour().reference) {
  const faits = Object.entries(progress || {}).filter(([, p]) => p && p.dernier_ok === jour).map(([r]) => r);
  const dus = versetsARevoir(progress, jour);
  const nouveaux = cat.filter((v) => !(progress || {})[v.ref]).slice(0, TAILLE_QUETE).map((v) => v.ref);
  const refs = [...new Set([...faits, ...dus, refDuJour, ...nouveaux].filter(Boolean))]
    .filter((r) => cat.some((v) => v.ref === r))
    .slice(0, TAILLE_QUETE);
  return refs.map((ref) => ({ ref, fait: ((progress || {})[ref] || {}).dernier_ok === jour }));
}

// ───── Une récitation ─────
// Renvoie le nouvel état + ce qu'il faut afficher (XP gagnés, badges, quête, prochaine révision).
export function appliquerRecitation(etat, { ref, ratio, cat, jour = cleDuJour() }) {
  const ok = ratio >= SEUIL_REUSSITE;
  const prev = (etat.progress || {})[ref];
  const deja = !!prev && prev.dernier_ok === jour;
  const progress = marquerRecite(etat.progress, ref, ok, jour);
  const jeu0 = normaliserJeu(etat.jeu);
  const niveauAvant = niveauJoueur(jeu0.xp);

  let gain = 0;
  const lignes = [];
  if (ok && !deja) {
    gain += XP.reussi; lignes.push({ label: "Verset su", xp: XP.reussi });
    if (!prev || !prev.dernier_ok) { gain += XP.premiere; lignes.push({ label: "Première fois", xp: XP.premiere }); }
  } else if (!ok && ratio >= SEUIL_PARTIEL) {
    gain += XP.partiel; lignes.push({ label: "Bon effort", xp: XP.partiel });
  }

  const jours = [...new Set([...jeu0.jours, jour])].sort().slice(-120);
  const serie = serieEnCours(jours, jour);
  const jeu = { ...jeu0, jours, meilleure_serie: Math.max(jeu0.meilleure_serie, meilleureSerie(jours)), xp: jeu0.xp + gain };

  const quete = construireQuete(progress, cat, jour);
  const queteFaite = quete.length > 0 && quete.every((q) => q.fait);
  let queteNouvelle = false;
  if (queteFaite && jeu.quete_jour !== jour) {
    queteNouvelle = true;
    jeu.quete_jour = jour; jeu.quetes += 1; jeu.xp += XP.quete; gain += XP.quete;
    lignes.push({ label: "Quête du jour accomplie", xp: XP.quete });
  }

  const ctx = { sus: nbSus(progress), maitrises: nbMaitrises(progress), meilleure: jeu.meilleure_serie, quetes: jeu.quetes };
  const deja_obtenus = new Set(jeu.badges.map((b) => b.id));
  const nouveaux = BADGES.filter((b) => !deja_obtenus.has(b.id) && b.ok(ctx));
  jeu.badges = [...jeu.badges, ...nouveaux.map((b) => ({ id: b.id, date: jour }))];

  const niveauApres = niveauJoueur(jeu.xp);
  return {
    etat: { progress, jeu },
    resultat: {
      ok, ratio, gain, lignes, serie, deja, nouveauxBadges: nouveaux, queteNouvelle,
      niveauAvant, niveauApres, niveauSup: niveauApres.niveau > niveauAvant.niveau,
      prochain: progress[ref].prochain, niveauVerset: progress[ref].niveau,
    },
  };
}

export const libelleDelai = (prochain, jour = cleDuJour()) => {
  const n = ecartJours(jour, prochain);
  if (n <= 0) return "aujourd'hui";
  if (n === 1) return "demain";
  return `dans ${n} jours`;
};
