"""« Ton entreprise by Zayado » : l'équipe dans l'app principale, en SQL (ex-Zayado RH, qui utilisait Mongo / SharePoint).

Cœur autonome, sans prérequis : on invite par e-mail ou par lien, les données vivent dans la base Zayado.
Microsoft 365 / Google / Teams restent des options ; le mode SharePoint de l'app RH séparée est conservé pour l'offre Entreprise.

Rôles (par entreprise) :
  proprietaire  tout, y compris contrats, paramètres, journal des accès, suppression RGPD
  manager       équipe, planning, décisions sur les absences, temps et pièces de l'équipe (PAS les contrats ni les N° de sécu)
  membre        sa présence, ses absences, son temps, ses pièces, SON contrat ; planning et présence de l'équipe
  prestataire   comme membre (prestataires et freelances inclus, pas seulement les « salariés »)
  partenaire    lecture seule : présence et planning, rien d'autre

Données sensibles : le N° de sécu est optionnel, DÉSACTIVÉ par défaut (réglage propriétaire), chiffré (Fernet) et jamais
stocké en clair ; chaque lecture de contrat ou de N° de sécu par un autre que son titulaire est écrite dans le journal.
RGPD : export d'une fiche, suppression d'un membre (fiche + toutes ses données), départ volontaire.

L'organisation est celle déjà créée dans l'app (table `organisations`, Espace Pro) : pas de doublon.
"""
import logging
import os
import secrets
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, Text, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

log = logging.getLogger("kairos.entreprise")

ROLES = ("proprietaire", "manager", "membre", "prestataire", "partenaire")
GERANTS = ("proprietaire", "manager")
STATUTS_PRESENCE = ("bureau", "teletravail", "deplacement", "absent")
TYPES_ABSENCE = ("conges", "maladie", "recuperation", "ecole", "sans_solde", "autre")  # conges = congés payés (CP)
VALIDITE_INVITATION_JOURS = 14
MAX_JOURS_ABSENCE = 62


# ── Fonctions pures (testées sans base) ───────────────────────────────────────────────────────────────────────────
def peut(role: str, action: str) -> bool:
    """Matrice des droits. `action` : lire_equipe, gerer_equipe, saisir_soi, decider_absence, lire_temps_equipe,
    lire_contrats, gerer_contrats, parametres, audit, supprimer_membre."""
    table = {
        "lire_equipe": ROLES,  # présence + planning : tous, partenaires compris
        "saisir_soi": ("proprietaire", "manager", "membre", "prestataire"),
        "gerer_equipe": GERANTS,
        "decider_absence": GERANTS,
        "lire_temps_equipe": GERANTS,
        "gerer_contrats": ("proprietaire",),
        "lire_contrats": ("proprietaire",),
        "parametres": ("proprietaire",),
        "audit": ("proprietaire",),
        "supprimer_membre": ("proprietaire",),
    }
    return role in table.get(action, ())


def roles_invitables(role_acteur: str) -> tuple:
    """Un propriétaire invite tout sauf un autre propriétaire ; un manager n'invite que des profils sans pouvoir."""
    if role_acteur == "proprietaire":
        return ("manager", "membre", "prestataire", "partenaire")
    if role_acteur == "manager":
        return ("membre", "prestataire", "partenaire")
    return ()


def jours_entre(debut: str, fin: str) -> list:
    """Liste des jours (AAAA-MM-JJ) de debut à fin inclus, hors week-ends, plafonnée."""
    d, f = date.fromisoformat(debut), date.fromisoformat(fin)
    if f < d:
        raise ValueError("La fin précède le début.")
    if (f - d).days >= MAX_JOURS_ABSENCE:
        raise ValueError(f"Une absence ne peut pas dépasser {MAX_JOURS_ABSENCE} jours d'un coup.")
    out, j = [], d
    while j <= f:
        if j.weekday() < 5:
            out.append(j.isoformat())
        j += timedelta(days=1)
    return out


def masquer_secu(n: str) -> str:
    n = "".join(c for c in (n or "") if c.isdigit())
    return f"{n[:1]} •• •• •• ••• ••• {n[-2:]}" if len(n) >= 13 else ""


def secu_valide(n: str) -> bool:
    """13 chiffres + clé de contrôle (97 - n mod 97). Corse (2A/2B) non gérée volontairement : refus clair plutôt que faux positif."""
    n = "".join(c for c in (n or "") if c.isdigit())
    if len(n) != 15:
        return False
    return 97 - (int(n[:13]) % 97) == int(n[13:])


def _jour_ok(v: str) -> str:
    try:
        return date.fromisoformat(v).isoformat()
    except Exception:  # noqa: BLE001
        raise HTTPException(422, "Date invalide (AAAA-MM-JJ attendu).")


# ── Schémas d'entrée ──────────────────────────────────────────────────────────────────────────────────────────────
class ActiverIn(BaseModel):
    nom: str = Field(min_length=2, max_length=255)


class InviterIn(BaseModel):
    email: Optional[str] = Field(default=None, max_length=255)  # vide = lien à partager
    nom: str = Field(default="", max_length=120)
    role: str = "membre"
    poste: str = Field(default="", max_length=120)
    type_contrat: str = Field(default="salarie", max_length=20)  # salarie | prestataire | freelance | stagiaire | autre


class MembrePatch(BaseModel):
    role: Optional[str] = None
    poste: Optional[str] = Field(default=None, max_length=120)
    nom: Optional[str] = Field(default=None, max_length=120)
    type_contrat: Optional[str] = Field(default=None, max_length=20)


class PresenceIn(BaseModel):
    jour: str
    statut: str
    note: str = Field(default="", max_length=200)
    membre_id: Optional[str] = None


class AbsenceIn(BaseModel):
    type: str = "conges"
    debut: str
    fin: str
    motif: str = Field(default="", max_length=300)
    membre_id: Optional[str] = None


class DecisionIn(BaseModel):
    statut: str  # acceptee | refusee
    commentaire: str = Field(default="", max_length=300)


class PlanningIn(BaseModel):
    membre_id: Optional[str] = None  # vide = toute l'équipe (gérant) ; un membre ne planifie que pour lui
    titre: str = Field(min_length=1, max_length=160)
    debut: str
    fin: Optional[str] = None
    creneau: str = Field(default="journee", max_length=12)  # matin | apres_midi | journee
    note: str = Field(default="", max_length=400)


class TempsIn(BaseModel):
    jour: str
    heures: float = Field(gt=0, le=24)
    projet: str = Field(default="", max_length=120)
    note: str = Field(default="", max_length=300)
    membre_id: Optional[str] = None


class PieceIn(BaseModel):
    membre_id: Optional[str] = None
    titre: str = Field(min_length=1, max_length=160)
    statut: str = "a_fournir"  # a_fournir | fournie | validee | refusee
    reference: str = Field(default="", max_length=500)  # lien ou référence : Zayado ne stocke pas de fichier ici


class PiecePatch(BaseModel):
    statut: Optional[str] = None
    reference: Optional[str] = Field(default=None, max_length=500)
    commentaire: Optional[str] = Field(default=None, max_length=300)  # motif d'un refus, remarque du gérant


class ContratIn(BaseModel):
    membre_id: str
    titre: str = Field(min_length=1, max_length=160)
    type: str = Field(default="", max_length=40)
    debut: Optional[str] = None
    fin: Optional[str] = None
    detail: str = Field(default="", max_length=4000)


class ParametresIn(BaseModel):
    secu_actif: Optional[bool] = None
    cp_par_mois: Optional[float] = Field(default=None, ge=0, le=5)
    partage_radar: Optional[bool] = None
    nom_affiche: Optional[str] = Field(default=None, max_length=120)
    logo: Optional[str] = Field(default=None, max_length=400_000)  # data:image/... (réduit côté navigateur) ou https://
    couleur: Optional[str] = Field(default=None, max_length=9)
    drive_fournisseur: Optional[str] = Field(default=None, max_length=12)  # microsoft | google | aucun
    drive_url: Optional[str] = Field(default=None, max_length=1000)
    consignes: Optional[str] = Field(default=None, max_length=3000)


class RemunerationIn(BaseModel):
    """Réglé par le propriétaire seulement. Sert au décompte du mois (relevé préparatoire, pas un bulletin de paie)."""
    mode: str = Field(default="aucun", max_length=14)  # aucun | horaire | forfait_jour
    taux: float = Field(default=0, ge=0, le=100_000)
    heures_jour: float = Field(default=7, ge=0, le=24)
    cp_initial: float = Field(default=0, ge=-60, le=200)  # solde de CP au départ du compteur
    cp_depuis: Optional[str] = None                      # date de départ du compteur (AAAA-MM-JJ) ; vide = pas de suivi CP
    ecole_jours: list = Field(default_factory=list)     # jours d'école chaque semaine : 0 = lundi … 4 = vendredi
    ecole_payee: bool = False                            # alternance : le temps école est payé ; stage : en général non


class VersementIn(BaseModel):
    membre_id: str
    mois: str = Field(pattern=r"^\d{4}-\d{2}$")
    montant: float = Field(ge=0, le=1_000_000)


class FicheIn(BaseModel):
    # Saisis par la personne elle-même
    adresse: Optional[str] = Field(default=None, max_length=255)
    code_postal: Optional[str] = Field(default=None, max_length=12)
    ville: Optional[str] = Field(default=None, max_length=120)
    tel_perso: Optional[str] = Field(default=None, max_length=30)
    email_perso: Optional[str] = Field(default=None, max_length=255)
    urgence_nom: Optional[str] = Field(default=None, max_length=120)
    urgence_tel: Optional[str] = Field(default=None, max_length=30)
    partage_tel: Optional[bool] = None
    partage_email: Optional[bool] = None
    # Décidés par l'entreprise (gérants)
    tel_pro: Optional[str] = Field(default=None, max_length=30)
    email_pro: Optional[str] = Field(default=None, max_length=255)
    lien_drive: Optional[str] = Field(default=None, max_length=1000)


class TypePieceIn(BaseModel):
    titre: str = Field(min_length=1, max_length=160)
    consigne: str = Field(default="", max_length=400)
    par_defaut: bool = True


class DemanderIn(BaseModel):
    membre_ids: Optional[list] = None  # vide = toute l'équipe (hors partenaires)


class CommentaireIn(BaseModel):
    cible_type: str  # planning | piece
    cible_id: str = Field(min_length=1, max_length=36)
    texte: str = Field(min_length=1, max_length=600)


from collections import namedtuple

_PieceLibre = namedtuple("_PieceLibre", "titre consigne id")  # pièce demandée hors liste (import Excel)

CRENEAUX = ("matin", "apres_midi", "journee")
FOURNISSEURS = ("microsoft", "google", "aucun")


def lien_https(v: str) -> str:
    """Un lien de dossier ou de fichier : https uniquement (jamais javascript:, data:, http en clair)."""
    v = (v or "").strip()
    if v and not v.lower().startswith("https://"):
        raise HTTPException(422, "Le lien doit commencer par https://")
    return v


def logo_ok(v: str) -> str:
    v = (v or "").strip()
    if not v:
        return ""
    if v.startswith("https://"):
        return v
    if v.startswith(("data:image/png;base64,", "data:image/jpeg;base64,", "data:image/webp;base64,")):
        return v
    raise HTTPException(422, "Logo : image PNG, JPEG ou WebP, ou lien https.")


class SecuIn(BaseModel):
    numero: str = Field(min_length=13, max_length=24)


class RejoindreIn(BaseModel):
    token: str = Field(min_length=10, max_length=80)


def install_entreprise(g: dict) -> None:
    api, Base, get_db = g["api"], g["Base"], g["get_db"]
    _uid, new_uuid, utcnow, DEMO_USER_ID = g["_uid"], g["new_uuid"], g["utcnow"], g["DEMO_USER_ID"]
    User, Organisation = g["User"], g["Organisation"]

    class EntMembre(Base):
        __tablename__ = "ent_membres"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        org_id: Mapped[str] = mapped_column(String(36), index=True)
        user_id: Mapped[Optional[str]] = mapped_column(String(36), index=True, nullable=True)
        email: Mapped[Optional[str]] = mapped_column(String(255), index=True, nullable=True)
        nom: Mapped[str] = mapped_column(String(120), default="")
        role: Mapped[str] = mapped_column(String(20), default="membre")
        statut: Mapped[str] = mapped_column(String(10), default="invite")  # invite | actif
        poste: Mapped[str] = mapped_column(String(120), default="")
        type_contrat: Mapped[str] = mapped_column(String(20), default="salarie")
        token: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
        token_expire: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
        secu_chiffre: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    class EntReglage(Base):
        __tablename__ = "ent_reglages"
        org_id: Mapped[str] = mapped_column(String(36), primary_key=True)
        secu_actif: Mapped[bool] = mapped_column(Boolean, default=False)
        # Marque du client : « Ton entreprise » est SA coquille, Zayado signe discrètement (« by Zayado »)
        nom_affiche: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
        logo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
        couleur: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)
        # Drive de l'entreprise : les fichiers restent chez le client, Zayado ne garde que les liens et les statuts
        drive_fournisseur: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
        drive_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
        consignes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
        cp_par_mois: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # jours ouvrés acquis par mois (2,08 par défaut)
        partage_radar: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)  # le Radar du dirigeant visible de l'équipe
        installation: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # identifiants des dossiers créés (installation relançable)

    class EntPresence(Base):
        __tablename__ = "ent_presence"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        org_id: Mapped[str] = mapped_column(String(36), index=True)
        membre_id: Mapped[str] = mapped_column(String(36), index=True)
        jour: Mapped[str] = mapped_column(String(10), index=True)
        statut: Mapped[str] = mapped_column(String(14))
        note: Mapped[str] = mapped_column(String(200), default="")

    class EntAbsence(Base):
        __tablename__ = "ent_absences"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        org_id: Mapped[str] = mapped_column(String(36), index=True)
        membre_id: Mapped[str] = mapped_column(String(36), index=True)
        type: Mapped[str] = mapped_column(String(14), default="conges")
        debut: Mapped[str] = mapped_column(String(10))
        fin: Mapped[str] = mapped_column(String(10))
        motif: Mapped[str] = mapped_column(String(300), default="")
        statut: Mapped[str] = mapped_column(String(10), default="demandee")  # demandee | acceptee | refusee
        decide_par: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
        commentaire: Mapped[str] = mapped_column(String(300), default="")
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    class EntPlanning(Base):
        __tablename__ = "ent_planning"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        org_id: Mapped[str] = mapped_column(String(36), index=True)
        membre_id: Mapped[Optional[str]] = mapped_column(String(36), index=True, nullable=True)
        titre: Mapped[str] = mapped_column(String(160))
        debut: Mapped[str] = mapped_column(String(10), index=True)
        fin: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
        note: Mapped[str] = mapped_column(String(400), default="")
        creneau: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
        auteur_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
        statut: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # propose (par le membre) | vu | NULL = posé par un gérant

    class EntTemps(Base):
        __tablename__ = "ent_temps"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        org_id: Mapped[str] = mapped_column(String(36), index=True)
        membre_id: Mapped[str] = mapped_column(String(36), index=True)
        jour: Mapped[str] = mapped_column(String(10), index=True)
        heures: Mapped[float] = mapped_column(Float)
        projet: Mapped[str] = mapped_column(String(120), default="")
        note: Mapped[str] = mapped_column(String(300), default="")
        dossier: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
        ticket: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
        referent: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
        libelle: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    class EntPiece(Base):
        __tablename__ = "ent_pieces"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        org_id: Mapped[str] = mapped_column(String(36), index=True)
        membre_id: Mapped[str] = mapped_column(String(36), index=True)
        titre: Mapped[str] = mapped_column(String(160))
        statut: Mapped[str] = mapped_column(String(10), default="a_fournir")
        reference: Mapped[str] = mapped_column(String(500), default="")
        consigne: Mapped[Optional[str]] = mapped_column(String(400), nullable=True)
        commentaire: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
        type_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    class EntContrat(Base):
        __tablename__ = "ent_contrats"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        org_id: Mapped[str] = mapped_column(String(36), index=True)
        membre_id: Mapped[str] = mapped_column(String(36), index=True)
        titre: Mapped[str] = mapped_column(String(160))
        type: Mapped[str] = mapped_column(String(40), default="")
        debut: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
        fin: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
        detail: Mapped[str] = mapped_column(Text, default="")

    class EntJournal(Base):
        __tablename__ = "ent_journal"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        org_id: Mapped[str] = mapped_column(String(36), index=True)
        acteur_id: Mapped[str] = mapped_column(String(36))
        action: Mapped[str] = mapped_column(String(40))
        cible_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    class EntFiche(Base):
        """Coordonnées d'une personne : adresse, téléphone… (privé : la personne + les gérants ; partage choisi par elle)."""
        __tablename__ = "ent_fiches"
        membre_id: Mapped[str] = mapped_column(String(36), primary_key=True)
        org_id: Mapped[str] = mapped_column(String(36), index=True)
        adresse: Mapped[str] = mapped_column(String(255), default="")
        code_postal: Mapped[str] = mapped_column(String(12), default="")
        ville: Mapped[str] = mapped_column(String(120), default="")
        tel_perso: Mapped[str] = mapped_column(String(30), default="")
        email_perso: Mapped[str] = mapped_column(String(255), default="")
        urgence_nom: Mapped[str] = mapped_column(String(120), default="")
        urgence_tel: Mapped[str] = mapped_column(String(30), default="")
        partage_tel: Mapped[bool] = mapped_column(Boolean, default=False)
        partage_email: Mapped[bool] = mapped_column(Boolean, default=False)
        tel_pro: Mapped[str] = mapped_column(String(30), default="")
        email_pro: Mapped[str] = mapped_column(String(255), default="")
        lien_drive: Mapped[str] = mapped_column(String(1000), default="")
        maj_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
        # Compte perso relié (la personne a un compte Zayado perso ET ce compte pro) : notifications au choix
        perso_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
        perso_user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)   # rempli quand le compte perso a confirmé
        perso_jeton: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
        notif_perso: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    class EntTypePiece(Base):
        """Liste des pièces demandées par l'entreprise (= TypesPieces du kit Microsoft)."""
        __tablename__ = "ent_types_pieces"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        org_id: Mapped[str] = mapped_column(String(36), index=True)
        titre: Mapped[str] = mapped_column(String(160))
        consigne: Mapped[str] = mapped_column(String(400), default="")
        par_defaut: Mapped[bool] = mapped_column(Boolean, default=True)
        ordre: Mapped[int] = mapped_column(Integer, default=0)

    class EntRemuneration(Base):
        """Base de calcul du décompte : visible de la personne et du propriétaire (comme le contrat), jamais des managers."""
        __tablename__ = "ent_remunerations"
        membre_id: Mapped[str] = mapped_column(String(36), primary_key=True)
        org_id: Mapped[str] = mapped_column(String(36), index=True)
        mode: Mapped[str] = mapped_column(String(14), default="aucun")
        taux: Mapped[float] = mapped_column(Float, default=0)
        heures_jour: Mapped[float] = mapped_column(Float, default=7)
        cp_initial: Mapped[float] = mapped_column(Float, default=0)
        cp_depuis: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
        ecole_jours: Mapped[str] = mapped_column(String(20), default="")  # « 0,2 » = lundi et mercredi
        ecole_payee: Mapped[bool] = mapped_column(Boolean, default=False)

    class EntVersement(Base):
        """Ce qui a déjà été versé pour un mois (saisi par le propriétaire) : donne le « reste à verser »."""
        __tablename__ = "ent_versements"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        org_id: Mapped[str] = mapped_column(String(36), index=True)
        membre_id: Mapped[str] = mapped_column(String(36), index=True)
        mois: Mapped[str] = mapped_column(String(7), index=True)
        montant: Mapped[float] = mapped_column(Float, default=0)

    class EntCommentaire(Base):
        __tablename__ = "ent_commentaires"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        org_id: Mapped[str] = mapped_column(String(36), index=True)
        cible_type: Mapped[str] = mapped_column(String(10))
        cible_id: Mapped[str] = mapped_column(String(36), index=True)
        auteur_id: Mapped[str] = mapped_column(String(36))
        texte: Mapped[str] = mapped_column(String(600))
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    for nom_g, cls in (("EntRemuneration", EntRemuneration), ("EntVersement", EntVersement), ("EntFiche", EntFiche), ("EntTypePiece", EntTypePiece), ("EntCommentaire", EntCommentaire), ("EntMembre", EntMembre), ("EntPresence", EntPresence), ("EntAbsence", EntAbsence), ("EntPlanning", EntPlanning),
                       ("EntTemps", EntTemps), ("EntPiece", EntPiece), ("EntContrat", EntContrat), ("EntJournal", EntJournal), ("EntReglage", EntReglage)):
        g[nom_g] = cls

    # ── Contexte : qui suis-je, dans quelle entreprise ? ───────────────────────────────────────────────────────────
    def _exiger_compte() -> str:
        uid = _uid()
        if not uid or uid == DEMO_USER_ID:
            raise HTTPException(401, "Connexion requise.")
        return uid

    async def _moi(db, exiger: bool = True) -> Optional[EntMembre]:
        uid = _exiger_compte()
        m = (await db.execute(select(EntMembre).where(EntMembre.user_id == uid, EntMembre.statut == "actif"))).scalars().first()
        if m:
            return m
        org = (await db.execute(select(Organisation).where(Organisation.owner_id == uid))).scalar_one_or_none()
        if org:  # le titulaire de l'organisation apparaît toujours comme propriétaire de son équipe
            u = await db.get(User, uid)
            m = EntMembre(org_id=org.id, user_id=uid, email=(u.email or "").lower() if u else None, nom=(getattr(u, "email", "") or "").split("@")[0],
                          role="proprietaire", statut="actif", poste="Dirigeant", type_contrat="dirigeant")
            db.add(m)
            await db.commit()
            return m
        if exiger:
            raise HTTPException(404, "Aucune entreprise : active « Ton entreprise » ou rejoins une équipe avec ton invitation.")
        return None

    def _exiger(m: EntMembre, action: str) -> None:
        if not peut(m.role, action):
            raise HTTPException(403, "Ton rôle ne permet pas cette action.")

    async def _membre(db, m: EntMembre, membre_id: str) -> EntMembre:
        c = await db.get(EntMembre, membre_id)
        if not c or c.org_id != m.org_id:
            raise HTTPException(404, "Membre introuvable.")
        return c

    async def _journal(db, m: EntMembre, action: str, cible: Optional[str] = None) -> None:
        db.add(EntJournal(org_id=m.org_id, acteur_id=m.id, action=action, cible_id=cible))

    async def _secu_actif(db, org_id: str) -> bool:
        r = await db.get(EntReglage, org_id)
        return bool(r and r.secu_actif)

    def _cible(m: EntMembre, membre_id: Optional[str]) -> str:
        """Soi-même par défaut ; saisir pour un autre est réservé aux gérants."""
        if not membre_id or membre_id == m.id:
            return m.id
        _exiger(m, "gerer_equipe")
        return membre_id

    async def _notifier(db, membre: Optional[EntMembre], titre: str, corps: str, vue: str, cle: Optional[str] = None) -> None:
        """Cloche + push vers UNE personne de l'équipe (si elle a un compte). Ne bloque jamais l'action."""
        f = g.get("notifier")
        if not f or not membre or not membre.user_id:
            return
        try:
            await f(db, membre.user_id, "equipe", titre, corps, f"/app/entreprise?vue={vue}", tag=f"equipe-{vue}", cle=cle)
        except Exception as e:  # noqa: BLE001
            log.warning("Notification équipe non envoyée : %s", e)
        # Si la personne l'a choisi : la même notification arrive aussi sur son compte perso relié
        try:
            fi = await db.get(EntFiche, membre.id)
            if fi and fi.notif_perso and fi.perso_user_id and fi.perso_user_id != membre.user_id:
                await f(db, fi.perso_user_id, "equipe", titre, corps, f"/app/entreprise?vue={vue}", tag=f"equipe-perso-{vue}", cle=cle)
        except Exception as e:  # noqa: BLE001
            log.warning("Notification vers le compte perso non envoyée : %s", e)

    async def _notifier_gerants(db, org_id: str, titre: str, corps: str, vue: str, sauf: Optional[str] = None) -> None:
        rows = (await db.execute(select(EntMembre).where(EntMembre.org_id == org_id, EntMembre.statut == "actif",
                                                         EntMembre.role.in_(GERANTS)))).scalars().all()
        for c in rows:
            if c.id != sauf:
                await _notifier(db, c, titre, corps, vue)

    async def _marque(db, org_id: str) -> dict:
        r = await db.get(EntReglage, org_id)
        org = await db.get(Organisation, org_id)
        return {"nom": (r.nom_affiche if r and r.nom_affiche else None) or (org.nom if org else ""),
                "logo": (r.logo if r else None) or None, "couleur": (r.couleur if r else None) or None,
                "drive_fournisseur": (r.drive_fournisseur if r else None) or "aucun", "drive_url": (r.drive_url if r else None) or "",
                "consignes": (r.consignes if r else None) or "",
                "cp_par_mois": (r.cp_par_mois if r and r.cp_par_mois is not None else 2.08),
                "partage_radar": bool(r and r.partage_radar)}

    g["_marque_entreprise"] = lambda db, org_id: _marque(db, org_id)

    async def _demander_pieces(db, org_id: str, membre_ids: list, types: list) -> int:
        """Crée chaque pièce manquante (même titre déjà présent = ignorée). Renvoie le nombre de pièces créées."""
        n = 0
        for mid in membre_ids:
            deja = {p.titre.strip().lower() for p in (await db.execute(select(EntPiece).where(EntPiece.org_id == org_id,
                                                                                              EntPiece.membre_id == mid))).scalars().all()}
            for t in types:
                if t.titre.strip().lower() in deja:
                    continue
                db.add(EntPiece(org_id=org_id, membre_id=mid, titre=t.titre, statut="a_fournir", reference="", consigne=t.consigne or "", type_id=t.id))
                n += 1
        return n

    def _vue_membre(c: EntMembre, m: EntMembre) -> dict:
        d = {"id": c.id, "nom": c.nom or (c.email or "").split("@")[0], "role": c.role, "poste": c.poste, "statut": c.statut, "type_contrat": c.type_contrat}
        if peut(m.role, "gerer_equipe") or c.id == m.id:  # l'e-mail n'est montré qu'aux gérants et à soi-même
            d["email"] = c.email
            d["a_secu"] = bool(c.secu_chiffre)
        return d

    def _plan_ok(plan: str) -> bool:
        return plan in ("business", "entreprise")

    async def _limite_personnes(db, org_id: str) -> Optional[int]:
        """Équipe : 5 personnes dirigeant compris (EQUIPE_MAX_PERSONNES) ; Entreprise et comptes internes : sans limite.
        Les partenaires (lecture seule, externes) ne comptent pas."""
        org = await db.get(Organisation, org_id)
        if not org:
            return None
        u = await db.get(User, org.owner_id)
        if u and u.role in ("admin", "vendeur"):
            return None
        Ab = g.get("Abonnement")
        a = await db.get(Ab, org.owner_id) if Ab is not None else None
        if a and a.plan == "entreprise":
            return None
        try:
            return max(1, int(os.environ.get("EQUIPE_MAX_PERSONNES", "5")))
        except ValueError:
            return 5

    async def _nb_personnes(db, org_id: str) -> int:
        return (await db.execute(select(func.count()).select_from(EntMembre).where(
            EntMembre.org_id == org_id, EntMembre.role != "partenaire"))).scalar_one()

    async def _verifier_place(db, org_id: str, en_plus: int = 1) -> None:
        lim = await _limite_personnes(db, org_id)
        if lim is not None and await _nb_personnes(db, org_id) + en_plus > lim:
            raise HTTPException(402, f"L'offre Équipe inclut {lim} personnes (toi compris). Au-delà, passe à l'offre Entreprise (sur devis).")

    async def _peut_creer(db, uid: str) -> bool:
        u = await db.get(User, uid)
        if u and u.role in ("admin", "vendeur"):
            return True
        Ab = g.get("Abonnement")
        if Ab is None:
            return False
        a = await db.get(Ab, uid)
        fin = a.fin if a else None
        if fin is not None and fin.tzinfo is None:
            fin = fin.replace(tzinfo=timezone.utc)
        return bool(a and _plan_ok(a.plan) and fin and fin > datetime.now(timezone.utc))

    # ── Entrée : activer, qui suis-je ──────────────────────────────────────────────────────────────────────────────
    async def _est_conseiller(db, uid: str) -> bool:
        """Les conseillers Zayado (admin / vendeur) accompagnent des repreneurs sous
        mandat : l'outil de dossiers leur est réservé, les clients ne voient que le
        leur."""
        u = await db.get(g["User"], uid)
        return bool(u and u.role in ("admin", "vendeur"))

    @api.get("/entreprise/moi")
    async def ent_moi(db: AsyncSession = Depends(get_db)):
        uid = _exiger_compte()
        m = await _moi(db, exiger=False)
        if not m:
            # Le drapeau est servi même sans espace actif : le menu doit savoir
            # quoi afficher avant l'activation, pas après.
            return {"actif": False, "peut_activer": await _peut_creer(db, uid),
                    "conseiller": await _est_conseiller(db, uid)}
        org = await db.get(Organisation, m.org_id)
        return {"actif": True, "org": {"id": m.org_id, "nom": org.nom if org else ""}, "membre_id": m.id, "role": m.role, "nom": m.nom,
                "droits": {k: peut(m.role, k) for k in ("lire_equipe", "saisir_soi", "gerer_equipe", "decider_absence", "lire_temps_equipe",
                                                         "lire_contrats", "gerer_contrats", "parametres", "audit", "supprimer_membre")},
                "secu_actif": await _secu_actif(db, m.org_id), "marque": await _marque(db, m.org_id),
                # Conseiller Zayado : il gère les dossiers de reprise de SES clients
                # sous mandat. L'outil vit dans l'espace entreprise, pas dans un menu
                # personnel — racheter une société n'est pas une affaire perso.
                "conseiller": await _est_conseiller(db, uid),
                "places": {"utilisees": await _nb_personnes(db, m.org_id), "limite": await _limite_personnes(db, m.org_id)}}

    @api.post("/entreprise/activer")
    async def ent_activer(body: ActiverIn, db: AsyncSession = Depends(get_db)):
        uid = _exiger_compte()
        if await _moi(db, exiger=False):
            raise HTTPException(409, "Ton entreprise est déjà activée.")
        if not await _peut_creer(db, uid):
            raise HTTPException(402, "« Ton entreprise » est incluse dans les offres Équipe (jusqu'à 5 personnes) et Entreprise.")
        org = (await db.execute(select(Organisation).where(Organisation.owner_id == uid))).scalar_one_or_none()
        if not org:
            org = Organisation(owner_id=uid, nom=body.nom.strip())
            db.add(org)
            await db.commit()
        m = await _moi(db)
        return {"ok": True, "membre_id": m.id}

    @api.patch("/entreprise/parametres")
    async def ent_parametres(body: ParametresIn, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "parametres")
        r = await db.get(EntReglage, m.org_id) or EntReglage(org_id=m.org_id, secu_actif=False)
        if body.secu_actif is not None:
            r.secu_actif = body.secu_actif
            await _journal(db, m, "secu_active" if body.secu_actif else "secu_desactive")
        if body.cp_par_mois is not None:
            r.cp_par_mois = body.cp_par_mois
        if body.partage_radar is not None:
            r.partage_radar = body.partage_radar
        if body.nom_affiche is not None:
            r.nom_affiche = body.nom_affiche.strip() or None
        if body.logo is not None:
            r.logo = logo_ok(body.logo) or None
        if body.couleur is not None:
            c = body.couleur.strip()
            if c and not (len(c) in (4, 7) and c.startswith("#") and all(x in "0123456789abcdefABCDEF" for x in c[1:])):
                raise HTTPException(422, "Couleur : format #RRGGBB.")
            r.couleur = c or None
        if body.drive_fournisseur is not None:
            if body.drive_fournisseur not in FOURNISSEURS:
                raise HTTPException(422, "Drive : microsoft, google ou aucun.")
            r.drive_fournisseur = body.drive_fournisseur
        if body.drive_url is not None:
            r.drive_url = lien_https(body.drive_url) or None
        if body.consignes is not None:
            r.consignes = body.consignes.strip() or None
        db.add(r)
        await db.commit()
        return {"secu_actif": r.secu_actif, "marque": await _marque(db, m.org_id)}

    # ── Équipe : liste, invitation (e-mail ou lien), acceptation ───────────────────────────────────────────────────
    @api.get("/entreprise/membres")
    async def ent_membres(db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        rows = (await db.execute(select(EntMembre).where(EntMembre.org_id == m.org_id).order_by(EntMembre.created_at))).scalars().all()
        if m.role == "partenaire":  # un partenaire voit des noms et des postes, pas l'organisation interne
            rows = [c for c in rows if c.statut == "actif" and c.role != "partenaire"]
        vues = [_vue_membre(c, m) for c in rows]
        if peut(m.role, "gerer_equipe"):  # le gérant voit où est le dossier Drive de chacun (pour vérifier les pièces)
            liens = {f.membre_id: f.lien_drive for f in (await db.execute(select(EntFiche).where(EntFiche.org_id == m.org_id))).scalars().all()}
            for v in vues:
                v["lien_drive"] = liens.get(v["id"]) or ""
        return {"membres": vues}

    def _lien(token: str) -> str:
        base = (g.get("_frontend_url") or (lambda: ""))() or "https://app.zayado.net"
        return f"{base.rstrip('/')}/app/entreprise/rejoindre?token={token}"

    @api.post("/entreprise/membres")
    async def ent_inviter(body: InviterIn, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "gerer_equipe")
        if body.role not in roles_invitables(m.role):
            raise HTTPException(403, "Tu ne peux pas inviter ce rôle.")
        email = (body.email or "").strip().lower() or None
        if email and "@" not in email:
            raise HTTPException(422, "Adresse e-mail invalide.")
        if email:
            deja = (await db.execute(select(EntMembre).where(EntMembre.org_id == m.org_id, EntMembre.email == email))).scalars().first()
            if deja:
                raise HTTPException(409, "Cette personne est déjà dans l'équipe.")
        if body.role != "partenaire":
            await _verifier_place(db, m.org_id)
        c = EntMembre(org_id=m.org_id, email=email, nom=body.nom.strip(), role=body.role, poste=body.poste.strip(), type_contrat=body.type_contrat,
                      statut="invite", token=secrets.token_urlsafe(24), token_expire=utcnow() + timedelta(days=VALIDITE_INVITATION_JOURS))
        db.add(c)
        await _journal(db, m, "invitation", c.id)
        await db.commit()
        envoye = False
        if email:
            org = await db.get(Organisation, m.org_id)
            try:
                await g["send_email"](to=email, subject=f"{org.nom if org else 'Ton équipe'} t'invite sur Zayado",
                                      html=(f"<p>Bonjour{(' ' + c.nom) if c.nom else ''},</p><p><b>{org.nom if org else 'Ton équipe'}</b> t'invite à rejoindre son équipe "
                                            f"sur Zayado (présence, absences, planning, temps).</p><p><a href=\"{_lien(c.token)}\">Rejoindre l'équipe</a></p>"
                                            f"<p>Ce lien est valable {VALIDITE_INVITATION_JOURS} jours.</p>"))
                envoye = True
            except Exception as e:  # noqa: BLE001
                log.warning("Invitation équipe : e-mail non envoyé (%s)", e)
        return {"id": c.id, "lien": _lien(c.token), "email_envoye": envoye}

    @api.post("/entreprise/membres/{membre_id}/lien")
    async def ent_relancer(membre_id: str, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "gerer_equipe")
        c = await _membre(db, m, membre_id)
        if c.statut != "invite":
            raise HTTPException(409, "Cette personne a déjà rejoint l'équipe.")
        c.token, c.token_expire = secrets.token_urlsafe(24), utcnow() + timedelta(days=VALIDITE_INVITATION_JOURS)
        await db.commit()
        return {"lien": _lien(c.token)}

    @api.get("/public/entreprise/invitation/{token}")
    async def ent_invitation_infos(token: str, db: AsyncSession = Depends(get_db)):
        c = (await db.execute(select(EntMembre).where(EntMembre.token == token, EntMembre.statut == "invite"))).scalars().first()
        exp = c.token_expire if c else None
        if exp is not None and exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if not c or (exp and exp < datetime.now(timezone.utc)):
            raise HTTPException(404, "Invitation introuvable ou expirée.")
        org = await db.get(Organisation, c.org_id)
        return {"entreprise": org.nom if org else "", "role": c.role}

    @api.post("/entreprise/rejoindre")
    async def ent_rejoindre(body: RejoindreIn, db: AsyncSession = Depends(get_db)):
        uid = _exiger_compte()
        c = (await db.execute(select(EntMembre).where(EntMembre.token == body.token, EntMembre.statut == "invite"))).scalars().first()
        exp = c.token_expire if c else None
        if exp is not None and exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if not c or (exp and exp < datetime.now(timezone.utc)):
            raise HTTPException(404, "Invitation introuvable ou expirée.")
        existant = (await db.execute(select(EntMembre).where(EntMembre.user_id == uid, EntMembre.statut == "actif"))).scalars().first()
        if existant:
            raise HTTPException(409, "Ton compte fait déjà partie d'une équipe.")
        u = await db.get(User, uid)
        c.user_id, c.statut, c.token, c.token_expire = uid, "actif", None, None
        if not c.email and u:
            c.email = (u.email or "").lower()
        if not c.nom and u:
            c.nom = (u.email or "").split("@")[0]
        await _journal(db, c, "invitation_acceptee", c.id)
        await db.commit()
        # Pièces « demandées à chaque nouvelle personne » : posées dès l'arrivée
        types = (await db.execute(select(EntTypePiece).where(EntTypePiece.org_id == c.org_id, EntTypePiece.par_defaut.is_(True)))).scalars().all()
        if types and c.role != "partenaire":
            await _demander_pieces(db, c.org_id, [c.id], types)
            await db.commit()
        await _notifier_gerants(db, c.org_id, f"{c.nom or c.email} a rejoint l'équipe",
                                "Sa fiche et ses pièces à fournir sont prêtes à suivre.", "equipe", sauf=c.id)
        return {"ok": True}

    @api.patch("/entreprise/membres/{membre_id}")
    async def ent_modifier_membre(membre_id: str, body: MembrePatch, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "gerer_equipe")
        c = await _membre(db, m, membre_id)
        if c.role == "proprietaire":
            raise HTTPException(403, "Le propriétaire ne se modifie pas ici.")
        if body.role is not None:
            if m.role != "proprietaire" or body.role not in roles_invitables("proprietaire"):
                raise HTTPException(403, "Seul le propriétaire change les rôles.")
            c.role = body.role
        for champ in ("poste", "nom", "type_contrat"):
            v = getattr(body, champ)
            if v is not None:
                setattr(c, champ, v.strip())
        await db.commit()
        return {"ok": True}

    # ── Présence ────────────────────────────────────────────────────────────────────────────────────────────────────
    @api.get("/entreprise/presence")
    async def ent_presence(debut: str, fin: str, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "lire_equipe")
        debut, fin = _jour_ok(debut), _jour_ok(fin)
        rows = (await db.execute(select(EntPresence).where(EntPresence.org_id == m.org_id, EntPresence.jour >= debut, EntPresence.jour <= fin))).scalars().all()
        return {"presence": [{"id": r.id, "membre_id": r.membre_id, "jour": r.jour, "statut": r.statut, "note": r.note} for r in rows]}

    @api.put("/entreprise/presence")
    async def ent_presence_maj(body: PresenceIn, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "saisir_soi")
        if body.statut not in STATUTS_PRESENCE:
            raise HTTPException(422, "Statut inconnu.")
        cible = _cible(m, body.membre_id)
        jour = _jour_ok(body.jour)
        r = (await db.execute(select(EntPresence).where(EntPresence.membre_id == cible, EntPresence.jour == jour))).scalars().first()
        if r:
            r.statut, r.note = body.statut, body.note
        else:
            db.add(EntPresence(org_id=m.org_id, membre_id=cible, jour=jour, statut=body.statut, note=body.note))
        await db.commit()
        return {"ok": True}

    # ── Absences ────────────────────────────────────────────────────────────────────────────────────────────────────
    def _vue_absence(a: EntAbsence) -> dict:
        return {"id": a.id, "membre_id": a.membre_id, "type": a.type, "debut": a.debut, "fin": a.fin, "motif": a.motif, "statut": a.statut,
                "commentaire": a.commentaire}

    @api.get("/entreprise/absences")
    async def ent_absences(db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        if m.role == "partenaire":
            raise HTTPException(403, "Ton rôle ne permet pas cette action.")
        q = select(EntAbsence).where(EntAbsence.org_id == m.org_id)
        if not peut(m.role, "decider_absence"):
            q = q.where(EntAbsence.membre_id == m.id)
        rows = (await db.execute(q.order_by(EntAbsence.debut.desc()).limit(300))).scalars().all()
        return {"absences": [_vue_absence(a) for a in rows]}

    @api.post("/entreprise/absences")
    async def ent_absence_creer(body: AbsenceIn, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "saisir_soi")
        if body.type not in TYPES_ABSENCE:
            raise HTTPException(422, "Type d'absence inconnu.")
        cible = _cible(m, body.membre_id)
        try:
            jours_entre(_jour_ok(body.debut), _jour_ok(body.fin))
        except ValueError as e:
            raise HTTPException(422, str(e))
        a = EntAbsence(org_id=m.org_id, membre_id=cible, type=body.type, debut=body.debut, fin=body.fin, motif=body.motif)
        # Un gérant qui saisit pour quelqu'un décide dans le même geste ; sa propre demande, lui aussi, est validée.
        if peut(m.role, "decider_absence") and m.role == "proprietaire":
            a.statut, a.decide_par = "acceptee", m.id
        db.add(a)
        await db.flush()
        if a.statut == "acceptee":
            await _appliquer_absence(db, a)
        await db.commit()
        return _vue_absence(a)

    async def _appliquer_absence(db, a: EntAbsence) -> None:
        """Absence acceptée → chaque jour ouvré passe à « Absent » dans la présence (comme le flux de l'app RH d'origine)."""
        for j in jours_entre(a.debut, a.fin):
            r = (await db.execute(select(EntPresence).where(EntPresence.membre_id == a.membre_id, EntPresence.jour == j))).scalars().first()
            if r:
                r.statut, r.note = "absent", a.type
            else:
                db.add(EntPresence(org_id=a.org_id, membre_id=a.membre_id, jour=j, statut="absent", note=a.type))

    @api.patch("/entreprise/absences/{absence_id}/decision")
    async def ent_absence_decider(absence_id: str, body: DecisionIn, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "decider_absence")
        if body.statut not in ("acceptee", "refusee"):
            raise HTTPException(422, "Décision inconnue.")
        a = await db.get(EntAbsence, absence_id)
        if not a or a.org_id != m.org_id:
            raise HTTPException(404, "Absence introuvable.")
        if a.membre_id == m.id and m.role != "proprietaire":
            raise HTTPException(403, "Tu ne peux pas valider ta propre absence : un autre gérant doit le faire.")
        a.statut, a.decide_par, a.commentaire = body.statut, m.id, body.commentaire
        if body.statut == "acceptee":
            await _appliquer_absence(db, a)
        await db.commit()
        return _vue_absence(a)

    @api.delete("/entreprise/absences/{absence_id}")
    async def ent_absence_annuler(absence_id: str, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        a = await db.get(EntAbsence, absence_id)
        if not a or a.org_id != m.org_id:
            raise HTTPException(404, "Absence introuvable.")
        if a.membre_id != m.id and not peut(m.role, "gerer_equipe"):
            raise HTTPException(403, "Ton rôle ne permet pas cette action.")
        if a.statut == "acceptee" and not peut(m.role, "gerer_equipe"):
            raise HTTPException(409, "Une absence acceptée ne s'annule pas seule : demande à ton manager.")
        await db.delete(a)
        await db.commit()
        return {"ok": True}

    # ── Planning ────────────────────────────────────────────────────────────────────────────────────────────────────
    @api.get("/entreprise/planning")
    async def ent_planning(debut: str, fin: str, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "lire_equipe")
        debut, fin = _jour_ok(debut), _jour_ok(fin)
        rows = (await db.execute(select(EntPlanning).where(EntPlanning.org_id == m.org_id, EntPlanning.debut <= fin)
                                 .order_by(EntPlanning.debut))).scalars().all()
        rows = [r for r in rows if (r.fin or r.debut) >= debut]
        nb = {}
        if rows:
            for cid, n in (await db.execute(select(EntCommentaire.cible_id, func.count()).where(
                    EntCommentaire.org_id == m.org_id, EntCommentaire.cible_type == "planning",
                    EntCommentaire.cible_id.in_([r.id for r in rows])).group_by(EntCommentaire.cible_id))).all():
                nb[cid] = n
        return {"planning": [{"id": r.id, "membre_id": r.membre_id, "titre": r.titre, "debut": r.debut, "fin": r.fin, "note": r.note,
                              "creneau": r.creneau or "journee", "auteur_id": r.auteur_id, "statut": r.statut or "pose",
                              "commentaires": nb.get(r.id, 0)} for r in rows]}

    @api.get("/entreprise/planning/a-regarder")
    async def ent_planning_a_regarder(db: AsyncSession = Depends(get_db)):
        """Plannings proposés par l'équipe que les gérants n'ont pas encore regardés."""
        m = await _moi(db)
        _exiger(m, "gerer_equipe")
        rows = (await db.execute(select(EntPlanning).where(EntPlanning.org_id == m.org_id, EntPlanning.statut == "propose")
                                 .order_by(EntPlanning.debut).limit(200))).scalars().all()
        return {"planning": [{"id": r.id, "membre_id": r.membre_id, "titre": r.titre, "debut": r.debut, "fin": r.fin, "note": r.note,
                              "creneau": r.creneau or "journee", "statut": r.statut} for r in rows]}

    @api.patch("/entreprise/planning/{planning_id}/vu")
    async def ent_planning_vu(planning_id: str, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "gerer_equipe")
        r = await db.get(EntPlanning, planning_id)
        if not r or r.org_id != m.org_id:
            raise HTTPException(404, "Introuvable.")
        r.statut = "vu"
        await db.commit()
        if r.membre_id and r.membre_id != m.id:
            await _notifier(db, await db.get(EntMembre, r.membre_id), "Ton planning a été vu",
                            f"{m.nom or 'Ton responsable'} a regardé « {r.titre} ».", "planning")
        return {"ok": True}

    @api.post("/entreprise/planning")
    async def ent_planning_creer(body: PlanningIn, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "saisir_soi")
        gerant = peut(m.role, "gerer_equipe")
        debut = _jour_ok(body.debut)
        fin = _jour_ok(body.fin) if body.fin else None
        if fin and fin < debut:
            raise HTTPException(422, "La fin précède le début.")
        if body.creneau not in CRENEAUX:
            raise HTTPException(422, "Créneau : matin, après-midi ou journée.")
        if gerant:
            membre_id = body.membre_id or None
            if membre_id:
                await _membre(db, m, membre_id)
        else:  # un membre indique SON planning ; il part chez les gérants pour être regardé
            membre_id = m.id
        r = EntPlanning(org_id=m.org_id, membre_id=membre_id, titre=body.titre.strip(), debut=debut, fin=fin, note=body.note,
                        creneau=body.creneau, auteur_id=m.id, statut=None if gerant else "propose")
        db.add(r)
        await db.commit()
        if gerant:
            if membre_id and membre_id != m.id:
                await _notifier(db, await db.get(EntMembre, membre_id), "Nouveau dans ton planning", f"« {r.titre} », le {debut}.", "planning")
        else:
            await _notifier_gerants(db, m.org_id, f"{m.nom or 'Un membre'} a indiqué son planning",
                                    f"« {r.titre} », le {debut}. Ouvre le planning pour le regarder ou laisser un commentaire.", "planning", sauf=m.id)
        return {"id": r.id}

    @api.delete("/entreprise/planning/{planning_id}")
    async def ent_planning_supprimer(planning_id: str, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        r = await db.get(EntPlanning, planning_id)
        if not r or r.org_id != m.org_id:
            raise HTTPException(404, "Introuvable.")
        if not peut(m.role, "gerer_equipe") and r.auteur_id != m.id:
            raise HTTPException(403, "Ton rôle ne permet pas cette action.")
        await db.execute(delete(EntCommentaire).where(EntCommentaire.cible_type == "planning", EntCommentaire.cible_id == r.id))
        await db.delete(r)
        await db.commit()
        return {"ok": True}

    # ── Temps ───────────────────────────────────────────────────────────────────────────────────────────────────────
    @api.get("/entreprise/temps")
    async def ent_temps(debut: str, fin: str, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        if m.role == "partenaire":
            raise HTTPException(403, "Ton rôle ne permet pas cette action.")
        debut, fin = _jour_ok(debut), _jour_ok(fin)
        q = select(EntTemps).where(EntTemps.org_id == m.org_id, EntTemps.jour >= debut, EntTemps.jour <= fin)
        if not peut(m.role, "lire_temps_equipe"):
            q = q.where(EntTemps.membre_id == m.id)
        rows = (await db.execute(q.order_by(EntTemps.jour.desc()).limit(1000))).scalars().all()
        return {"temps": [{"id": r.id, "membre_id": r.membre_id, "jour": r.jour, "heures": r.heures, "projet": r.projet, "note": r.note} for r in rows]}

    @api.post("/entreprise/temps")
    async def ent_temps_creer(body: TempsIn, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "saisir_soi")
        cible = _cible(m, body.membre_id)
        t = EntTemps(org_id=m.org_id, membre_id=cible, jour=_jour_ok(body.jour), heures=body.heures, projet=body.projet, note=body.note)
        db.add(t)
        await db.commit()
        return {"id": t.id}

    @api.delete("/entreprise/temps/{temps_id}")
    async def ent_temps_supprimer(temps_id: str, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        t = await db.get(EntTemps, temps_id)
        if not t or t.org_id != m.org_id or (t.membre_id != m.id and not peut(m.role, "gerer_equipe")):
            raise HTTPException(404, "Introuvable.")
        await db.delete(t)
        await db.commit()
        return {"ok": True}

    # ── Pièces à fournir ────────────────────────────────────────────────────────────────────────────────────────────
    @api.get("/entreprise/pieces")
    async def ent_pieces(db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        if m.role == "partenaire":
            raise HTTPException(403, "Ton rôle ne permet pas cette action.")
        q = select(EntPiece).where(EntPiece.org_id == m.org_id)
        if not peut(m.role, "gerer_equipe"):
            q = q.where(EntPiece.membre_id == m.id)
        rows = (await db.execute(q.limit(500))).scalars().all()
        return {"pieces": [{"id": r.id, "membre_id": r.membre_id, "titre": r.titre, "statut": r.statut, "reference": r.reference,
                            "consigne": r.consigne or "", "commentaire": r.commentaire or ""} for r in rows]}

    @api.post("/entreprise/pieces")
    async def ent_piece_creer(body: PieceIn, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "saisir_soi")
        cible = _cible(m, body.membre_id)
        statut = body.statut if body.statut in ("a_fournir", "fournie") else "a_fournir"
        p = EntPiece(org_id=m.org_id, membre_id=cible, titre=body.titre.strip(), statut=statut, reference=body.reference)
        db.add(p)
        await db.commit()
        return {"id": p.id}

    @api.patch("/entreprise/pieces/{piece_id}")
    async def ent_piece_maj(piece_id: str, body: PiecePatch, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        p = await db.get(EntPiece, piece_id)
        if not p or p.org_id != m.org_id:
            raise HTTPException(404, "Introuvable.")
        gerant = peut(m.role, "gerer_equipe")
        if p.membre_id != m.id and not gerant:
            raise HTTPException(404, "Introuvable.")
        avant = p.statut
        if body.reference is not None:
            p.reference = lien_https(body.reference)
            if p.statut in ("a_fournir", "refusee") and p.reference:
                p.statut = "fournie"
        if body.statut is not None:
            autorise = ("validee", "refusee", "a_fournir", "fournie") if gerant else ("fournie",)
            if body.statut not in autorise:
                raise HTTPException(403, "Seul un manager valide ou refuse une pièce.")
            if not gerant and p.statut == "validee":
                raise HTTPException(409, "Cette pièce est déjà validée.")
            p.statut = body.statut
        if body.commentaire is not None and gerant:
            p.commentaire = body.commentaire.strip() or None
        if p.statut == "fournie" and avant != "fournie":
            p.commentaire = None  # nouveau dépôt : l'ancien motif de refus ne vaut plus
        await db.commit()
        # Qui doit être prévenu : le gérant quand c'est déposé, la personne quand c'est validé ou refusé
        if p.statut == "fournie" and avant != "fournie" and p.membre_id == m.id:
            await _notifier_gerants(db, m.org_id, f"{m.nom or 'Un membre'} a déposé « {p.titre} »",
                                    "À vérifier dans le Drive de l'entreprise, puis à valider.", "pieces", sauf=m.id)
        elif p.statut in ("validee", "refusee") and avant != p.statut and p.membre_id != m.id:
            cible = await db.get(EntMembre, p.membre_id)
            if p.statut == "validee":
                await _notifier(db, cible, f"« {p.titre} » est validée", "C'est bon pour cette pièce.", "pieces")
            else:
                await _notifier(db, cible, f"« {p.titre} » est à refaire", p.commentaire or "Regarde le commentaire dans tes pièces.", "pieces")
        return {"ok": True}

    @api.delete("/entreprise/pieces/{piece_id}")
    async def ent_piece_supprimer(piece_id: str, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "gerer_equipe")
        p = await db.get(EntPiece, piece_id)
        if not p or p.org_id != m.org_id:
            raise HTTPException(404, "Introuvable.")
        await db.execute(delete(EntCommentaire).where(EntCommentaire.cible_type == "piece", EntCommentaire.cible_id == p.id))
        await db.delete(p)
        await db.commit()
        return {"ok": True}

    # ── Liste des pièces demandées par l'entreprise (catalogue) ─────────────────────────────────────────────────────
    @api.get("/entreprise/types-pieces")
    async def ent_types_pieces(db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        rows = (await db.execute(select(EntTypePiece).where(EntTypePiece.org_id == m.org_id).order_by(EntTypePiece.ordre, EntTypePiece.titre))).scalars().all()
        return {"types": [{"id": t.id, "titre": t.titre, "consigne": t.consigne, "par_defaut": t.par_defaut} for t in rows]}

    @api.post("/entreprise/types-pieces")
    async def ent_type_piece_creer(body: TypePieceIn, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "gerer_equipe")
        titre = body.titre.strip()
        deja = (await db.execute(select(EntTypePiece).where(EntTypePiece.org_id == m.org_id, func.lower(EntTypePiece.titre) == titre.lower()))).scalars().first()
        if deja:
            raise HTTPException(409, "Cette pièce est déjà dans la liste.")
        n = (await db.execute(select(func.count()).select_from(EntTypePiece).where(EntTypePiece.org_id == m.org_id))).scalar_one()
        t = EntTypePiece(org_id=m.org_id, titre=titre, consigne=body.consigne.strip(), par_defaut=body.par_defaut, ordre=n)
        db.add(t)
        await db.commit()
        return {"id": t.id}

    @api.delete("/entreprise/types-pieces/{type_id}")
    async def ent_type_piece_supprimer(type_id: str, db: AsyncSession = Depends(get_db)):
        """Retire la pièce de la liste ; les pièces déjà demandées restent (historique de chacun)."""
        m = await _moi(db)
        _exiger(m, "gerer_equipe")
        t = await db.get(EntTypePiece, type_id)
        if not t or t.org_id != m.org_id:
            raise HTTPException(404, "Introuvable.")
        await db.delete(t)
        await db.commit()
        return {"ok": True}

    @api.post("/entreprise/types-pieces/{type_id}/demander")
    async def ent_type_piece_demander(type_id: str, body: DemanderIn, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "gerer_equipe")
        t = await db.get(EntTypePiece, type_id)
        if not t or t.org_id != m.org_id:
            raise HTTPException(404, "Introuvable.")
        cibles = (await db.execute(select(EntMembre).where(EntMembre.org_id == m.org_id, EntMembre.role != "partenaire",
                                                           EntMembre.role != "proprietaire"))).scalars().all()
        if body.membre_ids:
            voulus = set(body.membre_ids)
            cibles = [c for c in cibles if c.id in voulus]
        n = await _demander_pieces(db, m.org_id, [c.id for c in cibles], [t])
        await db.commit()
        for c in cibles:
            if c.statut == "actif":
                await _notifier(db, c, "Une pièce t'est demandée", f"« {t.titre} » : dépose-la dans ton Drive pro puis indique-le dans Zayado.", "pieces")
        return {"crees": n, "personnes": len(cibles)}

    # ── Fiche (coordonnées) et « Mon Drive pro » ───────────────────────────────────────────────────────────────────
    PERSO = ("adresse", "code_postal", "ville", "tel_perso", "email_perso", "urgence_nom", "urgence_tel", "partage_tel", "partage_email")
    PRO = ("tel_pro", "email_pro", "lien_drive")

    def _vue_fiche(f: Optional[EntFiche]) -> dict:
        champs = PERSO + PRO
        if not f:
            return {k: (False if k.startswith("partage_") else "") for k in champs}
        return {k: (getattr(f, k) if getattr(f, k) is not None else (False if k.startswith("partage_") else "")) for k in champs}

    @api.get("/entreprise/fiches/{membre_id}")
    async def ent_fiche(membre_id: str, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        if membre_id == "moi":
            membre_id = m.id
        if membre_id != m.id and not peut(m.role, "gerer_equipe"):
            raise HTTPException(403, "Ton rôle ne permet pas cette action.")
        await _membre(db, m, membre_id)
        f = await db.get(EntFiche, membre_id)
        if membre_id != m.id:
            await _journal(db, m, "fiche_lue", membre_id)
            await db.commit()
        return {"membre_id": membre_id, **_vue_fiche(f)}

    @api.put("/entreprise/fiches/{membre_id}")
    async def ent_fiche_maj(membre_id: str, body: FicheIn, db: AsyncSession = Depends(get_db)):
        """La personne remplit ses coordonnées ; les gérants renseignent les infos pro et le lien de son dossier Drive."""
        m = await _moi(db)
        if membre_id == "moi":
            membre_id = m.id
        soi = membre_id == m.id
        gerant = peut(m.role, "gerer_equipe")
        if not soi and not gerant:
            raise HTTPException(403, "Ton rôle ne permet pas cette action.")
        c = await _membre(db, m, membre_id)
        f = await db.get(EntFiche, membre_id) or EntFiche(membre_id=membre_id, org_id=m.org_id)
        donnees = body.model_dump(exclude_none=True) if hasattr(body, "model_dump") else body.dict(exclude_none=True)
        for k, v in donnees.items():
            if k in PERSO and not soi:
                continue  # un gérant ne réécrit pas l'adresse de quelqu'un à sa place
            if k in PRO and not gerant:
                continue  # le lien du dossier et les coordonnées pro sont décidés par l'entreprise
            if k == "lien_drive":
                v = lien_https(v)
            if k in ("email_perso", "email_pro") and v and "@" not in v:
                raise HTTPException(422, "Adresse e-mail invalide.")
            setattr(f, k, v.strip() if isinstance(v, str) else v)
        f.maj_le = utcnow()
        db.add(f)
        if not soi:
            await _journal(db, m, "fiche_modifiee", membre_id)
        await db.commit()
        if not soi and "lien_drive" in donnees and f.lien_drive:
            await _notifier(db, c, "Ton Drive pro est prêt", "Le bouton « Accéder à mon Drive pro » ouvre maintenant ton dossier.", "pieces")
        return {"membre_id": membre_id, **_vue_fiche(f)}

    @api.get("/entreprise/mon-drive")
    async def ent_mon_drive(db: AsyncSession = Depends(get_db)):
        """Le dossier où déposer ses pièces : le sien s'il existe, sinon le dossier commun de l'entreprise."""
        m = await _moi(db)
        f = await db.get(EntFiche, m.id)
        mq = await _marque(db, m.org_id)
        if f and f.lien_drive:
            return {"url": f.lien_drive, "source": "personnel", "fournisseur": mq["drive_fournisseur"], "consignes": mq["consignes"]}
        if mq["drive_url"]:
            return {"url": mq["drive_url"], "source": "entreprise", "fournisseur": mq["drive_fournisseur"], "consignes": mq["consignes"]}
        return {"url": None, "source": None, "fournisseur": mq["drive_fournisseur"], "consignes": mq["consignes"]}

    @api.get("/entreprise/annuaire")
    async def ent_annuaire(db: AsyncSession = Depends(get_db)):
        """Coordonnées visibles de toute l'équipe : pro, plus le perso que chacun a choisi de partager."""
        m = await _moi(db)
        membres = (await db.execute(select(EntMembre).where(EntMembre.org_id == m.org_id, EntMembre.statut == "actif"))).scalars().all()
        if m.role == "partenaire":
            membres = [c for c in membres if c.role != "partenaire"]
        fiches = {f.membre_id: f for f in (await db.execute(select(EntFiche).where(EntFiche.org_id == m.org_id))).scalars().all()}
        out = []
        for c in membres:
            f = fiches.get(c.id)
            out.append({"id": c.id, "nom": c.nom or (c.email or "").split("@")[0], "poste": c.poste,
                        "tel_pro": f.tel_pro if f else "", "email_pro": (f.email_pro if f else "") or "",
                        "tel": f.tel_perso if f and f.partage_tel else "", "email": f.email_perso if f and f.partage_email else ""})
        return {"annuaire": out}

    # ── Commentaires (planning, pièces) ─────────────────────────────────────────────────────────────────────────────
    async def _cible_commentaire(db, m: EntMembre, cible_type: str, cible_id: str):
        cls = {"planning": EntPlanning, "piece": EntPiece}.get(cible_type)
        if cls is None:
            raise HTTPException(422, "Type inconnu.")
        o = await db.get(cls, cible_id)
        if not o or o.org_id != m.org_id:
            raise HTTPException(404, "Introuvable.")
        # Une pièce n'est commentée que par sa personne et les gérants ; le planning se lit par toute l'équipe
        if cible_type == "piece" and o.membre_id != m.id and not peut(m.role, "gerer_equipe"):
            raise HTTPException(404, "Introuvable.")
        if m.role == "partenaire":
            raise HTTPException(403, "Ton rôle ne permet pas cette action.")
        return o

    @api.get("/entreprise/commentaires")
    async def ent_commentaires(cible_type: str, cible_id: str, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        await _cible_commentaire(db, m, cible_type, cible_id)
        rows = (await db.execute(select(EntCommentaire).where(EntCommentaire.org_id == m.org_id, EntCommentaire.cible_type == cible_type,
                                                              EntCommentaire.cible_id == cible_id).order_by(EntCommentaire.created_at))).scalars().all()
        return {"commentaires": [{"id": c.id, "auteur_id": c.auteur_id, "texte": c.texte, "le": c.created_at.isoformat() if c.created_at else None} for c in rows]}

    @api.post("/entreprise/commentaires")
    async def ent_commenter(body: CommentaireIn, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        o = await _cible_commentaire(db, m, body.cible_type, body.cible_id)
        c = EntCommentaire(org_id=m.org_id, cible_type=body.cible_type, cible_id=body.cible_id, auteur_id=m.id, texte=body.texte.strip())
        db.add(c)
        if body.cible_type == "planning" and getattr(o, "statut", None) == "propose" and peut(m.role, "gerer_equipe"):
            o.statut = "vu"  # répondre, c'est avoir regardé
        await db.commit()
        vue = "planning" if body.cible_type == "planning" else "pieces"
        titre_obj = getattr(o, "titre", "")
        if o.membre_id and o.membre_id != m.id:
            await _notifier(db, await db.get(EntMembre, o.membre_id), f"Commentaire sur « {titre_obj} »", f"{m.nom or 'Ton responsable'} : {c.texte[:140]}", vue)
        elif o.membre_id == m.id:
            await _notifier_gerants(db, m.org_id, f"{m.nom or 'Un membre'} a commenté « {titre_obj} »", c.texte[:140], vue, sauf=m.id)
        return {"id": c.id}

    # ── Excel : modèle, export et import (mêmes colonnes que le kit Microsoft Lists) ────────────────────────────────
    from entreprise_excel import classeur_modele, classeur_export, lire_classeur

    @api.get("/entreprise/excel/modele")
    async def ent_excel_modele(db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "gerer_equipe")
        return Response(content=classeur_modele(), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        headers={"Content-Disposition": "attachment; filename=Ton-entreprise-modele.xlsx"})

    @api.get("/entreprise/excel/export")
    async def ent_excel_export(db: AsyncSession = Depends(get_db)):
        """La base de l'équipe en Excel. Les coordonnées personnelles et les contrats ne sortent que pour le propriétaire."""
        m = await _moi(db)
        _exiger(m, "gerer_equipe")
        proprio = m.role == "proprietaire"
        membres = (await db.execute(select(EntMembre).where(EntMembre.org_id == m.org_id))).scalars().all()
        noms = {c.id: c.nom or (c.email or "") for c in membres}
        fiches = {f.membre_id: f for f in (await db.execute(select(EntFiche).where(EntFiche.org_id == m.org_id))).scalars().all()}
        types = (await db.execute(select(EntTypePiece).where(EntTypePiece.org_id == m.org_id))).scalars().all()
        pieces = (await db.execute(select(EntPiece).where(EntPiece.org_id == m.org_id))).scalars().all()
        planning = (await db.execute(select(EntPlanning).where(EntPlanning.org_id == m.org_id))).scalars().all()
        absences = (await db.execute(select(EntAbsence).where(EntAbsence.org_id == m.org_id))).scalars().all()
        org = await db.get(Organisation, m.org_id)
        octets = classeur_export(org.nom if org else "", membres, noms, fiches, types, pieces, planning, absences, avec_perso=proprio)
        await _journal(db, m, "export_excel")
        await db.commit()
        return Response(content=octets, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        headers={"Content-Disposition": "attachment; filename=Ton-entreprise-export.xlsx"})

    async def _importer(db, m, donnees: dict) -> dict:
        """Cœur de l'import (fichier Excel téléversé OU fichiers du dirigeant relus par « J'ai déjà mes fichiers »).
        Rien n'est supprimé ; une personne déjà présente est mise à jour, jamais dupliquée."""
        rapport = {"invites": 0, "mis_a_jour": 0, "types": 0, "pieces": 0, "planning": 0, "ignores": []}
        membres = (await db.execute(select(EntMembre).where(EntMembre.org_id == m.org_id))).scalars().all()

        def trouver(cle: str) -> Optional[EntMembre]:
            k = (cle or "").strip().lower()
            if not k:
                return None
            return next((c for c in membres if (c.email or "").lower() == k or (c.nom or "").strip().lower() == k), None)

        for i, l in enumerate(donnees.get("Annuaire", []), start=2):
            email = (l.get("Email") or "").strip().lower()
            nom = (l.get("Title") or "").strip()
            if not email or "@" not in email:
                rapport["ignores"].append(f"Annuaire ligne {i} : e-mail manquant")
                continue
            role = "manager" if (l.get("Role") or "").strip().lower() == "employeur" else "membre"
            if role not in roles_invitables(m.role):
                role = "membre"
            c = trouver(email)
            if c:
                if nom:
                    c.nom = c.nom or nom
                if l.get("Poste"):
                    c.poste = str(l["Poste"]).strip()[:120]
                rapport["mis_a_jour"] += 1
            else:
                lim = await _limite_personnes(db, m.org_id)
                if lim is not None and await _nb_personnes(db, m.org_id) >= lim:
                    rapport["ignores"].append(f"Annuaire ligne {i} : {email} non invité (offre Équipe : {lim} personnes au plus)")
                    continue
                c = EntMembre(org_id=m.org_id, email=email, nom=nom[:120], role=role, poste=str(l.get("Poste") or "").strip()[:120],
                              type_contrat="salarie", statut="invite", token=secrets.token_urlsafe(24),
                              token_expire=utcnow() + timedelta(days=VALIDITE_INVITATION_JOURS))
                db.add(c)
                await db.flush()
                membres.append(c)
                rapport["invites"] += 1
            if l.get("TelPro") or l.get("EmailPro"):
                f = await db.get(EntFiche, c.id) or EntFiche(membre_id=c.id, org_id=m.org_id)
                f.tel_pro = str(l.get("TelPro") or f.tel_pro or "")[:30]
                f.email_pro = str(l.get("EmailPro") or f.email_pro or "")[:255]
                db.add(f)

        for i, l in enumerate(donnees.get("DossierSalarie", []), start=2):
            c = trouver(l.get("Salarie") or l.get("Title"))
            lien = (l.get("LienDrive") or "").strip()
            if not c or not lien:
                continue
            if not lien.lower().startswith("https://"):
                rapport["ignores"].append(f"DossierSalarie ligne {i} : lien non https")
                continue
            f = await db.get(EntFiche, c.id) or EntFiche(membre_id=c.id, org_id=m.org_id)
            f.lien_drive = lien[:1000]
            db.add(f)

        types = (await db.execute(select(EntTypePiece).where(EntTypePiece.org_id == m.org_id))).scalars().all()
        for l in donnees.get("TypesPieces", []):
            titre = (l.get("Title") or "").strip()[:160]
            if not titre or any(t.titre.lower() == titre.lower() for t in types):
                continue
            t = EntTypePiece(org_id=m.org_id, titre=titre, consigne=str(l.get("Consigne") or "")[:400],
                             par_defaut=(str(l.get("ParDefaut") or "Oui").strip().lower() != "non"), ordre=len(types))
            db.add(t)
            types.append(t)
            rapport["types"] += 1
        await db.flush()

        for i, l in enumerate(donnees.get("PiecesRequises", []), start=2):
            c = trouver(l.get("Salarie"))
            titre = (l.get("Title") or "").strip()[:160]
            if not c or not titre:
                rapport["ignores"].append(f"PiecesRequises ligne {i} : personne ou pièce introuvable")
                continue
            t = next((x for x in types if x.titre.lower() == titre.lower()), None) or _PieceLibre(titre, "", None)
            rapport["pieces"] += await _demander_pieces(db, m.org_id, [c.id], [t])

        for i, l in enumerate(donnees.get("Planning", []), start=2):
            titre = (l.get("Title") or "").strip()[:160]
            jour = str(l.get("DateEcheance") or "")[:10]
            c = trouver(l.get("Salarie"))
            try:
                jour = date.fromisoformat(jour).isoformat()
            except Exception:  # noqa: BLE001
                rapport["ignores"].append(f"Planning ligne {i} : date invalide (AAAA-MM-JJ)")
                continue
            if not titre:
                continue
            cren = {"matin": "matin", "après-midi": "apres_midi", "apres-midi": "apres_midi"}.get(str(l.get("Creneau") or "").strip().lower(), "journee")
            note = " · ".join(str(x) for x in (l.get("Livrable"), l.get("Commentaire")) if x)[:400]
            db.add(EntPlanning(org_id=m.org_id, membre_id=c.id if c else None, titre=titre, debut=jour, fin=None, note=note, creneau=cren, auteur_id=m.id))
            rapport["planning"] += 1

        await _journal(db, m, "import_excel")
        await db.commit()
        return rapport

    g["_importer_entreprise"] = _importer

    @api.post("/entreprise/excel/import")
    async def ent_excel_import(fichier: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
        """Importe l'Excel préparé par l'entreprise : Annuaire (invitations), TypesPieces, PiecesRequises, Planning, DossierSalarie (infos pro).
        Rien n'est supprimé ; une personne déjà présente est mise à jour, jamais dupliquée. Aucun e-mail n'est envoyé : les liens
        d'invitation sont à envoyer depuis l'onglet Équipe."""
        m = await _moi(db)
        _exiger(m, "gerer_equipe")
        octets = await fichier.read(2_000_001)
        if len(octets) > 2_000_000:
            raise HTTPException(413, "Fichier trop lourd (2 Mo maximum).")
        try:
            donnees = lire_classeur(octets)
        except ValueError as e:
            raise HTTPException(422, str(e))
        return await _importer(db, m, donnees)

    # ── Décompte du mois : chacun le sien ; les gérants toute l'équipe ; la paie : la personne et le propriétaire ──
    from entreprise_decompte import calculer as _calculer_decompte, classeur as _classeur_decompte, bornes_mois as _bornes_mois

    def _vue_remu(r: Optional[EntRemuneration]) -> dict:
        if not r:
            return {"mode": "aucun", "taux": 0, "heures_jour": 7, "cp_initial": 0, "cp_depuis": None, "ecole_jours": [], "ecole_payee": False}
        return {"mode": r.mode, "taux": r.taux or 0, "heures_jour": r.heures_jour or 7, "cp_initial": r.cp_initial or 0,
                "cp_depuis": r.cp_depuis, "ecole_jours": [int(x) for x in (r.ecole_jours or "").split(",") if x.strip().isdigit()],
                "ecole_payee": bool(r.ecole_payee)}

    @api.get("/entreprise/remunerations/{membre_id}")
    async def ent_remu(membre_id: str, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        membre_id = m.id if membre_id == "moi" else membre_id
        if membre_id != m.id and m.role != "proprietaire":
            raise HTTPException(403, "Seuls la personne et le propriétaire voient ces informations.")
        await _membre(db, m, membre_id)
        return {"membre_id": membre_id, **_vue_remu(await db.get(EntRemuneration, membre_id))}

    @api.put("/entreprise/remunerations/{membre_id}")
    async def ent_remu_maj(membre_id: str, body: RemunerationIn, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        if m.role != "proprietaire":
            raise HTTPException(403, "Seul le propriétaire règle la rémunération et les congés.")
        await _membre(db, m, membre_id)
        if body.mode not in ("aucun", "horaire", "forfait_jour"):
            raise HTTPException(422, "Mode : aucun, horaire ou forfait_jour.")
        if body.cp_depuis:
            _jour_ok(body.cp_depuis)
        jours = sorted({int(x) for x in body.ecole_jours if str(x).isdigit() and 0 <= int(x) <= 4})
        r = await db.get(EntRemuneration, membre_id) or EntRemuneration(membre_id=membre_id, org_id=m.org_id)
        r.mode, r.taux, r.heures_jour, r.cp_initial = body.mode, body.taux, body.heures_jour, body.cp_initial
        r.cp_depuis, r.ecole_jours, r.ecole_payee = body.cp_depuis or None, ",".join(str(x) for x in jours), body.ecole_payee
        db.add(r)
        await _journal(db, m, "remuneration_modifiee", membre_id)
        await db.commit()
        return {"membre_id": membre_id, **_vue_remu(r)}

    @api.put("/entreprise/versements")
    async def ent_versement(body: VersementIn, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        if m.role != "proprietaire":
            raise HTTPException(403, "Seul le propriétaire indique ce qui a été versé.")
        await _membre(db, m, body.membre_id)
        v = (await db.execute(select(EntVersement).where(EntVersement.org_id == m.org_id, EntVersement.membre_id == body.membre_id,
                                                         EntVersement.mois == body.mois))).scalars().first()
        if not v:
            v = EntVersement(org_id=m.org_id, membre_id=body.membre_id, mois=body.mois)
            db.add(v)
        v.montant = body.montant
        await _journal(db, m, "versement_indique", body.membre_id)
        await db.commit()
        return {"ok": True}

    async def _decompte(db, m: EntMembre, c: EntMembre, mois: str) -> dict:
        try:
            debut, fin = _bornes_mois(mois)
        except Exception:  # noqa: BLE001
            raise HTTPException(422, "Mois au format AAAA-MM.")
        d0, d1 = debut.isoformat(), fin.isoformat()
        q = lambda cls: select(cls).where(cls.org_id == c.org_id, cls.membre_id == c.id)  # noqa: E731
        pres = (await db.execute(q(EntPresence).where(EntPresence.jour >= d0, EntPresence.jour <= d1))).scalars().all()
        abs_ = (await db.execute(q(EntAbsence).where(EntAbsence.statut == "acceptee"))).scalars().all()
        tps = (await db.execute(q(EntTemps).where(EntTemps.jour >= d0, EntTemps.jour <= d1))).scalars().all()
        pl = (await db.execute(select(EntPlanning).where(EntPlanning.org_id == c.org_id, EntPlanning.debut <= d1,
                                                         (EntPlanning.membre_id == c.id) | (EntPlanning.membre_id.is_(None))))).scalars().all()
        pl = [r for r in pl if (r.fin or r.debut) >= d0]
        remu = _vue_remu(await db.get(EntRemuneration, c.id))
        reg = await db.get(EntReglage, c.org_id)
        cp_mois = reg.cp_par_mois if reg and reg.cp_par_mois is not None else 2.08
        voir_paie = m.id == c.id or m.role == "proprietaire"
        v = (await db.execute(select(EntVersement).where(EntVersement.org_id == c.org_id, EntVersement.membre_id == c.id,
                                                         EntVersement.mois == mois))).scalars().first()
        d = _calculer_decompte(
            mois, [{"jour": p.jour, "statut": p.statut} for p in pres],
            [{"type": a.type, "debut": a.debut, "fin": a.fin} for a in abs_],
            [{"jour": t.jour, "heures": t.heures} for t in tps],
            [{"titre": r.titre, "debut": r.debut, "fin": r.fin, "creneau": r.creneau or "journee", "statut": r.statut or "pose"} for r in sorted(pl, key=lambda x: x.debut)],
            remu, cp_mois, [{"debut": a.debut, "fin": a.fin} for a in abs_ if a.type == "conges"],
            v.montant if v else 0, voir_paie)
        d.update({"membre_id": c.id, "nom": c.nom or c.email or "", "poste": c.poste, "type_contrat": c.type_contrat})
        return d

    def _personnes_visibles(m: EntMembre, membres: list, membre_id: Optional[str]) -> list:
        if not peut(m.role, "saisir_soi"):
            raise HTTPException(403, "Ton rôle ne permet pas cette action.")
        if membre_id and membre_id != "moi":
            if membre_id != m.id and not peut(m.role, "gerer_equipe"):
                raise HTTPException(403, "Tu ne vois que ton propre décompte.")
            cibles = [c for c in membres if c.id == membre_id]
            if not cibles:
                raise HTTPException(404, "Introuvable.")
            return cibles
        if membre_id == "moi" or not peut(m.role, "gerer_equipe"):
            return [m]
        return [c for c in membres if c.statut == "actif" and c.role != "partenaire"]

    @api.get("/entreprise/decompte")
    async def ent_decompte(mois: str, membre_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
        """Sans membre_id : soi-même (membre) ou toute l'équipe (gérant). membre_id=moi : soi-même."""
        m = await _moi(db)
        membres = (await db.execute(select(EntMembre).where(EntMembre.org_id == m.org_id))).scalars().all()
        return {"mois": mois, "decomptes": [await _decompte(db, m, c, mois) for c in _personnes_visibles(m, membres, membre_id)]}

    @api.get("/entreprise/decompte/export")
    async def ent_decompte_export(mois: str, membre_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        membres = (await db.execute(select(EntMembre).where(EntMembre.org_id == m.org_id))).scalars().all()
        ds = [await _decompte(db, m, c, mois) for c in _personnes_visibles(m, membres, membre_id)]
        org = await db.get(Organisation, m.org_id)
        mq = await _marque(db, m.org_id)
        if any(d["membre_id"] != m.id for d in ds):
            await _journal(db, m, "decompte_exporte")
            await db.commit()
        octets = _classeur_decompte(mq["nom"] or (org.nom if org else ""), mois, [(d["nom"], d) for d in ds])
        nom = f"Compte-rendu-{mois}{'' if len(ds) > 1 else '-' + ''.join(ch for ch in ds[0]['nom'] if ch.isalnum() or ch in '-_')[:40]}.xlsx"
        return Response(content=octets, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        headers={"Content-Disposition": f"attachment; filename={nom}"})

    # ── Relier son compte perso à son compte pro (invité par le dirigeant) ──
    class LiaisonIn(BaseModel):
        email_perso: str = Field(min_length=3, max_length=255)

    class LiaisonOkIn(BaseModel):
        jeton: str = Field(min_length=10, max_length=64)

    class NotifPersoIn(BaseModel):
        notif_perso: bool

    def _vue_liaison(fi) -> dict:
        return {"email_perso": (fi.perso_email if fi else None) or None, "confirme": bool(fi and fi.perso_user_id),
                "en_attente": bool(fi and fi.perso_jeton and not fi.perso_user_id), "notif_perso": bool(fi and fi.notif_perso)}

    @api.get("/entreprise/liaison")
    async def ent_liaison(db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        return _vue_liaison(await db.get(EntFiche, m.id))

    @api.post("/entreprise/liaison")
    async def ent_liaison_demander(body: LiaisonIn, db: AsyncSession = Depends(get_db)):
        """Le compte PRO demande ; le compte PERSO doit confirmer (sinon on pourrait se relier au compte de quelqu'un d'autre)."""
        m = await _moi(db)
        email = body.email_perso.strip().lower()
        if "@" not in email:
            raise HTTPException(422, "Adresse e-mail invalide.")
        moi_u = await db.get(g["User"], m.user_id) if m.user_id else None
        if moi_u and (moi_u.email or "").lower() == email:
            raise HTTPException(422, "C'est l'adresse de ce compte : indique celle de ton compte perso.")
        fi = await db.get(EntFiche, m.id) or EntFiche(membre_id=m.id, org_id=m.org_id)
        fi.perso_email, fi.perso_user_id, fi.perso_jeton = email, None, secrets.token_urlsafe(24)
        db.add(fi)
        await db.commit()
        perso = (await db.execute(select(g["User"]).where(func.lower(g["User"].email) == email))).scalars().first()
        lien = f"{(os.environ.get('PUBLIC_FRONTEND_URL') or '').rstrip('/')}/compte/liaison?jeton={fi.perso_jeton}"
        if perso and g.get("notifier"):
            try:
                await g["notifier"](db, perso.id, "equipe", "Relier ton compte pro", f"{m.nom or 'Ton compte pro'} demande à être relié à ce compte perso.",
                                    f"/compte/liaison?jeton={fi.perso_jeton}", tag="liaison-compte")
            except Exception:  # noqa: BLE001
                pass
        if g.get("send_email"):
            try:
                await g["send_email"](to=email, subject="Relier ton compte pro Zayado à ce compte",
                                      html=f"<p>Ton compte pro Zayado demande à être relié à ce compte perso.</p><p><a href='{lien}'>Confirmer en me connectant à mon compte perso</a></p><p>Pas toi ? Ignore cet e-mail : rien ne sera relié.</p>")
            except Exception:  # noqa: BLE001
                pass
        return {**_vue_liaison(fi), "compte_trouve": bool(perso)}

    @api.post("/entreprise/liaison/accepter")
    async def ent_liaison_accepter(body: LiaisonOkIn, db: AsyncSession = Depends(get_db)):
        """Appelé connecté au compte PERSO : il faut que son e-mail soit bien celui indiqué."""
        uid = g["_uid"]()
        fi = (await db.execute(select(EntFiche).where(EntFiche.perso_jeton == body.jeton))).scalars().first()
        u = await db.get(g["User"], uid)
        if not fi or not u or (u.email or "").lower() != (fi.perso_email or ""):
            raise HTTPException(404, "Lien invalide ou destiné à un autre compte. Connecte-toi avec le compte perso indiqué.")
        fi.perso_user_id, fi.perso_jeton = uid, None
        if fi.notif_perso is None:
            fi.notif_perso = True
        await db.commit()
        org = await db.get(Organisation, fi.org_id)
        return {"ok": True, "entreprise": org.nom if org else ""}

    @api.put("/entreprise/liaison/notifs")
    async def ent_liaison_notifs(body: NotifPersoIn, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        fi = await db.get(EntFiche, m.id)
        if not fi or not fi.perso_user_id:
            raise HTTPException(409, "Relie d'abord ton compte perso.")
        fi.notif_perso = body.notif_perso
        await db.commit()
        return _vue_liaison(fi)

    @api.delete("/entreprise/liaison")
    async def ent_liaison_delier(db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        fi = await db.get(EntFiche, m.id)
        if fi:
            fi.perso_email = fi.perso_user_id = fi.perso_jeton = None
            fi.notif_perso = None
            await db.commit()
        return _vue_liaison(fi)

    # ── Radar de l'entreprise : les prospects du dirigeant, visibles de l'équipe s'il le partage (lecture seule) ──
    @api.get("/entreprise/radar")
    async def ent_radar(db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        if m.role == "partenaire":
            raise HTTPException(403, "Ton rôle ne permet pas cette action.")
        r = await db.get(EntReglage, m.org_id)
        if not (r and r.partage_radar):
            return {"partage": False, "prospects": []}
        RP = g.get("RadarProspect")
        prop = (await db.execute(select(EntMembre).where(EntMembre.org_id == m.org_id, EntMembre.role == "proprietaire"))).scalars().first()
        if RP is None or not prop or not prop.user_id:
            return {"partage": True, "prospects": []}
        rows = (await db.execute(select(RP).where(RP.user_id == prop.user_id).order_by(RP.jour.desc()).limit(60))).scalars().all()
        champs = ("prenom", "nom", "titre", "entreprise", "domaine", "ville", "email", "linkedin", "jour")
        return {"partage": True, "prospects": [{"id": p.id, **{k: getattr(p, k, None) for k in champs}} for p in rows]}

    # ── Contrats : visibles du titulaire du contrat et du propriétaire, personne d'autre (managers exclus) ───────────
    @api.get("/entreprise/contrats")
    async def ent_contrats(db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        q = select(EntContrat).where(EntContrat.org_id == m.org_id)
        if not peut(m.role, "lire_contrats"):
            q = q.where(EntContrat.membre_id == m.id)
        rows = (await db.execute(q)).scalars().all()
        autres = [r for r in rows if r.membre_id != m.id]
        if autres:
            await _journal(db, m, "lecture_contrats")
            await db.commit()
        return {"contrats": [{"id": r.id, "membre_id": r.membre_id, "titre": r.titre, "type": r.type, "debut": r.debut, "fin": r.fin, "detail": r.detail} for r in rows]}

    @api.post("/entreprise/contrats")
    async def ent_contrat_creer(body: ContratIn, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "gerer_contrats")
        await _membre(db, m, body.membre_id)
        c = EntContrat(org_id=m.org_id, membre_id=body.membre_id, titre=body.titre.strip(), type=body.type, debut=body.debut, fin=body.fin, detail=body.detail)
        db.add(c)
        await _journal(db, m, "contrat_cree", body.membre_id)
        await db.commit()
        return {"id": c.id}

    @api.delete("/entreprise/contrats/{contrat_id}")
    async def ent_contrat_supprimer(contrat_id: str, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "gerer_contrats")
        c = await db.get(EntContrat, contrat_id)
        if not c or c.org_id != m.org_id:
            raise HTTPException(404, "Introuvable.")
        await db.delete(c)
        await _journal(db, m, "contrat_supprime", c.membre_id)
        await db.commit()
        return {"ok": True}

    # ── N° de sécurité sociale : optionnel, désactivé par défaut, chiffré, journalisé ─────────────────────────────────
    @api.put("/entreprise/membres/{membre_id}/secu")
    async def ent_secu_ecrire(membre_id: str, body: SecuIn, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        if not await _secu_actif(db, m.org_id):
            raise HTTPException(403, "Le N° de sécurité sociale est désactivé pour cette entreprise.")
        if g.get("_fernet") is None:
            raise HTTPException(503, "Le chiffrement n'est pas configuré sur ce serveur : le N° de sécu n'est pas enregistré en clair.")
        if membre_id != m.id and not peut(m.role, "parametres"):
            raise HTTPException(403, "Ton rôle ne permet pas cette action.")
        c = await _membre(db, m, membre_id)
        if not secu_valide(body.numero):
            raise HTTPException(422, "Numéro invalide (15 chiffres avec la clé de contrôle).")
        c.secu_chiffre = g["_chiffrer"]("".join(ch for ch in body.numero if ch.isdigit()))
        await _journal(db, m, "secu_ecrit", c.id)
        await db.commit()
        return {"ok": True, "masque": masquer_secu(body.numero)}

    @api.get("/entreprise/membres/{membre_id}/secu")
    async def ent_secu_lire(membre_id: str, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        if not await _secu_actif(db, m.org_id):
            raise HTTPException(403, "Le N° de sécurité sociale est désactivé pour cette entreprise.")
        if membre_id != m.id and not peut(m.role, "parametres"):
            raise HTTPException(403, "Ton rôle ne permet pas cette action.")
        c = await _membre(db, m, membre_id)
        if not c.secu_chiffre:
            return {"numero": None}
        if c.id != m.id:
            await _journal(db, m, "secu_lu", c.id)
            await db.commit()
        n = g["_dechiffrer"](c.secu_chiffre)
        return {"numero": n, "masque": masquer_secu(n)}

    # ── Journal des accès, export et suppression (RGPD) ────────────────────────────────────────────────────────────
    @api.get("/entreprise/journal")
    async def ent_journal(db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "audit")
        rows = (await db.execute(select(EntJournal).where(EntJournal.org_id == m.org_id).order_by(EntJournal.created_at.desc()).limit(200))).scalars().all()
        return {"journal": [{"id": r.id, "acteur_id": r.acteur_id, "action": r.action, "cible_id": r.cible_id,
                             "le": r.created_at.isoformat() if r.created_at else None} for r in rows]}

    async def _donnees_membre(db, org_id: str, membre_id: str) -> dict:
        def lignes(rows, champs):
            return [{k: getattr(r, k) for k in champs} for r in rows]
        async def tous(cls):
            return (await db.execute(select(cls).where(cls.org_id == org_id, cls.membre_id == membre_id))).scalars().all()
        c = await db.get(EntMembre, membre_id)
        return {"fiche": {"nom": c.nom, "email": c.email, "role": c.role, "poste": c.poste, "type_contrat": c.type_contrat, "a_un_numero_de_secu": bool(c.secu_chiffre)},
                "presence": lignes(await tous(EntPresence), ("jour", "statut", "note")),
                "absences": lignes(await tous(EntAbsence), ("type", "debut", "fin", "motif", "statut")),
                "temps": lignes(await tous(EntTemps), ("jour", "heures", "projet", "note")),
                "pieces": lignes(await tous(EntPiece), ("titre", "statut", "reference")),
                "contrats": lignes(await tous(EntContrat), ("titre", "type", "debut", "fin", "detail")),
                "coordonnees": _vue_fiche(await db.get(EntFiche, membre_id))}

    @api.get("/entreprise/membres/{membre_id}/export")
    async def ent_export(membre_id: str, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        if membre_id != m.id and not peut(m.role, "supprimer_membre"):
            raise HTTPException(403, "Ton rôle ne permet pas cette action.")
        await _membre(db, m, membre_id)
        if membre_id != m.id:
            await _journal(db, m, "export", membre_id)
            await db.commit()
        return await _donnees_membre(db, m.org_id, membre_id)

    async def _effacer(db, org_id: str, membre_id: str) -> None:
        for cls in (EntPresence, EntAbsence, EntTemps, EntPiece, EntContrat):
            await db.execute(delete(cls).where(cls.org_id == org_id, cls.membre_id == membre_id))
        await db.execute(delete(EntPlanning).where(EntPlanning.org_id == org_id, EntPlanning.membre_id == membre_id))
        await db.execute(delete(EntFiche).where(EntFiche.org_id == org_id, EntFiche.membre_id == membre_id))
        await db.execute(delete(EntRemuneration).where(EntRemuneration.org_id == org_id, EntRemuneration.membre_id == membre_id))
        await db.execute(delete(EntVersement).where(EntVersement.org_id == org_id, EntVersement.membre_id == membre_id))
        await db.execute(delete(EntCommentaire).where(EntCommentaire.org_id == org_id, EntCommentaire.auteur_id == membre_id))
        await db.execute(delete(EntMembre).where(EntMembre.id == membre_id, EntMembre.org_id == org_id))

    @api.delete("/entreprise/membres/{membre_id}")
    async def ent_supprimer_membre(membre_id: str, db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        _exiger(m, "supprimer_membre")
        c = await _membre(db, m, membre_id)
        if c.role == "proprietaire":
            raise HTTPException(409, "Le propriétaire ne peut pas être supprimé.")
        await _effacer(db, m.org_id, c.id)
        await _journal(db, m, "membre_supprime", None)
        await db.commit()
        return {"ok": True}

    @api.delete("/entreprise/moi")
    async def ent_quitter(db: AsyncSession = Depends(get_db)):
        m = await _moi(db)
        if m.role == "proprietaire":
            raise HTTPException(409, "Le propriétaire ne quitte pas sa propre entreprise : supprime l'équipe depuis les paramètres.")
        await _effacer(db, m.org_id, m.id)
        await db.commit()
        return {"ok": True}

    # ── Aperçu pour le cockpit : l'équipe aujourd'hui, en un appel ─────────────────────────────────────────────────
    @api.get("/entreprise/apercu")
    async def ent_apercu(db: AsyncSession = Depends(get_db)):
        m = await _moi(db, exiger=False)
        if not m:
            return {"actif": False}
        auj = date.today().isoformat()
        membres = (await db.execute(select(EntMembre).where(EntMembre.org_id == m.org_id))).scalars().all()
        actifs = [c for c in membres if c.statut == "actif" and c.role != "partenaire"]
        pres = (await db.execute(select(EntPresence).where(EntPresence.org_id == m.org_id, EntPresence.jour == auj))).scalars().all()
        par = {s: 0 for s in STATUTS_PRESENCE}
        for p in pres:
            par[p.statut] = par.get(p.statut, 0) + 1
        ma = next((p.statut for p in pres if p.membre_id == m.id), None)
        out = {"actif": True, "role": m.role, "effectif": len(actifs), "invites": sum(1 for c in membres if c.statut == "invite"),
               "aujourdhui": par, "non_renseigne": max(0, len(actifs) - len(pres)), "ma_presence": ma}
        if peut(m.role, "decider_absence"):
            out["absences_a_decider"] = (await db.execute(select(func.count()).select_from(EntAbsence).where(
                EntAbsence.org_id == m.org_id, EntAbsence.statut == "demandee"))).scalar_one()
        if peut(m.role, "gerer_equipe"):
            out["pieces_a_verifier"] = (await db.execute(select(func.count()).select_from(EntPiece).where(
                EntPiece.org_id == m.org_id, EntPiece.statut == "fournie"))).scalar_one()
            out["plannings_a_regarder"] = (await db.execute(select(func.count()).select_from(EntPlanning).where(
                EntPlanning.org_id == m.org_id, EntPlanning.statut == "propose"))).scalar_one()
        out["pieces_a_fournir"] = (await db.execute(select(func.count()).select_from(EntPiece).where(
            EntPiece.org_id == m.org_id, EntPiece.membre_id == m.id, EntPiece.statut == "a_fournir"))).scalar_one()
        return out
