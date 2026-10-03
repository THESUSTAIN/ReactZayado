import React, { useEffect, useState } from "react";
import { BellRing, Check, Loader2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { activerPush, etatNotifications, testerPush } from "@/lib/push";
import { reglerSon, sonActif, jouerSon } from "@/lib/alertes";

// Pied de la cloche : dit CLAIREMENT si cet appareil reçoit les notifications, et permet de les réparer.
// Avant, l'activation automatique échouait en silence (fenêtre ignorée, navigateur qui la masque, iPhone sans
// l'app installée, clés serveur absentes…) et la personne ne savait jamais pourquoi elle ne recevait rien.
export default function NotifsAppareil() {
  const [etat, setEtat] = useState(null);
  const [occupe, setOccupe] = useState(false);
  const [son, setSon] = useState(sonActif());

  const rafraichir = async () => { try { setEtat(await etatNotifications()); } catch { setEtat({ supporte: false }); } };
  useEffect(() => { rafraichir(); }, []);

  const activer = async () => {
    setOccupe(true);
    try { await activerPush(); toast.success("Notifications activées sur cet appareil."); }
    catch (e) { toast.error(e?.message || "Activation impossible."); }
    setOccupe(false); rafraichir();
  };
  const tester = async () => {
    setOccupe(true);
    try { await testerPush(); }
    catch (e) { toast.error(e?.message || "Le test n'a pas pu partir."); }
    setOccupe(false);
  };
  const basculerSon = () => { const v = !son; reglerSon(v); setSon(v); if (v) jouerSon(); };

  if (!etat) return null;
  const pas = "px-3 pb-3 pt-2 text-[11.5px] leading-snug text-offwhite/60";
  let corps;
  if (!etat.supporte) {
    corps = <p className={pas}>Ce navigateur ne gère pas les notifications. Sur iPhone : ajoute Zayado à l'écran d'accueil, puis ouvre-le depuis son icône.</p>;
  } else if (!etat.serveurPret) {
    corps = <p className={pas}>Les notifications ne sont pas encore configurées sur le serveur (clés VAPID). L'administrateur doit les ajouter.</p>;
  } else if (etat.permission === "denied") {
    corps = <p className={pas}>Notifications bloquées dans ce navigateur. Clique sur le cadenas à côté de l'adresse, autorise les notifications, puis reviens ici.</p>;
  } else if (etat.permission !== "granted" || !etat.abonne || !etat.abonneServeur) {
    corps = (
      <div className="px-3 pb-3 pt-2">
        <p className="mb-2 text-[11.5px] leading-snug text-offwhite/60">Active-les pour être prévenu dès que ton Copilote a fini de répondre, même quand l'app est fermée.</p>
        <button onClick={activer} disabled={occupe} data-testid="notif-activer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-navy-900 disabled:opacity-60">
          {occupe ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />} Activer sur cet appareil
        </button>
      </div>
    );
  } else {
    corps = (
      <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-2">
        <span className="inline-flex items-center gap-1 text-[11.5px] text-emerald-300"><Check className="h-3.5 w-3.5" /> Actives sur cet appareil</span>
        <span className="flex items-center gap-1.5">
          <button onClick={basculerSon} aria-label={son ? "Couper le son" : "Activer le son"} title={son ? "Couper le son" : "Activer le son"} data-testid="notif-son"
            className="rounded-lg border border-white/10 p-1.5 text-offwhite/70 hover:text-gold">
            {son ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
          <button onClick={tester} disabled={occupe} data-testid="notif-tester"
            className="rounded-lg border border-white/10 px-2.5 py-1 text-[11.5px] text-offwhite/80 hover:border-gold/40 hover:text-gold disabled:opacity-60">
            {occupe ? "…" : "Envoyer un test"}
          </button>
        </span>
      </div>
    );
  }
  return <div className="border-t border-white/10" data-testid="notifs-appareil">{corps}</div>;
}
