'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT || 3000);
const SERVICE_SECRET = process.env.WA_SERVICE_SECRET || '';
const BACKEND_URL = (process.env.BACKEND_URL || process.env.ZAYADO_BACKEND_URL || '').replace(/\/$/, '');
const DATA_PATH = process.env.WA_DATA_PATH || '/data/.wwebjs_auth';
const START_ON_BOOT = process.env.WA_START_ON_BOOT === 'true';
// Numéros (hors toi) autorisés à parler au bot, séparés par des virgules. Vide = personne d'autre.
const ALLOWED_NUMBERS = (process.env.WA_ALLOWED_NUMBERS || '')
  .split(',').map((n) => n.replace(/\D/g, '')).filter(Boolean);
// Préfixe des réponses du bot : évite qu'il se réponde à lui-même dans « Moi-même ».
const BOT_PREFIX = '🤖 ';
const handled = new Set();
const sessions = new Map();

function requireSecret(req, res, next) {
  if (!SERVICE_SECRET) return res.status(503).json({ error: 'WA_SERVICE_SECRET non configure' });
  const received = req.header('x-service-secret') || req.header('x-secret') || '';
  if (received !== SERVICE_SECRET) return res.status(401).json({ error: 'Non autorise' });
  next();
}

function backendWebhookUrl() {
  if (!BACKEND_URL) return '';
  return `${BACKEND_URL}/api/webhooks/whatsapp-web`;
}

function backendReadyUrl() {
  if (!BACKEND_URL) return '';
  return `${BACKEND_URL}/api/webhooks/whatsapp-web-ready`;
}

async function notifyBackendReady(session) {
  if (!BACKEND_URL) return;
  try {
    await axios.post(backendReadyUrl(), {
      agent_id: session.agentId,
      phone_number: session.phoneNumber || null
    }, {
      timeout: 15000,
      headers: { 'x-service-secret': SERVICE_SECRET }
    });
  } catch (error) {
    console.warn('[WA] callback ready failed:', error.message);
  }
}

function backendDisconnectedUrl() {
  if (!BACKEND_URL) return '';
  return `${BACKEND_URL}/api/webhooks/whatsapp-web-disconnected`;
}

// Prévient Zayado que la session est tombée : l'app affiche l'alerte et le bouton « Reconnecter ».
async function notifyBackendDisconnected(session) {
  if (!BACKEND_URL) return;
  try {
    await axios.post(backendDisconnectedUrl(), { agent_id: session.agentId }, {
      timeout: 15000,
      headers: { 'x-service-secret': SERVICE_SECRET }
    });
  } catch (error) {
    console.warn('[WA] callback disconnected failed:', error.message);
  }
}

async function relayInboundMessage(session, message) {
  const url = backendWebhookUrl();
  if (!url) return null;
  try {
    const response = await axios.post(url, {
      agent_id: session.agentId,
      from: (message.from || '').replace('@c.us', ''),
      message: message.body || ''
    }, {
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'x-service-secret': SERVICE_SECRET
      }
    });
    return response.data?.reply || null;
  } catch (error) {
    console.error('[WA] backend webhook failed:', error.response?.data || error.message);
    return null;
  }
}

function buildSession(agentId, agentWebhookToken) {
  const existing = sessions.get(agentId);
  if (existing) return existing;

  // Verrous Chromium laissés par un arrêt brutal (kill, crash) : sans ce nettoyage,
  // le navigateur refuse de rouvrir le profil (« The browser is already running… »).
  retirerVerrousChromium(path.join(DATA_PATH, `session-zayado-${agentId}`));

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `zayado-${agentId}`,
      dataPath: DATA_PATH
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
  });

  const session = {
    agentId,
    agentWebhookToken,
    client,
    status: 'initializing',
    qr: null,
    qrDataUrl: null,
    phoneNumber: null,
    message: 'Initialisation…',
    createdAt: new Date().toISOString()
  };

  client.on('qr', async (qr) => {
    session.status = 'qr';
    session.message = 'Scannez le QR code avec WhatsApp';
    session.qr = qr;
    try {
      session.qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
    } catch (error) {
      console.warn('[WA] QR render failed:', error.message);
    }
  });

  client.on('authenticated', () => {
    session.status = 'authenticated';
    session.message = 'Authentification WhatsApp réussie';
  });

  client.on('ready', async () => {
    session.status = 'ready';
    session.message = 'WhatsApp connecté';
    session.qr = null;
    session.qrDataUrl = null;
    session.phoneNumber = client.info?.wid?.user || null;
    await notifyBackendReady(session);
    console.log(`[WA] agent ${agentId} ready (${session.phoneNumber || 'unknown'})`);
  });

  client.on('auth_failure', (message) => {
    session.status = 'auth_failure';
    session.message = String(message || 'Échec authentification');
  });

  client.on('disconnected', (reason) => {
    session.status = 'disconnected';
    session.message = String(reason || 'Déconnecté');
    session.phoneNumber = null;
    notifyBackendDisconnected(session);
    // Déconnexion volontaire depuis le téléphone (LOGOUT) : on ne relance pas, il faut un nouveau QR.
    if (String(reason).toUpperCase() === 'LOGOUT') return;
    setTimeout(async () => {
      if (sessions.get(agentId) !== session || session.status === 'ready') return;
      try { await client.destroy(); } catch (_) { /* déjà fermé */ }
      sessions.delete(agentId);
      buildSession(agentId, agentWebhookToken);
    }, 15000);
  });

  client.on('change_state', (state) => {
    session.waState = state;
  });

  // « message_create » couvre aussi tes propres messages (conversation « Moi-même »).
  client.on('message_create', async (message) => {
    try {
      if (message.isStatus) return;
      const body = (message.body || '').trim();
      if (!body || body.startsWith(BOT_PREFIX.trim())) return;
      const id = message.id?._serialized;
      if (id) {
        if (handled.has(id)) return;
        handled.add(id);
        if (handled.size > 500) handled.delete(handled.values().next().value);
      }
      const selfId = client.info?.wid?._serialized;
      const selfChat = message.fromMe && selfId && message.to === selfId;
      const sender = (message.from || '').replace(/@.*$/, '');
      const allowedContact = !message.fromMe && ALLOWED_NUMBERS.includes(sender);
      if (!selfChat && !allowedContact) return; // jamais les autres contacts
      if (session.status !== 'ready') return;

      const reply = await relayInboundMessage(session, message);
      if (reply) {
        await client.sendMessage(selfChat ? selfId : message.from, BOT_PREFIX + reply);
      }
    } catch (error) {
      console.error('[WA] message handling failed:', error.message);
    }
  });

  client.on('error', (error) => {
    session.status = 'error';
    session.message = error?.message || 'Erreur WhatsApp';
    console.error(`[WA] agent ${agentId}:`, error);
  });

  sessions.set(agentId, session);
  client.initialize().catch((error) => {
    session.status = 'error';
    session.message = error?.message || 'Échec initialisation';
    console.error(`[WA] init failed for ${agentId}:`, error);
  });

  return session;
}

function serializeSession(session) {
  return {
    agent_id: session.agentId,
    status: session.status,
    message: session.message,
    phone_number: session.phoneNumber,
    qr: session.qrDataUrl,
    wa_state: session.waState || null,
    created_at: session.createdAt
  };
}


// ── Reprise des sessions après un redémarrage / redéploiement Railway ──────────────────────────────
// Avant : la liste des sessions n'existait qu'en mémoire. Après chaque redéploiement elle était vide : la
// session WhatsApp (pourtant gardée sur le volume /data) n'était plus relancée, donc plus aucune réponse,
// alors que Zayado affichait toujours « connecté ». On relit maintenant le volume au démarrage.
let restoredAtBoot = 0;
const DOSSIER_PREFIXE = 'session-zayado-';

function volumeOk() {
  try { fs.accessSync(DATA_PATH, fs.constants.W_OK); return true; } catch (_) { return false; }
}

// Chromium laisse des verrous quand le conteneur est arrêté brutalement : sans les retirer, le navigateur
// refuse de rouvrir le profil (« The browser is already running… »).
function retirerVerrousChromium(dossier) {
  for (const nom of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
    try { fs.rmSync(path.join(dossier, nom), { force: true }); } catch (_) { /* déjà absent */ }
  }
  try { fs.rmSync(path.join(dossier, 'Default', 'LOCK'), { force: true }); } catch (_) { /* déjà absent */ }
}

function restaurerSessions() {
  let entrees = [];
  try { entrees = fs.readdirSync(DATA_PATH, { withFileTypes: true }); } catch (error) {
    console.warn(`[WA] volume illisible (${DATA_PATH}) :`, error.message);
    return;
  }
  const dossiers = entrees.filter((e) => e.isDirectory() && e.name.startsWith(DOSSIER_PREFIXE));
  dossiers.forEach((d, i) => {
    const agentId = d.name.slice(DOSSIER_PREFIXE.length);
    if (!agentId || sessions.has(agentId)) return;
    retirerVerrousChromium(path.join(DATA_PATH, d.name));
    // Un démarrage après l'autre : plusieurs Chromium d'un coup font tomber un conteneur de 1 Go.
    setTimeout(() => {
      console.log(`[WA] reprise de la session ${agentId}`);
      buildSession(agentId, 'kairos-mono');
    }, i * 20000);
    restoredAtBoot += 1;
  });
  if (!dossiers.length) console.log('[WA] aucune session à reprendre sur le volume.');
}

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'whatsapp-service',
    sessions: sessions.size,
    sessions_ready: [...sessions.values()].filter((x) => x.status === 'ready').length,
    sessions_restored_at_boot: restoredAtBoot,
    volume_ok: volumeOk(),
    backend_configured: Boolean(BACKEND_URL),
    secret_configured: Boolean(SERVICE_SECRET)
  });
});

app.get('/', (_req, res) => {
  res.json({ service: 'WhatsApp-service', status: 'online', sessions: sessions.size });
});

app.post('/session/start', requireSecret, async (req, res) => {
  const { agent_id: agentId, agent_webhook_token: agentWebhookToken } = req.body || {};
  if (!agentId || !agentWebhookToken) {
    return res.status(400).json({ error: 'agent_id et agent_webhook_token sont requis' });
  }
  const session = buildSession(agentId, agentWebhookToken);
  return res.json(serializeSession(session));
});

app.get('/session/:agentId/status', requireSecret, (_req, res) => {
  const session = sessions.get(_req.params.agentId);
  if (!session) return res.json({ agent_id: _req.params.agentId, status: 'not_started' });
  return res.json(serializeSession(session));
});

app.post('/session/:agentId/restart', requireSecret, async (req, res) => {
  const agentId = req.params.agentId;
  const old = sessions.get(agentId);
  if (old) {
    try { await old.client.destroy(); } catch (_) {}
    sessions.delete(agentId);
  }
  const token = req.body?.agent_webhook_token;
  if (!token) return res.status(400).json({ error: 'agent_webhook_token requis' });
  const session = buildSession(agentId, token);
  return res.json(serializeSession(session));
});

app.delete('/session/:agentId', requireSecret, async (req, res) => {
  const agentId = req.params.agentId;
  const session = sessions.get(agentId);
  if (!session) return res.json({ ok: true, status: 'not_started' });
  try { await session.client.logout(); } catch (_) {}
  try { await session.client.destroy(); } catch (_) {}
  sessions.delete(agentId);
  return res.json({ ok: true });
});

app.post('/send', requireSecret, async (req, res) => {
  const { to, message } = req.body || {};
  if (!to || !message) return res.status(400).json({ error: 'to et message sont requis' });

  const target = String(to).replace(/[^0-9]/g, '');
  const candidates = [...sessions.values()];
  const ready = candidates.find((session) => session.status === 'ready');
  if (!ready) return res.status(503).json({ error: 'Aucune session WhatsApp prête' });

  try {
    const chatId = `${target}@c.us`;
    const sent = await ready.client.sendMessage(chatId, String(message));
    return res.json({ ok: true, id: sent?.id?.id || null, agent_id: ready.agentId });
  } catch (error) {
    return res.status(502).json({ error: error.message || 'Échec envoi WhatsApp' });
  }
});

app.listen(PORT, () => {
  console.log(`[WA] WhatsApp-service listening on ${PORT}`);
  if (!SERVICE_SECRET) console.warn('[WA] WARNING: WA_SERVICE_SECRET missing');
  if (!BACKEND_URL) console.warn('[WA] WARNING: BACKEND_URL missing');

  // Reprise automatique des sessions déjà connectées (désactivable avec WA_RESTORE_ON_BOOT=false).
  if (process.env.WA_RESTORE_ON_BOOT !== 'false') restaurerSessions();
  if (START_ON_BOOT) {
    console.log('[WA] WA_START_ON_BOOT est obsolète : la reprise est automatique (WA_RESTORE_ON_BOOT).');
  }
});
