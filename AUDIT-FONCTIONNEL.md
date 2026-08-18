# Audit fonctionnel — Cap Vivant corrigé (4)

Date : 18 août 2026

## Installation

L’archive fournie a été installée sur le frontend port 3000 et le backend port 8001. Une sauvegarde pré-installation est conservée dans `/home/ubuntu/backups/cap-vivant-before-corrige4-20260818-0355`.

## Accueil (`/`)

| Contrôle | Résultat | Observation |
|---|---|---|
| Chargement de la route | Conforme | Page rendue sans écran d’erreur ni erreur Axios visible. |
| États vides | Conforme | Cap, tâches et capacité restent explicitement non définis ; aucune donnée inventée. |
| Trajectoire | Conforme | Vision → Décision → Action est lisible et la capacité apparaît comme contrainte. |
| Accès visibles | Conforme | Copilote, check-in, Mon Cap et navigation principale sont accessibles. |
| Design | Conforme | Rail, Header transparent, verre et accents or sont cohérents avec Cours-main. |

Limite de vérification : la création de tâches, le check-in et les décisions restent à tester avec un compte réel afin de ne pas produire de données de démonstration.

## Mon Cap (`/vision`)

| Contrôle | Résultat | Observation |
|---|---|---|
| Chargement de la route | Conforme | Mon Cap s’affiche sans erreur, avec maison stratégique, jalon, décision et preuve d’exécution. |
| Boucle stratégique | Conforme | Vision → Décision → Action est visible, ainsi que les appels vers Studio, Piliers et Décisions. |
| États vides | Conforme | Jalons, décisions, missions, objectifs et climat signalent clairement l’absence de données. |
| Formulation de trajectoire | À corriger | Les libellés `— piliers actifs`, `— signaux à traiter`, `— actions recommandées` et `Les modules exécutent votre Vision` doivent être remplacés par des textes métier non ambigus. |
| Citation actuelle | À corriger | La citation générique et explicitement religieuse est isolée tout en bas, après les insights ; elle ne respecte ni le contexte de décision ni la séparation Universel / TheSustain. |

### Placement recommandé des citations

La citation ne doit plus figurer comme un bandeau final. Dans Business, un **repère de sens** bref et universel sera intégré dans la carte de contexte de décision ou le Climat stratégique, uniquement lorsqu’il aide à arbitrer. Dans TheSustain, une référence de foi explicite pourra apparaître dans le parcours activé, avec une source et un lien volontaire vers le contenu de foi. Le réglage `Univers Foi` ne devra pas, à lui seul, transformer les pages Business universelles en parcours religieux.

## Mon Mouvement (`/mouvement`)

| Contrôle | Résultat | Observation |
|---|---|---|
| Chargement de la route | Conforme | Page stable, sans erreur Axios visible pour une session non connectée. |
| Vue Maintenant | Conforme | Mission principale, charge planifiée et ensuite sont présents avec des états vides explicites. |
| Vue Engagements | Conforme | Formulaire réel visible : libellé, projet facultatif, durée et bouton Ajouter. Aucune création n’a été envoyée sans session. |
| Autres vues | À contrôler avec session | Projets, Semaine, Résultats et Ressources sont accessibles par onglets ; leurs mutations et associations demandent un compte réel. |
| Trace stratégique | À contrôler avec session | Le rendu de provenance pilier/jalon/décision ne peut apparaître qu’après création réelle d’une mission liée. |

## Mindset & capacité (`/mindset`)

| Contrôle | Résultat | Observation |
|---|---|---|
| Positionnement | Conforme | La page se présente comme capacité, mindset et prévention de surcharge, non comme suivi d’humeur. |
| États vides | Conforme | Énergie, rituels, historique, corrélation et verdict expliquent clairement les données nécessaires. |
| Liens applicatifs | Conforme | Le plan de journée renvoie vers Mon Mouvement et le lien stratégique vers Mon Cap. |
| Fonction à tester avec session | À faire | Check-in, rituels, timeline et corrélations requièrent un compte réel. |

## Contexte (`/contexte`)

| Contrôle | Résultat | Observation |
|---|---|---|
| Positionnement | Conforme | Pilotage et Croissance sont présentés comme des sources d’éclairage du Cap, pas comme des outils concurrents de comptabilité ou CRM. |
| États des sources | Conforme | Absence de données et actions `Configurer les sources` / `Définir une cible` sont explicites. |
| Structure | Conforme | Résumé, Pilotage & trésorerie, Croissance et Agents IA sont réunis sous Contexte. |
| Fonction à tester avec session | À faire | Connexion d’un agrégateur, import de données, sources CRM et configuration d’agents demandent des identifiants réels. |

## Pilotage & trésorerie (`/pilotage`)

| Contrôle | Résultat | Observation |
|---|---|---|
| Positionnement | Conforme | La page annonce explicitement une lecture consolidée, sans écriture comptable ni paiement. |
| Sources | Conforme | Odoo, Pennylane et Qonto sont présentés comme `À connecter`, avec périmètre de lecture seule explicite. |
| États financiers | Conforme | Tous les KPI affichent `—` et l’historique explique le manque de données ; aucun chiffre inventé. |
| Mutations | À tester avec session | Ajout facture/dépense, simulateur et synchronisation nécessitent une session et, pour les sources, les accès du client. |

## Croissance (`/croissance`)

| Contrôle | Résultat | Observation |
|---|---|---|
| Positionnement | Conforme | La page indique clairement : détecter, comprendre, préparer, synchroniser vers le CRM. |
| Non-concurrence CRM | Conforme | Elle rappelle que le CRM reste la source de vérité et qu’aucun contact ou deal n’est créé sans validation. |
| États vides | Conforme | Radar sans campagne et sources externes non connectées sont expliqués, sans prospects fictifs. |
| Mutations | À tester avec session | Campagne ICP, sources autorisées, qualification et synchronisation restent à valider sur un compte réel. |

## Collaborateur (`/collaborateur`)

| Contrôle | Résultat | Observation |
|---|---|---|
| Demande structurée | Conforme visuellement | Besoin, niveau d’aide, email optionnel et validation de demande sont disponibles. |
| Roadmap | Conforme | La Roadmap est bien intégrée dans Collaborateur, avec clarification, cadrage et validation avant exécution. |
| Transparence | Conforme | Le partage choisi, le périmètre, le délai et la validation finale sont explicitement indiqués. |
| Envoi réel | À tester avec session | La soumission sera vérifiée avec un compte réel afin d’éviter une demande parasite. |

## TheSustain (`/thesustain`)

| Contrôle | Résultat | Observation |
|---|---|---|
| Protection d’accès | Conforme | Une session non membre est redirigée vers Contexte ; TheSustain n’est pas rendu ni accessible par URL directe. |
| Contrat de membre | Conforme en code | Le Header filtre le menu selon `authMe().thesustain_member` ; le backend fournit ce statut et le persiste. |
| Parcours membre | À vérifier avec compte autorisé | L’accès doit être testé avec un compte TheSustain réel après activation volontaire. |

## Compte de test Business

| Parcours testé | Résultat | Preuve contrôlée |
|---|---|---|
| Inscription et session | Conforme | Compte isolé créé, JWT valide et profil accessible. |
| Onboarding | Corrigé et conforme | Le frontend appelait `/auth/onboarding` (404) au lieu de `/onboarding`. L’adaptateur est corrigé. L’onboarding répond maintenant `200`, marque le profil terminé et ne bloque plus sur Brevo. |
| Projet | Conforme | Création d’un projet de test réussie. |
| Cap → Jalon → Décision → Mission | Conforme | Un jalon, une décision puis son approbation ont créé une mission contenant `decision_id` et `strategic_milestone_id`. |
| Check-in capacité | Conforme | Check-in `energy=4`, `mood=4`, `stress=2`, `sleep=4` enregistré avec score de 75. |

## Compte de test Campus / étudiant-reconversion

| Parcours testé | Résultat | Observation |
|---|---|---|
| Inscription et session | Conforme | Compte isolé créé, profil distinct et accès Campus protégé par connexion. |
| Navigation Campus | Conforme | Accueil Campus et route Missions conservent leur shell propre et leurs états anonymes. |
| Démarrage de simulation | Bloqué par configuration | L’API retourne explicitement `502` : aucun fournisseur IA disponible (`EMERGENT_LLM_KEY` / `MAMMOUTH_API_KEY`). Aucun client, score ou feedback n’a été inventé. |
| Réponse, feedback, historique, progression | Non testables tant que l’IA manque | Ces étapes dépendent de la création de clients et de missions par le fournisseur IA. |

## Isolation et accès par défaut

| Contrôle | Résultat | Observation |
|---|---|---|
| Données stratégiques Business dans Campus | Conforme | Le jalon Business est absent du compte Campus. |
| Projet Business dans Campus | Conforme | Le projet Business est absent du compte Campus. |
| TheSustain pour les deux comptes neufs | Conforme | `thesustain_member=false` pour les deux comptes, donc module caché et URL redirigée. |

## Défauts corrigés pendant l’audit

1. Le paramètre SSL MySQL transporté comme texte faisait tomber les routes protégées. Il est normalisé pour le pilote asyncmy ; les accès distants restent à vérifier avec les identifiants de production valides.
2. L’onboarding frontend appelait une URL absente ; le chemin est maintenant aligné sur le routeur backend `/api/onboarding`.
3. L’envoi Brevo de bienvenue bloquait la réponse d’onboarding. Il est désormais déclenché hors du chemin de réponse.
4. Le bandeau de citation isolé en bas de Vision est supprimé. Un repère de sens universel rejoint la zone de décision ; une référence biblique explicite est réservée à TheSustain.

## Contrôle visuel après corrections

| Surface | Résultat | Observation |
|---|---|---|
| Mon Cap | Conforme | La trajectoire affiche maintenant `Piliers à définir`, `Décisions à clarifier` et `Missions à préparer` au lieu de tirets assimilables à des données manquantes. |
| Repère de sens | Conforme | Il est intégré à côté de `Ce qui avance`, `Ce qui dérive` et `Prochaine décision`, donc au moment utile pour arbitrer. |
| Citation basse | Supprimée | Le bandeau de citation isolé ne clôt plus la page Vision. |
| TheSustain | Implémenté en code | La référence explicite Colossiens 3:23 est limitée à la page protégée TheSustain ; son rendu membre reste à vérifier avec une activation réelle. |

## Login et Accueil — contrôle visuel complémentaire

| Page | Résultat | Observation |
|---|---|---|
| Login (`/login`) | Conforme | Connexion email/mot de passe accessible ; Google, Microsoft et TheSustain sont clairement signalés `BIENTÔT` et non présentés comme actifs. |
| Accueil (`/`) | Conforme | La boucle Vision → Décision → Action et les états vides s’affichent sans donnée fictive. |

## Paramètres — contrôle visuel

| Contrôle | Résultat | Observation |
|---|---|---|
| Sections | Conforme | Général, Profil, Vision & Inspiration, Notifications, Automatisation, Intégrations, Sécurité et Facturation sont visibles. |
| Modal | Conforme | La fenêtre est structurée avec recherche et navigation latérale ; aucun réglage de position du menu n’est affiché. |
| Persistance | À tester avec compte connecté dans l’interface | Les API de profil, rappels, inspiration et mémoire existent ; les modifications ne sont pas soumises depuis la session anonyme de contrôle visuel. |

## Collaborateur — vérification d’autorisation

| Contrôle | Résultat | Observation |
|---|---|---|
| Appel Business authentifié | Conforme | La demande Collaborateur du compte Business retourne `200`. |
| Appel Campus authentifié | Conforme | Le compte Campus peut créer sa propre demande, sans utiliser l’identité Business. |
| Appel anonyme | Conforme | La route retourne `401 Not authenticated`. |
| Défaut initial | Corrigé | La route acceptait un `user_id` arbitraire dans l’URL. Elle utilise maintenant le compte fourni par le JWT ; le frontend ne transmet plus cet identifiant. |

## Validation technique finale

| Contrôle | Résultat | Observation |
|---|---|---|
| Build frontend | Conforme | Compilation de production réussie après purge du cache Webpack/Craco. |
| Tests de contrat | Conforme | 5 tests réussis : jalons/décisions/missions, contrat Campus et protection Collaborateur. |
| Base distante | Bloquante pour une publication | Les identifiants MySQL fournis dans l’environnement d’audit sont refusés par le serveur distant (`1045 Access denied`). Les tests authentifiés ont donc été exécutés sur une base SQLite locale isolée, sans données utilisateur. |
| Moteur IA Campus | Bloquant pour une simulation de bout en bout | Aucune clé `EMERGENT_LLM_KEY` ou `MAMMOUTH_API_KEY` n’est configurée dans l’environnement d’audit. Le message d’erreur est honnête et ne produit aucune fausse simulation. |
