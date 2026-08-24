# ZAYADO — Intégration Public + ReactZayado

## Architecture conservée

- `backend/` : inchangé. Railway continue à démarrer FastAPI comme avant.
- `frontend/` : ReactZayado reste le projet principal.
- `src/publicSite/` : pages publiques issues de `final-main/public-site`, isolées pour éviter les collisions avec le cockpit.
- `public/` : images SEO, robots, sitemap et prévisualisations des simulateurs.

## Routage

- `zayado.net` / `www.zayado.net` → pages publiques.
- `app.zayado.net` → cockpit MyExtension AI existant.
- Pour prévisualiser le public localement : `?public=1`.

## SEO

- Title + meta description par page.
- Canonical par URL.
- Open Graph + Twitter Card.
- Image sociale `public/zayado-og.jpg` en 1200×630.
- JSON-LD sur l'accueil, les Services Pro, les pages de service et les Avantages.
- `robots.txt` et `sitemap.xml` statiques.
- Pages Services SEO dédiées :
  - `/services/finance-pilotage`
  - `/services/gestion-organisation`
  - `/services/developpement`
  - `/services/structuration`

## Services Pro

Le tunnel commence par 4 questions et oriente vers une expertise : finance/pilotage, gestion/organisation, développement/acquisition ou structuration. La demande se termine sur une description ouverte du besoin.

## Avantages / Mutualisation

`/avantages` sépare :
- tarifs et conditions négociés (mécanique de mutualisation) ;
- offres ponctuelles / Business Travel.

Le mot « Mutualisation » n'est plus traité comme un rayon commercial obligatoire : il décrit la mécanique de négociation derrière les avantages.

## Boutique

Le menu boutique conserve `Corps / Âme / Rituel`.
Le catalogue est adapté pour consommer le proxy WooCommerce déjà présent dans le backend via `/api/wp/products` et `/api/wp/product/:slug`, plutôt que de dépendre de routes `/api/shop/products` absentes du backend actuel.

## Cockpit / Hub

La navigation du cockpit est simplifiée sur le modèle Hub IA :
- Hub IA
- Ma Vision
- Croissance
- Pilotage DAF IA
- Espace de travail
- Actualité

Le dernier item ouvre directement l'onglet Actualité du même ChatPanel existant. La BottomNav mobile conserve ces accès.

## Railway

Aucun fichier backend ou `railway.json` n'a été remplacé. Le Dockerfile existant continue à construire `frontend/build` puis à le servir via FastAPI.

Le build complet n'a pas été exécuté dans cet environnement faute de résolution réseau pour installer les dépendances npm/yarn. Une validation syntaxique TypeScript/JSX sans résolution de modules a été effectuée sur l'ensemble des pages publiques et sur les fichiers du cockpit modifiés.
