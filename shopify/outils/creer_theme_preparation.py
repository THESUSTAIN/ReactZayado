#!/usr/bin/env python3
"""Crée le thème « Zayado — Préparation » : copie exacte du thème en ligne.
Tous les futurs changements vont sur CE thème ; rien ne part en ligne sans
le bouton « Déployer la boutique » (Espace vendeur › Commandes)."""
import base64
import json
import sys
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import installer_boutique as I  # noqa: E402

NOM = "Zayado — Préparation"


def main():
    I.jeton()
    themes = I._lister_tout("/themes.json", "themes")
    prep = next((t for t in themes if t["name"] == NOM), None)
    live = next(t for t in themes if t["role"] == "main")
    if prep:
        tid = prep["id"]
        print(f"reprise du thème préparation : {tid}", flush=True)
    else:
        r = I._req("POST", "/themes.json", {"theme": {"name": NOM, "role": "unpublished"}})
        tid = r["theme"]["id"]
        print(f"thème créé : {tid} — copie de « {live['name']} »…", flush=True)

    deja = {a["key"]: a.get("checksum", "") for a in I._lister_tout(f"/themes/{tid}/assets.json?limit=250", "assets")}
    assets = I._lister_tout(f"/themes/{live['id']}/assets.json?limit=250&fields=key,checksum", "assets")

    # Shopify exige : sections .liquid → groupes .json → templates
    def poids(cle):
        if cle.startswith("sections/") and cle.endswith(".liquid"):
            return 0
        if cle.startswith("sections/"):
            return 1
        if cle.startswith("templates/"):
            return 2
        return 3
    assets.sort(key=lambda a: (poids(a["key"]), a["key"]))
    n, sautes = 0, 0
    for a in assets:
        cle = a["key"]
        if deja.get(cle) == a.get("checksum"):
            sautes += 1
            continue
        for tentative in range(4):
            try:
                lu = I._req("GET", f"/themes/{live['id']}/assets.json?asset[key]={cle}")["asset"]
                if "value" in lu:
                    corps = {"asset": {"key": cle, "value": lu["value"]}}
                else:
                    url = lu.get("public_url") or lu.get("src")
                    brut = urllib.request.urlopen(url, timeout=30).read()
                    corps = {"asset": {"key": cle, "attachment": base64.b64encode(brut).decode()}}
                I._req("PUT", f"/themes/{tid}/assets.json", corps)
                break
            except Exception as e:
                if tentative == 3:
                    raise
                print(f"  réessai {cle} ({type(e).__name__})", flush=True)
                time.sleep(3 * (tentative + 1))
        n += 1
        if n % 40 == 0:
            print(f"  {n} copiés / {sautes} déjà en place", flush=True)
        time.sleep(0.22)
    print(f"TERMINE — {n} fichiers copiés ({sautes} déjà en place) vers « {NOM} » (id {tid})", flush=True)
    Path("/app/shopify/theme-v2/THEME_PREPARATION.txt").write_text(f"{tid}\n", encoding="utf-8")


if __name__ == "__main__":
    main()
