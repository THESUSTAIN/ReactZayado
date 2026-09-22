const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const TOKEN_KEY = "kairos_access_token";

// Avant : aucun en-tête Authorization n'était jamais envoyé — même avec un
// vrai token JWT obtenu (lien magique / OAuth), le backend ne voyait jamais
// que la session démo. C'est ici que ça se branche.
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* stockage indisponible */ } };

function _headers(extra) {
  const token = getToken();
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

function _versLogin() {
  // 401 = session absente/expirée : on renvoie vers /login, mais seulement depuis l'app (pas la landing).
  const p = window.location.pathname;
  if (p.startsWith("/app") || p.startsWith("/onboarding") || p.startsWith("/parametres")) window.location.assign("/login");
}

async function jget(path) {
  const r = await fetch(`${API}${path}`, { headers: _headers() });
  if (r.status === 401) { setToken(null); _versLogin(); }
  if (!r.ok) throw new Error(`GET ${path} ${r.status}`);
  return r.json();
}
async function jsend(path, method, body) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: _headers({ "Content-Type": "application/json" }),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401) { setToken(null); _versLogin(); }
  if (!r.ok) throw new Error(`${method} ${path} ${r.status}`);
  return r.json();
}

// ── État & profil ──
export const fetchState = () => jget("/state");
export const fetchMoi = () => jget("/auth/me");
export const capturerLead = (email, source) => jsend("/leads", "POST", { email, source });

// ── Connexion par email + mot de passe (JWT, mêmes routes que l'app) ──
// Version dédiée (pas jsend) : on a besoin des vrais messages d'erreur
// FastAPI (401 mauvais mot de passe, 409 compte existant, 429 anti-force,
// 422 validation en tableau d'objets) au lieu d'un code générique.
function _detailLisible(detail, defaut) {
  if (!detail) return defaut;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || "").filter(Boolean).join(" ") || defaut;
  return defaut;
}

async function _postAuth(path, email, password) {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 429) throw new Error("Trop de tentatives — réessaie dans quelques minutes.");
    if (r.status === 401) throw new Error("Email ou mot de passe incorrect.");
    if (r.status === 409) throw new Error("Un compte existe déjà avec cet email — connecte-toi.");
    throw new Error(_detailLisible(d?.detail, "Connexion impossible pour l'instant."));
  }
  if (d?.access_token) setToken(d.access_token);
  return d;
}

export const connexionMdp = (email, password) => _postAuth("/auth/login", email, password);
export const inscriptionMdp = (email, password) => _postAuth("/auth/register", email, password);
export const saveProfile = (data) => jsend("/profile", "PUT", data);
export const postCheckin = (data) => jsend("/checkins", "POST", data);
export const toggleTache = (id) => jsend(`/taches/${id}`, "PATCH");
export const fetchTaches = () => jget("/taches");
export const creerTache = (titre, duree_min = 15) => jsend("/taches", "POST", { titre, duree_min });
export const majTacheStatut = (id, statut) => jsend(`/taches/${id}/statut`, "PATCH", { statut });

// ── HeyGen (console admin) ──
export const fetchHeygenAvatars = () => jget("/heygen/avatars");
export const fetchHeygenVoices = () => jget("/heygen/voices");
export const heygenGenerer = (data) => jsend("/heygen/generate", "POST", data);
export const heygenStatut = (videoId) => jget(`/heygen/status/${videoId}`);

// ── Copilote ──
export const fetchPointDuJour = () => jget("/copilote/point-du-jour");
export const fetchDecisions = () => jget("/copilote/decisions");
export const suggererDecisions = () => jsend("/copilote/decisions/suggerer", "POST");
export const patchDecision = (id, statut, canal) => jsend(`/copilote/decisions/${id}`, "PATCH", { statut, canal });
export const validerDecisionEmail = (id) => jsend(`/copilote/decisions/${id}/valider-email`, "POST");
export const fetchActualite = (marche = "france") => jget(`/copilote/actualite?marche=${marche}`);
export const enregistrerArticle = (titre, lien) => jsend("/copilote/enregistres", "POST", { titre, lien });
export const fetchEnregistres = () => jget("/copilote/enregistres");
export const exportData = () => jget("/export");
export const deleteData = () => jsend("/donnees", "DELETE");
export const fetchConnexionOptions = () => jget("/connexion/options");
export const demanderLien = (email, origin) => jsend("/connexion/lien", "POST", { email, origin });
export const verifierLien = (token) => jsend("/connexion/verifier", "POST", { token });
export const entrerApercu = () => jsend("/connexion/apercu", "POST");
export const connexionDemo = (email, prenom) => jsend("/connexion/demo", "POST", { email, prenom });
export const oauthStart = (provider, redirect_uri) => jget(`/connexion/oauth/${provider}/start?redirect_uri=${encodeURIComponent(redirect_uri || "")}`);

// ── Idées ──
async function jsendDetail(path, method, body) {
  const r = await fetch(`${API}${path}`, {
    method, headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(data.detail || `${method} ${path} ${r.status}`); e.detail = data.detail; throw e; }
  return data;
}
export const fetchObjectifs = () => jget("/objectifs");
export const fetchIdees = (statut) => jget(`/idees${statut ? `?statut=${statut}` : ""}`);
export const createIdee = (data) => jsend("/idees", "POST", data);
export const updateIdee = (id, patch) => jsendDetail(`/idees/${id}`, "PATCH", patch);
export const deleteIdee = (id) => jsend(`/idees/${id}`, "DELETE");
export const analyserSource = (contenu) => jsend("/sources/analyser", "POST", { contenu });
export const validerSource = (items) => jsend("/sources/valider", "POST", { items });
export async function transcrireAudio(blob) {
  const fd = new FormData();
  fd.append("audio", blob, "capture.webm");
  const r = await fetch(`${API}/transcrire`, { method: "POST", body: fd });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.detail || "Transcription impossible");
  return data;
}

// ── Vision Board ──
export const fetchBoard = (board = "perso") => jget(`/vision/board?board=${encodeURIComponent(board)}`);
export const saveBoard = (cards, board = "perso") => jsend(`/vision/board?board=${encodeURIComponent(board)}`, "PUT", { cards });
export const fetchWheel = () => jget("/vision/wheel");
export const saveWheel = (pillars) => jsend("/vision/wheel", "PUT", { pillars });
export const fetchRoadmap = () => jget("/vision/roadmap");
export const addRoadmapItem = (quarter, titre) => jsend("/vision/roadmap", "POST", { quarter, titre });
export const patchRoadmapItem = (id, patch) => jsend(`/vision/roadmap/${id}`, "PATCH", patch);
export const deleteRoadmapItem = (id) => jsend(`/vision/roadmap/${id}`, "DELETE");
export const fetchStarterTemplates = () => jget("/vision/starter-templates");
export const generateAiDoc = (prompt, doc_type) => jsend("/vision/ai-doc", "POST", { prompt, doc_type });
export const generateBoard = (prompt) => jsend("/vision/generate-board", "POST", { prompt });
export const fetchInspire = () => jsend("/vision/inspire", "POST");

// ── Chat streaming (SSE, deltas JSON) ──
export async function streamChat({ message, page, onDelta, onDone, onError }) {
  try {
    const resp = await fetch(`${API}/copilote/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, page }),
    });
    if (!resp.ok || !resp.body) {
      onError && onError("Réponse indisponible.");
      return;
    }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop();
      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data:")) continue;
        try {
          const data = JSON.parse(line.slice(5).trim());
          if (data.delta) onDelta && onDelta(data.delta);
          if (data.error) onError && onError(data.error);
          if (data.done) onDone && onDone();
        } catch (_) {}
      }
    }
    onDone && onDone();
  } catch (e) {
    onError && onError("Connexion à l'assistant impossible.");
  }
}

// ── Vision Board : multi-boards ──
export const fetchBoards = () => jget("/vision/boards");
export const createBoard = (data) => jsend("/vision/boards", "POST", data);
export const renameBoard = (key, patch) => jsend(`/vision/boards/${encodeURIComponent(key)}`, "PATCH", patch);
export const deleteBoard = (key) => jsend(`/vision/boards/${encodeURIComponent(key)}`, "DELETE");

// ── Compte à rebours objectif 3 ans ──
export const fetchCountdown = () => jget("/vision/countdown");
export const saveCountdown = (data) => jsend("/vision/countdown", "PUT", data);

// ── Revue hebdomadaire guidée par Kairos ──
export const fetchRevue = () => jget("/revue-hebdo");
export const fetchRevueHistorique = () => jget("/revue-hebdo/historique");
export const postRevueSynthese = (data) => jsend("/revue-hebdo/synthese", "POST", data);

// ── Recherche Unsplash (proxy backend) ──
export const searchUnsplash = (q, count = 9) => jget(`/unsplash?q=${encodeURIComponent(q)}&count=${count}`);

// ── Vision → Idée → Action : bouton "Lancer maintenant" ──
export const lancerIdee = (id) => jsend(`/idees/${id}/lancer`, "POST", {});

// ── Cockpit widgets (Pouls Business + Radar + Impact) ──
export const fetchPouls = () => jget("/cockpit/pouls");
export const savePouls = (data) => jsend("/cockpit/pouls", "PUT", data);
export const fetchRadar = () => jget("/cockpit/radar");
export const fetchImpact = () => jget("/cockpit/impact");

// ── Admin (accès réservé au rôle admin — vérifié côté serveur, pas ici) ──
export const fetchAdminVueEnsemble = () => jget("/admin/vue-ensemble");
export const fetchAdminUtilisateurs = () => jget("/admin/utilisateurs");
export const changerRoleUtilisateur = (userId, role) => jsend(`/admin/utilisateurs/${userId}/role?nouveau_role=${encodeURIComponent(role)}`, "PATCH");
export const fetchModerationAttente = () => jget("/vendeur/moderation/attente");
export const publierProduitVendeur = (pid) => jsend(`/vendeur/moderation/${pid}/publier`, "POST");
export const refuserProduitVendeur = (pid, motif) => jsend(`/vendeur/moderation/${pid}/refuser`, "POST", { motif });
export const fetchAdminParrainage = () => jget("/admin/parrainage");
export const appliquerCodePromo = (code) => jsend("/codes-promo/appliquer", "POST", { code });
export const fetchCodesPromo = () => jget("/admin/codes-promo");
export const creerCodePromo = (data) => jsend("/admin/codes-promo", "POST", data);
export const basculerCodePromo = (id, active) => jsend(`/admin/codes-promo/${id}`, "PUT", { active });
export const supprimerCodePromo = (id) => jsend(`/admin/codes-promo/${id}`, "DELETE");
export const fetchConnections = () => jget("/connections");
export const fetchMesFilleuls = () => jget("/parrainage/mes-filleuls");
export const inviterParrainage = (email) => jsend("/parrainage/inviter", "POST", { email });
