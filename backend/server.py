"""
server.py — MyExtension Business API (migration Mongo → SQL).

Migration demandée : passer le stockage de Mongo à SQL (la vraie base de
prod du projet), en gardant EXACTEMENT les mêmes routes et le même format
de réponse JSON qu'avant — donc le frontend (déjà validé, design gardé tel
quel) n'a besoin d'AUCUNE modification, il continue de fonctionner à
l'identique contre ce nouveau backend.

Ce qui a changé : la persistance (SQLAlchemy async au lieu de Motor/Mongo).
Ce qui n'a PAS changé : les chemins d'URL, les méthodes HTTP, la forme des
réponses JSON, la logique Kairos (IA), les seed data de démo.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.concurrency import run_in_threadpool
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import io
import re
import logging
import mimetypes
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from urllib.parse import quote_plus
from urllib.request import Request, urlopen
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional, List

from sqlalchemy import select, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
    LLM_CONNECTOR_AVAILABLE = True
except ImportError:
    # Le connecteur privé est fourni en production ; l’API SQL reste utilisable
    # dans la prévisualisation lorsque ce package n’est pas disponible.
    LlmChat = UserMessage = TextDelta = StreamDone = None
    LLM_CONNECTOR_AVAILABLE = False

from database import init_db, get_db
from models import (
    Facture, Depense, Objectif, Rituel, Humeur, Setting, ChatMessage, ChatAttachment,
    KpiSnapshot, ChatUpload, WorkRequest, CopilotDecision, utcnow,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")

from routes.push import push_router
from routes.agent_livraison import agent_livraison_loop


@app.on_event("startup")
async def on_startup():
    await init_db()
    import asyncio
    asyncio.create_task(agent_livraison_loop())


def row_to_dict(row) -> dict:
    """Convertit une ligne SQLAlchemy en dict — même forme que l'ancien
    document Mongo (mêmes clés, created_at en ISO string comme avant)."""
    d = {c.name: getattr(row, c.name) for c in row.__table__.columns}
    if hasattr(d.get("created_at"), "isoformat"):
        d["created_at"] = d["created_at"].isoformat()
    return d


# ----------------------------- Modèles d'entrée (inchangés) -----------------------------
class FactureCreate(BaseModel):
    client: str
    reference: str = ""
    montant: float
    statut: str = "À envoyer"
    echeance: Optional[str] = None


class DepenseCreate(BaseModel):
    libelle: str
    categorie: str = "Autre"
    montant: float
    date: Optional[str] = None


class ObjectifCreate(BaseModel):
    titre: str
    categorie: str = "Liberté"
    description: str = ""
    valeur_actuelle: float = 0
    valeur_cible: float = 100
    unite: str = ""


class RituelCreate(BaseModel):
    nom: str
    detail: str = ""


class HumeurCreate(BaseModel):
    energie: int = 70
    humeur: str = "Bien"
    note: str = ""


class SettingIn(BaseModel):
    key: str
    value: str


class ChatRequest(BaseModel):
    session_id: str = "default"
    message: str
    context: Optional[str] = None
    attachment_ids: List[str] = []


class CopilotDecisionApply(BaseModel):
    session_id: str = Field(default="default", max_length=100)
    decision: str = Field(min_length=1, max_length=20)


class CopilotChatRequest(BaseModel):
    """Demande du copilote (panneau de chat) pour un utilisateur local anonyme.
    Distinct de ChatRequest (utilisé par /kairos/chat, plus ancien) — même
    logique, mais avec pièces jointes persistées (chat_uploads) au lieu de
    chat_attachments."""
    session_id: str = Field(default="default", max_length=100)
    message: str = Field(min_length=1, max_length=12_000)
    context: Optional[str] = Field(default=None, max_length=2_000)
    upload_ids: list[str] = Field(default_factory=list, max_length=5)


class WorkRequestIn(BaseModel):
    session_id: str = Field(default="default", max_length=100)
    message: str = Field(min_length=1, max_length=4_000)
    channel: str = Field(default="chat", max_length=30)
    contact: str = Field(default="", max_length=255)


class ProfileIn(BaseModel):
    first_name: str


class RemindersIn(BaseModel):
    weekly_review: bool


class ActionExecuteIn(BaseModel):
    type: str
    title: str


# --- Paramètres du SaaS : prénom affiché + rappel hebdomadaire ---
# Réutilise la table `settings` (clé/valeur) déjà en place pour la vision —
# pas de nouvelle table pour 2 champs simples.
@api_router.get("/settings/profile")
async def get_profile(db: AsyncSession = Depends(get_db)):
    obj = await db.get(Setting, "profile_first_name")
    return {"first_name": obj.value if obj else ""}


@api_router.put("/settings/profile")
async def set_profile(input: ProfileIn, db: AsyncSession = Depends(get_db)):
    obj = await db.get(Setting, "profile_first_name")
    if obj:
        obj.value = input.first_name
    else:
        db.add(Setting(key="profile_first_name", value=input.first_name))
    await db.commit()
    return {"first_name": input.first_name}


@api_router.get("/settings/reminders")
async def get_reminders(db: AsyncSession = Depends(get_db)):
    obj = await db.get(Setting, "weekly_review_reminder")
    return {"weekly_review": (obj.value == "1") if obj else False}


@api_router.put("/settings/reminders")
async def set_reminders(input: RemindersIn, db: AsyncSession = Depends(get_db)):
    val = "1" if input.weekly_review else "0"
    obj = await db.get(Setting, "weekly_review_reminder")
    if obj:
        obj.value = val
    else:
        db.add(Setting(key="weekly_review_reminder", value=val))
    await db.commit()
    return {"weekly_review": input.weekly_review}


class InspirationImageIn(BaseModel):
    image_url: str


@api_router.get("/settings/inspiration")
async def get_inspiration(db: AsyncSession = Depends(get_db)):
    obj = await db.get(Setting, "inspiration_image")
    return {"image_url": obj.value if obj else ""}


@api_router.put("/settings/inspiration")
async def set_inspiration(input: InspirationImageIn, db: AsyncSession = Depends(get_db)):
    obj = await db.get(Setting, "inspiration_image")
    if obj:
        obj.value = input.image_url
    else:
        db.add(Setting(key="inspiration_image", value=input.image_url))
    await db.commit()
    return {"image_url": input.image_url}


# --- Factures ---
@api_router.get("/factures")
async def get_factures(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Facture).order_by(Facture.created_at.desc()))).scalars().all()
    return [row_to_dict(r) for r in rows]


@api_router.post("/factures")
async def create_facture(input: FactureCreate, db: AsyncSession = Depends(get_db)):
    obj = Facture(**input.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return row_to_dict(obj)


@api_router.put("/factures/{item_id}")
async def update_facture(item_id: str, input: FactureCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(Facture, item_id)
    if not obj:
        raise HTTPException(404, "Facture introuvable")
    for k, v in input.model_dump().items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return row_to_dict(obj)


@api_router.delete("/factures/{item_id}")
async def delete_facture(item_id: str, db: AsyncSession = Depends(get_db)):
    await db.execute(sa_delete(Facture).where(Facture.id == item_id))
    await db.commit()
    return {"ok": True}


# --- Dépenses ---
@api_router.get("/depenses")
async def get_depenses(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Depense).order_by(Depense.created_at.desc()))).scalars().all()
    return [row_to_dict(r) for r in rows]


@api_router.post("/depenses")
async def create_depense(input: DepenseCreate, db: AsyncSession = Depends(get_db)):
    obj = Depense(**input.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return row_to_dict(obj)


@api_router.put("/depenses/{item_id}")
async def update_depense(item_id: str, input: DepenseCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(Depense, item_id)
    if not obj:
        raise HTTPException(404, "Dépense introuvable")
    for k, v in input.model_dump().items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return row_to_dict(obj)


@api_router.delete("/depenses/{item_id}")
async def delete_depense(item_id: str, db: AsyncSession = Depends(get_db)):
    await db.execute(sa_delete(Depense).where(Depense.id == item_id))
    await db.commit()
    return {"ok": True}


# --- Objectifs (Vision) ---
@api_router.get("/objectifs")
async def get_objectifs(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Objectif).order_by(Objectif.created_at.desc()))).scalars().all()
    return [row_to_dict(r) for r in rows]


@api_router.post("/objectifs")
async def create_objectif(input: ObjectifCreate, db: AsyncSession = Depends(get_db)):
    obj = Objectif(**input.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return row_to_dict(obj)


@api_router.put("/objectifs/{item_id}")
async def update_objectif(item_id: str, input: ObjectifCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(Objectif, item_id)
    if not obj:
        raise HTTPException(404, "Objectif introuvable")
    for k, v in input.model_dump().items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return row_to_dict(obj)


@api_router.delete("/objectifs/{item_id}")
async def delete_objectif(item_id: str, db: AsyncSession = Depends(get_db)):
    await db.execute(sa_delete(Objectif).where(Objectif.id == item_id))
    await db.commit()
    return {"ok": True}


# --- Rituels (Bien-être) ---
@api_router.get("/rituels")
async def get_rituels(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Rituel).order_by(Rituel.created_at.desc()))).scalars().all()
    return [row_to_dict(r) for r in rows]


@api_router.post("/rituels")
async def create_rituel(input: RituelCreate, db: AsyncSession = Depends(get_db)):
    obj = Rituel(**input.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return row_to_dict(obj)


@api_router.put("/rituels/{item_id}/toggle")
async def toggle_rituel(item_id: str, db: AsyncSession = Depends(get_db)):
    obj = await db.get(Rituel, item_id)
    if not obj:
        raise HTTPException(404, "Rituel introuvable")
    new_done = not obj.done
    streak = obj.streak + (1 if new_done else -1 if obj.done else 0)
    obj.done = new_done
    obj.streak = max(0, streak)
    await db.commit()
    await db.refresh(obj)
    return row_to_dict(obj)


@api_router.delete("/rituels/{item_id}")
async def delete_rituel(item_id: str, db: AsyncSession = Depends(get_db)):
    await db.execute(sa_delete(Rituel).where(Rituel.id == item_id))
    await db.commit()
    return {"ok": True}


# --- Humeur / Énergie ---
@api_router.get("/humeur")
async def get_humeur(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Humeur).order_by(Humeur.created_at.desc()))).scalars().all()
    return [row_to_dict(r) for r in rows]


@api_router.post("/humeur")
async def create_humeur(input: HumeurCreate, db: AsyncSession = Depends(get_db)):
    obj = Humeur(**input.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return row_to_dict(obj)


# --- Vision text setting ---
@api_router.get("/vision")
async def get_vision(db: AsyncSession = Depends(get_db)):
    # Format enrichi pour le Vision Board Final-main ; la clé historique
    # `value` demeure présente pour l’Accueil Vision Cours-main.
    return await _vision_payload(db)


@api_router.put("/vision")
async def set_vision(input: SettingIn, db: AsyncSession = Depends(get_db)):
    obj = await db.get(Setting, "vision")
    if obj:
        obj.value = input.value
    else:
        db.add(Setting(key="vision", value=input.value))
    await db.commit()
    return {"value": input.value}


# ----------------------------- KPIs -----------------------------
async def _compute_kpis(db: AsyncSession):
    factures = (await db.execute(select(Facture))).scalars().all()
    depenses = (await db.execute(select(Depense))).scalars().all()
    ca = sum(f.montant for f in factures)
    encaisse = sum(f.montant for f in factures if f.statut == "Payée")
    en_retard = sum(f.montant for f in factures if f.statut == "En retard")
    total_depenses = sum(d.montant for d in depenses)
    tresorerie = round(encaisse - total_depenses, 2)
    resultat_net = round(ca - total_depenses, 2)
    marge = round((resultat_net / ca * 100), 1) if ca > 0 else 0
    return {
        "tresorerie": tresorerie,
        "chiffre_affaires": round(ca, 2),
        "marge_nette": marge,
        "resultat_net": resultat_net,
        "en_retard": round(en_retard, 2),
        "total_depenses": round(total_depenses, 2),
        "nb_factures": len(factures),
    }


@api_router.get("/kpis")
async def get_kpis(db: AsyncSession = Depends(get_db)):
    kpis = await _compute_kpis(db)
    await _record_kpi_snapshot(db, kpis)
    return kpis


async def _record_kpi_snapshot(db: AsyncSession, kpis: dict):
    """Un point d'historique par jour max — voir KpiSnapshot. Idempotent :
    rappelé à chaque GET /kpis mais n'écrit qu'une fois par jour civil."""
    from datetime import date as _date
    today = _date.today().isoformat()
    existing = (await db.execute(select(KpiSnapshot).where(KpiSnapshot.date == today))).scalar_one_or_none()
    if existing:
        existing.tresorerie = kpis["tresorerie"]
        existing.chiffre_affaires = kpis["chiffre_affaires"]
    else:
        db.add(KpiSnapshot(date=today, tresorerie=kpis["tresorerie"], chiffre_affaires=kpis["chiffre_affaires"]))
    await db.commit()


@api_router.get("/pilotage/tresorerie-history")
async def tresorerie_history(db: AsyncSession = Depends(get_db)):
    """Remplace l'ancienne courbe générée par bruit aléatoire (buildTrend()
    côté frontend) — vrais points capturés jour par jour, jamais inventés.
    Si l'historique est encore court (compte récent), la liste est courte
    et honnête plutôt que complétée avec de fausses valeurs."""
    rows = (await db.execute(select(KpiSnapshot).order_by(KpiSnapshot.date.asc()).limit(90))).scalars().all()
    return [{"date": r.date, "tresorerie": r.tresorerie, "chiffre_affaires": r.chiffre_affaires} for r in rows]


@api_router.get("/pilotage/decision")
async def get_decision(db: AsyncSession = Depends(get_db)):
    """La décision prioritaire du moment — dérivée de vraies données, jamais
    un texte générique. Renvoie null s'il n'y a vraiment rien à signaler
    (pas de decision inventée pour remplir la carte)."""
    kpis = await _compute_kpis(db)
    factures = (await db.execute(select(Facture).where(Facture.statut == "En retard"))).scalars().all()
    if factures:
        total = sum(f.montant for f in factures)
        return {
            "title": f"{len(factures)} facture{'s' if len(factures) > 1 else ''} en retard à relancer",
            "detail": f"{euro_fmt(total)} en attente — {', '.join(f.client for f in factures[:3])}"
                      + (f" et {len(factures) - 3} autre(s)" if len(factures) > 3 else ""),
            "severity": "high",
        }
    if kpis["marge_nette"] < 15 and kpis["chiffre_affaires"] > 0:
        return {
            "title": "Marge nette sous les 15 % — vos charges pèsent lourd",
            "detail": f"Marge actuelle : {kpis['marge_nette']}%. Revoir les dépenses récurrentes (SaaS, sous-traitance).",
            "severity": "medium",
        }
    if kpis["tresorerie"] < 0:
        return {
            "title": "Trésorerie négative — action requise",
            "detail": f"Trésorerie actuelle : {euro_fmt(kpis['tresorerie'])}.",
            "severity": "high",
        }
    return None


def euro_fmt(n: float) -> str:
    return f"{n:,.0f} €".replace(",", " ")


class SimulationIn(BaseModel):
    nb_contrats: int = 0
    montant_moyen: float = 0
    depenses_supplementaires: float = 0


@api_router.post("/pilotage/simulate")
async def simulate(input: SimulationIn, db: AsyncSession = Depends(get_db)):
    """Simulateur 'si je signe X contrats' — calcul déterministe sur les
    vrais KPIs actuels + les hypothèses saisies, jamais un chiffre inventé
    indépendamment des vraies données."""
    kpis = await _compute_kpis(db)
    revenu_additionnel = input.nb_contrats * input.montant_moyen
    projected_tresorerie = kpis["tresorerie"] + revenu_additionnel - input.depenses_supplementaires
    projected_ca = kpis["chiffre_affaires"] + revenu_additionnel
    projected_marge = round(((projected_ca - (kpis["total_depenses"] + input.depenses_supplementaires)) / projected_ca * 100), 1) if projected_ca > 0 else 0
    return {
        "current_tresorerie": kpis["tresorerie"],
        "projected_tresorerie": round(projected_tresorerie, 2),
        "projected_ca": round(projected_ca, 2),
        "projected_marge": projected_marge,
    }


@api_router.get("/pilotage/health-score")
async def health_score(db: AsyncSession = Depends(get_db)):
    """Score de santé financière — moyenne pondérée de 3 signaux réels :
    marge nette, trésorerie positive, retard de facturation. Formule
    simple et documentée plutôt qu'un score IA opaque."""
    kpis = await _compute_kpis(db)
    marge_score = max(0, min(100, kpis["marge_nette"] * 2.5))  # 40% marge = 100 pts
    tresorerie_score = 100 if kpis["tresorerie"] > 0 else max(0, 50 + kpis["tresorerie"] / 100)
    retard_score = 100 if kpis["en_retard"] == 0 else max(0, 100 - (kpis["en_retard"] / max(kpis["chiffre_affaires"], 1)) * 200)
    score = round((marge_score * 0.4 + tresorerie_score * 0.4 + retard_score * 0.2))
    return {
        "score": max(0, min(100, score)),
        "marge_score": round(marge_score),
        "tresorerie_score": round(tresorerie_score),
        "retard_score": round(retard_score),
    }


@api_router.get("/pilotage/export.csv")
async def export_csv(db: AsyncSession = Depends(get_db)):
    """Export comptable réel (format simple compatible import Pennylane/Indy) —
    factures + dépenses, toutes les lignes réellement en base."""
    import csv as _csv
    factures = (await db.execute(select(Facture))).scalars().all()
    depenses = (await db.execute(select(Depense))).scalars().all()
    buf = io.StringIO()
    writer = _csv.writer(buf, delimiter=";")
    writer.writerow(["Type", "Date", "Libellé/Client", "Catégorie/Référence", "Montant", "Statut"])
    for f in factures:
        writer.writerow(["Facture", f.echeance or "", f.client, f.reference, f.montant, f.statut])
    for d in depenses:
        writer.writerow(["Dépense", d.date or "", d.libelle, d.categorie, -d.montant, ""])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=export-comptable.csv"},
    )


# ----------------------------- Upload de fichiers (chat) -----------------------------
def _extract_text(filename: str, raw: bytes) -> str:
    """Extraction best-effort selon l'extension. Ne lève jamais d'exception —
    un fichier non supporté ou corrompu renvoie une chaîne vide plutôt que
    de faire planter l'upload."""
    ext = (filename.rsplit(".", 1)[-1] if "." in filename else "").lower()
    try:
        if ext == "pdf":
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(raw))
            return "\n".join((p.extract_text() or "") for p in reader.pages)[:20000]
        if ext == "docx":
            import docx
            doc = docx.Document(io.BytesIO(raw))
            return "\n".join(p.text for p in doc.paragraphs)[:20000]
        if ext in ("txt", "md", "csv"):
            return raw.decode("utf-8", errors="ignore")[:20000]
    except Exception as e:
        logging.warning(f"Extraction échouée pour {filename}: {e}")
    return ""


@api_router.post("/kairos/upload")
async def upload_attachment(file: UploadFile = File(...), session_id: str = "default", db: AsyncSession = Depends(get_db)):
    raw = await file.read()
    if len(raw) > 15 * 1024 * 1024:
        raise HTTPException(400, "Fichier trop volumineux (15 Mo max).")
    text = _extract_text(file.filename, raw)
    obj = ChatAttachment(session_id=session_id, filename=file.filename, extracted_text=text)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {
        "id": obj.id, "filename": obj.filename,
        "extracted": bool(text),
        "preview": text[:200] if text else "",
    }


@api_router.get("/kairos/attachments")
async def list_attachments(session_id: str = "default", db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(ChatAttachment).where(ChatAttachment.session_id == session_id).order_by(ChatAttachment.created_at.desc())
    )).scalars().all()
    return [{"id": r.id, "filename": r.filename, "extracted": bool(r.extracted_text)} for r in rows]


# ----------------------------- Kairos AI -----------------------------
KAIROS_SYSTEM = (
    "Tu es Kairos, le copilote IA de l'application MyExtension Business, une extension "
    "business pour solopreneurs et entrepreneurs. Ton rôle est d'aider à passer 'de la vision "
    "à l'action'. Tu es à la fois un DAF (directeur financier) lucide, un coach de vision et un "
    "coach de mindset bienveillant mais exigeant. Beaucoup d'entrepreneurs abandonnent leur vision "
    "à cause d'un mauvais mindset : ton rôle est aussi de les remotiver, de casser la procrastination "
    "et de proposer une prochaine action concrète. Réponds toujours en français, de façon concise, "
    "structurée, chaleureuse et orientée action.\n\n"
    "Quand une prochaine action concrète et unique se dégage clairement de la conversation "
    "(ex: créer un rituel, ajouter un objectif), termine ta réponse par une ligne EXACTEMENT au "
    "format suivant (rien après sur cette ligne) :\n"
    "ACTION: <type=rituel|objectif> | <titre court de l'action>\n"
    "N'ajoute cette ligne que si l'action est vraiment claire et unique — sinon ne l'ajoute pas du tout."
)

ACTION_LINE_RE = re.compile(r"^ACTION:\s*<?type=(rituel|objectif)>?\s*\|\s*(.+)$", re.MULTILINE)


def _extract_action_card(full_text: str):
    """Repère la ligne ACTION: en fin de réponse (voir KAIROS_SYSTEM) et la
    sépare du texte affiché — l'utilisateur ne doit jamais voir la ligne
    brute, seulement la carte d'action rendue par le frontend."""
    m = ACTION_LINE_RE.search(full_text)
    if not m:
        return full_text, None
    clean_text = full_text[:m.start()].rstrip()
    return clean_text, {"type": m.group(1), "title": m.group(2).strip()}


async def kairos_context(db: AsyncSession, attachment_ids: List[str] = None):
    kpis = await _compute_kpis(db)
    objectifs = (await db.execute(select(Objectif).limit(50))).scalars().all()
    humeurs = (await db.execute(select(Humeur).order_by(Humeur.created_at.desc()).limit(1))).scalars().all()
    energie = humeurs[0].energie if humeurs else None
    ctx = (
        f"Contexte utilisateur actuel — Trésorerie: {kpis['tresorerie']}€, CA: {kpis['chiffre_affaires']}€, "
        f"Marge nette: {kpis['marge_nette']}%, Résultat net: {kpis['resultat_net']}€, "
        f"Factures en retard: {kpis['en_retard']}€. "
    )
    if objectifs:
        ctx += "Objectifs de vision: " + "; ".join(
            f"{o.titre} ({o.valeur_actuelle}/{o.valeur_cible} {o.unite})" for o in objectifs
        ) + ". "
    if energie is not None:
        ctx += f"Niveau d'énergie déclaré: {energie}/100."

    profile = await db.get(Setting, "profile_first_name")
    if profile and profile.value:
        ctx += f" Prénom de l'utilisateur : {profile.value}."

    if attachment_ids:
        rows = (await db.execute(
            select(ChatAttachment).where(ChatAttachment.id.in_(attachment_ids))
        )).scalars().all()
        for r in rows:
            if r.extracted_text:
                ctx += f"\n\n[Document joint « {r.filename} »]\n{r.extracted_text[:4000]}"
    return ctx


@api_router.post("/kairos/chat")
async def kairos_chat(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    ctx = await kairos_context(db, req.attachment_ids)
    system = KAIROS_SYSTEM + "\n\n" + ctx
    if req.context:
        system += "\n\nFocus de la page actuelle: " + req.context

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=req.session_id,
        system_message=system,
    ).with_model("openai", "gpt-5.4")

    db.add(ChatMessage(session_id=req.session_id, role="user", content=req.message))
    await db.commit()

    async def event_generator():
        full = ""
        try:
            async for event in chat.stream_message(UserMessage(text=req.message)):
                if isinstance(event, TextDelta):
                    full += event.content
                    yield event.content
                elif isinstance(event, StreamDone):
                    break
        except Exception as e:
            logging.error(f"Kairos stream error: {e}")
            if not full:
                yield "Désolé, une erreur est survenue avec Kairos. Réessaie dans un instant."
        finally:
            if full:
                clean_text, action = _extract_action_card(full)
                # Marqueur de fin de flux : le frontend le détecte et l'enlève
                # de l'affichage — voir KairosPanel.jsx::send(). Le texte réel
                # stocké en base est déjà nettoyé de la ligne ACTION brute.
                if action:
                    import json as _json
                    yield f"\n\u241e ACTION_CARD \u241e{_json.dumps(action)}"
                from database import async_session_factory
                async with async_session_factory() as db2:
                    db2.add(ChatMessage(session_id=req.session_id, role="assistant", content=clean_text))
                    await db2.commit()

    return StreamingResponse(
        event_generator(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@api_router.post("/kairos/execute-action")
async def execute_action(input: ActionExecuteIn, db: AsyncSession = Depends(get_db)):
    """Exécute la carte d'action proposée par Kairos en fin de réponse
    (voir _extract_action_card) — un clic pour transformer une suggestion
    IA en vraie donnée, plutôt qu'un texte qu'il faut recopier à la main."""
    if input.type == "rituel":
        obj = Rituel(nom=input.title)
    elif input.type == "objectif":
        obj = Objectif(titre=input.title)
    else:
        raise HTTPException(400, "Type d'action inconnu")
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return row_to_dict(obj)


@api_router.get("/kairos/history")
async def kairos_history(session_id: str = "default", db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).limit(200)
    )).scalars().all()
    return [row_to_dict(r) for r in rows]


# ----------------------------- Seed -----------------------------
@api_router.post("/seed")
async def seed(db: AsyncSession = Depends(get_db)):
    for model in [Facture, Depense, Objectif, Rituel, Humeur, Setting, ChatMessage]:
        await db.execute(sa_delete(model))

    db.add_all([
        Facture(client="ACME Corp", reference="FAC-2026-045", montant=1850, statut="En retard", echeance="2026-05-28"),
        Facture(client="DeltaTech", reference="FAC-2026-046", montant=1350, statut="En retard", echeance="2026-05-10"),
        Facture(client="Brightmind", reference="FAC-2026-047", montant=2200, statut="À envoyer", echeance="2026-06-16"),
        Facture(client="Neovision", reference="FAC-2026-048", montant=3600, statut="Payée", echeance="2026-05-05"),
        Facture(client="Studio Nord", reference="FAC-2026-049", montant=4200, statut="Payée", echeance="2026-04-22"),
        Facture(client="Loop Agency", reference="FAC-2026-050", montant=5100, statut="Payée", echeance="2026-04-11"),
    ])

    db.add_all([
        Depense(libelle="HubSpot", categorie="SaaS", montant=120, date="2026-05-28"),
        Depense(libelle="Google Ads", categorie="Marketing", montant=450, date="2026-05-27"),
        Depense(libelle="Figma", categorie="Outils", montant=36, date="2026-05-26"),
        Depense(libelle="Notion", categorie="SaaS", montant=89, date="2026-05-25"),
        Depense(libelle="Freelance design", categorie="Sous-traitance", montant=800, date="2026-05-20"),
    ])

    db.add_all([
        Objectif(titre="Liberté géographique", categorie="Liberté", description="Travailler d'où je veux", valeur_actuelle=2, valeur_cible=4, unite="j/sem libres"),
        Objectif(titre="Aider les entrepreneurs", categorie="Impact", description="Impacter des vies", valeur_actuelle=3420, valeur_cible=10000, unite="entrepreneurs"),
        Objectif(titre="Équipe solide", categorie="Entreprise", description="Structurer l'entreprise", valeur_actuelle=3, valeur_cible=5, unite="collaborateurs"),
        Objectif(titre="Marge nette", categorie="Finance", description="Rentabilité saine", valeur_actuelle=24, valeur_cible=30, unite="% marge"),
    ])

    db.add_all([
        Rituel(nom="Pause déjeuner sans écran", detail="30 min", done=True, streak=5),
        Rituel(nom="Activité physique", detail="20 min", done=True, streak=3),
        Rituel(nom="Focus profond", detail="2 blocs de 90 min", done=False, streak=2),
        Rituel(nom="Respiration / méditation", detail="5 min", done=True, streak=8),
        Rituel(nom="Écrire 1 victoire du jour", detail="Anti-abandon", done=False, streak=1),
    ])

    db.add(Humeur(energie=82, humeur="Motivé", note="Bonne dynamique"))
    db.add(Setting(key="vision", value="Construire une entreprise libre, rentable et qui a un impact. Liberté. Impact. Croissance."))

    await db.commit()
    return {"ok": True, "message": "Données de démo initialisées"}


# ----------------------------- Vision : SWOT réel + Vision Document + pilier→action -----------------------------
async def _build_vision_prompt_context(db: AsyncSession) -> str:
    objectifs = (await db.execute(select(Objectif))).scalars().all()
    kpis = await _compute_kpis(db)
    vision = await db.get(Setting, "vision")
    ctx = f"Vision de l'entrepreneur : {vision.value if vision else 'non renseignée'}.\n"
    if objectifs:
        ctx += "Objectifs (piliers stratégiques) : " + "; ".join(
            f"{o.titre} [{o.categorie}] — {o.valeur_actuelle}/{o.valeur_cible} {o.unite}" for o in objectifs
        ) + ".\n"
    ctx += f"Chiffres réels : CA {kpis['chiffre_affaires']}€, marge nette {kpis['marge_nette']}%, trésorerie {kpis['tresorerie']}€."
    return ctx


async def _ai_json(system: str, prompt: str) -> dict:
    """Appel LLM en sortie JSON stricte — utilisé pour SWOT et Vision Document.
    Best-effort : renvoie None si le modèle ne répond pas un JSON exploitable,
    plutôt que de planter ou d'inventer un contenu de repli."""
    import json as _json
    text = await _ai_collect(system, prompt, session_id="vision-analysis")
    if not text:
        return None
    match = re.search(r"\{.*\}", text, re.DOTALL)
    try:
        return _json.loads(match.group(0)) if match else None
    except Exception:
        return None


async def _ai_collect(system: str, prompt: str, session_id: str) -> str:
    """Collecte l'intégralité d'une réponse LLM via stream_message — seule
    méthode confirmée disponible sur LlmChat dans cette base de code (utilisée
    partout ailleurs pour le chat). Pas de pari sur une méthode non-streaming
    qui pourrait ne pas exister dans cette version de la librairie."""
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system).with_model("openai", "gpt-5.4")
    full = ""
    try:
        async for event in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(event, TextDelta):
                full += event.content
            elif isinstance(event, StreamDone):
                break
    except Exception as e:
        logging.warning(f"_ai_collect failed: {e}")
        return ""
    return full


@api_router.get("/vision/swot")
async def get_swot(db: AsyncSession = Depends(get_db)):
    cached = await db.get(Setting, "swot_cache")
    generated_at = await db.get(Setting, "swot_generated_at")
    if not cached or not cached.value:
        return {"swot": None, "generated_at": None}
    import json as _json
    return {"swot": _json.loads(cached.value), "generated_at": generated_at.value if generated_at else None}


@api_router.post("/vision/swot/generate")
async def generate_swot(db: AsyncSession = Depends(get_db)):
    """Remplace l'ancien SWOT codé en dur (identique pour tous les comptes) —
    généré par l'IA à partir des vraies données de l'utilisateur. Si l'appel
    échoue, on ne fabrique pas un SWOT de repli : on renvoie une erreur claire."""
    ctx = await _build_vision_prompt_context(db)
    system = (
        "Tu es un consultant en stratégie d'entreprise. Génère un SWOT réaliste et "
        "spécifique à partir du contexte fourni — jamais de généralités qui pourraient "
        "s'appliquer à n'importe quelle entreprise. Réponds UNIQUEMENT en JSON strict, "
        "format exact : {\"Forces\": [...], \"Faiblesses\": [...], \"Opportunités\": [...], \"Menaces\": [...]}, "
        "3 items maximum par catégorie, en français, chaque item très court (5-8 mots)."
    )
    result = await _ai_json(system, ctx)
    if not result:
        raise HTTPException(503, "Analyse indisponible pour le moment — réessayez.")
    import json as _json
    now = utcnow().isoformat()
    for key, value in [("swot_cache", _json.dumps(result)), ("swot_generated_at", now)]:
        obj = await db.get(Setting, key)
        if obj:
            obj.value = value
        else:
            db.add(Setting(key=key, value=value))
    await db.commit()
    return {"swot": result, "generated_at": now}


@api_router.get("/vision/document")
async def get_vision_document(db: AsyncSession = Depends(get_db)):
    obj = await db.get(Setting, "vision_document")
    generated_at = await db.get(Setting, "vision_document_generated_at")
    return {"content": obj.value if obj else None, "generated_at": generated_at.value if generated_at else None}


@api_router.post("/vision/document/generate")
async def generate_vision_document(db: AsyncSession = Depends(get_db)):
    """« Vision Document » — plan à 30 jours généré par l'IA à partir de la
    vision et des objectifs réels de l'utilisateur (pas un modèle générique)."""
    ctx = await _build_vision_prompt_context(db)
    system = (
        "Tu es Kairos, coach de vision et de mindset. À partir du contexte fourni, "
        "rédige un plan d'action concret sur 30 jours (3-4 phases, quelques actions "
        "par phase) pour rapprocher l'entrepreneur de sa vision. Ton chaleureux, "
        "orienté action, en français. Format markdown simple (titres ## et listes à puces)."
    )
    content = await _ai_collect(system, ctx, session_id="vision-document")
    if not content:
        raise HTTPException(503, "Génération indisponible pour le moment — réessayez.")
    now = utcnow().isoformat()
    for key, value in [("vision_document", content), ("vision_document_generated_at", now)]:
        obj = await db.get(Setting, key)
        if obj:
            obj.value = value
        else:
            db.add(Setting(key=key, value=value))
    await db.commit()
    return {"content": content, "generated_at": now}


@api_router.post("/objectifs/{item_id}/to-action")
async def objectif_to_action(item_id: str, db: AsyncSession = Depends(get_db)):
    """Pilier stratégique → action concrète : crée un rituel de suivi pour
    cet objectif (même geste que les cartes d'action du chat Kairos)."""
    obj = await db.get(Objectif, item_id)
    if not obj:
        raise HTTPException(404, "Objectif introuvable")
    rituel = Rituel(nom=f"Avancer sur : {obj.titre}", detail="Créé depuis un pilier stratégique")
    db.add(rituel)
    await db.commit()
    await db.refresh(rituel)
    return row_to_dict(rituel)


# ----------------------------- Copilote — panneau de chat complet -----------------------------
# Porté depuis le SaaS "final" (routes/chat_routes.py), adapté au modèle
# session-unique de Cours (pas de compte utilisateur, pas de crédits, pas de
# paiement) : upload persistant avec extraction, mémoire de conversation par
# session, brief du jour fondé sur les vraies données, veille RSS, demande
# "travailler avec l'équipe".

COPILOT_SYSTEM = (
    "Tu es le copilote IA de MyExtension Business, au service de solopreneurs et "
    "d'entrepreneurs. Aide à transformer une vision en actions concrètes. Tu combines "
    "une lecture lucide des finances, du coaching de vision et du soutien mindset. "
    "Réponds toujours en français, avec chaleur, brièveté et clarté. Quand c'est utile, "
    "termine par une seule prochaine action réalisable aujourd'hui."
)
CHAT_UPLOADS_DIR = ROOT_DIR / "uploads"
CHAT_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_CHAT_UPLOADS = {".txt", ".md", ".csv", ".json", ".pdf", ".docx", ".png", ".jpg", ".jpeg", ".webp"}
MAX_CHAT_UPLOAD_SIZE = 10 * 1024 * 1024


async def copilote_context(db: AsyncSession) -> str:
    """Construit le contexte métier strictement nécessaire au copilote."""
    kpis = await _compute_kpis(db)
    objectifs = (await db.execute(select(Objectif).limit(50))).scalars().all()
    humeurs = (await db.execute(select(Humeur).order_by(Humeur.created_at.desc()).limit(1))).scalars().all()
    energie = humeurs[0].energie if humeurs else None
    ctx = (
        f"Contexte actuel — Trésorerie : {kpis['tresorerie']} €, CA : {kpis['chiffre_affaires']} €, "
        f"Marge nette : {kpis['marge_nette']} %, Résultat net : {kpis['resultat_net']} €, "
        f"Factures en retard : {kpis['en_retard']} €. "
    )
    if objectifs:
        ctx += "Objectifs : " + "; ".join(
            f"{o.titre} ({o.valeur_actuelle}/{o.valeur_cible} {o.unite})" for o in objectifs
        ) + ". "
    if energie is not None:
        ctx += f"Énergie déclarée : {energie}/100."
    return ctx


def _extract_chat_upload_text(file_path: Path, extension: str) -> str:
    """Extrait au plus 12 000 caractères sans traiter de contenu exécutable."""
    try:
        if extension in {".txt", ".md", ".csv", ".json"}:
            return file_path.read_text(encoding="utf-8", errors="replace")[:12_000]
        if extension == ".pdf":
            try:
                from pypdf import PdfReader
                return "\n".join(page.extract_text() or "" for page in PdfReader(str(file_path)).pages)[:12_000]
            except Exception:
                return "[PDF joint : le texte n'a pas pu être extrait.]"
        if extension == ".docx":
            try:
                import docx
                return "\n".join(p.text for p in docx.Document(str(file_path)).paragraphs if p.text.strip())[:12_000]
            except Exception:
                return "[Document Word joint : le texte n'a pas pu être extrait.]"
        if extension in {".png", ".jpg", ".jpeg", ".webp"}:
            return "[Image jointe : elle est disponible comme référence, mais l'analyse visuelle n'est pas activée dans ce MVP.]"
    except Exception as error:
        logging.warning("Extraction de fichier impossible : %s", error)
    return "[Pièce jointe disponible, sans texte extractible.]"


@api_router.post("/chat/uploads")
async def chat_upload(
    file: UploadFile = File(...),
    session_id: str = "default",
    db: AsyncSession = Depends(get_db),
):
    """Téléverse une pièce jointe du chat pour un utilisateur local anonyme."""
    original_name = Path(file.filename or "document").name
    extension = Path(original_name).suffix.lower()
    if extension not in ALLOWED_CHAT_UPLOADS:
        raise HTTPException(400, "Format non pris en charge. Utilisez un fichier texte, PDF, Word, CSV, JSON ou une image.")

    content = await file.read(MAX_CHAT_UPLOAD_SIZE + 1)
    if not content:
        raise HTTPException(400, "Le fichier est vide.")
    if len(content) > MAX_CHAT_UPLOAD_SIZE:
        raise HTTPException(400, "Le fichier dépasse la limite de 10 Mo.")

    stored_name = f"{uuid.uuid4()}{extension}"
    file_path = CHAT_UPLOADS_DIR / stored_name
    await run_in_threadpool(file_path.write_bytes, content)
    extracted_text = await run_in_threadpool(_extract_chat_upload_text, file_path, extension)
    upload = ChatUpload(
        user_id=session_id,
        original_name=original_name,
        stored_name=stored_name,
        content_type=file.content_type or mimetypes.guess_type(original_name)[0] or "application/octet-stream",
        size=len(content),
        extracted_text=extracted_text,
    )
    db.add(upload)
    await db.commit()
    await db.refresh(upload)
    return {"id": upload.id, "name": upload.original_name, "size": upload.size, "extractable": bool(upload.extracted_text)}


@api_router.get("/chat/uploads/{upload_id}")
async def get_chat_upload(upload_id: str, session_id: str = "default", db: AsyncSession = Depends(get_db)):
    """Télécharge un fichier uniquement depuis la même session locale."""
    upload = await db.get(ChatUpload, upload_id)
    if not upload or upload.user_id != session_id:
        raise HTTPException(404, "Pièce jointe introuvable.")
    path = CHAT_UPLOADS_DIR / upload.stored_name
    if not path.is_file():
        raise HTTPException(404, "Fichier introuvable.")
    return FileResponse(path, media_type=upload.content_type, filename=upload.original_name)


async def _chat_upload_context(upload_ids: list, session_id: str, db: AsyncSession):
    """Récupère exclusivement les pièces jointes de la session courante."""
    if not upload_ids:
        return "", []
    rows = (await db.execute(
        select(ChatUpload).where(ChatUpload.id.in_(upload_ids), ChatUpload.user_id == session_id)
    )).scalars().all()
    by_id = {row.id: row for row in rows}
    missing = [upload_id for upload_id in upload_ids if upload_id not in by_id]
    if missing:
        raise HTTPException(404, "Une ou plusieurs pièces jointes sont introuvables.")
    labels = [f"📎 {by_id[upload_id].original_name}" for upload_id in upload_ids]
    parts = [f"Document joint — {by_id[upload_id].original_name}:\n{by_id[upload_id].extracted_text}" for upload_id in upload_ids]
    return "\n\n".join(parts), labels


@api_router.post("/chat/messages")
async def chat_message(req: CopilotChatRequest, db: AsyncSession = Depends(get_db)):
    """Réponse streaming du copilote avec mémoire par session locale anonyme."""
    context = await copilote_context(db)
    system = COPILOT_SYSTEM + "\n\n" + context
    if req.context:
        system += "\n\nSection ouverte : " + req.context
    upload_context, attachment_labels = await _chat_upload_context(req.upload_ids, req.session_id, db)
    prompt = req.message.strip()
    if upload_context:
        prompt += "\n\n" + upload_context

    # La prévisualisation Cours-main peut être exécutée sans le connecteur IA
    # de production. Dans ce cas, le chat reste honnête et ne renvoie jamais
    # une erreur 500 à l’utilisateur.
    if LlmChat is None:
        async def unavailable_generator():
            yield "Le Copilote IA n’est pas configuré dans cette prévisualisation. Les données Vision, les cartes d’action et l’historique restent disponibles ; activez le connecteur IA de production pour obtenir une réponse conversationnelle."
        return StreamingResponse(unavailable_generator(), media_type="text/plain", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=req.session_id,
        system_message=system,
    ).with_model("openai", "gpt-5.4")
    display_message = req.message.strip()
    if attachment_labels:
        display_message += "\n" + "\n".join(attachment_labels)
    db.add(ChatMessage(session_id=req.session_id, role="user", content=display_message))
    await db.commit()

    async def event_generator():
        full = ""
        try:
            async for event in chat.stream_message(UserMessage(text=prompt)):
                if isinstance(event, TextDelta):
                    full += event.content
                    yield event.content
                elif isinstance(event, StreamDone):
                    break
        except Exception as error:
            logging.error("Erreur de streaming du copilote : %s", error)
            if not full:
                full = "Désolé, une erreur est survenue. Réessaie dans un instant."
                yield full
        finally:
            if full:
                from database import async_session_factory
                async with async_session_factory() as db2:
                    db2.add(ChatMessage(session_id=req.session_id, role="assistant", content=full))
                    await db2.commit()

    return StreamingResponse(event_generator(), media_type="text/plain", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api_router.get("/chat/messages")
async def chat_history(session_id: str = "default", db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).limit(200)
    )).scalars().all()
    return [row_to_dict(row) for row in rows]


async def _fetch_news_items(query: str) -> list:
    """Lit un flux RSS public sans exécuter ni interpréter son contenu."""
    def fetch() -> list:
        url = f"https://news.google.com/rss/search?q={quote_plus(query)}&hl=fr&gl=FR&ceid=FR:fr"
        request = Request(url, headers={"User-Agent": "CoursMainCopilot/1.0"})
        with urlopen(request, timeout=8) as response:
            root_xml = ET.fromstring(response.read())
        items = []
        for item in root_xml.findall("./channel/item")[:6]:
            title = (item.findtext("title") or "Actualité").strip()
            link = (item.findtext("link") or "").strip()
            source = (item.findtext("source") or "").strip()
            published = (item.findtext("pubDate") or "").strip()
            if title and link:
                items.append({"title": title, "url": link, "source": source, "published": published})
        return items

    try:
        return await run_in_threadpool(fetch)
    except Exception as error:
        logging.warning("Veille indisponible : %s", error)
        return []


async def _summarize_news(items: list, session_id: str) -> str:
    if not items:
        return ""
    headlines = "\n".join(f"- {item['title']}" for item in items)
    prompt = (
        "Voici des titres d'actualité. Rédige une synthèse utile pour un entrepreneur français "
        "en trois ou quatre puces courtes et factuelles. Termine par « À retenir : » suivi d'une "
        f"action concrète. N'invente rien au-delà des titres.\n\n{headlines}"
    )
    full = ""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"{session_id}-news-{datetime.now(timezone.utc).date().isoformat()}",
            system_message="Tu es un veilleur économique factuel pour entrepreneurs français.",
        ).with_model("openai", "gpt-5.4")
        async for event in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(event, TextDelta):
                full += event.content
            elif isinstance(event, StreamDone):
                break
    except Exception as error:
        logging.warning("Synthèse de veille indisponible : %s", error)
    return full.strip() or "\n".join(f"• {item['title']}" for item in items)


@api_router.get("/chat/brief")
async def chat_brief(session_id: str = "default", db: AsyncSession = Depends(get_db)):
    """Le point du jour du panneau droit, fondé sur les données réelles du SaaS."""
    kpis = await _compute_kpis(db)
    objectifs = (await db.execute(select(Objectif).limit(50))).scalars().all()
    humeurs = (await db.execute(select(Humeur).order_by(Humeur.created_at.desc()).limit(1))).scalars().all()
    ca_objectif = sum(max(0, objectif.valeur_cible) for objectif in objectifs if objectif.unite in {"€", "EUR", "euros"})
    ca_progress = round(min(100, (kpis["chiffre_affaires"] / ca_objectif * 100))) if ca_objectif else 0
    total_objectifs = len(objectifs)
    alignement = round(sum(
        min(100, (objectif.valeur_actuelle / objectif.valeur_cible * 100)) if objectif.valeur_cible else 0
        for objectif in objectifs
    ) / total_objectifs) if total_objectifs else 0
    next_step = ""
    if kpis["en_retard"] > 0:
        next_step = "Relancer la facture la plus en retard."
    elif objectifs:
        next_step = f"Faire avancer l'objectif « {objectifs[0].titre} » aujourd'hui."
    else:
        next_step = "Définir une priorité concrète pour aujourd'hui."
    return {
        "user": {"first_name": ""},
        "ca_month": kpis["chiffre_affaires"],
        "ca_objective": ca_objectif,
        "pilotage": {"progress_percent": ca_progress},
        "energy_score": humeurs[0].energie if humeurs else 0,
        "bien_etre_label": humeurs[0].humeur if humeurs else "À renseigner",
        "prospects_total": 0,
        "prospects_active": 0,
        "vision": {"alignment_percent": alignement, "next_step": next_step},
    }


def _copilot_decision_payload(row: CopilotDecision) -> dict:
    return {
        "id": row.id,
        "title": row.title,
        "detail": row.detail,
        "status": row.status,
        "rituel_id": row.rituel_id,
        "reminder_date": row.reminder_date,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "decided_at": row.decided_at.isoformat() if row.decided_at else None,
    }


@api_router.get("/chat/decision")
async def get_copilot_decision(session_id: str = "default", db: AsyncSession = Depends(get_db)):
    """Une décision quotidienne, basée sur le même prochain pas réel que le brief.
    Elle est créée une seule fois par session et par jour."""
    today = datetime.now(timezone.utc).date().isoformat()
    row = (await db.execute(select(CopilotDecision).where(
        CopilotDecision.session_id == session_id,
        CopilotDecision.decision_date == today,
    ).order_by(CopilotDecision.created_at.desc()).limit(1))).scalars().first()
    if row:
        return _copilot_decision_payload(row)
    brief = await chat_brief(session_id=session_id, db=db)
    next_step = brief.get("vision", {}).get("next_step") or "Définir une priorité concrète pour aujourd'hui."
    row = CopilotDecision(
        session_id=session_id,
        decision_date=today,
        title=next_step,
        detail="Décision proposée à partir de votre Vision, de vos KPI et du point du jour.",
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _copilot_decision_payload(row)


@api_router.post("/chat/decision/{decision_id}")
async def apply_copilot_decision(decision_id: str, input: CopilotDecisionApply, db: AsyncSession = Depends(get_db)):
    """Valide ou reporte explicitement une décision Copilote.
    Une validation crée un Rituel réel ; un report conserve la date de rappel."""
    row = await db.get(CopilotDecision, decision_id)
    if not row or row.session_id != input.session_id:
        raise HTTPException(404, "Décision Copilote introuvable")
    if input.decision not in {"approve", "defer"}:
        raise HTTPException(400, "Décision invalide")
    if row.status == "approved":
        return {**_copilot_decision_payload(row), "message": "Cette action est déjà créée dans vos missions."}
    if input.decision == "approve":
        rituel = Rituel(nom=row.title, detail="Créé après approbation d’une décision Copilote")
        db.add(rituel)
        await db.flush()
        row.status = "approved"
        row.rituel_id = rituel.id
        row.reminder_date = ""
        message = "Action créée dans vos missions. Vous pourrez la cocher depuis Bien-être."
    else:
        row.status = "deferred"
        row.reminder_date = datetime.now(timezone.utc).date().isoformat()
        message = "Décision reportée. Elle restera visible dans votre point du jour."
    row.decided_at = utcnow()
    await db.commit()
    await db.refresh(row)
    return {**_copilot_decision_payload(row), "message": message}


@api_router.get("/chat/news-digest")
async def chat_news_digest(session_id: str = "default"):
    """Veille sectorielle du copilote avec sources cliquables."""
    items = await _fetch_news_items("entrepreneuriat PME France")
    if not items:
        return {"ok": False, "digest": "Impossible de récupérer l'actualité pour le moment.", "sources": []}
    digest = await _summarize_news(items, session_id)
    return {"ok": True, "digest": digest, "sources": items}


@api_router.get("/chat/config")
async def chat_config():
    """Configuration publique réduite du panneau de chat."""
    return {"whatsapp_url": os.environ.get("TEAM_WHATSAPP_URL", "").strip()}


@api_router.post("/chat/work-request")
async def chat_work_request(body: WorkRequestIn, db: AsyncSession = Depends(get_db)):
    """Enregistre une demande transmise depuis le copilote, sans compte ni paiement."""
    request = WorkRequest(
        session_id=body.session_id,
        message=body.message.strip(),
        channel=body.channel.strip() or "chat",
        contact=body.contact.strip(),
    )
    db.add(request)
    await db.commit()
    return {"ok": True, "message": "Votre demande est enregistrée. L'équipe vous répondra dès que possible."}


# ----------------------------- Vision Board Final-main : persistance SQL Cours-main -----------------------------
# Ces routes conservent les contrats de la vraie interface Final-main. Les données
# sont stockées dans la table SQL `settings`, adaptée au compte local Cours-main.
async def _vision_json_get(db: AsyncSession, key: str, default):
    import json as _json
    obj = await db.get(Setting, key)
    if not obj or not obj.value:
        return default
    try:
        return _json.loads(obj.value)
    except Exception:
        return default


async def _vision_json_set(db: AsyncSession, key: str, value):
    import json as _json
    obj = await db.get(Setting, key)
    content = _json.dumps(value, ensure_ascii=False)
    if obj:
        obj.value = content
    else:
        db.add(Setting(key=key, value=content))
    await db.commit()


async def _vision_payload(db: AsyncSession):
    base = await db.get(Setting, "vision")
    meta = await _vision_json_get(db, "vision_meta", {})
    return {
        "value": base.value if base else "Construire une entreprise libre, rentable et qui a un impact.",
        "summary": meta.get("summary", ""),
        "why": meta.get("why", ""),
        "vision_10y": meta.get("vision_10y", base.value if base else ""),
        "values": meta.get("values", []),
        "keywords": meta.get("keywords", []),
        "domains": meta.get("domains", []),
        "objective_90d": meta.get("objective_90d", ""),
        "board": meta.get("board", []),
    }


@api_router.patch("/vision")
async def patch_vision(payload: dict, db: AsyncSession = Depends(get_db)):
    allowed = {"summary", "why", "vision_10y", "values", "keywords", "domains", "objective_90d", "board"}
    meta = await _vision_json_get(db, "vision_meta", {})
    for key in allowed:
        if key in payload:
            meta[key] = payload[key]
    if "vision_10y" in payload and isinstance(payload["vision_10y"], str) and payload["vision_10y"].strip():
        base = await db.get(Setting, "vision")
        if base:
            base.value = payload["vision_10y"].strip()
        else:
            db.add(Setting(key="vision", value=payload["vision_10y"].strip()))
    await _vision_json_set(db, "vision_meta", meta)
    return await _vision_payload(db)


@api_router.get("/vision/board/canvas")
async def vision_canvas_get(db: AsyncSession = Depends(get_db)):
    return await _vision_json_get(db, "vision_canvas", {"elements": [], "background": "#0A1128"})


@api_router.put("/vision/board/canvas")
async def vision_canvas_save(payload: dict, db: AsyncSession = Depends(get_db)):
    saved = {"elements": payload.get("elements", []), "background": payload.get("background", "#0A1128")}
    await _vision_json_set(db, "vision_canvas", saved)
    return saved


@api_router.get("/vision/board")
async def vision_board_get(db: AsyncSession = Depends(get_db)):
    return {"cards": await _vision_json_get(db, "vision_board_module_cards", [])}


@api_router.put("/vision/board")
async def vision_board_save(payload: dict, db: AsyncSession = Depends(get_db)):
    cards = payload.get("cards", [])
    if not isinstance(cards, list):
        raise HTTPException(422, "Le board doit contenir une liste de cartes.")
    await _vision_json_set(db, "vision_board_module_cards", cards)
    return {"cards": cards}


@api_router.post("/vision/board/card")
async def vision_board_add_card(payload: dict, db: AsyncSession = Depends(get_db)):
    cards = await _vision_json_get(db, "vision_board_module_cards", [])
    card = {**payload, "id": str(payload.get("id") or uuid.uuid4())}
    cards.append(card)
    await _vision_json_set(db, "vision_board_module_cards", cards)
    return card


@api_router.get("/vision/brain/score-history")
async def vision_score_history(days: int = 90, db: AsyncSession = Depends(get_db)):
    # Le score est dérivé des KPI SQL existants. Une seule valeur par jour est
    # conservée : les jours antérieurs ne sont jamais reconstitués artificiellement.
    current = await health_score(db)
    history = await _vision_json_get(db, "vision_score_history", [])
    today = datetime.now(timezone.utc).date().isoformat()
    point = {"date": today, "score": current["score"]}
    existing = next((item for item in history if item.get("date") == today), None)
    if existing:
        existing["score"] = point["score"]
    else:
        history.append(point)
    history = sorted(history, key=lambda item: item.get("date", ""))[-max(1, min(days, 365)):]
    await _vision_json_set(db, "vision_score_history", history)
    return {"history": history, "forecast": [], "has_data": bool(history)}


@api_router.get("/vision/board/live-metrics")
async def vision_live_metrics(db: AsyncSession = Depends(get_db)):
    kpis = await _compute_kpis(db)
    objectifs = (await db.execute(select(Objectif).order_by(Objectif.created_at.desc()))).scalars().all()
    return {"kpis": kpis, "objectifs": [row_to_dict(o) for o in objectifs]}


@api_router.get("/vision/board/live-data")
async def vision_live_data(db: AsyncSession = Depends(get_db)):
    return await vision_live_metrics(db)


@api_router.post("/vision/board/refresh")
async def vision_board_refresh():
    # La mise à jour lit les métriques SQL au prochain affichage. Aucun contenu
    # artificiel n'est créé lorsque le connecteur IA n'est pas disponible.
    return {"ok": True, "message": "Les données réelles seront relues au prochain affichage."}


@api_router.get("/vision/board/templates")
async def vision_board_templates():
    return {"templates": []}


@api_router.get("/vision/board/photos")
async def vision_board_photos(q: str = ""):
    return {"photos": [], "query": q}


@api_router.post("/vision/board/inspire")
async def vision_board_inspire(payload: dict):
    raise HTTPException(503, "La génération IA du Vision Board est indisponible dans cette prévisualisation.")


@api_router.post("/vision/board/generate")
async def vision_board_generate(payload: dict):
    raise HTTPException(503, "La génération d'image IA est indisponible dans cette prévisualisation. Vous pouvez ajouter une image par URL.")


@api_router.post("/vision/board/transform")
async def vision_board_transform(payload: dict):
    raise HTTPException(503, "La transformation d'image IA est indisponible dans cette prévisualisation.")


@api_router.post("/vision/board/generate-flipbook")
async def vision_board_generate_flipbook(payload: dict):
    raise HTTPException(503, "La génération IA du Vision Board est indisponible dans cette prévisualisation.")


@api_router.post("/vision/board/generate-doc")
async def vision_board_generate_doc(payload: dict):
    raise HTTPException(503, "La génération IA de document est indisponible dans cette prévisualisation.")


@api_router.delete("/vision/board/{item_id}")
async def vision_board_delete(item_id: str, db: AsyncSession = Depends(get_db)):
    meta = await _vision_json_get(db, "vision_meta", {})
    meta["board"] = [item for item in meta.get("board", []) if str(item.get("id")) != item_id]
    await _vision_json_set(db, "vision_meta", meta)
    return {"ok": True}


async def _vision_cards(db: AsyncSession):
    return await _vision_json_get(db, "vision_cards", [])


@api_router.get("/vision/cards")
async def vision_cards_list(board_id: str = "main", db: AsyncSession = Depends(get_db)):
    return {"cards": await _vision_cards(db), "board_id": board_id}


@api_router.post("/vision/cards")
async def vision_cards_create(payload: dict, db: AsyncSession = Depends(get_db)):
    cards = await _vision_cards(db)
    card = {**payload, "id": str(uuid.uuid4())}
    cards.append(card)
    await _vision_json_set(db, "vision_cards", cards)
    return card


@api_router.post("/vision/cards/migrate-legacy")
async def vision_cards_migrate_legacy(db: AsyncSession = Depends(get_db)):
    return {"ok": True, "migrated": 0, "cards": await _vision_cards(db)}


@api_router.post("/vision/cards/snapshots")
async def vision_cards_snapshot(label: str = "", db: AsyncSession = Depends(get_db)):
    snapshots = await _vision_json_get(db, "vision_card_snapshots", [])
    snapshot = {"id": str(uuid.uuid4()), "label": label or "Version du Vision Canvas", "created_at": utcnow().isoformat(), "cards": await _vision_cards(db)}
    snapshots.insert(0, snapshot)
    await _vision_json_set(db, "vision_card_snapshots", snapshots[:20])
    return snapshot


@api_router.get("/vision/cards/snapshots")
async def vision_cards_snapshots(db: AsyncSession = Depends(get_db)):
    return {"snapshots": await _vision_json_get(db, "vision_card_snapshots", [])}


@api_router.post("/vision/cards/snapshots/{snapshot_id}/restore")
async def vision_cards_restore_snapshot(snapshot_id: str, db: AsyncSession = Depends(get_db)):
    snapshots = await _vision_json_get(db, "vision_card_snapshots", [])
    snapshot = next((item for item in snapshots if item.get("id") == snapshot_id), None)
    if not snapshot:
        raise HTTPException(404, "Version introuvable")
    await _vision_json_set(db, "vision_cards", snapshot.get("cards", []))
    return {"ok": True, "cards": snapshot.get("cards", [])}


@api_router.delete("/vision/cards/snapshots/{snapshot_id}")
async def vision_cards_delete_snapshot(snapshot_id: str, db: AsyncSession = Depends(get_db)):
    snapshots = [item for item in await _vision_json_get(db, "vision_card_snapshots", []) if item.get("id") != snapshot_id]
    await _vision_json_set(db, "vision_card_snapshots", snapshots)
    return {"ok": True}


@api_router.get("/vision/cards/public-status")
async def vision_cards_public_status(db: AsyncSession = Depends(get_db)):
    return await _vision_json_get(db, "vision_cards_public", {"enabled": False, "slug": None})


@api_router.put("/vision/cards/public-status")
async def vision_cards_public_status_set(payload: dict, db: AsyncSession = Depends(get_db)):
    current = await _vision_json_get(db, "vision_cards_public", {"enabled": False, "slug": None})
    current["enabled"] = bool(payload.get("enabled", False))
    if current["enabled"] and not current.get("slug"):
        current["slug"] = uuid.uuid4().hex[:10]
    await _vision_json_set(db, "vision_cards_public", current)
    return current


@api_router.put("/vision/cards/{card_id}")
async def vision_cards_update(card_id: str, payload: dict, db: AsyncSession = Depends(get_db)):
    cards = await _vision_cards(db)
    for index, card in enumerate(cards):
        if str(card.get("id")) == card_id:
            cards[index] = {**card, **payload, "id": card_id}
            await _vision_json_set(db, "vision_cards", cards)
            return cards[index]
    raise HTTPException(404, "Carte introuvable")


@api_router.delete("/vision/cards/{card_id}")
async def vision_cards_delete(card_id: str, db: AsyncSession = Depends(get_db)):
    cards = [card for card in await _vision_cards(db) if str(card.get("id")) != card_id]
    await _vision_json_set(db, "vision_cards", cards)
    return {"ok": True}


@api_router.get("/")
async def root():
    return {"message": "MyExtension Business API"}


app.include_router(api_router)
app.include_router(push_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
