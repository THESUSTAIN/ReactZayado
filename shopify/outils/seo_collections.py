#!/usr/bin/env python3
"""SEO des collections Zayado : titre + description Google, texte « douleur », FAQ (json) et guide offert, via métachamps.
Usage : SHOPIFY_SHOP_DOMAIN=… SHOPIFY_CLIENT_ID=… SHOPIFY_CLIENT_SECRET=… python3 seo_collections.py
Lu par sections/zayado-collection-seo.liquid (FAQPage + BreadcrumbList en JSON-LD). Idempotent (metafieldsSet)."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import installer_boutique as I  # noqa: E402

SEO = {
    "concentration-visuelle": {
        "titre": "Lunettes et filtres anti lumière bleue | Zayado",
        "desc": "Yeux qui piquent après 6 h d'écran ? Filtres Ocushield, lunettes amber et lampe Oculamp testés pour travailler concentré sans fatigue visuelle.",
        "aimant": "lumiere",
        "douleur_titre": "Vos yeux tirent avant la fin de la journée ?",
        "douleur": "Yeux secs, maux de tête à 16 h, endormissement difficile après une soirée sur l'ordinateur : quand on travaille sur écran toute la journée, la fatigue visuelle finit par coûter de la concentration… et du sommeil.\nCe rayon rassemble peu de produits, choisis pour une raison précise : filtres d'écran, lunettes de jour et du soir, lumière réglable. Commencez par notre guide gratuit pour savoir ce qui vous sert vraiment (et ce qui ne sert à rien).",
        "faq": [
            {"q": "Un filtre anti lumière bleue est-il utile si j'active déjà le mode nuit ?", "r": "Le mode nuit réchauffe les couleurs le soir, mais il est souvent désactivé en journée et n'agit pas sur tous les écrans. Le filtre physique agit en permanence, sans fausser fortement les couleurs pour le travail de bureau."},
            {"q": "Lunettes ou filtre d'écran : que choisir ?", "r": "Le filtre si vous travaillez surtout sur un seul poste ; les lunettes si vous changez souvent d'écran (ordinateur, téléphone, tablette) ou travaillez en déplacement."},
            {"q": "Les lunettes amber se portent-elles en journée ?", "r": "Non : leurs verres teintés sont faits pour le soir, 1 à 2 heures avant le coucher. Pour la journée, préférez des verres quasi transparents."},
            {"q": "Ces produits remplacent-ils un rendez-vous chez l'ophtalmologiste ?", "r": "Non. Si vos symptômes persistent malgré de bons réglages et des pauses régulières, consultez un professionnel de la vue."},
        ],
    },
    "ame": {
        "titre": "Focus, calme et sommeil pour entrepreneurs | Zayado",
        "desc": "Tête qui tourne à 23 h ? Carnet de cap 90 jours, lampe de concentration et masque lesté pour retrouver focus le jour et calme le soir.",
        "aimant": "rituel",
        "douleur_titre": "Trop de choses dans la tête, pas assez dans l'agenda ?",
        "douleur": "Quand on porte seul·e son entreprise, la charge mentale ne s'arrête pas à 18 h. Les idées, les relances et les promesses faites aux clients reviennent au moment de dormir.\nIci, des objets simples qui aident à poser un cap, protéger sa concentration et déconnecter vraiment le soir. Et pour démarrer, notre rituel anti-surcharge en 7 jours, offert.",
        "faq": [
            {"q": "Comment ce rayon aide-t-il à réduire la charge mentale ?", "r": "En sortant les décisions de la tête (carnet de cap), en protégeant les heures de concentration (lumière adaptée) et en améliorant la récupération du soir (masque, lunettes du soir)."},
            {"q": "À quoi sert le carnet « Mon cap 90 jours » ?", "r": "À fixer un objectif trimestriel, le découper en semaines et noter chaque jour une seule priorité. C'est la méthode de notre rituel anti-surcharge, sur papier."},
            {"q": "Le masque de sommeil lesté convient-il à tout le monde ?", "r": "Il convient à la plupart des adultes. Sa légère pression aide de nombreuses personnes à se détendre ; retirez-le si vous ressentez une gêne."},
        ],
    },
    "corps": {
        "titre": "Ergonomie et récupération au bureau | Zayado",
        "desc": "Dos raide, énergie en baisse à 15 h ? Fauteuil ergonomique et objets de récupération choisis pour tenir la distance quand on travaille assis.",
        "aimant": "rituel",
        "douleur_titre": "Votre dos vous rappelle chaque soir que vous avez trop travaillé ?",
        "douleur": "Huit heures assis, des pauses qui sautent, la récupération repoussée au week-end : le corps encaisse, jusqu'au jour où il ne suit plus.\nCe rayon réunit l'essentiel pour un poste qui soutient l'effort (fauteuil ergonomique) et des moments de récupération qui comptent vraiment.",
        "faq": [
            {"q": "Comment bien régler un fauteuil ergonomique ?", "r": "Pieds à plat, genoux à angle droit, bas du dos appuyé, accoudoirs à hauteur du bureau et haut de l'écran à hauteur des yeux."},
            {"q": "Un bon fauteuil suffit-il contre le mal de dos ?", "r": "Il aide beaucoup, mais rien ne remplace le mouvement : levez-vous au moins toutes les heures. En cas de douleur persistante, consultez un professionnel de santé."},
            {"q": "Livrez-vous les meubles partout en France ?", "r": "Oui, en France métropolitaine. Le délai est indiqué sur chaque fiche produit."},
        ],
    },
    "espace-organisation": {
        "titre": "Organisation du bureau et cadeaux d'équipe | Zayado",
        "desc": "Un espace de travail qui structure la journée et des box cadeaux d'entreprise pour remercier votre équipe ou vos clients, sans perdre de temps.",
        "aimant": "tresorerie",
        "douleur_titre": "Votre bureau ressemble à votre to-do list ?",
        "douleur": "Un espace encombré, c'est un cerveau qui cherche en permanence. Et quand l'équipe grandit, il faut aussi savoir remercier, sans y passer des heures.\nIci : de quoi structurer votre espace de travail, et des box prêtes à offrir à vos collaborateurs ou clients.",
        "faq": [
            {"q": "Peut-on personnaliser la box équipe ?", "r": "Oui, un message personnalisé peut être ajouté. Pour une commande de plus de 10 box, contactez-nous pour une offre adaptée."},
            {"q": "Les cadeaux d'entreprise sont-ils déductibles ?", "r": "En France, les cadeaux de faible valeur offerts dans l'intérêt de l'entreprise sont généralement déductibles. Vérifiez les plafonds en vigueur avec votre expert-comptable."},
            {"q": "Livrez-vous à plusieurs adresses ?", "r": "Oui, sur demande pour les commandes groupées : écrivez-nous avec la liste des adresses."},
        ],
    },
    "rituel-confort": {
        "titre": "Box et rituels bien-être pour entrepreneurs | Zayado",
        "desc": "Des journées qui n'ont plus de fin ? Box entrepreneur apaisé, tasse rituelle et thé signature pour recréer des pauses qui rechargent vraiment.",
        "aimant": "rituel",
        "douleur_titre": "Vos journées n'ont plus ni début ni fin ?",
        "douleur": "Le café avalé devant les mails, le déjeuner sur le clavier, l'ordinateur rouvert à 22 h. Sans rituel, la journée de travail déborde sur tout le reste.\nCes box et objets sont là pour marquer des pauses qui comptent : un vrai début, une vraie coupure, une vraie fin de journée. Notre rituel en 7 jours, offert, vous montre comment les installer.",
        "faq": [
            {"q": "Que contient la box entrepreneur apaisé ?", "r": "Le détail exact est sur la fiche produit : des objets de pause et de récupération, choisis pour s'utiliser au quotidien, pas pour décorer un tiroir."},
            {"q": "Peut-on l'offrir directement à quelqu'un ?", "r": "Oui : indiquez l'adresse du destinataire à la commande et ajoutez un message, aucun prix n'apparaît dans le colis."},
            {"q": "Combien de temps pour installer un rituel ?", "r": "Notre guide propose 15 minutes par jour pendant 7 jours. Ensuite, vous gardez les 2 habitudes qui ont le plus changé votre semaine."},
        ],
    },
    "promos": {
        "titre": "Promos bien-être et bureau pour entrepreneurs | Zayado",
        "desc": "Les offres du moment de la boutique Zayado : objets de concentration, ergonomie et rituels, sans fausse urgence ni prix gonflés.",
        "aimant": "lumiere",
        "douleur_titre": "Bien s'équiper sans exploser le budget",
        "douleur": "Quand la trésorerie est serrée, l'équipement passe toujours en dernier. Ici, les offres du moment, sans compte à rebours ni prix barré gonflé : juste de vraies remises sur des produits utiles.",
        "faq": [
            {"q": "Les promotions sont-elles cumulables ?", "r": "Sauf mention contraire, une seule remise s'applique par commande."},
            {"q": "Pourquoi cette page est-elle parfois vide ?", "r": "Nous ne faisons des promotions que lorsqu'elles sont réelles. Inscrivez-vous pour être prévenu·e de la prochaine."},
        ],
    },
    "outils-ia": {
        "titre": "Copilote IA de pilotage pour TPE et indépendants | Zayado",
        "desc": "Trésorerie, prospects et plan d'action au même endroit : le copilote Zayado lit votre relevé bancaire et vous dit quoi faire cette semaine.",
        "aimant": "tresorerie",
        "douleur_titre": "Vous pilotez au solde bancaire et à l'instinct ?",
        "douleur": "Le solde monte, vous respirez ; il baisse, vous ne dormez plus. La plupart des indépendants n'ont aucun tableau de bord : ni marge réelle, ni mois d'autonomie, ni liste de prospects à appeler cette semaine.\nLe copilote Zayado rassemble vos chiffres, vos futurs clients et un plan daté, expliqués simplement. Commencez par le check-up trésorerie gratuit, puis faites votre diagnostic.",
        "body": "<p>Le copilote Zayado aide les indépendants et les dirigeants de TPE à piloter leur activité : trésorerie et mois d'autonomie calculés depuis le relevé bancaire, Radar de prospects locaux, plan d'action daté et assistant IA qui connaît votre projet. Sans engagement, paiement sécurisé par Mollie.</p>",
        "faq": [
            {"q": "Dois-je donner mes identifiants bancaires ?", "r": "Jamais. Vous importez simplement le relevé ou le fichier exporté depuis votre banque ou votre logiciel comptable."},
            {"q": "Quelle formule choisir ?", "r": "Solo pour démarrer seul·e, Pro pour le Radar de prospects et l'IA avancée, Équipe pour 3 personnes. Toutes sont sans engagement."},
            {"q": "Le copilote remplace-t-il mon expert-comptable ?", "r": "Non : il vous aide à piloter au quotidien. Votre expert-comptable reste votre référence pour la comptabilité et la fiscalité."},
            {"q": "Puis-je arrêter à tout moment ?", "r": "Oui, depuis votre espace, en un clic."},
        ],
    },
    "accompagnement": {
        "titre": "Accompagnement clarté financière pour TPE | Zayado",
        "desc": "Besoin d'y voir clair vite ? Kit Diagnostic Flash et accompagnement clarté financière par des experts sélectionnés, pour indépendants et TPE.",
        "aimant": "tresorerie",
        "douleur_titre": "Vous sentez que quelque chose cloche, sans savoir quoi ?",
        "douleur": "Le chiffre d'affaires est là, mais l'argent manque à la fin du mois. Vous avez besoin d'un regard extérieur, sans vous engager dans un cabinet pour un an.\nNos accompagnements sont courts, concrets et menés par des experts sélectionnés : un diagnostic, des chiffres expliqués, un plan d'action.",
        "body": "<p>Accompagnements courts pour indépendants et TPE : Kit Diagnostic Flash pour savoir où en est vraiment votre entreprise, et accompagnement clarté financière avec un expert sélectionné par Zayado.</p>",
        "faq": [
            {"q": "Que contient le Kit Diagnostic Flash ?", "r": "Une analyse de vos chiffres à partir de vos fichiers, les indicateurs clés expliqués (marge, trésorerie, autonomie) et les 3 premières actions à mener."},
            {"q": "Qui sont les experts ?", "r": "Des professionnels indépendants sélectionnés par Zayado pour leur expérience auprès des TPE."},
            {"q": "Comment se passe le paiement ?", "r": "Dans votre espace Zayado, de façon sécurisée par Mollie."},
        ],
    },
    "rachat-reprise": {
        "titre": "Reprendre une entreprise sans apport | Zayado",
        "desc": "Racheter une entreprise qui tourne plutôt que créer de zéro, même sans gros apport : méthode, financement et accompagnement pas à pas.",
        "aimant": "tresorerie",
        "douleur_titre": "Créer de zéro vous fait peur, mais vous voulez être à votre compte ?",
        "douleur": "Partir d'une page blanche, c'est souvent deux à trois ans avant de se payer correctement. Reprendre une entreprise qui a déjà des clients, c'est démarrer avec du chiffre d'affaires dès le premier jour.\nNous vous montrons comment repérer une cible saine, la financer avec peu d'apport et éviter les pièges de la reprise.",
        "body": "<p>La reprise d'entreprise permet de démarrer avec des clients, une équipe et du chiffre d'affaires. Zayado accompagne les repreneurs : recherche de cible, lecture des comptes, montage du financement, même avec un apport limité.</p>",
        "faq": [
            {"q": "Peut-on vraiment reprendre une entreprise sans apport ?", "r": "Avec un apport très limité, oui, en combinant prêt bancaire, crédit vendeur et prêts d'honneur. Chaque dossier est différent : la solidité de la cible compte autant que votre apport."},
            {"q": "Combien de temps dure une reprise ?", "r": "Comptez généralement 6 à 18 mois entre le début de la recherche et la signature."},
            {"q": "Quels chiffres regarder en premier ?", "r": "La rentabilité réelle (résultat retraité), la trésorerie, la dépendance à quelques clients et la capacité de l'entreprise à rembourser l'emprunt de reprise."},
        ],
    },
    "produits": {
        "titre": "Boutique bien-être et bureau pour entrepreneurs | Zayado",
        "desc": "Concentration visuelle, ergonomie, box et carnets : une sélection courte et testée pour mieux travailler et mieux vivre quand on entreprend.",
        "aimant": "lumiere",
        "douleur_titre": "Vous travaillez beaucoup. Votre équipement suit-il ?",
        "douleur": "Écran qui fatigue les yeux, chaise qui fatigue le dos, journées sans pause : ce sont rarement de grandes décisions qui épuisent, mais de petits inconforts répétés 220 jours par an.\nNotre boutique est courte exprès : chaque produit répond à un inconfort précis de l'entrepreneur, et nous l'avons testé.",
        "body": "<p>La boutique Zayado sélectionne peu de produits, tous testés, pour les entrepreneurs qui travaillent beaucoup : concentration visuelle (filtres et lunettes Ocushield), ergonomie, carnets de cap, box et rituels de pause.</p>",
        "faq": [
            {"q": "Où se passe le paiement ?", "r": "Dans votre espace Zayado, de façon sécurisée par Mollie. Vous y suivez ensuite votre commande."},
            {"q": "Quels sont les délais de livraison ?", "r": "Ils sont indiqués sur chaque fiche produit et varient selon le vendeur partenaire."},
            {"q": "Puis-je retourner un produit ?", "r": "Oui, sous 14 jours après réception, conformément au droit de rétractation."},
        ],
    },
}

SET = """mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { userErrors { field message } } }"""


def main():
    I.jeton()
    cols = {c["handle"]: c for c in I._lister_tout("/smart_collections.json", "smart_collections")}
    for handle, s in SEO.items():
        c = cols.get(handle)
        if not c:
            print(f"  ⚠ collection absente : {handle}")
            continue
        gid = f"gid://shopify/Collection/{c['id']}"
        champs = [
            ("global", "title_tag", "single_line_text_field", s["titre"]),
            ("global", "description_tag", "multi_line_text_field", s["desc"]),
            ("zayado", "douleur_titre", "single_line_text_field", s["douleur_titre"]),
            ("zayado", "douleur", "multi_line_text_field", s["douleur"]),
            ("zayado", "aimant", "single_line_text_field", s["aimant"]),
            ("zayado", "faq", "json", json.dumps(s["faq"], ensure_ascii=False)),
        ]
        r = I.gql(SET, {"m": [{"ownerId": gid, "namespace": n, "key": k, "type": t, "value": v} for n, k, t, v in champs]})
        err = r.get("errors") or r["data"]["metafieldsSet"]["userErrors"]
        if s.get("body") and not c.get("body_html"):
            I._req("PUT", f"/smart_collections/{c['id']}.json", {"smart_collection": {"id": c["id"], "body_html": s["body"]}})
        print(f"  {'✗' if err else '✔'} {handle} {err or ''}")


if __name__ == "__main__":
    main()
