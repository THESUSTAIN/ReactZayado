"""Recrée des comptes de démonstration sur un serveur Zayado (préproduction ou production).

Usage :
  ZAYADO_URL=https://app.zayado.net DEMO_MOT_DE_PASSE='…' python scripts/creer_comptes_demo.py

Le mot de passe n'est jamais écrit dans le code : il est lu dans DEMO_MOT_DE_PASSE.
Les comptes sont créés en offre Découverte ; donne-leur un rôle ou une offre depuis la console Admin.
"""
import os
import sys

import httpx

URL = os.environ.get("ZAYADO_URL", "").rstrip("/")
MDP = os.environ.get("DEMO_MOT_DE_PASSE", "")
COMPTES = [("sara@zayado.fr", "Sara"), ("demo.vendeur@zayado.fr", "Vendeur"), ("demo.immo@zayado.fr", "Alexandre")]

if not URL or len(MDP) < 10:
    sys.exit("Renseigne ZAYADO_URL et DEMO_MOT_DE_PASSE (10 caractères minimum).")

for email, prenom in COMPTES:
    r = httpx.post(f"{URL}/api/auth/register", json={"email": email, "password": MDP, "firstName": prenom}, timeout=20)
    etat = "créé" if r.status_code == 200 else ("existe déjà" if r.status_code in (400, 409) else f"erreur {r.status_code}")
    print(f"{email} : {etat}")
