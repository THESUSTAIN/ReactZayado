"""Organisation : l'entreprise du client (nom, SIRET, pays, activité).

- Recherche par nom ou SIRET via l'API publique « Recherche d'entreprises »
  (recherche-entreprises.api.gouv.fr, gratuite, sans clé) : SIREN/SIRET, activité (NAF),
  adresse, effectif, dirigeants, et chiffre d'affaires / résultat quand ils sont publiés.
- Sert de base pour : le pays du LÉGAL dans l'actualité (celui de l'entreprise déclarée),
  les SECTEURS de veille proposés par défaut, et à terme le rattachement des membres,
  des factures et de l'app RH à une même entreprise.
Les coéquipiers (offre Équipe/Entreprise) voient l'organisation de leur titulaire.
"""
import logging
import re
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import JSON, DateTime, String, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

log = logging.getLogger("kairos.organisation")
API_ENTREPRISES = "https://recherche-entreprises.api.gouv.fr/search"

# Code NAF (2 premiers chiffres) → secteur de veille (clés de SECTEURS_ACTU).
_NAF_SECTEUR = [
    (range(1, 4), "agriculture"), (range(10, 13), "agriculture"), (range(5, 34), "industrie"), (range(35, 40), "industrie"),
    (range(41, 44), "btp"), (range(45, 48), "commerce"), (range(49, 54), "transport"), (range(55, 57), "restauration"),
    (range(58, 61), "marketing"), (range(61, 64), "tech"), (range(64, 67), "finance"), (range(68, 69), "immobilier"),
    (range(69, 72), "entreprises"), (range(72, 73), "tech"), (range(73, 74), "marketing"), (range(74, 83), "entreprises"),
    (range(85, 86), "formation"), (range(86, 89), "sante"), (range(90, 94), "marketing"), (range(96, 97), "sante"),
]
# Activité choisie à l'onboarding → secteurs de veille par défaut.
ACTIVITE_SECTEURS = {
    "Coaching & conseil": ["formation", "entreprises"], "Services aux entreprises": ["entreprises", "finance"],
    "Commerce & e-commerce": ["commerce", "marketing"], "Immobilier": ["immobilier", "finance"],
    "Artisanat & BTP": ["btp", "entreprises"], "Santé & bien-être": ["sante", "entreprises"],
    "Tech & digital": ["tech", "marketing"], "Création & contenu": ["marketing", "tech"],
    "Restauration": ["restauration", "commerce"],
}


def secteur_depuis_naf(naf: Optional[str]) -> Optional[str]:
    m = re.match(r"(\d{2})", naf or "")
    if not m:
        return None
    n = int(m.group(1))
    for plage, cle in _NAF_SECTEUR:
        if n in plage:
            return cle
    return None


def _resume(r: dict) -> dict:
    siege = r.get("siege") or {}
    finances = r.get("finances") or {}
    annee = max(finances.keys()) if finances else None
    f = finances.get(annee) or {} if annee else {}
    return {
        "nom": r.get("nom_complet") or r.get("nom_raison_sociale"),
        "siren": r.get("siren"), "siret": siege.get("siret"),
        "naf": r.get("activite_principale"), "naf_libelle": r.get("libelle_activite_principale"),
        "adresse": siege.get("adresse"), "code_postal": siege.get("code_postal"), "ville": siege.get("libelle_commune"),
        "effectif": r.get("tranche_effectif_salarie"), "date_creation": r.get("date_creation"),
        "etat": r.get("etat_administratif"), "categorie": r.get("categorie_entreprise"),
        "dirigeants": [" ".join(x for x in (d.get("prenoms"), d.get("nom"), d.get("denomination")) if x) + (f" ({d.get('qualite')})" if d.get("qualite") else "")
                       for d in (r.get("dirigeants") or [])[:4]],
        "finances": {"annee": annee, "ca": f.get("ca"), "resultat": f.get("resultat_net")} if annee else None,
    }


async def chercher_entreprises(q: str, n: int = 6) -> list:
    async with httpx.AsyncClient(timeout=12) as c:
        r = await c.get(API_ENTREPRISES, params={"q": q, "per_page": n, "page": 1})
    if r.status_code != 200:
        raise HTTPException(502, "Le répertoire des entreprises ne répond pas pour le moment.")
    return [_resume(x) for x in (r.json().get("results") or [])]


def install_organisation(g: dict) -> None:
    api, Base, get_db = g["api"], g["Base"], g["get_db"]
    _uid, new_uuid, utcnow, DEMO_USER_ID = g["_uid"], g["new_uuid"], g["utcnow"], g["DEMO_USER_ID"]

    class Organisation(Base):
        __tablename__ = "organisations"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        owner_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
        nom: Mapped[str] = mapped_column(String(255))
        pays: Mapped[str] = mapped_column(String(40), default="france")
        pays_label: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
        siren: Mapped[Optional[str]] = mapped_column(String(9), nullable=True, index=True)
        siret: Mapped[Optional[str]] = mapped_column(String(14), nullable=True)
        naf: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
        details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
        maj_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    g["Organisation"] = Organisation

    async def organisation_de(db: AsyncSession, uid: str):
        """L'organisation du compte, ou celle du titulaire pour un coéquipier."""
        o = (await db.execute(select(Organisation).where(Organisation.owner_id == uid))).scalar_one_or_none()
        if o:
            return o, True
        f = g.get("_titulaire_equipe")
        if f:
            try:
                t = await f(db, uid)
                if t:
                    o = (await db.execute(select(Organisation).where(Organisation.owner_id == t[0]))).scalar_one_or_none()
                    if o:
                        return o, False
            except Exception:  # noqa: BLE001
                pass
        return None, True

    g["organisation_de"] = organisation_de

    def _json(o, modifiable: bool) -> dict:
        return {"nom": o.nom, "pays": o.pays, "pays_label": o.pays_label, "siren": o.siren, "siret": o.siret, "naf": o.naf,
                "secteur": secteur_depuis_naf(o.naf), "details": o.details or {}, "modifiable": modifiable,
                "maj_le": o.maj_le.isoformat() if o.maj_le else None}

    @api.get("/organisation")
    async def mon_organisation(db: AsyncSession = Depends(get_db)):
        o, modifiable = await organisation_de(db, _uid())
        return {"organisation": _json(o, modifiable) if o else None}

    @api.get("/organisation/recherche")
    async def rechercher(q: str):
        q = (q or "").strip()
        if len(q) < 3:
            raise HTTPException(422, "Tape au moins 3 caractères (nom ou SIRET).")
        return {"resultats": await chercher_entreprises(re.sub(r"\s", "", q) if re.fullmatch(r"[\d\s]{9,17}", q) else q)}

    class OrgIn(BaseModel):
        nom: str = Field(min_length=2, max_length=255)
        pays: str = Field(default="france", max_length=40)
        pays_label: Optional[str] = Field(default=None, max_length=80)
        siret: Optional[str] = Field(default=None, max_length=20)
        details: Optional[dict] = None

    @api.put("/organisation")
    async def enregistrer(body: OrgIn, db: AsyncSession = Depends(get_db)):
        uid = _uid()
        if uid == DEMO_USER_ID:
            raise HTTPException(401, "Connecte-toi d'abord.")
        o, modifiable = await organisation_de(db, uid)
        if o and not modifiable:
            raise HTTPException(403, "L'entreprise est gérée par le titulaire de ton équipe.")
        siret = re.sub(r"\D", "", body.siret or "") or None
        if siret and len(siret) != 14:
            raise HTTPException(422, "Un SIRET a 14 chiffres.")
        details = body.details or {}
        if siret and body.pays == "france" and not details.get("siren"):
            try:
                trouves = await chercher_entreprises(siret, 1)
                details = trouves[0] if trouves else {}
            except HTTPException:
                details = {}
        if not o:
            o = Organisation(owner_id=uid, nom=body.nom.strip())
            db.add(o)
        o.nom, o.pays, o.pays_label = body.nom.strip(), body.pays, body.pays_label
        o.siret = siret or details.get("siret")
        o.siren = (o.siret or "")[:9] or details.get("siren")
        o.naf = details.get("naf") or o.naf
        o.details = details
        # Secteurs de veille : on propose celui de l'activité si l'utilisateur n'a rien choisi.
        p = await g["_profil"](db, uid)
        cm = dict(p.contexte_metier or {})
        sct = secteur_depuis_naf(o.naf)
        if sct and not cm.get("actu_secteurs"):
            cm["actu_secteurs"] = [sct]
            p.contexte_metier = cm
        await db.commit()
        await db.refresh(o)
        return {"organisation": _json(o, True)}

    @api.delete("/organisation")
    async def supprimer(db: AsyncSession = Depends(get_db)):
        o, modifiable = await organisation_de(db, _uid())
        if o and modifiable:
            await db.delete(o)
            await db.commit()
        return {"ok": True}
