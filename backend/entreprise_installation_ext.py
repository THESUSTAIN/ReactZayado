"""Installer la base de l'entreprise EN UN CLIC, depuis l'appli, dans le Drive du dirigeant (Google Drive ou OneDrive).

Avec les droits que Zayado demande déjà (Google : fichiers créés par Zayado ; Microsoft : OneDrive), on crée :
- le dossier « Zayado RH – <entreprise> » ;
- le classeur de RÉFÉRENCE (Annuaire pré-rempli avec l'équipe, Planning, TypesPieces…), lu par l'équipe ;
- le classeur PRIVÉ (Contrats, DossierSalarie, Pieces, Absences…), au dirigeant seul ;
- « Documents-RH » avec un dossier (+ Bulletins) par personne, partagé avec elle seule, et branché sur son bouton
  « Accéder à mon Drive pro ».
Mêmes onglets et colonnes que les listes du kit Microsoft (Install-ZayadoRH.ps1). Relançable : ce qui existe est gardé,
seules les personnes nouvelles reçoivent leur dossier. Les listes SharePoint complètes (droits par élément) demandent une
autorisation d'administrateur Microsoft 365 : elles restent dans le kit téléchargeable et dans Zayado RH.
"""
import io
import json
import logging
from pathlib import Path
from typing import Optional

import httpx
from fastapi import Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

log = logging.getLogger("kairos.installation")
MODELES = Path(__file__).resolve().parent / "assets" / "rh"
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


class Google:
    """Drive v3 avec le jeton du dirigeant. Les classeurs Excel sont convertis en Google Sheets au dépôt."""
    nom = "google"

    def __init__(self, c: httpx.AsyncClient, jeton: str):
        self.c, self.h = c, {"Authorization": f"Bearer {jeton}"}

    async def _ok(self, r):
        if r.status_code >= 400:
            raise RuntimeError(f"Google Drive {r.status_code} : {r.text[:200]}")
        return r.json()

    async def dossier(self, nom: str, parent: Optional[str]) -> dict:
        corps = {"name": nom, "mimeType": "application/vnd.google-apps.folder", **({"parents": [parent]} if parent else {})}
        j = await self._ok(await self.c.post("https://www.googleapis.com/drive/v3/files?fields=id,webViewLink&supportsAllDrives=true", headers=self.h, json=corps))
        return {"id": j["id"], "url": j.get("webViewLink")}

    async def classeur(self, nom: str, octets: bytes, parent: str) -> dict:
        meta = {"name": nom, "mimeType": "application/vnd.google-apps.spreadsheet", "parents": [parent]}
        r = await self.c.post("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true",
                              headers=self.h, files={"metadata": ("metadata.json", json.dumps(meta), "application/json"), "file": (nom + ".xlsx", octets, XLSX)})
        j = await self._ok(r)
        return {"id": j["id"], "url": j.get("webViewLink")}

    async def partager(self, item: str, email: str, ecrire: bool) -> None:
        await self._ok(await self.c.post(f"https://www.googleapis.com/drive/v3/files/{item}/permissions?sendNotificationEmail=false&supportsAllDrives=true",
                                         headers=self.h, json={"type": "user", "role": "writer" if ecrire else "reader", "emailAddress": email}))


class Microsoft:
    """OneDrive (Microsoft Graph) avec le jeton du dirigeant : classeurs Excel, partage par invitation."""
    nom = "microsoft"

    def __init__(self, c: httpx.AsyncClient, jeton: str):
        self.c, self.h = c, {"Authorization": f"Bearer {jeton}"}
        self.base = "https://graph.microsoft.com/v1.0/me/drive"

    async def _ok(self, r):
        if r.status_code >= 400:
            raise RuntimeError(f"OneDrive {r.status_code} : {r.text[:200]}")
        return r.json() if r.content else {}

    async def dossier(self, nom: str, parent: Optional[str]) -> dict:
        url = f"{self.base}/items/{parent}/children" if parent else f"{self.base}/root/children"
        j = await self._ok(await self.c.post(url, headers=self.h, json={"name": nom, "folder": {}, "@microsoft.graph.conflictBehavior": "rename"}))
        return {"id": j["id"], "url": j.get("webUrl")}

    async def classeur(self, nom: str, octets: bytes, parent: str) -> dict:
        from urllib.parse import quote
        j = await self._ok(await self.c.put(f"{self.base}/items/{parent}:/{quote(nom + '.xlsx')}:/content", headers={**self.h, "Content-Type": XLSX}, content=octets))
        return {"id": j["id"], "url": j.get("webUrl")}

    async def partager(self, item: str, email: str, ecrire: bool) -> None:
        await self._ok(await self.c.post(f"{self.base}/items/{item}/invite", headers=self.h,
                                         json={"recipients": [{"email": email}], "requireSignIn": True, "sendInvitation": False, "roles": ["write" if ecrire else "read"]}))


def classeur_reference(membres: list) -> bytes:
    """Le modèle de référence, avec l'Annuaire pré-rempli par l'équipe déjà dans Zayado."""
    from openpyxl import load_workbook
    wb = load_workbook(MODELES / "reference.xlsx")
    ws = wb["Annuaire"]
    for m in membres:
        ws.append([m["nom"], m["email"], "Employeur" if m["role"] in ("proprietaire", "manager") else "Salarie", m.get("poste") or ""])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def install_entreprise_installation(g: dict) -> None:
    api, get_db = g["api"], g["get_db"]
    EntMembre, EntReglage, EntFiche, Organisation = g["EntMembre"], g["EntReglage"], g["EntFiche"], g["Organisation"]
    GERANTS = ("proprietaire", "manager")

    class InstallIn(BaseModel):
        fournisseur: str  # google | microsoft

    async def _membre(db):
        uid = g["_uid"]()
        return (await db.execute(select(EntMembre).where(EntMembre.user_id == uid, EntMembre.statut == "actif"))).scalars().first()

    async def installer(db, m, fournisseur: str, appel=None) -> dict:
        """appel(client, jeton) → objet Google / Microsoft (remplaçable en test)."""
        try:
            jeton, _ = await g["_cloud_token"](db, fournisseur)
        except HTTPException:
            nom = "Google Drive" if fournisseur == "google" else "OneDrive"
            raise HTTPException(409, f"Relie d'abord ton {nom} (Paramètres › Connexions), puis relance l'installation.")
        reg = await db.get(EntReglage, m.org_id) or EntReglage(org_id=m.org_id, secu_actif=False)
        db.add(reg)
        etat = dict(reg.installation or {}) if (reg.installation or {}).get("fournisseur") == fournisseur else {"fournisseur": fournisseur}
        org = await db.get(Organisation, m.org_id)
        membres = (await db.execute(select(EntMembre).where(EntMembre.org_id == m.org_id, EntMembre.statut == "actif"))).scalars().all()
        liste = [{"id": c.id, "nom": c.nom or (c.email or "").split("@")[0], "email": (c.email or "").lower(), "role": c.role, "poste": c.poste}
                 for c in membres if c.email]
        bilan = {"dossiers_crees": 0, "partages": 0, "erreurs": []}
        async with httpx.AsyncClient(timeout=60) as c:
            d = (appel or (Google if fournisseur == "google" else Microsoft))(c, jeton)
            if not etat.get("racine"):
                etat["racine"] = await d.dossier(f"Zayado RH – {org.nom if org else 'entreprise'}", None)
            racine = etat["racine"]["id"]
            if not etat.get("reference"):
                etat["reference"] = await d.classeur("Zayado RH – Référence", classeur_reference(liste), racine)
            if not etat.get("prive"):
                etat["prive"] = await d.classeur("Zayado RH – Données privées", (MODELES / "prive.xlsx").read_bytes(), racine)
            if not etat.get("documents"):
                etat["documents"] = await d.dossier("Documents-RH", racine)
            faits = dict(etat.get("personnes") or {})
            for p in liste:
                if p["email"] == (m.email or "").lower():
                    continue  # le dirigeant possède déjà tout
                try:
                    if p["id"] not in faits:
                        dos = await d.dossier(p["nom"], etat["documents"]["id"])
                        await d.dossier("Bulletins", dos["id"])
                        await d.partager(dos["id"], p["email"], True)
                        faits[p["id"]] = dos
                        bilan["dossiers_crees"] += 1
                        fi = await db.get(EntFiche, p["id"]) or EntFiche(membre_id=p["id"], org_id=m.org_id)
                        if dos.get("url"):
                            fi.lien_drive = dos["url"]  # son bouton « Accéder à mon Drive pro » ouvre ce dossier
                        db.add(fi)
                    if p["id"] not in (etat.get("lecteurs") or []):
                        await d.partager(etat["reference"]["id"], p["email"], p["role"] in GERANTS)
                        etat["lecteurs"] = list(etat.get("lecteurs") or []) + [p["id"]]
                        bilan["partages"] += 1
                except Exception as e:  # noqa: BLE001 - une personne en échec ne bloque pas les autres
                    log.warning("Installation : %s : %s", p["email"], e)
                    bilan["erreurs"].append(f"{p['nom']} : partage impossible ({str(e)[:80]})")
            etat["personnes"] = faits
        reg.installation = etat
        reg.drive_fournisseur, reg.drive_url = fournisseur, etat["racine"].get("url")
        await db.commit()
        return {**bilan, "racine": etat["racine"].get("url"), "reference": etat["reference"].get("url"), "prive": etat["prive"].get("url"),
                "documents": etat["documents"].get("url")}

    g["installer_base_entreprise"] = installer

    @api.post("/entreprise/installer")
    async def installer_route(body: InstallIn, db: AsyncSession = Depends(get_db)):
        m = await _membre(db)
        if not m or m.role != "proprietaire":
            raise HTTPException(403, "Seul le dirigeant installe la base de l'entreprise.")
        if body.fournisseur not in ("google", "microsoft"):
            raise HTTPException(422, "Choisis Google ou Microsoft.")
        try:
            return await installer(db, m, body.fournisseur, g.get("_installateur_test"))
        except HTTPException:
            raise
        except Exception as e:  # noqa: BLE001
            log.warning("Installation %s : %s", body.fournisseur, e)
            raise HTTPException(502, f"Le Drive a refusé une étape : {str(e)[:160]}. Relance : ce qui est déjà créé est gardé.")

    @api.get("/entreprise/installation")
    async def installation_etat(db: AsyncSession = Depends(get_db)):
        m = await _membre(db)
        if not m or m.role not in GERANTS:
            return {"installe": False}
        reg = await db.get(EntReglage, m.org_id)
        e = (reg.installation if reg else None) or {}
        return {"installe": bool(e.get("racine")), "fournisseur": e.get("fournisseur"),
                "racine": (e.get("racine") or {}).get("url"), "reference": (e.get("reference") or {}).get("url"),
                "prive": (e.get("prive") or {}).get("url"), "personnes": len(e.get("personnes") or {})}
