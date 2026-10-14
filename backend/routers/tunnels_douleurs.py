"""Modèles de tunnel « par douleur client » : l'utilisateur choisit la douleur de SES clients,
le tunnel (4 pages + option) est rédigé autour de cette douleur.

GET /api/copilote/tunnels-douleurs → liste des modèles (clé, douleur, promesse, parcours, option)
La création passe par POST /api/copilote/tunnels avec `douleur` = clé (cf. routers/copilote.creer_tunnel).
Placeholders : {s} = sujet du tunnel.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from models.copilote import Parcours, TypeUpsell

router = APIRouter()  # monté sous /copilote


class ModeleDouleur(BaseModel):
    cle: str
    douleur: str
    promesse: str
    parcours: Parcours
    type_upsell: TypeUpsell


# cle: (douleur, promesse, parcours, upsell, [capture, remerciement, vente, upsell] → (titre, accroche, contenu, bouton, offre_nom))
_MODELES: dict[str, tuple] = {
    "temps": ("« Je n'ai pas le temps »", "Le résultat, sans y passer vos soirées", "produit", "delegation", [
        ("{s} en 15 minutes par semaine", "Vous manquez de temps, pas de volonté. Voici la méthode courte qui tient dans un agenda chargé.",
         "Recevez la check-list « 15 minutes » par e-mail : uniquement les gestes qui comptent, dans l'ordre.", "Recevoir la check-list", "Check-list 15 minutes"),
        ("C'est envoyé. Gagnez encore plus de temps", "La check-list arrive. Si vous voulez aller deux fois plus vite, prenez le kit prêt à l'emploi.",
         "Modèles déjà remplis, à copier-coller : vous gagnez les heures de préparation.", "Je prends le kit", "Kit prêt à l'emploi"),
        ("{s} : on s'occupe de l'essentiel", "Vous gardez la main, on vous libère de l'exécution.",
         "• Un démarrage cadré en une séance\n• Les tâches répétitives prises en charge\n• Un point court chaque semaine\nPour ceux qui veulent le résultat sans sacrifier leurs soirées.", "Je libère mon temps", "Offre principale"),
        ("Et si on le faisait pour vous ?", "Votre commande est confirmée. Une dernière option pour ne plus rien avoir à gérer.",
         "Nous réalisons entièrement la mise en place : vous validez, c'est tout.", "Oui, faites-le pour moi", "On le fait pour vous"),
    ]),
    "prix": ("« C'est trop cher pour moi »", "Commencer petit, voir le résultat, puis investir", "produit", "complementarite", [
        ("{s} : commencez sans risque", "Pas besoin d'investir gros pour voir si ça marche pour vous.",
         "Le guide gratuit vous montre le premier résultat atteignable cette semaine, avec ce que vous avez déjà.", "Recevoir le guide gratuit", "Guide gratuit"),
        ("Votre premier pas à petit prix", "Le guide arrive. Pour le prix d'un déjeuner, passez de la théorie à l'action.",
         "Une offre de démarrage à prix doux, remboursée si elle ne vous sert pas.", "Je commence à petit prix", "Offre de démarrage"),
        ("{s} : un investissement qui se rembourse", "Le calcul est simple : ce que vous gagnez dépasse ce que vous payez.",
         "• Ce que ça vous coûte de ne rien changer, chiffré\n• Le résultat attendu et le délai\n• Paiement en plusieurs fois possible\nGarantie : satisfait ou remboursé.", "Je fais le calcul avec vous", "Offre principale"),
        ("Un complément utile", "Votre commande est confirmée. Cet outil prolonge le résultat, à prix réduit maintenant seulement.",
         "Le kit complémentaire pour aller plus loin, sans repartir de zéro.", "J'ajoute le complément", "Complément"),
    ]),
    "peur": ("« J'ai peur de me tromper »", "Décider en confiance, preuves à l'appui", "rendez_vous", "acceleration", [
        ("{s} : les 5 erreurs qui coûtent cher", "Avant de choisir, sachez ce qui fait échouer la plupart des gens.",
         "Recevez le guide des 5 erreurs et comment les éviter, avec des exemples concrets.", "Éviter ces erreurs", "Guide des 5 erreurs"),
        ("Parlons de votre situation, sans engagement", "Le guide arrive. Un échange de 20 minutes vaut mieux que des semaines de doute.",
         "Nous regardons votre cas, vous repartez avec une recommandation claire — même si ce n'est pas nous.", "Réserver mon échange", "Échange découverte"),
        ("{s} : avancez sans prendre de risque", "Un cadre clair, des étapes validées avec vous, une garantie.",
         "• Un diagnostic avant tout engagement\n• Un plan validé ensemble\n• Des témoignages de clients dans votre cas\n• Garantie de résultat ou remboursement", "Je me lance en confiance", "Accompagnement"),
        ("Avancer plus vite, en sécurité", "Votre rendez-vous est confirmé. Option : une séance express pour poser les bases dès cette semaine.",
         "Une séance intensive pour sécuriser vos premières décisions.", "J'ajoute la séance express", "Séance express"),
    ]),
    "resultats": ("« J'ai déjà essayé, ça n'a pas marché »", "Une méthode différente, des résultats mesurés", "rendez_vous", "acceleration", [
        ("Pourquoi {s} n'a pas marché (et comment y arriver)", "Ce n'est pas vous : c'est la méthode. Voici ce qui change tout.",
         "Recevez l'analyse des 3 raisons d'échec les plus fréquentes et la méthode qui les contourne.", "Comprendre ce qui bloque", "Analyse gratuite"),
        ("Faisons le point sur ce que vous avez essayé", "L'analyse arrive. En 30 minutes, nous identifions ce qui a coincé chez vous.",
         "Vous repartez avec le blocage identifié et la prochaine action concrète.", "Réserver mon bilan", "Bilan offert"),
        ("{s} : des résultats suivis chaque semaine", "Fini les promesses : des indicateurs simples, suivis ensemble.",
         "• Un objectif chiffré dès le départ\n• Un suivi hebdomadaire des résultats\n• Des ajustements rapides si ça ne bouge pas\nPour ceux qui veulent enfin voir la différence.", "Je veux des résultats", "Programme de résultats"),
        ("Accélérer les premiers résultats", "C'est confirmé. Option : un sprint de démarrage pour un premier résultat en 14 jours.",
         "Deux semaines d'accompagnement rapproché pour enclencher la dynamique.", "J'ajoute le sprint", "Sprint 14 jours"),
    ]),
    "debordement": ("« Je suis débordé·e, je n'y arrive plus »", "Retrouver de l'air et reprendre le contrôle", "produit", "delegation", [
        ("Débordé·e par {s} ? Respirez.", "Vous n'avez pas besoin d'en faire plus, mais de faire moins et mieux.",
         "Recevez la méthode « 3 priorités » pour alléger votre semaine dès lundi.", "Recevoir la méthode", "Méthode 3 priorités"),
        ("Allégez votre semaine maintenant", "La méthode arrive. Le planificateur prêt à remplir vous fait gagner du temps dès aujourd'hui.",
         "Un outil simple pour trier, déléguer et dire non sans culpabiliser.", "Je prends le planificateur", "Planificateur"),
        ("{s} : reprenez le contrôle", "On remet de l'ordre avec vous, pas à pas.",
         "• Ce qui peut être supprimé, délégué, automatisé\n• Une organisation qui tient dans la durée\n• Un soutien quand ça déborde\nPour retrouver du temps pour vous.", "Je reprends le contrôle", "Offre principale"),
        ("On s'en charge pour vous", "Votre commande est confirmée. Option : nous prenons en charge la mise en place.",
         "Nous organisons, vous profitez du résultat.", "Oui, prenez-le en charge", "Mise en place faite pour vous"),
    ]),
    "commencer": ("« Je ne sais pas par où commencer »", "Un premier pas clair, puis un chemin balisé", "produit", "complementarite", [
        ("{s} : le plan de démarrage en 7 étapes", "Vous voulez avancer mais tout semble flou. Voici l'ordre exact à suivre.",
         "Recevez le plan de démarrage : 7 étapes simples, une par jour.", "Recevoir le plan", "Plan de démarrage"),
        ("Votre première étape, guidée", "Le plan arrive. Pour ne pas rester seul·e face à la première étape, prenez le kit guidé.",
         "Vidéos courtes et modèles pour réussir la première semaine.", "Je prends le kit guidé", "Kit guidé"),
        ("{s} : accompagné·e de A à Z", "Un chemin balisé, des étapes simples, quelqu'un pour répondre.",
         "• Le parcours complet, étape par étape\n• Des réponses à vos questions\n• Les outils prêts à l'emploi\nPour démarrer sans vous perdre.", "Je démarre accompagné·e", "Parcours complet"),
        ("Un outil pour aller plus loin", "C'est confirmé. Option : la boîte à outils complète, à prix réduit maintenant.",
         "Tous les modèles et checklists pour la suite.", "J'ajoute la boîte à outils", "Boîte à outils"),
    ]),
}


def modeles() -> list[ModeleDouleur]:
    return [ModeleDouleur(cle=k, douleur=v[0], promesse=v[1], parcours=v[2], type_upsell=v[3]) for k, v in _MODELES.items()]


def etapes_douleur(cle: str, sujet: str) -> tuple[list[dict], str, str] | None:
    """(étapes rédigées, parcours, type d'option) pour la douleur `cle`, ou None si inconnue."""
    m = _MODELES.get(cle)
    if not m:
        return None
    cles = ["capture", "remerciement", "vente", "upsell"]
    etapes = [{"cle": c, "titre": t.format(s=sujet), "accroche": a.format(s=sujet), "contenu": co.format(s=sujet),
               "bouton": b, "offre_nom": o, "prix": None} for c, (t, a, co, b, o) in zip(cles, m[4])]
    return etapes, m[2], m[3]


@router.get("/tunnels-douleurs", response_model=list[ModeleDouleur])
async def lister():
    return modeles()
