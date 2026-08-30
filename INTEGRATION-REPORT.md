# ReactZayado — rapport de consolidation

## Base installée

La base de travail provient de `ReactZayado-main.zip`. Les archives `Cours-main(2).zip` et `final-main-corrige.zip` ont été installées séparément pour comparaison. La copie consolidée livrée se trouve dans `ReactZayado-consolide/`.

Les fichiers de déploiement de `final-main-corrige` ont été sauvegardés séparément avant modification. Aucun fichier de déploiement de cette base n’a été modifié.

## Fonctionnalités vérifiées ou intégrées

| Domaine | État dans la base consolidée |
|---|---|
| Point du jour dans le Chat | Présent avec le jour et la date en français. |
| NightRecap et NextSequence | Branchés sous le Point du jour dans `ChatPanel.jsx`. |
| Suivi des missions | Bouton présent dans NightRecap et redirigé vers le suivi du mouvement. |
| Trois décisions du jour | File backend `collab_queue` affichée dans le chat avec Approuver/Reporter. |
| Doublon du routeur de décisions | Corrigé : une seule déclaration de `queue_router`. |
| KeyInsights et AlignmentCelebration | Présents en bas de `AccueilVision.jsx`. |
| QuoteBar | Branchée en bas de la page Vision. |
| Ressources & Inspiration | Ajoutées sous forme de quatre déclencheurs honnêtes vers le Copilote, sans fausses citations ni images. |
| Pilotage — intégrations | Panneau de sources financières présent avec statuts explicites et prudents. |
| Pilotage — multi-scénarios | Comparateur Prudent / Central / Ambitieux ajouté, avec trois appels indépendants à l’API existante. |
| Veille paramétrable | Région, secteur et fréquence sont déjà gérés dans le Copilote. |
| Fichier mort `Settings.final-reference.jsx` | Absent de la base ReactZayado consolidée. |

## Validation technique

La compilation frontend avec `npm run build` passe. La syntaxe Python du serveur et des routes critiques passe avec `py_compile`. La file `queue_router` est montée une seule fois.

L’installation npm nécessitait `--legacy-peer-deps` en raison d’un conflit existant entre `react-day-picker@8.10.1` et `date-fns@4.1.0`. Le build produit est néanmoins généré correctement.

## Ordre de publication

L’ordre recommandé reste strictement le suivant :

1. Publier et vérifier l’application interne sur `app.zayado`.
2. Vérifier les routes critiques, le chat, les décisions, la Vision et le Pilotage sur `app.zayado`.
3. Publier ensuite le site public sur `zayado.net`.
4. Effectuer enfin une vérification de non-régression des deux domaines.

Aucune modification n’a été apportée aux fichiers de déploiement de `final-main-corrige`. Les fichiers protégés et leurs empreintes sont conservés dans le répertoire de travail `protection-deploiement-final/`.

## Limites conservées volontairement

Les sous-listes qualitatives par pilier ne sont pas inventées : elles nécessitent un champ éditable ou des données utilisateur réelles. De même, les ressources d’inspiration ne contiennent pas de faux contenu curé ; elles ouvrent le Copilote sur des angles de travail explicites.
