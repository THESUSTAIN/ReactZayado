#!/usr/bin/env python3
"""Pages vitrine v9 → thème Shopify + pages légales + redirections.

- Téléverse les modèles page.zayado-{services,parcours,vision,boutique,box}.json
- Crée les pages correspondantes (éditables section par section dans Personnaliser)
- Crée les pages légales (contenu repris de l'app) + politiques natives de la boutique
- Redirige /legal/… → /pages/… (l'URL déclarée à Shopify doit répondre avec du contenu)
"""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import installer_boutique as I  # noqa: E402

MODELES = {
    "services": ("Services & Accompagnement", "zayado-services"),
    "parcours": ("Le parcours Zayado", "zayado-parcours"),
    "vision": ("Notre vision", "zayado-vision"),
    "boutique": ("La boutique", "zayado-boutique"),
    "box": ("La box Zayado", "zayado-box"),
}

LEGALES = {
    "confidentialite": "Politique de confidentialité",
    "mentions-legales": "Mentions légales",
    "cgu": "Conditions générales d'utilisation",
    "cgv": "Conditions générales de vente",
}


def pages_vitrine(theme_id):
    for nom in ("services", "parcours", "vision", "boutique", "box"):
        p = I.THEME / "templates" / f"page.zayado-{nom}.json"
        I._req("PUT", f"/themes/{theme_id}/assets.json",
               {"asset": {"key": f"templates/page.zayado-{nom}.json", "value": p.read_text(encoding="utf-8")}})
        print(f"  ↑ modèle page.zayado-{nom}.json")
    existantes = {p["handle"]: p for p in I._lister_tout("/pages.json?limit=250", "pages")}
    for handle, (titre, suffixe) in MODELES.items():
        if handle in existantes:
            p = existantes[handle]
            if p.get("template_suffix") != suffixe:
                I._req("PUT", f"/pages/{p['id']}.json", {"page": {"id": p["id"], "template_suffix": suffixe}})
            print(f"  page /pages/{handle} : modèle {suffixe}")
        else:
            I._req("POST", "/pages.json", {"page": {"title": titre, "handle": handle,
                                                    "template_suffix": suffixe, "published": True}})
            print(f"  page /pages/{handle} : créée")


def pages_legales():
    existantes = {p["handle"]: p for p in I._lister_tout("/pages.json?limit=250", "pages")}
    for handle, titre in LEGALES.items():
        corps = Path(f"/tmp/legal_{handle}.html")
        html = corps.read_text(encoding="utf-8") if corps.exists() else ""
        if handle in existantes:
            p = existantes[handle]
            I._req("PUT", f"/pages/{p['id']}.json",
                   {"page": {"id": p["id"], "body_html": html, "template_suffix": ""}})
            print(f"  page légale /pages/{handle} : contenu mis à jour ({len(html)} car.)")
        else:
            I._req("POST", "/pages.json", {"page": {"title": titre, "handle": handle,
                                                    "body_html": html, "published": True}})
            print(f"  page légale /pages/{handle} : créée ({len(html)} car.)")


def redirections():
    existantes = {r["path"] for r in I._lister_tout("/redirects.json?limit=250", "redirects")}
    for handle in LEGALES:
        chemin = f"/legal/{handle}"
        if chemin in existantes:
            print(f"  redirection {chemin} : déjà là")
            continue
        I._req("POST", "/redirects.json", {"redirect": {"path": chemin, "target": f"/pages/{handle}"}})
        print(f"  redirection {chemin} → /pages/{handle}")


def politiques():
    """Les politiques natives (/policies/…) affichées au checkout et lues par Shopify."""
    r = I.gql("""{ shop { privacyPolicy: shopPolicy(type: PRIVACY_POLICY) { id body }
                         termsPolicy: shopPolicy(type: TERMS_OF_SERVICE) { id body } } }""")
    pol = r.get("data", {}).get("shop", {})
    maj = """mutation Maj($p: ShopPolicyInput!) { shopPolicyUpdate(shopPolicy: $p) { userErrors { message } } }"""
    mapping = {"PRIVACY_POLICY": "confidentialite", "TERMS_OF_SERVICE": "cgu"}
    for type_pol, handle in mapping.items():
        corps = Path(f"/tmp/legal_{handle}.html")
        if not corps.exists():
            continue
        html = corps.read_text(encoding="utf-8")
        actuel = (pol.get("privacyPolicy") if type_pol == "PRIVACY_POLICY" else pol.get("termsPolicy")) or {}
        if actuel.get("body") and len(actuel["body"]) >= len(html) * 0.9:
            print(f"  politique {type_pol} : déjà complète")
            continue
        r2 = I.gql(maj, {"p": {"type": type_pol, "body": html}})
        err = r2.get("data", {}).get("shopPolicyUpdate", {}).get("userErrors", [])
        print(f"  politique {type_pol} : {'erreur ' + str(err) if err else 'mise à jour'}")


def main():
    print("1. Jeton…")
    I.jeton()
    theme_id = I.theme_actif()
    print("2. Pages vitrine…")
    pages_vitrine(theme_id)
    print("3. Pages légales…")
    pages_legales()
    print("4. Redirections /legal/…")
    redirections()
    print("5. Politiques natives…")
    politiques()
    print("\nTerminé.")


if __name__ == "__main__":
    main()
