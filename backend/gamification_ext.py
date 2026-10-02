"""Gamification : séries (streaks), badges et progression Vision.

GET /api/gamification → séries de check-in, badges débloqués, progression des
objectifs. Alimente le widget de motivation du Cockpit.
"""
from datetime import date, timedelta

from fastapi import Depends
from sqlalchemy import select


def install_gamification(g: dict) -> None:
    api, get_db = g["api"], g["get_db"]
    _uid = g["_uid"]
    VisionCheckin = g["VisionCheckin"]
    VisionVictoire = g["VisionVictoire"]
    VisionObjectif = g["VisionObjectif"]
    VisionTache = g["VisionTache"]

    def _series(dates: set) -> tuple[int, int]:
        """(série actuelle, record) à partir d'un ensemble de dates ISO (YYYY-MM-DD)."""
        jours = sorted({d for d in dates if d}, reverse=True)
        if not jours:
            return 0, 0
        parsed = []
        for j in jours:
            try:
                parsed.append(date.fromisoformat(j))
            except ValueError:
                continue
        if not parsed:
            return 0, 0
        parsed = sorted(set(parsed), reverse=True)
        today = date.today()
        # Série actuelle : part d'aujourd'hui ou d'hier (tolérance 1 jour).
        actuelle = 0
        if parsed[0] in (today, today - timedelta(days=1)):
            attendu = parsed[0]
            for d in parsed:
                if d == attendu:
                    actuelle += 1
                    attendu = attendu - timedelta(days=1)
                elif d < attendu:
                    break
        # Record : plus longue suite consécutive.
        record = 1
        courant = 1
        asc = sorted(set(parsed))
        for i in range(1, len(asc)):
            if asc[i] - asc[i - 1] == timedelta(days=1):
                courant += 1
                record = max(record, courant)
            else:
                courant = 1
        return actuelle, max(record, actuelle)

    @api.get("/gamification")
    async def gamification(db=Depends(get_db)):
        uid = _uid()
        checkins = list((await db.execute(select(VisionCheckin).where(VisionCheckin.user_id == uid))).scalars())
        victoires = list((await db.execute(select(VisionVictoire).where(VisionVictoire.user_id == uid))).scalars())
        objectifs = list((await db.execute(select(VisionObjectif).where(VisionObjectif.user_id == uid))).scalars())
        taches = list((await db.execute(select(VisionTache).where(VisionTache.user_id == uid))).scalars())

        serie, record = _series({c.date for c in checkins})
        total_checkins = len(checkins)
        total_victoires = len(victoires)
        obj_total = len(objectifs)
        obj_faits = len([o for o in objectifs if o.statut in ("realise", "termine", "atteint")])
        taches_faites = len([t for t in taches if t.statut in ("fait", "termine")])
        if objectifs:
            progression = round(sum(min(100, max(0, o.progression or 0)) for o in objectifs) / len(objectifs))
        else:
            progression = 0

        def badge(cle, nom, desc, obtenu, icon):
            return {"cle": cle, "nom": nom, "desc": desc, "obtenu": bool(obtenu), "icon": icon}

        badges = [
            badge("premier_pas", "Premier pas", "Ton premier check-in", total_checkins >= 1, "Footprints"),
            badge("regulier", "Régulier", "3 jours d'affilée", serie >= 3 or record >= 3, "CalendarCheck"),
            badge("en_feu", "En feu", "7 jours d'affilée", serie >= 7 or record >= 7, "Flame"),
            badge("marathonien", "Marathonien", "30 jours d'affilée", record >= 30, "Trophy"),
            badge("premier_objectif", "Cap fixé", "Ton premier objectif", obj_total >= 1, "Target"),
            badge("gagnant", "Gagnant", "Ta première victoire", total_victoires >= 1, "Award"),
            badge("accompli", "Accompli", "Un objectif atteint", obj_faits >= 1, "CheckCircle2"),
            badge("visionnaire", "Visionnaire", "50% de progression Vision", progression >= 50, "Sparkles"),
        ]

        return {
            "serie_actuelle": serie,
            "serie_record": record,
            "total_checkins": total_checkins,
            "total_victoires": total_victoires,
            "objectifs_total": obj_total,
            "objectifs_faits": obj_faits,
            "taches_faites": taches_faites,
            "vision_progression": progression,
            "badges": badges,
            "badges_obtenus": len([b for b in badges if b["obtenu"]]),
        }
