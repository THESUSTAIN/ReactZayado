"""Profil, offre choisie à l'onboarding, parrainage, connexions, IA."""
from conftest import MDP, nouvel_email


def test_email_du_compte_dans_le_profil(client, compte):
    email, h = compte()
    assert client.get("/api/state", headers=h).json()["profile"]["email"] == email


def test_offre_choisie_a_l_onboarding_reste_visible(client, compte):
    _, h = compte()
    client.put("/api/profile", headers=h, json={"onboarded": True, "contexte_metier": {"plan_souhaite": "serenite"}})
    abo = client.get("/api/abonnement", headers=h).json()
    assert abo["plan"] == "essentielle" and abo["plan_en_attente"] == "serenite"
    assert client.get("/api/state", headers=h).json()["profile"]["plan_en_attente"] == "serenite"


def test_plan_non_modifiable_par_le_profil(client, compte):
    _, h = compte()
    client.put("/api/profile", headers=h, json={"plan": "pro"})
    assert client.get("/api/abonnement", headers=h).json()["plan"] == "essentielle"


def test_objectif_3_ans_pre_rempli_depuis_la_vision(client, compte):
    _, h = compte()
    client.put("/api/profile", headers=h, json={"texte_vision": "Devenir la référence locale de la gestion locative humaine."})
    cd = client.get("/api/vision/countdown", headers=h).json()
    assert cd["titre"].startswith("Devenir la référence") and cd["echeance"]


def test_parrainage_complet(client, compte):
    _, h = compte()
    filleul = nouvel_email("filleul")
    assert client.post("/api/parrainage/inviter", headers=h, json={"email": filleul}).status_code == 200
    assert client.post("/api/auth/register", json={"email": filleul, "password": MDP}).status_code == 200
    items = client.get("/api/parrainage/mes-filleuls", headers=h).json()["items"]
    assert any(i["email"] == filleul for i in items)


def test_connexions_et_canaux(client, compte):
    _, h = compte()
    for chemin in ("/api/connections", "/api/connections/telegram/status", "/api/connections/whatsapp/status"):
        r = client.get(chemin, headers=h)
        assert r.status_code in (200, 404), (chemin, r.status_code)
        assert r.status_code != 500


def test_statut_ia_et_alias_mammouth(client, compte, env):
    _, h = compte()
    assert client.get("/api/ia/statut", headers=h).json()["ia_active"] is False
    env(MAMMOUTH_API_KEY="cle-test")
    assert client.get("/api/ia/statut", headers=h).json()["ia_active"] is True
    integ = client.get("/api/integrations/status", headers=h).json()["integrations"]
    assert next(i for i in integ if i["id"] == "mammouth")["configured"] is True
