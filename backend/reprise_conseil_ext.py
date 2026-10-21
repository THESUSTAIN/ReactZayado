"""Reprise + Conseil des 5 + modèle du chat selon l'offre.

1. « Testez votre projet » (/api/reprise/simulation) : calcul de reprise SANS IA.
   Tout est déterministe et vérifiable : EBE retraité, multiples (EBE et résultat
   net après impôt sur les sociétés), montage indicatif sans apport personnel,
   règle des 50 % (échéances / EBE retraité), points forts, risques, opportunités.
   Aucun financement garanti : le texte est renvoyé par l'API pour être affiché.

2. Rendez-vous de 20 minutes à 5 € (/api/reprise/creneaux, /api/reprise/rdv) :
   créneaux limités (variable REPRISE_CRENEAUX), réservés et payés par le client
   (Mollie, comme tunnel_zayado_ext). Les administrateurs sont prévenus.

3. « Tester mon idée » (/api/idees/{id}/conseil) : le Conseil des 5 (méthode
   LLM Council d'Andrej Karpathy, adaptation MIT de tenfoldmarc/llm-council-skill) :
   5 conseillers en parallèle → relecture croisée anonyme → synthèse du président,
   + SWOT de l'idée + panel de 12 acheteurs simulés. Réservé à Solo, Pro, Équipe,
   Entreprise, avec un quota mensuel (CONSEIL_QUOTA_MOIS, défaut 5).

4. Modèle du chat (Copilote) selon l'offre : Solo et au-dessus → MODELE_CHAT_SOLO
   (défaut « claude-opus-5-5 » : vérifier le nom exact dans la liste des modèles
   Mammouth). Les autres offres gardent le modèle par défaut (MAMMOTH_MODEL).

Variables d'environnement (toutes facultatives) :
    REPRISE_RDV_PRIX="5.00"
    REPRISE_CRENEAUX="2-10:00,2-14:30,4-09:30,4-17:00,5-11:00,5-15:30"  (jour ISO 1=lundi … 7=dimanche)
    REPRISE_CRENEAUX_JOURS=14       (horizon de réservation)
    CONSEIL_QUOTA_MOIS=5
    MODELE_CHAT_SOLO="claude-opus-5-5"
    MODELE_CONSEIL=""               (vide = modèle par défaut ; mettre un modèle plus rapide si besoin)
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import random
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import JSON, DateTime, Integer, String, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

log = logging.getLogger("zayado.reprise_conseil")

OFFRES_SOLO_PLUS = ("serenite", "pro", "business", "entreprise")
MENTION_FINANCEMENT = ("Plan indicatif calculé à partir de vos chiffres. Aucun financement n'est garanti. "
                       "La caution éventuelle demandée par une banque se négocie.")


# ══════════════════════════ 1. Calcul de reprise (pur, testable) ══════════════════════════

class SimulationIn(BaseModel):
    prix_demande: float = Field(gt=0, le=50_000_000)
    chiffre_affaires: float = Field(ge=0, le=500_000_000)
    ebe_moyen_3ans: float = Field(ge=-50_000_000, le=50_000_000)
    remuneration_dirigeant: float = Field(default=0, ge=0, le=5_000_000)      # chargée, actuelle
    remuneration_repreneur: float = Field(default=0, ge=0, le=5_000_000)      # chargée, future
    amortissements: float = Field(default=0, ge=0, le=50_000_000)
    tresorerie: float = Field(default=0, ge=0, le=500_000_000)
    dettes_financieres: float = Field(default=0, ge=0, le=500_000_000)
    credit_vendeur_pct: float = Field(default=0, ge=0, le=100)               # % du prix accepté par le vendeur
    credit_vendeur_annees: int = Field(default=3, ge=1, le=10)
    pret_honneur: float = Field(default=0, ge=0, le=200_000)                 # personnel, taux zéro, apporté au capital
    taux_bancaire_pct: float = Field(default=4.5, ge=0, le=15)
    duree_banque_annees: int = Field(default=7, ge=1, le=15)
    # Opportunités (questions oui / non)
    delai_clients_jours: Optional[int] = Field(default=None, ge=0, le=365)
    prix_revus_depuis_ans: Optional[int] = Field(default=None, ge=0, le=50)
    a_marketing: Optional[bool] = None


QUESTIONNAIRE_RDV = {
    "profil": ("salarie_reprend", "repreneur_cible", "repreneur_recherche", "dirigeant", "autre"),
    "cible": ("oui", "en_discussion", "non"),
    "echeance": ("moins_6_mois", "6_12_mois", "plus_tard"),
}


class RdvIn(BaseModel):
    creneau: str = Field(min_length=16, max_length=16)
    simulation_id: str = ""
    # Questionnaire de filtre (obligatoire) : écarte les faux rendez-vous et prépare les 20 minutes.
    profil: str = Field(min_length=1, max_length=40)
    cible: str = Field(min_length=1, max_length=40)
    echeance: str = Field(min_length=1, max_length=40)
    question: str = Field(default="", max_length=500)


class RapportIn(BaseModel):
    simulation_id: str = Field(min_length=10, max_length=36)
    email: str = Field(min_length=5, max_length=255)
    invitation_atelier: bool = False


class ConseilIn(BaseModel):
    pour_qui: str = Field(default="", max_length=300)
    prix: str = Field(default="", max_length=120)
    avec_panel: bool = True


def impot_societes(benefice: float) -> float:
    """IS français des PME : 15 % jusqu'à 42 500 €, 25 % au-delà (taux réduit sous conditions, à vérifier)."""
    if benefice <= 0:
        return 0.0
    tranche = min(benefice, 42_500)
    return round(tranche * 0.15 + max(benefice - 42_500, 0) * 0.25, 2)


def annuite(capital: float, taux_pct: float, annees: int) -> float:
    if capital <= 0:
        return 0.0
    r = taux_pct / 100
    if r == 0:
        return capital / annees
    return capital * r / (1 - (1 + r) ** -annees)


def calculer_reprise(d: SimulationIn) -> dict:
    ebe_retraite = d.ebe_moyen_3ans + d.remuneration_dirigeant - d.remuneration_repreneur
    tresorerie_nette = d.tresorerie - d.dettes_financieres
    prix_hors_treso = d.prix_demande - tresorerie_nette
    res_avant_impot = ebe_retraite - d.amortissements
    resultat_net = res_avant_impot - impot_societes(res_avant_impot)
    mult_ebe = round(prix_hors_treso / ebe_retraite, 1) if ebe_retraite > 0 else None
    mult_rn = round(prix_hors_treso / resultat_net, 1) if resultat_net > 0 else None

    credit_vendeur = round(d.prix_demande * d.credit_vendeur_pct / 100)
    pret_honneur = min(d.pret_honneur, d.prix_demande - credit_vendeur)
    banque = max(d.prix_demande - credit_vendeur - pret_honneur, 0)
    ech_vendeur = credit_vendeur / d.credit_vendeur_annees
    ech_banque = annuite(banque, d.taux_bancaire_pct, d.duree_banque_annees)
    echeances = round(ech_vendeur + ech_banque)
    ratio = round(echeances / ebe_retraite * 100, 1) if ebe_retraite > 0 else None

    forts, risques, opportunites = [], [], []
    if d.ebe_moyen_3ans > 0:
        forts.append("Entreprise rentable en moyenne sur les 3 dernières années")
    else:
        risques.append("EBE moyen négatif ou nul : la reprise ne peut pas se rembourser seule")
    if mult_ebe is not None and mult_ebe <= 3:
        forts.append(f"Prix proche de {mult_ebe:.1f} fois l'EBE retraité".replace(".", ","))
    elif mult_ebe is not None:
        risques.append(f"Prix élevé : {mult_ebe:.1f} fois l'EBE retraité (repère courant : 3 fois ou moins)".replace(".", ","))
    if tresorerie_nette > 0:
        forts.append("Trésorerie supérieure aux dettes financières")
    elif tresorerie_nette < 0:
        risques.append("Dettes financières supérieures à la trésorerie : elles s'ajoutent au prix")
    if d.credit_vendeur_pct >= 20:
        forts.append("Le vendeur accepte un crédit vendeur : il croit en l'avenir de l'entreprise")
    if ratio is not None:
        if ratio > 50:
            risques.append(f"Échéances à {ratio:.1f} % de l'EBE retraité : au-dessus du repère de 50 %".replace(".", ","))
        elif ratio > 40:
            risques.append(f"Échéances à {ratio:.1f} % de l'EBE retraité : proche de la limite de 50 %".replace(".", ","))
        else:
            forts.append(f"Échéances à {ratio:.1f} % de l'EBE retraité : marge de sécurité".replace(".", ","))
    risques += ["Rôle du vendeur dans les ventes : à vérifier", "Poids des 3 premiers clients : à vérifier"]

    if d.delai_clients_jours is not None and d.delai_clients_jours > 45:
        opportunites.append(f"Clients payés à {d.delai_clients_jours} jours : les ramener à 45 jours libérerait de la trésorerie")
    if d.prix_revus_depuis_ans is not None and d.prix_revus_depuis_ans >= 2:
        opportunites.append(f"Prix inchangés depuis {d.prix_revus_depuis_ans} ans : une révision mesurée est à étudier")
    if d.a_marketing is False:
        opportunites.append("Pas de site ni de marketing : un levier de croissance simple")

    return {
        "ebe_retraite": round(ebe_retraite), "tresorerie_nette": round(tresorerie_nette),
        "prix_hors_tresorerie": round(prix_hors_treso), "resultat_net_retraite": round(resultat_net),
        "multiple_ebe": mult_ebe, "multiple_resultat_net": mult_rn,
        "montage": {"credit_vendeur": credit_vendeur, "pret_honneur": round(pret_honneur), "banque": round(banque),
                    "total": round(credit_vendeur + pret_honneur + banque), "apport_personnel": 0},
        "echeances_annuelles": echeances, "ratio_echeances_ebe": ratio,
        "points_forts": forts[:3], "risques": risques[:3], "opportunites": opportunites,
        "mention": MENTION_FINANCEMENT,
        "note_swot": "Le SWOT complet (avec le marché et les menaces) est fait pendant l'Évaluation.",
    }


# ══════════════════════════ 3. Conseil des 5 (prompts) ══════════════════════════

CONSEILLERS = [
    ("contradicteur", "Le Contradicteur", "Tu cherches activement ce qui ne va pas, ce qui manque, ce qui va échouer. "
     "Tu pars du principe que l'idée a un défaut fatal et tu le cherches. Tu n'es pas pessimiste : tu es l'ami qui pose les questions qu'on évite."),
    ("fondamentaux", "Les Fondamentaux", "Tu ignores la question de surface et tu demandes : quel problème cherche-t-on vraiment à résoudre ? "
     "Tu retires les hypothèses et reconstruis le problème. Parfois, la meilleure réponse est « vous ne posez pas la bonne question »."),
    ("explorateur", "L'Explorateur", "Tu cherches le potentiel que les autres ne voient pas : ce qui pourrait être plus grand, l'opportunité voisine, "
     "ce qui est sous-estimé. Le risque, c'est le rôle du Contradicteur ; toi, tu regardes ce qui se passe si ça marche mieux que prévu."),
    ("regard_neuf", "Le Regard neuf", "Tu ne connais rien à la personne, à son métier ni à son histoire. Tu réagis uniquement à ce qui est écrit. "
     "Tu repères ce qui est évident pour elle mais confus pour tout le monde."),
    ("action", "L'Action", "Une seule chose t'intéresse : est-ce faisable, et quel est le chemin le plus rapide ? "
     "Tu regardes chaque idée sous l'angle « qu'est-ce qu'on fait lundi matin ? ». Sans première étape claire, tu le dis."),
]


def prompt_conseiller(nom: str, style: str, question: str) -> tuple[str, str]:
    systeme = (f"Tu es {nom}, membre du Conseil des 5 de Zayado. Ta façon de penser : {style} "
               "Réponds en français, en vouvoyant la personne. Sois direct et précis, ne cherche pas l'équilibre : "
               "les autres conseillers couvrent les autres angles. 150 à 250 mots, sans préambule. "
               "N'invente aucun chiffre ni aucun fait sur son marché. "
               'Termine par une ligne exactement de la forme « POSITION : pour » ou « POSITION : réservé » ou « POSITION : contre ».')
    return systeme, f"La personne soumet ceci au Conseil :\n---\n{question}\n---"


def prompt_relecture(question: str, reponses: dict[str, str]) -> tuple[str, str]:
    systeme = ("Tu relis les réponses anonymes d'un conseil de 5 conseillers. Réponds en français, moins de 180 mots, "
               "en citant les réponses par leur lettre : 1. la réponse la plus solide et pourquoi ; "
               "2. celle qui a le plus grand angle mort et lequel ; 3. ce que les 5 ont tous oublié.")
    corps = "\n\n".join(f"Réponse {k} :\n{v}" for k, v in reponses.items())
    return systeme, f"Question soumise :\n---\n{question}\n---\n\n{corps}"


def prompt_president(question: str, avis: dict[str, str], relectures: list[str]) -> tuple[str, str]:
    systeme = (
        "Tu es le président du Conseil des 5. Tu fais la synthèse des 5 avis et des relectures croisées. "
        "Tu peux donner raison à la minorité si son raisonnement est meilleur. Français, vouvoiement, phrases courtes, "
        "aucun chiffre inventé. Réponds UNIQUEMENT en JSON valide : "
        '{"accord":"1 à 2 phrases","desaccord":"1 à 2 phrases","angle_mort":"1 à 2 phrases","vigilance":"1 phrase",'
        '"recommandation":"2 phrases maximum, une vraie réponse, pas « ça dépend »","premiere_action":"une action concrète cette semaine",'
        '"swot":{"forces":["…"],"faiblesses":["…"],"opportunites":["…"],"menaces":["…"]}} '
        "avec 1 à 2 éléments courts par case du SWOT.")
    avis_txt = "\n\n".join(f"{nom} :\n{texte}" for nom, texte in avis.items())
    rel_txt = "\n\n".join(f"Relecture {i + 1} :\n{r}" for i, r in enumerate(relectures))
    return systeme, f"Question :\n---\n{question}\n---\n\nAVIS :\n{avis_txt}\n\nRELECTURES :\n{rel_txt}"


def prompt_panel(question: str, n: int = 12) -> tuple[str, str]:
    systeme = (
        f"Tu simules un panel de {n} acheteurs potentiels réalistes et variés pour l'idée décrite. La plupart des gens "
        "n'achètent pas la plupart des choses : un oui poli est pire qu'un non clair. Français. Réponds UNIQUEMENT en JSON : "
        '{"acheteurs":[{"profil":"5 à 8 mots","achete":true,"raison":"1 phrase","frein":"1 phrase","prix_cher":nombre,"prix_trop_cher":nombre}],'
        '"ce_qui_ferait_changer":"1 phrase"}')
    return systeme, f"Idée à tester :\n{question}"


def position_depuis(texte: str) -> str:
    m = re.search(r"POSITION\s*:\s*(pour|r[ée]serv[ée]|contre)", texte or "", re.I)
    if not m:
        return "réservé"
    v = m.group(1).lower()
    return "pour" if v == "pour" else ("contre" if v == "contre" else "réservé")


def json_depuis(texte: str) -> dict:
    m = re.search(r"\{.*\}", str(texte or ""), re.S)
    try:
        return json.loads(m.group(0)) if m else {}
    except json.JSONDecodeError:
        return {}


def resumer_panel(d: dict) -> dict:
    ach = [a for a in (d.get("acheteurs") or []) if isinstance(a, dict)][:12]
    oui = [a for a in ach if a.get("achete") is True]
    freins = [str(a.get("frein") or "").strip() for a in ach if not a.get("achete") and a.get("frein")]
    prix = sorted(float(a["prix_cher"]) for a in ach if isinstance(a.get("prix_cher"), (int, float)) and a["prix_cher"] > 0)
    mediane = prix[len(prix) // 2] if prix else None
    return {"total": len(ach), "acheteurs": len(oui), "prix_cher_median": mediane,
            "frein_principal": freins[0] if freins else "", "qui_achete": [str(a.get("profil") or "") for a in oui][:4],
            "ce_qui_ferait_changer": str(d.get("ce_qui_ferait_changer") or "")[:240], "detail": ach}


# ══════════════════════════ Installation ══════════════════════════

def install_reprise_conseil(g: dict) -> None:
    api, get_db, Base = g["api"], g["get_db"], g["Base"]
    utcnow, new_uuid = g["utcnow"], g["new_uuid"]
    _uid, _profil = g["_uid"], g["_profil"]

    class RepriseSimulation(Base):
        __tablename__ = "reprise_simulations"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        board_cle: Mapped[str] = mapped_column(String(40), default="", index=True)   # tableau du Vision Board (projet)
        entree: Mapped[dict] = mapped_column(JSON, default=dict)
        resultat: Mapped[dict] = mapped_column(JSON, default=dict)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    class RepriseRdv(Base):
        __tablename__ = "reprise_rdv"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        creneau: Mapped[str] = mapped_column(String(40), index=True)     # ISO local « 2026-10-21T14:30 »
        statut: Mapped[str] = mapped_column(String(20), default="pending")
        simulation_id: Mapped[str] = mapped_column(String(36), default="")
        commande_id: Mapped[str] = mapped_column(String(36), default="")
        reponses: Mapped[dict] = mapped_column(JSON, default=dict)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    class ConseilResultat(Base):
        __tablename__ = "conseil_resultats"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        idee_id: Mapped[str] = mapped_column(String(36), index=True)
        mois: Mapped[str] = mapped_column(String(7), index=True)          # « 2026-10 » (quota)
        resultat: Mapped[dict] = mapped_column(JSON, default=dict)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    g.update(RepriseSimulation=RepriseSimulation, RepriseRdv=RepriseRdv, ConseilResultat=ConseilResultat)

    # ───────── Configuration ─────────
    def _env(nom: str, defaut: str) -> str:
        return (os.environ.get(nom) or defaut).strip()

    def _front() -> str:
        return _env("PUBLIC_FRONTEND_URL", "https://app.zayado.net").rstrip("/")

    def _mollie_cle() -> str:
        return os.environ.get("MOLLIE_API_KEY", "").strip()

    def _simulation_paiement() -> bool:
        return not _mollie_cle() and os.environ.get("ENV", "").lower() == "local"

    async def _mollie(methode: str, chemin: str, corps: Optional[dict] = None) -> dict:
        async with httpx.AsyncClient(timeout=20) as http:
            url, entetes = f"https://api.mollie.com/v2/{chemin}", {"Authorization": f"Bearer {_mollie_cle()}"}
            r = await (http.post(url, json=corps, headers=entetes) if methode == "POST" else http.get(url, headers=entetes))
        if r.status_code >= 300:
            log.warning("Mollie %s %s : %s", methode, chemin, r.text[:200])
            raise HTTPException(502, "Le paiement n'a pas pu être créé. Réessayez dans un instant.")
        return r.json()

    def _creneaux_possibles() -> list[str]:
        modele = _env("REPRISE_CRENEAUX", "2-10:00,2-14:30,4-09:30,4-17:00,5-11:00,5-15:30")
        jours = int(_env("REPRISE_CRENEAUX_JOURS", "14") or 14)
        regles = []
        for bout in modele.split(","):
            m = re.match(r"\s*([1-7])-(\d{1,2}):(\d{2})\s*$", bout)
            if m:
                regles.append((int(m.group(1)), int(m.group(2)), int(m.group(3))))
        maintenant = datetime.now(timezone.utc) + timedelta(hours=2)   # heure de Paris approximative, marge de 2 h
        sortie = []
        for i in range(1, jours + 1):
            jour = (maintenant + timedelta(days=i)).date()
            for (iso, h, mi) in regles:
                if jour.isoweekday() == iso:
                    sortie.append(f"{jour.isoformat()}T{h:02d}:{mi:02d}")
        return sorted(sortie)

    async def _offre_solo_plus(db: AsyncSession, uid: str) -> bool:
        if g.get("_role_courant") and g["_role_courant"]() == "admin":
            return True
        p = await _profil(db, uid)
        return (p.plan or "") in OFFRES_SOLO_PLUS

    # ───────── 1. Simulation ─────────
    @api.post("/reprise/simulation")
    async def reprise_simulation(body: SimulationIn, board: str = "", db: AsyncSession = Depends(get_db)):
        uid = _uid()
        if board:
            await _tableau(db, uid, board)
        resultat = calculer_reprise(body)
        row = RepriseSimulation(user_id=uid, board_cle=board[:40], entree=body.model_dump(), resultat=resultat)
        db.add(row)
        await db.commit()
        return {"id": row.id, **resultat}

    @api.get("/reprise/simulation")
    async def reprise_derniere(board: str = "", db: AsyncSession = Depends(get_db)):
        q = select(RepriseSimulation).where(RepriseSimulation.user_id == _uid())
        if board:
            q = q.where(RepriseSimulation.board_cle == board)
        row = (await db.execute(q.order_by(RepriseSimulation.created_at.desc()).limit(1))).scalar_one_or_none()
        return {"vide": True} if not row else {"id": row.id, "entree": row.entree, **(row.resultat or {})}

    # Version publique (sans compte) : visiteurs venus de zayado.net. Limite simple par adresse IP.
    _compteur_ip: dict = {}

    def _limiter(request: Request, cle: str, maxi: int) -> None:
        ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "")).split(",")[0].strip()
        heure = datetime.now(timezone.utc).strftime("%Y%m%d%H")
        k = f"{cle}:{ip}:{heure}"
        if len(_compteur_ip) > 5000:
            _compteur_ip.clear()
        _compteur_ip[k] = _compteur_ip.get(k, 0) + 1
        if _compteur_ip[k] > maxi:
            raise HTTPException(429, "Trop de demandes en peu de temps. Réessayez dans une heure.")

    @api.post("/public/reprise/simulation")
    async def reprise_simulation_publique(body: SimulationIn, request: Request, db: AsyncSession = Depends(get_db)):
        _limiter(request, "sim", int(_env("REPRISE_PUBLIC_MAX_HEURE", "30") or 30))
        resultat = calculer_reprise(body)
        row = RepriseSimulation(user_id="", entree=body.model_dump(), resultat=resultat)
        db.add(row)
        await db.commit()
        return {"id": row.id, **resultat}

    @api.post("/public/reprise/rapport")
    async def reprise_rapport_email(body: RapportIn, request: Request, background: BackgroundTasks, db: AsyncSession = Depends(get_db)):
        _limiter(request, "rapport", 10)
        email = body.email.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
            raise HTTPException(422, "Adresse e-mail invalide.")
        sim = await db.get(RepriseSimulation, body.simulation_id)
        if not sim:
            raise HTTPException(404, "Rapport introuvable. Refaites le test.")
        Lead = g.get("Lead")
        if Lead is not None:
            db.add(Lead(email=email, source=("simulation-reprise:atelier" if body.invitation_atelier else "simulation-reprise")))
            await db.commit()
        envoyer = g.get("send_email")
        if envoyer:
            background.add_task(_envoyer_rapport, envoyer, email, sim.id, sim.resultat or {})
        return {"ok": True}

    def _eur(n) -> str:
        try:
            return f"{float(n):,.0f} €".replace(",", "\u202f")
        except (TypeError, ValueError):
            return "—"

    async def _envoyer_rapport(envoyer, email: str, sim_id: str, r: dict) -> None:
        m = r.get("montage") or {}
        lignes = "".join(f"<li>{x}</li>" for x in (r.get("points_forts") or []))
        risques = "".join(f"<li>{x}</li>" for x in (r.get("risques") or []))
        lien = f"{_front()}/testez-votre-projet?sim={sim_id}"
        html = f"""<div style="font-family:Arial,sans-serif;color:#1A2B57;max-width:560px">
<p>Bonjour,</p><p>Voici le rapport de votre simulation de reprise sur Zayado.</p>
<p><b>EBE retraité :</b> {_eur(r.get('ebe_retraite'))}<br><b>Prix / EBE retraité :</b> {r.get('multiple_ebe') or '—'} ×<br>
<b>Échéances payées par l'entreprise :</b> {_eur(r.get('echeances_annuelles'))} par an, soit {r.get('ratio_echeances_ebe') or '—'} % de l'EBE retraité</p>
<p><b>Montage indicatif sans apport personnel :</b> crédit vendeur {_eur(m.get('credit_vendeur'))}, prêt d'honneur {_eur(m.get('pret_honneur'))}, prêt bancaire {_eur(m.get('banque'))}.</p>
<p><b>Points forts</b></p><ul>{lignes}</ul><p><b>À vérifier</b></p><ul>{risques}</ul>
<p>{r.get('mention') or "Calcul indicatif. Aucun financement n'est garanti."}</p>
<p>Pour en parler 20 minutes avec Marie-Esther (5 €, déduits si vous continuez) : <a href="{lien}">{lien}</a></p>
<p>Zayado · La maison des entrepreneurs apaisés</p></div>"""
        try:
            await envoyer(to=email, subject="Votre rapport de reprise · Zayado", html=html)
        except Exception as e:  # noqa: BLE001
            log.warning("Rapport de reprise non envoyé : %s", e)

    @api.get("/public/reprise/simulation/{sim_id}")
    async def reprise_simulation_publique_lire(sim_id: str, db: AsyncSession = Depends(get_db)):
        sim = await db.get(RepriseSimulation, sim_id)
        if not sim or sim.user_id:
            raise HTTPException(404, "Rapport introuvable.")
        return {"id": sim.id, "entree": sim.entree, **(sim.resultat or {})}

    @api.post("/reprise/simulation/{sim_id}/rattacher")
    async def reprise_rattacher(sim_id: str, db: AsyncSession = Depends(get_db)):
        """Après connexion : la simulation faite sans compte rejoint le compte."""
        uid = _uid()
        sim = await db.get(RepriseSimulation, sim_id)
        if not sim or (sim.user_id and sim.user_id != uid):
            raise HTTPException(404, "Rapport introuvable.")
        if not sim.user_id:
            sim.user_id = uid
            await db.commit()
        return {"id": sim.id, "entree": sim.entree, **(sim.resultat or {})}

    # ───────── 2. Rendez-vous à 5 € ─────────
    DELAI_PAIEMENT = timedelta(minutes=30)

    async def _rdv_bloquants(db: AsyncSession) -> list:
        """Rendez-vous qui bloquent leur créneau : payés, ou en attente de paiement depuis moins de 30 minutes.
        Le statut est rafraîchi depuis la commande, que le webhook Mollie existant met à jour."""
        CommerceOrder = g["CommerceOrder"]
        rows = (await db.execute(select(RepriseRdv).where(RepriseRdv.statut.in_(("pending", "paid"))))).scalars().all()
        limite = datetime.now(timezone.utc) - DELAI_PAIEMENT
        garder, change = [], False
        for r in rows:
            if r.statut == "pending" and r.commande_id:
                c = await db.get(CommerceOrder, r.commande_id)
                if c and c.status in ("paid", "failed", "canceled", "expired"):
                    r.statut, change = c.status, True
            cree = r.created_at if (r.created_at is None or r.created_at.tzinfo) else r.created_at.replace(tzinfo=timezone.utc)
            if r.statut == "pending" and cree is not None and cree < limite:
                r.statut, change = "expired", True
            if r.statut in ("pending", "paid"):
                garder.append(r)
        if change:
            await db.commit()
        return garder

    @api.get("/reprise/creneaux")
    async def reprise_creneaux(db: AsyncSession = Depends(get_db)):
        pris = {r.creneau for r in await _rdv_bloquants(db)}
        return {"prix": _env("REPRISE_RDV_PRIX", "5.00"), "duree_minutes": 20,
                "creneaux": [c for c in _creneaux_possibles() if c not in pris]}

    @api.post("/reprise/rdv")
    async def reprise_rdv(body: RdvIn, db: AsyncSession = Depends(get_db)):
        uid = _uid()
        if body.creneau not in _creneaux_possibles():
            raise HTTPException(422, "Ce créneau n'est pas proposé.")
        for champ, valeurs in QUESTIONNAIRE_RDV.items():
            if getattr(body, champ) not in valeurs:
                raise HTTPException(422, "Répondez aux trois questions avant de réserver.")
        if any(r.creneau == body.creneau and r.user_id != uid for r in await _rdv_bloquants(db)):
            raise HTTPException(409, "Ce créneau vient d'être réservé. Choisissez-en un autre.")
        reponses = {"profil": body.profil, "cible": body.cible, "echeance": body.echeance, "question": body.question.strip()}
        CommerceOrder = g["CommerceOrder"]
        p = await _profil(db, uid)
        email = (p.email or "").strip()
        prix = _env("REPRISE_RDV_PRIX", "5.00")
        commande = CommerceOrder(id=str(uuid.uuid4()), email=email, kind="rdv_reprise",
                                 title="20 minutes avec Marie-Esther", amount=prix, status="pending",
                                 metadata_json={"creneau": body.creneau, "simulation_id": body.simulation_id, "user_id": uid, **reponses})
        db.add(commande)
        rdv = RepriseRdv(user_id=uid, creneau=body.creneau, simulation_id=body.simulation_id, commande_id=commande.id, reponses=reponses)
        db.add(rdv)
        retour = f"/app/testez-votre-projet?rdv={rdv.id}"
        if _simulation_paiement():
            commande.status, rdv.statut = "paid", "paid"
            commande.mollie_payment_id = f"sim_{commande.id}"
            await db.commit()
            await _prevenir_admins(db, p, body.creneau, reponses)
            return {"rdv_id": rdv.id, "checkout_url": retour, "simulation": True}
        if not _mollie_cle():
            raise HTTPException(503, "Le paiement n'est pas encore configuré.")
        paiement = await _mollie("POST", "payments", {
            "amount": {"currency": "EUR", "value": prix},
            "description": f"Zayado · Rendez-vous de 20 minutes · {body.creneau.replace('T', ' à ')}",
            "redirectUrl": f"{_front()}{retour}",
            "webhookUrl": f"{_front()}/api/mollie/webhook",
            "metadata": {"order_id": commande.id, "kind": "rdv_reprise", "rdv_id": rdv.id},
        })
        commande.mollie_payment_id = paiement["id"]
        await db.commit()
        await _prevenir_admins(db, p, body.creneau, reponses)
        return {"rdv_id": rdv.id, "checkout_url": paiement.get("_links", {}).get("checkout", {}).get("href"), "simulation": False}

    @api.get("/reprise/rdv/{rdv_id}")
    async def reprise_rdv_etat(rdv_id: str, db: AsyncSession = Depends(get_db)):
        rdv = await db.get(RepriseRdv, rdv_id)
        if not rdv or rdv.user_id != _uid():
            raise HTTPException(404, "Rendez-vous introuvable.")
        commande = await db.get(g["CommerceOrder"], rdv.commande_id) if rdv.commande_id else None
        if commande and commande.status in ("pending", "open") and commande.mollie_payment_id and _mollie_cle() \
                and not str(commande.mollie_payment_id).startswith("sim_"):
            try:
                pmt = await _mollie("GET", f"payments/{commande.mollie_payment_id}")
                commande.status = {"paid": "paid", "failed": "failed", "canceled": "canceled", "expired": "expired"}.get(pmt.get("status"), commande.status)
            except HTTPException:
                pass
        if commande:
            rdv.statut = commande.status if commande.status in ("paid", "failed", "canceled", "expired") else rdv.statut
        await db.commit()
        return {"id": rdv.id, "creneau": rdv.creneau, "statut": rdv.statut}

    LIBELLES = {"salarie_reprend": "salarié qui reprend son patron", "repreneur_cible": "repreneur avec une cible",
                "repreneur_recherche": "repreneur qui cherche", "dirigeant": "dirigeant", "autre": "autre",
                "oui": "cible trouvée", "en_discussion": "cible en discussion", "non": "pas de cible",
                "moins_6_mois": "moins de 6 mois", "6_12_mois": "6 à 12 mois", "plus_tard": "plus tard"}

    async def _prevenir_admins(db: AsyncSession, profil, creneau: str, reponses: Optional[dict] = None) -> None:
        notifier, User = g.get("notifier"), g.get("User")
        if not (notifier and User):
            return
        try:
            for aid in (await db.execute(select(User.id).where(User.role == "admin"))).scalars().all():
                await notifier(db, aid, "admin", f"Rendez-vous reprise : {profil.prenom or profil.email or 'client'}",
                               f"{creneau.replace('T', ' à ')} · 20 min · " + " · ".join(LIBELLES.get(v, v) for k, v in (reponses or {}).items() if k != "question" and v)
                               + (f" · « {reponses['question'][:120]} »" if (reponses or {}).get("question") else "") + " · paiement en cours de validation · envoyer le lien de la visio",
                               "/admin", tag="rdv-reprise", cle=f"rdv-reprise:{creneau}")
        except Exception as e:  # noqa: BLE001
            log.warning("Notification admin (rdv reprise) non envoyée : %s", e)

    # ───────── 3. Conseil des 5 ─────────
    def _client(systeme: str, cle: str):
        client = g["_client_llm"](cle, systeme)
        modele = _env("MODELE_CONSEIL", "")
        if client is not None and modele and hasattr(client, "model"):
            client.model = modele
        return client

    async def _demander(systeme: str, message: str, cle: str, delai: int = 60) -> str:
        from llm_mammouth import UserMessage
        client = _client(systeme, cle)
        if client is None:
            raise HTTPException(503, "L'IA n'est pas disponible pour le moment.")
        return str(await asyncio.wait_for(client.send_message(UserMessage(text=message)), timeout=delai))

    @api.get("/idees/{idee_id}/conseil")
    async def conseil_lire(idee_id: str, db: AsyncSession = Depends(get_db)):
        return await _etat_conseil(db, _uid(), idee_id)

    async def _quota(db: AsyncSession, uid: str) -> tuple:
        quota = int(_env("CONSEIL_QUOTA_MOIS", "5") or 5)
        mois = datetime.now(timezone.utc).strftime("%Y-%m")
        utilises = len((await db.execute(select(ConseilResultat.id).where(ConseilResultat.user_id == uid,
                                                                           ConseilResultat.mois == mois))).scalars().all())
        return quota, utilises, mois

    async def _etat_conseil(db: AsyncSession, uid: str, cible: str) -> dict:
        row = (await db.execute(select(ConseilResultat).where(ConseilResultat.user_id == uid, ConseilResultat.idee_id == cible)
                                .order_by(ConseilResultat.created_at.desc()).limit(1))).scalar_one_or_none()
        quota, utilises, _ = await _quota(db, uid)
        return {"resultat": row.resultat if row else None, "quota": quota, "utilises": utilises,
                "autorise": await _offre_solo_plus(db, uid)}

    async def _executer_conseil(db: AsyncSession, uid: str, cible: str, titre: str, notes: str, body: "ConseilIn") -> dict:
        if not await _offre_solo_plus(db, uid):
            raise HTTPException(402, "Le Conseil des 5 est inclus dans les offres Solo, Équipe et Entreprise.")
        quota, utilises, mois = await _quota(db, uid)
        if utilises >= quota:
            raise HTTPException(429, f"Vous avez utilisé vos {quota} analyses du mois. Elles reviennent le 1er du mois prochain.")
        p = await _profil(db, uid)
        cm = p.contexte_metier or {}
        profil = ", ".join(f"{k} : {cm.get(k)}" for k in ("metier", "activite", "offre", "cible", "marche") if cm.get(k))
        question = (f"Projet : {titre}\nCe que la personne en a écrit : {(notes or '—')[:2500]}\n"
                    f"Pour qui : {body.pour_qui or 'non précisé'}\nPrix envisagé : {body.prix or 'non précisé'}\n"
                    f"Profil de la personne : {profil or 'non renseigné'}")
        jeton = uuid.uuid4().hex[:6]

        # Étape 1 : les 5 avis, en parallèle et indépendants.
        avis_brut = await asyncio.gather(*[
            _demander(*prompt_conseiller(nom, style, question), f"conseil-{cle}-{uid}-{jeton}")
            for cle, nom, style in CONSEILLERS], return_exceptions=True)
        avis, positions = {}, []
        for (cle, nom, _), texte in zip(CONSEILLERS, avis_brut):
            texte = "" if isinstance(texte, Exception) else texte
            avis[nom] = re.sub(r"\n?POSITION\s*:.*$", "", texte, flags=re.I | re.S).strip()
            positions.append({"cle": cle, "nom": nom, "position": position_depuis(texte), "avis": avis[nom]})
        if not any(avis.values()):
            raise HTTPException(503, "Le Conseil n'a pas pu se réunir. Réessayez dans un instant.")

        # Étape 2 : relecture croisée anonyme (lettres mélangées).
        lettres = list("ABCDE")
        ordre = list(avis.items())
        random.shuffle(ordre)
        anonymes = {lettres[i]: texte for i, (_, texte) in enumerate(ordre)}
        relectures = await asyncio.gather(*[
            _demander(*prompt_relecture(question, anonymes), f"relecture-{i}-{uid}-{jeton}") for i in range(5)],
            return_exceptions=True)
        relectures = [r for r in relectures if isinstance(r, str) and r.strip()]

        # Étape 3 : synthèse du président (+ panel en parallèle).
        taches = [_demander(*prompt_president(question, avis, relectures), f"president-{uid}-{jeton}", 90)]
        if body.avec_panel:
            taches.append(_demander(*prompt_panel(question), f"panel-{uid}-{jeton}", 90))
        sorties = await asyncio.gather(*taches, return_exceptions=True)
        synthese = json_depuis(sorties[0]) if isinstance(sorties[0], str) else {}
        panel = resumer_panel(json_depuis(sorties[1])) if body.avec_panel and len(sorties) > 1 and isinstance(sorties[1], str) else None

        resultat = {
            "idee": titre, "le": datetime.now(timezone.utc).isoformat(),
            "conseillers": positions,
            "accord": str(synthese.get("accord") or ""), "desaccord": str(synthese.get("desaccord") or ""),
            "angle_mort": str(synthese.get("angle_mort") or ""), "vigilance": str(synthese.get("vigilance") or ""),
            "recommandation": str(synthese.get("recommandation") or ""),
            "premiere_action": str(synthese.get("premiere_action") or ""),
            "swot": synthese.get("swot") if isinstance(synthese.get("swot"), dict) else {},
            "panel": panel, "relectures": relectures,
            "avertissement": ("Conseillers et acheteurs simulés par l'IA à partir de votre description : ce ne sont ni des "
                              "experts ni de vrais clients. Seules de vraies conversations confirment une idée."),
        }
        db.add(ConseilResultat(user_id=uid, idee_id=cible, mois=mois, resultat=resultat))
        await db.commit()
        return resultat

    @api.post("/idees/{idee_id}/conseil")
    async def conseil_lancer(idee_id: str, body: ConseilIn, db: AsyncSession = Depends(get_db)):
        uid = _uid()
        if not await _offre_solo_plus(db, uid):
            raise HTTPException(402, "Le Conseil des 5 est inclus dans les offres Solo, Équipe et Entreprise.")
        Idee = g["Idee"]
        idee = (await db.execute(select(Idee).where(Idee.id == idee_id, Idee.user_id == uid))).scalar_one_or_none()
        if not idee:
            raise HTTPException(404, "Idée introuvable.")
        return await _executer_conseil(db, uid, idee.id, idee.titre, idee.description or "", body)

    # ───────── 3 bis. Un tableau du Vision Board = un projet ─────────
    def _textes_cartes(cards: list) -> str:
        """Texte lisible des cartes d'un tableau (titres, notes, légendes), pour décrire le projet au Conseil."""
        morceaux = []

        def lire(v):
            if isinstance(v, str):
                return v
            if isinstance(v, dict):
                return v.get("fr") or v.get("en") or ""
            return ""
        for c in cards or []:
            if not isinstance(c, dict) or c.get("type") in ("line", "draw", "image", "live"):
                continue
            for champ in ("title", "body", "text", "label", "content", "caption"):
                t = lire(c.get(champ)).strip()
                if t and t not in morceaux:
                    morceaux.append(t[:400])
        return "\n".join(f"- {m}" for m in morceaux)[:2500]

    async def _tableau(db: AsyncSession, uid: str, cle: str):
        row = await g["_board_courant"](db, uid, cle)
        if row is None or row.cle != cle:
            raise HTTPException(404, "Tableau introuvable.")
        return row

    @api.get("/vision/boards/{cle}/analyse")
    async def analyse_tableau_lire(cle: str, db: AsyncSession = Depends(get_db)):
        uid = _uid()
        row = await _tableau(db, uid, cle)
        sim = (await db.execute(select(RepriseSimulation).where(RepriseSimulation.user_id == uid, RepriseSimulation.board_cle == cle)
                                .order_by(RepriseSimulation.created_at.desc()).limit(1))).scalar_one_or_none()
        return {"tableau": {"cle": row.cle, "nom": row.nom, "emoji": row.emoji, "cartes": len(row.cards or [])},
                "reprise": ({"id": sim.id, "entree": sim.entree, **(sim.resultat or {})} if sim else None),
                "conseil": await _etat_conseil(db, uid, f"board:{cle}")}

    @api.post("/vision/boards/{cle}/conseil")
    async def conseil_tableau(cle: str, body: ConseilIn, db: AsyncSession = Depends(get_db)):
        uid = _uid()
        row = await _tableau(db, uid, cle)
        notes = _textes_cartes(row.cards or [])
        sim = (await db.execute(select(RepriseSimulation).where(RepriseSimulation.user_id == uid, RepriseSimulation.board_cle == cle)
                                .order_by(RepriseSimulation.created_at.desc()).limit(1))).scalar_one_or_none()
        if sim:
            r = sim.resultat or {}
            notes += (f"\nProjet de reprise d'entreprise : prix demandé {sim.entree.get('prix_demande')} €, "
                      f"EBE retraité {r.get('ebe_retraite')} €, échéances = {r.get('ratio_echeances_ebe')} % de l'EBE retraité.")
        if not notes.strip():
            raise HTTPException(422, "Ajoutez d'abord quelques cartes à ce tableau (votre vision, votre pourquoi, vos idées).")
        return await _executer_conseil(db, uid, f"board:{cle}", row.nom or "Mon projet", notes, body)

    # ───────── 4. Modèle du chat selon l'offre ─────────
    _client_origine = g["_client_llm"]
    VisionProfile, async_session = g.get("VisionProfile"), g.get("async_session")

    class _ClientSelonOffre:
        """Même interface que MammouthChat / EmergentChat. Résout l'offre au premier appel
        (le chat appelle _client_llm de façon synchrone, sans session de base)."""

        def __init__(self, base, uid: str):
            self.base, self.uid = base, uid
            self._client = None

        async def _resoudre(self):
            if self._client is not None:
                return self._client
            client = self.base
            modele = _env("MODELE_CHAT_SOLO", "claude-opus-5-5")
            try:
                if modele and VisionProfile is not None and async_session is not None and hasattr(client, "model"):
                    async with async_session() as s:
                        plan = (await s.execute(select(VisionProfile.plan).where(VisionProfile.user_id == self.uid))).scalar_one_or_none()
                    if (plan or "") in OFFRES_SOLO_PLUS:
                        client.model = modele
            except Exception as e:  # noqa: BLE001
                log.warning("Choix du modèle selon l'offre impossible : %s", e)
            self._client = client
            return client

        async def send_message(self, message):
            return await (await self._resoudre()).send_message(message)

        async def stream_message(self, message):
            client = await self._resoudre()
            async for ev in client.stream_message(message):
                yield ev

    def _client_llm_selon_offre(session_id: str, systeme: str):
        base = _client_origine(session_id, systeme)
        if base is None or not str(session_id).startswith("copilote-"):
            return base
        return _ClientSelonOffre(base, str(session_id)[len("copilote-"):])

    g["_client_llm"] = _client_llm_selon_offre
