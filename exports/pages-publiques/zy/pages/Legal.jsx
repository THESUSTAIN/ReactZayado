import React, { createContext, useContext, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Scale } from "lucide-react";

/* Pages légales : /legal/mentions-legales, /legal/cgu, /legal/cgv.
   Les informations de la société (siège, SIREN, capital, directeur, médiateur, hébergeurs) se modifient
   sans code : Admin › Pages publiques › « Mentions légales de Zayado » (GET /api/public/legal-zayado).
   Tant qu'un champ est vide, la valeur par défaut ci-dessous s'affiche. Faire relire l'ensemble par un juriste. */

const DEFAUT = {
  nom: "SAS TheSustain",
  commercial: "Zayado",
  siege: "[adresse du siège — à compléter]",
  rcs: "[RCS et numéro SIREN — à compléter]",
  capital: "[capital social — à compléter]",
  directeur: "[nom du directeur de la publication — à compléter]",
  email: "contact@zayado.net",
  mediateur: "[nom et coordonnées du médiateur — à compléter]",
  hebergeur_app: "Railway Corporation (États-Unis) — railway.com — [adresse postale à vérifier sur railway.com/legal]",
  hebergeur_boutique: "Shopify International Ltd (Irlande) — [adresse à vérifier sur shopify.com/legal]",
};
const SocieteCtx = createContext(DEFAUT);
const useSociete = () => useContext(SocieteCtx);

const B = ({ children }) => <b className="text-offwhite">{children}</b>;
const Section = ({ titre, children }) => (
  <section className="mt-8">
    <h2 className="font-display text-xl font-semibold text-offwhite">{titre}</h2>
    <div className="mt-3 space-y-3 text-[14.5px] leading-relaxed text-offwhite/75">{children}</div>
  </section>
);

function Mentions() {
  const SOCIETE = useSociete();
  return (
    <>
      <Section titre="Éditeur">
        <p><B>{SOCIETE.nom}</B>, société par actions simplifiée, exploitant le nom commercial <B>{SOCIETE.commercial}</B>.</p>
        <p>Siège : {SOCIETE.siege}<br />Immatriculation : {SOCIETE.rcs}<br />Capital : {SOCIETE.capital}</p>
        <p>Directeur de la publication : {SOCIETE.directeur}<br />Contact : <a className="text-gold" href={`mailto:${SOCIETE.email}`}>{SOCIETE.email}</a></p>
      </Section>
      <Section titre="Hébergement">
        <p>L'application est hébergée par {SOCIETE.hebergeur_app}.</p>
        <p>La boutique zayado.net est hébergée par {SOCIETE.hebergeur_boutique}.</p>
      </Section>
      <Section titre="Propriété intellectuelle">
        <p>Les textes, logos, interfaces et contenus de Zayado sont protégés. Toute reproduction sans accord écrit est interdite. Les contenus que vous créez dans Zayado restent les vôtres.</p>
      </Section>
      <Section titre="Données personnelles">
        <p>Voir la <Link className="text-gold hover:underline" to="/legal/confidentialite">politique de confidentialité</Link>.</p>
      </Section>
    </>
  );
}

function Cgu() {
  const SOCIETE = useSociete();
  return (
    <>
      <Section titre="1. Objet">
        <p>Les présentes conditions encadrent l'utilisation de l'application Zayado (app.zayado.net), éditée par {SOCIETE.nom}. Créer un compte vaut acceptation de ces conditions.</p>
      </Section>
      <Section titre="2. Compte">
        <p>Vous êtes responsable de la confidentialité de vos accès. Un compte est personnel. Les comptes d'équipe sont créés par invitation du titulaire de l'offre.</p>
      </Section>
      <Section titre="3. Utilisation de l'intelligence artificielle">
        <p>Zayado propose des suggestions produites par intelligence artificielle. Elles sont des aides à la décision : rien n'est envoyé à un tiers sans votre validation, et vous restez seul responsable des décisions, messages et documents que vous publiez.</p>
      </Section>
      <Section titre="4. Contenus de l'utilisateur">
        <p>Vous conservez la propriété de vos contenus. Vous nous autorisez à les héberger et à les traiter uniquement pour faire fonctionner le service. Les contenus illicites, haineux ou portant atteinte aux droits de tiers sont interdits et peuvent être retirés.</p>
      </Section>
      <Section titre="5. Vie privée au sein d'une équipe">
        <p>Dans les offres Équipe et Entreprise, l'employeur n'a jamais accès aux espaces personnels (Vision, Ma foi, Bien-être, carnet).</p>
      </Section>
      <Section titre="6. Disponibilité">
        <p>Nous faisons notre possible pour assurer un accès continu, sans pouvoir le garantir (maintenance, incident d'un prestataire). Les services tiers (Google, Microsoft, Mollie, Shopify, WhatsApp…) sont soumis à leurs propres conditions.</p>
      </Section>
      <Section titre="7. Suspension et suppression">
        <p>Vous pouvez supprimer vos données à tout moment dans Paramètres. Nous pouvons suspendre un compte en cas d'usage frauduleux ou contraire aux présentes conditions.</p>
      </Section>
      <Section titre="8. Droit applicable">
        <p>Droit français. En cas de litige, une solution amiable est recherchée en priorité ({SOCIETE.email}).</p>
      </Section>
    </>
  );
}

function Cgv() {
  const SOCIETE = useSociete();
  return (
    <>
      <Section titre="1. Offres et prix">
        <p>Les offres (Rêveur, Solo, Pro, Équipe, Entreprise) et leurs prix sont indiqués sur la page <Link className="text-gold hover:underline" to="/pricing">Tarifs</Link> au moment de la souscription. TVA non applicable, article 293 B du CGI : le montant affiché est le montant prélevé.</p>
        <p><B>Tarif fondateur</B> : réservé aux premiers clients dans la limite indiquée ; il reste acquis tant que l'abonnement n'est pas résilié.</p>
      </Section>
      <Section titre="2. Essai">
        <p>L'essai Solo coûte 1 € TTC et dure 2 mois. Sans résiliation, l'abonnement se poursuit au tarif affiché lors de l'essai. Un e-mail de rappel est envoyé avant le premier prélèvement. Un essai par compte.</p>
      </Section>
      <Section titre="3. Paiement">
        <p>Le paiement est traité par <B>Mollie B.V.</B> (Pays-Bas). Les abonnements sont prélevés automatiquement chaque mois ou chaque année selon le cycle choisi.</p>
      </Section>
      <Section titre="4. Sans engagement — résiliation">
        <p>L'abonnement est sans engagement. La résiliation se fait en un clic dans Paramètres › Offre ; l'accès reste ouvert jusqu'à la fin de la période payée, sans nouveau prélèvement.</p>
      </Section>
      <Section titre="5. Droit de rétractation">
        <p>Si vous êtes un consommateur, vous disposez de 14 jours pour vous rétracter. En commençant à utiliser le service pendant ce délai, vous demandez son exécution immédiate ; la rétractation reste possible, au prorata de la période utilisée. Le droit de rétractation ne s'applique pas aux professionnels.</p>
      </Section>
      <Section titre="6. Produits, box et services">
        <p>Les produits et box sélectionnés par Zayado sont vendus sur la boutique zayado.net, selon ses propres conditions. Les services d'accompagnement sont réalisés par Zayado ou par des partenaires sélectionnés, sur devis.</p>
      </Section>
      <Section titre="7. Réclamations et médiation">
        <p>Écrivez-nous à {SOCIETE.email}. Un consommateur peut aussi recourir gratuitement à un médiateur de la consommation : {SOCIETE.mediateur}.</p>
      </Section>
    </>
  );
}

const PAGES = {
  "mentions-legales": { titre: "Mentions légales", Contenu: Mentions },
  cgu: { titre: "Conditions générales d'utilisation", Contenu: Cgu },
  cgv: { titre: "Conditions générales de vente", Contenu: Cgv },
};

export default function Legal() {
  const { page } = useParams();
  const navigate = useNavigate();
  const p = PAGES[page];
  const [societe, setSociete] = useState(DEFAUT);
  useEffect(() => {
    apiGet("/public/legal-zayado")
      .then((d) => setSociete({ ...DEFAUT, ...Object.fromEntries(Object.entries(d || {}).filter(([, v]) => v)) }))
      .catch(() => {});
  }, []);
  useEffect(() => { if (p) document.title = `${p.titre} — Zayado`; }, [p]);
  if (!p) return <Navigate to="/legal/mentions-legales" replace />;
  const { Contenu } = p;
  return (
    <div className="legal-clair min-h-screen bg-[#FDFCF8] px-4 py-10 text-[#0D1F38] sm:px-6" data-testid={`legal-${page}`}>
      <div className="mx-auto max-w-2xl">
        <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-offwhite/60 transition hover:text-gold">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <div className="mb-2 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/15 text-gold"><Scale className="h-5 w-5" /></span>
          <h1 className="font-display text-3xl font-extrabold text-offwhite sm:text-4xl">{p.titre}</h1>
        </div>
        <p className="text-[12px] text-offwhite/45">Dernière mise à jour : 13 octobre 2026</p>
        <SocieteCtx.Provider value={societe}><Contenu /></SocieteCtx.Provider>
        <nav className="mt-12 flex flex-wrap gap-4 border-t border-white/10 pt-6 text-[13px] text-offwhite/55">
          <Link to="/legal/mentions-legales" className="hover:text-gold">Mentions légales</Link>
          <Link to="/legal/cgu" className="hover:text-gold">CGU</Link>
          <Link to="/legal/cgv" className="hover:text-gold">CGV</Link>
          <Link to="/legal/confidentialite" className="hover:text-gold">Confidentialité</Link>
        </nav>
      </div>
    </div>
  );
}
