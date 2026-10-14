"""Espace Entreprise unifié avec SheetFlow : les bases de l'entreprise vivent dans SON classeur (Google Sheets ou Excel
OneDrive) ou dans SES listes Microsoft ; Zayado n'en garde qu'une copie de lecture (cache 60 s) et écrit chez elle.

- Sources = un onglet (ou une liste). Pages = une vue (tableau, cartes, formulaire, kanban, tableau de bord,
  calendrier, frise, chronomètre) posée sur une source, que les gérants modifient librement.
- Modèles prêts à l'emploi (Planning, Absences, Temps, Pièces, Équipe, Projets) : créent l'onglet s'il manque et,
  la première fois, y envoient les données déjà saisies dans Zayado.
- Commentaires par ligne avec réponses, chronomètre unique (libellé réglable : Ticket, Mission, Prestation…).
Droits : lecture et commentaires pour toute l'équipe ; écriture des lignes pour les rôles qui saisissent ;
sources, pages, modèles et réglages pour le dirigeant et les managers. Jeton cloud : toujours celui du dirigeant.
"""
import logging
import os
import re
import unicodedata
import uuid
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional
from zoneinfo import ZoneInfo

import httpx
from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from fournisseurs_sheet import (ErreurFournisseur, ExcelOneDrive, GoogleSheets, Memoire, MsList, excel_depuis_url,
                                liste_depuis_url)
from lib.dates import today_iso
from lib.db import db as docs
from models.workspace import (Aujourdhui, ChronoEtat, ChronoStart, Classeur, Column, Commentaire, CommentaireIn,
                              EspaceParams, Indicateur, Modele, Page, PageCreate, PageUpdate, ParamsUpdate, Row,
                              RowWrite, Source, SourceConnect, ViewConfig, now_iso)

log = logging.getLogger("kairos.espace")
GERANTS = ("proprietaire", "manager")
ECRIVAINS = ("proprietaire", "manager", "membre", "prestataire")
TZ = os.environ.get("APP_TZ", "Europe/Paris")
CACHE_S = 60

# (libellé, type, options) — l'ordre est celui des colonnes créées dans le classeur
MODELES: dict[str, dict] = {
    "planning": {"nom": "Planning", "onglet": "Planning", "vue": "calendar", "description": "Tâches et rendez-vous de l'équipe, en calendrier.",
                 "colonnes": [("Titre", "text"), ("Date", "date"), ("Fin", "date"), ("Personne", "text"),
                              ("Créneau", "select", ["Matin", "Après-midi", "Journée"]), ("Note", "text")],
                 "config": {"title_field": "titre", "date_field": "date", "end_field": "fin", "person_field": "personne", "category_field": "creneau"}},
    "absences": {"nom": "Absences", "onglet": "Absences", "vue": "calendar", "description": "Congés, maladie, récupération : qui est absent et quand.",
                 "colonnes": [("Personne", "text"), ("Type", "select", ["CP", "Maladie", "Récupération", "École", "Sans solde", "Autre"]),
                              ("Début", "date"), ("Fin", "date"), ("Statut", "select", ["Demandée", "Acceptée", "Refusée"]), ("Motif", "text")],
                 "config": {"title_field": "personne", "date_field": "debut", "end_field": "fin", "person_field": "personne", "group_by": "statut", "category_field": "type"}},
    "temps": {"nom": "Temps", "onglet": "Temps", "vue": "chrono", "description": "Chronomètre et relevé des heures (tickets, missions, prestations).",
              "colonnes": [("Date", "date"), ("Personne", "text"), ("Référence", "text"), ("Début", "text"), ("Fin", "text"), ("Heures", "number"), ("Note", "text")],
              "config": {"title_field": "reference", "date_field": "date", "person_field": "personne", "ref_field": "reference", "hours_field": "heures", "category_field": "reference"}},
    "pieces": {"nom": "Pièces", "onglet": "Pièces", "vue": "kanban", "description": "Documents demandés à chaque personne, suivis par statut.",
               "colonnes": [("Personne", "text"), ("Pièce", "text"), ("Statut", "select", ["À fournir", "Fournie", "Vérifiée", "Refusée"]), ("Lien", "text"), ("Commentaire", "text")],
               "config": {"title_field": "piece", "group_by": "statut", "person_field": "personne", "category_field": "statut"}},
    "equipe": {"nom": "Équipe", "onglet": "Équipe", "vue": "cards", "description": "L'annuaire de l'équipe.",
               "colonnes": [("Nom", "text"), ("E-mail", "text"), ("Rôle", "select", ["Dirigeant", "Manager", "Membre", "Prestataire", "Partenaire"]), ("Poste", "text"), ("Téléphone", "text")],
               "config": {"title_field": "nom", "group_by": "role", "category_field": "role"}},
    "projets": {"nom": "Projets", "onglet": "Projets", "vue": "timeline", "description": "Projets avec début et fin, en frise chronologique.",
                "colonnes": [("Projet", "text"), ("Début", "date"), ("Fin", "date"), ("Responsable", "text"), ("Statut", "select", ["À faire", "En cours", "Terminé"]), ("Note", "text")],
                "config": {"title_field": "projet", "date_field": "debut", "end_field": "fin", "person_field": "responsable", "group_by": "statut", "category_field": "statut"}},
}
SELECTS = {"statut", "type", "creneau", "role", "etat", "priorite", "categorie"}
DATES = {"date", "debut", "fin", "echeance", "jour", "le"}


def slug(t: str) -> str:
    t = unicodedata.normalize("NFD", str(t or "").lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "_", t).strip("_") or "colonne"


def cles_de(entetes: list[str]) -> list[str]:
    vus, out = set(), []
    for e in entetes:
        k = slug(e)
        while k in vus:
            k += "_2"
        vus.add(k)
        out.append(k)
    return out


def en_nombre(v: Any) -> Optional[float]:
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).replace("\u202f", "").replace("\xa0", "").replace(" ", "").replace(",", ".").replace("€", "")
    if not s or not re.fullmatch(r"-?\d+(\.\d+)?", s):
        return None
    return float(s)


def en_date(v: Any, us: bool = False) -> Optional[str]:
    if isinstance(v, (int, float)):
        return None
    s = str(v).strip()
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
    try:
        if m:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3))).isoformat()
        m = re.match(r"^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$", s)
        if m:
            a, b = int(m.group(1)), int(m.group(2))
            j, mo = (b, a) if us else (a, b)
            return date(int(m.group(3)), mo, j).isoformat()
    except ValueError:
        return None
    return None


def colonnes_inferees(cles: list[str], labels: list[str], lignes: list[list], us: bool, types: dict) -> list[dict]:
    out = []
    for i, (k, l) in enumerate(zip(cles, labels)):
        vals = [r[i] for r in lignes if i < len(r) and str(r[i]).strip() != ""]
        imp = types.get(k)
        if imp:
            t, opts = imp["type"], list(imp.get("options") or [])
        elif vals and all(en_nombre(v) is not None for v in vals):
            t, opts = "number", []
        elif (vals and all(en_date(v, us) for v in vals)) or (not vals and k in DATES):
            t, opts = "date", []
        else:
            uniq = sorted({str(v).strip() for v in vals})
            t, opts = ("select", uniq) if (k in SELECTS and len(uniq) <= 12) or (1 < len(uniq) <= 8 and len(vals) >= 2 * len(uniq)) else ("text", [])
        if t == "select":
            opts += [u for u in sorted({str(v).strip() for v in vals}) if u not in opts]
        out.append({"key": k, "label": l or k, "type": t, "options": opts})
    return out


def typer(col: dict, v: Any, us: bool = False) -> Any:
    if v is None or str(v).strip() == "":
        return None
    if col["type"] == "number":
        n = en_nombre(v)
        return n if n is not None else str(v)
    if col["type"] == "date":
        return en_date(v, us) or str(v)[:10]
    return str(v)


def defaut_config(cols: list[dict]) -> dict:
    by = lambda *ts: next((c["key"] for c in cols if c["type"] in ts), None)  # noqa: E731
    return ViewConfig(title_field=by("text", "select"), group_by=by("select"), date_field=by("date"), category_field=by("select"),
                      hours_field=next((c["key"] for c in cols if c["type"] == "number" and re.search(r"heure|duree|temps", c["key"])), None),
                      amount_field=next((c["key"] for c in cols if c["type"] == "number" and re.search(r"montant|prix|total|ca$", c["key"])), None)).model_dump()


def install_entreprise_sheet(g: dict) -> None:
    api, get_db = g["api"], g["get_db"]
    EntMembre, Organisation = g["EntMembre"], g["Organisation"]
    TEST = os.environ.get("ESPACE_FOURNISSEUR_TEST") == "1"

    async def ctx(db) -> tuple:
        uid = g["_uid"]()
        if not uid or uid in ("demo", g.get("DEMO_USER_ID")):
            raise HTTPException(401, "Connexion requise.")
        m = (await db.execute(select(EntMembre).where(EntMembre.user_id == uid, EntMembre.statut == "actif"))).scalars().first()
        if not m:
            raise HTTPException(404, "Aucune entreprise : active « Ton entreprise » ou rejoins une équipe avec ton invitation.")
        return m, await db.get(Organisation, m.org_id)

    def exiger(m, roles, msg="Ton rôle ne permet pas cette action."):
        if m.role not in roles:
            raise HTTPException(403, msg)

    @asynccontextmanager
    async def fournisseur(db, org, kind: str, fid: str):
        try:
            if kind == "test":
                if not TEST:
                    raise HTTPException(422, "Type de base inconnu.")
                yield Memoire(docs, fid)
                return
            prov = "google" if kind == "google-sheets" else "microsoft"
            jeton_uid = g["_current_uid"].set(org.owner_id)
            try:
                jeton, _ = await g["_cloud_token"](db, prov)
            except HTTPException:
                raise HTTPException(409, f"Le dirigeant doit d'abord relier son {'Google Drive' if prov == 'google' else 'compte Microsoft (OneDrive)'} "
                                         "dans Paramètres › Connexions.")
            finally:
                g["_current_uid"].reset(jeton_uid)
            async with httpx.AsyncClient(timeout=40, follow_redirects=True) as c:
                if kind == "ms-lists" and "|" not in fid:
                    fid = await liste_depuis_url(c, jeton, fid)
                yield {"google-sheets": GoogleSheets, "excel": ExcelOneDrive, "ms-lists": MsList}[kind](c, jeton, fid)
        except ErreurFournisseur as e:
            raise HTTPException(502, str(e))
        except httpx.HTTPError as e:
            raise HTTPException(502, f"Google / Microsoft ne répond pas ({type(e).__name__}). Réessaie dans un instant.")

    # ── Stockage (table documents, clé user_id = org_id) ────────────────────────────────────────────────────────────
    async def params(org_id: str) -> dict:
        return await docs.esp_params.find_one({"id": org_id}) or {"id": org_id, "user_id": org_id, "libelle_chrono": "Ticket", "classeur": None, "migre": []}

    async def sauver_params(p: dict):
        await docs.esp_params.update_one({"id": p["id"]}, {"$set": {**p, "user_id": p["id"]}}, upsert=True)

    async def source_doc(org_id: str, sid: str) -> dict:
        s = await docs.esp_sources.find_one({"id": sid, "user_id": org_id})
        if not s:
            raise HTTPException(404, "Source introuvable")
        return s

    def en_source(s: dict) -> Source:
        return Source(**{k: s.get(k) for k in Source.model_fields if s.get(k) is not None})

    async def lire(db, org, s: dict, force=False) -> dict:
        cache = await docs.esp_cache.find_one({"id": s["id"]})
        if cache and not force:
            age = (datetime.now(timezone.utc) - datetime.fromisoformat(cache["lu_le"])).total_seconds()
            if age < CACHE_S:
                return cache
        async with fournisseur(db, org, s["kind"], s["fichier_id"]) as f:
            if f.tabulaire:
                us = await f.us()
                entetes, brutes = await f.lire(s["onglet"])
                cles = cles_de(entetes)
                cols = colonnes_inferees(cles, entetes, [l for _, l in brutes], us, s.get("types") or {})
                lignes = [{"id": rid, "data": {c["key"]: typer(c, l[i] if i < len(l) else None, us) for i, c in enumerate(cols)}} for rid, l in brutes]
            else:
                cols, items = await f.lire_liste()
                cles = [c["key"] for c in cols]
                lignes = [{"id": rid, "data": {c["key"]: typer(c, (str(d.get(c["key"]))[:10] if c["type"] == "date" and d.get(c["key"]) else d.get(c["key"]))) for c in cols}}
                          for rid, d in items]
        cache = {"id": s["id"], "user_id": s["user_id"], "cles": cles, "colonnes": cols, "lignes": lignes, "lu_le": now_iso()}
        await docs.esp_cache.update_one({"id": s["id"]}, {"$set": cache}, upsert=True)
        maj = {"columns": cols, "row_count": len(lignes), "last_synced": cache["lu_le"]}
        if not s.get("default_config"):
            maj["default_config"] = defaut_config(cols)
        await docs.esp_sources.update_one({"id": s["id"]}, {"$set": maj})
        s.update(maj)
        return cache

    def coercer(cols: dict, data: dict) -> dict:
        out = {}
        for k, v in data.items():
            c = cols.get(k)
            if c is None:
                continue
            if v is None or str(v).strip() == "":
                out[k] = None
            elif c["type"] == "number":
                n = en_nombre(v)
                if n is None:
                    raise HTTPException(422, f"« {c['label']} » doit être un nombre")
                out[k] = n
            elif c["type"] == "date":
                d = en_date(v)
                if not d:
                    raise HTTPException(422, f"« {c['label']} » doit être une date")
                out[k] = d
            else:
                out[k] = str(v)[:2000]
        return out

    def pour_liste(cols: dict, data: dict) -> dict:
        return {k: (f"{v}T00:00:00Z" if cols[k]["type"] == "date" and v else v) for k, v in data.items()}

    async def ecrire(db, org, s: dict, row_id: Optional[str], data: Optional[dict], supprimer=False):
        cache = await lire(db, org, s)
        cols = {c["key"]: c for c in cache["colonnes"]}
        propre = coercer(cols, data or {})
        if data is not None and not row_id and not any(v is not None for v in propre.values()):
            raise HTTPException(422, "La ligne est vide")
        actuelle = next((l for l in cache["lignes"] if l["id"] == row_id), None) if row_id else None
        if row_id and not actuelle:
            raise HTTPException(404, "Ligne introuvable (relis la source : elle a peut-être changé dans le classeur)")
        async with fournisseur(db, org, s["kind"], s["fichier_id"]) as f:
            if f.tabulaire:
                fusion = {**(actuelle["data"] if actuelle else {}), **propre}
                valeurs = ["" if fusion.get(k) is None else fusion.get(k) for k in cache["cles"]]
                n = int(row_id[1:]) if row_id else 0
                if supprimer:
                    await f.supprimer(s["onglet"], n)
                elif row_id:
                    await f.modifier(s["onglet"], n, valeurs)
                else:
                    await f.ajouter_lignes(s["onglet"], [valeurs])
            else:
                if supprimer:
                    await f.supprimer_item(row_id)
                elif row_id:
                    await f.modifier_item(row_id, pour_liste(cols, propre))
                else:
                    await f.ajouter(pour_liste(cols, {k: v for k, v in propre.items() if v is not None}))
        return await lire(db, org, s, force=True)

    def en_rows(s: dict, cache: dict) -> list[Row]:
        return [Row(id=l["id"], source_id=s["id"], data=l["data"], created_at=cache["lu_le"], updated_at=cache["lu_le"]) for l in cache["lignes"]]

    async def nouvelle_source(org_id: str, kind: str, fid: str, onglet: str, nom: str, fichier_nom: str, url: Optional[str], modele=None, types=None) -> dict:
        exist = await docs.esp_sources.find_one({"user_id": org_id, "fichier_id": fid, "onglet": onglet})
        if exist:
            if modele and not exist.get("modele"):
                await docs.esp_sources.update_one({"id": exist["id"]}, {"$set": {"modele": modele, "types": types or {}}})
                exist.update(modele=modele, types=types or {})
            return exist
        s = {**Source(name=nom, kind=kind, url=url, fichier_nom=fichier_nom, onglet=onglet, modele=modele).model_dump(),
             "default_config": None, "user_id": org_id, "org_id": org_id, "fichier_id": fid, "types": types or {}}
        await docs.esp_sources.insert_one(s)
        return s

    # ── Sources ────────────────────────────────────────────────────────────────────────────────────────────────────
    @api.get("/sources", response_model=list[Source])
    async def esp_sources(db: AsyncSession = Depends(get_db)):
        m, _ = await ctx(db)
        return [en_source(s) for s in await docs.esp_sources.find({"user_id": m.org_id}).sort("created_at", 1).to_list(500)]

    @api.post("/sources/connect", response_model=list[Source])
    async def esp_connect(body: SourceConnect, db: AsyncSession = Depends(get_db)):
        m, org = await ctx(db)
        exiger(m, GERANTS, "Seuls le dirigeant et les managers relient les bases de l'entreprise.")
        url = (body.url or "").strip() or None
        fid = (body.fichier_id or "").strip()
        if body.kind == "google-sheets" and not fid:
            mm = re.search(r"/spreadsheets/d/([A-Za-z0-9_-]{10,})", url or "")
            if not mm:
                raise HTTPException(400, "URL Google Sheets invalide (https://docs.google.com/spreadsheets/d/…)")
            fid = mm.group(1)
        elif body.kind == "test" and not fid:
            fid = re.sub(r"^test://", "", url or "") or "classeur"
        elif body.kind == "ms-lists" and not fid:
            if not url or "sharepoint.com" not in url:
                raise HTTPException(400, "URL Microsoft Lists invalide (https://<entreprise>.sharepoint.com/sites/…/Lists/…)")
            fid = url
        elif body.kind == "excel" and not fid and not url:
            raise HTTPException(400, "Choisis un classeur Excel ou colle son lien de partage.")
        async with fournisseur(db, org, body.kind, fid or "x") as f:
            if body.kind == "excel" and not fid:
                fid = await excel_depuis_url(f.c, f.h["Authorization"][7:], url)
                f = ExcelOneDrive(f.c, f.h["Authorization"][7:], fid)
            if body.kind == "ms-lists" and "|" not in fid:
                fid = await liste_depuis_url(f.c, f.h["Authorization"][7:], fid)
            info = await f.infos()
            onglets = await f.onglets() if f.tabulaire else [""]
        nom_fichier = (body.name or "").strip() or info["nom"]
        url = info.get("url") or url
        crees = []
        for o in onglets:
            crees.append(await nouvelle_source(m.org_id, body.kind, fid, o, o or nom_fichier, nom_fichier, url))
        if body.kind != "ms-lists":
            p = await params(m.org_id)
            p["classeur"] = Classeur(kind=body.kind, fichier_id=fid, nom=nom_fichier, url=url).model_dump()
            await sauver_params(p)
        for s in crees:
            try:
                await lire(db, org, s, force=True)
            except HTTPException as e:
                log.warning("Lecture initiale %s : %s", s["onglet"], e.detail)
        return [en_source(s) for s in crees]

    @api.get("/sources/{source_id}", response_model=Source)
    async def esp_source(source_id: str, db: AsyncSession = Depends(get_db)):
        m, _ = await ctx(db)
        return en_source(await source_doc(m.org_id, source_id))

    @api.delete("/sources/{source_id}")
    async def esp_source_delier(source_id: str, db: AsyncSession = Depends(get_db)):
        m, _ = await ctx(db)
        exiger(m, GERANTS)
        await source_doc(m.org_id, source_id)
        await docs.esp_sources.delete_one({"id": source_id})
        await docs.esp_cache.delete_one({"id": source_id})
        await docs.esp_pages.delete_many({"user_id": m.org_id, "source_id": source_id})
        return {"ok": True, "detail": "Source déliée de Zayado : rien n'a été supprimé dans ton classeur."}

    @api.post("/sources/{source_id}/sync", response_model=Source)
    async def esp_sync(source_id: str, db: AsyncSession = Depends(get_db)):
        m, org = await ctx(db)
        s = await source_doc(m.org_id, source_id)
        await lire(db, org, s, force=True)
        return en_source(s)

    @api.get("/sources/{source_id}/rows", response_model=list[Row])
    async def esp_rows(source_id: str, db: AsyncSession = Depends(get_db)):
        m, org = await ctx(db)
        s = await source_doc(m.org_id, source_id)
        return en_rows(s, await lire(db, org, s))

    @api.post("/sources/{source_id}/rows", response_model=Row)
    async def esp_row_creer(source_id: str, body: RowWrite, db: AsyncSession = Depends(get_db)):
        m, org = await ctx(db)
        exiger(m, ECRIVAINS, "Ton rôle te permet de consulter et commenter, pas de modifier les lignes.")
        s = await source_doc(m.org_id, source_id)
        cache = await ecrire(db, org, s, None, body.data)
        derniere = cache["lignes"][-1] if cache["lignes"] else {"id": "r0", "data": {}}
        return Row(id=derniere["id"], source_id=source_id, data=derniere["data"])

    @api.patch("/sources/{source_id}/rows/{row_id}", response_model=Row)
    async def esp_row_maj(source_id: str, row_id: str, body: RowWrite, db: AsyncSession = Depends(get_db)):
        m, org = await ctx(db)
        exiger(m, ECRIVAINS, "Ton rôle te permet de consulter et commenter, pas de modifier les lignes.")
        s = await source_doc(m.org_id, source_id)
        cache = await ecrire(db, org, s, row_id, body.data)
        l = next((x for x in cache["lignes"] if x["id"] == row_id), {"id": row_id, "data": {}})
        return Row(id=l["id"], source_id=source_id, data=l["data"])

    @api.delete("/sources/{source_id}/rows/{row_id}")
    async def esp_row_suppr(source_id: str, row_id: str, db: AsyncSession = Depends(get_db)):
        m, org = await ctx(db)
        exiger(m, ECRIVAINS, "Ton rôle ne permet pas de supprimer des lignes.")
        s = await source_doc(m.org_id, source_id)
        await ecrire(db, org, s, row_id, None, supprimer=True)
        return {"ok": True}

    # ── Pages ──────────────────────────────────────────────────────────────────────────────────────────────────────
    @api.get("/pages", response_model=list[Page])
    async def esp_pages(db: AsyncSession = Depends(get_db)):
        m, _ = await ctx(db)
        return [Page(**p) for p in await docs.esp_pages.find({"user_id": m.org_id}, {"user_id": 0}).sort([("ordre", 1), ("created_at", 1)]).to_list(200)]

    async def page_doc(org_id: str, pid: str) -> dict:
        p = await docs.esp_pages.find_one({"id": pid, "user_id": org_id}, {"user_id": 0})
        if not p:
            raise HTTPException(404, "Page introuvable")
        return p

    @api.post("/pages", response_model=Page)
    async def esp_page_creer(body: PageCreate, db: AsyncSession = Depends(get_db)):
        m, _ = await ctx(db)
        exiger(m, GERANTS)
        s = await source_doc(m.org_id, body.source_id)
        n = await docs.esp_pages.count_documents({"user_id": m.org_id})
        p = Page(name=body.name.strip(), source_id=s["id"], view=body.view, config=body.config or ViewConfig(**(s.get("default_config") or {})), ordre=n)
        await docs.esp_pages.insert_one({**p.model_dump(), "user_id": m.org_id})
        return p

    @api.get("/pages/{page_id}", response_model=Page)
    async def esp_page(page_id: str, db: AsyncSession = Depends(get_db)):
        m, _ = await ctx(db)
        return Page(**await page_doc(m.org_id, page_id))

    @api.patch("/pages/{page_id}", response_model=Page)
    async def esp_page_maj(page_id: str, body: PageUpdate, db: AsyncSession = Depends(get_db)):
        m, _ = await ctx(db)
        exiger(m, GERANTS, "Seuls le dirigeant et les managers modifient les pages.")
        p = await page_doc(m.org_id, page_id)
        maj = body.model_dump(exclude_none=True)
        if body.name:
            maj["name"] = body.name.strip()
        await docs.esp_pages.update_one({"id": page_id, "user_id": m.org_id}, {"$set": maj})
        return Page(**{**p, **maj})

    @api.delete("/pages/{page_id}")
    async def esp_page_suppr(page_id: str, db: AsyncSession = Depends(get_db)):
        m, _ = await ctx(db)
        exiger(m, GERANTS)
        res = await docs.esp_pages.delete_one({"id": page_id, "user_id": m.org_id})
        if res.deleted_count == 0:
            raise HTTPException(404, "Page introuvable")
        return {"ok": True}

    # ── Modèles prêts à l'emploi + envoi des données Zayado existantes ───────────────────────────────────────────────
    @api.get("/modeles", response_model=list[Modele])
    async def esp_modeles(db: AsyncSession = Depends(get_db)):
        m, _ = await ctx(db)
        pages = await docs.esp_pages.find({"user_id": m.org_id}).to_list(200)
        par = {p.get("modele"): p["id"] for p in pages if p.get("modele")}
        return [Modele(id=k, nom=v["nom"], description=v["description"], vue=v["vue"], onglet=v["onglet"], colonnes=[c[0] for c in v["colonnes"]],
                       installe=k in par, page_id=par.get(k)) for k, v in MODELES.items()]

    LIB = {"creneau": {"matin": "Matin", "apres_midi": "Après-midi", "journee": "Journée"},
           "abs": {"conges": "CP", "maladie": "Maladie", "recuperation": "Récupération", "ecole": "École", "sans_solde": "Sans solde", "autre": "Autre"},
           "abs_statut": {"demandee": "Demandée", "acceptee": "Acceptée", "refusee": "Refusée"},
           "piece": {"a_fournir": "À fournir", "fournie": "Fournie", "a_verifier": "Fournie", "verifiee": "Vérifiée", "validee": "Vérifiée", "refusee": "Refusée"},
           "role": {"proprietaire": "Dirigeant", "manager": "Manager", "membre": "Membre", "prestataire": "Prestataire", "partenaire": "Partenaire"}}

    async def donnees_zayado(db, org_id: str, modele: str) -> list[list]:
        membres = (await db.execute(select(EntMembre).where(EntMembre.org_id == org_id))).scalars().all()
        nom = {x.id: x.nom or (x.email or "").split("@")[0] for x in membres}
        q = lambda M: select(M).where(M.org_id == org_id)  # noqa: E731
        if modele == "planning":
            rows = (await db.execute(q(g["EntPlanning"]).order_by(g["EntPlanning"].debut))).scalars().all()
            return [[r.titre, r.debut, r.fin or "", nom.get(r.membre_id, "Toute l'équipe") if r.membre_id else "Toute l'équipe",
                     LIB["creneau"].get(r.creneau or "", r.creneau or ""), r.note or ""] for r in rows]
        if modele == "absences":
            rows = (await db.execute(q(g["EntAbsence"]).order_by(g["EntAbsence"].debut))).scalars().all()
            return [[nom.get(r.membre_id, ""), LIB["abs"].get(r.type, r.type), r.debut, r.fin, LIB["abs_statut"].get(r.statut, r.statut), r.motif or ""] for r in rows]
        if modele == "temps":
            rows = (await db.execute(q(g["EntTemps"]).order_by(g["EntTemps"].jour))).scalars().all()
            return [[r.jour, nom.get(r.membre_id, ""), r.ticket or r.dossier or r.libelle or r.projet or "", "", "", r.heures, r.note or ""] for r in rows]
        if modele == "pieces":
            rows = (await db.execute(q(g["EntPiece"]))).scalars().all()
            return [[nom.get(r.membre_id, ""), r.titre, LIB["piece"].get(r.statut, r.statut), r.reference or "", r.commentaire or ""] for r in rows]
        if modele == "equipe":
            return [[x.nom or "", x.email or "", LIB["role"].get(x.role, x.role), x.poste or "", ""] for x in membres if x.statut in ("actif", "invite")]
        return []

    @api.post("/modeles/{modele_id}/installer", response_model=Page)
    async def esp_modele_installer(modele_id: str, db: AsyncSession = Depends(get_db)):
        m, org = await ctx(db)
        exiger(m, GERANTS, "Seuls le dirigeant et les managers ajoutent des pages.")
        mod = MODELES.get(modele_id)
        if not mod:
            raise HTTPException(404, "Modèle introuvable")
        p = await params(m.org_id)
        cl = p.get("classeur")
        if not cl:
            raise HTTPException(409, "Relie d'abord le classeur de l'entreprise (Google Sheets ou Excel).")
        entetes = [c[0] for c in mod["colonnes"]]
        envoyees = 0
        async with fournisseur(db, org, cl["kind"], cl["fichier_id"]) as f:
            onglets = await f.onglets()
            vide = mod["onglet"] not in onglets
            if vide:
                await f.creer_onglet(mod["onglet"], entetes)
            else:
                _, lignes = await f.lire(mod["onglet"])
                vide = not lignes
            if vide and modele_id not in (p.get("migre") or []):
                a_envoyer = await donnees_zayado(db, m.org_id, modele_id)
                await f.ajouter_lignes(mod["onglet"], a_envoyer)
                envoyees = len(a_envoyer)
        p["migre"] = list(set((p.get("migre") or []) + [modele_id]))
        await sauver_params(p)
        types = {slug(c[0]): {"type": c[1], "options": list(c[2]) if len(c) > 2 else []} for c in mod["colonnes"]}
        s = await nouvelle_source(m.org_id, cl["kind"], cl["fichier_id"], mod["onglet"], mod["nom"], cl["nom"], cl.get("url"), modele=modele_id, types=types)
        cache = await lire(db, org, s, force=True)
        cles = {c["key"] for c in cache["colonnes"]}
        config = ViewConfig(**{k: (v if v in cles else None) for k, v in mod["config"].items()})
        exist = await docs.esp_pages.find_one({"user_id": m.org_id, "modele": modele_id}, {"user_id": 0})
        if exist:
            return Page(**exist)
        n = await docs.esp_pages.count_documents({"user_id": m.org_id})
        page = Page(name=mod["nom"], source_id=s["id"], view=mod["vue"], config=config, modele=modele_id, ordre=n)
        await docs.esp_pages.insert_one({**page.model_dump(), "user_id": m.org_id, "lignes_envoyees": envoyees})
        log.info("Modèle %s installé (org %s) : %s ligne(s) Zayado envoyée(s) dans le classeur", modele_id, m.org_id, envoyees)
        return page

    # ── Commentaires par ligne (avec réponses) ───────────────────────────────────────────────────────────────────────
    def en_com(c: dict, m) -> Commentaire:
        return Commentaire(id=c["id"], row_id=c["row_id"], parent_id=c.get("parent_id"), auteur_nom=c["auteur_nom"], texte=c["texte"], le=c["le"],
                           de_moi=c["auteur_id"] == m.id)

    @api.get("/sources/{source_id}/commentaires", response_model=list[Commentaire])
    async def esp_commentaires(source_id: str, db: AsyncSession = Depends(get_db)):
        m, _ = await ctx(db)
        await source_doc(m.org_id, source_id)
        return [en_com(c, m) for c in await docs.esp_commentaires.find({"user_id": m.org_id, "source_id": source_id}).sort("le", 1).to_list(5000)]

    @api.post("/sources/{source_id}/rows/{row_id}/commentaires", response_model=Commentaire)
    async def esp_commenter(source_id: str, row_id: str, body: CommentaireIn, db: AsyncSession = Depends(get_db)):
        m, org = await ctx(db)
        s = await source_doc(m.org_id, source_id)
        cache = await lire(db, org, s)
        ligne = next((l for l in cache["lignes"] if l["id"] == row_id), None)
        if not ligne:
            raise HTTPException(404, "Ligne introuvable")
        fil = await docs.esp_commentaires.find({"user_id": m.org_id, "source_id": source_id, "row_id": row_id}).to_list(500)
        if body.parent_id and not any(c["id"] == body.parent_id for c in fil):
            raise HTTPException(404, "Commentaire d'origine introuvable")
        cfg = s.get("default_config") or {}
        titre = str(ligne["data"].get(cfg.get("title_field") or "") or next((v for v in ligne["data"].values() if v), "une ligne"))[:80]
        c = {"id": str(uuid.uuid4()), "user_id": m.org_id, "source_id": source_id, "row_id": row_id, "parent_id": body.parent_id,
             "auteur_id": m.id, "auteur_nom": m.nom or (m.email or "").split("@")[0], "texte": body.texte.strip(), "le": now_iso(), "titre_ligne": titre}
        await docs.esp_commentaires.insert_one(c)
        f = g.get("notifier")
        if f:
            page = await docs.esp_pages.find_one({"user_id": m.org_id, "source_id": source_id})
            lien = f"/entreprise?vue=page-{page['id']}" if page else "/entreprise"
            cibles = {x["auteur_id"] for x in fil} | {x.id for x in (await db.execute(select(EntMembre).where(
                EntMembre.org_id == m.org_id, EntMembre.statut == "actif", EntMembre.role.in_(GERANTS)))).scalars().all()}
            for mid in cibles - {m.id}:
                dest = await db.get(EntMembre, mid)
                if dest and dest.user_id:
                    try:
                        await f(db, dest.user_id, "equipe", f"{c['auteur_nom']} a commenté « {titre} »", c["texte"][:140], lien, tag=f"com-{source_id}-{row_id}")
                    except Exception as e:  # noqa: BLE001 — une notification ne bloque jamais le commentaire
                        log.warning("Notification commentaire : %s", e)
        return en_com(c, m)

    # ── Chronomètre (un seul ; libellé réglable) ────────────────────────────────────────────────────────────────────
    @api.get("/espace/chrono", response_model=ChronoEtat)
    async def esp_chrono(db: AsyncSession = Depends(get_db)):
        m, _ = await ctx(db)
        c = await docs.esp_chronos.find_one({"id": m.id})
        return ChronoEtat(actif=True, **{k: c[k] for k in ("debut", "reference", "note", "source_id")}) if c else ChronoEtat()

    @api.post("/espace/chrono/demarrer", response_model=ChronoEtat)
    async def esp_chrono_go(body: ChronoStart, db: AsyncSession = Depends(get_db)):
        m, _ = await ctx(db)
        await source_doc(m.org_id, body.source_id)
        if await docs.esp_chronos.find_one({"id": m.id}):
            raise HTTPException(409, "Un chronomètre tourne déjà : arrête-le d'abord.")
        c = {"id": m.id, "user_id": m.org_id, "debut": now_iso(), "reference": body.reference.strip(), "note": body.note.strip(), "source_id": body.source_id}
        await docs.esp_chronos.insert_one(c)
        return ChronoEtat(actif=True, **{k: c[k] for k in ("debut", "reference", "note", "source_id")})

    @api.post("/espace/chrono/arreter", response_model=Row)
    async def esp_chrono_stop(db: AsyncSession = Depends(get_db)):
        m, org = await ctx(db)
        c = await docs.esp_chronos.find_one({"id": m.id})
        if not c:
            raise HTTPException(409, "Aucun chronomètre en cours.")
        s = await source_doc(m.org_id, c["source_id"])
        page = await docs.esp_pages.find_one({"user_id": m.org_id, "source_id": s["id"], "view": "chrono"})
        cfg = {**(s.get("default_config") or {}), **((page or {}).get("config") or {})}
        debut = datetime.fromisoformat(c["debut"]).astimezone(ZoneInfo(TZ))
        fin = datetime.now(ZoneInfo(TZ))
        heures = round(max((fin - debut).total_seconds(), 0) / 3600, 2)
        cache = await lire(db, org, s)
        cles = {x["key"] for x in cache["colonnes"]}
        data = {cfg.get("date_field"): today_iso(TZ), cfg.get("person_field"): m.nom or m.email, cfg.get("ref_field"): c["reference"] or None,
                cfg.get("hours_field"): heures, "debut": debut.strftime("%H:%M"), "fin": fin.strftime("%H:%M"), "note": c["note"] or None}
        data = {k: v for k, v in data.items() if k and k in cles}
        if not cfg.get("hours_field") or cfg["hours_field"] not in cles:
            raise HTTPException(422, "Choisis la colonne « Heures » dans les paramètres de la page Temps.")
        # l'écriture d'abord : si le classeur refuse, le chronomètre reste en cours (rien n'est perdu)
        cache = await ecrire(db, org, s, None, data)
        await docs.esp_chronos.delete_one({"id": m.id})
        l = cache["lignes"][-1]
        return Row(id=l["id"], source_id=s["id"], data=l["data"])

    @api.delete("/espace/chrono")
    async def esp_chrono_annuler(db: AsyncSession = Depends(get_db)):
        m, _ = await ctx(db)
        await docs.esp_chronos.delete_one({"id": m.id})
        return {"ok": True}

    # ── Réglages de l'espace ────────────────────────────────────────────────────────────────────────────────────────
    async def en_params(m) -> EspaceParams:
        p = await params(m.org_id)
        return EspaceParams(libelle_chrono=p.get("libelle_chrono") or "Ticket", classeur=Classeur(**p["classeur"]) if p.get("classeur") else None,
                            test_disponible=TEST, peut_gerer=m.role in GERANTS, peut_ecrire=m.role in ECRIVAINS)

    @api.get("/espace/parametres", response_model=EspaceParams)
    async def esp_params(db: AsyncSession = Depends(get_db)):
        m, _ = await ctx(db)
        return await en_params(m)

    @api.patch("/espace/parametres", response_model=EspaceParams)
    async def esp_params_maj(body: ParamsUpdate, db: AsyncSession = Depends(get_db)):
        m, _ = await ctx(db)
        exiger(m, GERANTS, "Seuls le dirigeant et les managers modifient les réglages de l'espace.")
        p = await params(m.org_id)
        p["libelle_chrono"] = body.libelle_chrono.strip()
        await sauver_params(p)
        return await en_params(m)

    # ── Aujourd'hui : indicateurs calculés sur les vraies lignes, source et heure de lecture affichées ────────────────
    @api.get("/espace/aujourdhui", response_model=Aujourdhui)
    async def esp_aujourdhui(db: AsyncSession = Depends(get_db)):
        m, org = await ctx(db)
        auj = today_iso(TZ)
        lundi = (date.fromisoformat(auj) - timedelta(days=date.fromisoformat(auj).weekday())).isoformat()
        p_lib = (await params(m.org_id)).get("libelle_chrono") or "Ticket"
        out = []
        for page in await docs.esp_pages.find({"user_id": m.org_id}).to_list(200):
            mod = page.get("modele")
            if mod not in ("planning", "absences", "temps", "pieces"):
                continue
            try:
                s = await source_doc(m.org_id, page["source_id"])
                cache = await lire(db, org, s)
            except HTTPException as e:
                log.info("Aujourd'hui : %s illisible (%s)", page["name"], e.detail)
                continue
            cfg, lignes = page.get("config") or {}, [l["data"] for l in cache["lignes"]]
            d, f_ = cfg.get("date_field"), cfg.get("end_field")
            dans = lambda x: bool(x.get(d)) and str(x.get(d)) <= auj <= str(x.get(f_) or x.get(d))  # noqa: E731
            heure = datetime.fromisoformat(cache["lu_le"]).astimezone(ZoneInfo(TZ)).strftime("%H:%M")
            base = {"source": f"{s['fichier_nom']} › {s['onglet'] or s['name']}", "lu_le": f"lu à {heure}", "page_id": page["id"]}
            if mod == "planning":
                n = sum(1 for x in lignes if dans(x))
                out.append(Indicateur(cle="planning", libelle="Au planning aujourd'hui", valeur=str(n), detail=f"{len(lignes)} ligne(s) au total", **base))
            elif mod == "absences":
                st = cfg.get("group_by") or "statut"
                absents = sum(1 for x in lignes if dans(x) and str(x.get(st) or "").lower() != "refusée")
                attente = sum(1 for x in lignes if str(x.get(st) or "").lower() == "demandée")
                out.append(Indicateur(cle="absences", libelle="Absents aujourd'hui", valeur=str(absents), detail=f"{attente} demande(s) à valider", **base))
            elif mod == "temps":
                h = cfg.get("hours_field")
                tot = sum(float(x.get(h) or 0) for x in lignes if h and str(x.get(d) or "") >= lundi and str(x.get(d) or "") <= auj)
                out.append(Indicateur(cle="temps", libelle="Heures cette semaine", valeur=f"{tot:.1f} h".replace(".", ","), detail=f"Suivi par {p_lib.lower()}", **base))
            elif mod == "pieces":
                st = cfg.get("group_by") or "statut"
                n = sum(1 for x in lignes if str(x.get(st) or "").lower() in ("à fournir", "a fournir"))
                out.append(Indicateur(cle="pieces", libelle="Pièces à fournir", valeur=str(n), detail=f"{len(lignes)} pièce(s) suivie(s)", **base))
        return Aujourdhui(date=auj, indicateurs=out)
