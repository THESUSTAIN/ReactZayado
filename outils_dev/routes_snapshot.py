"""Liste triée (méthodes, chemin) des routes de l'app FastAPI + nombre de tables. Usage : cd <backend> && python routes_snapshot.py"""
import os
import sys

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:////tmp/routes_snapshot.db"
sys.path.insert(0, ".")
import server  # noqa: E402

for m, p in sorted({(",".join(sorted(getattr(r, "methods", []) or [])), r.path) for r in server.app.routes}):
    print(m, p)
print("TABLES", len(server.Base.metadata.tables), sorted(server.Base.metadata.tables) == sorted(server.Base.metadata.tables))
