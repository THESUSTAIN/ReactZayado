"""Treasury (Pilotage) import criteria, grouped in one module so pytest-xdist's
loadscope runs them sequentially in the same worker (they share the test.solo
account's import list and must not race each other).

- Crédit Agricole style bank statement (cp1252, preamble lines, Débit/Crédit/Solde columns)
- Qonto CSV (comma separator, English headers, "1.234,56" amounts)
- Invalid file (nom;age columns) rejected with 422 and a French message
- FEC import non-regression via /imports/exemple
"""
import base64
import os

import requests

BASE_URL = os.environ.get("ZAYADO_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"
FIXTURES = "/app/tests/fixtures/releves"

EMAIL = "test.solo@zayado.net"
PASSWORD = "Test!2026"


def _headers():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()


def _dernier_import(body, nom):
    """The POST endpoint returns the whole updated vue; find the just-created
    import by name and latest date_import timestamp."""
    candidats = [i for i in body.get("imports", []) if i.get("nom") == nom]
    assert candidats, f"no import named {nom!r} found in response: {body.get('imports')}"
    return max(candidats, key=lambda i: i.get("date_import", ""))


def test_import_credit_agricole_csv_updates_tresorerie():
    headers = _headers()
    r = requests.post(
        f"{API}/copilote/pilotage/imports",
        json={"nom": "credit-agricole.csv", "contenu_b64": _b64(f"{FIXTURES}/credit-agricole.csv")},
        headers=headers,
        timeout=20,
    )
    assert r.status_code == 200, f"import failed: {r.status_code} {r.text}"
    body = r.json()
    imp = _dernier_import(body, "credit-agricole.csv")
    import_id = imp["id"]

    try:
        assert imp.get("format") == "Relevé bancaire", f"unexpected format: {imp}"
        assert imp.get("lignes") == 2, f"expected 2 lignes, got: {imp}"

        tresorerie = body.get("tresorerie", {})
        assert abs(tresorerie.get("solde", 0) - 6479.50) < 0.01, f"unexpected solde: {tresorerie}"
        assert "solde du relevé" in tresorerie.get("source", ""), f"unexpected source: {tresorerie}"
    finally:
        d = requests.delete(f"{API}/copilote/pilotage/imports/{import_id}", headers=headers, timeout=15)
        assert d.status_code == 200, f"cleanup delete failed: {d.status_code} {d.text}"


def test_import_qonto_csv_updates_tresorerie():
    headers = _headers()
    r = requests.post(
        f"{API}/copilote/pilotage/imports",
        json={"nom": "qonto.csv", "contenu_b64": _b64(f"{FIXTURES}/qonto.csv")},
        headers=headers,
        timeout=20,
    )
    assert r.status_code == 200, f"import failed: {r.status_code} {r.text}"
    body = r.json()
    imp = _dernier_import(body, "qonto.csv")
    import_id = imp["id"]

    try:
        assert imp.get("format") == "Relevé bancaire", f"unexpected format: {imp}"

        tresorerie = body.get("tresorerie", {})
        assert abs(tresorerie.get("solde", 0) - 5204.57) < 0.01, f"unexpected solde: {tresorerie}"
    finally:
        d = requests.delete(f"{API}/copilote/pilotage/imports/{import_id}", headers=headers, timeout=15)
        assert d.status_code == 200, f"cleanup delete failed: {d.status_code} {d.text}"


def test_import_invalid_csv_returns_422_with_french_message():
    headers = _headers()
    before = requests.get(f"{API}/copilote/pilotage/vue", headers=headers, timeout=15).json()
    before_ids = {i.get("id") for i in before.get("imports", [])}

    r = requests.post(
        f"{API}/copilote/pilotage/imports",
        json={"nom": "invalide.csv", "contenu_b64": _b64(f"{FIXTURES}/invalide.csv")},
        headers=headers,
        timeout=20,
    )
    assert r.status_code == 422, f"expected 422 for invalid file, got {r.status_code}: {r.text}"
    msg = r.text
    assert any(mot in msg for mot in ["Date", "Montant", "Débit", "Crédit"]), \
        f"expected French error mentioning Date/Montant/Débit/Crédit, got: {msg}"

    after = requests.get(f"{API}/copilote/pilotage/vue", headers=headers, timeout=15).json()
    after_ids = {i.get("id") for i in after.get("imports", [])}
    assert after_ids == before_ids, f"import list changed after rejected upload: {before_ids} -> {after_ids}"


def test_import_exemple_fec_non_regression():
    headers = _headers()
    r = requests.post(f"{API}/copilote/pilotage/imports/exemple", headers=headers, timeout=20)
    assert r.status_code == 200, f"import exemple failed: {r.status_code} {r.text}"
    body = r.json()
    imp = _dernier_import(body, "Jeu d'essai — FEC 6 mois.txt")
    import_id = imp["id"]

    try:
        assert imp.get("format") == "FEC", f"unexpected format: {imp}"
        assert imp.get("lignes") == 66, f"expected 66 lignes, got: {imp}"

        tresorerie = body.get("tresorerie", {})
        assert tresorerie.get("source") == "comptes 512/53 du FEC", f"unexpected source: {tresorerie}"
    finally:
        d = requests.delete(f"{API}/copilote/pilotage/imports/{import_id}", headers=headers, timeout=15)
        assert d.status_code == 200, f"cleanup delete failed: {d.status_code} {d.text}"
