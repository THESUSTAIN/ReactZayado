"""Pilotage : cache des réponses IA, charge de travail, lien Make (Teams / Trello / agenda).

1. CACHE IA (table `ia_cache`)
   Le point du jour rappelait l'IA à chaque ouverture de l'appli = des jetons dépensés pour
   rien. Désormais la réponse est gardée par utilisateur ET par « empreinte » du contexte
   (profil, objectifs, check-in, tâches, charge) : tant que rien n'a changé, on relit le
   cache ; dès que le contexte change (nouveau check-in, nouvel objectif…), on régénère.

2. CHARGE DE TRAVAIL (GET /api/charge-travail)
   Sans IA, donc sans jetons : e-mails envoyés aujourd'hui depuis Zayado, minutes d'actions
   à faire, check-in du jour, nombre de coéquipiers. Donne un niveau (léger / soutenu /
   élevé) et un conseil concret (déléguer, reporter…). Le Copilote en reçoit le NIVEAU
   (pas les chiffres exacts, pour ne pas invalider le cache à chaque e-mail).
   Limite assumée : la boîte mail réelle (Gmail / Outlook) n'est pas lue ; seuls les
   e-mails envoyés via Zayado sont comptés.

3. MAKE (GET /api/plan-action/make, POST .../test)
   L'utilisateur colle l'adresse de son webhook Make dans Paramètres → Mes connexions → Make. Zayado y envoie chaque événement
   (action créée, idée transformée en action) avec le nom de l'organisation. Dans Make,
   le scénario route vers Teams, Trello, l'agenda… sans que Zayado ait besoin d'un
   branchement par outil.
"""
import asyncio
import hashlib
import json
import logging
import re
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse

import httpx
from fastapi import Depends, HTTPException
from sqlalchemy import JSON, DateTime, String, UniqueConstraint, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

log = logging.getLogger("kairos.pilotage")

# Seuls les webhooks Make officiels sont acceptés (évite d'envoyer des données vers n'importe quelle adresse).
_HOTE_MAKE = re.compile(r"^hook\.([a-z0-9-]+\.)?(make\.com|integromat\.com)$")


def url_make_valide(url: str) -> bool:
    try:
        u = urlparse((url or "").strip())
    except Exception:  # noqa: BLE001
        return False
    return u.scheme == "https" and bool(_HOTE_MAKE.match((u.hostname or "").lower())) and len(u.path) > 3


def empreinte(texte: str) -> str:
    return hashlib.sha256((texte or "").encode("utf-8")).hexdigest()[:32]


def niveau_charge(emails_jour: int, minutes_a_faire: int, charge_checkin: Optional[int],
                  energie: Optional[int], sommeil: Optional[int]) -> dict:
    """Score simple et lisible (pas d'IA). Renvoie {niveau, score, raisons}."""
    score, raisons = 0.0, []
    if emails_jour >= 8:
        score += min(emails_jour / 15, 2.0)
        raisons.append(f"{emails_jour} e-mail{'s' if emails_jour > 1 else ''} envoyé{'s' if emails_jour > 1 else ''} aujourd'hui")
    if minutes_a_faire >= 180:
        score += min(minutes_a_faire / 240, 2.0)
        raisons.append(f"{minutes_a_faire // 60} h {minutes_a_faire % 60:02d} d'actions en attente")
    if charge_checkin and charge_checkin >= 4:
        score += 1.0
        raisons.append(f"charge ressentie {charge_checkin}/5 à ton check-in")
    if energie and energie <= 2:
        score += 1.0
        raisons.append(f"énergie {energie}/5")
    if sommeil and sommeil <= 2:
        score += 0.5
        raisons.append(f"sommeil {sommeil}/5")
    niveau = "eleve" if score >= 2.0 else "soutenu" if score >= 1.0 else "leger"
    return {"niveau": niveau, "score": round(score, 1), "raisons": raisons}


def _maj(t: str) -> str:
    return t[:1].upper() + t[1:]


def conseil_charge(niveau: str, coequipiers: int, prenom: str = "") -> str:
    p = f"{prenom}, " if prenom else ""
    if not prenom:
        return _maj(conseil_charge(niveau, coequipiers, "x")[3:])
    if niveau == "eleve":
        if coequipiers > 0:
            return (f"{p}tu as beaucoup donné aujourd'hui. Confie une ou deux mini-tâches à ton équipe "
                    "(tu peux les partager depuis Zayado) et décale ce qui n'est pas prioritaire.")
        return (f"{p}tu as beaucoup donné aujourd'hui. Choisis la seule action qui compte vraiment, "
                "décale le reste à demain et, si tu peux, délègue une mini-tâche (un collaborateur, un prestataire, "
                "ou invite quelqu'un dans Zayado pour partager des tâches).")
    if niveau == "soutenu":
        return (f"{p}ta journée est bien remplie. Garde une vraie pause et protège un créneau pour ta priorité.")
    return f"{p}ta charge est légère : c'est le bon moment pour avancer sur ta priorité ou préparer demain."


def install_pilotage(g: dict) -> None:
    api, Base, get_db, app = g["api"], g["Base"], g["get_db"], g.get("app")
    _uid, new_uuid, utcnow, async_session = g["_uid"], g["new_uuid"], g["utcnow"], g["async_session"]
    UserConnection, _get_connection = g["UserConnection"], g["_get_connection"]
    _chiffrer, _dechiffrer = g["_chiffrer"], g["_dechiffrer"]

    # ───────────────────────── 1. Cache IA ─────────────────────────
    class IaCache(Base):
        __tablename__ = "ia_cache"
        __table_args__ = (UniqueConstraint("user_id", "cle", name="uq_ia_cache_user_cle"),)
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        cle: Mapped[str] = mapped_column(String(60))          # ex. « point-du-jour:2026-10-04 »
        empreinte: Mapped[str] = mapped_column(String(40))    # empreinte du contexte qui a produit la réponse
        data: Mapped[dict] = mapped_column(JSON, default=dict)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    g["IaCache"] = IaCache

    async def ia_cache_lire(db: AsyncSession, uid: str, cle: str, emp: str) -> Optional[dict]:
        r = (await db.execute(select(IaCache).where(IaCache.user_id == uid, IaCache.cle == cle))).scalar_one_or_none()
        return r.data if r and r.empreinte == emp else None

    async def ia_cache_ecrire(db: AsyncSession, uid: str, cle: str, emp: str, data: dict) -> None:
        r = (await db.execute(select(IaCache).where(IaCache.user_id == uid, IaCache.cle == cle))).scalar_one_or_none()
        if r:
            r.empreinte, r.data, r.created_at = emp, data, utcnow()
        else:
            db.add(IaCache(user_id=uid, cle=cle, empreinte=emp, data=data))
        await db.commit()

    g["_ia_cache_lire"], g["_ia_cache_ecrire"], g["_empreinte"] = ia_cache_lire, ia_cache_ecrire, empreinte

    # ───────────────────────── 2. Charge de travail ─────────────────────────
    async def mesure_charge(db: AsyncSession, uid: str) -> dict:
        aujourdhui = datetime.now(timezone.utc).date()
        debut = datetime(aujourdhui.year, aujourdhui.month, aujourdhui.day, tzinfo=timezone.utc)
        emails = 0
        EB = g.get("EmailBrouillon")
        if EB is not None:
            emails = (await db.execute(select(func.count()).select_from(EB).where(
                EB.owner_id == uid, EB.statut == "envoye", EB.envoye_le >= debut))).scalar_one()
        VT, VC = g["VisionTache"], g["VisionCheckin"]
        taches = [t for t in (await db.execute(select(VT).where(VT.user_id == uid))).scalars() if t.statut != "fait"]
        minutes = sum(int(t.duree_min or 0) for t in taches)
        c = (await db.execute(select(VC).where(VC.user_id == uid).order_by(VC.date.desc()).limit(1))).scalars().first()
        recent = bool(c and c.date == aujourdhui.isoformat())
        coequipiers = 0
        t_eq = Base.metadata.tables.get("equipe_membres")
        if t_eq is not None:
            coequipiers = (await db.execute(select(func.count()).select_from(t_eq).where(t_eq.c.owner_id == uid))).scalar_one()
        n = niveau_charge(int(emails), minutes, c.charge if recent else None,
                          c.energie if recent else None, c.sommeil if recent else None)
        prenom = ""
        try:
            prenom = ((await g["_profil"](db, uid)).prenom or "").strip()
        except Exception:  # noqa: BLE001
            pass
        return {**n, "emails_envoyes_aujourdhui": int(emails), "actions_en_attente": len(taches),
                "minutes_a_faire": minutes, "checkin_du_jour": recent, "coequipiers": int(coequipiers),
                "boite_mail_reliee": False,
                "conseil": conseil_charge(n["niveau"], int(coequipiers), prenom)}

    async def ligne_charge(db: AsyncSession, uid: str) -> str:
        """Une ligne pour le contexte du Copilote : le NIVEAU seulement (stable, donc cache-compatible)."""
        m = await mesure_charge(db, uid)
        lib = {"leger": "légère", "soutenu": "soutenue", "eleve": "élevée"}[m["niveau"]]
        txt = f"Charge de travail du jour : {lib}."
        if m["niveau"] == "eleve":
            txt += (" Il/elle a beaucoup travaillé : conseille de ralentir et de déléguer"
                    + (" à son équipe (partager des mini-tâches via Zayado)." if m["coequipiers"] else " si possible."))
        return txt

    g["_mesure_charge"], g["_ligne_charge"] = mesure_charge, ligne_charge

    @api.get("/charge-travail")
    async def charge_travail(db: AsyncSession = Depends(get_db)):
        return await mesure_charge(db, _uid())

    # ───────────────────────── 3. Make ─────────────────────────
    def _url(c) -> str:
        try:
            return (json.loads(_dechiffrer(c.credentials_enc or "") or "{}")).get("url", "")
        except Exception:  # noqa: BLE001
            return ""

    @api.get("/plan-action/make")
    async def make_etat(db: AsyncSession = Depends(get_db)):
        """Le webhook se colle dans Paramètres → Mes connexions → Make ; ici, son état."""
        c = await _get_connection(db, "make")
        return {"relie": bool(c and c.status == "ready" and url_make_valide(_url(c)))}

    async def envoyer_make(uid: str, evenement: str, donnees: dict) -> bool:
        """Envoie un événement au webhook Make de l'utilisateur. Ne lève jamais d'erreur."""
        try:
            async with async_session() as db:
                c = await _get_connection(db, "make", uid)
                if not c or c.status != "ready":
                    return False
                url = _url(c)
                nom_org = None
                f_org = g.get("organisation_de")
                if f_org:
                    try:
                        o, _ = await f_org(db, uid)
                        nom_org = o.nom if o else None
                    except Exception:  # noqa: BLE001
                        pass
            if not url_make_valide(url):
                return False
            async with httpx.AsyncClient(timeout=10) as cl:
                r = await cl.post(url, json={"source": "zayado", "evenement": evenement,
                                             "envoye_le": datetime.now(timezone.utc).isoformat(),
                                             "organisation": nom_org, "donnees": donnees})
            if r.status_code >= 400:
                log.warning("Make a refusé l'événement %s (%s)", evenement, r.status_code)
            return r.status_code < 400
        except Exception as e:  # noqa: BLE001 — ne jamais bloquer la création d'une action
            log.warning("Envoi Make : %s", e)
            return False

    def make_en_tache(uid: str, evenement: str, donnees: dict) -> None:
        asyncio.create_task(envoyer_make(uid, evenement, donnees))

    g["_envoyer_make"], g["_make_en_tache"] = envoyer_make, make_en_tache

    @api.post("/plan-action/make/test")
    async def make_test():
        ok = await envoyer_make(_uid(), "test", {"message": "Test de connexion Zayado → Make"})
        if not ok:
            raise HTTPException(502, "Make n'a pas répondu. Vérifie que le scénario est activé et que l'adresse est la bonne.")
        return {"ok": True}
