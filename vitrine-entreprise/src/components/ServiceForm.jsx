import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { envoyerLead } from "@/lib/api";

const SLOTS = ["Mardi 10:00", "Mardi 14:30", "Mercredi 09:00", "Jeudi 16:00", "Vendredi 11:00"];

export default function ServiceForm({ open, onClose, mode, service }) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ prenom: "", email: "", slot: SLOTS[0], message: "" });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valid = form.prenom.trim() && /.+@.+\..+/.test(form.email) && (mode === "appel" ? form.slot : true);

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    await envoyerLead({ email: form.email, prenom: form.prenom, source: mode === "appel" ? "service-appel" : "service-devis" });
    setBusy(false);
    setSent(true);
  };

  const close = () => { onClose(); setTimeout(() => setSent(false), 300); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          data-testid="service-form-modal"
        >
          <div className="absolute inset-0 bg-[rgba(13,31,56,0.55)] backdrop-blur-sm" onClick={close} />
          <motion.div
            className="card relative z-10 w-full max-w-md p-7"
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              onClick={close}
              data-testid="service-form-close"
              className="absolute right-4 top-4 rounded-full border p-2"
              style={{ borderColor: "var(--line)" }}
              aria-label="Fermer"
            >
              <X size={16} />
            </button>

            {!sent ? (
              <>
                <p className="stamp text-[var(--navy)]">{mode === "appel" ? "Réserver un appel" : "Réponse rapide"}</p>
                <h3 className="mt-4 text-2xl font-semibold text-[var(--navy)]">
                  {mode === "appel" ? "Choisissez votre créneau" : "Posez votre question"}
                </h3>
                <p className="mt-1 text-sm opacity-70">
                  {service ? `À propos de « ${service.title} »` : "L’équipe Zayado vous répond."}
                </p>
                <form className="mt-5 space-y-3.5" onSubmit={submit} data-testid="service-form">
                  <input className="field" data-testid="service-form-prenom" placeholder="Votre prénom" value={form.prenom} onChange={set("prenom")} />
                  <input className="field" data-testid="service-form-email" placeholder="Votre email" type="email" value={form.email} onChange={set("email")} />
                  {mode === "appel" && (
                    <select className="field" data-testid="service-form-slot" value={form.slot} onChange={set("slot")}>
                      {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                  {mode === "devis" && (
                    <textarea className="field" data-testid="service-form-message" rows="3" placeholder="Votre message (optionnel)" value={form.message} onChange={set("message")} />
                  )}
                  <button className="btn btn-primary w-full px-6 py-3.5 text-[15px]" data-testid="service-form-submit" disabled={busy}>
                    {busy ? "Envoi…" : mode === "appel" ? "Confirmer le créneau" : "Envoyer ma demande"}
                  </button>
                </form>
              </>
            ) : (
              <div className="py-6 text-center" data-testid="service-form-confirmation">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "var(--gold-soft)" }}>
                  <Check size={26} style={{ color: "var(--navy)" }} />
                </span>
                <h3 className="mt-4 text-2xl font-semibold text-[var(--navy)]">C’est noté, {form.prenom} !</h3>
                <p className="mt-2 text-[15px] leading-relaxed opacity-75">
                  {mode === "appel"
                    ? `Votre créneau « ${form.slot} » est bloqué. Vous recevrez le lien d’appel.`
                    : "Nous revenons vers vous sous 24 h ouvrées."}
                </p>
                <p className="mt-3 text-xs opacity-50">Votre demande est enregistrée — nous revenons vers vous rapidement.</p>
                <button className="btn btn-ghost mt-5 px-6 py-3 text-[14px]" onClick={close} data-testid="service-form-done">
                  Fermer
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
