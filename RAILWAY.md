# Déploiement Zayado — Shopify public + espace privé

## Architecture retenue

La vitrine publique et la marketplace ne sont pas une application React à héberger ici : elles restent sur **Shopify**, avec `https://zayado.net` comme domaine public.

L’application React de connexion et d’espace privé reste sur `https://app.zayado.net`. Elle appelle le backend Zayado via `/api`. Le backend contient l’authentification, les données privées, l’espace vendeur, les intégrations et les routes métier.

| Élément | Domaine / service | Rôle |
|---|---|---|
| Boutique publique | `zayado.net` / Shopify | Vitrine, marketplace et parcours d’achat public |
| Application privée | `app.zayado.net` | Connexion et espace utilisateur après authentification |
| Backend privé | service Railway `zayado-backend` | API FastAPI et données privées |
| Service WhatsApp | service Railway séparé | Passerelle WhatsApp si utilisée |

**Kairos est l’ancien nom interne**. Certains noms de fichiers, fonctions, clés de stockage et routes historiques le contiennent encore pour préserver la compatibilité ; le nom produit et le nom des services de déploiement doivent être **Zayado**.

## Correctif de connexion

Le frontend appelle désormais `/api/...` sur son propre domaine. Nginx doit relayer `/api` vers le backend Railway privé. Si `https://app.zayado.net/api/connexion/options` renvoie `502`, le frontend est bien publié mais `BACKEND_URL` est absent, invalide ou pointe vers un service qui n’est pas l’API Zayado.

Dans le service frontend privé, définir :

```text
BACKEND_URL=http://${{zayado-backend.RAILWAY_PRIVATE_DOMAIN}}:${{zayado-backend.PORT}}
```

Si le service backend porte encore un autre nom dans Railway, remplacer `zayado-backend` par son nom exact. Ne pas utiliser `myextension-ai.com` : ce domaine redirige vers Shopify et n’est pas l’API Zayado.

## Backend `zayado-backend`

Le service backend doit utiliser le dossier `backend/`, son Dockerfile et un volume monté sur `/data`. Variables minimales :

```text
DATABASE_URL=sqlite+aiosqlite:////data/kairos.db
JWT_SECRET=<secret persistant>
FERNET_KEY=<clé persistante>
FRONTEND_PUBLIC_URL=https://app.zayado.net
PUBLIC_FRONTEND_URL=https://app.zayado.net
BACKEND_PUBLIC_URL=https://app.zayado.net
CORS_ORIGINS=https://app.zayado.net
REQUIRE_AUTH=1
```

Le nom historique `kairos.db` peut rester tel quel : il s’agit du fichier de données, pas du nom public du produit.

## Frontend privé `app.zayado.net`

Le service frontend doit utiliser le dossier `frontend/`, le Dockerfile fourni et la variable runtime `BACKEND_URL` ci-dessus. La variable de build `REACT_APP_BACKEND_URL=https://api.zayado.net` doit être supprimée. Le build utilise maintenant une URL relative `/api`.

Le domaine `app.zayado.net` est nécessaire pour l’espace privé ; il ne sert pas de vitrine publique. La vitrine `zayado.net` reste entièrement Shopify.

## Vérifications après déploiement

```bash
curl -i https://app.zayado.net/api/connexion/options
curl -i https://app.zayado.net/api/state
```

La première commande doit renvoyer `200` avec du JSON. La seconde peut renvoyer `401` sans jeton, ce qui confirme que la requête atteint FastAPI. Une réponse `502` signifie que Nginx ne peut pas joindre `zayado-backend`.

Le domaine public Shopify ne doit pas être utilisé comme URL API privée. Pour les callbacks OAuth de l’espace privé, utiliser les URLs sous `app.zayado.net/api/...`.
