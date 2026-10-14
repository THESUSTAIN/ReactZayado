"""Console admin : chaque écran répond, les indicateurs d'abonnement et les branchements sont exposés."""
from conftest import MDP


def _admin(client, compte):
    email, _ = compte(role="admin")
    t = client.post("/api/auth/login", json={"email": email, "password": MDP}).json()  # le rôle est dans le jeton
    return {"Authorization": "Bearer " + (t.get("access_token") or t.get("token"))}

ECRANS = ["/api/admin/vue-ensemble", "/api/admin/utilisateurs", "/api/admin/notifications", "/api/admin/parrainage",
          "/api/admin/codes-promo", "/api/admin/demandes-collaborateur", "/api/admin/compte-demo", "/api/admin/diagnostics",
          "/api/admin/commerce/stats", "/api/admin/commerce/orders", "/api/admin/commerce/products", "/api/admin/commerce/vendors"]


def test_tous_les_ecrans_admin_repondent(client, compte):
    h = _admin(client, compte)
    for url in ECRANS:
        r = client.get(url, headers=h)
        assert r.status_code == 200, (url, r.status_code, r.text[:200])


def test_ecrans_admin_interdits_aux_clients(client, compte):
    _, h = compte()
    for url in ECRANS:
        assert client.get(url, headers=h).status_code in (401, 403), url


def test_indicateurs_abonnements_et_branchements(client, compte, env, faux):
    env(MOLLIE_API_KEY="test_cle", TVA_TAUX="0.20")
    ha = _admin(client, compte)
    email, h = compte()
    r = client.post("/api/checkout", headers=h, json={"plan": "pro", "cycle": "mensuel"}).json()
    faux.payes.add(r["paymentId"]); client.post("/api/mollie/webhook", data={"id": r["paymentId"]})
    v = client.get("/api/admin/vue-ensemble", headers=ha).json()["abonnements"]
    assert v["par_offre"].get("pro", 0) >= 1 and v["mrr_ttc"] > 0
    u = next(x for x in client.get("/api/admin/utilisateurs", headers=ha).json()["items"] if x["email"] == email)
    assert u["abonnement"]["etat"] == "actif" and u["abonnement"]["prelevement_auto"] is True
    d = client.get("/api/admin/diagnostics", headers=ha).json()
    b = {x["cle"]: x for x in d["branchements"]}
    assert b["mollie"]["ok"] is True and "APOLLO_API_KEY" in b["apollo"]["variables"]
    # Offre Rêveur disponible pour un geste commercial
    assert client.patch(f"/api/admin/utilisateurs/{u['id']}/plan", headers=ha, json={"plan": "reveur", "jours": 31}).status_code == 200
