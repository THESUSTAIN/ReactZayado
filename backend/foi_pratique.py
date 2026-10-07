"""Ma Foi et Bien-être : une seule pratique, une seule série, un seul carnet.

POURQUOI ce fichier existe
--------------------------
Pour un utilisateur chrétien qui avait activé Ma Foi, Zayado tenait DEUX
comptabilités de la même discipline : une « carte du jour » dans Bien-être et une
« pause du jour » dans Ma Foi, deux parcours de 7 jours, deux carnets, et deux
séries de jours consécutifs (celle du compte, calculée par le serveur, et celle
du mode jeu de la Mémoire, calculée dans le navigateur). Résultat : une appli qui
promet de « construire sans s'épuiser » réclamait deux rituels quotidiens, et
cocher l'un ne faisait pas avancer l'autre.

Ce module donne au serveur le peu qu'il lui manquait pour arbitrer :
- le nom des parcours bibliques de Ma Foi (leur contenu, lui, reste dans
  frontend/src/features/thesustain/thesustainData.js : le serveur n'a besoin que
  de leur identité pour dire « un seul parcours à la fois ») ;
- la liste des gestes quotidiens de Ma Foi qui valent « pratique du jour faite »,
  avec le libellé sous lequel ils apparaîtront dans le carnet unique.
"""

# Les 5 parcours bibliques de Ma Foi (ids figés côté navigateur).
PARCOURS_FOI = {
    "integrite": {"titre": "Entreprendre avec intégrité", "jours": 7},
    "activite-en-panne": {"titre": "Quand l'activité ne fonctionne plus", "jours": 7},
    "argent": {"titre": "Argent et responsabilité", "jours": 7},
    "diriger": {"titre": "Diriger sans s'épuiser", "jours": 7},
    "vocation": {"titre": "Trouver sa vocation", "jours": 7},
}

# Gestes de Ma Foi qui comptent comme la pratique du jour. Le titre et les
# questions sont décidés ICI (jamais envoyés par le navigateur) : le carnet reste
# lisible et personne ne peut y écrire n'importe quel intitulé.
GESTES_FOI = {
    "pause": {"titre": "Ma Foi · Pause du jour", "questions": ["Dans mon activité"]},
    "memoire": {"titre": "Ma Foi · Un verset travaillé par cœur", "questions": ["Le verset"]},
    "decision": {"titre": "Ma Foi · Une décision discernée",
                 "questions": ["La décision", "Pourquoi", "Mes craintes", "Ce que je remets", "À réévaluer le"]},
    "priere": {"titre": "Ma Foi · Une intention de prière", "questions": ["Mon intention"]},
}


def ref_geste(genre: str) -> str:
    return f"geste:{genre}"


def ref_jour_parcours(pid: str, n: int) -> str:
    return f"parcours:{pid}:{n}"


def normaliser_progress(brut) -> dict:
    """La progression des parcours de Ma Foi est écrite par le navigateur dans la
    table générique foi_etat : on ne lui fait pas confiance aveuglément."""
    sortie = {}
    if not isinstance(brut, dict):
        return sortie
    for pid, jours in brut.items():
        if pid not in PARCOURS_FOI or not isinstance(jours, list):
            continue
        maxi = PARCOURS_FOI[pid]["jours"]
        sortie[pid] = sorted({n for n in jours if isinstance(n, int) and 1 <= n <= maxi})
    return sortie


def parcours_foi_en_cours(progress: dict) -> dict | None:
    """Le parcours biblique commencé mais pas terminé, s'il y en a un."""
    for pid, jours in normaliser_progress(progress).items():
        meta = PARCOURS_FOI[pid]
        if 0 < len(jours) < meta["jours"]:
            return {"id": pid, "titre": meta["titre"], "jours_faits": jours, "total": meta["jours"]}
    return None


def descripteur_parcours_foi(pf: dict, derniere_date: str | None = None, aujourd: str | None = None) -> dict:
    """Même forme que les parcours du serveur (_suivi_json) pour que Bien-être
    puisse afficher le parcours de Ma Foi sans code à part — avec source="foi"
    pour renvoyer vers la bonne page plutôt que de proposer un second parcours."""
    faits = pf["jours_faits"]
    prochain = next((n for n in range(1, pf["total"] + 1) if n not in faits), None)
    return {"source": "foi", "id": pf["id"], "titre": pf["titre"], "sous_titre": "Parcours biblique · Ma Foi",
            "pour_qui": "", "couleur": "#C9A227", "demarre": True, "jours_faits": faits,
            "prochain_jour": prochain, "jour_disponible": prochain is not None and derniere_date != aujourd,
            "termine": prochain is None,
            "jours": [{"n": n, "titre": f"Jour {n}"} for n in range(1, pf["total"] + 1)]}
