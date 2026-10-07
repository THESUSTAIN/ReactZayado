#!/usr/bin/env python3
"""
Seed des comptes de test Zayado — crée 1 admin + 1 compte par offre.
Idempotent : relançable sans doublon (upsert par email).

UTILISATION (sur VOTRE machine / Railway shell, avec votre base) :

    DATABASE_URL="mysql+aiomysql://user:pass@host:3306/nom_base" \
    python seed_comptes_demo.py

⚠️ N'exécute AUCUN DELETE/DROP. Crée ou met à jour uniquement ces comptes.
   Vos utilisateurs existants ne sont pas touchés.
"""
import os
import asyncio

# Évite un éventuel refus d'import en prod (le secret sert juste à l'import).
os.environ.setdefault("JWT_SECRET", "seed-temp-secret")

from sqlalchemy import select  # noqa: E402
from server import async_session, User, VisionProfile, _hash_mdp  # noqa: E402

MDP = "Test!2026"          # mot de passe commun aux comptes de test (clients)
MDP_ADMIN = "Admin!2026"   # mot de passe admin

# (email, mot de passe, rôle, plan, prénom)
COMPTES = [
    # NB : l'admin (admin@zayado.net) existe déjà en production (Railway) — il
    # n'est volontairement PAS créé par ce script ni par le seed auto.
    ("test.essentielle@zayado.net",  MDP,       "client", "essentielle", "Essentielle"),
    # Compte TheSustain : accès GRATUIT à la partie chrétienne « Ma Foi ».
    # Pas d'offre business payante (plan "essentielle" = aucune offre active),
    # mais Ma Foi reste accessible car elle est exemptée du paywall. « La foi ne se vend pas. »
    ("thesustain@zayado.net",        MDP,       "client", "essentielle", "TheSustain"),
    ("test.reveur@zayado.net",       MDP,       "client", "reveur",      "Reveur"),
    ("test.solo@zayado.net",         MDP,       "client", "serenite",    "Solo"),
    ("test.pro@zayado.net",          MDP,       "client", "pro",         "Pro"),
    ("test.equipe@zayado.net",       MDP,       "client", "business",    "Equipe"),
    ("test.entreprise@zayado.net",   MDP,       "client", "entreprise",  "Entreprise"),
]


async def upsert(db, email, mdp, role, plan, prenom):
    email = email.strip().lower()
    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if user is None:
        user = User(email=email, password_hash=_hash_mdp(mdp), role=role)
        db.add(user)
        await db.flush()  # pour obtenir user.id
        action = "créé"
    else:
        user.role = role
        user.password_hash = _hash_mdp(mdp)
        action = "mis à jour"

    profil = (await db.execute(
        select(VisionProfile).where(VisionProfile.user_id == user.id)
    )).scalar_one_or_none()
    if profil is None:
        profil = VisionProfile(user_id=user.id)
        db.add(profil)
    profil.prenom = prenom
    profil.email = email
    profil.plan = plan
    profil.onboarded = True
    return f"  - {email:32s} | rôle={role:6s} | offre={plan:12s} -> {action}"


async def main():
    print("Base :", os.environ.get("DATABASE_URL", "sqlite (défaut local)"))
    async with async_session() as db:
        lignes = []
        for c in COMPTES:
            lignes.append(await upsert(db, *c))
        await db.commit()
    print("Comptes de test prêts :")
    print("\n".join(lignes))
    print("\nMots de passe : clients =", MDP, "| admin =", MDP_ADMIN)
    print("Astuce : l'espace « Ma Foi » s'active côté navigateur (bouton ✝️ Ma Foi / 1re visite).")


if __name__ == "__main__":
    asyncio.run(main())
