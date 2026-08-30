# V1 — Checklist de recette et de branchements

## 1. Navigation et interface

| Contrôle | État |
|---|---|
| Un seul bouton principal vers Mon Mouvement | Validé après build et preview |
| La page Tâches reste accessible dans Mon Mouvement → Engagements | Présent |
| Le bouton Aujourd’hui ouvre la page Tâches lorsque nécessaire | Présent |
| Campus utilise le shell Business et affiche « Bientôt disponible » | Présent |
| Agent n’est pas exposé dans le menu utilisateur | Présent |
| Login ne contient pas de parcours d’inscription | Présent |
| Espacement des cartes Mon Cap | Desktop restauré à l’état validé ; mobile réorganisé en colonne avec espacements réguliers |

## 2. Authentification

| Contrôle | État |
|---|---|
| Login email / mot de passe ou lien magique | Dépend du backend |
| Compte test avec `access_token` | Corrigé côté frontend ; backend réel à connecter |
| Session conservée après rechargement | À tester avec backend réel |
| Déconnexion et expiration de session | À tester avec backend réel |
| Permissions administrateur Campus | À brancher sur le rôle backend |

## 3. Tâches

| Contrôle | État |
|---|---|
| Création d’un engagement | Présent côté frontend/API |
| Statut À faire / En cours / Terminé | Présent |
| Date et durée estimée | Présent partiellement |
| Projets et minuteur | Présent |
| Persistance en base | Dépend du backend |
| Modification complète, priorité et filtres | À développer |
| Tâches en retard | À développer |

## 4. Croissance

| Contrôle | État |
|---|---|
| Affichage de la page Croissance | Présent |
| Création manuelle d’un prospect | À développer/brancher |
| Pipeline commercial | À brancher sur les données réelles |
| Score explicable sur 100 | À développer |
| File de validation humaine | À développer |
| Brouillon sans envoi automatique | À développer |
| Statistiques par source | À développer |

## 5. Copilote et contexte

| Contrôle | État |
|---|---|
| Chat et historique | Présent ; dépend du backend |
| Lecture des tâches et décisions | À brancher réellement |
| Lecture Vision et documents | Partiel |
| Réponse avec source explicite | À développer |
| Création de tâche après validation | À développer |
| Re-prompting et clarification | À développer |

## 6. Pilotage, Vision et Campus

| Contrôle | État |
|---|---|
| Intégrations Qonto/Stripe/Drive/Mollie honnêtement non connectées | Présent en placeholder |
| Comparateur multi-scénarios | Présent partiellement |
| Ressources & Inspiration | Présent sous forme de déclencheurs Copilote |
| Sous-listes qualitatives par pilier Vision | À développer |
| Campus visible pour le compte test preview | Présent |
| Bouton « Ouvrir — admin du projet uniquement » | Visible et verrouillé en preview |

## 7. Production

| Contrôle | État |
|---|---|
| Frontend et backend déployés ensemble | À faire |
| Compte test réel | À faire |
| Base de données persistante | À vérifier |
| Variables d’environnement de production | À configurer |
| HTTPS, domaine et DNS | À configurer |
| Publication dans l’ordre `app.zayado`, puis `zayado.net` | À faire |
| Procédure de rollback | À préparer |

## 8. Recette visibilité page par page

Pour chaque écran, la recette doit vérifier que le titre, les textes d’aide, les cartes, les boutons, les icônes et les états de chargement/vides restent visibles, lisibles et non coupés sur desktop et mobile. Chaque action doit soit fonctionner, soit afficher honnêtement qu’elle dépend encore d’un branchement ou qu’elle est bientôt disponible.

| Page / route | Textes et cartes visibles | Boutons et navigation | Mobile / débordement | État de recette |
|---|---|---|---|---|
| Aujourd’hui `/` | Titre, priorité, capacité et décision visibles | Copilote, check-in, Vision et accès Tâches vérifiés | À vérifier | À tester |
| Mon Cap `/vision` | Hero, trajectoire, climat, indicateurs et repère de sens visibles | Studio, Décisions, Piliers, Mode Focus, Pilotage et Copilote vérifiés | Espacements mobiles corrigés ; à vérifier | À tester |
| Mon Mouvement `/mouvement` | En-tête, capacité, onglets, cartes et états vides visibles | Onglets, ajout, statut, suppression et minuteur vérifiés | À vérifier | À tester |
| Tâches `/taches` | Engagements, formulaire, listes Aujourd’hui/À arbitrer visibles | Création, statut, suppression et retour vérifiés | À vérifier | À tester |
| Mindset `/mindset` | Check-in, historique et conseils visibles | Enregistrement, navigation et états vides vérifiés | À vérifier | À tester |
| Contexte `/contexte` | Résumé et onglets Pilotage/Croissance visibles | Navigation entre onglets et placeholders vérifiés | À vérifier | À tester |
| Pilotage `/pilotage` | KPI, sources, simulateur et intégrations visibles | Actions de simulation et retours vérifiés | À vérifier | À tester |
| Croissance `/croissance` | Entonnoir, prospects et états vides visibles | Boutons d’ajout et actions commerciales vérifiés | À vérifier | À tester |
| Collaborateur `/collaborateur` | Contenu, cartes et états vides visibles | Actions disponibles et retours vérifiés | À vérifier | À tester |
| Campus `/campus` | Message Bientôt disponible visible | Onglets verrouillés et accès admin contrôlé | À vérifier | À tester |
| TheSustain `/thesustain` | Accès réservé et message de redirection visibles | Permission vérifiée, sans exposition publique indue | À vérifier | À tester |
| Login `/login` | Logo, titre, formulaire et messages d’erreur visibles | Connexion, retour d’erreur et absence d’inscription vérifiés | À vérifier | À tester |

## 9. Règles de validation d’un bouton

Un bouton est considéré comme validé uniquement si son libellé est lisible, son contraste est suffisant, il reste entièrement dans la carte, son état de chargement est compréhensible, son clic déclenche la bonne action et l’utilisateur reçoit un retour en cas d’échec. Les boutons liés à une fonctionnalité non branchée ne doivent pas simuler une réussite.

## 10. Règles de validation d’un texte

Un texte est considéré comme validé s’il n’est ni tronqué de manière involontaire, ni masqué par une carte voisine, ni illisible sur le fond bleu nuit. Les titres longs doivent revenir à la ligne proprement, les descriptions doivent garder une largeur de lecture confortable et les états vides doivent expliquer la prochaine action possible.


## 11. Lots 3 et 4 — contrôle après branchement backend

| Fonction | État | Contrat utilisé |
|---|---|---|
| Lecture réelle des tâches | Branché côté frontend | `GET /api/tasks` |
| Création d’engagement | Branché côté frontend | `POST /api/tasks` |
| Changement de statut | Branché côté frontend | `PATCH /api/tasks/{id}` |
| Édition du titre | Branché côté frontend | `PATCH /api/tasks/{id}` avec `label` |
| Édition de la priorité | Branché côté frontend | `PATCH /api/tasks/{id}` avec `priority` |
| Filtre Aujourd’hui | Présent | Filtrage frontend sur `planned_for` |
| Filtre En retard | Présent | Comparaison frontend avec la date du jour |
| Filtre Priorité haute | Présent | Filtrage frontend sur `priority` |
| Confirmation de suppression | Présent | Confirmation navigateur avant `DELETE` |
| Création d’un prospect | Branché côté frontend | `POST /api/growth/leads` |
| Déplacement dans le pipeline | Branché côté frontend | `PATCH /api/growth/pipeline/{id}` |
| Notes factuelles du prospect | Branché à la création | Champ `snippet` persistant |
| Qualification sur 100 | Branché côté frontend | `POST /api/growth/leads/{id}/qualify` |
| Justification et prochaine action | Affichées si retournées | Réponse `qualification` backend |
| Envoi automatique de messages | Désactivé | Aucun appel d’envoi dans ces lots |
| CRM externe | Non connecté | Placeholder honnête conservé |

## 12. Résultat de la recette technique

| Contrôle | Résultat |
|---|---|
| Build frontend après Lots 3–4 | OK |
| Routes `/mouvement` et `/taches` chargées | OK dans le preview |
| Onglet Engagements visible | OK dans le preview |
| Onglet CRM connecté visible | OK dans le preview |
| Formulaire prospect visible | OK dans le preview |
| Backend réel accessible depuis le preview | Non confirmé : le preview retourne encore une erreur de chargement API |
| Tests backend ciblés | Bloqués par des dépendances globales manquantes lors de l’import des routes (`mollie`, puis autres SDK) ; aucun échec fonctionnel du contrat Tâches/Growth n’a encore été observé |


## 13. Lots 5 et 6 — qualification et validation humaine

| Fonction | État | Vérification |
|---|---|---|
| Qualification commerciale explicable | Branchée | `POST /api/growth/leads/{lead_id}/qualify` |
| Score sur 100 et bande de qualification | Branché côté interface | Affichage du résultat retourné par le backend |
| Critères inconnus et prochaine action | Branché côté interface | Affichage conditionnel sans inventer de donnée |
| Notes factuelles obligatoires | Branché | La qualification est refusée si aucune note n’est fournie |
| File de brouillons personnels | Branchée au serveur | `GET/POST /api/collaborateur/queue` |
| Approbation humaine | Branchée | `POST /api/collaborateur/queue/{id}/validate` |
| Report d’un brouillon | Branché | `POST /api/collaborateur/queue/{id}/dismiss` |
| Envoi automatique d’email | Désactivé | Aucune action externe déclenchée par ces lots |
| Synchronisation CRM automatique | Désactivée | Validation explicite encore obligatoire |
| Montage FastAPI de la file | Réalisé | `queue_router` monté sous `/api/collaborateur` |

## 14. Checking Lots 5 et 6

| Contrôle | Résultat |
|---|---|
| Build frontend | OK |
| Onglet Actions visible | OK dans le preview |
| Formulaire de brouillon visible | OK dans le preview |
| Message « aucun brouillon à valider » | OK dans l’état vide |
| Pipeline et scoring accessibles | OK côté code et interface |
| Route de file accessible depuis le frontend | Branchée côté code |
| Backend réellement joignable depuis le preview | Non confirmé : le serveur temporaire renvoie toujours des erreurs API |
| Validation de bout en bout avec compte test | À faire après renseignement de `REACT_APP_BACKEND_URL` et démarrage du backend avec ses variables de production |


## 15. Lots 7 à 9 — checking du branchement réel

### Lot 7 — Ma Vision enrichie

| Fonction | État | Contrat ou vérification |
|---|---|---|
| Barre d’actions à côté du bouton trois points | Validée | Vérification visuelle de `/vision` |
| Renommage Cap vers Vision / Ma Vision | Validé | Menu, en-tête et textes associés contrôlés |
| Sous-listes qualitatives par pilier | Branchées côté interface | Persistance via `/api/prefs` sous `vision_memory` |
| Ressources & inspiration éditables | Branchées côté interface | Persistance via `/api/prefs` sous `vision_memory` |
| Vision Brain réel | Monté et rebranché | `GET /api/vision/brain/panel` |
| Miroir dynamique réel | Monté et rebranché | `GET /api/vision/brain/connections` |
| Desktop | Conservé | Aucun nouveau style desktop imposé par la correction mobile |
| Mobile | Corrigé | Grille éditoriale en une colonne, boutons pleine largeur |

### Lot 8 — Copilote connecté et sourcé

| Fonction | État | Contrat ou vérification |
|---|---|---|
| Profil et objectif | Branché | Contexte construit côté backend |
| Tâches récentes | Branchées | Table `user_tasks` |
| Vision enregistrée | Branchée | Table `user_vision` lorsque disponible |
| Décisions stratégiques | Branchées | Table `user_strategy_decisions` lorsque disponible |
| Documents | Branchés | Table `user_documents` lorsque disponible |
| Sources de réponse | Affichées | Badges sous chaque réponse Copilote |
| Contrôle utilisateur authentifié | Renforcé | Le JWT est la source de vérité côté route Copilote |
| Envoi automatique externe | Désactivé | Aucun envoi commercial déclenché |

### Lot 9 — Pilotage et intégrations

| Fonction | État | Contrat ou vérification |
|---|---|---|
| Pilotage overview | Monté | `GET /api/pilotage/overview` |
| Simulation financière | Montée | `POST /api/pilotage/simulate` |
| Comparatif Prudent / Central / Ambitieux | Présent | Trois hypothèses, non persistées |
| Solde réel utilisé par la simulation | Branché | Calcul depuis `finance_entries` |
| Connexions actives | Branchées | `GET /api/connections` |
| Catalogue des fournisseurs | Disponible | `GET /api/connections/providers` |
| Test d’une connexion | Disponible | `POST /api/connections/{id}/test` |
| Révocation | Disponible | `DELETE /api/connections/{id}` |
| Qonto / Stripe / Mollie | Non connectés honnêtement | Aucun faux statut, connecteurs à prévoir |

### Smoke test backend

Le smoke test OpenAPI a été exécuté après correction du registre FastAPI : **456 routes découvertes, aucune route requise manquante**. Routes vérifiées : `/api/growth/copilote`, `/api/vision/brain/panel`, `/api/vision/brain/connections`, `/api/connections`, `/api/connections/providers`, `/api/pilotage/overview`, `/api/pilotage/simulate` et `/api/prefs`.

Le build frontend Yarn est réussi et la compilation Python des routes est réussie. La vérification visuelle locale de Ma Vision, Pilotage et Croissance est réussie pour les titres, cartes, boutons et états vides. La recette authentifiée de bout en bout doit encore être exécutée sur l’environnement de production avec une base de données et les variables réelles.


## 16. Clôture des points de validation

| Point | Résultat final | Détail |
|---|---|---|
| Libellés visibles « Cap » résiduels | Validé | Aucun des libellés interdits trouvé dans les textes frontend contrôlés |
| Envoi automatique commercial | Validé et désactivé | Aucun appel d’envoi ou de push CRM dans les interfaces des Lots 7 à 9 |
| Tests automatisés frontend | Validé | 4 tests Jest passés dans `frontend/src/lib/api.test.js` |
| Tests backend ciblés | Validé | 2 tests pytest passés dans `backend/tests/test_lots789_contracts.py` |
| Compte test authentifié | Validé en recette locale | `thomas@zayado.fr` obtient un `access_token` via `/api/auth/demo-login` |
| Persistance Préférences | Validé en recette locale | Écriture puis lecture via `/api/prefs` avec JWT |
| Persistance Tâches | Validé en recette locale | Création puis lecture via `/api/tasks` avec JWT |
| Persistance Prospects | Validé en recette locale | Création puis lecture via `/api/growth` et `/api/growth/pipeline` avec JWT |
| Simulation Pilotage | Validé en recette locale | Résultat calculé et marqué `persisted: false` |
| Environnement de production | Non disponible dans le sandbox | `REACT_APP_BACKEND_URL`, base distante et variables de production ne sont pas fournies dans la session ; la validation sur `app.zayado` reste à exécuter après configuration |


## 17. Lots 10 à 12 — clôture MVP

### Lot 10 — Simulations et historique

| Fonction | État | Vérification |
|---|---|---|
| Comparateur Prudent / Central / Ambitieux | Validé | Trois scénarios exécutables depuis Pilotage |
| Hypothèses éditables | Validé | Contrats, montant moyen et dépenses supplémentaires |
| Calcul depuis les écritures réelles | Validé | `POST /api/pilotage/simulate` |
| Simulation non destructive | Validé | Réponse `persisted: false` |
| Historique des comparatifs | Validé MVP | `GET/POST /api/pilotage/simulations`, scoped au JWT |

### Lot 11 — Second cerveau

| Fonction | État | Vérification |
|---|---|---|
| Onglet Second cerveau | Validé | Visible dans Contexte |
| Création d’une note | Validé MVP | `POST /api/documents` |
| Lecture des notes et documents | Validé MVP | `GET /api/documents` |
| Suppression avec confirmation | Validé MVP | `DELETE /api/documents/{id}` |
| Utilisation par le Copilote | Branchée pour les documents disponibles | Contexte Copilote et sources |
| Import PDF et recherche sémantique | Non exposés dans cette interface | Routes backend existantes, intégration UI ultérieure |

### Lot 12 — IA contrôlée

| Fonction | État | Vérification |
|---|---|---|
| Onglet Compétences IA | Validé MVP | Visible dans Contexte |
| Compétences désactivées par défaut | Validé | Préparer tâche, analyser prospect, synthétiser document |
| Activation / désactivation utilisateur | Validé MVP | Stockage `ai_permissions` via `/api/prefs` |
| Validation humaine avant action externe | Validé | File Collaborateur Approuver/Reporter |
| Envoi automatique | Désactivé | Aucun appel automatique dans les parcours contrôlés |
| Enforcement central de chaque permission par tous les agents backend | À renforcer dans le lot sécurité | Le centre de permissions est prêt, mais chaque future compétence doit consulter ce registre côté serveur |

### Validation finale des Lots 10 à 12

- [x] Build frontend réussi.
- [x] 4 tests Jest passés.
- [x] 2 tests pytest ciblés passés.
- [x] Smoke authentifié local réussi pour compte test, JWT, préférences, tâches, prospects, simulation, historique, documents et permissions.
- [x] Vérification visuelle locale de Contexte, Second cerveau, Compétences IA et Pilotage réussie.
- [ ] Recette de production sur `app.zayado` à exécuter après configuration de l’URL backend et des secrets réels.


## 18. Lots 10 à 12 — réalisation et contrôle final

| Lot | Fonction | État |
|---:|---|---|
| 10 | Comparateur Prudent / Central / Ambitieux | Validé |
| 10 | Hypothèses éditables et simulation non destructive | Validé |
| 10 | Historique persistant des simulations par compte | Validé — `GET/POST /api/pilotage/simulations` |
| 11 | Onglet Second cerveau | Validé |
| 11 | Création, lecture et suppression de notes/documents | Validé — `/api/documents` |
| 11 | Contexte Copilote basé sur les documents disponibles | Branché |
| 11 | Import PDF et recherche sémantique dans l’interface | À compléter en V2 |
| 12 | Centre Compétences IA | Validé MVP |
| 12 | Permissions désactivées par défaut | Validé |
| 12 | Activation et révocation persistantes | Validé — `ai_permissions` via `/api/prefs` |
| 12 | Validation humaine avant action externe | Validé — file Collaborateur |
| 12 | Enforcement serveur de chaque permission par compétence | À renforcer dans le lot sécurité |

### Tests finaux exécutés

- [x] Build frontend Yarn réussi.
- [x] 4 tests Jest frontend passés.
- [x] 2 tests pytest backend ciblés passés.
- [x] Smoke authentifié local : compte test, JWT, préférences, tâches, prospects, simulation, historique, documents et permissions validés.
- [x] Vérification visuelle : Contexte, Second cerveau, Compétences IA et Pilotage.
- [ ] Recette de production sur `app.zayado` et publication ultérieure de `zayado.net`.


## 19. Enforcement serveur des permissions IA

| Contrôle | Résultat |
|---|---|
| Service central `backend/ai_permissions.py` | Ajouté |
| Lecture des permissions depuis le compte JWT | Validée |
| Permission absente refusée par défaut | Validée |
| Génération de tâches | Refusée sans `prepare_task` |
| Qualification de prospect | Refusée sans `analyze_lead` |
| Génération de document | Refusée sans `summarize_document` |
| File de validation humaine | Conservée avant toute action externe |
| Test des refus HTTP | Validé dans le smoke authentifié |
| Tests frontend | 4/4 passés |
| Tests backend ciblés | 2/2 passés |
| Smoke authentifié complet | Validé : JWT, persistance métier et garde-fous IA |
| Permission Copilote de lecture | Lecture autorisée ; aucune action externe déclenchée |
| Enforcement de futures compétences | Toute nouvelle route IA doit appeler `require_ai_permission` |
