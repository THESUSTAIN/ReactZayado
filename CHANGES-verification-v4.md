# Vérification et corrections — version __4_ (23/08)

## Confirmé : c'est bien la dernière version
Contient déjà mon travail précédent (`CHANGES-fusion-finale.md` présent)
et les corrections d'une autre session sur le Login
(`CORRECTIONS-LOGIN.md` : bordure TheSustain retirée, mot "preview"
reformulé, nom d'app ajouté, cause de "impossible d'accéder" identifiée
comme un problème d'identifiants MySQL Railway — pas un bug de code).

## Sur l'erreur console (gapi.js / Firebase)
**Ce n'est pas un bug de l'application.** Vérifié : aucune trace de
Firebase nulle part dans le code Zayado (ni source, ni dépendance
package.json). L'URL `chrome-extension://hdapp...` dans l'erreur est une
extension installée dans le navigateur qui charge son propre script
d'authentification Google — indépendant de Zayado. Le flux OAuth
Google/Microsoft du Login (`oauthExchange`) est lui bien réel et cohérent
(corrige d'ailleurs un vrai bug que j'avais dans ma version d'origine :
le code retourné par Google n'était jamais échangé contre une session).

## Vraie cause des notifications PWA jamais reçues — trouvée et corrigée
Ni `VAPID_PUBLIC_KEY` ni `VAPID_PRIVATE_KEY_PATH` n'étaient définies
nulle part (ni variable d'environnement, ni fichier), et aucune clé
privée n'existait dans le projet — seule une clé publique orpheline
(`keys/vapid_public.txt`) traînait, sans sa clé privée correspondante.
L'abonnement échouait donc dès le départ (clé publique vide côté
frontend), et l'envoi aurait échoué aussi (clé privée vide côté serveur).

**Corrigé** :
- Génération d'une vraie paire de clés VAPID valide et cohérente
  (`py_vapid`), committée dans `backend/keys/` (`vapid_public.txt` +
  `vapid_private.pem`)
- `routes/push.py` modifié pour lire automatiquement ces fichiers en
  repli si les variables d'environnement Railway ne sont pas définies —
  plus besoin de configuration manuelle pour que ça fonctionne
- Vérifié que le chemin de résolution des fichiers fonctionne
  correctement en conditions réelles

## Couleur or — nouveau balayage complet
Cette session parallèle a ajouté de nouveaux composants
(CockpitSections.jsx, AlignmentCelebration.jsx, tout le module
VisionBoard enrichi) et un fichier `login.css` séparé — aucun n'avait
reçu ma correction de couleur précédente. **166 occurrences** de
l'ancien or (`#D4AF37`, `#E5C887`, `#C9A449` et leurs variantes RGB)
remplacées dans 24 fichiers, vers la même teinte beige mesurée sur le
vrai logo MyExtension.

## Bleu du Login — vraie divergence trouvée et corrigée
`login.css` recopiait à la main un dégradé différent de la vraie formule
`.sky-bg` (points d'arrêt et couleurs de fin différents, finissant sur du
quasi-noir plutôt que le bleu marine du reste de l'app) — malgré ce
qu'affirmait `CORRECTIONS-LOGIN.md`. Corrigé pour utiliser exactement la
même formule que `.sky-bg`.

## Vérifié avant livraison
Backend et frontend compilent intégralement, tous les imports relatifs
résolvent vers un vrai fichier, aucune base de données committée.
