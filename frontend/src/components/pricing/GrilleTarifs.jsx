import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight, Loader2, Users, X, HelpCircle } from "lucide-react";
import { PLANS, PLANS_LANCEMENT, prixMois, prixFondateurMois, dateFinFr, ESSAI, taxe } from "@/lib/plans";
import { fetchTarifsFondateur, getToken } from "@/lib/kairosApi";
import { lancerPaiement } from "@/lib/checkout";
import Economies from "@/components/pricing/Economies";

// Grille tarifaire UNIQUE : utilisée par la page /pricing de l'application et
// par /embed/tarifs (iframe sur Shopify / Instant). Un prix change ici
// (lib/plans.js + serveur) → il change partout, sans risque d'écart.

const APP_URL = "https://app.zayado.net";

// Bouton d'offre : connecté → paiement direct (plus de détour par l'onboarding) ;
// sinon → connexion puis onboarding avec l'offre pré-choisie.
function BoutonOffre({ o, cycle, essai, embed, className, children }) {
  const [envoi, setEnvoi] = useState(false);
  const chemin = `/login?next=${encodeURIComponent(`/onboarding?plan=${o.key}&cycle=${cycle}${essai ? "&essai=1" : ""}`)}`;
  if (embed) return <a href={`${APP_URL}${chemin}`} target="_top" rel="noopener" data-testid={`pricing-cta-${o.key}`} className={className}>{children}</a>;
  if (getToken()) {
    const payer = async () => { setEnvoi(true); if (!(await lancerPaiement(o.key, { cycle, essai }))) setEnvoi(false); };
    return (
      <button onClick={payer} disabled={envoi} data-testid={`pricing-cta-${o.key}`} className={`${className} disabled:opacity-60`}>
        {envoi && <Loader2 size={15} className="mr-1.5 inline animate-spin" />}{children}
      </button>
    );
  }
  return <Link to={chemin} data-testid={`pricing-cta-${o.key}`} className={className}>{children}</Link>;
}

function Carte({ o, cycle, fondateur, embed, onPourquoi }) {
  const prixNormal = prixMois(o, cycle);
  const prixFonda = fondateur?.ouverte ? prixFondateurMois(o, cycle) : null;
  const prix = prixFonda ?? prixNormal;
  const essai = o.key === ESSAI.plan;
  const factureAn = prixFonda != null ? o.fondateur.annuel : o.annuel;
  const classeBouton = `mt-5 w-full text-center ${o.star ? "btn-gold justify-center" : "btn-ghost justify-center"}`;
  const libelle = essai ? `Essayer ${ESSAI.mois} mois pour ${ESSAI.prix} €` : `Choisir ${o.nom}`;
  const ensuite = cycle === "annuel" ? `${factureAn.toLocaleString("fr-FR")} € ${taxe(o)} / an` : `${prix} € ${taxe(o)} / mois`;
  return (
    <div className={`glass relative flex flex-col rounded-2xl p-6 ${o.star ? "border-gold/50 shadow-[0_20px_50px_-20px_rgba(222,194,163,0.3)] lg:-mt-3 lg:pb-9" : ""}`} data-testid={`pricing-${o.key}`}>
      {o.star && <p className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-navy-900">{essai ? `${ESSAI.mois} mois pour ${ESSAI.prix} €` : "Le plus choisi"}</p>}
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{o.nom}</p>
      <p className="mt-1 text-[12.5px] text-offwhite/60">{o.pourQui}</p>
      {essai ? (
        <>
          <p className="mt-4 flex items-baseline gap-2 font-display text-4xl font-extrabold" data-testid="pricing-essai">
            {ESSAI.prix} €<span className="text-sm font-normal text-offwhite/60">les {ESSAI.mois} premiers mois</span>
          </p>
          <p className="mt-1.5 text-[12.5px] text-offwhite/70" data-testid={`pricing-fondateur-${o.key}`}>
            puis {prixFonda != null && <span className="text-offwhite/40 line-through">{cycle === "annuel" ? `${o.annuel.toLocaleString("fr-FR")} €` : `${prixNormal} €`}</span>}{" "}
            <b className="text-offwhite">{ensuite}</b>{prixFonda != null && <span className="text-gold"> · tarif fondateur garanti</span>}
          </p>
        </>
      ) : (
        <>
          {prixFonda != null && (
            <p className="mt-3 inline-flex w-fit rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[10.5px] font-semibold text-gold" data-testid={`pricing-fondateur-${o.key}`}>
              Tarif fondateur · garanti tant que tu restes abonné
            </p>
          )}
          <p className="mt-3 flex items-baseline gap-2 font-display text-4xl font-extrabold">
            {prixFonda != null && <span className="text-xl font-semibold text-offwhite/40 line-through decoration-2">{prixNormal} €</span>}
            <span>{prix} €<span className="ml-1 text-sm font-normal text-offwhite/50">{taxe(o)} / mois</span></span>
          </p>
          <p className="mt-1 text-[11px] text-offwhite/45" data-testid={`pricing-equivalent-${o.key}`}>
            {cycle === "annuel" ? `facturé ${factureAn.toLocaleString("fr-FR")} € ${taxe(o)} / an` : `ou ${prixFonda != null ? prixFondateurMois(o, "annuel") : prixMois(o, "annuel")} € / mois en annuel`}
          </p>
        </>
      )}
      <BoutonOffre o={o} cycle={cycle} essai={essai} embed={embed} className={classeBouton}>{libelle}</BoutonOffre>
      {essai && <p className="mt-2 text-center text-[11px] text-offwhite/50">Un essai par compte · résiliable en 1 clic avant la fin</p>}
      {o.key === "pro" && onPourquoi && (
        <button onClick={onPourquoi} className="mt-2 inline-flex items-center justify-center gap-1.5 text-[12px] font-medium text-gold hover:underline" data-testid="pricing-pourquoi-pro">
          <HelpCircle size={13} /> Pourquoi Pro ? Comparer les prix
        </button>
      )}
      <ul className="mt-6 flex-1 space-y-2.5 border-t border-white/10 pt-5">
        {o.points.map((pt) => (
          <li key={pt} className="flex items-start gap-2 text-[13.5px] text-offwhite/75"><Check size={14} className="mt-0.5 shrink-0 text-gold" />{pt}</li>
        ))}
      </ul>
    </div>
  );
}

// Fenêtre « Pourquoi Pro ? » : ce que coûteraient les mêmes outils séparément,
// et deux situations concrètes où Pro se rembourse.
export function PourquoiPro({ onClose }) {
  useEffect(() => {
    const f = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#07122a]/70 p-3 backdrop-blur-sm sm:items-center" onClick={onClose} data-testid="pourquoi-pro">
      <div className="fenetre max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[24px] p-5 text-offwhite sm:p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Pourquoi Pro ?</p>
            <h3 className="mt-1 font-display text-2xl font-bold">Un seul abonnement au lieu de quatre</h3>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-2 text-offwhite/60 hover:bg-white/10"><X size={18} /></button>
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-offwhite/70">
          Trouver des clients, répondre aux questions de ton site, savoir ce que les gens cherchent sur Google, avoir une IA qui connaît ton projet :
          séparément, ces outils coûtent plus de 200 € par mois. Dans Zayado, ils travaillent ensemble et parlent de <b>ton</b> activité.
        </p>
        <div className="mt-5"><Economies /></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            ["Un rendez-vous de plus par mois", "Le Radar te donne 90 vrais contacts par mois avec un message prêt. S'il en sort un seul client, Pro est remboursé."],
            ["Tes clients ont une réponse à 23 h", "L'Agent Business répond sur ton site avec tes tarifs et tes infos, et te transmet les demandes sérieuses sur WhatsApp ou Telegram."],
          ].map(([t, x]) => (
            <div key={t} className="rounded-2xl border border-white/12 bg-white/[0.05] p-4">
              <p className="text-[14px] font-semibold">{t}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-offwhite/65">{x}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-[12.5px] text-offwhite/55">Tu débutes ? Commence par Solo (1 mois pour 1 €) : tu passeras à Pro le jour où tu voudras ton chatbot client, en gardant ton tarif fondateur.</p>
      </div>
    </div>
  );
}

function BandeauEquipe({ cycle, embed }) {
  const eq = PLANS.find((p) => p.key === "business");
  const prix = prixMois(eq, cycle);
  return (
    <div className="mx-auto mt-6 grid max-w-5xl gap-5 rounded-2xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-xl md:grid-cols-[1.3fr_1fr]" data-testid="pricing-equipe">
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold"><Users size={14} /> Équipe · {prix} € {taxe(eq)} / mois</p>
        <p className="mt-2 font-display text-xl font-semibold">Tu travailles avec un associé, un assistant ou un commercial ?</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-offwhite/70">
          Tu gardes tout Pro pour toi, et chacun de tes 2 coéquipiers reçoit son propre espace Solo : son cockpit, sa Vision, son Radar de prospects et son Plan d'action.
          Plus besoin de payer trois abonnements : une seule facture, et tu ajoutes ou retires quelqu'un en un clic.
        </p>
        <BoutonOffre o={eq} cycle={cycle} essai={false} embed={embed} className="btn-ghost mt-4 inline-flex">Choisir Équipe <ArrowRight size={14} className="ml-1" /></BoutonOffre>
      </div>
      <ul className="space-y-2.5 self-center">
        {eq.points.slice(1).map((pt) => <li key={pt} className="flex items-start gap-2 text-[13px] text-offwhite/75"><Check size={14} className="mt-0.5 shrink-0 text-gold" />{pt}</li>)}
      </ul>
    </div>
  );
}

/**
 * embed : liens ouverts dans la fenêtre principale (iframe Shopify / Instant).
 * offres : clés à afficher (par défaut Solo et Pro).
 * contact : affiche le bandeau Équipe / Entreprise.
 */
export default function GrilleTarifs({ embed = false, offres = null, contact = true, cycleInitial = "mensuel" }) {
  const [cycle, setCycle] = useState(cycleInitial);
  const [fondateur, setFondateur] = useState(null);
  const [pourquoi, setPourquoi] = useState(false);
  useEffect(() => { fetchTarifsFondateur().then(setFondateur).catch(() => setFondateur(null)); }, []);
  const liste = offres ? PLANS_LANCEMENT.filter((p) => offres.includes(p.key)) : PLANS_LANCEMENT;
  const colonnes = liste.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3 max-w-5xl" : liste.length === 2 ? "sm:grid-cols-2 max-w-3xl" : "max-w-md";

  return (
    <div>
      <div className="text-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1" data-testid="pricing-cycle-toggle">
          <button onClick={() => setCycle("mensuel")} className={`rounded-full px-4 py-2 text-[12.5px] font-semibold transition ${cycle === "mensuel" ? "bg-gold text-navy-900" : "text-white/70"}`} data-testid="pricing-cycle-mensuel">Mensuel</button>
          <button onClick={() => setCycle("annuel")} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold transition ${cycle === "annuel" ? "bg-gold text-navy-900" : "text-white/70"}`} data-testid="pricing-cycle-annuel">
            Annuel <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${cycle === "annuel" ? "bg-navy-900/15" : "bg-gold/20 text-gold"}`}>2 mois offerts</span>
          </button>
        </div>
      </div>

      {fondateur?.ouverte && (
        <p className="mx-auto mt-6 w-fit rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-center text-[12.5px] font-semibold text-gold" data-testid="pricing-fondateur-bandeau">
          Offre de lancement : tarif fondateur pour les {fondateur.places} premiers clients, jusqu'au {dateFinFr(fondateur.fin)}
        </p>
      )}

      <div className={`mx-auto mt-10 grid gap-5 ${colonnes}`}>
        {liste.map((o) => <Carte key={o.key} o={o} cycle={cycle} fondateur={fondateur} embed={embed} onPourquoi={embed ? null : () => setPourquoi(true)} />)}
      </div>
      {pourquoi && <PourquoiPro onClose={() => setPourquoi(false)} />}

      {contact && <BandeauEquipe cycle={cycle} embed={embed} />}
      {contact && (
        <p className="mx-auto mt-4 max-w-5xl text-center text-[12.5px] text-offwhite/55" data-testid="pricing-plus-entreprise">
          Plus de 3 personnes ? <a href="mailto:contact@zayado.net?subject=Offre Entreprise" target={embed ? "_top" : undefined} className="font-semibold text-gold hover:underline" data-testid="pricing-plus-cta-entreprise">Offre Entreprise sur devis</a>
        </p>
      )}

      <p className="mt-6 text-center text-[11.5px] text-offwhite/45">Tous les prix sont TTC (pas de TVA, entreprise non assujettie) · essai à {ESSAI.prix} € TTC · sans engagement, résiliable en 1 clic · paiement sécurisé Mollie</p>
    </div>
  );
}
