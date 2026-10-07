"""Plan d'action ↔ Trello (compte Trello de l'utilisateur).

Le Copilote propose, à la mise en route, de relier le Plan d'action à Trello :
l'utilisateur colle sa clé API et son jeton Trello (https://trello.com/power-ups/admin),
choisit la liste où envoyer ses actions, et chaque action créée dans Zayado devient
une carte Trello. Identifiants chiffrés au repos (UserConnection, provider « trello »).
"""
import asyncio
import json
import logging
from typing import Optional

import httpx
from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

log = logging.getLogger("kairos.trello")
API = "https://api.trello.com/1"


def install_trello(g: dict) -> None:
    api, get_db, _uid, async_session = g["api"], g["get_db"], g["_uid"], g["async_session"]

    # ── La question « retrouver tes actions ailleurs ? » : posée UNE fois, à la 3e action ; « non » = plus jamais ──
    from pydantic import BaseModel as _BM

    class _Rep(_BM):
        reponse: str  # oui | non | plus_tard

    @api.get("/actions/question-integrations")
    async def question_integrations(db=Depends(get_db)):
        from datetime import datetime, timedelta, timezone
        from sqlalchemy import func, select
        uid = _uid()
        p = await g["_profil"](db, uid)
        q = (p.contexte_metier or {}).get("question_integrations") or {}
        if q.get("reponse") in ("oui", "non"):
            return {"poser": False}
        if q.get("reponse") == "plus_tard" and q.get("le"):
            try:
                if datetime.fromisoformat(q["le"]) > datetime.now(timezone.utc) - timedelta(days=14):
                    return {"poser": False}
            except ValueError:
                pass
        n = (await db.execute(select(func.count()).select_from(g["VisionTache"]).where(g["VisionTache"].user_id == uid))).scalar_one()
        return {"poser": n >= 3, "actions": n}

    @api.put("/actions/question-integrations")
    async def repondre_integrations(body: _Rep, db=Depends(get_db)):
        from datetime import datetime, timezone
        if body.reponse not in ("oui", "non", "plus_tard"):
            raise HTTPException(422, "Réponse : oui, non ou plus_tard.")
        p = await g["_profil"](db, _uid())
        p.contexte_metier = {**(p.contexte_metier or {}), "question_integrations": {"reponse": body.reponse, "le": datetime.now(timezone.utc).isoformat()}}
        await db.commit()
        return {"ok": True}
    UserConnection, _get_connection = g["UserConnection"], g["_get_connection"]
    _chiffrer, _dechiffrer = g["_chiffrer"], g["_dechiffrer"]

    def _creds(c) -> dict:
        try:
            return json.loads(_dechiffrer(c.credentials_enc or "") or "{}")
        except Exception:  # noqa: BLE001
            return {}

    async def _tableaux(cle: str, jeton: str) -> list:
        async with httpx.AsyncClient(timeout=20) as cl:
            r = await cl.get(f"{API}/members/me/boards", params={"key": cle, "token": jeton, "filter": "open", "fields": "name", "lists": "open"})
        if r.status_code in (400, 401):
            raise HTTPException(422, "Trello refuse cette clé ou ce jeton. Vérifie-les sur trello.com/power-ups/admin.")
        if r.status_code >= 400:
            raise HTTPException(502, "Trello ne répond pas pour le moment.")
        return [{"id": b["id"], "nom": b["name"], "listes": [{"id": l["id"], "nom": l["name"]} for l in (b.get("lists") or [])]} for b in r.json()]

    @api.get("/plan-action/trello")
    async def etat(db: AsyncSession = Depends(get_db)):
        c = await _get_connection(db, "trello")
        if not c or c.status != "ready":
            return {"relie": False}
        cr = _creds(c)
        # Identifiants enregistrés (ex. via « Mes connexions ») mais aucune liste choisie : aucune carte ne peut partir.
        return {"relie": bool(cr.get("list_id")), "incomplet": not cr.get("list_id"),
                "liste": cr.get("list_nom"), "tableau": cr.get("board_nom")}

    class RelierIn(BaseModel):
        api_key: str = Field(min_length=10, max_length=200)
        token: str = Field(min_length=10, max_length=400)

    @api.post("/plan-action/trello")
    async def relier(body: RelierIn, db: AsyncSession = Depends(get_db)):
        tableaux = await _tableaux(body.api_key.strip(), body.token.strip())
        c = await _get_connection(db, "trello")
        if not c:
            c = UserConnection(user_id=_uid(), provider="trello")
            db.add(c)
        c.label = "Trello"
        c.status = "pending"
        c.credentials_enc = _chiffrer(json.dumps({"api_key": body.api_key.strip(), "token": body.token.strip()}))
        await db.commit()
        return {"tableaux": tableaux}

    class ListeIn(BaseModel):
        list_id: str = Field(min_length=5, max_length=64)

    @api.put("/plan-action/trello/liste")
    async def choisir_liste(body: ListeIn, db: AsyncSession = Depends(get_db)):
        c = await _get_connection(db, "trello")
        if not c:
            raise HTTPException(409, "Relie d'abord ton compte Trello.")
        cr = _creds(c)
        tableaux = await _tableaux(cr.get("api_key", ""), cr.get("token", ""))
        trouve = next(((b, l) for b in tableaux for l in b["listes"] if l["id"] == body.list_id), None)
        if not trouve:
            raise HTTPException(404, "Liste Trello introuvable.")
        cr.update({"list_id": body.list_id, "list_nom": trouve[1]["nom"], "board_nom": trouve[0]["nom"]})
        c.credentials_enc = _chiffrer(json.dumps(cr))
        c.status = "ready"
        await db.commit()
        return {"relie": True, "liste": cr["list_nom"], "tableau": cr["board_nom"]}

    @api.delete("/plan-action/trello")
    async def couper(db: AsyncSession = Depends(get_db)):
        c = await _get_connection(db, "trello")
        if c:
            await db.delete(c)
            await db.commit()
        return {"ok": True}

    async def envoyer_carte(uid: str, titre: str, duree: Optional[int] = None, description: str = "") -> bool:
        """Crée la carte dans la liste Trello DE L'UTILISATEUR. True si Trello l'a acceptée."""
        try:
            async with async_session() as db:
                c = await _get_connection(db, "trello", uid)
                if not c or c.status != "ready":
                    return False
                cr = _creds(c)
            if not cr.get("list_id"):
                return False
            desc = f"Action créée dans Zayado{f' · {duree} min' if duree else ''}."
            if description:
                desc = f"{description}\n\n{desc}"
            async with httpx.AsyncClient(timeout=20) as cl:
                r = await cl.post(f"{API}/cards", params={"key": cr["api_key"], "token": cr["token"]},
                                  json={"idList": cr["list_id"], "name": titre[:300], "desc": desc})
            if r.status_code >= 400:
                log.warning("Carte Trello refusée (%s) : %s", r.status_code, r.text[:200])
                return False
            return True
        except Exception as e:  # noqa: BLE001 — ne jamais bloquer la création d'une action
            log.warning("Envoi Trello : %s", e)
            return False

    def apres_creation_tache(uid: str, titre: str, duree: Optional[int] = None) -> None:
        asyncio.create_task(envoyer_carte(uid, titre, duree))

    g["_apres_creation_tache"] = apres_creation_tache
    g["_envoyer_carte_trello"] = envoyer_carte
