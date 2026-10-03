"""Moteur de relances : le push existait, mais rien ne le déclenchait.

Types de relance (ordre de priorité) :
  victoire  — le vendredi après 16 h, si aucune victoire n'a été notée cette semaine
  vision    — le lundi après 9 h : relire sa vision (chaque semaine si elle est vide, sinon toutes les 2 semaines)
  foi       — encouragement hebdomadaire, UNIQUEMENT si Ma Foi est activée
  teams     — une seule fois, à partir de J+2 : installer Zayado dans Teams
  retour    — après 3 jours sans check-in : un mot doux pour revenir (au plus une fois par semaine)
  checkin   — chaque jour après l'heure de check-in choisie, s'il n'est pas fait,
              uniquement les jours d'activité choisis à l'inscription (« Quels jours ? »)

Règles : 1 relance par jour au maximum, jamais la nuit (8 h – 21 h, heure locale du profil),
uniquement si les notifications sont activées. Canal : push d'abord, Telegram en repli.
Une relance n'est enregistrée (donc comptée) que si elle a vraiment été remise.

Boucle toutes les 15 minutes (désactivable avec RUN_CRONS=0).
GET  /api/relances            : historique récent de l'utilisateur
POST /api/relances/executer   : (admin) déclenche un passage immédiat
"""
import asyncio
import logging
import os
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import Depends, HTTPException
from sqlalchemy import DateTime, String, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

log = logging.getLogger("kairos.relances")

HEURE_MIN, HEURE_MAX = 8, 21  # fenêtre d'envoi (heure locale) : pas avant 8 h, pas à partir de 21 h
TYPES = ("victoire", "vision", "foi", "teams", "retour", "checkin")


def _heure_checkin(h: Optional[str]) -> tuple[int, int]:
    try:
        a, b = (h or "08:30").split(":")
        return max(0, min(23, int(a))), max(0, min(59, int(b)))
    except Exception:  # noqa: BLE001
        return 8, 30


def choisir_relance(*, maintenant: datetime, heure_checkin: str = "08:30", checkin_fait: bool = False,
                    victoire_cette_semaine: bool = False, vision_vide: bool = False, foi: bool = False,
                    age_compte_jours: int = 0, derniers: Optional[dict] = None,
                    deja_envoye_aujourdhui: bool = False,
                    jours_actifs: Optional[set] = None, inactif_jours: int = 0) -> Optional[str]:
    """Décide quelle relance (ou aucune) envoyer. `maintenant` est en heure locale de l'utilisateur.
    `derniers` : type -> date (datetime.date) de la dernière relance de ce type.
    `jours_actifs` : jours choisis à l'inscription, au format de l'appli (« 1 » = lundi … « 6 » = samedi,
    « 0 » = dimanche) ; vide ou None = tous les jours. `inactif_jours` : jours depuis le dernier check-in."""
    derniers = derniers or {}
    if deja_envoye_aujourdhui:
        return None
    if not (HEURE_MIN <= maintenant.hour < HEURE_MAX):
        return None
    auj = maintenant.date()
    jour_sem = maintenant.weekday()  # lundi = 0

    def il_y_a(t: str) -> Optional[int]:
        d = derniers.get(t)
        return (auj - d).days if d else None

    if jour_sem == 4 and maintenant.hour >= 16 and not victoire_cette_semaine:
        n = il_y_a("victoire")
        if n is None or n >= 6:
            return "victoire"
    if jour_sem == 0 and maintenant.hour >= 9:
        n = il_y_a("vision")
        if n is None or n >= (6 if vision_vide else 13):
            return "vision"
    if foi and jour_sem == 2 and maintenant.hour >= 12:
        n = il_y_a("foi")
        if n is None or n >= 6:
            return "foi"
    if age_compte_jours >= 2 and "teams" not in derniers and jour_sem in (1, 2, 3) and maintenant.hour >= 10:
        return "teams"
    h, m = _heure_checkin(heure_checkin)
    apres_heure = (maintenant.hour, maintenant.minute) >= (h, m)
    jour_actif = (not jours_actifs) or str((jour_sem + 1) % 7) in {str(j) for j in jours_actifs}
    # Retour : 3 jours sans check-in → un seul mot doux par semaine (jamais un harcèlement quotidien).
    if inactif_jours >= 3 and not checkin_fait and apres_heure:
        n = il_y_a("retour")
        if n is None or n >= 7:
            return "retour"
    if not checkin_fait and apres_heure and jour_actif:
        return "checkin"
    return None


def _maj(t: str) -> str:
    return t[:1].upper() + t[1:]


def message_relance(type_: str, prenom: str = "") -> dict:
    p = f"{prenom.strip().split()[0]}, " if (prenom or "").strip() else ""
    return {
        "checkin": {"titre": "Ton point du jour est prêt ☀️", "corps": _maj(f"{p}30 secondes pour noter ton énergie : je cale tes priorités et tes opportunités du jour dessus."), "url": "/app", "tag": "checkin"},
        "retour": {"titre": "Ton cockpit t'attend 🌿", "corps": _maj(f"{p}pas de pression : une minute suffit pour reprendre, ton plan est là où tu l'as laissé."), "url": "/app", "tag": "retour"},
        "victoire": {"titre": "Ta victoire de la semaine 🏆", "corps": _maj(f"{p}qu'est-ce qui a avancé cette semaine ? Note-le, même petit."), "url": "/app", "tag": "victoire"},
        "vision": {"titre": "Relis ta vision 🧭", "corps": _maj(f"{p}deux minutes pour te reconnecter à ton pourquoi avant d'attaquer la semaine."), "url": "/app/vision", "tag": "vision"},
        "foi": {"titre": "Un mot pour toi 🙏", "corps": _maj(f"{p}tu n'avances pas seul(e). Respire, remets ta semaine entre de bonnes mains, puis reprends."), "url": "/app", "tag": "foi"},
        "teams": {"titre": "Zayado dans Teams", "corps": _maj(f"{p}retrouve ton cockpit directement dans Microsoft Teams : le guide d'installation tient en 3 minutes."), "url": "/parametres", "tag": "teams"},
    }[type_]


def install_relances(g: dict) -> None:
    api, Base, get_db, app = g["api"], g["Base"], g["get_db"], g.get("app")
    _uid, new_uuid, utcnow, async_session = g["_uid"], g["new_uuid"], g["utcnow"], g["async_session"]
    DEMO_USER_ID = g["DEMO_USER_ID"]
    VisionProfile, VisionCheckin, VisionVictoire = g["VisionProfile"], g["VisionCheckin"], g["VisionVictoire"]

    class Relance(Base):
        __tablename__ = "relances_envoyees"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        type: Mapped[str] = mapped_column(String(20))
        canal: Mapped[str] = mapped_column(String(20))
        jour: Mapped[str] = mapped_column(String(10), index=True)  # date locale AAAA-MM-JJ
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    g["Relance"] = Relance

    async def _telegram_chat(db, uid) -> Optional[str]:
        UC = g["UserConnection"]
        c = (await db.execute(select(UC).where(UC.user_id == uid, UC.provider == "telegram_zayado",
                                                UC.status == "ready", UC.revoked_at.is_(None)))).scalars().first()
        return c.phone_number if c and c.phone_number else None

    async def _remettre(db, uid: str, msg: dict) -> Optional[str]:
        """Push d'abord, Telegram en repli. Retourne le canal utilisé, ou None si rien n'est parti."""
        try:
            r = await g["envoyer_push"](db, uid, msg["titre"], msg["corps"], msg["url"], msg["tag"])
            if r.get("envoye"):
                return "push"
        except Exception as e:  # noqa: BLE001
            log.warning("Relance push échouée (%s)", e)
        try:
            from canaux_ext import _tg_conf
            token = _tg_conf()["token"]
            chat = await _telegram_chat(db, uid) if token else None
            if token and chat:
                await g["_tg_send"](token, chat, f"{msg['titre']}\n{msg['corps']}")
                return "telegram"
        except Exception as e:  # noqa: BLE001
            log.warning("Relance Telegram échouée (%s)", e)
        return None

    async def relancer_utilisateur(db: AsyncSession, profil, maintenant_utc: datetime) -> Optional[dict]:
        uid = profil.user_id
        if uid == DEMO_USER_ID or not profil.notifications:
            return None
        try:
            tz = ZoneInfo(profil.fuseau or "Europe/Paris")
        except Exception:  # noqa: BLE001
            tz = ZoneInfo("Europe/Paris")
        loc = maintenant_utc.astimezone(tz)
        if not (HEURE_MIN <= loc.hour < HEURE_MAX):
            return None
        auj = loc.date().isoformat()
        anciennes = list((await db.execute(select(Relance).where(Relance.user_id == uid))).scalars())
        if any(r.jour == auj for r in anciennes):
            return None
        derniers: dict = {}
        for r in anciennes:
            try:
                d = date.fromisoformat(r.jour)
            except ValueError:
                continue
            if r.type not in derniers or d > derniers[r.type]:
                derniers[r.type] = d
        lundi = (loc.date() - timedelta(days=loc.weekday())).isoformat()
        checkin_fait = (await db.execute(select(VisionCheckin.id).where(
            VisionCheckin.user_id == uid, VisionCheckin.date == auj).limit(1))).first() is not None
        victoire_sem = (await db.execute(select(VisionVictoire.id).where(
            VisionVictoire.user_id == uid, VisionVictoire.date >= lundi).limit(1))).first() is not None
        dernier_checkin = (await db.execute(select(VisionCheckin.date).where(
            VisionCheckin.user_id == uid).order_by(VisionCheckin.date.desc()).limit(1))).scalar()
        cree = profil.created_at
        if cree is not None and cree.tzinfo is None:
            cree = cree.replace(tzinfo=timezone.utc)
        age = (maintenant_utc - cree).days if cree else 0
        try:
            inactif = (loc.date() - date.fromisoformat(str(dernier_checkin))).days if dernier_checkin else age
        except ValueError:
            inactif = 0
        cm = profil.contexte_metier or {}
        jours_actifs = {j for j in str(cm.get("jours_actifs") or "").split(",") if j.strip() != ""}
        type_ = choisir_relance(
            maintenant=loc, heure_checkin=profil.heure_checkin or "08:30", checkin_fait=checkin_fait,
            victoire_cette_semaine=victoire_sem, vision_vide=not (profil.texte_vision or "").strip(),
            foi=bool(cm.get("parcours_foi")), age_compte_jours=age,
            derniers=derniers, deja_envoye_aujourdhui=False,
            jours_actifs=jours_actifs, inactif_jours=max(inactif, 0))
        if not type_:
            return None
        msg = message_relance(type_, profil.prenom or "")
        # Dans la cloche d'abord (une seule fois par type et par jour) : même sans appareil abonné, la personne
        # qui revient trouve un message qui l'attend, plutôt que « 0 notification ».
        if g.get("notifier"):
            await g["notifier"](db, uid, "relance", msg["titre"], msg["corps"], msg["url"], tag=msg["tag"],
                                cle=f"relance:{type_}:{auj}", push=False)
        canal = await _remettre(db, uid, msg)
        if not canal:
            return None
        db.add(Relance(user_id=uid, type=type_, canal=canal, jour=auj))
        await db.commit()
        return {"user_id": uid, "type": type_, "canal": canal}

    async def executer_relances(maintenant_utc: Optional[datetime] = None) -> list:
        maintenant_utc = maintenant_utc or datetime.now(timezone.utc)
        envoyees = []
        async with async_session() as db:
            profils = list((await db.execute(select(VisionProfile).where(
                VisionProfile.notifications.is_(True), VisionProfile.onboarded.is_(True)))).scalars())
            for p in profils:
                try:
                    r = await relancer_utilisateur(db, p, maintenant_utc)
                    if r:
                        envoyees.append(r)
                except Exception as e:  # noqa: BLE001
                    await db.rollback()
                    log.warning("Relance %s ignorée : %s", p.user_id, e)
        return envoyees

    g["executer_relances"] = executer_relances
    g["relancer_utilisateur"] = relancer_utilisateur

    @api.get("/relances")
    async def historique_relances(db: AsyncSession = Depends(get_db)):
        uid = _uid()
        if uid == DEMO_USER_ID:
            raise HTTPException(401, "Connecte-toi pour voir tes relances.")
        rows = (await db.execute(select(Relance).where(Relance.user_id == uid)
                                 .order_by(Relance.created_at.desc()).limit(30))).scalars()
        return [{"type": r.type, "canal": r.canal, "jour": r.jour} for r in rows]

    @api.post("/relances/executer")
    async def declencher(_r=Depends(g["exiger_role"]("admin"))):
        return {"envoyees": await executer_relances()}

    async def _boucle():
        await asyncio.sleep(45)
        while True:
            try:
                await executer_relances()
            except Exception as e:  # noqa: BLE001
                log.warning("Relances : %s", e)
            await asyncio.sleep(900)

    if app is not None:
        @app.on_event("startup")
        async def _demarrer_relances():
            if os.environ.get("RUN_CRONS", "1").strip().lower() in ("0", "false", "non", "off"):
                return
            asyncio.create_task(_boucle())
