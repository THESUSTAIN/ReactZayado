import { getToken, setToken } from "./kairosApi";

const API = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;

// Appel JSON avec le jeton de l'utilisateur. Sur une erreur, lève une Error dont
// .message est le texte lisible du backend et .erreurs la liste détaillée (422 fiche produit).
export async function call(path, method = "GET", body) {
  const token = getToken();
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch { /* corps vide */ }
  if (r.status === 401) {
    setToken(null);
    if (window.location.pathname !== "/login") window.location.assign("/login");
  }
  if (!r.ok) {
    const d = data && data.detail;
    const err = new Error(typeof d === "string" ? d : (d && d.message) || `Erreur ${r.status}`);
    err.erreurs = (d && d.erreurs) || [];
    err.status = r.status;
    throw err;
  }
  return data;
}

// URL absolue d'une image IA générée (lue directement par <img>, sans en-tête).
export const imageIaUrl = (id) => `${API}/vision/images/${id}`;
