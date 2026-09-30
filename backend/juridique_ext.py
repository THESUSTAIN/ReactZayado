"""Support juridique du Copilote (façon Kandbaz) — fonctions pures.

Détection des questions de droit, sources officielles cliquables par pays
(France/Belgique → service-public & Légifrance ; Afrique francophone → OHADA),
prompt structuré et réponse locale de repli. Branché dans /copilote/chat
(server.py) — aucune nouvelle dépendance.

Avertissement CGU (fourni par l'utilisateur, CGU_IA_juridique_20241014.pdf) :
l'IA juridique donne des informations GÉNÉRALES, ne constitue pas une
consultation juridique et ne se substitue pas à un professionnel du droit.
"""

MENTION_CGU = ("IA juridique : informations générales, qui ne constituent pas une consultation "
               "juridique et peuvent être inexactes. En cas de doute, rapproche-toi d'un "
               "professionnel du droit (avocat, notaire).")

# Mots déclencheurs (forts, pour éviter les faux positifs du quotidien).
_MOTS_JURIDIQUE = (
    "juridique", "légale", "legale", "contrat", "litige", "avocat", "notaire", "tribunal",
    "mise en demeure", "impayé", "impayee", "tva", "urssaf", "cotisation", "charges sociales",
    "bail", "licenci", "prud'hom", "rgpd", "données personnelles", "cnil",
    "statut juridique", "sasu", "eurl", "sarl", "micro-entreprise", "auto-entrepreneur",
    "immatricul", "cgv", "propriété intellectuelle", "droit d'auteur", "dépôt de marque",
    "fiscal", "impôt", "ohada", "code civil", "code du travail", "loi", "droit",
)

# (clé de thème, mots-clés, sources France/Belgique, sources OHADA)
_LEGIFRANCE = {"titre": "Légifrance — les codes et lois en vigueur", "url": "https://www.legifrance.gouv.fr", "organisme": "legifrance.gouv.fr"}
_ENTREPRENDRE = {"titre": "Entreprendre — fiches officielles pour les indépendants", "url": "https://entreprendre.service-public.fr", "organisme": "service-public.fr"}
_OHADA_ORG = {"titre": "OHADA — organisation et textes officiels", "url": "https://www.ohada.org", "organisme": "ohada.org"}
_OHADA_ACTES = {"titre": "OHADA — les Actes uniformes commentés", "url": "https://www.ohada.com/actes-uniformes/", "organisme": "ohada.com"}

_THEMES = [
    ("tva", ("tva", "taxe sur la valeur"),
     [{"titre": "TVA — règles et taux pour les professionnels", "url": "https://www.impots.gouv.fr/professionnel/la-tva", "organisme": "impots.gouv.fr"},
      {"titre": "Franchise de TVA en micro-entreprise", "url": "https://entreprendre.service-public.fr/vosdroits/F21746", "organisme": "service-public.fr"}],
     [_OHADA_ACTES, _OHADA_ORG]),
    ("cotisations", ("urssaf", "cotisation", "charges sociales"),
     [{"titre": "URSSAF — cotisations des indépendants", "url": "https://www.urssaf.fr", "organisme": "urssaf.fr"},
      _ENTREPRENDRE],
     [_OHADA_ACTES, _OHADA_ORG]),
    ("contrat", ("contrat", "litige", "mise en demeure", "impayé", "impayee", "clause", "cgv"),
     [{"titre": "Code civil — contrats et obligations (Légifrance)", "url": "https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006070721/", "organisme": "legifrance.gouv.fr"},
      _ENTREPRENDRE],
     [{"titre": "AUSCGIE — droit des sociétés commerciales OHADA", "url": "https://www.ohada.com/actes-uniformes/", "organisme": "ohada.com"}, _OHADA_ORG]),
    ("creation", ("statut juridique", "sasu", "eurl", "sarl", "micro-entreprise", "auto-entrepreneur", "immatricul", "créer mon entreprise", "création d'entreprise"),
     [{"titre": "Guichet unique de l'INPI — formalités d'entreprise", "url": "https://procedures.inpi.gouv.fr", "organisme": "inpi.gouv.fr"},
      _ENTREPRENDRE],
     [{"titre": "AUSCGIE — créer sa société en zone OHADA", "url": "https://www.ohada.com/actes-uniformes/", "organisme": "ohada.com"}, _OHADA_ORG]),
    ("rgpd", ("rgpd", "données personnelles", "cnil"),
     [{"titre": "CNIL — le RGPD en pratique", "url": "https://www.cnil.fr/fr/reglement-europeen-protection-donnees", "organisme": "cnil.fr"},
      _LEGIFRANCE],
     [_OHADA_ACTES, _OHADA_ORG]),
    ("travail", ("licenci", "prud'hom", "code du travail", "salarié", "embauche"),
     [{"titre": "Code du travail (Légifrance)", "url": "https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006072050/", "organisme": "legifrance.gouv.fr"},
      {"titre": "Service-public — droit du travail", "url": "https://www.service-public.fr/particuliers/vosdroits/N19806", "organisme": "service-public.fr"}],
     [_OHADA_ACTES, _OHADA_ORG]),
    ("bail", ("bail", "loyer", "locataire", "propriétaire"),
     [{"titre": "Service-public — logement et baux", "url": "https://www.service-public.fr/particuliers/vosdroits/N19804", "organisme": "service-public.fr"},
      _LEGIFRANCE],
     [_OHADA_ACTES, _OHADA_ORG]),
    ("propriete", ("propriété intellectuelle", "droit d'auteur", "dépôt de marque", "marque"),
     [{"titre": "INPI — marques, brevets et droits d'auteur", "url": "https://www.inpi.fr", "organisme": "inpi.fr"},
      _LEGIFRANCE],
     [_OHADA_ACTES, _OHADA_ORG]),
    ("fiscal", ("fiscal", "impôt", "impots", "déclaration de revenus"),
     [{"titre": "impots.gouv.fr — espace professionnel", "url": "https://www.impots.gouv.fr/professionnel", "organisme": "impots.gouv.fr"},
      _ENTREPRENDRE],
     [_OHADA_ACTES, _OHADA_ORG]),
]

# Les 17 États membres de l'OHADA (clés utilisées par la liste des pays de l'onboarding).
_MARCHES_OHADA = ("senegal", "cote_ivoire", "cameroun", "congo_rdc", "benin", "burkina_faso", "centrafrique", "comores",
                  "congo", "gabon", "guinee", "guinee_bissau", "guinee_equatoriale", "mali", "niger", "tchad", "togo")
# Pays où les sources françaises (Légifrance, service-public…) s'appliquent.
_MARCHES_DROIT_FR = ("france",)


def est_question_juridique(message: str) -> bool:
    bas = f" {message.lower()} "
    return any(m in bas for m in _MOTS_JURIDIQUE)


def sources_pour(message: str, marche: str) -> list:
    """2 sources du thème détecté + 1 source de référence du pays (max 3)."""
    bas = message.lower()
    ohada = marche in _MARCHES_OHADA
    if not ohada and marche not in _MARCHES_DROIT_FR and marche:
        # Autre pays (Belgique, Italie, Royaume-Uni, Maroc…) : pas de sources françaises trompeuses.
        return []
    idx = 2 if ohada else 1  # colonne sources du tuple
    for _cle, mots, fr, oh in _THEMES:
        if any(m in bas for m in mots):
            sources = list(oh if ohada else fr)
            break
    else:
        sources = [_OHADA_ACTES] if ohada else [_ENTREPRENDRE]
    reference = _OHADA_ORG if ohada else _LEGIFRANCE
    if all(s["url"] != reference["url"] for s in sources):
        sources.append(reference)
    return sources[:3]


def prompt_juridique(pays_label: str) -> str:
    return (
        "Mode JURIDIQUE (question de droit détectée) :\n"
        "- Structure ta réponse en 4 parties numérotées et titrées :\n"
        "  « 1. Les règles de droit applicables » — cite les textes (code, loi, article) ; "
        "n'invente JAMAIS un numéro d'article dont tu n'es pas sûre, dis alors « à vérifier ».\n"
        "  « 2. Application à ta situation » — relie les règles aux faits donnés ; s'il manque "
        "des éléments (faits, dates, documents), dis ce qu'il faudrait préciser.\n"
        "  « 3. Limites et incertitudes » — ce qui dépend du juge, du contrat exact ou du pays.\n"
        "  « 4. En résumé » — une conclusion synthétique et actionnable.\n"
        f"- Cite le droit applicable en {pays_label}.\n"
        "- Termine par cette phrase exacte : « Ces informations sont générales et ne remplacent "
        "pas une consultation d'un professionnel du droit (avocat, notaire). »\n"
        "- Des liens officiels seront joints automatiquement sous ta réponse : ne répète pas les URL."
    )


def repli_juridique() -> str:
    return (
        "Voici comment structurer ta question juridique :\n\n"
        "1. Les règles de droit applicables — je n'ai pas pu joindre le modèle pour les détailler, "
        "mais les sources officielles jointes ci-dessous couvrent ce thème.\n"
        "2. Application à ta situation — note les faits utiles, les dates importantes et les "
        "documents concernés (contrat, courrier, décision, mise en demeure…).\n"
        "3. Limites — sans ces éléments, je reste volontairement général.\n"
        "4. En résumé — lis la source officielle jointe, puis repose-moi ta question avec ces "
        "détails ; je te répondrai de façon structurée.\n\n"
        "Ces informations sont générales et ne remplacent pas une consultation d'un professionnel "
        "du droit. (Réponse locale de repli.)"
    )
