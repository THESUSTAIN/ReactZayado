"""Newsletters (admin, marque Zayado) — porté depuis app-main/backend/routes/newsletters.py.

Différent du module `emails_ia_ext.py` (Lot 2) : celui-ci ne sert PAS à
contacter des clients individuels, mais à fabriquer LA newsletter Zayado
elle-même, à partir de newsletters externes reçues :

  1. Tu t'abonnes à des newsletters externes avec l'email de réception dédié
     (ex. newsletter@inbox.zayado.net), configuré sur Brevo Inbound Parse.
  2. Brevo POST chaque email reçu sur /api/webhooks/newsletters/inbound-brevo.
  3. L'IA (Mammouth) la réécrit intégralement au ton Zayado (jamais de copie
     mot pour mot, jamais mention de la source) → brouillon.
  4. L'admin relit dans cet onglet, corrige si besoin, puis pousse en
     campagne BROUILLON dans Brevo (l'envoi final se fait dans Brevo).

Portage : remplace l'appel Mammouth « à la main » + repli OpenAI/Groq/Mistral
(app-main) par le client `_client_llm` déjà utilisé partout ailleurs dans ce
repo (mêmes conventions, un seul endroit à changer si la clé change), passe
le contenu réécrit par le même garde-fou anti-phishing que le reste du site
(`_assert_safe_email`), et n'a plus besoin de owner_id : la newsletter est
une seule boîte partagée, réservée aux admins (comme app-main).
"""
import asyncio
import json
import logging
import os
import re
from datetime import datetime
from typing import Any, List, Optional

import httpx
from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import DateTime, ForeignKey, String, Text, select, update
from sqlalchemy.orm import Mapped, mapped_column

log = logging.getLogger("kairos.newsletters")

MARQUE = os.environ.get("EMAILS_IA_MARQUE", "DeepShield")
CONTEXTE = os.environ.get(
    "EMAILS_IA_CONTEXTE",
    "outil d'analyse par IA qui détecte les deepfakes et les arnaques : photos, vidéos, "
    "audio, emails et liens. Public : particuliers, familles, seniors, petites entreprises.",
)
INBOUND_SECRET = os.environ.get("BREVO_INBOUND_SECRET", "")

SYSTEME = f"""Tu es l'éditeur en chef de la newsletter {MARQUE}, {CONTEXTE}

Ton rôle : transformer une newsletter externe (reçue dans notre boîte de veille) en une
version {MARQUE} originale, ciblée pour notre audience.

TON ÉDITORIAL :
- Français clair, chaleureux, tutoiement
- Concret et actionnable pour l'audience {MARQUE}
- Bref, pas de blabla marketing, zéro jargon inutile
- Met toujours en avant un conseil pratique ou une implication concrète

RÈGLES ABSOLUES :
- Ne copie JAMAIS mot pour mot la source : on reformule tout, intégralement
- Aucune mention de la source ni de l'émetteur original
- N'invente aucun chiffre, prix, date ni fonctionnalité qui ne figure pas dans la source
- Sujet : 60 caractères max, accrocheur, sans clickbait
- Corps : 150 à 250 mots, HTML simple (<p>, <strong>, <ul>, <li>, <a>), pas de style en ligne
- Nom à utiliser partout : « {MARQUE} » (jamais un autre nom)

Réponds UNIQUEMENT en JSON, aucun texte ni markdown autour :
{{"subject": "…", "summary": "… (2 lignes max, pour la liste admin)", "html": "<p>…</p>", "text": "version texte brut"}}"""


def _json_llm(raw: str) -> dict:
    txt = re.sub(r"^```(?:json)?|```$", "", (raw or "").strip(), flags=re.M).strip()
    debut, fin = txt.find("{"), txt.rfind("}")
    if debut < 0 or fin < 0:
        raise ValueError("Réponse IA sans JSON")
    return json.loads(txt[debut:fin + 1])


def install_newsletters(g: dict) -> None:
    Base, api, get_db = g["Base"], g["api"], g["get_db"]
    utcnow, new_uuid = g["utcnow"], g["new_uuid"]
    exiger_role = g["exiger_role"]
    _uid = g["_uid"]
    _client_llm = g["_client_llm"]
    _assert_safe_email = g["_assert_safe_email"]

    class IncomingNewsletter(Base):
        __tablename__ = "incoming_newsletters"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        sender_email: Mapped[str] = mapped_column(String(255), index=True)
        sender_name: Mapped[str] = mapped_column(String(255), nullable=True)
        subject: Mapped[str] = mapped_column(String(500), nullable=True)
        received_to: Mapped[str] = mapped_column(String(255), nullable=True)
        html_body: Mapped[str] = mapped_column(Text, nullable=True)
        text_body: Mapped[str] = mapped_column(Text, nullable=True)
        raw_headers: Mapped[str] = mapped_column(Text, nullable=True)
        received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
        # received | processing | prepared | failed
        status: Mapped[str] = mapped_column(String(30), default="received")
        error: Mapped[str] = mapped_column(Text, nullable=True)

    class PreparedNewsletter(Base):
        __tablename__ = "prepared_newsletters"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        incoming_id: Mapped[str] = mapped_column(String(36), ForeignKey("incoming_newsletters.id", ondelete="CASCADE"), index=True)
        source_subject: Mapped[str] = mapped_column(String(500), nullable=True)
        source_sender: Mapped[str] = mapped_column(String(255), nullable=True)
        rewritten_subject: Mapped[str] = mapped_column(String(500), nullable=True)
        rewritten_html: Mapped[str] = mapped_column(Text, nullable=True)
        rewritten_text: Mapped[str] = mapped_column(Text, nullable=True)
        summary: Mapped[str] = mapped_column(Text, nullable=True)
        # draft | validated | pushed_to_brevo | rejected
        status: Mapped[str] = mapped_column(String(30), default="draft")
        brevo_draft_id: Mapped[str] = mapped_column(String(100), nullable=True)
        reviewed_by: Mapped[str] = mapped_column(String(36), nullable=True)
        reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
        cree_le: Mapped[object] = mapped_column(DateTime(timezone=True), default=utcnow)
        maj_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    g["IncomingNewsletter"], g["PreparedNewsletter"] = IncomingNewsletter, PreparedNewsletter

    async def _reformuler(incoming_id: str) -> None:
        """Tâche de fond : appelle l'IA et crée le brouillon. N'échoue jamais bruyamment
        (statut « failed » + message d'erreur stocké, visible dans l'admin)."""
        Sess = g["async_session"]
        async with Sess() as db:
            inc = (await db.execute(select(IncomingNewsletter).where(IncomingNewsletter.id == incoming_id))).scalar_one_or_none()
            if not inc:
                return
            inc.status = "processing"
            await db.commit()
            try:
                client = _client_llm(f"newsletter-{incoming_id}", SYSTEME)
                if client is None:
                    raise RuntimeError("IA non configurée (MAMMOTH_API_KEY absente)")
                from llm_mammouth import UserMessage
                src = (inc.text_body or "")[:6000] or (inc.html_body or "")[:4000]
                bloc = f"SUJET SOURCE : {inc.subject or '(sans sujet)'}\n\nCONTENU SOURCE :\n{src or '(vide)'}"
                raw = await asyncio.wait_for(client.send_message(UserMessage(text=bloc)), timeout=60)
                data = _json_llm(str(raw))
                sujet = (data.get("subject") or "")[:500]
                html = data.get("html") or ""
                _assert_safe_email(sujet, html)  # même garde-fou anti-phishing que le reste du site
                db.add(PreparedNewsletter(
                    incoming_id=inc.id, source_subject=inc.subject, source_sender=inc.sender_email,
                    rewritten_subject=sujet, rewritten_html=html, rewritten_text=data.get("text") or "",
                    summary=(data.get("summary") or "")[:500], status="draft"))
                inc.status = "prepared"
                await db.commit()
            except Exception as e:  # noqa: BLE001
                log.warning("Reformulation newsletter %s échouée : %s", incoming_id, e)
                await db.execute(update(IncomingNewsletter).where(IncomingNewsletter.id == incoming_id)
                                  .values(status="failed", error=str(e)[:500]))
                await db.commit()

    # ── Webhook public (sous /api/webhooks/ : déjà exempté d'authentification) ──
    @api.post("/webhooks/newsletters/inbound-brevo")
    async def inbound_brevo(request: Request, db=Depends(get_db)):
        if INBOUND_SECRET and request.query_params.get("token") != INBOUND_SECRET:
            raise HTTPException(401, "Token inbound invalide.")
        try:
            payload = await request.json()
        except Exception:
            raise HTTPException(400, "Payload JSON invalide.")
        items = payload.get("items") if isinstance(payload, dict) else None
        if not items and isinstance(payload, dict):
            items = [payload]
        if not items:
            return {"ok": True, "stored": 0}
        ids = []
        for item in items:
            try:
                sender = item.get("From") or {}
                to_list = item.get("To") or []
                nl = IncomingNewsletter(
                    sender_email=(sender.get("Address") or item.get("Sender") or "")[:255],
                    sender_name=(sender.get("Name") or "")[:255] or None,
                    subject=(item.get("Subject") or "")[:500],
                    received_to=(to_list[0].get("Address") if to_list and isinstance(to_list[0], dict) else "")[:255],
                    html_body=item.get("RawHtmlBody") or item.get("HtmlBody") or "",
                    text_body=item.get("RawTextBody") or item.get("TextBody") or "",
                    raw_headers=json.dumps(item.get("Headers") or {}))
                db.add(nl)
                ids.append(nl)
            except Exception as e:  # noqa: BLE001
                log.warning("Item newsletter ignoré : %s", e)
        await db.commit()
        for nl in ids:
            asyncio.create_task(_reformuler(nl.id))
        return {"ok": True, "stored": len(ids)}

    # ── Admin ──
    def _out(r: "PreparedNewsletter") -> dict:
        return {"id": r.id, "incoming_id": r.incoming_id, "source_subject": r.source_subject,
                "source_sender": r.source_sender, "rewritten_subject": r.rewritten_subject,
                "rewritten_html": r.rewritten_html, "rewritten_text": r.rewritten_text,
                "summary": r.summary, "status": r.status, "brevo_draft_id": r.brevo_draft_id,
                "cree_le": r.cree_le.isoformat() if r.cree_le else None}

    @api.get("/admin/newsletters")
    async def lister(statut: Optional[str] = None, db=Depends(get_db), _r=Depends(exiger_role("admin"))):
        q = select(PreparedNewsletter).order_by(PreparedNewsletter.cree_le.desc()).limit(100)
        if statut:
            q = q.where(PreparedNewsletter.status == statut)
        rows = (await db.execute(q)).scalars()
        return [_out(r) for r in rows]

    @api.get("/admin/newsletters/{nid}")
    async def detail(nid: str, db=Depends(get_db), _r=Depends(exiger_role("admin"))):
        r = (await db.execute(select(PreparedNewsletter).where(PreparedNewsletter.id == nid))).scalar_one_or_none()
        if not r:
            raise HTTPException(404, "Newsletter introuvable.")
        return _out(r)

    class MajIn(BaseModel):
        rewritten_subject: Optional[str] = None
        rewritten_html: Optional[str] = None
        rewritten_text: Optional[str] = None
        summary: Optional[str] = None

    @api.put("/admin/newsletters/{nid}")
    async def modifier(nid: str, body: MajIn, db=Depends(get_db), _r=Depends(exiger_role("admin"))):
        r = (await db.execute(select(PreparedNewsletter).where(PreparedNewsletter.id == nid))).scalar_one_or_none()
        if not r:
            raise HTTPException(404, "Newsletter introuvable.")
        for k, v in body.dict(exclude_unset=True).items():
            setattr(r, k, v)
        r.status, r.reviewed_by, r.reviewed_at = "validated", _uid(), utcnow()
        await db.commit()
        return _out(r)

    @api.post("/admin/newsletters/{nid}/relancer")
    async def relancer(nid: str, db=Depends(get_db), _r=Depends(exiger_role("admin"))):
        r = (await db.execute(select(PreparedNewsletter).where(PreparedNewsletter.id == nid))).scalar_one_or_none()
        if not r:
            raise HTTPException(404, "Newsletter introuvable.")
        asyncio.create_task(_reformuler(r.incoming_id))
        return {"ok": True}

    @api.delete("/admin/newsletters/{nid}")
    async def rejeter(nid: str, db=Depends(get_db), _r=Depends(exiger_role("admin"))):
        r = (await db.execute(select(PreparedNewsletter).where(PreparedNewsletter.id == nid))).scalar_one_or_none()
        if not r:
            raise HTTPException(404, "Newsletter introuvable.")
        r.status = "rejected"
        await db.commit()
        return {"ok": True}

    @api.post("/admin/newsletters/{nid}/pousser-brevo")
    async def pousser_brevo(nid: str, db=Depends(get_db), _r=Depends(exiger_role("admin"))):
        r = (await db.execute(select(PreparedNewsletter).where(PreparedNewsletter.id == nid))).scalar_one_or_none()
        if not r:
            raise HTTPException(404, "Newsletter introuvable.")
        if not r.rewritten_subject or not r.rewritten_html:
            raise HTTPException(422, "Sujet ou contenu manquant.")
        cle = os.environ.get("BREVO_API_KEY", "")
        if not cle:
            raise HTTPException(503, "BREVO_API_KEY non configurée.")
        try:
            _assert_safe_email(r.rewritten_subject, r.rewritten_html)
        except ValueError as e:
            raise HTTPException(422, f"Refusé par les garde-fous anti-phishing : {e}")
        expediteur = os.environ.get("BREVO_SENDER_EMAIL", "noreply@zayado.net")
        nom = os.environ.get("BREVO_SENDER_NAME", MARQUE)
        async with httpx.AsyncClient(timeout=20) as c:
            resp = await c.post("https://api.brevo.com/v3/emailCampaigns", headers={
                "api-key": cle, "Content-Type": "application/json", "accept": "application/json"}, json={
                "name": f"[{MARQUE}] {r.rewritten_subject[:80]}", "subject": r.rewritten_subject,
                "sender": {"email": expediteur, "name": nom}, "htmlContent": r.rewritten_html, "type": "classic"})
        if resp.status_code not in (200, 201):
            raise HTTPException(502, f"Brevo {resp.status_code} : {resp.text[:200]}")
        data = resp.json()
        r.brevo_draft_id, r.status = str(data.get("id", "")), "pushed_to_brevo"
        await db.commit()
        return {"ok": True, "brevo_campaign_id": r.brevo_draft_id,
                "brevo_url": f"https://app.brevo.com/camp/template/{r.brevo_draft_id}/message-setup"}
