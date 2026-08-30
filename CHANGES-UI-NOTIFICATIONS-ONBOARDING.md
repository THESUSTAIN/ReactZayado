# Zayado / MyExtension AI — corrections UI et branchements

## Notifications header
- La cloche affiche le nombre exact de notifications non lues via `/api/notifications`.
- Un clic ouvre maintenant un mini panneau d'information, sans ouvrir directement le chat.
- Chaque notification affiche titre, texte, heure et état non lu.
- Un clic sur une notification marque les notifications comme lues et ouvre le Copilote avec un contexte ciblé.
- Le panneau se ferme sur clic extérieur ou Escape.
- Rafraîchissement automatique du compteur toutes les 60 secondes.

## Éditions précédentes
- Liste limitée à 6 éléments pour éviter une colonne interminable.
- Cartes réorganisées en deux colonnes (contenu / action Enregistrer).
- Titre sur deux lignes maximum, métadonnées séparées et détail dépliable.
- État sélectionné visuellement distingué.

## Onboarding
- Refonte en 3 étapes : Vous / Votre activité / Votre cap.
- Barre de progression, validation minimale du prénom, récapitulatif final.
- Persistance étendue vers `/api/onboarding` : entreprise, statut, secteur, objectif 90 jours, priorités, espace de travail, type de projet, inspiration.
- Palette et composants alignés sur le cockpit navy / bleu / beige.

## Mode clair
- La feuille de style app-only est chargée sur l'application sans modifier le site public.
- Les champs, cartes, textes blancs, bordures et panneaux du cockpit reçoivent une version claire lisible.
- Le chat desktop/mobile et l'onboarding suivent le même mode.

## Déploiement
- Le projet complet reste full-stack (FastAPI + React/Vite).
- Le Dockerfile utilise maintenant `frontend/dist` (Vite) et non `frontend/build` (ancien CRA).
- Le même build sélectionne le site public sur `zayado.net` et le cockpit sur `app.zayado.net`.
