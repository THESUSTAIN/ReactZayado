import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;

// user_id courant : utilisateur connecté (localStorage) > ?user= > default
export const getUid = () =>
  localStorage.getItem("zayado_uid") ||
  new URLSearchParams(window.location.search).get("user") ||
  "default";

export const currentUser = getUid();

const withUser = (params = {}) => ({ params: { user_id: getUid(), ...params }, withCredentials: true });

// ─── Gestion du token JWT ─────────────────────────────────────────────
// L'API backend attend un header "Authorization: Bearer <token>" (HTTPBearer),
// pas de cookie de session. On persiste donc le token en localStorage et on
// l'attache par défaut à toutes les requêtes axios.
const TOKEN_KEY = "zayado_token";

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    localStorage.removeItem(TOKEN_KEY);
    delete axios.defaults.headers.common["Authorization"];
  }
};

// Réapplique le token stocké dès le chargement du module (ex: après un refresh de page).
const _storedToken = localStorage.getItem(TOKEN_KEY);
if (_storedToken) axios.defaults.headers.common["Authorization"] = `Bearer ${_storedToken}`;

export const authApi = {
  me: () => axios.get(`${API}/auth/me`, { withCredentials: true }).then((r) => r.data),

  // Mode invité (preview) : obtient un vrai token JWT côté backend.
  guest: () => axios.post(`${API}/auth/guest`, {}).then((r) => r.data),

  // Démarre le flux OAuth : le backend construit l'URL d'autorisation
  // (client_id géré côté serveur, cf. /api/oauth/{provider}/start).
  oauthStart: (provider, redirectUri) =>
    axios.get(`${API}/oauth/${provider}/start`, { params: { redirect_uri: redirectUri } }).then((r) => r.data),

  // Échange le code renvoyé par Google/Microsoft contre un access_token + user.
  oauthExchange: (provider, code, redirectUri) =>
    axios.post(`${API}/oauth/${provider}`, { code, redirect_uri: redirectUri }).then((r) => r.data),

  // Lien magique (email) : vérifie le token reçu par email et ouvre la session.
  verifyLink: (token) =>
    axios.post(`${API}/auth/verify-link`, { token }).then((r) => r.data),

  // Connexion directe au compte de DÉMO whitelisté (bouton « compte test »).
  demoLogin: (email) =>
    axios.post(`${API}/auth/demo-login`, { email }).then((r) => r.data),

  logout: () => {
    // Authentification stateless (JWT) : la déconnexion est purement locale.
    setAuthToken(null);
    return Promise.resolve({ ok: true });
  },
  // Réglages génériques (backlog #19 — Kairos y est stocké)
  updateSettings: (settings) => axios.put(`${API}/auth/settings`, settings, withUser()).then((r) => r.data),
};

export const paymentsApi = {
  // Historique de facturation (transactions de l'utilisateur)
  transactions: () => axios.get(`${API}/payments/transactions`, withUser()).then((r) => r.data),
  // Télécharge la facture PDF d'une transaction et déclenche le download navigateur
  downloadInvoice: async (txId, invoiceNumber = "") => {
    const res = await axios.get(`${API}/payments/invoice/${txId}`, { responseType: "blob", withCredentials: true });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `Facture_${invoiceNumber || txId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};


export const leadsApi = {
  list: () => axios.get(`${API}/leads`, withUser()).then((r) => r.data),
  create: (data) => axios.post(`${API}/leads`, data, withUser()).then((r) => r.data),
  update: (id, data) => axios.patch(`${API}/leads/${id}`, data, withUser()).then((r) => r.data),
  remove: (id) => axios.delete(`${API}/leads/${id}`, withUser()).then((r) => r.data),
};

export const validationApi = {
  overview: () => axios.get(`${API}/validation/overview`, withUser()).then((r) => r.data),
  list: () => axios.get(`${API}/validation/analyses`, withUser()).then((r) => r.data),
  get: (id) => axios.get(`${API}/validation/analyses/${id}`, withUser()).then((r) => r.data),
  create: (data) => axios.post(`${API}/validation/analyses`, data, withUser()).then((r) => r.data),
  remove: (id) => axios.delete(`${API}/validation/analyses/${id}`, withUser()).then((r) => r.data),
};

export const wellnessApi = {
  state: () => axios.get(`${API}/wellness/state`, withUser()).then((r) => r.data),
  checkin: (data) => axios.post(`${API}/wellness/checkin`, data, withUser()).then((r) => r.data),
  history: (days = 365) => axios.get(`${API}/wellness/history`, withUser({ days })).then((r) => r.data),
  getPrefs: () => axios.get(`${API}/wellness/prefs`, withUser()).then((r) => r.data),
  savePrefs: (data) => axios.put(`${API}/wellness/prefs`, data, withUser()).then((r) => r.data),
  quarterly: () => axios.get(`${API}/wellness/quarterly`, withUser()).then((r) => r.data),
  activity: (days = 14) => axios.get(`${API}/wellness/activity`, withUser({ days })).then((r) => r.data),
  correlations: (days = 60) => axios.get(`${API}/wellness/correlations`, withUser({ days })).then((r) => r.data),
  // Hub "Moi" — Habitudes
  habits: () => axios.get(`${API}/wellness/habits`, withUser()).then((r) => r.data),
  addHabit: (name, icon) => axios.post(`${API}/wellness/habits`, { name, icon }, withUser()).then((r) => r.data),
  toggleHabit: (id) => axios.post(`${API}/wellness/habits/${id}/toggle`, {}, withUser()).then((r) => r.data),
  seedChristianHabits: () => axios.post(`${API}/wellness/habits/seed-christian`, {}, withUser()).then((r) => r.data),
  removeHabit: (id) => axios.delete(`${API}/wellness/habits/${id}`, withUser()).then((r) => r.data),
  // Hub "Moi" — Sommeil
  sleep: () => axios.get(`${API}/wellness/sleep`, withUser()).then((r) => r.data),
  logSleep: (hours, quality, date) => axios.post(`${API}/wellness/sleep`, { hours, quality, date }, withUser()).then((r) => r.data),
};

export const pilotageApi = {
  overview: (period = "mois") => axios.get(`${API}/pilotage/overview`, withUser({ period })).then((r) => r.data),
  addEntry: (data) => axios.post(`${API}/pilotage/entry`, data, withUser()).then((r) => r.data),
};

export const growthApi = {
  all: () => axios.get(`${API}/growth`, withUser()).then((r) => r.data),
  getSettings: () => axios.get(`${API}/growth/settings`, withUser()).then((r) => r.data),
  saveSettings: (data) => axios.put(`${API}/growth/settings`, data, withUser()).then((r) => r.data),
};

export const visionApi = {
  // Legacy (compat)
  getBoard: () => axios.get(`${API}/vision/board`, withUser()).then((r) => r.data),
  saveBoard: (cards) => axios.put(`${API}/vision/board`, { cards }, withUser()).then((r) => r.data),
  addCard: (card) => axios.post(`${API}/vision/card`, card, withUser()).then((r) => r.data),
  // Nouvelle interface (VisionBoard.js corrigé)
  get: () => axios.get(`${API}/vision`, withUser()).then((r) => r.data),
  patch: (data) => axios.patch(`${API}/vision`, data, withUser()).then((r) => r.data),
  boardGenerate: (data) => axios.post(`${API}/vision/board/generate`, data, withUser()).then((r) => r.data),
  boardTransform: (data) => axios.post(`${API}/vision/board/transform`, data, withUser()).then((r) => r.data),
  boardDelete: (item_id) => axios.delete(`${API}/vision/board/${item_id}`, withUser()).then((r) => r.data),
  canvasGet: () => axios.get(`${API}/vision/board/canvas`, withUser()).then((r) => r.data),
  canvasSave: (data) => axios.put(`${API}/vision/board/canvas`, data, withUser()).then((r) => r.data),
  liveMetrics: () => axios.get(`${API}/vision/board/live-metrics`, withUser()).then((r) => r.data),
  liveData: () => axios.get(`${API}/vision/board/live-data`, withUser()).then((r) => r.data),
  inspire: (universe) => axios.post(`${API}/vision/board/inspire`, { universe }, withUser()).then((r) => r.data),
  photos: (q) => axios.get(`${API}/vision/board/photos`, { ...withUser(), params: { q } }).then((r) => r.data),
  flipbookRefresh: () => axios.post(`${API}/vision/board/refresh`, {}, withUser()).then((r) => r.data),
  flipbookGenerate: (data) => axios.post(`${API}/vision/board/generate-flipbook`, data, withUser()).then((r) => r.data),
  templates: () => axios.get(`${API}/vision/board/templates`, withUser()).then((r) => r.data),
  // AI Document (Storyflow-style generation dans le board)
  generateDoc: (prompt, doc_type = "note") =>
    axios.post(`${API}/vision/board/generate-doc`, { prompt, doc_type }, withUser()).then((r) => r.data),
};

// ─── Vision Cards — modèle unifié du canvas (backlog #1) ────────────────
export const visionCardsApi = {
  list: (board_id = "main") => axios.get(`${API}/vision/cards`, { ...withUser(), params: { board_id } }).then((r) => r.data),
  create: (card) => axios.post(`${API}/vision/cards`, card, withUser()).then((r) => r.data),
  update: (id, patch) => axios.put(`${API}/vision/cards/${id}`, patch, withUser()).then((r) => r.data),
  remove: (id) => axios.delete(`${API}/vision/cards/${id}`, withUser()).then((r) => r.data),
  migrateLegacy: (board_id = "main") => axios.post(`${API}/vision/cards/migrate-legacy`, {}, { ...withUser(), params: { board_id } }).then((r) => r.data),
  // Historique / versioning (backlog #22)
  createSnapshot: (label, board_id = "main") => axios.post(`${API}/vision/cards/snapshots`, {}, { ...withUser(), params: { board_id, label } }).then((r) => r.data),
  listSnapshots: (board_id = "main") => axios.get(`${API}/vision/cards/snapshots`, { ...withUser(), params: { board_id } }).then((r) => r.data),
  restoreSnapshot: (id) => axios.post(`${API}/vision/cards/snapshots/${id}/restore`, {}, withUser()).then((r) => r.data),
  deleteSnapshot: (id) => axios.delete(`${API}/vision/cards/snapshots/${id}`, withUser()).then((r) => r.data),
  // Partage public (backlog #23)
  getPublicStatus: (board_id = "main") => axios.get(`${API}/vision/cards/public-status`, { ...withUser(), params: { board_id } }).then((r) => r.data),
  setPublicStatus: (enabled, board_id = "main") => axios.put(`${API}/vision/cards/public-status`, { enabled, board_id }, withUser()).then((r) => r.data),
  getPublicBoard: (slug) => axios.get(`${API}/vision/cards/public/${slug}`).then((r) => r.data),
};

// ─── Vision Brain — cerveau stratégique (panneau IA, Accueil, Analyse) ──
export const visionBrainApi = {
  panel: () => axios.get(`${API}/vision/brain/panel`, withUser()).then((r) => r.data),
  analyze: (force = false) => axios.post(`${API}/vision/brain/analyze`, { force }, withUser()).then((r) => r.data),
  notifyExplain: (payload) => axios.post(`${API}/vision/brain/notify-explain`, payload, withUser()).then((r) => r.data),
  connections: () => axios.get(`${API}/vision/brain/connections`, withUser()).then((r) => r.data),
  pageContext: (payload) => axios.post(`${API}/vision/brain/page-context`, payload, withUser()).then((r) => r.data),
  scoreHistory: (days = 90) => axios.get(`${API}/vision/brain/score-history`, withUser({ days })).then((r) => r.data),
};

// ── Studio — génération d'images (Nano Banana) & vidéos (Sora 2) ──
export const studioApi = {
  templates: () => axios.get(`${API}/studio/templates`, withUser()).then((r) => r.data),
  quota: () => axios.get(`${API}/studio/quota`, withUser()).then((r) => r.data),
  generateImage: (prompt, template = "custom") =>
    axios.post(`${API}/studio/image`, { prompt, template }, withUser()).then((r) => r.data),
  generateVideo: (prompt, template = "custom", duration = null) =>
    axios.post(`${API}/studio/video`, { prompt, template, duration }, { ...withUser(), timeout: 600000 }).then((r) => r.data),
};

export const simulationApi = {
  start: (programme_label, diploma_level = "master") =>
    axios.post(`${API}/simulation/start`, { programme_label, diploma_level }, withUser()).then((r) => r.data),
  state: () => axios.get(`${API}/simulation/state`, withUser()).then((r) => r.data),
  getClientTask: (clientId) =>
    axios.get(`${API}/simulation/clients/${clientId}/task`, withUser()).then((r) => r.data),
  submitTask: (taskId, response_text) =>
    axios.post(`${API}/simulation/tasks/${taskId}/submit`, { response_text }, withUser()).then((r) => r.data),
  history: () => axios.get(`${API}/simulation/history`, withUser()).then((r) => r.data),
};

export const onboardingApi = {
  get: () => axios.get(`${API}/onboarding`, withUser()).then((r) => r.data),
  save: (data) => axios.post(`${API}/onboarding`, data, withUser()).then((r) => r.data),
  getDraft: () => axios.get(`${API}/onboarding/draft`, withUser()).then((r) => r.data),
  saveDraft: (data) => axios.put(`${API}/onboarding/draft`, data, withUser()).then((r) => r.data),
  reset: () => axios.post(`${API}/onboarding/reset`, {}, withUser()).then((r) => r.data),
};

export const integrationsApi = {
  list: () => axios.get(`${API}/integrations`, withUser()).then((r) => r.data),
  save: (provider, data) => axios.put(`${API}/integrations/${provider}`, data, withUser()).then((r) => r.data),
  remove: (provider) => axios.delete(`${API}/integrations/${provider}`, withUser()).then((r) => r.data),
  test: (provider) => axios.post(`${API}/integrations/${provider}/test`, {}, withUser()).then((r) => r.data),
};

// ─── Cloud storage (Mon Bureau — Google Drive / OneDrive) ──────
export const cloudApi = {
  driveConnect:    () => axios.get(`${API}/drive/connect`).then(r => r.data),
  driveStatus:     () => axios.get(`${API}/drive/status`).then(r => r.data),
  driveDisconnect: () => axios.delete(`${API}/drive/disconnect`).then(r => r.data),
  onedriveConnect:    () => axios.get(`${API}/onedrive/connect`).then(r => r.data),
  onedriveStatus:     () => axios.get(`${API}/onedrive/status`).then(r => r.data),
  onedriveDisconnect: () => axios.delete(`${API}/onedrive/disconnect`).then(r => r.data),
};

export { API };

// ─── VISION BOARD — APIs étendues ─────────────────────────────
export const visionExtApi = {
  // Piliers stratégiques
  getPillars: () => axios.get(`${API}/vision/pillars`, withUser()).then(r => r.data),
  savePillars: (pillars) => axios.put(`${API}/vision/pillars`, { pillars }, withUser()).then(r => r.data),

  // Souvenirs & rappels
  getMemories: () => axios.get(`${API}/vision/memories`, withUser()).then(r => r.data),
  getNotifSettings: () => axios.get(`${API}/vision/notif-settings`, withUser()).then(r => r.data),
  saveNotifSettings: (settings) => axios.put(`${API}/vision/notif-settings`, { settings }, withUser()).then(r => r.data),

  // SWOT généré par l'IA
  generateSwot: () => axios.post(`${API}/vision/swot`, {}, withUser()).then(r => r.data),
  getSwot: () => axios.get(`${API}/vision/swot`, withUser()).then(r => r.data),

  // Score d'alignement IA
  getScore: () => axios.get(`${API}/vision/score`, withUser()).then(r => r.data),

  // Upload photo de fond
  uploadPhoto: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return axios.post(`${API}/vision/photo`, fd, { ...withUser(), headers: { "Content-Type": "multipart/form-data" } }).then(r => r.data);
  },

  // Vision Book PDF (Heyzine)
  generateBook: () => axios.post(`${API}/vision/book/generate`, {}, withUser()).then(r => r.data),

  // Génération d'un board complet depuis 1 prompt IA (quick-win vs storyflow)
  generateFromPrompt: (prompt) => axios.post(`${API}/vision/generate-from-prompt`, { prompt }, withUser()).then(r => r.data),

  // Partage public
  shareBoard: () => axios.post(`${API}/vision/share`, {}, withUser()).then(r => r.data),
  coach: (cards) => axios.post(`${API}/vision/coach`, { cards }, withUser()).then(r => r.data),
  canvaImport: (url) => axios.post(`${API}/vision/canva-import`, { url }, withUser()).then(r => r.data),

  // ── Modèles de Départ (canvas prêts à l'emploi) ──
  getStarterTemplates: () => axios.get(`${API}/vision/starter-templates`, withUser()).then(r => r.data),
};

export const analyseApi = {
  get: () => axios.get(`${API}/analyse`, withUser()).then(r => r.data),
  run: () => axios.post(`${API}/analyse/run`, {}, withUser()).then(r => r.data),
};

// ─── CROISSANCE — APIs étendues ────────────────────────────────
export const growthExtApi = {
  // Pipeline Kanban
  getPipeline: () => axios.get(`${API}/growth/pipeline`, withUser()).then(r => r.data),
  detect: (keywords, subreddits) => axios.post(`${API}/growth/detect`, { keywords, subreddits }, withUser()).then(r => r.data),
  detectCompanies: () => axios.post(`${API}/growth/detect-companies`, {}, withUser()).then(r => r.data),
  moveLead: (id, stage) => axios.patch(`${API}/growth/pipeline/${id}`, { stage }, withUser()).then(r => r.data),
  
  // Message IA avant envoi (Mammouth)
  generateMessage: (leadId, channel) => axios.post(`${API}/growth/engage/generate`, { lead_id: leadId, channel }, withUser()).then(r => r.data),
  sendMessage: (leadId, message, channel) => axios.post(`${API}/growth/engage/send`, { lead_id: leadId, message, channel }, withUser()).then(r => r.data),

  // Canaux supplémentaires
  getYoutube: () => axios.get(`${API}/growth/youtube`, withUser()).then(r => r.data),
  getLinkedin: () => axios.get(`${API}/growth/linkedin`, withUser()).then(r => r.data),
  getForums: () => axios.get(`${API}/growth/forums`, withUser()).then(r => r.data),
  getTerrain: () => axios.get(`${API}/growth/terrain`, withUser()).then(r => r.data),

  // Export CSV
  exportLeads: () => axios.get(`${API}/growth/leads/export`, { ...withUser(), responseType: 'blob' }).then(r => r.data),

  // WhatsApp / Telegram webhooks
  saveChannelConfig: (channel, config) => axios.put(`${API}/growth/channels/${channel}`, config, withUser()).then(r => r.data),
  getChannelConfig: (channel) => axios.get(`${API}/growth/channels/${channel}`, withUser()).then(r => r.data),

  // Sync CRM externe (on pousse le lead dans le CRM de l'user : Brevo / HubSpot)
  pushLeadToCrm: (id, provider) => axios.post(`${API}/growth/leads/${id}/push-crm`, { provider: provider || null }, withUser()).then(r => r.data),

  // Création manuelle / capture (extension) d'un lead
  createLead: (data) => axios.post(`${API}/growth/leads`, data, withUser()).then(r => r.data),
};

// ─── AGENTS IA (custom-agents) ────────────────────────────────
export const agentsApi = {
  list:         ()          => axios.get(`${API}/custom-agents`, withUser()).then(r => r.data),
  templates:    ()          => axios.get(`${API}/custom-agents/templates`, withUser()).then(r => r.data),
  tools:        ()          => axios.get(`${API}/custom-agents/tools`, withUser()).then(r => r.data),
  create:       (data)      => axios.post(`${API}/custom-agents`, data, withUser()).then(r => r.data),
  fromTemplate: (id)        => axios.post(`${API}/custom-agents/from-template`, { template_id: id }, withUser()).then(r => r.data),
  update:       (id, data)  => axios.put(`${API}/custom-agents/${id}`, data, withUser()).then(r => r.data),
  remove:       (id)        => axios.delete(`${API}/custom-agents/${id}`, withUser()).then(r => r.data),
  deploy:       (id, ch)    => axios.post(`${API}/custom-agents/${id}/deploy`, { channels: ch }, withUser()).then(r => r.data),
  chat:         (id, message) => axios.post(`${API}/custom-agents/${id}/chat`, { message }, withUser()).then(r => r.data),
  history:      (id)        => axios.get(`${API}/custom-agents/${id}/history`, withUser()).then(r => r.data),
  waConnect:    (id)        => axios.post(`${API}/custom-agents/${id}/whatsapp-web-connect`, {}, withUser()).then(r => r.data),
  waStatus:     (id)        => axios.get(`${API}/custom-agents/${id}/whatsapp-web-status`, withUser()).then(r => r.data),
  // Conversations clients (WhatsApp / Telegram / Web) — écran de gestion
  conversations:       (id)               => axios.get(`${API}/custom-agents/${id}/conversations`, withUser()).then(r => r.data),
  conversationThread:  (id, contact)      => axios.get(`${API}/custom-agents/${id}/conversations/${encodeURIComponent(contact)}`, withUser()).then(r => r.data),
  replyConversation:   (id, contact, msg) => axios.post(`${API}/custom-agents/${id}/conversations/${encodeURIComponent(contact)}/reply`, { message: msg }, withUser()).then(r => r.data),
};

// ─── TASKS (Mon Bureau — Missions) ────────────────────────────
export const tasksApi = {
  list:     ()           => axios.get(`${API}/tasks`, withUser()).then(r => r.data),
  create:   (data)       => axios.post(`${API}/tasks`, data, withUser()).then(r => r.data),
  update:   (id, data)   => axios.patch(`${API}/tasks/${id}`, data, withUser()).then(r => r.data),
  remove:   (id)         => axios.delete(`${API}/tasks/${id}`, withUser()).then(r => r.data),
  generate: ()           => axios.post(`${API}/tasks/generate`, {}, withUser()).then(r => r.data),
};

// ─── DOCUMENTS (Mon Bureau — Documents) ───────────────────────
export const documentsApi = {
  list:     ()           => axios.get(`${API}/documents`, withUser()).then(r => r.data),
  generate: (data)       => axios.post(`${API}/documents/generate`, data, withUser()).then(r => r.data),
  remove:   (id)         => axios.delete(`${API}/documents/${id}`, withUser()).then(r => r.data),
};

// ─── PROCESSUS (Mon Bureau — Processus) ───────────────────────
export const processesApi = {
  list:       ()                   => axios.get(`${API}/processes`, withUser()).then(r => r.data),
  create:     (data)               => axios.post(`${API}/processes`, data, withUser()).then(r => r.data),
  generate:   (data)               => axios.post(`${API}/processes/generate`, data || {}, withUser()).then(r => r.data),
  updateStep: (procId, stepId, d)  => axios.patch(`${API}/processes/${procId}/steps/${stepId}`, d, withUser()).then(r => r.data),
};

// ─── AUTH — magic link ─────────────────────────────────────────
export const sendMagicLink = (email) =>
  axios.post(`${API}/auth/request-link`, { email }).then(r => r.data);

// ─── SSO / SAML entreprise ─────────────────────────────────────
// Endpoint optionnel : s'il n'est pas déployé côté backend, l'appel échoue
// et l'UI Login affiche l'état « SSO à activer » (géré dans Login.jsx).
export const ssoApi = {
  initiate: (domain) =>
    axios.post(`${API}/auth/sso/initiate`, { domain }).then(r => r.data),
};

// ─── Compte — export RGPD & suppression ────────────────────────
export const accountApi = {
  exportData: () => axios.get(`${API}/auth/export-data`, withUser()).then(r => r.data),
  deleteAccount: () => axios.post(`${API}/account/delete`, {}, withUser()).then(r => r.data),
};

// ─── Cockpit (co-pilote IA) ────────────────────────────────────
export const copiloteApi = {
  ask: (message, history = []) => axios.post(`${API}/growth/copilote`, { message, history }, withUser()).then(r => r.data),
};

// ─── « Le Point du jour » — brief proactif + demande de collab ──
export const dailyBriefApi = {
  get: () => axios.get(`${API}/growth/daily-brief`, withUser()).then(r => r.data),
  workRequest: (payload) => axios.post(`${API}/growth/work-request`, payload, withUser()).then(r => r.data),
  newsDigest: () => axios.get(`${API}/growth/news-digest`, withUser()).then(r => r.data),
};

// ─── Notifications & Messages (entête) ─────────────────────────
export const notificationsApi = {
  list: () => axios.get(`${API}/notifications`, withUser()).then(r => r.data),
  markRead: () => axios.post(`${API}/notifications/read`, {}, withUser()).then(r => r.data),
};
export const messagesApi = {
  list: () => axios.get(`${API}/messages`, withUser()).then(r => r.data),
};

// ─── Dashboard fusion (#2 engagement daily) ────────────────────
export const dashboardApi = {
  fusion: () => axios.get(`${API}/dashboard/fusion`, withUser()).then(r => r.data),
};

// ─── TRAVAIL (hub d'exécution : CRM, agenda, agrégation, recos IA) ──
export const travailApi = {
  overview: () => axios.get(`${API}/travail/overview`, withUser()).then(r => r.data),
  recommendations: () => axios.get(`${API}/travail/recommendations`, withUser()).then(r => r.data),
  crm: () => axios.get(`${API}/travail/crm`, withUser()).then(r => r.data),
  addLead: (data) => axios.post(`${API}/travail/crm`, data, withUser()).then(r => r.data),
  updateLead: (id, data) => axios.patch(`${API}/travail/crm/${id}`, data, withUser()).then(r => r.data),
  removeLead: (id) => axios.delete(`${API}/travail/crm/${id}`, withUser()).then(r => r.data),
  events: (day) => axios.get(`${API}/travail/events`, withUser(day ? { day } : {})).then(r => r.data),
  addEvent: (data) => axios.post(`${API}/travail/events`, data, withUser()).then(r => r.data),
  removeEvent: (id) => axios.delete(`${API}/travail/events/${id}`, withUser()).then(r => r.data),
};

// ─── PROJETS ───────────────────────────────────────────────────
export const projectsApi = {
  list: () => axios.get(`${API}/projects`, withUser()).then(r => r.data),
};

// ─── AUTOMATISATION (dans Paramètres — façon Emergent) ─────────
export const automationsApi = {
  list: () => axios.get(`${API}/automations`, withUser()).then(r => r.data),
  stats: () => axios.get(`${API}/automations/stats`, withUser()).then(r => r.data),
  toggle: (id, enabled) => axios.patch(`${API}/automations/${id}/toggle`, { enabled }, withUser()).then(r => r.data),
  run: (id) => axios.post(`${API}/automations/${id}/run`, {}, withUser()).then(r => r.data),
  createCustom: (description) => axios.post(`${API}/automations/custom`, { description }, withUser()).then(r => r.data),
  removeCustom: (id) => axios.delete(`${API}/automations/custom/${id}`, withUser()).then(r => r.data),
  setWellbeingConsent: (enabled) => axios.put(`${API}/automations/wellbeing-consent`, { enabled }, withUser()).then(r => r.data),
};

// ─── ACTUALITÉS — digest par marché (backlog #13) ───────────────
export const newsApi = {
  markets: () => axios.get(`${API}/news/markets`).then(r => r.data),
  getMarket: () => axios.get(`${API}/news/market`, withUser()).then(r => r.data),
  setMarket: (market) => axios.put(`${API}/news/market`, { market }, withUser()).then(r => r.data),
  digest: () => axios.get(`${API}/news/digest`, withUser()).then(r => r.data),
};

// ─── Passeport / Gamification (backlog #17) ─────────────────────
export const gamificationApi = {
  passport: () => axios.get(`${API}/gamification/passport`, withUser()).then(r => r.data),
};
