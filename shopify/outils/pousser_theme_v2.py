#!/usr/bin/env python3
"""Téléverse le thème v2 (zip complet) comme NOUVEAU thème non publié, puis le publie.

Sûr : l'ancien thème reste en ligne jusqu'à la publication (retour arrière possible
dans Boutique en ligne › Thèmes). Ajoute les 5 modèles v9 (services, parcours, vision,
boutique, box) absents du zip v2 mais présents sur le thème actuel.
"""
import base64
import hashlib
import sys
import time
import urllib.error
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import installer_boutique as I  # noqa: E402

SRC = Path("/app/shopify/theme-v2")
EXTRA = Path("/app/shopify/theme/templates")
BINAIRE = {".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".pdf", ".mov"}


def pousser(theme_id, cle, contenu: bytes, binaire: bool):
    if binaire:
        corps = {"asset": {"key": cle, "attachment": base64.b64encode(contenu).decode()}}
    else:
        corps = {"asset": {"key": cle, "value": contenu.decode("utf-8")}}
    for tentative in range(4):
        try:
            return I._req("PUT", f"/themes/{theme_id}/assets.json", corps)
        except (urllib.error.URLError, TimeoutError) as e:
            if tentative == 3:
                raise
            print(f"  timeout {cle}, nouvel essai ({tentative + 1})…", flush=True)
            time.sleep(3 * (tentative + 1))


def distants(theme_id):
    """Fichiers déjà présents : empreinte md5 pour ne pas les renvoyer."""
    return {a["key"]: a.get("checksum", "") for a in I._lister_tout(f"/themes/{theme_id}/assets.json?limit=250", "assets")}


def main():
    I.jeton()
    # Réutilise le thème « Zayado v2 » s'il existe déjà (reprise après échec)
    themes = I._lister_tout("/themes.json", "themes")
    existant = next((t for t in themes if t["name"] == "Zayado v2" and t["role"] != "main"), None)
    if existant:
        tid = existant["id"]
        print(f"reprise du thème existant : {tid}", flush=True)
    else:
        r = I._req("POST", "/themes.json", {"theme": {"name": "Zayado v2", "role": "unpublished"}})
        tid = r["theme"]["id"]
        print(f"thème créé : {tid} (non publié)", flush=True)

    # Ordre imposé par Shopify : sections .liquid avant les groupes .json qui les référencent,
    # et tout cela avant les modèles.
    def cle_tri(p):
        rel = p.relative_to(SRC).parts
        dossier = rel[0]
        if dossier == "sections":
            return (5 if p.suffix == ".liquid" else 6, str(p))
        return ({"assets": 0, "config": 1, "layout": 2, "locales": 3, "snippets": 4, "templates": 7}.get(dossier, 9), str(p))
    fichiers = sorted((p for p in SRC.rglob("*") if p.is_file()), key=cle_tri)
    deja = distants(tid)
    a_faire = []
    for p in fichiers:
        cle = str(p.relative_to(SRC)).replace("\\", "/")
        if deja.get(cle) == hashlib.md5(p.read_bytes()).hexdigest():
            continue
        a_faire.append((p, cle))
    for nom in ("services", "parcours", "vision", "boutique", "box"):
        p = EXTRA / f"page.zayado-{nom}.json"
        cle = f"templates/page.zayado-{nom}.json"
        if deja.get(cle) != hashlib.md5(p.read_bytes()).hexdigest():
            a_faire.append((p, cle))
    print(f"{len(deja)} fichiers déjà en place, {len(a_faire)} à envoyer", flush=True)
    total = len(a_faire)
    for n, (p, cle) in enumerate(a_faire, 1):
        pousser(tid, cle, p.read_bytes(), p.suffix.lower() in BINAIRE)
        if n % 25 == 0:
            print(f"  {n}/{total}", flush=True)
        time.sleep(0.22)

    # Vérif rapide : les fichiers clés sont bien là
    for cle in ("layout/theme.liquid", "config/settings_data.json", "sections/zayado-entete.liquid",
                "templates/index.json", "templates/page.zayado-services.json"):
        I._req("GET", f"/themes/{tid}/assets.json?asset[key]={cle}")
        print(f"  ok {cle}", flush=True)

    r = I._req("PUT", f"/themes/{tid}.json", {"theme": {"id": tid, "role": "main"}})
    print(f"PUBLIÉ : {r['theme']['name']} (id {tid})", flush=True)


if __name__ == "__main__":
    main()
