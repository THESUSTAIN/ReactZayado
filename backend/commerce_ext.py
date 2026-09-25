"""Commerce Zayado : commandes, paiements Mollie et accès privés.

Shopify reste la vitrine. Cette extension garde les commandes et les droits
chez Zayado afin que produits, services et SaaS passent par le même flux.
"""
import asyncio
from datetime import datetime, timedelta, timezone
import os
import uuid
import httpx
from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, DateTime, JSON, String, Text, UniqueConstraint, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column


def install_commerce(g: dict) -> None:
    Base = g["Base"]
    api = g["api"]
    get_db = g["get_db"]
    _uid = g["_uid"]
    User = g["User"]
    DEMO_USER_ID = g["DEMO_USER_ID"]
    utcnow = g["utcnow"]
    pricing = g.get("PRICING", {})
    VendorProduct = g.get("VendorProduct")
    VendorProfile = g.get("VendorProfile")
    exiger_role = g.get("exiger_role")

    class CommerceOrder(Base):
        __tablename__ = "commerce_orders"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
        user_id: Mapped[str] = mapped_column(String(36), index=True, nullable=True)
        email: Mapped[str] = mapped_column(String(255), index=True, default="")
        kind: Mapped[str] = mapped_column(String(30), default="produit")
        title: Mapped[str] = mapped_column(String(255), default="")
        amount: Mapped[str] = mapped_column(String(20), default="0.00")
        currency: Mapped[str] = mapped_column(String(3), default="EUR")
        status: Mapped[str] = mapped_column(String(30), default="pending", index=True)
        mollie_payment_id: Mapped[str] = mapped_column(String(120), unique=True, nullable=True)
        access_url: Mapped[str] = mapped_column(Text, nullable=True)
        metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
        updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    class Abonnement(Base):
        """Offre SaaS payée d'un utilisateur (1 ligne par utilisateur).
        fondateur=True : le tarif fondateur lui reste acquis à chaque renouvellement."""
        __tablename__ = "abonnements"
        user_id: Mapped[str] = mapped_column(String(36), primary_key=True)
        plan: Mapped[str] = mapped_column(String(20), default="essentielle")
        cycle: Mapped[str] = mapped_column(String(10), default="mensuel")
        fondateur: Mapped[bool] = mapped_column(Boolean, default=False)
        fin: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
        essai_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)  # essai 1 € déjà utilisé
        updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
        # Prélèvement automatique (abonnement Mollie) : client + mandat + abonnement.
        mollie_customer_id: Mapped[str] = mapped_column(String(64), nullable=True)
        mollie_subscription_id: Mapped[str] = mapped_column(String(64), nullable=True)
        montant_ttc: Mapped[str] = mapped_column(String(20), nullable=True)   # montant des prochains prélèvements
        resilie: Mapped[bool] = mapped_column(Boolean, default=False)        # résilié : accès jusqu'à « fin », plus de prélèvement
        rappel_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)  # rappel « fin d'essai » envoyé
        plan_suivant: Mapped[str] = mapped_column(String(20), nullable=True)  # offre prise au prochain prélèvement (ex. Rêveur)

    class EquipeMembre(Base):
        """Offre Équipe : le titulaire invite jusqu'à 2 personnes, qui ont chacune un espace Solo."""
        __tablename__ = "equipe_membres"
        __table_args__ = (UniqueConstraint("owner_id", "email", name="uq_equipe_owner_email"),)
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
        owner_id: Mapped[str] = mapped_column(String(36), index=True)
        email: Mapped[str] = mapped_column(String(255), index=True)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    PLACES_EQUIPE = {"business": 2, "entreprise": 20}

    # ── Essai « 1 mois pour 1 € » (modèle Shopify) — plus d'offre gratuite ──
    # ESSAI_ACTIF=0 pour couper · ESSAI_PRIX (TTC, défaut 1) · ESSAI_JOURS (défaut 30) · ESSAI_PLAN (défaut serenite)
    def _essai_conf() -> dict:
        try:
            prix = float(os.environ.get("ESSAI_PRIX", "1"))
        except ValueError:
            prix = 1.0
        try:
            jours = int(os.environ.get("ESSAI_JOURS", "30"))
        except ValueError:
            jours = 60
        return {"actif": os.environ.get("ESSAI_ACTIF", "1").strip() not in ("0", "false", "non"),
                "prix": prix, "jours": jours, "plan": os.environ.get("ESSAI_PLAN", "serenite").strip() or "serenite"}

    # ── Tarif fondateur (réglable sur Railway, sans toucher au code) ──
    # FONDATEUR_ACTIF=0 pour couper l'offre · FONDATEUR_FIN=AAAA-MM-JJ · FONDATEUR_PLACES=100
    PRIX_FONDATEUR = {"serenite": {"mensuel": 24.0, "annuel": 228.0}, "pro": {"mensuel": 49.0, "annuel": 468.0}}

    def _fondateur_fin() -> str:
        return os.environ.get("FONDATEUR_FIN", "2026-12-31").strip()

    def _fondateur_places() -> int:
        try:
            return max(0, int(os.environ.get("FONDATEUR_PLACES", "100")))
        except ValueError:
            return 100

    async def _fondateurs_inscrits(db) -> int:
        return (await db.execute(select(func.count()).select_from(Abonnement).where(Abonnement.fondateur.is_(True)))).scalar_one()

    async def _offre_fondateur_ouverte(db) -> bool:
        if os.environ.get("FONDATEUR_ACTIF", "1").strip() in ("0", "false", "non"):
            return False
        try:
            if datetime.now(timezone.utc).date().isoformat() > _fondateur_fin():
                return False
        except Exception:  # noqa: BLE001
            pass
        return await _fondateurs_inscrits(db) < _fondateur_places()

    @api.get("/tarifs/fondateur")
    async def tarifs_fondateur(db: AsyncSession = Depends(get_db)):
        """Public : état de l'offre fondateur pour la page Tarifs."""
        ouverte = await _offre_fondateur_ouverte(db)
        return {"ouverte": ouverte, "fin": _fondateur_fin(), "places": _fondateur_places(),
                "places_restantes": max(0, _fondateur_places() - await _fondateurs_inscrits(db)),
                "prix": PRIX_FONDATEUR}

    def _aware(d):
        return (d if d.tzinfo else d.replace(tzinfo=timezone.utc)) if d else None

    def _actif(a) -> bool:
        fin = _aware(a.fin) if a else None
        return bool(a and a.plan != "essentielle" and fin and fin > datetime.now(timezone.utc))

    async def _titulaire_equipe(db, uid: str):
        """Si l'utilisateur est membre d'une équipe dont le titulaire a une offre active : (titulaire, abonnement)."""
        u = await db.get(User, uid)
        if not u or not u.email:
            return None
        for m in (await db.execute(select(EquipeMembre).where(EquipeMembre.email == u.email.strip().lower()))).scalars():
            ab = await db.get(Abonnement, m.owner_id)
            if _actif(ab) and ab.plan in PLACES_EQUIPE:
                return m.owner_id, ab
        return None

    @api.get("/abonnement")
    async def mon_abonnement(db: AsyncSession = Depends(get_db)):
        uid = _uid()
        a = await db.get(Abonnement, uid)
        # Offre choisie à l'onboarding mais pas encore payée : on l'indique.
        attente = None
        VP = g.get("VisionProfile")
        p = None
        if VP is not None:
            p = (await db.execute(select(VP).where(VP.user_id == uid))).scalar_one_or_none()
            cm = (getattr(p, "contexte_metier", None) or {}) if p else {}
            attente = cm.get("plan_souhaite") if isinstance(cm, dict) else None
        plan = a.plan if a else "essentielle"
        if attente in (None, "", "essentielle") or attente == plan:
            attente = None
        conf = _essai_conf()
        fin = _aware(a.fin) if a else None
        actif = _actif(a)
        u = await db.get(User, uid)
        role_interne = bool(u and u.role in ("admin", "vendeur"))
        # Membre d'une équipe : espace Solo offert par le titulaire (tant que son offre court).
        equipe = None
        if not actif:
            t = await _titulaire_equipe(db, uid)
            if t:
                owner = await db.get(User, t[0])
                equipe = {"titulaire": owner.email if owner else "", "fin": _aware(t[1].fin).isoformat()}
                if p is not None and p.plan != "serenite":
                    p.plan = "serenite"
                    await db.commit()
            elif p is not None and p.plan != "essentielle" and not (a and a.fin) and not role_interne:
                # Retiré de l'équipe (ou équipe arrêtée) : l'espace se met en pause.
                p.plan = "essentielle"
                await db.commit()
        essai = {"disponible": conf["actif"] and not (a and (a.essai_le or (a.plan != "essentielle" and a.fin))),
                 "prix": conf["prix"], "jours": conf["jours"], "plan": conf["plan"]}
        base = {"plan_en_attente": attente, "essai": essai,
                "acces": "actif" if (actif or role_interne or equipe) else "aucun",
                "en_essai": bool(actif and a.cycle == "essai"), "equipe": equipe}
        if not a:
            return {"plan": "serenite" if equipe else "essentielle", "fondateur": False, "fin": None, **base,
                    "renouvellement": None}
        renouv = None
        if actif:
            renouv = {"automatique": bool(a.mollie_subscription_id and not a.resilie), "resilie": bool(a.resilie),
                      "date": fin.date().isoformat() if fin else None, "montant_ttc": a.montant_ttc,
                      "plan_suivant": a.plan_suivant}
        return {"plan": a.plan if actif or not equipe else "serenite", "cycle": a.cycle, "fondateur": bool(a.fondateur),
                "fin": fin.isoformat() if fin else None, "renouvellement": renouv, **base}

    async def _verifier_expiration(db, uid: str, profil) -> None:
        """Abonnement échu → retour à l'offre gratuite (appelé au chargement de l'appli)."""
        a = await db.get(Abonnement, uid)
        if not a or not a.fin:
            return
        fin = a.fin if a.fin.tzinfo else a.fin.replace(tzinfo=timezone.utc)
        if fin < datetime.now(timezone.utc) and profil.plan == a.plan and a.plan != "essentielle":
            profil.plan = "essentielle"
            await db.commit()

    g["Abonnement"] = Abonnement
    g["_verifier_expiration"] = _verifier_expiration

    class CheckoutIn(BaseModel):
        kind: str = Field(pattern="^(produit|service|saas)$")
        title: str = Field(min_length=2, max_length=255)
        amount: float = Field(gt=0, le=100000)
        email: str = Field(min_length=5, max_length=255)
        product_id: str | None = None
        service_id: str | None = None
        access_url: str | None = None
        metadata: dict = {}

    class SaasCheckoutIn(BaseModel):
        plan: str
        cycle: str = Field(default="mensuel", pattern="^(mensuel|annuel|essai)$")
        email: str | None = None
        essai: bool = False

    def _tva() -> float:
        # TheSustain / Zayado n'est pas assujettie à la TVA : les montants de
        # PRICING / PRIX_FONDATEUR sont donc déjà les montants finaux encaissés
        # (TTC = HT ici). On ne rajoute plus de TVA dessus, quoi que contienne
        # une éventuelle variable TVA_TAUX historique sur Railway.
        return 0.0

    def _frontend_url() -> str:
        return os.environ.get("PUBLIC_FRONTEND_URL", "https://app.zayado.net").rstrip("/")

    def _mollie_key() -> str:
        return os.environ.get("MOLLIE_API_KEY", "").strip()

    def _services() -> dict:
        import json
        try:
            return json.loads(os.environ.get("ZAYADO_SERVICE_OFFERS", "{}"))
        except json.JSONDecodeError:
            return {}

    def _entetes() -> dict:
        return {"Authorization": f"Bearer {_mollie_key()}", "Content-Type": "application/json"}

    async def _mollie(methode: str, chemin: str, corps: dict | None = None) -> dict:
        """Appel générique à l'API Mollie v2 (clients, abonnements)."""
        if not _mollie_key():
            raise HTTPException(503, "Mollie n'est pas configuré : MOLLIE_API_KEY manque côté serveur.")
        url = f"https://api.mollie.com/v2/{chemin}"
        async with httpx.AsyncClient(timeout=20) as client:
            if methode == "POST":
                r = await client.post(url, json=corps or {}, headers=_entetes())
            elif methode == "DELETE":
                r = await client.delete(url, headers=_entetes())
            else:
                r = await client.get(url, headers=_entetes())
        if r.status_code >= 400 and not (methode == "DELETE" and r.status_code in (404, 410, 422)):
            raise HTTPException(502, f"Mollie a refusé la demande ({r.status_code}).")
        try:
            return r.json()
        except Exception:  # noqa: BLE001 — DELETE renvoie un corps vide
            return {}

    async def _client_mollie(db, user) -> str:
        """Client Mollie du compte (créé une fois) : il porte le mandat du prélèvement automatique."""
        a = await db.get(Abonnement, user.id)
        if not a:
            a = Abonnement(user_id=user.id)
            db.add(a)
        if not a.mollie_customer_id:
            c = await _mollie("POST", "customers", {"name": (user.email or "Client Zayado")[:100], "email": user.email,
                                                     "metadata": {"user_id": user.id}})
            a.mollie_customer_id = c.get("id")
        return a.mollie_customer_id

    async def _mollie_create(order: CommerceOrder, customer_id: str | None = None) -> dict:
        key = _mollie_key()
        if not key:
            raise HTTPException(503, "Mollie n'est pas configuré : MOLLIE_API_KEY manque côté serveur.")
        payload = {
            "amount": {"currency": order.currency, "value": f"{float(order.amount):.2f}"},
            "description": f"Zayado · {order.title}"[:255],
            "redirectUrl": f"{_frontend_url()}/mon-espace?payment=pending&order={order.id}",
            "webhookUrl": f"{_frontend_url()}/api/mollie/webhook",
            "metadata": {"order_id": order.id, "kind": order.kind, "user_id": order.user_id or "", "email": order.email},
        }
        if customer_id:
            # 1er paiement d'un abonnement : Mollie enregistre le moyen de paiement (mandat)
            # pour les prélèvements suivants.
            payload.update({"customerId": customer_id, "sequenceType": "first"})
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post("https://api.mollie.com/v2/payments", json=payload,
                                         headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
        if response.status_code >= 400:
            raise HTTPException(502, f"Mollie a refusé le paiement ({response.status_code}).")
        data = response.json()
        return {"id": data["id"], "checkout_url": data.get("_links", {}).get("checkout", {}).get("href")}

    async def _mollie_get(payment_id: str) -> dict:
        key = _mollie_key()
        if not key:
            return {}
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(f"https://api.mollie.com/v2/payments/{payment_id}",
                                        headers={"Authorization": f"Bearer {key}"})
        if response.status_code >= 400:
            raise HTTPException(502, "Mollie n'a pas pu vérifier le paiement.")
        return response.json()

    def _serialise(order: CommerceOrder) -> dict:
        return {"id": order.id, "kind": order.kind, "title": order.title, "amount": order.amount,
                "currency": order.currency, "status": order.status, "access_url": order.access_url,
                "payment_id": order.mollie_payment_id, "created_at": order.created_at.isoformat() if order.created_at else None}

    @api.get("/commerce/offers/{kind}/{offer_id}")
    async def commerce_offer(kind: str, offer_id: str, db: AsyncSession = Depends(get_db)):
        if kind == "produit":
            if not VendorProduct:
                raise HTTPException(404, "Offre introuvable.")
            product = (await db.execute(select(VendorProduct).where(VendorProduct.id == offer_id,
                                                                      VendorProduct.statut == "publie"))).scalar_one_or_none()
            if not product:
                raise HTTPException(404, "Offre introuvable.")
            return {"kind": kind, "id": product.id, "title": product.titre,
                    "amount": float(str(product.prix).replace(",", ".")), "currency": "EUR"}
        if kind == "service":
            offer = _services().get(offer_id)
            if offer:
                return {"kind": kind, "id": offer_id, "title": offer.get("title", "Service Zayado"),
                        "amount": float(offer.get("amount", 0)), "currency": "EUR"}
        raise HTTPException(404, "Offre introuvable.")

    @api.post("/checkout")
    async def saas_checkout(body: SaasCheckoutIn, db: AsyncSession = Depends(get_db)):
        if body.essai or body.cycle == "essai":
            return await _checkout_essai(body, db)
        plan = pricing.get(body.plan.lower())
        if not plan or plan.get(body.cycle) is None:
            raise HTTPException(400, "Cette offre est sur devis ou n'existe pas.")
        amount_ht = float(plan[body.cycle])
        if amount_ht <= 0:
            raise HTTPException(400, "Ce forfait est gratuit : aucun paiement requis.")
        # Tarif fondateur : acquis à vie pour qui l'a déjà, sinon tant que l'offre est ouverte.
        cle_plan = body.plan.lower()
        fondateur = False
        if cle_plan in PRIX_FONDATEUR:
            deja = await db.get(Abonnement, _uid())
            if (deja and deja.fondateur) or await _offre_fondateur_ouverte(db):
                amount_ht = PRIX_FONDATEUR[cle_plan][body.cycle]
                fondateur = True
        # Entreprise non assujettie à la TVA : le montant encaissé = le montant affiché.
        tva = _tva()
        amount = round(amount_ht * (1 + tva), 2)
        if plan.get("ttc") and not fondateur:
            # Offre affichée TTC : le client paie exactement le prix affiché.
            amount = float(plan["ttc"][body.cycle])
            amount_ht = round(amount / (1 + tva), 2)
        uid = _uid()
        user = None if uid == DEMO_USER_ID else await db.get(User, uid)
        if not user:
            raise HTTPException(401, "Connecte-toi avant de souscrire.")
        order = CommerceOrder(user_id=uid, email=(body.email or user.email).strip().lower(), kind="saas",
                              title=f"Zayado {plan['label']}{' (tarif fondateur)' if fondateur else ''} · {body.cycle} · TTC", amount=f"{amount:.2f}",
                              access_url=f"{_frontend_url()}/app",
                              metadata_json={"plan": body.plan.lower(), "cycle": body.cycle, "montant_ht": f"{amount_ht:.2f}", "tva_taux": tva,
                                             "fondateur": fondateur, "recurrent_ttc": f"{amount:.2f}",
                                             "intervalle": "12 months" if body.cycle == "annuel" else "1 month"})
        db.add(order)
        await db.flush()
        cid = await _client_mollie(db, user)
        payment = await _mollie_create(order, cid)
        order.mollie_payment_id = payment["id"]
        await db.commit()
        return {"ok": True, "checkoutUrl": payment["checkout_url"], "paymentId": payment["id"], "order": _serialise(order)}

    async def _checkout_essai(body: SaasCheckoutIn, db: AsyncSession) -> dict:
        """Essai payant : un seul par compte, prix TTC fixe, sur l'offre d'entrée.
        Le tarif fondateur est réservé dès l'essai (s'il est ouvert) pour la suite."""
        conf = _essai_conf()
        if not conf["actif"]:
            raise HTTPException(400, "L'offre d'essai n'est plus disponible.")
        if body.plan.lower() != conf["plan"]:
            raise HTTPException(400, "L'essai à 1 € concerne uniquement l'offre Solo.")
        uid = _uid()
        user = None if uid == DEMO_USER_ID else await db.get(User, uid)
        if not user:
            raise HTTPException(401, "Connecte-toi avant de commencer ton essai.")
        a = await db.get(Abonnement, uid)
        if a and (a.essai_le or (a.plan != "essentielle" and a.fin)):
            raise HTTPException(409, "Tu as déjà profité de l'essai : choisis ta formule pour continuer.")
        fondateur = bool(conf["plan"] in PRIX_FONDATEUR and await _offre_fondateur_ouverte(db))
        prix = round(conf["prix"], 2)
        label = pricing.get(conf["plan"], {}).get("label", "Solo")
        # Après l'essai : prélèvement mensuel automatique (tarif fondateur s'il est réservé).
        ht_suite = PRIX_FONDATEUR[conf["plan"]]["mensuel"] if fondateur else float(pricing.get(conf["plan"], {}).get("mensuel") or 0)
        suite = round(ht_suite * (1 + _tva()), 2)
        order = CommerceOrder(user_id=uid, email=(body.email or user.email).strip().lower(), kind="saas",
                              title=f"Zayado {label} · essai {conf['jours'] // 30} mois · TTC", amount=f"{prix:.2f}",
                              access_url=f"{_frontend_url()}/app",
                              metadata_json={"plan": conf["plan"], "cycle": "essai", "essai": True, "jours": conf["jours"],
                                             "montant_ttc": f"{prix:.2f}", "fondateur": fondateur,
                                             "recurrent_ttc": f"{suite:.2f}", "intervalle": "1 month"})
        db.add(order)
        await db.flush()
        cid = await _client_mollie(db, user)
        payment = await _mollie_create(order, cid)
        order.mollie_payment_id = payment["id"]
        await db.commit()
        return {"ok": True, "checkoutUrl": payment["checkout_url"], "paymentId": payment["id"], "order": _serialise(order)}

    @api.post("/commerce/checkout")
    async def commerce_checkout(body: CheckoutIn, db: AsyncSession = Depends(get_db)):
        uid = _uid()
        user = None if uid == DEMO_USER_ID else await db.get(User, uid)
        if not user:
            raise HTTPException(401, "Connecte-toi avant de commencer un achat.")
        email = body.email.strip().lower()
        title, amount = body.title.strip(), body.amount
        if body.kind == "produit":
            if not VendorProduct or not body.product_id:
                raise HTTPException(400, "Produit Zayado manquant.")
            product = (await db.execute(select(VendorProduct).where(VendorProduct.id == body.product_id,
                                                                      VendorProduct.statut == "publie"))).scalar_one_or_none()
            if not product:
                raise HTTPException(404, "Produit indisponible.")
            title, amount = product.titre, float(str(product.prix).replace(",", "."))
        elif body.kind == "service":
            offer = _services().get(body.service_id or "")
            if not offer:
                raise HTTPException(404, "Service indisponible.")
            title, amount = str(offer.get("title", title)), float(offer.get("amount", 0))
            if amount <= 0:
                raise HTTPException(400, "Le service n'a pas de tarif valide.")
        order = CommerceOrder(user_id=uid, email=email, kind=body.kind, title=title,
                              amount=f"{amount:.2f}", access_url=body.access_url,
                              metadata_json={**(body.metadata or {}), "product_id": body.product_id or ""})
        db.add(order)
        await db.flush()
        payment = await _mollie_create(order)
        order.mollie_payment_id = payment["id"]
        order.updated_at = utcnow()
        await db.commit()
        return {"ok": True, "order": _serialise(order), "checkoutUrl": payment["checkout_url"]}

    @api.get("/commerce/orders")
    async def commerce_orders(db: AsyncSession = Depends(get_db)):
        uid = _uid()
        if uid == DEMO_USER_ID:
            raise HTTPException(401, "Connecte-toi pour consulter tes achats.")
        rows = (await db.execute(select(CommerceOrder).where(CommerceOrder.user_id == uid)
                                 .order_by(CommerceOrder.created_at.desc()))).scalars().all()
        return {"items": [_serialise(row) for row in rows]}

    @api.get("/commerce/orders/{order_id}")
    async def commerce_order(order_id: str, db: AsyncSession = Depends(get_db)):
        row = (await db.execute(select(CommerceOrder).where(CommerceOrder.id == order_id,
                                                              CommerceOrder.user_id == _uid()))).scalar_one_or_none()
        if not row:
            raise HTTPException(404, "Commande introuvable.")
        return _serialise(row)

    @api.get("/admin/commerce/stats")
    async def admin_commerce_stats(db: AsyncSession = Depends(get_db), _role=Depends(exiger_role("admin"))):
        total = (await db.execute(select(func.count()).select_from(CommerceOrder))).scalar_one()
        paid = (await db.execute(select(func.count()).select_from(CommerceOrder).where(CommerceOrder.status == "paid"))).scalar_one()
        rows = (await db.execute(select(CommerceOrder.status, func.count()).group_by(CommerceOrder.status))).all()
        return {"total": total, "paid": paid, "by_status": {status: count for status, count in rows}}

    @api.get("/admin/commerce/orders")
    async def admin_commerce_orders(status: str | None = None, limit: int = 100,
                                     db: AsyncSession = Depends(get_db), _role=Depends(exiger_role("admin"))):
        query = select(CommerceOrder).order_by(CommerceOrder.created_at.desc()).limit(min(max(limit, 1), 250))
        if status:
            query = select(CommerceOrder).where(CommerceOrder.status == status).order_by(CommerceOrder.created_at.desc()).limit(min(max(limit, 1), 250))
        rows = (await db.execute(query)).scalars().all()
        return {"items": [{**_serialise(row), "email": row.email, "user_id": row.user_id,
                            "updated_at": row.updated_at.isoformat() if row.updated_at else None} for row in rows]}

    @api.patch("/admin/commerce/orders/{order_id}/status")
    async def admin_commerce_order_status(order_id: str, body: dict,
                                           db: AsyncSession = Depends(get_db), _role=Depends(exiger_role("admin"))):
        allowed = {"pending", "paid", "authorized", "failed", "canceled", "expired", "refunded"}
        status = str(body.get("status") or "").strip().lower()
        if status not in allowed:
            raise HTTPException(422, "Statut invalide.")
        row = await db.get(CommerceOrder, order_id)
        if not row:
            raise HTTPException(404, "Commande introuvable.")
        row.status, row.updated_at = status, utcnow()
        await db.commit()
        return _serialise(row)

    @api.get("/admin/commerce/products")
    async def admin_commerce_products(db: AsyncSession = Depends(get_db), _role=Depends(exiger_role("admin"))):
        rows = (await db.execute(select(VendorProduct).order_by(VendorProduct.maj_le.desc()))).scalars().all() if VendorProduct else []
        users = {u.id: u for u in (await db.execute(select(User))).scalars()}
        return {"items": [{"id": p.id, "title": p.titre, "price": p.prix, "status": p.statut,
                            "vendor": p.vendeur, "vendor_email": users.get(p.user_id).email if users.get(p.user_id) else None,
                            "shopify_id": p.shopify_id, "updated_at": p.maj_le.isoformat() if p.maj_le else None}
                           for p in rows]}

    @api.get("/admin/commerce/vendors")
    async def admin_commerce_vendors(db: AsyncSession = Depends(get_db), _role=Depends(exiger_role("admin"))):
        users = list((await db.execute(select(User).where(User.role.in_(["vendeur", "admin"])).order_by(User.email))).scalars())
        result = []
        for user in users:
            products = (await db.execute(select(func.count()).select_from(VendorProduct).where(VendorProduct.user_id == user.id))).scalar_one() if VendorProduct else 0
            profile = (await db.execute(select(VendorProfile).where(VendorProfile.user_id == user.id))).scalar_one_or_none() if VendorProfile else None
            result.append({"id": user.id, "email": user.email, "role": user.role, "shop": (profile.data or {}).get("nom_boutique", "") if profile else "", "products": products})
        return {"items": result}

    logger = g.get("logger")

    def _log(msg, *args):
        if logger:
            logger.warning(msg, *args)

    async def _creer_abonnement_mollie(a, meta: dict, plan_label: str) -> None:
        """Programme les prélèvements automatiques à partir de la fin de la période payée."""
        if not (a.mollie_customer_id and meta.get("recurrent_ttc") and a.fin):
            return
        if a.mollie_subscription_id:  # changement d'offre : l'ancien prélèvement s'arrête
            try:
                await _mollie("DELETE", f"customers/{a.mollie_customer_id}/subscriptions/{a.mollie_subscription_id}")
            except HTTPException as e:
                _log("Ancien abonnement Mollie non annulé : %s", e.detail)
        montant = f"{float(meta['recurrent_ttc']):.2f}"
        sub = await _mollie("POST", f"customers/{a.mollie_customer_id}/subscriptions", {
            "amount": {"currency": "EUR", "value": montant},
            "interval": meta.get("intervalle") or "1 month",
            "startDate": _aware(a.fin).date().isoformat(),
            "description": f"Zayado {plan_label}{' (tarif fondateur)' if a.fondateur else ''}"[:255],
            "webhookUrl": f"{_frontend_url()}/api/mollie/webhook",
            "metadata": {"user_id": a.user_id, "plan": a.plan},
        })
        a.mollie_subscription_id = sub.get("id")
        a.montant_ttc = montant
        a.resilie = False

    async def _paiement_recurrent(db, payment_id: str) -> None:
        """Paiement créé par un abonnement Mollie (renouvellement automatique)."""
        payment = await _mollie_get(payment_id)
        sid = payment.get("subscriptionId")
        if not sid:
            return
        a = (await db.execute(select(Abonnement).where(Abonnement.mollie_subscription_id == sid))).scalar_one_or_none()
        if not a:
            return
        status = payment.get("status", "")
        label = pricing.get(a.plan, {}).get("label", a.plan)
        montant = (payment.get("amount") or {}).get("value") or a.montant_ttc or "0.00"
        u = await db.get(User, a.user_id)
        db.add(CommerceOrder(user_id=a.user_id, email=(u.email if u else ""), kind="saas",
                             title=f"Zayado {label} · renouvellement · TTC", amount=str(montant),
                             status="paid" if status == "paid" else ("failed" if status in ("failed", "expired", "canceled") else "pending"),
                             mollie_payment_id=payment_id, access_url=f"{_frontend_url()}/app",
                             metadata_json={"plan": a.plan, "abonnement": sid, "renouvellement": True}))
        if status == "paid":
            maintenant = datetime.now(timezone.utc)
            fin = _aware(a.fin)
            depart = fin if (fin and fin > maintenant) else maintenant
            annuel = a.cycle == "annuel"
            a.fin = depart + timedelta(days=366 if annuel else 31)
            if a.cycle == "essai":
                a.cycle = "mensuel"
            if a.plan_suivant:
                a.plan, a.plan_suivant = a.plan_suivant, None
            a.rappel_le = None
            a.updated_at = utcnow()
            profil = await g["_profil"](db, a.user_id)
            profil.plan = a.plan
        elif status in ("failed", "expired"):
            _log("Prélèvement Zayado échoué pour %s (%s)", a.user_id, payment_id)

    @api.post("/mollie/webhook")
    async def commerce_mollie_webhook(request: Request, db: AsyncSession = Depends(get_db)):
        form = await request.form()
        payment_id = str(form.get("id") or "").strip()
        if not payment_id:
            return {"ok": True}
        row = (await db.execute(select(CommerceOrder).where(CommerceOrder.mollie_payment_id == payment_id))).scalar_one_or_none()
        if not row:
            # Pas de commande à nous : c'est peut-être un prélèvement automatique.
            if payment_id.startswith("tr_"):
                await _paiement_recurrent(db, payment_id)
                await db.commit()
            return {"ok": True}
        payment = await _mollie_get(payment_id)
        status = payment.get("status", "")
        mapping = {"paid": "paid", "authorized": "authorized", "pending": "pending", "open": "pending",
                   "failed": "failed", "canceled": "canceled", "expired": "expired"}
        deja_payee = row.status == "paid"
        row.status = mapping.get(status, "pending")
        row.updated_at = utcnow()
        if row.kind == "saas" and row.status == "paid" and not deja_payee and row.user_id:
            meta = row.metadata_json or {}
            cle_plan = str(meta.get("plan") or "")
            if cle_plan in pricing:
                a = await db.get(Abonnement, row.user_id)
                if not a:
                    a = Abonnement(user_id=row.user_id)
                    db.add(a)
                maintenant = datetime.now(timezone.utc)
                fin = _aware(a.fin)
                if meta.get("essai"):
                    a.fin = maintenant + timedelta(days=int(meta.get("jours") or 60))
                    a.essai_le = maintenant
                else:
                    jours = 366 if meta.get("cycle") == "annuel" else 31
                    if fin and fin > maintenant and a.plan == cle_plan:
                        depart = fin
                    elif fin and fin > maintenant and a.plan != "essentielle" and a.montant_ttc:
                        # Changement d'offre : le temps restant est converti au prorata du nouveau prix.
                        restant = (fin - maintenant).total_seconds() / 86400
                        ratio = float(a.montant_ttc) / max(float(row.amount), 0.01)
                        if a.cycle == "annuel" and meta.get("cycle") != "annuel":
                            ratio /= 12
                        elif a.cycle != "annuel" and meta.get("cycle") == "annuel":
                            ratio *= 12
                        depart = maintenant + timedelta(days=max(0.0, restant * ratio))
                    else:
                        depart = maintenant
                    a.fin = depart + timedelta(days=jours)
                a.plan, a.cycle = cle_plan, str(meta.get("cycle") or "mensuel")[:10]
                a.fondateur = bool(a.fondateur or meta.get("fondateur"))
                a.updated_at = utcnow()
                profil = await g["_profil"](db, row.user_id)
                profil.plan = cle_plan
                try:
                    await _creer_abonnement_mollie(a, meta, pricing[cle_plan].get("label", cle_plan))
                except HTTPException as e:
                    _log("Abonnement Mollie non créé pour %s : %s", row.user_id, e.detail)
        await db.commit()
        return {"ok": True}

    @api.post("/abonnement/resilier")
    async def resilier(db: AsyncSession = Depends(get_db)):
        """Arrête les prélèvements. L'accès reste ouvert jusqu'à la fin de la période payée."""
        a = await db.get(Abonnement, _uid())
        if not a or not _actif(a):
            raise HTTPException(404, "Aucun abonnement en cours.")
        if a.mollie_subscription_id and a.mollie_customer_id:
            await _mollie("DELETE", f"customers/{a.mollie_customer_id}/subscriptions/{a.mollie_subscription_id}")
        a.mollie_subscription_id = None
        a.resilie = True
        a.updated_at = utcnow()
        await db.commit()
        return {"ok": True, "fin": _aware(a.fin).isoformat()}

    @api.post("/abonnement/reprendre")
    async def reprendre(db: AsyncSession = Depends(get_db)):
        """Annule une résiliation : les prélèvements reprennent à la fin de la période en cours."""
        a = await db.get(Abonnement, _uid())
        if not a or not _actif(a) or not a.resilie or not a.mollie_customer_id or not a.montant_ttc:
            raise HTTPException(400, "Rien à reprendre : choisis une offre sur la page Tarifs.")
        meta = {"recurrent_ttc": a.montant_ttc, "intervalle": "12 months" if a.cycle == "annuel" else "1 month"}
        await _creer_abonnement_mollie(a, meta, pricing.get(a.plan, {}).get("label", a.plan))
        await db.commit()
        return {"ok": True}

    class ChangerIn(BaseModel):
        plan: str

    @api.post("/abonnement/changer")
    async def changer_offre(body: ChangerIn, db: AsyncSession = Depends(get_db)):
        """Passer à Rêveur au prochain prélèvement (au lieu de résilier) : l'offre actuelle
        reste ouverte jusqu'à la fin de la période, puis 15 € TTC / mois."""
        cible = body.plan.lower()
        if cible != "reveur" or cible not in pricing:
            raise HTTPException(400, "Pour passer à une offre supérieure, choisis-la sur la page Tarifs.")
        a = await db.get(Abonnement, _uid())
        if not a or not _actif(a) or not a.mollie_customer_id:
            raise HTTPException(400, "Aucun abonnement en cours à modifier.")
        if a.plan == cible:
            raise HTTPException(409, "Tu es déjà sur l'offre Rêveur.")
        p = pricing[cible]
        ttc = float(p["ttc"]["mensuel"]) if p.get("ttc") else round(float(p["mensuel"]) * (1 + _tva()), 2)
        # Le tarif fondateur (Solo / Pro) reste acquis : a.fondateur n'est pas modifié.
        await _creer_abonnement_mollie(a, {"recurrent_ttc": f"{ttc:.2f}", "intervalle": "1 month"}, p.get("label", cible))
        a.plan_suivant = cible
        a.updated_at = utcnow()
        await db.commit()
        return {"ok": True, "a_partir_du": _aware(a.fin).date().isoformat(), "montant_ttc": f"{ttc:.2f}"}

    # ── Rappel avant le premier prélèvement (fin d'essai) et avant un renouvellement annuel ──
    def _eur(v) -> str:
        return f"{float(v):.2f}".replace(".", ",") + " €"

    async def tour_rappels(now: datetime | None = None) -> int:
        now = now or datetime.now(timezone.utc)
        envoyer = g.get("send_email")
        session = g.get("async_session")
        if not envoyer or not session:
            return 0
        n = 0
        async with session() as db:
            rows = list((await db.execute(select(Abonnement).where(
                Abonnement.mollie_subscription_id.is_not(None), Abonnement.rappel_le.is_(None)))).scalars())
            for a in rows:
                fin = _aware(a.fin)
                if not fin or a.resilie or a.cycle not in ("essai", "annuel"):
                    continue
                delai = 7 if a.cycle == "essai" else 15
                if not (now < fin <= now + timedelta(days=delai)):
                    continue
                u = await db.get(User, a.user_id)
                if not u or not u.email:
                    continue
                a.rappel_le = now
                await db.commit()
                label = pricing.get(a.plan, {}).get("label", a.plan)
                quand = fin.strftime("%d/%m/%Y")
                rythme = "par an" if a.cycle == "annuel" else "par mois"
                objet = "Ton essai Zayado se termine bientôt" if a.cycle == "essai" else "Ton abonnement Zayado se renouvelle bientôt"
                html = (f"<p>Bonjour,</p><p>{'Ton essai' if a.cycle == 'essai' else 'Ton abonnement'} Zayado {label} "
                        f"se termine le <b>{quand}</b>. Ensuite, <b>{_eur(a.montant_ttc or 0)} TTC {rythme}</b> seront prélevés "
                        f"automatiquement{' (tarif fondateur, garanti tant que tu restes abonné)' if a.fondateur else ''}.</p>"
                        + (f"<p>Tu veux juste garder ta Vision et tes idées, sans le Radar ? Passe à l'offre <b>Rêveur</b> "
                           f"(15 € TTC / mois) depuis la même page.</p>" if a.cycle == "essai" and a.plan != "reveur" and not a.plan_suivant else "")
                        + f"<p>Rien à faire pour continuer. Pour arrêter, un clic suffit : "
                        f"<a href=\"{_frontend_url()}/parametres#facturation\">Paramètres › Offre &amp; factures</a>. "
                        f"Tu gardes alors l'accès jusqu'au {quand}.</p><p>L'équipe Zayado</p>")
                try:
                    await envoyer(to=u.email, subject=objet, html=html)
                    n += 1
                except Exception as e:  # noqa: BLE001
                    _log("Rappel d'abonnement non envoyé (%s) : %s", a.user_id, e)
        return n

    async def _boucle_rappels():
        await asyncio.sleep(60)
        while True:
            try:
                await tour_rappels()
            except Exception as e:  # noqa: BLE001
                _log("Boucle des rappels d'abonnement : %s", e)
            await asyncio.sleep(3600)

    app = g.get("app")
    if app is not None:
        @app.on_event("startup")
        async def _demarrer_rappels():
            if os.environ.get("RAPPELS_ABONNEMENT", "1").strip().lower() in ("0", "false", "non", "off"):
                return
            asyncio.create_task(_boucle_rappels())

    g["tour_rappels"] = tour_rappels

    # ── Offre Équipe : le titulaire invite ses coéquipiers (espace Solo chacun) ──
    class MembreIn(BaseModel):
        email: str = Field(min_length=5, max_length=255)

    @api.get("/equipe")
    async def equipe(db: AsyncSession = Depends(get_db)):
        uid = _uid()
        a = await db.get(Abonnement, uid)
        places = PLACES_EQUIPE.get(a.plan, 0) if _actif(a) else 0
        membres = list((await db.execute(select(EquipeMembre).where(EquipeMembre.owner_id == uid)
                                          .order_by(EquipeMembre.created_at))).scalars())
        inscrits = {e for e in (await db.execute(select(User.email).where(
            User.email.in_([m.email for m in membres] or ["-"])))).scalars()}
        return {"places": places, "membres": [{"id": m.id, "email": m.email, "inscrit": m.email in inscrits} for m in membres]}

    @api.post("/equipe")
    async def inviter_membre(body: MembreIn, db: AsyncSession = Depends(get_db)):
        uid = _uid()
        a = await db.get(Abonnement, uid)
        places = PLACES_EQUIPE.get(a.plan, 0) if _actif(a) else 0
        if places <= 0:
            raise HTTPException(403, "L'invitation de coéquipiers est incluse dans l'offre Équipe.")
        email = body.email.strip().lower()
        if "@" not in email:
            raise HTTPException(422, "Adresse e-mail invalide.")
        moi = await db.get(User, uid)
        if moi and moi.email and moi.email.lower() == email:
            raise HTTPException(422, "Tu es déjà titulaire de l'équipe.")
        n = (await db.execute(select(func.count()).select_from(EquipeMembre).where(EquipeMembre.owner_id == uid))).scalar_one()
        if n >= places:
            raise HTTPException(409, f"Ton offre comprend {places} coéquipier(s). Retire quelqu'un pour inviter une autre personne.")
        if (await db.execute(select(EquipeMembre).where(EquipeMembre.owner_id == uid, EquipeMembre.email == email))).scalar_one_or_none():
            raise HTTPException(409, "Cette personne est déjà dans ton équipe.")
        m = EquipeMembre(owner_id=uid, email=email)
        db.add(m)
        await db.commit()
        envoyer = g.get("send_email")
        if envoyer:
            try:
                await envoyer(to=email, subject="Tu es invité(e) sur Zayado",
                              html=(f"<p>Bonjour,</p><p>{(moi.email if moi else 'Un membre')} t'offre un espace Zayado dans son équipe : "
                                    f"ton propre cockpit, ta Vision, ton Radar et ton Plan d'action.</p>"
                                    f"<p><a href=\"{_frontend_url()}/login?next=%2Fonboarding\">Créer mon espace avec cette adresse</a></p>"))
            except Exception as e:  # noqa: BLE001
                _log("Invitation équipe non envoyée : %s", e)
        return {"id": m.id, "email": m.email, "inscrit": False}

    @api.delete("/equipe/{membre_id}")
    async def retirer_membre(membre_id: str, db: AsyncSession = Depends(get_db)):
        m = (await db.execute(select(EquipeMembre).where(EquipeMembre.id == membre_id,
                                                         EquipeMembre.owner_id == _uid()))).scalar_one_or_none()
        if not m:
            raise HTTPException(404, "Membre introuvable.")
        await db.delete(m)
        await db.commit()
        return {"ok": True}

    @api.get("/commerce/health")
    async def commerce_health():
        return {"ok": True, "mollie_configured": bool(_mollie_key())}

    g["CommerceOrder"] = CommerceOrder
