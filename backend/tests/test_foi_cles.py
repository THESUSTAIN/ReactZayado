"""Les clés de données Ma Foi envoyées par l'appli doivent être acceptées par le serveur.
Avant : la Mémoire écrivait sous « memoire_versets », clé refusée par /foi/etat/{cle} :
la progression restait dans le navigateur et n'arrivait jamais sur le compte."""
import re
from pathlib import Path

RACINE = Path(__file__).resolve().parents[2]
FOI = RACINE / "frontend" / "src" / "features" / "thesustain"


def cles_serveur() -> set:
    src = (RACINE / "backend" / "foi_ext.py").read_text(encoding="utf-8")
    bloc = re.search(r"CLES_ETAT\s*=\s*\{(.*?)\}", src, re.S).group(1)
    return set(re.findall(r'"([a-z_]+)"', bloc))


def cles_front() -> set:
    cles = set()
    for f in FOI.glob("*.js*"):
        src = f.read_text(encoding="utf-8")
        cles |= set(re.findall(r'useLocal\(\s*"([a-z_]+)"', src))
    store = (FOI / "memoireStore.js").read_text(encoding="utf-8")
    bloc = re.search(r"const CLE\s*=\s*\{(.*?)\}", store, re.S).group(1)
    cles |= set(re.findall(r':\s*"([a-z_]+)"', bloc))
    return cles


def test_toutes_les_cles_du_front_sont_acceptees():
    manquantes = cles_front() - cles_serveur()
    assert not manquantes, f"clés refusées par le serveur : {sorted(manquantes)}"


def test_cles_memoire_presentes():
    assert {"memoire_progress", "memoire_jeu"} <= cles_serveur()
