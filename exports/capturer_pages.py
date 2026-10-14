#!/usr/bin/env python3
"""Capture toutes les pages publiques (app + boutique) et génère une page d'inventaire."""
import subprocess
from pathlib import Path

OUT = Path("/app/frontend/public/apercu")
OUT.mkdir(parents=True, exist_ok=True)
APP = "https://copilote-tpe.preview.emergentagent.com"
SHOP = "https://tm2fg0-nk.myshopify.com"

# (fichier, url, catégorie, titre, note)
APP_PAGES = [
    ("app-accueil", "/", "APP — à garder", "Accueil = cockpit", "L'app s'ouvre directement sur le cockpit"),
    ("app-login", "/login", "APP — à garder", "Connexion", "« Mon espace » et « Se connecter » de la boutique mènent ici"),
    ("app-onboarding", "/onboarding", "APP — à garder", "Souscription offres", "Boutons « Essayer 2 mois pour 1 € » de la boutique"),
    ("app-tunnel", "/public/tunnel", "APP — à garder", "Tunnel : diagnostic", "« Faire mon diagnostic » de la boutique"),
    ("app-tunnel-kit", "/public/tunnel/kit", "APP — à garder", "Tunnel : Kit 27 €", "Étape tripwire (Mollie)"),
    ("app-tunnel-merci", "/public/tunnel/merci", "APP — à garder", "Tunnel : merci", "Après paiement"),
    ("app-tunnel-fast-track", "/public/tunnel/fast-track", "APP — à garder", "Tunnel : Fast-Track", "Upsell 297 €"),
    ("app-reprise", "/public/reprise", "APP — à garder", "Reprise d'entreprise", "Pages reprise de la boutique"),
    ("app-reprise-rdv", "/public/reprise/rdv", "APP — à garder", "Reprise : RDV", "Prise de rendez-vous"),
    ("app-diagnostic", "/diagnostic", "APP — à garder", "Diagnostic (redirige)", "→ /public/tunnel"),
    ("app-acheter", "/acheter", "APP — à garder", "Acheter (redirige)", "Secours fiches produits"),
    ("app-compte", "/compte", "APP — à garder", "Mon compte", "Compte client (commandes boutique)"),
    ("app-mon-espace", "/mon-espace", "APP — à garder", "Mon espace (redirige)", "→ /compte"),
    ("app-activer", "/activer", "APP — à garder", "Activation compte", "Lien reçu par e-mail"),
    ("app-connexion-externe", "/connexion-externe", "APP — à garder", "OAuth", "Retour Google/Microsoft"),
    ("app-entreprise-rejoindre", "/entreprise/rejoindre", "APP — à garder", "Rejoindre une équipe", "Invitation par e-mail"),
    ("app-legal-confidentialite", "/legal/confidentialite", "APP — légal (Google)", "Politique de confidentialité", "Déclarée à Google Cloud — NE PAS RETIRER"),
    ("app-legal-mentions", "/legal/mentions-legales", "APP — légal (Google)", "Mentions légales", "Redirections zayado.net/legal/* → ici"),
    ("app-legal-cgu", "/legal/cgu", "APP — légal (Google)", "CGU", ""),
    ("app-legal-cgv", "/legal/cgv", "APP — légal (Google)", "CGV", ""),
    ("app-embed-tarifs", "/embed/tarifs", "APP — iframes boutique", "Embed tarifs", "Affiché DANS /pages/cockpit de la boutique"),
    ("app-embed-confidentialite", "/embed/confidentialite", "APP — DOUBLON ?", "Embed confidentialité", "Réparée (était blanche, thème sombre cassé). La boutique n'y fait plus appel → retrait possible"),
    ("app-pricing", "/pricing", "APP — DOUBLON ?", "Tarifs SaaS", "Existe aussi sur la boutique (iframe) — les CGV y renvoient"),
    ("app-partenaires", "/partenaires/thesustain", "APP — DOUBLON ?", "Partenaire TheSustain", "Aucun lien depuis la boutique"),
]

SHOP_PAGES = [
    ("shop-accueil", "/", "Accueil"),
    ("shop-maison", "/pages/maison", "La Maison"),
    ("shop-besoins", "/pages/besoins", "De quoi avez-vous besoin ?"),
    ("shop-cockpit", "/pages/cockpit", "Le Cockpit"),
    ("shop-contact", "/pages/contact", "Contact"),
    ("shop-liens", "/pages/liens", "Page de liens"),
    ("shop-services", "/pages/services", "Services"),
    ("shop-parcours", "/pages/parcours", "Parcours"),
    ("shop-vision", "/pages/vision", "Vision"),
    ("shop-boutique", "/pages/boutique", "Boutique (rayons)"),
    ("shop-box", "/pages/box", "Box"),
    ("shop-confidentialite", "/pages/confidentialite", "Confidentialité"),
    ("shop-mentions", "/pages/mentions-legales", "Mentions légales"),
    ("shop-cgu", "/pages/cgu", "CGU"),
    ("shop-cgv", "/pages/cgv", "CGV"),
    ("shop-journal", "/blogs/journal", "Le Journal"),
    ("shop-outils", "/collections/outils-ia", "Collection Outils IA"),
    ("shop-ressources", "/collections/ressources", "Collection Ressources"),
    ("shop-panier", "/cart", "Panier"),
    ("shop-recherche", "/search", "Recherche"),
]


def capture(nom, url):
    cible = OUT / f"{nom}.png"
    subprocess.run(
        ["google-chrome", "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
         f"--screenshot={cible}", "--window-size=1366,900", "--virtual-time-budget=7000", url],
        check=False, capture_output=True, timeout=60)
    ok = cible.exists() and cible.stat().st_size > 8000
    print(("OK " if ok else "KO ") + nom, flush=True)
    return ok


if __name__ == "__main__":
    resultats = {}
    for nom, chemin, *_ in APP_PAGES:
        resultats[nom] = capture(nom, APP + chemin)
    for nom, chemin, _ in SHOP_PAGES:
        resultats[nom] = capture(nom, SHOP + chemin)

    print("TERMINE", sum(resultats.values()), "/", len(resultats), flush=True)
