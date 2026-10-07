import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Loader2, X } from "lucide-react";
import { entLiaisonAccepter } from "@/lib/kairosApi";

// Ouvert depuis le compte PERSO : confirme le lien avec le compte pro (invité par un dirigeant).
export default function LiaisonCompte() {
  const [params] = useSearchParams();
  const [etat, setEtat] = useState({ charge: true });
  useEffect(() => {
    const jeton = params.get("jeton");
    if (!jeton) { setEtat({ erreur: "Lien incomplet." }); return; }
    entLiaisonAccepter(jeton).then((r) => setEtat({ ok: r.entreprise || "ton entreprise" })).catch((e) => setEtat({ erreur: e.detail || "Lien invalide." }));
  }, [params]);
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/[0.06] p-6 text-center" data-testid="liaison-compte">
        {etat.charge && !etat.ok && !etat.erreur && <Loader2 className="mx-auto animate-spin text-white/60" />}
        {etat.ok && (<><Check className="mx-auto h-10 w-10 text-emerald-300" /><p className="mt-3 text-[17px] font-semibold text-white">Comptes reliés</p>
          <p className="mt-1 text-[14px] text-white/70">Les notifications de l'équipe {etat.ok} arriveront aussi ici. Tu peux le changer depuis ton compte pro (Mes infos).</p></>)}
        {etat.erreur && (<><X className="mx-auto h-10 w-10 text-rose-300" /><p className="mt-3 text-[17px] font-semibold text-white">Impossible de relier</p><p className="mt-1 text-[14px] text-white/70">{etat.erreur}</p></>)}
        <Link to="/app" className="mt-5 inline-flex rounded-2xl bg-gradient-to-br from-[#DEC2A3] to-[#F1E2CC] px-5 py-2.5 text-[14px] font-semibold text-navy-900">Aller à mon cockpit</Link>
      </div>
    </div>
  );
}
