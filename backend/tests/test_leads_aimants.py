# Tests for lead capture + lead magnet (aimant) delivery, and PDF static serving.
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://projet-creation-1.preview.emergentagent.com").rstrip("/")


def _email():
    return f"TEST_lead_{uuid.uuid4().hex[:10]}@example.com"


class TestLeadsAimants:
    def test_lead_with_valid_aimant_tresorerie(self):
        r = requests.post(f"{BASE_URL}/api/leads", json={"email": _email(), "source": "pytest", "aimant": "tresorerie"}, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert data["guide"] == "/aimants/zayado-aimant-tresorerie.pdf"
        assert "trésorerie" in data["titre"].lower() or "tresorerie" in data["titre"].lower()

    def test_lead_with_valid_aimant_rituel(self):
        r = requests.post(f"{BASE_URL}/api/leads", json={"email": _email(), "source": "pytest", "aimant": "rituel"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["guide"] == "/aimants/zayado-aimant-rituel.pdf"
        assert "rituel" in data["titre"].lower()

    def test_lead_with_valid_aimant_lumiere(self):
        r = requests.post(f"{BASE_URL}/api/leads", json={"email": _email(), "source": "pytest", "aimant": "lumiere"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["guide"] == "/aimants/zayado-aimant-lumiere.pdf"
        assert "lumière" in data["titre"].lower() or "lumiere" in data["titre"].lower()

    def test_lead_without_aimant(self):
        r = requests.post(f"{BASE_URL}/api/leads", json={"email": _email(), "source": "pytest"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data == {"ok": True}

    def test_lead_with_invalid_aimant(self):
        r = requests.post(f"{BASE_URL}/api/leads", json={"email": _email(), "source": "pytest", "aimant": "inconnu"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        # invalid aimant → treated as no aimant, no guide returned
        assert data == {"ok": True}

    def test_lead_without_at_sign_returns_422(self):
        r = requests.post(f"{BASE_URL}/api/leads", json={"email": "sanssigne", "source": "pytest"}, timeout=15)
        assert r.status_code == 422, r.text


class TestAimantPdfServed:
    @pytest.mark.parametrize("slug", ["tresorerie", "rituel", "lumiere"])
    def test_pdf_served(self, slug):
        url = f"{BASE_URL}/aimants/zayado-aimant-{slug}.pdf"
        r = requests.get(url, timeout=20, allow_redirects=True)
        assert r.status_code == 200, f"{url} → {r.status_code}"
        ctype = r.headers.get("content-type", "").lower()
        assert "pdf" in ctype or r.content[:4] == b"%PDF", f"content-type={ctype}, head={r.content[:8]}"
        assert len(r.content) > 500
