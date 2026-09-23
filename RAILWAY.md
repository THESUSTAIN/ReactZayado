# Déploiement Railway — Kairos by Zayado

## Correctif de connexion du 23 septembre 2026

La page `https://app.zayado.net/login` chargeait correctement, mais elle ne pouvait pas authentifier un utilisateur. Le build React appelait `https://api.zayado.net/api/...`, alors que **`api.zayado.net` ne possède aucun enregistrement DNS**. Les requêtes de connexion échouaient donc avant même d’atteindre FastAPI.

Le frontend utilise désormais l’API en **même origine** (`/api/...`). Nginx, dans le service frontend Railway, relaie ces requêtes vers le backend sur le réseau privé Railway. Cette configuration supprime la dépendance à `api.zayado.net` et évite les problèmes CORS entre le navigateur et l’API.

> Ne pas créer ni réutiliser `api.zayado.net` pour ce déploiement. Le point d’entrée public de l’API est maintenant `https://app.zayado.net/api/...`.

## Architecture

| Service Railway | Root Directory | Domaine public | Rôle |
|---|---:|---|---|
| `kairos-backend` | `backend/` | aucun requis | API FastAPI, base SQLite persistante |
| `kairos-saas` | `frontend/` | `app.zayado.net` | Kairos SaaS et proxy `/api` |
| `zayado-admin` | `frontend/` | `admin.zayado.net` | Console admin et proxy `/api` |
| `whatsapp-service` | `WhatsApp-service/` | URL Railway si nécessaire | Passerelle WhatsApp |

Les services `kairos-saas`, `zayado-admin` et `kairos-backend` doivent être placés dans **le même projet et le même environnement Railway** afin que le réseau privé soit disponible.

## Configuration Railway à appliquer

### 1. Service `kairos-backend`

Conserver le `Root Directory` sur `backend/`, le Dockerfile de ce dossier et un volume monté sur `/data`. Définir au minimum les variables suivantes.

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | `sqlite+aiosqlite:////data/kairos.db` |
| `JWT_SECRET` | secret long, unique et conservé entre les déploiements |
| `FERNET_KEY` | clé Fernet persistante |
| `FRONTEND_PUBLIC_URL` | `https://app.zayado.net` |
| `PUBLIC_FRONTEND_URL` | `https://app.zayado.net` |
| `BACKEND_PUBLIC_URL` | `https://app.zayado.net` |
| `CORS_ORIGINS` | `https://app.zayado.net,https://admin.zayado.net` |
| `REQUIRE_AUTH` | `1` en production |

Les clés métier optionnelles ou nécessaires à certaines fonctions restent : `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MOLLIE_API_KEY`, `UNSPLASH_ACCESS_KEY`, etc.

### 2. Services `kairos-saas` et `zayado-admin`

Conserver le `Root Directory` sur `frontend/`. Pour **chacun** des deux services, ajouter cette variable runtime :

| Variable | Valeur Railway |
|---|---|
| `BACKEND_URL` | `http://${{kairos-backend.RAILWAY_PRIVATE_DOMAIN}}:${{kairos-backend.PORT}}` |

La syntaxe ci-dessus est une référence Railway vers le service `kairos-backend`. Si le nom du service diffère dans votre projet, remplacer `kairos-backend` par son nom Railway exact.

Supprimer la variable de build `REACT_APP_BACKEND_URL` si elle existe encore. Le Dockerfile force maintenant la valeur vide afin que les builds utilisent `/api`; la suppression évite toute confusion lors d’un futur changement de configuration. Conserver `REACT_APP_FLAVOR=saas` pour `kairos-saas` et `REACT_APP_FLAVOR=console` pour `zayado-admin`.

### 3. OAuth et intégrations publiques

Comme les callbacks OAuth arrivent désormais via le proxy frontend, remplacer dans Google Cloud Console et Azure les URI de redirection par :

```text
https://app.zayado.net/api/connexion/oauth/google/callback
https://app.zayado.net/api/connexion/oauth/microsoft/callback
```

Pour le service WhatsApp exposé à l’extérieur, définir `BACKEND_URL=https://app.zayado.net` afin qu’il utilise également le proxy public. Les appels internes peuvent aussi utiliser une URL Railway privée lorsque le service est dans le même projet.

## Ordre de redéploiement

1. Déployer ou redéployer `kairos-backend` et vérifier que son healthcheck `/api/` est vert.
2. Ajouter `BACKEND_URL` aux deux services frontend avec la référence privée ci-dessus.
3. Redéployer `kairos-saas`, puis `zayado-admin` si celui-ci est utilisé.
4. Purger toute ancienne variable `REACT_APP_BACKEND_URL=https://api.zayado.net` et toute redirection DNS applicative vers ce sous-domaine.

## Vérification après déploiement

Les deux commandes suivantes doivent renvoyer du JSON — jamais le HTML de l’application React :

```bash
curl -i https://app.zayado.net/api/connexion/options
curl -i https://app.zayado.net/api/state
```

La première doit répondre `200` avec un objet JSON. La seconde peut répondre `401` sans jeton, ce qui confirme que la requête atteint FastAPI. Sur la page `/login`, tester ensuite l’onglet **Mot de passe** avec un compte existant, puis le lien magique. Si Brevo est configuré, le lien magique doit être reçu et revenir vers `https://app.zayado.net/login?token=...`.
