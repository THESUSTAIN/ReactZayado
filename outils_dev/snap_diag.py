import sys, json, os
sys.path.insert(0, 'tests'); sys.path.insert(0, '.')
os.environ["ZY_SNAP"] = "1"
import conftest, server
from fastapi.testclient import TestClient
_j = None
with TestClient(server.app) as c:
    tok = server._pyjwt.encode({"sub": "snap", "role": "admin", "exp": 4102444800}, server.JWT_SECRET, algorithm=server.JWT_ALGO)
    h = {"Authorization": "Bearer " + tok}
    for u in ("/api/admin/diagnostics", "/api/ia/statut"):
        r = c.get(u, headers=h); print(u, r.status_code, json.dumps(r.json(), sort_keys=True, ensure_ascii=False))
