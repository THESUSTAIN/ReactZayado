"""Récupération des données du compte démo : avant le verrou d'authentification, les requêtes sans jeton
étaient rangées dans le compte DEMO_USER_ID. Routes admin pour voir ce qu'il contient et le transférer.

Extrait de server.py (audit d'architecture) sans changement de route ni de réponse.
  GET  /admin/compte-demo             — lignes par table, avec aperçu
  POST /admin/compte-demo/transferer  — réattribue les lignes à un vrai compte
"""
from typing import Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


class TransfertDemoIn(BaseModel):
    email: str
    tables: Optional[list[str]] = None  # None = toutes les tables transférables


def _user_id_unique(table) -> bool:
    col = table.c.user_id
    if col.unique:
        return True
    return any(getattr(c, "columns", None) is not None and list(c.columns) == [col] for c in table.constraints
               if c.__class__.__name__ == "UniqueConstraint")


def install_compte_demo(g: dict) -> None:
    api, Base, get_db, User, logger = g["api"], g["Base"], g["get_db"], g["User"], g["logger"]
    DEMO_USER_ID = g["DEMO_USER_ID"]
    admin = Depends(g["exiger_role"]("admin"))

    def _tables_avec_user_id():
        # Lu à l'appel : inclut les tables déclarées par les modules installés plus tard.
        return [t for t in Base.metadata.sorted_tables if "user_id" in t.c]

    @api.get("/admin/compte-demo")
    async def admin_compte_demo(db: AsyncSession = Depends(get_db), _role=admin):
        """Nombre de lignes rattachées au compte démo, table par table, avec un aperçu."""
        resultat = []
        for t in _tables_avec_user_id():
            n = (await db.execute(select(func.count()).select_from(t).where(t.c.user_id == DEMO_USER_ID))).scalar_one()
            if not n:
                continue
            cols = [c for c in t.c if c.name not in ("user_id",)][:6]
            apercu = (await db.execute(select(*cols).where(t.c.user_id == DEMO_USER_ID).limit(5))).mappings().all()
            resultat.append({"table": t.name, "lignes": n, "unique_par_utilisateur": _user_id_unique(t),
                             "apercu": [{k: (str(v)[:120] if v is not None else None) for k, v in dict(r).items()} for r in apercu]})
        return {"compte_demo": DEMO_USER_ID, "tables": resultat}

    @api.post("/admin/compte-demo/transferer")
    async def admin_transferer_compte_demo(body: TransfertDemoIn, db: AsyncSession = Depends(get_db), _role=admin):
        """Les tables à une ligne par utilisateur ne sont transférées que si le compte cible n'en a pas encore."""
        email = body.email.strip().lower()
        cible = (await db.execute(select(User).where(func.lower(User.email) == email))).scalar_one_or_none()
        if not cible:
            raise HTTPException(404, "Aucun compte avec cet e-mail.")
        choisies = set(body.tables) if body.tables else None
        transferts, ignorees = {}, {}
        for t in _tables_avec_user_id():
            if choisies is not None and t.name not in choisies:
                continue
            n = (await db.execute(select(func.count()).select_from(t).where(t.c.user_id == DEMO_USER_ID))).scalar_one()
            if not n:
                continue
            if _user_id_unique(t):
                deja = (await db.execute(select(func.count()).select_from(t).where(t.c.user_id == cible.id))).scalar_one()
                if deja:
                    ignorees[t.name] = "le compte cible a déjà sa propre ligne (table 1 ligne par utilisateur)"
                    continue
            await db.execute(t.update().where(t.c.user_id == DEMO_USER_ID).values(user_id=cible.id))
            transferts[t.name] = n
        await db.commit()
        logger.info("Transfert compte démo → %s : %s", cible.id, transferts)
        return {"ok": True, "vers": {"id": cible.id, "email": cible.email}, "transferes": transferts, "ignores": ignorees}
