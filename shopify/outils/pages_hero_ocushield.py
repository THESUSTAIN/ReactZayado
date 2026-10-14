#!/usr/bin/env python3
"""Déploie : sections/pages vitrine manquantes + hero animé + marquee,
collection « Concentration visuelle » + 8 produits Ocushield avec images IA."""
import asyncio
import base64
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import installer_boutique as I  # noqa: E402
from dotenv import load_dotenv  # noqa: E402

load_dotenv("/app/backend/.env")
THEME_ID = 205715800405  # « Zayado — Préparation » : plus rien ne part en ligne sans le bouton Déployer
SRC = Path("/app/shopify/theme-v2")

FICHIERS = [
    "assets/zayado.css",
    "assets/zayado-favoris.js",
    "layout/theme.liquid",
    "sections/zayado-marquee.liquid",
    "sections/zayado-hero-anime.liquid",
    "sections/zayado-coming-soon.liquid",
    "sections/zayado-box-v1.liquid",
    "sections/zayado-hero-choix.liquid",
    "sections/zayado-favoris.liquid",
    "templates/index.json",
    "templates/page.zayado-coming-soon.json",
    "templates/page.zayado-box-v1.json",
    "templates/page.zayado-hero-choix.json",
    "templates/page.zayado-favoris.json",
]

PAGES = [
    ("Box de fin d'année — précommande", "box-v1", "zayado-box-v1"),
    ("Bientôt — la boutique arrive", "coming-soon", "zayado-coming-soon"),
    ("Choix de l'image hero", "hero-choix", "zayado-hero-choix"),
    ("Mes favoris", "favoris", "zayado-favoris"),
]

# Prix publics relevés sur ocushield.com le 14/10/2026 (mêmes montants, en €)
PRODUITS = [
    ("Lunettes amber anti lumière bleue", "amber-blue-light-glasses", "39.99",
     "Verres ambrés qui filtrent la lumière bleue des écrans le soir : moins de fatigue visuelle, un sommeil préparé en douceur. Modèle mixte."),
    ("Filtre anti lumière bleue pour écran d'ordinateur", "filtre-ecran-ordinateur", "29.99",
     "Film anti lumière bleue pour laptop, moniteur ou PC : se pose sur l'écran et filtre la lumière bleue en journée comme en soirée."),
    ("Filtre anti lumière bleue pour MacBook", "filtre-ecran-macbook", "39.99",
     "Filtre anti lumière bleue découpé pour MacBook Air et Pro : protection de l'écran et des yeux, sans changer les couleurs."),
    ("Filtre anti lumière bleue pour iPhone", "filtre-ecran-iphone", "34.99",
     "Protection d'écran anti lumière bleue pour iPhone : verre trempé filtrant, pose simple."),
    ("Filtre anti lumière bleue pour iPad", "filtre-ecran-ipad", "29.99",
     "Protection d'écran anti lumière bleue pour iPad : filtre la lumière bleue sans altérer l'affichage."),
    ("Oculamp — la lumière du jour et du soir", "oculamp", "99.99",
     "Lampe de bureau à lumière adaptée au moment de la journée : claire pour travailler, chaude le soir pour ne pas dérégler le sommeil."),
    ("Spray nettoyant écrans & lunettes", "spray-nettoyant-ecrans", "4.99",
     "Spray doux pour écrans et verres de lunettes : dépoussière et dégraisse sans traces."),
    ("Masque de sommeil lesté en bambou", "masque-sommeil-bambou", "29.99",
     "Masque de nuit lesté, tissu bambou respirant : occultation totale pour une vraie récupération."),
]

PROMPTS = {
    "amber-blue-light-glasses": "Product photo of elegant amber-tinted blue light blocking glasses on a warm ivory linen background, soft natural window light, premium minimalist e-commerce style, subtle gold and navy accents, square format",
    "filtre-ecran-ordinateur": "Product photo of a slim transparent blue light screen filter panel leaning against a desktop monitor on a warm ivory desk scene, soft daylight, premium minimalist e-commerce style, square format",
    "filtre-ecran-macbook": "Product photo of a MacBook laptop with a sleek blue light screen filter being applied, warm ivory and beige office scene, soft natural light, premium minimalist e-commerce style, square format",
    "filtre-ecran-iphone": "Product photo of an iPhone with a clear blue light screen protector being installed, on warm ivory linen, soft daylight, premium minimalist e-commerce style, square format",
    "filtre-ecran-ipad": "Product photo of an iPad tablet with a blue light screen protector, warm ivory desk scene with a ceramic cup, soft daylight, premium minimalist e-commerce style, square format",
    "oculamp": "Product photo of a modern minimalist desk lamp with warm glow on an ivory desk next to a notebook, evening cozy light, premium e-commerce style, navy blue and gold accents, square format",
    "spray-nettoyant-ecrans": "Product photo of a small elegant cleaning spray bottle with a soft microfiber cloth on warm ivory linen, soft daylight, premium minimalist e-commerce style, square format",
    "masque-sommeil-bambou": "Product photo of a plush weighted bamboo sleep eye mask on warm ivory bedsheets, soft morning light, calm premium e-commerce style, square format",
}


def pousser_fichiers():
    for cle in FICHIERS:
        v = (SRC / cle).read_bytes()
        binaire = cle.endswith((".png", ".jpg", ".woff2"))
        corps = {"asset": {"key": cle, "attachment": base64.b64encode(v).decode()}} if binaire else {"asset": {"key": cle, "value": v.decode("utf-8")}}
        I._req("PUT", f"/themes/{THEME_ID}/assets.json", corps)
        print("↑", cle, flush=True)
        time.sleep(0.25)


def creer_pages():
    existantes = {p["handle"] for p in I._lister_tout("/pages.json?limit=250", "pages")}
    for titre, handle, suffixe in PAGES:
        if handle in existantes:
            print("page déjà là :", handle)
            continue
        r = I._req("POST", "/pages.json", {"page": {"title": titre, "handle": handle, "template_suffix": suffixe, "body_html": ""}})
        print("page créée :", r["page"]["handle"])


def creer_collection():
    cols = {c["handle"] for c in I._lister_tout("/smart_collections.json?limit=250", "smart_collections")}
    if "concentration-visuelle" in cols:
        print("collection concentration-visuelle déjà là")
        return
    I._req("POST", "/smart_collections.json", {"smart_collection": {
        "title": "Concentration visuelle", "handle": "concentration-visuelle",
        "body_html": "<p>Écrans, lunettes et lumière : le rayon qui ménage vos yeux pour rester concentré sans fatigue.</p>",
        "rules": [{"column": "tag", "relation": "equals", "condition": "concentration-visuelle"}],
    }})
    print("collection créée : concentration-visuelle")


def creer_produits():
    existants = {p["handle"]: p for p in I._lister_tout("/products.json?limit=250&fields=id,handle", "products")}
    ids = {}
    for titre, handle, prix, desc in PRODUITS:
        if handle in existants:
            ids[handle] = existants[handle]["id"]
            print("produit déjà là :", handle)
            continue
        r = I._req("POST", "/products.json", {"product": {
            "title": titre, "handle": handle, "vendor": "Ocushield", "product_type": "Concentration visuelle",
            "body_html": f"<p>{desc}</p>",
            "tags": "ame, concentration-visuelle, produits",
            "status": "active",
            "variants": [{"price": prix, "inventory_management": None, "requires_shipping": True}],
        }})
        ids[handle] = r["product"]["id"]
        print("produit créé :", handle, prix, "€", flush=True)
        time.sleep(0.3)
    return ids


async def generer_images(ids):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    cle = os.environ.get("EMERGENT_LLM_KEY")
    for handle, prompt in PROMPTS.items():
        pid = ids.get(handle)
        if not pid:
            continue
        deja = I._req("GET", f"/products/{pid}/images.json?fields=id")["images"]
        if deja:
            print("image déjà là :", handle)
            continue
        chat = LlmChat(api_key=cle, session_id=f"img-{handle}", system_message="Tu génères des visuels produits e-commerce.")
        chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
        try:
            _txt, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
        except Exception as e:
            print("!! génération échouée", handle, str(e)[:120], flush=True)
            continue
        if not images:
            print("!! aucune image pour", handle)
            continue
        donnees = images[0]["data"]
        I._req("POST", f"/products/{pid}/images.json", {"image": {"attachment": donnees}})
        print("image posée :", handle, flush=True)
        time.sleep(0.4)


def main():
    I.jeton()
    print("── 1. fichiers thème", flush=True)
    pousser_fichiers()
    print("── 2. pages", flush=True)
    creer_pages()
    print("── 3. collection", flush=True)
    creer_collection()
    print("── 4. produits", flush=True)
    ids = creer_produits()
    print("── 5. images IA (Nano Banana)", flush=True)
    asyncio.run(generer_images(ids))
    print("TERMINE", flush=True)


if __name__ == "__main__":
    main()
