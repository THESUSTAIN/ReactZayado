"""Génère produits-zayado.csv (format d'import Shopify) et répare les adresses d'images du thème.
Relancer : python3 shopify/outils/generer_produits.py  (depuis la racine du projet)
Les PRIX ci-dessous ne servent qu'au premier import. Ensuite : les abonnements et services se règlent dans
l'admin de l'appli (onglet Prix, qui met aussi la fiche Shopify à jour) ; les objets partenaires dans Shopify.

Balises spéciales (lues par le thème) :
  bientot   → produit partenaire pas encore validé : ni prix ni achat, un bouton « Me prévenir » à la place.
  sur-devis → « Sur devis » à la place du prix ; le bouton ouvre la page Contact avec le sujet prérempli."""
import csv
import pathlib
import re

RACINE = pathlib.Path(__file__).resolve().parents[2]
IMAGES = dict(re.findall(r'(\w+):\s*"(https://[^"]+)"', (RACINE / "vitrine-entreprise/src/data/images.js").read_text()))
APP = "https://app.zayado.net"
BOUTIQUE = "https://zayado.net"

# (handle, titre, type, univers/tag, prix, prix_barre, livrable, image, bénéfice, mode_prix, lien_app, cta, statut, description)
P = [
    ("copilote-reveur", "Copilote Zayado — Rêveur", "Outil IA", "outils-ia", 15, "", False, "carnet", "Poser votre vision et nourrir vos idées", "par mois · sans engagement", f"{APP}/onboarding?plan=reveur", "Commencer", "active",
     "Vision Boards illimités, images IA, idées triées et développées par l'IA, chat IA qui connaît votre projet. Premier mois offert."),
    ("copilote-solo", "Copilote Zayado — Solo", "Outil IA", "outils-ia,promo", 29, "", False, "casque", "Le cockpit complet du solopreneur", "par mois · 2 mois pour 1 € pour tester", f"{APP}/onboarding?plan=serenite", "Essayer pour 1 €", "active",
     "Tout Rêveur, plus : cockpit du jour et plan d'action, Radar (30 vrais prospects nommés par mois), pilotage de vos chiffres, tunnels de vente."),
    ("copilote-pro", "Copilote Zayado — Pro", "Outil IA", "outils-ia", 69, "", False, "lampe", "Pour l'indépendant qui a des clients", "par mois · sans engagement", f"{APP}/onboarding?plan=pro", "Choisir Pro", "active",
     "Tout Solo, plus : Radar 90 prospects par mois, Agent Business à votre marque, documents IA (brief, plan 30 jours, SWOT), alertes WhatsApp et Telegram."),
    ("copilote-equipe", "Copilote Zayado — Équipe", "Outil IA", "outils-ia", 99, "", False, "vegetal", "Jusqu'à 5 personnes, vous compris", "par mois · 127 € si pris séparément", f"{APP}/onboarding?plan=business", "Choisir Équipe", "active",
     "Tout Pro pour vous, l'espace entreprise jusqu'à 5 personnes (planning, absences, pièces dans votre Drive), 2 comptes Solo inclus, 3 chatbots clients."),
    ("copilote-entreprise", "Copilote Zayado — Entreprise", "Outil IA", "outils-ia,sur-devis", 299, "", False, "heroDesk", "Au-delà de 5 personnes ou Microsoft 365 complet", "à partir de 299 € / mois · sur devis", f"{BOUTIQUE}/pages/contact?sujet=Copilote%20Entreprise", "Demander un devis", "active",
     "Tout Équipe sans limite de personnes, installation SharePoint et Teams, votre domaine et votre clé IA, accompagnement dédié."),
    ("kit-diagnostic-flash", "Kit Diagnostic Flash — où en est vraiment mon entreprise ?", "Diagnostic", "accompagnement,promo", 27, "", False, "planner", "Vos vrais chiffres en 10 minutes", "paiement unique", f"{APP}/public/tunnel", "Lancer mon diagnostic", "active",
     "Vous déposez votre FEC : recettes, charges et résultat mois par mois, votre autonomie de trésorerie en mois et les 3 points à corriger en priorité, dans un rapport PDF livré tout de suite."),
    ("accompagnement-clarte-financiere", "Accompagnement clarté financière", "Accompagnement", "accompagnement,sur-devis", 0, "", False, "carnet", "Des chiffres clairs, un plan tenu à 90 jours", "devis après diagnostic", f"{BOUTIQUE}/pages/contact?sujet=Accompagnement%20clart%C3%A9%20financi%C3%A8re", "Être accompagné", "active",
     "Un expert Zayado cadre votre situation, vos chiffres et vos priorités — du premier rendez-vous au plan tenu."),
    ("reprise-entreprise", "Reprendre une entreprise sans apport", "Rachat & reprise", "rachat-reprise,sur-devis", 0, "", False, "fauteuil", "Évaluation, négociation, financement : un seul interlocuteur", "devis après diagnostic", f"{APP}/public/reprise", "Parler de mon projet", "active",
     "Plutôt que créer de zéro : reprenez une entreprise rentable, même sans apport. Zayado monte le financement avec ses partenaires et vous accompagne jusqu'à la signature."),
    ("fauteuil-ergonomique-alba", "Fauteuil ergonomique Alba", "Produit", "produits,bientot", 349, "", True, "fauteuil", "Dos soutenu, journées sans courbatures", "livraison incluse", f"{APP}/acheter?kind=produit&id=fauteuil", "Commander", "active",
     "Un dossier qui soutient vraiment les longues sessions de travail, sans faire « bureau de salon »."),
    ("lampe-concentration-fjord", "Lampe de concentration Fjord", "Produit", "produits,bientot", 89, "", True, "lampe", "Focus durable, zéro fatigue visuelle", "livraison incluse", f"{APP}/acheter?kind=produit&id=lampe", "Commander", "active",
     "Lumière chaude dirigée, sans éblouissement — la lampe qu'on garde allumée pendant les chiffres."),
    ("plaid-recuperation-laine", "Plaid de récupération Lainé", "Produit", "produits,bientot", 69, "", True, "plaid", "Une vraie récupération entre deux blocs", "livraison incluse", f"{APP}/acheter?kind=produit&id=plaid", "Commander", "active",
     "Laine épaisse, poids apaisant, à portée du fauteuil de lecture."),
    ("carnet-mon-cap-90-jours", "Carnet « Mon cap 90 jours »", "Produit", "produits,bientot", 29, "", True, "planner", "Le cap écrit, tenu, relu chaque matin", "existe aussi en box", f"{APP}/acheter?kind=produit&id=planner", "Commander", "active",
     "Vision, objectifs, 3 priorités, gratitude — le carnet guidé du Cockpit, en papier."),
    ("tasse-rituelle-the-signature", "Tasse rituelle & thé signature", "Produit", "produits,bientot", 18, "", True, "mug", "Un vrai rituel, pas un café avalé", "livraison incluse", f"{APP}/acheter?kind=produit&id=mug", "Commander", "active",
     "La tasse du premier rituel du matin, avec un thé signature sélectionné avec soin."),
    ("vegetal-de-bureau", "Végétal de bureau — tranquillité verte", "Produit", "produits,bientot", 59, "", True, "vegetal", "Un environnement qui apaise pendant les chiffres", "livraison incluse", f"{APP}/acheter?kind=produit&id=vegetal", "Commander", "active",
     "Un végétal choisi pour les bureaux : peu d'entretien, beaucoup de calme visuel."),
    ("box-entrepreneur-apaise", "Box entrepreneur apaisé — fin d'année", "Box", "produits,promo,bientot", 49, 59, True, "boxHiver", "Le rituel de fin d'année qui remet l'énergie au centre", "précommande · édition limitée", f"{APP}/acheter?kind=produit&id=box-hiver", "Précommander", "active",
     "Carnet guidé « Mon cap 2027 », infusion bio, bougie naturelle, outil de micro-pause, carte rituel — et votre Copilote offert 2 mois."),
    ("box-equipe-cadeaux", "Box équipe — cadeaux d'entreprise", "Box", "produits,bientot", 39, "", True, "boxEte", "Un cadeau qui parle de vous, pas un gadget", "HT l'unité · dès 10 box · dégressif", f"{APP}/acheter?kind=produit&id=box-equipe", "Commander", "active",
     "Le cadeau qui dit merci à chaque collaborateur : carnet, infusion, micro-pause. Personnalisable dès 10 box."),
]

COLONNES = ["Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published", "Option1 Name", "Option1 Value",
            "Variant SKU", "Variant Inventory Policy", "Variant Fulfillment Service", "Variant Price", "Variant Compare At Price",
            "Variant Requires Shipping", "Variant Taxable", "Image Src", "Image Alt Text", "Status",
            "Bénéfice (product.metafields.zayado.benefice)", "Mode de prix (product.metafields.zayado.mode_prix)",
            "Lien app (product.metafields.zayado.lien_app)", "Bouton (product.metafields.zayado.cta)"]

sortie = RACINE / "shopify/produits/produits-zayado.csv"
sortie.parent.mkdir(parents=True, exist_ok=True)
with sortie.open("w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(COLONNES)
    for h, t, typ, tags, prix, barre, livrable, img, ben, mode, lien, cta, statut, desc in P:
        w.writerow([h, t, f"<p>{desc}</p>", "Zayado", typ, tags, "TRUE", "Title", "Default Title", h, "continue", "manual",
                    f"{prix:.2f}", f"{barre:.2f}" if barre else "", "TRUE" if livrable else "FALSE", "TRUE",
                    IMAGES.get(img, ""), t, statut, ben, mode, lien, cta])
print(f"{len(P)} produits -> {sortie}")

# Réparation des adresses d'images tronquées dans le thème (préfixe -> adresse complète).
for fichier in (RACINE / "shopify/theme").rglob("*"):
    if fichier.suffix not in (".liquid", ".json"):
        continue
    texte = fichier.read_text()
    neuf = re.sub(r"https://static\.prod-images\.emergentagent\.com/[^\"' )]+",
                  lambda m: next((u for u in IMAGES.values() if u.startswith(m.group(0))), m.group(0)), texte)
    if neuf != texte:
        fichier.write_text(neuf)
        print("images réparées :", fichier.relative_to(RACINE))

