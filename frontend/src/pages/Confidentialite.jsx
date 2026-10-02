import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import ConfidentialiteContenu from "@/components/legal/ConfidentialiteContenu";

export default function Confidentialite() {
  const navigate = useNavigate();
  useEffect(() => { document.title = "Politique de confidentialité — Zayado"; }, []);
  return (
    <div className="min-h-screen bg-navy-900 px-4 py-10 text-offwhite sm:px-6" data-testid="confidentialite-page">
      <div className="mx-auto max-w-2xl">
        <button onClick={() => navigate(-1)} data-testid="confidentialite-retour"
          className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-offwhite/60 transition hover:text-gold">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/15 text-gold"><ShieldCheck className="h-5 w-5" /></span>
          <h1 className="font-display text-3xl font-extrabold text-offwhite sm:text-4xl">Politique de confidentialité</h1>
        </div>
        <ConfidentialiteContenu />
      </div>
    </div>
  );
}
