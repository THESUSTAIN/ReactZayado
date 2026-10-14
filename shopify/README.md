# Dossier Shopify — Zayado (toutes les pages publiques)

**Règle :** toutes les pages publiques vivent sur Shopify (`zayado.net`). L'app (`app.zayado.net`) garde seulement l'espace
connecté, le paiement Mollie, le diagnostic (`/public/tunnel`) et la reprise sans apport (`/public/reprise`).
L'ancienne vitrine Emergent (`app.zayado.net/public/entreprise/…`) redirige maintenant vers la page équivalente de `zayado.net`.

Pourquoi le paiement reste dans l'app : Mollie, c'est 1,80 % + 0,25 € par carte européenne. Payé dans l'app, il n'y a **pas**
de frais Shopify en plus. Branché comme moyen de paiement *dans* Shopify, Shopify ajouterait ses « frais de transaction tiers ».

## Contenu

```
shopify/
├── theme/                         ← à ajouter à votre thème (Online Store 2.0, ex. Dawn)
│   ├── assets/zayado.css          couleurs et styles (ivoire, pierre, bleu nuit ; or en accent seulement)
│   ├── assets/zayado-*.woff2      polices Poppins + Caveat servies par la boutique (aucun appel à Google)
│   ├── layout/zayado-liens.liquid mise en page sans menu (page de liens)
│   ├── sections/
│   │   ├── zayado-hero.liquid             grand bandeau (avec ou sans image)
│   │   ├── zayado-douleurs.liquid         6 douleurs d'entrepreneur → la fonction Zayado qui les règle
│   │   ├── zayado-univers.liquid          les 4 univers : Outils IA · Accompagnement · Rachat & reprise · Produits
│   │   ├── zayado-cartes.liquid           NOUVEAU : grille de cartes (piliers, étapes, niveaux, valeurs, modules)
│   │   ├── zayado-bandeau.liquid          NOUVEAU : bandeau d'appel à l'action bleu nuit
│   │   ├── zayado-grille-produits.liquid  grille d'une collection
│   │   ├── zayado-fiche-produit.liquid    fiche produit ; « Me prévenir » pour les produits « bientot »
│   │   ├── zayado-tarifs.liquid           grille des abonnements servie par l'app (/embed/tarifs)
│   │   ├── zayado-services.liquid         accompagnement, reprise
│   │   ├── zayado-contact.liquid          NOUVEAU : contact / demande de devis (sujet prérempli par ?sujet=…)
│   │   ├── zayado-journal-liste.liquid    NOUVEAU : le Journal (articles, témoignages, notes de la maison)
│   │   ├── zayado-journal-article.liquid  NOUVEAU : une page du Journal
│   │   ├── zayado-faq.liquid, zayado-liens.liquid
│   ├── snippets/  zayado-carte-produit, zayado-carte-journal, zayado-date, zayado-icone
│   └── templates/ page.zayado-accueil, page.zayado-maison, page.zayado-besoins, page.zayado-cockpit,
│                  page.zayado-contact, page.zayado-liens, blog.journal, article.journal, collection.zayado, product.zayado
├── produits/produits-zayado.csv   16 produits prêts à importer
├── journal/textes-a-coller.md     les vrais articles du Journal, prêts à coller (titre, extrait, SEO, HTML)
├── outils/generer_produits.py     regénère le CSV
└── apercu/*.html                  aperçus de chaque page (ouvrez-les dans votre navigateur)
```

## Installation (30 minutes)

1. **Dupliquer votre thème** : Boutique en ligne › Thèmes › ⋯ › Dupliquer (vous travaillez sur la copie).
2. **Ajouter les fichiers** : ⋯ › Modifier le code. Dans chaque dossier (assets, layout, sections, snippets, templates),
   « Ajouter un nouveau fichier » avec **le même nom** et collez le contenu. Les polices `.woff2` : assets › « Importer un fichier ».
   *Plus rapide :* Shopify CLI, `shopify theme push --path shopify/theme --nodelete --theme <id-de-la-copie>`.
3. **Métachamps** (Paramètres › Données personnalisées), espace de noms `zayado` :
   | Où | Nom | Clé | Type |
   |---|---|---|---|
   | Produits | Bénéfice | `zayado.benefice` | Texte sur une ligne |
   | Produits | Mode de prix | `zayado.mode_prix` | Texte sur une ligne |
   | Produits | Lien app | `zayado.lien_app` | URL |
   | Produits | Bouton | `zayado.cta` | Texte sur une ligne |
   | **Articles de blog** | Personne (témoignage) | `zayado.personne` | Texte sur une ligne |
   ⚠ Les métachamps produit **avant** l'import, sinon les colonnes du CSV sont ignorées.
4. **Importer les produits** : Produits › Importer › `produits/produits-zayado.csv`. Les 8 produits partenaires portent la balise
   `bientot` : ni prix ni achat, un formulaire « Me prévenir » à la place (les inscrits sont des clients Shopify balisés
   `prevenir-<produit>` : vous savez quoi référencer en premier). Retirez la balise le jour où le partenaire est validé.
5. **Collections automatiques** (condition « Balise du produit est égale à ») : `outils-ia`, `accompagnement`, `rachat-reprise`,
   `produits` (même adresse que la balise). Modèle de thème : `collection.zayado`. Produits : modèle `product.zayado`.
6. **Pages** (Boutique en ligne › Pages › Ajouter, puis choisir le modèle) :
   | Page | Adresse | Modèle |
   |---|---|---|
   | La Maison | `/pages/maison` | `page.zayado-maison` |
   | De quoi avez-vous besoin ? | `/pages/besoins` | `page.zayado-besoins` |
   | Le Cockpit | `/pages/cockpit` | `page.zayado-cockpit` |
   | Contact | `/pages/contact` | `page.zayado-contact` |
   | Liens (bio des réseaux) | `/pages/liens` | `page.zayado-liens` |
   Accueil : ajoutez les sections « Zayado — … » à la page d'accueil, ou créez une page avec `page.zayado-accueil`.
7. **Journal** : Contenu › Articles de blog › Gérer les blogs › Ajouter « Journal » (adresse `journal`), modèle `blog.journal` ;
   modèle d'article `article.journal`. Collez les articles de `journal/textes-a-coller.md`. Balise de chaque texte :
   `article`, `temoignage` ou `note` (c'est elle qui choisit la mise en page et le filtre).
8. **Images** : les adresses d'images actuelles pointent vers l'hébergement Emergent. Téléversez vos images dans Shopify
   (Contenu › Fichiers) puis choisissez-les dans l'éditeur (champ « Image ») : plus rapide et plus de dépendance.
9. **Menu** : Boutique en ligne › Navigation : La Maison · Besoins · Cockpit · Marketplace (les 4 collections) · Journal · Contact.
10. **App Shopify de l'admin Zayado** (pour les boutons « Recopier sur Shopify ») : Paramètres › Applications › Développer des
    applications › votre app › droits `write_products` (prix) et `write_content` (Journal), puis `SHOPIFY_SHOP_DOMAIN` et
    `SHOPIFY_ADMIN_TOKEN` sur Railway.

## Modifier un prix (un seul endroit)

**App › Admin › Prix.** Un prix enregistré là s'applique tout de suite au paiement Mollie, à la grille de l'app et à la grille des
offres affichée sur Shopify (iframe `/embed/tarifs`). Cochez « Recopier aussi sur les fiches Shopify » pour mettre à jour le
prix des fiches produits. Les abonnés en cours gardent leur prix ; « Prix d'origine » annule tous les réglages.
Les produits partenaires (balise `bientot`) n'ont pas de prix tant qu'ils ne sont pas validés.

## Contenus : articles et témoignages

- **App › Admin › Articles du Journal** : l'IA lit les newsletters reçues, propose 5 sujets, rédige le brouillon (titre Google,
  description, chapô, intertitres, liens internes). Vous relisez, puis « Créer sur Shopify » (brouillon non publié).
  Rythme conseillé : 2 articles par mois et 1 note de la maison.
- **App › Admin › Témoignages** : demande par e-mail, message WhatsApp prêt, ou lien. Le client écrit lui-même et donne (ou non)
  son accord de publication. Option « Demandes automatiques » après un succès. Rien n'est publié sans votre validation.
