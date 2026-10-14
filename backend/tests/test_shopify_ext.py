import base64, hashlib, hmac
from shopify_ext import regrouper_par_vendeur, statut_commande, verifier_hmac


def test_statuts():
    assert statut_commande("pending", None) == "en_attente"
    assert statut_commande("partially_paid", None) == "en_attente"
    assert statut_commande("authorized", None) == "autorise"
    assert statut_commande("paid", None) == "paye"
    assert statut_commande("paid", "fulfilled") == "expedie"
    assert statut_commande("paid", "fulfilled", "2026-10-01T10:00:00Z") == "annule"
    assert statut_commande("refunded", "fulfilled") == "rembourse"
    assert statut_commande("voided", None) == "annule"
    assert statut_commande(None, None) == "en_attente"


def test_hmac():
    corps, secret = b'{"id":1}', "s3cret"
    ok = base64.b64encode(hmac.new(secret.encode(), corps, hashlib.sha256).digest()).decode()
    assert verifier_hmac(corps, ok, secret)
    assert not verifier_hmac(corps, ok, "autre")
    assert not verifier_hmac(b'{"id":2}', ok, secret)
    assert not verifier_hmac(corps, "", secret)
    assert not verifier_hmac(corps, ok, "")


def test_regroupement_mono_vendeur_reprend_le_total():
    p = {"total_price": "29.90", "line_items": [{"product_id": 1, "quantity": 2, "price": "12.00", "title": "A"}]}
    r = regrouper_par_vendeur(p, {"gid://shopify/Product/1": "u1"})
    assert list(r) == ["u1"] and r["u1"]["montant"] == "29.90" and r["u1"]["lignes"][0]["quantite"] == 2


def test_regroupement_multi_vendeurs():
    p = {"total_price": "50.00", "line_items": [
        {"product_id": 1, "quantity": 1, "price": "10.00", "title": "A"},
        {"product_id": 2, "quantity": 2, "price": "15.00", "title": "B"},
        {"product_id": 3, "quantity": 1, "price": "5.00", "title": "Zayado"}]}
    r = regrouper_par_vendeur(p, {"gid://shopify/Product/1": "u1", "gid://shopify/Product/2": "u2"})
    assert r["u1"]["montant"] == "10.00" and r["u2"]["montant"] == "30.00" and r[""]["montant"] == "5.00"
