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
  // Mode aperçu (preview/localhost) sans jeton = compte démo volontaire :
  // aucun 401 ne doit expulser vers /login (sinon le compte test Thomas boucle).
  if (/(preview\.emergentagent\.com|localhost|127\.0\.0\.1)/i.test(window.location.hostname) && !getToken()) return;
  // 401 = session absente/expirée : on renvoie vers /login, mais seulement depuis l'app (pas la landing).
  const p = window.location.pathname;
  if (p.startsWith("/app") || p.startsWith("/onboarding") || p.startsWith("/parametres") || p.startsWith("/espace-vendeur") || p.startsWith("/compte") || p.startsWith("/acheter")) window.location.assign("/login");
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
// `origine` / `origine_detail` : d'où vient cette action. Le Radar s'en sert pour
// qu'une action déposée dans le Plan d'action garde la trace du signal qui l'a
// justifiée — sinon, trois jours plus tard, elle n'est plus qu'une ligne de plus.
export const creerTache = (titre, duree_min = 15, objectif_id = null, origine = null, origine_detail = null) =>
  jsend("/taches", "POST", { titre, duree_min, ...(objectif_id ? { objectif_id } : {}),
    ...(origine ? { origine } : {}), ...(origine_detail ? { origine_detail } : {}) });
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
// Le serveur ne rappelle l'IA que si ton contexte a changé (nouveau check-in, objectif…) : ouvrir l'appli
// plusieurs fois ne dépense plus de jetons. `refresh` force une nouvelle rédaction (3 par jour).
export const fetchPointDuJour = (refresh = false) => jget(refresh ? "/copilote/point-du-jour?refresh=true" : "/copilote/point-du-jour");
// Charge de travail du jour (sans IA) : niveau + conseil (déléguer, ralentir…).
export const fetchChargeTravail = () => jget("/charge-travail");
export const fetchDecisions = () => jget("/copilote/decisions");
export const suggererDecisions = () => jsend("/copilote/decisions/suggerer", "POST");
export const patchDecision = (id, statut, canal) => jsend(`/copilote/decisions/${id}`, "PATCH", { statut, canal });
export const validerDecisionEmail = (id) => jsend(`/copilote/decisions/${id}/valider-email`, "POST");
// bref:false = sans résumé IA (juste savoir s'il y a du contenu : pastille de la cloche).
// force:true = bouton « Actualiser » (le serveur garde sinon le bref du jour, stable jusqu'à demain).
export const fetchActualite = (filtre = "", { bref = true, force = false } = {}) => {
  const q = [filtre ? `filtre=${filtre}` : "", bref ? "" : "bref=0", force ? "force=1" : ""].filter(Boolean).join("&");
  return jget(`/copilote/actualite${q ? `?${q}` : ""}`);
};
// Boîte de notifications de la cloche (tout ce que le serveur a envoyé : réponses de l'IA, actu du jour, relances).
export const fetchNotifications = () => jget("/notifications");
export const marquerNotifLue = (id) => jsend(`/notifications/${id}/lu`, "POST");
export const toutMarquerLu = () => jsend("/notifications/tout-lu", "POST");
// Les 100 derniers messages du Copilote (conservés côté serveur) : la conversation se retrouve après un rechargement.
export const fetchHistoriqueChat = () => jget("/copilote/history");
export const fetchActualiteOptions = () => jget("/copilote/actualite/options");
export const resumerActualites = (articles) => jsend("/copilote/actualite/resumes", "POST", { articles });
export const testerActualite = () => jsend("/copilote/actualite/test", "POST");
export const fetchActualiteStatut = () => jget("/copilote/actualite/statut");
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
export const demanderLien = (email, origin, suite) => jsend("/connexion/lien", "POST", { email, origin, ...(suite ? { suite } : {}) });
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
export const ajouterVictoire = (texte) => jsendDetail("/victoires", "POST", { texte });
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
export const fetchContactsPartage = () => jget("/vision/contacts-partage");
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
export async function streamChat({ message, page, onDelta: onDeltaBrut, onDone: onDoneBrut, onError, onSources }) {
  _GET_EN_COURS.clear();
  // Affichage fluide : le texte reçu par paquets est écrit mot par mot, à vitesse régulière
  // (plus vite si beaucoup de texte est en attente), au lieu d'apparaître d'un bloc.
  let file = "", fini = false, timer = null, termine = false;
  const vider = () => {
    if (!file) { timer = null; if (fini && !termine) { termine = true; onDoneBrut && onDoneBrut(); } return; }
    const salve = file.length > 400 ? 3 : file.length > 150 ? 2 : 1;
    let sortie = "", k = 0, reste = file;
    while (k < salve && reste) { const mm = reste.match(/^\s*\S+\s?/); const t = mm ? mm[0] : reste; sortie += t; reste = reste.slice(t.length); k++; }
    file = reste;
    onDeltaBrut && onDeltaBrut(sortie);
    timer = setTimeout(vider, 28);
  };
  const onDelta = (d) => { file += d; if (!timer) timer = setTimeout(vider, 0); };
  const onDone = () => { fini = true; if (!timer) vider(); };
  let langue = "fr";
  try { langue = localStorage.getItem("kairos_lang") || "fr"; } catch { /* */ }
  try {
    const resp = await fetch(`${API}/copilote/chat`, {
      method: "POST",
      headers: _headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ message, page, langue }),
    });
    if (!resp.ok || !resp.body) {
      onError && onError(resp.status === 402 ? "Active ton offre pour discuter avec ton Copilote (Solo : 2 mois pour 1 € · Rêveur : 1 mois offert)." : "Réponse indisponible.");
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
    // coupee:true = la connexion a lâché (réseau, téléphone verrouillé, onglet en veille). Le serveur continue d'écrire
    // la réponse de son côté : l'appelant peut la récupérer dans l'historique au lieu d'afficher une erreur.
    onError && onError("Connexion à l'assistant impossible.", { coupee: true });
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
// Le SWOT enregistré se LIT (aucun appel IA) ; il ne se régénère que sur demande.
export const lireSwot = () => jget("/radar/swot");
export const genererSwot = () => jsend("/radar/swot", "POST");
export const fetchImpact = () => jget("/cockpit/impact");
// Documents IA : Word, Excel, Markdown, CSV, texte, images — téléchargés ou rangés dans le Drive.
export const relierTrello = (api_key, token) => jsendDetail("/plan-action/trello", "POST", { api_key, token });
export const choisirListeTrello = (list_id) => jsendDetail("/plan-action/trello/liste", "PUT", { list_id });
export const fetchTrello = () => jsendDetail("/plan-action/trello", "GET");
export const fetchContexteCopilote = () => jsendDetail("/copilote/contexte", "GET");
export const fetchDossierDocuments = () => jsendDetail("/documents/dossier", "GET");
export const reglerDossierDocuments = (url) => jsendDetail("/documents/dossier", "PUT", { url });
export const ouvrirMesDocuments = () => jsendDetail("/documents/ouvrir", "GET");
export const rangerDocumentDrive = (titre, contenu, format) => jsendDetail("/documents/generer", "POST", { titre, contenu, format, destination: "drive" });
export const creerImageIA = (description) => jsendDetail("/documents/image", "POST", { description });
export const rangerFichierDrive = (nom, mime, data) => jsendDetail("/documents/ranger-fichier", "POST", { nom, mime, data });
export async function telechargerDocument(titre, contenu, format) {
  const r = await fetch(`${API}/documents/generer`, {
    method: "POST", headers: _headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ titre, contenu, format, destination: "telecharger" }),
  });
  if (!r.ok) { const j = await r.json().catch(() => ({})); const e = new Error(j.detail || "Téléchargement impossible."); e.detail = j.detail; throw e; }
  const blob = await r.blob();
  const nom = decodeURIComponent((r.headers.get("content-disposition") || "").split("''")[1] || `document.${format}`);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = nom; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
export const saveGeneratedDocument = (title, content, provider) => jsend("/documents/auto-save", "POST", { title, content, provider });

// ── Admin (accès réservé au rôle admin — vérifié côté serveur, pas ici) ──
export const fetchAdminVueEnsemble = () => jget("/admin/vue-ensemble");
// Chiffres de la console admin : toujours frais (jamais le cache de 2 s), sinon un compteur peut rester figé juste après une suppression.
export const fetchAdminRetention = () => _jgetReseau("/admin/retention");
export const fetchAdminDiagnostics = () => jget("/admin/diagnostics");
export const fetchAdminUtilisateurs = (params = {}) => _jgetReseau(`/admin/utilisateurs?${_qs(params)}`);
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
export const fetchAdminNotificationsSante = () => jget("/admin/notifications/sante");
export const testerNotificationsAdmin = (email, canaux) => jsend("/admin/notifications/test", "POST", { email, canaux });
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
// Missions d'agent : l'agent agit (web, navigateur, cockpit) ; l'e-mail attend toujours ton accord
export const agentDefaut = () => jget("/agents-perso/defaut");
export const agentDefautMaj = (data) => jsendDetail("/agents-perso/defaut", "PUT", data);
export const capacitesAgents = () => jget("/agents-perso/capacites");
export const lancerMission = (id, objectif) => jsendDetail(`/agents-perso/${id}/missions`, "POST", { objectif });
export const missionsAgent = (id) => jsendDetail(`/agents-perso/${id}/missions`, "GET");
export const lireMission = (id) => jsendDetail(`/missions/${id}`, "GET");
export const validerMission = (id, accepter, args = null) => jsendDetail(`/missions/${id}/valider`, "POST", { accepter, args });
export const arreterMission = (id) => jsendDetail(`/missions/${id}/arreter`, "POST", {});
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
export const fetchCommandesBoutique = () => jget("/shopify/mes-commandes");
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

// ── Ma Foi nourrit le MÊME moteur que Bien-être ──
// Le serveur tient déjà un seul carnet (mindset_entrees), une seule série de jours
// et la règle « un seul parcours à la fois ». Ces deux routes existaient sans
// aucun appelant : Ma Foi continuait d'écrire dans son coin, et l'utilisateur
// chrétien se retrouvait avec deux carnets, deux séries et deux « fait aujourd'hui ».
export const gesteFoi = (genre, reponses = []) => jsend("/mindset/foi/geste", "POST", { genre, reponses });
export const jourParcoursFoi = (pid, n, fait = true) => jsendDetail(`/mindset/foi/parcours/${pid}/jour/${n}`, "POST", { fait });

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
export const testerEmailAdmin = () => jsendDetail("/admin/email/test", "POST", {});
export const fetchMembresEntreprise = () => jsendDetail("/admin/entreprise/membres", "GET");
export const ajouterMembreEntreprise = (data) => jsendDetail("/admin/entreprise/membres", "POST", data);
export const retirerMembreEntreprise = (email) => jsendDetail(`/admin/entreprise/membres/${encodeURIComponent(email)}`, "DELETE");
// Suspendre / supprimer un compte.
export const bloquerUtilisateur = (id, bloque, motif) => jsendDetail(`/admin/utilisateurs/${id}/bloquer`, "POST", { bloque, motif });
export const supprimerUtilisateursGroupe = (ids, confirmation) => jsendDetail("/admin/utilisateurs/supprimer-groupe", "POST", { ids, confirmation });
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
export const analyserIdee = (id) => jsendDetail(`/idees/${id}/analyser`, "POST", {});
export const transformerIdee = (id, vers, extra = {}) => jsendDetail(`/idees/${id}/transformer`, "POST", { vers, ...extra });
export const suggererIdees = (contexte) => jsendDetail("/idees/suggestions", "POST", { contexte });

// Bien-être : bloquer une vraie pause (action + rappel Telegram)
export const bloquerPause = (d) => jsendMsg("/bien-etre/pause", "POST", d);

// Mon entreprise (organisation) : recherche par nom/SIRET et enregistrement
export const fetchOrganisation = () => jget("/organisation");
export const rechercherEntreprise = (q) => jget(`/organisation/recherche?q=${encodeURIComponent(q)}`);
export const enregistrerOrganisation = (d) => jsendMsg("/organisation", "PUT", d);
export const retirerOrganisation = () => jsendMsg("/organisation", "DELETE");

// ── Équipe : idées partagées ──
export const fetchEspaceEquipe = () => jget("/equipe/espace");
export const partagerIdee = (id, partage) => jsendDetail(`/idees/${id}/partager`, "POST", { partage });
export const fetchIdeesEquipe = () => jget("/equipe/idees");
export const fetchCommentairesIdee = (id) => jget(`/equipe/idees/${id}/commentaires`);
export const commenterIdee = (id, texte) => jsendDetail(`/equipe/idees/${id}/commentaires`, "POST", { texte });
export const prendreIdee = (id) => jsendDetail(`/equipe/idees/${id}/prendre`, "POST", {});

// ── Ton entreprise (équipe) ──
export const entMoi = () => jget("/entreprise/moi");
export const entApercu = () => jget("/entreprise/apercu");
export const entActiver = (nom) => jsendDetail("/entreprise/activer", "POST", { nom });
export const entMembres = () => jget("/entreprise/membres");
export const entInviter = (data) => jsendDetail("/entreprise/membres", "POST", data);
export const entLienInvitation = (id) => jsendDetail(`/entreprise/membres/${id}/lien`, "POST", {});
export const entModifierMembre = (id, patch) => jsendDetail(`/entreprise/membres/${id}`, "PATCH", patch);
export const entSupprimerMembre = (id) => jsendDetail(`/entreprise/membres/${id}`, "DELETE");
export const entQuitter = () => jsendDetail("/entreprise/moi", "DELETE");
export const entExporter = (id) => jget(`/entreprise/membres/${id}/export`);
export const entInvitationInfos = (token) => jget(`/public/entreprise/invitation/${encodeURIComponent(token)}`);
export const entRejoindre = (token) => jsendDetail("/entreprise/rejoindre", "POST", { token });
export const entPresence = (debut, fin) => jget(`/entreprise/presence?debut=${debut}&fin=${fin}`);
export const entPresenceMaj = (data) => jsendDetail("/entreprise/presence", "PUT", data);
export const entAbsences = () => jget("/entreprise/absences");
export const entAbsenceCreer = (data) => jsendDetail("/entreprise/absences", "POST", data);
export const entAbsenceDecider = (id, statut, commentaire = "") => jsendDetail(`/entreprise/absences/${id}/decision`, "PATCH", { statut, commentaire });
export const entAbsenceAnnuler = (id) => jsendDetail(`/entreprise/absences/${id}`, "DELETE");
export const entPlanning = (debut, fin) => jget(`/entreprise/planning?debut=${debut}&fin=${fin}`);
export const entPlanningCreer = (data) => jsendDetail("/entreprise/planning", "POST", data);
export const entPlanningSupprimer = (id) => jsendDetail(`/entreprise/planning/${id}`, "DELETE");
export const entTemps = (debut, fin) => jget(`/entreprise/temps?debut=${debut}&fin=${fin}`);
export const entTempsCreer = (data) => jsendDetail("/entreprise/temps", "POST", data);
export const entTempsSupprimer = (id) => jsendDetail(`/entreprise/temps/${id}`, "DELETE");
export const entPieces = () => jget("/entreprise/pieces");
export const entPieceCreer = (data) => jsendDetail("/entreprise/pieces", "POST", data);
export const entPieceMaj = (id, patch) => jsendDetail(`/entreprise/pieces/${id}`, "PATCH", patch);
export const entContrats = () => jget("/entreprise/contrats");
export const entContratCreer = (data) => jsendDetail("/entreprise/contrats", "POST", data);
export const entContratSupprimer = (id) => jsendDetail(`/entreprise/contrats/${id}`, "DELETE");
export const entParametres = (patch) => jsendDetail("/entreprise/parametres", "PATCH", patch);
export const entJournal = () => jget("/entreprise/journal");
export const entSecuLire = (id) => jget(`/entreprise/membres/${id}/secu`);
export const entSecuEcrire = (id, numero) => jsendDetail(`/entreprise/membres/${id}/secu`, "PUT", { numero });
// Pièces : liste de l'entreprise, dépôt dans le Drive, validation ; planning indiqué par la personne ; coordonnées ; Excel
export const entPieceSupprimer = (id) => jsendDetail(`/entreprise/pieces/${id}`, "DELETE");
export const entTypesPieces = () => jget("/entreprise/types-pieces");
export const entTypePieceCreer = (data) => jsendDetail("/entreprise/types-pieces", "POST", data);
export const entTypePieceSupprimer = (id) => jsendDetail(`/entreprise/types-pieces/${id}`, "DELETE");
export const entTypePieceDemander = (id, membre_ids = null) => jsendDetail(`/entreprise/types-pieces/${id}/demander`, "POST", { membre_ids });
export const entMonDrive = () => jget("/entreprise/mon-drive");
export const entFiche = (id = "moi") => jget(`/entreprise/fiches/${id}`);
export const entFicheMaj = (id, data) => jsendDetail(`/entreprise/fiches/${id}`, "PUT", data);
export const entAnnuaire = () => jget("/entreprise/annuaire");
export const entPlanningARegarder = () => jget("/entreprise/planning/a-regarder");
export const entPlanningVu = (id) => jsendDetail(`/entreprise/planning/${id}/vu`, "PATCH", {});
export const entCommentaires = (cible_type, cible_id) => jget(`/entreprise/commentaires?cible_type=${cible_type}&cible_id=${encodeURIComponent(cible_id)}`);
export const entCommenter = (cible_type, cible_id, texte) => jsendDetail("/entreprise/commentaires", "POST", { cible_type, cible_id, texte });
async function _entTelecharger(path, nom) {
  const r = await fetch(`${API}${path}`, { headers: _headers() });
  if (r.status === 401) { setToken(null); _versLogin(); }
  if (!r.ok) { const j = await r.json().catch(() => ({})); const e = new Error(j.detail || "Téléchargement impossible."); e.detail = j.detail; throw e; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(await r.blob()); a.download = nom; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
export const entDecompte = (mois, membre_id = null) => jget(`/entreprise/decompte?mois=${mois}${membre_id ? `&membre_id=${membre_id}` : ""}`);
export const entDecompteExport = (mois, membre_id = null, nom = "") =>
  _entTelecharger(`/entreprise/decompte/export?mois=${mois}${membre_id ? `&membre_id=${membre_id}` : ""}`, `Compte-rendu-${mois}${nom ? `-${nom}` : ""}.xlsx`);
export const entRemuneration = (id = "moi") => jget(`/entreprise/remunerations/${id}`);
export const entRemunerationMaj = (id, data) => jsendDetail(`/entreprise/remunerations/${id}`, "PUT", data);
export const entVersement = (membre_id, mois, montant) => jsendDetail("/entreprise/versements", "PUT", { membre_id, mois, montant });
export const entExcelModele = () => _entTelecharger("/entreprise/excel/modele", "Ton-entreprise-modele.xlsx");
export const entExcelExport = () => _entTelecharger("/entreprise/excel/export", "Ton-entreprise-export.xlsx");
export async function entExcelImport(fichier) {
  _GET_EN_COURS.clear();
  const fd = new FormData();
  fd.append("fichier", fichier);
  const r = await fetch(`${API}/entreprise/excel/import`, { method: "POST", headers: _headers(), body: fd });
  if (r.status === 401) { setToken(null); _versLogin(); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.detail || "Import impossible."); e.detail = j.detail; throw e; }
  return j;
}

// Reprise & cession : dossiers de rachat / de vente, financement, étapes, documents, suivi de rentabilité
export const cessionReference = () => jget("/cession/reference");
export const cessionDossiers = () => jget("/cession/dossiers");
export const cessionDossier = (id) => jsendDetail(`/cession/dossiers/${id}`, "GET");
export const cessionCreer = (data) => jsendDetail("/cession/dossiers", "POST", data);
export const cessionModifier = (id, data) => jsendDetail(`/cession/dossiers/${id}`, "PUT", data);
export const cessionSupprimer = (id) => jsendDetail(`/cession/dossiers/${id}`, "DELETE");
export const cessionEtapes = (id, faites) => jsendDetail(`/cession/dossiers/${id}/etapes`, "PUT", { faites });
export const cessionDoc = (id, titre, url) => jsendDetail(`/cession/dossiers/${id}/documents`, "POST", { titre, url });
export const cessionDocRetirer = (id, docId) => jsendDetail(`/cession/dossiers/${id}/documents/${docId}`, "DELETE");
export const cessionSuivi = (id, data) => jsendDetail(`/cession/dossiers/${id}/suivi`, "PUT", data);
export const cessionSuiviRetirer = (id, mois) => jsendDetail(`/cession/dossiers/${id}/suivi/${mois}`, "DELETE");
export const cessionAnalyse = (id) => jsendDetail(`/cession/dossiers/${id}/analyse`, "POST", {});

// Ton entreprise : chronomètre (aussi piloté par le chat), assistant de l'entreprise, dossier de reprise partagé
export const entChrono = () => jget("/entreprise/chrono");
export const entChronoDemarrer = (projet = "", extra = {}) => jsendDetail("/entreprise/chrono/demarrer", "POST", { projet, ...extra });
export const entSuiviTemps = () => jget("/entreprise/suivi-temps");
export const entSuiviTempsMaj = (membreId, mode) => jsendDetail(`/entreprise/suivi-temps/${membreId}`, "PUT", { mode });
export const entDecompteDossiers = (debut, fin) => jget(`/entreprise/temps/decompte?debut=${debut}&fin=${fin}`);
export const entDecompteDossiersExport = (debut, fin, format) => _entTelecharger(`/entreprise/temps/decompte?debut=${debut}&fin=${fin}&format=${format}`, `Decompte-temps-${debut}-${fin}.${format}`);
export const entDecompteDossiersEnvoyer = (debut, fin, a) => jsendDetail("/entreprise/temps/decompte/envoyer", "POST", { debut, fin, a });
export const entChronoArreter = () => jsendDetail("/entreprise/chrono/arreter", "POST", {});
export const entAssistant = (message, historique = []) => jsendDetail("/entreprise/assistant", "POST", { message, historique });
export const entReprise = () => jget("/entreprise/reprise");
export const cessionPartager = (id, email_dirigeant) => jsendDetail(`/cession/dossiers/${id}/partage`, "PUT", { email_dirigeant });
export const entRadar = () => jget("/entreprise/radar");
export const entLiaison = () => jget("/entreprise/liaison");
export const entLiaisonDemander = (email_perso) => jsendDetail("/entreprise/liaison", "POST", { email_perso });
export const entLiaisonAccepter = (jeton) => jsendDetail("/entreprise/liaison/accepter", "POST", { jeton });
export const entLiaisonNotifs = (notif_perso) => jsendDetail("/entreprise/liaison/notifs", "PUT", { notif_perso });
export const entLiaisonDelier = () => jsendDetail("/entreprise/liaison", "DELETE");
export const entInstaller = (fournisseur) => jsendDetail("/entreprise/installer", "POST", { fournisseur });
export const entInstallation = () => jget("/entreprise/installation");
export const entSourceFichiers = (fournisseur, q = "") => jget(`/entreprise/source/fichiers?fournisseur=${fournisseur}&q=${encodeURIComponent(q)}`);
export const entSourceAnalyser = (fournisseur, fichier_id) => jsendDetail("/entreprise/source/analyser", "POST", { fournisseur, fichier_id });
export const entSourceEnregistrer = (data) => jsendDetail("/entreprise/source", "PUT", data);
export const entSourceSynchroniser = () => jsendDetail("/entreprise/source/synchroniser", "POST", {});
export const entSource = () => jget("/entreprise/source");
export const entSourceDelier = () => jsendDetail("/entreprise/source", "DELETE");
export const questionIntegrations = () => jget("/actions/question-integrations");
export const repondreIntegrations = (reponse) => jsendDetail("/actions/question-integrations", "PUT", { reponse });
