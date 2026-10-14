"""Test: admin notification test (cloche + push) and notifications sante, plus
protection of admin endpoints against non-admin/anonymous callers.
"""
import os

import requests

BASE_URL = os.environ.get("ZAYADO_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "polezayado@gmail.com"
ADMIN_PASSWORD = "Admin!2026"
SOLO_EMAIL = "test.solo@zayado.net"
SOLO_PASSWORD = "Test!2026"


def _token(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()["access_token"]


def test_admin_notifications_test_endpoint_cloche_push():
    token = _token(ADMIN_EMAIL, ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {token}"}

    r = requests.post(
        f"{API}/admin/notifications/test",
        json={"email": "test.pro@zayado.net", "canaux": ["cloche", "push"]},
        headers=headers,
        timeout=20,
    )
    assert r.status_code == 200, f"notif test failed: {r.status_code} {r.text}"
    data = r.json()
    canaux = data.get("canaux", {})
    assert canaux.get("cloche", {}).get("ok") is True, f"expected cloche.ok True, got: {canaux}"
    assert "aucun appareil abonné" in canaux.get("push", {}).get("detail", ""), \
        f"expected push detail mentioning 'aucun appareil abonné' (no device in this env), got: {canaux}"


def test_admin_notifications_sante():
    token = _token(ADMIN_EMAIL, ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {token}"}

    r = requests.get(f"{API}/admin/notifications/sante", headers=headers, timeout=20)
    assert r.status_code == 200, f"sante failed: {r.status_code} {r.text}"
    data = r.json()
    push = data.get("push", {})
    assert push.get("ok") is True, f"expected push.ok True (VAPID configured), got: {push}"
    assert push.get("probleme") is None, f"expected push.probleme None, got: {push}"


def test_admin_notifications_test_rejects_non_admin_and_anonymous():
    solo_token = _token(SOLO_EMAIL, SOLO_PASSWORD)
    r = requests.post(
        f"{API}/admin/notifications/test",
        json={"email": "test.pro@zayado.net", "canaux": ["cloche"]},
        headers={"Authorization": f"Bearer {solo_token}"},
        timeout=15,
    )
    assert r.status_code == 403, f"expected 403 for non-admin, got {r.status_code}: {r.text}"

    r2 = requests.post(
        f"{API}/admin/notifications/test",
        json={"email": "test.pro@zayado.net", "canaux": ["cloche"]},
        timeout=15,
    )
    assert r2.status_code in (401, 403), f"expected 401/403 without token, got {r2.status_code}: {r2.text}"
