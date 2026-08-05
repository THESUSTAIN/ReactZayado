import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi, setAuthToken } from "@/lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const OAUTH_REDIRECT_URI = () => `${window.location.origin}/auth/callback`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guest, setGuest] = useState(() => localStorage.getItem("zayado_guest") === "1");

  const applyUser = (u) => {
    setUser(u);
    const uid = u?.id || u?.user_id;
    if (uid) localStorage.setItem("zayado_uid", uid);
  };

  const applySession = (session) => {
    // session = { token | access_token, user }
    setAuthToken(session?.token || session?.access_token || null);
    applyUser(session?.user);
    localStorage.removeItem("zayado_guest");
    setGuest(false);
  };

  const checkAuth = useCallback(async () => {
    // En mode invité : si un token existe (nouveau flux), on réhydrate le user.
    if (localStorage.getItem("zayado_guest") === "1") {
      setGuest(true);
      if (localStorage.getItem("zayado_token")) {
        try {
          const u = await authApi.me();
          setUser(u);
          if (u?.id) localStorage.setItem("zayado_uid", u.id);
        } catch { /* token expiré : reste en invité léger */ }
      }
      setLoading(false);
      return;
    }
    try {
      const u = await authApi.me();
      applyUser(u);
      localStorage.removeItem("zayado_guest");
      setGuest(false);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Retour du lien magique par email : /login?token=<jwt>
  const consumeMagicLinkToken = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) return false;
    // Garde anti-double-consommation (React StrictMode double-invoque les effets
    // en dev, et le lien est désormais à usage unique côté backend).
    if (window.__magicConsuming) return true;
    window.__magicConsuming = true;
    try {
      const session = await authApi.verifyLink(token);
      applySession(session);
    } catch {
      window.location.replace("/login?error=link_failed");
      return true;
    }
    // Navigation complète vers l'accueil : recharge l'app en état authentifié
    // (le token est déjà persisté en localStorage). replaceState seul ne suffit
    // pas car React Router ne réagit pas à un simple changement d'historique.
    window.location.replace("/");
    return true;
  }, []);

  useEffect(() => {
    // Retour OAuth (Google/Microsoft) : géré par la route /auth/callback (voir App.js).
    if (window.location.pathname === "/auth/callback") { setLoading(false); return; }
    (async () => {
      const consumed = await consumeMagicLinkToken();
      if (!consumed) checkAuth();
    })();
  }, [checkAuth, consumeMagicLinkToken]);

  // Démarre la connexion Google ou Microsoft : le backend construit l'URL
  // d'autorisation (client_id géré côté serveur) via /api/oauth/{provider}/start.
  const startOAuth = async (provider) => {
    try {
      const redirectUri = OAUTH_REDIRECT_URI();
      sessionStorage.setItem("zayado_oauth_provider", provider);
      const { authorization_url } = await authApi.oauthStart(provider, redirectUri);
      window.location.href = authorization_url;
    } catch (e) {
      window.location.href = `/login?error=${provider}_failed`;
    }
  };

  const login = () => startOAuth("google");
  const loginMicrosoft = () => startOAuth("microsoft");

  // Termine le flux OAuth après redirection vers /auth/callback?code=...
  const completeOAuth = async (code) => {
    const provider = sessionStorage.getItem("zayado_oauth_provider") || "google";
    sessionStorage.removeItem("zayado_oauth_provider");
    try {
      const session = await authApi.oauthExchange(provider, code, OAUTH_REDIRECT_URI());
      applySession(session);
      window.location.replace("/");
    } catch {
      window.location.replace(`/login?error=${provider}_failed`);
    }
  };

  const continueAsGuest = async () => {
    try {
      const session = await authApi.guest();
      setAuthToken(session?.token || session?.access_token || null);
      const u = session?.user;
      setUser(u);
      if (u?.id) localStorage.setItem("zayado_uid", u.id);
    } catch {
      localStorage.setItem("zayado_uid", "default");
    }
    localStorage.setItem("zayado_guest", "1");
    setGuest(true);
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { /* noop */ }
    localStorage.removeItem("zayado_uid");
    localStorage.removeItem("zayado_guest");
    setUser(null); setGuest(false);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, loading, guest, login, loginMicrosoft, completeOAuth, logout, continueAsGuest, applyUser, setLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

