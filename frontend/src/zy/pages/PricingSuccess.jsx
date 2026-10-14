import React, { useEffect, useState } from "react";
import { fetchAbonnement } from "@/zy/lib/kairosApi";
import { oublierAbonnement } from "@/zy/lib/acces";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ArrowRight, Sparkles } from "lucide-react";

const GOLD = "#DEC2A3";
const NAVY = "#0f1b3a";

export default function PricingSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const NOMS = { reveur: "Rêveur", serenite: "Solo", pro: "Pro", business: "Équipe", entreprise: "Entreprise" };
  // Le message dépend du serveur (paiement confirmé par Mollie), jamais de l'adresse seule.
  const [etat, setEtat] = useState({ statut: "verif", abo: null });
  useEffect(() => {
    let essais = 0, fini = false, minuteur = null;
    const verifier = () => {
      oublierAbonnement();
      fetchAbonnement().then((a) => {
        if (fini) return;
        if (a?.acces === "actif" && a?.plan && a.plan !== "essentielle") setEtat({ statut: "ok", abo: a });
        else if (++essais < 10) minuteur = setTimeout(verifier, 3000);
        else setEtat({ statut: "attente", abo: a });
      }).catch(() => { if (!fini) setEtat({ statut: "attente", abo: null }); });
    };
    verifier();
    return () => { fini = true; clearTimeout(minuteur); };
  }, []);
  const abo = etat.abo;
  const plan = (abo && NOMS[abo.plan]) || "";
  const cycle = abo?.cycle === "annuel" ? "annuel" : abo?.cycle === "essai" ? "d'essai" : "mensuel";
  const prochain = abo?.renouvellement?.date ? new Date(abo.renouvellement.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;
  if (etat.statut !== "ok") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6" style={{ background: NAVY }} data-testid="pricing-success-attente">
        <div className="max-w-md rounded-3xl border border-white/15 bg-white/[0.04] p-10 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: GOLD }}>
            {etat.statut === "verif" ? "Vérification du paiement…" : "Paiement en cours de validation"}
          </p>
          <p className="mt-4 text-[15px] text-white/75">
            {etat.statut === "verif"
              ? "On attend la confirmation de la banque, ça prend quelques secondes."
              : "La confirmation n'est pas encore arrivée. Tu recevras un e-mail dès qu'elle sera là. Si le paiement a échoué, tu peux réessayer."}
          </p>
          {etat.statut === "attente" ? (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button onClick={() => window.location.reload()} className="rounded-xl border border-white/20 px-5 py-2.5 text-[13px] font-semibold text-white">Vérifier à nouveau</button>
              <button onClick={() => navigate("/pricing")} className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-[#0f1b3a]" style={{ background: GOLD }}>Réessayer le paiement</button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6" style={{ background: NAVY }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
        className="relative max-w-lg rounded-3xl border border-white/15 p-10 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(222,194,163,0.14), rgba(74,106,158,0.32))",
          boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(222,194,163,0.2)",
        }}>
        <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full opacity-20 blur-3xl" style={{ background: GOLD }} />
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: GOLD }}>
          <Check size={30} className="text-[#0f1b3a]" strokeWidth={3} />
        </div>
        <span className="mt-6 inline-block text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: GOLD }}>Paiement confirmé</span>
        <h1 className="mt-3 font-display text-[32px] font-semibold text-white">
          Bienvenue dans <span style={{ color: GOLD }}>Zayado {plan}</span>
        </h1>
        <p className="mt-4 font-serif-italic italic text-[18px] text-white/85">
          « Prends une inspiration. On avance ensemble. »
        </p>
        <p className="mx-auto mt-4 max-w-sm text-[14px] text-white/60">
          Ton abonnement <b className="text-white">{cycle}</b> est actif{abo?.fondateur ? ", au tarif fondateur garanti" : ""}.
          {prochain ? <> Prochain prélèvement le <b className="text-white">{prochain}</b>.</> : null} Ton reçu arrive par e-mail dans quelques minutes.
        </p>
        <button onClick={() => navigate("/")}
          className="mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#0f1b3a]"
          style={{ background: GOLD, boxShadow: "0 8px 24px -6px rgba(222,194,163,0.6)" }}>
          <Sparkles size={15} /> Ouvrir mon espace <ArrowRight size={14} />
        </button>
      </motion.div>
    </div>
  );
}
