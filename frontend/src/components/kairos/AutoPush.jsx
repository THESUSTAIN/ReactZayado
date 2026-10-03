import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchState, getToken } from "@/lib/kairosApi";
import { activerPushAuto } from "@/lib/push";
import { signaler } from "@/lib/alertes";
import { openChat } from "./GlobalChat";

// Notifications actives par défaut : une fois connecté dans l'app, l'appareil est abonné
// aux notifications push sans passer par Paramètres (sauf refus du navigateur, ou coupure
// volontaire dans Paramètres, ou interrupteur général coupé).
//
// Ce composant écoute aussi :
//  - les messages du service worker (« une notification vient d'arriver » → son + bandeau dans l'app,
//    « la personne a cliqué sur une notification » → ouvrir la bonne page SANS recharger) ;
//  - l'événement « zayado:ouvrir-url » (bouton « Ouvrir » des bandeaux et de la cloche).
export default function AutoPush() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dansApp = pathname.startsWith("/app") || pathname.startsWith("/parametres");

  useEffect(() => {
    if (!dansApp || !getToken()) return undefined;
    let nettoyer = () => {};
    let annule = false;
    fetchState()
      .then((d) => { if (!annule) nettoyer = activerPushAuto({ notificationsActives: d?.profile?.notifications !== false }); })
      .catch(() => {});
    return () => { annule = true; nettoyer(); };
  }, [dansApp]);

  useEffect(() => {
    const ouvrir = (url) => {
      try {
        const u = new URL(url || "/app", window.location.origin);
        const onglet = u.searchParams.get("tab");
        const ongletChat = ["chat", "actu", "decisions"].includes(onglet);
        const changePage = u.pathname !== window.location.pathname;
        if (changePage) navigate(u.pathname + (ongletChat ? "" : u.search) + u.hash);
        if (ongletChat) setTimeout(() => openChat(onglet), changePage ? 350 : 0);
      } catch { navigate("/app"); }
    };
    const surUrl = (e) => ouvrir(e.detail);
    const surMessageSW = (e) => {
      const m = e.data || {};
      if (m.type === "zayado-push") signaler({ titre: m.title || "Zayado", corps: m.body, url: m.url, tag: m.tag, systeme: false });
      if (m.type === "zayado-ouvrir") ouvrir(m.url);
    };
    window.addEventListener("zayado:ouvrir-url", surUrl);
    navigator.serviceWorker?.addEventListener("message", surMessageSW);
    return () => {
      window.removeEventListener("zayado:ouvrir-url", surUrl);
      navigator.serviceWorker?.removeEventListener("message", surMessageSW);
    };
  }, [navigate]);

  return null;
}
