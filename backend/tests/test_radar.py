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


def test_opportunites_reliees_a_un_vrai_objectif(client, compte):
    """Une opportunité du Radar doit pouvoir devenir une action du Plan d'action
    RATTACHÉE au bon objectif : sans objectif_id, la tâche créée serait orpheline
    et l'avancement de l'objectif ne bougerait jamais."""
    _, h = compte(plan="serenite")
    _profil(client, h, CONSEIL)
    objectifs = client.get("/api/objectifs", headers=h).json()
    objectifs = objectifs if isinstance(objectifs, list) else objectifs.get("items", [])
    attendu = {o["id"]: o["titre"] for o in objectifs}
    assert attendu, "le profil doit avoir créé au moins un objectif"

    opps = client.get("/api/cockpit/radar", headers=h).json()["opportunities"]
    assert opps
    relies = [o for o in opps if o.get("objectif_id")]
    assert relies, "aucune opportunité n'est rattachée à un objectif"
    for o in relies:
        assert o["objectif_id"] in attendu
        assert o["objectif"] == attendu[o["objectif_id"]]

    # Et la tâche créée depuis cette opportunité porte bien l'objectif.
    op = relies[0]
    t = client.post("/api/taches", headers=h, json={"titre": op["titre"], "duree_min": 15,
                                                   "objectif_id": op["objectif_id"]}).json()
    assert t["objectif_id"] == op["objectif_id"]


def test_message_objectif_flou_situe_la_source(client, compte):
    """Le cap illisible vient de la Vision : le Radar doit le dire et renvoyer
    vers la Vision, pas vers l'écran des objectifs à 90 jours."""
    import server
    assert "Vision" in server._message_objectif_flou([{"titre": "b", "origine": "vision"}])
    assert server.ORIGINES_CAP["vision"][1] == "/app/vision"
    assert server.ORIGINES_CAP["objectif"][1] == "/app/actions?tab=objectifs"


def test_cap_lisible_ne_verrouille_jamais_le_radar(client, compte):
    """Un cap lisible mais sans chiffre (« accompagner achat entreprise ») ne doit
    JAMAIS bloquer le Radar : l'utilisateur se retrouvait devant un écran sans
    issue, privé de ses signaux et de son SWOT, qui ne dépendent pas du cap."""
    import server
    assert server._objectif_comprehensible("accompagner achat entreprise")
    _, h = compte(plan="serenite")
    client.put("/api/profile", headers=h, json={"onboarded": True, "contexte_metier": CONSEIL,
                                                "objectifs": ["accompagner achat entreprise"]})
    r = client.get("/api/cockpit/radar", headers=h).json()
    assert not r.get("objectif_flou"), "un cap lisible ne doit pas être déclaré flou"
    assert r["opportunities"], "le Radar doit proposer quelque chose, même en repli"


def test_swot_se_relit_sans_regenerer(client, compte, monkeypatch):
    """Le SWOT était régénéré à chaque ouverture de l'onglet : 45 s d'attente et
    une analyse différente à chaque visite pour un contexte identique — autant
    dire une analyse à laquelle on ne peut pas se fier. Il est maintenant
    enregistré, et l'ouverture de l'onglet se contente de le relire.

    Deux garanties ici : la lecture (GET) n'appelle jamais l'IA, et ce que la
    génération (POST) a produit est bien ce qui ressort ensuite.
    """
    import server
    _, h = compte(plan="serenite")

    # Onglet jamais ouvert : rien en mémoire, et surtout pas d'erreur.
    vide = client.get("/api/radar/swot", headers=h)
    assert vide.status_code == 200
    assert vide.json().get("vide") is True

    appels = []

    class C:
        async def send_message(self, msg):
            return ('{"forces":["reseau local"],"faiblesses":["seul"],'
                    '"opportunites":["marche en hausse"],"menaces":["concurrence"],'
                    '"synthese":"Un levier, un risque."}')

    def faux(sid, systeme):
        appels.append(sid)
        return C()
    monkeypatch.setitem(server.__dict__, "_client_llm", faux)

    # La génération est réservée aux offres actives (c'est voulu) ; ce qu'on
    # vérifie ici, c'est la persistance, pas le paywall.
    async def acces(db, uid):
        return True
    monkeypatch.setitem(server.__dict__, "_acces_actif", acces)

    genere = client.post("/api/radar/swot", headers=h)
    assert genere.status_code == 200, genere.text
    assert genere.json()["forces"] == ["reseau local"]
    assert len(appels) == 1

    # Deuxième visite de l'onglet : relecture, sans un appel IA de plus.
    relu = client.get("/api/radar/swot", headers=h).json()
    assert relu.get("vide") is not True, "le SWOT enregistre doit etre relu, pas regenere"
    assert relu["forces"] == ["reseau local"]
    assert relu["synthese"] == "Un levier, un risque."
    assert len(appels) == 1, "ouvrir l'onglet SWOT ne doit declencher aucune generation"

    # Et la relecture reste ouverte même sans offre active : un SWOT déjà payé
    # ne se reverrouille pas.
    async def refus(db, uid):
        return False
    monkeypatch.setitem(server.__dict__, "_acces_actif", refus)
    assert client.get("/api/radar/swot", headers=h).json()["forces"] == ["reseau local"]
