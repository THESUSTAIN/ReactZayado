import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { statutWhatsapp, reconnecterWhatsapp, qrWhatsapp } from "@/lib/kairosApi";
import { signaler } from "@/lib/alertes";

/**
 * Pastille d'état WhatsApp du Copilote :
 * • vert  « Connecté à ton numéro » quand la session WhatsApp est active ;
 * • ambre « En attente de scan… » pendant l'affichage du QR ;
 * • rouge « WhatsApp déconnecté » + bouton « Reconnecter » (nouveau QR en un clic)
 *   dès que la déconnexion est détectée.
 * Sondage toutes les 30 s ; une seule alerte in-app au passage connecté → déconnecté
 * (et seulement si elle persiste, pour éviter les fausses alertes).
 */
export default function WhatsAppStatut() {
  const [etat, setEtat] = useState(null); // null = pas encore su
  const [qr, setQr] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const avant = useRef(null);
  const decosConsecutifs = useRef(0);
  const minuteurQr = useRef(null);

  const charger = async () => {
    try {
      const d = await statutWhatsapp();
      setEtat(d);
      const s = d?.status;
      decosConsecutifs.current = (s === "disconnected" || s === "auth_failure" || s === "error") ? decosConsecutifs.current + 1 : 0;
      if (avant.current === "ready" && decosConsecutifs.current >= 2 && d?.deja_relie) {
        signaler({
          titre: "WhatsApp s'est déconnecté",
          corps: "La session WhatsApp de ton Copilote n'est plus active. Appuie sur « Reconnecter » pour scanner un nouveau QR.",
          url: "/app?tab=chat",
          tag: "whatsapp-deconnecte",
        });
      }
      avant.current = s;
    } catch { /* service ou connexion indisponible : on réessaiera au prochain tick */ }
  };

  useEffect(() => {
    charger();
    const t = setInterval(charger, 30000);
    return () => { clearInterval(t); clearInterval(minuteurQr.current); };
  }, []);

  const fermerQr = () => { setQr(null); clearInterval(minuteurQr.current); };

  // « Reconnecter » : on détruit l'ancienne session et on affiche le QR fraîchement généré.
  const reconnecter = async () => {
    setEnCours(true);
    try {
      const r = await reconnecterWhatsapp();
      if (r?.qr) setQr(r.qr); else setQr("");
      clearInterval(minuteurQr.current);
      let n = 0;
      minuteurQr.current = setInterval(async () => {
        n += 1;
        try {
          const d = await qrWhatsapp();
          if (d?.statut === "ready") { fermerQr(); toast.success("WhatsApp reconnecté ✅"); charger(); }
          else if (d?.qr) setQr(d.qr);
          else if (n > 30) fermerQr();
        } catch { /* on réessaie */ }
      }, 4000);
    } catch (e) { toast.error(e.detail || e.message || "Impossible de relancer WhatsApp pour le moment."); }
    finally { setEnCours(false); }
  };

  if (!etat) return null;
  const s = etat.status;
  const numero = etat.phone_number ? `+${String(etat.phone_number).replace(/\D/g, "").replace(/(\d{2})(?=\d)/g, "$1 ")}` : "";

  if (s === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-500/15 px-3 py-1.5 text-[12px] font-semibold text-emerald-300 ring-1 ring-emerald-400/30" data-testid="whatsapp-pill-connecte">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Connecté à ton numéro{numero ? ` · ${numero}` : ""}
      </span>
    );
  }
  if (s === "qr" || s === "initializing" || s === "authenticated") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-400/15 px-3 py-1.5 text-[12px] font-medium text-amber-200 ring-1 ring-amber-300/30" data-testid="whatsapp-pill-attente">
        <Loader2 className="h-3 w-3 animate-spin" /> En attente de scan…
      </span>
    );
  }
  if (!etat.deja_relie) return null; // jamais relié : rien à afficher ici (la première connexion passe par Paramètres)
  return (
    <>
      <span className="inline-flex items-center gap-2" data-testid="whatsapp-pill-deconnecte">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-red-500/15 px-3 py-1.5 text-[12px] font-semibold text-red-300 ring-1 ring-red-400/30">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> WhatsApp déconnecté
        </span>
        <button onClick={reconnecter} disabled={enCours} data-testid="whatsapp-reconnecter-btn"
          className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-[12px] font-semibold text-gold transition hover:bg-gold/20 disabled:opacity-50">
          {enCours ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Reconnecter
        </button>
      </span>
      {qr !== null && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-[#0b1a3d]/70 p-4 backdrop-blur-sm" onClick={fermerQr} data-testid="whatsapp-qr-modal">
          <div className="chat-zayado w-full max-w-xs rounded-2xl border border-white/10 bg-[#0b1430] p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-offwhite">Reconnecter WhatsApp</p>
            {qr ? <img src={qr} alt="QR WhatsApp" className="mx-auto mt-3 h-52 w-52 rounded-xl bg-white p-2" /> : <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-gold" />}
            <p className="mt-2 text-[12px] leading-relaxed text-offwhite/55">WhatsApp → Appareils connectés → Connecter un appareil, puis scanne ce code.</p>
            <button onClick={fermerQr} className="mt-3 text-[12px] text-offwhite/50 hover:text-offwhite" data-testid="whatsapp-qr-fermer">Fermer</button>
          </div>
        </div>
      )}
    </>
  );
}
