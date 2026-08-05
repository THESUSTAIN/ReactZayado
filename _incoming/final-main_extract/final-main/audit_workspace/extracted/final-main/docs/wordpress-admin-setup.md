# Zayado × WordPress — Infos à configurer pour gérer l'admin

Le backend Zayado (`backend/routes/wp_sync.py`) se connecte à WordPress en **headless**
via la **REST API** (auth *Application Password*). Il permet à un admin Zayado de :
- lire/écrire les pages (Gutenberg) et les réglages du site (titre, favicon…),
- lister les articles du blog,
- lire les produits WooCommerce,
- invalider le cache instantanément via un webhook WP.

## 1) Variables d'environnement backend (Railway → Variables)

À renseigner côté backend Zayado (`backend/.env` en local, Variables Railway en prod) :

| Variable | Valeur | Où l'obtenir |
|---|---|---|
| `WP_BASE_URL` | `https://VOTRE-SITE-WORDPRESS` (sans `/` final) | l'URL de votre WordPress (ex : `https://zayado.net` si WP y est installé) |
| `WP_USERNAME` | login de l'utilisateur admin WP | Utilisateurs → votre compte |
| `WP_APP_PASSWORD` | Application Password (24 caractères) | voir §2 |
| `WP_WEBHOOK_SECRET` | une chaîne aléatoire longue que vous choisissez | générez-la (ex : `openssl rand -hex 24`) |

> ⚠️ Ne mettez JAMAIS votre mot de passe WP normal dans `WP_APP_PASSWORD`.
> Utilisez uniquement un **Application Password** dédié (révocable).

## 2) Créer l'Application Password dans WordPress

1. Connectez-vous à `https://VOTRE-SITE/wp-admin`.
2. **Utilisateurs → Profil** (ou Comptes → votre compte).
3. Section **Mots de passe d'application** (Application Passwords).
4. Nom : `Zayado API` → **Ajouter**.
5. Copiez le mot de passe généré (format `xxxx xxxx xxxx xxxx xxxx xxxx`).
6. Collez-le dans `WP_APP_PASSWORD` (les espaces peuvent être conservés ou retirés).

Le compte doit avoir le rôle **Administrateur** (ou au minimum Éditeur) pour
créer/mettre à jour des pages.

## 3) Rôle exact de WordPress ici

- WordPress = **CMS de contenu** (pages marketing, blog, boutique WooCommerce).
- Zayado = **application cockpit** (React + FastAPI) qui *consomme* et *pousse* ce
  contenu via l'API REST. L'« admin » que vous gérez dans WordPress, ce sont
  les pages/articles/produits ; Zayado les synchronise (pull + push).

## 4) Webhook (propagation instantanée WP → Zayado)

Pour que toute modif publiée dans WordPress vide le cache Zayado immédiatement,
installez le mu-plugin fourni (`docs/wp-mu-plugin.php`) :

1. Copiez `docs/wp-mu-plugin.php` dans `wp-content/mu-plugins/` de votre WordPress
   (créez le dossier `mu-plugins` s'il n'existe pas).
2. Éditez les deux constantes en haut du fichier :
   - `ZAYADO_API_BASE` = URL du backend Zayado (ex : `https://app.zayado.net`)
   - `ZAYADO_WEBHOOK_SECRET` = **la même valeur** que `WP_WEBHOOK_SECRET`.

À chaque publication/màj de page ou produit, WP appellera
`POST {ZAYADO_API_BASE}/api/wp/webhook/invalidate?secret=…`.

## 5) Vérifier que tout marche

```bash
# Lister les pages WP (public)
curl "https://app.zayado.net/api/wp/pages"

# Réglages du site
curl "https://app.zayado.net/api/wp/site-settings"
```

Si `WP_BASE_URL` n'est pas défini → réponse 500 « WP_BASE_URL non configuré ».
Si les identifiants sont mauvais → 502 « Impossible de joindre WordPress ».
