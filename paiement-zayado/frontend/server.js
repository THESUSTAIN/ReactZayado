// Serveur de paiement.zayado.net pour Railway (ou tout hébergeur Node), sans dépendance.
// · sert les fichiers de ce dossier (index.html, merci.html, assets/)
// · relaie /api/* vers l'API de l'appli (API_BASE, par défaut https://app.zayado.net)
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_BASE = (process.env.API_BASE || 'https://app.zayado.net').replace(/\/$/, '');
const ROOT = __dirname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json' };
const SECU = { 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Content-Type-Options': 'nosniff' };

function relayer(req, res) {
  const cible = new URL(API_BASE + req.url);
  const entetes = { ...req.headers, host: cible.host };
  delete entetes['accept-encoding'];
  entetes['x-forwarded-for'] = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString();
  const p = (cible.protocol === 'http:' ? http : https).request(cible, { method: req.method, headers: entetes, timeout: 25000 }, (r) => {
    res.writeHead(r.statusCode || 502, { ...r.headers, ...SECU });
    r.pipe(res);
  });
  p.on('timeout', () => p.destroy(new Error('timeout')));
  p.on('error', (e) => {
    console.error('Relais API :', e.message);
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ detail: "Le service de paiement ne répond pas. Réessayez dans un instant." }));
  });
  req.pipe(p);
}

http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) return relayer(req, res);
  if (req.url === '/sante') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  let chemin = decodeURIComponent(req.url.split('?')[0]);
  if (chemin === '/' || chemin === '') chemin = '/index.html';
  const fichier = path.normalize(path.join(ROOT, chemin));
  if (!fichier.startsWith(ROOT) || /server\.js|package\.json/.test(fichier)) { res.writeHead(404); return res.end(); }
  fs.readFile(fichier, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end('<p>Page introuvable. <a href="/">Retour au paiement</a></p>'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(fichier)] || 'application/octet-stream', 'Cache-Control': chemin.endsWith('.html') ? 'no-cache' : 'public, max-age=3600', ...SECU });
    res.end(data);
  });
}).listen(PORT, () => console.log(`paiement.zayado.net sur le port ${PORT}, API relayée vers ${API_BASE}`));
