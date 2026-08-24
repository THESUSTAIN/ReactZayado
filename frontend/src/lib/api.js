/**
 * Public site API client (Vite-flavored, ported from a-main).
 * - Uses VITE_API_URL (Zayado FastAPI backend).
 * - All product/blog/page reads are proxied via /api/public/* (no auth).
 * - Preserves the 401-redirect interceptor for the few auth-aware pages.
 */
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_API_URL || "";
export const API = `${BACKEND_URL}/api`;
export const SAAS_URL = import.meta.env.VITE_SAAS_URL || "https://app.zayado.net";
export const WP_URL = (import.meta.env.VITE_WP_URL || "https://cms.zayado.net").replace(/\/$/, "");

export const api = axios.create({
  baseURL: API,
  withCredentials: false,
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    if (status === 401) {
      const path = window.location.pathname;
      const isAuthEndpoint = url.includes("/auth/") || url.includes("/onboarding/status");
      const isSoftEndpoint = url.includes("/account/me");
      const isLoginPage = path === "/login" || path === "/app/login" || path === "/" || path === "/boutique/connexion";
      const isPublicPage = (
        path.startsWith("/partenaires") ||
        path.startsWith("/devenir-partenaire") ||
        path.startsWith("/services-pro") ||
        path.startsWith("/memoire") ||
        path.startsWith("/blog") ||
        path === "/contact" || path === "/a-propos" || path === "/faq"
      );
      if (!isAuthEndpoint && !isLoginPage && !isPublicPage && !isSoftEndpoint) {
        let target = "/login";
        if (path.startsWith("/compte") || path.startsWith("/boutique") || path.startsWith("/groupement")) {
          target = "/boutique/connexion";
        }
        window.location.replace(target);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
