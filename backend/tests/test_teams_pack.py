"""Pack Teams : respecte les règles de validation Microsoft (manifest 1.16) qui font échouer le chargement par l'admin."""
import io
import json
import re
import sys
import uuid
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from teams_ext import construire_pack  # noqa: E402
from PIL import Image  # noqa: E402


def test_pack_valide():
    z = zipfile.ZipFile(io.BytesIO(construire_pack("app.zayado.net")))
    assert set(z.namelist()) == {"manifest.json", "color.png", "outline.png"}
    m = json.loads(z.read("manifest.json"))
    uuid.UUID(m["id"])
    assert re.fullmatch(r"\d+\.\d+\.\d+", m["version"]) and m["version"] >= "1.3.0"
    assert len(m["name"]["short"]) <= 30 and len(m["name"]["full"]) <= 100
    assert len(m["description"]["short"]) <= 80 and len(m["description"]["full"]) <= 4000
    assert all(u.startswith("https://") for u in m["developer"].values() if u.startswith("http"))
    ids = [t["entityId"] for t in m["staticTabs"]]
    assert len(ids) == len(set(ids)) and len(ids) <= 16 and {"pieces", "decompte"} <= set(ids)
    for t in m["staticTabs"]:
        assert t["contentUrl"].startswith("https://app.zayado.net/") and "source=teams" in t["contentUrl"]
    assert m["validDomains"] == ["app.zayado.net"]
    assert Image.open(io.BytesIO(z.read("color.png"))).size == (192, 192)
    o = Image.open(io.BytesIO(z.read("outline.png")))
    assert o.size == (32, 32) and o.mode == "RGBA"
    # même domaine = même identifiant : l'admin met à jour l'appli au lieu d'en créer une seconde
    assert json.loads(zipfile.ZipFile(io.BytesIO(construire_pack("app.zayado.net"))).read("manifest.json"))["id"] == m["id"]
