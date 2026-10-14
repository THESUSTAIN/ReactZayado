"""Offre Équipe : « Ton entreprise » incluse, 5 personnes dirigeant compris ; Entreprise : sans limite."""
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import server  # noqa: E402
from sqlalchemy import select  # noqa: E402


def _abonner(client, email, plan):
    async def f():
        async with server.async_session() as db:
            u = (await db.execute(select(server.User).where(server.User.email == email))).scalar_one()
            a = await db.get(server.Abonnement, u.id) or server.Abonnement(user_id=u.id)
            a.plan, a.cycle, a.fin = plan, "mensuel", datetime.now(timezone.utc) + timedelta(days=30)
            db.add(a)
            await db.commit()
    client.portal.call(f)


def test_equipe_cinq_personnes_puis_entreprise(client, compte):
    email, h = compte()
    _abonner(client, email, "business")
    assert client.post("/api/entreprise/activer", json={"nom": "TPE Test"}, headers=h).status_code == 200
    p = client.get("/api/entreprise/moi", headers=h).json()["places"]
    assert p == {"utilisees": 1, "limite": 5}
    for i in range(4):  # dirigeant + 4 = 5
        assert client.post("/api/entreprise/membres", json={"role": "membre", "nom": f"P{i}"}, headers=h).status_code == 200
    r = client.post("/api/entreprise/membres", json={"role": "membre", "nom": "P5"}, headers=h)
    assert r.status_code == 402 and "Entreprise" in r.json()["detail"]
    # un partenaire (externe, lecture seule) ne prend pas de place
    assert client.post("/api/entreprise/membres", json={"role": "partenaire", "nom": "Client"}, headers=h).status_code == 200
    # passage à l'offre Entreprise : plus de limite
    _abonner(client, email, "entreprise")
    assert client.post("/api/entreprise/membres", json={"role": "membre", "nom": "P5"}, headers=h).status_code == 200
    assert client.get("/api/entreprise/moi", headers=h).json()["places"]["limite"] is None
