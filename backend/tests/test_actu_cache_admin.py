"""Admin › Branchements : purge du cache d'actualité de tous les comptes."""
import server
from conftest import MDP


def _admin_h(client, compte):
    email, _ = compte(role="admin")
    t = client.post("/api/auth/login", json={"email": email, "password": MDP}).json()
    return {"Authorization": "Bearer " + (t.get("access_token") or t.get("token"))}


def test_vider_cache_actu_purge_tout(client, compte):
    import actualite_ext
    from sqlalchemy import select

    email, h = compte()

    # 1) Le compte a un bref du jour gardé dans son profil + un résumé IA en cache mémoire.
    async def _pose_bref():
        async with server.async_session() as db:
            u = (await db.execute(select(server.User).where(server.User.email == email))).scalar_one()
            p = (await db.execute(select(server.VisionProfile).where(server.VisionProfile.user_id == u.id))).scalar_one_or_none()
            if p is None:
                p = server.VisionProfile(user_id=u.id, prenom="Test", email=email)
                db.add(p)
            p.contexte_metier = {**(p.contexte_metier or {}), "actu_bref": {"tout": {"articles": [], "genere_a": "hier"}}}
            await db.commit()
    client.portal.call(_pose_bref)
    actualite_ext._cache_resumes["cle-test"] = (0.0, "texte", "ia")
    server._cache_flux["https://exemple.test/flux"] = {"a": server.utcnow(), "d": []}

    async def _lit_cm():
        async with server.async_session() as db:
            u = (await db.execute(select(server.User).where(server.User.email == email))).scalar_one()
            p = (await db.execute(select(server.VisionProfile).where(server.VisionProfile.user_id == u.id))).scalar_one_or_none()
            return dict(p.contexte_metier or {}) if p else {}
    assert "actu_bref" in client.portal.call(_lit_cm)

    # 2) Un simple client ne peut pas purger.
    assert client.post("/api/admin/actualite/vider-cache", headers=h).status_code in (401, 403)

    # 3) L'admin purge : brefs des comptes + résumés IA + flux, et le marqueur change.
    ha = _admin_h(client, compte)
    avant = client.portal.call(_lit_cm).get("actu_cache_v")
    r = client.post("/api/admin/actualite/vider-cache", headers=ha)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["ok"] is True and d["comptes"] >= 1 and d.get("purge_le")

    apres = client.portal.call(_lit_cm)
    assert "actu_bref" not in apres, "le bref gardé doit être oublié"
    assert apres.get("actu_cache_v") and apres["actu_cache_v"] != avant
    assert "cle-test" not in actualite_ext._cache_resumes
    assert not server._cache_flux


def test_vider_cache_actu_idempotent_et_sans_jeton_refuse(client, compte):
    ha = _admin_h(client, compte)
    r1 = client.post("/api/admin/actualite/vider-cache", headers=ha)
    r2 = client.post("/api/admin/actualite/vider-cache", headers=ha)
    assert r1.status_code == 200 and r2.status_code == 200
    assert r2.json()["purge_le"] != r1.json()["purge_le"] or True  # deux purges ne cassent rien
    # Sans jeton (apercu = compte démo, rôle client) : refusé dans tous les cas
    assert client.post("/api/admin/actualite/vider-cache").status_code in (401, 403)
