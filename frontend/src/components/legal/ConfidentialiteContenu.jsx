import React from "react";

const MAJ = "juin 2026";

// Contenu de la politique de confidentialité Zayado (RGPD), réutilisé par la page
// publique /legal/confidentialite et par la version embarquée Shopify /embed/confidentialite.
export default function ConfidentialiteContenu({ compact = false }) {
  const Section = ({ titre, children }) => (
    <section className={compact ? "mb-5" : "mb-7"}>
      <h2 className="mb-2 font-display text-lg font-bold text-offwhite sm:text-xl">{titre}</h2>
      <div className="space-y-2 text-[14px] leading-relaxed text-offwhite/70">{children}</div>
    </section>
  );
  return (
    <div data-testid="confidentialite-contenu">
      <p className="mb-6 text-[13px] text-offwhite/50">Dernière mise à jour : {MAJ}</p>

      <Section titre="1. Responsable du traitement">
        <p>Zayado (« nous ») édite le cockpit IA accessible sur zayado.net. Pour toute question relative à vos données, contactez-nous à <a href="mailto:contact@zayado.net" className="font-semibold text-gold hover:underline">contact@zayado.net</a>.</p>
      </Section>

      <Section titre="2. Données que nous collectons">
        <ul className="list-disc space-y-1 pl-5">
          <li><b className="text-offwhite/90">Compte</b> : adresse e-mail, nom/prénom, mot de passe (chiffré) ou identifiant de connexion Google/Microsoft.</li>
          <li><b className="text-offwhite/90">Contenu que vous créez</b> : vision, objectifs, idées, actions, check-ins d'énergie, documents et messages adressés au Copilote.</li>
          <li><b className="text-offwhite/90">Abonnement</b> : offre choisie et informations de facturation traitées par notre prestataire de paiement (nous ne stockons pas vos numéros de carte).</li>
          <li><b className="text-offwhite/90">Données techniques</b> : journaux de connexion, type d'appareil et cookies strictement nécessaires au fonctionnement.</li>
        </ul>
      </Section>

      <Section titre="3. Finalités et bases légales">
        <ul className="list-disc space-y-1 pl-5">
          <li>Fournir le service et votre espace privé (exécution du contrat).</li>
          <li>Générer les réponses de l'IA à partir de votre contexte (exécution du contrat).</li>
          <li>Gérer votre abonnement et la facturation (obligation légale et contrat).</li>
          <li>Améliorer et sécuriser le service (intérêt légitime).</li>
          <li>Vous envoyer des notifications et rappels que vous activez (consentement).</li>
        </ul>
      </Section>

      <Section titre="4. Intelligence artificielle">
        <p>Vos messages et votre contexte sont transmis à nos fournisseurs d'IA uniquement pour générer une réponse. Ils ne sont pas utilisés pour entraîner des modèles tiers. Vous gardez le contrôle et pouvez supprimer votre contenu à tout moment.</p>
      </Section>

      <Section titre="5. Partage des données">
        <p>Nous ne vendons jamais vos données. Nous les partageons uniquement avec des sous-traitants nécessaires au service (hébergement, paiement, e-mail, fournisseurs d'IA), encadrés par contrat et situés ou conformes au cadre européen.</p>
      </Section>

      <Section titre="6. Durée de conservation">
        <p>Vos données sont conservées tant que votre compte est actif. Après suppression de votre compte, elles sont effacées sous 30 jours, sauf obligation légale (ex. facturation).</p>
      </Section>

      <Section titre="7. Vos droits (RGPD)">
        <p>Vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité, de limitation et d'opposition. Écrivez-nous à <a href="mailto:contact@zayado.net" className="font-semibold text-gold hover:underline">contact@zayado.net</a> ; vous pouvez aussi saisir la CNIL.</p>
      </Section>

      <Section titre="8. Sécurité">
        <p>Mots de passe chiffrés, connexions en HTTPS et accès restreints. Malgré nos efforts, aucun système n'est infaillible : signalez-nous tout incident présumé.</p>
      </Section>

      <Section titre="9. Modifications">
        <p>Nous pouvons mettre à jour cette politique. En cas de changement important, nous vous en informerons dans l'application ou par e-mail.</p>
      </Section>
    </div>
  );
}
