import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { fetchAbonnement, fetchCommandes, fetchTarifsFondateur, setToken } from "@/lib/kairosApi";
import { lancerPaiement } from "@/lib/checkout";
import { ESSAI, PLANS, prixFondateurMois } from "@/lib/plans";
import GrilleTarifs from "@/components/pricing/GrilleTarifs";
import { oublierAcces } from "@/components/kairos/AccesGate";

// Espace sans offre active : on explique, on rassure (données conservées) et on
// propose l'essai 2 mois pour 1 € — ou l'offre normale si l'essai est déjà utilisé.
export default function Activer() {
  const navigate = useNavigate();
  const [abo, setAbo] = useState(null);
  const [attente, setAttente] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [fonda, setFonda] = useState(null);
  const solo = PLANS.find((p) => p.key === ESSAI.plan);

  useEffect(() => {
    let arret = false, essais = 0;
    const verifier = async () => {
      try {
        const a = await fetchAbonnement();
        if (arret) return;
        setAbo(a);
        if (a.acces === "actif") { oublierAcces(); navigate("/app", { replace: true }); return; }
        const c = await fetchCommandes().catch(() => ({ items: [] }));
        const recent = (c.items || []).some((o) => o.kind === "saas" && ["pending", "open", "authorized"].includes(o.status)
          && o.created_at && Date.now() - new Date(o.created_at).getTime() < 2 * 3600e3);
        setAttente(recent);
        if (recent && essais++ < 30) setTimeout(verifier, 4000);  // paiement en cours de validation par Mollie
      } catch { setAbo({ acces: "aucun", essai: { disponible: false } }); }
    };
    verifier();
    fetchTarifsFondateur().then(setFonda).catch(() => {});
    return () => { arret = true; };
  }, [navigate]);

  const essayer = async () => { setEnvoi(true); if (!(await lancerPaiement(ESSAI.plan, { essai: true }))) setEnvoi(false); };
  const apres = fonda?.ouverte ? prixFondateurMois(solo, "mensuel") : solo.mensuel;

  return (
    <div className="zayado-blue min-h-screen px-4 py-10 text-offwhite sm:px-6" data-testid="page-activer">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <img src="/logo.png" alt="Zayado" className="h-10 w-10 object-contain" />
          <button onClick={() => { setToken(null); navigate("/login"); }} className="inline-flex items-center gap-1.5 text-[12.5px] text-offwhite/60 hover:text-offwhite"><LogOut size={14} /> Se déconnecter</button>
        </div>
        <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">Ton espace Zayado</p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Active ton cockpit</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-offwhite/70">
          Ta vision, tes objectifs et tes réglages sont bien enregistrés. Il ne reste qu'à choisir ta formule pour ouvrir ton espace.
        </p>

        {!abo && <Loader2 size={20} className="mt-8 animate-spin text-gold" />}
        {attente && (
          <p className="mt-6 flex items-center gap-2 rounded-xl border border-gold/35 bg-gold/10 px-4 py-3 text-[14px]" data-testid="activer-attente">
            <Loader2 size={16} className="animate-spin text-gold" /> Ton paiement est en cours de validation : ton espace s'ouvre automatiquement dans quelques secondes.
          </p>
        )}

        {abo && abo.essai?.disponible && (
          <div className="mt-8 rounded-[24px] border border-gold/45 bg-white/[0.10] p-6 backdrop-blur-xl sm:p-8" data-testid="activer-essai">
            <p className="inline-flex rounded-full bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-navy-900">Essai Solo</p>
            <p className="mt-4 font-display text-5xl font-extrabold">{ESSAI.prix} €<span className="ml-2 text-lg font-normal text-offwhite/60">les {ESSAI.mois} premiers mois</span></p>
            <p className="mt-2 text-[14px] text-offwhite/70">puis {apres} € HT / mois{fonda?.ouverte ? " — tarif fondateur réservé dès ton essai et garanti tant que tu restes abonné" : ""}. Aucun renouvellement automatique.</p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {solo.points.slice(0, 6).map((pt) => <li key={pt} className="flex gap-2 text-[13.5px] text-offwhite/80"><Check size={15} className="mt-0.5 shrink-0 text-gold" />{pt}</li>)}
            </ul>
            <button onClick={essayer} disabled={envoi} className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-7 text-[15px] font-semibold text-navy-900 disabled:opacity-60" data-testid="activer-essai-btn">
              {envoi ? <Loader2 size={17} className="animate-spin" /> : null} Commencer mon essai pour {ESSAI.prix} € <ArrowRight size={17} />
            </button>
            <p className="mt-3 text-[12px] text-offwhite/50">Paiement sécurisé Mollie · un essai par compte · tu préfères Pro ? <Link to="/pricing" className="underline hover:text-gold">Voir toutes les offres</Link></p>
          </div>
        )}

        {abo && !abo.essai?.disponible && (
          <div className="mt-8" data-testid="activer-offres">
            <p className="mb-2 text-[14px] text-offwhite/70">Ton essai est terminé : choisis ta formule pour retrouver ton espace, là où tu l'as laissé.</p>
            <GrilleTarifs contact />
          </div>
        )}

        <p className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-offwhite/55">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-gold" /> Données conservées, hébergées en Europe</span>
          <Link to="/parametres#securite" className="underline hover:text-offwhite">Exporter mes données</Link>
          <Link to="/parametres#facturation" className="underline hover:text-offwhite">Mes paiements</Link>
        </p>
      </div>
    </div>
  );
}
