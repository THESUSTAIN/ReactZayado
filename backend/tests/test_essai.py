"""Modèle tarifaire : plus d'offre gratuite, essai Solo « 1 mois pour 1 € » (paiement Mollie simulé)."""
from datetime import datetime, timezone


def test_nouveau_compte_sans_acces_mais_essai_disponible(client, compte):
    _, h = compte()
    a = client.get("/api/abonnement", headers=h).json()
    assert a["acces"] == "aucun" and a["essai"]["disponible"] is True and a["essai"]["prix"] == 1


def test_essai_un_euro_active_solo_30_jours_et_reserve_le_fondateur(client, compte, env, faux):
    env(MOLLIE_API_KEY="test_cle")
    _, h = compte()
    r = client.post("/api/checkout", headers=h, json={"plan": "serenite", "essai": True})
    assert r.status_code == 200, r.text
    pid = r.json()["paymentId"]
    assert faux.mollie[pid]["amount"] == {"currency": "EUR", "value": "1.00"}
    faux.payes.add(pid)
    assert client.post("/api/mollie/webhook", data={"id": pid}).status_code == 200
    a = client.get("/api/abonnement", headers=h).json()
    assert a["acces"] == "actif" and a["en_essai"] is True and a["plan"] == "serenite"
    jours = (datetime.fromisoformat(a["fin"]) - datetime.now(timezone.utc)).days
    assert 58 <= jours <= 60  # essai = 2 mois
    assert a["fondateur"] is True            # prix fondateur réservé pour la suite
    assert a["essai"]["disponible"] is False
    # Un seul essai par compte
    assert client.post("/api/checkout", headers=h, json={"plan": "serenite", "essai": True}).status_code == 409


def test_essai_un_euro_reserve_a_solo(client, compte, env):
    env(MOLLIE_API_KEY="test_cle")
    _, h = compte()
    assert client.post("/api/checkout", headers=h, json={"plan": "pro", "essai": True}).status_code == 400
    assert client.post("/api/checkout", headers=h, json={"plan": "reveur", "essai": True}).status_code == 400
    assert client.get("/api/abonnement", headers=h).json()["essai"]["plans"] == ["serenite"]


def test_reveur_gratuit_un_mois_sans_carte(client, compte):
    _, h = compte()
    assert client.get("/api/abonnement", headers=h).json()["essai"]["reveur_gratuit_jours"] == 30
    r = client.post("/api/essai-reveur", headers=h)
    assert r.status_code == 200, r.text
    a = client.get("/api/abonnement", headers=h).json()
    assert a["acces"] == "actif" and a["plan"] == "reveur" and a["en_essai"] is True
    from datetime import datetime, timezone
    jours = (datetime.fromisoformat(a["fin"]) - datetime.now(timezone.utc)).days
    assert 28 <= jours <= 30
    # une seule période d'essai par compte : ni un 2e Rêveur gratuit, ni l'essai Solo à 1 € ensuite
    assert client.post("/api/essai-reveur", headers=h).status_code == 409
    assert a["essai"]["disponible"] is False


def test_roles_internes_ont_acces(client, compte):
    _, h = compte(role="vendeur")
    assert client.get("/api/abonnement", headers=h).json()["acces"] == "actif"


def test_offre_normale_toujours_payante(client, compte, env, faux):
    env(MOLLIE_API_KEY="test_cle")
    _, h = compte()
    r = client.post("/api/checkout", headers=h, json={"plan": "pro", "cycle": "mensuel"})
    assert r.status_code == 200
    assert float(faux.mollie[r.json()["paymentId"]]["amount"]["value"]) > 1
