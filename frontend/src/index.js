import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";
import { registerServiceWorker } from "@/lib/pwa";

// ── Google Analytics — chargé UNIQUEMENT sur les domaines de production
//    (zayado.net / app.zayado.net / www.zayado.net). Jamais en preview/local,
//    afin de ne pas polluer les statistiques avec le trafic de développement.
(function loadGoogleAnalytics() {
  try {
    const GA_ID = "G-ZV0BQGN1X6";
    const PROD_HOSTS = ["zayado.net", "www.zayado.net", "app.zayado.net"];
    const host = (typeof window !== "undefined" && window.location.hostname) || "";
    if (!PROD_HOSTS.includes(host)) return; // preview / localhost → pas d'analytics
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", GA_ID);
  } catch (e) {
    /* noop — l'analytics ne doit jamais bloquer l'app */
  }
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

// PWA : enregistre le service worker (installable, hors-ligne, push).
registerServiceWorker();
