"""−30 % TheSustain par CODE membre (sans attendre le SSO) : la grille le reçoit via /abonnement, et le paiement l'applique."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from commerce_ext import est_membre_thesustain  # noqa: E402


def test_est_membre():
    assert est_membre_thesustain({"thesustain_code": True}) and est_membre_thesustain({"thesustain_sso": True})
    assert not est_membre_thesustain({}) and not est_membre_thesustain(None)


def test_code_membre_donne_la_remise_sur_la_grille(client, compte):
    _, h_admin = compte(role="admin")
    r = client.post("/api/admin/codes-promo", json={"code": "THESUSTAIN-TEST", "type": "thesustain"}, headers=h_admin)
    assert r.status_code == 200, r.text
    _, h = compte()
    assert client.get("/api/abonnement", headers=h).json()["remise_thesustain"] == 0
    r = client.post("/api/codes-promo/appliquer", json={"code": "thesustain-test"}, headers=h).json()
    assert r["type"] == "thesustain" and r["remise"] == 0.3
    abo = client.get("/api/abonnement", headers=h).json()
    assert abo["thesustain"] is True and abo["remise_thesustain"] == 0.3
    # ressaisir le code ne consomme pas une 2e utilisation
    assert client.post("/api/codes-promo/appliquer", json={"code": "THESUSTAIN-TEST"}, headers=h).json()["deja"] is True
    items = client.get("/api/admin/codes-promo", headers=h_admin).json()["items"]
    assert next(x for x in items if x["code"] == "THESUSTAIN-TEST")["current_uses"] == 1
