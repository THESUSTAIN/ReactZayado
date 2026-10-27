# Zayado --- Guide d'audit et de refonte de l'architecture du SaaS

## 1. Objectif du document

Ce document sert de consigne de travail à une IA de développement
chargée d'auditer puis d'améliorer progressivement l'architecture du
projet **ReactZayado**.

L'objectif n'est pas de réécrire l'application ni de déplacer
massivement les fichiers. Il s'agit de comprendre l'architecture
réellement utilisée, d'identifier les responsabilités et sources de
vérité, puis de proposer et d'appliquer des corrections contrôlées,
testées et réversibles.

**Règle fondamentale : le code et la configuration réellement présents
dans le dépôt constituent la source de vérité.** L'arborescence fournie
est un indice d'audit, pas une preuve suffisante de l'usage ou de
l'inutilité d'un fichier.

## 2. Contexte technique observé

D'après l'arborescence transmise, le dépôt contient notamment :

-   Une application principale dans `frontend/`, avec React, TypeScript
    et Vite.
-   Un backend Python dans `backend/`, avec `server.py`, de nombreux
    modules `*_ext.py`, des modèles, des routeurs, des utilitaires et
    des tests.
-   Un service Node.js distinct dans `WhatsApp-service/`.
-   Une application de vitrine dans `vitrine-entreprise/`.
-   Une copie ou export d'application dans
    `exports/zayado-entreprise/Zayado-Entreprise-main/`, qui contient
    notamment un frontend et un backend.
-   Une boutique Shopify dans `shopify/`, avec des thèmes, des sections
    Liquid, des templates JSON, des produits et des outils.
-   Des composants et fonctionnalités répartis entre plusieurs
    répertoires du frontend, notamment `frontend/src/zy/`,
    `frontend/src/pages/`, `frontend/src/components/`,
    `frontend/src/features/` et `frontend/src/lib/`.
-   Des configurations et documents de déploiement Railway, des tests,
    des rapports de tests et des archives.
-   Des fichiers potentiellement sensibles ou locaux, notamment
    `backend/kairos.db`, `backend/assets/rh/prive.xlsx` et
    `memory/.tok_local`.

Ces éléments décrivent uniquement la structure visible dans
l'arborescence fournie. Ils ne prouvent pas, à eux seuls, que des
applications sont dupliquées, qu'un fichier est inutilisé ou qu'une
migration est sans risque.
 
## 3. Mission confiée à l'IA

Agis comme un **architecte logiciel senior et ingénieur full-stack**,
avec une approche prudente, fondée sur les preuves du dépôt.

Tu dois :

1.  Cartographier l'architecture existante et les flux entre ses
    composants.
2.  Identifier les points d'entrée réellement utilisés, les applications
    actives, les dépendances et les configurations de déploiement.
3.  Repérer les responsabilités mal séparées, les duplications
    confirmées, les dépendances circulaires éventuelles et les sources
    de vérité concurrentes.
4.  Proposer une architecture cible cohérente avec les technologies et
    contraintes réellement utilisées.
5.  Définir une migration progressive, par lots petits et vérifiables.
6.  Appliquer les changements uniquement après avoir établi leur portée
    et leurs effets possibles.
7.  Vérifier les imports, les tests, les builds, les intégrations et les
    déploiements concernés après chaque lot.
8.  Documenter les changements réalisés, les risques restants et les
    décisions qui nécessitent une validation humaine.

Ne conclus pas qu'un élément est inutile simplement parce qu'il semble
ancien, similaire à un autre ou absent d'un chemin d'import direct.
Vérifie aussi les imports dynamiques, les routes, les scripts, les
configurations, les commandes de déploiement, les appels externes et les
usages opérationnels.

## 4. Principes impératifs de travail

### 4.1 Préserver le fonctionnement existant

-   Ne réalise aucune réécriture globale non justifiée.
-   Ne supprime aucun fichier avant d'avoir vérifié ses usages et
    dépendances.
-   Ne modifie pas le comportement fonctionnel d'un module dans le cadre
    d'une simple réorganisation, sauf si cette modification est
    explicitement demandée et isolée.
-   Préserve les contrats d'API, les noms de routes, les formats de
    données, les variables d'environnement et les intégrations
    existantes, sauf décision documentée et validée.
-   Évite les modifications sans rapport direct avec l'objectif du lot
    en cours.
-   Ne remplace pas une fonctionnalité existante par un exemple
    simplifié, un mock ou une implémentation provisoire.

### 4.2 Fonder les décisions sur le dépôt

Avant toute modification, inspecte les fichiers réellement présents et
lis leur contenu. Ne suppose pas qu'un fichier a le contenu habituel
associé à son nom.

Pour toute proposition de déplacement, suppression ou fusion, établis
: - les références et imports trouvés ; - les scripts ou configurations
concernés ; - les applications et environnements qui utilisent le
fichier ; - les impacts possibles sur les tests et le déploiement ; - la
stratégie de compatibilité et de retour arrière.

Si des informations essentielles manquent, pose une question précise ou
présente les vérifications nécessaires. Ne fabrique ni fichiers, ni
fonctions, ni routes, ni types, ni dépendances.

### 4.3 Sécurité et données sensibles

-   Ne publie et ne reproduis pas le contenu des bases de données,
    fichiers RH privés, jetons, secrets ou identifiants.
-   Vérifie leur présence dans Git, les règles `.gitignore`, les
    historiques et les mécanismes de déploiement.
-   Ne supprime, ne déplace et ne modifie pas une base de données sans
    comprendre son rôle, ses sauvegardes et ses consommateurs.
-   Si un secret semble avoir été exposé dans Git, signale le risque et
    propose une procédure de rotation adaptée. Le retrait du fichier
    seul ne suffit pas nécessairement.
-   Distingue les fichiers de données nécessaires au fonctionnement des
    artefacts locaux ou temporaires.

### 4.4 Tests et traçabilité

-   Établis un état de référence avant les changements.
-   Exécute les tests pertinents disponibles et enregistre les
    résultats, y compris les échecs préexistants.
-   Après chaque lot, lance les vérifications ciblées, puis les
    vérifications globales pertinentes.
-   Ne prétends jamais qu'un test ou un build a réussi s'il n'a pas
    réellement été exécuté.
-   Conserve un historique clair des fichiers modifiés, des raisons, des
    résultats et des limites de validation.
-   Prévois une possibilité de retour arrière pour les changements
    structurels.

## 5. Risques d'architecture à vérifier

Les points suivants sont des **hypothèses d'audit**, pas des défauts
confirmés.

### 5.1 Applications frontend multiples

Comparer `frontend/`, `vitrine-entreprise/` et
`exports/zayado-entreprise/Zayado-Entreprise-main/frontend/`.

Vérifier pour chacune : - son rôle fonctionnel ; - son point d'entrée
; - son `package.json` et ses scripts ; - ses dépendances et sa
configuration de build ; - ses routes et ses variables d'environnement
; - son usage dans Railway ou dans tout autre déploiement ; - ses
éventuelles dépendances avec les fichiers situés dans `exports/`.

Ne fusionner ni ne supprimer ces applications avant d'avoir établi si
elles sont indépendantes, actives, archivées ou utilisées comme source
d'export.

### 5.2 Backend Python

Le répertoire `backend/` contient de nombreux modules à la racine, des
modèles, des routeurs, des utilitaires et des tests. Vérifier si cette
organisation crée réellement des difficultés de maintenance.

Examiner notamment : - le rôle de `backend/server.py` ; - les imports
entre modules `*_ext.py`, `routers/`, `models/` et `lib/` ; -
l'enregistrement des routes et les dépendances communes ; - les accès à
la base de données ; - la configuration, les logs, la sécurité et les
tâches de fond ; - les frontières entre logique métier, transport HTTP
et persistance.

La séparation en couches doit clarifier les responsabilités sans créer
une abstraction inutile ni multiplier les fichiers artificiellement.

### 5.3 Sources de vérité concurrentes

Des fonctionnalités ou composants apparentés semblent présents dans
plusieurs emplacements, notamment `frontend/src/zy/`,
`frontend/src/pages/`, `frontend/src/components/`, `exports/` et
`shopify/`.

Pour chaque domaine fonctionnel, identifier explicitement : -
l'implémentation active ; - les éventuelles variantes historiques ou
spécifiques à un canal ; - les consommateurs ; - les données et contrats
partagés ; - la source officielle à maintenir à l'avenir.

Ne pas fusionner des composants simplement parce que leurs noms sont
proches : comparer leur rôle, leurs comportements et leurs
consommateurs.

### 5.4 Tests, archives et documentation

Les tests, rapports et documents sont répartis dans plusieurs
emplacements, notamment `backend/tests/`, `tests/`, `test_reports/`,
`exports/` et des archives de tests distants.

Distinguer : - les tests exécutés dans la CI ou le déploiement ; - les
tests unitaires, d'intégration et de bout en bout ; - les fixtures
nécessaires ; - les rapports historiques ; - les archives conservées
pour référence.

Ne déplace pas les tests sans mettre à jour les configurations, les
chemins, les commandes et les pipelines concernés.

### 5.5 Données locales et fichiers sensibles

Vérifier avec précaution : - `backend/kairos.db` ; -
`backend/assets/rh/prive.xlsx` ; - `memory/.tok_local` ; - les autres
fichiers de données, secrets ou artefacts détectés lors de l'audit.

Leur présence dans l'arborescence ne suffit pas à déterminer s'ils
doivent être conservés, exclus de Git ou migrés. Toute décision doit
être fondée sur leur usage et les besoins de déploiement.

## 6. Architecture cible indicative

La proposition ci-dessous est une **hypothèse de destination**, à
valider après l'audit. Elle ne doit pas être appliquée mécaniquement.

``` text
ReactZayado/
├── apps/
│   ├── web/                    # Application React principale, si confirmé
│   ├── vitrine/                # Site public, s’il est indépendant
│   └── whatsapp-service/       # Service Node.js existant
├── backend/
│   ├── app/
│   │   ├── main.py             # Point d’entrée, après vérification
│   │   ├── api/
│   │   │   ├── routers/
│   │   │   └── dependencies.py
│   │   ├── core/               # Configuration, sécurité, logs
│   │   ├── models/             # Modèles de données
│   │   ├── schemas/             # Contrats et validation
│   │   ├── services/            # Logique métier
│   │   ├── repositories/        # Accès aux données
│   │   ├── integrations/        # Shopify, Teams et autres intégrations
│   │   └── utils/
│   ├── tests/
│   ├── migrations/
│   ├── requirements.txt
│   └── Dockerfile
├── packages/
│   ├── ui/                      # Composants réellement partagés
│   ├── shared-types/            # Types communs justifiés
│   └── config/                  # Configuration partagée pertinente
├── shopify/
│   ├── theme/
│   ├── theme-v2/
│   ├── outils/
│   └── produits/
├── tests/
│   ├── e2e/
│   ├── fixtures/
│   └── playwright.config.ts
├── docs/
│   ├── architecture/
│   ├── deployment/
│   └── features/
├── scripts/
├── archives/                    # Uniquement après audit et validation
├── .gitignore
├── README.md
└── package.json                 # Workspace racine, uniquement si pertinent
```

### Conditions d'adoption de cette cible

-   `apps/web/` ne doit reprendre `frontend/` qu'après validation des
    scripts, imports et déploiements.
-   `apps/vitrine/` ne doit exister que si la vitrine constitue bien une
    application distincte et active.
-   Le service WhatsApp reste indépendant si ses contraintes de
    déploiement le nécessitent.
-   `exports/` ne doit pas être supprimé ou absorbé avant d'avoir
    identifié ses usages réels.
-   Shopify reste séparé des applications React : Liquid, templates
    JSON, configuration et ressources du thème suivent leur propre cycle
    de déploiement.
-   Le backend ne doit migrer vers `backend/app/` que par étapes, avec
    maintien des points d'entrée requis par les configurations
    existantes.
-   Un workspace racine ne doit être ajouté que si les outils, scripts
    et déploiements peuvent le prendre en charge sans régression.

## 7. Plan d'intervention obligatoire

### Phase 1 --- Établir l'état de référence

1.  Examiner le README et les documents d'architecture et de
    déploiement.
2.  Lire les fichiers `package.json`, `requirements.txt`, Dockerfiles,
    configurations Railway, fichiers Vite et commandes de démarrage.
3.  Identifier les points d'entrée frontend, backend et service
    WhatsApp.
4.  Repérer les workflows CI/CD et les environnements de déploiement.
5.  Exécuter les tests et builds réalisables sans modifier le code.
6.  Produire une synthèse des commandes exécutées, des résultats et des
    limites.

**Livrable :** carte de l'architecture actuelle et état initial des
tests.

### Phase 2 --- Cartographier les dépendances et les domaines

1.  Construire la carte des applications et des communications entre
    elles.
2.  Recenser les routes API, les intégrations externes et les principaux
    flux de données.
3.  Identifier les modules métier et leurs dépendances.
4.  Comparer les implémentations potentiellement dupliquées.
5.  Vérifier les usages des fichiers sensibles et locaux sans divulguer
    leur contenu.
6.  Distinguer les constats prouvés des hypothèses.

**Livrable :** registre des risques, des doublons confirmés, des sources
de vérité et des dépendances critiques.

### Phase 3 --- Définir et faire valider la cible

Pour chaque problème confirmé, présenter : - le problème et les preuves
; - la solution proposée ; - les fichiers et applications concernés ; -
les risques et la stratégie de compatibilité ; - les tests de validation
; - le plan de retour arrière ; - les bénéfices attendus et les coûts de
migration.

Prioriser les corrections selon leur impact, leur risque et leur
dépendance à d'autres travaux.

**Livrable :** plan de migration séquencé, avec les décisions bloquantes
clairement signalées.

### Phase 4 --- Réorganiser le backend par petits lots

1.  Commencer par un domaine bien délimité et compris.
2.  Séparer progressivement les responsabilités si l'audit confirme que
    cela est utile.
3.  Maintenir des interfaces compatibles pendant la transition lorsque
    nécessaire.
4.  Mettre à jour les imports et les tests dans le même lot.
5.  Vérifier le démarrage du backend et les routes concernées avant de
    poursuivre.

Ne pas déplacer tous les modules `*_ext.py` en une seule opération.

### Phase 5 --- Clarifier le frontend

1.  Déterminer la responsabilité de `pages/`, `zy/`, `components/`,
    `features/` et `lib/`.
2.  Identifier les composants réellement réutilisables et les
    fonctionnalités propriétaires à un domaine.
3.  Détecter les duplications confirmées et les dépendances croisées.
4.  Proposer une organisation par domaine fonctionnel si elle correspond
    au code réel.
5.  Conserver les URL, routes, parcours, contrats API et comportements
    actuels.
6.  Valider le build et les parcours fonctionnels après chaque lot.

### Phase 6 --- Shopify, exports et applications annexes

1.  Confirmer le mode de déploiement du thème Shopify et ses sources de
    publication.
2.  Vérifier les liens entre `shopify/`, les exports et les
    applications.
3.  Conserver distincts les artefacts nécessaires à la boutique et ceux
    qui sont uniquement des copies de travail.
4.  Ne modifier les thèmes, templates ou ressources publiés qu'avec une
    validation ciblée.

### Phase 7 --- Sécurité, documentation et nettoyage

1.  Vérifier `.gitignore`, le suivi Git des fichiers sensibles et les
    éventuels secrets exposés.
2.  Clarifier la gestion des bases locales, sauvegardes et données de
    test.
3.  Ranger les rapports et archives uniquement après validation de leur
    rôle.
4.  Mettre à jour la documentation d'installation, de développement, de
    test et de déploiement.
5.  Vérifier les pipelines et les déploiements concernés.

## 8. Périmètre de tests à protéger

Le plan de tests doit être adapté aux fonctionnalités réellement
présentes. À minima, vérifier les domaines pertinents suivants
lorsqu'ils sont concernés par les modifications :

-   démarrage et santé du backend ;
-   compilation et démarrage du frontend ;
-   authentification, autorisations et gestion des sessions ;
-   routes API et contrats de données ;
-   paiements, abonnements et tunnels publics ;
-   intégrations Shopify ;
-   intégrations Google, Microsoft Teams et WhatsApp, lorsqu'elles sont
    affectées ;
-   gestion des entreprises et des données ;
-   tests de sécurité et de configuration ;
-   tests de bout en bout déjà configurés.

La liste des fichiers de test visible dans l'arborescence ne garantit
pas que tous ces scénarios soient couverts. Il faut vérifier le contenu
des tests et leur exécution réelle.

## 9. Format attendu des comptes rendus de l'IA

À chaque phase, fournir un compte rendu concis et vérifiable selon ce
modèle :

### A. Constats confirmés

-   Problème :
-   Preuves observées dans le dépôt :
-   Conséquence :

### B. Hypothèses à vérifier

-   Hypothèse :
-   Vérification nécessaire :
-   Risque si elle est incorrecte :

### C. Décision proposée

-   Solution :
-   Fichiers concernés :
-   Compatibilité :
-   Risques :
-   Retour arrière :

### D. Exécution

-   Modifications effectuées :
-   Tests réellement exécutés :
-   Résultats :
-   Régressions ou échecs :
-   Points non vérifiés :

### E. Étape suivante

-   Prochaine action limitée :
-   Prérequis :
-   Validation requise :

Ne présente jamais une hypothèse comme un constat. Ne déclare pas une
migration terminée si les validations essentielles n'ont pas été
effectuées.

## 10. Critères d'acceptation de la refonte

La refonte est considérée comme satisfaisante lorsque :

-   chaque application active et son mode de déploiement sont identifiés
    ;
-   les responsabilités des principaux modules sont documentées ;
-   les sources de vérité des fonctionnalités importantes sont
    explicites ;
-   les duplications signalées sont confirmées et traitées sans
    supprimer d'usage valide ;
-   les dépendances entre applications et intégrations sont comprises ;
-   les changements sont réalisés par lots contrôlés et réversibles ;
-   les builds, tests et vérifications ciblés sont exécutés et leurs
    résultats documentés ;
-   les secrets et données sensibles sont traités avec prudence ;
-   les configurations Railway, Docker et autres environnements
    concernés restent cohérentes ;
-   les documents techniques permettent à un autre développeur de
    comprendre et maintenir l'architecture.

## 11. Première instruction à exécuter

**Ne commence pas par déplacer ou supprimer des fichiers.**

Commence par auditer le dépôt existant et livre :

1.  la liste des applications et services réellement actifs ;
2.  les points d'entrée et commandes de démarrage de chacun ;
3.  les configurations de build et de déploiement ;
4.  une carte des dépendances majeures ;
5.  les sources de vérité possibles par domaine fonctionnel ;
6.  les risques confirmés et les hypothèses à vérifier ;
7.  l'état initial des tests et builds ;
8.  un plan de refonte priorisé, avec les fichiers concernés et les
    validations nécessaires.

Après cette première restitution, attends la validation du plan avant
toute migration structurelle importante. Les corrections autonomes ne
doivent commencer que lorsqu'elles sont limitées, justifiées, testables
et réversibles.


## 12.Contrainte impérative : préserver le fonctionnement du système après la refonte
La refonte de l’architecture ne doit, en aucun cas, casser le système existant ni provoquer une régression fonctionnelle, technique ou opérationnelle. L’objectif est d’améliorer progressivement l’architecture du SaaS, sans compromettre les fonctionnalités déjà opérationnelles, les données, les intégrations ou les déploiements.

L’IA doit respecter les règles suivantes :

1. Préserver l’existant. Avant toute modification, identifier les fonctionnalités opérationnelles, les points d’entrée, les dépendances, les contrats d’API, les variables d’environnement, les intégrations externes et les mécanismes de déploiement concernés.

2. Ne jamais effectuer de refonte destructive. Aucun fichier, module, composant, endpoint, modèle de données, service ou configuration ne doit être supprimé, remplacé ou déplacé sans avoir vérifié ses dépendances et son rôle réel dans le système.

3. Procéder par étapes contrôlées. Réaliser les modifications par petits lots cohérents, indépendants autant que possible, afin de pouvoir identifier précisément l’origine d’une éventuelle régression et revenir sur les changements concernés.

4. Maintenir la compatibilité. Toute modification doit préserver les contrats existants utilisés par les autres modules, le frontend, le backend, les services externes et les clients de l’API. Si une incompatibilité est inévitable, prévoir une transition explicite et contrôlée avant de supprimer l’ancien fonctionnement.

5. Établir un état de référence avant chaque intervention. Examiner les tests disponibles, les commandes de démarrage, les procédures de compilation, les configurations de déploiement et les fonctionnalités critiques. Lorsque cela est possible, exécuter les vérifications initiales et consigner les erreurs préexistantes pour ne pas les confondre avec celles introduites par la refonte.

6. Valider chaque modification avant de poursuivre. Après chaque lot, exécuter les tests pertinents, vérifier les imports, les types, la compilation, le démarrage des services et les intégrations concernées. Une modification ne doit pas être considérée comme validée uniquement parce que le code semble correct.

7. Protéger les données et les configurations. Ne jamais réinitialiser, supprimer, migrer de manière irréversible ou écraser une base de données, un fichier métier, un secret, une configuration ou un environnement de production sans procédure de sauvegarde, de migration et de restauration adaptée.

8. Prévoir un retour arrière. Chaque étape significative doit être réversible à l’aide du contrôle de version ou d’une procédure documentée. Les migrations de données et les changements de configuration doivent également disposer d’une stratégie de récupération adaptée.

9. Ne pas masquer les problèmes. Ne pas désactiver des tests, supprimer des fonctionnalités, contourner des contrôles, introduire des doublons temporaires non maîtrisés ou modifier les résultats attendus simplement pour faire passer la compilation ou les tests.

10. Respecter les limites de validation. Si les tests nécessaires ne peuvent pas être exécutés, si une dépendance est inconnue ou si le risque d’une modification ne peut pas être évalué, l’IA doit le signaler clairement et suspendre l’étape risquée jusqu’à obtention des informations ou validations nécessaires.
Règle de décision
En cas de conflit entre une amélioration architecturale et la stabilité du système, la stabilité du système est prioritaire.

L’IA doit privilégier une évolution progressive, compatible et vérifiable plutôt qu’une réorganisation globale immédiate. Elle ne doit jamais prétendre qu’une refonte est sans risque ni déclarer le système stable sans vérifications suffisantes.

Condition de passage à l’étape suivante : chaque lot de modifications doit avoir un périmètre identifié, un résultat attendu, des vérifications adaptées et une solution de retour arrière. Toute anomalie nouvelle doit être analysée et corrigée avant de poursuivre la refonte sur les éléments concernés.
------------------------------------------------------------------------

**Note de portée :** ce guide est construit à partir de l'arborescence
et des observations fournies. Il ne constitue pas un audit technique du
code source complet. Toute conclusion sur l'usage réel d'un fichier, la
qualité d'une implémentation ou le fonctionnement d'un déploiement doit
être confirmée par l'inspection du dépôt et l'exécution des
vérifications adaptées.
