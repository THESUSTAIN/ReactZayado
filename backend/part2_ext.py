"""Kairos — Partie 2 : extensions branchées sur server.py sans le réécrire.

server.py appelle `install_part2(globals())` juste avant `app.include_router(api)`.
Ce module reçoit donc les objets de server.py (Base, api, app, get_db, _uid…) au
lieu de les importer — ça évite l'import circulaire et laisse server.py intact
(celui déployé a déjà divergé du zip d'origine : Radar, corrections…).

Contenu
  1. Auth obligatoire en prod (coupe le repli sur le compte démo partagé)
  2. Images IA pour le Vision Board (POST /vision/image, GET /vision/images/{id})
  3. Marketplace vendeur + modération (/vendeur/*) avec publication Shopify
  4. Pouls Business : source Qonto (connexion + synchronisation)

Non testé en exécution ici (FastAPI/SQLAlchemy non installables sans réseau) :
compilation Python vérifiée, logique pure testée à part. Voir LISEZMOI-partie2.md.
"""
import asyncio
import base64
import json
import logging
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, Integer, JSON, LargeBinary, String, Text, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column
from starlette.middleware.base import BaseHTTPMiddleware

log = logging.getLogger("kairos.part2")

STATUTS = ("brouillon", "en_attente", "publie", "refuse")
MAX_IMAGES = 6


# ───────────────────────── Fonctions pures (testables seules) ─────────────────────────

def nettoyer_html(html: str) -> str:
    """Retire scripts/iframes/attributs on*=… d'une description vendeur avant Shopify.
    Filtre volontairement simple : la vraie barrière reste la modération humaine."""
    html = html or ""
    html = re.sub(r"<\s*(script|iframe|object|embed|style)\b.*?<\s*/\s*\1\s*>", "", html, flags=re.I | re.S)
    html = re.sub(r"<\s*(script|iframe|object|embed|style)\b[^>]*>", "", html, flags=re.I)
    html = re.sub(r"\son\w+\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+)", "", html, flags=re.I)
    html = re.sub(r"javascript\s*:", "", html, flags=re.I)
    return html.strip()


def valider_produit(p: dict) -> list:
    """Problèmes de la fiche, en clair pour le vendeur (refuser tôt plutôt que chez Shopify)."""
    erreurs = []
    titre = (p.get("titre") or "").strip()
    if len(titre) < 3:
        erreurs.append("Le nom du produit doit faire au moins 3 caractères.")
    if len(titre) > 255:
        erreurs.append("Le nom du produit dépasse 255 caractères.")
    description = re.sub(r"<[^>]+>", "", p.get("description") or "").strip()
    if len(description) < 30:
        erreurs.append("La description doit faire au moins 30 caractères — c'est ce qui décide l'achat.")
    try:
        prix = float(str(p.get("prix", "")).replace(",", "."))
        if prix <= 0:
            erreurs.append("Le prix doit être supérieur à 0.")
    except (TypeError, ValueError):
        erreurs.append("Le prix n'est pas un nombre valide.")
    stock = p.get("stock")
    if stock not in (None, ""):
        try:
            if int(stock) < 0:
                erreurs.append("Le stock ne peut pas être négatif.")
        except (TypeError, ValueError):
            erreurs.append("Le stock doit être un nombre entier.")
    images = p.get("images") or []
    if not isinstance(images, list) or not images:
        erreurs.append("Ajoutez au moins une image — un produit sans photo ne se vend pas.")
    elif len(images) > MAX_IMAGES:
        erreurs.append(f"{MAX_IMAGES} images maximum.")
    else:
        for url in images:
            if not str(url).startswith(("http://", "https://")):
                erreurs.append("Chaque image doit être une adresse web complète (https://…).")
                break
    return erreurs


def centimes(valeur, defaut=0) -> int:
    """Montant Qonto (balance_cents / amount_cents, sinon balance / amount en euros) → centimes."""
    try:
        return int(valeur)
    except (TypeError, ValueError):
        return defaut


def debut_du_mois_utc(now: Optional[datetime] = None) -> str:
    now = now or datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def somme_qonto(transactions: list) -> int:
    """Somme en centimes des encaissements EUR d'une page de transactions Qonto."""
    total = 0
    for t in transactions or []:
        if (t.get("currency") or "EUR").upper() != "EUR":
            continue
        if t.get("amount_cents") is not None:
            total += centimes(t.get("amount_cents"))
        else:
            total += int(round(float(t.get("amount") or 0) * 100))
    return total


def solde_qonto(comptes: list) -> int:
    total = 0
    for b in comptes or []:
        if (b.get("status") or "active") != "active" or (b.get("currency") or "EUR").upper() != "EUR":
            continue
        if b.get("balance_cents") is not None:
            total += centimes(b.get("balance_cents"))
        else:
            total += int(round(float(b.get("balance") or 0) * 100))
    return total


# ───────────────────────────────── Installation ─────────────────────────────────

def install_part2(g: dict) -> None:
    Base = g["Base"]
    api = g["api"]
    app = g["app"]
    get_db = g["get_db"]
    _uid = g["_uid"]
    new_uuid = g["new_uuid"]
    utcnow = g["utcnow"]
    User = g["User"]
    DEMO_USER_ID = g["DEMO_USER_ID"]
    _pyjwt = g["_pyjwt"]
    JWT_SECRET = g["JWT_SECRET"]
    JWT_ALGO = g["JWT_ALGO"]
    _en_prod = g["_en_prod"]

    def _iso(dt):
        return dt.isoformat() if dt else None

    async def _exiger_compte():
        if _uid() == DEMO_USER_ID:
            raise HTTPException(403, "Connecte-toi avec un compte (lien magique, Google ou Microsoft) pour utiliser cette fonction.")

    # ══════════════ 1. Auth obligatoire (coupe le repli démo partagé) ══════════════

    PUBLIC_EXACT = ("/api", "/api/")
    PUBLIC_PREFIXES = (
        "/api/connexion/options", "/api/connexion/oauth/", "/api/connexion/lien", "/api/connexion/verifier",
        "/api/auth/register", "/api/auth/login",
        "/api/webhooks/", "/api/mollie/webhook",       # authentifiés par leurs propres secrets/uid
        "/api/vision/images/",                          # URL non devinable, lue par <img> (sans en-tête)
        "/api/subscribe",
        "/api/public/vision/",                          # lien de partage en lecture seule (jeton non devinable)
    )

    def _auth_requise(request: Request) -> bool:
        if os.environ.get("REQUIRE_AUTH", "").strip().lower() in ("1", "true", "yes", "on"):
            return True
        return _en_prod(request)

    class _RequireAuth(BaseHTTPMiddleware):
        async def dispatch(self, request, call_next):
            path = request.url.path
            if (request.method == "OPTIONS" or not path.startswith("/api")
                    or path in PUBLIC_EXACT or path.startswith(PUBLIC_PREFIXES)
                    or not _auth_requise(request)):
                return await call_next(request)
            auth = request.headers.get("authorization", "")
            ok = False
            if auth.startswith("Bearer "):
                try:
                    sub = _pyjwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGO]).get("sub")
                    ok = bool(sub) and sub != DEMO_USER_ID
                except Exception:  # noqa: BLE001 — jeton invalide/expiré
                    ok = False
            if not ok:
                return JSONResponse({"detail": "Authentification requise."}, status_code=401)
            return await call_next(request)

    app.add_middleware(_RequireAuth)

    # ══════════════ 2. Images IA (Vision Board) ══════════════

    class VisionImage(Base):
        __tablename__ = "vision_images"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        prompt: Mapped[str] = mapped_column(Text)
        mime: Mapped[str] = mapped_column(String(40), default="image/png")
        data: Mapped[bytes] = mapped_column(LargeBinary)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    IMAGE_LIMITE_JOUR = int(os.environ.get("IMAGE_DAILY_LIMIT", "10"))

    class ImageIn(BaseModel):
        prompt: str = Field(min_length=3, max_length=500)

    async def _generer_image(prompt: str):
        key = g.get("EMERGENT_LLM_KEY")
        if not key:
            raise HTTPException(503, "Génération d'image indisponible : EMERGENT_LLM_KEY absente côté serveur.")
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(api_key=key, session_id=uuid.uuid4().hex,
                       system_message="You are a helpful AI image generation assistant.")
        chat = chat.with_model("gemini", os.environ.get("EMERGENT_IMAGE_MODEL", "gemini-3.1-flash-image-preview"))
        chat = chat.with_params(modalities=["image", "text"])
        envoi = getattr(chat, "send_message_multimodal_response", None)
        if envoi is None:
            raise HTTPException(501, "La version d'emergentintegrations installée ne sait pas générer d'images "
                                     "(send_message_multimodal_response absente) : mets-la à jour.")
        consigne = f"Vision board image, inspiring, cohesive, no text or letters in the image. Subject: {prompt}"
        _texte, images = await asyncio.wait_for(envoi(UserMessage(text=consigne)), timeout=90)
        if not images:
            raise HTTPException(502, "Le modèle n'a renvoyé aucune image. Reformule ta description.")
        return base64.b64decode(images[0]["data"]), (images[0].get("mime_type") or "image/png")

    @api.post("/vision/image")
    async def vision_image(body: ImageIn, db: AsyncSession = Depends(get_db)):
        """Génère une image pour une carte du Vision Board. Plafonnée par jour (crédits IA)."""
        uid = _uid()
        depuis = utcnow() - timedelta(hours=24)
        n = (await db.execute(select(func.count()).select_from(VisionImage)
                              .where(VisionImage.user_id == uid, VisionImage.created_at >= depuis))).scalar_one()
        if n >= IMAGE_LIMITE_JOUR:
            raise HTTPException(429, f"Limite de {IMAGE_LIMITE_JOUR} images IA par 24 h atteinte.")
        try:
            octets, mime = await _generer_image(body.prompt.strip())
        except HTTPException:
            raise
        except asyncio.TimeoutError:
            raise HTTPException(504, "La génération d'image a pris trop de temps. Réessaie.")
        except Exception as e:  # noqa: BLE001
            log.warning("Génération d'image échouée : %s", e)
            raise HTTPException(502, "La génération d'image a échoué. Réessaie dans un instant.")
        img = VisionImage(user_id=uid, prompt=body.prompt.strip(), mime=mime, data=octets)
        db.add(img)
        await db.commit()
        return {"id": img.id, "restant": max(0, IMAGE_LIMITE_JOUR - n - 1)}

    @api.get("/vision/images/{image_id}")
    async def vision_image_lire(image_id: str, db: AsyncSession = Depends(get_db)):
        img = (await db.execute(select(VisionImage).where(VisionImage.id == image_id))).scalar_one_or_none()
        if not img:
            raise HTTPException(404, "Image introuvable.")
        return Response(content=img.data, media_type=img.mime,
                        headers={"Cache-Control": "public, max-age=31536000, immutable"})

    # ══════════════ 3. Marketplace vendeur + modération ══════════════

    class VendorProfile(Base):
        __tablename__ = "vendor_profiles"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
        data: Mapped[dict] = mapped_column(JSON, default=dict)

    g["VendorProfile"] = VendorProfile

    class VendorProduct(Base):
        __tablename__ = "vendor_products"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        titre: Mapped[str] = mapped_column(String(255), default="")
        description: Mapped[str] = mapped_column(Text, default="")
        prix: Mapped[str] = mapped_column(String(20), default="0")
        stock: Mapped[int] = mapped_column(Integer, nullable=True)
        sku: Mapped[str] = mapped_column(String(80), nullable=True)
        categorie: Mapped[str] = mapped_column(String(120), nullable=True)
        images: Mapped[list] = mapped_column(JSON, default=list)
        statut: Mapped[str] = mapped_column(String(20), default="brouillon", index=True)
        vendeur: Mapped[str] = mapped_column(String(120), default="")
        motif_refus: Mapped[str] = mapped_column(Text, default="")
        shopify_id: Mapped[str] = mapped_column(String(120), default="")
        shopify_handle: Mapped[str] = mapped_column(String(255), nullable=True)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
        maj_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
        soumis_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
        publie_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    g["VendorProduct"] = VendorProduct

    def _pj(p) -> dict:
        return {"id": p.id, "titre": p.titre, "description": p.description, "prix": p.prix, "stock": p.stock,
                "sku": p.sku, "categorie": p.categorie, "images": p.images or [], "statut": p.statut,
                "vendeur": p.vendeur, "motif_refus": p.motif_refus or "", "shopify_id": p.shopify_id or "",
                "maj_le": _iso(p.maj_le), "soumis_le": _iso(p.soumis_le), "publie_le": _iso(p.publie_le)}

    SHOPIFY_VERSION = os.environ.get("SHOPIFY_API_VERSION", "2025-01")

    def _shopify_boutique() -> str:
        return (os.environ.get("SHOPIFY_SHOP_DOMAIN", "") or "").replace("https://", "").strip("/")

    def _shopify_pret() -> bool:
        return bool(_shopify_boutique() and os.environ.get("SHOPIFY_ADMIN_TOKEN"))

    def _admins() -> set:
        return {e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()}

    async def _est_admin(db: AsyncSession) -> bool:
        uid = _uid()
        if uid == DEMO_USER_ID:
            return False
        # Corrigé : ne lisait que la liste blanche ADMIN_EMAILS, jamais le
        # champ role — les deux systèmes coexistaient sans se parler.
        # Un compte est admin s'il a role="admin" OU s'il est dans
        # ADMIN_EMAILS (compatibilité avec les comptes déjà whitelistés
        # avant l'ajout du rôle).
        u = await db.get(User, uid)
        return bool(u and (u.role == "admin" or u.email.lower() in _admins()))

    async def _exiger_admin(db: AsyncSession):
        if not await _est_admin(db):
            raise HTTPException(403, "Réservé aux administrateurs Zayado.")

    async def _est_vendeur(db: AsyncSession) -> bool:
        uid = _uid()
        if uid == DEMO_USER_ID:
            return False
        u = await db.get(User, uid)
        return bool(u and u.role in ("vendeur", "admin"))

    async def _exiger_vendeur(db: AsyncSession):
        # Corrigé : les routes /vendeur/produits n'exigeaient qu'un compte
        # connecté (_exiger_compte), pas le rôle vendeur — n'importe quel
        # client pouvait créer des fiches produit vendeur.
        if not await _est_vendeur(db):
            raise HTTPException(403, "Réservé aux comptes vendeur — demande la promotion de ton compte à l'équipe Zayado.")

    PROFIL_DEFAUT = {"nom_boutique": "", "description": "", "email_contact": "", "telephone": "",
                     "siret": "", "site": "", "conditions_acceptees": False}

    async def _profil_vendeur(db: AsyncSession) -> dict:
        row = (await db.execute(select(VendorProfile).where(VendorProfile.user_id == _uid()))).scalar_one_or_none()
        return {**PROFIL_DEFAUT, **((row.data if row else None) or {})}

    @api.get("/vendeur/etat")
    async def vendeur_etat(db: AsyncSession = Depends(get_db)):
        admin = await _est_admin(db)
        if _uid() == DEMO_USER_ID:
            return {"connecte": False, "admin": False, "vendeur": False}
        vendeur = await _est_vendeur(db)
        profil = await _profil_vendeur(db)
        rows = (await db.execute(select(VendorProduct).where(VendorProduct.user_id == _uid()))).scalars().all()
        compteurs = {s: 0 for s in STATUTS}
        for p in rows:
            compteurs[p.statut] = compteurs.get(p.statut, 0) + 1
        return {"connecte": True, "admin": admin, "vendeur": vendeur, "profil": profil, "compteurs": compteurs,
                "profil_complet": bool(profil["nom_boutique"] and profil["email_contact"] and profil["conditions_acceptees"]),
                "shopify": {"configure": _shopify_pret(), "boutique": _shopify_boutique() or None},
                "limites": {"images_max": MAX_IMAGES}}

    @api.put("/vendeur/profil")
    async def vendeur_profil_maj(patch: dict, db: AsyncSession = Depends(get_db)):
        await _exiger_compte()
        autorises = {k: v for k, v in (patch or {}).items() if k in PROFIL_DEFAUT}
        row = (await db.execute(select(VendorProfile).where(VendorProfile.user_id == _uid()))).scalar_one_or_none()
        if not row:
            row = VendorProfile(user_id=_uid(), data={})
            db.add(row)
        row.data = {**PROFIL_DEFAUT, **(row.data or {}), **autorises}
        await db.commit()
        return row.data

    class ProduitIn(BaseModel):
        titre: str = Field(max_length=255)
        description: Optional[str] = ""
        prix: Optional[str] = "0"
        stock: Optional[int] = None
        sku: Optional[str] = None
        categorie: Optional[str] = None
        images: Optional[list[str]] = None

    async def _produit_du_vendeur(db: AsyncSession, pid: str) -> "VendorProduct":
        p = (await db.execute(select(VendorProduct).where(VendorProduct.id == pid, VendorProduct.user_id == _uid()))).scalar_one_or_none()
        if not p:
            raise HTTPException(404, "Produit introuvable.")
        return p

    @api.get("/vendeur/produits")
    async def vendeur_lister(db: AsyncSession = Depends(get_db)):
        await _exiger_vendeur(db)
        rows = (await db.execute(select(VendorProduct).where(VendorProduct.user_id == _uid())
                                 .order_by(VendorProduct.maj_le.desc()))).scalars().all()
        return {"items": [_pj(p) for p in rows]}

    @api.post("/vendeur/produits")
    async def vendeur_creer(body: ProduitIn, db: AsyncSession = Depends(get_db)):
        await _exiger_vendeur(db)
        profil = await _profil_vendeur(db)
        if not profil.get("nom_boutique"):
            raise HTTPException(400, "Renseignez d'abord le nom de votre boutique dans votre profil vendeur.")
        p = VendorProduct(user_id=_uid(), titre=body.titre.strip(), description=nettoyer_html(body.description or ""),
                          prix=(body.prix or "0"), stock=body.stock, sku=body.sku, categorie=body.categorie,
                          images=body.images or [], vendeur=profil["nom_boutique"])
        db.add(p)
        await db.commit()
        await db.refresh(p)
        return _pj(p)

    @api.put("/vendeur/produits/{pid}")
    async def vendeur_modifier(pid: str, body: ProduitIn, db: AsyncSession = Depends(get_db)):
        await _exiger_vendeur(db)
        p = await _produit_du_vendeur(db, pid)
        if p.statut == "en_attente":
            raise HTTPException(409, "Ce produit est en cours de vérification : il n'est plus modifiable. Attendez la réponse de Zayado.")
        p.titre, p.description = body.titre.strip(), nettoyer_html(body.description or "")
        p.prix, p.stock, p.sku, p.categorie = (body.prix or "0"), body.stock, body.sku, body.categorie
        p.images = body.images or []
        p.maj_le = utcnow()
        # Publié puis modifié → re-vérification (sinon on ferait valider un produit anodin puis on le remplacerait).
        if p.statut == "publie":
            p.statut = "en_attente"
            p.soumis_le = utcnow()
        elif p.statut == "refuse":
            p.statut, p.motif_refus = "brouillon", ""
        await db.commit()
        await db.refresh(p)
        return _pj(p)

    @api.delete("/vendeur/produits/{pid}")
    async def vendeur_supprimer(pid: str, db: AsyncSession = Depends(get_db)):
        await _exiger_vendeur(db)
        p = await _produit_du_vendeur(db, pid)
        await db.delete(p)
        await db.commit()
        return {"supprime": True}

    @api.get("/vendeur/produits/{pid}/verifier")
    async def vendeur_verifier(pid: str, db: AsyncSession = Depends(get_db)):
        await _exiger_vendeur(db)
        erreurs = valider_produit(_pj(await _produit_du_vendeur(db, pid)))
        return {"pret": not erreurs, "erreurs": erreurs}

    @api.post("/vendeur/produits/{pid}/soumettre")
    async def vendeur_soumettre(pid: str, db: AsyncSession = Depends(get_db)):
        await _exiger_vendeur(db)
        p = await _produit_du_vendeur(db, pid)
        erreurs = valider_produit(_pj(p))
        if erreurs:
            raise HTTPException(422, {"message": "La fiche est incomplète.", "erreurs": erreurs})
        p.statut, p.soumis_le, p.motif_refus, p.maj_le = "en_attente", utcnow(), "", utcnow()
        await db.commit()
        await db.refresh(p)
        return _pj(p)

    # ── Modération Zayado ──

    MUTATION_PRODUIT = """
    mutation creerProduit($product: ProductSetInput!, $identifier: ProductSetIdentifiers) {
      productSet(synchronous: true, input: $product, identifier: $identifier) {
        product { id handle title status onlineStoreUrl }
        userErrors { field message }
      }
    }
    """

    def _entree_shopify(p: "VendorProduct") -> dict:
        prix = f"{float(str(p.prix).replace(',', '.')):.2f}"
        description = nettoyer_html(p.description or "")
        base_achat = os.environ.get("ZAYADO_PRODUCT_URL_BASE", "").rstrip("/")
        if base_achat:
            description += f'\n<p><a href="{base_achat}/{p.id}" rel="noopener">Voir la fiche complète et commander sur Zayado</a></p>'
        vendeur = p.vendeur or "Vendeur Zayado"
        entree = {
            "title": p.titre, "descriptionHtml": description, "vendor": vendeur,
            "productType": p.categorie or "",
            "tags": ["zayado-vendeur", f"vendeur-{re.sub(r'[^a-z0-9-]', '-', vendeur.lower())[:40]}"],
            "status": "DRAFT",  # la fiche arrive dans Shopify sans être en vitrine : Zayado garde la main
            "productOptions": [{"name": "Titre", "values": [{"name": "Default Title"}]}],
            "variants": [{"price": prix, "optionValues": [{"optionName": "Titre", "name": "Default Title"}],
                          **({"sku": p.sku} if p.sku else {})}],
            "metafields": [{"namespace": "zayado", "key": "produit_id", "type": "single_line_text_field", "value": p.id}],
        }
        if p.images:
            entree["files"] = [{"originalSource": u, "contentType": "IMAGE"} for u in p.images[:MAX_IMAGES]]
        return entree

    async def _appel_shopify(variables: dict) -> dict:
        if not _shopify_pret():
            raise HTTPException(503, "Shopify n'est pas configuré : SHOPIFY_SHOP_DOMAIN et SHOPIFY_ADMIN_TOKEN manquent côté serveur.")
        url = f"https://{_shopify_boutique()}/admin/api/{SHOPIFY_VERSION}/graphql.json"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.post(url, headers={"X-Shopify-Access-Token": os.environ["SHOPIFY_ADMIN_TOKEN"],
                                                    "Content-Type": "application/json"},
                                      json={"query": MUTATION_PRODUIT, "variables": variables})
        except Exception as e:  # noqa: BLE001
            log.warning("Shopify injoignable : %s", e)
            raise HTTPException(503, "Shopify est injoignable pour l'instant. Réessayez dans un instant.")
        if r.status_code == 401:
            raise HTTPException(502, "Shopify a refusé le jeton d'accès. Vérifiez SHOPIFY_ADMIN_TOKEN et les autorisations de l'application.")
        if r.status_code == 404:
            raise HTTPException(502, f"Boutique ou version d'API introuvable ({_shopify_boutique()}, {SHOPIFY_VERSION}).")
        if r.status_code >= 400:
            raise HTTPException(502, f"Shopify a répondu {r.status_code}. Détail : {r.text[:300]}")
        data = r.json()
        if data.get("errors"):
            raise HTTPException(502, "Shopify a rejeté la requête : " + "; ".join(e.get("message", "") for e in data["errors"])[:400])
        return data.get("data") or {}

    @api.get("/vendeur/moderation/attente")
    async def moderation_attente(db: AsyncSession = Depends(get_db)):
        await _exiger_admin(db)
        rows = (await db.execute(select(VendorProduct).where(VendorProduct.statut == "en_attente")
                                 .order_by(VendorProduct.soumis_le))).scalars().all()
        return {"items": [_pj(p) for p in rows]}

    @api.post("/vendeur/moderation/{pid}/publier")
    async def moderation_publier(pid: str, db: AsyncSession = Depends(get_db)):
        """Shopify d'abord, statut « publié » ensuite : l'inverse laisserait des fiches marquées en ligne qui n'existent nulle part."""
        await _exiger_admin(db)
        p = (await db.execute(select(VendorProduct).where(VendorProduct.id == pid))).scalar_one_or_none()
        if not p:
            raise HTTPException(404, "Produit introuvable.")
        if p.statut != "en_attente":
            raise HTTPException(409, "Ce produit n'est pas en attente de modération.")
        erreurs = valider_produit(_pj(p))
        if erreurs:
            raise HTTPException(422, {"message": "La fiche ne passe pas la validation.", "erreurs": erreurs})
        variables = {"product": _entree_shopify(p)}
        if p.shopify_id:  # déjà créé une première fois → mise à jour, pas de doublon
            variables["identifier"] = {"id": p.shopify_id}
        resultat = (await _appel_shopify(variables)).get("productSet") or {}
        fautes = resultat.get("userErrors") or []
        if fautes:
            detail = "; ".join(f"{'/'.join(f.get('field') or [])}: {f.get('message')}" for f in fautes)
            raise HTTPException(422, f"Shopify a refusé la fiche : {detail[:400]}")
        cree = resultat.get("product") or {}
        if not cree.get("id"):
            raise HTTPException(502, "Shopify n'a pas renvoyé d'identifiant produit. Rien n'a été marqué publié.")
        p.statut, p.shopify_id, p.shopify_handle = "publie", cree["id"], cree.get("handle")
        p.publie_le, p.motif_refus, p.maj_le = utcnow(), "", utcnow()
        await db.commit()
        await db.refresh(p)
        return _pj(p)

    class RefusIn(BaseModel):
        motif: str = Field(default="", max_length=1000)

    @api.post("/vendeur/moderation/{pid}/refuser")
    async def moderation_refuser(pid: str, body: RefusIn, db: AsyncSession = Depends(get_db)):
        await _exiger_admin(db)
        if not body.motif.strip():
            raise HTTPException(400, "Un motif de refus est obligatoire.")  # sans motif le vendeur resoumet à l'identique
        p = (await db.execute(select(VendorProduct).where(VendorProduct.id == pid))).scalar_one_or_none()
        if not p:
            raise HTTPException(404, "Produit introuvable.")
        p.statut, p.motif_refus, p.maj_le = "refuse", body.motif.strip(), utcnow()
        await db.commit()
        await db.refresh(p)
        return _pj(p)

    # ══════════════ 4. Pouls Business : source Qonto ══════════════

    QONTO_API = "https://thirdparty.qonto.com/v2"
    UserConnection = g["UserConnection"]
    _get_connection = g["_get_connection"]
    _chiffrer = g["_chiffrer"]
    _dechiffrer = g["_dechiffrer"]

    class QontoIn(BaseModel):
        login: str = Field(min_length=3, max_length=120)        # identifiant d'organisation (slug)
        secret_key: str = Field(min_length=8, max_length=200)

    @api.post("/connections/qonto/connect")
    async def qonto_connect(body: QontoIn, db: AsyncSession = Depends(get_db)):
        await _exiger_compte()
        if not g.get("_fernet"):
            raise HTTPException(500, "FERNET_KEY absente côté serveur : refus de stocker des clés bancaires en clair.")
        login, secret = body.login.strip(), body.secret_key.strip()
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.get(f"{QONTO_API}/organization", headers={"Authorization": f"{login}:{secret}"})
        except Exception as e:  # noqa: BLE001
            log.warning("Qonto injoignable : %s", e)
            raise HTTPException(502, "Qonto est injoignable pour le moment.")
        if r.status_code in (401, 403):
            raise HTTPException(400, "Qonto a refusé ces identifiants (login d'organisation ou clé secrète).")
        if r.status_code >= 400:
            raise HTTPException(502, f"Qonto a répondu {r.status_code}.")
        conn = await _get_connection(db, "qonto")
        if not conn:
            conn = UserConnection(user_id=_uid(), provider="qonto")
            db.add(conn)
        conn.label = f"Qonto · {login}"
        conn.status = "ready"
        conn.credentials_enc = _chiffrer(json.dumps({"login": login, "secret_key": secret}))
        await db.commit()
        return {"status": "ready", "label": conn.label}

    @api.get("/connections/qonto/status")
    async def qonto_status(db: AsyncSession = Depends(get_db)):
        conn = await _get_connection(db, "qonto")
        return {"connecte": bool(conn and conn.status == "ready"), "label": conn.label if conn else None}

    @api.post("/cockpit/pouls/sync")
    async def pouls_sync_qonto(db: AsyncSession = Depends(get_db)):
        """Trésorerie = somme des soldes des comptes EUR actifs ; « CA du mois » = encaissements EUR
        du mois en cours (approximation : Qonto ne distingue pas CA et autres entrées d'argent)."""
        await _exiger_compte()
        conn = await _get_connection(db, "qonto")
        if not conn or conn.status != "ready" or not conn.credentials_enc:
            raise HTTPException(400, "Qonto n'est pas connecté.")
        creds = json.loads(_dechiffrer(conn.credentials_enc))
        headers = {"Authorization": f"{creds['login']}:{creds['secret_key']}"}
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                org = await client.get(f"{QONTO_API}/organization", headers=headers)
                if org.status_code in (401, 403):
                    conn.status = "error"
                    await db.commit()
                    raise HTTPException(400, "Qonto a refusé les identifiants enregistrés : reconnecte ta banque.")
                org.raise_for_status()
                comptes = (org.json().get("organization") or {}).get("bank_accounts") or []
                debut, encaisse = debut_du_mois_utc(), 0
                for compte in comptes:
                    if (compte.get("status") or "active") != "active" or not compte.get("id"):
                        continue
                    page = 1
                    while page and page <= 10:  # garde-fou : 10 pages × 100 opérations par compte
                        tr = await client.get(f"{QONTO_API}/transactions", headers=headers, params={
                            "bank_account_id": compte["id"], "status[]": "completed", "side": "credit",
                            "settled_at_from": debut, "per_page": 100, "current_page": page})
                        tr.raise_for_status()
                        j = tr.json()
                        encaisse += somme_qonto(j.get("transactions"))
                        page = (j.get("meta") or {}).get("next_page")
        except HTTPException:
            raise
        except Exception as e:  # noqa: BLE001
            log.warning("Synchronisation Qonto échouée : %s", e)
            raise HTTPException(502, "La synchronisation Qonto a échoué. Réessaie dans un instant.")
        p = await g["_pouls_row"](db)
        p.tresorerie, p.ca_mensuel, p.source = solde_qonto(comptes), encaisse, "qonto"
        await db.commit()
        return await g["cockpit_pouls_get"](db)
