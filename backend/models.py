"""
models.py — Modèles SQLAlchemy (migration Mongo → SQL).

Un modèle par collection Mongo d'origine (server.py avant migration) :
factures, depenses, objectifs, rituels, humeur, settings, chat_messages.
Mêmes champs, mêmes types logiques — la migration ne change QUE la couche
de stockage, jamais la forme des données que le frontend reçoit (voir
server.py::clean_row pour la conversion ligne SQL → dict identique à
l'ancien document Mongo).
"""
import uuid
from datetime import datetime, timezone, date

from sqlalchemy import String, Float, Integer, Boolean, DateTime, Date, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Facture(Base):
    __tablename__ = "factures"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    client: Mapped[str] = mapped_column(String(200), nullable=False)
    reference: Mapped[str] = mapped_column(String(100), default="")
    montant: Mapped[float] = mapped_column(Float, nullable=False)
    statut: Mapped[str] = mapped_column(String(30), default="À envoyer")
    echeance: Mapped[str] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Depense(Base):
    __tablename__ = "depenses"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    libelle: Mapped[str] = mapped_column(String(200), nullable=False)
    categorie: Mapped[str] = mapped_column(String(60), default="Autre")
    montant: Mapped[float] = mapped_column(Float, nullable=False)
    date: Mapped[str] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Objectif(Base):
    __tablename__ = "objectifs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    titre: Mapped[str] = mapped_column(String(200), nullable=False)
    categorie: Mapped[str] = mapped_column(String(60), default="Liberté")
    description: Mapped[str] = mapped_column(Text, default="")
    valeur_actuelle: Mapped[float] = mapped_column(Float, default=0)
    valeur_cible: Mapped[float] = mapped_column(Float, default=100)
    unite: Mapped[str] = mapped_column(String(60), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Rituel(Base):
    __tablename__ = "rituels"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    nom: Mapped[str] = mapped_column(String(200), nullable=False)
    detail: Mapped[str] = mapped_column(String(300), default="")
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    streak: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Humeur(Base):
    __tablename__ = "humeur"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    date: Mapped[str] = mapped_column(String(20), default=lambda: date.today().isoformat())
    energie: Mapped[int] = mapped_column(Integer, default=70)
    humeur: Mapped[str] = mapped_column(String(30), default="Bien")
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Setting(Base):
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")


class ChatAttachment(Base):
    """Pièce jointe uploadée dans le chat (backlog : port du chat de final,
    version allégée sans facturation/crédits). Texte déjà extrait au moment
    de l'upload (PDF/Word/txt) — stocké une fois, jamais ré-extrait à
    chaque message pour ne pas payer le coût d'extraction à chaque tour."""
    __tablename__ = "chat_attachments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    session_id: Mapped[str] = mapped_column(String(100), default="default")
    filename: Mapped[str] = mapped_column(String(300), nullable=False)
    extracted_text: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class KpiSnapshot(Base):
    """Point d'historique réel de trésorerie (backlog : remplacer la courbe
    'Évolution de la trésorerie' — jusqu'ici générée par du bruit aléatoire
    autour de la valeur actuelle, `buildTrend()` côté frontend — par une
    vraie série temporelle). Un point par jour maximum, capturé à chaque
    calcul des KPIs."""
    __tablename__ = "kpi_snapshots"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    date: Mapped[str] = mapped_column(String(20), nullable=False)  # YYYY-MM-DD, une seule ligne par jour
    tresorerie: Mapped[float] = mapped_column(Float, default=0)
    chiffre_affaires: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    session_id: Mapped[str] = mapped_column(String(100), default="default")
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ChatUpload(Base):
    """Métadonnées des fichiers téléversés pour le copilote (chat). Le binaire
    est conservé localement dans backend/uploads ; la table ne stocke que les
    infos de rattachement et le texte déjà extrait."""
    __tablename__ = "chat_uploads"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(100), default="default", index=True)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    content_type: Mapped[str] = mapped_column(String(120), default="application/octet-stream")
    size: Mapped[int] = mapped_column(Integer, default=0)
    extracted_text: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CopilotDecision(Base):
    """Décision quotidienne proposée par le Copilote et validée explicitement
    par l'utilisateur. La mission (Rituel) créée est conservée pour assurer la
    traçabilité Vision → décision → action."""
    __tablename__ = "copilot_decisions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    session_id: Mapped[str] = mapped_column(String(100), default="default", index=True)
    decision_date: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    detail: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="pending")
    rituel_id: Mapped[str] = mapped_column(String(36), default="")
    reminder_date: Mapped[str] = mapped_column(String(20), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)


class WorkRequest(Base):
    """Demande envoyée via le module « Travailler avec l'équipe » du copilote."""
    __tablename__ = "work_requests"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    session_id: Mapped[str] = mapped_column(String(100), default="default", index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    channel: Mapped[str] = mapped_column(String(30), default="chat")
    contact: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class PushSubscription(Base):
    """Abonnement Web Push VAPID d'une session locale. Une session = un
    abonnement — un nouvel abonnement remplace l'ancien plutôt que de
    s'accumuler."""
    __tablename__ = "push_subscriptions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    session_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    subscription_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
