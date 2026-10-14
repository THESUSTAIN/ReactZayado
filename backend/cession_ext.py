"""Reprise & cession : suivre un rachat (ou une vente) d'entreprise, de la recherche aux 100 premiers jours.

Pour le repreneur : valorisation indicative, plan de financement (mensualité, capacité de remboursement), étapes du
parcours, documents (liens Drive), économie négociée et honoraires Zayado (forfait 3), puis SUIVI DE RENTABILITÉ mois par
mois après la reprise, comparé au prévisionnel. Pour le cédant : la même chose côté vente (prix, étapes, documents).

Calculs = fonctions pures (testées seules). Ce sont des repères de conseil (analyse économique et financière indicative),
pas une évaluation certifiée ni un conseil en financement réglementé : l'écran le dit.
"""
import asyncio
import logging
from datetime import date
from typing import Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import JSON, DateTime, Float, Integer, String, Text, delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

log = logging.getLogger("kairos.cession")

ETAPES_ACHAT = [
    "Définir son projet et ses critères de cible", "Établir son budget et son apport", "Rechercher les entreprises cibles",
    "Premier contact et accord de confidentialité", "Analyser le dossier de présentation", "Visiter et rencontrer le cédant",
    "Évaluer l'entreprise", "Faire une offre (lettre d'intention)", "Audit (comptable, juridique, social)",
    "Monter le financement (banques, prêts d'honneur)", "Négocier et signer la promesse", "Garantie d'actif et de passif",
    "Signer l'acte de cession", "Reprendre : les 100 premiers jours",
]
ETAPES_CESSION = [
    "Préparer son projet de cession", "Faire évaluer l'entreprise", "Préparer le dossier de vente", "Rendre l'entreprise transmissible",
    "Rechercher des repreneurs", "Accords de confidentialité", "Rencontres et visites", "Recevoir les offres (lettres d'intention)",
    "Audit par le repreneur", "Négocier prix et garantie d'actif et de passif", "Signer la promesse", "Signer l'acte de cession",
    "Accompagner la transition",
]
# Multiples d'EBE indicatifs (fourchette prudente pour TPE/PME françaises) ; « autre » par défaut.
MULTIPLES = {"commerce": (3.0, 5.0), "restauration": (2.5, 4.5), "services": (4.0, 6.0), "industrie": (4.0, 6.5),
             "btp": (3.0, 5.0), "sante": (4.0, 7.0), "numerique": (5.0, 8.0), "autre": (3.5, 5.5)}
HONO_BASE, HONO_SANS_NEGO, HONO_PART = 2850.0, 3300.0, 0.20


def mensualite(capital: float, taux_annuel_pct: float, duree_mois: int) -> float:
    if capital <= 0 or duree_mois <= 0:
        return 0.0
    r = taux_annuel_pct / 100 / 12
    if r == 0:
        return round(capital / duree_mois, 2)
    return round(capital * r / (1 - (1 + r) ** -duree_mois), 2)


def calculer(d: dict, suivi: list) -> dict:
    """d : champs du dossier ; suivi : [{mois, ca, charges, tresorerie}] triés. Renvoie les indicateurs affichés."""
    f = lambda k: float(d.get(k) or 0)  # noqa: E731
    prix = f("prix_final") or f("prix_affiche")
    out = {"prix_retenu": prix}
    bas, haut = MULTIPLES.get(d.get("secteur") or "autre", MULTIPLES["autre"])
    if f("ebe") > 0:
        out["valorisation"] = {"basse": round(f("ebe") * bas), "haute": round(f("ebe") * haut), "multiples": [bas, haut],
                               "multiple_prix": round(prix / f("ebe"), 2) if prix else None,
                               "avis": (None if not prix else "dans la fourchette" if f("ebe") * bas <= prix <= f("ebe") * haut
                                        else "au-dessus de la fourchette" if prix > f("ebe") * haut else "en dessous de la fourchette")}
    m = mensualite(f("emprunt"), f("taux"), int(f("duree_mois")))
    if m:
        annuite = round(m * 12, 2)
        dscr = round(f("ebe") / annuite, 2) if f("ebe") > 0 else None
        out["financement"] = {"mensualite": m, "annuite": annuite, "cout_credit": round(m * int(f("duree_mois")) - f("emprunt"), 2),
                              "apport_pct": round(f("apport") / prix * 100, 1) if prix else None, "couverture": dscr,
                              "niveau": None if dscr is None else "confortable" if dscr >= 1.3 else "tendu" if dscr >= 1.0 else "risqué",
                              "besoin_couvert": round(f("apport") + f("emprunt") - prix, 2) if prix else None}
    if d.get("sens") == "achat" and f("prix_affiche") > 0 and f("prix_final") > 0:
        eco = round(f("prix_affiche") - f("prix_final"), 2)
        hono = HONO_BASE + HONO_PART * eco if eco > 0 else HONO_SANS_NEGO
        out["negociation"] = {"economie": eco, "honoraires_forfait3_ht": round(hono, 2),
                              "gain_net": round(eco - hono, 2)}
    if suivi:
        lignes, cumul_ebe, cumul_rembourse = [], 0.0, 0.0
        cible = f("ebe_previsionnel") / 12 if f("ebe_previsionnel") else (f("ebe") / 12 if f("ebe") else None)
        for s in suivi:
            ebe = round(float(s.get("ca") or 0) - float(s.get("charges") or 0), 2)
            cumul_ebe += ebe
            cumul_rembourse += m
            lignes.append({**s, "ebe": ebe, "ecart_previsionnel": round(ebe - cible, 2) if cible is not None else None,
                           "couvre_mensualite": (ebe >= m) if m else None})
        n = len(lignes)
        out["suivi"] = {"mois": lignes, "ebe_cumule": round(cumul_ebe, 2), "ebe_moyen": round(cumul_ebe / n, 2),
                        "objectif_mensuel": round(cible, 2) if cible is not None else None,
                        "rembourse_cumule": round(cumul_rembourse, 2),
                        "marge_apres_credit": round(cumul_ebe - cumul_rembourse, 2) if m else None,
                        "tendance": None if n < 2 else "hausse" if lignes[-1]["ebe"] > lignes[0]["ebe"] else "baisse" if lignes[-1]["ebe"] < lignes[0]["ebe"] else "stable"}
    return out


class DossierIn(BaseModel):
    sens: str = Field(default="achat", pattern="^(achat|cession)$")
    nom: str = Field(min_length=1, max_length=160)
    secteur: str = Field(default="autre", max_length=20)
    ville: str = Field(default="", max_length=120)
    prix_affiche: Optional[float] = Field(default=None, ge=0, le=1e9)
    prix_final: Optional[float] = Field(default=None, ge=0, le=1e9)
    ca: Optional[float] = Field(default=None, ge=0, le=1e10)
    ebe: Optional[float] = Field(default=None, ge=-1e9, le=1e9)
    resultat: Optional[float] = Field(default=None, ge=-1e9, le=1e9)
    ebe_previsionnel: Optional[float] = Field(default=None, ge=-1e9, le=1e9)
    apport: Optional[float] = Field(default=None, ge=0, le=1e9)
    emprunt: Optional[float] = Field(default=None, ge=0, le=1e9)
    taux: Optional[float] = Field(default=None, ge=0, le=30)
    duree_mois: Optional[int] = Field(default=None, ge=0, le=360)
    date_reprise: Optional[str] = Field(default=None, max_length=10)
    notes: Optional[str] = Field(default=None, max_length=10000)


class EtapesIn(BaseModel):
    faites: list = Field(default_factory=list)


class DocIn(BaseModel):
    titre: str = Field(min_length=1, max_length=160)
    url: str = Field(min_length=8, max_length=1000)


class SuiviIn(BaseModel):
    mois: str = Field(pattern=r"^\d{4}-\d{2}$")
    ca: float = Field(ge=0, le=1e9)
    charges: float = Field(ge=0, le=1e9)
    tresorerie: Optional[float] = Field(default=None, ge=-1e9, le=1e9)


CHAMPS = ("sens", "nom", "secteur", "ville", "prix_affiche", "prix_final", "ca", "ebe", "resultat", "ebe_previsionnel", "apport",
          "emprunt", "taux", "duree_mois", "date_reprise", "notes")


def install_cession(g: dict) -> None:
    api, Base, get_db = g["api"], g["Base"], g["get_db"]
    _uid, new_uuid, utcnow = g["_uid"], g["new_uuid"], g["utcnow"]
    from datetime import datetime

    class CessionDossier(Base):
        __tablename__ = "cession_dossiers"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        sens: Mapped[str] = mapped_column(String(8), default="achat")
        nom: Mapped[str] = mapped_column(String(160))
        secteur: Mapped[str] = mapped_column(String(20), default="autre")
        ville: Mapped[str] = mapped_column(String(120), default="")
        prix_affiche: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
        prix_final: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
        ca: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
        ebe: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
        resultat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
        ebe_previsionnel: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
        apport: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
        emprunt: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
        taux: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
        duree_mois: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
        date_reprise: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
        notes: Mapped[str] = mapped_column(Text, default="")
        etapes_faites: Mapped[list] = mapped_column(JSON, default=list)
        documents: Mapped[list] = mapped_column(JSON, default=list)
        analyse_ia: Mapped[str] = mapped_column(Text, default="")
        org_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)  # entreprise cliente partenaire (mandat signé)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
        updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    class CessionSuivi(Base):
        __tablename__ = "cession_suivi"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        dossier_id: Mapped[str] = mapped_column(String(36), index=True)
        mois: Mapped[str] = mapped_column(String(7))
        ca: Mapped[float] = mapped_column(Float, default=0)
        charges: Mapped[float] = mapped_column(Float, default=0)
        tresorerie: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    g["CessionDossier"], g["CessionSuivi"] = CessionDossier, CessionSuivi

    async def _interne(db) -> None:
        """Outil des conseillers Zayado : les clients n'y accèdent pas (ils voient leur dossier dans Ton entreprise)."""
        u = await db.get(g["User"], _uid())
        if not u or u.role not in ("admin", "vendeur"):
            raise HTTPException(403, "Réservé aux conseillers Zayado.")

    async def _mien(db, did: str) -> CessionDossier:
        await _interne(db)
        d = await db.get(CessionDossier, did)
        if not d or d.user_id != _uid():
            raise HTTPException(404, "Dossier introuvable.")
        return d

    async def _vue(db, d: CessionDossier, complet: bool = True) -> dict:
        base = {k: getattr(d, k) for k in CHAMPS}
        etapes = ETAPES_ACHAT if d.sens == "achat" else ETAPES_CESSION
        faites = [i for i in (d.etapes_faites or []) if 0 <= i < len(etapes)]
        out = {"id": d.id, **base, "etapes": etapes, "etapes_faites": faites,
               "avancement": round(len(faites) / len(etapes) * 100), "documents": d.documents or [],
               "analyse_ia": d.analyse_ia or "", "updated_at": d.updated_at.isoformat() if d.updated_at else None}
        if complet:
            suivi = [{"mois": s.mois, "ca": s.ca, "charges": s.charges, "tresorerie": s.tresorerie} for s in
                     (await db.execute(select(CessionSuivi).where(CessionSuivi.dossier_id == d.id).order_by(CessionSuivi.mois))).scalars()]
            out["indicateurs"] = calculer(base, suivi)
        return out

    async def _vue_partenaire(db, d):
        v = await _vue(db, d)
        v.pop("notes", None)  # les notes du conseiller restent internes
        return v

    g["_vue_cession"] = _vue_partenaire

    @api.get("/cession/reference")
    async def reference():
        return {"etapes_achat": ETAPES_ACHAT, "etapes_cession": ETAPES_CESSION, "multiples": MULTIPLES,
                "honoraires": {"forfait1_ht": 1990, "forfait2_ht": 2850, "forfait3_base_ht": HONO_BASE,
                               "forfait3_part_economie": HONO_PART, "forfait3_sans_negociation_ht": HONO_SANS_NEGO}}

    @api.get("/cession/dossiers")
    async def lister(db: AsyncSession = Depends(get_db)):
        await _interne(db)
        rows = (await db.execute(select(CessionDossier).where(CessionDossier.user_id == _uid()).order_by(CessionDossier.updated_at.desc()))).scalars().all()
        return {"dossiers": [await _vue(db, d, complet=False) for d in rows]}

    @api.post("/cession/dossiers")
    async def creer(body: DossierIn, db: AsyncSession = Depends(get_db)):
        await _interne(db)
        n = len((await db.execute(select(CessionDossier.id).where(CessionDossier.user_id == _uid()))).scalars().all())
        if n >= 30:
            raise HTTPException(409, "30 dossiers au maximum : archive ou supprime un ancien dossier.")
        d = CessionDossier(user_id=_uid(), **{k: v for k, v in body.model_dump().items() if v is not None}, etapes_faites=[], documents=[])
        db.add(d)
        await db.commit()
        return await _vue(db, d)

    @api.get("/cession/dossiers/{did}")
    async def voir(did: str, db: AsyncSession = Depends(get_db)):
        return await _vue(db, await _mien(db, did))

    @api.put("/cession/dossiers/{did}")
    async def modifier(did: str, body: DossierIn, db: AsyncSession = Depends(get_db)):
        d = await _mien(db, did)
        for k, v in body.model_dump().items():
            setattr(d, k, v if v is not None or k not in ("nom", "sens", "secteur") else getattr(d, k))
        if d.date_reprise:
            try:
                date.fromisoformat(d.date_reprise)
            except ValueError:
                raise HTTPException(422, "Date de reprise au format AAAA-MM-JJ.")
        d.notes = d.notes or ""
        d.updated_at = utcnow()
        await db.commit()
        return await _vue(db, d)

    @api.delete("/cession/dossiers/{did}")
    async def supprimer(did: str, db: AsyncSession = Depends(get_db)):
        d = await _mien(db, did)
        await db.execute(delete(CessionSuivi).where(CessionSuivi.dossier_id == d.id))
        await db.delete(d)
        await db.commit()
        return {"ok": True}

    @api.put("/cession/dossiers/{did}/etapes")
    async def etapes(did: str, body: EtapesIn, db: AsyncSession = Depends(get_db)):
        d = await _mien(db, did)
        n = len(ETAPES_ACHAT if d.sens == "achat" else ETAPES_CESSION)
        d.etapes_faites = sorted({int(i) for i in body.faites if str(i).lstrip("-").isdigit() and 0 <= int(i) < n})
        d.updated_at = utcnow()
        await db.commit()
        return await _vue(db, d)

    @api.post("/cession/dossiers/{did}/documents")
    async def ajouter_doc(did: str, body: DocIn, db: AsyncSession = Depends(get_db)):
        d = await _mien(db, did)
        if not body.url.lower().startswith("https://"):
            raise HTTPException(422, "Le lien doit commencer par https:// (Drive, OneDrive, SharePoint…).")
        d.documents = list(d.documents or []) + [{"id": new_uuid(), "titre": body.titre.strip(), "url": body.url.strip()}]
        d.updated_at = utcnow()
        await db.commit()
        return await _vue(db, d)

    @api.delete("/cession/dossiers/{did}/documents/{doc_id}")
    async def retirer_doc(did: str, doc_id: str, db: AsyncSession = Depends(get_db)):
        d = await _mien(db, did)
        d.documents = [x for x in (d.documents or []) if x.get("id") != doc_id]
        await db.commit()
        return await _vue(db, d)

    @api.put("/cession/dossiers/{did}/suivi")
    async def saisir_mois(did: str, body: SuiviIn, db: AsyncSession = Depends(get_db)):
        d = await _mien(db, did)
        s = (await db.execute(select(CessionSuivi).where(CessionSuivi.dossier_id == d.id, CessionSuivi.mois == body.mois))).scalars().first()
        if not s:
            s = CessionSuivi(dossier_id=d.id, mois=body.mois)
            db.add(s)
        s.ca, s.charges, s.tresorerie = body.ca, body.charges, body.tresorerie
        d.updated_at = utcnow()
        await db.commit()
        return await _vue(db, d)

    @api.delete("/cession/dossiers/{did}/suivi/{mois}")
    async def retirer_mois(did: str, mois: str, db: AsyncSession = Depends(get_db)):
        d = await _mien(db, did)
        await db.execute(delete(CessionSuivi).where(CessionSuivi.dossier_id == d.id, CessionSuivi.mois == mois))
        await db.commit()
        return await _vue(db, d)

    @api.post("/cession/dossiers/{did}/analyse")
    async def analyse(did: str, db: AsyncSession = Depends(get_db)):
        """Lecture IA du dossier : points forts, risques, questions à poser, prochaine étape. Rien d'inventé : seulement les chiffres saisis."""
        d = await _mien(db, did)
        v = await _vue(db, d)
        if not any(v.get(k) for k in ("prix_affiche", "prix_final", "ca", "ebe", "resultat")):
            raise HTTPException(422, "Renseigne au moins le prix, le chiffre d'affaires ou l'EBE (onglet « Chiffres ») : l'analyse se fait sur tes chiffres.")
        client = g["_client_llm"](f"cession-{d.id}", (
            "Tu es un conseiller en reprise et transmission de TPE/PME françaises. Tu analyses UNIQUEMENT les chiffres fournis, "
            "sans en inventer ; si une donnée manque, dis-le et dis pourquoi elle compte. Réponds en français, ton sobre et professionnel, "
            "en 4 parties courtes, chacune introduite par une ligne « ## Titre » : Points forts, Risques, Questions à poser, Prochaine étape. "
            "Sous chaque titre : 2 à 4 puces commençant par « - », une phrase chacune. Pas d'emoji, pas de ligne « --- », pas de titre général, "
            "pas d'avertissement en tête. Termine par une seule phrase en italique (*…*) rappelant que l'analyse est indicative."))
        if client is None:
            raise HTTPException(503, "L'analyse IA n'est pas disponible pour le moment.")
        from llm_mammouth import UserMessage
        donnees = {k: v[k] for k in CHAMPS if v.get(k) not in (None, "")}
        donnees["indicateurs"] = v["indicateurs"]
        donnees["etapes_faites"] = [v["etapes"][i] for i in v["etapes_faites"]]
        import json as _json
        try:
            texte = await asyncio.wait_for(client.send_message(UserMessage(text="Dossier :\n" + _json.dumps(donnees, ensure_ascii=False, default=str)[:12000])), timeout=90)
        except Exception as e:  # noqa: BLE001
            log.warning("Analyse cession : %s", e)
            raise HTTPException(502, "L'IA n'a pas répondu, réessaie dans un instant.")
        d.analyse_ia = (texte or "").strip()[:12000]
        await db.commit()
        return await _vue(db, d)
