#!/usr/bin/env python3
"""Remplit le Journal : rédige les articles via l'IA de l'appli (Admin › Articles), les envoie sur Shopify,
puis les publie avec une photo. Usage : JETON=<jeton admin> API=http://localhost:8001/api python3 generer_journal.py"""
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import installer_boutique as I  # noqa: E402

API, JETON = os.environ["API"], os.environ["JETON"]
U = "https://images.unsplash.com/photo-{}?w=1600&q=80&fm=jpg&fit=crop"
IMAGES = {
    "tresorerie": ["1554224154-22dec7ec8818", "1709880945165-d2208c6ad2ec", "1554224155-6726b3ff858f", "1707902665498-a202981fb5ac"],
    "clients": ["1604881988758-f76ad2f7aac1", "1714974528737-3e6c7e4d11af", "1513470270416-d3ff6f16b22f", "1565728744382-61accd4aa148", "1678282931256-370578a0d036"],
    "energie": ["1757857637570-e41cabb74c06", "1625407524139-e4a4dbdf871d", "1632124708137-789cf2dd4ac2", "1719822548190-9643b474d2e2", "1762160687270-1602d25749b6"],
    "organisation": ["1683921045461-b8dc5ad37740", "1558478551-1a378f63328e", "1585435465945-bef5a93f8849", "1683921045416-3c511862e8de", "1581668181500-08c6a6e006f7"],
}
SUJETS = [
    ("tresorerie", "Séparer la TVA de sa trésorerie : la méthode du sous-compte", "Ne plus confondre l'argent de l'État avec le sien", "tva trésorerie indépendant"),
    ("tresorerie", "Prévoir sa trésorerie sur 90 jours avec une simple feuille", "Un tableau à 3 colonnes, mis à jour 10 minutes par semaine", "prévision de trésorerie tpe"),
    ("clients", "Trouver ses 10 premiers clients locaux sans publicité", "Les signaux d'entreprises qui bougent près de chez vous", "trouver des clients indépendant"),
    ("clients", "Relancer un devis sans paraître insistant", "3 messages types, datés, qui rendent service", "relancer un devis"),
    ("clients", "Demander une recommandation à un client satisfait", "Le bon moment et la phrase simple qui fonctionne", "obtenir des recommandations clients"),
    ("clients", "Augmenter ses prix sans perdre ses clients", "Annoncer une hausse avec clarté et préavis", "augmenter ses prix freelance"),
    ("clients", "Écrire une offre claire que vos clients comprennent en 10 secondes", "Pour qui, quel problème, quel résultat, quel prix", "rédiger une offre commerciale"),
    ("energie", "Reconnaître les signes d'épuisement du dirigeant avant qu'il soit trop tard", "Repères simples et quand demander de l'aide", "burn-out entrepreneur signes"),
    ("energie", "Le rituel de fin de journée qui protège vos soirées", "5 minutes pour fermer la journée vraiment", "déconnecter après le travail"),
    ("energie", "Dormir mieux quand on a la tête pleine de son entreprise", "Vider la tête avant le coucher, écrans et lumière", "mieux dormir stress travail"),
    ("energie", "Prendre des vacances quand on est seul·e dans son entreprise", "Préparer, prévenir, déléguer le minimum vital", "vacances indépendant"),
    ("energie", "Travailler sur écran sans fatiguer ses yeux", "Réglages gratuits, pauses 20-20-20, lumière", "fatigue visuelle écran"),
    ("organisation", "Choisir une seule priorité par jour (et s'y tenir)", "La méthode de la tâche unique avant les mails", "priorités entrepreneur"),
    ("organisation", "Les 3 tâches à déléguer en premier quand on est débordé·e", "Repérer ce qui se répète et le documenter", "déléguer tâches tpe"),
    ("organisation", "Organiser sa semaine en blocs : la méthode simple", "Blocs clients, production, admin, repos", "organiser sa semaine entrepreneur"),
    ("organisation", "La revue hebdo de 5 minutes pour reprendre la main", "Victoires, obstacles, priorité de la semaine suivante", "revue hebdomadaire"),
    ("organisation", "Ranger ses mails une fois pour toutes : la boîte à 3 dossiers", "À traiter, en attente, archives", "organiser ses mails"),
]


def appel(methode, chemin, corps=None, delai=180):
    req = urllib.request.Request(API + chemin, method=methode, data=json.dumps(corps).encode() if corps is not None else None,
                                 headers={"Authorization": f"Bearer {JETON}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=delai) as r:
        return json.loads(r.read())


def main():
    I.jeton()
    blog = [b for b in I._req("GET", "/blogs.json")["blogs"] if b["handle"] == "journal"][0]["id"]
    existants = {a["title"] for a in I._req("GET", f"/blogs/{blog}/articles.json?fields=title&limit=250")["articles"]}
    rang = {k: 0 for k in IMAGES}
    for cat, titre, angle, mot in SUJETS:
        if any(titre[:30] in t for t in existants):
            print("déjà là :", titre, flush=True)
            continue
        for essai in range(2):
            try:
                a = appel("POST", "/admin/articles", {"type": "article", "titre": titre, "angle": angle, "mot_cle": mot, "categorie": cat})
                a = appel("POST", f"/admin/articles/{a['id']}/shopify")
                break
            except Exception as e:  # noqa: BLE001
                print("  erreur, nouvel essai :", e, flush=True)
                time.sleep(5)
        else:
            continue
        aid = a["shopify_id"].rsplit("/", 1)[-1]
        img = U.format(IMAGES[cat][rang[cat] % len(IMAGES[cat])])
        rang[cat] += 1
        I._req("PUT", f"/blogs/{blog}/articles/{aid}.json", {"article": {"id": int(aid), "published": True, "image": {"src": img, "alt": a["titre"]}}})
        print("✔", cat, "·", a["titre"], flush=True)


if __name__ == "__main__":
    main()
