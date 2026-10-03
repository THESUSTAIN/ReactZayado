# Lot 2 — Bien-être (étape 1), bilan PDF, choix « Pour moi / Pour mon équipe », confidentialité

Base : ReactZayado-main (le zip déployé), avec la boutique « Bientôt » déjà dans Bien-être.

## Fichiers REMPLACÉS
- backend/server.py : colonne `clarte` (vision_checkins) + migration automatique, `clarte` acceptée par PATCH /checkins/aujourdhui et renvoyée dans l'état.
- backend/rituels_ext.py : GET /bien-etre/energie renvoie aussi `jours30` (énergie, stress, clarté) et `taches` (faites / en cours / à faire).
- frontend/src/pages/BienEtre.jsx : verdict du jour + clarté mentale, bandeau Plan d'action, courbe 7 j / 30 j, bouton Bilan PDF, carte du vendredi (→ /app/revue), boutique en bas.
- frontend/src/components/pricing/GrilleTarifs.jsx : choix « Pour moi » / « Pour mon équipe » ; bandeau Membre TheSustain (Ma Foi ouverte sans offre). Aucun prix modifié.
- frontend/src/components/legal/ConfidentialiteContenu.jsx : politique complète (Google, Drive drive.file, Limited Use, sous-traitants, conservation, droits, résumé anglais).

## Fichiers AJOUTÉS
- frontend/src/lib/bilanPdf.js : bilan PDF (jsPDF, déjà dans le projet), mesures réelles seulement.
- frontend/public/legal/confidentialite.html : version statique lisible sans JavaScript.
- frontend/public/legal/confidentialite-shopify.html : même texte, à coller dans une page Shopify.

## À SUPPRIMER
Rien.

## Avant de mettre en ligne
1. `cd frontend && npm install && npm run build` (non compilé de mon côté, seulement vérifié par analyse de syntaxe).
2. Redémarrer le backend : la colonne `clarte` s'ajoute toute seule.
3. Confidentialité Google : voir la note dans la réponse (l'URL zayado.net est la boutique Shopify, pas l'appli).
