"""Radar : prospects Apollo (pros), signaux (particuliers), quotas."""

IMMO = {"entreprise": "Geremmo", "activite_type": "Agence immobilière", "offre": "Gestion locative et transaction",
        "cible": "propriétaires bailleurs, vendeurs, locataires", "marche": "france"}
CONSEIL = {"entreprise": "Cap Conseil", "activite_type": "Conseil", "offre": "Organisation des PME",
           "cible": "dirigeants de PME", "marche": "france"}


def _profil(client, h, cm):
    client.put("/api/profile", headers=h, json={"onboarded": True, "objectifs": ["Signer 3 clients"], "contexte_metier": cm})


def test_decouverte_sans_apollo(client, compte, env, faux):
    env(APOLLO_API_KEY="apollo-test")
    _, h = compte()
    _profil(client, h, CONSEIL)
    r = client.get("/api/cockpit/radar", headers=h).json()
    assert r["apollo"]["quota"] == 0
    assert not any("apollo" in a[1] for a in faux.appels)


def test_pros_vrais_prospects_sans_doublon(client, compte, env, faux):
    env(APOLLO_API_KEY="apollo-test")
    _, h = compte(plan="serenite")
    _profil(client, h, CONSEIL)
    r = client.get("/api/cockpit/radar", headers=h).json()
    pros = [o["prospect"] for o in r["opportunities"] if o.get("prospect")]
    assert len(pros) == 3 and all(p["role"] == "client" for p in pros)
    n = len([a for a in faux.appels if "apollo" in a[1]])
    client.get("/api/cockpit/radar?refresh=true", headers=h)
    assert len([a for a in faux.appels if "apollo" in a[1]]) == n  # relance : aucun crédit reconsommé


def test_particuliers_signaux_reels(client, compte, env, faux):
    env(APOLLO_API_KEY="apollo-test", DATAFORSEO_LOGIN="l", DATAFORSEO_PASSWORD="p")
    _, h = compte(plan="serenite")
    _profil(client, h, IMMO)
    assert client.put("/api/radar/reglages", headers=h, json={"zone": "Villeurbanne"}).json()["clientele"] == "b2c"
    s = client.get("/api/radar/signaux", headers=h).json()
    assert s["zone"]["code_insee"] == "69266"
    assert s["recherches"]["source"] == "dataforseo" and s["recherches"]["mots"][0]["volume"] == 500
    assert s["contenus"]["meta"]["texte"] and s["contenus"]["post_google"]
    assert s["dvf"]["ventes"] == 3 and "Villeurbanne" in s["dvf"]["courrier"]
    r = client.get("/api/cockpit/radar", headers=h).json()
    types = [o.get("signal") or (o.get("prospect") or {}).get("role") for o in r["opportunities"]]
    assert "partenaire" in types and "google" in types
    filtres = next(a[2] for a in faux.appels if "api_search" in a[1])
    assert "Notaire" in filtres["person_titles"] and filtres["person_locations"] == ["Villeurbanne, France"]


def test_statut_prospect(client, compte, env):
    env(APOLLO_API_KEY="apollo-test")
    _, h = compte(plan="pro")
    _profil(client, h, CONSEIL)
    op = next(o for o in client.get("/api/cockpit/radar", headers=h).json()["opportunities"] if o.get("prospect"))
    r = client.patch(f"/api/radar/prospects/{op['prospect']['id']}", headers=h, json={"statut": "contacte"})
    assert r.status_code == 200 and r.json()["statut"] == "contacte"
    assert client.patch(f"/api/radar/prospects/{op['prospect']['id']}", headers=h, json={"statut": "n'importe"}).status_code == 400


def test_sources_radar_lisibles(client, compte, env):
    """Le Radar dit clairement ce qui est branché, et l'admin voit les variables manquantes."""
    for v in ("APOLLO_API_KEY", "DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD"):
        env(**{v: ""})
    _, h = compte(plan="serenite")
    _profil(client, h, CONSEIL)
    s = client.get("/api/radar/sources", headers=h).json()
    ap = next(x for x in s["sources"] if x["cle"] == "apollo")
    assert ap["etat"] == "non_configure" and not ap["actif"]
    assert "admin" not in s  # un client ne voit pas les noms de variables
    _, ha = compte(role="admin")
    sa = client.get("/api/radar/sources", headers=ha).json()
    assert "APOLLO_API_KEY" in sa["admin"]["variables_manquantes"]


def test_apollo_actif_pour_admin_sans_abonnement(client, compte, env, faux):
    env(APOLLO_API_KEY="apollo-test")
    _, h = compte(role="admin")
    _profil(client, h, CONSEIL)
    s = client.get("/api/radar/sources", headers=h).json()
    ap = next(x for x in s["sources"] if x["cle"] == "apollo")
    assert ap["etat"] == "ok" and "admin" in s and "APOLLO_API_KEY" not in s["admin"]["variables_manquantes"]
    r = client.get("/api/cockpit/radar", headers=h).json()
    assert r["apollo"]["quota"] > 0
    assert any(o.get("prospect") for o in r["opportunities"])
