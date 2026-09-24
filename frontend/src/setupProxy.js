// Proxy de développement — ajouté lors de l'analyse d'installation.
//
// Pourquoi : en production, nginx (frontend/nginx.conf) relaie /api vers le
// backend, donc l'application et l'API partagent la MÊME origine et le
// frontend appelle simplement `/api/...` (voir src/lib/kairosApi.js, où
// BACKEND_URL est vide par défaut).
//
// En local, sans ce fichier, il fallait renseigner REACT_APP_BACKEND_URL
// (ex. http://localhost:8002). L'appel devenait alors cross-origin, ce qui
// ne reproduit pas la production et fait dépendre le dev local de CORS.
//
// Ce proxy rétablit la parité : le dev server sert /api sur sa propre
// origine et le relaie vers le backend FastAPI. Laisser
// REACT_APP_BACKEND_URL vide en local.
const { createProxyMiddleware } = require("http-proxy-middleware");

const cible = process.env.BACKEND_URL || "http://localhost:8002";

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: cible,
      changeOrigin: true,
      // Le Copilote IA répond en streaming (SSE) : sans cela, les réponses
      // resteraient tamponnées et le chat semblerait figé.
      onProxyRes: (proxyRes) => {
        if ((proxyRes.headers["content-type"] || "").includes("text/event-stream")) {
          proxyRes.headers["cache-control"] = "no-cache, no-transform";
        }
      },
    }),
  );
};
