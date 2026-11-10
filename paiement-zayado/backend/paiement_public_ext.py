"""Paiement public Zayado (paiement.zayado.net).

Le site paiement.zayado.net est une page à part, sans compte client. Il appelle CETTE API,
installée dans le backend de l'appli (app.zayado.net). Conséquences :
  · une seule clé Mollie, un seul webhook (/api/mollie/webhook, déjà en place) ;
  · chaque paiement crée une CommerceOrder (kind « paiement:<offre> ») : il apparaît dans
    app.zayado.net/admin avec les autres commandes, et les administrateurs reçoivent une notification.

Routes (publiques, limitées par adresse IP) :
    GET  /api/paiement/offres              → offres payables (titre, prix TTC, texte, actif)
    POST /api/paiement/commande            → crée la commande + le paiement Mollie, renvoie checkout_url
    GET  /api/paiement/commande/{id}       → état du paiement (pour la page « merci »)

Installation (dans server.py, à côté de install_reprise_conseil) :
    from paiement_public_ext import install_paiement_public
    install_paiement_public(globals())

Variables d'environnement (toutes facultatives) :
    PAIEMENT_FRONTEND_URL="https://paiement.zayado.net"
    PAIEMENT_WEBHOOK_BASE="https://app.zayado.net"       (adresse publique du backend)
    PAIEMENT_OFFRES_ACTIVES="avis-express,bilan-repreneur,aide-financement,devis"
    PAIEMENT_DEVIS_MAX="20000"
Les prix sont TTC (entreprise non assujettie à la TVA, comme sur app.zayado.net/pricing).
"""
from __future__ import annotations

import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

log = logging.getLogger("zayado.paiement_public")

# Catalogue : prix décidés dans le fichier de suivi Zayado (feuilles « Services » et « Catalogue des offres »).
OFFRES = {
    "avis-express": {"titre": "Avis express sur une annonce de reprise", "prix": "49.00",
                     "texte": "Réponse écrite sous 48 h : faut-il se déplacer ? Déduit de l'Évaluation si vous poursuivez.",
                     "page": "https://zayado.net/pages/avis-express-annonce"},
    "bilan-repreneur": {"titre": "Bilan repreneur", "prix": "290.00",
                        "texte": "Budget, capacité d'emprunt, critères de cible et vie souhaitée. Déduit de l'Évaluation.",
                        "page": "https://zayado.net/pages/bilan-repreneur"},
    "aide-financement": {"titre": "Aide au financement de votre reprise", "prix": "250.00",
                         "texte": "Prévisionnel, plan de financement et dossier bancaire. Déduits de l'accompagnement. Aucun financement n'est garanti.",
                         "page": "https://zayado.net/pages/aide-au-financement"},
    "clarte-financiere": {"titre": "Clarté financière : une séance", "prix": "150.00",
                          "texte": "Vos chiffres clés lus avec vous pour décider sur des bases solides.",
                          "page": "https://zayado.net/pages/clarte-financiere"},
    "suivi-cibles": {"titre": "Suivi de recherche de cibles (3 mois)", "prix": "590.00",
                     "texte": "Méthode, point mensuel et suivi dans VisionAct. Déduit de l'accompagnement si vous signez.",
                     "page": "https://zayado.net/pages/suivi-recherche-cibles"},
    "relecture": {"titre": "Relecture avant signature", "prix": "690.00",
                  "texte": "Un deuxième avis écrit sur votre dossier, suivi d'un échange.",
                  "page": "https://zayado.net/pages/relecture-avant-signature"},
    "devis": {"titre": "Régler un devis Zayado", "prix": "",
              "texte": "Indiquez la référence et le montant inscrits sur votre devis (évaluation, accompagnement, mission sur mesure).",
              "page": "https://zayado.net/pages/conditions-services"},
}
ACTIVES_DEFAUT = "avis-express,bilan-repreneur,aide-financement,devis"


class CommandeIn(BaseModel):
    offre: str = Field(min_length=2, max_length=40)
    email: str = Field(min_length=5, max_length=255)
    prenom: str = Field(min_length=1, max_length=80)
    nom: str = Field(min_length=1, max_length=80)
    societe: str = Field(default="", max_length=120)
    telephone: str = Field(default="", max_length=30)
    reference: str = Field(default="", max_length=40)       # devis uniquement
    montant: Optional[float] = Field(default=None, ge=1)     # devis uniquement
    message: str = Field(default="", max_length=800)
    accepte_conditions: bool = False


def install_paiement_public(g: dict) -> None:
    api, get_db = g["api"], g["get_db"]
    _compteur: dict[str, int] = {}

    def _env(nom: str, defaut: str) -> str:
        return (os.environ.get(nom) or defaut).strip()

    def _front() -> str:
        return _env("PAIEMENT_FRONTEND_URL", "https://paiement.zayado.net").rstrip("/")

    def _webhook() -> str:
        base = _env("PAIEMENT_WEBHOOK_BASE", _env("PUBLIC_FRONTEND_URL", "https://app.zayado.net")).rstrip("/")
        return f"{base}/api/mollie/webhook"

    def _cle() -> str:
        return os.environ.get("MOLLIE_API_KEY", "").strip()

    def _actives() -> set[str]:
        return {x.strip() for x in _env("PAIEMENT_OFFRES_ACTIVES", ACTIVES_DEFAUT).split(",") if x.strip() in OFFRES}

    def _limiter(request: Request, cle: str, maxi: int) -> None:
        ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "")).split(",")[0].strip()
        k = f"{cle}:{ip}:{datetime.now(timezone.utc).strftime('%Y%m%d%H')}"
        if len(_compteur) > 5000:
            _compteur.clear()
        _compteur[k] = _compteur.get(k, 0) + 1
        if _compteur[k] > maxi:
            raise HTTPException(429, "Trop de demandes en peu de temps. Réessayez dans une heure.")

    async def _mollie(methode: str, chemin: str, corps: Optional[dict] = None) -> dict:
        async with httpx.AsyncClient(timeout=20) as http:
            url, entetes = f"https://api.mollie.com/v2/{chemin}", {"Authorization": f"Bearer {_cle()}"}
            r = await (http.post(url, json=corps, headers=entetes) if methode == "POST" else http.get(url, headers=entetes))
        if r.status_code >= 300:
            log.warning("Mollie %s %s : %s", methode, chemin, r.text[:200])
            raise HTTPException(502, "Le paiement n'a pas pu être créé. Réessayez dans un instant.")
        return r.json()

    @api.get("/paiement/offres")
    async def paiement_offres():
        act = _actives()
        return {"offres": [{"id": k, **v, "actif": k in act} for k, v in OFFRES.items()],
                "mention": "Prix TTC. Zayado n'est pas assujettie à la TVA. Paiement sécurisé par Mollie."}

    @api.post("/paiement/commande")
    async def paiement_commande(body: CommandeIn, request: Request, db: AsyncSession = Depends(get_db)):
        _limiter(request, "paiement", 12)
        offre = OFFRES.get(body.offre)
        if not offre or body.offre not in _actives():
            raise HTTPException(422, "Cette offre n'est pas disponible au paiement en ligne.")
        if not body.accepte_conditions:
            raise HTTPException(422, "Merci d'accepter les conditions des services.")
        email = body.email.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
            raise HTTPException(422, "Adresse e-mail invalide.")
        if body.offre == "devis":
            ref = body.reference.strip()
            if not re.match(r"^[A-Za-z0-9][A-Za-z0-9 ._/-]{2,39}$", ref):
                raise HTTPException(422, "Indiquez la référence inscrite sur votre devis.")
            maxi = float(_env("PAIEMENT_DEVIS_MAX", "20000") or 20000)
            if not body.montant or body.montant > maxi:
                raise HTTPException(422, "Indiquez le montant de votre devis.")
            montant, titre = f"{body.montant:.2f}", f"Devis {ref}"
        else:
            montant, titre = offre["prix"], offre["titre"]

        CommerceOrder = g["CommerceOrder"]
        commande = CommerceOrder(id=str(uuid.uuid4()), email=email, kind=f"paiement:{body.offre}", title=titre,
                                 amount=montant, status="pending",
                                 metadata_json={"source": "paiement.zayado.net", "prenom": body.prenom.strip(),
                                                "nom": body.nom.strip(), "societe": body.societe.strip(),
                                                "telephone": body.telephone.strip(), "reference": body.reference.strip(),
                                                "message": body.message.strip()})
        db.add(commande)
        if not _cle():
            if os.environ.get("ENV", "").lower() == "local":
                commande.status, commande.mollie_payment_id = "paid", f"sim_{commande.id}"
                await db.commit()
                return {"commande_id": commande.id, "checkout_url": f"{_front()}/merci.html?commande={commande.id}", "simulation": True}
            raise HTTPException(503, "Le paiement n'est pas encore configuré.")
        paiement = await _mollie("POST", "payments", {
            "amount": {"currency": "EUR", "value": montant},
            "description": f"Zayado · {titre}"[:255],
            "redirectUrl": f"{_front()}/merci.html?commande={commande.id}",
            "webhookUrl": _webhook(),
            "metadata": {"order_id": commande.id, "kind": f"paiement:{body.offre}"},
        })
        commande.mollie_payment_id = paiement["id"]
        await db.commit()
        await _prevenir(db, body, titre, montant)
        return {"commande_id": commande.id, "checkout_url": paiement.get("_links", {}).get("checkout", {}).get("href"), "simulation": False}

    @api.get("/paiement/commande/{commande_id}")
    async def paiement_etat(commande_id: str, request: Request, db: AsyncSession = Depends(get_db)):
        _limiter(request, "paiement-etat", 120)
        c = await db.get(g["CommerceOrder"], commande_id)
        if not c or not str(c.kind or "").startswith("paiement:"):
            raise HTTPException(404, "Commande introuvable.")
        if c.status in ("pending", "open") and c.mollie_payment_id and _cle() and not str(c.mollie_payment_id).startswith("sim_"):
            try:
                pmt = await _mollie("GET", f"payments/{c.mollie_payment_id}")
                c.status = {"paid": "paid", "failed": "failed", "canceled": "canceled", "expired": "expired"}.get(pmt.get("status"), c.status)
                await db.commit()
            except HTTPException:
                pass
        return {"statut": c.status, "titre": c.title, "montant": str(c.amount)}   # aucune donnée personnelle

    async def _prevenir(db: AsyncSession, body: CommandeIn, titre: str, montant: str) -> None:
        notifier, User = g.get("notifier"), g.get("User")
        if not (notifier and User):
            return
        try:
            for aid in (await db.execute(select(User.id).where(User.role == "admin"))).scalars().all():
                await notifier(db, aid, "admin", f"Paiement en cours : {titre}",
                               f"{body.prenom} {body.nom} · {montant} € · paiement.zayado.net · statut mis à jour par Mollie",
                               "/admin", tag="paiement-public", cle=f"paiement:{body.email}:{titre}")
        except Exception as e:  # noqa: BLE001
            log.warning("Notification admin (paiement public) non envoyée : %s", e)
