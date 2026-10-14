"""Le cercle de Zayado — ce qui relie les modules entre eux, sans saisie de l'utilisateur.

Carte de liaison (memory/SPEC.md, plan/plan.md, plan/radar.md) :
  socle   : Ma Foi éclaire → Ma Vision fixe le cap
  cycle   : Pilotage dit combien → Radar dit qui ou quoi → Plan d'action engage
            → Bien-être plafonne → Aujourd'hui exécute → Tunnel convertit → Pilotage recalcule

Ce module :
  - pose l'objectif du mois depuis le Pilotage (clients nécessaires au point mort réel),
    lu par le Radar et affiché dans le Plan d'action, avec le compteur « signés » en direct ;
  - crée un tunnel complet EN UN CLIC (sujet, parcours, prix et pages déduits de ce que
    l'app sait déjà) — l'utilisateur relit et publie, rien d'autre ;
  - dit, à chaque instant, où en est le cercle et quelle est la prochaine étape utile.

Règle tenue : rien n'est inventé. Un prix suggéré vient du panier moyen réel ; sans données,
le champ reste vide et l'utilisateur le remplit à la relecture.
"""

import sys
import uuid
from datetime import date, datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from lib.db import db
from lib.utilisateur import uid

router = APIRouter()

ID_OBJECTIF_CLIENTS = "pilotage-clients-mois"
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]


def _auj() -> date:
    return datetime.now(timezone.utc).date()


def _libelle(d: date) -> str:
    return f"{d.day} {MOIS[d.month - 1]}"


# ═══════════ Pilotage → objectif du mois ═══════════
async def signes_du_mois() -> int:
    """Prospects passés à « signé » ce mois-ci (date de signature, sinon date de mise à jour)."""
    debut = _auj().replace(day=1).isoformat()
    docs = await db.radar_prospects.find({"user_id": uid(), "etape": "signe"}).to_list(500)
    return len([d for d in docs if str(d.get("signe_le") or d.get("maj") or "") >= debut])


async def synchroniser_objectif(point_mort) -> None:
    """Appelé après chaque import / retrait dans le Pilotage. Écrit l'objectif lu par le Radar
    et l'objectif « Signer N clients ce mois » du Plan d'action. Sans calcul possible : on retire."""
    n = getattr(point_mort, "clients_necessaires", None) if point_mort else None
    if not n:
        await db.pilotage_objectif.delete_many({"user_id": uid()})
        await db.plan_objectifs.delete_many({"user_id": uid(), "id": ID_OBJECTIF_CLIENTS})
        return
    panier = getattr(point_mort, "panier_moyen", None)
    eur = lambda v: f"{round(v):,} €".replace(",", "\u202f")  # noqa: E731
    source = f"Pilotage — point mort {eur(point_mort.seuil_euros or 0)}"
    if panier:
        source += f", panier moyen {eur(panier)}"
    await db.pilotage_objectif.update_one(
        {"user_id": uid()},
        {"$set": {"user_id": uid(), "id": f"obj-{uid()}", "clients_vises": int(n), "source": source,
                  "panier_moyen": panier, "maj": _auj().isoformat()}},
        upsert=True,
    )
    await db.plan_objectifs.update_one(
        {"user_id": uid(), "id": ID_OBJECTIF_CLIENTS},
        {"$set": {"user_id": uid(), "id": ID_OBJECTIF_CLIENTS, "titre": f"Signer {n} client{'s' if n > 1 else ''} ce mois",
                  "cible": float(n), "atteint": 0, "unite": "clients", "module": "Pilotage", "ordre": 0}},
        upsert=True,
    )


# ═══════════ Ce que l'app sait déjà (pour ne rien redemander) ═══════════
async def _contexte() -> dict:
    srv = sys.modules.get("server")
    ctx: dict = {"offre_vendue": "", "cible": "", "vision": "", "objectif_3ans": ""}
    if srv is not None:
        try:
            from sqlalchemy import select
            async with srv.async_session() as s:
                vp = (await s.execute(select(srv.VisionProfile).where(srv.VisionProfile.user_id == uid()))).scalar_one_or_none()
            if vp:
                cm = vp.contexte_metier if isinstance(vp.contexte_metier, dict) else {}
                ctx["clientele_onboarding"] = {"b2b": "entreprises", "b2c": "particuliers", "mixte": "les_deux"}.get(cm.get("clientele") or "", "")
                ctx.update(offre_vendue=str(cm.get("offre") or "").strip(), cible=str(cm.get("cible") or "").strip(),
                           vision=(vp.texte_vision or "").strip(), objectif_3ans=(vp.objectif_3ans or "").strip())
        except Exception:  # noqa: BLE001 — jamais bloquant
            pass
    reg = await db.radar_reglages.find_one({"user_id": uid()}) or {}
    # Réglage du Radar s'il existe, sinon la réponse de l'onboarding (« Tes clients sont… »).
    ctx["clientele"] = reg.get("clientele") or ctx.get("clientele_onboarding") or "les_deux"
    ctx["mots_cles"] = reg.get("mots_cles") or []
    ctx["zone"] = reg.get("zone", "")
    obj = await db.pilotage_objectif.find_one({"user_id": uid()}) or {}
    ctx["panier_moyen"] = obj.get("panier_moyen")
    ctx["clients_vises"] = int(obj.get("clients_vises") or 0)
    return ctx


def _sujet_par_defaut(ctx: dict) -> tuple[str, str]:
    """Le sujet d'un tunnel automatique, et d'où il vient (affiché à l'utilisateur)."""
    if ctx.get("offre_vendue"):
        return ctx["offre_vendue"][:80], "ton offre (profil)"
    if ctx.get("mots_cles"):
        return str(ctx["mots_cles"][0])[:80], "tes mots-clés du Radar"
    if ctx.get("objectif_3ans"):
        return ctx["objectif_3ans"][:80], "ton cap à 3 ans (Vision)"
    return "", ""


# ═══════════ Tunnel en un clic ═══════════
class TunnelAutoIn(BaseModel):
    sujet: str = Field(default="", max_length=120)
    origine: Optional[str] = Field(default=None, max_length=120)
    signal_id: Optional[str] = None


async def creer_tunnel_auto(b: TunnelAutoIn):
    from models.copilote import TunnelIn, TunnelPatch
    from routers import copilote as cp

    ctx = await _contexte()
    sujet, d_ou = (b.sujet.strip(), b.origine or "Radar") if b.sujet.strip() else _sujet_par_defaut(ctx)
    if not sujet:
        raise HTTPException(status_code=422, detail="Dis-nous d'abord ce que tu vends (Paramètres › Mon Copilote) "
                                                    "ou ajoute un mot-clé au Radar : le tunnel sera rédigé à partir de là.")
    # Entreprises → on vend un rendez-vous (diagnostic + appel) ; particuliers → guide + offre de démarrage.
    parcours = "rendez_vous" if ctx["clientele"] == "entreprises" else "produit"
    type_upsell = "acceleration" if parcours == "rendez_vous" else "complementarite"
    t = await cp.creer_tunnel(TunnelIn(nom=f"Tunnel — {sujet}"[:80], sujet=sujet, origine=f"automatique · {d_ou}",
                                       parcours=parcours, type_upsell=type_upsell))
    # Les 4 pages rédigées tout de suite (IA, ou gabarit si l'IA est indisponible).
    prop = await cp.proposition_tunnel(t.id)
    etapes = [e.model_dump() if hasattr(e, "model_dump") else dict(e) for e in prop.etapes]
    # Prix calés sur le panier moyen RÉEL du Pilotage (jamais inventés) : offre principale = panier,
    # tripwire ≈ 10 % (min. 7 €), option ≈ 30 %. Sans panier connu : laissés vides.
    panier = ctx.get("panier_moyen")
    if panier:
        prix = {"vente": round(panier), "remerciement": max(7, round(panier * 0.1)), "upsell": round(panier * 0.3)}
        for e in etapes:
            if e.get("cle") in prix and e.get("prix") in (None, 0) and not (parcours == "rendez_vous" and e["cle"] == "remerciement"):
                e["prix"] = float(prix[e["cle"]])
    patch: dict = {"etapes": etapes}
    if prop.offre:
        patch["offre"] = prop.offre
    if prop.upsell:
        u = prop.upsell.model_copy()
        if panier and not u.prix:
            u.prix = float(round(panier * 0.3))
        patch["upsell"] = u
    if prop.downsell:
        patch["downsell"] = prop.downsell
    t = await cp.maj_tunnel(t.id, TunnelPatch(**patch))
    if b.signal_id:
        await db.radar_signaux.update_one({"user_id": uid(), "id": b.signal_id}, {"$set": {"statut": "pris"}})
    # Une seule chose à faire pour l'utilisateur : relire et publier (5 minutes).
    await cp._ajouter_action_plan(f"Relire et publier le tunnel « {sujet} »"[:200], "Tunnels", _auj().isoformat(),
                                  f"Tunnel automatique ({d_ou})", f"tunnel-{t.id}")
    return t


@router.post("/tunnels/auto")
async def tunnel_auto(b: TunnelAutoIn):
    return await creer_tunnel_auto(b)


# ═══════════ Où en est le cercle ═══════════
class EtapeCercle(BaseModel):
    cle: str
    titre: str
    etat: Literal["fait", "en_cours", "a_faire"]
    detail: str
    lien: str


class Proposition(BaseModel):
    cle: str
    titre: str
    texte: str
    bouton: str
    action: Literal["lien", "tunnel_auto", "fec_exemple"]
    lien: Optional[str] = None


class Cercle(BaseModel):
    etapes: list[EtapeCercle]
    proposition: Optional[Proposition] = None
    secondaires: list[Proposition] = []


@router.get("/cercle", response_model=Cercle)
async def cercle() -> Cercle:
    ctx = await _contexte()
    imports = await db.pilotage_imports.count_documents({"user_id": uid()})
    vises = ctx["clients_vises"]
    signes = await signes_du_mois()
    a_trouver = max(0, vises - signes)
    signaux_neufs = await db.radar_signaux.count_documents({"user_id": uid(), "statut": "nouveau"})
    prospects = await db.radar_prospects.find({"user_id": uid()}).to_list(500)
    en_cours = len([p for p in prospects if p.get("etape") in ("nouveau", "contacte", "en_discussion")])
    actions = await db.plan_actions.find({"user_id": uid(), "fait": False}).to_list(500)
    espace = await db.copilote_espace.find_one({"user_id": uid()}) or {}
    tunnels = (espace.get("data") or {}).get("tunnels", [])
    en_ligne = [t for t in tunnels if t.get("etat") == "en_ligne"]
    contacts = sum(len(t.get("contacts") or []) for t in tunnels)
    sujet, _d = _sujet_par_defaut(ctx)

    etapes = [
        EtapeCercle(cle="pilotage", titre="Chiffres", lien="/pilotage",
                    etat="fait" if vises else ("en_cours" if imports else "a_faire"),
                    detail=(f"{vises} client{'s' if vises > 1 else ''} ce mois pour couvrir tes charges" if vises
                            else "Chiffres importés, seuil pas encore calculable" if imports
                            else "Importe tes chiffres : on calcule combien de clients il te faut")),
        EtapeCercle(cle="radar", titre="Prospects", lien="/radar",
                    etat="fait" if en_cours >= max(1, a_trouver) else ("en_cours" if signaux_neufs or en_cours else "a_faire"),
                    detail=(f"{signaux_neufs} à regarder · {en_cours} en cours"
                            if (signaux_neufs or en_cours) else "Choisis ta zone : les entreprises arrivent")),
        EtapeCercle(cle="plan", titre="Plan", lien="/plan-action",
                    etat="en_cours" if actions else "a_faire",
                    detail=f"{len(actions)} action{'s' if len(actions) > 1 else ''} ouverte{'s' if len(actions) > 1 else ''}" if actions else "Rien d'engagé pour l'instant"),
        EtapeCercle(cle="tunnels", titre="Tunnels", lien="/tunnels",
                    etat="fait" if en_ligne else ("en_cours" if tunnels else "a_faire"),
                    detail=(f"{len(en_ligne)} en ligne · {contacts} contact{'s' if contacts > 1 else ''} capté{'s' if contacts > 1 else ''}" if en_ligne
                            else "Un tunnel à relire et publier" if tunnels else "Pas encore de tunnel")),
        EtapeCercle(cle="signes", titre="Clients signés", lien="/radar",
                    etat="fait" if vises and signes >= vises else ("en_cours" if signes else "a_faire"),
                    detail=f"{signes} / {vises} ce mois" if vises else f"{signes} ce mois"),
    ]

    props: list[Proposition] = []
    if not imports and not vises:
        props.append(Proposition(cle="pilotage", titre="Savoir combien de clients il te faut",
                                 texte="Importe l'export de ton comptable ou un relevé : Zayado calcule ton objectif du mois, et tes prospects et ton plan s'y alignent tout seuls.",
                                 bouton="Importer mes chiffres", action="lien", lien="/pilotage"))
    if not tunnels:
        props.append(Proposition(
            cle="tunnel", titre="Créer ton tunnel en un clic",
            texte=(f"Sujet : « {sujet} ». Les 4 pages sont rédigées, les prix calés sur ton panier moyen réel. Il ne te reste qu'à relire et publier."
                   if sujet else "Les 4 pages sont rédigées pour toi à partir de ce que tu vends. Il ne te reste qu'à relire et publier."),
            bouton="Créer mon tunnel", action="tunnel_auto"))
    elif not en_ligne:
        t = tunnels[-1]
        props.append(Proposition(cle="publier", titre="Ton tunnel attend sa relecture",
                                 texte=f"« {t.get('nom', '')} » est prêt. Relis-le, ajoute tes preuves réelles, puis publie.",
                                 bouton="Relire et publier", action="lien", lien=f"/tunnels/{t.get('id')}"))
    if signaux_neufs:
        props.append(Proposition(cle="radar", titre=f"{signaux_neufs} nouvelle{'s' if signaux_neufs > 1 else ''} entreprise{'s' if signaux_neufs > 1 else ''} à regarder",
                                 texte="Garde celles qui comptent : Zayado crée le prospect et la relance datée dans ton plan.",
                                 bouton="Voir mes prospects", action="lien", lien="/radar"))
    if vises and a_trouver and en_cours < a_trouver and tunnels:
        props.append(Proposition(cle="trafic", titre=f"Il te manque {a_trouver} client{'s' if a_trouver > 1 else ''} ce mois",
                                 texte="Pas assez de prospects en cours pour l'objectif. Programme un lancement : les publications à faire arrivent dans ton plan.",
                                 bouton="Programmer le lancement", action="lien", lien=f"/tunnels/{tunnels[-1].get('id')}"))

    # Ordre du cycle : Pilotage d'abord, puis tunnel, puis tri du Radar.
    ordre = {"pilotage": 0, "publier": 1, "tunnel": 2, "radar": 3, "trafic": 4}
    props.sort(key=lambda p: ordre.get(p.cle, 9))
    return Cercle(etapes=etapes, proposition=props[0] if props else None, secondaires=props[1:3])

