#!/usr/bin/env python3
"""Pousse des fichiers du thème v2 vers le thème « Zayado — Préparation » (jamais vers le thème en ligne).

Usage :
  python3 pousser_preparation.py sections/zayado-hero-aiguillage.liquid assets/zayado.css templates/index.json
  python3 pousser_preparation.py --hero-aiguillage      # lot prédéfini du hero double aiguillage

L'identifiant du thème est lu dans theme-v2/THEME_PREPARATION.txt ; s'il n'existe plus sur la
boutique, on le retrouve par son nom et on réécrit le fichier. Rien ne part en ligne : le bouton
« Déployer la boutique » (Console Admin › Déploiement boutique) reste la seule porte vers le live.
"""
import base64
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import installer_boutique as I  # noqa: E402

SRC = Path("/app/shopify/theme-v2")
FICHIER_ID = SRC / "THEME_PREPARATION.txt"
NOM = "Zayado — Préparation"
BINAIRE = {".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".pdf", ".mov"}

LOTS = {
    "--hero-aiguillage": [
        "assets/zayado.css",
        "sections/zayado-hero-aiguillage.liquid",
        "templates/index.json",
    ],
}


def theme_preparation() -> int:
    themes = I._lister_tout("/themes.json", "themes")
    voulu = int(FICHIER_ID.read_text().strip() or 0) if FICHIER_ID.exists() else 0
    t = next((t for t in themes if t["id"] == voulu), None) or next((t for t in themes if t["name"] == NOM), None)
    if not t:
        raise SystemExit(f"Thème « {NOM} » introuvable : lance d'abord creer_theme_preparation.py")
    if t.get("role") == "main":
        raise SystemExit(f"Refus : « {t['name']} » est le thème EN LIGNE. Ce script ne pousse que sur la préparation.")
    if t["id"] != voulu:
        FICHIER_ID.write_text(f"{t['id']}\n")
        print(f"identifiant mis à jour dans {FICHIER_ID.name} : {t['id']}")
    return t["id"]


def pousser(tid: int, cles: list[str]) -> None:
    # Ordre imposé par Shopify : assets → sections .liquid → groupes .json → templates
    def poids(c):
        if c.startswith("sections/"):
            return 1 if c.endswith(".liquid") else 2
        return 3 if c.startswith("templates/") else 0
    for cle in sorted(cles, key=lambda c: (poids(c), c)):
        p = SRC / cle
        if not p.is_file():
            raise SystemExit(f"fichier absent : {p}")
        contenu = p.read_bytes()
        if p.suffix.lower() in BINAIRE:
            corps = {"asset": {"key": cle, "attachment": base64.b64encode(contenu).decode()}}
        else:
            corps = {"asset": {"key": cle, "value": contenu.decode("utf-8")}}
        I._req("PUT", f"/themes/{tid}/assets.json", corps)
        print("↑", cle, flush=True)
        time.sleep(0.25)


def main(args: list[str]) -> None:
    cles = []
    for a in args:
        cles.extend(LOTS[a] if a in LOTS else [a])
    if not cles:
        raise SystemExit(__doc__)
    I.jeton()
    tid = theme_preparation()
    pousser(tid, cles)
    print(f"\n✔ {len(cles)} fichier(s) sur « {NOM} » ({tid}). Aperçu : https://{I.BOUTIQUE}/?preview_theme_id={tid}")
    print("Pour mettre en ligne : Console Admin › Déploiement boutique › Déployer la boutique.")


if __name__ == "__main__":
    main(sys.argv[1:])
