#!/usr/bin/env python3
"""Installation complète de la boutique Shopify Zayado via l'API Admin.

Comme instant.so : tout se pousse par l'API, rien à copier-coller à la main.
  1. Jeton d'accès via ID + secret client (Dev Dashboard, grant client_credentials)
  2. Téléversement des fichiers du thème Zayado dans le thème ACTIF (Asset API)
  3. templates/index.json = page d'accueil Zayado (sinon la home renvoie 404)
  4. Modèles de page affectés (maison, besoins, cockpit, contact, liens)
  5. Collections automatiques par balise + modèle « zayado »
  6. Définitions de métachamps (produit + article) puis valeurs depuis le CSV
  7. Modèle « journal » sur le blog et ses articles

Usage : SHOPIFY_SHOP_DOMAIN=xxx.myshopify.com SHOPIFY_CLIENT_ID=… SHOPIFY_CLIENT_SECRET=… python3 installer_boutique.py
"""
import base64
import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
THEME = RACINE / "theme"
API_VERSION = "2025-01"

BOUTIQUE = os.environ["SHOPIFY_SHOP_DOMAIN"].replace("https://", "").strip("/")
CLIENT_ID = os.environ["SHOPIFY_CLIENT_ID"]
CLIENT_SECRET = os.environ["SHOPIFY_CLIENT_SECRET"]

BASE = f"https://{BOUTIQUE}/admin/api/{API_VERSION}"
_token = None


def _req(methode, chemin, corps=None, brut=False):
    global _token
    url = chemin if chemin.startswith("http") else f"{BASE}{chemin}"
    data = json.dumps(corps).encode() if corps is not None else None
    req = urllib.request.Request(url, data=data, method=methode)
    req.add_header("Content-Type", "application/json")
    if _token:
        req.add_header("X-Shopify-Access-Token", _token)
    for tentative in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read() if brut else json.loads(r.read() or b"{}")
        except urllib.error.HTTPError as e:
            corps_err = e.read().decode()[:300]
            if e.code == 429 and tentative < 3:
                time.sleep(2 ** tentative + 1)
                continue
            raise RuntimeError(f"{methode} {url} -> {e.code} : {corps_err}") from e
    raise RuntimeError(f"{methode} {url} : trop de tentatives")


def gql(requete, variables=None):
    return _req("POST", "/graphql.json", {"query": requete, "variables": variables or {}})


def jeton():
    global _token
    r = _req("POST", f"https://{BOUTIQUE}/admin/oauth/access_token",
             {"client_id": CLIENT_ID, "client_secret": CLIENT_SECRET, "grant_type": "client_credentials"})
    _token = r["access_token"]
    print(f"  jeton obtenu (…{_token[-6:]})")


def theme_actif():
    themes = _req("GET", "/themes.json")["themes"]
    principal = next((t for t in themes if t.get("role") == "main"), None)
    if not principal:
        raise RuntimeError("Aucun thème actif trouvé.")
    print(f"  thème actif : {principal['name']} (id {principal['id']})")
    return principal["id"]


def televerser_theme(theme_id):
    n = 0
    for f in sorted(THEME.rglob("*")):
        if not f.is_file():
            continue
        cle = f.relative_to(THEME).as_posix()
        asset = {"key": cle}
        if f.suffix in (".woff2", ".woff", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico"):
            asset["attachment"] = base64.b64encode(f.read_bytes()).decode()
        else:
            asset["value"] = f.read_text(encoding="utf-8")
        _req("PUT", f"/themes/{theme_id}/assets.json", {"asset": asset})
        n += 1
        print(f"  ↑ {cle}")
    print(f"  {n} fichiers de thème téléversés")


def page_accueil(theme_id):
    """La home utilise templates/index.json : on y met le contenu de page.zayado-accueil."""
    accueil = (THEME / "templates" / "page.zayado-accueil.json").read_text(encoding="utf-8")
    _req("PUT", f"/themes/{theme_id}/assets.json",
         {"asset": {"key": "templates/index.json", "value": accueil}})
    print("  page d'accueil : templates/index.json = sections Zayado")


def _lister_tout(chemin, cle):
    """Liste REST avec pagination par page_info (le paramètre page n'existe plus)."""
    items, url = [], chemin
    while url:
        reponse = urllib.request.Request(url if url.startswith("http") else f"{BASE}{url}",
                                         headers={"X-Shopify-Access-Token": _token})
        with urllib.request.urlopen(reponse, timeout=60) as r:
            items.extend(json.loads(r.read() or b"{}")[cle])
            lien = r.headers.get("Link", "")
        suivant = next((p[4:-1] for p in lien.split(", ") if 'rel="next"' in p), None)
        url = suivant
    return items


def pages():
    modeles = {"maison": "zayado-maison", "besoins": "zayado-besoins", "cockpit": "zayado-cockpit",
               "contact": "zayado-contact", "liens": "zayado-liens"}
    existantes = {p["handle"]: p for p in _lister_tout("/pages.json?limit=250", "pages")}
    titres = {"maison": "La Maison Zayado", "besoins": "De quoi avez-vous besoin ?",
              "cockpit": "Le Cockpit VisionAct", "contact": "Contact", "liens": "Liens"}
    for handle, suffixe in modeles.items():
        if handle in existantes:
            p = existantes[handle]
            if p.get("template_suffix") != suffixe:
                _req("PUT", f"/pages/{p['id']}.json", {"page": {"id": p["id"], "template_suffix": suffixe}})
            print(f"  page /pages/{handle} : modèle {suffixe}")
        else:
            _req("POST", "/pages.json", {"page": {"title": titres[handle], "handle": handle,
                                                  "template_suffix": suffixe, "published": True}})
            print(f"  page /pages/{handle} : créée (modèle {suffixe})")


def collections():
    regles = {"outils-ia": "Outils IA", "accompagnement": "Accompagnement",
              "rachat-reprise": "Rachat & reprise", "produits": "Produits"}
    existantes = {c["handle"] for c in _req("GET", "/smart_collections.json?limit=250")["smart_collections"]}
    for handle, titre in regles.items():
        if handle in existantes:
            print(f"  collection {handle} : déjà là")
            continue
        _req("POST", "/smart_collections.json", {"smart_collection": {
            "title": titre, "handle": handle, "template_suffix": "zayado",
            "rules": [{"column": "tag", "relation": "equals", "condition": handle}]}})
        print(f"  collection {handle} : créée")


def metachamps_definitions():
    requete = """
    mutation Def($d: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $d) {
        createdDefinition { id name }
        userErrors { message }
      }
    }"""
    defs = [
        ("Produit", "benefice", "Bénéfice"), ("Produit", "mode_prix", "Mode de prix"),
        ("Produit", "lien_app", "Lien app"), ("Produit", "cta", "Bouton"),
        ("Article", "personne", "Personne (témoignage)"),
    ]
    type_map = {"lien_app": "url"}
    for objet, cle, nom in defs:
        r = gql(requete, {"d": {"name": nom, "namespace": "zayado", "key": cle,
                                "type": type_map.get(cle, "single_line_text_field"),
                                "ownerType": "PRODUCT" if objet == "Produit" else "ARTICLE"}})
        err = r.get("data", {}).get("metafieldDefinitionCreate", {}).get("userErrors", [])
        if err and "déjà" not in str(err).lower() and "taken" not in str(err).lower() and "in use" not in str(err).lower():
            print(f"  métachamp zayado.{cle} : {err}")
        else:
            print(f"  métachamp zayado.{cle} : ok")


def journal():
    blogs = _req("GET", "/blogs.json?limit=250")["blogs"]
    blog = next((b for b in blogs if b["handle"] == "journal"), None)
    if not blog:
        blog = _req("POST", "/blogs.json", {"blog": {"title": "Journal", "handle": "journal"}})["blog"]
        print("  blog « Journal » : créé")
    if blog.get("template_suffix") != "journal":
        _req("PUT", f"/blogs/{blog['id']}.json", {"blog": {"id": blog["id"], "template_suffix": "journal"}})
        print("  blog « Journal » : modèle blog.journal")
    arts = _req("GET", f"/blogs/{blog['id']}/articles.json?limit=250")["articles"]
    n = 0
    for a in arts:
        if a.get("template_suffix") != "journal":
            _req("PUT", f"/blogs/{blog['id']}/articles/{a['id']}.json",
                 {"article": {"id": a["id"], "template_suffix": "journal"}})
            n += 1
    print(f"  articles du Journal : {len(arts)} trouvés, {n} passés au modèle article.journal")


def produits_metachamps():
    """Recolle les métachamps zayado.* depuis le CSV (ignorés si l'import a précédé les définitions)."""
    import csv
    csv_path = RACINE / "produits" / "produits-zayado.csv"
    if not csv_path.exists():
        return
    produits = {p["handle"]: p for p in _lister_tout("/products.json?limit=250", "products")}
    n = 0
    with open(csv_path, encoding="utf-8") as f:
        for ligne in csv.DictReader(f):
            handle = (ligne.get("Handle") or "").strip()
            if not handle or handle not in produits:
                continue
            p = produits[handle]
            mf = []
            for col, cle in (("Bénéfice (product.metafields.zayado.benefice)", "benefice"),
                             ("Mode de prix (product.metafields.zayado.mode_prix)", "mode_prix"),
                             ("Lien app (product.metafields.zayado.lien_app)", "lien_app"),
                             ("Bouton (product.metafields.zayado.cta)", "cta")):
                v = (ligne.get(col) or "").strip()
                if v:
                    mf.append({"namespace": "zayado", "key": cle, "value": v,
                               "type": "url" if cle == "lien_app" else "single_line_text_field"})
            corps = {"product": {"id": p["id"], "template_suffix": "zayado", "metafields": mf}}
            _req("PUT", f"/products/{p['id']}.json", corps)
            n += 1
    print(f"  produits : {n} mis à jour (modèle product.zayado + métachamps)")


def main():
    print("1. Jeton d'accès…")
    jeton()
    sans_theme = "--sans-theme" in sys.argv
    if not sans_theme:
        print("2. Thème actif…")
        theme_id = theme_actif()
        print("3. Téléversement du thème Zayado…")
        televerser_theme(theme_id)
        print("4. Page d'accueil…")
        page_accueil(theme_id)
    else:
        print("2-4. Thème : ignoré (--sans-theme), à relancer une fois read_themes/write_themes approuvés.")
    print("5. Pages…")
    pages()
    print("6. Collections…")
    collections()
    print("7. Métachamps…")
    metachamps_definitions()
    print("8. Journal…")
    journal()
    print("9. Produits…")
    produits_metachamps()
    print("\nTerminé. Ouvrez https://" + BOUTIQUE + " pour vérifier.")


if __name__ == "__main__":
    try:
        main()
    except KeyError as e:
        print(f"Variable manquante : {e}. Posez SHOPIFY_SHOP_DOMAIN, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET.", file=sys.stderr)
        sys.exit(1)
