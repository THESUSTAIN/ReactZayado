"""Espace Pro : un seul compte, deux espaces (Perso / Entreprise).

Le titulaire (propriétaire de l'organisation) rattache des collègues par leur e-mail habituel,
depuis Admin › Équipe. Ils gardent un seul identifiant et basculent entre :
- Perso : leur propre espace (seulement si un accès perso leur est offert ou payé) ;
- Pro   : l'espace de l'entreprise, limité aux modules cochés (Plan d'action partagé,
          Agents IA / Agent Business, Zayado RH).

Comment c'est isolé : en espace Pro (en-tête « X-Zayado-Espace: pro »), et SEULEMENT pour
les routes des modules autorisés, l'identifiant de travail devient celui de l'organisation.
Les données créées là appartiennent donc à l'entreprise (elles restent si le collègue part),
et rien de personnel (Ma Foi, Bien-être, Vision…) n'est partagé.
"""
import logging
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import JSON, Boolean, DateTime, String, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

log = logging.getLogger("kairos.espace_pro")

MODULES = {
    "actions": {"label": "Plan d'action partagé", "desc": "Projets, objectifs, tâches et idées de l'entreprise",
                "prefixes": ("/api/taches", "/api/objectifs", "/api/idees", "/api/processus", "/api/sources")},
    "agents": {"label": "Agents IA & Agent Business", "desc": "Les agents et le chatbot client de l'entreprise",
               "prefixes": ("/api/agents-perso", "/api/agent-business")},
    "rh": {"label": "Zayado RH", "desc": "Planning, présence, absences (app séparée)", "prefixes": ()},
}
TOUS = list(MODULES)

_CACHE: dict = {}


def _iso(d):
    """Date ISO avec fuseau (SQLite rend des dates sans fuseau : ce sont des heures UTC)."""
    if d is None:
        return None
    return (d if d.tzinfo else d.replace(tzinfo=timezone.utc)).isoformat()
_TTL = 30.0


def _vider_cache():
    _CACHE.clear()


def install_espace_pro(g: dict) -> None:
    api, Base, get_db, async_session = g["api"], g["Base"], g["get_db"], g["async_session"]
    _uid, utcnow, User = g["_uid"], g["utcnow"], g["User"]
    exiger_role = g["exiger_role"]
    admin = Depends(exiger_role("admin"))

    class MembreEntreprise(Base):
        __tablename__ = "membres_entreprise"
        email: Mapped[str] = mapped_column(String(255), primary_key=True)
        org_id: Mapped[str] = mapped_column(String(36), index=True)
        owner_id: Mapped[str] = mapped_column(String(36), index=True)
        modules: Mapped[list] = mapped_column(JSON, default=list)
        perso_offert: Mapped[bool] = mapped_column(Boolean, default=False)
        ajoute_par: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    g["MembreEntreprise"] = MembreEntreprise
    Organisation = g["Organisation"]

    async def _entreprise_de(db, uid: str) -> Optional[dict]:
        """L'entreprise à laquelle ce compte a accès en espace Pro (titulaire ou collègue rattaché)."""
        c = _CACHE.get(uid)
        if c and time.time() - c[0] < _TTL:
            return c[1]
        res = None
        o = (await db.execute(select(Organisation).where(Organisation.owner_id == uid))).scalar_one_or_none()
        if o:
            res = {"org_id": o.id, "owner_id": uid, "nom": o.nom, "modules": TOUS, "proprietaire": True}
        else:
            u = await db.get(User, uid)
            m = await db.get(MembreEntreprise, (u.email or "").strip().lower()) if u and u.email else None
            if m:
                o = await db.get(Organisation, m.org_id)
                if o:
                    res = {"org_id": o.id, "owner_id": m.owner_id, "nom": o.nom,
                           "modules": [x for x in (m.modules or []) if x in MODULES], "proprietaire": False,
                           "perso_offert": bool(m.perso_offert)}
        _CACHE[uid] = (time.time(), res)
        return res

    async def _synchroniser_offre(db, e: dict):
        """L'espace de l'entreprise porte l'offre du titulaire (quotas d'agents, etc.)."""
        try:
            po = await g["_profil"](db, e["owner_id"])
            pe = await g["_profil"](db, e["org_id"])
            owner = await db.get(User, e["owner_id"])
            plan = "entreprise" if owner and owner.role in ("admin", "vendeur") else po.plan
            if pe.plan != plan:
                pe.plan = plan
                await db.commit()
        except Exception as ex:  # noqa: BLE001
            log.warning("Synchro offre espace pro : %s", ex)

    async def espace_pour_requete(request, uid: str) -> Optional[dict]:
        """Appelé par le middleware d'authentification. Renvoie l'espace Pro à appliquer, ou None."""
        if (request.headers.get("x-zayado-espace") or "").lower() != "pro":
            return None
        path = request.url.path
        async with async_session() as db:
            e = await _entreprise_de(db, uid)
            if not e:
                return None
            if not any(path.startswith(p) for mod in e["modules"] for p in MODULES[mod]["prefixes"]):
                return None
            cle = f"sync:{e['org_id']}"
            if time.time() - _CACHE.get(cle, (0,))[0] > 300:
                _CACHE[cle] = (time.time(),)
                await _synchroniser_offre(db, e)
        return e

    g["_espace_pour_requete"] = espace_pour_requete

    # L'accès « actif » d'un espace d'entreprise = celui de son titulaire
    # (paywall IA, chatbot publié, missions des agents de l'entreprise).
    acces_origine = g["_acces_actif"]

    async def acces_actif(db, uid: str) -> bool:
        if await acces_origine(db, uid):
            return True
        o = await db.get(Organisation, uid)
        return bool(o and o.owner_id != uid and await acces_origine(db, o.owner_id))

    g["_acces_actif"] = acces_actif

    @api.get("/espace/moi")
    async def mon_espace(db: AsyncSession = Depends(get_db)):
        uid = _uid()
        e = await _entreprise_de(db, uid)
        perso = await acces_origine(db, uid)
        entreprise = None
        if e:
            entreprise = {"nom": e["nom"], "modules": e["modules"], "proprietaire": e["proprietaire"],
                          "acces": await acces_origine(db, e["owner_id"])}
        return {"entreprise": entreprise, "perso": bool(perso),
                "modules": {k: {"label": v["label"], "desc": v["desc"]} for k, v in MODULES.items()}}

    # ── Admin › Équipe : rattacher des collègues ────────────────────────────
    async def _mon_org(db):
        o = (await db.execute(select(Organisation).where(Organisation.owner_id == _uid()))).scalar_one_or_none()
        if not o:
            raise HTTPException(409, "Déclare d'abord ton entreprise dans Paramètres › Entreprise (nom + SIRET).")
        return o

    @api.get("/admin/entreprise/membres")
    async def lister_membres(db: AsyncSession = Depends(get_db), _r=admin):
        o = (await db.execute(select(Organisation).where(Organisation.owner_id == _uid()))).scalar_one_or_none()
        if not o:
            return {"organisation": None, "items": [], "modules": {k: v["label"] for k, v in MODULES.items()}}
        rows = list((await db.execute(select(MembreEntreprise).where(MembreEntreprise.org_id == o.id)
                                      .order_by(MembreEntreprise.created_at))).scalars())
        users = {u.email: u for u in (await db.execute(select(User).where(User.email.in_([m.email for m in rows] or [""])))).scalars()}
        items = []
        for m in rows:
            u = users.get(m.email)
            items.append({"email": m.email, "modules": m.modules or [], "perso_offert": bool(m.perso_offert),
                          "compte": bool(u), "derniere_connexion": _iso(getattr(u, "derniere_connexion", None)) if u else None,
                          "ajoute_le": _iso(m.created_at)})
        return {"organisation": {"nom": o.nom}, "items": items, "modules": {k: v["label"] for k, v in MODULES.items()}}

    class MembreIn(BaseModel):
        email: str
        modules: list[str] = ["actions", "agents"]
        perso_offert: bool = False
        envoyer_email: bool = True

    @api.post("/admin/entreprise/membres")
    async def ajouter_membre(body: MembreIn, request: Request, db: AsyncSession = Depends(get_db), _r=admin):
        o = await _mon_org(db)
        email = body.email.strip().lower()
        if "@" not in email or "." not in email.split("@")[-1]:
            raise HTTPException(422, "Adresse e-mail invalide.")
        moi = await db.get(User, _uid())
        if moi and (moi.email or "").lower() == email:
            raise HTTPException(422, "C'est ton propre compte : tu as déjà accès à l'espace de l'entreprise.")
        autre = await db.get(MembreEntreprise, email)
        if autre and autre.org_id != o.id:
            raise HTTPException(409, "Cette personne est déjà rattachée à une autre entreprise.")
        m = autre or MembreEntreprise(email=email, org_id=o.id, owner_id=o.owner_id)
        m.modules = [x for x in body.modules if x in MODULES] or ["actions"]
        m.perso_offert = body.perso_offert
        m.ajoute_par = moi.email if moi else None
        if not autre:
            db.add(m)
        await db.commit()
        _vider_cache()
        u = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        email_envoye, raison = False, None
        if body.envoyer_email:
            base = g["_frontend_url"]() or f"{request.url.scheme}://{request.headers.get('host', 'app.zayado.net')}"
            lien = f"{base}/login?email={email}" + ("" if u else "&inscription=1")
            html = g["_email_wrap"](
                f"<p>Bonjour,</p><p>{(moi.email if moi else 'Ton entreprise')} t’a ajouté·e à l’espace <b>{o.nom}</b> sur Zayado.</p>"
                f"<p>Connecte-toi avec ton adresse habituelle ({email}) : l’espace de l’entreprise s’ouvre directement.</p>"
                + ("<p>Un espace perso (offre Solo) t’est aussi offert : tu passes de l’un à l’autre en haut de l’écran.</p>" if body.perso_offert else "")
                + 
                f"<p><a href=\"{lien}\">Ouvrir l’espace {o.nom}</a></p>")
            try:
                await g["send_email"](to=email, subject=f"Tu as accès à l'espace {o.nom} sur Zayado", html=html)
                email_envoye = True
            except Exception as e:  # noqa: BLE001
                raison = getattr(e, "detail", None) or str(e)
                log.warning("Invitation espace pro non envoyée à %s : %s", email, raison)
        return {"ok": True, "compte": bool(u), "email_envoye": email_envoye, "raison_email": raison}

    @api.post("/admin/email/test")
    async def tester_email(db: AsyncSession = Depends(get_db), _r=admin):
        """Envoie un e-mail de test à l'admin connecté : pour vérifier que les invitations partent."""
        moi = await db.get(User, _uid())
        if not moi or not moi.email:
            raise HTTPException(400, "Compte sans e-mail.")
        try:
            await g["send_email"](to=moi.email, subject="Test d'envoi Zayado", html=g["_email_wrap"]("<p>Si tu lis ceci, les e-mails de Zayado (invitations, rappels) partent bien.</p>"))
            return {"ok": True, "message": f"E-mail de test envoyé à {moi.email}."}
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "message": f"Échec : {getattr(e, 'detail', None) or e}"}

    @api.delete("/admin/entreprise/membres/{email}")
    async def retirer_membre(email: str, db: AsyncSession = Depends(get_db), _r=admin):
        o = await _mon_org(db)
        m = await db.get(MembreEntreprise, email.strip().lower())
        if not m or m.org_id != o.id:
            raise HTTPException(404, "Membre introuvable.")
        await db.delete(m)
        await db.commit()
        _vider_cache()
        return {"ok": True}
