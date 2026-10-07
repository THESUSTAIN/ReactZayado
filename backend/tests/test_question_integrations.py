"""La question des intégrations : jamais avant la 3e action, « non » = plus jamais, « plus tard » = dans 14 jours."""


def test_question_au_bon_moment(client, compte):
    _, h = compte(plan="pro")
    assert client.get("/api/actions/question-integrations", headers=h).json()["poser"] is False
    for i in range(3):
        client.post("/api/taches", json={"titre": f"Action {i}"}, headers=h)
    r = client.get("/api/actions/question-integrations", headers=h).json()
    assert r.get("actions") == 3, r
    assert r["poser"] is True
    client.put("/api/actions/question-integrations", json={"reponse": "plus_tard"}, headers=h)
    assert client.get("/api/actions/question-integrations", headers=h).json()["poser"] is False
    client.put("/api/actions/question-integrations", json={"reponse": "non"}, headers=h)
    assert client.get("/api/actions/question-integrations", headers=h).json()["poser"] is False
    assert client.put("/api/actions/question-integrations", json={"reponse": "peut-etre"}, headers=h).status_code == 422
