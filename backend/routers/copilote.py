"""Copilote — Aujourd'hui, Plan d'action, Radar, Tunnels de vente (préfixe /api/copilote).

Règles produit tenues ici (memory/SPEC.md, memory/TUNNELS_INSPIRATION.md) :
  - démarre VIDE, rien n'est inventé : tout vient de l'utilisateur ou d'une source publique datée ;
  - le Radar propose, il n'écrit jamais seul : « Prendre » crée les actions du Plan d'action ;
  - les sources sans clé (INSEE Sirene, France Travail, Pappers, Dropcontact, DataForSEO)
    s'affichent « en attente de clé », jamais faussement connectées ;
  - tunnels : 4 étapes canoniques (DotCom Secrets), offre calibrée ($100M Offers),
    upsell selon trois modèles et deux placements, séquence de lancement (Launch).

Stockage : un espace par utilisateur dans la base SQL du backend (lib/db.py).
"""

import asyncio
import json
import math
import os
import re
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Callable

import httpx
from fastapi import APIRouter, HTTPException, Query

from lib.db import db
from lib.utilisateur import uid
from models.copilote import (
    AnnonceBodacc, AtteintIn, ContactIn, EtapeIn, FicheDetail, FicheEntreprise, FinanceAnnee, PropositionTunnel, SourceInpi, LancementIn, ModeleUpsell, ModeleUpsellIn, NiveauIn, ObjectifIn,
    ObjectifRadarIn, OffreIn, ProcessusIn, ProfilIn, ReglagesIn, SignalManuelIn, SupprimeOut, TexteIn,
    TitreIn, Tunnel, TunnelIn, TunnelPatch, ValeurIn,
)

router = APIRouter()

LIBELLES_ENERGIE = ["Vidé", "Fatigué", "Ça va", "En forme", "Au top"]
LIBELLES_ETAPES = {"nouveau": "À contacter", "contacte": "Contacté", "en_discussion": "Rendez-vous", "signe": "Signé", "ecarte": "Écarté"}
JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
JOURS_COURTS = ["L", "M", "M", "J", "V", "S", "D"]
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]
DROITS = {
    "Rêveur": {"prospects_max": 10, "tunnels_max": 1, "sequences_lancement": False},
    "Solo": {"prospects_max": None, "tunnels_max": 3, "sequences_lancement": False},
    "Pro": {"prospects_max": None, "tunnels_max": 3, "sequences_lancement": True},
}

# ─────────── espace de l'utilisateur ───────────
_verrous: dict[str, asyncio.Lock] = {}


def _vide() -> dict:
    return {
        "profil": None, "reglages": {"clientele": "les_deux", "zone": "", "mots_cles": []}, "checkins": {},
        "rituels": [], "actions": [], "objectifs": [], "processus": [], "victoires": [], "signaux": [],
        "prospects": [], "opposition": [], "objectif_radar": None, "tunnels": [], "derniere_collecte": None,
    }


async def _lire() -> dict:
    doc = await db.copilote_espace.find_one({"user_id": uid()})
    return {**_vide(), **(doc or {}).get("data", {})}


async def _avec(fn: Callable[[dict], Any]) -> Any:
    """Lit l'espace, applique `fn`, réécrit — sérialisé par utilisateur."""
    u = uid()
    async with _verrous.setdefault(u, asyncio.Lock()):
        s = await _lire()
        out = fn(s)
        await db.copilote_espace.update_one({"user_id": u}, {"$set": {"user_id": u, "id": u, "data": s}}, upsert=True)
        return out


def _erreur(code: int, msg: str):
    raise HTTPException(status_code=code, detail=msg)


def _nid() -> str:
    return str(uuid.uuid4())


def _auj() -> date:
    return datetime.now(timezone.utc).date()


def _iso(d: date) -> str:
    return d.isoformat()


def _plus(iso: str, n: int) -> str:
    return _iso(date.fromisoformat(iso) + timedelta(days=n))


def _echeance(iso: str) -> str:
    d = date.fromisoformat(iso)
    return f"{d.day} {MOIS_COURTS[d.month - 1]}"


def _date_label(d: date) -> str:
    return f"{JOURS[d.weekday()]} {d.day} {MOIS[d.month - 1]} · semaine {d.isocalendar()[1]}".upper()


def fraicheur(date_fait: str) -> str:
    try:
        j = (_auj() - date.fromisoformat(date_fait)).days
    except ValueError:
        return ""
    if j <= 0:
        return "aujourd'hui"
    if j == 1:
        return "hier"
    if j < 31:
        return f"il y a {j} jours"
    m = j // 30
    return f"il y a {m} mois" if m > 1 else "il y a 1 mois"


def _droits(s: dict) -> dict:
    return DROITS.get((s.get("profil") or {}).get("offre"), DROITS["Rêveur"])


# ─────────── capacité : énergie × rituels → nombre d'actions possibles ───────────
def _seuil(p: int) -> int:
    return 1 if p < 30 else 2 if p < 55 else 3 if p < 80 else 5


def _pourcentage(s: dict, jour: str) -> tuple[int | None, int, int, int]:
    niveau = s["checkins"].get(jour)
    total = len(s["rituels"])
    faits = sum(1 for r in s["rituels"] if r.get("dernier_jour") == jour)
    pct = round(100 * (0.6 * (niveau / 5) + 0.4 * (faits / total if total else 0))) if niveau else 0
    return niveau, pct, faits, total


def _capacite(s: dict, jour: str) -> dict:
    niveau, pct, _, _ = _pourcentage(s, jour)
    restantes = sum(1 for a in s["actions"] if not a["priorite"] and not a["fait"])
    if not niveau:
        return {"pourcentage": 0, "actions_possibles": restantes, "actions_masquees": 0}
    p = _seuil(pct)
    return {"pourcentage": pct, "actions_possibles": min(p, restantes), "actions_masquees": max(0, restantes - p)}


def _tri(s: dict) -> list[dict]:
    return sorted(s["actions"], key=lambda a: a["ordre"])


def _ajouter_action(s: dict, titre: str, module: str, echeance_iso: str, source: str, signal_id: str | None = None) -> dict:
    ordre = max((a["ordre"] for a in s["actions"]), default=99) + 1
    a = {"id": _nid(), "titre": titre, "module": module, "echeance": _echeance(echeance_iso), "echeance_iso": echeance_iso,
         "source": source, "fait": False, "priorite": False, "ordre": ordre, "signal_id": signal_id}
    s["actions"].append(a)
    return a


async def _pilotage() -> dict | None:
    """Les chiffres réels du Pilotage (imports FEC/CSV) — None si aucun import."""
    try:
        from routers.pilotage import _vue
        v = await _vue()
        return v.model_dump() if v.imports else None
    except Exception:  # noqa: BLE001 — le Copilote ne tombe jamais à cause du Pilotage
        return None


# ═══════════ Profil ═══════════
# ═══════════ Profil (lu dans le profil VisionAct, créé vide avec l'identité réelle du compte) ═══════════
async def _profil_va() -> dict:
    from routers.vision import _profil
    return await _profil()


# Offre RÉELLE du compte (abonnement payé) → droits du Copilote. Jamais l'offre déclarée par le client.
_OFFRE_DROITS = {"Rêveur": "Rêveur", "Essentielle": "Rêveur", "Solo": "Solo", "Pro": "Pro", "Équipe": "Pro", "Entreprise": "Pro"}


async def _est_admin() -> bool:
    import sys
    srv = sys.modules.get("server")
    if srv is None:
        return False
    try:
        async with srv.async_session() as s:
            u = await s.get(srv.User, uid())
        return bool(u and u.role == "admin")
    except Exception:  # noqa: BLE001
        return False


@router.get("/profil")
async def lire_profil():
    from lib.utilisateur import identite
    p = await _profil_va()
    reel = (await identite()).get("offre") or ""
    offre = _OFFRE_DROITS.get(reel, "Rêveur")
    # Seul un administrateur peut simuler une offre (tests) : la valeur forcée n'est lue que pour lui.
    if p.get("offre_test") in DROITS and await _est_admin():
        offre = p["offre_test"]
    return {"prenom": p.get("prenom", ""), "offre": offre, "metier": p.get("metier", "")}


@router.patch("/profil/offre")
async def changer_offre(b: OffreIn):
    """Réservé aux administrateurs (aperçu d'une offre). Un client change d'offre par le paiement."""
    if not await _est_admin():
        _erreur(403, "Le changement d'offre passe par la page Tarifs.")
    await _profil_va()
    await db.vision_profil.update_one({"user_id": uid()}, {"$set": {"offre_test": b.offre}})
    return await lire_profil()


async def _ajouter_action_plan(titre: str, module: str, echeance_iso: str, source: str, lien: str) -> None:
    """Écrit dans le Plan d'action de VisionAct — la seule liste de choses à faire de l'appli."""
    dernier = await db.plan_actions.find({"user_id": uid()}).sort("ordre", -1).to_list(1)
    await db.plan_actions.insert_one({"id": _nid(), "titre": titre, "module": module, "echeance": _echeance(echeance_iso),
                                      "fait": False, "source": source, "user_id": uid(), "priorite": False,
                                      "ordre": (dernier[0]["ordre"] + 1) if dernier else 100, "lien": lien})


# ═══════════ Radar : sources réelles + collecte BODACC ═══════════
async def sources_par_defaut(mode: str) -> list[dict]:
    s = await _lire()
    col = await db.radar_collecte.find_one({"user_id": uid()}) or {}
    if mode == "entreprises":
        dc = col.get("date")
        return [
            {"cle": "bodacc", "nom": "BODACC", "role": "Créations, changements, redressements, liquidations, radiations", "actif": True, "etat": "gratuite",
             "detail": f"Dernière collecte : {dc[:16].replace('T', ' ')} UTC" if dc else "Open data officiel, sans clé", "payante": False},
            {"cle": "recherche_entreprises", "nom": "API Recherche d'entreprises", "role": "Fiche officielle (INSEE Sirene + RNE de l'INPI)", "actif": True,
             "etat": "gratuite", "detail": "Sans clé — utilisée pour « Voir la fiche »", "payante": False},
            {"cle": "inpi_rne", "nom": "INPI — RNE", "role": "Registre national des entreprises : actes, comptes, dirigeants", "actif": False, "etat": "compte gratuit",
             "detail": "Identifiants INPI à fournir (les données RNE de base passent déjà par l'API Recherche d'entreprises)", "payante": False},
            {"cle": "insee_sirene", "nom": "INSEE Sirene", "role": "Répertoire officiel, filtres avancés", "actif": False, "etat": "compte gratuit", "detail": "Clé API INSEE à fournir", "payante": False},
            {"cle": "france_travail", "nom": "France Travail", "role": "Qui recrute en ce moment", "actif": False, "etat": "compte gratuit", "detail": "Identifiants France Travail à fournir", "payante": False},
            {"cle": "dropcontact", "nom": "Dropcontact", "role": "E-mail pro à la demande, conforme RGPD", "actif": False, "etat": "en attente de clé", "detail": "Offre Pro + clé Dropcontact à fournir", "payante": True},
        ]
    return [
        {"cle": "tunnels", "nom": "Mes tunnels", "role": "Contacts captés = demandes entrantes", "actif": True, "etat": "interne", "detail": f"{len(s['tunnels'])} tunnel(s)", "payante": False},
        {"cle": "bassin", "nom": "Mon bassin", "role": "Dormants, avis, recommandations", "actif": True, "etat": "saisie manuelle", "detail": "Relation client existante", "payante": False},
        {"cle": "dataforseo", "nom": "DataForSEO", "role": "Volumes de recherche réels", "actif": False, "etat": "en attente de clé", "detail": "Clé DataForSEO à fournir (offre Pro)", "payante": True},
    ]


def _departement(zone: str) -> str | None:
    m = re.match(r"^(2A|2B|97\d|\d{2})", zone.strip().upper())
    return m.group(1) if m else None


def _json(txt: Any) -> dict:
    if isinstance(txt, dict):
        return txt
    try:
        return json.loads(txt) if txt else {}
    except (TypeError, ValueError):
        return {}


def _depuis_bodacc(r: dict, zone: str) -> dict | None:
    pers = _json(r.get("listepersonnes")).get("personne") or {}
    if isinstance(pers, list):
        pers = pers[0] if pers else {}
    etab = _json(r.get("listeetablissements")).get("etablissement") or {}
    if isinstance(etab, list):
        etab = etab[0] if etab else {}
    # Aucune donnée personnelle de particulier : une personne physique n'apparaît que sous son nom commercial.
    nom = pers.get("denomination") if pers.get("typePersonne") == "pm" else (pers.get("nomCommercial") or etab.get("enseigne"))
    if not nom:
        return None
    activite = re.sub(r"\s+", " ", etab.get("activite") or pers.get("activite") or "").strip()
    fam = r.get("familleavis")
    nature = _json(r.get("jugement")).get("nature") or ""
    cat = ("creation" if fam == "creation" else "radiation" if fam == "radiation"
           else ("liquidation" if "liquidation" in nature.lower() else "procedure") if fam == "collective" else "veille")
    pourquoi = {
        "creation": "Nouvelle structure : tout est à organiser dès le premier exercice.",
        "procedure": "Redressement ou sauvegarde en cours : un accompagnement peut être utile — ou un risque.",
        "liquidation": "Liquidation judiciaire en cours : actifs, clients et salariés à reprendre — prudence sur les créances.",
        "radiation": "Radiation publiée : activité arrêtée, clientèle ou fonds potentiellement disponibles.",
        "veille": "Un changement (dirigeant, siège, activité) ouvre une fenêtre pour exister.",
    }[cat]
    reg = r.get("registre") or []
    libelle = {"creation": "Immatriculation", "collective": "Procédure collective", "radiation": "Radiation"}.get(fam, "Modification")
    suite_nature = f" — {nature}" if nature else ""
    ville = r.get("ville")
    suite_ville = f" · {ville}" if ville else ""
    return {
        "id": f"bodacc-{r.get('id')}", "mode": "entreprises", "categorie": cat, "source": "BODACC", "cible": nom,
        "fait": f"{libelle}{suite_nature} publiée au BODACC le {r.get('dateparution')}{suite_ville}",
        "date_fait": r.get("dateparution"), "pourquoi": pourquoi,
        "lien": f"https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:{r.get('id')}",
        "secteur": activite[:140] + ("…" if len(activite) > 140 else ""), "zone": zone, "statut": "nouveau",
        "secondaire": False, "metrique": None, "action": f"Contacter {nom}", "siren": reg[0].replace(" ", "") if reg else None,
    }


@router.post("/radar/collecter")
async def collecter(mode: str = Query("entreprises", pattern="^(entreprises|particuliers)$")):
    if mode != "entreprises":
        return {"nouveaux": 0, "sources": [], "erreurs": ["Aucune source publique gratuite pour ce mode : la demande exprimée attend une clé DataForSEO."]}
    reg = await db.radar_reglages.find_one({"user_id": uid()}) or {}
    reg = {"zone": reg.get("zone", ""), "mots_cles": reg.get("mots_cles", [])}
    dep = _departement(reg["zone"])
    if not dep:
        _erreur(422, "Indiquez un département (ex. 69) dans les réglages du Radar")
    depuis = _plus(_iso(_auj()), -30)
    mots = [f'"{m.replace(chr(34), "")}"' for m in reg["mots_cles"] if m]
    where = (f'numerodepartement="{dep}" and familleavis in ("creation","modification","collective","radiation") and dateparution>=date\'{depuis}\''
             + (f" and ({' or '.join(mots)})" if mots else ""))
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            res = await c.get("https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records",
                              params={"limit": 40, "where": where, "order_by": "dateparution desc",
                                      "select": "id,dateparution,familleavis,familleavis_lib,commercant,ville,cp,listepersonnes,listeetablissements,registre,jugement"})
        res.raise_for_status()
        resultats = res.json().get("results") or []
    except Exception:  # noqa: BLE001
        _erreur(502, "BODACC indisponible pour le moment")

    u = uid()
    bloques = {o["valeur"].lower() for o in await db.radar_opposition.find({"user_id": u}).to_list(1000)}
    connus = {x["id"] for x in await db.radar_signaux.find({"user_id": u}).to_list(5000)}
    n = 0
    for r in resultats:
        sig = _depuis_bodacc(r, reg["zone"])
        if not sig or sig["id"] in connus or sig["cible"].lower() in bloques:
            continue
        await db.radar_signaux.insert_one({**sig, "user_id": u})
        connus.add(sig["id"])
        n += 1
    await db.radar_collecte.update_one({"user_id": u}, {"$set": {"user_id": u, "date": datetime.now(timezone.utc).isoformat(timespec="minutes")}}, upsert=True)
    return {"nouveaux": n, "sources": ["BODACC"], "erreurs": []}


def _fiche_de(r: dict) -> dict:
    dirigeants = []
    for d in (r.get("dirigeants") or [])[:3]:
        nom = d.get("denomination", "") if d.get("type_dirigeant") == "personne morale" else f"{d.get('prenoms', '')} {d.get('nom', '')}".strip()
        if nom:
            dirigeants.append(nom + (f" ({d['qualite']})" if d.get("qualite") else ""))
    eff = r.get("tranche_effectif_salarie")
    return {"siren": r.get("siren") or "", "nom": r.get("nom_complet") or "", "activite": r.get("activite_principale") or "",
            "date_creation": r.get("date_creation"), "effectif": EFFECTIFS.get(eff) if eff and eff != "NN" else None,
            "commune": (r.get("siege") or {}).get("libelle_commune") or "", "dirigeants": dirigeants,
            "lien": f"https://annuaire-entreprises.data.gouv.fr/entreprise/{r.get('siren')}",
            "etat": "cesse" if r.get("etat_administratif") == "C" else "actif", "date_fermeture": r.get("date_fermeture")}


EFFECTIFS = {"00": "0 salarié", "01": "1-2 salariés", "02": "3-5 salariés", "03": "6-9 salariés", "11": "10-19 salariés",
             "12": "20-49 salariés", "21": "50-99 salariés", "22": "100-199 salariés", "31": "200-249 salariés",
             "32": "250-499 salariés", "41": "500-999 salariés", "42": "1 000-1 999 salariés", "51": "2 000-4 999 salariés",
             "52": "5 000-9 999 salariés", "53": "10 000 salariés et plus"}
CATEGORIES = {"PME": "PME", "ETI": "Entreprise de taille intermédiaire", "GE": "Grande entreprise"}


async def _recherche(q: str, n: int) -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            res = await c.get("https://recherche-entreprises.api.gouv.fr/search", params={"q": q, "per_page": n})
        res.raise_for_status()
        return res.json().get("results") or []
    except Exception:  # noqa: BLE001
        _erreur(502, "API Recherche d'entreprises indisponible")
        return []


@router.get("/radar/fiche", response_model=list[FicheEntreprise])
async def fiche_entreprise(q: str = Query(min_length=2, max_length=120)):
    """API Recherche d'entreprises (INSEE Sirene + RNE) — officielle et sans clé."""
    return [FicheEntreprise(**_fiche_de(r)) for r in await _recherche(q, 6)]


async def _annonces_bodacc(siren: str) -> list[AnnonceBodacc]:
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            res = await c.get("https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records",
                              params={"where": f'registre:"{siren}"', "order_by": "dateparution desc", "limit": 20,
                                      "select": "id,dateparution,familleavis_lib,tribunal,jugement,typeavis_lib"})
        res.raise_for_status()
        lignes = res.json().get("results") or []
    except Exception:  # noqa: BLE001
        return []
    out = []
    for r in lignes:
        famille = r.get("familleavis_lib") or ""
        nature = ""
        try:
            j = json.loads(r["jugement"]) if r.get("jugement") else {}
            nature = j.get("nature") or ""
        except (ValueError, TypeError):
            pass
        alerte = famille.lower().startswith(("procédures collectives", "radiation")) or "liquidation" in nature.lower()
        out.append(AnnonceBodacc(id=str(r.get("id")), date=r.get("dateparution") or "", famille=famille, nature=nature,
                                 tribunal=r.get("tribunal") or "", alerte=alerte,
                                 lien=f"https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:{r.get('id')}"))
    return out


async def _inpi(siren: str) -> SourceInpi:
    """INPI — RNE : actes et comptes déposés. Optionnel : INPI_USERNAME / INPI_PASSWORD dans backend/.env."""
    lien = f"https://data.inpi.fr/entreprises/{siren}"
    user, mdp = os.environ.get("INPI_USERNAME"), os.environ.get("INPI_PASSWORD")
    if not (user and mdp):
        return SourceInpi(connecte=False, lien=lien)
    try:
        async with httpx.AsyncClient(timeout=20, base_url="https://registre-national-entreprises.inpi.fr") as c:
            tok = (await c.post("/api/sso/login", json={"username": user, "password": mdp})).json().get("token")
            res = await c.get(f"/api/companies/{siren}/attachments", headers={"Authorization": f"Bearer {tok}"})
        res.raise_for_status()
        d = res.json()
        return SourceInpi(connecte=True, lien=lien, actes=len(d.get("actes") or []), bilans=len(d.get("bilans") or []))
    except Exception:  # noqa: BLE001
        return SourceInpi(connecte=False, lien=lien)


@router.get("/radar/entreprise/{siren}", response_model=FicheDetail)
async def detail_entreprise(siren: str):
    """Fiche complète : identité et état (Sirene/RNE), finances publiées, annonces BODACC
    (procédures collectives, liquidations, radiations), actes INPI si identifiants fournis."""
    if not re.fullmatch(r"\d{9}", siren):
        _erreur(422, "SIREN invalide (9 chiffres)")
    resultats = [r for r in await _recherche(siren, 1) if r.get("siren") == siren]
    if not resultats:
        _erreur(404, "Entreprise introuvable dans le répertoire officiel")
    r = resultats[0]
    annonces, inpi = await asyncio.gather(_annonces_bodacc(siren), _inpi(siren))
    procedures = [a for a in annonces if a.famille.lower().startswith("procédures collectives")]
    finances = [FinanceAnnee(annee=k, ca=v.get("ca"), resultat_net=v.get("resultat_net"))
                for k, v in sorted((r.get("finances") or {}).items(), reverse=True)]
    return FicheDetail(
        **_fiche_de(r), adresse=(r.get("siege") or {}).get("adresse") or "",
        categorie=CATEGORIES.get(r.get("categorie_entreprise") or "", ""),
        etablissements_ouverts=r.get("nombre_etablissements_ouverts"), finances=finances, annonces=annonces,
        procedure_collective=(procedures[0].nature or procedures[0].famille) if procedures else None,
        radiee=r.get("etat_administratif") == "C" or any(a.famille.lower().startswith("radiation") for a in annonces),
        inpi=inpi)


# ═══════════ Tunnels de vente ═══════════
MODELES_UPSELL: list[ModeleUpsell] = [
    ModeleUpsell(type="acceleration", nom="Accélération (« Fast-Track »)",
                 concept="Le client vient d'acheter ou de réserver la version standard : tu lui proposes de l'obtenir plus vite ou de façon plus intensive.",
                 exemple="Vous avez réservé l'audit standard (livré en 15 jours). Pour 290 € de plus, passez en « Task Force prioritaire » : diagnostic et plan d'action complets sous 48 heures."),
    ModeleUpsell(type="complementarite", nom="Complémentarité (outil ou modèle prêt à l'emploi)",
                 concept="Un outil digital, un cadre ou un tableau de bord exclusif qui complète l'intervention humaine.",
                 exemple="En complément de l'audit, ajoutez le tableau de bord de pilotage financier sur mesure (valeur 800 €, proposé ici à 190 €) pour suivre vos gains chaque mois sans effort."),
    ModeleUpsell(type="delegation", nom="Délégation totale (« Done-For-You »)",
                 concept="Le client a acheté le conseil (la stratégie) : tu proposes de faire le travail à sa place (l'exécution). Souvent le plus cher et le plus rentable.",
                 exemple="Plutôt que de négocier vous-même avec vos fournisseurs ou de superviser les artisans, notre équipe prend en charge toute la négociation et la mise en œuvre."),
]

_LANCEMENT = [  # Launch (Jeff Walker) : 3 contenus de pré-lancement, ouverture, fermeture
    ("opportunite", "Contenu 1 — L'opportunité", -7, "Pourquoi « {s} » change la donne maintenant, et ce que la plupart ne voient pas."),
    ("transformation", "Contenu 2 — La transformation", -5, "Le chemin concret, étape par étape : une vraie victoire rapide à appliquer dès aujourd'hui."),
    ("experience", "Contenu 3 — L'expérience de propriété", -3, "À quoi ressemble la vie une fois le problème réglé. Réponses aux objections, témoignages réels."),
    ("ouverture", "Ouverture des portes", 0, "Les portes sont ouvertes : {o}. Disponible jusqu'à la fermeture annoncée."),
    ("fermeture", "Fermeture des portes", 3, "Dernier rappel : fermeture ce soir. Après, l'offre repasse en veille jusqu'au prochain lancement."),
]


def _upsell_gabarit(type_: str, placement: str, sujet: str, parcours: str) -> dict:
    noms = {"acceleration": f"Option prioritaire — {sujet}", "complementarite": f"Kit prêt à l'emploi — {sujet}",
            "delegation": f"Mise en œuvre complète — {sujet}"}
    contenus = {
        "acceleration": ["Traitement prioritaire, résultat en 48 heures au lieu de 15 jours", "Une équipe dédiée mobilisée sur votre dossier"],
        "complementarite": ["La grille d'analyse exclusive (les postes de dépenses cachés)", "Le calculateur automatisé de retour sur investissement"],
        "delegation": ["Nous prenons en charge la négociation et l'exécution", "Vous validez, nous faisons — compte rendu à chaque étape"],
    }
    script = {
        "acceleration": f"« Au vu de votre situation, la formule de base va identifier le problème. Si vous voulez le résultat sur « {sujet} » en 48 heures, l'option prioritaire est faite pour ça. »",
        "complementarite": f"« Pour suivre vos gains sur « {sujet} » chaque mois sans effort, le kit prêt à l'emploi complète parfaitement ce que nous venons de voir. »",
        "delegation": f"« Notre formule de base va identifier le problème. Si vous voulez que l'on déploie la solution complète sur « {sujet} » avec vous sur 6 mois, l'accompagnement 360° est le plus adapté. »",
    }
    return {
        "type": type_, "placement": placement, "nom": noms[type_], "prix": None, "prix_barre": None,
        "contenu": contenus[type_],
        "oui": "Oui, j'ajoute cette option à mon dossier",
        "non": "Non merci, je m'en tiens à mon rendez-vous de base" if parcours == "rendez_vous" else "Non merci, je garde ma commande telle quelle",
        "script_appel": script[type_],
    }


def _etape_upsell(u: dict, parcours: str) -> dict:
    confirme = "Votre rendez-vous est confirmé" if parcours == "rendez_vous" else "Votre commande est confirmée"
    if u["placement"] == "pendant_appel":
        return {"cle": "upsell", "titre": "Pendant l'appel stratégique", "accroche": "Le cross-sell naturel, au moment où le client mesure l'ampleur du problème.",
                "contenu": u["script_appel"], "bouton": "Proposer l'option", "offre_nom": u["nom"], "prix": u["prix"]}
    return {"cle": "upsell", "titre": f"Attendez ! {confirme}, mais lisez ceci…",
            "accroche": "Une offre exclusive, valable uniquement sur cette page.",
            "contenu": "\n".join(f"• {c}" for c in u["contenu"]), "bouton": u["oui"], "offre_nom": u["nom"], "prix": u["prix"]}


def _brouillon(sujet: str, metier: str, parcours: str, type_upsell: str) -> dict:
    m = f" — {metier}" if metier else ""
    placement = "post_reservation"
    u = _upsell_gabarit(type_upsell, placement, sujet, parcours)
    if parcours == "rendez_vous":
        etapes = [
            {"cle": "capture", "titre": f"Diagnostic gratuit : {sujet}", "accroche": f"Identifiez en 10 minutes ce qui vous coûte le plus sur « {sujet} »{m}.",
             "contenu": "Recevez la grille de diagnostic par e-mail. Pas de spam, désinscription en un clic.", "bouton": "Recevoir le diagnostic", "offre_nom": "Diagnostic gratuit", "prix": None},
            {"cle": "remerciement", "titre": "Merci — réservez votre appel stratégique", "accroche": "Le diagnostic arrive dans votre boîte. Passons aux chiffres ensemble.",
             "contenu": "30 minutes, offertes, pour mesurer vos pertes et repartir avec un plan. Validez votre demande : nous vous rappelons pour fixer le créneau qui vous convient.", "bouton": "Valider le rendez-vous", "offre_nom": "Appel stratégique", "prix": None},
            {"cle": "vente", "titre": f"L'accompagnement « {sujet} »", "accroche": "Le résultat que vous cherchez, sans vous épuiser.",
             "contenu": f"Nous reprenons votre situation sur « {sujet} », chiffres à l'appui, et nous avançons avec vous jusqu'aux résultats.\n• Un diagnostic complet de votre situation\n• Un plan d'action priorisé, chiffré et daté\n• Un suivi régulier jusqu'aux premiers résultats\nPour les dirigeants qui veulent des résultats mesurables, pas un rapport de plus.", "bouton": "Je réserve l'accompagnement", "offre_nom": "Offre principale", "prix": None},
        ]
    else:
        etapes = [
            {"cle": "capture", "titre": f"Le guide gratuit : {sujet}", "accroche": f"Tout ce qu'il faut savoir sur « {sujet} »{m}.",
             "contenu": "Recevez le guide par e-mail. Pas de spam, désinscription en un clic.", "bouton": "Recevoir le guide", "offre_nom": "Guide gratuit", "prix": None},
            {"cle": "remerciement", "titre": "Merci, le guide arrive dans votre boîte", "accroche": "En attendant, une première étape concrète, à petit prix.",
             "contenu": "Livrée tout de suite, pour avancer dès aujourd'hui sans attendre.", "bouton": "Je prends l'offre de démarrage", "offre_nom": "Offre de démarrage", "prix": None},
            {"cle": "vente", "titre": f"L'offre « {sujet} »", "accroche": "Le résultat que vous cherchez, sans détour.",
             "contenu": f"Tout ce qu'il faut pour réussir « {sujet} », étape par étape.\n• Une méthode claire, testée sur le terrain\n• Des outils prêts à l'emploi\n• Une réponse à vos questions en cours de route", "bouton": "Commander", "offre_nom": "Offre principale", "prix": None},
        ]
    etapes.append(_etape_upsell(u, parcours))
    return {"etapes": etapes, "upsell": u}


def _tunnel(s: dict, tid: str) -> dict:
    t = next((x for x in s["tunnels"] if x["id"] == tid), None)
    if not t:
        _erreur(404, "Tunnel introuvable")
    return t


def _out(t: dict) -> Tunnel:
    return Tunnel.model_validate(t)


@router.get("/tunnels/modeles", response_model=list[ModeleUpsell])
async def modeles_upsell():
    return MODELES_UPSELL


@router.get("/tunnels", response_model=list[Tunnel])
async def tunnels():
    return [_out(t) for t in sorted((await _lire())["tunnels"], key=lambda t: t["cree_le"], reverse=True)]


@router.get("/tunnels/{tid}", response_model=Tunnel)
async def tunnel(tid: str):
    return _out(_tunnel(await _lire(), tid))


@router.post("/tunnels", response_model=Tunnel)
async def creer_tunnel(b: TunnelIn):
    from routers.admin_tunnels import modele_pour
    from routers.tunnels_douleurs import etapes_douleur
    prof = await lire_profil()
    modele = await modele_pour(b.parcours, b.sujet.strip() or b.nom.strip(), prof["metier"] or "")

    def f(s):
        offre = prof["offre"]
        mx = DROITS[offre]["tunnels_max"]
        if len(s["tunnels"]) >= mx:
            _erreur(403, f"Offre {offre} : {mx} tunnel{'s' if mx > 1 else ''} maximum")
        if len(b.nom.strip()) < 2:
            _erreur(422, "Nom du tunnel trop court")
        sujet = b.sujet.strip() or b.nom.strip()
        d = etapes_douleur(b.douleur, sujet) if b.douleur else None
        parcours, type_upsell = (d[1], d[2]) if d else (b.parcours, b.type_upsell)
        br = _brouillon(sujet, prof["metier"], parcours, type_upsell)
        if d:  # modèle choisi par douleur client
            br["etapes"] = d[0]
        elif modele:  # modèle préparamétré par l'admin
            br["etapes"] = modele["etapes"]
        t = {"id": _nid(), "nom": b.nom.strip(), "sujet": b.sujet.strip(), "etat": "brouillon", "parcours": parcours,
             "etapes": br["etapes"], "contacts": [], "offre": {}, "upsell": br["upsell"], "downsell": {},
             "lancement": {"contenus": [{"cle": c, "titre": ti, "decalage": d, "date": None,
                                         "texte": tx.format(s=sujet, o="l'offre principale")} for c, ti, d, tx in _LANCEMENT]},
             "cree_le": datetime.now(timezone.utc).isoformat(), "origine": b.origine or "saisie manuelle",
             "code": (modele or {}).get("code") or {}}
        s["tunnels"].append(t)
        return _out(t)
    return await _avec(f)


@router.patch("/tunnels/{tid}", response_model=Tunnel)
async def maj_tunnel(tid: str, b: TunnelPatch):
    def f(s):
        t = _tunnel(s, tid)
        if b.etat == "en_ligne" and not t.get("slug"):
            _erreur(409, "Pour mettre en ligne, utilise « Publier » : il crée l'adresse publique et vérifie tes mentions légales.")
        t.update(b.model_dump(exclude_none=True))
        if b.upsell is not None:  # la page de l'étape 4 affiche l'option et son prix
            for e in t["etapes"]:
                if e["cle"] == "upsell":
                    e["offre_nom"], e["prix"] = b.upsell.nom, b.upsell.prix
        return _out(t)
    return await _avec(f)


@router.post("/tunnels/{tid}/upsell/modele", response_model=Tunnel)
async def appliquer_modele_upsell(tid: str, b: ModeleUpsellIn):
    """Réécrit l'upsell (et la page de l'étape 4) depuis l'un des trois modèles, au placement choisi."""
    def f(s):
        t = _tunnel(s, tid)
        u = _upsell_gabarit(b.type, b.placement, t["sujet"] or t["nom"], t.get("parcours", "produit"))
        t["upsell"] = u
        t["etapes"] = [e for e in t["etapes"] if e["cle"] != "upsell"] + [_etape_upsell(u, t.get("parcours", "produit"))]
        return _out(t)
    return await _avec(f)


@router.post("/tunnels/{tid}/lancement", response_model=Tunnel)
async def programmer_lancement(tid: str, b: LancementIn):
    """Date les contenus autour de l'ouverture et les programme dans le Plan d'action (offre Pro)."""
    prof = await lire_profil()
    a_planifier: list[tuple[str, str, str]] = []

    def f(s):
        if not DROITS[prof["offre"]]["sequences_lancement"]:
            _erreur(403, "Séquences de lancement complètes : offre Pro.")
        t = _tunnel(s, tid)
        try:
            ouverture = date.fromisoformat(b.ouverture)
        except ValueError:
            _erreur(422, "Date d'ouverture invalide (AAAA-MM-JJ)")
        if ouverture < _auj():
            _erreur(422, "La date d'ouverture doit être aujourd'hui ou plus tard")
        lan = t.setdefault("lancement", {"contenus": []})
        source = f"Lancement « {t['nom']} »"
        for c in lan["contenus"]:
            jour = _iso(max(_auj(), ouverture + timedelta(days=c["decalage"])))
            c["date"] = jour
            a_planifier.append((f"{c['titre']} — {t['nom']}", jour, source))
        lan["ouverture"] = _iso(ouverture)
        lan["fermeture"] = _iso(ouverture + timedelta(days=3))
        lan["programme"] = True
        t["etat"] = "en_veille" if t["etat"] == "brouillon" else t["etat"]
        return _out(t)
    out = await _avec(f)
    await db.plan_actions.delete_many({"user_id": uid(), "lien": f"lancement-{tid}", "fait": False})
    for titre, jour, source in a_planifier:
        await _ajouter_action_plan(titre, "Tunnels", jour, source, f"lancement-{tid}")
    return out


@router.delete("/tunnels/{tid}", response_model=SupprimeOut)
async def supprimer_tunnel(tid: str):
    def f(s):
        _tunnel(s, tid)
        s["tunnels"] = [t for t in s["tunnels"] if t["id"] != tid]
        return SupprimeOut(id=tid, supprime=True)
    out = await _avec(f)
    await db.tunnels_publics.delete_many({"user_id": uid(), "tunnel_id": tid})  # libère l'adresse /t/{slug}
    return out


@router.post("/tunnels/{tid}/contacts")
async def contact_tunnel(tid: str, b: ContactIn):
    def f(s):
        t = _tunnel(s, tid)
        if len(b.nom.strip()) < 2 or not re.match(r"^\S+@\S+\.\S+$", b.email.strip()):
            _erreur(422, "Nom et e-mail valides requis")
        c = {"id": _nid(), "nom": b.nom.strip(), "email": b.email.strip(), "date": _iso(_auj())}
        t["contacts"].append(c)
        return c
    c = await _avec(f)
    t = await tunnel(tid)
    reg = await db.radar_reglages.find_one({"user_id": uid()}) or {}
    # La boucle se referme : un contact capté devient une demande entrante du Radar.
    await db.radar_signaux.insert_one({
        "id": _nid(), "user_id": uid(), "mode": "particuliers", "categorie": "entrante", "source": f"Tunnel « {t.nom} »",
        "cible": c["nom"], "fait": f"Inscrit(e) via la page de capture ({c['email']})", "date_fait": c["date"],
        "pourquoi": "La personne a demandé à être contactée.", "lien": None, "secteur": "", "zone": reg.get("zone", ""),
        "statut": "nouveau", "secondaire": False, "metrique": None, "action": f"Répondre à {c['nom']}"})
    return c


@router.post("/tunnels/{tid}/proposition", response_model=PropositionTunnel)
async def proposition_tunnel(tid: str):
    """Réécriture des 4 pages par l'IA. Rien n'est enregistré : l'utilisateur relit,
    corrige, enregistre puis valide le déploiement. Sans clé IA : le gabarit sert de repli."""
    from llm_mammouth import EmergentChat, MammouthChat, UserMessage, cle_emergent, cle_mammouth

    prof = await lire_profil()
    t = _tunnel(await _lire(), tid)
    sujet = t["sujet"] or t["nom"]
    cle = cle_mammouth() or cle_emergent()
    if cle:
        systeme = ("Tu es copywriter francophone pour entrepreneurs. Structure DotCom Secrets (Brunson) : capture, "
                   "remerciement + tripwire, vente, upsell. Offre façon Hormozi (résultat rêvé, preuve, délai court, effort faible). "
                   "Ton chaleureux et professionnel, vouvoiement, aucune promesse chiffrée inventée, aucun faux témoignage.")
        demande = (f"Métier : {prof['metier'] or 'non précisé'}. Sujet : {sujet}. Parcours : {t.get('parcours', 'produit')}.\n"
                   f"Pages actuelles (JSON) : {json.dumps([{k: e[k] for k in ('cle', 'titre', 'accroche', 'contenu', 'bouton')} for e in t['etapes']], ensure_ascii=False)}\n"
                   f"Offre actuelle : {json.dumps(t.get('offre') or {}, ensure_ascii=False)}. Upsell : {json.dumps({k: (t.get('upsell') or {}).get(k) for k in ('type', 'nom', 'contenu')}, ensure_ascii=False)}.\n"
                   "Rédige TOUT le tunnel. Réponds UNIQUEMENT par un objet JSON : "
                   '{"pages": [4 objets {cle, titre (max 70 car.), accroche (max 140), contenu (max 400), bouton (max 35)} dans le même ordre], '
                   '"offre": {resultat_reve, delai, effort, bonus: [max 3], garantie}, '
                   '"upsell": {nom, contenu: [max 4], oui, non}, "downsell": {nom}}. '
                   "Ne remplis jamais de preuve, de témoignage, de chiffre ni de rareté : ils doivent venir de l'utilisateur.")
        try:
            client = MammouthChat(cle, systeme) if cle_mammouth() else EmergentChat(cle, systeme)
            brut = await client.send_message(UserMessage(text=demande))
            mo = re.search(r"\{.*\}", brut, re.S)
            obj = {}
            try:
                obj = json.loads(mo.group(0)) if mo else {}
            except ValueError:
                obj = {}
            if not isinstance(obj, dict) or not isinstance(obj.get("pages"), list):
                m = re.search(r"\[.*\]", brut, re.S)
                obj = {"pages": json.loads(m.group(0)) if m else []}
            ia = {x.get("cle"): x for x in obj["pages"] if isinstance(x, dict)}
            etapes = []
            for e in t["etapes"]:
                x = ia.get(e["cle"]) or {}
                etapes.append({**e, **{k: str(x[k])[:600] for k in ("titre", "accroche", "contenu", "bouton") if x.get(k)}})
            if ia:
                txt = lambda v, n=300: str(v or "")[:n]  # noqa: E731
                lst = lambda v, k: [txt(x, 160) for x in (v if isinstance(v, list) else [])][:k]  # noqa: E731
                o, u, d = obj.get("offre") or {}, obj.get("upsell") or {}, obj.get("downsell") or {}
                offre = {**(t.get("offre") or {}), **{k: txt(o.get(k)) for k in ("resultat_reve", "delai", "effort", "garantie") if o.get(k)}}
                if o.get("bonus"):
                    offre["bonus"] = lst(o["bonus"], 3)
                upsell = {**(t.get("upsell") or {}), **{k: txt(u.get(k), 120) for k in ("nom", "oui", "non") if u.get(k)}}
                if u.get("contenu"):
                    upsell["contenu"] = lst(u["contenu"], 4)
                downsell = {**(t.get("downsell") or {}), **({"nom": txt(d.get("nom"), 120)} if d.get("nom") else {})}
                return PropositionTunnel(etapes=etapes, source="ia", offre=offre, upsell=upsell, downsell=downsell,
                                         note="Tunnel rédigé par l'IA (pages, offre, upsell). Ajoute tes preuves et tes prix réels, relis puis enregistre.")
        except Exception:  # noqa: BLE001
            pass
    br = _brouillon(sujet, prof["metier"], t.get("parcours", "produit"), t["upsell"].get("type", "complementarite"))
    prix = {e["cle"]: (e.get("offre_nom"), e.get("prix")) for e in t["etapes"]}
    etapes = [{**e, "offre_nom": prix.get(e["cle"], (e["offre_nom"], None))[0] or e["offre_nom"], "prix": prix.get(e["cle"], (None, e["prix"]))[1]}
              for e in br["etapes"]]
    return PropositionTunnel(etapes=etapes, source="modele", note="IA indisponible : proposition issue du gabarit. Relisez puis enregistrez.")


_ = math  # garde l'import pour d'éventuels arrondis futurs
