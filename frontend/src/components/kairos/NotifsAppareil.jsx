import React, { useEffect, useState } from "react";
import { BellRing, Check, Loader2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { activerPush, etatNotifications } from "@/lib/push";
import { reglerSon, sonActif, jouerSon } from "@/lib/alertes";

// Pied de la cloche. Pour l'utilisateur : rien à tester. Si tout marche, une ligne discrète (+ le son) ;
// sinon UNE action claire (« Activer »). Le message de bienvenue est envoyé automatiquement par le serveur
// à l'activation : on voit tout de suite que ça marche, sans bouton « test ».
export default function NotifsAppareil() {
  const [etat, setEtat] = useState(null);
  const [occupe, setOccupe] = useState(false);
  const [son, setSon] = useState(sonActif());

  const rafraichir = async () => { try { setEtat(await etatNotifications()); } catch { setEtat({ supporte: false }); } };
  useEffect(() => { rafraichir(); }, []);

  const activer = async () => {
    setOccupe(true);
    try { await activerPush(); toast.success("Notifications activées. Un message de confirmation arrive."); }
    catch (e) { toast.error(e?.message || "Activation impossible."); }
    setOccupe(false); rafraichir();
  };
  const basculerSon = () => { const v = !son; reglerSon(v); setSon(v); if (v) jouerSon(); };

  if (!etat) return null;
  const note = "px-3 pb-3 pt-2 text-[11.5px] leading-snug text-offwhite/60";
  let corps;
  if (!etat.supporte) {
    corps = <p className={note}>Ce navigateur ne gère pas les notifications. Sur iPhone : ajoute Zayado à l'écran d'accueil et ouvre-le depuis son icône.</p>;
  } else if (!etat.serveurPret) {
    corps = <p className={note}>Les notifications sont momentanément indisponibles. Tu retrouves tout ici, dans la cloche.</p>;
  } else if (etat.permission === "denied") {
    corps = <p className={note}>Les notifications sont bloquées dans ce navigateur. Clique sur le cadenas à côté de l'adresse, autorise-les, puis reviens ici.</p>;
  } else if (etat.permission !== "granted" || !etat.abonne || !etat.abonneServeur) {
    corps = (
      <div className="px-3 pb-3 pt-2">
        <div className="rounded-xl border border-gold/30 bg-gold/[0.07] p-3">
          <p className="text-[12.5px] font-semibold text-offwhite">Ne rate plus rien</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-offwhite/65">Sois prévenu dès que ton Copilote a fini de répondre ou qu'une actu t'attend, même quand l'app est fermée.</p>
          <button onClick={activer} disabled={occupe} data-testid="notif-activer"
            className="mt-2.5 inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-gold px-4 text-sm font-semibold text-navy-900 disabled:opacity-60">
            {occupe ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />} Activer les notifications
          </button>
        </div>
      </div>
    );
  } else {
    corps = (
      <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-2">
        <span className="inline-flex items-center gap-1 text-[11.5px] text-emerald-300"><Check className="h-3.5 w-3.5" /> Notifications activées</span>
        <button onClick={basculerSon} aria-label={son ? "Couper le son" : "Activer le son"} title={son ? "Couper le son" : "Activer le son"} data-testid="notif-son"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11.5px] text-offwhite/70 hover:text-gold">
          {son ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />} Son
        </button>
      </div>
    );
  }
  return <div className="border-t border-white/10" data-testid="notifs-appareil">{corps}</div>;
}
