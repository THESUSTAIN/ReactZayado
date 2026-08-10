# Correction — bouton "Démo Investisseur"

## Ce qui ne marchait pas
Le bouton était visible en préproduction ET en production (aucune condition
sur l'environnement, seulement sur l'email/rôle de l'utilisateur) — contraire
à la demande.

Surtout : il était positionné en `fixed left:18 bottom:92 z-index:60`, quasiment
la MÊME position que le `DebugMenu` déjà existant (`left:14 bottom:90
z-index:300`, lui aussi réservé à la preview). Le DebugMenu passe au-dessus
(z-index plus élevé) et son menu déroulant grandit vers le haut par-dessus
cette zone : les deux widgets se chevauchaient, ce qui explique qu'il
"semblait ne pas fonctionner" — soit invisible sous le DebugMenu, soit ses
clics interceptés par lui selon l'état ouvert/fermé du menu.

Egalement : les endpoints backend (`/api/demo/investor-status`,
`investor-fill`, `investor-reset`) n'avaient AUCUNE restriction côté serveur
— seul le frontend cachait le bouton aux autres comptes. N'importe quel
utilisateur connecté pouvait appeler l'API directement pour peupler son
propre compte de fausses données financières/bien-être.

## Correctifs
- **Preview uniquement** : `frontend/src/App.js` — le bouton n'est monté
  que si `isPreview` est vrai (même détection déjà utilisée pour le
  DebugMenu, basée sur le hostname : jamais sur zayado.net /
  myextension-ai.com).
- **Chevauchement résolu** : `InvestorDemoButton.jsx` — repositionné à
  `bottom: 300` (au lieu de 92) pour rester au-dessus du DebugMenu même
  quand son menu déroulant est ouvert, `z-index: 250` (sous le DebugMenu à
  300, cohérent). Toujours en bas à gauche, juste plus haut dans la colonne.
- **Autorisation serveur** : `backend/routes/demo.py` — les 3 endpoints
  vérifient maintenant `user.email == "thomas@zayado.fr"` ou
  `user.role in ("admin","super_admin")` et renvoient 403 sinon, au lieu de
  ne compter que sur le masquage frontend.

## Non vérifié
Pas de build/preview réel lancé depuis cet environnement pour confirmer
visuellement le non-chevauchement — vérifié par lecture du code et calcul
de la hauteur max du menu déroulant du DebugMenu (~180-190px déployé), donc
`bottom: 300` laisse une marge confortable. À valider visuellement en
preview après déploiement.
