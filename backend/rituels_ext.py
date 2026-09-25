"""Bien-être : rituels cochés (persistants), série de jours et courbe d'énergie actionnable.

- Les rituels cochés sont enregistrés côté serveur (avant : navigateur uniquement,
  reliés à rien) et comptent dans la série du cockpit.
- La série = jours consécutifs avec au moins un geste pour soi : check-in,
  rituel ou exercice Mindset. Elle reste « en cours » jusqu'à minuit.
- La courbe d'énergie renvoie les vrais jours (date + jour de semaine) et repère
  ton jour creux / ton jour fort sur les 4 dernières semaines.
"""
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException
from sqlalchemy import DateTime, String, UniqueConstraint, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

RITUELS = {
    "r1": "Respiration 4-7-8", "r2": "Journal des 3", "r3": "Pause consciente",
    "r4": "Pensée d'ancrage", "r5": "Marche méditative", "r6": "Visualisation Refuge",
}
JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]


def calcul_serie(jours_actifs: set, aujourd_hui: date) -> dict:
    """Série en cours (jusqu'à aujourd'hui, ou hier si rien encore aujourd'hui) et record."""
    fait = aujourd_hui.isoformat() in jours_actifs
    d = aujourd_hui if fait else aujourd_hui - timedelta(days=1)
    n = 0
    while d.isoformat() in jours_actifs:
        n += 1
        d -= timedelta(days=1)
    record, courant, prec = 0, 0, None
    for j in sorted(jours_actifs):
        dj = date.fromisoformat(j)
        courant = courant + 1 if prec and (dj - prec).days == 1 else 1
        record = max(record, courant)
        prec = dj
    return {"jours": n, "aujourdhui_fait": fait, "record": max(record, n)}


def analyse_semaine(points: list) -> Optional[dict]:
    """points : [(date iso, énergie 1-5)]. Repère le jour creux et le jour fort (≥ 2 mesures chacun)."""
    par_jour = {}
    for j, e in points:
        if e:
            par_jour.setdefault(date.fromisoformat(j).weekday(), []).append(e)
    moyennes = {k: sum(v) / len(v) for k, v in par_jour.items() if len(v) >= 2}
    if len(moyennes) < 3:
        return None
    globale = sum(e for _, e in points if e) / max(1, len([1 for _, e in points if e]))
    creux = min(moyennes, key=moyennes.get)
    fort = max(moyennes, key=moyennes.get)
    sortie = {"moyenne": round(globale, 1)}
    if globale - moyennes[creux] >= 0.6:
        sortie["creux"] = {"jour": JOURS[creux], "moyenne": round(moyennes[creux], 1),
                           "conseil": f"Le {JOURS[creux]}, c'est ton creux : planifie léger (admin, suivi, rangement) et garde les rendez-vous importants pour un autre jour."}
    if moyennes[fort] - globale >= 0.6:
        sortie["fort"] = {"jour": JOURS[fort], "moyenne": round(moyennes[fort], 1),
                          "conseil": f"Le {JOURS[fort]}, tu es au meilleur de ta forme : c'est le jour pour prospecter, vendre ou avancer sur ta priorité n° 1."}
    return sortie


def install_rituels(g: dict) -> None:
    api, Base, get_db = g["api"], g["Base"], g["get_db"]
    _uid, new_uuid, utcnow = g["_uid"], g["new_uuid"], g["utcnow"]
    VisionCheckin = g["VisionCheckin"]

    class RituelFait(Base):
        __tablename__ = "rituels_faits"
        __table_args__ = (UniqueConstraint("user_id", "jour", "rituel", name="uq_rituel_jour"),)
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        jour: Mapped[str] = mapped_column(String(10), index=True)
        rituel: Mapped[str] = mapped_column(String(10))
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    g["RituelFait"] = RituelFait

    async def jours_actifs(db: AsyncSession, uid: str, depuis: str) -> set:
        jours = set((await db.execute(select(VisionCheckin.date).where(
            VisionCheckin.user_id == uid, VisionCheckin.date >= depuis))).scalars())
        jours |= set((await db.execute(select(RituelFait.jour).where(
            RituelFait.user_id == uid, RituelFait.jour >= depuis))).scalars())
        ME = g.get("MindsetEntree")
        if ME is not None:
            jours |= set((await db.execute(select(ME.jour).where(ME.user_id == uid, ME.jour >= depuis))).scalars())
        return {j for j in jours if j}

    async def serie(db: AsyncSession, uid: str) -> dict:
        auj = date.today()
        return calcul_serie(await jours_actifs(db, uid, (auj - timedelta(days=400)).isoformat()), auj)

    g["_serie_bien_etre"] = serie

    @api.get("/serie")
    async def lire_serie(db: AsyncSession = Depends(get_db)):
        return await serie(db, _uid())

    @api.get("/rituels")
    async def rituels_du_jour(db: AsyncSession = Depends(get_db)):
        uid = _uid()
        jour = date.today().isoformat()
        faits = list((await db.execute(select(RituelFait.rituel).where(
            RituelFait.user_id == uid, RituelFait.jour == jour))).scalars())
        return {"jour": jour, "faits": faits, "serie": await serie(db, uid)}

    @api.post("/rituels/{rituel}/basculer")
    async def basculer_rituel(rituel: str, db: AsyncSession = Depends(get_db)):
        if rituel not in RITUELS:
            raise HTTPException(404, "Rituel inconnu.")
        uid = _uid()
        jour = date.today().isoformat()
        r = (await db.execute(select(RituelFait).where(RituelFait.user_id == uid, RituelFait.jour == jour,
                                                       RituelFait.rituel == rituel))).scalar_one_or_none()
        if r:
            await db.delete(r)
            fait = False
        else:
            db.add(RituelFait(user_id=uid, jour=jour, rituel=rituel))
            fait = True
        await db.commit()
        return {"rituel": rituel, "fait": fait, "serie": await serie(db, uid)}

    @api.get("/bien-etre/energie")
    async def courbe_energie(db: AsyncSession = Depends(get_db)):
        """7 derniers jours (avec leur vrai jour de semaine) + analyse des 4 dernières semaines."""
        uid = _uid()
        auj = date.today()
        rows = list((await db.execute(select(VisionCheckin).where(
            VisionCheckin.user_id == uid, VisionCheckin.date >= (auj - timedelta(days=27)).isoformat())
            .order_by(VisionCheckin.date))).scalars())
        par_date = {r.date: r.energie for r in rows}
        semaine = []
        for i in range(6, -1, -1):
            d = auj - timedelta(days=i)
            semaine.append({"date": d.isoformat(), "jour": JOURS[d.weekday()][:3], "energie": par_date.get(d.isoformat())})
        return {"semaine": semaine, "analyse": analyse_semaine([(r.date, r.energie) for r in rows])}
