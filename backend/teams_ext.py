"""Pack de l'application Microsoft Teams, généré à la volée.

Avant : le bouton « Télécharger le pack Teams » pointait vers /teams/zayado-teams.zip,
fichier qui n'a jamais été ajouté au dépôt → 404 (ou la page HTML de l'app enregistrée
en .zip). Maintenant le pack est construit par le serveur pour le domaine qui le
demande (app.zayado.net, ou le sous-domaine d'une entreprise) : manifest Teams 1.16,
icône couleur 192×192 et icône contour 32×32.

Ce que le pack montre (corrigé) : L'ÉQUIPE, pas le cockpit personnel. Avant, il proposait Aujourd'hui, Radar, Plan d'action et
Vision : des données personnelles, hors de propos dans un outil de travail partagé. Maintenant :
  • onglets personnels (visibles de soi seul) : Mon équipe, Absences, Planning — l'équipe « Ton entreprise » de Zayado ;
  • onglet à ajouter dans un canal, un chat ou une réunion : la page Équipe. Chacun n'y voit que ce que son rôle permet,
    et jamais énergie, Vision, Radar, Ma Foi ou Bien-être.

Routes publiques : GET /api/public/teams/zayado-teams.zip et GET /api/public/teams/config (page de configuration de l'onglet)
"""
import io
import json
import os
import re
import uuid
import zipfile
from pathlib import Path

from fastapi import Request
from fastapi.responses import HTMLResponse, Response

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
        ("equipe", "Ton entreprise", "/app/entreprise?vue=aujourdhui"),
        ("pieces", "Pièces", "/app/entreprise?vue=pieces"),
        ("planning", "Planning", "/app/entreprise?vue=planning"),
        ("absences", "Absences", "/app/entreprise?vue=absences"),
        ("decompte", "Décompte", "/app/entreprise?vue=decompte"),
    ]
    manifest = {
        "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
        "manifestVersion": "1.16",
        "version": "1.3.0",  # à augmenter à chaque changement : Teams ne propose la mise à jour que si la version monte
        "id": str(uuid.uuid5(NAMESPACE, hote)),
        "developer": {
            "name": "Zayado (SAS TheSustain)",
            "websiteUrl": "https://zayado.net",
            "privacyUrl": "https://zayado.net/policies/privacy-policy",
            "termsOfUseUrl": "https://zayado.net/policies/terms-of-service",
        },
        "name": {"short": "Zayado", "full": "Ton entreprise by Zayado, dans Teams"},
        "description": {
            "short": "Pièces, planning, absences et décompte du mois de ton équipe, dans Teams.",
            "full": ("Ouvre ton équipe Zayado à côté de tes conversations : qui est au bureau, en télétravail ou absent, "
                     "les demandes d'absence à valider, le planning de la semaine, les pièces à fournir dans le Drive de l'entreprise "
                     "et le décompte du mois (congés payés compris) à télécharger. Ajoute l'onglet « Équipe » dans un canal pour que "
                     "tout le monde le voie. Chacun se connecte avec son compte Zayado et ne voit que ce que son rôle permet ; "
                     "rien de personnel (énergie, Vision, Radar) n'apparaît dans Teams."),
        },
        "icons": {"color": "color.png", "outline": "outline.png"},
        "accentColor": "#1F2A44",
        "staticTabs": [
            {"entityId": cle, "name": nom, "contentUrl": f"{base}{chemin}?source=teams",
             "websiteUrl": f"{base}{chemin}", "scopes": ["personal"]}
            for cle, nom, chemin in onglets
        ],
        "configurableTabs": [{
            "configurationUrl": f"{base}/api/public/teams/config",
            "canUpdateConfiguration": False,
            "scopes": ["team", "groupchat"],
            "context": ["channelTab", "privateChatTab", "meetingChatTab"],
        }],
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


    @api.get("/public/teams/config")
    async def config_onglet(request: Request):
        """Page affichée par Teams quand on ajoute l'onglet « Équipe » à un canal ou à un chat : enregistre l'URL de la page Équipe."""
        base = f"https://{_hote(request)}"
        html = f"""<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Zayado · Équipe</title>
<style>body{{font-family:Segoe UI,system-ui,sans-serif;margin:0;padding:28px;color:#1f2a44}}h1{{font-size:20px;margin:0 0 8px}}p{{line-height:1.5;color:#444}}</style>
<script src="https://res.cdn.office.net/teams-js/2.31.0/js/MicrosoftTeams.min.js"></script></head>
<body><h1>Ajouter l'équipe Zayado</h1>
<p>L'onglet affiche la présence, les absences et le planning de l'équipe. Chaque personne se connecte avec son compte Zayado et ne voit que ce que son rôle permet. Aucune donnée personnelle (énergie, Vision, Radar) n'est affichée ici.</p>
<script>
microsoftTeams.app.initialize().then(function () {{
  microsoftTeams.pages.config.registerOnSaveHandler(function (e) {{
    microsoftTeams.pages.config.setConfig({{
      entityId: "equipe", suggestedDisplayName: "Zayado · Équipe",
      contentUrl: "{base}/app/entreprise?vue=aujourdhui&source=teams",
      websiteUrl: "{base}/app/entreprise?vue=aujourdhui"
    }}).then(function () {{ e.notifySuccess(); }}).catch(function () {{ e.notifyFailure("Configuration impossible"); }});
  }});
  microsoftTeams.pages.config.setValidityState(true);
}});
</script></body></html>"""
        return HTMLResponse(html, headers={"Cache-Control": "no-cache"})
