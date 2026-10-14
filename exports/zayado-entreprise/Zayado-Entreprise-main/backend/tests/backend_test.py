"""Backend tests for Zayado: /api/leads and /api/checkout (demo/simule mode)."""
import os
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://clarity-tunnel.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"


@pytest.fixture(scope="module")
def mongo():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


# ---- Health ----
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("message") == "Hello World"


# ---- Leads ----
class TestLeads:
    def test_lead_demo_mode_stores_in_mongo(self, mongo):
        email = "test_zayado@example.com"
        r = requests.post(f"{API}/leads", json={"email": email, "prenom": "Alice", "source": "newsletter-journal"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert data.get("mode") == "demo"  # no BREVO_API_KEY configured
        # verify persistence
        doc = mongo.leads.find_one({"email": email})
        assert doc is not None
        assert doc["prenom"] == "Alice"
        assert doc["source"] == "newsletter-journal"
        # cleanup
        mongo.leads.delete_one({"email": email})

    def test_lead_invalid_email(self):
        r = requests.post(f"{API}/leads", json={"email": "notanemail"})
        assert r.status_code == 400

    def test_lead_upsert(self, mongo):
        email = "test_upsert@example.com"
        requests.post(f"{API}/leads", json={"email": email, "prenom": "A", "source": "s1"})
        requests.post(f"{API}/leads", json={"email": email, "prenom": "B", "source": "s2"})
        docs = list(mongo.leads.find({"email": email}))
        assert len(docs) == 1
        assert docs[0]["prenom"] == "B"
        mongo.leads.delete_one({"email": email})


# ---- Checkout ----
class TestCheckout:
    def test_checkout_simule_mode_multi_items(self, mongo):
        payload = {
            "items": [
                {"product_id": "fauteuil", "quantity": 2},
                {"product_id": "mug", "quantity": 1},
            ],
            "client": {"nom": "Test", "email": "test@example.com"},
        }
        r = requests.post(f"{API}/checkout", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("mode") == "simule"
        assert data.get("total") == 349 * 2 + 18  # 716
        assert data.get("ref", "").startswith("ZYD-")
        # verify order in mongo
        order = mongo.orders.find_one({"ref": data["ref"]})
        assert order is not None
        assert order["total"] == 716
        assert order["status"] == "created"
        mongo.orders.delete_one({"ref": data["ref"]})

    def test_checkout_single_item(self, mongo):
        r = requests.post(f"{API}/checkout", json={"items": [{"product_id": "lampe", "quantity": 1}]})
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 89
        mongo.orders.delete_one({"ref": data["ref"]})

    def test_checkout_unknown_product(self):
        r = requests.post(f"{API}/checkout", json={"items": [{"product_id": "ghost", "quantity": 1}]})
        assert r.status_code == 400
        assert "inconnu" in r.json().get("detail", "").lower()

    def test_checkout_catalogue_prices(self):
        # ensure all expected products exist in catalogue
        expected = {"fauteuil": 349, "lampe": 89, "vegetal": 59, "carnet": 34,
                    "plaid": 69, "casque": 199, "planner": 29, "mug": 18,
                    "box-hiver": 79, "box-ete": 89}
        for pid, price in expected.items():
            r = requests.post(f"{API}/checkout", json={"items": [{"product_id": pid, "quantity": 1}]})
            assert r.status_code == 200, f"{pid} failed"
            assert r.json()["total"] == price, f"{pid} price mismatch"


# ---- Order status ----
class TestOrderStatus:
    def test_order_status_invalid_id(self):
        r = requests.get(f"{API}/orders/notanid/payment-status")
        assert r.status_code == 400

    def test_order_status_not_found(self):
        r = requests.get(f"{API}/orders/507f1f77bcf86cd799439011/payment-status")
        assert r.status_code == 404


# ---- Mollie webhook ----
class TestWebhook:
    def test_webhook_invalid(self):
        r = requests.post(f"{API}/mollie/webhook", data={"id": "bad"})
        assert r.status_code == 400
