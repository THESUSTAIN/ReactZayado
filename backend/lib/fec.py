"""Lecture d'un fichier comptable — FEC d'abord, CSV/Excel simple en repli.

Rien n'est inventé : si une colonne manque, on refuse le fichier plutôt que de
deviner. La sortie est toujours la même forme, agrégée par mois, pour que le
routeur n'ait plus à connaître le format d'origine.

FEC officiel : colonnes JournalCode, EcritureNum, EcritureDate (AAAAMMJJ),
CompteNum, Debit, Credit — séparateur tabulation ou barre verticale.
Repli : un tableau avec une colonne de date et une colonne de montant signé
(positif = recette, négatif = dépense).
"""

from __future__ import annotations

import io
import re
import unicodedata
from datetime import date, datetime

import pandas as pd

MOIS_COURT = [
    "janv.", "févr.", "mars", "avr.", "mai", "juin",
    "juil.", "août", "sept.", "oct.", "nov.", "déc.",
]


class FichierIllisible(ValueError):
    """Le fichier n'est ni un FEC ni un tableau date + montant."""


def libelle_mois(cle: str) -> str:
    annee, mois = cle.split("-")
    return f"{MOIS_COURT[int(mois) - 1]} {annee[2:]}"


def nature_compte(compte: str) -> str:
    """Classe un compte du plan comptable général français."""
    c = re.sub(r"\D", "", str(compte))
    if c.startswith("70") or c.startswith(("71", "72", "74", "75", "76", "77")):
        return "produit"
    if c.startswith("60"):
        return "variable"      # achats et achats consommés → varient avec l'activité
    if c.startswith(("61", "62", "63", "64", "65", "66", "67", "68")):
        return "fixe"          # services, impôts, personnel, frais financiers
    if c.startswith(("512", "53", "514", "517")):
        return "tresorerie"
    return "autre"


def _nombre(valeur: object) -> float:
    """Montant tel qu'écrit par une banque ou un logiciel comptable : « 1 234,56 € », « 1.234,56 »,
    « −49,90 », « (120,00) », « 120,00- », « +3 000 ». Avant, tout ce qui n'était pas « 1234,56 »
    devenait 0 en silence (les relevés à séparateur de milliers perdaient leurs montants)."""
    if valeur is None:
        return 0.0
    if isinstance(valeur, (int, float)):
        return 0.0 if pd.isna(valeur) else float(valeur)
    texte = str(valeur).strip()
    for car in ("\u202f", "\u00a0", " ", "€", "EUR", "eur", "+", "'"):
        texte = texte.replace(car, "")
    texte = texte.replace("\u2212", "-").replace("\u2013", "-")
    if not texte or texte in {"-", "nan", "None"}:
        return 0.0
    negatif = False
    if texte.startswith("(") and texte.endswith(")"):
        negatif, texte = True, texte[1:-1]
    if texte.endswith("-"):
        negatif, texte = True, texte[:-1]
    if texte.startswith("-"):
        negatif, texte = True, texte[1:]
    if "," in texte and "." in texte:
        # Le séparateur le plus à droite est la décimale : « 1.234,56 » (fr) ou « 1,234.56 » (en).
        if texte.rfind(",") > texte.rfind("."):
            texte = texte.replace(".", "").replace(",", ".")
        else:
            texte = texte.replace(",", "")
    elif "," in texte:
        texte = texte.replace(",", ".") if texte.count(",") == 1 else texte.replace(",", "")
    elif texte.count(".") > 1:
        texte = texte.replace(".", "")
    try:
        n = float(texte)
    except ValueError:
        return 0.0
    return -n if negatif else n


def _cle(nom: object) -> str:
    """Nom de colonne comparable : sans accents, sans espaces ni ponctuation (« Date de l'opération » → dateoperation…)."""
    s = unicodedata.normalize("NFKD", str(nom)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]", "", s)


# Colonnes reconnues dans les relevés bancaires (BNP, Crédit Agricole, SG, LCL, CIC, Qonto, Shine…).
_DATES = ("dateoperation", "datedeloperation", "dateoperations", "date", "datecomptable", "settlementdate",
          "bookingdate", "transactiondate", "jour", "dateeffet", "datevaleur", "valuedate")


def _col_date(colonnes: dict[str, object]):
    for voulu in _DATES:
        for cle, col in colonnes.items():
            if cle == voulu or cle.startswith(voulu):
                return col
    return next((col for cle, col in colonnes.items() if "date" in cle), None)


def _col(colonnes: dict[str, object], prefixes: tuple[str, ...], exclure: tuple[str, ...] = ()):
    for cle, col in colonnes.items():
        if cle.startswith(prefixes) and not any(x in cle for x in exclure):
            return col
    return None


def _ressemble_entete(cellules: list[object]) -> bool:
    cles = [_cle(c) for c in cellules if str(c).strip() and str(c).lower() != "nan"]
    a_date = any("date" in c or c == "jour" for c in cles)
    a_montant = any(c.startswith(("montant", "amount", "valeur", "debit", "credit", "comptenum")) for c in cles)
    return a_date and a_montant


def _decoder(donnees: bytes) -> str:
    """UTF-8 d'abord ; sinon Windows-1252 (exports des banques françaises : « D\u00e9bit » devenait « D�bit »)."""
    try:
        texte = donnees.decode("utf-8")
    except UnicodeDecodeError:
        texte = donnees.decode("cp1252", errors="replace")
    return texte[1:] if texte.startswith("\ufeff") else texte


def _date(valeur: object) -> date | None:
    if isinstance(valeur, (datetime, pd.Timestamp)):
        return valeur.date()
    if isinstance(valeur, date):
        return valeur
    texte = re.sub(r"\s", "", str(valeur or ""))
    if not texte or texte.lower() == "nan":
        return None
    chiffres = re.sub(r"\D", "", texte)
    if len(chiffres) == 8:
        for forme in ("%Y%m%d", "%d%m%Y"):
            try:
                return datetime.strptime(chiffres, forme).date()
            except ValueError:
                continue
    for forme in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(texte, forme).date()
        except ValueError:
            continue
    return None


def _tableau(nom: str, donnees: bytes) -> pd.DataFrame:
    """Lit le tableau en sautant les lignes d'en-tête des banques (« Compte n°… », « Solde au… »)
    qui précèdent la vraie ligne de titres : avant, elles faisaient refuser tout le fichier."""
    if nom.lower().endswith((".xlsx", ".xls")):
        brut = pd.read_excel(io.BytesIO(donnees), dtype=str, header=None)
        for i in range(min(40, len(brut))):
            if _ressemble_entete(list(brut.iloc[i])):
                tableau = brut.iloc[i + 1:].reset_index(drop=True)
                tableau.columns = [str(c) for c in brut.iloc[i]]
                return tableau
        return pd.read_excel(io.BytesIO(donnees), dtype=str)

    lignes = _decoder(donnees).splitlines()
    separateurs = ["\t", "|", ";", ","]
    debut, separateur = 0, None
    for i, ligne in enumerate(lignes[:40]):
        sep = max(separateurs, key=ligne.count)
        if ligne.count(sep) and _ressemble_entete(next(iter(pd.read_csv(io.StringIO(ligne), sep=sep, header=None,
                                                                         dtype=str, engine="python").values), [])):
            debut, separateur = i, sep
            break
    if separateur is None:
        premiere = lignes[0] if lignes else ""
        separateur = max(separateurs, key=premiere.count)
        if premiere.count(separateur) == 0:
            raise FichierIllisible("Aucun séparateur de colonnes reconnu.")
    return pd.read_csv(io.StringIO("\n".join(lignes[debut:])), sep=separateur, dtype=str,
                       engine="python", on_bad_lines="skip")


def _mois_vide() -> dict[str, float]:
    return {"revenus": 0.0, "charges_fixes": 0.0, "charges_variables": 0.0, "ventes": 0.0}


def lire_fichier(nom: str, donnees: bytes) -> dict:
    """Renvoie {format, lignes, mois, tresorerie, periode_debut, periode_fin}."""
    tableau = _tableau(nom, donnees)
    colonnes = {_cle(c): c for c in tableau.columns}

    mois: dict[str, dict[str, float]] = {}
    tresorerie: float | None = None
    jours: list[date] = []
    lignes = 0

    est_fec = "comptenum" in colonnes and ("debit" in colonnes or "credit" in colonnes)

    if est_fec:
        col_date = colonnes.get("ecrituredate") or colonnes.get("datecomptable") or colonnes.get("date")
        if col_date is None:
            raise FichierIllisible("Colonne EcritureDate absente du FEC.")
        col_piece = colonnes.get("ecriturenum") or colonnes.get("piecref")
        solde_treso = 0.0
        ventes_par_mois: dict[str, set[str]] = {}

        for _, ligne in tableau.iterrows():
            jour = _date(ligne[col_date])
            if jour is None:
                continue
            debit = _nombre(ligne[colonnes["debit"]]) if "debit" in colonnes else 0.0
            credit = _nombre(ligne[colonnes["credit"]]) if "credit" in colonnes else 0.0
            nature = nature_compte(ligne[colonnes["comptenum"]])
            cle = f"{jour.year:04d}-{jour.month:02d}"
            seau = mois.setdefault(cle, _mois_vide())
            lignes += 1
            jours.append(jour)

            if nature == "produit":
                montant = credit - debit
                seau["revenus"] += montant
                if montant > 0 and col_piece is not None:
                    ventes_par_mois.setdefault(cle, set()).add(str(ligne[col_piece]))
            elif nature == "variable":
                seau["charges_variables"] += debit - credit
            elif nature == "fixe":
                seau["charges_fixes"] += debit - credit
            elif nature == "tresorerie":
                solde_treso += debit - credit

        for cle, pieces in ventes_par_mois.items():
            mois[cle]["ventes"] = float(len(pieces))
        tresorerie = round(solde_treso, 2) if solde_treso else None
        format_lu = "FEC"
    else:
        # Relevé bancaire ou tableau simple : une colonne date + soit un montant signé,
        # soit deux colonnes Débit / Crédit. Une colonne Solde donne la trésorerie réelle.
        col_date = _col_date(colonnes)
        col_montant = _col(colonnes, ("montant", "amount", "valeur"), exclure=("devise", "tva", "vat", "solde", "balance"))
        col_debit = _col(colonnes, ("debit",))
        col_credit = _col(colonnes, ("credit",))
        col_solde = _col(colonnes, ("solde", "balance"))
        if col_date is None or (col_montant is None and col_debit is None and col_credit is None):
            raise FichierIllisible(
                "Fichier non reconnu : il faut un FEC, ou un relevé avec une colonne « Date » et soit une "
                "colonne « Montant » (positif = recette, négatif = dépense), soit deux colonnes « Débit » / « Crédit »."
            )
        soldes: list[tuple[date, float]] = []
        for _, ligne in tableau.iterrows():
            jour = _date(ligne[col_date])
            if jour is None:
                continue
            if col_solde is not None and str(ligne[col_solde]).strip() not in ("", "nan", "None"):
                soldes.append((jour, _nombre(ligne[col_solde])))
            if col_montant is not None:
                montant = _nombre(ligne[col_montant])
            else:  # certaines banques écrivent le débit en négatif, d'autres en positif
                credit = abs(_nombre(ligne[col_credit])) if col_credit is not None else 0.0
                debit = abs(_nombre(ligne[col_debit])) if col_debit is not None else 0.0
                montant = credit - debit
            if montant == 0:
                continue
            cle = f"{jour.year:04d}-{jour.month:02d}"
            seau = mois.setdefault(cle, _mois_vide())
            lignes += 1
            jours.append(jour)
            if montant > 0:
                seau["revenus"] += montant
                seau["ventes"] += 1
            else:
                seau["charges_fixes"] += -montant
        if soldes:
            # Solde le plus récent ; à date égale, l'ordre du fichier décide (relevés du plus récent au plus ancien ou l'inverse).
            recent = max(j for j, _ in soldes)
            du_jour = [s for j, s in soldes if j == recent]
            decroissant = soldes[0][0] > soldes[-1][0]
            tresorerie = round(du_jour[0] if decroissant else du_jour[-1], 2)
        format_lu = "Relevé bancaire" if (col_solde is not None or col_montant is None) else "Tableau simple"

    if lignes == 0:
        raise FichierIllisible("Aucune écriture datée exploitable dans ce fichier.")

    for seau in mois.values():
        for champ in seau:
            seau[champ] = round(seau[champ], 2)

    return {
        "format": format_lu,
        "lignes": lignes,
        "mois": mois,
        "tresorerie": tresorerie,
        "periode_debut": min(jours).isoformat(),
        "periode_fin": max(jours).isoformat(),
    }


def fec_exemple(fin: date) -> str:
    """Un FEC de démonstration sur 6 mois, clairement étiqueté « jeu d'essai »."""
    lignes = ["JournalCode\tEcritureNum\tEcritureDate\tCompteNum\tCompteLib\tDebit\tCredit"]
    base = [(8200, 1450, 2350), (9100, 1600, 2350), (7400, 1200, 2350),
            (11200, 2100, 2500), (9800, 1750, 2500), (12400, 2300, 2500)]
    annee, mois_courant = fin.year, fin.month
    for recul, (ca, achats, fixes) in enumerate(reversed(base)):
        m = mois_courant - recul
        a = annee
        while m <= 0:
            m += 12
            a -= 1
        jour = f"{a:04d}{m:02d}10"
        nb_ventes = 4
        part = round(ca / nb_ventes, 2)
        for v in range(nb_ventes):
            lignes.append(f"VE\tVE{a}{m:02d}{v}\t{jour}\t706000\tPrestations\t0,00\t{part}")
            lignes.append(f"VE\tVE{a}{m:02d}{v}\t{jour}\t512000\tBanque\t{part}\t0,00")
        lignes.append(f"AC\tAC{a}{m:02d}\t{jour}\t607000\tAchats\t{achats},00\t0,00")
        lignes.append(f"AC\tAC{a}{m:02d}\t{jour}\t613000\tLoyer et services\t{fixes},00\t0,00")
        lignes.append(f"AC\tAC{a}{m:02d}\t{jour}\t512000\tBanque\t0,00\t{achats + fixes},00")
    return "\n".join(lignes)
