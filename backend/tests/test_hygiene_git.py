"""Bases locales et jetons : jamais suivis par Git, mais toujours présents sur le disque."""
import pathlib
import subprocess

RACINE = pathlib.Path(__file__).resolve().parents[2]
SENSIBLES = ["backend/kairos.db", "memory/.tok_local", "backend/.env", "frontend/.env"]


def _git(*args):
    return subprocess.run(["git", *args], cwd=RACINE, capture_output=True, text=True, timeout=15)


def test_fichiers_sensibles_non_suivis():
    suivis = set(_git("ls-files").stdout.splitlines())
    assert not [p for p in SENSIBLES if p in suivis]


def test_fichiers_sensibles_ignores():
    for p in SENSIBLES:
        assert _git("check-ignore", "-q", p).returncode == 0, p
