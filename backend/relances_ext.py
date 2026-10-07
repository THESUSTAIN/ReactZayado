"""Moteur de relances : le push existait, mais rien ne le déclenchait.

Types de relance (ordre de priorité) :
  victoire  — le vendredi après 16 h, si aucune victoire n'a été notée cette semaine
  vision    — le lundi après 9 h : relire sa vision (chaque semaine si elle est vide, sinon toutes les 2 semaines)
  foi       — encouragement hebdomadaire, UNIQUEMENT si Ma Foi est activée
  souvenir  — le samedi, « comme Google Photos » : une image que l'utilisateur a créée il y a au moins 7 jours lui est
              rappelée avec un mot d'encouragement (au plus une fois tous les 10 jours)
  completer — mardi ou jeudi, au plus une fois par semaine (6 fois en tout) : UNE seule information manquante à
              compléter (lettre au futur moi, pourquoi, vision, valeurs, motivation de foi). Ces textes nourrissent
              les notifications d'encouragement : tant qu'ils sont vides, les messages restent génériques.
  teams     — une seule fois, à partir de J+2, SEULEMENT si la personne a une équipe : installer l'onglet d'équipe dans Teams
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
TYPES = ("victoire", "vision", "foi", "souvenir", "completer", "teams", "retour", "checkin", "idees", "lettre_prete")
SEUIL_IDEES = 3  # nombre d'idées en attente à partir duquel on propose de les ranger
MAX_COMPLETER = 6  # au-delà, on arrête : relancer sans fin serait de la pollution


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
                    jours_actifs: Optional[set] = None, inactif_jours: int = 0,
                    souvenir_dispo: bool = False, a_completer: bool = False,
                    nb_completer: int = 0, idees_a_ranger: bool = False, equipe: bool = False) -> Optional[str]:
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
    if souvenir_dispo and jour_sem == 5 and maintenant.hour >= 10:
        n = il_y_a("souvenir")
        if n is None or n >= 10:
            return "souvenir"
    # Idées en attente : un seul rappel par semaine, le dimanche en fin de journée (on range avant la semaine qui vient).
    if idees_a_ranger and jour_sem == 6 and maintenant.hour >= 17:
        n = il_y_a("idees")
        if n is None or n >= 6:
            return "idees"
    if a_completer and nb_completer < MAX_COMPLETER and age_compte_jours >= 3 and jour_sem in (1, 3) and maintenant.hour >= 11:
        n = il_y_a("completer")
        if n is None or n >= 7:
            return "completer"
    # Teams = l'équipe (présence, absences, planning), pas le cockpit personnel : inutile sans équipe.
    if equipe and age_compte_jours >= 2 and "teams" not in derniers and jour_sem in (1, 2, 3) and maintenant.hour >= 10:
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


def _jours_fr(n: int) -> str:
    if n < 14:
        return f"{n} jours"
    if n < 60:
        return f"{n // 7} semaines"
    return f"{max(2, n // 30)} mois"


def message_souvenir(prenom: str = "", sujet: str = "", jours: int = 7) -> dict:
    """Notification « souvenir » : on reprend les mots de l'utilisateur (le sujet de son image), on n'invente rien."""
    p = f"{prenom.strip().split()[0]}, " if (prenom or "").strip() else ""
    sujet = " ".join((sujet or "").split())
    if len(sujet) > 70:
        sujet = sujet[:67].rstrip() + "…"
    if sujet:
        corps = f"{p}il y a {_jours_fr(jours)}, tu imaginais « {sujet} ». N'oublie pas : tu as déjà commencé, continue."
    else:
        corps = f"{p}il y a {_jours_fr(jours)}, tu as créé une image de ta vision. N'oublie pas : tu as déjà commencé, continue."
    return {"titre": "Il y a quelque temps, tu rêvais de ça 🌅", "corps": _maj(corps), "url": "/app/vision", "tag": "souvenir"}


def _extrait(texte: str, n: int = 110) -> str:
    t = " ".join((texte or "").split())
    return t if len(t) <= n else t[: n - 1].rstrip() + "…"


def prochain_a_completer(*, pourquoi: str = "", vision: str = "", valeurs=None, foi: bool = False,
                         foi_motivation: str = "", a_lettre: bool = False) -> Optional[dict]:
    """La PREMIÈRE information qui manque (jamais une liste : une seule demande à la fois). None = rien à demander."""
    if not a_lettre:
        return {"cle": "lettre", "titre": "Une lettre pour ton futur toi ✉️",
                "corps": "Écris-lui quelques lignes : elle restera scellée jusqu'à la date que tu choisis, puis elle te sera remise.",
                "url": "/app/bien-etre?tab=carnet"}
    if not (pourquoi or "").strip():
        return {"cle": "pourquoi", "titre": "C'est quoi ton pourquoi ? 🧭",
                "corps": "Une phrase suffit. C'est elle que je te rappellerai les jours où ça devient difficile.",
                "url": "/parametres#copilote"}
    if not (vision or "").strip():
        return {"cle": "vision", "titre": "Ta vision tient en une phrase ✨",
                "corps": "Où veux-tu être dans un an ? Note-le : je te le redirai au bon moment.",
                "url": "/app/vision"}
    if not valeurs:
        return {"cle": "valeurs", "titre": "Tes valeurs, ta boussole 🌿",
                "corps": "Choisis-en quelques-unes : elles m'aident à te parler juste.",
                "url": "/parametres#copilote"}
    if foi and not (foi_motivation or "").strip():
        return {"cle": "foi_motivation", "titre": "Ta foi et ton activité 🙏",
                "corps": "Qu'est-ce qui te motive à les relier ? Tes mots serviront à t'encourager.",
                "url": "/parametres#copilote"}
    return None


def message_completer(item: dict, prenom: str = "") -> dict:
    p = f"{prenom.strip().split()[0]}, " if (prenom or "").strip() else ""
    return {"titre": item["titre"], "corps": _maj(f"{p}{item['corps']}"), "url": item["url"], "tag": "completer"}


def message_idees(prenom: str = "", nb: int = 0) -> dict:
    """Rappel de tri des idées : on compte les idées réellement en attente, on n'invente rien."""
    p = f"{prenom.strip().split()[0]}, " if (prenom or "").strip() else ""
    corps = f"{p}{nb} idées attendent une décision. Garde les meilleures, fais-en une action, laisse le reste."
    return {"titre": "Tes idées attendent d'être rangées 💡", "corps": _maj(corps), "url": "/app/actions?tab=idees", "tag": "idees"}


def message_lettre_prete(prenom: str = "") -> dict:
    """Le jour où la lettre scellée s'ouvre : on ne révèle pas son contenu dans la notification."""
    p = f"{prenom.strip().split()[0]}, " if (prenom or "").strip() else ""
    return {"titre": "Ta lettre du futur est arrivée ✉️", "corps": _maj(f"{p}tu l'avais écrite pour ce jour-là. Prends deux minutes pour la lire."),
            "url": "/app/bien-etre?tab=carnet", "tag": "lettre"}


def message_foi(prenom: str = "", motivation: str = "") -> dict:
    """Encouragement de foi. Avec la motivation écrite par la personne, on lui rend SES mots (rien n'est inventé)."""
    p = f"{prenom.strip().split()[0]}, " if (prenom or "").strip() else ""
    m = _extrait(motivation)
    if m:
        return {"titre": "Tu m'avais dit pourquoi 🙏", "corps": _maj(f"{p}« {m} ». Voilà ce qui te porte : reprends ta semaine avec ça."),
                "url": "/app", "tag": "foi"}
    return {"titre": "Un mot pour toi 🙏", "corps": _maj(f"{p}tu n'avances pas seul(e). Respire, remets ta semaine entre de bonnes mains, puis reprends."),
            "url": "/app", "tag": "foi"}


def message_souvenir_texte(prenom: str = "", citation: str = "", origine: str = "pourquoi") -> dict:
    """« Souvenir » sans image : les propres mots de la personne, comme une mémoire Google Photos en texte."""
    p = f"{prenom.strip().split()[0]}, " if (prenom or "").strip() else ""
    quand = {"pourquoi": "Tu écrivais ton pourquoi", "vision": "Tu décrivais ta vision", "foi": "Tu écrivais ce qui te motive",
             "victoire": "Tu notais une victoire"}.get(origine, "Tu écrivais")
    return {"titre": "Un souvenir de toi 🌅", "corps": _maj(f"{p}{quand.lower()} : « {_extrait(citation)} ». Continue."),
            "url": "/app/vision", "tag": "souvenir"}


def message_relance(type_: str, prenom: str = "") -> dict:
    p = f"{prenom.strip().split()[0]}, " if (prenom or "").strip() else ""
    if type_ == "souvenir":
        return message_souvenir(prenom)
    if type_ == "foi":
        return message_foi(prenom)
    return {
        "checkin": {"titre": "Ton point du jour est prêt ☀️", "corps": _maj(f"{p}30 secondes pour noter ton énergie : je cale tes priorités et tes opportunités du jour dessus."), "url": "/app", "tag": "checkin"},
        "retour": {"titre": "Ton cockpit t'attend 🌿", "corps": _maj(f"{p}pas de pression : une minute suffit pour reprendre, ton plan est là où tu l'as laissé."), "url": "/app", "tag": "retour"},
        "victoire": {"titre": "Ta victoire de la semaine 🏆", "corps": _maj(f"{p}qu'est-ce qui a avancé cette semaine ? Note-le, même petit."), "url": "/app", "tag": "victoire"},
        "vision": {"titre": "Relis ta vision 🧭", "corps": _maj(f"{p}deux minutes pour te reconnecter à ton pourquoi avant d'attaquer la semaine."), "url": "/app/vision", "tag": "vision"},
        "foi": {"titre": "Un mot pour toi 🙏", "corps": _maj(f"{p}tu n'avances pas seul(e). Respire, remets ta semaine entre de bonnes mains, puis reprends."), "url": "/app", "tag": "foi"},
        "teams": {"titre": "Zayado dans Teams", "corps": _maj(f"{p}retrouve la présence, les absences et le planning de ton équipe directement dans Microsoft Teams : l'installation tient en 3 minutes."), "url": "/parametres", "tag": "teams"},
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

    async def _souvenir_image(db, uid: str, maintenant_utc: datetime) -> Optional[dict]:
        """Une image créée par l'utilisateur il y a 7 à 180 jours (la plus récente de cette fenêtre). Lecture SQL légère :
        on ne charge jamais le contenu binaire des images. Aucune image = pas de souvenir (rien n'est inventé)."""
        from sqlalchemy import text
        try:
            lignes = (await db.execute(text(
                "SELECT prompt, created_at FROM vision_images WHERE user_id = :u AND created_at < :a AND created_at > :b "
                "ORDER BY created_at DESC LIMIT 1"),
                {"u": uid, "a": maintenant_utc - timedelta(days=7), "b": maintenant_utc - timedelta(days=180)})).all()
        except Exception:  # noqa: BLE001  (table absente, base différente…)
            await db.rollback()
            return None
        if not lignes:
            return None
        prompt, cree = lignes[0]
        if isinstance(cree, str):
            try:
                cree = datetime.fromisoformat(cree)
            except ValueError:
                return None
        if cree.tzinfo is None:
            cree = cree.replace(tzinfo=timezone.utc)
        return {"prompt": str(prompt or ""), "jours": max(7, (maintenant_utc - cree).days)}

    async def _a_une_lettre(db, uid: str) -> bool:
        """True si la personne a déjà écrit une lettre au futur moi. Si le module est absent, on ne réclame rien."""
        ML = g.get("MindsetLettre")
        if ML is None:
            return True
        try:
            return (await db.execute(select(ML.id).where(ML.user_id == uid).limit(1))).first() is not None
        except Exception:  # noqa: BLE001
            await db.rollback()
            return True

    async def _a_une_equipe(db, uid: str) -> bool:
        """True si la personne fait partie d'une équipe « Ton entreprise » (propriétaire ou membre)."""
        EM = g.get("EntMembre")
        if EM is None:
            return False
        try:
            return (await db.execute(select(EM.id).where(EM.user_id == uid, EM.statut == "actif").limit(1))).first() is not None
        except Exception:  # noqa: BLE001
            await db.rollback()
            return False

    async def _lettre_prete(db, uid: str, auj: str) -> Optional[dict]:
        """Lettre scellée dont la date d'ouverture est arrivée et qui n'a pas encore été lue."""
        ML = g.get("MindsetLettre")
        if ML is None:
            return None
        try:
            l = (await db.execute(select(ML).where(ML.user_id == uid, ML.ouvre_le <= auj, ML.lue_le.is_(None))
                                  .order_by(ML.ouvre_le).limit(1))).scalars().first()
        except Exception:  # noqa: BLE001
            await db.rollback()
            return None
        return {"id": l.id, "ouvre_le": l.ouvre_le} if l else None

    async def _idees_en_attente(db, uid: str) -> int:
        """Idées « à explorer / à tester » non décidées depuis plus de 7 jours."""
        I = g.get("Idee")
        if I is None:
            return 0
        try:
            limite = datetime.now(timezone.utc) - timedelta(days=7)
            rows = (await db.execute(select(I.created_at, I.updated_at).where(I.user_id == uid, I.statut != "realisee"))).all()
        except Exception:  # noqa: BLE001
            await db.rollback()
            return 0
        def _vieux(d):
            if d is None:
                return False
            return (d if d.tzinfo else d.replace(tzinfo=timezone.utc)) <= limite
        return sum(1 for c, u in rows if _vieux(u or c))

    async def _souvenir_texte(db, profil, cm: dict, loc_date: date) -> Optional[dict]:
        """Souvenir SANS image : une phrase que la personne a elle-même écrite (foi, pourquoi, vision, victoire passée).
        On tourne d'une semaine à l'autre pour ne pas répéter la même. Rien n'est inventé."""
        pool = []
        if cm.get("parcours_foi") and (cm.get("foi_motivation") or "").strip():
            pool.append(("foi", cm["foi_motivation"]))
        if (profil.pourquoi or "").strip():
            pool.append(("pourquoi", profil.pourquoi))
        if (profil.texte_vision or "").strip():
            pool.append(("vision", profil.texte_vision))
        try:
            v = (await db.execute(select(VisionVictoire.texte).where(
                VisionVictoire.user_id == profil.user_id,
                VisionVictoire.date < (loc_date - timedelta(days=7)).isoformat())
                .order_by(VisionVictoire.date.desc()).limit(1))).scalar()
            if v:
                pool.append(("victoire", v))
        except Exception:  # noqa: BLE001
            await db.rollback()
        if not pool:
            return None
        origine, citation = pool[loc_date.isocalendar()[1] % len(pool)]
        return {"origine": origine, "citation": citation}

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
        # Lettre au futur toi arrivée à sa date : annoncée UNE fois (cloche + push + Telegram), même si une autre
        # relance est déjà partie aujourd'hui. Sans appareil abonné, elle reste dans la cloche.
        lettre = await _lettre_prete(db, uid, auj)
        if lettre and not any(r.type == "lettre_prete" and r.jour >= lettre["ouvre_le"] for r in anciennes):
            msg = message_lettre_prete(profil.prenom or "")
            if g.get("notifier"):
                await g["notifier"](db, uid, "relance", msg["titre"], msg["corps"], msg["url"], tag=msg["tag"],
                                    cle=f"lettre:{lettre['id']}", push=False)
            canal = await _remettre(db, uid, msg) or "cloche"
            db.add(Relance(user_id=uid, type="lettre_prete", canal=canal, jour=auj))
            await db.commit()
            return {"user_id": uid, "type": "lettre_prete", "canal": canal}
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
        souvenir = await _souvenir_image(db, uid, maintenant_utc)
        souvenir_txt = None if souvenir else await _souvenir_texte(db, profil, cm, loc.date())
        a_completer = prochain_a_completer(
            pourquoi=profil.pourquoi or "", vision=profil.texte_vision or "", valeurs=profil.valeurs or [],
            foi=bool(cm.get("parcours_foi")), foi_motivation=cm.get("foi_motivation") or "",
            a_lettre=await _a_une_lettre(db, uid))
        nb_idees = await _idees_en_attente(db, uid)
        jours_actifs = {j for j in str(cm.get("jours_actifs") or "").split(",") if j.strip() != ""}
        type_ = choisir_relance(
            maintenant=loc, heure_checkin=profil.heure_checkin or "08:30", checkin_fait=checkin_fait,
            victoire_cette_semaine=victoire_sem, vision_vide=not (profil.texte_vision or "").strip(),
            foi=bool(cm.get("parcours_foi")), age_compte_jours=age,
            derniers=derniers, deja_envoye_aujourdhui=False,
            jours_actifs=jours_actifs, inactif_jours=max(inactif, 0),
            souvenir_dispo=souvenir is not None or souvenir_txt is not None,
            a_completer=a_completer is not None,
            nb_completer=sum(1 for r in anciennes if r.type == "completer"),
            idees_a_ranger=(nb_idees >= SEUIL_IDEES),
            equipe=await _a_une_equipe(db, uid))
        if not type_:
            return None
        if type_ == "souvenir" and souvenir:
            msg = message_souvenir(profil.prenom or "", souvenir["prompt"], souvenir["jours"])
        elif type_ == "souvenir" and souvenir_txt:
            msg = message_souvenir_texte(profil.prenom or "", souvenir_txt["citation"], souvenir_txt["origine"])
        elif type_ == "idees":
            msg = message_idees(profil.prenom or "", nb_idees)
        elif type_ == "foi":
            msg = message_foi(profil.prenom or "", cm.get("foi_motivation") or "")
        elif type_ == "completer" and a_completer:
            msg = message_completer(a_completer, profil.prenom or "")
        else:
            msg = message_relance(type_, profil.prenom or "")
        # Dans la cloche d'abord (une seule fois par type et par jour) : même sans appareil abonné, la personne
        # qui revient trouve un message qui l'attend, plutôt que « 0 notification ».
        if g.get("notifier"):
            await g["notifier"](db, uid, "relance", msg["titre"], msg["corps"], msg["url"], tag=msg["tag"],
                                cle=f"relance:{type_}:{auj}", push=False)
        # Calme : pas de relance PUSH si l'actu du jour vient déjà de sonner, ni plus de 3 relances push sur 7 jours.
        # Dans ces cas elle reste dans la cloche (déjà rangée plus haut), sans faire vibrer le téléphone.
        depuis = (loc.date() - timedelta(days=6)).isoformat()
        recentes = sum(1 for r in anciennes if r.jour >= depuis and r.canal in ("push", "telegram"))
        AE = g.get("ActuEnvoi")
        actu_sonnee = False
        if AE is not None:
            actu_sonnee = (await db.execute(select(AE.id).where(
                AE.user_id == uid, AE.jour == auj, AE.canal == "push", AE.ok.is_(True)).limit(1))).first() is not None
        # La foi et les souvenirs sont le cœur de l'encouragement (« ne pas abandonner ») : ils ne sont pas étouffés
        # par l'actu du jour, et gardent une marge de plus sur le plafond de 7 jours.
        encouragement = type_ in ("foi", "souvenir")
        # On distingue deux « cloche » qui étaient confondues, et c'est ce qui pénalisait l'utilisateur :
        #  • cloche CHOISIE (règle de calme ci-dessus) : on a volontairement renoncé à faire vibrer le
        #    téléphone, la relance est bien traitée, on la compte pour ne pas réessayer.
        #  • cloche par DÉFAUT d'acheminement (aucun appareil abonné, pas de Telegram) : rien n'a été remis
        #    à la personne. L'ancien code la comptait quand même comme « envoyée » : l'historique affirmait
        #    « message envoyé » alors que rien n'était parti, et le quota d'un message par jour était
        #    consommé — si la personne activait ses notifications une heure plus tard, elle ne recevait
        #    plus rien de la journée. On ne compte donc rien dans ce cas : le message reste dans la cloche
        #    (rangé plus haut, sans doublon possible grâce à sa clé du jour) et sera réellement remis dès
        #    qu'un canal existe.
        calme = (actu_sonnee and not encouragement) or recentes >= (4 if encouragement else 3)
        canal = "cloche" if calme else await _remettre(db, uid, msg)
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
