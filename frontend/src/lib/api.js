import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

const listOf = (payload, key = "items") => Array.isArray(payload) ? payload : (Array.isArray(payload?.[key]) ? payload[key] : []);
const asEnergyPercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n <= 5 ? Math.round(n * 20) : Math.round(Math.max(0, Math.min(100, n)));
};
const moodLabel = (mood) => ({ 1: "Épuisé", 2: "Fatigué", 3: "Bien", 4: "Motivé", 5: "En feu" })[Number(mood)] || "—";
const moodValue = (mood) => ({ "Épuisé": 1, "Fatigué": 2, "Bien": 3, "Motivé": 4, "En feu": 5 })[mood] || 3;
const priorityLabel = (priority) => ({ high: "Haute", medium: "Moyenne", normal: "Normale", low: "Basse", Haute: "Haute", Moyenne: "Moyenne", Normale: "Normale" })[priority] || "Normale";
const priorityValue = (priority) => ({ Haute: "high", Moyenne: "medium", Basse: "low", Normale: "normal", high: "high", medium: "medium", low: "low", normal: "normal" })[priority] || "normal";
const normalizeTask = (task = {}) => ({
  ...task,
  titre: task.titre || task.label || "Tâche sans titre",
  statut: task.done ? "Terminé" : task.in_progress ? "En cours" : "A faire",
  priorite: priorityLabel(task.priorite || task.priority),
});
const normalizeCheckin = (checkin = {}) => ({
  ...checkin,
  energie: asEnergyPercent(checkin.energie ?? checkin.energy),
  humeur: checkin.humeur || moodLabel(checkin.mood),
  date: checkin.date || checkin.created_at || null,
});
const normalizeHabit = (habit = {}) => ({
  ...habit,
  nom: habit.nom || habit.name || "Habitude",
  done: habit.done ?? habit.done_today ?? false,
  streak: Number(habit.streak || 0),
});

// Vrais comptes utilisateurs (auth.py) — jeton attaché automatiquement dès
// qu'une session est ouverte. Tant que rien n'est stocké (avant login),
// les appels partent sans en-tête — le backend répond 401 sur les routes
// protégées, comme attendu.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cours_auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Contrat Final-main réel : l'inscription utilise /api/auth/register.
export const authSignup = (email, password, first_name) =>
  api.post("/auth/register", { email, password, first_name }).then((r) => r.data);
export const authLogin = (email, password) =>
  api.post("/auth/login", { email, password }).then((r) => r.data);
export const authMe = () => api.get("/auth/me").then((r) => r.data);
// Le routeur alias Final-main est monté sous /api/onboarding. Le chemin
// /auth/onboarding n’existe pas et empêchait l’onboarding frontend de persister.
export const authOnboarding = (d) => api.post("/onboarding", d).then((r) => r.data);


export const getPilotageOverview = () => api.get("/pilotage/overview").then((r) => r.data);
export const getKpis = () => getPilotageOverview().then((data) => ({
  tresorerie: Number(data?.summary?.tresorerie || 0),
  chiffre_affaires: Number(data?.summary?.revenus || 0),
  marge_nette: Number(data?.summary?.marge || 0),
  resultat_net: Number((data?.kpis || []).find((item) => item.id === "net")?.value || 0),
  en_retard: Number(data?.pending_invoices || 0),
  total_depenses: Number((data?.kpis || []).find((item) => item.id === "depenses")?.value || 0),
}));
export const getTresorerieHistory = () => getPilotageOverview().then((data) => Array.isArray(data?.monthly) ? data.monthly.map((row) => ({ date: row.month || "—", tresorerie: Number(row.ca || 0) })) : []);
export const getDecision = () => api.get("/pilotage/decision").then((r) => r.data);
export const simulatePilotage = (payload) => api.post("/pilotage/simulate", payload).then((r) => r.data);
export const getHealthScore = () => api.get("/pilotage/health-score").then((r) => r.data);
export const exportCsvUrl = () => `${API}/pilotage/export.csv`;
export const getFactures = async () => [];
export const createFacture = (d) => api.post("/factures", d).then((r) => r.data);
export const updateFacture = (id, d) => api.put(`/factures/${id}`, d).then((r) => r.data);
export const deleteFacture = (id) => api.delete(`/factures/${id}`).then((r) => r.data);

export const getDepenses = async () => [];
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

export const getRituels = () => api.get("/wellness/habits").then((r) => listOf(r.data).map(normalizeHabit));
export const createRituel = (d) => api.post("/wellness/habits", { name: d.nom || d.name || "Habitude" }).then((r) => normalizeHabit(r.data));
export const toggleRituel = (id) => api.post(`/wellness/habits/${id}/toggle`).then((r) => normalizeHabit(r.data));
export const deleteRituel = (id) => api.delete(`/wellness/habits/${id}`).then((r) => r.data);

// Contrat Final-main réel : Bien-être est exposé sous /api/wellness.
export const getWellnessState = () => api.get("/wellness/state").then((r) => r.data);
export const getWellnessToday = () => api.get("/wellness/today").then((r) => r.data);
export const getWellnessHistory = (days = 30) => api.get(`/wellness/history?days=${encodeURIComponent(days)}`).then((r) => r.data);
export const getWellnessWeeklyReport = () => api.get("/wellness/weekly-report").then((r) => r.data);
export const createWellnessCheckin = (d) => api.post("/wellness/checkin", d).then((r) => r.data);
// Les pages historiques manipulent énergie 0-100 et libellés ; le serveur
// Wellness utilise une échelle clinique 1-5. Cette conversion est volontaire
// et ne fabrique aucune mesure supplémentaire.
export const getHumeur = () => getWellnessHistory().then((data) => listOf(data, "checkins").map(normalizeCheckin));
export const createHumeur = ({ energie, humeur, note }) => createWellnessCheckin({
  energy: Math.max(1, Math.min(5, Math.round(Number(energie || 60) / 20))),
  mood: moodValue(humeur),
  stress: Number(energie) <= 35 ? 4 : Number(energie) <= 65 ? 3 : 2,
  notes: note || null,
});

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
// MyExtension Campus s'appuie sur le moteur de simulation professionnel
// Final-main déjà disponible. Ces appels restent protégés par la session :
// aucune entreprise, mission ou évaluation n'est fabriquée côté interface.
export const getCampusSimulationState = () => api.get("/simulation/state").then((r) => r.data);
export const startCampusSimulation = ({ programme_label, diploma_level }) =>
  api.post("/simulation/start", { programme_label, diploma_level }).then((r) => r.data);
export const getCampusSimulationHistory = () => api.get("/simulation/history").then((r) => r.data);
export const submitCampusMission = (taskId, response_text) =>
  api.post(`/simulation/tasks/${taskId}/submit`, { response_text }).then((r) => r.data);
export const getReminders = () => api.get("/settings/reminders").then((r) => r.data);
export const setReminders = (weekly_review) => api.put("/settings/reminders", { weekly_review }).then((r) => r.data);
export const getInspiration = () => api.get("/settings/inspiration").then((r) => r.data);
export const setInspirationImage = (image_url) => api.put("/settings/inspiration", { image_url }).then((r) => r.data);
// Les préférences Actualité sont persistées par les réglages Growth Final-main.
export const getNewsPreferences = () => api.get("/growth/settings").then((r) => r.data);
export const setNewsPreferences = ({ sector, region, frequency_per_week = 1 }) => api.put("/growth/settings", { sector, region, frequency_per_week }).then((r) => r.data);

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

export async function uploadChatFile(file) {
  // Corrige un bug réel : appelait /chat/uploads (pluriel, avec session_id en
  // query param) — route qui n'existe pas côté serveur. Le vrai endpoint est
  // /chat/upload (singulier), authentifié par JWT (déjà géré par l'intercepteur
  // ci-dessus), sans session_id.
  const form = new FormData();
  form.append("file", file);
  const response = await api.post(`/chat/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

// Génération d'image — vrai endpoint déjà présent côté serveur (coûte des
// crédits utilisateur, 8 par image ; nouveaux comptes démarrent avec 180).
export async function generateChatImage(prompt, style = "verset_illustre") {
  const response = await api.post(`/chat/image`, { prompt, style });
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

// Le Copilote appelait /chat/messages (streaming) — route qui n'existe nulle
// part côté serveur (vérifié : aucun routeur ne sert /chat/messages, /chat/brief,
// /chat/config, /chat/decision, /chat/news-history ni /chat/news-saved dans ce
// projet). Le VRAI backend fonctionnel du Co-pilote existe, mais sous
// /api/growth/copilote — synchrone (pas de streaming), avec l'historique
// transmis par le client à chaque appel plutôt que persisté côté serveur.
// sendCopilotMessage() est le pont réel utilisé maintenant par ChatPanel ;
// streamChatMessage ci-dessus est conservé tel quel (inchangé, toujours mort)
// pour ne pas casser un éventuel futur vrai backend streaming qui reprendrait
// exactement ce contrat.
export async function sendCopilotMessage({ message, session = "default", history = [] }) {
  const res = await api.post(`/growth/copilote?user_id=${encodeURIComponent(session)}`, {
    message,
    history: history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
  });
  return res.data?.reply || "";
}

// /chat/brief et /chat/news-digest n'ont pas non plus de route serveur
// (même famille de bug que /chat/messages, voir sendCopilotMessage
// ci-dessus). Les vrais endpoints existent sous /api/growth — mêmes
// champs de base (date, headline, news...) mais PAS les champs détaillés
// que NightRecap/NextSequence espèrent (ia_checklist, value_generated,
// activite_recente) : ces deux composants resteront donc en état vide
// honnête (ils gèrent déjà ce cas, pas de crash) tant que le backend ne
// calcule pas ces champs-là spécifiquement.
export const getCopilotBrief = (session = "default") =>
  api.get(`/growth/daily-brief?user_id=${encodeURIComponent(session)}`).then((r) => r.data);

export const getCopilotConfig = async () => ({});

export const getCopilotDecision = (session = "default") =>
  api.get(`/chat/decision?session_id=${encodeURIComponent(session)}`).then((r) => r.data);

export const applyCopilotDecision = ({ id, session = "default", decision }) =>
  api.post(`/chat/decision/${id}`, { session_id: session, decision }).then((r) => r.data);

export const getCopilotNews = (session = "default", refresh = false) =>
  api.get(`/growth/news-digest?user_id=${encodeURIComponent(session)}${refresh ? "&refresh=true" : ""}`).then((r) => r.data);

export const getNewsHistory = (session = "default") =>
  api.get(`/chat/news-history?session_id=${encodeURIComponent(session)}`).then((r) => r.data);

export const archiveNewsEdition = (session = "default", item) =>
  api.post("/chat/news-history", { session_id: session, ...item }).then((r) => r.data);

export const getSavedNews = (session = "default") =>
  api.get(`/chat/news-saved?session_id=${encodeURIComponent(session)}`).then((r) => r.data);

export const saveNewsItem = (session = "default", item) =>
  api.post("/chat/news-saved", { session_id: session, ...item }).then((r) => r.data);

export const deleteSavedNews = (session = "default", itemId) =>
  api.delete(`/chat/news-saved/${encodeURIComponent(itemId)}?session_id=${encodeURIComponent(session)}`).then((r) => r.data);

// Demande Collaborateur : le backend déduit le propriétaire depuis le JWT,
// sans accepter d'identifiant de compte arbitraire dans l'URL.
export const sendCopilotWorkRequest = ({ message, channel = "chat", contact = "" }) =>
  api.post("/growth/work-request", { message, channel, contact }).then((r) => r.data);

export const euro = (n) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);

export const getVisionMemory = () => api.get("/settings/vision-memory").then((r) => r.data);
export const setVisionMemory = (memory) => api.put("/settings/vision-memory", { memory }).then((r) => r.data);
export const getPlan = () => api.get("/settings/plan").then((r) => r.data);
export const setPlan = (plan) => api.put("/settings/plan", { plan }).then((r) => r.data);
export const getOdooConfig = () => api.get("/settings/odoo").then((r) => r.data);
export const setOdooConfig = (d) => api.put("/settings/odoo", d).then((r) => r.data);
export const syncOdoo = () => api.post("/odoo/sync").then((r) => r.data);

export const getWellnessCorrelations = () => api.get("/wellness/correlations").then((r) => r.data);
export const getYearPixels = () => getWellnessHistory(366).then((data) => ({
  days: listOf(data, "checkins").map((row) => ({
    date: row.date ? String(row.date).slice(0, 10) : null,
    energie: asEnergyPercent(row.energy),
  })).filter((row) => row.date),
}));

// Aucun flux Messages distinct n’est encore fourni par Final-main. Le Header
// n’affiche donc aucun faux message et ne déclenche pas de requête 404.
export const getHeaderMessages = async () => ({ items: [] });
export const markHeaderMessagesRead = async () => ({ items: [] });
// Le Header Final-main lit les notifications via les routes profil réelles.
export const getHeaderNotifications = () => api.get("/notifications").then((r) => r.data);
export const markHeaderNotificationsRead = () => api.post("/notifications/read").then((r) => r.data);
export const getLanguage = async () => ({ language: localStorage.getItem("mx_language") || "fr" });
export const setLanguage = async (language) => { localStorage.setItem("mx_language", language); return { language }; };
export const logoutSession = async () => { localStorage.removeItem("cours_auth_token"); return { ok: true }; };

const CAP_STAGE_TO_GROWTH = { "Nouveaux": "detected", "Contactés": "contacted", "Propositions": "discussing", "Négociation": "discussing", "Gagnés": "signed", "Perdus": "lost" };
const GROWTH_STAGE_TO_CAP = { detected: "Nouveaux", contacted: "Contactés", discussing: "Négociation", signed: "Gagnés", lost: "Perdus" };
export const getGrowthPipeline = () => api.get("/growth/pipeline").then((r) => r.data);
export const getProspects = () => getGrowthPipeline().then((data) => listOf(data, "stages").flatMap((stage) => listOf(stage, "leads").map((lead) => ({
  ...lead,
  nom: lead.nom || lead.name || "Prospect",
  entreprise: lead.entreprise || lead.company || lead.sub || "",
  valeur_estimee: Number(lead.valeur_estimee || lead.value || 0),
  etape: GROWTH_STAGE_TO_CAP[stage.id] || "Nouveaux",
}))));
export const createProspect = (d) => api.post("/growth/leads", { name: d.nom || d.name, company: d.entreprise || d.company || null, email: d.email || null, source: "manual", stage: "detected" }).then((r) => r.data);
export const moveProspect = (id, etape) => api.patch(`/growth/pipeline/${id}`, { stage: CAP_STAGE_TO_GROWTH[etape] || "detected" }).then((r) => r.data);
export const deleteProspect = async () => { throw new Error("La suppression d’un prospect n’est pas encore disponible côté serveur."); };
export const getPipelineStats = () => getProspects().then((items) => {
  const signed = items.filter((item) => item.etape === "Gagnés");
  const active = items.filter((item) => !["Gagnés", "Perdus"].includes(item.etape));
  return {
    valeur_pipeline: active.length ? active.reduce((sum, item) => sum + Number(item.valeur_estimee || 0), 0) : null,
    taux_conversion: items.length && signed.length ? Math.round((signed.length / items.length) * 100) : null,
    panier_moyen: signed.length ? signed.reduce((sum, item) => sum + Number(item.valeur_estimee || 0), 0) / signed.length : null,
  };
});

// Projets et minuteur : contrats Final-main réels sous /api/projects.
export const getProjets = () => api.get("/projects").then((r) => r.data);
export const createProjet = (d) => api.post("/projects", d).then((r) => r.data);
export const updateProjet = (id, d) => api.put(`/projects/${id}`, d).then((r) => r.data);
export const deleteProjet = (id) => api.delete(`/projects/${id}`).then((r) => r.data);
export const startProjectTimer = (id) => api.post(`/projects/${id}/start`).then((r) => r.data);
export const stopProjectTimer = (id) => api.post(`/projects/${id}/stop`).then((r) => r.data);
// Tâches Final-main réelles sous /api/tasks.
export const getTaches = () => api.get("/tasks").then((r) => listOf(r.data).map(normalizeTask));
export const createTache = (d) => api.post("/tasks", {
  label: d.titre || d.label || "Tâche",
  priority: priorityValue(d.priorite || d.priority),
  notes: d.notes || null,
  project_id: d.project_id || null,
  planned_for: d.planned_for || null,
  estimated_minutes: d.estimated_minutes ? Number(d.estimated_minutes) : null,
  decision_id: d.decision_id || null,
  vision_pillar_id: d.vision_pillar_id || null,
  strategic_milestone_id: d.strategic_milestone_id || null,
  defer_reason: d.defer_reason || null,
}).then((r) => normalizeTask(r.data));
export const updateTache = (id, d) => api.patch(`/tasks/${id}`, d).then((r) => r.data);
export const updateTacheStatut = (id, statut) => api.patch(`/tasks/${id}`, { done: statut === "Terminé", in_progress: statut === "En cours" }).then((r) => normalizeTask(r.data));
export const deleteTache = (id) => api.delete(`/tasks/${id}`).then((r) => r.data);
export const generateTaches = () => api.post("/tasks/generate").then((r) => r.data);

// Mon Cap — jalons et décisions stratégiques. Les objets restent vides tant que
// l'utilisateur ne les crée pas ; aucun jalon ni décision n'est généré localement.
export const getStrategicMilestones = () => api.get("/strategy/milestones").then((r) => listOf(r.data));
export const createStrategicMilestone = (d) => api.post("/strategy/milestones", d).then((r) => r.data);
export const updateStrategicMilestone = (id, d) => api.patch(`/strategy/milestones/${id}`, d).then((r) => r.data);
export const deleteStrategicMilestone = (id) => api.delete(`/strategy/milestones/${id}`).then((r) => r.data);
export const getStrategicDecisions = () => api.get("/strategy/decisions").then((r) => listOf(r.data));
export const createStrategicDecision = (d) => api.post("/strategy/decisions", d).then((r) => r.data);
export const updateStrategicDecision = (id, d) => api.patch(`/strategy/decisions/${id}`, d).then((r) => r.data);
export const applyStrategicDecision = (id) => api.post(`/strategy/decisions/${id}/apply`).then((r) => r.data);
export const getStrategyOverview = () => api.get("/strategy/overview").then((r) => r.data);

// Vue agrégée de Mon Mouvement et recommandations Final-main.
export const getTravailOverview = () => api.get("/travail/overview").then((r) => r.data);
export const getTravailRecommendations = () => api.get("/travail/recommendations").then((r) => r.data);
export const getTravailEvents = (day = "") => api.get(`/travail/events${day ? `?day=${encodeURIComponent(day)}` : ""}`).then((r) => r.data);
export const createTravailEvent = (d) => api.post("/travail/events", d).then((r) => r.data);
export const updateTravailEvent = (id, d) => api.patch(`/travail/events/${id}`, d).then((r) => r.data);
export const deleteTravailEvent = (id) => api.delete(`/travail/events/${id}`).then((r) => r.data);

// Final-main n’expose pas encore de route CRUD pour la liste Documents de Mon
// Documents : routes Final-main réelles sous /api/documents. Aucun document n’est
// injecté localement ; la liste reste vide tant que l’utilisateur n’en crée pas.
export const getDocumentsTravail = () => api.get("/documents").then((r) => listOf(r.data).map((document) => ({
  ...document,
  nom: document.nom || document.name || "Document sans titre",
  url: document.url || null,
})));
export const createDocumentTravail = ({ nom, url = "", content = "" }) => api.post("/documents", {
  name: nom,
  type: url ? "link" : "general",
  url: url || null,
  content: content || "",
  source: "humain",
}).then((r) => r.data);
export const deleteDocumentTravail = (id) => api.delete(`/documents/${id}`).then((r) => r.data);

export const getBankAggregatorConfig = () => api.get("/settings/bank-aggregator").then((r) => r.data);
export const setBankAggregatorConfig = (d) => api.put("/settings/bank-aggregator", d).then((r) => r.data);
export const syncBankAggregator = () => api.post("/bank-aggregator/sync").then((r) => r.data);
