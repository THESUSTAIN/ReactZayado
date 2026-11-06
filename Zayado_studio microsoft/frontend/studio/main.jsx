// Studio Zayado (studio.zayado.net) — point d'entrée.
// Réutilise les composants et le style de l'application (frontend/src) ; seul le
// menu change. Connexion : compte Microsoft de l'organisation (session gérée par
// le service Studio, cookie HttpOnly) — aucun jeton Zayado dans le navigateur.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import "@/index.css";
import { queryClient } from "@/lib/queryClient";
import Studio from "./Studio";

// Ancienne connexion par jeton Zayado : on n'en garde aucune trace ici.
try { localStorage.removeItem("kairos_access_token"); } catch { /* stockage indisponible */ }

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Studio />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
