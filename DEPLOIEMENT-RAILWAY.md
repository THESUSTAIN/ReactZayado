# Redéploiement Railway — Zayado (fusion « autre » + version déployée)

## Règle d'or
- **La base PostgreSQL de production n'est pas touchée.** Les seules tables ajoutées (`documents`, pour Accueil, Plan, Radar, Pilotage, Tunnels et SheetFlow) sont **créées au démarrage**, sans rien supprimer.
- **Ne copiez jamais `backend/.env` du pod vers Railway.** C'est un fichier de test local (SQLite et comptes de test).
- Vos variables Railway actuelles (JWT_SECRET, FERNET_KEY, DATABASE_URL, MOLLIE_API_KEY, VAPID_*, BREVO_*, MAMMOTH_*…) **restent identiques**.

## Ce qui change dans le dépôt
| Zone | Changement |
|---|---|
| `frontend/Dockerfile` | **Nouveau** : build Vite + TypeScript servi par nginx. L'ancien Dockerfile CRA **supprimait tous les fichiers .ts/.tsx** avant de construire : c'est pour ça que les nouvelles pages et le push n'arrivaient jamais en production. |
| `frontend/nginx.conf`, `frontend/docker-entrypoint.d/`, `frontend/railway.json` | Repris de la version déployée : même proxy `/api` vers le backend privé, même `BACKEND_URL`. |
| `frontend/src` | Frontend « autre » : Vision globale, Radar, Pilotage, Plan d'action, Tunnels, SheetFlow, plus toutes les pages déployées à leurs adresses d'origine. |
| `frontend/src/zy/pages/Entreprise.jsx` | Page Entreprise fusionnée : même menu latéral que l'Admin, avec SheetFlow intégré. |
| `frontend/src/zy/pages/Admin.jsx` | Nouvel onglet **« Site Entreprise & espaces cachés »**, avec les liens vers les pages cachées. |
| `frontend/public/public/entreprise/` | Site Zayado Entreprise déjà construit (modèle Shopify), servi à `/public/entreprise/index.html#/…`, avec `noindex`. Sources dans `vitrine-entreprise/` (`yarn build`, puis copier `build/` ici). |
| `backend/server.py` | **Mot de passe admin retiré du code** (`polezayado@gmail.com`). Le chat passe sur `claude-sonnet-5-5`. |
| `backend/llm_mammouth.py` | Modèle Emergent par défaut : `claude-sonnet-5-5`. |
| `WhatsApp-service/` | Inchangé, à garder tel quel. |
| `backend/kairos.db` | **Retiré.** Ne jamais committer de base de données. |

## Variables Railway à ajouter ou vérifier
| Service | Variable | Valeur |
|---|---|---|
| backend | `ESSAI_PRIX` | `1` (Solo à 1 €) |
| backend | `ESSAI_JOURS` | `60` (« 2 mois pour 1 € », comme annoncé sur Tarifs) |
| backend | `ESSAI_REVEUR_JOURS` | `30` (Rêveur gratuit 1 mois) |
| backend | `SEED_POLE_ADMIN_MDP` | *(facultatif)* Ne sert qu'à créer le compte s'il n'existe pas. Un compte existant n'est jamais modifié. |
| backend | `EMERGENT_LLM_MODEL` | `claude-sonnet-5-5`, si le chat passe par la clé Emergent |
| backend | `MAMMOTH_MODEL` | Si `MAMMOTH_API_KEY` est défini, **c'est Mammouth qui répond en priorité**. Mettez ici le nom du modèle Sonnet 5.5 chez Mammouth, ou retirez `MAMMOTH_API_KEY` pour utiliser la clé Emergent. |
| backend | `TUNNEL_KIT_PRIX` / `TUNNEL_FAST_TRACK_PRIX` / `TUNNEL_SOLO_PRIX` | `27.00` / `97.00` / `29.00` |
| backend | `TUNNEL_RDV_URL` | *(facultatif)* Lien Calendly ou équivalent. Sert à réserver la visio Fast-Track et l'appel stratégique des tunnels Reprise et Cession. Sans lien : formulaire de rappel. |
| backend | `REPRISE_GUIDE_URL` | *(facultatif)* Lien du PDF « Ton parcours d'acquisition de A à Z ». Sans lien : « envoyé par e-mail ». |
| backend | `PUBLIC_FRONTEND_URL` | `https://app.zayado.net`. Sert aux retours Mollie, au webhook du tunnel, aux adresses `/t/…`, aux aperçus de partage (Open Graph) et aux liens de l'e-mail du lundi. |
| backend | `MAMMOTH_API_KEY` / `BREVO_API_KEY` / `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `MOLLIE_API_KEY` / `HEYGEN_API_KEY` | Inchangées. À vérifier : sans elles, l'IA répond par gabarits, les e-mails, le push et le paiement sont inactifs, et les vidéos IA sont indisponibles. |
| backend | `APERCU_CODE` | **Ne pas définir** (rouvrirait l'accès démo). |
| backend | `ENV` | **Ne jamais mettre `local` en production** : c'est ce qui activerait le paiement simulé si la clé Mollie manquait. |
| frontend | `BACKEND_URL` | Inchangé (référence privée vers le backend, avec son port) |

## ⚠️ À faire tout de suite en production
1. **Changez le mot de passe du compte admin `polezayado@gmail.com`.** Il figurait en clair dans `server.py`.
2. Vérifiez que `backend/kairos.db` n'est plus dans l'historique Git du dépôt. Sinon, purgez-le (`git filter-repo`) ou rendez le dépôt privé.

## Mollie : à vérifier pour l'upsell en un clic
- Activez **Carte bancaire** dans le profil Mollie : c'est le premier paiement par carte qui crée le mandat.
- Test : faites le parcours `/public/tunnel` avec la clé `test_…`, payez le Kit avec une carte de test, puis cliquez sur « Oui » au Fast-Track. En mode test, Mollie vous laisse choisir le statut du paiement récurrent.
- Nouveau paquet backend : `fpdf2==2.8.3` (rapport PDF du Kit), déjà ajouté à `requirements.txt`.

## Espace vendeur (Dokan)
- Nouvelles tables créées au démarrage : `vendeur_parametres`, `vendeur_suivis`, `vendeur_reversements`. Aucune table existante n'est modifiée.
- Après le déploiement : Admin › « Vendeurs : commission & reversements », vérifiez le taux global (15 % par défaut).
- L'IBAN des vendeurs est chiffré avec `FERNET_KEY`. **Ne changez jamais cette clé en production**, sinon les IBAN enregistrés deviennent illisibles.

## Après le déploiement
- Ouvrez app.zayado.net, connectez-vous, puis allez sur Admin › Notifications › « Santé ». Chaque appareil se réabonne au push tout seul à sa première ouverture.
- Vérifiez Admin › « Site Entreprise & espaces cachés » : le lien du site doit s'ouvrir.

## v6 — vérifications après déploiement
1. **Admin › Pages & Traductions › Mentions légales de Zayado** : remplis le siège, le RCS/SIREN, le capital, le directeur de la publication, le médiateur et les adresses des hébergeurs.
2. Ouvre `/public/reprise` et `/public/cession`, fais le test, puis réserve un appel. La demande apparaît dans Admin › Pages & Traductions › « Inscrits des tunnels Zayado » (onglet « Appels à rappeler »).
3. Dans un compte de test :
   - Tunnels › un tunnel › « Référencement et partage » : renseigne les mentions de l'entreprise ;
   - publie, puis ouvre `/t/…` ;
   - inscris-toi : le contact arrive dans le Radar (demandes entrantes).
4. Colle un lien `/api/public/partage/reprise` dans WhatsApp : l'aperçu avec image doit s'afficher.
5. Avec un compte sans offre, ouvre `/` : tu dois arriver sur l'onboarding ou `/activer`.
6. Aucune nouvelle table SQL : les données v6 vont dans la table `documents`, déjà présente. Les collections concernées sont `tunnel_editeur`, `tunnel_images`, `tunnels_publics` et `reglages_zayado`.

## v7 — vérifications après déploiement (notifications)
1. Sur ton téléphone :
   - ouvre app.zayado.net et connecte-toi ;
   - accepte « Installer » (sur iPhone : Partager → Sur l'écran d'accueil) ;
   - ouvre l'app installée, puis Paramètres › Notifications › Activer.
2. Va dans Admin › Notifications › « Santé », puis « Tester » sur ton e-mail. Tu dois recevoir la cloche, le push et l'e-mail.
3. Inscris-toi sur un de tes tunnels publiés (`/t/…`) avec une autre adresse : la notification « Nouveau contact » doit arriver sur le téléphone.
4. Les clés `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` ne doivent **jamais changer**, sinon tous les appareils doivent se réabonner.
