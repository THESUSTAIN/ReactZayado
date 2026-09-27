# Fusion « Ma Foi » (par TheSustain) — Changelog

Intégration **additive et non-cassante** du module spirituel « Ma Foi » dans Zayado.
Règle d'or respectée : uniquement des **fichiers neufs** + des **édits minimes** clairement délimités.
Activation par **localStorage** (`zayado_ma_foi`), **aucun endpoint backend**, aucune modification de l'API `/profile`.
Uniquement du `.js`/`.jsx` (le build de prod supprime les `.tsx`/`.ts`).

## Fichiers AJOUTÉS (frontend/src)
- `features/thesustain/thesustainData.js` — contenu fictif local (5 modules + Psaumes, Sabbat, décharges, association). Remplaçable plus tard par l'API TheSustain.
- `features/thesustain/store.js` — flag localStorage (`getMaFoiActive`/`setMaFoiActive`) + hook `useLocal` + `uid`.
- `features/thesustain/MaFoiApp.jsx` — hub + 6 vues : Sagesse, Prière (Mur de prière + Mur des décharges), Parcours bibliques, Discernement, Cercle (+ passerelle association), Repos & Sabbat (Pauses Psaumes). Écran de choix « Qu'aimeriez-vous intégrer ? » à la 1re visite.
- `pages/MaFoi.jsx` — page route `/app/ma-foi`, reprend la coquille Zayado (Sidebar + Header).

## Fichiers MODIFIÉS (édits minimes, gardés/optionnels)
- `App.js` — +1 import `MaFoi`, +1 route `<Route path="/app/ma-foi" ...>` (protégée). Aucune route existante touchée.
- `components/kairos/Sidebar.jsx` — +import icône `HandHeart`, +1 item `mafoi` dans ITEMS, +1 branche `deriveActive`, +1 branche `go()`, libellé de secours pour le tooltip i18n.
- `components/kairos/BottomNav.jsx` — +import `HandHeart`, +1 entrée `mafoi` dans le menu « Plus » (mobile).
- `lib/acces.js` — `mafoi` ajouté à `MENU_REVEUR` et `/app/ma-foi` à `PAGES_REVEUR` (Ma Foi accessible à tous les plans, y compris Rêveur).

## Backend (documentation seulement)
- `schema_reference.sql` — ajout de la table manquante `accueil_choix` → schéma complet = **43 tables** (voir note SQL ci-dessous).

## Backend — Alias variables admin (non-cassant)
- `server.py` (`_bootstrap_admin`) — lit désormais, par ordre de priorité :
  - email : `ADMIN_EMAIL` → `admin_email` → `BOOTSTRAP_ADMIN_EMAIL`
  - mot de passe : `ADMIN_PASSWORD` → `admin_password` → `BOOTSTRAP_ADMIN_PASSWORD`
  - L'ancien nom `BOOTSTRAP_ADMIN_*` reste fonctionnel (rien à changer si déjà en place).

## Notes
- Design 100% aux tokens Zayado (navy / gold / offwhite / police `font-display`).
- Aucune dépendance nouvelle ; imports limités à `lucide-react` + `sonner` (déjà présents).
- Validation : syntaxe JSX vérifiée (8/8 fichiers OK). Non exécuté en live (dépendance privée + env).

## À faire côté déploiement (facultatif)
- Rien d'obligatoire : la fonctionnalité s'active côté utilisateur (localStorage).
- Le bouton « ✝️ Ma Foi » apparaît dans la barre latérale et le menu mobile « Plus ».
