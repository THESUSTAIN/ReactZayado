import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";
import { getToken } from "@/lib/kairosApi";

// Ajoute automatiquement le jeton de connexion à TOUS les appels vers /api.
// Plusieurs écrans utilisaient fetch() sans en-tête Authorization : le backend
// les rattachait au compte démo commun. Désormais chaque appel est identifié.
(() => {
  if (typeof window === "undefined" || !window.fetch) return;
  const origFetch = window.fetch.bind(window);
  const backend = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
  const estApi = (url) => {
    try {
      const u = new URL(url, window.location.origin);
      const memeHote = u.origin === window.location.origin || (backend && url.startsWith(backend));
      return memeHote && u.pathname.startsWith("/api");
    } catch { return false; }
  };
  window.fetch = (input, init = {}) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : null;
    const token = getToken();
    if (url && token && estApi(url)) {
      const headers = new Headers(init.headers || {});
      if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
      return origFetch(input, { ...init, headers });
    }
    return origFetch(input, init);
  };
})();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);

// Plus de service worker : on désinscrit tout ancien SW et on vide ses caches
// (l'ancien sw.js provoquait un écran blanc).
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {});
  if (window.caches) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
  }
}
