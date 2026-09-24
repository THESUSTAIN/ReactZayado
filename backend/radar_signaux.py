"""
Radar « signaux » — ce qui se passe VRAIMENT autour de l'entrepreneur.

Avant, le Radar ne proposait que des types de clients (« bailleurs frustrés »…)
que l'utilisateur connaît déjà. Désormais il part de signaux réels :

  1. Recherches Google près de chez lui (volumes réels DataForSEO, tendance
     sur 12 mois) → post Google Business + annonce Google Ads prêts à publier.
  2. Publicité Meta (Facebook / Instagram) prête à lancer : texte, titre,
     ciblage (zone, âge, centres d'intérêt), budget conseillé, visuel.
  3. Immobilier : ventes réelles récentes dans sa commune (DVF, données
     publiques Cerema) → courrier de boîtage prêt à imprimer.
  4. Prescripteurs (Apollo) quand la clientèle est faite de particuliers :
     voir apollo_ext.py (mode « partenaire »).

Clientèle de particuliers : pas de démarchage par e-mail sans consentement
(règle CNIL) → le Radar aide à ATTIRER ceux qui cherchent déjà.

Variables : DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD (volumes Google),
DVF_API_URL (défaut Cerema), GEO_API_URL (défaut geo.api.gouv.fr).
"""
import asyncio
import json
import logging
import os
import re
import statistics
from datetime import date, datetime, timezone
from typing import Optional

import httpx
from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import JSON, DateTime, String, UniqueConstraint, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

log = logging.getLogger("kairos.signaux")

GEO_API = os.environ.get("GEO_API_URL", "https://geo.api.gouv.fr").rstrip("/")
DVF_API = os.environ.get("DVF_API_URL", "https://apidf-preprod.cerema.fr/dvf_opendata/mutations/")
DFS_URL = "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live"

MOTS_B2C = ("particulier", "propriétaire", "proprietaire", "bailleur", "locataire", "famille", "parent", "femme",
            "homme", "étudiant", "etudiant", "retraité", "retraite", "senior", "vendeur", "acheteur", "patient",
            "client final", "grand public", "couple", "futurs mariés", "futurs maries", "enfant", "habitant")
MOTS_B2B = ("entreprise", "dirigeant", "pme", "tpe", "startup", "start-up", "b2b", "professionnel", "société",
            "societe", "cabinet", "commerçant", "commercant", "artisan", "indépendant", "independant", "freelance", "rh ", "drh")
MOTS_IMMO = ("immobili", "gestion locative", "transaction", "syndic", "agence immo", "mandat", "location saisonni")


def type_clientele(cm: dict) -> str:
    """b2c (particuliers), b2b (professionnels) ou mixte — réglable par l'utilisateur."""
    choisi = str(cm.get("clientele") or "").lower()
    if choisi in ("b2c", "b2b", "mixte"):
        return choisi
    texte = " ".join(str(cm.get(k) or "") for k in ("cible", "activite_type", "offre")).lower()
    c = sum(m in texte for m in MOTS_B2C) + (2 if any(m in texte for m in MOTS_IMMO) else 0)
    b = sum(m in texte for m in MOTS_B2B)
    if c and b:
        return "mixte" if abs(c - b) <= 1 else ("b2c" if c > b else "b2b")
    return "b2c" if c else "b2b"


def est_immobilier(cm: dict) -> bool:
    texte = " ".join(str(cm.get(k) or "") for k in ("activite_type", "offre", "cible", "entreprise")).lower()
    return any(m in texte for m in MOTS_IMMO)


def mots_cles_modele(cm: dict, ville: str) -> list:
    """Mots-clés de départ sans IA : métier × intention × ville."""
    offre = str(cm.get("offre") or cm.get("activite_type") or "").lower().strip()
    ville = (ville or "").lower()
    if est_immobilier(cm):
        base = ["agence immobilière", "estimation maison", "estimation appartement", "gestion locative",
                "vendre sa maison", "location appartement", "prix immobilier", "agent immobilier"]
    else:
        mots = [m for m in re.split(r"[^a-zàâçéèêëîïôûùüÿœ-]+", offre) if len(m) > 3][:3]
        base = [" ".join(mots)] if mots else []
        base += [f"{b} prix" for b in base[:1]] + [f"meilleur {b}" for b in base[:1]]
    out = []
    for b in base:
        b = b.strip()
        if b:
            out.append(f"{b} {ville}".strip() if ville else b)
    return list(dict.fromkeys(out))[:12]


def tendance(mensuel: list) -> Optional[int]:
    """% d'évolution : moyenne des 3 derniers mois vs les 3 précédents."""
    vals = [m.get("search_volume") for m in sorted(mensuel or [], key=lambda m: (m.get("year", 0), m.get("month", 0)))
            if isinstance(m.get("search_volume"), (int, float))]
    if len(vals) < 6:
        return None
    rec, avant = sum(vals[-3:]) / 3, sum(vals[-6:-3]) / 3
    if avant <= 0:
        return None
    return round((rec - avant) / avant * 100)


def stats_dvf(mutations: list) -> dict:
    """Ventes et prix médian au m² (maisons / appartements) à partir des mutations DVF."""
    groupes = {"maisons": [], "apparts": []}
    n = 0
    for m in mutations:
        try:
            valeur = float(m.get("valeurfonc") or 0)
            surf = float(m.get("sbati") or 0)
        except (TypeError, ValueError):
            continue
        if valeur <= 0:
            continue
        n += 1
        lib = str(m.get("libtypbien") or m.get("codtypbien") or "").lower()
        if surf >= 9:
            if "maison" in lib or lib.startswith("11"):
                groupes["maisons"].append(valeur / surf)
            elif "appart" in lib or lib.startswith("12"):
                groupes["apparts"].append(valeur / surf)
    res = {"ventes": n}
    for k, v in groupes.items():
        v = [x for x in v if 300 <= x <= 30000]  # écarte les mutations aberrantes
        if v:
            res[k] = {"n": len(v), "prix_m2_median": int(round(statistics.median(v), -1))}
    return res


def install_radar_signaux(g: dict) -> None:
    api, Base, get_db = g["api"], g["Base"], g["get_db"]
    _uid, new_uuid, utcnow, logger = g["_uid"], g["new_uuid"], g["utcnow"], g["logger"]

    class RadarSignal(Base):
        __tablename__ = "radar_signaux"
        __table_args__ = (UniqueConstraint("user_id", "cle", name="uq_signal_user_cle"),)
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        cle: Mapped[str] = mapped_column(String(80))  # ex. « mots:2026-W39 », « dvf:69266:2026-09 »
        data: Mapped[dict] = mapped_column(JSON, default=dict)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    async def _cache_lire(db, uid, cle):
        r = (await db.execute(select(RadarSignal).where(RadarSignal.user_id == uid, RadarSignal.cle == cle))).scalar_one_or_none()
        return r.data if r else None

    async def _cache_ecrire(db, uid, cle, data):
        r = (await db.execute(select(RadarSignal).where(RadarSignal.user_id == uid, RadarSignal.cle == cle))).scalar_one_or_none()
        if r:
            r.data = data
        else:
            db.add(RadarSignal(user_id=uid, cle=cle, data=data))
        await db.commit()

    async def _llm_json(session: str, systeme: str, entree: dict, delai: int = 35) -> Optional[dict]:
        f = g.get("_client_llm")
        client = f(session, systeme) if f else None
        if client is None:
            return None
        try:
            from llm_mammouth import UserMessage
            texte = await asyncio.wait_for(client.send_message(UserMessage(text=json.dumps(entree, ensure_ascii=False))), timeout=delai)
            m = re.search(r"\{.*\}", str(texte), re.S)
            return json.loads(m.group(0)) if m else None
        except Exception as e:  # noqa: BLE001
            logger.info("Radar signaux : IA indisponible (%s)", e)
            return None

    # ── Zone géographique (geo.api.gouv.fr) ──
    async def _zone(db, profil) -> Optional[dict]:
        cm = dict(profil.contexte_metier or {})
        brut = str(cm.get("zone") or "").strip()
        geo = cm.get("zone_geo") if isinstance(cm.get("zone_geo"), dict) else None
        if not brut:
            return None
        if geo and geo.get("_saisie") == brut:
            return geo
        params = {"fields": "code,nom,codesPostaux,centre,departement", "boost": "population", "limit": 1}
        params["codePostal" if re.fullmatch(r"\d{5}", brut) else "nom"] = brut
        try:
            async with httpx.AsyncClient(timeout=10) as http:
                r = await http.get(f"{GEO_API}/communes", params=params)
            r.raise_for_status()
            c = (r.json() or [None])[0]
        except Exception as e:  # noqa: BLE001
            logger.info("geo.api.gouv.fr indisponible (%s)", e)
            c = None
        if not c:
            return {"nom": brut, "_saisie": brut}
        coords = ((c.get("centre") or {}).get("coordinates") or [None, None])
        geo = {"nom": c.get("nom"), "code_insee": c.get("code"), "cp": (c.get("codesPostaux") or [None])[0],
               "departement": (c.get("departement") or {}).get("nom"), "lon": coords[0], "lat": coords[1], "_saisie": brut}
        profil.contexte_metier = {**cm, "zone_geo": geo}
        await db.commit()
        return geo

    # ── 1. Recherches Google ──
    async def _mots_cles(db, uid, cm, geo) -> dict:
        semaine = date.today().isocalendar()
        cle = f"mots:{semaine[0]}-W{semaine[1]:02d}"
        deja = await _cache_lire(db, uid, cle)
        if deja:
            return deja
        ville = (geo or {}).get("nom") or ""
        graines = None
        d = await _llm_json(f"signaux-mots-{uid}-{cle}", (
            "Tu es expert SEO/SEA local en France. À partir de l'activité, liste 12 requêtes Google que tapent "
            "de VRAIS clients prêts à acheter (intention commerciale, pas informationnelle), en français, "
            "courtes (2 à 5 mots), dont au moins 6 avec la ville. Réponds UNIQUEMENT en JSON : {\"mots\":[\"...\"]}"),
            {"activite": cm.get("activite_type"), "offre": cm.get("offre"), "cible": cm.get("cible"), "ville": ville})
        if d and isinstance(d.get("mots"), list):
            graines = [str(m).strip().lower()[:80] for m in d["mots"] if str(m).strip()][:15]
        if not graines:
            graines = mots_cles_modele(cm, ville)
        res = {"source": "ia", "mots": [{"mot": m, "volume": None, "tendance": None} for m in graines], "ville": ville}
        login, mdp = os.environ.get("DATAFORSEO_LOGIN"), os.environ.get("DATAFORSEO_PASSWORD")
        if login and mdp and graines:
            tache = {"keywords": graines, "language_code": "fr"}
            if geo and geo.get("lat") is not None:
                tache["location_coordinate"] = f"{geo['lat']:.4f},{geo['lon']:.4f},20"
            else:
                tache["location_code"] = 2250  # France
            try:
                async with httpx.AsyncClient(timeout=40) as http:
                    r = await http.post(DFS_URL, auth=(login, mdp), json=[tache])
                    items = (((r.json().get("tasks") or [{}])[0]).get("result") or []) if r.status_code < 400 else []
                    if not items and "location_coordinate" in tache:  # repli France entière
                        tache.pop("location_coordinate"); tache["location_code"] = 2250
                        r = await http.post(DFS_URL, auth=(login, mdp), json=[tache])
                        items = (((r.json().get("tasks") or [{}])[0]).get("result") or []) if r.status_code < 400 else []
                        res["perimetre"] = "France"
                mots = [{"mot": it.get("keyword"), "volume": it.get("search_volume"), "tendance": tendance(it.get("monthly_searches")),
                         "cpc": it.get("cpc"), "concurrence": it.get("competition")} for it in items if it.get("keyword")]
                mots = sorted(mots, key=lambda m: -(m["volume"] or 0))
                if mots:
                    res = {"source": "dataforseo", "mots": mots[:10], "ville": ville,
                           "perimetre": res.get("perimetre") or (f"{ville} + 20 km" if ville else "France")}
            except Exception as e:  # noqa: BLE001
                logger.warning("DataForSEO indisponible (%s) : mots-clés sans volumes.", e)
        await _cache_ecrire(db, uid, cle, res)
        return res

    # ── 2. Contenus prêts à publier (Google Business, Google Ads, Meta) ──
    async def _contenus(db, uid, cm, geo, mots) -> dict:
        semaine = date.today().isocalendar()
        cle = f"pubs:{semaine[0]}-W{semaine[1]:02d}"
        deja = await _cache_lire(db, uid, cle)
        if deja:
            return deja
        ville = (geo or {}).get("nom") or ""
        top = [m["mot"] for m in (mots.get("mots") or [])[:5]]
        d = await _llm_json(f"signaux-pubs-{uid}-{cle}", (
            "Tu es un expert en acquisition locale (Google Business Profile, Google Ads, Meta Ads) pour les TPE françaises. "
            "Rédige des contenus prêts à publier, sans promesse exagérée, conformes aux règles publicitaires (pas de "
            "ciblage par caractéristiques sensibles). Réponds UNIQUEMENT en JSON : "
            '{"post_google":"post Google Business de 80 à 120 mots avec un appel à l\'action",'
            '"annonce_google":{"titres":["3 titres de 30 caractères max"],"descriptions":["2 descriptions de 90 caractères max"]},'
            '"meta":{"texte":"texte principal 60 à 110 mots","titre":"40 caractères max","description":"30 caractères max",'
            '"cta":"En savoir plus|Obtenir un devis|S\'inscrire|Nous contacter","visuel":"description du visuel conseillé",'
            '"ciblage":{"rayon_km":10,"age_min":25,"age_max":65,"interets":["3 à 6 centres d\'intérêt Meta"]},'
            '"budget_jour":5,"duree_jours":7,"formulaire":["2 à 3 questions du formulaire de contact"]}}'),
            {"entreprise": cm.get("entreprise"), "activite": cm.get("activite_type"), "offre": cm.get("offre"),
             "cible": cm.get("cible"), "approche": cm.get("approche"), "ville": ville, "requetes_google": top})
        if not d:
            nom = cm.get("entreprise") or "notre équipe"
            offre = str(cm.get("offre") or cm.get("activite_type") or "notre accompagnement").strip().rstrip(".")
            d = {
                "post_google": (f"{nom}{' à ' + ville if ville else ''} : {offre}. Vous avez un projet ? Nous prenons le temps "
                                "d'écouter votre situation et de vous proposer une solution claire, sans engagement. "
                                "Contactez-nous dès aujourd'hui pour un premier échange gratuit."),
                "annonce_google": {"titres": [f"{offre[:30]}", f"{('Expert ' + ville)[:30] if ville else 'Échange offert'}", "Premier échange offert"],
                                   "descriptions": [f"{offre[:60]}. Réponse sous 24 h, sans engagement.",
                                                    "Une équipe à l'écoute, un accompagnement clair de A à Z."]},
                "meta": {"texte": (f"Vous avez un projet{' à ' + ville if ville else ''} ? {nom} vous accompagne : {offre}. "
                                   "Laissez vos coordonnées, on vous rappelle pour un premier échange offert."),
                         "titre": "Premier échange offert", "description": "Réponse sous 24 h", "cta": "Nous contacter",
                         "visuel": "Photo réelle de vous ou de votre équipe, lumière naturelle, sans texte incrusté.",
                         "ciblage": {"rayon_km": 10, "age_min": 25, "age_max": 65, "interets": []},
                         "budget_jour": 5, "duree_jours": 7, "formulaire": ["Nom", "Téléphone", "Votre projet en une phrase"]},
            }
        d["ville"] = ville
        await _cache_ecrire(db, uid, cle, d)
        return d

    # ── 3. Immobilier : ventes réelles (DVF) + courrier de boîtage ──
    async def _dvf(db, uid, cm, geo) -> Optional[dict]:
        if not geo or not geo.get("code_insee"):
            return None
        mois = date.today().strftime("%Y-%m")
        cle = f"dvf:{geo['code_insee']}:{mois}"
        deja = await _cache_lire(db, uid, cle)
        if deja:
            return deja
        annee_min = date.today().year - 2
        mutations, url, pages = [], DVF_API, 0
        params = {"code_insee": geo["code_insee"], "anneemut_min": annee_min, "page_size": 500}
        try:
            async with httpx.AsyncClient(timeout=20) as http:
                while url and pages < 6:
                    r = await http.get(url, params=params if pages == 0 else None)
                    r.raise_for_status()
                    j = r.json()
                    lot = j.get("results") if isinstance(j, dict) else j
                    if isinstance(lot, dict):  # GeoJSON éventuel
                        lot = [f.get("properties") or {} for f in lot.get("features") or []]
                    mutations += [m for m in (lot or []) if isinstance(m, dict)]
                    url = j.get("next") if isinstance(j, dict) else None
                    pages += 1
        except Exception as e:  # noqa: BLE001
            logger.info("DVF indisponible pour %s (%s)", geo.get("code_insee"), e)
            return None
        if not mutations:
            return None
        stats = stats_dvf(mutations)
        stats.update({"commune": geo.get("nom"), "depuis": annee_min, "source": "DVF (Cerema, données publiques)"})
        offre = str(cm.get("offre") or "").strip().rstrip(".")
        nom = cm.get("entreprise") or "Votre agence"
        prix = []
        if stats.get("maisons"):
            prix.append(f"{stats['maisons']['prix_m2_median']:,} €/m² pour une maison".replace(",", " "))
        if stats.get("apparts"):
            prix.append(f"{stats['apparts']['prix_m2_median']:,} €/m² pour un appartement".replace(",", " "))
        stats["courrier"] = (
            f"Madame, Monsieur,\n\nÀ {geo.get('nom')}, {stats['ventes']} biens ont changé de propriétaire depuis {annee_min}"
            + (f" (prix médian : {' et '.join(prix)})" if prix else "") + ". "
            "Le marché bouge dans votre quartier : si vous vous demandez ce que vaut votre bien aujourd'hui, "
            f"{nom} vous propose une estimation gratuite et sans engagement"
            + (f" — {offre.lower()}" if offre else "") + ".\n\n"
            "Il vous suffit de nous appeler ou de répondre à ce courrier.\n\nBien cordialement,\n"
            f"{nom}\n\n(Données publiques DVF. Si vous ne souhaitez plus recevoir nos courriers, dites-le-nous : "
            "nous respectons les boîtes « Stop pub ».)")
        await _cache_ecrire(db, uid, cle, stats)
        return stats

    async def signaux(db: AsyncSession, uid: str) -> dict:
        profil = await g["_profil"](db, uid)
        cm = dict(profil.contexte_metier or {})
        clientele = type_clientele(cm)
        geo = await _zone(db, profil)
        cm = dict(profil.contexte_metier or {})
        manque = []
        if not cm.get("zone"):
            manque.append("zone")
        sortie = {"clientele": clientele, "immobilier": est_immobilier(cm), "zone": geo, "manque": manque,
                  "volumes_reels": bool(os.environ.get("DATAFORSEO_LOGIN") and os.environ.get("DATAFORSEO_PASSWORD"))}
        # Signaux payants (DataForSEO…) réservés aux offres actives (et aux rôles internes).
        plan = (getattr(profil, "plan", None) or "essentielle").lower()
        User = g.get("User")
        u = await db.get(User, uid) if User is not None else None
        if plan == "essentielle" and not (u and u.role in ("admin", "vendeur")):
            sortie["verrou"] = True
            return sortie
        if clientele in ("b2c", "mixte"):
            mots = await _mots_cles(db, uid, cm, geo)
            sortie["recherches"] = mots
            sortie["contenus"] = await _contenus(db, uid, cm, geo, mots)
            if est_immobilier(cm):
                sortie["dvf"] = await _dvf(db, uid, cm, geo)
        return sortie

    g["_radar_signaux"] = signaux
    g["_type_clientele"] = type_clientele

    @api.get("/radar/signaux")
    async def radar_signaux(db: AsyncSession = Depends(get_db)):
        return await signaux(db, _uid())

    class ReglagesIn(BaseModel):
        clientele: Optional[str] = Field(default=None, max_length=10)
        zone: Optional[str] = Field(default=None, max_length=80)

    @api.put("/radar/reglages")
    async def radar_reglages(body: ReglagesIn, db: AsyncSession = Depends(get_db)):
        uid = _uid()
        profil = await g["_profil"](db, uid)
        cm = dict(profil.contexte_metier or {})
        if body.clientele is not None:
            if body.clientele not in ("", "b2c", "b2b", "mixte"):
                raise HTTPException(400, "Clientèle : b2c, b2b ou mixte.")
            cm["clientele"] = body.clientele
        if body.zone is not None:
            cm["zone"] = body.zone.strip()
        profil.contexte_metier = cm
        await db.commit()
        # Les signaux de la semaine sont recalculés avec les nouveaux réglages.
        for r in (await db.execute(select(RadarSignal).where(RadarSignal.user_id == uid))).scalars():
            if r.cle.startswith(("mots:", "pubs:")):
                await db.delete(r)
        await db.commit()
        cache = g.get("_RADAR_CACHE")
        if isinstance(cache, dict):
            cache.pop(uid, None)
        return {"ok": True, "clientele": type_clientele(cm), "zone": cm.get("zone")}
