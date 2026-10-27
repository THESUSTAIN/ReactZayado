"""Admin — personnalisation des tunnels des utilisateurs (textes, prix, code complet) et modèles de départ.

GET  /api/admin/tunnels                          liste de tous les tunnels (tous utilisateurs, Pro compris)
GET  /api/admin/tunnels/{owner}/{tid}            tunnel complet (+ code personnalisé)
PUT  /api/admin/tunnels/{owner}/{tid}            corrige textes / prix / option / SEO / code
GET  /api/admin/tunnels-modeles                  modèles préparamétrés (par parcours) — surcharges admin
PUT  /api/admin/tunnels-modeles/{parcours}       enregistre un modèle (placeholders {sujet} et {metier})
DELETE /api/admin/tunnels-modeles/{parcours}     revient au modèle d'origine

Le « code » (head, css, html_haut, html_bas, js) est injecté tel quel dans la page publique /t/{slug} :
réservé aux administrateurs (jamais modifiable par l'utilisateur lui-même).
"""

import asyncio
import sys

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from lib.db import db
from models.copilote import Downsell, EtapeTunnel, Parcours, Upsell

_verrous: dict[str, asyncio.Lock] = {}


async def _admin():
    await sys.modules["server"].exiger_role("admin")()


router_public = APIRouter(dependencies=[Depends(_admin)])  # monté sous /api


class CodeTunnel(BaseModel):
    head: str = Field(default="", max_length=20000)
    css: str = Field(default="", max_length=60000)
    html_haut: str = Field(default="", max_length=60000)
    html_bas: str = Field(default="", max_length=60000)
    js: str = Field(default="", max_length=60000)


class SeoTunnel(BaseModel):
    titre: str = ""
    description: str = ""
    image: str = ""


class TunnelAdminPatch(BaseModel):
    nom: str | None = None
    etapes: list[EtapeTunnel] | None = None
    upsell: Upsell | None = None
    downsell: Downsell | None = None
    seo: SeoTunnel | None = None
    code: CodeTunnel | None = None


class ModeleTunnelIn(BaseModel):
    etapes: list[EtapeTunnel]
    code: CodeTunnel = CodeTunnel()


async def _emails(ids: list[str]) -> dict[str, tuple[str, str]]:
    srv = sys.modules["server"]
    from sqlalchemy import select
    out: dict[str, tuple[str, str]] = {}
    async with srv.async_session() as s:
        for u in (await s.execute(select(srv.User).where(srv.User.id.in_(ids)))).scalars():
            out[u.id] = (u.email, "")
        for vp in (await s.execute(select(srv.VisionProfile).where(srv.VisionProfile.user_id.in_(ids)))).scalars():
            if vp.user_id in out:
                out[vp.user_id] = (out[vp.user_id][0], vp.plan or "essentielle")
    return out


@router_public.get("/admin/tunnels")
async def tous_les_tunnels():
    espaces = await db.copilote_espace.find({}).to_list(5000)
    lignes = []
    for e in espaces:
        for t in (e.get("data") or {}).get("tunnels", []):
            lignes.append({"owner": e["user_id"], "id": t["id"], "nom": t.get("nom", ""), "etat": t.get("etat", ""),
                           "parcours": t.get("parcours", "produit"), "slug": t.get("slug"), "cree_le": t.get("cree_le", ""),
                           "code_perso": any((t.get("code") or {}).values())})
    infos = await _emails(list({x["owner"] for x in lignes})) if lignes else {}
    for x in lignes:
        x["email"], x["offre"] = infos.get(x["owner"], ("", ""))
    return sorted(lignes, key=lambda x: x["cree_le"], reverse=True)


async def _espace(owner: str) -> dict:
    doc = await db.copilote_espace.find_one({"user_id": owner})
    if not doc:
        raise HTTPException(404, "Utilisateur sans espace tunnels.")
    return doc


def _trouver(doc: dict, tid: str) -> dict:
    t = next((x for x in (doc.get("data") or {}).get("tunnels", []) if x.get("id") == tid), None)
    if not t:
        raise HTTPException(404, "Tunnel introuvable.")
    return t


@router_public.get("/admin/tunnels/{owner}/{tid}")
async def lire_tunnel(owner: str, tid: str):
    t = _trouver(await _espace(owner), tid)
    return {**t, "code": {**CodeTunnel().model_dump(), **(t.get("code") or {})}, "seo": t.get("seo") or {}}


@router_public.put("/admin/tunnels/{owner}/{tid}")
async def corriger_tunnel(owner: str, tid: str, b: TunnelAdminPatch):
    async with _verrous.setdefault(owner, asyncio.Lock()):
        doc = await _espace(owner)
        t = _trouver(doc, tid)
        t.update(b.model_dump(exclude_none=True))
        if b.upsell is not None:
            for e in t["etapes"]:
                if e["cle"] == "upsell":
                    e["offre_nom"], e["prix"] = b.upsell.nom, b.upsell.prix
        await db.copilote_espace.update_one({"user_id": owner}, {"$set": {"data": doc["data"]}})
    return await lire_tunnel(owner, tid)


# ═══════════ Modèles préparamétrés (utilisés à la création d'un tunnel) ═══════════
from lib.tunnels_modeles import modele_pour  # noqa: E402,F401  (ré-export : ancien point d'accès)


@router_public.get("/admin/tunnels-modeles")
async def modeles():
    from routers.copilote import _brouillon
    out = {}
    for p in ("produit", "rendez_vous"):
        m = await db.tunnel_modeles.find_one({"id": p})
        defaut = _brouillon("{sujet}", "{metier}", p, "complementarite")["etapes"]
        out[p] = {"personnalise": bool(m), "etapes": (m or {}).get("etapes") or defaut,
                  "code": {**CodeTunnel().model_dump(), **((m or {}).get("code") or {})}}
    return out


@router_public.put("/admin/tunnels-modeles/{parcours}")
async def enregistrer_modele(parcours: Parcours, b: ModeleTunnelIn):
    await db.tunnel_modeles.update_one({"id": parcours}, {"$set": {"id": parcours, **b.model_dump()}}, upsert=True)
    return (await modeles())[parcours]


@router_public.delete("/admin/tunnels-modeles/{parcours}")
async def reinitialiser_modele(parcours: Parcours):
    await db.tunnel_modeles.delete_one({"id": parcours})
    return (await modeles())[parcours]
