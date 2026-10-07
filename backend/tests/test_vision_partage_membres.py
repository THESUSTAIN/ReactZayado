"""« Partager mes boards » : les membres de Ton entreprise sont proposés ; le partage reste un choix explicite."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tests.test_entreprise import _equipe  # noqa: E402


def test_membres_proposes_puis_partage(client, compte):
    a = _equipe(client, compte)
    c = client.get("/api/vision/contacts-partage", headers=a["proprietaire"]).json()["contacts"]
    origines = {x["origine"] for x in c}
    assert "Ton entreprise" in origines and len(c) >= 3
    moi = client.get("/api/auth/me", headers=a["proprietaire"]).json()["email"].lower()
    assert all(x["email"] != moi for x in c)  # on ne se propose pas soi-même
    cible = next(x["email"] for x in c if x["origine"] == "Ton entreprise")
    # rien n'est partagé tant qu'on ne choisit pas
    assert client.get("/api/vision/boards/perso/invitations", headers=a["proprietaire"]).json()["invitations"] == []
    assert client.post("/api/vision/boards/perso/inviter", json={"email": cible}, headers=a["proprietaire"]).status_code == 200
    inv = client.get("/api/vision/boards/perso/invitations", headers=a["proprietaire"]).json()["invitations"]
    assert [x["email"] for x in inv] == [cible]
    c2 = client.get("/api/vision/contacts-partage", headers=a["proprietaire"]).json()["contacts"]
    assert sum(1 for x in c2 if x["email"] == cible) == 1  # pas de doublon « Ton entreprise » / « Déjà invité »
    # sans entreprise ni équipe : liste vide, pas d'erreur
    _, h = compte()
    assert client.get("/api/vision/contacts-partage", headers=h).json()["contacts"] == []
