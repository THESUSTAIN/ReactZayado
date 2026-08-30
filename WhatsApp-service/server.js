'use strict';

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
const sessions = new Map();

function requireSecret(req, res, next) {
  if (!SERVICE_SECRET) return res.status(503).json({ error: 'WA_SERVICE_SECRET non configure' });
  const received = req.header('x-service-secret') || req.header('x-secret') || '';
  if (received !== SERVICE_SECRET) return res.status(401).json({ error: 'Non autorise' });
  next();
}

function backendWebhookUrl(token) {
  if (!BACKEND_URL) return '';
  return `${BACKEND_URL}/api/agent-webhook/${encodeURIComponent(token)}/whatsapp-web`;
}

function backendReadyUrl(token) {
  if (!BACKEND_URL) return '';
  return `${BACKEND_URL}/api/agent-webhook/${encodeURIComponent(token)}/whatsapp-web-ready`;
}

async function notifyBackendReady(session) {
  if (!session.agentWebhookToken || !BACKEND_URL) return;
  try {
    await axios.post(backendReadyUrl(session.agentWebhookToken), {
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

async function relayInboundMessage(session, message) {
  const url = backendWebhookUrl(session.agentWebhookToken);
  if (!url) return null;
  try {
    const response = await axios.post(url, {
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
  });

  client.on('change_state', (state) => {
    session.waState = state;
  });

  client.on('message', async (message) => {
    if (message.fromMe || message.isStatus) return;
    if (!message.body?.trim()) return;
    if (!session.agentWebhookToken) return;

    const reply = await relayInboundMessage(session, message);
    if (reply && session.status === 'ready') {
      try {
        await message.reply(reply);
      } catch (error) {
        console.error('[WA] reply failed:', error.message);
      }
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

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'whatsapp-service',
    sessions: sessions.size,
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

  if (START_ON_BOOT) {
    console.log('[WA] WA_START_ON_BOOT=true — aucune session ne démarre sans /session/start car un agent/token est nécessaire.');
  }
});
