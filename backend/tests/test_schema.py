"""Réparation automatique des anciennes tables au démarrage."""
from sqlalchemy import create_engine, inspect, text

import server


def test_ancienne_table_incompatible_archivee_puis_recreee(tmp_path):
    moteur = create_engine(f"sqlite:///{tmp_path / 'ancienne.db'}")
    with moteur.begin() as conn:
        conn.execute(text("CREATE TABLE referrals (id INTEGER PRIMARY KEY AUTOINCREMENT, parrain_id INTEGER NOT NULL, filleul_email VARCHAR(255) NOT NULL)"))
        conn.execute(text("INSERT INTO referrals (parrain_id, filleul_email) VALUES (1, 'x@y.fr')"))
        server.Base.metadata.create_all(conn)
        server._reparer_schema_sync(conn)
    noms = inspect(moteur).get_table_names()
    assert any(n.startswith("referrals_ancien_") for n in noms)  # rien n'est supprimé
    colonnes = {c["name"] for c in inspect(moteur).get_columns("referrals")}
    assert {"referrer_id", "referred_email"} <= colonnes


def test_colonne_manquante_ajoutee(tmp_path):
    moteur = create_engine(f"sqlite:///{tmp_path / 'ancienne2.db'}")
    with moteur.begin() as conn:
        server.Base.metadata.create_all(conn)
        conn.execute(text("CREATE TABLE tmp_copie AS SELECT id, user_id, provider FROM user_connections"))
        conn.execute(text("DROP TABLE user_connections"))
        conn.execute(text("CREATE TABLE user_connections (id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36), provider VARCHAR(50))"))
        server._reparer_schema_sync(conn)
    colonnes = {c["name"] for c in inspect(moteur).get_columns("user_connections")}
    assert "status" in colonnes and "label" in colonnes
