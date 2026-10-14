#!/usr/bin/env python3
"""Méga-menus Zayado : crée les collections par univers, tague les produits,
reconstruit le menu principal façon vitrine, envoie les fichiers thème."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import installer_boutique as I  # noqa: E402

THEME_ID = 205715800405  # « Zayado — Préparation » : plus rien ne part en ligne sans le bouton Déployer

UNIVERS = [
    ("corps", "Corps", "Ce qui soutient l'effort : le dos, l'énergie, la récupération."),
    ("ame", "Âme", "Ce qui clarifie la tête : focus, calme, cap."),
    ("rituel-confort", "Rituel & Confort", "Ce qui rythme les journées : box, carnets, pauses qui reprennent."),
    ("espace-organisation", "Espace & Organisation", "Ce qui structure le quotidien : l'espace de travail et l'équipe."),
    ("promos", "Promos", "Les bonnes affaires du moment."),
]

TAGS_PRODUITS = {
    "fauteuil-ergonomique-alba": "corps",
    "plaid-recuperation-laine": "corps",
    "lampe-concentration-fjord": "ame",
    "carnet-mon-cap-90-jours": "ame",
    "tasse-rituelle-the-signature": "rituel-confort",
    "box-entrepreneur-apaise": "rituel-confort",
    "box-equipe-cadeaux": "espace-organisation",
}


def main():
    I.jeton()

    # 1) Collections intelligentes par univers (règle : étiquette = identifiant)
    existantes = {c["handle"]: c for c in I._lister_tout("/smart_collections.json?limit=250", "smart_collections")}
    for handle, titre, desc in UNIVERS:
        if handle in existantes:
            print("collection déjà là :", handle)
            continue
        r = I._req("POST", "/smart_collections.json", {"smart_collection": {
            "title": titre, "handle": handle, "body_html": f"<p>{desc}</p>",
            "rules": [{"column": "tag", "relation": "equals", "condition": handle}],
        }})
        print("collection créée :", r["smart_collection"]["handle"])

    # 2) Étiquettes univers sur les produits physiques
    produits = {p["handle"]: p for p in I._lister_tout("/products.json?limit=250&fields=id,title,handle,tags", "products")}
    for handle, tag in TAGS_PRODUITS.items():
        p = produits.get(handle)
        if not p:
            print("!! produit introuvable :", handle)
            continue
        tags = {t.strip() for t in (p.get("tags") or "").split(",") if t.strip()}
        if tag in tags:
            continue
        tags.add(tag)
        I._req("PUT", f"/products/{p['id']}.json", {"product": {"id": p["id"], "tags": ", ".join(sorted(tags))}})
        print("tag", tag, "→", handle)

    # 3) Menu principal façon vitrine
    gid_col = {c["handle"]: c["admin_graphql_api_id"] for c in I._lister_tout("/smart_collections.json?limit=250", "smart_collections")}
    gid_col.update({c["handle"]: c["admin_graphql_api_id"] for c in I._lister_tout("/custom_collections.json?limit=250", "custom_collections")})
    gid_page = {p["handle"]: p["admin_graphql_api_id"] for p in I._lister_tout("/pages.json?limit=250", "pages")}
    gid_blog = {b["handle"]: b["admin_graphql_api_id"] for b in I._lister_tout("/blogs.json?limit=250", "blogs")}
    menus = I.gql("{ menus(first: 20) { nodes { id handle } } }")["data"]["menus"]["nodes"]
    menu_id = next(m["id"] for m in menus if m["handle"] == "main-menu")

    items = [
        {"title": "Tout voir", "type": "COLLECTION", "resourceId": gid_col["produits"]},
        {"title": "Corps", "type": "COLLECTION", "resourceId": gid_col["corps"]},
        {"title": "Âme", "type": "COLLECTION", "resourceId": gid_col["ame"]},
        {"title": "Rituel & Confort", "type": "COLLECTION", "resourceId": gid_col["rituel-confort"]},
        {"title": "Espace & Organisation", "type": "COLLECTION", "resourceId": gid_col["espace-organisation"]},
        {"title": "Promos", "type": "COLLECTION", "resourceId": gid_col["promos"]},
        {"title": "Le journal", "type": "BLOG", "resourceId": gid_blog["journal"]},
        {"title": "Services Pro", "type": "PAGE", "resourceId": gid_page["services"]},
        {"title": "Partenaires", "type": "PAGE", "resourceId": gid_page["services"]},
    ]
    q = """mutation ($id: ID!, $titre: String!, $items: [MenuItemUpdateInput!]!) {
      menuUpdate(id: $id, title: $titre, items: $items) { menu { handle items { title } } userErrors { field message } } }"""
    r = I.gql(q, {"id": menu_id, "titre": "Menu principal", "items": items})
    err = r.get("data", {}).get("menuUpdate", {}).get("userErrors")
    if err:
        raise SystemExit(f"menuUpdate : {err}")
    print("menu reconstruit :", [i["title"] for i in r["data"]["menuUpdate"]["menu"]["items"]])

    # 4) Fichiers thème → thème en ligne
    for cle in ("sections/zayado-entete.liquid", "assets/zayado.css", "sections/header-group.json"):
        v = open(f"/app/shopify/theme-v2/{cle}", encoding="utf-8").read()
        I._req("PUT", f"/themes/{THEME_ID}/assets.json", {"asset": {"key": cle, "value": v}})
        print("↑", cle)
    print("TERMINE")


if __name__ == "__main__":
    main()
