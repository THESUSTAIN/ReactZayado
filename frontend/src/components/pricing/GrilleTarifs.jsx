import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight, Loader2, Users, X, HelpCircle, HandHeart, Ticket } from "lucide-react";
import { toast } from "sonner";
import { PLANS, PLANS_LANCEMENT, PLAN_ENTREPRISE, prixMois, prixFondateurMois, dateFinFr, ESSAI, REVEUR_OFFERT, essaiPeriode, taxe } from "@/lib/plans";
import { fetchTarifsFondateur, getToken, appliquerCodePromo } from "@/lib/kairosApi";
import { lancerPaiement } from "@/lib/checkout";
import { chargerAbonnement, oublierAbonnement } from "@/lib/acces";
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

function Carte({ o, cycle, fondateur, embed, onPourquoi, remise = 0 }) {
  const prixNormal = prixMois(o, cycle);
  const prixFondaBrut = fondateur?.ouverte ? prixFondateurMois(o, cycle) : null;
  // Membre TheSustain : -X % sur le prix normal, jamais cumulé avec le tarif fondateur (le plus bas l'emporte).
  const remAn = remise > 0 ? Math.round(o.annuel * (1 - remise) * 100) / 100 : null;
  const remMois = remise > 0 ? Math.round(o.mensuel * (1 - remise) * 100) / 100 : null;
  const remCycle = remise > 0 ? (cycle === "annuel" ? remAn / 12 : remMois) : null;
  const membreGagne = remCycle != null && (prixFondaBrut == null || remCycle < prixFondaBrut);
  const prixFonda = membreGagne ? null : prixFondaBrut;
  const prix = membreGagne ? remCycle : (prixFonda ?? prixNormal);
  const essai = ESSAI.plans.includes(o.key);
  const factureAn = membreGagne ? remAn : (prixFonda != null ? o.fondateur.annuel : o.annuel);
  const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const classeBouton = `mt-5 w-full text-center ${o.star ? "btn-gold justify-center" : "btn-ghost justify-center"}`;
  const offert = o.key === REVEUR_OFFERT.plan;
  const libelle = essai ? `Essayer ${ESSAI.mois} mois pour ${ESSAI.prix} €` : offert ? `Essayer ${REVEUR_OFFERT.mois} mois gratuit` : `Choisir ${o.nom}`;
  const ensuite = cycle === "annuel" ? `${factureAn.toLocaleString("fr-FR")} € ${taxe(o)} / an` : `${fmt(prix)} € ${taxe(o)} / mois`;
  return (
    <div className={`glass relative flex flex-col rounded-2xl p-6 ${o.star ? "border-gold/50 shadow-[0_20px_50px_-20px_rgba(222,194,163,0.3)] lg:-mt-3 lg:pb-9" : ""}`} data-testid={`pricing-${o.key}`}>
      {o.star && <p className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-navy-900">{essai ? `${ESSAI.mois} mois pour ${ESSAI.prix} €` : "Le plus choisi"}</p>}
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{o.nom}</p>
      <p className="mt-1 text-[12.5px] text-offwhite/60">{o.pourQui}</p>
      {o.economie && <p className="mt-1 inline-flex rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300" data-testid={`economie-${o.key}`}>Au lieu de {o.economie}</p>}
      {essai ? (
        <>
          <p className="mt-4 flex items-baseline gap-2 font-display text-4xl font-extrabold" data-testid="pricing-essai">
            {ESSAI.prix} €<span className="text-sm font-normal text-offwhite/60">{essaiPeriode()}</span>
          </p>
          <p className="mt-1.5 text-[12.5px] text-offwhite/70" data-testid={`pricing-fondateur-${o.key}`}>
            puis {(prixFonda != null || membreGagne) && <span className="text-offwhite/40 line-through">{cycle === "annuel" ? `${o.annuel.toLocaleString("fr-FR")} €` : `${prixNormal} €`}</span>}{" "}
            <b className="text-offwhite">{ensuite}</b>{prixFonda != null && <span className="text-gold"> · tarif fondateur garanti</span>}{membreGagne && <span className="text-gold"> · −{Math.round(remise * 100)} % partenariat TheSustain</span>}
          </p>
        </>
      ) : (
        <>
          {prixFonda != null && (
            <p className="mt-3 inline-flex w-fit rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[10.5px] font-semibold text-gold" data-testid={`pricing-fondateur-${o.key}`}>
              Tarif fondateur · garanti tant que tu restes abonné
            </p>
          )}
          {membreGagne && (
            <p className="mt-3 inline-flex w-fit rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[10.5px] font-semibold text-gold" data-testid={`pricing-membre-${o.key}`}>
              −{Math.round(remise * 100)} % · partenariat TheSustain
            </p>
          )}
          <p className="mt-3 flex items-baseline gap-2 font-display text-4xl font-extrabold">
            {(prixFonda != null || membreGagne) && <span className="text-xl font-semibold text-offwhite/40 line-through decoration-2">{prixNormal} €</span>}
            <span>{fmt(prix)} €<span className="ml-1 text-sm font-normal text-offwhite/50">{taxe(o)} / mois</span></span>
          </p>
          <p className="mt-1 text-[11px] text-offwhite/45" data-testid={`pricing-equivalent-${o.key}`}>
            {cycle === "annuel" ? `facturé ${factureAn.toLocaleString("fr-FR")} € ${taxe(o)} / an` : `ou ${membreGagne ? fmt(remAn / 12) : prixFonda != null ? prixFondateurMois(o, "annuel") : prixMois(o, "annuel")} € / mois en annuel`}
          </p>
        </>
      )}
      {offert && <p className="mt-2 inline-flex w-fit rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-200" data-testid="pricing-reveur-offert">{REVEUR_OFFERT.mois} mois offert · sans carte bancaire</p>}
      <BoutonOffre o={o} cycle={cycle} essai={essai || offert} embed={embed} className={classeBouton}>{libelle}</BoutonOffre>
      {(essai || offert) && <p className="mt-2 text-center text-[11px] text-offwhite/50">Un essai par compte · {offert ? "rien à payer pendant le mois offert" : "résiliable en 1 clic avant la fin"}</p>}
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
        <p className="mt-5 text-[12.5px] text-offwhite/55">Tu débutes ? Commence par Solo (2 mois pour 1 €) : tu passeras à Pro le jour où tu voudras ton chatbot client, en gardant ton tarif fondateur.</p>
      </div>
    </div>
  );
}

function BandeauEquipe({ cycle, embed, remise = 0 }) {
  const eq = PLANS.find((p) => p.key === "business");
  const brut = prixMois(eq, cycle);
  const prixR = remise > 0 ? Math.round((cycle === "annuel" ? eq.annuel / 12 : eq.mensuel) * (1 - remise) * 100) / 100 : null;
  const prix = prixR != null ? prixR.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) : brut;
  return (
    <div className="mx-auto mt-6 grid max-w-5xl gap-5 rounded-2xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-xl md:grid-cols-[1.3fr_1fr]" data-testid="pricing-equipe">
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold"><Users size={14} /> Équipe · {prix} € {taxe(eq)} / mois</p>
        <p className="mt-2 font-display text-xl font-semibold">Tu travailles avec un associé, un assistant ou un commercial ?</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-offwhite/70">
          Tu gardes tout Pro pour toi, chacun de tes 2 coéquipiers reçoit son propre espace Solo, et « Ton entreprise » organise ton équipe jusqu'à 5 personnes : pièces, planning, absences, chrono et décompte du mois.
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

// « J'ai un code » : code membre TheSustain (remise partenaire sur toute la grille, tout de suite) ou mois offerts.
// Sans compte : on passe d'abord par la connexion, puis on revient ici.
function CodeReduction({ onRemise }) {
  const [ouvert, setOuvert] = useState(false);
  const [code, setCode] = useState("");
  const [envoi, setEnvoi] = useState(false);
  if (!getToken()) {
    const retour = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/pricing";
    return (
      <p className="mt-5 text-center">
        <Link to={`/login?next=${encodeURIComponent(retour)}`} className="text-[12.5px] text-offwhite/60 underline-offset-4 hover:text-offwhite hover:underline" data-testid="pricing-code-connexion">J'ai un code : je me connecte pour l'utiliser</Link>
      </p>
    );
  }
  const appliquer = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setEnvoi(true);
    try {
      const r = await appliquerCodePromo(code.trim());
      if (r.type === "thesustain") {
        oublierAbonnement();
        onRemise(Number(r.remise) || 0);
        toast.success(`Code membre TheSustain reconnu : −${Math.round((Number(r.remise) || 0) * 100)} % appliqués sur toute la grille.`);
      } else {
        toast.success(`+${r.mois_offerts} mois offert${r.mois_offerts > 1 ? "s" : ""}, crédités sur ton compte.`);
      }
      setCode(""); setOuvert(false);
    } catch { toast.error("Code invalide, inactif ou épuisé."); }
    finally { setEnvoi(false); }
  };
  if (!ouvert) {
    return (
      <p className="mt-5 text-center">
        <button onClick={() => setOuvert(true)} className="inline-flex items-center gap-1.5 text-[12.5px] text-offwhite/60 underline-offset-4 hover:text-offwhite hover:underline" data-testid="pricing-code-ouvrir"><Ticket size={13} /> J'ai un code</button>
      </p>
    );
  }
  return (
    <form onSubmit={appliquer} className="mx-auto mt-5 flex max-w-xs gap-2" data-testid="pricing-code">
      <input value={code} onChange={(e) => setCode(e.target.value)} autoFocus placeholder="Code membre ou de réduction" aria-label="Code"
        className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-sm outline-none focus:border-gold" data-testid="pricing-code-input" />
      <button type="submit" disabled={envoi} className="rounded-xl border border-gold/40 px-4 py-2 text-xs font-semibold text-gold disabled:opacity-60" data-testid="pricing-code-btn">{envoi ? <Loader2 size={14} className="animate-spin" /> : "Appliquer"}</button>
    </form>
  );
}

// Téléphone : un onglet par offre + une carte à la fois, qu'on fait glisser (la suivante dépasse sur le bord).
// Tablette / ordinateur : la grille habituelle, toutes les offres côte à côte.
function Defilement({ liste, colonnes, children, carrousel }) {
  const zone = useRef(null);
  const depart = Math.max(0, liste.findIndex((o) => o.star));
  const [actif, setActif] = useState(depart);
  const aller = (i, doux = true) => {
    const el = zone.current?.children[i];
    if (el && zone.current) zone.current.scrollTo({ left: el.offsetLeft - (zone.current.clientWidth - el.clientWidth) / 2, behavior: doux ? "smooth" : "auto" });
    setActif(i);
  };
  // Ouvre sur l'offre mise en avant (Solo), comme une vitrine.
  useEffect(() => { if (window.matchMedia("(max-width: 639px)").matches) aller(depart, false); }, [depart]); // eslint-disable-line react-hooks/exhaustive-deps
  const auDefilement = () => {
    const z = zone.current;
    if (!z) return;
    const centre = z.scrollLeft + z.clientWidth / 2;
    let meilleur = 0, ecart = Infinity;
    Array.from(z.children).forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.clientWidth / 2 - centre); if (d < ecart) { ecart = d; meilleur = i; } });
    if (meilleur !== actif) setActif(meilleur);
  };
  if (!carrousel) {  // page publique : la grille classique (offres l'une sous l'autre sur téléphone)
    return <div className={`mx-auto mt-10 grid gap-5 ${colonnes}`}>{liste.map((o) => <React.Fragment key={o.key}>{children(o)}</React.Fragment>)}</div>;
  }
  return (
    <>
      <div className="mx-auto mt-8 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-white/15 bg-white/5 p-1 sm:hidden" role="tablist" aria-label="Offres" data-testid="pricing-onglets">
        {liste.map((o, i) => (
          <button key={o.key} role="tab" aria-selected={actif === i} onClick={() => aller(i)} data-testid={`pricing-onglet-${o.key}`}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition ${actif === i ? "bg-white/90 text-navy-900" : "text-white/65"}`}>
            {o.nom}
          </button>
        ))}
      </div>
      <div ref={zone} onScroll={auDefilement}
        className={`mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-[7.5%] pb-2 pt-4 [scrollbar-width:none] sm:mx-auto sm:mt-10 sm:grid sm:gap-5 sm:overflow-visible sm:px-0 sm:pt-0 [&::-webkit-scrollbar]:hidden ${colonnes}`}
        data-testid="pricing-cartes">
        {liste.map((o) => <div key={o.key} className="flex w-[85%] shrink-0 snap-center flex-col sm:w-auto [&>*]:flex-1">{children(o)}</div>)}
      </div>
      <div className="mt-3 flex justify-center gap-1.5 sm:hidden" aria-hidden>
        {liste.map((o, i) => <span key={o.key} className={`h-1.5 rounded-full transition-all ${actif === i ? "w-5 bg-gold" : "w-1.5 bg-white/25"}`} />)}
      </div>
    </>
  );
}

/**
 * embed : liens ouverts dans la fenêtre principale (iframe Shopify / Instant).
 * offres : clés à afficher (par défaut Solo et Pro).
 * contact : affiche le bandeau Équipe / Entreprise.
 */
export default function GrilleTarifs({ embed = false, offres = null, contact = true, cycleInitial = "mensuel", carrousel = false }) {
  const [cycle, setCycle] = useState(cycleInitial);
  const [fondateur, setFondateur] = useState(null);
  const [pourquoi, setPourquoi] = useState(false);
  // Membre TheSustain (connexion SSO) : remise automatique sur la grille, appliquée aussi à l'encaissement (serveur).
  const [remise, setRemise] = useState(0);   // 0,3 = -30 % pour les membres TheSustain (valeur du serveur)
  useEffect(() => { fetchTarifsFondateur().then(setFondateur).catch(() => setFondateur(null)); }, []);
  useEffect(() => {
    if (embed || !getToken()) return;
    chargerAbonnement().then((a) => setRemise(a?.thesustain ? Number(a.remise_thesustain) || 0 : 0)).catch(() => {});
  }, [embed]);
  const liste = offres ? PLANS_LANCEMENT.filter((p) => offres.includes(p.key)) : PLANS_LANCEMENT;
  const colonnes = liste.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3 max-w-5xl" : liste.length === 2 ? "sm:grid-cols-2 max-w-3xl" : "max-w-md";

  return (
    <div>
      {remise > 0 && !embed && (
        <div className="mx-auto mb-6 flex max-w-xl items-start gap-3 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-left" data-testid="pricing-membre-thesustain">
          <HandHeart size={18} className="mt-0.5 shrink-0 text-gold" />
          <div className="text-[12.5px] leading-relaxed text-offwhite/80">
            <p className="font-semibold text-gold">Partenariat Zayado × TheSustain : −{Math.round(remise * 100)} % sur toutes les offres</p>
            <p className="mt-0.5">Tu es membre de <b className="text-offwhite">TheSustain</b>, l'association chrétienne pour entrepreneurs, qui est un service distinct de Zayado. Grâce à ce partenariat, Zayado applique cette remise automatiquement à ton compte connecté.</p>
          </div>
        </div>
      )}
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

      <Defilement liste={liste} colonnes={colonnes} carrousel={carrousel}>
        {(o) => <Carte key={o.key} o={o} cycle={cycle} fondateur={fondateur} embed={embed} remise={remise} onPourquoi={embed ? null : () => setPourquoi(true)} />}
      </Defilement>
      {pourquoi && <PourquoiPro onClose={() => setPourquoi(false)} />}
      {!embed && remise === 0 && <CodeReduction onRemise={setRemise} />}

      {contact && <BandeauEquipe cycle={cycle} embed={embed} remise={remise} />}
      {contact && (
        <div className="mx-auto mt-5 max-w-5xl rounded-3xl border border-white/15 bg-white/[0.05] p-5 sm:p-6" data-testid="pricing-plus-entreprise">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">{PLAN_ENTREPRISE.nom}</p>
              <p className="mt-1 font-display text-[20px] font-semibold text-offwhite">Tout Équipe, sans limite, installé chez toi</p>
              <p className="mt-1 text-[13px] text-offwhite/65">{PLAN_ENTREPRISE.pourQui}. Tes données restent dans tes fichiers et ton Microsoft 365.</p>
            </div>
            <div className="text-right">
              <p className="font-display text-[22px] font-bold text-offwhite">Sur devis</p>
              <p className="text-[12px] text-offwhite/55">à partir de {PLAN_ENTREPRISE.plancher} € / mois</p>
            </div>
          </div>
          <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {PLAN_ENTREPRISE.points.map((x) => <li key={x} className="flex gap-2 text-[13.5px] text-offwhite/85"><Check size={15} className="mt-0.5 shrink-0 text-gold" />{x}</li>)}
          </ul>
          <a href="mailto:contact@zayado.net?subject=Offre Entreprise" target={embed ? "_top" : undefined} className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-gold/50 px-5 text-[14px] font-semibold text-gold hover:bg-gold/10" data-testid="pricing-plus-cta-entreprise">Demander un devis <ArrowRight size={15} /></a>
        </div>
      )}

      {!embed && (
        <p className="mx-auto mt-6 text-center text-[12px] text-offwhite/55" data-testid="pricing-partenariat-note">
          Membre de TheSustain ? <Link to="/partenaires/thesustain" className="font-semibold text-gold hover:underline">Découvrir le partenariat</Link>
        </p>
      )}
      <p className="mt-6 text-center text-[11.5px] text-offwhite/45">Tous les prix sont TTC (pas de TVA, entreprise non assujettie) · essai à {ESSAI.prix} € TTC · sans engagement, résiliable en 1 clic · paiement sécurisé Mollie</p>
    </div>
  );
}
