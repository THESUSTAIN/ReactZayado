"""Vision Board : boards, aperçus, images IA."""


def test_boards_et_apercu(client, compte):
    _, h = compte()
    cartes = [{"id": "w1", "type": "wall", "x": 100, "y": 100, "w": 500, "title": "Cap", "color": "#60A5FA"},
              {"id": "n1", "type": "note", "parent": "w1", "order": 0},
              {"id": "s1", "type": "sticky", "x": 700, "y": 120, "w": 240, "h": 220}]
    assert client.put("/api/vision/board?board=perso", headers=h, json={"cards": cartes}).status_code == 200
    boards = client.get("/api/vision/boards", headers=h).json()["boards"]
    perso = next(b for b in boards if b["key"] == "perso")
    assert perso["count"] == 3 and len(perso["apercu"]) == 2  # le mur + la note libre (l'enfant est dans le mur)


def test_creer_un_board(client, compte):
    _, h = compte()
    r = client.post("/api/vision/boards", headers=h, json={"nom": "Lancement offre", "emoji": "🧭"})
    assert r.status_code == 200
    assert any(b["nom"] == "Lancement offre" for b in client.get("/api/vision/boards", headers=h).json()["boards"])


def test_image_ia_sans_cle_message_clair(client, compte):
    _, h = compte()
    r = client.post("/api/vision/image", headers=h, json={"prompt": "un phare au lever du soleil"})
    assert r.status_code == 503


def test_image_ia_via_mammouth(client, compte, env, faux):
    env(MAMMOUTH_API_KEY="cle-test")
    _, h = compte()
    r = client.post("/api/vision/image", headers=h, json={"prompt": "un phare au lever du soleil"})
    assert r.status_code == 200, r.text
    img = client.get(f"/api/vision/images/{r.json()['id']}")
    assert img.status_code == 200 and img.content.startswith(b"\x89PNG")
    assert any("mammouth" in a[1] for a in faux.appels)
