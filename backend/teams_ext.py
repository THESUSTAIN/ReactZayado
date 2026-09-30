"""Pack de l'application Microsoft Teams, généré à la volée.

Avant : le bouton « Télécharger le pack Teams » pointait vers /teams/zayado-teams.zip,
fichier qui n'a jamais été ajouté au dépôt → 404 (ou la page HTML de l'app enregistrée
en .zip). Maintenant le pack est construit par le serveur pour le domaine qui le
demande (app.zayado.net, ou le sous-domaine d'une entreprise) : manifest Teams 1.16,
icône couleur 192×192 et icône contour 32×32.

Route publique : GET /api/public/teams/zayado-teams.zip
"""
import io
import json
import os
import re
import uuid
import zipfile
from pathlib import Path

from fastapi import Request
from fastapi.responses import Response

ICONES = Path(__file__).parent / "assets" / "teams"
# Identifiant stable de l'appli (Teams remplace l'appli existante au lieu d'en ajouter une seconde).
NAMESPACE = uuid.UUID("6f1d2c3b-7a8e-4f90-9b1c-2d3e4f5a6b7c")


def _hote(request: Request) -> str:
    fixe = (os.environ.get("TEAMS_APP_HOST") or "").strip()
    if fixe:
        return re.sub(r"^https?://", "", fixe).rstrip("/")
    h = request.headers.get("x-forwarded-host") or request.headers.get("host") or "app.zayado.net"
    h = h.split(",")[0].strip()
    # En local on garde un domaine public valide (Teams exige https + domaine réel).
    return "app.zayado.net" if h.startswith(("localhost", "127.")) else h


def construire_pack(hote: str) -> bytes:
    base = f"https://{hote}"
    onglets = [
        ("aujourdhui", "Aujourd'hui", "/app"),
        ("radar", "Radar", "/app/radar"),
        ("actions", "Plan d'action", "/app/actions"),
        ("vision", "Vision", "/app/vision"),
    ]
    manifest = {
        "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
        "manifestVersion": "1.16",
        "version": "1.1.0",
        "id": str(uuid.uuid5(NAMESPACE, hote)),
        "developer": {
            "name": "Zayado (SAS TheSustain)",
            "websiteUrl": "https://zayado.net",
            "privacyUrl": "https://zayado.net/policies/privacy-policy",
            "termsOfUseUrl": "https://zayado.net/policies/terms-of-service",
        },
        "name": {"short": "Zayado", "full": "Zayado, le cockpit des indépendants"},
        "description": {
            "short": "Ton cockpit Zayado dans Teams : énergie, Radar, plan d'action, Vision.",
            "full": ("Ouvre Zayado à côté de tes conversations : ton point du jour et ton énergie, "
                     "3 opportunités qualifiées par jour (Radar), ton plan d'action à 90 jours et ta Vision. "
                     "Connecte-toi une fois avec ton compte Zayado."),
        },
        "icons": {"color": "color.png", "outline": "outline.png"},
        "accentColor": "#1F2A44",
        "staticTabs": [
            {"entityId": cle, "name": nom, "contentUrl": f"{base}{chemin}?source=teams",
             "websiteUrl": f"{base}{chemin}", "scopes": ["personal"]}
            for cle, nom, chemin in onglets
        ],
        "permissions": ["identity"],
        "validDomains": [hote],
    }
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
        z.write(ICONES / "color.png", "color.png")
        z.write(ICONES / "outline.png", "outline.png")
    return buf.getvalue()


def install_teams(g: dict) -> None:
    api = g["api"]

    @api.get("/public/teams/zayado-teams.zip")
    async def pack_teams(request: Request):
        contenu = construire_pack(_hote(request))
        return Response(content=contenu, media_type="application/zip", headers={
            "Content-Disposition": 'attachment; filename="zayado-teams.zip"',
            "Cache-Control": "no-cache",
        })
