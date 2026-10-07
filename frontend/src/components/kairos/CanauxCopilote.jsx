import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Send, MessageCircle, Check, X } from "lucide-react";
import { fetchCanaux, lienTelegram, qrWhatsapp, deconnecterCanal } from "@/lib/kairosApi";

/**
 * « Parle à ton Copilote depuis ton téléphone » : relier SON compte à
 * Telegram (bot Zayado, un clic) ou WhatsApp (QR code). Utilisé dans le chat
 * et dans Paramètres › Notifications. `compact` = version carte du chat.
 */
export default function CanauxCopilote({ compact = false, onFerme }) {
  const [c, setC] = useState(null);
  const [qr, setQr] = useState(null);
  const [envoi, setEnvoi] = useState(null);
  const minuteur = useRef(null);

  const charger = useCallback(() => fetchCanaux().then(setC).catch(() => setC(null)), []);
  useEffect(() => { charger(); return () => clearInterval(minuteur.current); }, [charger]);

  // Pendant qu'on attend la liaison (Telegram ouvert / QR affiché) : on vérifie toutes les 4 s.
  const surveiller = (canal) => {
    clearInterval(minuteur.current);
    let n = 0;
    minuteur.current = setInterval(async () => {
      n += 1;
      try {
        const d = await fetchCanaux();
        setC(d);
        if (d[canal]?.statut === "connecte" || n > 45) {
          clearInterval(minuteur.current); setQr(null);
          if (d[canal]?.statut === "connecte") toast.success(canal === "telegram" ? "Telegram relié à ton Copilote ✅" : "WhatsApp relié à ton Copilote ✅");
        }
      } catch { /* on réessaie */ }
    }, 4000);
  };

  const telegram = async () => {
    setEnvoi("telegram");
    try { const r = await lienTelegram(); window.open(r.url, "_blank", "noopener"); surveiller("telegram"); toast("Dans Telegram, appuie sur « Démarrer » : c'est relié."); }
    catch (e) { toast.error(e.message); }
    setEnvoi(null);
  };
  const whatsapp = async () => {
    setEnvoi("whatsapp");
    try {
      const r = await qrWhatsapp();
      if (r.statut === "ready") { toast.success("WhatsApp est déjà relié."); charger(); }
      else if (r.qr) { setQr(r.qr); surveiller("whatsapp"); }
      else toast("QR code en préparation… réessaie dans quelques secondes.");
    } catch (e) { toast.error(e.message); }
    setEnvoi(null);
  };
  const couper = async (canal) => {
    if (!window.confirm(`Déconnecter ${canal === "telegram" ? "Telegram" : "WhatsApp"} de ton Copilote ?`)) return;
    try { await deconnecterCanal(canal); charger(); } catch (e) { toast.error(e.message); }
  };

  const Ligne = ({ canal, nom, Icone, onClick, info }) => {
    const s = c?.[canal];
    const ok = s?.statut === "connecte";
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5" data-testid={`canal-${canal}`}>
        <Icone size={18} className="shrink-0 text-gold" />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-offwhite">{nom}</p>
          <p className="truncate text-[11.5px] text-offwhite/55">{ok ? `Relié${info ? ` · ${info}` : ""}` : !s?.disponible ? "En cours d'activation par Zayado" : c.inclus ? "Écris à ton Copilote depuis ton téléphone" : "Inclus à partir de l'offre Pro"}</p>
        </div>
        {ok ? (
          <button onClick={() => couper(canal)} className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1 text-[12px] text-offwhite/70 hover:bg-white/10"><Check size={12} className="text-emerald-300" /> Relié</button>
        ) : !s?.disponible ? (
          <span className="rounded-lg border border-white/10 px-2.5 py-1 text-[11.5px] text-offwhite/50">Bientôt</span>
        ) : !c.inclus ? (
          <a href="/pricing" className="rounded-lg border border-gold/40 px-2.5 py-1 text-[11.5px] font-semibold text-gold hover:bg-gold/10" data-testid={`canal-${canal}-offre`}>Offre Pro</a>
        ) : (
          <button onClick={onClick} disabled={envoi === canal} data-testid={`canal-${canal}-connecter`}
            className="rounded-lg bg-gold px-3 py-1.5 text-[12px] font-semibold text-navy-900 disabled:opacity-40">
            {envoi === canal ? <Loader2 size={13} className="animate-spin" /> : "Connecter"}
          </button>
        )}
      </div>
    );
  };

  if (!c) return null;
  return (
    <div className={compact ? "rounded-2xl border border-gold/25 bg-gold/5 p-4" : ""} data-testid="canaux-copilote">
      {compact && (
        <div className="mb-2 flex items-start gap-2">
          <p className="flex-1 text-sm leading-relaxed text-offwhite/90">Tu peux aussi me parler depuis ton téléphone, sans ouvrir l'app :</p>
          {onFerme && <button onClick={onFerme} className="text-offwhite/45 hover:text-offwhite" aria-label="Plus tard"><X size={15} /></button>}
        </div>
      )}
      <div className="space-y-2">
        <Ligne canal="telegram" nom="Telegram" Icone={Send} onClick={telegram} info={c.telegram?.bot} />
        <Ligne canal="whatsapp" nom="WhatsApp" Icone={MessageCircle} onClick={whatsapp} info={c.whatsapp?.numero} />
      </div>
      {qr && (
        <div className="mt-3 rounded-xl bg-white p-3 text-center" data-testid="canal-whatsapp-qr">
          <img src={qr} alt="QR code WhatsApp" className="mx-auto h-48 w-48" />
          <p className="mt-2 text-[12px] text-[#1F2A44]">WhatsApp → Appareils connectés → Connecter un appareil, puis scanne ce code.</p>
        </div>
      )}
    </div>
  );
}
