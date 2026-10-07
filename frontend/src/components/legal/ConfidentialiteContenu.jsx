import React from "react";

const MAJ = "3 octobre 2026";
const MAIL = "contact@zayado.net";

// Politique de confidentialité Zayado (RGPD + exigences Google API Services User Data Policy),
// réutilisée par la page publique /legal/confidentialite et par la version embarquée /embed/confidentialite.
export default function ConfidentialiteContenu({ compact = false }) {
  const Section = ({ id, titre, children }) => (
    <section id={id} className={compact ? "mb-5" : "mb-7"}>
      <h2 className="mb-2 font-display text-lg font-bold text-offwhite sm:text-xl">{titre}</h2>
      <div className="space-y-2 text-[14px] leading-relaxed text-offwhite/70">{children}</div>
    </section>
  );
  const B = ({ children }) => <b className="text-offwhite/90">{children}</b>;
  const Mail = () => <a href={`mailto:${MAIL}`} className="font-semibold text-gold hover:underline">{MAIL}</a>;
  const Liste = ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>;

  return (
    <div data-testid="confidentialite-contenu">
      <p className="mb-2 text-[13px] text-offwhite/50">Dernière mise à jour : {MAJ}</p>
      <p className="mb-6 text-[14px] leading-relaxed text-offwhite/70">
        Zayado est un cockpit IA pour entrepreneurs et porteurs de projet : vision, objectifs, plan d'action, prospection, bien-être et, pour ceux qui le souhaitent, un espace de foi (« Ma Foi », avec TheSustain).
        Cette page explique, simplement et en détail, quelles données nous collectons, pourquoi, avec qui elles sont partagées, combien de temps nous les gardons et comment les supprimer.
      </p>

      <nav className="mb-7 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-[13px]" aria-label="Sommaire">
        <p className="mb-2 font-semibold text-offwhite/80">Sommaire</p>
        <ol className="list-decimal space-y-0.5 pl-5 text-offwhite/60">
          <li><a href="#responsable" className="hover:text-gold">Qui est responsable</a></li>
          <li><a href="#donnees" className="hover:text-gold">Données collectées</a></li>
          <li><a href="#google" className="hover:text-gold">Données Google (connexion et Drive)</a></li>
          <li><a href="#microsoft" className="hover:text-gold">Microsoft et TheSustain</a></li>
          <li><a href="#foi" className="hover:text-gold">Données sensibles : Ma Foi et bien-être</a></li>
          <li><a href="#finalites" className="hover:text-gold">Finalités et bases légales</a></li>
          <li><a href="#ia" className="hover:text-gold">Intelligence artificielle</a></li>
          <li><a href="#partage" className="hover:text-gold">Partage et sous-traitants</a></li>
          <li><a href="#conservation" className="hover:text-gold">Conservation et suppression</a></li>
          <li><a href="#droits" className="hover:text-gold">Vos droits</a></li>
          <li><a href="#securite" className="hover:text-gold">Sécurité, cookies, mineurs, transferts</a></li>
          <li><a href="#english" className="hover:text-gold">Summary in English (Google user data)</a></li>
        </ol>
      </nav>

      <Section id="responsable" titre="1. Responsable du traitement">
        <p>Zayado est édité par la <B>SAS TheSustain</B> (« nous »), qui exploite le cockpit accessible sur <B>app.zayado.net</B> et le site <B>zayado.net</B>. Pour toute question sur vos données, ou pour exercer vos droits : <Mail />.</p>
      </Section>

      <Section id="donnees" titre="2. Données que nous collectons">
        <Liste>
          <li><B>Compte</B> : adresse e-mail, prénom et nom, mot de passe (stocké chiffré, jamais en clair) ou, si vous vous connectez avec Google, Microsoft ou TheSustain, l'identifiant et l'adresse e-mail renvoyés par ce service.</li>
          <li><B>Votre projet</B> : vision, objectifs, idées, actions, processus, documents générés, notes et messages adressés au Copilote IA, que vous saisissez vous-même.</li>
          <li><B>Bien-être</B> : vos check-ins (énergie, stress, sommeil, clarté mentale), rituels cochés, entrées de carnet. Ces données restent privées et ne sont partagées avec personne.</li>
          <li><B>Prospection</B> : les recherches que vous lancez et les contacts professionnels proposés par nos fournisseurs de données, que vous choisissez de garder ou non.</li>
          <li><B>Abonnement</B> : l'offre choisie, les dates et montants. Le paiement est traité par Mollie : nous ne voyons ni ne stockons votre numéro de carte.</li>
          <li><B>Données techniques</B> : journaux de connexion et d'erreur, type d'appareil et de navigateur, adresse IP, et les cookies ou stockages locaux strictement nécessaires (session, préférences d'affichage).</li>
          <li><B>Notifications</B> : si vous les activez, jeton de notification du navigateur, ou identifiant Telegram / numéro WhatsApp que vous nous donnez pour recevoir des rappels.</li>
        </Liste>
        <p>Nous ne collectons pas de données de santé médicales, de données bancaires complètes ni de pièces d'identité.</p>
      </Section>

      <Section id="google" titre="3. Données Google : connexion et Google Drive">
        <p>Zayado utilise Google à deux endroits, chacun avec le minimum de droits nécessaire.</p>
        <p><B>a) « Continuer avec Google » (connexion).</B> Droits demandés : <B>openid, e-mail et profil</B>. Nous recevons votre adresse e-mail, votre nom et l'identifiant de votre compte Google. Nous les utilisons uniquement pour créer votre compte, vous reconnaître à la connexion et vous écrire au sujet de votre compte. Nous ne recevons ni votre mot de passe Google, ni vos e-mails, ni votre agenda, ni vos contacts.</p>
        <p><B>b) « Relier mon Google Drive » (facultatif, depuis Paramètres › Connexions).</B> Droit demandé : <B>https://www.googleapis.com/auth/drive.file</B>. Ce droit limité ne donne accès <B>qu'aux fichiers et dossiers créés par Zayado</B> ou que vous ouvrez explicitement avec Zayado. Concrètement :</p>
        <Liste>
          <li>Zayado crée un dossier nommé « Zayado » dans votre Drive et y enregistre les documents que <B>vous</B> générez dans l'application (par exemple un brief, un plan, un bilan) ;</li>
          <li>nous <B>ne lisons pas, ne parcourons pas et ne modifions pas</B> vos autres fichiers Drive ;</li>
          <li>le jeton d'accès et le jeton d'actualisation sont <B>stockés chiffrés</B> sur nos serveurs et ne servent qu'à ces enregistrements ;</li>
          <li>sans cette connexion, Zayado fonctionne normalement, vos documents restent dans l'application.</li>
        </Liste>
        <p><B>Utilisation limitée (Limited Use).</B> L'utilisation et le transfert vers toute autre application des informations reçues des API Google respectent la <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="font-semibold text-gold hover:underline">politique relative aux données utilisateur des services d'API Google</a>, y compris ses exigences d'utilisation limitée. En particulier, les données Google : sont utilisées <B>uniquement pour fournir les fonctions décrites ci-dessus</B> ; ne sont <B>jamais vendues</B> ni utilisées pour de la publicité ; ne sont <B>pas utilisées pour entraîner des modèles d'intelligence artificielle</B> ; ne sont pas transférées à des tiers, sauf nécessité technique du service (hébergement), obligation légale, ou avec votre accord ; et ne sont lues par aucune personne de notre équipe, sauf avec votre accord explicite (par exemple pour un dépannage que vous demandez) ou si la loi l'exige.</p>
        <p><B>Retirer l'accès à tout moment.</B> Déconnectez Drive dans Paramètres › Connexions, ou révoquez Zayado sur <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="font-semibold text-gold hover:underline">myaccount.google.com/permissions</a>. Les fichiers déjà créés dans votre Drive restent à vous ; nous supprimons les jetons à la déconnexion. Pour effacer aussi votre compte Zayado : voir « Conservation et suppression ».</p>
      </Section>

      <Section id="microsoft" titre="4. Microsoft et TheSustain">
        <p><B>Microsoft</B> (connexion et OneDrive, facultatifs) : mêmes principes que pour Google. Nous recevons votre nom et votre e-mail pour la connexion ; pour OneDrive, un accès limité sert uniquement à enregistrer vos documents Zayado, avec des jetons chiffrés, révocables à tout moment.</p>
        <p><B>TheSustain</B> : si vous vous connectez avec votre compte TheSustain, nous recevons votre e-mail et votre nom, et nous notons que vous êtes membre pour ouvrir l'espace « Ma Foi ». Aucune donnée n'est renvoyée à TheSustain depuis votre usage de Zayado, en dehors de ce qui est nécessaire à la connexion.</p>
      </Section>

      <Section id="foi" titre="5. Données sensibles : Ma Foi et bien-être">
        <p>Vos convictions religieuses (si vous utilisez « Ma Foi ») sont des données <B>sensibles</B> au sens du RGPD. Elles ne sont traitées qu'avec <B>votre consentement</B>, donné en activant cet espace. Vos prières, notes et parcours personnels restent privés. Un contenu n'est visible par d'autres membres (Mur de prière, Cercle) que si vous le publiez vous-même dans un espace partagé. Vous pouvez retirer votre consentement et effacer ces contenus à tout moment.</p>
        <p>Vos check-ins de bien-être ne sont pas des données médicales et ne servent qu'à adapter votre journée (suggestions, pauses, mode récupération). Zayado n'est pas un dispositif médical et ne remplace pas un professionnel de santé.</p>
      </Section>

      <Section id="finalites" titre="6. Finalités et bases légales">
        <Liste>
          <li>Créer votre compte, vous connecter et fournir le service (exécution du contrat).</li>
          <li>Enregistrer vos documents dans votre Drive ou OneDrive si vous le demandez (exécution du contrat, votre demande).</li>
          <li>Générer les réponses et analyses de l'IA à partir de votre contexte (exécution du contrat).</li>
          <li>Gérer votre abonnement, la facturation et les obligations comptables (contrat et obligation légale).</li>
          <li>Sécuriser le service, prévenir la fraude et corriger les erreurs (intérêt légitime).</li>
          <li>Vous envoyer les rappels, e-mails et notifications que vous activez (consentement, retirable à tout moment).</li>
          <li>Traiter les données sensibles de « Ma Foi » (consentement explicite).</li>
        </Liste>
        <p>Nous ne faisons aucune décision automatisée produisant des effets juridiques à votre égard, et aucune publicité ciblée.</p>
      </Section>

      <Section id="ia" titre="7. Intelligence artificielle">
        <p>Quand vous utilisez le Copilote ou une fonction IA, le message et le contexte nécessaire (par exemple votre projet ou vos objectifs) sont transmis à nos fournisseurs d'IA <B>uniquement pour produire la réponse</B>. Ils ne servent pas à entraîner des modèles. Les données issues de Google (e-mail, profil, Drive) ne sont pas envoyées à l'IA. Les réponses de l'IA peuvent comporter des erreurs : vérifiez-les avant toute décision importante.</p>
      </Section>

      <Section id="partage" titre="8. Partage et sous-traitants">
        <p><B>Nous ne vendons jamais vos données.</B> Nous les partageons seulement avec des prestataires qui nous aident à fournir le service, liés par contrat :</p>
        <Liste>
          <li><B>Hébergement et base de données</B> de l'application ;</li>
          <li><B>Mollie</B> : paiement et abonnements ;</li>
          <li><B>Brevo</B> : envoi des e-mails du service (confirmations, rappels, actualité que vous activez) ;</li>
          <li><B>Fournisseurs d'IA</B> (dont Mammouth AI) : génération des réponses ;</li>
          <li><B>Fournisseurs de données de prospection</B> (par exemple Apollo) : recherche de contacts professionnels demandés par vous ;</li>
          <li><B>Google, Microsoft, TheSustain</B> : uniquement pour la connexion et les connexions de stockage que vous activez.</li>
        </Liste>
        <p>Nous pouvons aussi communiquer des données si une autorité compétente l'exige légalement. Dans une équipe (offre Équipe), le titulaire de l'abonnement voit les membres rattachés, pas leurs contenus privés.</p>
      </Section>

      <Section id="conservation" titre="9. Conservation et suppression">
        <Liste>
          <li>Vos données sont conservées tant que votre compte est actif.</li>
          <li><B>Supprimer votre compte</B> : écrivez-nous à <Mail /> depuis l'adresse de votre compte (ou utilisez Paramètres › Sécurité si l'option est présente). Vos données personnelles sont effacées sous <B>30 jours</B>.</li>
          <li>Seules sont gardées les données que la loi nous oblige à conserver (factures et justificatifs de paiement : jusqu'à 10 ans, en archivage restreint).</li>
          <li>Jetons Google/Microsoft : supprimés dès que vous déconnectez le service ou supprimez votre compte.</li>
          <li>Journaux techniques : conservés pour une durée limitée de sécurité, puis supprimés.</li>
          <li>Vous pouvez exporter vos données depuis Paramètres › Sécurité (« Exporter mes données »).</li>
        </Liste>
      </Section>

      <Section id="droits" titre="10. Vos droits">
        <p>Vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité, de limitation, d'opposition, et du droit de retirer votre consentement à tout moment, ainsi que de définir des directives sur le sort de vos données après votre décès. Écrivez-nous à <Mail /> ; nous répondons sous un mois. Vous pouvez aussi saisir la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="font-semibold text-gold hover:underline">CNIL</a>.</p>
      </Section>

      <Section id="securite" titre="11. Sécurité, cookies, mineurs, transferts, modifications">
        <p><B>Sécurité.</B> Connexions en HTTPS, mots de passe et jetons de connexion chiffrés, accès restreints, sauvegardes. Aucun système n'est infaillible : signalez-nous tout incident présumé à <Mail />, et nous vous informerons en cas de violation vous concernant, comme la loi l'exige.</p>
        <p><B>Cookies.</B> Nous utilisons uniquement des cookies et stockages locaux nécessaires (session, langue, thème). Pas de cookie publicitaire ni de traceur de profilage.</p>
        <p><B>Mineurs.</B> Zayado s'adresse aux personnes de 16 ans et plus. Nous ne collectons pas sciemment de données d'enfants de moins de 16 ans.</p>
        <p><B>Transferts hors Union européenne.</B> Lorsque certains prestataires (par exemple d'IA) traitent des données hors de l'Union européenne, nous nous appuyons sur des garanties reconnues (clauses contractuelles types ou décision d'adéquation).</p>
        <p><B>Modifications.</B> En cas de changement important, nous vous informerons dans l'application ou par e-mail avant son application.</p>
      </Section>

      <Section id="english" titre="12. Summary in English (Google user data)">
        <p><B>Who we are.</B> Zayado (app.zayado.net, zayado.net) is operated by SAS TheSustain. Contact: <Mail />.</p>
        <p><B>Google user data we access.</B> (1) Sign-in with Google: scopes <i>openid, email, profile</i> — we receive your email address, name and Google account ID to create and secure your account. (2) Optional Google Drive connection: scope <i>drive.file</i> — Zayado can only create and access the files and folders it creates itself (a folder named “Zayado”) to save documents you generate in the app. We do not read, scan or modify any other file in your Drive.</p>
        <p><B>How we use it.</B> Only to provide these features. We do not sell Google user data, do not use it for advertising, do not use it to train AI or machine-learning models, and do not send it to AI providers. Human access is limited to what you explicitly ask for (support), security, or legal obligations.</p>
        <p><B>Limited Use.</B> Zayado's use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="font-semibold text-gold hover:underline">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
        <p><B>Storage and protection.</B> OAuth tokens are stored encrypted on our servers. Data is kept while your account is active.</p>
        <p><B>Retention and deletion.</B> You can disconnect Google Drive at any time in Settings › Connections or revoke access at myaccount.google.com/permissions; tokens are then deleted. You can request deletion of your account and data at <Mail />; personal data is erased within 30 days, except records we are legally required to keep (e.g. invoices).</p>
      </Section>
    </div>
  );
}
