# PRD — Zayado, Maison des entrepreneurs apaisés

## Problème original (verbatim)
"Genere mois une page frentend yori : maison des entrepnneurs aipaisé.. une maketpalce standard pour prendre soin de l'entrpznnejr et son entrepnneur liste 3 concurents a ce niveau. Couleur de fond principal blanc un peu de beige clair et couelur bleu navy mi clair"

## Choix utilisateur (ask_human)
- Mini-marketplace complète ; concurrents réels ; CTA « Prendre rendez-vous » ; blanc/beige clair/navy mi-clair.

## Évolution majeure (docx client, 2026-10-07)
Le client a fourni « Zayado — Services et produits de la marketplace.docx » : rebranding Yori → **Zayado** (zayado.net) et restructuration complète en deux familles (Services + Produits) avec 4 mécanismes d'achat (Demander un diagnostic / S'abonner ou Essayer / Ajouter au panier / Demander un devis). Tout le contenu provient de ce document, chiffrés inclus.

## Architecture réalisée
- Backend FastAPI (/api) + MongoDB (motor) :
  - GET /api/services, GET /api/services/{slug} — 3 lignes de service avec contenu structuré (features, plans, rows, steps, notes)
  - GET /api/products — 23 rayons (pour_moi 10, pour_entreprise 9, transverse 4) avec statut prix (« En cours » / « Sur devis ») et flag « proposé »
  - POST/GET /api/appointments — demandes avec request_type (diagnostic / abonnement / devis), sujet, date
  - Seed automatique au démarrage (collections vides uniquement)
- Frontend React (Tailwind, framer-motion, lenis, sonner, shadcn) :
  - / — hero cinétique « Rentabiliser son entreprise, sans s'y perdre. », promesse « Plus de clients, moins de charge mentale », marquee, bento « Pourquoi Zayado » (problème / sélection stricte / socle financier / interlocuteur de confiance), deux familles, spotlight Cockpit IA (5 fonctions + tarifs fondateurs), marché (3 concurrents réels + bandeau « ni Amazon, ni freelances au rabais »), citation
  - /services — index des 3 services + note partenaires réglementés
  - /services/:slug — cockpit-ia (5 fonctions, 5 offres : Essai 15 €, Solo 29 € [fondateur 24 €], Pro 69 € [fondateur 49 €], Équipe 99 €, Entreprise dès 299 € sur devis, essai 1 mois offert, annuel ~2 mois offerts, TheSustain −30 %) ; optimisation-entreprise (5 services, sur devis après diagnostic) ; acquisition-transmission (parcours 4 étapes, forfaits 1 990 / 2 850 / 2 850 € HT + 20 % économie ou 3 300 € HT, notes transmission/honoraires tiers/valorisation sans certification)
  - /produits — rayons groupés (Pour moi / Pour mon entreprise / Transverses & box), « Ajouter au panier » désactivé (prix en cours), « Demander un devis » pour l'aménagement, box saisonnières en précommande
  - /diagnostic — formulaire avec sujet pré-rempli depuis ?service=, request_type dérivé (cockpit→abonnement, aménagement→devis), succès + toast ; /rendez-vous redirige vers /diagnostic
- Identité : logo SVG arche + soleil (navy/beige) en favicon ; Cormorant Garamond + Manrope ; grain éditorial ; lenis ; prefers-reduced-motion respecté.

## Vérifié (2026-10-07)
- [x] curl : /api/services (3), /api/services/cockpit-ia (5 offres), /api/products (23 rayons), POST /api/appointments (request_type abonnement enregistré), 404/422 gérés
- [x] e2e UI : formulaire diagnostic avec pré-remplissage ?service=cockpit-ia → bouton « Commencer mon abonnement » → succès + toast
- [x] Screenshots desktop 1440 (accueil, cockpit, produits) et mobile 390 sans overflow

## Backlog priorisé
- P1 : panneau des demandes reçues (lecture appointments), email de confirmation (Resend), paiement abonnements (Stripe) quand le Cockpit IA sera prêt
- P2 : panier + catalogue produits (débloquer « Ajouter au panier » quand les prix arrivent), comptes partenaires, iframing de la grille tarifaire depuis l'application, compteur de places des box en précommande
