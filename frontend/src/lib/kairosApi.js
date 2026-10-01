// En production, l’API est servie sous le même domaine que l’application (/api).
// En local, REACT_APP_BACKEND_URL peut pointer vers un backend séparé.
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;
const TOKEN_KEY = "kairos_access_token";

// Avant : aucun en-tête Authorization n'était jamais envoyé — même avec un
// vrai token JWT obtenu (lien magique / OAuth), le backend ne voyait jamais
// que la session démo. C'est ici que ça se branche.
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t) => {
  let avant = null;
  try { avant = localStorage.getItem(TOKEN_KEY); t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* stockage indisponible */ }
  // Nouveau token posé (login) : prévient l'app pour re-hydrater le contexte
  // sans rechargement. Jamais sur retrait (401) — sinon boucle 401 → event → refetch.
  if (t && t !== avant) { try { window.dispatchEvent(new Event("zayado:token")); } catch { /* hors navigateur */ } }
};

function _headers(extra) {
  const token = getToken();
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

function _versLogin() {
  // 401 = session absente/expirée : on renvoie vers /login, mais seulement depuis l'app (pas la landing).
  const p = window.location.pathname;
  if (p.startsWith("/app") || p.startsWith("/onboarding") || p.startsWith("/parametres") || p.startsWith("/espace-vendeur") || p.startsWith("/mon-espace") || p.startsWith("/acheter")) window.location.assign("/login");
}

// Plusieurs widgets demandent la même ressource au chargement d'une page
// (/state, /abonnement, /copilote/actualite…) : un même GET en cours ou tout
// juste reçu (< 2 s) est partagé au lieu d'être rappelé. Toute écriture vide ce cache.
const _GET_EN_COURS = new Map();
const _GET_TTL_MS = 2000;
async function _jgetReseau(path) {
  const r = await fetch(`${API}${path}`, { headers: _headers() });
  if (r.status === 401) { setToken(null); _versLogin(); }
  if (!r.ok) throw new Error(`GET ${path} ${r.status}`);
  return r.json();
}
function jget(path) {
  const cle = `${getToken() || ""}|${path}`;
  const e = _GET_EN_COURS.get(cle);
  if (e && (!e.fin || Date.now() - e.fin < _GET_TTL_MS)) return e.promesse;
  const entree = { fin: 0, promesse: null };
  entree.promesse = _jgetReseau(path).then(
    (d) => { entree.fin = Date.now(); return d; },
    (err) => { _GET_EN_COURS.delete(cle); throw err; },
  );
  _GET_EN_COURS.set(cle, entree);
  return entree.promesse;
}
async function jsend(path, method, body) {
  _GET_EN_COURS.clear();
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
export const fetchRituels = () => jget("/rituels");
export const basculerRituel = (id) => jsend(`/rituels/${id}/basculer`, "POST", {});
export const fetchSerie = () => jget("/serie");
export const fetchCourbeEnergie = () => jget("/bien-etre/energie");
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
  _GET_EN_COURS.clear();
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
export const creerTache = (titre, duree_min = 15, objectif_id = null) => jsend("/taches", "POST", { titre, duree_min, ...(objectif_id ? { objectif_id } : {}) });
export const majTacheStatut = (id, statut) => jsend(`/taches/${id}/statut`, "PATCH", { statut });
export const relierTache = (id, objectif_id) => jsend(`/taches/${id}/objectif`, "PATCH", { objectif_id: objectif_id || null });
export const supprimerTache = (id) => jsend(`/taches/${id}`, "DELETE");
export const creerObjectif = (titre, echeance = null) => jsendDetail("/objectifs", "POST", { titre, ...(echeance ? { echeance } : {}) });
export const majObjectif = (id, patch) => jsendDetail(`/objectifs/${id}`, "PATCH", patch);
export const supprimerObjectif = (id) => jsend(`/objectifs/${id}`, "DELETE");

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
export const fetchActualite = (filtre = "") => jget(`/copilote/actualite${filtre ? `?filtre=${filtre}` : ""}`);
export const fetchActualiteOptions = () => jget("/copilote/actualite/options");
export const enregistrerArticle = (titre, lien) => jsend("/copilote/enregistres", "POST", { titre, lien });
export const fetchEnregistres = () => jget("/copilote/enregistres");
export const exportData = () => jget("/export");
export const deleteData = () => jsend("/donnees", "DELETE");
export const fetchConnexionOptions = () => jget("/connexion/options");

// ── Carrousel de la page login (administrable) ──
// URL absolue d'un média uploadé (src « /api/medias/… ») ou d'un lien externe.
export const mediaUrl = (src) => (src || "").startsWith("/") ? `${BACKEND_URL}${src}` : (src || "");
export const fetchLoginCarousel = () => jget("/contenu/login-carousel");
export const saveLoginCarousel = (slides) => jsend("/admin/contenu/login-carousel", "PUT", { slides });
export async function uploadMedia(fichier) {
  const fd = new FormData();
  fd.append("fichier", fichier);
  const r = await fetch(`${API}/admin/medias`, { method: "POST", headers: _headers(), body: fd });
  if (r.status === 401) { setToken(null); _versLogin(); }
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.detail || `Upload ${r.status}`); }
  return r.json();
}
export const demanderLien = (email, origin) => jsend("/connexion/lien", "POST", { email, origin });
// Mesure d'accueil : choix « oui » / « pas_encore » sur l'écran de présentation.
export const enregistrerChoixAccueil = (choix) => jsend("/accueil/choix", "POST", { choix });
export const verifierLien = (token) => jsend("/connexion/verifier", "POST", { token });
export const entrerApercu = () => jsend("/connexion/apercu", "POST");
export const connexionDemo = (email, prenom) => jsend("/connexion/demo", "POST", { email, prenom });
export const oauthStart = (provider, redirect_uri) => jget(`/connexion/oauth/${provider}/start?redirect_uri=${encodeURIComponent(redirect_uri || "")}`);
// Retour Google/Microsoft sur /login?code=… : échange du code contre la session.
export const oauthEchange = (provider, code, redirect_uri, state) => jsend(`/connexion/oauth/${provider}/echange`, "POST", { code, redirect_uri, state });

// ── Idées ──
async function jsendDetail(path, method, body) {
  _GET_EN_COURS.clear();
  // Avant : sans le jeton de connexion → 401 (changer le statut ou l'objectif d'une idée échouait).
  const r = await fetch(`${API}${path}`, {
    method, headers: _headers({ "Content-Type": "application/json" }),
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
// Vision+ : victoires, lien public en lecture seule
export const fetchVictoires = () => jget("/victoires");
export const fetchShare = (board = "perso") => jget(`/vision/share?board=${encodeURIComponent(board)}`);
export const saveShare = (data) => jsend("/vision/share", "POST", data);
export const revokeShare = (board = "perso") => jsend(`/vision/share?board=${encodeURIComponent(board)}`, "DELETE");
export const fetchPublicCommentaires = (token) => jget(`/public/vision/${token}/commentaires`);
export const posterCommentairePublic = (token, auteur, texte) => jsend(`/public/vision/${token}/commentaires`, "POST", { auteur, texte });
export const fetchVisionCommentaires = () => jget("/vision/commentaires");
export const marquerCommentairesLus = () => jsend("/vision/commentaires/lus", "POST");
export const inviterBoard = (cle, email) => jsend(`/vision/boards/${encodeURIComponent(cle)}/inviter`, "POST", { email });
export const fetchInvitations = (cle) => jget(`/vision/boards/${encodeURIComponent(cle)}/invitations`);
export const retirerInvitation = (cle, email) => jsend(`/vision/boards/${encodeURIComponent(cle)}/inviter/${encodeURIComponent(email)}`, "DELETE");
export const fetchBoardsPartages = () => jget("/vision/partages");
// `owner` : identifiant du propriétaire (départage deux boards de même clé partagés par deux personnes).
const _own = (owner) => (owner ? `?owner=${encodeURIComponent(owner)}` : "");
export const fetchBoardPartage = (cle, owner) => jget(`/vision/partages/${encodeURIComponent(cle)}${_own(owner)}`);
export const saveBoardPartage = (cards, cle, owner) => jsend(`/vision/partages/${encodeURIComponent(cle)}${_own(owner)}`, "PUT", { cards });
// Re-partage par un éditeur invité (le lien public reste réservé au propriétaire).
export const fetchInvitationsPartage = (cle, owner) => jget(`/vision/partages/${encodeURIComponent(cle)}/invitations${_own(owner)}`);
export const inviterBoardPartage = (cle, email, owner) => jsend(`/vision/partages/${encodeURIComponent(cle)}/inviter${_own(owner)}`, "POST", { email });
export const retirerInvitationPartage = (cle, email, owner) => jsend(`/vision/partages/${encodeURIComponent(cle)}/inviter/${encodeURIComponent(email)}${_own(owner)}`, "DELETE");
export async function fetchPublicVision(token) {
  const r = await fetch(`${API}/public/vision/${encodeURIComponent(token)}`);
  if (!r.ok) throw new Error(`public ${r.status}`);
  return r.json();
}
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
// Corrigé : le jeton JWT n'était JAMAIS envoyé — en production (hors aperçu),
// le chat répondait 401 « Connexion requise ». onSources : liens officiels
// joints aux réponses juridiques (support légal façon Kandbaz).
export async function streamChat({ message, page, onDelta, onDone, onError, onSources }) {
  _GET_EN_COURS.clear();
  try {
    const resp = await fetch(`${API}/copilote/chat`, {
      method: "POST",
      headers: _headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ message, page }),
    });
    if (!resp.ok || !resp.body) {
      onError && onError(resp.status === 402 ? "Active ton offre pour discuter avec ton Copilote (Solo : 1 mois pour 1 €)." : "Réponse indisponible.");
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
          if (data.sources && onSources) onSources(data.sources, !!data.juridique);
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

// ── Revue hebdomadaire guidée par Zayado ──
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
export const fetchRadar = (refresh = false) => jget(refresh ? "/cockpit/radar?refresh=true" : "/cockpit/radar");
export const fetchProspects = () => jget("/radar/prospects");
export const fetchSignaux = () => jget("/radar/signaux");
export const fetchSourcesRadar = () => jget("/radar/sources");
export const saveReglagesRadar = (patch) => jsend("/radar/reglages", "PUT", patch);
export const majProspect = (id, statut) => jsend(`/radar/prospects/${id}`, "PATCH", { statut });
export const genererSwot = () => jsend("/radar/swot", "POST");
export const fetchImpact = () => jget("/cockpit/impact");
export const saveGeneratedDocument = (title, content, provider) => jsend("/documents/auto-save", "POST", { title, content, provider });

// ── Admin (accès réservé au rôle admin — vérifié côté serveur, pas ici) ──
export const fetchAdminVueEnsemble = () => jget("/admin/vue-ensemble");
export const fetchAdminDiagnostics = () => jget("/admin/diagnostics");
export const fetchAdminUtilisateurs = (params = {}) => jget(`/admin/utilisateurs?${_qs(params)}`);
export const changerRoleUtilisateur = (userId, role) => jsend(`/admin/utilisateurs/${userId}/role?nouveau_role=${encodeURIComponent(role)}`, "PATCH");
export const fetchModerationAttente = () => jget("/vendeur/moderation/attente");
export const publierProduitVendeur = (pid) => jsend(`/vendeur/moderation/${pid}/publier`, "POST");
export const refuserProduitVendeur = (pid, motif) => jsend(`/vendeur/moderation/${pid}/refuser`, "POST", { motif });
export const fetchAdminCommerceStats = () => jget("/admin/commerce/stats");
export const fetchAdminCommerceOrders = (status = "") => jget(`/admin/commerce/orders${status ? `?status=${encodeURIComponent(status)}` : ""}`);
export const changerStatutCommandeAdmin = (id, status) => jsend(`/admin/commerce/orders/${id}/status`, "PATCH", { status });
export const fetchAdminCommerceProducts = () => jget("/admin/commerce/products");
export const fetchAdminCommerceVendors = () => jget("/admin/commerce/vendors");
const _qs = (o) => Object.entries(o || {}).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
export const fetchAdminParrainage = (params = {}) => jget(`/admin/parrainage?${_qs(params)}`);
export const creerParrainageAdmin = (parrain_email, filleul_email) => jsendMsg("/admin/parrainage", "POST", { parrain_email, filleul_email });
export const modifierParrainageAdmin = (id, data) => jsendMsg(`/admin/parrainage/${id}`, "PATCH", data);
export const supprimerParrainageAdmin = (id) => jsendMsg(`/admin/parrainage/${id}`, "DELETE");
export const crediterMoisAdmin = (userId) => jsendMsg(`/admin/programmes/${userId}/crediter-mois`, "POST", {});
export const refuserProgrammeAdmin = (userId) => jsendMsg(`/admin/programmes/${userId}/refuser`, "POST", {});
// Comptes vendeurs & catalogue (admin)
export const modifierVendeurAdmin = (userId, data) => jsendMsg(`/admin/commerce/vendors/${userId}`, "PUT", data);
export const supprimerVendeurAdmin = (userId) => jsendMsg(`/admin/commerce/vendors/${userId}`, "DELETE");
export const modifierProduitAdmin = (pid, data) => jsendMsg(`/admin/commerce/products/${pid}`, "PUT", data);
export const supprimerProduitAdmin = (pid) => jsendMsg(`/admin/commerce/products/${pid}`, "DELETE");
// Utilisateurs (admin) : liste paginée + compte gratuit
export const passerCompteGratuit = (userId, actif, plan = "pro") => jsendMsg(`/admin/utilisateurs/${userId}/gratuit`, "PATCH", { actif, plan });
export const fetchAdminNotifications = () => jget("/admin/notifications");
export const appliquerCodePromo = (code) => jsend("/codes-promo/appliquer", "POST", { code });
export const fetchCodesPromo = () => jget("/admin/codes-promo");
export const creerCodePromo = (data) => jsend("/admin/codes-promo", "POST", data);
export const basculerCodePromo = (id, active) => jsend(`/admin/codes-promo/${id}`, "PUT", { active });
export const supprimerCodePromo = (id) => jsend(`/admin/codes-promo/${id}`, "DELETE");
export const fetchConnections = () => jget("/connections");
export const fetchMesFilleuls = () => jget("/parrainage/mes-filleuls");
export const inviterParrainage = (email) => jsend("/parrainage/inviter", "POST", { email });
// Programmes partenaires (parrainage / ambassadeur / affiliation)
export const fetchProgrammes = () => jget("/programmes");
export const fetchMonProgramme = () => jget("/programmes/mon-programme");
export const demanderProgramme = (programme) => jsend("/programmes/demander", "POST", { programme });
export const fetchAdminProgrammes = () => jget("/admin/programmes");
export const validerProgramme = (userId, programme) => jsend(`/admin/programmes/${userId}/valider`, "POST", { programme });
export const payerCommission = (userId) => jsend(`/admin/programmes/${userId}/payer`, "POST");

// ── Admin : demandes Collaborateurs + récupération du compte démo ──
export const fetchDemandesCollaborateur = () => jget("/admin/demandes-collaborateur");
export const fetchCompteDemo = () => jget("/admin/compte-demo");
export const transfererCompteDemo = (email, tables) => jsend("/admin/compte-demo/transferer", "POST", { email, tables });

// ── Agent Business (chatbot client à la marque de l'utilisateur) ──
export const fetchAgentsBusiness = () => jget("/agent-business");
export const creerAgentBusiness = (data) => jsend("/agent-business", "POST", data);
export const modifierAgentBusiness = (id, data) => jsend(`/agent-business/${id}`, "PUT", data);
// « Mes agents » : agents IA personnalisés (modèles, missions, branchement sur l'Agent Business).
export const fetchModelesAgents = () => jget("/agents-perso/modeles");
export const fetchMesAgents = () => jget("/agents-perso");
export const creerMonAgent = (data) => jsendDetail("/agents-perso", "POST", data);
export const modifierMonAgent = (id, data) => jsendDetail(`/agents-perso/${id}`, "PUT", data);
export const supprimerMonAgent = (id) => jsendDetail(`/agents-perso/${id}`, "DELETE");
export const historiqueMonAgent = (id) => jsendDetail(`/agents-perso/${id}/historique`, "GET");
export const effacerHistoriqueMonAgent = (id) => jsendDetail(`/agents-perso/${id}/historique`, "DELETE");
export const discuterMonAgent = (id, message) => jsendDetail(`/agents-perso/${id}/chat`, "POST", { message });
export const brancherMonAgent = (id, chatbot_id) => jsendDetail(`/agents-perso/${id}/brancher`, "POST", { chatbot_id });
export const fetchPublicationChatbot = (id) => jsendDetail(`/agent-business/${id}/publication`, "GET");
export const publierChatbot = (id, publier) => jsendDetail(`/agent-business/${id}/publication`, "POST", { publier });
export const testerAgentBusiness = (id, message, historique) =>
  jsend(`/agent-business/${id}/tester`, "POST", { message, historique });

// ── Offre d'un client (admin) et tarif fondateur ──
export const changerPlanUtilisateur = (userId, plan, jours = 31, fondateur = false) =>
  jsend(`/admin/utilisateurs/${userId}/plan`, "PATCH", { plan, jours, fondateur });
export const fetchTarifsFondateur = async () => {
  const r = await fetch(`${API}/tarifs/fondateur`);
  if (!r.ok) throw new Error("tarifs fondateur");
  return r.json();
};

// ── Paramètres : abonnement, commandes, export ──
export const fetchAbonnement = () => jget("/abonnement");
export const resilierAbonnement = () => jsend("/abonnement/resilier", "POST", {});
export const reprendreAbonnement = () => jsend("/abonnement/reprendre", "POST", {});
export const changerOffre = (plan) => jsend("/abonnement/changer", "POST", { plan });
export const fetchEquipe = () => jget("/equipe");
export const inviterCoequipier = (email) => jsend("/equipe", "POST", { email });
export const retirerCoequipier = (id) => jsend(`/equipe/${id}`, "DELETE");
export const fetchCommandes = () => jget("/commerce/orders");
/** Export RGPD : le lien direct n'envoyait pas le jeton (401). On télécharge avec l'en-tête. */
export async function telechargerExport() {
  const r = await fetch(`${API}/export`, { headers: _headers() });
  if (!r.ok) throw new Error(`export ${r.status}`);
  const blob = new Blob([JSON.stringify(await r.json(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `zayado-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ── Collaborateur humain (depuis le chat IA ou la page Collaborateurs) ──
export const envoyerDemandeCollaborateur = ({ message, objet = "", contact = "", important = false, channel = "collaborateur" }) =>
  jsend("/growth/work-request", "POST", { message, objet, contact, important, channel });

// ── Processus (sauvegardés côté serveur) ──
export const fetchProcessus = () => jget("/processus");
export const saveProcessus = (items) => jsend("/processus", "PUT", { items });
export const completerCheckin = (vitals) => jsend("/checkins/aujourdhui", "PATCH", vitals);
export const demarrerWhatsapp = () => jsend("/connections/whatsapp/start", "POST");
export const connecterTelegram = (bot_token) => jsend("/connections/telegram/connect", "POST", { bot_token });

// ── Statut de l'IA texte (bandeau de repli du cockpit) ──
// Sans clé Mammouth, le Copilote / Radar / Agent Business répondent un
// texte générique sans rien signaler à l'écran : ce statut alimente le
// bandeau d'alerte pour que le repli ne passe plus inaperçu.
export const fetchIaStatut = () => jget("/ia/statut");

// ── Bien-être & Mindset ──
export const fetchMindsetJour = () => jget("/mindset/aujourdhui");
export const fetchParcoursListe = () => jget("/mindset/parcours");
export const fetchParcours = (id) => jget(`/mindset/parcours/${id}`);
export const demarrerParcours = (id) => jsend(`/mindset/parcours/${id}/demarrer`, "POST", {});
export const envoyerReponses = (source, ref, reponses) => jsendDetail("/mindset/reponses", "POST", { source, ref, reponses });
export const fetchCarnet = () => jget("/mindset/carnet");
export const supprimerEntreeCarnet = (id) => jsend(`/mindset/carnet/${id}`, "DELETE");
export const recadrerPensee = (pensee) => jsend("/mindset/recadrer", "POST", { pensee });

// Lettre à ton futur moi : scellée jusqu'à la date choisie, annoncée par la cloche.
export const fetchLettres = () => jget("/mindset/lettres");
export const scellerLettre = (texte, ouvre_le) => jsendMsgCheck("/mindset/lettres", "POST", { texte, ouvre_le });
export const marquerLettreLue = (id) => jsend(`/mindset/lettres/${id}/lue`, "POST", {});

async function jsendMsgCheck(path, method, body) {
  _GET_EN_COURS.clear();
  const r = await fetch(`${API}${path}`, {
    method,
    headers: _headers({ "Content-Type": "application/json" }),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401) { setToken(null); _versLogin(); }
  if (!r.ok) {
    let msg = `${method} ${path} ${r.status}`;
    try { const d = await r.json(); if (d?.detail) msg = d.detail; } catch { /* pas de JSON */ }
    throw new Error(msg);
  }
  return r.json();
}


// ── Emails IA (admin) — les erreurs remontent le message du serveur (detail) ──
async function jsendMsg(path, method, body) {
  _GET_EN_COURS.clear();
  const r = await fetch(`${API}${path}`, {
    method,
    headers: _headers({ "Content-Type": "application/json" }),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401) { setToken(null); _versLogin(); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof data.detail === "string" ? data.detail : `${method} ${path} ${r.status}`);
  return data;
}
export const fetchEmailsIA = () => jget("/admin/emails-ia");
export const creerBrouillonEmailIA = (data) => jsendMsg("/admin/emails-ia/brouillon", "POST", data);
export const envoyerBrouillonEmailIA = (id) => jsendMsg(`/admin/emails-ia/${id}/envoyer`, "POST", {});
export const annulerBrouillonEmailIA = (id) => jsendMsg(`/admin/emails-ia/${id}/annuler`, "POST", {});
export const enregistrerCleBrevo = (data) => jsendMsg("/admin/emails-ia/cle-brevo", "POST", data);

// ── Ma Foi (TheSustain) : données personnelles + Mur de prière / Cercle partagés ──
export const fetchFoiEtat = () => jget("/foi/etat");
export const saveFoiEtat = (cle, valeur) => jsendMsg(`/foi/etat/${encodeURIComponent(cle)}`, "PUT", { valeur });
export const fetchFoiPosts = (espace, categorie, page = 1) =>
  jget(`/foi/posts?espace=${encodeURIComponent(espace)}${categorie && categorie !== "all" ? `&categorie=${encodeURIComponent(categorie)}` : ""}&page=${page}`);
export const publierFoiPost = (data) => jsendMsg("/foi/posts", "POST", data);
export const soutenirFoiPost = (id) => jsendMsg(`/foi/posts/${id}/soutenir`, "POST", {});
export const repondreFoiPost = (id, texte, genre = "encouragement") => jsendMsg(`/foi/posts/${id}/reponses`, "POST", { texte, genre });
export const supprimerFoiPost = (id) => jsendMsg(`/foi/posts/${id}`, "DELETE");
export const supprimerFoiReponse = (id) => jsendMsg(`/foi/reponses/${id}`, "DELETE");
export const modifierBrouillonEmailIA = (id, data) => jsendMsg(`/admin/emails-ia/${id}`, "PUT", data);
export const dupliquerEmailIA = (id) => jsendMsg(`/admin/emails-ia/${id}/dupliquer`, "POST", {});
// ── Canaux du Copilote (Telegram / WhatsApp, reliés par utilisateur) ──
export const fetchCanaux = () => jget("/canaux");
export const lienTelegram = () => jsendMsg("/canaux/telegram/lien", "POST", {});
export const qrWhatsapp = () => jsendMsg("/canaux/whatsapp/qr", "POST", {});
export const deconnecterCanal = (canal) => jsendMsg(`/canaux/${canal}`, "DELETE");

// ── Diagnostic d'équilibre (page publique + app) ──
export const saveDiagnostic = (data) => jsend("/diagnostic", "POST", data);
export const fetchDiagnostic = () => jget("/diagnostic");

// ── « Se connecter avec Zayado » (applications séparées : app RH entreprise…) ──
export const fetchClientSso = (client_id, redirect_uri) => jget(`/connexion/sso/client?client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}`);
export const creerCodeSso = (data) => jsend("/sso/code", "POST", data);

// ── Espaces cloud de l'utilisateur (Google Drive / OneDrive) : rattachés au compte connecté ──
export const oauthStockage = (provider) => jget(`/connexion/oauth/${provider}/start?purpose=storage`);

// ── Admin : Newsletters (Lot 4), Connexions (coffre), Logs applicatifs ──
export const fetchNewsletters = (statut) => jget(`/admin/newsletters${statut ? `?statut=${encodeURIComponent(statut)}` : ""}`);
export const fetchNewsletter = (id) => jget(`/admin/newsletters/${id}`);
export const majNewsletter = (id, data) => jsendMsg(`/admin/newsletters/${id}`, "PUT", data);
export const relancerNewsletter = (id) => jsendMsg(`/admin/newsletters/${id}/relancer`, "POST");
export const rejeterNewsletter = (id) => jsendMsg(`/admin/newsletters/${id}`, "DELETE");
export const pousserNewsletterBrevo = (id) => jsendMsg(`/admin/newsletters/${id}/pousser-brevo`, "POST");
export const fetchAdminConnexionsStats = () => jget("/admin/connections/stats");
export const fetchAdminConnexionsListe = () => jget("/admin/connections/list");
export const fetchAppLogs = (f = {}) => {
  const q = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)]));
  return jget(`/app-logs${q.toString() ? `?${q}` : ""}`);
};
export const fetchAppLogsSummary = () => jget("/app-logs/summary");
export const purgerAppLogs = (days = 30) => jsendMsg(`/app-logs/purge?days=${days}`, "DELETE");

// Ma Foi : signalements, « pour toi »
export const signalerFoiPost = (id, motif, commentaire) => jsendMsg(`/foi/posts/${id}/signaler`, "POST", { motif, commentaire });
export const fetchFoiPourMoi = (marquerVu = false) => jget(`/foi/pour-moi${marquerVu ? "?marquer_vu=true" : ""}`);
export const fetchAdminFoiSignalements = () => jget("/admin/foi/signalements");
export const deciderFoiSignalement = (postId, decision) => jsendMsg(`/admin/foi/signalements/${postId}`, "POST", { decision });

// Admin : équipe Zayado, fiche 360°, à traiter, journal, actions en groupe, export
export const fetchAdminEquipe = () => jget("/admin/equipe");
// Espace Pro : collègues rattachés à l'entreprise (Admin › Équipe).
export const fetchMembresEntreprise = () => jsendDetail("/admin/entreprise/membres", "GET");
export const ajouterMembreEntreprise = (data) => jsendDetail("/admin/entreprise/membres", "POST", data);
export const retirerMembreEntreprise = (email) => jsendDetail(`/admin/entreprise/membres/${encodeURIComponent(email)}`, "DELETE");
// Suspendre / supprimer un compte.
export const bloquerUtilisateur = (id, bloque, motif) => jsendDetail(`/admin/utilisateurs/${id}/bloquer`, "POST", { bloque, motif });
export const supprimerUtilisateur = (id, confirmation) => jsendDetail(`/admin/utilisateurs/${id}/supprimer`, "POST", { confirmation });
export const inviterEquipe = (d) => jsendMsg("/admin/equipe", "POST", d);
export const retirerEquipe = (email) => jsendMsg(`/admin/equipe/${encodeURIComponent(email)}`, "DELETE");
export const fetchAdminFiche = (id) => jget(`/admin/utilisateurs/${id}/fiche`);
export const fetchAdminATraiter = () => jget("/admin/a-traiter");
export const fetchAdminJournal = (q = "", page = 1) => jget(`/admin/journal?page=${page}${q ? `&q=${encodeURIComponent(q)}` : ""}`);
export const actionGroupeUtilisateurs = (d) => jsendMsg("/admin/utilisateurs/groupe", "POST", d);
export async function exporterUtilisateursCsv(f = {}) {
  const q = new URLSearchParams(Object.entries(f).filter(([, v]) => v).map(([k, v]) => [k, String(v)]));
  const r = await fetch(`${API}/admin/utilisateurs/export.csv${q.toString() ? `?${q}` : ""}`, { headers: _headers() });
  if (!r.ok) throw new Error("Export impossible.");
  const url = URL.createObjectURL(await r.blob());
  const a = document.createElement("a");
  a.href = url; a.download = `zayado-utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// Collaborateurs : suivi des demandes (utilisateur) et réponse (admin)
export const fetchMesDemandes = () => jget("/demandes-collaborateur/mes");
export const majDemandeCollaborateur = (id, d) => jsendMsg(`/admin/demandes-collaborateur/${id}`, "PATCH", d);

// Idées → Plan d'action : une idée décidée devient une action ou un objectif (une seule fois)
export const transformerIdee = (id, vers, extra = {}) => jsendDetail(`/idees/${id}/transformer`, "POST", { vers, ...extra });
export const suggererIdees = (contexte) => jsendDetail("/idees/suggestions", "POST", { contexte });

// Bien-être : bloquer une vraie pause (action + rappel Telegram)
export const bloquerPause = (d) => jsendMsg("/bien-etre/pause", "POST", d);

// Mon entreprise (organisation) : recherche par nom/SIRET et enregistrement
export const fetchOrganisation = () => jget("/organisation");
export const rechercherEntreprise = (q) => jget(`/organisation/recherche?q=${encodeURIComponent(q)}`);
export const enregistrerOrganisation = (d) => jsendMsg("/organisation", "PUT", d);
export const retirerOrganisation = () => jsendMsg("/organisation", "DELETE");
