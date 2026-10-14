"""Installer la boutique Shopify en un clic : tout est créé une seule fois, même si on relance."""
import re

import pytest


class FausseBoutique:
    def __init__(self, droits=None):
        self.droits = droits or ["write_products", "write_publications", "write_content", "write_online_store_navigation"]
        self.defs, self.produits, self.collections, self.pages, self.blogs, self.articles = set(), {}, {}, {}, {}, {}
        self.menus = {"main-menu": {"id": "gid://shopify/Menu/1", "items": []}}
        self.publies = set()
        self.redir, self.corps, self.maj_pages = {}, {}, []

    async def __call__(self, q, v=None):
        v = v or {}
        if "appInstallation" in q:
            return {"appInstallation": {"accessScopes": [{"handle": d} for d in self.droits]}}
        if "publications(" in q:
            return {"publications": {"nodes": [{"id": "gid://shopify/Publication/9", "name": "Online Store"}]}}
        if "publishablePublish" in q:
            self.publies.add(v["id"])
            return {"publishablePublish": {"userErrors": []}}
        if "metafieldDefinitions(" in q:
            return {"metafieldDefinitions": {"nodes": [{"key": k} for (t, k) in self.defs if t == v["t"]]}}
        if "metafieldDefinitionCreate" in q:
            d = v["d"]
            self.defs.add((d["ownerType"], d["key"]))
            return {"metafieldDefinitionCreate": {"createdDefinition": {"id": "x"}, "userErrors": []}}
        if "productSet" in q:
            h = v["id"]["handle"]
            assert v["input"]["variants"][0]["optionValues"] and v["input"]["templateSuffix"] == "zayado"
            self.produits[h] = v["input"]
            return {"productSet": {"product": {"id": f"gid://shopify/Product/{h}"}, "userErrors": []}}
        if "collections(" in q:
            h = v["q"].split(":", 1)[1]
            return {"collections": {"nodes": [{"id": self.collections[h], "handle": h}] if h in self.collections else []}}
        if "collectionCreate" in q:
            h = v["input"]["handle"]
            assert v["input"]["ruleSet"]["rules"][0] == {"column": "TAG", "relation": "EQUALS", "condition": h}
            self.collections[h] = f"gid://shopify/Collection/{h}"
            return {"collectionCreate": {"collection": {"id": self.collections[h]}, "userErrors": []}}
        if "pages(" in q:
            return {"pages": {"nodes": [{"id": i, "handle": h} for h, i in self.pages.items()]}}
        if "pageUpdate" in q:
            self.maj_pages.append(v["id"])
            return {"pageUpdate": {"page": {"id": v["id"]}, "userErrors": []}}
        if "urlRedirects(" in q:
            ch = v["q"].split(":", 1)[1]
            return {"urlRedirects": {"nodes": [{"id": "r-" + ch, "path": ch, "target": self.redir[ch]}] if ch in self.redir else []}}
        if "urlRedirectCreate" in q or "urlRedirectUpdate" in q:
            self.redir[v["r"]["path"]] = v["r"]["target"]
            cle = "urlRedirectCreate" if "urlRedirectCreate" in q else "urlRedirectUpdate"
            return {cle: {"urlRedirect": {"id": "r"}, "userErrors": []}}
        if "pageCreate" in q:
            self.corps[v["p"]["handle"]] = v["p"].get("body", "")
            h = v["p"]["handle"]
            self.pages[h] = f"gid://shopify/Page/{h}"
            return {"pageCreate": {"page": {"id": self.pages[h]}, "userErrors": []}}
        if "blogs(" in q:
            return {"blogs": {"nodes": [{"id": i, "handle": h} for h, i in self.blogs.items()]}}
        if "blogCreate" in q:
            self.blogs["journal"] = "gid://shopify/Blog/1"
            return {"blogCreate": {"blog": {"id": "gid://shopify/Blog/1"}, "userErrors": []}}
        if "blog(id" in q:
            return {"blog": {"articles": {"nodes": [{"handle": h} for h in self.articles]}}}
        if "articleCreate" in q:
            self.articles[v["a"]["handle"]] = v["a"]
            return {"articleCreate": {"article": {"id": "a"}, "userErrors": []}}
        if "menus(" in q:
            return {"menus": {"nodes": [{"id": m["id"], "handle": h} for h, m in self.menus.items()]}}
        if "menuUpdate" in q or "menuCreate" in q:
            h = v.get("h") or next(h for h, m in self.menus.items() if m["id"] == v["id"])
            self.menus[h] = {"id": self.menus.get(h, {}).get("id", f"gid://shopify/Menu/{h}"), "items": v["i"]}
            return {"menuUpdate" if "menuUpdate" in q else "menuCreate": {"menu": {"id": "m"}, "userErrors": []}}
        raise AssertionError("requête inattendue : " + q[:80])


@pytest.fixture
def boutique(monkeypatch):
    import server
    b = FausseBoutique()
    monkeypatch.setitem(server.__dict__, "boutique_gql", b)
    return b


def test_installation_complete_puis_relance_sans_doublon(client, compte, boutique):
    _, h = compte(role="admin")
    r = client.post("/api/admin/shopify/installer-boutique", headers=h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["ok"], d
    assert len(boutique.defs) == 5 and len(boutique.produits) == 16
    assert set(boutique.collections) == {"outils-ia", "accompagnement", "rachat-reprise", "produits"}
    assert set(boutique.pages) == {"maison", "besoins", "cockpit", "contact", "liens", "confidentialite"}
    assert "drive.file" in boutique.corps["confidentialite"] and len(boutique.corps["confidentialite"]) > 10000
    assert boutique.redir["/legal/confidentialite"] == "/pages/confidentialite"
    assert boutique.redir["/legal/cgu"] == "https://app.zayado.net/legal/cgu"
    assert [i["title"] for i in boutique.menus["legal"]["items"]][-1] == "Politique de confidentialité"
    assert len(boutique.articles) == 4
    assert boutique.articles["vendre-a-0-euro"]["isPublished"] is False  # parle de cession : brouillon
    assert boutique.articles["acheter-ou-creer"]["isPublished"] is True
    assert boutique.articles["note-equilibre"]["author"] == {"name": "L'équipe Zayado"}
    titres = [i["title"] for i in boutique.menus["main-menu"]["items"]]
    assert titres == ["La Maison", "Piloter", "Être accompagné", "S'équiper", "Le Journal"]
    assert "footer" in boutique.menus
    # Les produits « bientot » gardent leur balise (pas d'achat), les métachamps sont remplis
    alba = boutique.produits["fauteuil-ergonomique-alba"]
    assert "bientot" in alba["tags"] and alba["metafields"]
    assert "gid://shopify/Product/copilote-solo" in boutique.publies

    # Relance : rien en double
    avant = (len(boutique.defs), len(boutique.collections), len(boutique.pages), len(boutique.articles))
    assert client.post("/api/admin/shopify/installer-boutique", headers=h).json()["ok"]
    assert (len(boutique.defs), len(boutique.collections), len(boutique.pages), len(boutique.articles)) == avant
    assert boutique.maj_pages == ["gid://shopify/Page/confidentialite"] and len(boutique.redir) == 4


def test_droits_manquants_expliques(client, compte, boutique):
    boutique.droits = ["write_products"]
    _, h = compte(role="admin")
    r = client.post("/api/admin/shopify/installer-boutique", headers=h)
    assert r.status_code == 409 and "write_online_store_navigation" in r.json()["detail"]


def test_reserve_a_l_admin(client, compte, boutique):
    _, h = compte()
    assert client.post("/api/admin/shopify/installer-boutique", headers=h).status_code in (401, 403)


def test_erreur_shopify_en_texte_donne_un_message_clair(client, compte, monkeypatch):
    """Shopify renvoie parfois {"errors": "texte"} : plus d'erreur 500, un message lisible."""
    import httpx
    import server
    monkeypatch.setenv("SHOPIFY_SHOP_DOMAIN", "test.myshopify.com")
    monkeypatch.setenv("SHOPIFY_ADMIN_TOKEN", "x")
    monkeypatch.setitem(server.__dict__, "shopify_obtenir_jeton", None)

    async def faux_post(self, url, *a, **kw):
        return httpx.Response(401, json={"errors": "[API] Invalid API key or access token (unrecognized login or wrong password)"},
                              request=httpx.Request("POST", url))
    monkeypatch.setattr(httpx.AsyncClient, "post", faux_post)
    _, h = compte(role="admin")
    r = client.post("/api/admin/shopify/installer-boutique", headers=h)
    assert r.status_code == 502 and "SHOPIFY_CLIENT_ID" in r.json()["detail"], r.text
