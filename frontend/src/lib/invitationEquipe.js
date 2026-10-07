// Mémorise l'invitation « Ton entreprise » le temps d'une connexion (e-mail, Microsoft ou Google).
// Pourquoi localStorage et pas sessionStorage : après Microsoft/Google, ou en ouvrant le lien magique
// depuis un autre onglet, la page repart de zéro. Sans cette mémoire, l'invité arriverait sur son
// compte sans jamais rejoindre l'équipe. L'invitation expire après 48 h.
const CLE = "zayado_invitation_equipe";
const DUREE_MS = 48 * 3600 * 1000;

export const URL_REJOINDRE = "/app/entreprise/rejoindre";
export const urlRejoindre = (token) => (token ? `${URL_REJOINDRE}?token=${encodeURIComponent(token)}` : URL_REJOINDRE);

export function garderInvitation(token) {
  try { localStorage.setItem(CLE, JSON.stringify({ token, t: Date.now() })); } catch { /* stockage indisponible : le lien reste valable */ }
}

export function lireInvitation() {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return "";
    const { token, t } = JSON.parse(brut);
    if (!token || Date.now() - t > DUREE_MS) { localStorage.removeItem(CLE); return ""; }
    return String(token);
  } catch { return ""; }
}

export function oublierInvitation() {
  try { localStorage.removeItem(CLE); } catch { /* rien */ }
}
