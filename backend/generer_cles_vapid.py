"""Génère une paire de clés VAPID (notifications push). À lancer UNE fois :

    python generer_cles_vapid.py

Copie les 3 lignes affichées dans backend/.env (local) ou dans les variables d'environnement de ton hébergeur.
Ne change plus ces clés ensuite : toutes les personnes déjà abonnées devraient réactiver leurs notifications.
"""
import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def b64url(octets: bytes) -> str:
    return base64.urlsafe_b64encode(octets).rstrip(b"=").decode()


cle = ec.generate_private_key(ec.SECP256R1())
publique = cle.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
privee = cle.private_numbers().private_value.to_bytes(32, "big")

print(f"VAPID_PUBLIC_KEY={b64url(publique)}")
print(f"VAPID_PRIVATE_KEY={b64url(privee)}")
print("VAPID_SUBJECT=mailto:contact@zayado.net   # une adresse e-mail réelle, à toi")
