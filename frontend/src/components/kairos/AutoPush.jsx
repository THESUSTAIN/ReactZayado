import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { fetchState, getToken } from "@/lib/kairosApi";
import { activerPushAuto } from "@/lib/push";

// Notifications actives par défaut : une fois connecté dans l'app, l'appareil est abonné
// aux notifications push sans passer par Paramètres (sauf refus du navigateur, ou coupure
// volontaire dans Paramètres, ou interrupteur général coupé).
export default function AutoPush() {
  const { pathname } = useLocation();
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
  return null;
}
