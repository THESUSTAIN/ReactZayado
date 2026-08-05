// Dev-only proxy: forwards /api (and websocket) to the FastAPI backend on :8001.
// This file only affects the CRA dev server and is ignored by production builds,
// so it is safe for Railway deployment.
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8001',
      changeOrigin: true,
      ws: true,
      timeout: 120000,
      proxyTimeout: 120000,
    })
  );
};
