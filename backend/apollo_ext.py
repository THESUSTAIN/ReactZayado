"""
Apollo.io → Radar : de vrais prospects chaque jour (compte Apollo de Zayado).

Principe
  • UNE clé Apollo plateforme (APOLLO_API_KEY sur Railway). L'utilisateur ne
    voit jamais de clé.
  • Recherche « People API Search » (0 crédit Apollo) filtrée par la cible de
    l'onboarding → puis enrichissement de 3 personnes maximum par jour
    (nom complet, LinkedIn, e-mail pro si disponible — consomme des crédits).
  • Quota mensuel par offre (Découverte : 0, Solo : 30, Pro : 90, Équipe : 150),
    réglable par variables APOLLO_QUOTA_<OFFRE>.
  • Les prospects sont gardés en base : relancer le scan ne reconsomme rien et
    on ne propose jamais deux fois la même personne.

Endpoints Apollo utilisés (docs.apollo.io) :
  POST /api/v1/mixed_people/api_search   (en-tête x-api-key)
  POST /api/v1/people/bulk_match         (10 personnes max par appel)
"""

import asyncio
import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import DateTime, String, Text, UniqueConstraint, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

log = logging.getLogger("kairos.apollo")

APOLLO_BASE = os.environ.get("APOLLO_BASE_URL", "https://api.apollo.io/api/v1").rstrip("/")
PAR_JOUR = 3
QUOTAS_DEFAUT = {"essentielle": 0, "reveur": 0, "serenite": 30, "pro": 90, "business": 150, "entreprise": 300}

# Cible (texte libre de l'onboarding) → intitulés de poste Apollo. Sert quand
# l'IA n'est pas disponible pour traduire la cible.
MOTS_POSTES = [
    (("solopreneur", "indépendant", "independant", "freelance", "auto-entrepreneur", "consultant"), ["Founder", "Freelance", "Consultant", "Fondateur"]),
    (("dirigeant", "ceo", "patron", "gérant", "gerant", "fondateur", "pme", "tpe", "entrepreneur", "startup", "start-up"), ["CEO", "Founder", "Managing Director", "Gérant", "Directeur général"]),
    (("rh", "ressources humaines", "recrutement"), ["HR Director", "DRH", "Head of People", "Talent Acquisition Manager"]),
    (("marketing", "communication", "marque"), ["Marketing Director", "Head of Marketing", "Directeur marketing"]),
    (("commercial", "vente", "sales"), ["Sales Director", "Head of Sales", "Directeur commercial"]),
    (("finance", "daf", "comptab"), ["CFO", "DAF", "Finance Director"]),
    (("coach", "thérapeute", "therapeute", "bien-être", "bien-etre"), ["Coach", "Therapist", "Founder"]),
    (("restaurant", "hôtel", "hotel", "commerce", "boutique"), ["Owner", "Gérant", "Manager"]),
    (("avocat", "notaire", "expert-comptable", "cabinet"), ["Partner", "Associé", "Managing Partner"]),
]
PAYS = {"france": ["France"], "belgique": ["Belgium"], "suisse": ["Switzerland"], "canada": ["Canada"],
        "francophonie": ["France", "Belgium", "Switzerland", "Canada"], "europe": ["Europe"]}


def cle_apollo() -> str:
    return (os.environ.get("APOLLO_API_KEY") or "").strip()


def quota_mensuel(plan: str) -> int:
    plan = (plan or "essentielle").lower()
    env = os.environ.get(f"APOLLO_QUOTA_{plan.upper()}")
    if env and env.strip().isdigit():
        return int(env)
    return QUOTAS_DEFAUT.get(plan, 0)


def quota_essai() -> int:
    """Prospects par mois pendant l'essai à 1 € (défaut 10)."""
    env = os.environ.get("APOLLO_QUOTA_ESSAI")
    return int(env) if env and env.strip().isdigit() else 10


def quota_interne() -> int:
    """Comptes admin / vendeur : quota Apollo propre (sinon 0 sans abonnement)."""
    env = os.environ.get("APOLLO_QUOTA_INTERNE")
    return int(env) if env and env.strip().isdigit() else 90


def filtres_depuis_contexte(cm: dict) -> dict:
    """Filtres Apollo déduits de la cible, sans IA (repli)."""
    cible = " ".join(str(cm.get(k) or "") for k in ("cible", "activite_type", "offre")).lower()
    titres: list = []
    for mots, postes in MOTS_POSTES:
        if any(m in cible for m in mots):
            titres += [p for p in postes if p not in titres]
    if not titres:
        titres = ["CEO", "Founder", "Gérant"]
    marche = str(cm.get("marche") or "france").lower()
    return {"person_titles": titres[:8], "person_locations": PAYS.get(marche, ["France"]), "q_keywords": ""}


# Clients particuliers (B2C) : Apollo ne contient pas les particuliers, et les
# démarcher par e-mail sans consentement est interdit (CNIL). On y cherche donc
# les PRESCRIPTEURS : les pros qui voient passer tes futurs clients.
PRESCRIPTEURS = [
    (("immobili", "gestion locative", "agence", "transaction", "syndic", "location"),
     ["Notaire", "Syndic de copropriété", "Courtier en crédit immobilier", "Gestionnaire de patrimoine",
      "Promoteur immobilier", "Diagnostiqueur immobilier", "Expert-comptable"]),
    (("coach", "thérapeut", "therapeut", "bien-être", "bien-etre", "sophro", "naturo", "yoga"),
     ["DRH", "Responsable QVT", "Médecin du travail", "Directeur de salle de sport", "Responsable RH"]),
    (("mariage", "événement", "evenement", "photographe", "traiteur"),
     ["Wedding planner", "Gérant de lieu de réception", "Responsable événementiel", "Directeur d'hôtel"]),
    (("travaux", "rénovation", "renovation", "artisan", "plomb", "électric", "electric", "menuis"),
     ["Architecte", "Agent immobilier", "Syndic de copropriété", "Maître d'œuvre", "Gestionnaire de biens"]),
    (("avocat", "juridique", "droit"), ["Expert-comptable", "Notaire", "Gestionnaire de patrimoine", "Banquier privé"]),
    (("santé", "sante", "kiné", "kine", "ostéo", "osteo", "dentist"), ["Médecin généraliste", "Pharmacien", "Directeur de clinique"]),
]


def postes_prescripteurs(cm: dict) -> list:
    texte = " ".join(str(cm.get(k) or "") for k in ("activite_type", "offre", "cible", "entreprise")).lower()
    for mots, postes in PRESCRIPTEURS:
        if any(m in texte for m in mots):
            return postes
    return ["Expert-comptable", "Gestionnaire de patrimoine", "Responsable associatif", "Gérant de commerce"]


def message_partenaire(p: dict, cm: dict) -> str:
    prenom = p.get("prenom") or ""
    offre = str(cm.get("offre") or "mon activité").strip().rstrip(".").lower()
    ville = (cm.get("zone_geo") or {}).get("nom") if isinstance(cm.get("zone_geo"), dict) else ""
    return (f"Bonjour {prenom}, je travaille{' à ' + ville if ville else ''} sur {offre}. "
            f"Vos clients ont parfois besoin de ce type d'accompagnement, et les miens du vôtre : "
            "seriez-vous ouvert à un café de 20 minutes pour voir comment nous recommander mutuellement ? "
            "Belle journée à vous.").replace("  ", " ")


def message_modele(p: dict, offre: str) -> str:
    prenom = p.get("prenom") or ""
    entreprise = p.get("entreprise") or "votre entreprise"
    offre_txt = f" J'accompagne des professionnels comme vous sur {offre.strip().rstrip('.').lower()}." if offre else ""
    return (f"Bonjour {prenom}, je découvre {entreprise} et votre rôle de {p.get('titre') or 'dirigeant'}."
            f"{offre_txt} Seriez-vous ouvert à un court échange de 15 minutes pour voir si je peux vous être utile ? "
            "Belle journée à vous.").replace("  ", " ")


def install_apollo(g: dict) -> None:
    api, Base, get_db = g["api"], g["Base"], g["get_db"]
    _uid, new_uuid, utcnow, logger = g["_uid"], g["new_uuid"], g["utcnow"], g["logger"]

    class RadarProspect(Base):
        __tablename__ = "radar_prospects"
        __table_args__ = (UniqueConstraint("user_id", "apollo_id", name="uq_prospect_user_apollo"),)
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        apollo_id: Mapped[str] = mapped_column(String(64))
        jour: Mapped[str] = mapped_column(String(10), index=True)
        prenom: Mapped[str] = mapped_column(String(120), default="")
        nom: Mapped[str] = mapped_column(String(160), default="")
        titre: Mapped[str] = mapped_column(String(255), default="")
        entreprise: Mapped[str] = mapped_column(String(255), default="")
        domaine: Mapped[str] = mapped_column(String(255), nullable=True)
        linkedin: Mapped[str] = mapped_column(String(500), nullable=True)
        email: Mapped[str] = mapped_column(String(255), nullable=True)
        ville: Mapped[str] = mapped_column(String(160), nullable=True)
        message: Mapped[str] = mapped_column(Text, default="")
        enrichi: Mapped[str] = mapped_column(String(5), default="non")
        statut: Mapped[str] = mapped_column(String(20), default="nouveau")
        role: Mapped[str] = mapped_column(String(20), nullable=True, default="client")  # client | partenaire
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    g["RadarProspect"] = RadarProspect

    def _pj(p: RadarProspect) -> dict:
        return {"id": p.id, "prenom": p.prenom, "nom": p.nom, "titre": p.titre, "entreprise": p.entreprise,
                "domaine": p.domaine, "linkedin": p.linkedin, "email": p.email, "ville": p.ville,
                "message": p.message, "statut": p.statut, "jour": p.jour, "enrichi": p.enrichi == "oui",
                "role": p.role or "client"}

    async def _appel(chemin: str, corps: dict) -> dict:
        async with httpx.AsyncClient(timeout=25.0) as http:
            r = await http.post(f"{APOLLO_BASE}/{chemin}", json=corps,
                                headers={"x-api-key": cle_apollo(), "Content-Type": "application/json",
                                         "Cache-Control": "no-cache"})
        if r.status_code in (401, 403):
            raise RuntimeError(f"Apollo refuse la clé ({r.status_code}) : vérifie APOLLO_API_KEY et ses droits (clé « master » ou scope api_search).")
        if r.status_code == 429:
            raise RuntimeError("Apollo : limite de requêtes atteinte.")
        r.raise_for_status()
        return r.json()

    async def _filtres(db: AsyncSession, uid: str, profil, mode: str = "client") -> dict:
        cm = dict(getattr(profil, "contexte_metier", None) or {})
        if mode == "partenaire":
            geo = cm.get("zone_geo") if isinstance(cm.get("zone_geo"), dict) else {}
            lieu = [f"{geo['nom']}, France"] if geo.get("nom") else filtres_depuis_contexte(cm)["person_locations"]
            return {"person_titles": postes_prescripteurs(cm), "person_locations": lieu, "q_keywords": ""}
        empreinte = "|".join(str(cm.get(k) or "") for k in ("cible", "activite_type", "offre", "marche"))
        cache = cm.get("apollo_filtres")
        if isinstance(cache, dict) and cache.get("_empreinte") == empreinte:
            return cache
        filtres = filtres_depuis_contexte(cm)
        client_llm = g.get("_client_llm")
        client = client_llm(f"apollo-filtres-{uid}", (
            "Tu traduis la cible d'un entrepreneur en filtres de recherche Apollo.io. Réponds UNIQUEMENT en JSON : "
            '{"person_titles":["..."],"q_keywords":"..."} — 3 à 8 intitulés de poste (anglais ET français), '
            "q_keywords : 0 à 3 mots-clés du secteur visé, ou chaîne vide.")) if client_llm else None
        if client is not None and cm.get("cible"):
            try:
                from llm_mammouth import UserMessage
                texte = await asyncio.wait_for(client.send_message(UserMessage(text=json.dumps(
                    {"cible": cm.get("cible"), "offre": cm.get("offre"), "activite": cm.get("activite_type")}, ensure_ascii=False))), timeout=20)
                m = re.search(r"\{.*\}", str(texte), re.S)
                d = json.loads(m.group(0)) if m else {}
                titres = [str(t)[:60] for t in (d.get("person_titles") or []) if str(t).strip()][:8]
                if titres:
                    filtres["person_titles"] = titres
                filtres["q_keywords"] = str(d.get("q_keywords") or "")[:80]
            except Exception as e:  # noqa: BLE001
                logger.info("Filtres Apollo par IA indisponibles (%s) : repli par mots-clés.", e)
        filtres["_empreinte"] = empreinte
        profil.contexte_metier = {**cm, "apollo_filtres": filtres}
        await db.commit()
        return filtres

    async def _messages(uid: str, prospects: list, cm: dict) -> list:
        """Un message d'approche personnalisé par prospect (IA si dispo, sinon modèle)."""
        offre = str(cm.get("offre") or "")
        client_llm = g.get("_client_llm")
        client = client_llm(f"apollo-msg-{uid}-{datetime.now(timezone.utc).date()}", (
            "Tu rédiges des messages de prise de contact B2B courts (60 à 90 mots), en français, en VOUVOYANT, "
            "chaleureux et précis, sans flatterie ni promesse exagérée, prêts à envoyer (aucun crochet à remplir). "
            'Réponds UNIQUEMENT en JSON : {"messages":["...","..."]} dans le même ordre que les prospects.')) if client_llm else None
        if client is not None:
            try:
                from llm_mammouth import UserMessage
                entree = {"mon_offre": offre, "ma_cible": cm.get("cible"),
                          "prospects": [{k: p.get(k) for k in ("prenom", "titre", "entreprise", "ville")} for p in prospects]}
                texte = await asyncio.wait_for(client.send_message(UserMessage(text=json.dumps(entree, ensure_ascii=False))), timeout=30)
                m = re.search(r"\{.*\}", str(texte), re.S)
                msgs = (json.loads(m.group(0)) if m else {}).get("messages") or []
                if len(msgs) >= len(prospects):
                    return [str(x).strip()[:1200] for x in msgs[:len(prospects)]]
            except Exception as e:  # noqa: BLE001
                logger.info("Messages Apollo par IA indisponibles (%s) : modèle utilisé.", e)
        return [message_modele(p, offre) for p in prospects]

    async def _plan_quota(db: AsyncSession, uid: str, profil) -> tuple:
        plan = (getattr(profil, "plan", None) or "essentielle").lower()
        quota = quota_mensuel(plan)
        User = g.get("User")
        u = await db.get(User, uid) if User is not None else None
        if u is not None and u.role in ("admin", "vendeur"):
            return plan, max(quota, quota_interne())
        # Essai à 1 € : quota réduit pendant l'essai, quota normal dès le 1er prélèvement.
        Ab = g.get("Abonnement")
        a = await db.get(Ab, uid) if Ab is not None else None
        if a is not None and a.cycle == "essai":
            quota = min(quota, quota_essai())
        return plan, quota

    async def statut_apollo(db: AsyncSession, uid: str) -> dict:
        """État lisible d'Apollo pour l'écran « Sources du Radar »."""
        profil = await g["_profil"](db, uid)
        plan, quota = await _plan_quota(db, uid, profil)
        jour = datetime.now(timezone.utc).date().isoformat()
        utilises = (await db.execute(select(func.count()).select_from(RadarProspect).where(
            RadarProspect.user_id == uid, RadarProspect.jour >= jour[:8] + "01"))).scalar_one()
        if not cle_apollo():
            etat = "non_configure"
        elif quota <= 0:
            etat = "hors_offre"
        elif utilises >= quota:
            etat = "quota"
        else:
            etat = "ok"
        return {"etat": etat, "quota": quota, "utilises": utilises, "plan": plan}

    g["_statut_apollo"] = statut_apollo

    async def prospects_du_jour(db: AsyncSession, uid: str, mode: str = "client") -> dict:
        """Prospects réels du jour pour le Radar. Ne lève jamais : renvoie un état.
        mode « client » (clientèle pro) ou « partenaire » (clientèle de particuliers → prescripteurs)."""
        jour = datetime.now(timezone.utc).date().isoformat()
        deja = list((await db.execute(select(RadarProspect).where(
            RadarProspect.user_id == uid, RadarProspect.jour == jour).order_by(RadarProspect.created_at))).scalars())
        if not cle_apollo():
            return {"etat": "non_configure", "prospects": [_pj(p) for p in deja]}
        profil = await g["_profil"](db, uid)
        plan, quota = await _plan_quota(db, uid, profil)
        debut_mois = jour[:8] + "01"
        utilises = (await db.execute(select(func.count()).select_from(RadarProspect).where(
            RadarProspect.user_id == uid, RadarProspect.jour >= debut_mois))).scalar_one()
        info = {"quota": quota, "utilises": utilises, "plan": plan}
        par_jour = 1 if mode == "partenaire" else PAR_JOUR  # 1 prescripteur/jour suffit, le reste vient des signaux
        manque = min(par_jour - len(deja), quota - utilises)
        if manque <= 0:
            return {"etat": "quota" if quota - utilises <= 0 and len(deja) == 0 else "ok",
                    "prospects": [_pj(p) for p in deja], **info}
        try:
            filtres = await _filtres(db, uid, profil, mode)
            connus = set((await db.execute(select(RadarProspect.apollo_id).where(RadarProspect.user_id == uid))).scalars())
            page = (datetime.now(timezone.utc).toordinal() + len(connus)) % 5 + 1
            corps = {k: v for k, v in filtres.items() if not k.startswith("_") and v}
            corps.update({"page": page, "per_page": 25})
            rep = await _appel("mixed_people/api_search", corps)
            gens = [p for p in (rep.get("people") or []) if p.get("id") and p["id"] not in connus]
            if not gens and page != 1:
                corps["page"] = 1
                rep = await _appel("mixed_people/api_search", corps)
                gens = [p for p in (rep.get("people") or []) if p.get("id") and p["id"] not in connus]
            choisis = gens[:manque]
            if not choisis:
                return {"etat": "aucun_resultat", "prospects": [_pj(p) for p in deja], **info}
            enrichis: dict = {}
            try:
                rep2 = await _appel("people/bulk_match", {"details": [{"id": p["id"]} for p in choisis],
                                                          "reveal_personal_emails": False, "reveal_phone_number": False})
                for m in rep2.get("matches") or []:
                    if m and m.get("id"):
                        enrichis[m["id"]] = m
            except Exception as e:  # noqa: BLE001
                logger.warning("Enrichissement Apollo impossible (%s) : prospects sans nom complet.", e)
            fiches = []
            for p in choisis:
                e = enrichis.get(p["id"]) or {}
                org = e.get("organization") or p.get("organization") or {}
                email = e.get("email") if e.get("email") and "email_not_unlocked" not in str(e.get("email")) else None
                fiches.append({
                    "apollo_id": p["id"],
                    "prenom": e.get("first_name") or p.get("first_name") or "",
                    "nom": e.get("last_name") or p.get("last_name_obfuscated") or "",
                    "titre": e.get("title") or p.get("title") or "",
                    "entreprise": org.get("name") or "",
                    "domaine": org.get("primary_domain") or org.get("website_url") or None,
                    "linkedin": e.get("linkedin_url") or p.get("linkedin_url") or None,
                    "email": email,
                    "ville": ", ".join(x for x in (e.get("city"), e.get("country")) if x) or None,
                    "enrichi": "oui" if e else "non",
                })
            cm_p = dict(getattr(profil, "contexte_metier", None) or {})
            if mode == "partenaire":
                msgs = [message_partenaire(f, cm_p) for f in fiches]
            else:
                msgs = await _messages(uid, fiches, cm_p)
            for f, msg in zip(fiches, msgs):
                db.add(RadarProspect(user_id=uid, jour=jour, message=msg, role=mode, **f))
            await db.commit()
            tous = list((await db.execute(select(RadarProspect).where(
                RadarProspect.user_id == uid, RadarProspect.jour == jour).order_by(RadarProspect.created_at))).scalars())
            return {"etat": "ok", "prospects": [_pj(p) for p in tous], **info, "utilises": utilises + len(fiches), "mode": mode}
        except Exception as e:  # noqa: BLE001
            await db.rollback()
            logger.warning("Apollo indisponible : %s", e)
            return {"etat": "erreur", "prospects": [_pj(p) for p in deja], **info}

    g["_prospects_apollo"] = prospects_du_jour

    class StatutIn(BaseModel):
        statut: str

    @api.get("/radar/prospects")
    async def lister_prospects(db: AsyncSession = Depends(get_db)):
        rows = (await db.execute(select(RadarProspect).where(RadarProspect.user_id == _uid())
                                 .order_by(RadarProspect.created_at.desc()).limit(200))).scalars().all()
        return {"items": [_pj(p) for p in rows], "apollo": bool(cle_apollo())}

    @api.patch("/radar/prospects/{pid}")
    async def maj_prospect(pid: str, body: StatutIn, db: AsyncSession = Depends(get_db)):
        if body.statut not in ("nouveau", "contacte", "en_discussion", "signe", "ecarte"):
            raise HTTPException(400, "Statut inconnu.")
        p = (await db.execute(select(RadarProspect).where(RadarProspect.id == pid, RadarProspect.user_id == _uid()))).scalar_one_or_none()
        if not p:
            raise HTTPException(404, "Prospect introuvable.")
        p.statut = body.statut
        await db.commit()
        return _pj(p)
