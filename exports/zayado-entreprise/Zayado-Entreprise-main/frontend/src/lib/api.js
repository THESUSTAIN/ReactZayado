const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export async function apiPost(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Erreur serveur");
  return data;
}

// Envoi un lead au backend (Mongo + Brevo). Ne casse jamais l'UX :
// si le backend est indisponible, on répond en mode démo.
export async function envoyerLead({ email, prenom = "", source = "site" }) {
  try {
    const data = await apiPost("/api/leads", { email, prenom, source });
    return { ok: true, ...data };
  } catch {
    return { ok: false, demo: true };
  }
}
