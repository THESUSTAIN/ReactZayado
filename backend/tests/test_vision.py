"""Vision Board V1 backend tests + regression."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if not BASE_URL:
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip()
BASE_URL = BASE_URL.rstrip('/')
API = f"{BASE_URL}/api"


# ─────── Board ───────
def test_board_get_and_put_roundtrip():
    # Reset to empty first
    r = requests.put(f"{API}/vision/board", json={"cards": []}, timeout=15)
    assert r.status_code == 200

    r = requests.get(f"{API}/vision/board", timeout=15)
    assert r.status_code == 200
    assert r.json()["cards"] == []

    cards = [
        {"id": "c1", "type": "note", "x": 100, "y": 200, "w": 220, "h": 130,
         "color": "#DEC2A3", "title": {"fr": "Ma vision"}, "body": {"fr": "Tester."}}
    ]
    r = requests.put(f"{API}/vision/board", json={"cards": cards}, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True and body["count"] == 1

    r = requests.get(f"{API}/vision/board", timeout=15)
    assert r.status_code == 200
    got = r.json()["cards"]
    assert len(got) == 1
    assert got[0]["id"] == "c1"
    assert got[0]["x"] == 100 and got[0]["y"] == 200


# ─────── Wheel ───────
def test_wheel_defaults_and_bien_etre_from_checkin():
    # Seed a checkin so 'Bien-être' should reflect energy avg
    # Reset wheel row so defaults recompute
    # We can only PUT to change, but let's post a checkin then GET
    r = requests.post(f"{API}/checkins", json={"energie": 4, "charge": 3}, timeout=15)
    assert r.status_code == 200

    r = requests.get(f"{API}/vision/wheel", timeout=15)
    assert r.status_code == 200
    data = r.json()
    pillars = data["pillars"]
    names = [p["name"] for p in pillars]
    for expected in ["Croissance", "Bien-être", "Finances", "Relations", "Développement", "Rayonnement"]:
        assert expected in names, f"Missing pillar {expected} in {names}"
    assert len(pillars) == 6


def test_wheel_put_persists():
    new_pillars = [
        {"name": "Croissance", "score": 10, "color": "#2FB89A"},
        {"name": "Bien-être", "score": 20, "color": "#DEC2A3"},
        {"name": "Finances", "score": 30, "color": "#4a6a9e"},
        {"name": "Relations", "score": 40, "color": "#E0669A"},
        {"name": "Développement", "score": 50, "color": "#8b6fbf"},
        {"name": "Rayonnement", "score": 60, "color": "#4AC0E0"},
    ]
    r = requests.put(f"{API}/vision/wheel", json={"pillars": new_pillars}, timeout=15)
    assert r.status_code == 200
    r = requests.get(f"{API}/vision/wheel", timeout=15)
    assert r.status_code == 200
    scores = {p["name"]: p["score"] for p in r.json()["pillars"]}
    assert scores["Croissance"] == 10
    assert scores["Rayonnement"] == 60


# ─────── Roadmap CRUD ───────
def test_roadmap_crud():
    # Create
    r = requests.post(f"{API}/vision/roadmap", json={"quarter": "q1", "titre": f"TEST_{uuid.uuid4()}"}, timeout=15)
    assert r.status_code == 200
    item = r.json()
    assert item["quarter"] == "q1"
    assert item["done"] is False
    item_id = item["id"]

    # Grouped GET
    r = requests.get(f"{API}/vision/roadmap", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert set(data.keys()) == {"q1", "q2", "q3", "q4"}
    assert any(x["id"] == item_id for x in data["q1"])

    # Toggle done
    r = requests.patch(f"{API}/vision/roadmap/{item_id}", json={"done": True}, timeout=15)
    assert r.status_code == 200
    assert r.json()["done"] is True

    # Delete
    r = requests.delete(f"{API}/vision/roadmap/{item_id}", timeout=15)
    assert r.status_code == 200
    assert r.json()["ok"] is True

    r = requests.delete(f"{API}/vision/roadmap/{item_id}", timeout=15)
    assert r.status_code == 404


# ─────── Starter templates ───────
def test_starter_templates():
    r = requests.get(f"{API}/vision/starter-templates", timeout=15)
    assert r.status_code == 200
    tpls = r.json()["templates"]
    ids = [t["id"] for t in tpls]
    assert "vision-2026" in ids and "plan-90j" in ids
    for t in tpls:
        assert isinstance(t.get("cards"), list) and len(t["cards"]) >= 1


# ─────── AI endpoints ───────
def test_ai_doc():
    r = requests.post(f"{API}/vision/ai-doc",
                      json={"prompt": "Comment structurer ma semaine", "doc_type": "note"},
                      timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["doc_type"] == "note"
    assert isinstance(data["title"], str) and data["title"]
    assert isinstance(data["content"], str) and data["content"].strip()


def test_generate_board():
    r = requests.post(f"{API}/vision/generate-board",
                      json={"prompt": "Ma vision : indépendance, calme, impact."},
                      timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    cards = data["cards"]
    assert isinstance(cards, list) and len(cards) >= 1
    assert all(c["type"] == "note" for c in cards)


def test_inspire():
    r = requests.post(f"{API}/vision/inspire", timeout=45)
    assert r.status_code == 200
    data = r.json()
    assert data.get("quote") and data.get("author")


# ─────── Regression ───────
def test_regression_state():
    r = requests.get(f"{API}/state", timeout=15)
    assert r.status_code == 200


def test_regression_checkins():
    r = requests.post(f"{API}/checkins", json={"energie": 3, "charge": 3}, timeout=15)
    assert r.status_code == 200


def test_regression_copilote_decisions():
    r = requests.get(f"{API}/copilote/decisions", timeout=15)
    assert r.status_code == 200
