# Lot 3 (remplace le lot 2 : il contient tout)

## Changements du lot 3
- Retrait du choix « Pour moi / Pour mon équipe » : le bandeau Équipe d'origine est remis.
- Membres TheSustain : −30 % automatique sur toute la grille (affichage ET encaissement), dès la 1re connexion TheSustain.
  - Réglage Railway : THESUSTAIN_REMISE_PCT (30 par défaut, 0 pour couper). Jamais cumulé avec le tarif fondateur : le prix le plus bas s'applique.
- TheSustain moins présent : une étape sobre à l'inscription (déjà existante, texte adouci), une phrase sous le bouton de connexion, le réglage Paramètres › Ma Foi. Retirés : la grande carte du parcours Bien-être et la ligne de l'onglet Outils.
- HTML confidentialité refait avec styles intégrés (copier-coller Shopify sans perte de design).

## Fichiers (tous à remplacer / ajouter)
backend/commerce_ext.py, backend/server.py, backend/rituels_ext.py
frontend/src/pages/BienEtre.jsx, Activer.jsx, Login.jsx, Onboarding.jsx
frontend/src/lib/bilanPdf.js (nouveau)
frontend/src/components/pricing/GrilleTarifs.jsx
frontend/src/components/legal/ConfidentialiteContenu.jsx
frontend/src/components/mindset/MindsetParcours.jsx
frontend/src/components/kairos/SensEquilibre.jsx
frontend/public/legal/confidentialite.html (page complète pour Google)
frontend/public/legal/confidentialite-shopify.html (à coller dans Shopify)

## À supprimer
Rien.

## Avant de mettre en ligne
npm install && npm run build (non compilé de mon côté), puis redémarrer le backend.
