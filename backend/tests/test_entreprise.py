"""Tests de « Ton entreprise » : droits, invitations, absences → présence, contrats, N° de sécu, RGPD.
Fonctions pures + parcours complet sur une base SQLite en mémoire (sans lancer le serveur)."""
import asyncio
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from entreprise_ext import jours_entre, masquer_secu, peut, roles_invitables, secu_valide  # noqa: E402


def test_droits_par_role():
    assert peut("proprietaire", "lire_contrats") and not peut("manager", "lire_contrats")
    assert peut("manager", "decider_absence") and not peut("membre", "decider_absence")
    assert peut("partenaire", "lire_equipe") and not peut("partenaire", "saisir_soi")
    assert peut("prestataire", "saisir_soi") and not peut("prestataire", "gerer_equipe")
    assert not peut("manager", "audit") and not peut("manager", "supprimer_membre")


def test_roles_invitables():
    assert "proprietaire" not in roles_invitables("proprietaire")
    assert roles_invitables("manager") == ("membre", "prestataire", "partenaire")
    assert roles_invitables("membre") == ()


def test_jours_entre_ignore_les_weekends_et_plafonne():
    assert jours_entre("2026-10-05", "2026-10-11") == ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"]
    with pytest.raises(ValueError):
        jours_entre("2026-10-10", "2026-10-01")
    with pytest.raises(ValueError):
        jours_entre("2026-01-01", "2026-06-01")


def test_secu():
    ok = "185057800608491"  # 1 85 05 78 006 084 + clé 91
    assert secu_valide(ok) and secu_valide("1 85 05 78 006 084 91")
    assert not secu_valide("185057800608492") and not secu_valide("123")
    assert masquer_secu(ok).endswith("91") and ok[1:5] not in masquer_secu(ok)


# ───────── Parcours complet (API dans le processus, base SQLite temporaire) ─────────
import server  # noqa: E402


def _equipe(client, compte):
    """Un propriétaire + un membre + un manager + un partenaire qui ont rejoint par lien."""
    _, h_prop = compte(role="vendeur")
    assert client.post("/api/entreprise/activer", json={"nom": "Atelier Test"}, headers=h_prop).status_code == 200
    acteurs = {"proprietaire": h_prop}
    for role in ("membre", "manager", "partenaire"):
        r = client.post("/api/entreprise/membres", json={"role": role, "nom": role.capitalize()}, headers=h_prop)
        assert r.status_code == 200, r.text
        token = r.json()["lien"].split("token=")[1]
        _, h = compte()
        assert client.post("/api/entreprise/rejoindre", json={"token": token}, headers=h).status_code == 200
        acteurs[role] = h
    return acteurs


def _ids(client, h):
    m = client.get("/api/entreprise/membres", headers=h).json()["membres"]
    return {x["role"]: x["id"] for x in m}


def test_activation_reservee_aux_offres_equipe(client, compte):
    _, h = compte()  # offre gratuite
    assert client.post("/api/entreprise/activer", json={"nom": "Mon Atelier"}, headers=h).status_code == 402
    # La réponse porte aussi « conseiller » (le menu en a besoin avant activation) :
    # on vérifie l'intention — pas d'espace, pas d'activation possible.
    r = client.get("/api/entreprise/moi", headers=h).json()
    assert r["actif"] is False and r["peut_activer"] is False


def test_sans_compte_401(client):
    assert client.get("/api/entreprise/moi").status_code == 401


def test_invitation_par_lien_et_roles(client, compte):
    a = _equipe(client, compte)
    moi = client.get("/api/entreprise/moi", headers=a["membre"]).json()
    assert moi["actif"] and moi["role"] == "membre" and moi["droits"]["gerer_equipe"] is False
    # un membre n'invite personne ; un manager ne crée pas de manager
    assert client.post("/api/entreprise/membres", json={"role": "membre"}, headers=a["membre"]).status_code == 403
    assert client.post("/api/entreprise/membres", json={"role": "manager"}, headers=a["manager"]).status_code == 403
    # le lien ne sert qu'une fois
    r = client.post("/api/entreprise/membres", json={"role": "membre"}, headers=a["proprietaire"]).json()
    token = r["lien"].split("token=")[1]
    assert client.get(f"/api/public/entreprise/invitation/{token}").json()["role"] == "membre"
    _, h = compte()
    assert client.post("/api/entreprise/rejoindre", json={"token": token}, headers=h).status_code == 200
    _, h2 = compte()
    assert client.post("/api/entreprise/rejoindre", json={"token": token}, headers=h2).status_code == 404


def test_partenaire_lecture_seule(client, compte):
    a = _equipe(client, compte)
    ids = _ids(client, a["proprietaire"])
    p = a["partenaire"]
    assert client.get("/api/entreprise/presence?debut=2026-10-05&fin=2026-10-09", headers=p).status_code == 200
    assert client.get("/api/entreprise/planning?debut=2026-10-05&fin=2026-10-09", headers=p).status_code == 200
    assert client.put("/api/entreprise/presence", json={"jour": "2026-10-05", "statut": "bureau"}, headers=p).status_code == 403
    assert client.get("/api/entreprise/absences", headers=p).status_code == 403
    assert client.get("/api/entreprise/contrats", headers=p).json()["contrats"] == []
    vue = client.get("/api/entreprise/membres", headers=p).json()["membres"]
    assert all("email" not in x for x in vue)
    assert ids["membre"]


def test_absence_acceptee_passe_la_presence_a_absent(client, compte):
    a = _equipe(client, compte)
    ids = _ids(client, a["proprietaire"])
    r = client.post("/api/entreprise/absences", json={"type": "conges", "debut": "2026-10-12", "fin": "2026-10-14"}, headers=a["membre"])
    assert r.status_code == 200 and r.json()["statut"] == "demandee"
    abs_id = r.json()["id"]
    # le membre ne se valide pas lui-même
    assert client.patch(f"/api/entreprise/absences/{abs_id}/decision", json={"statut": "acceptee"}, headers=a["membre"]).status_code == 403
    assert client.get("/api/entreprise/apercu", headers=a["manager"]).json()["absences_a_decider"] >= 1
    assert client.patch(f"/api/entreprise/absences/{abs_id}/decision", json={"statut": "acceptee"}, headers=a["manager"]).status_code == 200
    pres = client.get("/api/entreprise/presence?debut=2026-10-12&fin=2026-10-14", headers=a["membre"]).json()["presence"]
    assert sorted(p["jour"] for p in pres if p["membre_id"] == ids["membre"] and p["statut"] == "absent") == ["2026-10-12", "2026-10-13", "2026-10-14"]


def test_contrats_visibles_du_titulaire_et_du_proprietaire_seulement(client, compte):
    a = _equipe(client, compte)
    ids = _ids(client, a["proprietaire"])
    r = client.post("/api/entreprise/contrats", json={"membre_id": ids["membre"], "titre": "CDI"}, headers=a["proprietaire"])
    assert r.status_code == 200
    assert client.post("/api/entreprise/contrats", json={"membre_id": ids["membre"], "titre": "X"}, headers=a["manager"]).status_code == 403
    assert len(client.get("/api/entreprise/contrats", headers=a["membre"]).json()["contrats"]) == 1
    assert client.get("/api/entreprise/contrats", headers=a["manager"]).json()["contrats"] == []
    # la lecture par le propriétaire est journalisée
    client.get("/api/entreprise/contrats", headers=a["proprietaire"])
    assert any(x["action"] == "lecture_contrats" for x in client.get("/api/entreprise/journal", headers=a["proprietaire"]).json()["journal"])
    assert client.get("/api/entreprise/journal", headers=a["manager"]).status_code == 403


def test_secu_desactive_par_defaut_puis_chiffre(client, compte, monkeypatch):
    from cryptography.fernet import Fernet
    monkeypatch.setattr(server, "_fernet", Fernet(Fernet.generate_key()))
    a = _equipe(client, compte)
    ids = _ids(client, a["proprietaire"])
    numero = "185057800608491"
    assert client.put(f"/api/entreprise/membres/{ids['membre']}/secu", json={"numero": numero}, headers=a["membre"]).status_code == 403
    assert client.patch("/api/entreprise/parametres", json={"secu_actif": True}, headers=a["manager"]).status_code == 403
    assert client.patch("/api/entreprise/parametres", json={"secu_actif": True}, headers=a["proprietaire"]).status_code == 200
    assert client.put(f"/api/entreprise/membres/{ids['membre']}/secu", json={"numero": "185057800608492"}, headers=a["membre"]).status_code == 422
    assert client.put(f"/api/entreprise/membres/{ids['membre']}/secu", json={"numero": numero}, headers=a["membre"]).status_code == 200
    # jamais en clair en base, visible de son titulaire, pas du manager
    async def brut():
        from sqlalchemy import select
        async with server.async_session() as db:
            return (await db.execute(select(server.EntMembre.secu_chiffre).where(server.EntMembre.id == ids["membre"]))).scalar_one()
    assert numero not in client.portal.call(brut)
    assert client.get(f"/api/entreprise/membres/{ids['membre']}/secu", headers=a["membre"]).json()["numero"] == numero
    assert client.get(f"/api/entreprise/membres/{ids['membre']}/secu", headers=a["manager"]).status_code == 403
    # sans chiffrement configuré : refus plutôt qu'un enregistrement en clair
    monkeypatch.setattr(server, "_fernet", None)
    assert client.put(f"/api/entreprise/membres/{ids['membre']}/secu", json={"numero": numero}, headers=a["membre"]).status_code == 503


def test_rgpd_export_et_suppression(client, compte):
    a = _equipe(client, compte)
    ids = _ids(client, a["proprietaire"])
    client.post("/api/entreprise/temps", json={"jour": "2026-10-05", "heures": 7.5, "projet": "Site"}, headers=a["membre"])
    client.post("/api/entreprise/pieces", json={"titre": "RIB"}, headers=a["membre"])
    ex = client.get(f"/api/entreprise/membres/{ids['membre']}/export", headers=a["membre"]).json()
    assert ex["temps"][0]["heures"] == 7.5 and ex["pieces"][0]["titre"] == "RIB"
    assert client.get(f"/api/entreprise/membres/{ids['proprietaire']}/export", headers=a["membre"]).status_code == 403
    assert client.delete(f"/api/entreprise/membres/{ids['membre']}", headers=a["manager"]).status_code == 403
    assert client.delete(f"/api/entreprise/membres/{ids['membre']}", headers=a["proprietaire"]).status_code == 200
    assert ids["membre"] not in _ids(client, a["proprietaire"]).values()
    assert client.get("/api/entreprise/moi", headers=a["membre"]).json()["actif"] is False
    assert client.delete("/api/entreprise/moi", headers=a["proprietaire"]).status_code == 409


def test_salarie_invite_sans_offre_nest_pas_renvoye_au_paiement(client, compte):
    """Régression : un salarié invité n'a aucune offre. /abonnement doit le signaler « salarie »
    (sinon l'interface le prenait pour un compte sans offre et le renvoyait payer le Cockpit)."""
    acteurs = _equipe(client, compte)
    abo = client.get("/api/abonnement", headers=acteurs["membre"]).json()
    assert abo["acces"] == "aucun"                      # pas d'offre perso : rien à payer pour lui
    assert abo["salarie"] and abo["salarie"]["role"] == "membre"
    assert abo["salarie"]["org"] == "Atelier Test"
    # Un compte quelconque, hors équipe, n'est pas un salarié.
    _, h_seul = compte()
    assert client.get("/api/abonnement", headers=h_seul).json()["salarie"] is None


def test_invitation_par_email_proposee_au_connexion(client, compte):
    """L'invité qui se connecte avec l'adresse invitée voit l'invitation en attente (pas de passage par le paiement)."""
    _, h_prop = compte(role="vendeur")
    assert client.post("/api/entreprise/activer", json={"nom": "Atelier Mail"}, headers=h_prop).status_code == 200
    uid_inv, h_inv = compte()
    email = client.get("/api/me", headers=h_inv).json().get("email") if client.get("/api/me", headers=h_inv).status_code == 200 else None
    if not email:
        pytest.skip("adresse du compte de test indisponible")
    r = client.post("/api/entreprise/membres", json={"role": "membre", "nom": "Invité", "email": email}, headers=h_prop)
    assert r.status_code == 200, r.text
    abo = client.get("/api/abonnement", headers=h_inv).json()
    assert abo["invitation"] and abo["salarie"] is None


def test_conseiller_signale_dans_l_espace_entreprise(client, compte):
    """L'outil de reprise vit dans « Ton entreprise », pas dans un menu personnel :
    le serveur doit dire qui est conseiller Zayado pour que le menu l'affiche."""
    _, h = compte(role="admin")
    client.post("/api/entreprise/activer", headers=h, json={"nom": "Cabinet Zayado"})
    m = client.get("/api/entreprise/moi", headers=h).json()
    assert m["actif"] is True and m["conseiller"] is True

    # Et le drapeau est servi même sans espace actif : le menu en a besoin avant.
    _, h2 = compte(plan="business")
    m2 = client.get("/api/entreprise/moi", headers=h2).json()
    assert m2["conseiller"] is False, "un client n'est jamais conseiller Zayado"
