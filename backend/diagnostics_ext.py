"""État de l'IA et des branchements : /ia/statut (tout connecté) et /admin/diagnostics (admin).

Extrait de server.py (audit d'architecture) sans changement de route ni de réponse.
Ne renvoie jamais de secret : uniquement des booléens et des valeurs non secrètes.
"""
import os

from fastapi import HTTPException


def install_diagnostics(g: dict) -> None:
    api = g["api"]

    @api.get("/ia/statut")
    async def ia_statut():
        """L'IA texte est-elle réellement active ? (bandeau de repli du cockpit)"""
        from llm_mammouth import MAMMOTH_MODEL, EMERGENT_LLM_MODEL, cle_mammouth, cle_emergent

        mammouth = bool(cle_mammouth())
        emergent = bool(cle_emergent())
        active = mammouth or emergent
        f_img = g.get("images_disponibles")
        return {
            "ia_active": active,
            "images_ia": bool(f_img()) if callable(f_img) else bool(g.get("EMERGENT_LLM_KEY")),
            "modele": MAMMOTH_MODEL if mammouth else (EMERGENT_LLM_MODEL if emergent else None),
            # Le détail technique (nom de variable) n'est montré qu'aux admins.
            "message": None
            if active
            else (
                (
                    "L'IA est en mode repli : le Copilote, le Radar et l'Agent Business "
                    "répondent un texte générique. Configurez MAMMOTH_API_KEY (ou EMERGENT_LLM_KEY) pour "
                    "réactiver les réponses personnalisées."
                )
                if g["_role_courant"]() == "admin"
                else "Les réponses personnalisées de l'IA sont momentanément limitées. Tout redevient normal très vite."
            ),
        }

    @api.get("/admin/diagnostics")
    async def admin_diagnostics():
        """État de configuration des clés d'intégration — réservé aux admins."""
        if g["_role_courant"]() != "admin":
            raise HTTPException(403, "Réservé aux administrateurs")

        from llm_mammouth import MAMMOTH_BASE_URL, MAMMOTH_MODEL, cle_mammouth

        ia_texte_ok = bool(cle_mammouth())
        fernet_ok = bool(os.environ.get("FERNET_KEY"))
        jwt_perso = g["JWT_SECRET"] != "kairos-dev-secret-a-changer"

        cles = {
            "ia_texte_mammouth": ia_texte_ok,
            "video_heygen": bool(os.environ.get("HEYGEN_API_KEY")),
            "chiffrement_fernet": fernet_ok,
            "jwt_secret_personnalise": jwt_perso,
            "whatsapp": bool(os.environ.get("WA_SERVICE_SECRET")),
            "telegram": bool(os.environ.get("TELEGRAM_BOT_TOKEN")),
        }

        def _env(*noms):
            return all((os.environ.get(n) or "").strip() for n in noms)

        erreur_shopify = g.get("shopify_jeton_etat", {}).get("erreur")
        branchements = [
            {"cle": "ia", "nom": "IA texte (Mammouth)", "ok": ia_texte_ok, "variables": ["MAMMOTH_API_KEY"], "critique": True,
             "effet": "Copilote, Radar et Agent Business répondent avec un texte générique."},
            {"cle": "mollie", "nom": "Paiements (Mollie)", "ok": _env("MOLLIE_API_KEY"), "variables": ["MOLLIE_API_KEY"], "critique": True,
             "effet": "Personne ne peut payer ni s'abonner."},
            {"cle": "jwt", "nom": "Sessions (JWT_SECRET)", "ok": jwt_perso, "variables": ["JWT_SECRET"], "critique": True,
             "effet": "Le serveur refuse de démarrer en production."},
            {"cle": "email", "nom": "E-mails (Brevo)", "ok": bool(os.environ.get("BREVO_API_KEY") or g.get("EMAIL_KEY")),
             "variables": ["BREVO_API_KEY", "BREVO_SENDER_EMAIL"], "critique": True,
             "effet": "Pas de lien magique, ni de rappel de fin d'essai, ni d'e-mail du lundi."},
            {"cle": "apollo", "nom": "Prospects (Apollo)", "ok": _env("APOLLO_API_KEY"), "variables": ["APOLLO_API_KEY"], "critique": False,
             "effet": "Le Radar ne propose pas de vraies personnes à contacter."},
            {"cle": "dataforseo", "nom": "Volumes Google (DataForSEO)", "ok": _env("DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD"),
             "variables": ["DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD"], "critique": False,
             "effet": "Recherches Google en estimations IA au lieu des volumes réels."},
            {"cle": "shopify", "nom": "Boutique (Shopify)", "ok": _env("SHOPIFY_SHOP_DOMAIN", "SHOPIFY_ADMIN_TOKEN"),
             "variables": ["SHOPIFY_SHOP_DOMAIN", "SHOPIFY_CLIENT_ID", "SHOPIFY_CLIENT_SECRET"], "critique": False,
             "effet": "Les produits des vendeurs ne sont pas publiés sur zayado.net. (Ancienne application Shopify : SHOPIFY_ADMIN_TOKEN à la place de l'ID et du secret client.)"
                      + (f" Dernière erreur : {erreur_shopify}" if erreur_shopify else "")},
            {"cle": "fernet", "nom": "Chiffrement des clés (FERNET_KEY)", "ok": fernet_ok, "variables": ["FERNET_KEY"], "critique": False,
             "effet": "Les clés d'intégration des clients sont stockées en clair."},
            {"cle": "google", "nom": "Connexion Google", "ok": _env("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"),
             "variables": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], "critique": False, "effet": "Bouton Google indisponible (e-mail OK)."},
            {"cle": "microsoft", "nom": "Connexion Microsoft", "ok": _env("MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"),
             "variables": ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"], "critique": False, "effet": "Bouton Microsoft indisponible (e-mail OK)."},
            {"cle": "whatsapp", "nom": "Alertes WhatsApp", "ok": cles["whatsapp"], "variables": ["WA_SERVICE_SECRET"], "critique": False,
             "effet": "Pas d'alertes WhatsApp (offre Pro)."},
            {"cle": "telegram", "nom": "Alertes Telegram", "ok": cles["telegram"], "variables": ["TELEGRAM_BOT_TOKEN"], "critique": False,
             "effet": "Pas d'alertes Telegram (offre Pro)."},
            {"cle": "heygen", "nom": "Vidéos IA (HeyGen)", "ok": cles["video_heygen"], "variables": ["HEYGEN_API_KEY"], "critique": False,
             "effet": "Onglet Vidéos IA inutilisable."},
            {"cle": "thesustain", "nom": "SSO TheSustain", "ok": g["_thesustain_configure"](),
             "variables": ["THESUSTAIN_CLIENT_ID", "THESUSTAIN_CLIENT_SECRET", "THESUSTAIN_OIDC_ISSUER (ou THESUSTAIN_OAUTH_*_URL)"],
             "critique": False, "effet": "Bouton « Continuer avec TheSustain » affiché « bientôt » sur la page de connexion."},
        ]
        manquantes = sorted(k for k, v in cles.items() if not v)
        return {
            "cles": cles,
            "manquantes": manquantes,
            "pret_pour_production": not manquantes,
            "ia_texte": {
                "configuree": ia_texte_ok,
                "modele": MAMMOTH_MODEL,
                "base_url": MAMMOTH_BASE_URL,
                "consequence_si_absente": (
                    "Agent Business, Radar et Copilote répondent en repli local "
                    "(message générique), sans erreur visible."
                ),
            },
            "require_auth": os.environ.get("REQUIRE_AUTH") == "1",
            "branchements": branchements,
        }
