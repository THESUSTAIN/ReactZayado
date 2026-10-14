"""Connecteurs RÉELS des bases de l'entreprise : Google Sheets (API Sheets v4), Excel dans OneDrive / SharePoint
(Microsoft Graph, API workbook) et Microsoft Lists (Graph, sites/lists). Aucune donnée simulée.

Interface commune :
- tabulaire = True (Sheets, Excel) : onglets(), lire(onglet) -> (entetes, [(id "r<n>", valeurs)]),
  ajouter_lignes(onglet, [[...]]), modifier(onglet, n, [...]), supprimer(onglet, n), creer_onglet(onglet, entetes)
- tabulaire = False (Lists) : colonnes(), lire_liste() -> (colonnes, [(id, {champ: valeur})]),
  ajouter(dict), modifier_item(id, dict), supprimer_item(id)

`Memoire` n'existe que pour les tests (ESPACE_FOURNISSEUR_TEST=1) : jamais disponible en production.
"""
import base64
import re
from datetime import date, timedelta
from typing import Any, Optional
from urllib.parse import quote, unquote, urlparse

import httpx


class ErreurFournisseur(Exception):
    """Refus ou panne côté Google / Microsoft : message lisible, renvoyé tel quel (502)."""


def lettre(n: int) -> str:
    s = ""
    while n > 0:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def tableau(vals: list) -> tuple[list[str], list[tuple[str, list]]]:
    if not vals:
        return [], []
    entetes = [str(x).strip() for x in vals[0]]
    while entetes and not entetes[-1]:
        entetes.pop()
    lignes = []
    for i, ligne in enumerate(vals[1:]):
        ligne = list(ligne) + [""] * (len(entetes) - len(ligne))
        if any(str(v).strip() for v in ligne[: len(entetes)]):
            lignes.append((f"r{i + 2}", ligne[: len(entetes)]))
    return entetes, lignes


async def _ok(r: httpx.Response, nom: str):
    if r.status_code == 403:
        raise ErreurFournisseur(f"{nom} refuse l'accès (403) : vérifie que le dirigeant a bien les droits sur ce fichier.")
    if r.status_code == 404:
        raise ErreurFournisseur(f"{nom} : fichier, onglet ou liste introuvable (404).")
    if r.status_code >= 400:
        raise ErreurFournisseur(f"{nom} {r.status_code} : {r.text[:160]}")
    return r.json() if r.content else {}


class GoogleSheets:
    tabulaire = True
    nom = "Google Sheets"

    def __init__(self, c: httpx.AsyncClient, jeton: str, fid: str):
        self.c, self.h = c, {"Authorization": f"Bearer {jeton}"}
        self.base = f"https://sheets.googleapis.com/v4/spreadsheets/{fid}"
        self._p: Optional[dict] = None

    async def _props(self) -> dict:
        if self._p is None:
            self._p = await _ok(await self.c.get(self.base, headers=self.h, params={"fields": "properties(title,locale),sheets.properties(title,sheetId)"}), self.nom)
        return self._p

    def _plage(self, onglet: str, a1: str = "") -> str:
        return quote("'" + onglet.replace("'", "''") + "'" + (f"!{a1}" if a1 else ""), safe="")

    async def infos(self) -> dict:
        p = await self._props()
        return {"nom": p.get("properties", {}).get("title", "Classeur Google")}

    async def us(self) -> bool:
        return str((await self._props()).get("properties", {}).get("locale", "")).startswith("en_US")

    async def onglets(self) -> list[str]:
        return [s["properties"]["title"] for s in (await self._props()).get("sheets", [])]

    async def lire(self, onglet: str):
        j = await _ok(await self.c.get(f"{self.base}/values/{self._plage(onglet)}", headers=self.h,
                                       params={"valueRenderOption": "UNFORMATTED_VALUE", "dateTimeRenderOption": "FORMATTED_STRING"}), self.nom)
        return tableau(j.get("values", []))

    async def ajouter_lignes(self, onglet: str, lignes: list[list]):
        if lignes:
            await _ok(await self.c.post(f"{self.base}/values/{self._plage(onglet, 'A1')}:append", headers=self.h,
                                        params={"valueInputOption": "USER_ENTERED", "insertDataOption": "INSERT_ROWS"}, json={"values": lignes}), self.nom)

    async def modifier(self, onglet: str, n: int, valeurs: list):
        await _ok(await self.c.put(f"{self.base}/values/{self._plage(onglet, f'A{n}')}", headers=self.h,
                                   params={"valueInputOption": "USER_ENTERED"}, json={"values": [valeurs]}), self.nom)

    async def supprimer(self, onglet: str, n: int):
        sid = next((s["properties"]["sheetId"] for s in (await self._props())["sheets"] if s["properties"]["title"] == onglet), None)
        if sid is None:
            raise ErreurFournisseur("Onglet introuvable dans le classeur Google.")
        await _ok(await self.c.post(f"{self.base}:batchUpdate", headers=self.h, json={"requests": [
            {"deleteDimension": {"range": {"sheetId": sid, "dimension": "ROWS", "startIndex": n - 1, "endIndex": n}}}]}), self.nom)

    async def creer_onglet(self, onglet: str, entetes: list[str]):
        await _ok(await self.c.post(f"{self.base}:batchUpdate", headers=self.h, json={"requests": [{"addSheet": {"properties": {"title": onglet}}}]}), self.nom)
        self._p = None
        await self.modifier(onglet, 1, entetes)


class ExcelOneDrive:
    tabulaire = True
    nom = "Excel (OneDrive)"

    def __init__(self, c: httpx.AsyncClient, jeton: str, fid: str):
        self.c, self.h = c, {"Authorization": f"Bearer {jeton}"}
        self.item = f"https://graph.microsoft.com/v1.0/me/drive/items/{fid}"
        self.base = f"{self.item}/workbook"

    def _ws(self, onglet: str) -> str:
        return f"{self.base}/worksheets('{quote(onglet.replace(chr(39), chr(39) * 2), safe='')}')"

    async def infos(self) -> dict:
        j = await _ok(await self.c.get(self.item, headers=self.h, params={"$select": "name,webUrl"}), self.nom)
        return {"nom": j.get("name", "Classeur Excel"), "url": j.get("webUrl")}

    async def us(self) -> bool:
        return False

    async def onglets(self) -> list[str]:
        j = await _ok(await self.c.get(f"{self.base}/worksheets", headers=self.h), self.nom)
        return [w["name"] for w in j.get("value", [])]

    async def lire(self, onglet: str):
        j = await _ok(await self.c.get(f"{self._ws(onglet)}/usedRange", headers=self.h, params={"$select": "address,values,numberFormat"}), self.nom)
        vals, fmts = j.get("values") or [], j.get("numberFormat") or []
        m = re.search(r"!\$?([A-Z]+)\$?(\d+)", j.get("address", ""))
        depart = int(m.group(2)) if m else 1
        propres = []
        for i, ligne in enumerate(vals):
            out = []
            for k, v in enumerate(ligne):
                f = str((fmts[i][k] if i < len(fmts) and k < len(fmts[i]) else "") or "").lower()
                if isinstance(v, (int, float)) and not isinstance(v, bool) and f and f != "general":
                    if re.search(r"[dy]", f) and 1 < v < 2958465:
                        v = (date(1899, 12, 30) + timedelta(days=int(v))).isoformat()
                    elif re.search(r"h", f) and 0 <= v < 1:
                        mins = round(v * 1440)
                        v = f"{mins // 60:02d}:{mins % 60:02d}"
                out.append(v)
            propres.append(out)
        entetes, lignes = tableau(propres)
        decal = depart - 1
        return entetes, [(f"r{int(rid[1:]) + decal}", l) for rid, l in lignes]

    async def _fin(self, onglet: str) -> int:
        j = await _ok(await self.c.get(f"{self._ws(onglet)}/usedRange(valuesOnly=true)", headers=self.h, params={"$select": "address"}), self.nom)
        m = re.search(r":\$?[A-Z]+\$?(\d+)$", j.get("address", ""))
        return int(m.group(1)) if m else 1

    async def ajouter_lignes(self, onglet: str, lignes: list[list]):
        if not lignes:
            return
        n = await self._fin(onglet) + 1
        larg = max(len(l) for l in lignes)
        lignes = [list(l) + [""] * (larg - len(l)) for l in lignes]
        adr = f"A{n}:{lettre(larg)}{n + len(lignes) - 1}"
        await _ok(await self.c.patch(f"{self._ws(onglet)}/range(address='{adr}')", headers=self.h, json={"values": lignes}), self.nom)

    async def modifier(self, onglet: str, n: int, valeurs: list):
        adr = f"A{n}:{lettre(max(len(valeurs), 1))}{n}"
        await _ok(await self.c.patch(f"{self._ws(onglet)}/range(address='{adr}')", headers=self.h, json={"values": [valeurs]}), self.nom)

    async def supprimer(self, onglet: str, n: int):
        await _ok(await self.c.post(f"{self._ws(onglet)}/range(address='{n}:{n}')/delete", headers=self.h, json={"shift": "Up"}), self.nom)

    async def creer_onglet(self, onglet: str, entetes: list[str]):
        await _ok(await self.c.post(f"{self.base}/worksheets/add", headers=self.h, json={"name": onglet}), self.nom)
        await self.modifier(onglet, 1, entetes)


async def excel_depuis_url(c: httpx.AsyncClient, jeton: str, url: str) -> str:
    """Lien de partage OneDrive / SharePoint -> identifiant de l'élément (Graph /shares)."""
    code = "u!" + base64.urlsafe_b64encode(url.encode()).decode().rstrip("=")
    j = await _ok(await c.get(f"https://graph.microsoft.com/v1.0/shares/{code}/driveItem", headers={"Authorization": f"Bearer {jeton}"},
                              params={"$select": "id,name"}), "OneDrive")
    if not str(j.get("name", "")).lower().endswith((".xlsx", ".xlsm")):
        raise ErreurFournisseur("Ce lien ne pointe pas vers un classeur Excel (.xlsx).")
    return j["id"]


class MsList:
    tabulaire = False
    nom = "Microsoft Lists"
    EXCLUES = {"ContentType", "Attachments", "_ColorTag", "ComplianceAssetId", "Edit", "LinkTitleNoMenu", "LinkTitle", "DocIcon", "ItemChildCount", "FolderChildCount", "AppAuthor", "AppEditor"}

    def __init__(self, c: httpx.AsyncClient, jeton: str, fid: str):
        site, lst = fid.split("|", 1)
        self.c, self.h = c, {"Authorization": f"Bearer {jeton}"}
        self.base = f"https://graph.microsoft.com/v1.0/sites/{site}/lists/{lst}"

    async def _ok(self, r):
        if r.status_code in (401, 403):
            raise ErreurFournisseur("Microsoft refuse l'accès à cette liste : l'autorisation « Sites » (SharePoint) doit être accordée à Zayado "
                                    "par l'administrateur Microsoft 365 de l'entreprise.")
        return await _ok(r, self.nom)

    async def infos(self) -> dict:
        j = await self._ok(await self.c.get(self.base, headers=self.h, params={"$select": "displayName,webUrl"}))
        return {"nom": j.get("displayName", "Liste"), "url": j.get("webUrl")}

    async def colonnes(self) -> list[dict]:
        j = await self._ok(await self.c.get(f"{self.base}/columns", headers=self.h))
        out = []
        for col in j.get("value", []):
            if col.get("readOnly") or col.get("hidden") or col["name"] in self.EXCLUES:
                continue
            t = "number" if "number" in col or "currency" in col else "date" if "dateTime" in col else "select" if "choice" in col else "text"
            out.append({"key": col["name"], "label": col.get("displayName") or col["name"], "type": t,
                        "options": list((col.get("choice") or {}).get("choices") or [])})
        return out

    async def lire_liste(self):
        cols = await self.colonnes()
        url, params, lignes = f"{self.base}/items", {"expand": "fields", "$top": "999"}, []
        for _ in range(10):
            j = await self._ok(await self.c.get(url, headers=self.h, params=params))
            for it in j.get("value", []):
                f = it.get("fields", {})
                lignes.append((str(it["id"]), {c["key"]: f.get(c["key"]) for c in cols}))
            url, params = j.get("@odata.nextLink"), None
            if not url:
                break
        return cols, lignes

    async def ajouter(self, data: dict):
        await self._ok(await self.c.post(f"{self.base}/items", headers=self.h, json={"fields": data}))

    async def modifier_item(self, item_id: str, data: dict):
        await self._ok(await self.c.patch(f"{self.base}/items/{item_id}/fields", headers=self.h, json=data))

    async def supprimer_item(self, item_id: str):
        r = await self.c.delete(f"{self.base}/items/{item_id}", headers=self.h)
        if r.status_code >= 400:
            await self._ok(r)


async def liste_depuis_url(c: httpx.AsyncClient, jeton: str, url: str) -> str:
    """https://<tenant>.sharepoint.com/sites/<site>/Lists/<Liste>/AllItems.aspx -> "<site_id>|<list_id>"."""
    u = urlparse(url)
    m = re.match(r"^(.*?)/Lists/([^/]+)", u.path)
    if not u.netloc.endswith("sharepoint.com") or not m:
        raise ErreurFournisseur("Adresse Microsoft Lists attendue : https://<entreprise>.sharepoint.com/sites/<site>/Lists/<liste>/…")
    h = {"Authorization": f"Bearer {jeton}"}
    lst = MsList(c, jeton, "x|y")
    site = await lst._ok(await c.get(f"https://graph.microsoft.com/v1.0/sites/{u.netloc}:{m.group(1) or '/'}", headers=h))
    nom = unquote(m.group(2))
    j = await lst._ok(await c.get(f"https://graph.microsoft.com/v1.0/sites/{site['id']}/lists", headers=h, params={"$select": "id,displayName,webUrl"}))
    for l in j.get("value", []):
        if f"/Lists/{m.group(2)}".lower() in unquote(l.get("webUrl", "")).lower() or l.get("displayName", "").lower() == nom.lower():
            return f"{site['id']}|{l['id']}"
    raise ErreurFournisseur(f"Liste « {nom} » introuvable sur ce site SharePoint.")


class Memoire:
    """TESTS UNIQUEMENT (ESPACE_FOURNISSEUR_TEST=1) : un classeur rangé dans la base locale."""
    tabulaire = True
    nom = "Classeur de test"

    def __init__(self, docs, fid: str):
        self.docs, self.fid = docs, fid

    async def _get(self) -> dict:
        return await self.docs.esp_test.find_one({"id": self.fid}) or {"id": self.fid, "user_id": "test", "onglets": {}}

    async def _set(self, d: dict):
        await self.docs.esp_test.update_one({"id": self.fid}, {"$set": {"onglets": d["onglets"], "user_id": "test"}}, upsert=True)

    async def infos(self) -> dict:
        return {"nom": f"Classeur de test « {self.fid} »"}

    async def us(self) -> bool:
        return False

    async def onglets(self) -> list[str]:
        return list((await self._get())["onglets"].keys())

    async def lire(self, onglet: str):
        d = await self._get()
        if onglet not in d["onglets"]:
            raise ErreurFournisseur("Onglet introuvable.")
        return tableau(d["onglets"][onglet])

    async def ajouter_lignes(self, onglet: str, lignes: list[list]):
        d = await self._get()
        d["onglets"][onglet].extend([list(l) for l in lignes])
        await self._set(d)

    async def modifier(self, onglet: str, n: int, valeurs: list):
        d = await self._get()
        t = d["onglets"][onglet]
        while len(t) < n:
            t.append([])
        t[n - 1] = list(valeurs)
        await self._set(d)

    async def supprimer(self, onglet: str, n: int):
        d = await self._get()
        d["onglets"][onglet].pop(n - 1)
        await self._set(d)

    async def creer_onglet(self, onglet: str, entetes: list[str]):
        d = await self._get()
        d["onglets"][onglet] = [list(entetes)]
        await self._set(d)


def valeur_cellule(v: Any) -> Any:
    return "" if v is None else v
