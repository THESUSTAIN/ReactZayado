# Modifs du 07/10/2026 — Notifications & PWA (compatibles Railway)

## ⚠️ Règle d'or pour le redéploiement Railway
Aucun fichier de déploiement n'a été touché : `railway.json`, `Dockerfile`, `nginx.conf`,
`docker-entrypoint.d` restent inchangés. Le redéploiement envoie **seulement du code** :
la base de données de production n'est PAS touchée (aucune table supprimée, migrations
additives uniquement), et les variables d'environnement Railway (JWT_SECRET, FERNET_KEY,
VAPID_*, BREVO_*, DATABASE_URL, MOLLIE_API_KEY…) doivent **rester exactement comme elles sont**.
Ne copiez surtout PAS les fichiers `.env` créés dans ce pod sur Railway : ce sont des fichiers
de test local (SQLite + comptes démo) — Railway garde les siens.

## Ce qui a été corrigé (5 fichiers à reporter dans votre repo)

1. `backend/server.py`
   - `/api/push/public-key` ajoutée aux routes publiques (`_ROUTES_PUBLIQUES_EXACTES`) :
     la clé publique VAPID est publique par nature ; le service worker peut la lire.
   - La seed de démo ne rétrograde plus jamais un compte admin existant.

2. `backend/notifications_ext.py`
   - Nouveau endpoint `GET /api/admin/notifications/sante` : état du push (diagnostic VAPID),
     tâches de fond actives ou coupées, comptes éligibles, appareils abonnés, relances des
     7 derniers jours par canal (push / Telegram / cloche), dernières relances avec le compte
     concerné, et les règles de calme expliquées en clair.

3. `frontend/src/lib/kairosApi.js`
   - `fetchAdminNotificationsSante()` (lecture du nouvel endpoint).

4. `frontend/src/pages/Admin.jsx`
   - Onglet Notifications : nouvelle carte « Santé du système de notification » (Push prêt /
     bloqué + raison exacte, crons Actifs/Coupés, compteurs 7 jours, dernières relances) et
     carte « Pourquoi je ne reçois rien certains jours ? » (règles de calme documentées).

5. `frontend/src/index.js`
   - L'échec d'enregistrement du service worker s'affiche en console au lieu d'être avalé
     en silence (aide au diagnostic PWA).

## Diagnostic production (app.zayado.net, testé avec le compte admin)

- Le backend prod tourne bien : cloche remplie (relances + actualités générées chaque jour),
  e-mails Brevo OK, clés VAPID présentes et cohérentes, compte admin fonctionnel.
- MAIS le **frontend déployé est un ancien build** : le bundle `main.ea6404ab.js` ne contient
  ni `activerPushAuto` (abonnement automatique des appareils), ni `abonnementValide`
  (réparation d'un abonnement créé avec d'anciennes clés VAPID), ni `etatNotifications`.
- Résultat : **0 appareil abonné au push** → tout va dans la cloche, rien ne vibre sur le
  téléphone. C'est exactement « 3 jours sans notification » : le serveur envoie, aucun
  appareil n'est là pour recevoir.
- Le code source du zip contient déjà la logique d'abonnement/réparation automatique :
  **redéployer le frontend depuis ce code la remet en marche**. À la première ouverture,
  chaque appareil se réabonne tout seul (message de bienvenue push à l'appui).

## PWA « ne fonctionne plus »
- Production sert bien `sw.js` (v4, network-first, sans cache du JS) et `manifest.json`.
- Le plus probable : la PWA installée tourne encore sur l'ancien shell en cache. Solution
  côté utilisateur : ouvrir l'appli une fois avec du réseau (le nouveau service worker
  prend le relais et purge les vieux caches), ou désinstaller/réinstaller l'icône.
- Côté code, la logique d'installation du zip (installPwa.js) garde l'invite native
  disponible pour les Paramètres — elle part avec le redéploiement.

## Après redéploiement — vérifier en 2 minutes
1. Console admin → Notifications → la carte « Santé » doit afficher « Push prêt » et
   les compteurs bouger.
2. « Vérifier l'envoi » avec un e-mail réel : cloche ✓, push « acceptée par X appareil(s) ».
3. Ouvrir l'appli sur le téléphone, accepter les notifications : l'appareil apparaît dans
   « appareils abonnés ».
