import React, { useEffect, useState } from "react";
import { Users, X, Loader2, Send, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { envoyerDemandeCollaborateur, fetchMoi } from "@/lib/kairosApi";

/**
 * « Collaborateur » (depuis le chat IA) : laisser un message important à une
 * personne de l'équipe Zayado. Envoyé par e-mail à l'équipe et enregistré
 * côté serveur (POST /growth/work-request). La conversation en cours peut
 * être jointe pour donner le contexte.
 */
export default function CollaborateurModal({ open, onClose, contexte = "" }) {
  const [objet, setObjet] = useState("");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [important, setImportant] = useState(false);
  const [joindre, setJoindre] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEnvoye(false);
    if (!contact) fetchMoi().then((m) => m?.email && setContact(m.email)).catch(() => {});
    const k = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const envoyer = async (e) => {
    e.preventDefault();
    if (!message.trim()) { toast.error("Écris ton message."); return; }
    setEnvoi(true);
    try {
      const corps = message.trim() + (joindre && contexte ? `\n\n— Conversation avec le Copilote —\n${contexte}` : "");
      await envoyerDemandeCollaborateur({ message: corps, objet: objet.trim(), contact: contact.trim(), important, channel: "chat-ia" });
      setEnvoye(true);
      setObjet(""); setMessage(""); setImportant(false);
    } catch {
      toast.error("Le message n'a pas pu partir. Réessaie dans un instant.");
    } finally { setEnvoi(false); }
  };

  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center bg-[#060a18]/70 p-3 backdrop-blur-sm sm:items-center" onClick={onClose} data-testid="collab-modal">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#101a34] p-5 text-offwhite shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 ring-1 ring-gold/30"><Users className="h-4 w-4 text-gold" /></span>
            <div>
              <p className="font-display text-[15px] font-bold">Écrire à un collaborateur</p>
              <p className="text-[11px] text-offwhite/55">Une personne de l'équipe Zayado te répond par e-mail.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-offwhite/50 hover:bg-white/5 hover:text-offwhite" aria-label="Fermer"><X className="h-4 w-4" /></button>
        </div>

        {envoye ? (
          <div className="py-6 text-center" data-testid="collab-envoye">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" />
            <p className="mt-3 font-semibold">Message envoyé</p>
            <p className="mt-1 text-xs text-offwhite/60">L'équipe l'a reçu{contact ? ` et te répondra à ${contact}` : ""}.</p>
            <button onClick={onClose} className="mt-5 rounded-xl bg-gold px-5 py-2 text-sm font-semibold text-navy-900">Fermer</button>
          </div>
        ) : (
          <form onSubmit={envoyer} className="space-y-3">
            <input value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Objet (ex. Besoin d'aide sur ma facturation)" maxLength={200}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm placeholder:text-offwhite/40 focus:border-gold/40 focus:outline-none" data-testid="collab-objet" />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} autoFocus placeholder="Ton message : ce dont tu as besoin, le contexte, l'échéance…"
              className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm placeholder:text-offwhite/40 focus:border-gold/40 focus:outline-none" data-testid="collab-message" />
            <input type="email" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Ton e-mail pour la réponse"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm placeholder:text-offwhite/40 focus:border-gold/40 focus:outline-none" data-testid="collab-contact" />
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} className="accent-[#DEC2A3]" data-testid="collab-important" />
              <AlertTriangle className="h-3.5 w-3.5 text-amber-300" /> Important (traité en priorité)
            </label>
            {contexte && (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-offwhite/65">
                <input type="checkbox" checked={joindre} onChange={(e) => setJoindre(e.target.checked)} className="accent-[#DEC2A3]" />
                Joindre ma conversation avec le Copilote (contexte)
              </label>
            )}
            <button type="submit" disabled={envoi || !message.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-2.5 text-sm font-semibold text-navy-900 disabled:opacity-50" data-testid="collab-envoyer">
              {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer à l'équipe
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
