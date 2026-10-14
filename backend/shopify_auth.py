"""Jeton Shopify pour les applications du Dev Dashboard (créées depuis 2026).

Ces applications ne donnent plus de jeton fixe « shpat_… » : seulement un ID client et un secret client.
Le serveur demande lui-même un jeton d'accès (« client credentials », valable environ 24 h) et le renouvelle
avant qu'il expire. Le reste du code continue de lire SHOPIFY_ADMIN_TOKEN, sans rien changer.

Variables Railway (service backend) :
  SHOPIFY_SHOP_DOMAIN     xxx.myshopify.com
  SHOPIFY_CLIENT_ID       « ID client » de l'application (Dev Dashboard › Paramètres)
  SHOPIFY_CLIENT_SECRET   « Secret client » de la même page
Un SHOPIFY_ADMIN_TOKEN posé à la main (ancienne application) reste prioritaire.
Le secret client sert aussi à vérifier la signature des webhooks si SHOPIFY_WEBHOOK_SECRET est absent.
"""
from __future__ import annotations

import asyncio
import os
import time

import httpx

_ETAT = {"auto": False, "expire": 0.0, "erreur": ""}


def _boutique() -> str:
    return (os.environ.get("SHOPIFY_SHOP_DOMAIN", "") or "").replace("https://", "").strip().strip("/")


def _identifiants() -> tuple:
    return (os.environ.get("SHOPIFY_CLIENT_ID", "").strip(), os.environ.get("SHOPIFY_CLIENT_SECRET", "").strip())


async def obtenir_jeton() -> bool:
    """Demande un jeton à Shopify et le range dans SHOPIFY_ADMIN_TOKEN. True si c'est fait."""
    cid, secret = _identifiants()
    if not (cid and secret and _boutique()):
        return False
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.post(f"https://{_boutique()}/admin/oauth/access_token",
                                  data={"grant_type": "client_credentials", "client_id": cid, "client_secret": secret},
                                  headers={"Accept": "application/json"})
        if r.status_code >= 400:
            _ETAT["erreur"] = f"Shopify a refusé l'ID/secret client ({r.status_code}) : l'application est-elle installée sur la boutique ?"
            return False
        d = r.json()
        jeton = d.get("access_token")
        if not jeton:
            _ETAT["erreur"] = "Réponse Shopify sans jeton."
            return False
        os.environ["SHOPIFY_ADMIN_TOKEN"] = jeton
        _ETAT.update(auto=True, expire=time.time() + float(d.get("expires_in") or 86399), erreur="")
        return True
    except Exception as e:  # noqa: BLE001
        _ETAT["erreur"] = f"Shopify injoignable : {e}"[:200]
        return False


def install_shopify_auth(g: dict) -> None:
    app = g["app"]
    log = g.get("logger")
    g["shopify_jeton_etat"] = _ETAT
    g["shopify_obtenir_jeton"] = obtenir_jeton

    # Signature des webhooks : pour ces applications, c'est le secret client.
    if not (os.environ.get("SHOPIFY_WEBHOOK_SECRET") or os.environ.get("SHOPIFY_API_SECRET")) and _identifiants()[1]:
        os.environ["SHOPIFY_API_SECRET"] = _identifiants()[1]

    @app.on_event("startup")
    async def _jeton_shopify():
        manuel = os.environ.get("SHOPIFY_ADMIN_TOKEN", "").strip()
        if manuel and not _ETAT["auto"]:
            return  # ancienne application : jeton fixe, rien à faire
        if not all(_identifiants()):
            return
        ok = await obtenir_jeton()
        if log:
            (log.info if ok else log.error)("Shopify : jeton %s", "obtenu (renouvelé automatiquement)" if ok else _ETAT["erreur"])

        async def _renouveler():
            while True:
                # Renouvelle 1 h avant l'expiration ; réessaie toutes les 10 min en cas d'échec.
                attente = max(600.0, _ETAT["expire"] - time.time() - 3600) if _ETAT["auto"] else 600.0
                await asyncio.sleep(attente)
                if not await obtenir_jeton() and log:
                    log.error("Shopify : renouvellement du jeton impossible (%s)", _ETAT["erreur"])
        asyncio.create_task(_renouveler())
