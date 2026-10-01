"""Admin : suspendre / réactiver / supprimer un compte.

- Suspendre (recommandé) : réversible. La personne ne peut plus se connecter ni utiliser
  l'API (403 « compte suspendu »), ses données et ses factures sont conservées.
- Supprimer : définitif, réservé aux demandes explicites (RGPD, compte de test, doublon).
  Toutes les données rattachées au compte sont effacées, SAUF la facturation (commandes,
  paiements, abonnements), que la loi impose de garder 10 ans.
"""
import logging
import secrets
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

log = logging.getLogger("kairos.comptes_admin")

# Tables conservées à la suppression (obligations comptables) : on garde la trace des paiements.
_GARDER = ("order", "commande", "facture", "invoice", "paiement", "payment", "abonnement", "mollie", "admin_action", "app_log")

_BLOQUES: dict = {"t": 0.0, "ids": set()}


def install_comptes_admin(g: dict) -> None:
    api, Base, get_db, async_session = g["api"], g["Base"], g["get_db"], g["async_session"]
    User, _uid = g["User"], g["_uid"]
    admin = Depends(g["exiger_role"]("admin"))

    async def compte_bloque(uid: str) -> bool:
        if time.time() - _BLOQUES["t"] > 30:
            try:
                async with async_session() as db:
                    _BLOQUES["ids"] = set((await db.execute(select(User.id).where(User.bloque.is_(True)))).scalars())
                _BLOQUES["t"] = time.time()
            except Exception as e:  # noqa: BLE001 — en cas de doute, on ne bloque personne
                log.warning("Liste des comptes suspendus indisponible : %s", e)
                return False
        return uid in _BLOQUES["ids"]

    g["_compte_bloque"] = compte_bloque

    async def _cible(db, user_id: str):
        u = await db.get(User, user_id)
        if not u:
            raise HTTPException(404, "Utilisateur introuvable.")
        if u.id == _uid():
            raise HTTPException(422, "Tu ne peux pas faire ça sur ton propre compte.")
        if u.role == "admin":
            raise HTTPException(422, "Retire d'abord le rôle administrateur de ce compte.")
        return u

    class BloquerIn(BaseModel):
        bloque: bool = True
        motif: Optional[str] = None

    @api.post("/admin/utilisateurs/{user_id}/bloquer")
    async def bloquer(user_id: str, body: BloquerIn, db: AsyncSession = Depends(get_db), _r=admin):
        u = await _cible(db, user_id)
        u.bloque = body.bloque
        u.bloque_le = datetime.now(timezone.utc) if body.bloque else None
        u.bloque_motif = ((body.motif or "").strip()[:255] or None) if body.bloque else None
        await db.commit()
        _BLOQUES["t"] = 0.0  # prise en compte immédiate
        return {"ok": True, "bloque": bool(u.bloque)}

    class SupprimerIn(BaseModel):
        confirmation: str

    @api.post("/admin/utilisateurs/{user_id}/supprimer")
    async def supprimer(user_id: str, body: SupprimerIn, db: AsyncSession = Depends(get_db), _r=admin):
        u = await _cible(db, user_id)
        if (body.confirmation or "").strip().lower() != (u.email or "").strip().lower():
            raise HTTPException(422, "Recopie exactement l'adresse e-mail du compte pour confirmer.")
        Abo = g.get("Abonnement")
        a = await db.get(Abo, u.id) if Abo is not None else None
        if a is not None and getattr(a, "mollie_subscription_id", None) and not getattr(a, "resilie", False):
            raise HTTPException(409, "Ce compte a un prélèvement Mollie actif : résilie-le d'abord.")
        email = (u.email or "").strip().lower()
        effacees = 0
        for table in Base.metadata.sorted_tables:
            nom = table.name.lower()
            if any(k in nom for k in _GARDER) or table.name == User.__tablename__ or nom.startswith("users"):
                continue
            for col in ("user_id", "owner_id"):
                if col in table.c:
                    r = await db.execute(delete(table).where(table.c[col] == u.id))
                    effacees += r.rowcount or 0
        # Invitations et rattachements par e-mail.
        for cle in ("AccesEquipe", "MembreEntreprise"):
            M = g.get(cle)
            if M is not None and email:
                o = await db.get(M, email)
                if o:
                    await db.delete(o)
        # Le compte devient une coquille anonyme et suspendue : plus aucune donnée personnelle,
        # l'adresse est libérée, et les anciens jetons de connexion sont refusés.
        u.email = f"supprime-{u.id}@supprime.invalid"
        u.password_hash = secrets.token_hex(32)
        u.role = "client"
        u.bloque, u.bloque_le, u.bloque_motif = True, datetime.now(timezone.utc), "Compte supprimé"
        for champ in ("nom", "name", "prenom", "telephone", "google_id", "microsoft_id", "code_parrainage", "parrain_id"):
            if hasattr(u, champ):
                try:
                    setattr(u, champ, None)
                except Exception:  # noqa: BLE001
                    pass
        await db.commit()
        _BLOQUES["t"] = 0.0
        log.info("Compte %s supprimé par un admin (%s lignes effacées).", u.id, effacees)
        return {"ok": True, "lignes_effacees": effacees}
