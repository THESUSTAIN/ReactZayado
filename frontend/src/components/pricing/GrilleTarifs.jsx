import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import { PLANS_LANCEMENT, prixMois, prixFondateurMois, dateFinFr, ESSAI } from "@/lib/plans";
import { fetchTarifsFondateur } from "@/lib/kairosApi";

// Grille tarifaire UNIQUE : utilisée par la page /pricing de l'application et
// par /embed/tarifs (iframe sur Shopify / Instant). Un prix change ici
// (lib/plans.js + serveur) → il change partout, sans risque d'écart.

const APP_URL = "https://app.zayado.net";

function Carte({ o, cycle, fondateur, embed }) {
  const prixNormal = prixMois(o, cycle);
  const prixFonda = fondateur?.ouverte ? prixFondateurMois(o, cycle) : null;
  const prix = prixFonda ?? prixNormal;
  const essai = o.key === ESSAI.plan;
  const chemin = `/login?next=${encodeURIComponent(`/onboarding?plan=${o.key}&cycle=${cycle}${essai ? "&essai=1" : ""}`)}`;
  const factureAn = prixFonda != null ? o.fondateur.annuel : o.annuel;
  const classeBouton = `mt-5 text-center ${o.star ? "btn-gold justify-center" : "btn-ghost justify-center"}`;
  const libelle = essai ? `Essayer 2 mois pour ${ESSAI.prix} €` : `Choisir ${o.nom}`;
  const ensuite = cycle === "annuel" ? `${factureAn.toLocaleString("fr-FR")} € HT / an` : `${prix} € HT / mois`;
  return (
    <div className={`glass relative flex flex-col rounded-2xl p-6 ${o.star ? "border-gold/50 shadow-[0_20px_50px_-20px_rgba(222,194,163,0.3)] lg:-mt-3 lg:pb-9" : ""}`} data-testid={`pricing-${o.key}`}>
      {o.star && <p className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-navy-900">{essai ? `2 mois pour ${ESSAI.prix} €` : "Le plus choisi"}</p>}
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
            <span>{prix} €<span className="ml-1 text-sm font-normal text-offwhite/50">HT / mois</span></span>
          </p>
          <p className="mt-1 h-4 text-[11px] text-offwhite/45">
            {cycle === "annuel" ? `Facturé ${factureAn.toLocaleString("fr-FR")} € HT / an` : `ou ${prixFonda != null ? prixFondateurMois(o, "annuel") : prixMois(o, "annuel")} € / mois en annuel`}
          </p>
        </>
      )}
      {embed ? (
        <a href={`${APP_URL}${chemin}`} target="_top" rel="noopener" data-testid={`pricing-cta-${o.key}`} className={classeBouton}>{libelle}</a>
      ) : (
        <Link to={chemin} data-testid={`pricing-cta-${o.key}`} className={classeBouton}>{libelle}</Link>
      )}
      {essai && <p className="mt-2 text-center text-[11px] text-offwhite/50">Un essai par compte · aucun renouvellement automatique</p>}
      <ul className="mt-6 flex-1 space-y-2.5 border-t border-white/10 pt-5">
        {o.points.map((pt) => (
          <li key={pt} className="flex items-start gap-2 text-[13.5px] text-offwhite/75"><Check size={14} className="mt-0.5 shrink-0 text-gold" />{pt}</li>
        ))}
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
        {liste.map((o) => <Carte key={o.key} o={o} cycle={cycle} fondateur={fondateur} embed={embed} />)}
      </div>

      {contact && (
        <div className="mx-auto mt-6 flex max-w-5xl flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:flex-row sm:items-center" data-testid="pricing-plus-entreprise">
          <div>
            <p className="text-sm font-semibold text-offwhite">Équipe et Entreprise <span className="text-gold">— nous contacter</span></p>
            <p className="mt-1 text-xs text-offwhite/60">Pour les TPE et les structures plus grandes : plusieurs comptes, plusieurs agents clients, agent qui répond à partir de vos documents, accompagnement dédié.</p>
          </div>
          <a href="mailto:contact@zayado.net?subject=Offre Équipe ou Entreprise" target={embed ? "_top" : undefined} className="shrink-0 rounded-xl border border-gold/40 px-4 py-2 text-xs font-semibold text-gold" data-testid="pricing-plus-cta-entreprise">
            Nous contacter <ArrowRight size={12} className="ml-1 inline" />
          </a>
        </div>
      )}

      <p className="mt-6 text-center text-[11.5px] text-offwhite/45">Prix des offres HT · essai à {ESSAI.prix} € TTC · sans engagement ni renouvellement automatique · paiement sécurisé Mollie</p>
    </div>
  );
}
