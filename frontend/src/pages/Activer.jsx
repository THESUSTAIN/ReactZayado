import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { fetchAbonnement, fetchCommandes, fetchState, fetchTarifsFondateur, setToken } from "@/lib/kairosApi";
import { lancerPaiement } from "@/lib/checkout";
import { ESSAI, PLANS, prixFondateurMois, taxe } from "@/lib/plans";
import GrilleTarifs from "@/components/pricing/GrilleTarifs";
import { oublierAcces } from "@/components/kairos/AccesGate";

// Espace sans offre active : on explique, on rassure (données conservées) et on
// propose l'essai 1 mois pour 1 € — ou l'offre normale si l'essai est déjà utilisé.
export default function Activer() {
  const navigate = useNavigate();
  const [abo, setAbo] = useState(null);
  const [attente, setAttente] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [fonda, setFonda] = useState(null);
  const [onboarded, setOnboarded] = useState(true);
  const [prenom, setPrenom] = useState("");
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
    fetchState().then((s) => { setOnboarded(!!s?.onboarded); setPrenom(s?.profile?.prenom || ""); }).catch(() => {});
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
        <p className="mt-10 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-gold" data-testid="activer-badge">
          <span className="h-2 w-2 rounded-full bg-gold" /> Ton plan est prêt
        </p>
        <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl" data-testid="activer-titre">
          {prenom ? `${prenom}, ta place` : "Ta place"} dans le <em className="italic text-gold">cockpit</em> t'attend.
        </h1>
        {onboarded ? (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-offwhite/70">
            Ta vision, tes objectifs et tes premières actions sont enregistrés. Mais sans ton cockpit, piloter seul·e te coûte cher. Vois plutôt.
          </p>
        ) : (
          <div className="mt-6 max-w-2xl rounded-2xl border border-gold/40 bg-gold/10 p-5" data-testid="activer-onboarding-cta">
            <p className="text-[15px] leading-relaxed text-offwhite/80">
              Avant tout, raconte ton projet en cinq minutes : ta vision, tes objectifs, ton cap financier. Le cockpit se prépare avec, puis tu choisiras ta formule.
            </p>
            <button onClick={() => navigate("/onboarding")} className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-6 text-[14px] font-semibold text-navy-900" data-testid="activer-onboarding-btn">
              Raconter mon projet (5 min) <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Comparaison de valeur — sans le cockpit */}
        {onboarded && (
          <div className="mt-8 max-w-2xl" data-testid="activer-comparaison">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-offwhite/45">Sans le cockpit</p>
            <div className="mt-4 space-y-3">
              {[
                { titre: "Consultant en organisation", sous: "Hors de prix au quotidien.", prix: "80-150 €", par: "/ heure" },
                { titre: "Outils dispersés (todo, CRM, notes…)", sous: "Rien ne se parle, tout se recopie.", prix: "100 €+", par: "/ mois" },
                { titre: "Agence marketing", sous: "Inaccessible quand on démarre.", prix: "500 €+", par: "/ mois" },
              ].map((c) => (
                <div key={c.titre} className="flex items-center gap-4 rounded-2xl border border-white/15 border-l-2 border-l-gold/60 bg-white/[0.06] p-4 backdrop-blur-xl" data-testid={`activer-vs-${c.titre.slice(0, 10)}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-offwhite">{c.titre}</span>
                    <span className="mt-0.5 block text-[13px] text-gold/80">{c.sous}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-display text-[20px] font-bold text-gold">{c.prix}</span>
                    <span className="block text-[11px] text-offwhite/45">{c.par}</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-offwhite/80" data-testid="activer-punchline">
              Tu pourrais y laisser <em className="font-semibold text-gold">des centaines d'euros chaque mois</em>. Ou prendre ta place dans le cockpit.
            </p>
          </div>
        )}

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
            <p className="mt-2 text-[14px] text-offwhite/70">puis {apres} € {taxe(solo)} / mois{fonda?.ouverte ? " — tarif fondateur réservé dès ton essai et garanti tant que tu restes abonné" : ""}. Le prélèvement démarre automatiquement à la fin de l'essai : tu reçois un rappel 7 jours avant et tu peux résilier en 1 clic.</p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {solo.points.slice(0, 6).map((pt) => <li key={pt} className="flex gap-2 text-[13.5px] text-offwhite/80"><Check size={15} className="mt-0.5 shrink-0 text-gold" />{pt}</li>)}
            </ul>
            <button onClick={essayer} disabled={envoi} className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-b from-[#F1E2CC] to-[#DEC2A3] px-7 text-[15px] font-semibold text-navy-900 disabled:opacity-60" data-testid="activer-essai-btn">
              {envoi ? <Loader2 size={17} className="animate-spin" /> : null} Prendre ma place — {ESSAI.prix} € les {ESSAI.mois} premiers mois <ArrowRight size={17} />
            </button>
            <p className="mt-3 text-[12px] text-offwhite/50">Paiement sécurisé Mollie · un essai par compte · tu préfères Pro ou Équipe ? <Link to="/pricing" className="underline hover:text-gold">Voir toutes les offres</Link></p>
          </div>
        )}

        {abo && abo.essai?.disponible && (
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-white/15 bg-white/[0.06] p-5" data-testid="activer-reveur">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">Tu veux d'abord rêver et clarifier ?</p>
              <p className="mt-1 text-[13px] text-offwhite/65">Offre Rêveur : Vision Boards, Idées et chat IA, pour 15 € TTC / mois. Tu passes à Solo quand tu veux passer à l'action.</p>
            </div>
            <button onClick={async () => { setEnvoi(true); if (!(await lancerPaiement("reveur", { essai: false }))) setEnvoi(false); }} disabled={envoi}
              className="rounded-full border border-white/40 px-5 py-2.5 text-[13px] font-semibold hover:bg-white/10 disabled:opacity-60" data-testid="activer-reveur-btn">
              Choisir Rêveur
            </button>
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
