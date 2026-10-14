"""Génère le schéma SQL canonique (propre) à partir des modèles SQLAlchemy de l'app.
Sortie : la liste exacte des tables/colonnes dont Zayado a besoin — rien de plus."""
import os
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:////app/backend/kairos.db")
from sqlalchemy.schema import CreateTable
from sqlalchemy.dialects import mysql
import server  # importe Base + tous les modèles

Base = server.Base
tables = Base.metadata.sorted_tables
lines = ["-- Schéma canonique Zayado (MySQL 8) — généré depuis les modèles de l'app.",
         "-- Import dans une base VIDE = base propre et à jour, sans colonnes d'ancien projet.",
         "SET FOREIGN_KEY_CHECKS=0;", ""]
for t in tables:
    ddl = str(CreateTable(t).compile(dialect=mysql.dialect())).strip()
    ddl = ddl.replace("CREATE TABLE", "CREATE TABLE IF NOT EXISTS")
    lines.append(ddl + " ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n")
lines.append("SET FOREIGN_KEY_CHECKS=1;")
open("/app/recovered/zayado_schema_mysql.sql", "w").write("\n".join(lines))
print(f"TABLES ({len(tables)}):")
for t in tables:
    print(f"  - {t.name} ({len(t.columns)} colonnes)")
print("\nÉcrit -> /app/recovered/zayado_schema_mysql.sql")
