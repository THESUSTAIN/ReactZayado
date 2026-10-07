/* Mémoire (Ma Foi) : état partagé par toute l'appli (page Mémoire, Lecture biblique, Sagesse, accueil Ma Foi).
   Avant : la progression était lue par plusieurs hooks indépendants (ils pouvaient s'écraser) et envoyée au serveur
   sous la clé « memoire_versets », que le serveur refusait : rien n'était enregistré sur le compte.
   Ici : un seul état, enregistré sur le COMPTE (clés « memoire_progress » et « memoire_jeu »), avec reprise unique
   de ce qui était resté dans le navigateur. */
import { useEffect, useSyncExternalStore } from "react";
import { getToken, saveFoiEtat } from "@/lib/kairosApi";
import { chargerEtat } from "./store";
import {
  catalogue, appliquerRecitation, normaliserJeu, normaliserProgress, jeuParDefaut,
} from "./memoireLogic";

const LS = { progress: "zayado_mafoi_memoire_progress", ancien: "zayado_mafoi_memoire_versets", jeu: "zayado_mafoi_memoire_jeu" };
const CLE = { progress: "memoire_progress", jeu: "memoire_jeu" };

let etat = { progress: {}, jeu: jeuParDefaut(), pret: false };
let jeton = null;
let chargement = null;
const abonnes = new Set();
const minuteurs = {};
const enAttente = {};

const emettre = () => { etat = { ...etat }; abonnes.forEach((f) => f()); };
const lireLocal = (k) => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch { return null; } };
const ecrireLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };
const vide = (o) => !o || typeof o !== "object" || Object.keys(o).length === 0;

function envoyer(cle) {
  if (!(cle in enAttente)) return;
  const valeur = enAttente[cle];
  delete enAttente[cle];
  saveFoiEtat(cle, valeur).catch(() => { /* réessayé à la prochaine modification */ });
}
function sauver(type) {
  const cle = CLE[type];
  const valeur = etat[type];
  ecrireLocal(LS[type], valeur);
  if (!getToken()) return;
  enAttente[cle] = valeur;
  clearTimeout(minuteurs[cle]);
  minuteurs[cle] = setTimeout(() => envoyer(cle), 500);
}
if (typeof document !== "undefined") {
  // Quitter la page ou changer d'onglet ne doit pas faire perdre la dernière récitation.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") Object.keys(enAttente).forEach(envoyer);
  });
}

function charger() {
  const t = getToken();
  if (!t) return Promise.resolve();
  if (jeton !== t) {
    jeton = t; chargement = null;
    etat = { progress: {}, jeu: jeuParDefaut(), pret: false };
  }
  if (!chargement) {
    chargement = chargerEtat().then((serveur) => {
      let progress = normaliserProgress(serveur && serveur[CLE.progress]);
      let jeu = serveur && serveur[CLE.jeu];
      let reprise = false;
      if (vide(progress)) {
        const local = normaliserProgress(lireLocal(LS.progress) || lireLocal(LS.ancien));
        if (!vide(local)) { progress = local; reprise = true; }
      }
      if (vide(jeu)) {
        const local = lireLocal(LS.jeu);
        if (!vide(local)) { jeu = local; reprise = true; }
      }
      etat = { progress, jeu: normaliserJeu(jeu), pret: true };
      emettre();
      if (reprise) { sauver("progress"); sauver("jeu"); }
    }).catch(() => {
      chargement = null;
      etat = { ...etat, pret: true };
      emettre();
    });
  }
  return chargement;
}

const sabonner = (f) => { abonnes.add(f); return () => abonnes.delete(f); };
const instantane = () => etat;

export function useMemoire() {
  const e = useSyncExternalStore(sabonner, instantane, instantane);
  useEffect(() => { charger(); }, []);
  return e;
}

// ───── Actions ─────
export function reciter(ref, ratio) {
  const cat = catalogue(etat.jeu.perso);
  const { etat: suivant, resultat } = appliquerRecitation(etat, { ref, ratio, cat });
  etat = { ...etat, ...suivant };
  sauver("progress"); sauver("jeu"); emettre();
  return resultat;
}

export function changerModeJeu(actif) {
  etat = { ...etat, jeu: { ...etat.jeu, mode_jeu: !!actif } };
  sauver("jeu"); emettre();
}

export function ajouterVersetPerso(ref, text) {
  const r = String(ref || "").trim().slice(0, 60);
  const t = String(text || "").trim().slice(0, 600);
  if (!r || !t) return { ok: false, raison: "Indique la référence et le texte du verset." };
  if (catalogue(etat.jeu.perso).some((v) => v.ref.toLowerCase() === r.toLowerCase())) return { ok: false, raison: "Ce verset est déjà dans ta liste." };
  if (etat.jeu.perso.length >= 50) return { ok: false, raison: "Tu as atteint 50 versets personnels." };
  etat = { ...etat, jeu: { ...etat.jeu, perso: [...etat.jeu.perso, { ref: r, text: t }] } };
  sauver("jeu"); emettre();
  return { ok: true, ref: r };
}

export function supprimerVersetPerso(ref) {
  const { [ref]: _retire, ...reste } = etat.progress;
  etat = { ...etat, progress: reste, jeu: { ...etat.jeu, perso: etat.jeu.perso.filter((v) => v.ref !== ref) } };
  sauver("progress"); sauver("jeu"); emettre();
}
