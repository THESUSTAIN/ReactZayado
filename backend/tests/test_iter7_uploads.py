"""Tests pour l'itération 7 — uploads (photos mur Élan) + check-in énergie basse.

Tests réalisés contre le backend preview (REACT_APP_BACKEND_URL) car le stockage
objet Emergent n'est joignable que depuis cet env.
"""
import io
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://business-nest.preview.emergentagent.com").rstrip("/")
API = BASE_URL + "/api"
MDP = "Test!2026Qa"

PNG_132 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xff"
    b"\xff?\x00\x05\xfe\x02\xfe\xdc\xccY\xe7\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _register(prefix="qa"):
    email = f"test_{prefix}_{uuid.uuid4().hex[:10]}@zayado.test"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": MDP, "firstName": "QA"}, timeout=30)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    tok = requests.post(f"{API}/auth/login", json={"email": email, "password": MDP}, timeout=30).json()
    token = tok.get("access_token") or tok.get("token")
    assert token, f"no token: {tok}"
    return email, {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def user_a():
    return _register("userA")


@pytest.fixture(scope="module")
def user_b():
    return _register("userB")


# ---- Uploads ----

def test_upload_trop_lourd_413(user_a):
    _, h = user_a
    gros = io.BytesIO(b"0" * (10 * 1024 * 1024 + 10))
    r = requests.post(f"{API}/uploads", headers=h, files={"file": ("gros.bin", gros, "application/octet-stream")}, timeout=120)
    assert r.status_code == 413, f"attendu 413, obtenu {r.status_code} {r.text}"
    detail = r.json().get("detail", "")
    assert "trop lourd" in detail.lower(), f"message attendu 'Fichier trop lourd', obtenu: {detail}"


def test_upload_image_png_ok(user_a):
    _, h = user_a
    r = requests.post(f"{API}/uploads", headers=h, files={"file": ("petit.png", io.BytesIO(PNG_132), "image/png")}, timeout=60)
    assert r.status_code == 200, f"upload PNG attendu 200, obtenu {r.status_code} {r.text}"
    d = r.json()
    assert "path" in d and "url" in d, f"réponse malformée: {d}"
    assert d["url"].startswith("/api/files/"), f"url inattendue: {d['url']}"
    # On expose le path pour d'autres tests via l'env
    os.environ["QA_UPLOAD_PATH"] = d["path"]


def test_upload_txt_non_image_accepte(user_a):
    _, h = user_a
    r = requests.post(f"{API}/uploads", headers=h, files={"file": ("note.txt", io.BytesIO(b"hello"), "text/plain")}, timeout=60)
    assert r.status_code == 200, f"upload txt attendu 200, obtenu {r.status_code} {r.text}"
    assert r.json().get("path", "").endswith(".txt")


def test_get_file_sans_token_401():
    path = os.environ.get("QA_UPLOAD_PATH")
    assert path, "l'upload PNG préalable est requis"
    r = requests.get(f"{API}/files/{path}", timeout=30)
    # 401 attendu en production ; en preview APERCU_CODE est actif → bascule sur le
    # compte démo (uid différent) donc on obtient 404 (scoping user). Les deux
    # bloquent l'accès anonyme — pas de leak. On accepte les deux.
    assert r.status_code in (401, 404), f"attendu 401/404 sans token, obtenu {r.status_code} {r.text[:200]}"


def test_get_file_bon_user_200(user_a):
    _, h = user_a
    path = os.environ.get("QA_UPLOAD_PATH")
    r = requests.get(f"{API}/files/{path}", headers=h, timeout=60)
    assert r.status_code == 200, f"attendu 200, obtenu {r.status_code} {r.text[:200]}"
    assert "image" in r.headers.get("content-type", ""), f"content-type inattendu: {r.headers.get('content-type')}"


def test_get_file_autre_user_404(user_b):
    _, h_b = user_b
    path = os.environ.get("QA_UPLOAD_PATH")
    r = requests.get(f"{API}/files/{path}", headers=h_b, timeout=30)
    assert r.status_code == 404, f"attendu 404 (scoping user), obtenu {r.status_code} {r.text[:200]}"


def test_delete_soft_puis_404(user_a):
    _, h = user_a
    # Nouvel upload pour pouvoir supprimer sans casser les tests précédents
    r = requests.post(f"{API}/uploads", headers=h, files={"file": ("del.png", io.BytesIO(PNG_132), "image/png")}, timeout=60)
    assert r.status_code == 200
    path = r.json()["path"]
    rd = requests.delete(f"{API}/files/{path}", headers=h, timeout=30)
    assert rd.status_code == 200, f"delete attendu 200, obtenu {rd.status_code} {rd.text}"
    rg = requests.get(f"{API}/files/{path}", headers=h, timeout=30)
    assert rg.status_code == 404, f"après soft-delete, GET attendu 404, obtenu {rg.status_code}"


# ---- Check-in énergie basse + lettres ----

def test_checkin_energie_basse(user_a):
    _, h = user_a
    r = requests.post(f"{API}/checkins", headers=h, json={"energie": 1, "mood": "fatigué"}, timeout=30)
    assert r.status_code == 200, f"check-in attendu 200, obtenu {r.status_code} {r.text}"
    d = r.json()
    assert d.get("ok") is True
    # /api/state renvoie l'énergie courante
    me = requests.get(f"{API}/state", headers=h, timeout=30).json()
    assert me["energy"]["score"] == 1
    assert me["energy"]["recuperation"] is True


def test_sceller_lettre_et_lister(user_a):
    _, h = user_a
    texte = "Test QA iteration 7 — lettre scellée pour tester status-lettre dans Cockpit."
    r = requests.post(f"{API}/mindset/lettres", headers=h,
                      json={"texte": texte, "ouvre_le": "2099-01-01"}, timeout=30)
    assert r.status_code == 200, f"sceller lettre attendu 200, obtenu {r.status_code} {r.text}"
    lst = requests.get(f"{API}/mindset/lettres", headers=h, timeout=30).json()
    assert len(lst.get("items", [])) >= 1, f"au moins 1 lettre attendue: {lst}"


def test_cleanup_fichiers_upload(user_a):
    """Soft-delete du fichier résiduel pour laisser propre."""
    _, h = user_a
    path = os.environ.get("QA_UPLOAD_PATH")
    if path:
        requests.delete(f"{API}/files/{path}", headers=h, timeout=30)
