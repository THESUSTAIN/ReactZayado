# PRD — Yori, Maison des entrepreneurs apaisés

## Problème original (verbatim)
"Genere mois une page frentend yori : maison des entrepnneurs aipaisé.. une maketpalce standard pour prendre soin de l'entrpznnejr et son entrepnneur liste 3 concurents a ce niveau. Couleur de fond principal blanc un peu de beige clair et couelur bleu navy mi clair"

## Décisions recueillies (ask_human)
- Type : mini-marketplace complète (multi-vues)
- Concurrents : réels, vérifiés par recherche web (LegalPlace, Captain Contrat, Indy)
- CTA principal : « Prendre rendez-vous »
- Couleurs : fond blanc, beige clair, bleu navy mi-clair

## Utilisateurs cibles
1. Fondateur / indépendant en charge mentale — cherche de l'aide humaine (burn-out, coaching).
2. Dirigeant de TPE — cherche délégation fiable (juridique, comptabilité).
3. Les deux à la fois — persona cœur de Yori.

## Architecture réalisée
- Backend FastAPI (port 8001, /api) + MongoDB (motor) :
  - GET /api/offers (+ filtre ?category=), GET /api/offers/{id} (404 géré)
  - POST /api/appointments (validation EmailStr, nom ≥ 2), GET /api/appointments
  - Seed automatique de 12 offres / 4 catégories au démarrage si collection vide
- Frontend React (CRA + craco, Tailwind, framer-motion, lenis, sonner) :
  - / — hero cinétique (réveal masqué ligne par ligne + parallaxe), marquee éditorial, bento 4 piliers, 3 offres en vedette, section marché (3 concurrents réels), citation
  - /offres — catalogue 12 offres, filtres par catégorie, cartes animées
  - /offres/:id — détail (méta tarif/durée/format, image en arche, CTA préremplissant le RDV, suggestions)
  - /rendez-vous — formulaire (nom, email, tél, offre, date, message) → POST → panneau succès + toast Sonner
- Identité : logo SVG original (arche + soleil, navy/beige) aussi en favicon ; Cormorant Garamond + Manrope ; grain multiplicatif overlay.

## Design
- Palette : paper #FBFAF7, sand #F4F0E8, navy #355C7D / soft #4A749C / deep #1A2A3A, lignes #E5DFD3.
- Motion : lenis smooth scroll, reveals framer-motion (once, amount 0.15), hover micro-interactions, prefers-reduced-motion respecté.

## Fait (2026-10-06)
- [x] Backend complet + seed 12 offres, endpoints testés par curl (200/404/422)
- [x] Toutes les pages + navigation mobile (menu overlay)
- [x] Parcours e2e vérifié par screenshots : filtre catalogue → détail → réservation → succès
- [x] Desktop 1440 & mobile 390 vérifiés, aucun overflow horizontal

## Backlog priorisé
- P0 : —
- P1 : panel des demandes reçues (lecture des appointments), confirmation par email (Resend)
- P2 : comptes experts / annonceurs pour publier leurs offres (marketplace à double face), paiement (Stripe), calendrier de créneaux
