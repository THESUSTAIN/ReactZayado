// Marchés (pays) : une seule liste pour l'onboarding, les Paramètres et la fenêtre de réglages.
// Les pastilles montrent les pays les plus fréquents ; « Autre pays » ouvre la liste complète.
export const MARCHES_PRINCIPAUX = [
  ["france", "France"], ["belgique", "Belgique"], ["italie", "Italie"], ["royaume_uni", "Royaume-Uni"],
  ["senegal", "Sénégal"], ["cote_ivoire", "Côte d'Ivoire"], ["maroc", "Maroc"],
];

// Tous les autres pays (clé = nom en minuscules, sans accent, espaces → « _ »).
const NOMS = [
  "Afrique du Sud", "Algérie", "Allemagne", "Andorre", "Angola", "Arabie saoudite", "Argentine", "Australie", "Autriche",
  "Bénin", "Brésil", "Bulgarie", "Burkina Faso", "Burundi", "Cameroun", "Canada", "Cap-Vert", "Centrafrique", "Chili", "Chine",
  "Chypre", "Colombie", "Comores", "Congo", "Congo (RDC)", "Corée du Sud", "Croatie", "Danemark", "Djibouti", "Égypte",
  "Émirats arabes unis", "Espagne", "Estonie", "États-Unis", "Éthiopie", "Finlande", "Gabon", "Ghana", "Grèce", "Guinée",
  "Guinée équatoriale", "Guinée-Bissau", "Haïti", "Hongrie", "Inde", "Irlande", "Islande", "Israël", "Japon", "Kenya",
  "Lettonie", "Liban", "Lituanie", "Luxembourg", "Madagascar", "Malte", "Mali", "Maurice", "Mauritanie", "Mexique", "Monaco",
  "Niger", "Nigeria", "Norvège", "Nouvelle-Zélande", "Pays-Bas", "Pologne", "Portugal", "Qatar", "Roumanie", "Rwanda",
  "Seychelles", "Slovaquie", "Slovénie", "Suède", "Suisse", "Tchad", "Tchéquie", "Togo", "Tunisie", "Turquie", "Ukraine",
  "Vietnam",
];
const cle = (nom) => nom.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/\(rdc\)/, "rdc").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
export const AUTRES_PAYS = NOMS.map((n) => [n === "Congo (RDC)" ? "congo_rdc" : cle(n), n]);

export const TOUS_LES_PAYS = [...MARCHES_PRINCIPAUX, ...AUTRES_PAYS];
export const libellePays = (k, repli = "") => TOUS_LES_PAYS.find(([v]) => v === k)?.[1] || repli || k;
export const estPrincipal = (k) => MARCHES_PRINCIPAUX.some(([v]) => v === k);
