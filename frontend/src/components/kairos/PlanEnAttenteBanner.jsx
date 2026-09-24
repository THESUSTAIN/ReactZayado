import React, { useEffect, useState } from "react";
import { CreditCard, X } from "lucide-react";
import { fetchAbonnement } from "@/lib/kairosApi";
import { planNom } from "@/lib/plans";
import { lancerPaiement } from "@/lib/checkout";

// Offre choisie à l'onboarding mais pas encore payée : on le dit clairement
// sur le cockpit (avant, le compte restait sans offre, sans explication).
export default function PlanEnAttenteBanner() {
  const [abo, setAbo] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const cle = `zayado_plan_attente_masque_${new Date().toISOString().slice(0, 10)}`;
  const [masque, setMasque] = useState(() => { try { return !!localStorage.getItem(cle); } catch { return false; } });

  useEffect(() => { fetchAbonnement().then(setAbo).catch(() => {}); }, []);
  if (masque || !abo?.plan_en_attente) return null;

  const finaliser = async () => {
    setEnvoi(true);
    const ok = await lancerPaiement(abo.plan_en_attente, { essai: !!abo.essai?.disponible && abo.plan_en_attente === abo.essai?.plan });
    if (!ok) setEnvoi(false);
  };


  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-gold/35 bg-gold/[0.08] px-4 py-3 animate-fade-up" data-testid="cockpit-plan-attente">
      <CreditCard size={18} className="shrink-0 text-gold" />
      <p className="min-w-0 flex-1 text-[13.5px] text-offwhite/85">
        Tu as choisi l'offre <b className="text-gold">{planNom(abo.plan_en_attente)}</b>. Elle s'active dès que le paiement est validé.
      </p>
      <button onClick={finaliser} disabled={envoi} className="rounded-full bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-4 py-2 text-[12.5px] font-semibold text-navy-900 disabled:opacity-60" data-testid="cockpit-finaliser-paiement">
        {envoi ? "Redirection…" : "Finaliser le paiement"}
      </button>
      <button onClick={() => { try { localStorage.setItem(cle, "1"); } catch { /* */ } setMasque(true); }} aria-label="Masquer pour aujourd'hui" className="rounded-lg p-1 text-offwhite/50 hover:bg-white/10"><X size={15} /></button>
    </div>
  );
}
