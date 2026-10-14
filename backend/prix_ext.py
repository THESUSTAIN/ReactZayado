"""Admin › Prix : un seul endroit pour changer les prix.

Avant : un prix vivait à 3 endroits (server.py PRICING, commerce_ext PRIX_FONDATEUR, frontend plans.js)
plus la fiche Shopify. Maintenant :
  · l'admin saisit les prix dans l'onglet « Prix » ;
  · ils sont enregistrés en base (table prix_reglages) et appliqués tout de suite au paiement Mollie
    (PRICING, PRIX_FONDATEUR et services modifiés en place, sans redéploiement) ;
  · la grille de l'app et l'iframe /embed/tarifs (pages Shopify) les lisent via GET /api/tarifs/grille ;
  · un bouton recopie les prix sur les fiches produits Shopify (droit write_products requis).

Les valeurs du code restent les valeurs par défaut : « Revenir aux prix d'origine » efface les réglages.
Les abonnés en cours gardent le prix de leur abonnement Mollie : un changement vaut pour les nouveaux.
"""
from __future__ import annotations

import copy
import os
import time
from datetime import datetime
from typing import Dict, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, Float, String, Text, delete, select
from sqlalchemy.orm import Mapped, mapped_column

# Offre de l'app → fiche produit Shopify (handle). Prix recopié : le mensuel (le plancher pour Entreprise).
HANDLES_SHOPIFY = {
    "reveur": "copilote-reveur",
    "serenite": "copilote-solo",
    "pro": "copilote-pro",
    "business": "copilote-equipe",
    "entreprise": "copilote-entreprise",
}
PRIX_MAX = 100000.0
# Offres du tunnel de diagnostic : clé → (variable Railway historique, nom, prix par défaut)
TUNNEL = {
    "kit": ("TUNNEL_KIT_PRIX", "Kit Diagnostic Flash", 27.0, "kit-diagnostic-flash"),
    "fast_track": ("TUNNEL_FAST_TRACK_PRIX", "Fast-Track, diagnostic expert en 48 h", 97.0, None),
}


class PlanPrix(BaseModel):
    mensuel: float = Field(ge=0, le=PRIX_MAX)
    annuel: float = Field(ge=0, le=PRIX_MAX)


class ServicePrix(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    amount: float = Field(gt=0, le=PRIX_MAX)


class PrixIn(BaseModel):
    plans: Dict[str, PlanPrix] = {}
    fondateur: Dict[str, PlanPrix] = {}
    entreprise_plancher: Optional[float] = Field(default=None, ge=0, le=PRIX_MAX)
    tunnel: Dict[str, float] = {}
    services: Dict[str, ServicePrix] = {}
    shopify: bool = False


def install_prix(g: dict) -> None:
    api, app, Base, get_db = g["api"], g["app"], g["Base"], g["get_db"]
    utcnow, exiger_role, async_session = g["utcnow"], g["exiger_role"], g["async_session"]
    engine = g["engine"]
    log = g.get("logger")
    PRICING: dict = g["PRICING"]
    admin = Depends(exiger_role("admin"))

    # Valeurs du code, gardées pour « revenir aux prix d'origine ».
    ORIGINE_PLANS = copy.deepcopy(PRICING)
    ORIGINE_FONDATEUR = copy.deepcopy(g.get("PRIX_FONDATEUR") or {})
    g.setdefault("SERVICES_PRIX", {})
    g.setdefault("PRIX_TUNNEL", {})
    etat = {"charge_le": 0.0, "maj_le": None}

    class PrixReglage(Base):
        """Un prix saisi dans Admin › Prix. cle : plan:<offre>:<cycle> · fondateur:<offre>:<cycle>
        · entreprise:plancher · service:<id> (texte = intitulé)."""
        __tablename__ = "prix_reglages"
        cle: Mapped[str] = mapped_column(String(120), primary_key=True)
        valeur: Mapped[float] = mapped_column(Float, default=0.0)
        texte: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
        maj_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    # ── Application en mémoire ──
    def _reinitialiser() -> None:
        for k, v in ORIGINE_PLANS.items():
            PRICING[k] = copy.deepcopy(v)
        fond = g.get("PRIX_FONDATEUR")
        if isinstance(fond, dict):
            for k, v in ORIGINE_FONDATEUR.items():
                fond[k] = copy.deepcopy(v)
        g["SERVICES_PRIX"].clear()
        g["PRIX_TUNNEL"].clear()

    def _appliquer(lignes) -> None:
        _reinitialiser()
        fond = g.get("PRIX_FONDATEUR")
        dates = [r.maj_le for r in lignes if r.maj_le]
        derniere = max(dates) if dates else None
        for r in lignes:
            parts = r.cle.split(":")
            if parts[0] == "plan" and len(parts) == 3 and parts[1] in PRICING and parts[2] in ("mensuel", "annuel"):
                plan = PRICING[parts[1]]
                plan[parts[2]] = float(r.valeur)
                # Rêveur est stocké en double (HT + TTC) : sans TVA côté Zayado, le prix saisi est le prix encaissé.
                if isinstance(plan.get("ttc"), dict):
                    plan["ttc"][parts[2]] = float(r.valeur)
            elif parts[0] == "fondateur" and len(parts) == 3 and isinstance(fond, dict) and parts[2] in ("mensuel", "annuel"):
                fond.setdefault(parts[1], {})[parts[2]] = float(r.valeur)
            elif r.cle == "entreprise:plancher" and "entreprise" in PRICING:
                PRICING["entreprise"]["plancher"] = float(r.valeur)
            elif parts[0] == "tunnel" and len(parts) == 2 and parts[1] in TUNNEL:
                g["PRIX_TUNNEL"][TUNNEL[parts[1]][0]] = float(r.valeur)
            elif parts[0] == "service" and len(parts) == 2:
                g["SERVICES_PRIX"][parts[1]] = {"title": r.texte or parts[1], "amount": float(r.valeur)}
        # Le tunnel annonce « ensuite X €/mois » : on suit le prix Solo.
        solo = _prix_affiche("serenite", "mensuel")
        if solo:
            g["PRIX_TUNNEL"]["TUNNEL_SOLO_PRIX"] = float(solo)
        etat["maj_le"] = derniere.isoformat() if derniere else None
        etat["charge_le"] = time.time()

    async def _charger(db=None) -> None:
        if db is None:
            async with async_session() as s:
                lignes = (await s.execute(select(PrixReglage))).scalars().all()
        else:
            lignes = (await db.execute(select(PrixReglage))).scalars().all()
        _appliquer(lignes)

    @app.on_event("startup")
    async def _prix_au_demarrage():
        try:
            async with engine.begin() as conn:
                await conn.run_sync(lambda c: PrixReglage.__table__.create(c, checkfirst=True))
            await _charger()
        except Exception as e:  # noqa: BLE001 — jamais bloquer le démarrage : on garde les prix du code
            if log:
                log.error("Prix : réglages non chargés (%s), prix du code utilisés.", e)

    def _prix_affiche(cle: str, cycle: str):
        p = PRICING.get(cle) or {}
        if isinstance(p.get("ttc"), dict) and p["ttc"].get(cycle) is not None:
            return p["ttc"][cycle]
        return p.get(cycle)

    def _tunnel_origine(k: str) -> float:
        var, _n, defaut, _h = TUNNEL[k]
        try:
            return float(os.environ.get(var, str(defaut)).replace(",", "."))
        except ValueError:
            return defaut

    def _prix_tunnel(k: str) -> float:
        return float(g["PRIX_TUNNEL"].get(TUNNEL[k][0]) or _tunnel_origine(k))

    def _grille() -> dict:
        fond = g.get("PRIX_FONDATEUR") or {}
        plans = {}
        for cle, p in PRICING.items():
            if cle in ("essentielle", "entreprise") or not isinstance(p, dict):
                continue
            plans[cle] = {"nom": p.get("label", cle), "mensuel": _prix_affiche(cle, "mensuel"),
                          "annuel": _prix_affiche(cle, "annuel"), "fondateur": fond.get(cle)}
        return {"plans": plans, "entreprise": {"plancher": (PRICING.get("entreprise") or {}).get("plancher")},
                "maj_le": etat["maj_le"]}

    # ── Public : la grille affichée (app, /embed/tarifs, pages Shopify) ──
    @api.get("/tarifs/grille")
    async def tarifs_grille(db=Depends(get_db)):
        if time.time() - etat["charge_le"] > 60:  # rattrape un réglage fait par une autre instance
            try:
                await _charger(db)
            except Exception:  # noqa: BLE001
                pass
        return _grille()

    # ── Admin ──
    @api.get("/admin/prix")
    async def admin_prix(db=Depends(get_db), _a=admin):
        await _charger(db)
        fond = g.get("PRIX_FONDATEUR") or {}
        lignes = (await db.execute(select(PrixReglage.cle))).scalars().all()
        return {
            "plans": [{"cle": k, "nom": p.get("label", k), "desc": p.get("desc", ""),
                       "mensuel": _prix_affiche(k, "mensuel"), "annuel": _prix_affiche(k, "annuel"),
                       "origine": {"mensuel": (ORIGINE_PLANS[k].get("ttc") or ORIGINE_PLANS[k]).get("mensuel"),
                                   "annuel": (ORIGINE_PLANS[k].get("ttc") or ORIGINE_PLANS[k]).get("annuel")},
                       "shopify": HANDLES_SHOPIFY.get(k)}
                      for k, p in PRICING.items() if k not in ("essentielle", "entreprise") and isinstance(p, dict)],
            "fondateur": [{"cle": k, "nom": (PRICING.get(k) or {}).get("label", k), **v,
                           "origine": ORIGINE_FONDATEUR.get(k)} for k, v in fond.items()],
            "entreprise_plancher": (PRICING.get("entreprise") or {}).get("plancher"),
            "tunnel": [{"cle": k, "nom": nom, "prix": _prix_tunnel(k), "origine": _tunnel_origine(k), "shopify": h}
                       for k, (_v, nom, _d, h) in TUNNEL.items()],
            "services": [{"id": k, **v} for k, v in g["SERVICES_PRIX"].items()],
            "modifies": len(lignes),
            "maj_le": etat["maj_le"],
            "shopify_pret": bool(g.get("shopify_pret") and g["shopify_pret"]()),
        }

    async def _vers_shopify() -> list:
        gql = g.get("shopify_graphql")
        if not (gql and g.get("shopify_pret") and g["shopify_pret"]()):
            raise HTTPException(503, "Shopify n'est pas relié : SHOPIFY_SHOP_DOMAIN et SHOPIFY_ADMIN_TOKEN manquent sur Railway.")
        cibles = []
        for cle, handle in HANDLES_SHOPIFY.items():
            p = PRICING.get(cle) or {}
            prix = p.get("plancher") if cle == "entreprise" else _prix_affiche(cle, "mensuel")
            if prix is not None:
                cibles.append((handle, float(prix), p.get("label", cle)))
        for k, (_v, nom, _d, h) in TUNNEL.items():
            if h:
                cibles.append((h, _prix_tunnel(k), nom))
        for sid, o in g["SERVICES_PRIX"].items():
            cibles.append((sid, float(o["amount"]), o.get("title", sid)))
        rapport = []
        for handle, prix, nom in cibles:
            try:
                d = await gql("query($h:String!){productByIdentifier(identifier:{handle:$h}){id variants(first:20){nodes{id price}}}}",
                              {"h": handle})
                prod = d.get("productByIdentifier")
                if not prod:
                    rapport.append({"handle": handle, "nom": nom, "ok": False, "detail": "fiche introuvable dans Shopify"})
                    continue
                variantes = [{"id": v["id"], "price": f"{prix:.2f}"} for v in prod["variants"]["nodes"]]
                r = await gql("mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{message}}}",
                              {"p": prod["id"], "v": variantes})
                err = (r.get("productVariantsBulkUpdate") or {}).get("userErrors") or []
                rapport.append({"handle": handle, "nom": nom, "ok": not err, "prix": prix,
                                "detail": "; ".join(e.get("message", "") for e in err) or "prix mis à jour"})
            except HTTPException as e:
                detail = str(e.detail)
                if "403" in detail or "Droit manquant" in detail or "access" in detail.lower():
                    detail = "droit write_products manquant sur l'application Shopify"
                rapport.append({"handle": handle, "nom": nom, "ok": False, "detail": detail[:200]})
        return rapport

    @api.put("/admin/prix")
    async def admin_prix_enregistrer(body: PrixIn, db=Depends(get_db), _a=admin):
        maintenant = utcnow()
        lignes = []
        for cle, v in body.plans.items():
            if cle not in PRICING or cle in ("essentielle", "entreprise"):
                raise HTTPException(422, f"Offre inconnue : {cle}")
            if v.mensuel <= 0 or v.annuel <= 0:
                raise HTTPException(422, f"{PRICING[cle].get('label', cle)} : un prix doit être supérieur à 0.")
            if v.annuel > v.mensuel * 12:
                raise HTTPException(422, f"{PRICING[cle].get('label', cle)} : l'annuel ne peut pas coûter plus que 12 mois.")
            lignes += [(f"plan:{cle}:mensuel", v.mensuel, None), (f"plan:{cle}:annuel", v.annuel, None)]
        for cle, v in body.fondateur.items():
            if cle not in PRICING:
                raise HTTPException(422, f"Offre inconnue : {cle}")
            lignes += [(f"fondateur:{cle}:mensuel", v.mensuel, None), (f"fondateur:{cle}:annuel", v.annuel, None)]
        for k, v in body.tunnel.items():
            if k not in TUNNEL or not (0 < float(v) <= PRIX_MAX):
                raise HTTPException(422, f"Prix du tunnel invalide : {k}")
            lignes.append((f"tunnel:{k}", float(v), None))
        if body.entreprise_plancher is not None:
            lignes.append(("entreprise:plancher", body.entreprise_plancher, None))
        for sid, v in body.services.items():
            sid_propre = "".join(c for c in sid.lower() if c.isalnum() or c == "-")[:80]
            if not sid_propre:
                raise HTTPException(422, "Identifiant de service invalide.")
            lignes.append((f"service:{sid_propre}", v.amount, v.title.strip()))
        # On ne garde en base que ce qui diffère du code : « origine » reste la référence.
        for cle, valeur, texte in lignes:
            ligne = await db.get(PrixReglage, cle)
            if ligne:
                ligne.valeur, ligne.texte, ligne.maj_le = float(valeur), texte, maintenant
            else:
                db.add(PrixReglage(cle=cle, valeur=float(valeur), texte=texte, maj_le=maintenant))
        # Services retirés de la liste : on les supprime.
        gardes = {f"service:{''.join(c for c in s.lower() if c.isalnum() or c == '-')[:80]}" for s in body.services}
        for (cle,) in (await db.execute(select(PrixReglage.cle).where(PrixReglage.cle.like("service:%")))).all():
            if cle not in gardes:
                await db.execute(delete(PrixReglage).where(PrixReglage.cle == cle))
        await db.commit()
        await _charger(db)
        rapport = await _vers_shopify() if body.shopify else None
        return {"ok": True, "grille": _grille(), "shopify": rapport}

    @api.post("/admin/prix/shopify")
    async def admin_prix_shopify(_a=admin):
        return {"ok": True, "shopify": await _vers_shopify()}

    @api.post("/admin/prix/origine")
    async def admin_prix_origine(db=Depends(get_db), _a=admin):
        await db.execute(delete(PrixReglage))
        await db.commit()
        await _charger(db)
        return {"ok": True, "grille": _grille()}
