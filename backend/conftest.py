"""Alias : rend le conftest de la suite importable comme ``conftest`` (module unique).

Les modules de test font ``from conftest import MDP`` ; sans ce fichier, pytest
charge tests/conftest.py comme plugin (nom ``tests.conftest``) et l'import
direct créait une SECONDE copie du module — dont un second faux serveur HTTP
(FAUX) déconnecté des fixtures. Ici une seule instance est garantie.
"""
import sys

from tests.conftest import *  # noqa: F401,F403
from tests import conftest as _conftest_suite

sys.modules.setdefault("conftest", _conftest_suite)
