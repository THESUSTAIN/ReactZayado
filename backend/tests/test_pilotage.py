"""Cache IA, objectifs illisibles, charge de travail, webhook Make (fonctions pures)."""
import pilotage_ext as p
import server


def test_objectifs_illisibles_refuses():
    for t in ("bb", "bébé", "aaaaaa", "123", "", "zzz kkk", "CA 10k"):
        assert not server._objectif_comprehensible(t), t


def test_objectifs_lisibles_acceptes():
    for t in ("Signer 5 nouveaux clients d'ici 90 jours", "Doubler mon CA", "Croissance", "Lancer mon site"):
        assert server._objectif_comprehensible(t), t


def test_message_objectif_flou_cite_l_objectif():
    m = server._message_objectif_flou(["bb"])
    assert "« bb »" in m and "Reformule" in m


def test_webhook_make_seulement_officiel():
    assert p.url_make_valide("https://hook.eu1.make.com/abc123xyz")
    assert p.url_make_valide("https://hook.integromat.com/abc123")
    assert not p.url_make_valide("http://hook.eu1.make.com/abc123xyz")             # pas de http
    assert not p.url_make_valide("https://evil.com/hook.eu1.make.com/abc123")
    assert not p.url_make_valide("https://hook.eu1.make.com.evil.com/abc123")
    assert not p.url_make_valide("")


def test_niveaux_de_charge():
    assert p.niveau_charge(0, 60, None, None, None)["niveau"] == "leger"
    assert p.niveau_charge(10, 200, 3, 3, 3)["niveau"] == "soutenu"
    assert p.niveau_charge(20, 300, 4, 2, 2)["niveau"] == "eleve"


def test_conseil_delegation_selon_equipe():
    seul = p.conseil_charge("eleve", 0, "Pierre")
    equipe = p.conseil_charge("eleve", 2, "Pierre")
    assert seul.startswith("Pierre,") and "délègue" in seul
    assert "ton équipe" in equipe
    assert p.conseil_charge("eleve", 0).startswith("Tu ")


def test_empreinte_stable_et_sensible_au_contexte():
    assert p.empreinte("a") == p.empreinte("a")
    assert p.empreinte("a") != p.empreinte("b")
