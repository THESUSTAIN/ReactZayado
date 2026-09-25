"""Rituels persistants, série de jours et analyse de la courbe d'énergie."""
from datetime import date, timedelta

from rituels_ext import analyse_semaine, calcul_serie


def test_rituel_coche_compte_dans_la_serie(client, compte):
    _, h = compte()
    assert client.get("/api/serie", headers=h).json()["jours"] == 0
    r = client.post("/api/rituels/r1/basculer", headers=h).json()
    assert r["fait"] is True and r["serie"]["jours"] == 1 and r["serie"]["aujourdhui_fait"] is True
    assert client.get("/api/rituels", headers=h).json()["faits"] == ["r1"]
    # décocher retire le geste du jour
    assert client.post("/api/rituels/r1/basculer", headers=h).json()["serie"]["jours"] == 0
    assert client.post("/api/rituels/zz/basculer", headers=h).status_code == 404


def test_checkin_compte_aussi(client, compte):
    _, h = compte()
    client.post("/api/checkins", headers=h, json={"energie": 4})
    assert client.get("/api/serie", headers=h).json()["jours"] == 1


def test_calcul_serie_reste_ouverte_jusqu_a_minuit():
    auj = date(2026, 9, 25)
    jours = {(auj - timedelta(days=i)).isoformat() for i in (1, 2, 3)} | {"2026-09-01"}
    s = calcul_serie(jours, auj)
    assert s == {"jours": 3, "aujourdhui_fait": False, "record": 3}


def test_analyse_repere_le_jour_creux():
    pts = []
    d0 = date(2026, 8, 31)  # lundi
    for sem in range(4):
        for j, e in enumerate([4, 4, 4, 2, 4, 5, 4]):
            pts.append(((d0 + timedelta(days=sem * 7 + j)).isoformat(), e))
    a = analyse_semaine(pts)
    assert a["creux"]["jour"] == "jeudi" and "planifie léger" in a["creux"]["conseil"]


def test_courbe_energie_jours_reels(client, compte):
    _, h = compte()
    client.post("/api/checkins", headers=h, json={"energie": 3})
    c = client.get("/api/bien-etre/energie", headers=h).json()
    assert len(c["semaine"]) == 7 and c["semaine"][-1]["energie"] == 3 and c["semaine"][-1]["date"] == date.today().isoformat()
