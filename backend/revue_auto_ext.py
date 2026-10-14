"""Revue de la semaine proposée par le Copilote (plus de raccourci à cliquer).

En fin de semaine de travail (le dernier jour d'activité choisi à l'inscription, vendredi par défaut, à partir de 15 h),
le moteur de relances (relances_ext.py, type « revue ») appelle `proposer_revue` :
  1. le Copilote ÉCRIT à l'utilisateur dans le chat : 5 questions courtes ;
  2. une notification (cloche + push) ouvre directement le chat ;
  3. l'utilisateur répond dans le chat, en vrac ou dans l'ordre ; `traiter_revue` (appelé par /copilote/chat) reconnaît
     la réponse, l'IA la range dans les 5 rubriques, rédige la synthèse et l'enregistre :
       · dans l'appli (Revue de la semaine, historique), « ce qui a avancé » devient une victoire ;
       · dans le dossier de documents de l'utilisateur (Drive / OneDrive) s'il en a relié un.
« Plus tard » / « pas cette semaine » : la revue est sautée, sans insister.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select

log = logging.getLogger("kairos.revue_auto")

QUESTIONS = [
    ("q1", "Qu'est-ce qui a vraiment avancé ?"),
    ("q2", "Qu'est-ce qui t'a coûté le plus d'énergie ?"),
    ("q3", "Qu'as-tu appris ?"),
    ("q4", "Que lâches-tu la semaine prochaine ?"),
    ("q5", "Quelle est LA priorité de la semaine qui vient ?"),
]
_RE_PLUS_TARD = re.compile(r"^\s*(plus tard|pas maintenant|pas cette semaine|non merci|pas le temps|une autre fois|demain)\b", re.I)


def message_proposition(prenom: str = "") -> str:
    p = f"{prenom.strip().split()[0]}, ta" if (prenom or "").strip() else "Ta"
    lignes = [f"{p} semaine de travail se termine. On fait ta revue en 5 minutes ? Réponds-moi ici, en vrac ou dans l'ordre :", ""]
    lignes += [f"{i}. {q}" for i, (_, q) in enumerate(QUESTIONS, 1)]
    lignes += ["", "Je range ta revue dans l'appli (et dans ton dossier Drive / OneDrive s'il est relié). "
               "Si ce n'est pas le moment, réponds « plus tard »."]
    return "\n".join(lignes)


def decouper_reponse(texte: str) -> dict:
    """Repli sans IA : « 1. … 2. … » ou une ligne par question ; sinon tout va dans « ce qui a avancé »."""
    morceaux = re.split(r"(?:^|\n)\s*([1-5])\s*[.)\-:]\s*", "\n" + (texte or ""))
    rep = {}
    if len(morceaux) >= 3:
        for i in range(1, len(morceaux) - 1, 2):
            v = morceaux[i + 1].strip()
            if v:
                rep[f"q{morceaux[i]}"] = v[:1200]
    if not rep:
        lignes = [l.strip() for l in (texte or "").split("\n") if l.strip()]
        if len(lignes) >= 3:
            rep = {f"q{i}": l[:1200] for i, l in enumerate(lignes[:5], 1)}
        elif (texte or "").strip():
            rep = {"q1": texte.strip()[:1200]}
    return rep


def install_revue_auto(g: dict) -> None:
    VisionChatMessage, _client_llm = g["VisionChatMessage"], g["_client_llm"]
    from lib.db import db as docs

    def _semaine() -> str:
        d = date.today()
        return (d - timedelta(days=d.weekday())).isoformat()

    async def proposer_revue(db, uid: str, prenom: str = "") -> bool:
        """Le Copilote écrit dans le chat et attend la réponse. Une seule fois par semaine."""
        semaine = _semaine()
        deja = await docs.revue_attente.find_one({"user_id": uid})
        if deja and deja.get("semaine") == semaine:
            return False
        msg = VisionChatMessage(user_id=uid, role="assistant", contenu=message_proposition(prenom))
        db.add(msg)
        await db.commit()
        await docs.revue_attente.update_one({"user_id": uid}, {"$set": {
            "id": uid, "user_id": uid, "semaine": semaine, "message_id": msg.id, "statut": "attente"}}, upsert=True)
        return True

    async def _en_attente(db, uid: str) -> Optional[dict]:
        a = await docs.revue_attente.find_one({"user_id": uid})
        if not a or a.get("statut") != "attente" or a.get("semaine") != _semaine():
            return None
        # On ne détourne une réponse que si la question de la revue est le DERNIER message du Copilote.
        dernier = (await db.execute(select(VisionChatMessage).where(
            VisionChatMessage.user_id == uid, VisionChatMessage.role == "assistant")
            .order_by(VisionChatMessage.created_at.desc()).limit(1))).scalar_one_or_none()
        return a if dernier is not None and dernier.id == a.get("message_id") else None

    async def _ranger_en_rubriques(texte: str) -> dict:
        client = _client_llm("revue-auto", (
            "Tu ranges la réponse d'un entrepreneur à sa revue de la semaine dans 5 rubriques, SANS rien inventer ni "
            "reformuler au-delà du nécessaire. Rubriques : q1 ce qui a vraiment avancé · q2 ce qui a coûté le plus d'énergie · "
            "q3 ce qui a été appris · q4 ce qui est lâché la semaine prochaine · q5 la seule priorité de la semaine à venir. "
            "Rubrique sans réponse = chaîne vide. Réponds UNIQUEMENT en JSON : {\"q1\":\"…\",\"q2\":\"…\",\"q3\":\"…\",\"q4\":\"…\",\"q5\":\"…\"}"))
        if client is not None:
            try:
                from llm_mammouth import UserMessage
                brut = str(await asyncio.wait_for(client.send_message(UserMessage(text=texte[:4000])), timeout=40))
                d = json.loads(brut[brut.find("{"): brut.rfind("}") + 1])
                rep = {k: str(d.get(k) or "").strip()[:1200] for k, _ in QUESTIONS if str(d.get(k) or "").strip()}
                if rep:
                    return rep
            except Exception as e:  # noqa: BLE001
                log.info("Revue : rangement IA indisponible (%s), découpage simple", e)
        return decouper_reponse(texte)

    async def traiter_revue(db, uid: str, message: str) -> Optional[str]:
        """Appelé par /copilote/chat : si l'utilisateur répond à la revue proposée, on l'enregistre et on renvoie
        la réponse du Copilote. Sinon None (le chat continue normalement)."""
        attente = await _en_attente(db, uid)
        if not attente:
            return None
        if _RE_PLUS_TARD.search(message or ""):
            await docs.revue_attente.update_one({"user_id": uid}, {"$set": {"statut": "sautee"}})
            return "D'accord, on la saute cette semaine. Tu peux la faire quand tu veux depuis ta page Revue de la semaine."
        if len((message or "").strip()) < 12:
            return None  # « ok », « oui » : on laisse le Copilote répondre normalement, la revue reste en attente
        reponses = await _ranger_en_rubriques(message)
        res = await g["_enregistrer_revue"](db, uid, reponses, "fr")
        await docs.revue_attente.update_one({"user_id": uid}, {"$set": {"statut": "faite"}})
        libelles = dict(QUESTIONS)
        contenu = "\n".join([f"# Revue de la semaine du {res['semaine']}", ""] +
                            [f"## {libelles[k]}\n{v}\n" for k, v in reponses.items()] +
                            ["## Synthèse de ton copilote", res["synthese"]])
        rangement = None
        if g.get("documents_ranger_texte"):
            rangement = await g["documents_ranger_texte"](db, uid, f"Revue de la semaine {res['semaine']}", contenu)
        fin = "C'est rangé dans ta Revue de la semaine"
        fin += f" et dans ton dossier de documents ({rangement['url']})" if rangement and rangement.get("url") else ""
        fin += "." + (" « Ce qui a avancé » est noté dans tes victoires." if res.get("victoire") else "")
        return f"{res['synthese']}\n\n{fin}"

    g["proposer_revue"], g["traiter_revue"] = proposer_revue, traiter_revue
