import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";
import { getToken } from "@/lib/kairosApi";
import { enPro } from "@/lib/espace";
import "@/lib/installPwa";

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
      // Espace Pro (entreprise) : le backend l'applique aux seuls modules autorisés.
      if (!headers.has("x-zayado-espace") && enPro()) headers.set("x-zayado-espace", "pro");
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

// Service worker pour l'installation PWA (écran d'accueil, partage mobile).
// Network-first + coquille hors-ligne, sans mise en cache du JS/CSS (voir sw.js).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((e) => {
      // Plus silencieux : un service worker cassé = PWA non installable + push mort. On le voit en console.
      console.warn("Service worker non enregistré :", e);
    });
  });
}
