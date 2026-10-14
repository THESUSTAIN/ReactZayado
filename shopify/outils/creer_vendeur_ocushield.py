#!/usr/bin/env python3
"""Crée le compte vendeur « Ocushield » dans l'app et relie les 8 fiches Shopify
(shopify_id) pour que chaque commande soit attribuée à ce vendeur."""
import asyncio
import os
import sys
import uuid
from pathlib import Path

sys.path.insert(0, "/app/shopify/outils")
sys.path.insert(0, "/app/backend")

from dotenv import load_dotenv  # noqa: E402

load_dotenv("/app/backend/.env")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:////app/backend/kairos.db")

import bcrypt  # noqa: E402
import installer_boutique as I  # noqa: E402 — après load_dotenv (lit les variables SHOPIFY_)

EMAIL = "ocushield@zayado.net"
MDP = "Ocushield-Zayado-2026!"
NOM = "Ocushield"

HANDLES = ["amber-blue-light-glasses", "filtre-ecran-ordinateur", "filtre-ecran-macbook",
           "filtre-ecran-iphone", "filtre-ecran-ipad", "oculamp", "spray-nettoyant-ecrans",
           "masque-sommeil-bambou"]


async def main():
    I.jeton()
    import server  # noqa: E402 — importe l'app (modèles + session)
    from sqlalchemy import select  # noqa: E402

    produits = {p["handle"]: p for p in I._lister_tout("/products.json?limit=250", "products")}

    async with server.async_session() as db:
        # 1) Compte vendeur
        user = (await db.execute(select(server.User).where(server.User.email == EMAIL))).scalar_one_or_none()
        if not user:
            user = server.User(email=EMAIL, password_hash=bcrypt.hashpw(MDP.encode(), bcrypt.gensalt()).decode(), role="vendeur")
            db.add(user)
            await db.flush()
            print("compte vendeur créé :", EMAIL)
        else:
            user.role = "vendeur"
            print("compte déjà là, rôle vendeur confirmé :", EMAIL)

        # 2) Profil vendeur
        profil = (await db.execute(select(server.VendorProfile).where(server.VendorProfile.user_id == user.id))).scalar_one_or_none()
        data = {"nom_boutique": NOM,
                "description": "Partenaire « concentration visuelle » : lunettes amber, filtres d'écran anti lumière bleue, lampe Oculamp, masque de sommeil.",
                "email_contact": "contact@zayado.net", "telephone": "", "siret": "",
                "site": "https://www.ocushield.com", "lien_contrat": "", "conditions_acceptees": True}
        if profil:
            profil.data = {**data, **{k: v for k, v in (profil.data or {}).items() if v}}
        else:
            db.add(server.VendorProfile(user_id=user.id, data=data))
        await db.flush()

        # 3) Les 8 fiches liées à Shopify
        n = 0
        for handle in HANDLES:
            p = produits.get(handle)
            if not p:
                print("!! produit Shopify introuvable :", handle)
                continue
            gid = p["admin_graphql_api_id"]
            existe = (await db.execute(select(server.VendorProduct).where(server.VendorProduct.shopify_id == gid))).scalar_one_or_none()
            if existe:
                print("fiche déjà liée :", handle)
                continue
            img = (p.get("image") or {}).get("src") or ""
            prix = (p["variants"][0]["price"] if p.get("variants") else "0")
            db.add(server.VendorProduct(
                id=str(uuid.uuid4()), user_id=user.id, titre=p["title"],
                description=f"Fiche gérée sur la boutique Shopify (vendeur {NOM}).",
                prix=str(prix), stock=None, sku="", categorie="Concentration visuelle",
                images=[img] if img else [], statut="publie", vendeur=NOM,
                motif_refus="", shopify_id=gid, shopify_handle=handle))
            n += 1
            print("fiche liée :", handle, "→", gid)
        await db.commit()
        print(f"TERMINE — {n} fiches liées, vendeur {EMAIL}")


if __name__ == "__main__":
    asyncio.run(main())
