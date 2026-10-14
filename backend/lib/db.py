"""Stockage documentaire des modules ajoutés (Copilote, Pilotage, SheetFlow) — dans la
MÊME base SQL que le backend déployé (SQLite en local, PostgreSQL via DATABASE_URL).

Une seule table `documents` (collection, user_id, id, data JSON), pilotée par
SQLAlchemy avec la session `async_session` de server.py. L'interface reprend le
petit sous-ensemble de l'API Motor utilisé par les routeurs (find / find_one /
insert / update avec $set et $setOnInsert / delete / count), pour qu'aucun routeur
n'ait à connaître le moteur de stockage. Filtres gérés : égalité, $ne, $gte, $in.
"""

import copy
import sys
import uuid
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

from sqlalchemy import JSON, Column, Index, Integer, MetaData, String, Table, delete, select, update

metadata = MetaData()
documents = Table(
    "documents",
    metadata,
    Column("pk", Integer, primary_key=True, autoincrement=True),
    Column("collection", String(64), nullable=False),
    Column("user_id", String(64), nullable=True),
    Column("doc_id", String(80), nullable=True),
    Column("data", JSON, nullable=False),
    Index("ix_documents_coll_user", "collection", "user_id"),
    Index("ix_documents_coll_doc", "collection", "doc_id"),
)


def _srv():
    srv = sys.modules.get("server")
    if srv is None:
        raise RuntimeError("server.py non chargé : la session SQL est indisponible")
    return srv


async def ensure_tables() -> None:
    async with _srv().engine.begin() as conn:
        await conn.run_sync(metadata.create_all)


# ─────────── sérialisation ───────────
def _json_sur(valeur: Any) -> Any:
    """La colonne `data` est du JSON : une date ou datetime Python y faisait planter
    l'écriture (erreur 500 « datetime is not JSON serializable »). On les range en ISO,
    la convention déjà suivie par les routeurs (comparaisons et tris en texte ISO)."""
    if isinstance(valeur, (datetime, date)):
        return valeur.isoformat()
    if isinstance(valeur, dict):
        return {k: _json_sur(v) for k, v in valeur.items()}
    if isinstance(valeur, (list, tuple)):
        return [_json_sur(v) for v in valeur]
    return valeur


# ─────────── filtres ───────────
def _match(doc: dict, filtre: dict) -> bool:
    for cle, attendu in filtre.items():
        valeur = doc.get(cle)
        if isinstance(attendu, dict) and any(k.startswith("$") for k in attendu):
            for op, ref in attendu.items():
                ref = _json_sur(ref)
                if op == "$ne" and valeur == ref:
                    return False
                if op == "$gte" and (valeur is None or valeur < ref):
                    return False
                if op == "$in" and valeur not in ref:
                    return False
        elif valeur != attendu:
            return False
    return True


def _projeter(doc: dict, projection: dict | None) -> dict:
    doc = copy.deepcopy(doc)
    doc.pop("_id", None)
    for cle, garder in (projection or {}).items():
        if not garder:
            doc.pop(cle, None)
    return doc


@dataclass
class _Res:
    deleted_count: int = 0
    modified_count: int = 0
    matched_count: int = 0
    inserted_id: Any = None


class _Curseur:
    def __init__(self, coll: "_Collection", filtre: dict, projection: dict | None):
        self._coll, self._filtre, self._proj = coll, filtre, projection
        self._tri: list[tuple[str, int]] = []
        self._limite: int | None = None

    def sort(self, cle, sens: int = 1):
        self._tri = list(cle) if isinstance(cle, list) else [(cle, sens)]
        return self

    def limit(self, n: int):
        self._limite = n
        return self

    async def to_list(self, n: int | None = None):
        lignes = [d for _, d in await self._coll._lignes(self._filtre)]
        for cle, sens in reversed(self._tri):
            lignes.sort(key=lambda d: (d.get(cle) is None, d.get(cle) if d.get(cle) is not None else ""), reverse=sens < 0)
        borne = min(x for x in (n, self._limite) if x) if (n or self._limite) else None
        return [_projeter(d, self._proj) for d in (lignes[:borne] if borne else lignes)]


class _Collection:
    def __init__(self, nom: str):
        self.nom = nom

    async def _lignes(self, filtre: dict) -> list[tuple[int, dict]]:
        q = select(documents.c.pk, documents.c.data).where(documents.c.collection == self.nom)
        if isinstance(filtre.get("user_id"), str):
            q = q.where(documents.c.user_id == filtre["user_id"])
        if isinstance(filtre.get("id"), str):
            q = q.where(documents.c.doc_id == filtre["id"])
        async with _srv().async_session() as s:
            rows = (await s.execute(q.order_by(documents.c.pk))).all()
        return [(pk, data) for pk, data in rows if _match(data, filtre)]

    def find(self, filtre: dict | None = None, projection: dict | None = None) -> _Curseur:
        return _Curseur(self, filtre or {}, projection)

    async def find_one(self, filtre: dict | None = None, projection: dict | None = None):
        lignes = await self._lignes(filtre or {})
        return _projeter(lignes[0][1], projection) if lignes else None

    async def count_documents(self, filtre: dict | None = None) -> int:
        return len(await self._lignes(filtre or {}))

    def _ligne(self, doc: dict) -> dict:
        doc = _json_sur(copy.deepcopy(doc))
        doc.pop("_id", None)
        return {"collection": self.nom, "user_id": doc.get("user_id"), "doc_id": doc.get("id"), "data": doc}

    async def insert_one(self, doc: dict) -> _Res:
        async with _srv().async_session() as s:
            await s.execute(documents.insert().values(**self._ligne(doc)))
            await s.commit()
        return _Res(inserted_id=doc.get("id") or str(uuid.uuid4()))

    async def insert_many(self, docs: list[dict]) -> _Res:
        if docs:
            async with _srv().async_session() as s:
                await s.execute(documents.insert(), [self._ligne(d) for d in docs])
                await s.commit()
        return _Res()

    async def _maj(self, filtre: dict, maj: dict, upsert: bool, un: bool) -> _Res:
        lignes = await self._lignes(filtre)
        if un:
            lignes = lignes[:1]
        async with _srv().async_session() as s:
            for pk, data in lignes:
                data = {**data, **_json_sur(maj.get("$set", {}))}
                await s.execute(update(documents).where(documents.c.pk == pk).values(
                    data=data, user_id=data.get("user_id"), doc_id=data.get("id")))
            if not lignes and upsert:
                base = {k: v for k, v in filtre.items() if not isinstance(v, dict)}
                doc = {**base, **maj.get("$setOnInsert", {}), **maj.get("$set", {})}
                await s.execute(documents.insert().values(**self._ligne(doc)))
            await s.commit()
        return _Res(matched_count=len(lignes), modified_count=len(lignes))

    async def update_one(self, filtre: dict, maj: dict, upsert: bool = False) -> _Res:
        return await self._maj(filtre, maj, upsert, True)

    async def update_many(self, filtre: dict, maj: dict) -> _Res:
        return await self._maj(filtre, maj, False, False)

    async def _suppr(self, filtre: dict, un: bool) -> _Res:
        lignes = await self._lignes(filtre)
        pks = [pk for pk, _ in (lignes[:1] if un else lignes)]
        if pks:
            async with _srv().async_session() as s:
                await s.execute(delete(documents).where(documents.c.pk.in_(pks)))
                await s.commit()
        return _Res(deleted_count=len(pks))

    async def delete_one(self, filtre: dict) -> _Res:
        return await self._suppr(filtre, True)

    async def delete_many(self, filtre: dict) -> _Res:
        return await self._suppr(filtre, False)


class _Base:
    def __getattr__(self, nom: str) -> _Collection:
        if nom.startswith("__"):
            raise AttributeError(nom)
        return _Collection(nom)

    def __getitem__(self, nom: str) -> _Collection:
        return _Collection(nom)


db = _Base()
