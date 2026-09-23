"""Commerce Zayado : commandes, paiements Mollie et accès privés.

Shopify reste la vitrine. Cette extension garde les commandes et les droits
chez Zayado afin que produits, services et SaaS passent par le même flux.
"""
from datetime import datetime, timezone
import os
import uuid
import httpx
from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, JSON, String, Text, func, select
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
        cycle: str = Field(pattern="^(mensuel|annuel)$")
        email: str | None = None

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

    async def _mollie_create(order: CommerceOrder) -> dict:
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
        plan = pricing.get(body.plan.lower())
        if not plan or plan.get(body.cycle) is None:
            raise HTTPException(400, "Cette offre est sur devis ou n'existe pas.")
        amount = float(plan[body.cycle])
        if amount <= 0:
            raise HTTPException(400, "Ce forfait est gratuit : aucun paiement requis.")
        uid = _uid()
        user = None if uid == DEMO_USER_ID else await db.get(User, uid)
        if not user:
            raise HTTPException(401, "Connecte-toi avant de souscrire.")
        order = CommerceOrder(user_id=uid, email=(body.email or user.email).strip().lower(), kind="saas",
                              title=f"Zayado {plan['label']} · {body.cycle}", amount=f"{amount:.2f}",
                              access_url=f"{_frontend_url()}/app", metadata_json={"plan": body.plan.lower(), "cycle": body.cycle})
        db.add(order)
        await db.flush()
        payment = await _mollie_create(order)
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

    @api.post("/mollie/webhook")
    async def commerce_mollie_webhook(request: Request, db: AsyncSession = Depends(get_db)):
        form = await request.form()
        payment_id = str(form.get("id") or "").strip()
        if not payment_id:
            return {"ok": True}
        row = (await db.execute(select(CommerceOrder).where(CommerceOrder.mollie_payment_id == payment_id))).scalar_one_or_none()
        if not row:
            return {"ok": True}
        payment = await _mollie_get(payment_id)
        status = payment.get("status", "")
        mapping = {"paid": "paid", "authorized": "authorized", "pending": "pending", "open": "pending",
                   "failed": "failed", "canceled": "canceled", "expired": "expired"}
        row.status = mapping.get(status, "pending")
        row.updated_at = utcnow()
        await db.commit()
        return {"ok": True}

    @api.get("/commerce/health")
    async def commerce_health():
        return {"ok": True, "mollie_configured": bool(_mollie_key())}

    g["CommerceOrder"] = CommerceOrder
