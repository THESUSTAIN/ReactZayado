"""Vision+ — extensions du Vision Board branchées sur server.py sans le réécrire.

Même principe que part2_ext : server.py appelle `install_vision_plus(globals())`
juste avant `app.include_router(api)`.

Contenu
  1. GET  /victoires                       — dernières victoires (carte « Victoires »)
  2. Partage public en lecture seule d'un board
       GET    /vision/share?board=perso      — état du lien
       POST   /vision/share                  — créer / mettre à jour (options de masquage)
       DELETE /vision/share?board=perso      — révoquer
       GET    /public/vision/{token}         — lecture publique (sans compte)
  3. E-mail du lundi 7 h (heure de Paris) : pourquoi, score Vision, CA / objectif,
     3 actions. Une seule fois par semaine et par personne (table de journal),
     respecte `notifications`. Désactivable avec VISION_WEEKLY_EMAIL=0.
"""
import asyncio
import logging
import os
import secrets
from datetime import datetime, timezone
from html import escape
from typing import Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Boolean, DateTime, String, Text, UniqueConstraint, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None

log = logging.getLogger("kairos.vision_plus")


# ───────────────────────── Fonctions pures (testables seules) ─────────────────────────

def score_vision(objectifs: list) -> int:
    """Score « Vision réalisée » : moyenne de l'avancement des objectifs (0 si aucun)."""
    vals = [max(0, min(100, int(o.get("progression") or 0))) for o in objectifs or []]
    return round(sum(vals) / len(vals)) if vals else 0


def semaine_iso(dt: datetime) -> str:
    y, w, _ = dt.isocalendar()
    return f"{y}-W{w:02d}"


def est_lundi_matin(now_local: datetime) -> bool:
    """Fenêtre d'envoi : lundi à partir de 7 h (heure locale), jusqu'à midi."""
    return now_local.weekday() == 0 and 7 <= now_local.hour < 12


def filtrer_public(state: dict, hide_energie: bool) -> dict:
    """Ne garde de /state que ce qui a du sens sur un lien public (jamais l'e-mail ni le plan)."""
    state = dict(state or {})
    prof = state.get("profile") or {}
    state["profile"] = {"prenom": prof.get("prenom") or ""}
    vision = dict(state.get("vision") or {})
    vision.pop("contexte_metier", None)
    state["vision"] = vision
    for k in ("banner", "victory", "priorities", "onboarded"):
        state.pop(k, None)
    if hide_energie:
        state["energy"] = {"a_checkin": False, "masque": True}
        state["trend"] = []
        state.pop("balance", None)
    return state


def rendu_email_lundi(prenom: str, pourquoi: str, score: int, pouls: Optional[dict], actions: list, lien: str) -> str:
    """HTML sobre (pas de formulaire, liens https uniquement — contrôlés par _assert_safe_email)."""
    p = escape(prenom or "")
    lignes = []
    if pourquoi:
        lignes.append(f'<p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#1b2436"><em>« {escape(pourquoi[:400])} »</em></p>')
    lignes.append(f'<p style="margin:0 0 6px;font-size:14px;color:#6b7486">Vision réalisée</p>'
                  f'<p style="margin:0 0 18px;font-size:28px;font-weight:600;color:#1b2436">{score} %</p>')
    if pouls and (pouls.get("ca_objectif") or 0) > 0:
        ca = f'{int(pouls.get("ca_mensuel") or 0):,}'.replace(",", " ")
        obj = f'{int(pouls.get("ca_objectif") or 0):,}'.replace(",", " ")
        lignes.append(f'<p style="margin:0 0 18px;font-size:15px;color:#1b2436">CA du mois : <strong>{ca} €</strong> sur {obj} € ({int(pouls.get("avancement") or 0)} %)</p>')
    if actions:
        items = "".join(f'<li style="margin:0 0 6px">{escape(a)}</li>' for a in actions[:3])
        lignes.append(f'<p style="margin:0 0 6px;font-size:14px;color:#6b7486">Tes 3 actions de la semaine</p>'
                      f'<ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:1.5;color:#1b2436">{items}</ul>')
    bouton = ""
    if lien.startswith("https://"):
        bouton = (f'<p style="margin:8px 0 0"><a href="{escape(lien)}" style="display:inline-block;background:#DEC2A3;color:#0b1f3a;'
                  f'text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">Ouvrir mon Vision Board</a></p>')
    return (
        '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:28px">'
        f'<p style="margin:0 0 4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8a6a35">Ton lundi Vision</p>'
        f'<h1 style="margin:0 0 20px;font-size:24px;font-weight:600;color:#1b2436">Bonne semaine{(" " + p) if p else ""} !</h1>'
        + "".join(lignes) + bouton +
        '<p style="margin:28px 0 0;font-size:12px;color:#8a93a3">Tu reçois cet e-mail car les notifications sont activées dans tes paramètres.</p>'
        '</div>'
    )


# ───────────────────────── Installation ─────────────────────────

def install_vision_plus(g: dict) -> None:
    Base = g["Base"]
    api = g["api"]
    app = g["app"]
    get_db = g["get_db"]
    _uid = g["_uid"]
    new_uuid = g["new_uuid"]
    utcnow = g["utcnow"]
    DEMO_USER_ID = g["DEMO_USER_ID"]
    _current_uid = g["_current_uid"]
    async_session = g["async_session"]
    VisionVictoire = g["VisionVictoire"]
    VisionProfile = g["VisionProfile"]
    VisionTache = g["VisionTache"]
    _board_courant = g["_board_courant"]
    get_state, list_objectifs, lister_taches = g["get_state"], g["list_objectifs"], g["lister_taches"]
    cockpit_pouls_get, get_roadmap, list_idees, get_wheel = g["cockpit_pouls_get"], g["get_roadmap"], g["list_idees"], g["get_wheel"]

    # ══════════════ 1. Victoires ══════════════

    @api.get("/victoires")
    async def lister_victoires(db: AsyncSession = Depends(get_db)):
        rows = (await db.execute(
            select(VisionVictoire).where(VisionVictoire.user_id == _uid()).order_by(VisionVictoire.date.desc()).limit(12)
        )).scalars()
        return [{"id": v.id, "texte": v.texte, "detail": v.detail or "", "date": v.date} for v in rows]

    # ══════════════ 2. Partage public en lecture seule ══════════════

    class VisionShare(Base):
        __tablename__ = "vision_shares"
        __table_args__ = (UniqueConstraint("user_id", "board", name="uq_vision_share_board"),)
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        board: Mapped[str] = mapped_column(String(40))
        token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
        hide_finances: Mapped[bool] = mapped_column(Boolean, default=True)
        hide_energie: Mapped[bool] = mapped_column(Boolean, default=True)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    class ShareIn(BaseModel):
        board: str = "perso"
        hide_finances: bool = True
        hide_energie: bool = True

    def _share_json(s):
        if not s:
            return {"active": False}
        return {"active": True, "token": s.token, "board": s.board,
                "hide_finances": bool(s.hide_finances), "hide_energie": bool(s.hide_energie)}

    async def _get_share(db, uid, board):
        return (await db.execute(select(VisionShare).where(VisionShare.user_id == uid, VisionShare.board == board))).scalar_one_or_none()

    @api.get("/vision/share")
    async def etat_partage(board: str = "perso", db: AsyncSession = Depends(get_db)):
        return _share_json(await _get_share(db, _uid(), board))

    @api.post("/vision/share")
    async def creer_partage(body: ShareIn, db: AsyncSession = Depends(get_db)):
        uid = _uid()
        if uid == DEMO_USER_ID:
            raise HTTPException(403, "Connecte-toi avec un compte pour partager ton board.")
        if await _board_courant(db, uid, body.board) is None:
            raise HTTPException(404, "Board introuvable.")
        s = await _get_share(db, uid, body.board)
        if not s:
            s = VisionShare(user_id=uid, board=body.board, token=secrets.token_urlsafe(24))
            db.add(s)
        s.hide_finances = body.hide_finances
        s.hide_energie = body.hide_energie
        await db.commit()
        await db.refresh(s)
        return _share_json(s)

    @api.delete("/vision/share")
    async def revoquer_partage(board: str = "perso", db: AsyncSession = Depends(get_db)):
        s = await _get_share(db, _uid(), board)
        if s:
            await db.delete(s)
            await db.commit()
        return {"active": False}

    @api.get("/public/vision/{token}")
    async def lire_partage(token: str, db: AsyncSession = Depends(get_db)):
        if len(token) < 20:
            raise HTTPException(404, "Lien invalide ou révoqué.")
        s = (await db.execute(select(VisionShare).where(VisionShare.token == token))).scalar_one_or_none()
        if not s:
            raise HTTPException(404, "Lien invalide ou révoqué.")
        row = await _board_courant(db, s.user_id, s.board)
        if row is None:
            raise HTTPException(404, "Board introuvable.")
        # On relit les données exactement comme l'app, mais pour le propriétaire du lien.
        jeton = _current_uid.set(s.user_id)
        try:
            state = await get_state(db)
            objectifs = await list_objectifs(db)
            taches = await lister_taches(db)
            roadmap = await get_roadmap(db)
            idees = await list_idees(None, db)
            wheel = await get_wheel(db)
            victoires = await lister_victoires(db)
            pouls = None if s.hide_finances else await cockpit_pouls_get(db)
        finally:
            _current_uid.reset(jeton)
        cards = [c for c in (row.cards or []) if not c.get("trashed")]
        if s.hide_finances:
            cards = [c for c in cards if not (c.get("type") == "live" and c.get("source") in ("finances", "suivi", "swot"))]
        if s.hide_energie:
            cards = [c for c in cards if not (c.get("type") == "live" and c.get("source") in ("energie", "roue"))]
        # Un mur vidé uniquement par le masquage (ex. « Finances ») est retiré lui aussi.
        restants = {c.get("parent") for c in cards if c.get("parent")}
        avant = {c.get("parent") for c in (row.cards or []) if c.get("parent") and not c.get("trashed")}
        cards = [c for c in cards if not (c.get("type") == "wall" and c.get("id") in avant and c.get("id") not in restants)]
        return {
            "board": {"nom": row.nom, "emoji": row.emoji or "🧭"},
            "cards": cards,
            "live": {
                "state": filtrer_public(state, s.hide_energie),
                "objectifs": objectifs, "taches": taches, "roadmap": roadmap, "idees": idees,
                "wheel": None if s.hide_energie else wheel, "victoires": victoires, "pouls": pouls,
            },
            "masque": {"finances": bool(s.hide_finances), "energie": bool(s.hide_energie)},
        }

    # ══════════════ 2b. Commentaires sur le lien public ══════════════
    # Un visiteur (sans compte) commente le board partagé ; le propriétaire est
    # notifié par e-mail si ses réglages l'autorisent (Brevo quand configuré).

    class VisionComment(Base):
        __tablename__ = "vision_comments"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        token: Mapped[str] = mapped_column(String(64), index=True)  # lien de partage visé
        auteur: Mapped[str] = mapped_column(String(80), default="Visiteur")
        texte: Mapped[str] = mapped_column(Text)
        lu: Mapped[bool] = mapped_column(Boolean, default=False)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    class CommentIn(BaseModel):
        auteur: str = ""
        texte: str

    def _comment_json(c):
        return {"id": c.id, "auteur": c.auteur, "texte": c.texte,
                "date": c.created_at.isoformat() if c.created_at else None, "lu": bool(c.lu)}

    async def _share_par_token(db, token):
        if len(token) < 20:
            return None
        return (await db.execute(select(VisionShare).where(VisionShare.token == token))).scalar_one_or_none()

    @api.get("/public/vision/{token}/commentaires")
    async def lire_commentaires(token: str, db: AsyncSession = Depends(get_db)):
        if await _share_par_token(db, token) is None:
            raise HTTPException(404, "Lien invalide ou révoqué.")
        rows = (await db.execute(select(VisionComment).where(VisionComment.token == token)
                                 .order_by(VisionComment.created_at))).scalars()
        return {"commentaires": [_comment_json(c) for c in rows]}

    @api.post("/public/vision/{token}/commentaires")
    async def poster_commentaire(token: str, body: CommentIn, db: AsyncSession = Depends(get_db)):
        s = await _share_par_token(db, token)
        if not s:
            raise HTTPException(404, "Lien invalide ou révoqué.")
        texte = (body.texte or "").strip()[:1000]
        if not texte:
            raise HTTPException(422, "Commentaire vide.")
        auteur = (body.auteur or "").strip()[:80] or "Visiteur"
        c = VisionComment(token=token, auteur=auteur, texte=texte)
        db.add(c)
        await db.commit()
        await db.refresh(c)
        # Notification propriétaire : e-mail si activé dans ses réglages.
        # L'échec d'envoi ne doit JAMAIS bloquer l'enregistrement du commentaire.
        try:
            User_ = g.get("User")
            envoyer = g.get("send_email")
            profil = (await db.execute(select(VisionProfile).where(VisionProfile.user_id == s.user_id))).scalar_one_or_none()
            notif_ok = bool(profil.notifications) if profil and profil.notifications is not None else True
            owner = (await db.execute(select(User_).where(User_.id == s.user_id))).scalar_one_or_none() if User_ else None
            if notif_ok and owner and owner.email and envoyer:
                await envoyer(
                    to=owner.email,
                    subject=f"Nouveau commentaire de {escape(auteur)} sur ton Vision Board",
                    html=(f"<p><b>{escape(auteur)}</b> a commenté ton Vision Board :</p>"
                          f"<blockquote style='border-left:3px solid #DEC2A3;padding-left:12px'>{escape(texte)}</blockquote>"
                          f"<p><a href='https://app.zayado.net/app/vision'>Ouvrir mon board pour répondre</a></p>"),
                )
        except Exception as e:  # noqa: BLE001
            log.warning("Notif e-mail commentaire non envoyée : %s", e)
        return _comment_json(c)

    @api.get("/vision/commentaires")
    async def mes_commentaires(db: AsyncSession = Depends(get_db)):
        uid = _uid()
        tokens = (await db.execute(select(VisionShare).where(VisionShare.user_id == uid))).scalars().all()
        tok = [t.token for t in tokens]
        if not tok:
            return {"commentaires": [], "non_lus": 0}
        rows = list((await db.execute(select(VisionComment).where(VisionComment.token.in_(tok))
                                 .order_by(VisionComment.created_at.desc()).limit(50))).scalars())
        board_par_token = {t.token: t.board for t in tokens}
        return {"commentaires": [{**_comment_json(c), "board": board_par_token.get(c.token, "")} for c in rows],
                "non_lus": sum(1 for c in rows if not c.lu)}

    @api.post("/vision/commentaires/lus")
    async def commentaires_lus(db: AsyncSession = Depends(get_db)):
        uid = _uid()
        tokens = [t.token for t in (await db.execute(select(VisionShare).where(VisionShare.user_id == uid))).scalars().all()]
        if tokens:
            await db.execute(update(VisionComment).where(VisionComment.token.in_(tokens)).values(lu=True))
            await db.commit()
        return {"ok": True}

    # ══════════════ 2c. Invitations avec édition (collaborateurs) ══════════════
    # Le lien public reste en lecture seule. Ici : invitation NOMMÉE par e-mail
    # qui donne la modification du board à un compte existant.

    class VisionBoardCollab(Base):
        __tablename__ = "vision_board_collabs"
        __table_args__ = (UniqueConstraint("owner_id", "board", "email", name="uq_collab_board_email"),)
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        owner_id: Mapped[str] = mapped_column(String(36), index=True)
        board: Mapped[str] = mapped_column(String(40))
        email: Mapped[str] = mapped_column(String(255), index=True)
        role: Mapped[str] = mapped_column(String(20), default="editeur")
        # Qui a envoyé l'invitation : le propriétaire, ou un éditeur invité qui
        # re-partage (NULL = propriétaire, anciennes lignes comprises).
        invite_par: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    g["VisionBoardCollab"] = VisionBoardCollab
    VisionBoardSpace = g["VisionBoardSpace"]
    BoardIn = g["BoardIn"]
    User_ = g["User"]

    class InviteIn(BaseModel):
        email: str

    async def _collab_board(db, uid, cle, owner: Optional[str] = None):
        """Retourne la collaboration si ce board est partagé avec moi (édition).
        `owner` départage deux boards de même clé partagés par deux personnes
        différentes (avant : erreur 500 « plusieurs résultats »)."""
        me = (await db.execute(select(User_).where(User_.id == uid))).scalar_one_or_none()
        if not me:
            return None
        q = select(VisionBoardCollab).where(VisionBoardCollab.email == (me.email or "").lower(), VisionBoardCollab.board == cle)
        if owner:
            q = q.where(VisionBoardCollab.owner_id == owner)
        return (await db.execute(q.order_by(VisionBoardCollab.created_at))).scalars().first()

    async def _prevenir_invite(db, email: str, cle: str, owner_id: str, par_uid: str):
        """E-mail d'invitation (best effort : un échec d'envoi ne bloque jamais l'invitation)."""
        try:
            envoyer = g.get("send_email")
            if not envoyer:
                return
            row = (await db.execute(select(VisionBoardSpace).where(
                VisionBoardSpace.user_id == owner_id, VisionBoardSpace.cle == cle))).scalar_one_or_none()
            prof = (await db.execute(select(VisionProfile).where(VisionProfile.user_id == par_uid))).scalar_one_or_none()
            qui = escape((prof.prenom if prof else "") or "Un membre Zayado")
            nom = escape((row.nom if row else "") or "Vision Board")
            base = os.environ.get("FRONTEND_PUBLIC_URL", "https://app.zayado.net").rstrip("/")
            await envoyer(to=email, subject=f"{qui} t'invite à modifier le board « {nom} »",
                          html=(f"<p><b>{qui}</b> t'a invité·e à modifier le Vision Board <b>{nom}</b>.</p>"
                                f"<p><a href='{base}/app/vision'>Ouvrir Zayado</a> → Vision → « Partagés avec moi ».</p>"
                                "<p style='color:#667'>Pas encore de compte ? Crée-le avec cette adresse e-mail : le board apparaîtra automatiquement.</p>"))
        except Exception as e:  # noqa: BLE001
            log.warning("E-mail d'invitation board non envoyé : %s", e)

    @api.post("/vision/boards/{cle}/inviter")
    async def inviter_board(cle: str, body: InviteIn, db: AsyncSession = Depends(get_db)):
        uid = _uid()
        row = await _board_courant(db, uid, cle)
        if row is None or row.cle != cle:
            raise HTTPException(404, "Board introuvable.")
        email = (body.email or "").strip().lower()
        if not email or "@" not in email:
            raise HTTPException(422, "E-mail invalide.")
        c = (await db.execute(select(VisionBoardCollab).where(
            VisionBoardCollab.owner_id == uid, VisionBoardCollab.board == cle,
            VisionBoardCollab.email == email))).scalar_one_or_none()
        if not c:
            db.add(VisionBoardCollab(owner_id=uid, board=cle, email=email))
            await db.commit()
            await _prevenir_invite(db, email, cle, uid, uid)
        return {"ok": True, "email": email, "role": "editeur"}

    @api.get("/vision/boards/{cle}/invitations")
    async def lister_invitations(cle: str, db: AsyncSession = Depends(get_db)):
        rows = list((await db.execute(select(VisionBoardCollab).where(
            VisionBoardCollab.owner_id == _uid(), VisionBoardCollab.board == cle))).scalars())
        return {"invitations": [{"email": c.email, "role": c.role, "invite_par": await _email_de(db, c.invite_par)} for c in rows]}

    @api.get("/vision/contacts-partage")
    async def contacts_partage(db: AsyncSession = Depends(get_db)):
        """Les personnes à qui on peut partager un board d'un clic : son équipe « Ton entreprise », ses membres d'équipe
        (offre Équipe) et les personnes déjà invitées. Rien n'est partagé tant qu'on ne choisit pas."""
        uid = _uid()
        moi = await db.get(User_, uid)
        mon_email = ((moi.email if moi else "") or "").lower()
        vus, out = set(), []

        def ajouter(email, nom, origine):
            e = (email or "").strip().lower()
            if e and "@" in e and e != mon_email and e not in vus:
                vus.add(e)
                out.append({"email": e, "nom": (nom or "").strip() or e.split("@")[0], "origine": origine})

        EM = g.get("EntMembre")
        if EM is not None:
            mien = (await db.execute(select(EM).where(EM.user_id == uid, EM.statut == "actif"))).scalars().first()
            if mien:
                for c in (await db.execute(select(EM).where(EM.org_id == mien.org_id, EM.statut == "actif"))).scalars():
                    ajouter(c.email, c.nom, "Ton entreprise")
        EQ = g.get("EquipeMembre")
        if EQ is not None:
            try:
                for c in (await db.execute(select(EQ).where(EQ.owner_id == uid))).scalars():
                    ajouter(getattr(c, "email", ""), getattr(c, "prenom", "") or getattr(c, "nom", ""), "Mon équipe")
            except Exception:  # noqa: BLE001
                pass
        for c in (await db.execute(select(VisionBoardCollab).where(VisionBoardCollab.owner_id == uid))).scalars():
            ajouter(c.email, "", "Déjà invité")
        return {"contacts": out[:100]}

    async def _email_de(db, uid_):
        if not uid_:
            return None
        u = await db.get(User_, uid_)
        return u.email if u else None

    @api.delete("/vision/boards/{cle}/inviter/{email}")
    async def retirer_invitation(cle: str, email: str, db: AsyncSession = Depends(get_db)):
        c = (await db.execute(select(VisionBoardCollab).where(
            VisionBoardCollab.owner_id == _uid(), VisionBoardCollab.board == cle,
            VisionBoardCollab.email == email.strip().lower()))).scalar_one_or_none()
        if c:
            await db.delete(c)
            await db.commit()
        return {"ok": True}

    @api.get("/vision/partages")
    async def boards_partages_avec_moi(db: AsyncSession = Depends(get_db)):
        uid = _uid()
        me = (await db.execute(select(User_).where(User_.id == uid))).scalar_one_or_none()
        if not me:
            return {"boards": []}
        colls = (await db.execute(select(VisionBoardCollab).where(VisionBoardCollab.email == me.email))).scalars().all()
        sortie = []
        for c in colls:
            row = (await db.execute(select(VisionBoardSpace).where(
                VisionBoardSpace.user_id == c.owner_id, VisionBoardSpace.cle == c.board))).scalar_one_or_none()
            if not row:
                continue
            prof = (await db.execute(select(VisionProfile).where(VisionProfile.user_id == c.owner_id))).scalar_one_or_none()
            sortie.append({"key": row.cle, "nom": row.nom, "emoji": row.emoji or "🧭",
                           "count": len(row.cards or []), "role": c.role, "owner": c.owner_id,
                           "peut_partager": c.role == "editeur",
                           "proprietaire": (prof.prenom if prof else "") or ""})
        return {"boards": sortie}

    @api.get("/vision/partages/{cle}")
    async def lire_board_partage(cle: str, owner: Optional[str] = None, db: AsyncSession = Depends(get_db)):
        c = await _collab_board(db, _uid(), cle, owner)
        if not c:
            raise HTTPException(403, "Ce board ne t'est pas partagé.")
        row = (await db.execute(select(VisionBoardSpace).where(
            VisionBoardSpace.user_id == c.owner_id, VisionBoardSpace.cle == cle))).scalar_one_or_none()
        if not row:
            raise HTTPException(404, "Board introuvable.")
        return {"key": row.cle, "nom": row.nom, "emoji": row.emoji or "🧭", "cards": row.cards or [], "role": c.role,
                "owner": c.owner_id, "peut_partager": c.role == "editeur"}

    # ── Re-partage par un éditeur invité ──
    # Un éditeur peut à son tour inviter d'autres éditeurs sur le même board.
    # Le lien PUBLIC (lecture seule) reste réservé au propriétaire. L'éditeur
    # ne peut retirer que les personnes qu'il a lui-même invitées.
    @api.get("/vision/partages/{cle}/invitations")
    async def invitations_board_partage(cle: str, owner: Optional[str] = None, db: AsyncSession = Depends(get_db)):
        uid = _uid()
        c = await _collab_board(db, uid, cle, owner)
        if not c:
            raise HTTPException(403, "Ce board ne t'est pas partagé.")
        rows = list((await db.execute(select(VisionBoardCollab).where(
            VisionBoardCollab.owner_id == c.owner_id, VisionBoardCollab.board == cle))).scalars())
        return {"invitations": [{"email": r.email, "role": r.role, "invite_par": await _email_de(db, r.invite_par),
                                 "retirable": r.invite_par == uid} for r in rows],
                "peut_partager": c.role == "editeur"}

    @api.post("/vision/partages/{cle}/inviter")
    async def reinviter_board_partage(cle: str, body: InviteIn, owner: Optional[str] = None, db: AsyncSession = Depends(get_db)):
        uid = _uid()
        c = await _collab_board(db, uid, cle, owner)
        if not c:
            raise HTTPException(403, "Ce board ne t'est pas partagé.")
        if c.role != "editeur":
            raise HTTPException(403, "Seul un éditeur peut inviter d'autres personnes.")
        email = (body.email or "").strip().lower()
        if not email or "@" not in email:
            raise HTTPException(422, "E-mail invalide.")
        proprio = await db.get(User_, c.owner_id)
        if proprio and (proprio.email or "").lower() == email:
            return {"ok": True, "email": email, "role": "proprietaire"}
        existe = (await db.execute(select(VisionBoardCollab).where(
            VisionBoardCollab.owner_id == c.owner_id, VisionBoardCollab.board == cle,
            VisionBoardCollab.email == email))).scalar_one_or_none()
        if not existe:
            db.add(VisionBoardCollab(owner_id=c.owner_id, board=cle, email=email, role="editeur", invite_par=uid))
            await db.commit()
            await _prevenir_invite(db, email, cle, c.owner_id, uid)
        return {"ok": True, "email": email, "role": "editeur"}

    @api.delete("/vision/partages/{cle}/inviter/{email}")
    async def retirer_reinvitation(cle: str, email: str, owner: Optional[str] = None, db: AsyncSession = Depends(get_db)):
        uid = _uid()
        c = await _collab_board(db, uid, cle, owner)
        if not c:
            raise HTTPException(403, "Ce board ne t'est pas partagé.")
        r = (await db.execute(select(VisionBoardCollab).where(
            VisionBoardCollab.owner_id == c.owner_id, VisionBoardCollab.board == cle,
            VisionBoardCollab.email == email.strip().lower()))).scalar_one_or_none()
        if r:
            if r.invite_par != uid:
                raise HTTPException(403, "Tu ne peux retirer que les personnes que tu as invitées.")
            await db.delete(r)
            await db.commit()
        return {"ok": True}

    @api.put("/vision/partages/{cle}")
    async def sauver_board_partage(cle: str, body: BoardIn, owner: Optional[str] = None, db: AsyncSession = Depends(get_db)):
        c = await _collab_board(db, _uid(), cle, owner)
        if not c:
            raise HTTPException(403, "Ce board ne t'est pas partagé.")
        row = (await db.execute(select(VisionBoardSpace).where(
            VisionBoardSpace.user_id == c.owner_id, VisionBoardSpace.cle == cle))).scalar_one_or_none()
        if not row:
            raise HTTPException(404, "Board introuvable.")
        row.cards = body.cards
        await db.commit()
        return {"ok": True, "count": len(body.cards)}

    # ══════════════ 3. E-mail du lundi ══════════════

    class VisionWeeklyMail(Base):
        __tablename__ = "vision_weekly_mails"
        __table_args__ = (UniqueConstraint("user_id", "semaine", name="uq_vision_weekly_mail"),)
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        semaine: Mapped[str] = mapped_column(String(10))
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    async def envoyer_lundi_pour(db, prof) -> bool:
        """Envoie l'e-mail du lundi à un profil. True si envoyé."""
        jeton = _current_uid.set(prof.user_id)
        try:
            objectifs = await list_objectifs(db)
            taches = (await lister_taches(db)).get("items", [])
            try:
                pouls = await cockpit_pouls_get(db)
            except Exception:  # noqa: BLE001
                pouls = None
        finally:
            _current_uid.reset(jeton)
        actions = [t["titre"] for t in sorted(taches, key=lambda t: 0 if t.get("statut") == "en_cours" else 1) if t.get("statut") != "fait"]
        base = os.environ.get("FRONTEND_PUBLIC_URL", "https://app.zayado.net").rstrip("/")
        html = rendu_email_lundi(prof.prenom or "", prof.pourquoi or "", score_vision(objectifs), pouls, actions, f"{base}/app/vision?view=canvas")
        await g["send_email"](to=prof.email, subject="Ton lundi Vision · la semaine en un coup d'œil", html=html)
        return True

    async def tour_lundi(now: Optional[datetime] = None) -> int:
        tz = ZoneInfo("Europe/Paris") if ZoneInfo else timezone.utc
        now = now or datetime.now(tz)
        if not est_lundi_matin(now):
            return 0
        semaine = semaine_iso(now)
        envoyes = 0
        async with async_session() as db:
            profils = list((await db.execute(
                select(VisionProfile).where(VisionProfile.notifications.is_(True), VisionProfile.email.is_not(None))
            )).scalars())
            for prof in profils:
                if not prof.email or "@" not in prof.email or prof.user_id == DEMO_USER_ID:
                    continue
                if (getattr(prof, "contexte_metier", None) or {}).get("notif_email_lundi") is False:
                    continue  # coupé dans Paramètres › Notifications
                deja = (await db.execute(select(VisionWeeklyMail).where(
                    VisionWeeklyMail.user_id == prof.user_id, VisionWeeklyMail.semaine == semaine))).scalar_one_or_none()
                if deja:
                    continue
                # On réserve d'abord (contrainte unique) : jamais deux envois la même semaine.
                db.add(VisionWeeklyMail(user_id=prof.user_id, semaine=semaine))
                try:
                    await db.commit()
                except Exception:  # noqa: BLE001 — un autre process a réservé
                    await db.rollback()
                    continue
                try:
                    await envoyer_lundi_pour(db, prof)
                    envoyes += 1
                except Exception as e:  # noqa: BLE001 — Brevo indisponible : on n'insiste pas cette semaine
                    log.warning("E-mail du lundi non envoyé (%s) : %s", prof.user_id, e)
        if envoyes:
            log.info("E-mail du lundi : %s envoyé(s) pour %s", envoyes, semaine)
        return envoyes

    async def boucle_lundi():
        await asyncio.sleep(30)
        while True:
            try:
                await tour_lundi()
            except Exception as e:  # noqa: BLE001
                log.warning("Boucle e-mail du lundi : %s", e)
            await asyncio.sleep(15 * 60)

    @app.on_event("startup")
    async def _demarrer_lundi():
        if os.environ.get("VISION_WEEKLY_EMAIL", "1").strip().lower() in ("0", "false", "no", "off"):
            return
        asyncio.create_task(boucle_lundi())

    g["tour_lundi"] = tour_lundi
    g["envoyer_lundi_pour"] = envoyer_lundi_pour
    g["VisionShare"] = VisionShare  # exposé pour le seed auto des boards propriétaire
