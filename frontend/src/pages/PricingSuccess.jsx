import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ArrowRight, Sparkles } from "lucide-react";

const GOLD = "#DEC2A3";
const NAVY = "#0B1F3A";

export default function PricingSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const plan = params.get("plan")?.toUpperCase() || "ZAYADO";
  const cycle = params.get("cycle") || "mensuel";

  useEffect(() => {
    // small confetti effect could be added here
  }, []);

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
          <Check size={30} className="text-[#0B1F3A]" strokeWidth={3} />
        </div>
        <span className="mt-6 inline-block text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: GOLD }}>Paiement confirmé</span>
        <h1 className="mt-3 font-display text-[32px] font-semibold text-white">
          Bienvenue dans <span style={{ color: GOLD }}>Zayado {plan}</span>
        </h1>
        <p className="mt-4 font-serif-italic italic text-[18px] text-white/85">
          « Prends une inspiration. On avance ensemble. »
        </p>
        <p className="mx-auto mt-4 max-w-sm text-[14px] text-white/60">
          Ton abonnement <b className="text-white">{cycle}</b> est actif. Ton reçu arrive par email dans quelques minutes.
        </p>
        <button onClick={() => navigate("/onboarding")}
          className="mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#0B1F3A]"
          style={{ background: GOLD, boxShadow: "0 8px 24px -6px rgba(222,194,163,0.6)" }}>
          <Sparkles size={15} /> Commencer mon onboarding <ArrowRight size={14} />
        </button>
      </motion.div>
    </div>
  );
}
