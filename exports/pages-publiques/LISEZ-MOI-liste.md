# Pages publiques de app.zayado.net — inventaire et analyse (14/10/2026)

Bonne nouvelle : l'app ne contient déjà presque plus de pages vitrine. La vitrine
(accueil, maison, besoins, boutique, journal…) vit UNIQUEMENT sur Shopify.
Il ne reste dans l'app que les pages transactionnelles, légales et de compte.

## À GARDER dans l'app — les boutons de la boutique Shopify y mènent

| Adresse | Rôle | Liée depuis Shopify |
|---|---|---|
| /login | Connexion VisionAct | « Mon espace », « Se connecter » |
| /onboarding | Souscription Solo/Pro… (Mollie) | « Essayer 2 mois pour 1 € » (hero, douleurs, tarifs) |
| /public/tunnel (+ /merci, /kit, /fast-track, /confirmation) | Tunnel de vente : diagnostic → Kit 27 € → Fast-Track | « Faire mon diagnostic », bandeau, journal |
| /public/reprise (+ /rdv, /merci), /public/cession | Tunnel reprise d'entreprise | Pages « Reprendre une entreprise » |
| /diagnostic | Redirige vers /public/tunnel | CTA de l'en-tête |
| /acheter | Achat après clic produit | Fiches produits (secours) |

## À GARDER — exigences externes (Google, e-mails, partage)

| Adresse | Pourquoi |
|---|---|
| /legal/confidentialite | Lien déclaré à Google Cloud (vérification OAuth) — servie en HTML simple, lisible sans JavaScript |
| /legal/mentions-legales, /legal/cgu, /legal/cgv | Redirections zayado.net/legal/* → ici |
| /pricing/success | Retour après paiement Mollie |
| /t/:slug | Tunnels publiés par les utilisateurs |
| /temoignage/:jeton | Lien de témoignage envoyé aux clients |
| /v/:token | Partage public d'une vision (lecture seule) |
| /activer, /connexion-externe | Activation de compte, OAuth Google/Microsoft |
| /compte, /compte/liaison, /mon-espace | Compte client (commandes, liaison boutique) |
| /entreprise/rejoindre | Invitation d'équipe (lien reçu par e-mail) |
| /embed/tarifs, /embed/exercice/:slug, /embed/confidentialite | Iframes affichées DANS la boutique Shopify |

## Seuls vrais doublons vitrine — votre décision

| Adresse | Contenu | Doublon Shopify | Recommandation |
|---|---|---|---|
| /pricing | Tarifs SaaS (Rêveur→Entreprise) | Tarifs aussi sur /pages/cockpit (iframe /embed/tarifs) | GARDER : les CGV et des e-mails y renvoient ; la page sert aussi le retour Mollie |
| /partenaires/thesustain | Page partenaire TheSustain | Aucun lien depuis la boutique | Votre choix : garder (vitrine partenaire) ou retirer |

## Conclusion
Rien à supprimer d'autre : il n'y a PAS de doublon de pages vitrine dans l'app.
La répartition actuelle est déjà « Shopify = vitrine (via API), app.zayado.net =
cockpit + paiements + légal ». Les seules liaisons restantes sont voulues :
la boutique pointe vers les tunnels/paiements de l'app, l'app pointe vers la
boutique pour le marketing.

Détail consultable aussi dans l'admin : Admin › Pages publiques.
