"""Connexions (coffre-fort personnel) — porté depuis app-main/backend/routes/connections.py.

Attention, ce module ne recouvre PAS tout ce que ce nom pouvait laisser
penser au départ. Avant de l'écrire, j'ai vérifié ce qui existait déjà dans
ce repo et trouvé que l'essentiel du sujet « OAuth Google Workspace /
Microsoft 365 » était déjà fait, en mieux : `server.py` a déjà un vrai flux
OAuth Google/Microsoft avec rafraîchissement de jeton (`_oauth_echange`,
`_cloud_token`), branché sur Google Drive et OneDrive/SharePoint pour
l'enregistrement automatique de documents, et un catalogue admin
(`INTEGRATIONS_CATALOG`) qui couvre déjà Google, Microsoft, Brevo, WhatsApp,
Telegram, Qonto, Pennylane, HubSpot, Odoo, Slack, Teams, Trello, Jira au
niveau plateforme (clés d'API définies par l'admin, dans les variables
d'environnement). WhatsApp et Telegram ont aussi déjà leur propre flux de
connexion par utilisateur (`/connections/whatsapp/*`, `/connections/telegram/*`).

Ce qui manquait réellement, et que ce module ajoute : un coffre-fort **par
utilisateur** où chacun branche ses propres comptes tiers (pas ceux de la
plateforme) pour des outils de productivité/veille — Notion, Slack, Discord,
Airtable, Asana, Trello, Linear, GitHub, Calendly, HubSpot — plus deux cas
un peu à part (Brevo et SMTP personnalisé, utiles si un utilisateur veut
envoyer depuis SA PROPRE adresse plutôt que via la plateforme) et OVH
Téléphonie/SMS. Simple clé API en clair côté formulaire, chiffrée au repos
avec `_chiffrer` (Fernet, déjà en place), réutilise le modèle
`UserConnection` déjà existant plutôt que d'en créer un nouveau.

Volontairement absents de ce catalogue : whatsapp, telegram (déjà leurs
propres routes dédiées ci-dessus dans `server.py`), google_workspace et
microsoft_365 (déjà couverts par le flux OAuth Drive/OneDrive existant —
en ajouter une deuxième variante aurait juste créé deux façons différentes
de faire la même chose).
"""
import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select

log = logging.getLogger("kairos.connexions_vault")

# ─── Catalogue des fournisseurs en libre-service (clé API simple) ──────────
PROVIDERS = [
    {"id": "brevo", "name": "Brevo (email, votre propre compte)",
     "description": "Envoyer depuis votre propre compte Brevo plutôt que celui de la plateforme.",
     "icon": "mail", "category": "email", "fields": [
         {"key": "api_key", "label": "Clé API Brevo", "type": "password", "required": True},
         {"key": "sender_email", "label": "Email expéditeur", "type": "email", "required": True},
         {"key": "sender_name", "label": "Nom expéditeur", "type": "text", "required": False},
     ]},
    {"id": "smtp", "name": "SMTP personnalisé",
     "description": "Serveur SMTP personnalisé (OVH, Ionos, etc.).",
     "icon": "server", "category": "email", "fields": [
         {"key": "host", "label": "Serveur SMTP", "type": "text", "required": True},
         {"key": "port", "label": "Port", "type": "number", "required": True},
         {"key": "username", "label": "Identifiant", "type": "text", "required": True},
         {"key": "password", "label": "Mot de passe", "type": "password", "required": True},
         {"key": "sender_email", "label": "Email expéditeur", "type": "email", "required": True},
     ]},
    {"id": "ovh_phone", "name": "OVH Téléphonie / SMS",
     "description": "Appels et SMS via OVH Télécom.",
     "icon": "phone", "category": "telephonie", "fields": [
         {"key": "application_key", "label": "Application Key", "type": "text", "required": True},
         {"key": "application_secret", "label": "Application Secret", "type": "password", "required": True},
         {"key": "consumer_key", "label": "Consumer Key", "type": "password", "required": True},
         {"key": "service_name", "label": "Nom du service (billing account)", "type": "text", "required": True},
     ]},
    {"id": "notion", "name": "Notion", "description": "Notes, docs et wikis dans un espace de travail unifié.",
     "icon": "notebook", "category": "productivite", "help_url": "https://www.notion.so/my-integrations", "fields": [
         {"key": "integration_token", "label": "Token d'intégration (secret_...)", "type": "password", "required": True},
     ]},
    {"id": "slack", "name": "Slack (votre espace)", "description": "Notifications et recherche dans votre espace Slack personnel.",
     "icon": "slack", "category": "productivite", "fields": [
         {"key": "bot_token", "label": "Bot Token (xoxb-...)", "type": "password", "required": True},
     ]},
    {"id": "discord", "name": "Discord", "description": "Bot Discord pour notifications communautaires.",
     "icon": "hash", "category": "productivite", "fields": [
         {"key": "bot_token", "label": "Bot Token", "type": "password", "required": True},
     ]},
    {"id": "airtable", "name": "Airtable", "description": "Bases tableurs pour projets et workflows.",
     "icon": "database", "category": "productivite", "fields": [
         {"key": "api_key", "label": "Clé API (personal access token)", "type": "password", "required": True},
         {"key": "base_id", "label": "Base ID", "type": "text", "required": False},
     ]},
    {"id": "asana", "name": "Asana", "description": "Suivi de tâches et projets.",
     "icon": "target", "category": "productivite", "fields": [
         {"key": "access_token", "label": "Personal Access Token", "type": "password", "required": True},
     ]},
    {"id": "trello", "name": "Trello (votre compte)", "description": "Tableaux kanban personnels.",
     "icon": "columns", "category": "productivite", "fields": [
         {"key": "api_key", "label": "Clé API", "type": "text", "required": True},
         {"key": "token", "label": "Token", "type": "password", "required": True},
     ]},
    {"id": "make", "name": "Make (automatisations)",
     "description": "Envoie tes actions et idées vers Teams, Trello, ton agenda… via un scénario Make.",
     "icon": "zap", "category": "productivite", "help_url": "https://www.make.com/en/help/tools/webhooks", "fields": [
         {"key": "url", "label": "Adresse du webhook Make (https://hook.eu1.make.com/…)", "type": "text", "required": True},
     ]},
    {"id": "linear", "name": "Linear", "description": "Suivi d'incidents et planification produit.",
     "icon": "zap", "category": "productivite", "fields": [
         {"key": "api_key", "label": "Clé API", "type": "password", "required": True},
     ]},
    {"id": "github", "name": "GitHub", "description": "Hébergement de code, revues, CI/CD.",
     "icon": "github", "category": "productivite", "fields": [
         {"key": "token", "label": "Personal Access Token", "type": "password", "required": True},
     ]},
    {"id": "calendly", "name": "Calendly", "description": "Planification automatique de rendez-vous.",
     "icon": "calendar", "category": "productivite", "fields": [
         {"key": "api_key", "label": "Clé API personnelle", "type": "password", "required": True},
     ]},
    {"id": "hubspot", "name": "HubSpot (votre compte)", "description": "CRM et marketing automation personnels.",
     "icon": "heart", "category": "productivite", "fields": [
         {"key": "access_token", "label": "Private App Access Token", "type": "password", "required": True},
     ]},
]
_PROVIDERS_BY_ID = {p["id"]: p for p in PROVIDERS}


def install_connexions_vault(g: dict) -> None:
    api, get_db = g["api"], g["get_db"]
    _uid = g["_uid"]
    exiger_role = g["exiger_role"]
    UserConnection = g["UserConnection"]
    _get_connection = g["_get_connection"]
    _connection_json = g["_connection_json"]
    _chiffrer, _dechiffrer = g["_chiffrer"], g["_dechiffrer"]
    utcnow = g["utcnow"]
    User = g["User"]
    AsyncSession = g["AsyncSession"]

    @api.get("/connections/providers")
    async def lister_providers(db: AsyncSession = Depends(get_db)):
        """Catalogue + état (connecté ou non) pour l'utilisateur courant."""
        rows = (await db.execute(
            select(UserConnection.provider).where(
                UserConnection.user_id == _uid(), UserConnection.revoked_at.is_(None),
                UserConnection.provider.in_(list(_PROVIDERS_BY_ID.keys())),
            )
        )).scalars().all()
        connectes = set(rows)
        return [{**p, "connected": p["id"] in connectes} for p in PROVIDERS]

    class ConnexionIn(BaseModel):
        values: dict

    @api.post("/connections/{provider}")
    async def connecter(provider: str, body: ConnexionIn, db: AsyncSession = Depends(get_db)):
        spec = _PROVIDERS_BY_ID.get(provider)
        if not spec:
            raise HTTPException(404, "Fournisseur inconnu.")
        manquants = [f["key"] for f in spec["fields"] if f.get("required") and not str(body.values.get(f["key"]) or "").strip()]
        if manquants:
            raise HTTPException(422, f"Champs manquants : {', '.join(manquants)}")
        valeurs = {f["key"]: str(body.values.get(f["key"]) or "").strip() for f in spec["fields"] if body.values.get(f["key"])}
        if provider == "make":
            from pilotage_ext import url_make_valide
            if not url_make_valide(valeurs.get("url", "")):
                raise HTTPException(422, "Colle l'adresse du webhook Make : elle commence par https://hook.eu1.make.com/")
        conn = await _get_connection(db, provider)
        if provider == "trello" and conn and conn.credentials_enc:
            # Reconnecter les mêmes identifiants ne doit pas effacer la liste Trello déjà choisie.
            try:
                ancien = json.loads(_dechiffrer(conn.credentials_enc) or "{}")
                if ancien.get("api_key") == valeurs.get("api_key") and ancien.get("token") == valeurs.get("token"):
                    for k in ("list_id", "list_nom", "board_nom"):
                        if ancien.get(k):
                            valeurs[k] = ancien[k]
            except Exception:  # noqa: BLE001
                pass
        if not conn:
            conn = UserConnection(user_id=_uid(), provider=provider, label=spec["name"])
            db.add(conn)
        conn.label = spec["name"]
        conn.status = "ready"
        conn.credentials_enc = _chiffrer(json.dumps(valeurs))
        conn.revoked_at = None
        await db.commit()
        return _connection_json(conn)

    @api.delete("/connections/{provider}")
    async def deconnecter(provider: str, db: AsyncSession = Depends(get_db)):
        if provider not in _PROVIDERS_BY_ID:
            raise HTTPException(404, "Fournisseur inconnu.")
        conn = await _get_connection(db, provider)
        if not conn:
            raise HTTPException(404, "Non connecté.")
        conn.status, conn.revoked_at = "revoked", utcnow()
        await db.commit()
        return {"ok": True}

    # ── Admin : vue d'ensemble de qui a connecté quoi (lecture des métadonnées
    # uniquement — jamais les identifiants déchiffrés) ──────────────────────
    @api.get("/admin/connections/stats")
    async def admin_stats(db: AsyncSession = Depends(get_db), _r=Depends(exiger_role("admin"))):
        rows = (await db.execute(
            select(UserConnection.provider, UserConnection.status, UserConnection.user_id)
            .where(UserConnection.revoked_at.is_(None))
        )).all()
        par_provider: dict[str, dict] = {}
        utilisateurs = set()
        for provider, status, user_id in rows:
            utilisateurs.add(user_id)
            entree = par_provider.setdefault(provider, {"provider": provider, "total": 0, "verified": 0})
            entree["total"] += 1
            if status == "ready":
                entree["verified"] += 1
        classement = sorted(par_provider.values(), key=lambda p: p["total"], reverse=True)
        return {
            "total_connections": len(rows),
            "users_with_connections": len(utilisateurs),
            "per_provider": classement,
        }

    @api.get("/admin/connections/list")
    async def admin_liste(db: AsyncSession = Depends(get_db), _r=Depends(exiger_role("admin"))):
        rows = (await db.execute(
            select(UserConnection, User.email)
            .join(User, User.id == UserConnection.user_id)
            .where(UserConnection.revoked_at.is_(None))
            .order_by(UserConnection.updated_at.desc())
            .limit(300)
        )).all()
        return [{
            "id": c.id, "provider": c.provider, "label": c.label, "status": c.status,
            "user_email": email, "created_at": c.created_at.isoformat() if c.created_at else None,
        } for c, email in rows]
