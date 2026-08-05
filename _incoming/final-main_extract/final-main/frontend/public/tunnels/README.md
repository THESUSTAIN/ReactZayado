# Zayado — Tunnels HTML (5 tunnels × 7 étapes)

## 📦 Contenu du dossier
- `index.html` — page d'accueil listant les 5 tunnels
- `tunnel.html` — page unique qui joue les 7 étapes (landing → questionnaire → loading → result → teaser → unlock → signup)
- `tunnels-data.js` — définitions des 5 tunnels + logique de scoring/ratios financiers

## 🔗 URLs et routes

Chaque tunnel se lance via `tunnel.html?slug=<slug>` :

| Tunnel | Slug | URL |
|---|---|---|
| Tester mon projet | `tester-mon-projet` | `/tunnels/tunnel.html?slug=tester-mon-projet` |
| Créer mon entreprise | `creer-mon-entreprise` | `/tunnels/tunnel.html?slug=creer-mon-entreprise` |
| Trouver mes premiers clients | `trouver-mes-premiers-clients` | `/tunnels/tunnel.html?slug=trouver-mes-premiers-clients` |
| Structurer mon entreprise | `structurer-mon-entreprise` | `/tunnels/tunnel.html?slug=structurer-mon-entreprise` |
| Optimiser ma rentabilité | `optimiser-ma-rentabilite` | `/tunnels/tunnel.html?slug=optimiser-ma-rentabilite` |

Le hub `/tunnels/index.html` liste ces 5 tunnels sous forme de cartes.

## 🚀 Insertion sur votre site

### Option 1 — Servir tel quel (recommandé)
Uploadez le dossier `tunnels/` à la racine `public` de votre site.
Accès direct via `https://votresite.com/tunnels/tunnel.html?slug=tester-mon-projet`

### Option 2 — Liens depuis vos pages produit existantes
Sur `/valider-son-projet` ou `/tester-son-projet`, remplacez le CTA principal par :
```html
<a href="/tunnels/tunnel.html?slug=tester-mon-projet" class="cta">
  Tester mon projet gratuitement
</a>
```

### Option 3 — Rediriger vos anciennes routes
Si vous aviez `/lancer` ou `/piloter`, ajoutez une redirection 301 :
- `/lancer` → `/tunnels/tunnel.html?slug=tester-mon-projet`
- `/piloter` → `/tunnels/tunnel.html?slug=structurer-mon-entreprise`

## 🔌 Branchement backend (optionnel)

Par défaut, chaque tunnel calcule le score **côté client** (mêmes formules que le React d'origine). Pour brancher votre backend et récupérer les leads :

Avant le premier `<script>` dans `tunnel.html`, ajoutez :
```html
<script>window.__ZAYADO_API__ = "https://api.votredomaine.com";</script>
```

Le tunnel POSTera automatiquement vers :
- `POST /api/tunnels/analyze` — attend `{ slug, answers }` → retourne `{ result, ai_report?, report_id? }`
- `POST /api/tunnels/lead` — reçoit `{ prenom, email, tunnel_id, tunnel_slug, tunnel_name, score, report_id, answers }`
- `POST /api/auth/register` — reçoit `{ email, password }`

**Comportement** : si le backend n'est pas défini ou renvoie une erreur, le tunnel fonctionne quand même en mode client-only (calcul local du score, lead non enregistré côté serveur).

## 🎨 Personnalisation

Les couleurs sont dans les variables CSS en haut de `tunnel.html` et `index.html` :
```css
:root{
  --cream:#F7F2E9;        /* fond crème */
  --navy:#101E3D;         /* bleu principal */
  --navy-soft:#243458;    /* bleu doux (hover) */
  --gold:#BE9A5E;         /* or */
  --gold-light:#D8BC86;   /* or clair */
  --gold-hover:#a9814a;   /* or hover */
}
```

Polices utilisées : `Cormorant Garamond` (titres) + `Inter` (texte) via Google Fonts.

## ✅ Aucun build requis
Ces 3 fichiers sont 100% autonomes (vanilla JS + CSS pur). Vous pouvez les ouvrir directement dans un navigateur ou les servir depuis n'importe quel hébergement statique (Nginx, Vercel, Netlify, S3+CloudFront, GitHub Pages…).
