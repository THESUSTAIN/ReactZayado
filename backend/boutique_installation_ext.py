"""Installer la boutique Shopify en un clic (Admin › Marketplace › Commandes › « Installer la boutique »).

Tout ce que le thème attend est créé par l'API, sans rien retaper :
  1. les 5 métachamps (4 produit + 1 article) ;
  2. les 16 produits (assets/boutique/produits-zayado.csv), publiés sur la boutique en ligne ;
  3. les 4 collections automatiques (par balise) ;
  4. les 5 pages (La Maison, Besoins, Cockpit, Contact, Liens) avec leur modèle ;
  5. le blog « Journal » et ses articles (assets/boutique/textes-a-coller.md) ;
  6. le menu principal et le menu de bas de page.
On peut relancer sans risque : ce qui existe déjà (même adresse) est mis à jour, rien n'est créé en double.

Seul le thème s'importe à la main (Boutique en ligne › Thèmes › Importer un fichier zip).
Droits de l'application (Dev Dashboard › Versions) : write_products, write_publications, write_content,
write_online_store_navigation (en plus des droits de lecture déjà demandés).
"""
from __future__ import annotations

import csv
import os
import re
from pathlib import Path
from typing import Optional

import httpx
from fastapi import Depends, HTTPException

DOSSIER = Path(__file__).parent / "assets" / "boutique"
VERSION = os.environ.get("SHOPIFY_BOUTIQUE_API_VERSION", "2026-07")  # version stable récente (pages, articles, menus en GraphQL)
DROITS = ["write_products", "write_publications", "write_content", "write_online_store_navigation"]

METACHAMPS = [
    ("PRODUCT", "benefice", "Bénéfice", "single_line_text_field"),
    ("PRODUCT", "mode_prix", "Mode de prix", "single_line_text_field"),
    ("PRODUCT", "lien_app", "Lien app", "url"),
    ("PRODUCT", "cta", "Bouton", "single_line_text_field"),
    ("ARTICLE", "personne", "Personne (témoignage)", "single_line_text_field"),
]
COLLECTIONS = [
    ("outils-ia", "Piloter avec VisionAct"),
    ("accompagnement", "Être accompagné"),
    ("rachat-reprise", "Reprendre une entreprise"),
    ("produits", "S'équiper"),
]
PAGES = [
    ("maison", "La Maison", "zayado-maison"),
    ("besoins", "De quoi avez-vous besoin ?", "zayado-besoins"),
    ("cockpit", "Le Cockpit", "zayado-cockpit"),
    ("contact", "Contact", "zayado-contact"),
    ("liens", "Liens", "zayado-liens"),
    ("confidentialite", "Politique de confidentialité", ""),
]
APP = "https://app.zayado.net"
# Adresses /legal/… de zayado.net : la confidentialité reste sur la boutique (Google la lit à cette adresse),
# les autres pages légales vivent dans l'appli.
REDIRECTIONS = [
    ("/legal/confidentialite", "/pages/confidentialite"),
    ("/legal/mentions-legales", f"{APP}/legal/mentions-legales"),
    ("/legal/cgu", f"{APP}/legal/cgu"),
    ("/legal/cgv", f"{APP}/legal/cgv"),
]
# Textes du Journal publiés tout de suite ; les autres restent en brouillon (à relire).
# « vendre-a-0-euro » parle de céder son entreprise : Zayado ne fait pas de cession, donc brouillon.
BROUILLONS = {"vendre-a-0-euro"}

COLONNES_METACHAMPS = {
    "benefice": "Bénéfice (product.metafields.zayado.benefice)",
    "mode_prix": "Mode de prix (product.metafields.zayado.mode_prix)",
    "lien_app": "Lien app (product.metafields.zayado.lien_app)",
    "cta": "Bouton (product.metafields.zayado.cta)",
}


def lire_produits(chemin: Path = DOSSIER / "produits-zayado.csv") -> list:
    with open(chemin, encoding="utf-8") as f:
        return [r for r in csv.DictReader(f) if (r.get("Handle") or "").strip()]


def produit_vers_entree(r: dict) -> dict:
    vrai = lambda v: str(v or "").strip().upper() == "TRUE"  # noqa: E731
    metas = [{"namespace": "zayado", "key": k, "type": "url" if k == "lien_app" else "single_line_text_field",
              "value": (r.get(col) or "").strip()} for k, col in COLONNES_METACHAMPS.items() if (r.get(col) or "").strip()]
    variante = {
        "optionValues": [{"optionName": "Title", "name": "Default Title"}],
        "price": (r.get("Variant Price") or "0").strip() or "0",
        "inventoryPolicy": "CONTINUE" if (r.get("Variant Inventory Policy") or "").strip().lower() == "continue" else "DENY",
        "taxable": vrai(r.get("Variant Taxable")),
        "inventoryItem": {"requiresShipping": vrai(r.get("Variant Requires Shipping")), "tracked": False},
    }
    if (r.get("Variant SKU") or "").strip():
        variante["sku"] = r["Variant SKU"].strip()
    if (r.get("Variant Compare At Price") or "").strip():
        variante["compareAtPrice"] = r["Variant Compare At Price"].strip()
    entree = {
        "handle": r["Handle"].strip(),
        "title": (r.get("Title") or "").strip(),
        "descriptionHtml": r.get("Body (HTML)") or "",
        "vendor": (r.get("Vendor") or "Zayado").strip(),
        "productType": (r.get("Type") or "").strip(),
        "tags": [t.strip() for t in (r.get("Tags") or "").split(",") if t.strip()],
        "status": "ACTIVE" if (r.get("Status") or "active").strip().lower() == "active" else "DRAFT",
        "templateSuffix": "zayado",
        "productOptions": [{"name": "Title", "values": [{"name": "Default Title"}]}],
        "variants": [variante],
        "metafields": metas,
    }
    if (r.get("Image Src") or "").strip():
        entree["files"] = [{"originalSource": r["Image Src"].strip(), "alt": (r.get("Image Alt Text") or "").strip(),
                            "contentType": "IMAGE"}]
    return entree


def lire_journal(chemin: Path = DOSSIER / "textes-a-coller.md") -> list:
    """Découpe le fichier « textes à coller » : un article par titre « ## »."""
    texte = chemin.read_text(encoding="utf-8")
    articles = []
    for bloc in re.split(r"\n## ", texte)[1:]:
        titre = bloc.split("\n", 1)[0].strip()

        def champ(nom, bloc=bloc):
            m = re.search(r"- \*\*" + re.escape(nom) + r"[^*]*:\*\*\s*(.+)", bloc)
            return m.group(1).strip().strip("`").strip() if m else ""
        corps = re.search(r"```html\n(.*?)```", bloc, re.S)
        auteur = champ("Auteur")
        articles.append({
            "title": titre, "handle": champ("Adresse (handle)"), "tags": [champ("Balise") or "article"],
            "summary": champ("Extrait"), "body": (corps.group(1).strip() if corps else ""),
            "seo_titre": champ("Titre Google"), "seo_description": champ("Description Google"),
            "auteur": auteur if auteur and len(auteur) < 40 and "compte" not in auteur else "L'équipe Zayado",
        })
    return [a for a in articles if a["handle"] and a["body"]]


def install_boutique_installation(g: dict) -> None:
    api, exiger_role = g["api"], g["exiger_role"]
    log = g.get("logger")
    admin = Depends(exiger_role("admin"))

    def _boutique() -> str:
        return (os.environ.get("SHOPIFY_SHOP_DOMAIN", "") or "").replace("https://", "").strip().strip("/")

    async def _appel(query: str, variables: Optional[dict]) -> httpx.Response:
        jeton = os.environ.get("SHOPIFY_ADMIN_TOKEN", "").strip()
        if not (_boutique() and jeton):
            raise HTTPException(503, "Shopify n'est pas relié : ajoute SHOPIFY_SHOP_DOMAIN, SHOPIFY_CLIENT_ID et SHOPIFY_CLIENT_SECRET "
                                     "sur Railway (service backend), puis redéploie.")
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                return await client.post(f"https://{_boutique()}/admin/api/{VERSION}/graphql.json",
                                         headers={"X-Shopify-Access-Token": jeton, "Content-Type": "application/json"},
                                         json={"query": query, "variables": variables or {}})
        except httpx.HTTPError as e:
            raise HTTPException(503, f"Boutique injoignable ({_boutique()}) : vérifie SHOPIFY_SHOP_DOMAIN (format xxx.myshopify.com). {e}"[:300])

    def _message_erreurs(err) -> str:
        if isinstance(err, list):
            return "; ".join(str(e.get("message", e)) if isinstance(e, dict) else str(e) for e in err)[:400]
        if isinstance(err, dict):
            return "; ".join(f"{k} : {v}" for k, v in err.items())[:400]
        return str(err)[:400]

    async def _gql(query: str, variables: Optional[dict] = None) -> dict:
        r = await _appel(query, variables)
        if r.status_code in (401, 403) and g.get("shopify_obtenir_jeton"):
            # Jeton expiré ou absent : on en redemande un (ID + secret client) et on réessaie une fois.
            if await g["shopify_obtenir_jeton"]():
                r = await _appel(query, variables)
        try:
            d = r.json()
        except ValueError:
            d = {}
        if r.status_code == 401:
            etat = (g.get("shopify_jeton_etat") or {}).get("erreur") or ""
            raise HTTPException(502, "Shopify refuse l'accès : vérifie SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET sur Railway et que "
                                     "l'application est bien installée sur la boutique. " + etat)
        if r.status_code == 404:
            raise HTTPException(502, f"Boutique introuvable : « {_boutique()} ». SHOPIFY_SHOP_DOMAIN doit être l'adresse xxx.myshopify.com.")
        if r.status_code >= 400:
            raise HTTPException(502, f"Shopify a répondu {r.status_code} : " + (_message_erreurs(d.get("errors")) if d.get("errors") else r.text[:300]))
        if d.get("errors"):
            raise HTTPException(502, "Shopify a rejeté la requête : " + _message_erreurs(d["errors"]))
        return d.get("data") or {}

    g["boutique_gql"] = _gql  # remplaçable dans les tests

    def gql(q, v=None):
        return g["boutique_gql"](q, v)

    def _fautes(res: dict, cle: str) -> str:
        return "; ".join(f"{'.'.join(map(str, e.get('field') or []))} {e.get('message', '')}".strip()
                         for e in ((res.get(cle) or {}).get("userErrors") or []))[:300]

    async def _droits_manquants() -> list:
        d = await gql("{ appInstallation { accessScopes { handle } } }")
        accordes = {s["handle"] for s in ((d.get("appInstallation") or {}).get("accessScopes") or [])}
        return [x for x in DROITS if x not in accordes]

    async def _publication_boutique() -> Optional[str]:
        d = await gql("{ publications(first: 30) { nodes { id name } } }")
        for p in (d.get("publications") or {}).get("nodes") or []:
            if (p.get("name") or "").lower() in ("online store", "boutique en ligne"):
                return p["id"]
        return None

    async def _publier(pub: Optional[str], ident: str) -> None:
        if pub:
            await gql("mutation($id: ID!, $input: [PublicationInput!]!) { publishablePublish(id: $id, input: $input) { userErrors { field message } } }",
                      {"id": ident, "input": [{"publicationId": pub}]})

    # ── 1. Métachamps ──
    async def _metachamps() -> dict:
        crees, deja, erreurs = 0, 0, []
        for proprio, cle, nom, type_ in METACHAMPS:
            d = await gql("query($t: MetafieldOwnerType!) { metafieldDefinitions(first: 50, ownerType: $t, namespace: \"zayado\") { nodes { key } } }", {"t": proprio})
            if cle in {n["key"] for n in (d.get("metafieldDefinitions") or {}).get("nodes") or []}:
                deja += 1
                continue
            res = await gql("mutation($d: MetafieldDefinitionInput!) { metafieldDefinitionCreate(definition: $d) { createdDefinition { id } userErrors { field message } } }",
                            {"d": {"namespace": "zayado", "key": cle, "name": nom, "type": type_, "ownerType": proprio, "pin": True}})
            f = _fautes(res, "metafieldDefinitionCreate")
            if f:
                erreurs.append(f"{cle} : {f}")
            else:
                crees += 1
        return {"ok": not erreurs, "detail": f"{crees} créé(s), {deja} déjà là", "erreurs": erreurs}

    # ── 2. Produits ──
    async def _produits(pub: Optional[str]) -> dict:
        faits, erreurs = 0, []
        for r in lire_produits():
            entree = produit_vers_entree(r)
            res = await gql("""mutation($input: ProductSetInput!, $id: ProductSetIdentifiers) {
                productSet(input: $input, identifier: $id, synchronous: true) { product { id } userErrors { field message } } }""",
                            {"input": entree, "id": {"handle": entree["handle"]}})
            f = _fautes(res, "productSet")
            pid = (((res.get("productSet") or {}).get("product")) or {}).get("id")
            if f or not pid:
                erreurs.append(f"{entree['handle']} : {f or 'refusé'}")
                continue
            await _publier(pub, pid)
            faits += 1
        return {"ok": not erreurs, "detail": f"{faits} produit(s) en ligne (créés ou mis à jour)", "erreurs": erreurs}

    # ── 3. Collections ──
    async def _collections(pub: Optional[str]) -> dict:
        ids, erreurs = {}, []
        for handle, titre in COLLECTIONS:
            d = await gql("query($q: String!) { collections(first: 5, query: $q) { nodes { id handle } } }", {"q": f"handle:{handle}"})
            existant = next((n["id"] for n in (d.get("collections") or {}).get("nodes") or [] if n["handle"] == handle), None)
            if not existant:
                res = await gql("mutation($input: CollectionInput!) { collectionCreate(input: $input) { collection { id } userErrors { field message } } }",
                                {"input": {"title": titre, "handle": handle, "templateSuffix": "zayado",
                                           "ruleSet": {"appliedDisjunctively": False,
                                                       "rules": [{"column": "TAG", "relation": "EQUALS", "condition": handle}]}}})
                f = _fautes(res, "collectionCreate")
                existant = (((res.get("collectionCreate") or {}).get("collection")) or {}).get("id")
                if f or not existant:
                    erreurs.append(f"{handle} : {f or 'refusée'}")
                    continue
            await _publier(pub, existant)
            ids[handle] = existant
        return {"ok": not erreurs, "detail": f"{len(ids)} collection(s) prête(s)", "erreurs": erreurs, "_ids": ids}

    # ── 4. Pages ──
    async def _pages() -> dict:
        d = await gql("{ pages(first: 100) { nodes { id handle } } }")
        existantes = {n["handle"]: n["id"] for n in (d.get("pages") or {}).get("nodes") or []}
        ids, erreurs, crees = {}, [], 0
        for handle, titre, modele in PAGES:
            corps = _corps_page(handle)
            if handle in existantes:
                ids[handle] = existantes[handle]
                if corps:  # le texte de confidentialité suit toujours la version du code
                    await gql("mutation($id: ID!, $p: PageUpdateInput!) { pageUpdate(id: $id, page: $p) { page { id } userErrors { field message } } }",
                              {"id": existantes[handle], "p": {"body": corps, "isPublished": True}})
                continue
            entree = {"title": titre, "handle": handle, "isPublished": True, "body": corps}
            if modele:
                entree["templateSuffix"] = modele
            res = await gql("mutation($p: PageCreateInput!) { pageCreate(page: $p) { page { id } userErrors { field message } } }",
                            {"p": entree})
            f = _fautes(res, "pageCreate")
            pid = (((res.get("pageCreate") or {}).get("page")) or {}).get("id")
            if f or not pid:
                erreurs.append(f"{handle} : {f or 'refusée'}")
                continue
            ids[handle], crees = pid, crees + 1
        return {"ok": not erreurs, "detail": f"{crees} créée(s), {len(ids) - crees} déjà là", "erreurs": erreurs, "_ids": ids}

    def _corps_page(handle: str) -> str:
        if handle == "confidentialite" and (DOSSIER / "confidentialite-shopify.html").exists():
            return (DOSSIER / "confidentialite-shopify.html").read_text(encoding="utf-8")
        return ""

    # ── 4 bis. Redirections /legal/… ──
    async def _redirections() -> dict:
        faites, erreurs = 0, []
        for chemin, cible in REDIRECTIONS:
            d = await gql("query($q: String!) { urlRedirects(first: 5, query: $q) { nodes { id path target } } }", {"q": f"path:{chemin}"})
            existant = next((n for n in (d.get("urlRedirects") or {}).get("nodes") or [] if n.get("path") == chemin), None)
            if existant and existant.get("target") == cible:
                faites += 1
                continue
            if existant:
                res = await gql("mutation($id: ID!, $r: UrlRedirectInput!) { urlRedirectUpdate(id: $id, urlRedirect: $r) { urlRedirect { id } userErrors { field message } } }",
                                {"id": existant["id"], "r": {"path": chemin, "target": cible}})
                f = _fautes(res, "urlRedirectUpdate")
            else:
                res = await gql("mutation($r: UrlRedirectInput!) { urlRedirectCreate(urlRedirect: $r) { urlRedirect { id } userErrors { field message } } }",
                                {"r": {"path": chemin, "target": cible}})
                f = _fautes(res, "urlRedirectCreate")
            if f:
                erreurs.append(f"{chemin} : {f}")
            else:
                faites += 1
        return {"ok": not erreurs, "detail": f"{faites} adresse(s) /legal/… prête(s)", "erreurs": erreurs}

    # ── 5. Journal ──
    async def _journal() -> dict:
        d = await gql("{ blogs(first: 30) { nodes { id handle } } }")
        blog = next((n["id"] for n in (d.get("blogs") or {}).get("nodes") or [] if n["handle"] == "journal"), None)
        if not blog:
            res = await gql("mutation($b: BlogCreateInput!) { blogCreate(blog: $b) { blog { id } userErrors { field message } } }",
                            {"b": {"title": "Journal", "handle": "journal", "templateSuffix": "journal"}})
            blog = (((res.get("blogCreate") or {}).get("blog")) or {}).get("id")
            if not blog:
                return {"ok": False, "detail": "blog non créé", "erreurs": [_fautes(res, "blogCreate")]}
        d = await gql("query($id: ID!) { blog(id: $id) { articles(first: 100) { nodes { handle } } } }", {"id": blog})
        deja = {n["handle"] for n in (((d.get("blog") or {}).get("articles")) or {}).get("nodes") or []}
        crees, brouillons, erreurs = 0, [], []
        for a in lire_journal():
            if a["handle"] in deja:
                continue
            publie = a["handle"] not in BROUILLONS
            metas = [{"namespace": "global", "key": "title_tag", "type": "single_line_text_field", "value": a["seo_titre"]},
                     {"namespace": "global", "key": "description_tag", "type": "single_line_text_field", "value": a["seo_description"]}]
            entree = {"blogId": blog, "title": a["title"], "handle": a["handle"], "body": a["body"], "summary": a["summary"],
                      "tags": a["tags"], "author": {"name": a["auteur"]}, "isPublished": publie, "templateSuffix": "journal",
                      "metafields": [m for m in metas if m["value"]]}
            res = await gql("mutation($a: ArticleCreateInput!) { articleCreate(article: $a) { article { id } userErrors { field message } } }", {"a": entree})
            if _fautes(res, "articleCreate") and entree["metafields"]:  # au cas où le référencement serait refusé : sans lui
                entree["metafields"] = []
                res = await gql("mutation($a: ArticleCreateInput!) { articleCreate(article: $a) { article { id } userErrors { field message } } }", {"a": entree})
            f = _fautes(res, "articleCreate")
            if f:
                erreurs.append(f"{a['handle']} : {f}")
                continue
            crees += 1
            if not publie:
                brouillons.append(a["title"])
        detail = f"blog « Journal » prêt, {crees} article(s) ajouté(s)"
        if brouillons:
            detail += f" — en brouillon, à relire : {', '.join(brouillons)}"
        return {"ok": not erreurs, "detail": detail, "erreurs": erreurs, "_blog": blog}

    # ── 6. Menus ──
    async def _menus(pages: dict, collections: dict, blog: Optional[str]) -> dict:
        def item(titre, type_, rid=None, url=None):
            x = {"title": titre, "type": type_, "items": []}
            if rid:
                x["resourceId"] = rid
            if url:
                x["url"] = url
            return x
        principal = [i for i in [
            item("La Maison", "PAGE", pages.get("maison")) if pages.get("maison") else None,
            item("Piloter", "COLLECTION", collections.get("outils-ia")) if collections.get("outils-ia") else None,
            item("Être accompagné", "COLLECTION", collections.get("accompagnement")) if collections.get("accompagnement") else None,
            item("S'équiper", "COLLECTION", collections.get("produits")) if collections.get("produits") else None,
            item("Le Journal", "BLOG", blog) if blog else None,
        ] if i]
        bas = [i for i in [
            item("Reprendre une entreprise", "COLLECTION", collections.get("rachat-reprise")) if collections.get("rachat-reprise") else None,
            item("De quoi avez-vous besoin ?", "PAGE", pages.get("besoins")) if pages.get("besoins") else None,
            item("Le Cockpit", "PAGE", pages.get("cockpit")) if pages.get("cockpit") else None,
            item("Contact", "PAGE", pages.get("contact")) if pages.get("contact") else None,
        ] if i]
        legal = [i for i in [
            item("Mentions légales", "HTTP", url=f"{APP}/legal/mentions-legales"),
            item("Conditions générales d'utilisation", "HTTP", url=f"{APP}/legal/cgu"),
            item("Conditions générales de vente", "HTTP", url=f"{APP}/legal/cgv"),
            item("Politique de confidentialité", "PAGE", pages.get("confidentialite")) if pages.get("confidentialite")
            else item("Politique de confidentialité", "HTTP", url=f"{APP}/legal/confidentialite"),
        ] if i]
        d = await gql("{ menus(first: 30) { nodes { id handle } } }")
        existants = {n["handle"]: n["id"] for n in (d.get("menus") or {}).get("nodes") or []}
        erreurs = []
        for handle, titre, items in (("main-menu", "Menu principal", principal), ("footer", "Menu de bas de page", bas),
                                     ("legal", "Informations légales", legal)):
            if handle in existants:
                res = await gql("mutation($id: ID!, $t: String!, $i: [MenuItemUpdateInput!]!) { menuUpdate(id: $id, title: $t, items: $i) { menu { id } userErrors { field message } } }",
                                {"id": existants[handle], "t": titre, "i": items})
                f = _fautes(res, "menuUpdate")
            else:
                res = await gql("mutation($t: String!, $h: String!, $i: [MenuItemCreateInput!]!) { menuCreate(title: $t, handle: $h, items: $i) { menu { id } userErrors { field message } } }",
                                {"t": titre, "h": handle, "i": items})
                f = _fautes(res, "menuCreate")
            if f:
                erreurs.append(f"{handle} : {f}")
        return {"ok": not erreurs, "detail": "La Maison · Piloter · Être accompagné · S'équiper · Le Journal (+ bas de page et informations légales)", "erreurs": erreurs}

    @api.get("/admin/shopify/installer-boutique")
    async def boutique_etat(_a=admin):
        manquants = await _droits_manquants()
        return {"pret": not manquants, "droits_manquants": manquants, "boutique": _boutique(),
                "produits": len(lire_produits()), "articles": len(lire_journal())}

    @api.post("/admin/shopify/installer-boutique")
    async def boutique_installer(_a=admin):
        try:
            return await _installer()
        except HTTPException:
            raise
        except Exception as e:  # noqa: BLE001 — jamais d'erreur 500 muette : on dit ce qui coince
            if log:
                log.exception("Installation de la boutique Shopify")
            raise HTTPException(502, f"Installation interrompue : {type(e).__name__} : {e}"[:400])

    async def _installer():
        manque = [f.name for f in (DOSSIER / "produits-zayado.csv", DOSSIER / "textes-a-coller.md") if not f.exists()]
        if manque:
            raise HTTPException(409, "Fichier(s) absent(s) du serveur : backend/assets/boutique/" + ", ".join(manque)
                                + ". Ajoute-les au code puis redéploie.")
        if g.get("shopify_obtenir_jeton") and not os.environ.get("SHOPIFY_ADMIN_TOKEN"):
            await g["shopify_obtenir_jeton"]()
        manquants = await _droits_manquants()
        if manquants and g.get("shopify_obtenir_jeton"):
            # Les droits ont pu être ajoutés depuis l'obtention du jeton : on en redemande un, puis on revérifie.
            if await g["shopify_obtenir_jeton"]():
                manquants = await _droits_manquants()
        if manquants:
            raise HTTPException(409, "Droits Shopify manquants : " + ", ".join(manquants)
                                + ". Ils sont peut-être dans ta version publiée mais pas encore acceptés par la boutique : admin Shopify › Paramètres › "
                                "Applications › ton application › accepter / mettre à jour les autorisations. Puis reclique ici.")
        etapes = []

        async def etape(nom, coro):
            try:
                res = await coro
            except HTTPException as e:
                res = {"ok": False, "detail": "", "erreurs": [str(e.detail)]}
            except Exception as e:  # noqa: BLE001
                if log:
                    log.exception("Installation boutique : %s", nom)
                res = {"ok": False, "detail": "", "erreurs": [str(e)[:300]]}
            etapes.append({"etape": nom, **{k: v for k, v in res.items() if not k.startswith("_")}})
            return res

        pub = await _publication_boutique()
        await etape("Métachamps", _metachamps())
        await etape("Produits", _produits(pub))
        c = await etape("Collections", _collections(pub))
        p = await etape("Pages", _pages())
        j = await etape("Journal", _journal())
        await etape("Adresses légales", _redirections())
        await etape("Menus", _menus(p.get("_ids") or {}, c.get("_ids") or {}, j.get("_blog")))
        return {"ok": all(e["ok"] for e in etapes), "etapes": etapes,
                "publication_trouvee": bool(pub)}
