"""Utilisateur courant pour les routeurs Mongo (Copilote, SheetFlow).

Le middleware JWT du backend déployé (server.py) remplit le ContextVar `_current_uid`
à chaque requête ; on le lit ici sans import circulaire."""
import sys


def uid() -> str:
    """Identité stricte : sans utilisateur authentifié, la requête est refusée (jamais d'espace « demo » partagé)."""
    from fastapi import HTTPException

    srv = sys.modules.get("server")
    var = getattr(srv, "_current_uid", None) if srv else None
    valeur = var.get() if var is not None else None
    if not valeur or valeur in ("demo", getattr(srv, "DEMO_USER_ID", "demo-user")):
        raise HTTPException(status_code=401, detail="Connexion requise.")
    return valeur


OFFRES = {"essentielle": "Essentielle", "reveur": "Rêveur", "serenite": "Solo", "pro": "Pro", "business": "Équipe", "entreprise": "Entreprise"}


async def identite() -> dict:
    """Prénom et offre RÉELS du compte connecté, lus dans la base SQL du backend déployé."""
    srv = sys.modules.get("server")
    if srv is None:
        return {}
    try:
        from sqlalchemy import select

        async with srv.async_session() as s:
            vp = (await s.execute(select(srv.VisionProfile).where(srv.VisionProfile.user_id == uid()))).scalar_one_or_none()
            u = await s.get(srv.User, uid())
        prenom = (vp.prenom if vp and vp.prenom else "") or (u.email.split("@")[0].split(".")[-1].capitalize() if u else "")
        plan = (vp.plan if vp and vp.plan else "essentielle")
        return {"prenom": prenom, "offre": OFFRES.get(plan, plan.capitalize())}
    except Exception:  # noqa: BLE001 — jamais bloquant
        return {}
