"""Console admin : équipe Zayado, fiche 360°, « à traiter », journal, actions en groupe.

- Équipe Zayado : inviter un collaborateur par e-mail AVANT qu'il ait un compte.
  Avant, il fallait qu'il s'inscrive, puis le retrouver dans la liste et cliquer
  « Offrir ». L'invitation lui donne l'offre choisie (gratuite, sans prélèvement)
  dès son inscription, avec un motif (Équipe Zayado, partenaire, testeur…).
  Le rôle administrateur n'est JAMAIS donné automatiquement à l'inscription
  (l'e-mail n'est pas vérifié à l'inscription par mot de passe) : il se donne
  ensuite depuis la liste, avec confirmation.
- Fiche 360° d'un utilisateur, file « À traiter aujourd'hui », journal des actions
  admin (qui a changé quoi), actions en groupe et export CSV.
"""
import csv
import io
import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import jwt as _pyjwt
from fastapi import Depends, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import DateTime, String, Text, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

MOTIFS = {"equipe": "Équipe Zayado", "partenaire": "Partenaire", "testeur": "Testeur", "presse": "Presse", "autre": "Autre"}


def _iso(dt):
    if dt is None:
        return None
    return (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)).isoformat()


def install_admin_plus(g: dict) -> None:
    api, app, Base, get_db = g["api"], g["app"], g["Base"], g["get_db"]
    utcnow, new_uuid, exiger_role = g["utcnow"], g["new_uuid"], g["exiger_role"]
    async_session, User, PRICING = g["async_session"], g["User"], g["PRICING"]
    JWT_SECRET, JWT_ALGO = g["JWT_SECRET"], g["JWT_ALGO"]
    log = g.get("logger")
    admin = Depends(exiger_role("admin"))

    class AccesEquipe(Base):
        """Accès offert à une personne (collaborateur, partenaire…), avec ou sans compte."""
        __tablename__ = "acces_equipe"
        email: Mapped[str] = mapped_column(String(255), primary_key=True)
        plan: Mapped[str] = mapped_column(String(20), default="pro")
        motif: Mapped[str] = mapped_column(String(20), default="equipe")
        note: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
        statut: Mapped[str] = mapped_column(String(20), default="invite")   # invite | actif
        user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
        invite_par: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
        active_le: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    class AdminAction(Base):
        """Journal des actions faites dans la console admin."""
        __tablename__ = "admin_actions"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        admin_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
        action: Mapped[str] = mapped_column(String(120))
        cible: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
        details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    g.update(AccesEquipe=AccesEquipe, AdminAction=AdminAction)

    # ── Journal : toute écriture réussie sur /api/admin/* est tracée ──────────
    LIBELLES = [
        ("/role", "Changement de rôle"), ("/gratuit", "Compte gratuit"), ("/plan", "Changement d'offre"),
        ("/equipe", "Accès équipe"), ("/groupe", "Action en groupe"), ("codes-promo", "Code promo"),
        ("parrainage", "Parrainage"), ("programmes", "Programme de parrainage"), ("commerce", "Commerce"),
        ("newsletters", "Newsletter"), ("emails-ia", "E-mail IA"), ("compte-demo", "Compte démo"),
        ("foi/signalements", "Modération Ma Foi"), ("contenu", "Contenu"), ("medias", "Médias"), ("app-logs", "Logs"),
    ]

    def _libelle(path: str, method: str) -> str:
        for cle, lib in LIBELLES:
            if cle in path:
                return f"{lib} ({method})"
        return f"{method} {path.replace('/api/admin/', '')[:60]}"

    @app.middleware("http")
    async def _journal_admin(request: Request, call_next):
        path, method = request.url.path, request.method
        suivre = path.startswith("/api/admin/") and method in ("POST", "PUT", "PATCH", "DELETE")
        corps = b""
        if suivre:
            try:
                corps = await request.body()
            except Exception:  # noqa: BLE001
                corps = b""
        reponse = await call_next(request)
        if suivre and reponse.status_code < 400:
            try:
                auth = request.headers.get("authorization", "")
                uid = _pyjwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGO]).get("sub") if auth.startswith("Bearer ") else None
                details = {}
                if request.query_params:
                    details["parametres"] = dict(request.query_params)
                if corps:
                    try:
                        brut = json.loads(corps)
                        if isinstance(brut, dict):
                            # jamais de secret dans le journal
                            details["donnees"] = {k: v for k, v in brut.items()
                                                  if not any(s in k.lower() for s in ("key", "cle", "secret", "password", "token"))}
                    except Exception:  # noqa: BLE001
                        pass
                async with async_session() as db:
                    auteur = await db.get(User, uid) if uid else None
                    # cible lisible : e-mail de l'utilisateur quand l'URL contient son identifiant
                    cible = None
                    morceaux = path.split("/")
                    if "utilisateurs" in morceaux:
                        i = morceaux.index("utilisateurs")
                        if i + 1 < len(morceaux) and morceaux[i + 1] == "groupe":
                            ids = (details.get("donnees") or {}).get("ids") or []
                            cible = f"{len(ids)} compte{'s' if len(ids) > 1 else ''}"
                        elif i + 1 < len(morceaux):
                            u = await db.get(User, morceaux[i + 1])
                            cible = u.email if u else morceaux[i + 1]
                    if cible is None and isinstance(details.get("donnees"), dict):
                        cible = details["donnees"].get("email")
                    db.add(AdminAction(admin_email=auteur.email if auteur else None, action=_libelle(path, method),
                                       cible=cible, details=json.dumps(details, ensure_ascii=False, default=str)[:2000] if details else None))
                    await db.commit()
            except Exception as e:  # noqa: BLE001 — le journal ne bloque jamais l'action
                if log:
                    log.warning("Journal admin non écrit : %s", e)
        return reponse

    @api.get("/admin/journal")
    async def admin_journal(page: int = 1, q: Optional[str] = None, db: AsyncSession = Depends(get_db), _r=admin):
        base = select(AdminAction)
        if q and q.strip():
            motif = f"%{q.strip().lower()}%"
            base = base.where((func.lower(AdminAction.cible).like(motif)) | (func.lower(AdminAction.admin_email).like(motif))
                              | (func.lower(AdminAction.action).like(motif)))
        rows = list((await db.execute(base.order_by(AdminAction.created_at.desc()).offset((max(1, page) - 1) * 50).limit(50))).scalars())
        return {"items": [{"id": a.id, "admin": a.admin_email, "action": a.action, "cible": a.cible,
                           "details": json.loads(a.details) if a.details else None, "le": _iso(a.created_at)} for a in rows]}

    # ── Accès offerts (équipe Zayado, partenaires…) ───────────────────────────
    async def _offrir(db, user_id: str, plan: str):
        Abo = g["Abonnement"]
        a = await db.get(Abo, user_id)
        if not a:
            a = Abo(user_id=user_id)
            db.add(a)
        if getattr(a, "mollie_subscription_id", None) and not getattr(a, "resilie", False):
            raise HTTPException(409, "Ce compte a un prélèvement Mollie actif : résilie-le d'abord pour éviter de le facturer.")
        a.plan, a.cycle, a.resilie, a.plan_suivant = plan, "offert", False, None
        a.fin = datetime.now(timezone.utc) + timedelta(days=36500)
        (await g["_profil"](db, user_id)).plan = plan

    async def _retirer(db, user_id: str):
        Abo = g["Abonnement"]
        a = await db.get(Abo, user_id)
        if a and a.cycle == "offert":
            a.plan, a.cycle, a.fin = "essentielle", "mensuel", None
            (await g["_profil"](db, user_id)).plan = "essentielle"

    async def appliquer_acces_equipe(db, user) -> None:
        """Appelé à la création d'un compte : applique l'invitation en attente."""
        acces = await db.get(AccesEquipe, (user.email or "").strip().lower())
        if not acces or acces.statut == "actif":
            return
        await _offrir(db, user.id, acces.plan)
        acces.statut, acces.user_id, acces.active_le = "actif", user.id, datetime.now(timezone.utc)
        await db.commit()

    # Branché sur l'activation du parrainage, appelée par TOUTES les créations de compte
    # (inscription, lien magique, Google/Microsoft).
    _activer_parrainage_origine = g["_activer_parrainage"]

    async def _activer_parrainage_et_equipe(db, user):
        await _activer_parrainage_origine(db, user)
        try:
            await appliquer_acces_equipe(db, user)
        except Exception as e:  # noqa: BLE001 — ne jamais faire échouer une inscription
            await db.rollback()
            if log:
                log.error("Accès équipe non appliqué pour %s : %s", user.email, e)

    g["_activer_parrainage"] = _activer_parrainage_et_equipe

    class InvitationIn(BaseModel):
        email: str
        plan: str = "pro"
        motif: str = "equipe"
        note: Optional[str] = None
        envoyer_email: bool = True

    @api.post("/admin/equipe")
    async def admin_equipe_inviter(body: InvitationIn, request: Request, db: AsyncSession = Depends(get_db), _r=admin):
        email = body.email.strip().lower()
        if "@" not in email or "." not in email.split("@")[-1]:
            raise HTTPException(422, "Adresse e-mail invalide.")
        if body.plan not in PRICING or body.plan == "essentielle":
            raise HTTPException(422, "Offre inconnue.")
        motif = body.motif if body.motif in MOTIFS else "autre"
        acces = await db.get(AccesEquipe, email)
        if not acces:
            acces = AccesEquipe(email=email)
            db.add(acces)
        moi = await db.get(User, g["_uid"]())
        acces.plan, acces.motif, acces.note = body.plan, motif, (body.note or "")[:255] or None
        acces.invite_par = moi.email if moi else None
        u = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if u:
            await _offrir(db, u.id, body.plan)
            acces.statut, acces.user_id, acces.active_le = "actif", u.id, datetime.now(timezone.utc)
        else:
            acces.statut = "invite"
        await db.commit()
        email_envoye = False
        if body.envoyer_email and not u:
            base = g["_frontend_url"]() or f"{request.url.scheme}://{request.headers.get('host', 'app.zayado.net')}"
            lien = f"{base}/login?email={email}&inscription=1"
            nom_offre = PRICING[body.plan].get("label") if isinstance(PRICING[body.plan], dict) else body.plan
            html = g["_email_wrap"](
                f"<p>Bonjour,</p><p>{(moi.email if moi else 'L’équipe Zayado')} t’a ouvert un accès <b>{nom_offre or body.plan}</b> à Zayado, "
                f"offert, sans carte bancaire.</p><p>Crée ton compte avec cette adresse ({email}) et l’accès s’active tout seul :</p>"
                f"<p><a href=\"{lien}\">Créer mon compte Zayado</a></p>")
            try:
                await g["send_email"](to=email, subject="Ton accès à Zayado est prêt", html=html)
                email_envoye = True
            except Exception as e:  # noqa: BLE001
                if log:
                    log.warning("Invitation équipe non envoyée à %s : %s", email, getattr(e, "detail", e))
        return {"ok": True, "statut": acces.statut, "email_envoye": email_envoye,
                "message": "Accès activé sur son compte." if u else ("Invitation envoyée." if email_envoye else "Invitation enregistrée : l'accès s'activera dès qu'il créera son compte avec cette adresse.")}

    @api.get("/admin/equipe")
    async def admin_equipe_liste(db: AsyncSession = Depends(get_db), _r=admin):
        Abo = g["Abonnement"]
        acces = {a.email: a for a in (await db.execute(select(AccesEquipe))).scalars()}
        # Comptes offerts sans fiche d'accès (offerts avant cette version) : on les montre aussi.
        offerts = list((await db.execute(select(Abo).where(Abo.cycle == "offert"))).scalars())
        users = {u.id: u for u in (await db.execute(select(User).where(User.id.in_([a.user_id for a in offerts] + [a.user_id for a in acces.values() if a.user_id])))).scalars()}
        items = []
        vus = set()
        for a in acces.values():
            u = users.get(a.user_id)
            vus.add(a.email)
            items.append({"email": a.email, "plan": a.plan, "motif": a.motif, "motif_label": MOTIFS.get(a.motif, a.motif), "note": a.note,
                          "statut": a.statut, "role": u.role if u else None, "user_id": a.user_id, "invite_par": a.invite_par,
                          "invite_le": _iso(a.created_at), "derniere_connexion": _iso(getattr(u, "derniere_connexion", None)) if u else None})
        for ab in offerts:
            u = users.get(ab.user_id)
            if not u or u.email in vus:
                continue
            items.append({"email": u.email, "plan": ab.plan, "motif": None, "motif_label": "Sans motif", "note": None, "statut": "actif",
                          "role": u.role, "user_id": u.id, "invite_par": None, "invite_le": None,
                          "derniere_connexion": _iso(getattr(u, "derniere_connexion", None))})
        items.sort(key=lambda x: (x["statut"] != "invite", x["email"]))
        return {"items": items, "motifs": MOTIFS}

    @api.delete("/admin/equipe/{email}")
    async def admin_equipe_retirer(email: str, db: AsyncSession = Depends(get_db), _r=admin):
        email = email.strip().lower()
        acces = await db.get(AccesEquipe, email)
        u = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if not acces and not u:
            raise HTTPException(404, "Accès introuvable.")
        if u:
            await _retirer(db, u.id)
            if u.role == "admin" and u.id != g["_uid"]():
                u.role = "client"
        if acces:
            await db.delete(acces)
        await db.commit()
        return {"ok": True}

    # ── Fiche 360° ─────────────────────────────────────────────────────────────
    @api.get("/admin/utilisateurs/{user_id}/fiche")
    async def admin_fiche(user_id: str, db: AsyncSession = Depends(get_db), _r=admin):
        u = await db.get(User, user_id)
        if not u:
            raise HTTPException(404, "Utilisateur introuvable.")
        p = await g["_profil"](db, user_id)
        Abo = g["Abonnement"]
        cm = p.contexte_metier or {}
        fiche = {
            "id": u.id, "email": u.email, "role": u.role, "inscrit_le": _iso(u.created_at),
            "derniere_connexion": _iso(getattr(u, "derniere_connexion", None)),
            "prenom": p.prenom, "metier": cm.get("metier") or cm.get("activite"), "marche": cm.get("marche"),
            "ma_foi": bool(cm.get("parcours_foi")),
            "abonnement": g["_abo_resume"](await db.get(Abo, user_id)),
            "acces_equipe": None, "connexions": [], "erreurs": [], "parrainage": {}, "foi": {},
        }
        acces = await db.get(AccesEquipe, (u.email or "").lower())
        if acces:
            fiche["acces_equipe"] = {"motif": MOTIFS.get(acces.motif, acces.motif), "note": acces.note, "invite_par": acces.invite_par}
        UC = g["UserConnection"]
        fiche["connexions"] = [{"provider": c.provider, "status": c.status, "depuis": _iso(c.created_at)}
                               for c in (await db.execute(select(UC).where(UC.user_id == user_id, UC.revoked_at.is_(None)))).scalars()]
        AppLog = g.get("AppLog")
        if AppLog is not None:
            fiche["erreurs"] = [{"le": _iso(l.created_at), "feature": l.feature, "message": l.message[:200]}
                                for l in (await db.execute(select(AppLog).where(AppLog.user_id == user_id, AppLog.level.in_(("ERROR", "CRITICAL")))
                                                           .order_by(AppLog.created_at.desc()).limit(5))).scalars()]
        Referral = g["Referral"]
        fiche["parrainage"] = {
            "filleuls": (await db.execute(select(func.count()).select_from(Referral).where(Referral.referrer_id == user_id))).scalar_one(),
            "parrain": (await db.execute(select(Referral.referrer_id).where(Referral.referred_id == user_id))).scalars().first(),
        }
        if fiche["parrainage"]["parrain"]:
            par = await db.get(User, fiche["parrainage"]["parrain"])
            fiche["parrainage"]["parrain"] = par.email if par else None
        FoiPost = g.get("FoiPost")
        if FoiPost is not None:
            fiche["foi"]["publications"] = (await db.execute(select(func.count()).select_from(FoiPost).where(FoiPost.user_id == user_id))).scalar_one()
        return fiche

    # ── À traiter aujourd'hui ─────────────────────────────────────────────────
    @api.get("/admin/a-traiter")
    async def admin_a_traiter(db: AsyncSession = Depends(get_db), _r=admin):
        maintenant = datetime.now(timezone.utc)
        items = []

        async def compter(modele, *conditions):
            return (await db.execute(select(func.count()).select_from(modele).where(*conditions))).scalar_one()

        AppLog = g.get("AppLog")
        if AppLog is not None:
            n = await compter(AppLog, AppLog.level.in_(("ERROR", "CRITICAL")), AppLog.created_at >= maintenant - timedelta(hours=24))
            if n:
                items.append({"cle": "erreurs", "niveau": "urgent" if n >= 10 else "a_voir", "texte": f"{n} erreur{'s' if n > 1 else ''} applicative{'s' if n > 1 else ''} en 24 h", "onglet": "logs"})
        SigFoi = g.get("FoiSignalement")
        if SigFoi is not None:
            n = await compter(SigFoi, SigFoi.statut == "ouvert")
            if n:
                items.append({"cle": "signalements", "niveau": "urgent", "texte": f"{n} signalement{'s' if n > 1 else ''} dans Ma Foi", "onglet": "moderation-foi"})
        Prep = g.get("PreparedNewsletter")
        if Prep is not None:
            n = await compter(Prep, Prep.status == "draft")
            if n:
                items.append({"cle": "newsletters", "niveau": "a_voir", "texte": f"{n} newsletter{'s' if n > 1 else ''} à relire", "onglet": "newsletters"})
        Dem = g.get("DemandeCollaborateur")
        if Dem is not None:
            n = await compter(Dem, Dem.statut == "nouvelle")
            if n:
                items.append({"cle": "demandes", "niveau": "a_voir", "texte": f"{n} demande{'s' if n > 1 else ''} de collaborateur", "onglet": "demandes"})
        n = await compter(AccesEquipe, AccesEquipe.statut == "invite")
        if n:
            items.append({"cle": "invitations", "niveau": "info", "texte": f"{n} invitation{'s' if n > 1 else ''} équipe pas encore utilisée{'s' if n > 1 else ''}", "onglet": "equipe"})
        Abo = g["Abonnement"]
        n = await compter(Abo, Abo.cycle != "offert", Abo.plan != "essentielle", Abo.fin < maintenant, Abo.fin >= maintenant - timedelta(days=7))
        if n:
            items.append({"cle": "expires", "niveau": "a_voir", "texte": f"{n} abonnement{'s' if n > 1 else ''} expiré{'s' if n > 1 else ''} cette semaine (paiement échoué ou non renouvelé)", "onglet": "utilisateurs"})
        n = await compter(Abo, Abo.cycle == "essai", Abo.fin >= maintenant, Abo.fin < maintenant + timedelta(days=3))
        if n:
            items.append({"cle": "essais", "niveau": "info", "texte": f"{n} essai{'s' if n > 1 else ''} se termine{'nt' if n > 1 else ''} dans moins de 3 jours", "onglet": "utilisateurs"})
        Prod = g.get("VendorProduct") or g.get("ProduitVendeur")
        if Prod is not None and hasattr(Prod, "statut"):
            n = await compter(Prod, Prod.statut == "en_attente")
            if n:
                items.append({"cle": "produits", "niveau": "a_voir", "texte": f"{n} produit{'s' if n > 1 else ''} vendeur à modérer", "onglet": "vendeurs"})
        ordre = {"urgent": 0, "a_voir": 1, "info": 2}
        items.sort(key=lambda x: ordre[x["niveau"]])
        return {"items": items}

    # ── Actions en groupe + export CSV ───────────────────────────────────────
    class GroupeIn(BaseModel):
        ids: List[str]
        action: str             # offrir | retirer_offert | prolonger
        plan: Optional[str] = "pro"
        jours: int = 30
        motif: Optional[str] = "autre"

    @api.post("/admin/utilisateurs/groupe")
    async def admin_groupe(body: GroupeIn, db: AsyncSession = Depends(get_db), _r=admin):
        if not body.ids or len(body.ids) > 200:
            raise HTTPException(422, "Sélectionne entre 1 et 200 comptes.")
        if body.action == "offrir" and (body.plan not in PRICING or body.plan == "essentielle"):
            raise HTTPException(422, "Offre inconnue.")
        Abo = g["Abonnement"]
        faits, ignores = 0, []
        for uid in body.ids:
            u = await db.get(User, uid)
            if not u:
                continue
            try:
                if body.action == "offrir":
                    await _offrir(db, uid, body.plan)
                    acces = await db.get(AccesEquipe, u.email.lower())
                    if not acces:
                        db.add(AccesEquipe(email=u.email.lower(), plan=body.plan, motif=body.motif if body.motif in MOTIFS else "autre",
                                           statut="actif", user_id=uid, active_le=datetime.now(timezone.utc)))
                    else:
                        acces.plan, acces.statut, acces.user_id = body.plan, "actif", uid
                elif body.action == "retirer_offert":
                    await _retirer(db, uid)
                elif body.action == "prolonger":
                    a = await db.get(Abo, uid)
                    if not a or a.plan == "essentielle" or a.cycle == "offert":
                        ignores.append(u.email)
                        continue
                    base = a.fin if (a.fin and (a.fin if a.fin.tzinfo else a.fin.replace(tzinfo=timezone.utc)) > datetime.now(timezone.utc)) else datetime.now(timezone.utc)
                    base = base if base.tzinfo else base.replace(tzinfo=timezone.utc)
                    a.fin = base + timedelta(days=max(1, min(body.jours, 366)))
                else:
                    raise HTTPException(422, "Action inconnue.")
                faits += 1
            except HTTPException as e:
                if e.status_code == 422:
                    raise
                ignores.append(u.email)
        await db.commit()
        return {"ok": True, "faits": faits, "ignores": ignores}

    @api.get("/admin/utilisateurs/export.csv")
    async def admin_export(q: Optional[str] = None, role: Optional[str] = None, offre: Optional[str] = None,
                           db: AsyncSession = Depends(get_db), _r=admin):
        lister = g["lister_utilisateurs"]
        lignes, page = [], 1
        while True:
            d = await lister(page=page, par_page=100, q=q, role=role, offre=offre, tri="inscription", db=db, _role="admin")
            lignes += d["items"]
            if page >= d["pages"] or page >= 100:
                break
            page += 1
        sortie = io.StringIO()
        w = csv.writer(sortie, delimiter=";")
        w.writerow(["email", "role", "offre", "etat", "fin", "inscrit_le", "derniere_connexion"])
        for u in lignes:
            ab = u.get("abonnement") or {}
            w.writerow([u["email"], u["role"], u["plan"], ab.get("etat", ""), ab.get("fin") or "", u.get("inscrit_le") or "", u.get("derniere_connexion") or ""])
        return Response(content="﻿" + sortie.getvalue(), media_type="text/csv; charset=utf-8",
                        headers={"Content-Disposition": f"attachment; filename=zayado-utilisateurs-{datetime.now().strftime('%Y%m%d')}.csv"})
