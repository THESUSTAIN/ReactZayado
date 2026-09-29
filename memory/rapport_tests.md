# Rapport de tests — comptes Zayado (preview, 29/09/2026)

Tests réalisés en PREVIEW (https://wellbeing-onboard.preview.emergentagent.com) — la production app.zayado.net est bloquée (voir blocage B1).
Mot de passe commun des comptes de test : `Test!2026`.

---

## Compte 1 — test.essentielle@zayado.net (offre « essentielle », sans abonnement) ✅ CONFORME

| Étape | Résultat | Détail |
|---|---|---|
| Connexion (mot de passe) | ✅ | Redirigé vers /activer (paywall), comme prévu par les règles d'accès |
| /app (cockpit) | ✅ bloqué à juste titre | Renvoie vers /activer — l'offre essentielle n'ouvre pas le cockpit |
| /app/ma-foi | ✅ bloqué | Renvoie vers /activer (Ma Foi suit la règle payante, sauf compte TheSustain) |
| /activer (paywall) | ✅ | Page soignée : nom du plan affiché (« Essentielle »), comparatif de coûts, CTA essai 1 €, liens « Exporter mes données » / « Mes paiements », bouton « Se déconnecter » |
| /pricing | ✅ | Page tarifs publique complète, sans erreur |
| /parametres | ✅ | Réglages accessibles (profil 25 %, onglets Général/Profil/Notifications…) |
| /mon-espace | ✅ | Espace achats/commandes accessible, sans erreur |
| Erreurs console bloquantes | ✅ aucune | Uniquement des appels /api/state en 401 avant connexion (normal) |

UX/UI : parcours clair et rassurant, aucune page cassée, thème sombre cohérent.
Non testé : le paiement de l'essai 1 € (pas de clé Stripe/Mollie en preview — blocage B2).

### Points mineurs relevés (non bloquants)
- W1 : avertissement HTML « button imbriqué dans button » sur l'une des pages du parcours d'activation — à corriger.
- W2 : avertissement React « prop asChild sur un élément DOM » — à corriger.

---

## Seed automatique au déploiement (codé le 29/09/2026, ajusté)
- `_seed_comptes_demo()` dans server.py tourne à CHAQUE démarrage : les 7 comptes de test sont créés s'ils manquent, offre active 1 an pour les plans payants (Rêveur/Solo/Pro/Équipe/Entreprise).
- ADMIN EXCLU du seed (29/09) : admin@zayado.net existe déjà en prod (Railway), mot de passe `Zyd2026SecureJWTkey!` — jamais créé ni écrasé par le seed. Le seed pose juste son numéro WhatsApp (0183643999) si le compte est présent.
- Jamais de suppression ; les mots de passe ne sont posés qu'à la création. `SEED_RESET_MDP=1` pour forcer la réinit des mots de passe des comptes de TEST ; `SEED_COMPTES_DEMO=0` pour désactiver.
- Au prochain déploiement production, les 7 comptes de test seront créés automatiquement — rien à lancer à la main.
- Vérifié en preview : log « Seed auto : 7 comptes prêts », connexions OK (8 comptes incl. admin), plans actifs corrects, WhatsApp admin posé.
- Contexte Emails IA recadré sur Zayado (avant : DeepShield/Sentriq). Brouillon IA en 503 tant que MAMMOTH_API_KEY est absente ; Brevo non configuré.

## Compte 1 — test.essentielle@zayado.net (offre « essentielle », sans abonnement) ✅ CONFORME

### Retest PRODUCTION (app.zayado.net, 29/09/2026 — après déploiement avec seed auto)
| Étape | Résultat | Détail |
|---|---|---|
| Connexion prod (Test!2026) | ✅ | Le seed auto a bien créé le compte au déploiement — redirection /activer |
| /app et /app/ma-foi | ✅ bloqués | Renvoi paywall /activer, comme prévu |
| /activer, /pricing, /parametres, /mon-espace | ✅ | Toutes rendues, console propre (aucune erreur) |

Conclusion : comportement identique preview/prod, aucune régression en production.

## Collaboration Vision Board — test.pro@zayado.net (PRODUCTION, 29/09/2026) ✅ avec bugs mineurs
- Partage créé : https://app.zayado.net/v/ZqrM-O9pOkMR8mJ5FlVj7N1EEhV3Vnon (lecture seule, sans compte requis, options « masquer finances » / « masquer énergie » cochées par défaut — très bien)
- Sur le board « Pro » de test.pro : une note (idée), une image, une carte vidéo YouTube — toutes persistées après rechargement, et visibles sur le lien public.

### Bugs / UX relevés
- VB1 (perte de saisie) : une note en cours d'édition est perdue si on la quitte avec Échap au lieu de cliquer en dehors — aucun avertissement. Risque de perte de contenu.
- VB2 (UX lecture seule) : sur le lien public, une note vide affiche « Double-clique pour écrire… » alors que la lecture seule interdit d'écrire — placeholder trompeur.
- VB3 (UX) : le modal « Démarre ton cockpit en 3 étapes » réapparaît à chaque visite du board, même après « Plus tard » — pas de mémorisation.
- VB4 (à confirmer) : une image de très petite taille uploadée s'affiche en grand bloc noir (ratio mal lu) — à revérifier avec une vraie photo ; si confirmé, les images uploadées sans dimensions lisibles cassent le rendu.
- VB5 (limite connue, non testée ici) : images stockées en data-URL dans la carte, plafond ~6 Mo par board — pas de vrai stockage de fichiers.

## Blocages (cumul)

- **B1 — PRODUCTION** : RÉSOLU pour les 7 comptes de test (le seed auto les a créés au déploiement, connexions vérifiées sur app.zayado.net). RESTE l'admin : admin@zayado.net / Zyd2026SecureJWTkey! ne passe pas en prod (le compte Railway existant a un autre mot de passe). Remède : variables Railway `ADMIN_EMAIL=admin@zayado.net` + `ADMIN_PASSWORD=Zyd2026SecureJWTkey!` → le bootstrap forcera rôle + mot de passe au prochain démarrage.
- **B2 — Paiement** : Stripe/Mollie non configurés en preview → parcours d'essai 1 € non testé.
- **B3 — IA Mammouth** : la clé fournie est REFUSÉE par l'API (401 « Invalid proxy server token », clé reçue se termine par « j-(w » — elle semble tronquée à la copie). À recopier en entier. Sans elle : Copilote/Radar/brouillons newsletter en repli local ou 503.
- **B4 — Emails/WhatsApp** : BREVO_API_KEY et le service WhatsApp ne sont pas configurés → brouillon par email + notification WhatsApp non testables.
- **B5 — Contexte Emails IA** : RÉSOLU (recadré Zayado).

## Comptes preview créés/prêts
- test.essentielle@zayado.net, test.reveur, test.solo, test.pro (abonnement Pro actif), test.equipe, test.entreprise — mdp `Test!2026`
- admin@zayado.net — mdp `Zayado-Test-2026!` (rôle admin, preview uniquement)
