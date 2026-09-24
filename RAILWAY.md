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

## Nouvelles variables (v9) — service backend

| Variable | Rôle | Exemple |
|---|---|---|
| `APOLLO_API_KEY` | Clé Apollo **de Zayado** (clé « master » ou avec le droit `api_search`). Active les vrais prospects dans le Radar. | `xxxxxxxx` |
| `APOLLO_QUOTA_SERENITE` / `_PRO` / `_BUSINESS` / `_ESSENTIELLE` | Prospects par mois et par offre (défaut 30 / 90 / 150 / 0). | `30` |
| `SHOPIFY_SHOP_DOMAIN` | Boutique qui reçoit les produits vendeurs. | `ad2ax0-u1.myshopify.com` |
| `SHOPIFY_ADMIN_TOKEN` | Jeton Admin API de l'app personnalisée Shopify (droits `write_products`, `read_products`, `write_publications`, `read_publications`). | `shpat_…` |
| `SHOPIFY_PRODUCT_STATUS` | `ACTIVE` (défaut : en vitrine après modération) ou `DRAFT`. | `ACTIVE` |
| `SHOPIFY_PUBLICATION_ID` | Facultatif : canal de vente (sinon « Online Store » est trouvé tout seul). | |
| `PUBLIC_FRONTEND_URL` | Adresse publique de l'appli (pour les photos produit importées par Shopify). | `https://app.zayado.net` |

## Nouvelles variables (v10) — service backend

| Variable | Rôle |
|---|---|
| `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD` | Volumes de recherche Google réels (Radar, clientèle de particuliers). ~0,09 $ par scan, 1 scan par client et par semaine. |
| `MAMMOTH_IMAGE_MODEL` | Facultatif : modèle d'images Mammouth (défaut `google/gemini-2.5-flash-image`). Les images IA du Vision Board utilisent la clé Mammouth déjà en place. |
| `DVF_API_URL` / `GEO_API_URL` | Facultatifs : sources publiques des ventes immobilières (Cerema) et des communes (geo.api.gouv.fr). |

## Tests backend

`cd backend && pytest` — suite autonome (aucun serveur, aucun réseau, aucun compte de démo).
Les anciens tests dépendant d'un serveur distant sont dans `backend/tests/archive_serveur_distant/`.

## Nouvelles variables (v11) — modèle tarifaire sans offre gratuite

| Variable | Rôle | Défaut |
|---|---|---|
| `ESSAI_ACTIF` | `0` pour couper l'essai à 1 € | `1` |
| `ESSAI_PRIX` | Prix TTC de l'essai (payé une fois) | `1` |
| `ESSAI_JOURS` | Durée de l'essai | `60` |
| `ESSAI_PLAN` | Offre concernée par l'essai | `serenite` (Solo) |

Rappel : `FONDATEUR_ACTIF`, `FONDATEUR_FIN` (AAAA-MM-JJ), `FONDATEUR_PLACES` règlent le tarif fondateur,
qui est réservé dès l'essai s'il est encore ouvert. Un compte sans offre active (et sans rôle admin/vendeur)
est redirigé vers /activer ; ses données sont conservées.

## Mini-exercices à intégrer dans le Journal Shopify

Adresse : `https://app.zayado.net/embed/exercice/<parcours>` avec `oser-vendre`, `revenus-irreguliers`,
`dire-non` ou `rebondir`. Code à coller dans l'article (bloc HTML personnalisé) :

```html
<iframe id="zayado-exercice" src="https://app.zayado.net/embed/exercice/oser-vendre"
  style="width:100%;border:0;border-radius:22px;min-height:560px" loading="lazy" title="Exercice Zayado"></iframe>
<script>
  window.addEventListener("message", function (e) {
    if (e.origin === "https://app.zayado.net" && e.data && e.data.type === "zayado-exercice-hauteur") {
      document.getElementById("zayado-exercice").style.height = e.data.hauteur + "px";
    }
  });
</script>
```
