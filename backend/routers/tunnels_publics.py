"""Publication des tunnels de l'utilisateur : adresse publique, référencement, mentions légales.

Privé (/api/copilote/…) :
  GET/PUT  /editeur                       mentions de l'éditeur (l'entreprise de l'utilisateur)
  PUT      /tunnels/{tid}/seo             titre, description, image de partage
  POST     /tunnels/images                image (JPG/PNG/WebP, 3 Mo max) → URL publique
  POST     /tunnels/{tid}/publier         adresse publique /t/{slug} + mise en ligne (mentions obligatoires)

Public (/api/public/…, sans compte) :
  GET      /public/t/{slug}               le tunnel en ligne (pages, offre, mentions de l'éditeur)
  POST     /public/t/{slug}/contact       inscription / demande de commande → contact du tunnel + Radar
  GET      /public/t/{slug}/partage       page HTML avec les balises de partage (Open Graph), puis redirection
  GET      /public/t-img/{id}             image d'un tunnel

Règle : le tunnel appartient à l'utilisateur. Ses pages publiques portent SES mentions légales
(raison sociale, SIREN, adresse, contact), Zayado n'apparaît que comme prestataire technique.
"""

import base64
import html
import os
import re
import sys
import unicodedata
import uuid

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel, Field

from lib.db import db
from lib.utilisateur import uid

router = APIRouter()          # monté sous /copilote
router_public = APIRouter()   # monté sous /api (préfixe /public/ déjà ouvert sans compte)

IMG_MAX = 3 * 1024 * 1024
SIGNATURES = {"image/jpeg": b"\xff\xd8\xff", "image/png": b"\x89PNG", "image/webp": b"RIFF"}
CHAMPS_OBLIGATOIRES = ("raison_sociale", "siren", "adresse", "email")


def _front() -> str:
    return os.environ.get("PUBLIC_FRONTEND_URL", "https://app.zayado.net").rstrip("/")


# ═══════════ Mentions de l'éditeur ═══════════
class EditeurIn(BaseModel):
    raison_sociale: str = Field(default="", max_length=160)
    forme_juridique: str = Field(default="", max_length=60)
    siren: str = Field(default="", max_length=20)
    adresse: str = Field(default="", max_length=240)
    email: str = Field(default="", max_length=160)
    telephone: str = Field(default="", max_length=30)
    responsable: str = Field(default="", max_length=120)
    tva: str = Field(default="", max_length=40)
    mediateur: str = Field(default="", max_length=240)


async def _editeur_de(user_id: str) -> dict:
    doc = await db.tunnel_editeur.find_one({"user_id": user_id, "id": f"editeur-{user_id}"}) or {}
    return {k: doc.get(k, "") for k in EditeurIn.model_fields}


def _complet(e: dict) -> bool:
    return all((e.get(k) or "").strip() for k in CHAMPS_OBLIGATOIRES)


@router.get("/editeur")
async def lire_editeur():
    e = await _editeur_de(uid())
    return {**e, "complet": _complet(e), "obligatoires": list(CHAMPS_OBLIGATOIRES)}


@router.put("/editeur")
async def maj_editeur(b: EditeurIn):
    await db.tunnel_editeur.update_one({"user_id": uid(), "id": f"editeur-{uid()}"},
                                       {"$set": {**b.model_dump(), "user_id": uid(), "id": f"editeur-{uid()}"}}, upsert=True)
    return await lire_editeur()


# ═══════════ Référencement et images ═══════════
class SeoIn(BaseModel):
    titre: str = Field(default="", max_length=70)
    description: str = Field(default="", max_length=170)
    image: str = Field(default="", max_length=300)


@router.put("/tunnels/{tid}/seo")
async def maj_seo(tid: str, b: SeoIn):
    from routers import copilote as cp

    def f(s):
        t = cp._tunnel(s, tid)
        t["seo"] = {k: v.strip() for k, v in b.model_dump().items()}
        return cp._out(t)
    return await cp._avec(f)


class ImageIn(BaseModel):
    data: str = Field(min_length=20)


@router.post("/tunnels/images")
async def envoyer_image(b: ImageIn):
    brut, mime = b.data, ""
    if brut.startswith("data:"):
        entete, _, brut = brut.partition(",")
        mime = entete[5:].split(";")[0].lower()
    try:
        octets = base64.b64decode(brut, validate=False)
    except Exception:  # noqa: BLE001
        raise HTTPException(400, "Image illisible.")
    if len(octets) > IMG_MAX:
        raise HTTPException(413, "Image trop lourde : 3 Mo maximum.")
    if not mime:  # base64 brut : on reconnaît le format à sa signature
        mime = next((m for m, sg in SIGNATURES.items() if octets.startswith(sg)), "")
    sig = SIGNATURES.get(mime)
    if not sig or not octets.startswith(sig):
        raise HTTPException(415, "Formats acceptés : JPG, PNG ou WebP.")
    iid = uuid.uuid4().hex
    await db.tunnel_images.insert_one({"id": iid, "user_id": uid(), "mime": mime, "b64": base64.b64encode(octets).decode()})
    return {"id": iid, "url": f"/api/public/t-img/{iid}"}


# ═══════════ Publication ═══════════
def _slugifier(texte: str) -> str:
    t = unicodedata.normalize("NFKD", texte).encode("ascii", "ignore").decode().lower()
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return (t or "tunnel")[:48]


@router.post("/tunnels/{tid}/publier")
async def publier(tid: str):
    from routers import copilote as cp

    e = await _editeur_de(uid())
    if not _complet(e):
        raise HTTPException(422, "Avant de publier, complète les mentions légales de ton entreprise "
                                 "(raison sociale, SIREN, adresse, e-mail) : elles s'affichent sur tes pages publiques.")
    t0 = cp._tunnel(await cp._lire(), tid)
    slug = t0.get("slug")
    if not slug:
        base = _slugifier(t0.get("sujet") or t0.get("nom") or "tunnel")
        slug = base
        while await db.tunnels_publics.find_one({"id": slug}):
            slug = f"{base}-{uuid.uuid4().hex[:4]}"
        await db.tunnels_publics.insert_one({"id": slug, "user_id": uid(), "tunnel_id": tid})

    def f(s):
        t = cp._tunnel(s, tid)
        t["slug"], t["etat"] = slug, "en_ligne"
        return cp._out(t)
    out = await cp._avec(f)
    return {"tunnel": out, "url": f"{_front()}/t/{slug}", "partage": f"{_front()}/api/public/t/{slug}/partage"}


# ═══════════ Public ═══════════
async def _tunnel_public(slug: str) -> tuple[dict, str]:
    idx = await db.tunnels_publics.find_one({"id": slug})
    if not idx:
        raise HTTPException(404, "Cette page n'existe pas.")
    espace = await db.copilote_espace.find_one({"user_id": idx["user_id"]}) or {}
    t = next((x for x in (espace.get("data") or {}).get("tunnels", []) if x.get("id") == idx["tunnel_id"]), None)
    if not t or t.get("etat") != "en_ligne":
        raise HTTPException(404, "Cette page n'est pas en ligne pour le moment.")
    return t, idx["user_id"]


@router_public.get("/public/t/{slug}")
async def lire_public(slug: str):
    t, proprietaire = await _tunnel_public(slug)
    e = await _editeur_de(proprietaire)
    from routers.paiements_tunnels import paiement_actif
    return {
        "paiement_en_ligne": await paiement_actif(proprietaire), "slug": slug, "nom": t.get("nom"), "sujet": t.get("sujet"), "parcours": t.get("parcours", "produit"),
        "etapes": t.get("etapes", []), "offre": t.get("offre") or {}, "upsell": t.get("upsell") or {},
        "downsell": t.get("downsell") or {}, "seo": t.get("seo") or {}, "editeur": e,
        "code": t.get("code") or {},
    }


class ContactPublicIn(BaseModel):
    nom: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=160)
    consentement: bool
    intention: str = Field(default="capture", pattern="^(capture|tripwire|commande|upsell|downsell|rendez_vous)$")


LIBELLES_INTENTION = {"capture": "Inscrit(e) via la page de capture", "tripwire": "Veut l'offre de démarrage",
                      "commande": "Veut commander l'offre principale", "upsell": "Veut ajouter l'option",
                      "downsell": "Préfère la version allégée", "rendez_vous": "Demande un rendez-vous"}


@router_public.post("/public/t/{slug}/contact")
async def contact_public(slug: str, b: ContactPublicIn):
    if not b.consentement:
        raise HTTPException(422, "Le consentement est nécessaire.")
    if not re.match(r"^\S+@\S+\.\S+$", b.email.strip()):
        raise HTTPException(422, "Adresse e-mail invalide.")
    t, proprietaire = await _tunnel_public(slug)
    srv = sys.modules.get("server")
    jeton = srv._current_uid.set(proprietaire)  # on écrit dans l'espace du propriétaire du tunnel
    try:
        from models.copilote import ContactIn
        from routers import copilote as cp
        email = b.email.strip()
        deja = next((x for x in t.get("contacts", []) if (x.get("email") or "").lower() == email.lower()), None)
        # Une même personne qui avance dans le tunnel reste UN contact : on met à jour sa demande au lieu de la dupliquer.
        c = deja or await cp.contact_tunnel(t["id"], ContactIn(nom=b.nom, email=email))
        if b.intention != "capture":  # précise la demande sur le signal du Radar de cette personne
            derniers = await db.radar_signaux.find({"user_id": proprietaire, "categorie": "entrante"}).sort("date_fait", -1).to_list(20)
            sig = next((s for s in derniers if email in s.get("fait", "")), None)
            if sig:  # les demandes s'additionnent (commande · option) au lieu de s'écraser
                avant = sig.get("fait", "").rsplit(" (", 1)[0]
                label = LIBELLES_INTENTION[b.intention]
                fait = label if avant.startswith("Inscrit") or not avant else (avant if label in avant else f"{avant} · {label}")
                await db.radar_signaux.update_one({"id": sig["id"]}, {"$set": {
                    "fait": f"{fait} ({email})", "statut": "nouveau",
                    "action": f"Recontacter {c['nom']} — {LIBELLES_INTENTION[b.intention].lower()}"}})
    finally:
        srv._current_uid.reset(jeton)
    # Le propriétaire du tunnel est prévenu tout de suite (cloche + notification), une fois par personne et par demande.
    from lib.notifs import notifier
    nom_t = t.get("nom") or "ton tunnel"
    if b.intention == "capture":
        titre, corps = f"Nouveau contact sur « {nom_t} » 🎯", f"{b.nom.strip()} ({email}) s'est inscrit(e). Il ou elle t'attend dans ton Radar."
    else:
        titre, corps = f"{b.nom.strip()} : {LIBELLES_INTENTION[b.intention].lower()} 🔥", f"Sur « {nom_t} ». Rappelle vite : c'est le bon moment."
    await notifier(proprietaire, "tunnel", titre, corps, f"/tunnels/{t['id']}", cle=f"tunnel:{t['id']}:{email.lower()}:{b.intention}")
    # Zayado relie, il ne stocke pas : le contact part dans l'outil de l'utilisateur (Brevo, HubSpot, son classeur, Make).
    pousser = getattr(srv, "crm_pousser_en_tache", None) if srv else None
    if pousser:
        pousser(proprietaire, {"nom": b.nom.strip(), "email": email, "source": f"Tunnel « {nom_t} »",
                               "demande": LIBELLES_INTENTION[b.intention]})
    try:
        await _relance_du_jour(proprietaire, b.nom.strip())
    except Exception:  # noqa: BLE001 — le Plan d'action ne doit jamais faire échouer l'inscription du visiteur
        pass
    return {"ok": True}


async def _relance_du_jour(proprietaire: str, nom: str) -> None:
    """UNE action par jour dans le Plan d'action, pas une par contact (la capacité du jour reste respectée) :
    « Relancer les nouveaux inscrits (3) : Claire, Karim, Sophie »."""
    from datetime import datetime, timezone
    from routers.radar import MOIS
    jour = datetime.now(timezone.utc).date()
    cle = f"relance-tunnels:{jour.isoformat()}"
    a = await db.plan_actions.find_one({"user_id": proprietaire, "cle": cle, "fait": False})
    if a:
        noms = list(dict.fromkeys([*(a.get("personnes") or []), nom]))
    else:
        noms = [nom]
    titre = (f"Relancer {noms[0]}, inscrit(e) à votre tunnel" if len(noms) == 1
             else f"Relancer les nouveaux inscrits ({len(noms)}) : {', '.join(noms[:4])}{'…' if len(noms) > 4 else ''}")
    if a:
        await db.plan_actions.update_one({"id": a["id"]}, {"$set": {"titre": titre[:200], "personnes": noms}})
        return
    dernier = await db.plan_actions.find({"user_id": proprietaire}).sort("ordre", -1).to_list(1)
    await db.plan_actions.insert_one({
        "id": str(uuid.uuid4()), "user_id": proprietaire, "titre": titre[:200], "module": "Tunnels",
        "echeance": f"{jour.day} {MOIS[jour.month - 1]}", "source": "Inscriptions du jour", "fait": False,
        "priorite": False, "ordre": (dernier[0]["ordre"] + 1) if dernier else 100, "cle": cle, "personnes": noms,
    })


@router_public.get("/public/t-img/{iid}")
async def image_publique(iid: str):
    img = await db.tunnel_images.find_one({"id": iid})
    if not img:
        raise HTTPException(404, "Image introuvable.")
    return Response(content=base64.b64decode(img["b64"]), media_type=img.get("mime", "image/jpeg"),
                    headers={"Cache-Control": "public, max-age=31536000, immutable"})


@router_public.get("/public/t/{slug}/partage", response_class=HTMLResponse)
async def partage(slug: str):
    """Les réseaux sociaux ne lisent pas le JavaScript : cette page porte titre, description et image,
    puis renvoie le visiteur vers la vraie page du tunnel."""
    t, _ = await _tunnel_public(slug)
    seo = t.get("seo") or {}
    capture = next((e for e in t.get("etapes", []) if e.get("cle") == "capture"), {})
    titre = html.escape(seo.get("titre") or capture.get("titre") or t.get("nom") or "")
    desc = html.escape(seo.get("description") or capture.get("accroche") or "")
    url = f"{_front()}/t/{slug}"
    img = seo.get("image") or ""
    if img.startswith("/"):
        img = _front() + img
    img_tag = f'<meta property="og:image" content="{html.escape(img)}"><meta name="twitter:card" content="summary_large_image">' if img else ""
    return HTMLResponse(f"""<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>{titre}</title><meta name="description" content="{desc}">
<meta property="og:type" content="website"><meta property="og:title" content="{titre}">
<meta property="og:description" content="{desc}"><meta property="og:url" content="{url}">{img_tag}
<link rel="canonical" href="{url}"><meta http-equiv="refresh" content="0; url={url}"></head>
<body><a href="{url}">{titre}</a></body></html>""")



# Pages d'entrée publiques de Zayado : lien de partage avec aperçu (les réseaux ne lisent pas le JavaScript).
PAGES_ZAYADO = {
    "reprise": ("/public/reprise", "Créer ou reprendre une entreprise ? Fais le test · Zayado",
                "Racheter une entreprise qui tourne déjà : des clients dès le premier jour, un financement possible avec peu ou pas d'apport.", "/og/reprise.png"),
    "cession": ("/public/cession", "Vendre son entreprise au bon prix · Zayado",
                "Prépare ta cession : un prix défendable, le bon repreneur, une transmission sereine.", "/og/cession.png"),
    "diagnostic": ("/public/tunnel", "Diagnostic gratuit pour entrepreneurs · Zayado",
                   "Quatre réponses, et tu repars avec ta priorité du moment et un premier pas concret.", "/og/diagnostic.png"),
}


@router_public.get("/public/partage/{page}", response_class=HTMLResponse)
async def partage_zayado(page: str):
    if page not in PAGES_ZAYADO:
        raise HTTPException(404, "Page inconnue.")
    chemin, titre, desc, img = PAGES_ZAYADO[page]
    url = _front() + chemin
    return HTMLResponse(f"""<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>{html.escape(titre)}</title><meta name="description" content="{html.escape(desc)}">
<meta property="og:type" content="website"><meta property="og:title" content="{html.escape(titre)}">
<meta property="og:description" content="{html.escape(desc)}"><meta property="og:url" content="{url}">
<meta property="og:image" content="{_front()}{img}"><meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="{url}"><meta http-equiv="refresh" content="0; url={url}"></head>
<body><a href="{url}">{html.escape(titre)}</a></body></html>""")


# ═══════════ Mentions légales de Zayado (pages /legal/*) — modifiables par un administrateur ═══════════
class LegalZayadoIn(BaseModel):
    siege: str = Field(default="", max_length=240)
    rcs: str = Field(default="", max_length=120)
    capital: str = Field(default="", max_length=60)
    directeur: str = Field(default="", max_length=120)
    mediateur: str = Field(default="", max_length=300)
    hebergeur_app: str = Field(default="", max_length=300)
    hebergeur_boutique: str = Field(default="", max_length=300)
    email: str = Field(default="", max_length=160)


_LEGAL_ID = {"user_id": "zayado", "id": "legal-zayado"}


async def _legal_zayado() -> dict:
    doc = await db.reglages_zayado.find_one(_LEGAL_ID) or {}
    return {k: doc.get(k, "") for k in LegalZayadoIn.model_fields}


@router_public.get("/public/legal-zayado")
async def lire_legal_zayado():
    return await _legal_zayado()


@router.put("/admin/legal-zayado")
async def maj_legal_zayado(b: LegalZayadoIn):
    from routers import copilote as cp
    if not await cp._est_admin():
        raise HTTPException(403, "Réservé aux administrateurs Zayado.")
    data = {k: v.strip() for k, v in b.model_dump().items()}
    if await db.reglages_zayado.find_one(_LEGAL_ID):
        await db.reglages_zayado.update_one(_LEGAL_ID, {"$set": data})
    else:
        await db.reglages_zayado.insert_one({**_LEGAL_ID, **data})
    return await _legal_zayado()
