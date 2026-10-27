"""Modèles de tunnels préparamétrés par l'admin (collection tunnel_modeles).

Module neutre partagé par routers/copilote.py (création de tunnel) et routers/admin_tunnels.py
(édition admin) : casse l'import circulaire copilote ↔ admin_tunnels.
"""
from lib.db import db


async def modele_pour(parcours: str, sujet: str, metier: str) -> dict | None:
    """Appelé par la création de tunnel : renvoie les étapes + code du modèle admin, ou None."""
    m = await db.tunnel_modeles.find_one({"id": parcours})
    if not m:
        return None
    rem = lambda s: (s or "").replace("{sujet}", sujet).replace("{metier}", metier)  # noqa: E731
    etapes = [{**e, **{k: rem(e.get(k)) for k in ("titre", "accroche", "contenu", "bouton", "offre_nom")}} for e in m["etapes"]]
    return {"etapes": etapes, "code": m.get("code") or {}}
