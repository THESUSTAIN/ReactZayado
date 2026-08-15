import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

export const getKpis = () => api.get("/kpis").then((r) => r.data);
export const getTresorerieHistory = () => api.get("/pilotage/tresorerie-history").then((r) => r.data);
export const getDecision = () => api.get("/pilotage/decision").then((r) => r.data);
export const simulatePilotage = (payload) => api.post("/pilotage/simulate", payload).then((r) => r.data);
export const getHealthScore = () => api.get("/pilotage/health-score").then((r) => r.data);
export const exportCsvUrl = () => `${API}/pilotage/export.csv`;
export const getFactures = () => api.get("/factures").then((r) => r.data);
export const createFacture = (d) => api.post("/factures", d).then((r) => r.data);
export const updateFacture = (id, d) => api.put(`/factures/${id}`, d).then((r) => r.data);
export const deleteFacture = (id) => api.delete(`/factures/${id}`).then((r) => r.data);

export const getDepenses = () => api.get("/depenses").then((r) => r.data);
export const createDepense = (d) => api.post("/depenses", d).then((r) => r.data);
export const deleteDepense = (id) => api.delete(`/depenses/${id}`).then((r) => r.data);

export const getObjectifs = () => api.get("/objectifs").then((r) => r.data);
export const createObjectif = (d) => api.post("/objectifs", d).then((r) => r.data);
export const updateObjectif = (id, d) => api.put(`/objectifs/${id}`, d).then((r) => r.data);
export const deleteObjectif = (id) => api.delete(`/objectifs/${id}`).then((r) => r.data);
export const objectifToAction = (id) => api.post(`/objectifs/${id}/to-action`).then((r) => r.data);

export const getSwot = () => api.get("/vision/swot").then((r) => r.data);
export const generateSwot = () => api.post("/vision/swot/generate").then((r) => r.data);
export const getVisionDocument = () => api.get("/vision/document").then((r) => r.data);
export const generateVisionDocument = () => api.post("/vision/document/generate").then((r) => r.data);

export const getVision = () => api.get("/vision").then((r) => r.data);
export const setVision = (value) => api.put("/vision", { key: "vision", value }).then((r) => r.data);

export const getRituels = () => api.get("/rituels").then((r) => r.data);
export const createRituel = (d) => api.post("/rituels", d).then((r) => r.data);
export const toggleRituel = (id) => api.put(`/rituels/${id}/toggle`).then((r) => r.data);
export const deleteRituel = (id) => api.delete(`/rituels/${id}`).then((r) => r.data);

export const getHumeur = () => api.get("/humeur").then((r) => r.data);
export const createHumeur = (d) => api.post("/humeur", d).then((r) => r.data);

export const getKairosHistory = (session = "default") =>
  api.get(`/kairos/history?session_id=${session}`).then((r) => r.data);

export const uploadKairosAttachment = (file, session = "default") => {
  const form = new FormData();
  form.append("file", file);
  return api.post(`/kairos/upload?session_id=${session}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);
};

export const executeKairosAction = (action) =>
  api.post("/kairos/execute-action", action).then((r) => r.data);

export const getProfile = () => api.get("/settings/profile").then((r) => r.data);
export const setProfile = (first_name) => api.put("/settings/profile", { first_name }).then((r) => r.data);
export const getReminders = () => api.get("/settings/reminders").then((r) => r.data);
export const setReminders = (weekly_review) => api.put("/settings/reminders", { weekly_review }).then((r) => r.data);
export const getInspiration = () => api.get("/settings/inspiration").then((r) => r.data);
export const setInspirationImage = (image_url) => api.put("/settings/inspiration", { image_url }).then((r) => r.data);

export const seed = () => api.post("/seed").then((r) => r.data);

export async function streamKairos({ message, session = "default", context, attachmentIds = [], onToken, onDone }) {
  const res = await fetch(`${API}/kairos/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: session, context, attachment_ids: attachmentIds }),
  });
  if (!res.ok) throw new Error(`Kairos error ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    full += chunk;
    onToken && onToken(full);
  }
  onDone && onDone(full);
  return full;
}

// --- Panneau de chat complet (copilote) : upload persistant, historique,
// brief du jour, veille, "travailler avec l'équipe". ---
export const getChatHistory = (session = "default") =>
  api.get(`/chat/messages?session_id=${encodeURIComponent(session)}`).then((r) => r.data);

export async function uploadChatFile(file, session = "default") {
  const form = new FormData();
  form.append("file", file);
  const response = await api.post(`/chat/uploads?session_id=${encodeURIComponent(session)}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function streamChatMessage({ message, session = "default", context, uploadIds = [], onToken, onDone }) {
  const res = await fetch(`${API}/chat/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: session, context, upload_ids: uploadIds }),
  });
  if (!res.ok) {
    let detail = `Chat error ${res.status}`;
    try { detail = (await res.json())?.detail || detail; } catch { /* réponse non JSON */ }
    throw new Error(detail);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onToken && onToken(full);
  }
  onDone && onDone(full);
  return full;
}

export const getCopilotBrief = (session = "default") =>
  api.get(`/chat/brief?session_id=${encodeURIComponent(session)}`).then((r) => r.data);

export const getCopilotConfig = () => api.get("/chat/config").then((r) => r.data);

export const getCopilotDecision = (session = "default") =>
  api.get(`/chat/decision?session_id=${encodeURIComponent(session)}`).then((r) => r.data);

export const applyCopilotDecision = ({ id, session = "default", decision }) =>
  api.post(`/chat/decision/${id}`, { session_id: session, decision }).then((r) => r.data);

export const getCopilotNews = (session = "default") =>
  api.get(`/chat/news-digest?session_id=${encodeURIComponent(session)}`).then((r) => r.data);

export const sendCopilotWorkRequest = ({ session = "default", message, channel = "chat", contact = "" }) =>
  api.post("/chat/work-request", { session_id: session, message, channel, contact }).then((r) => r.data);

export const euro = (n) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
