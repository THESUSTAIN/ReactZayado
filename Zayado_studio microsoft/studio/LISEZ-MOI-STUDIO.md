# Studio Zayado — studio.zayado.net

Les outils internes sortent de la console admin de l'application et vivent dans un service à part.

| Dans le Studio | Reste dans l'admin (app.zayado.net/admin) |
|---|---|
| Vidéos IA (HeyGen) | Vue d'ensemble, rétention, journal |
| Newsletters, Articles du Journal, Témoignages | Utilisateurs, équipe, connexions, demandes, notifications |
| Pages & Traductions, Carrousel login | Prix, commandes Mollie, parrainage, codes promo |
| Acquisition & transmission (lien vers les dossiers) | Vendeurs, catalogue, déploiement boutique |
| Partenaires reprise sans apport | Modération Ma Foi, marque & entreprise |
| Tunnels : personnaliser, Tunnels : paiements & commission | Branchements & clés, logs, espaces cachés, finances vendeurs |

Les données ne bougent pas : le Studio lit et écrit dans la base de Zayado en passant par le backend de l'application. Seule la clé HeyGen quitte l'application.

## Nouveautés des Vidéos IA

- Format vertical 9:16, horizontal 16:9 ou carré 1:1, en 1080p ou 720p.
- Couleur de fond : bleu nuit, ivoire, vert d'incrustation pour CapCut, ou n'importe quelle couleur.
- Vitesse de la voix ; Juliette et Maxime proposées en premier.
- Historique des vidéos (il ne se perd plus au rechargement), suivi automatique jusqu'à « Prête ».
- Boutons « Télécharger la vidéo » et « Voix seule (MP3) ».

## Fichiers

- `studio/` : le service (FastAPI) — `app.py`, `auth_microsoft.py` (connexion Microsoft), `heygen_routes.py` (déplacé depuis `backend/`), `Dockerfile`, `railway.json`.
- `frontend/studio/` + `frontend/vite.studio.config.ts` : l'interface, qui réutilise les composants de `frontend/src`.
- Modifiés : `frontend/src/zy/pages/Admin.jsx` (onglets retirés, bouton « Studio »), `backend/server.py` et `backend/diagnostics_ext.py` (HeyGen retiré), `.gitignore`.
- À supprimer du dépôt : `backend/heygen_routes.py` (plus utilisé).

## Qui peut entrer

Uniquement les comptes Microsoft de votre organisation (locataire zayado.onmicrosoft.com), via l'application Entra « Zayado Studio » :
- locataire unique : aucun compte extérieur à l'organisation ;
- « Affectation requise » = Oui : seuls les utilisateurs / groupes affectés à l'application ;
- les invités externes sont refusés par le Studio, même s'ils sont membres du groupe ;
- facultatif : `MS_GROUPES` (ID d'objet du groupe SharePoint) et `MS_DOMAINES` pour un contrôle de plus.

Aucun compte Zayado n'est utilisé : le Studio parle au backend de l'application avec un jeton admin de 5 minutes qu'il signe lui-même (même `JWT_SECRET`). Les jetons envoyés par le navigateur sont ignorés.

## Mise en ligne (Railway, environ 10 minutes)

1. **Entra** (portail Azure › Inscriptions d'applications › Zayado Studio) :
   - Authentification › plateforme « Web » › URI de redirection `https://studio.zayado.net/auth/microsoft/callback` ;
   - Certificats et secrets › nouveau secret client (à coller directement dans Railway, jamais ailleurs) ;
   - Applications d'entreprise › Zayado Studio › Propriétés › « Affectation requise ? » = **Oui** › Enregistrer ; puis Utilisateurs et groupes › ajouter les personnes (ou le groupe).
2. **Pousser le code** sur GitHub (branche principale) et supprimer `backend/heygen_routes.py`.
3. **Créer le service** : projet Railway › « + New » › « GitHub Repo » › `THESUSTAIN/ReactZayado`. Renommez-le `studio`.
4. **Réglages du service** › Source : *Root Directory* vide ; *Config File Path* : `studio/railway.json`.
5. **Variables du service `studio`** :

| Variable | Valeur |
|---|---|
| `BACKEND_URL` | la même que la variable `BACKEND_URL` du service frontend |
| `JWT_SECRET` | `${{<service backend>.JWT_SECRET}}` (la même clé que l'application) |
| `HEYGEN_API_KEY` | à déplacer depuis le service backend |
| `MS_CLIENT_ID` | `a1e3e814-cfe6-40d5-83c0-c48cf6a6c51e` |
| `MS_CLIENT_SECRET` | la valeur du secret client Entra |
| `MS_TENANT` | `zayado.onmicrosoft.com` |
| `STUDIO_URL` | `https://studio.zayado.net` |
| `APP_URL` | `https://app.zayado.net` |
| `MS_GROUPES` | facultatif : ID d'objet du groupe autorisé |
| `ZAYADO_ADMIN_UID` | facultatif : identifiant de votre compte admin Zayado, pour que les contenus créés depuis le Studio lui soient attribués |

6. **Domaine** : service `studio` › Settings › Networking › « Custom Domain » › `studio.zayado.net`, puis l'enregistrement CNAME donné par Railway chez le gestionnaire DNS de zayado.net.
7. **Vérifier** : `https://studio.zayado.net/health` doit répondre `heygen`, `backend`, `jwt` et `microsoft` à `true`.

## Vérifications faites

- Build de l'interface du Studio et de l'application : OK ; `tsc` : OK.
- Connexion testée avec un faux Microsoft Entra (signature RS256, PKCE, nonce) : membre du groupe accepté ; invité externe refusé ; compte hors groupe refusé ; faux cookie refusé ; déconnexion.
- Service testé avec un faux backend et un faux HeyGen : relais GET/POST (paramètres, gzip, jeton du navigateur remplacé par le jeton du Studio), refus sans session (401), corps HeyGen (1080 × 1920, fond, vitesse), historique, téléchargement vidéo, extraction MP3, nettoyage des fichiers temporaires.
- Non testé ici : l'appel au vrai HeyGen (clé nécessaire). Si votre offre HeyGen n'autorise pas la 1080p, le message le dit : choisissez 720p.
