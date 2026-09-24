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
from sqlalchemy import Boolean, DateTime, JSON, String, Text, func, select
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

    # ── Essai « 2 mois pour 1 € » (modèle Shopify) — plus d'offre gratuite ──
    # ESSAI_ACTIF=0 pour couper · ESSAI_PRIX (TTC, défaut 1) · ESSAI_JOURS (défaut 60) · ESSAI_PLAN (défaut serenite)
    def _essai_conf() -> dict:
        try:
            prix = float(os.environ.get("ESSAI_PRIX", "1"))
        except ValueError:
            prix = 1.0
        try:
            jours = int(os.environ.get("ESSAI_JOURS", "60"))
        except ValueError:
            jours = 60
        return {"actif": os.environ.get("ESSAI_ACTIF", "1").strip() not in ("0", "false", "non"),
                "prix": prix, "jours": jours, "plan": os.environ.get("ESSAI_PLAN", "serenite").strip() or "serenite"}

    # ── Tarif fondateur (réglable sur Railway, sans toucher au code) ──
    # FONDATEUR_ACTIF=0 pour couper l'offre · FONDATEUR_FIN=AAAA-MM-JJ · FONDATEUR_PLACES=100
    PRIX_FONDATEUR = {"serenite": {"mensuel": 19.0, "annuel": 180.0}, "pro": {"mensuel": 49.0, "annuel": 468.0}}

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

    @api.get("/abonnement")
    async def mon_abonnement(db: AsyncSession = Depends(get_db)):
        uid = _uid()
        a = await db.get(Abonnement, uid)
        # Offre choisie à l'onboarding mais pas encore payée : on l'indique
        # (avant, le profil affichait « Découverte » sans explication).
        attente = None
        VP = g.get("VisionProfile")
        if VP is not None:
            p = (await db.execute(select(VP).where(VP.user_id == uid))).scalar_one_or_none()
            cm = (getattr(p, "contexte_metier", None) or {}) if p else {}
            attente = cm.get("plan_souhaite") if isinstance(cm, dict) else None
        plan = a.plan if a else "essentielle"
        if attente in (None, "", "essentielle") or attente == plan:
            attente = None
        conf = _essai_conf()
        maintenant = datetime.now(timezone.utc)
        fin = (a.fin if a.fin.tzinfo else a.fin.replace(tzinfo=timezone.utc)) if (a and a.fin) else None
        actif = bool(a and a.plan != "essentielle" and fin and fin > maintenant)
        # Rôles internes (admin, vendeur) : accès sans abonnement.
        u = await db.get(User, uid)
        role_interne = bool(u and u.role in ("admin", "vendeur"))
        essai = {"disponible": conf["actif"] and not (a and (a.essai_le or (a.plan != "essentielle" and a.fin))),
                 "prix": conf["prix"], "jours": conf["jours"], "plan": conf["plan"]}
        base = {"plan_en_attente": attente, "essai": essai,
                "acces": "actif" if (actif or role_interne) else "aucun",
                "en_essai": bool(actif and a.cycle == "essai")}
        if not a:
            return {"plan": "essentielle", "fondateur": False, "fin": None, **base}
        return {"plan": a.plan, "cycle": a.cycle, "fondateur": bool(a.fondateur),
                "fin": fin.isoformat() if fin else None, **base}

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
        # Les tarifs affichés sont HT : on encaisse le TTC (TVA 20 % par défaut,
        # réglable avec TVA_TAUX, ex. 0 pour une franchise en base de TVA).
        try:
            tva = float(os.environ.get("TVA_TAUX", "0.20"))
        except ValueError:
            tva = 0.20
        amount = round(amount_ht * (1 + max(0.0, tva)), 2)
        uid = _uid()
        user = None if uid == DEMO_USER_ID else await db.get(User, uid)
        if not user:
            raise HTTPException(401, "Connecte-toi avant de souscrire.")
        order = CommerceOrder(user_id=uid, email=(body.email or user.email).strip().lower(), kind="saas",
                              title=f"Zayado {plan['label']}{' (tarif fondateur)' if fondateur else ''} · {body.cycle} · TTC", amount=f"{amount:.2f}",
                              access_url=f"{_frontend_url()}/app", metadata_json={"plan": body.plan.lower(), "cycle": body.cycle, "montant_ht": f"{amount_ht:.2f}", "tva_taux": tva, "fondateur": fondateur})
        db.add(order)
        await db.flush()
        payment = await _mollie_create(order)
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
        order = CommerceOrder(user_id=uid, email=(body.email or user.email).strip().lower(), kind="saas",
                              title=f"Zayado {label} · essai {conf['jours'] // 30} mois · TTC", amount=f"{prix:.2f}",
                              access_url=f"{_frontend_url()}/app",
                              metadata_json={"plan": conf["plan"], "cycle": "essai", "essai": True, "jours": conf["jours"],
                                             "montant_ttc": f"{prix:.2f}", "fondateur": fondateur})
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
        deja_payee = row.status == "paid"
        row.status = mapping.get(status, "pending")
        row.updated_at = utcnow()
        # Corrigé : le paiement était marqué « payé » mais l'offre n'était jamais
        # activée — un client qui payait Pro restait sur l'offre gratuite.
        if row.kind == "saas" and row.status == "paid" and not deja_payee and row.user_id:
            meta = row.metadata_json or {}
            cle_plan = str(meta.get("plan") or "")
            if cle_plan in pricing:
                from datetime import timedelta
                a = await db.get(Abonnement, row.user_id)
                if not a:
                    a = Abonnement(user_id=row.user_id)
                    db.add(a)
                maintenant = datetime.now(timezone.utc)
                base = a.fin if (a.fin and a.plan == cle_plan) else None
                if base is not None and base.tzinfo is None:
                    base = base.replace(tzinfo=timezone.utc)
                depart = base if (base and base > maintenant) else maintenant
                if meta.get("essai"):
                    a.fin = maintenant + timedelta(days=int(meta.get("jours") or 60))
                    a.essai_le = maintenant
                else:
                    a.fin = depart + timedelta(days=366 if meta.get("cycle") == "annuel" else 31)
                a.plan, a.cycle = cle_plan, str(meta.get("cycle") or "mensuel")[:10]
                a.fondateur = bool(a.fondateur or meta.get("fondateur"))
                a.updated_at = utcnow()
                profil = await g["_profil"](db, row.user_id)
                profil.plan = cle_plan
        await db.commit()
        return {"ok": True}

    @api.get("/commerce/health")
    async def commerce_health():
        return {"ok": True, "mollie_configured": bool(_mollie_key())}

    g["CommerceOrder"] = CommerceOrder
