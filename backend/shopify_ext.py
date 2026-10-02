"""Zayado — Shopify × vendeurs : commandes par boutique, suivi de statut.

Shopify reste la vitrine et l'encaissement. Ce module rapatrie les commandes
dans Zayado pour que :
  - le vendeur voie les commandes de SES produits (en attente, payé, expédié…)
  - le client suive ses commandes, boutique par boutique
  - l'admin voie tout, branche et vérifie Shopify sans quitter l'app

Lien commande → vendeur : chaque ligne de commande Shopify porte un product_id ;
on le rapproche de VendorProduct.shopify_id (rempli à la publication). Une
commande qui mélange plusieurs vendeurs donne une ligne par vendeur.

Variables Railway (service backend) :
  SHOPIFY_SHOP_DOMAIN       ex. zayado.myshopify.com            (déjà utilisée)
  SHOPIFY_ADMIN_TOKEN       jeton Admin API shpat_…             (déjà utilisée)
  SHOPIFY_WEBHOOK_SECRET    « Clé secrète de l'API » de l'app Shopify (signature des webhooks)
  SHOPIFY_API_VERSION       facultatif, défaut 2025-01
  SHOPIFY_WEBHOOK_BASE_URL  facultatif, URL publique du backend (sinon RAILWAY_PUBLIC_DOMAIN)

Droits Admin API requis : read_orders (+ read_all_orders pour remonter > 60 jours),
read_products. Webhook reçu sur POST /api/webhooks/shopify (route déjà publique :
le préfixe /api/webhooks/ l'est ; l'authentification est la signature HMAC).
"""
import base64
import hashlib
import hmac
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, Request
from sqlalchemy import DateTime, JSON, String, UniqueConstraint, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

log = logging.getLogger("kairos.shopify")

# Libellé court, utilisé tel quel côté client / vendeur / admin.
STATUTS = ("en_attente", "autorise", "paye", "expedie", "annule", "rembourse")
TOPICS_COMMANDE = ("ORDERS_CREATE", "ORDERS_PAID", "ORDERS_UPDATED", "ORDERS_CANCELLED", "ORDERS_FULFILLED")


# ───────────────────────── Fonctions pures (testables seules) ─────────────────────────

def statut_commande(financial: Optional[str], fulfillment: Optional[str], annule_le: Optional[str] = None) -> str:
    """Résume paiement + livraison Shopify en un statut unique, dans l'ordre de gravité."""
    fin = (financial or "").lower()
    liv = (fulfillment or "").lower()
    if annule_le or fin == "voided":
        return "annule"
    if fin in ("refunded", "partially_refunded"):
        return "rembourse"
    if liv == "fulfilled":
        return "expedie"
    if fin == "paid":
        return "paye"
    if fin == "authorized":
        return "autorise"
    return "en_attente"  # pending, partially_paid, inconnu : on n'affirme pas « payé » dans le doute


def verifier_hmac(corps: bytes, entete: str, secret: str) -> bool:
    """Signature Shopify : base64(HMAC-SHA256(corps brut, secret)), comparée à temps constant."""
    if not (corps is not None and entete and secret):
        return False
    attendu = base64.b64encode(hmac.new(secret.encode("utf-8"), corps, hashlib.sha256).digest()).decode("ascii")
    return hmac.compare_digest(attendu, entete.strip())


def _decimal(v) -> Decimal:
    try:
        return Decimal(str(v))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0")


def parse_date(v) -> Optional[datetime]:
    if not v:
        return None
    try:
        d = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def regrouper_par_vendeur(payload: dict, produit_vers_vendeur: dict) -> dict:
    """{vendeur_user_id ou "" : {"lignes": [...], "montant": "12.34"}}.
    "" = lignes qui n'appartiennent à aucun vendeur (produits en propre de Zayado).
    Une commande mono-vendeur reprend le total Shopify (frais de port et remises inclus) ;
    une commande multi-vendeurs additionne les lignes de chacun."""
    groupes: dict = {}
    for l in payload.get("line_items") or []:
        pid = l.get("product_id")
        vendeur = produit_vers_vendeur.get(f"gid://shopify/Product/{pid}", "") if pid else ""
        qte = int(l.get("quantity") or 0)
        prix = _decimal(l.get("price"))
        g = groupes.setdefault(vendeur, {"lignes": [], "somme": Decimal("0")})
        g["lignes"].append({"titre": (l.get("title") or l.get("name") or "")[:255], "quantite": qte,
                            "prix": f"{prix:.2f}", "sku": l.get("sku") or ""})
        g["somme"] += prix * qte
    if not groupes:
        groupes[""] = {"lignes": [], "somme": Decimal("0")}
    seul = len(groupes) == 1
    out = {}
    for vendeur, g in groupes.items():
        total = _decimal(payload.get("total_price")) if seul else g["somme"]
        out[vendeur] = {"lignes": g["lignes"], "montant": f"{total:.2f}"}
    return out


def _nom_client(payload: dict) -> str:
    c = payload.get("customer") or {}
    nom = f"{c.get('first_name') or ''} {c.get('last_name') or ''}".strip()
    if not nom:
        a = payload.get("shipping_address") or payload.get("billing_address") or {}
        nom = (a.get("name") or "").strip()
    return nom[:255]


def _suivi(payload: dict) -> list:
    out = []
    for f in payload.get("fulfillments") or []:
        if f.get("tracking_number") or f.get("tracking_url"):
            out.append({"transporteur": f.get("tracking_company") or "", "numero": f.get("tracking_number") or "",
                        "url": f.get("tracking_url") or ""})
    return out


# ───────────────────────── Installation (branchée sur server.py) ─────────────────────────

def install_shopify(g: dict) -> None:
    Base = g["Base"]
    api = g["api"]
    get_db = g["get_db"]
    _uid = g["_uid"]
    User = g["User"]
    DEMO_USER_ID = g["DEMO_USER_ID"]
    utcnow = g["utcnow"]
    exiger_role = g["exiger_role"]
    VendorProduct = g.get("VendorProduct")
    VendorProfile = g.get("VendorProfile")

    class ShopifyOrder(Base):
        """Une ligne par (commande Shopify, vendeur). Statut recalculé à chaque événement Shopify."""
        __tablename__ = "shopify_orders"
        __table_args__ = (UniqueConstraint("shopify_order_id", "vendor_user_id", name="uq_shopify_order_vendor"),)
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: __import__("uuid").uuid4().hex)
        shopify_order_id: Mapped[str] = mapped_column(String(40), index=True)
        vendor_user_id: Mapped[str] = mapped_column(String(36), index=True, default="")
        boutique: Mapped[str] = mapped_column(String(160), default="")
        shop: Mapped[str] = mapped_column(String(255), default="")
        name: Mapped[str] = mapped_column(String(40), default="")
        email: Mapped[str] = mapped_column(String(255), index=True, default="")
        client: Mapped[str] = mapped_column(String(255), default="")
        montant: Mapped[str] = mapped_column(String(20), default="0.00")
        currency: Mapped[str] = mapped_column(String(3), default="EUR")
        financial_status: Mapped[str] = mapped_column(String(30), default="")
        fulfillment_status: Mapped[str] = mapped_column(String(30), default="")
        statut: Mapped[str] = mapped_column(String(20), index=True, default="en_attente")
        lignes: Mapped[list] = mapped_column(JSON, default=list)
        suivi: Mapped[list] = mapped_column(JSON, default=list)
        passee_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
        maj_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    g["ShopifyOrder"] = ShopifyOrder

    # ── Config ──
    def _boutique() -> str:
        return (os.environ.get("SHOPIFY_SHOP_DOMAIN", "") or "").replace("https://", "").strip().strip("/")

    def _token() -> str:
        return os.environ.get("SHOPIFY_ADMIN_TOKEN", "").strip()

    def _secret() -> str:
        return (os.environ.get("SHOPIFY_WEBHOOK_SECRET") or os.environ.get("SHOPIFY_API_SECRET") or "").strip()

    def _version() -> str:
        return os.environ.get("SHOPIFY_API_VERSION", "2025-01").strip()

    def _url_webhook() -> str:
        base = (os.environ.get("SHOPIFY_WEBHOOK_BASE_URL") or "").strip().rstrip("/")
        if not base and os.environ.get("RAILWAY_PUBLIC_DOMAIN"):
            base = "https://" + os.environ["RAILWAY_PUBLIC_DOMAIN"].strip()
        if not base:
            base = os.environ.get("PUBLIC_FRONTEND_URL", "https://app.zayado.net").rstrip("/")
        return f"{base}/api/webhooks/shopify"

    def _manquants() -> list:
        m = []
        if not _boutique():
            m.append("SHOPIFY_SHOP_DOMAIN")
        if not _token():
            m.append("SHOPIFY_ADMIN_TOKEN")
        if not _secret():
            m.append("SHOPIFY_WEBHOOK_SECRET")
        return m

    def _entetes() -> dict:
        return {"X-Shopify-Access-Token": _token(), "Content-Type": "application/json"}

    def _exiger_config_api() -> None:
        if not (_boutique() and _token()):
            raise HTTPException(503, "Shopify n'est pas configuré : SHOPIFY_SHOP_DOMAIN et SHOPIFY_ADMIN_TOKEN manquent côté serveur.")

    def _erreur_http(r: httpx.Response) -> None:
        if r.status_code == 401:
            raise HTTPException(502, "Shopify a refusé le jeton d'accès. Vérifie SHOPIFY_ADMIN_TOKEN.")
        if r.status_code == 403:
            raise HTTPException(502, "Droit manquant côté Shopify : ajoute read_orders (et read_all_orders pour l'historique > 60 jours) à l'application.")
        if r.status_code == 404:
            raise HTTPException(502, f"Boutique ou version d'API introuvable ({_boutique()}, {_version()}).")
        if r.status_code >= 400:
            raise HTTPException(502, f"Shopify a répondu {r.status_code} : {r.text[:300]}")

    async def _graphql(query: str, variables: Optional[dict] = None) -> dict:
        _exiger_config_api()
        url = f"https://{_boutique()}/admin/api/{_version()}/graphql.json"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.post(url, headers=_entetes(), json={"query": query, "variables": variables or {}})
        except Exception as e:  # noqa: BLE001
            log.warning("Shopify injoignable : %s", e)
            raise HTTPException(503, "Shopify est injoignable pour l'instant. Réessaie dans un instant.")
        _erreur_http(r)
        data = r.json()
        if data.get("errors"):
            raise HTTPException(502, "Shopify a rejeté la requête : " + "; ".join(str(e.get("message", "")) for e in data["errors"])[:400])
        return data.get("data") or {}

    # ── Utilisateurs / rôles ──
    async def _utilisateur(db: AsyncSession):
        uid = _uid()
        if uid == DEMO_USER_ID:
            raise HTTPException(401, "Connecte-toi pour consulter tes commandes.")
        u = await db.get(User, uid)
        if not u:
            raise HTTPException(401, "Connecte-toi pour consulter tes commandes.")
        return u

    async def _noms_boutiques(db: AsyncSession, vendeurs: list) -> dict:
        noms = {}
        if not vendeurs:
            return noms
        if VendorProfile is not None:
            for row in (await db.execute(select(VendorProfile).where(VendorProfile.user_id.in_(vendeurs)))).scalars():
                noms[row.user_id] = ((row.data or {}).get("nom_boutique") or "").strip()
        manque = [v for v in vendeurs if not noms.get(v)]
        if manque and VendorProduct is not None:
            for uid, nom in (await db.execute(select(VendorProduct.user_id, VendorProduct.vendeur)
                                              .where(VendorProduct.user_id.in_(manque)))).all():
                if nom and not noms.get(uid):
                    noms[uid] = nom
        return noms

    # ── Ingestion : même format pour les webhooks et la synchro REST ──
    async def _ingerer(db: AsyncSession, payload: dict) -> int:
        oid = str(payload.get("id") or "")
        if not oid:
            return 0
        gids = {f"gid://shopify/Product/{l['product_id']}" for l in payload.get("line_items") or [] if l.get("product_id")}
        produit_vers_vendeur = {}
        if gids and VendorProduct is not None:
            rows = (await db.execute(select(VendorProduct.shopify_id, VendorProduct.user_id)
                                     .where(VendorProduct.shopify_id.in_(gids)))).all()
            produit_vers_vendeur = {sid: uid for sid, uid in rows}
        groupes = regrouper_par_vendeur(payload, produit_vers_vendeur)
        noms = await _noms_boutiques(db, [v for v in groupes if v])
        statut = statut_commande(payload.get("financial_status"), payload.get("fulfillment_status"), payload.get("cancelled_at"))
        email = (payload.get("email") or (payload.get("customer") or {}).get("email") or "").strip().lower()
        existantes = {r.vendor_user_id: r for r in (await db.execute(
            select(ShopifyOrder).where(ShopifyOrder.shopify_order_id == oid))).scalars()}
        n = 0
        for vendeur, grp in groupes.items():
            row = existantes.get(vendeur)
            if row is None:
                row = ShopifyOrder(shopify_order_id=oid, vendor_user_id=vendeur)
                db.add(row)
            row.boutique = noms.get(vendeur) or ("Zayado" if not vendeur else "Boutique partenaire")
            row.shop = _boutique()
            row.name = str(payload.get("name") or f"#{payload.get('order_number', '')}")[:40]
            row.email = email[:255]
            row.client = _nom_client(payload)
            row.montant = grp["montant"]
            row.currency = (payload.get("currency") or "EUR")[:3]
            row.financial_status = (payload.get("financial_status") or "")[:30]
            row.fulfillment_status = (payload.get("fulfillment_status") or "")[:30]
            row.statut = statut
            row.lignes = grp["lignes"]
            row.suivi = _suivi(payload)
            row.passee_le = parse_date(payload.get("created_at"))
            row.maj_le = utcnow()
            n += 1
        await db.commit()
        return n

    def _serialiser(r: "ShopifyOrder", vendeur: bool = False) -> dict:
        out = {"id": r.id, "commande": r.name, "boutique": r.boutique, "statut": r.statut,
               "paiement": r.financial_status, "livraison": r.fulfillment_status or "non_expediee",
               "montant": r.montant, "devise": r.currency, "lignes": r.lignes or [], "suivi": r.suivi or [],
               "passee_le": r.passee_le.isoformat() if r.passee_le else None,
               "maj_le": r.maj_le.isoformat() if r.maj_le else None}
        if vendeur:
            out["client"] = r.client  # pas d'e-mail côté vendeur : Shopify reste le point de contact
        return out

    def _compteurs(rows: list) -> dict:
        c = {s: 0 for s in STATUTS}
        for r in rows:
            c[r.statut] = c.get(r.statut, 0) + 1
        return c

    # ══════════════ Webhook Shopify (public, signé) ══════════════

    @api.post("/webhooks/shopify")
    async def shopify_webhook(request: Request, db: AsyncSession = Depends(get_db)):
        secret = _secret()
        if not secret:
            raise HTTPException(503, "SHOPIFY_WEBHOOK_SECRET manquant côté serveur.")
        corps = await request.body()
        if not verifier_hmac(corps, request.headers.get("x-shopify-hmac-sha256", ""), secret):
            raise HTTPException(401, "Signature Shopify invalide.")
        shop = (request.headers.get("x-shopify-shop-domain") or "").lower()
        if _boutique() and shop and shop != _boutique().lower():
            raise HTTPException(403, "Boutique inattendue.")
        topic = (request.headers.get("x-shopify-topic") or "").lower()
        if not topic.startswith("orders/"):
            return {"ok": True, "ignore": topic}
        try:
            payload = json.loads(corps)
        except ValueError:
            raise HTTPException(400, "Corps JSON invalide.")
        if topic == "orders/delete":
            await db.execute(delete(ShopifyOrder).where(ShopifyOrder.shopify_order_id == str(payload.get("id") or "")))
            await db.commit()
            return {"ok": True}
        n = await _ingerer(db, payload)
        log.info("Shopify %s → commande %s (%d ligne(s) vendeur)", topic, payload.get("name"), n)
        return {"ok": True}

    # ══════════════ État de la connexion ══════════════

    @api.get("/shopify/etat")
    async def shopify_etat(db: AsyncSession = Depends(get_db)):
        u = await _utilisateur(db)
        out = {"configure": bool(_boutique() and _token()), "boutique": _boutique() or None,
               "webhooks_prets": bool(_secret())}
        if u.role == "admin":
            out["manquants"] = _manquants()
            out["webhook_url"] = _url_webhook()
            out["version_api"] = _version()
            out["commandes_en_base"] = (await db.execute(select(func.count()).select_from(ShopifyOrder))).scalar_one()
        return out

    # ══════════════ Vendeur : commandes de SES produits ══════════════

    @api.get("/vendeur/commandes")
    async def vendeur_commandes(statut: Optional[str] = None, tous: bool = False, limit: int = 100,
                                db: AsyncSession = Depends(get_db)):
        u = await _utilisateur(db)
        if u.role not in ("vendeur", "admin"):
            raise HTTPException(403, "Réservé aux comptes vendeur.")
        requete = select(ShopifyOrder)
        if not (tous and u.role == "admin"):
            requete = requete.where(ShopifyOrder.vendor_user_id == u.id)
        rows = (await db.execute(requete.order_by(ShopifyOrder.passee_le.desc()).limit(min(max(limit, 1), 250)))).scalars().all()
        compteurs = _compteurs(rows)
        if statut:
            rows = [r for r in rows if r.statut == statut]
        return {"items": [_serialiser(r, vendeur=True) for r in rows], "compteurs": compteurs}

    # ══════════════ Client : « suivi de commande » ══════════════

    @api.get("/shopify/mes-commandes")
    async def mes_commandes_boutique(db: AsyncSession = Depends(get_db)):
        u = await _utilisateur(db)
        email = (u.email or "").strip().lower()
        if not email:
            return {"items": []}
        rows = (await db.execute(select(ShopifyOrder).where(ShopifyOrder.email == email)
                                 .order_by(ShopifyOrder.passee_le.desc()).limit(100))).scalars().all()
        return {"items": [_serialiser(r) for r in rows]}

    # ══════════════ Admin : brancher, vérifier, synchroniser ══════════════

    @api.get("/admin/shopify/verifier")
    async def admin_shopify_verifier(_role=Depends(exiger_role("admin"))):
        """Teste le jeton : nom de la boutique + droits accordés à l'application."""
        data = await _graphql("{ shop { name myshopifyDomain } appInstallation { accessScopes { handle } } }")
        droits = [s["handle"] for s in ((data.get("appInstallation") or {}).get("accessScopes") or [])]
        return {"ok": True, "boutique": (data.get("shop") or {}).get("name"),
                "domaine": (data.get("shop") or {}).get("myshopifyDomain"), "droits": droits,
                "droits_manquants": [d for d in ("read_orders", "read_products") if d not in droits],
                "webhook_secret_present": bool(_secret())}

    @api.post("/admin/shopify/webhooks/enregistrer")
    async def admin_shopify_webhooks(_role=Depends(exiger_role("admin"))):
        if not _secret():
            raise HTTPException(409, "Ajoute d'abord SHOPIFY_WEBHOOK_SECRET dans Railway (clé secrète de l'application Shopify).")
        mutation = """
        mutation($topic: WebhookSubscriptionTopic!, $sub: WebhookSubscriptionInput!) {
          webhookSubscriptionCreate(topic: $topic, webhookSubscription: $sub) {
            webhookSubscription { id } userErrors { field message }
          }
        }"""
        url, resultats = _url_webhook(), {}
        for topic in TOPICS_COMMANDE:
            data = await _graphql(mutation, {"topic": topic, "sub": {"callbackUrl": url, "format": "JSON"}})
            fautes = (data.get("webhookSubscriptionCreate") or {}).get("userErrors") or []
            if not fautes:
                resultats[topic] = "créé"
            elif any("already been taken" in (f.get("message") or "") for f in fautes):
                resultats[topic] = "déjà enregistré"
            else:
                resultats[topic] = "refusé : " + "; ".join(f.get("message", "") for f in fautes)[:200]
        return {"ok": all(v in ("créé", "déjà enregistré") for v in resultats.values()), "url": url, "topics": resultats}

    @api.post("/admin/shopify/synchroniser")
    async def admin_shopify_synchroniser(jours: int = 60, db: AsyncSession = Depends(get_db),
                                          _role=Depends(exiger_role("admin"))):
        """Rattrapage : relit les commandes récentes (si un webhook a été manqué, ou pour amorcer l'historique)."""
        _exiger_config_api()
        depuis = (datetime.now(timezone.utc) - timedelta(days=min(max(jours, 1), 365))).isoformat()
        url = f"https://{_boutique()}/admin/api/{_version()}/orders.json"
        params = {"status": "any", "limit": 250, "created_at_min": depuis}
        commandes = lignes = 0
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                for _page in range(20):  # garde-fou : 5 000 commandes max par synchro
                    r = await client.get(url, headers=_entetes(), params=params)
                    _erreur_http(r)
                    for o in r.json().get("orders") or []:
                        lignes += await _ingerer(db, o)
                        commandes += 1
                    suivant = (r.links.get("next") or {}).get("url")
                    if not suivant:
                        break
                    url, params = suivant, None
        except HTTPException:
            raise
        except Exception as e:  # noqa: BLE001
            log.warning("Synchro Shopify interrompue : %s", e)
            raise HTTPException(503, "Shopify est injoignable pour l'instant. Réessaie dans un instant.")
        return {"ok": True, "commandes": commandes, "lignes_vendeur": lignes}

    @api.get("/admin/shopify/commandes")
    async def admin_shopify_commandes(statut: Optional[str] = None, limit: int = 100, db: AsyncSession = Depends(get_db),
                                       _role=Depends(exiger_role("admin"))):
        requete = select(ShopifyOrder)
        if statut:
            requete = requete.where(ShopifyOrder.statut == statut)
        rows = (await db.execute(requete.order_by(ShopifyOrder.passee_le.desc()).limit(min(max(limit, 1), 250)))).scalars().all()
        tout = (await db.execute(select(ShopifyOrder.statut, func.count()).group_by(ShopifyOrder.statut))).all()
        return {"items": [{**_serialiser(r, vendeur=True), "email": r.email, "vendor_user_id": r.vendor_user_id} for r in rows],
                "compteurs": {s: 0 for s in STATUTS} | {s: n for s, n in tout}}
