# Déploiement Zayado — Shopify public + espace privé

## Architecture retenue

La vitrine publique et la marketplace ne sont pas une application React à héberger ici : elles restent sur **Shopify**, avec `https://zayado.net` comme domaine public.

L’application React de connexion et de cockpit IA privé reste sur `https://app.zayado.net`. Elle appelle le backend Zayado via `/api`. Le backend contient l’authentification, les données privées, les intégrations et les routes métier du cockpit.

| Élément | Domaine / service | Rôle |
|---|---|---|
| Boutique publique | `zayado.net` / Shopify | Vitrine, catalogue et boutons d’accès vendeur / achat |
| Cockpit privé | `app.zayado.net/app` | Pilotage IA de l’activité |
| Espace vendeur | `app.zayado.net/espace-vendeur` | Dépôt et suivi des fiches produit/service |
| Mon espace acheteur | `app.zayado.net/mon-espace` | Commandes, services achetés et accès SaaS après paiement |
| Backend privé | service Railway `Backend` | API FastAPI et données privées |
| Service WhatsApp | service Railway séparé | Passerelle WhatsApp si utilisée |

**Kairos est l’ancien nom interne**. Certains noms de fichiers, fonctions, clés de stockage et routes historiques le contiennent encore pour préserver la compatibilité ; le nom produit et le nom des services de déploiement doivent être **Zayado**.

## Correctif de connexion

Le frontend appelle désormais `/api/...` sur son propre domaine. Nginx doit relayer `/api` vers le backend Railway privé. Si `https://app.zayado.net/api/connexion/options` renvoie `502`, le frontend est bien publié mais `BACKEND_URL` est absent, invalide ou pointe vers un service qui n’est pas l’API Zayado.

L’erreur Nginx `invalid port in upstream ":"` signifie précisément que `BACKEND_URL` a été injectée vide. Le nouveau conteneur possède un repli de démarrage pour éviter le crash Nginx, mais il faut tout de même renseigner la bonne référence Railway pour que l’API fonctionne.

Dans le service frontend privé, définir :

```text
BACKEND_URL=http://${{Backend.RAILWAY_PRIVATE_DOMAIN}}:${{Backend.PORT}}
```

Dans Railway, sélectionner **Add Reference** / **Variable Reference** plutôt que de saisir un nom approximatif. Le segment avant le point doit correspondre exactement au nom du service backend dans le projet. Si le service s’appelle `backend`, utiliser `backend.RAILWAY_PRIVATE_DOMAIN` et `backend.PORT`; s’il s’appelle `zayado-backend`, utiliser `zayado-backend.RAILWAY_PRIVATE_DOMAIN` et `zayado-backend.PORT`.

Dans le projet Railway actuellement vérifié, le service s’appelle **`Backend`**. Ne pas utiliser `myextension-ai.com` comme URL interne : c’est le domaine public actuel du backend, mais la référence privée Railway est préférable. Ne pas mettre `BACKEND_URL` seulement dans le service backend : elle doit être présente dans le **service frontend Nginx**.

## Backend `Backend`

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

Le service frontend privé `Frontend-prive` doit utiliser le dossier `frontend/`, le Dockerfile fourni et la variable runtime `BACKEND_URL` ci-dessus. La variable de build `REACT_APP_BACKEND_URL=https://api.zayado.net` doit être supprimée. Le build utilise maintenant une URL relative `/api`.

Le domaine `app.zayado.net` sert aux espaces privés. Shopify présente les produits et services, mais les paiements sont créés par le backend Zayado avec Mollie. L’espace vendeur est privé (`/espace-vendeur`) ; la marketplace publique n’est pas une page React du cockpit. La route historique `/app/marketplace` redirige vers l’espace vendeur pour préserver les anciens liens.

Le bouton vendeur placé dans Shopify doit pointer vers :

```text
https://app.zayado.net/espace-vendeur
```

Le lien acheteur à utiliser après création de l’espace correspondant est :

```text
https://app.zayado.net/mon-espace
```

## Vérifications après déploiement

```bash
curl -i https://app.zayado.net/api/connexion/options
curl -i https://app.zayado.net/api/state
```

La première commande doit renvoyer `200` avec du JSON. La seconde peut renvoyer `401` sans jeton, ce qui confirme que la requête atteint FastAPI. Une réponse `502` signifie que Nginx ne peut pas joindre `zayado-backend`.

Le domaine public Shopify ne doit pas être utilisé comme URL API privée. Pour les callbacks OAuth de l’espace privé, utiliser les URLs sous `app.zayado.net/api/...`.
