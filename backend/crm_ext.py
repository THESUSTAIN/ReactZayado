"""Où vont mes contacts : Zayado relie, il ne stocke pas.

Chaque personne qui s'inscrit à un tunnel (ou demande une commande, un rendez-vous) part tout de suite
dans l'outil que l'utilisateur a choisi, chez lui :
  · brevo          sa clé Brevo (Paramètres › Connexions) → contact créé ou mis à jour, dans sa liste s'il en donne une
  · hubspot        son jeton d'app privée HubSpot → contact créé ou mis à jour
  · google-sheets  un classeur « Zayado — Contacts » créé dans SON Google Drive (une ligne par demande)
  · excel          le même classeur, en Excel, dans SON OneDrive
  · make           son scénario Make (événement « contact_tunnel ») pour tout autre outil
  · aucun          rien ne sort de Zayado
Zayado garde seulement le fil (Radar, Plan d'action) ; la fiche complète vit dans l'outil de l'utilisateur.
Un envoi raté ne bloque jamais l'inscription : l'erreur est notée et visible dans Paramètres.

Routes (connecté) : GET/PUT /crm/reglages · POST /crm/envoyer-tout
"""
from __future__ import annotations

import asyncio
import io
import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field

log = logging.getLogger("kairos.crm")

CIBLES = ("aucun", "brevo", "hubspot", "google-sheets", "excel", "make")
ENTETES = ["Date", "Nom", "E-mail", "Source", "Demande"]
ONGLET = "Contacts"
TITRE_CLASSEUR = "Zayado — Contacts"


def _nom_prenom(nom: str) -> tuple[str, str]:
    parts = (nom or "").strip().split()
    return (parts[0] if parts else ""), " ".join(parts[1:])


class CrmIn(BaseModel):
    cible: str = Field(pattern="^(aucun|brevo|hubspot|google-sheets|excel|make)$")


def install_crm(g: dict) -> None:
    api, get_db = g["api"], g["get_db"]
    async_session, _uid = g["async_session"], g["_uid"]
    _get_connection, _dechiffrer = g["_get_connection"], g["_dechiffrer"]
    from lib.db import db as docs

    async def _reglage(uid: str) -> dict:
        return await docs.crm_reglages.find_one({"user_id": uid}) or {"id": uid, "user_id": uid, "cible": "aucun"}

    async def _sauver(uid: str, patch: dict) -> None:
        await docs.crm_reglages.update_one({"user_id": uid}, {"$set": {"id": uid, "user_id": uid, **patch}}, upsert=True)

    async def _cles(db, uid: str, provider: str) -> Optional[dict]:
        c = await _get_connection(db, provider, uid)
        if not c or c.status != "ready" or not c.credentials_enc:
            return None
        try:
            return json.loads(_dechiffrer(c.credentials_enc) or "{}")
        except Exception:  # noqa: BLE001
            return None

    async def _jeton_cloud(db, uid: str, prov: str) -> str:
        jeton_uid = g["_current_uid"].set(uid)
        try:
            jeton, _ = await g["_cloud_token"](db, prov)
            return jeton
        finally:
            g["_current_uid"].reset(jeton_uid)

    async def _disponibles(db, uid: str) -> dict:
        async def pret(p):
            c = await _get_connection(db, p, uid)
            return bool(c and c.status == "ready")
        return {"brevo": bool((await _cles(db, uid, "brevo") or {}).get("api_key")),
                "hubspot": bool((await _cles(db, uid, "hubspot") or {}).get("access_token")),
                "google-sheets": await pret("google_drive"), "excel": await pret("microsoft_drive"),
                "make": await pret("make"), "aucun": True}

    # ── Envois, un par outil ──
    async def _brevo(cles: dict, c: dict) -> None:
        prenom, nom = _nom_prenom(c["nom"])
        corps = {"email": c["email"], "attributes": {"FIRSTNAME": prenom, "LASTNAME": nom}, "updateEnabled": True}
        liste = str(cles.get("liste_id") or "").strip()
        if liste.isdigit():
            corps["listIds"] = [int(liste)]
        async with httpx.AsyncClient(timeout=15) as cl:
            r = await cl.post("https://api.brevo.com/v3/contacts", json=corps,
                              headers={"api-key": cles["api_key"], "accept": "application/json"})
        if r.status_code == 401:
            raise RuntimeError("Brevo refuse la clé API : vérifiez-la dans Paramètres › Connexions.")
        if r.status_code >= 400:
            raise RuntimeError(f"Brevo a répondu {r.status_code} : {r.text[:160]}")

    async def _hubspot(cles: dict, c: dict) -> None:
        prenom, nom = _nom_prenom(c["nom"])
        h = {"Authorization": f"Bearer {cles['access_token']}", "Content-Type": "application/json"}
        props = {"email": c["email"], "firstname": prenom, "lastname": nom}
        async with httpx.AsyncClient(timeout=15) as cl:
            r = await cl.post("https://api.hubapi.com/crm/v3/objects/contacts", headers=h,
                              json={"properties": {**props, "lifecyclestage": "lead"}})
            if r.status_code == 409:  # déjà dans HubSpot : on met à jour le nom
                r = await cl.patch(f"https://api.hubapi.com/crm/v3/objects/contacts/{c['email']}?idProperty=email",
                                   headers=h, json={"properties": {"firstname": prenom, "lastname": nom}})
        if r.status_code == 401:
            raise RuntimeError("HubSpot refuse le jeton : vérifiez-le dans Paramètres › Connexions.")
        if r.status_code >= 400:
            raise RuntimeError(f"HubSpot a répondu {r.status_code} : {r.text[:160]}")

    async def _classeur(db, uid: str, kind: str) -> dict:
        """Crée le classeur « Zayado — Contacts » dans le Drive / OneDrive de l'utilisateur (une seule fois)."""
        from fournisseurs_sheet import ExcelOneDrive, GoogleSheets
        prov = "google" if kind == "google-sheets" else "microsoft"
        jeton = await _jeton_cloud(db, uid, prov)
        async with httpx.AsyncClient(timeout=40) as cl:
            if kind == "google-sheets":
                r = await cl.post("https://sheets.googleapis.com/v4/spreadsheets", headers={"Authorization": f"Bearer {jeton}"},
                                  json={"properties": {"title": TITRE_CLASSEUR}, "sheets": [{"properties": {"title": ONGLET}}]})
                if r.status_code >= 400:
                    raise HTTPException(502, f"Google n'a pas créé le classeur ({r.status_code}).")
                d = r.json()
                fid, url = d["spreadsheetId"], d.get("spreadsheetUrl")
                await GoogleSheets(cl, jeton, fid).modifier(ONGLET, 1, ENTETES)
            else:
                from openpyxl import Workbook
                wb = Workbook()
                ws = wb.active
                ws.title = ONGLET
                ws.append(ENTETES)
                tampon = io.BytesIO()
                wb.save(tampon)
                r = await cl.put("https://graph.microsoft.com/v1.0/me/drive/root:/Zayado/Zayado - Contacts.xlsx:/content"
                                 "?@microsoft.graph.conflictBehavior=rename", headers={"Authorization": f"Bearer {jeton}"},
                                 content=tampon.getvalue())
                if r.status_code >= 400:
                    raise HTTPException(502, f"OneDrive n'a pas créé le classeur ({r.status_code}).")
                d = r.json()
                fid, url = d["id"], d.get("webUrl")
                await ExcelOneDrive(cl, jeton, fid).infos()
        return {"fichier_id": fid, "fichier_url": url, "fichier_kind": kind}

    async def _ligne(db, uid: str, reg: dict, c: dict) -> None:
        from fournisseurs_sheet import ExcelOneDrive, GoogleSheets
        kind = reg["cible"]
        if reg.get("fichier_kind") != kind or not reg.get("fichier_id"):
            raise RuntimeError("Le classeur des contacts n'est plus trouvé : rechoisissez la destination dans Paramètres.")
        jeton = await _jeton_cloud(db, uid, "google" if kind == "google-sheets" else "microsoft")
        async with httpx.AsyncClient(timeout=40) as cl:
            classe = GoogleSheets if kind == "google-sheets" else ExcelOneDrive
            await classe(cl, jeton, reg["fichier_id"]).ajouter_lignes(ONGLET, [[c["date"], c["nom"], c["email"], c["source"], c["demande"]]])

    async def pousser_contact(uid: str, contact: dict, reglage: Optional[dict] = None) -> bool:
        """Envoie un contact vers l'outil choisi. Ne lève jamais d'erreur : un échec est noté dans les réglages."""
        c = {"date": contact.get("date") or datetime.now(timezone.utc).date().isoformat(),
             "nom": (contact.get("nom") or "").strip(), "email": (contact.get("email") or "").strip().lower(),
             "source": contact.get("source") or "Zayado", "demande": contact.get("demande") or "Inscription"}
        if not c["email"]:
            return False
        reg = reglage or await _reglage(uid)
        cible = reg.get("cible", "aucun")
        if cible == "aucun":
            return False
        try:
            if cible == "make":
                ok = await g["_envoyer_make"](uid, "contact_tunnel", c) if g.get("_envoyer_make") else False
                if not ok:
                    raise RuntimeError("Make n'a pas accepté l'envoi : vérifiez l'adresse du scénario.")
            else:
                async with async_session() as db:
                    if cible in ("brevo", "hubspot"):
                        cles = await _cles(db, uid, cible)
                        if not cles:
                            raise RuntimeError(f"{'Brevo' if cible == 'brevo' else 'HubSpot'} n'est plus relié.")
                        await (_brevo if cible == "brevo" else _hubspot)(cles, c)
                    else:
                        await _ligne(db, uid, reg, c)
            if not reglage:
                await _sauver(uid, {"dernier_envoi": datetime.now(timezone.utc).isoformat(), "derniere_erreur": None,
                                    "envoyes": int(reg.get("envoyes") or 0) + 1})
            return True
        except Exception as e:  # noqa: BLE001 — l'inscription du visiteur ne doit jamais échouer à cause du CRM
            msg = str(getattr(e, "detail", "") or e)[:240]
            log.warning("Contact non envoyé vers %s (%s) : %s", cible, uid, msg)
            await _sauver(uid, {"derniere_erreur": msg, "derniere_erreur_le": datetime.now(timezone.utc).isoformat()})
            return False

    def pousser_en_tache(uid: str, contact: dict) -> None:
        asyncio.create_task(pousser_contact(uid, contact))

    g["crm_pousser"], g["crm_pousser_en_tache"] = pousser_contact, pousser_en_tache

    # ── Réglages ──
    def _vue(reg: dict, dispo: dict) -> dict:
        return {"cible": reg.get("cible", "aucun"), "disponibles": dispo, "fichier_url": reg.get("fichier_url"),
                "fichier_kind": reg.get("fichier_kind"), "dernier_envoi": reg.get("dernier_envoi"),
                "derniere_erreur": reg.get("derniere_erreur"), "envoyes": int(reg.get("envoyes") or 0)}

    @api.get("/crm/reglages")
    async def crm_reglages(db=Depends(get_db)):
        uid = _uid()
        return _vue(await _reglage(uid), await _disponibles(db, uid))

    @api.put("/crm/reglages")
    async def crm_choisir(body: CrmIn, db=Depends(get_db)):
        uid = _uid()
        dispo = await _disponibles(db, uid)
        if not dispo.get(body.cible):
            noms = {"brevo": "votre clé Brevo", "hubspot": "votre jeton HubSpot", "google-sheets": "Google Drive",
                    "excel": "OneDrive", "make": "votre scénario Make"}
            raise HTTPException(409, f"Reliez d'abord {noms.get(body.cible, body.cible)}.")
        reg = await _reglage(uid)
        patch = {"cible": body.cible, "derniere_erreur": None}
        if body.cible in ("google-sheets", "excel") and (reg.get("fichier_kind") != body.cible or not reg.get("fichier_id")):
            patch.update(await _classeur(db, uid, body.cible))
        await _sauver(uid, patch)
        return _vue({**reg, **patch}, dispo)

    @api.post("/crm/envoyer-tout")
    async def crm_envoyer_tout(db=Depends(get_db)):
        """Rattrapage : envoie les contacts déjà reçus par les tunnels (une fois la destination choisie)."""
        uid = _uid()
        reg = await _reglage(uid)
        if reg.get("cible", "aucun") == "aucun":
            raise HTTPException(409, "Choisissez d'abord où envoyer vos contacts.")
        espace = await docs.copilote_espace.find_one({"user_id": uid}) or {}
        contacts = []
        for t in (espace.get("data") or {}).get("tunnels", []):
            for c in t.get("contacts", []):
                if c.get("email"):
                    contacts.append({**c, "source": f"Tunnel « {t.get('nom') or 'sans nom'} »"})
        ok = 0
        for c in contacts[:500]:
            ok += 1 if await pousser_contact(uid, c, reglage=reg) else 0
        maj = {"dernier_envoi": datetime.now(timezone.utc).isoformat(), "envoyes": int(reg.get("envoyes") or 0) + ok}
        if ok == len(contacts[:500]):
            maj["derniere_erreur"] = None
        await _sauver(uid, maj)
        return {"envoyes": ok, "total": len(contacts)}
