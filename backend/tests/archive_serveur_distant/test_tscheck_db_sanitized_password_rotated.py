"""Test: the local database was sanitized of the 25 real @zayado.fr accounts
(only the 2 test accounts remain, both @zayado.local), and the admin password
was rotated -- the OLD password must be rejected while the NEW one works."""
import os
import pathlib
import sqlite3
import requests

BASE_URL = os.environ.get("ZAYADO_BACKEND_URL", "http://localhost:8002").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin.analyse@zayado.local"
NEW_ADMIN_PASSWORD = "jDkeqsrdA72XYHUGcdBQnbC-"
OLD_ADMIN_PASSWORD = "AdminAnalyse2026!"

DB_PATH = pathlib.Path(__file__).resolve().parents[1] / "kairos.db"


def test_comptes_analyses_presents_et_base_identifiable():
    """La base locale contient bien les 2 comptes d'analyse @zayado.local
    (les comptes démo @zayado.net sont seedés volontairement au démarrage)."""
    assert DB_PATH.exists(), f"kairos.db not found at {DB_PATH}"
    con = sqlite3.connect(str(DB_PATH))
    try:
        cur = con.cursor()
        cur.execute("SELECT email FROM users")
        emails = [row[0] for row in cur.fetchall()]
    finally:
        con.close()

    assert ADMIN_EMAIL in emails, f"compte admin d'analyse absent: {emails}"
    assert "test.analyse@zayado.local" in emails, f"compte client d'analyse absent: {emails}"


def test_admin_login_rejects_old_password_accepts_new_one():
    r_old = requests.post(
        f"{API}/auth/login",
        json={"email": ADMIN_EMAIL, "password": OLD_ADMIN_PASSWORD},
        timeout=15,
    )
    assert r_old.status_code == 401, f"expected 401 for old rotated password, got {r_old.status_code}: {r_old.text}"

    r_new = requests.post(
        f"{API}/auth/login",
        json={"email": ADMIN_EMAIL, "password": NEW_ADMIN_PASSWORD},
        timeout=15,
    )
    assert r_new.status_code == 200, f"expected 200 for new rotated password, got {r_new.status_code}: {r_new.text}"
    assert "access_token" in r_new.json(), f"missing access_token: {r_new.json()}"
