"""Ton entreprise, suite : chronomètre de travail, assistant de l'entreprise, dossier de reprise partagé.

- Chronomètre : on le lance et on l'arrête d'un bouton OU en le disant au chat (« je commence la compta », « j'ai fini »).
  À l'arrêt, le temps est enregistré tout seul dans les saisies de temps (donc dans le décompte du mois).
- Assistant de l'entreprise : le chat d'un membre de l'équipe n'est pas le Copilote personnel. C'est le chatbot de
  l'entreprise (Agent Business du dirigeant : son nom, son ton, ses connaissances), nourri des données de la personne
  dans l'entreprise (pièces, planning, absences, congés) et des consignes. Il répond aussi aux ordres du chronomètre.
- Reprise & cession en partenariat : un conseiller Zayado (rôle interne) partage un dossier avec une entreprise cliente
  qui a signé un mandat ; ses gérants le suivent dans « Ton entreprise » (lecture seule : avancement, chiffres, documents).
"""
import asyncio
import logging
import re
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, String, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

log = logging.getLogger("kairos.entreprise_assistant")

_DEBUT = re.compile(r"^\s*(?:ok[\s,!.]*)?(?:je\s+(?:commence|d[ée]marre|d[ée]bute|attaque|me\s+mets?\s+(?:à|a|sur))|c'?est\s+parti|on\s+d[ée]marre|d[ée]but|go)\b\s*(?:(?:à|a|sur|la|le|les|l'|par|avec|du|de\s+la|de)\s+)*(?P<projet>.*)$", re.I)
_FIN = re.compile(r"^\s*(?:ok[\s,!.]*)?(?:j'?ai\s+(?:fini|termin[ée]|fait)|je\s+(?:m'?arr[êe]te|termine|stoppe)|fini|termin[ée]|stop|fin(?:\s+de\s+journ[ée]e)?|pause)\b", re.I)
GERANTS = ("proprietaire", "manager")


def lire_ordre_chrono(message: str) -> Optional[tuple]:
    """(« debut », projet) ou (« fin », None) si le message est un ordre de chronomètre ; sinon None.
    Volontairement strict : la phrase doit COMMENCER par l'ordre, pour ne pas déclencher sur une conversation normale."""
    m = (message or "").strip()
    if len(m) > 160:
        return None
    if _FIN.match(m):
        return ("fin", None)
    d = _DEBUT.match(m)
    if d:
        projet = re.sub(r"[.!]+$", "", d.group("projet") or "").strip()[:120]
        return ("debut", projet)
    return None


def extraire_dossier(texte: str) -> tuple:
    """« le dossier 2024-15 ticket 88 relecture du contrat » → (« relecture du contrat », « 2024-15 », « 88 »)."""
    t = texte or ""
    dossier = ticket = None
    m = re.search(r"\bdossier\s*(?:n[°o]\s*)?([\w\-/.]+)", t, re.I)
    if m:
        dossier = m.group(1)
        t = t[:m.start()] + t[m.end():]
    m = re.search(r"\bticket\s*(?:n[°o]\s*)?([\w\-/.]+)", t, re.I)
    if m:
        ticket = m.group(1)
        t = t[:m.start()] + t[m.end():]
    t = re.sub(r"^\s*(?:le|la|les|du|de|sur|pour|:|-|,)\s+", "", re.sub(r"\s+", " ", t).strip(), flags=re.I).strip(" ,:-")
    return t[:120], dossier, ticket


def heures_entre(debut: datetime, fin: datetime) -> float:
    """Durée en heures, arrondie au quart d'heure, au moins 0,25 h."""
    h = max((fin - debut).total_seconds(), 0) / 3600
    return max(0.25, round(h * 4) / 4)


def install_entreprise_assistant(g: dict) -> None:
    api, Base, get_db, _uid, utcnow = g["api"], g["Base"], g["get_db"], g["_uid"], g["utcnow"]
    EntMembre, EntTemps = g["EntMembre"], g["EntTemps"]

    class EntChrono(Base):
        """Le chronomètre en cours d'une personne (une ligne au plus par personne)."""
        __tablename__ = "ent_chronos"
        membre_id: Mapped[str] = mapped_column(String(36), primary_key=True)
        org_id: Mapped[str] = mapped_column(String(36), index=True)
        debut: Mapped[datetime] = mapped_column(DateTime(timezone=True))
        projet: Mapped[str] = mapped_column(String(120), default="")  # description de la tâche
        dossier: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
        ticket: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
        referent: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
        libelle: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)  # ligne courte (celle qui ira sur la facture)

    class EntSuiviTemps(Base):
        """Décidé par l'entreprise, personne par personne : pas de chronomètre, temps de travail (salarié : décompte du
        mois) ou temps PAR DOSSIER (partenaire, prestataire : décompte par dossier à facturer dans son propre outil)."""
        __tablename__ = "ent_suivi_temps"
        membre_id: Mapped[str] = mapped_column(String(36), primary_key=True)
        org_id: Mapped[str] = mapped_column(String(36), index=True)
        mode: Mapped[str] = mapped_column(String(10), default="aucun")  # aucun | travail | dossier

    g["EntChrono"], g["EntSuiviTemps"] = EntChrono, EntSuiviTemps
    MODES = ("aucun", "travail", "dossier")

    async def mode_de(db, m) -> str:
        r = await db.get(EntSuiviTemps, m.id)
        return r.mode if r else "aucun"

    def _aware(d: datetime) -> datetime:
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)

    async def _membre_de(db, uid: str) -> Optional[EntMembre]:
        return (await db.execute(select(EntMembre).where(EntMembre.user_id == uid, EntMembre.statut == "actif"))).scalars().first()

    async def demarrer(db, m: EntMembre, projet: str, dossier: str = "", ticket: str = "", referent: str = "", libelle: str = "") -> dict:
        mode = await mode_de(db, m)
        if mode == "aucun":
            raise HTTPException(403, "Le chronomètre n'est pas activé pour toi. Ton entreprise l'active dans Équipe › Fiche.")
        if mode == "dossier" and not dossier.strip():
            raise HTTPException(422, "Indique le numéro du dossier.")
        c = await db.get(EntChrono, m.id)
        arrete = None
        if c:  # on enchaîne : la tâche précédente est enregistrée avant de lancer la nouvelle
            arrete = await arreter(db, m)
        db.add(EntChrono(membre_id=m.id, org_id=m.org_id, debut=datetime.now(timezone.utc), projet=projet[:120],
                         dossier=dossier.strip()[:60] or None, ticket=ticket.strip()[:60] or None, referent=referent.strip()[:120] or None,
                         libelle=libelle.strip()[:120] or None))
        await db.commit()
        return {"en_cours": True, "projet": projet, "dossier": dossier.strip() or None, "debut": datetime.now(timezone.utc).isoformat(), "precedent": arrete}

    async def arreter(db, m: EntMembre) -> Optional[dict]:
        c = await db.get(EntChrono, m.id)
        if not c:
            return None
        fin = datetime.now(timezone.utc)
        h = heures_entre(_aware(c.debut), fin)
        db.add(EntTemps(org_id=m.org_id, membre_id=m.id, jour=_aware(c.debut).date().isoformat(), heures=h, projet=c.projet or "", note="chronomètre",
                        dossier=c.dossier, ticket=c.ticket, referent=c.referent, libelle=c.libelle))
        await db.delete(c)
        await db.commit()
        return {"heures": h, "projet": c.projet or "", "dossier": c.dossier}

    def _h(h: float) -> str:
        hh, mm = int(h), round((h - int(h)) * 60)
        return f"{hh} h {mm:02d}" if hh else f"{mm} min"

    async def traiter_chrono(db, uid: str, message: str) -> Optional[str]:
        """Branché sur le chat (appli, WhatsApp, Telegram) : renvoie la réponse si le message est un ordre de chronomètre."""
        ordre = lire_ordre_chrono(message)
        if not ordre:
            return None
        m = await _membre_de(db, uid)
        if not m:
            return None
        if ordre[0] == "fin":
            r = await arreter(db, m)
            if not r:
                return None  # rien ne tournait : on laisse le chat répondre normalement (« j'ai fini mon café »…)
            return f"⏱️ Chronomètre arrêté : {_h(r['heures'])}{' sur « ' + r['projet'] + ' »' if r['projet'] else ''}, enregistré dans ton temps de travail."
        mode = await mode_de(db, m)
        if mode == "aucun":
            return None  # chronomètre non activé par l'entreprise : le chat répond normalement
        projet, dossier, ticket = extraire_dossier(ordre[1])
        if mode == "dossier" and not dossier:
            return "Sur quel dossier ? Écris par exemple « je commence le dossier 2024-15 ticket 88 relecture du contrat »."
        r = await demarrer(db, m, projet, dossier or "", ticket or "")
        if dossier:
            return f"⏱️ C'est parti sur le dossier {dossier}{' (ticket ' + ticket + ')' if ticket else ''}{' : ' + projet if projet else ''}. Dis-moi « j'ai fini » quand tu t'arrêtes."
        avant = f" (avant ça : {_h(r['precedent']['heures'])} enregistrées)" if r.get("precedent") else ""
        return f"⏱️ C'est parti{' sur « ' + ordre[1] + ' »' if ordre[1] else ''}. Dis-moi « j'ai fini » quand tu t'arrêtes{avant}."

    g["traiter_chrono"] = traiter_chrono

    class ChronoIn(BaseModel):
        projet: str = Field(default="", max_length=120)
        dossier: str = Field(default="", max_length=60)
        ticket: str = Field(default="", max_length=60)
        referent: str = Field(default="", max_length=120)
        libelle: str = Field(default="", max_length=120)

    class ModeIn(BaseModel):
        mode: str

    @api.put("/entreprise/suivi-temps/{membre_id}")
    async def regler_suivi(membre_id: str, body: ModeIn, db: AsyncSession = Depends(get_db)):
        moi = await _membre_de(db, _uid())
        if not moi or moi.role not in GERANTS:
            raise HTTPException(403, "Seule l'entreprise règle le suivi du temps.")
        cible = await db.get(EntMembre, membre_id)
        if not cible or cible.org_id != moi.org_id:
            raise HTTPException(404, "Introuvable.")
        if body.mode not in MODES:
            raise HTTPException(422, "Mode : aucun, travail ou dossier.")
        r = await db.get(EntSuiviTemps, membre_id) or EntSuiviTemps(membre_id=membre_id, org_id=moi.org_id)
        r.mode = body.mode
        db.add(r)
        await db.commit()
        return {"membre_id": membre_id, "mode": r.mode}

    @api.get("/entreprise/suivi-temps")
    async def lire_suivi(db: AsyncSession = Depends(get_db)):
        moi = await _membre_de(db, _uid())
        if not moi:
            raise HTTPException(404, "Tu ne fais partie d'aucune équipe.")
        rows = (await db.execute(select(EntSuiviTemps).where(EntSuiviTemps.org_id == moi.org_id))).scalars().all()
        tous = {r.membre_id: r.mode for r in rows}
        return {"moi": tous.get(moi.id, "aucun"), "equipe": tous if moi.role in GERANTS else {}}

    async def _lignes_temps(db, moi, debut: str, fin: str, membre_id: Optional[str]) -> list:
        try:
            date.fromisoformat(debut), date.fromisoformat(fin)
        except ValueError:
            raise HTTPException(422, "Dates au format AAAA-MM-JJ.")
        q = select(EntTemps).where(EntTemps.org_id == moi.org_id, EntTemps.jour >= debut, EntTemps.jour <= fin)
        if moi.role not in GERANTS:
            q = q.where(EntTemps.membre_id == moi.id)
        elif membre_id:
            q = q.where(EntTemps.membre_id == membre_id)
        rows = (await db.execute(q.order_by(EntTemps.jour))).scalars().all()
        noms = {c.id: c.nom or c.email or "" for c in (await db.execute(select(EntMembre).where(EntMembre.org_id == moi.org_id))).scalars()}
        # Libellé absent (saisie par le chat, ancienne saisie) : on reprend la description, pour ne jamais laisser la ligne vide
        return [{"date": r.jour, "personne": noms.get(r.membre_id, ""), "dossier": r.dossier or "", "ticket": r.ticket or "",
                 "libelle": (r.libelle or r.projet or "")[:120], "description": r.projet or "", "referent": r.referent or "", "heures": r.heures} for r in rows]

    def _par_dossier(lignes: list) -> list:
        out = {}
        for l in lignes:
            d = out.setdefault(l["dossier"] or "(sans dossier)", {"dossier": l["dossier"] or "(sans dossier)", "heures": 0.0, "lignes": []})
            d["heures"] = round(d["heures"] + l["heures"], 2)
            d["lignes"].append(l)
        return sorted(out.values(), key=lambda x: x["dossier"])

    @api.get("/entreprise/temps/decompte")
    async def decompte_dossiers(debut: str, fin: str, membre_id: Optional[str] = None, format: str = "json", db: AsyncSession = Depends(get_db)):
        """Décompte du temps par dossier (pas une facture) : JSON, CSV (séparateur ;, lisible par Excel) ou Excel."""
        moi = await _membre_de(db, _uid())
        if not moi:
            raise HTTPException(404, "Tu ne fais partie d'aucune équipe.")
        lignes = await _lignes_temps(db, moi, debut, fin, membre_id)
        if format == "json":
            return {"debut": debut, "fin": fin, "dossiers": _par_dossier(lignes), "total": round(sum(l["heures"] for l in lignes), 2)}
        cols = ["date", "personne", "dossier", "ticket", "libelle", "description", "referent", "heures"]
        entetes = ["Date", "Personne", "Dossier", "Ticket", "Libellé", "Description", "Référent", "Heures"]
        nom = f"Decompte-temps-{debut}-{fin}"
        if format == "csv":
            import csv, io
            buf = io.StringIO()
            w = csv.writer(buf, delimiter=";")
            w.writerow(entetes)
            for l in lignes:
                w.writerow([l[c] if c != "heures" else str(l[c]).replace(".", ",") for c in cols])
            return Response(content="\ufeff" + buf.getvalue(), media_type="text/csv; charset=utf-8",
                            headers={"Content-Disposition": f"attachment; filename={nom}.csv"})
        if format == "xlsx":
            import io
            from openpyxl import Workbook
            wb = Workbook()
            ws = wb.active
            ws.title = "Détail"
            ws.append(entetes)
            for l in lignes:
                ws.append([l[c] for c in cols])
            s2 = wb.create_sheet("Par dossier")
            s2.append(["Dossier", "Heures"])
            for d in _par_dossier(lignes):
                s2.append([d["dossier"], d["heures"]])
            buf = io.BytesIO()
            wb.save(buf)
            return Response(content=buf.getvalue(), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            headers={"Content-Disposition": f"attachment; filename={nom}.xlsx"})
        raise HTTPException(422, "Format : json, csv ou xlsx.")

    class EnvoiIn(BaseModel):
        debut: str
        fin: str
        a: str = Field(min_length=3, max_length=255)
        membre_id: Optional[str] = None

    @api.post("/entreprise/temps/decompte/envoyer")
    async def envoyer_decompte(body: EnvoiIn, db: AsyncSession = Depends(get_db)):
        moi = await _membre_de(db, _uid())
        if not moi:
            raise HTTPException(404, "Tu ne fais partie d'aucune équipe.")
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", body.a.strip()):
            raise HTTPException(422, "Adresse e-mail invalide.")
        lignes = await _lignes_temps(db, moi, body.debut, body.fin, body.membre_id)
        from html import escape
        blocs = []
        for d in _par_dossier(lignes):
            tr = "".join(f"<tr><td>{escape(l['date'])}</td><td>{escape(l['ticket'])}</td><td>{escape(l['libelle'])}</td><td>{escape(l['description'])}</td><td>{escape(l['referent'])}</td>"
                         f"<td style='text-align:right'>{str(l['heures']).replace('.', ',')}</td></tr>" for l in d["lignes"])
            blocs.append(f"<h3>Dossier {escape(d['dossier'])} · {str(d['heures']).replace('.', ',')} h</h3>"
                         f"<table border='1' cellpadding='6' style='border-collapse:collapse'><tr><th>Date</th><th>Ticket</th><th>Libellé</th><th>Description</th><th>Référent</th><th>Heures</th></tr>{tr}</table>")
        total = str(round(sum(l["heures"] for l in lignes), 2)).replace(".", ",")
        html_ = (f"<div style='font-family:sans-serif'><p>Décompte du temps du {escape(body.debut)} au {escape(body.fin)}, envoyé par {escape(moi.nom or moi.email or '')}.</p>"
                 + "".join(blocs) + f"<p><b>Total : {total} h</b></p><p style='color:#888'>Décompte de temps, ce n'est pas une facture.</p></div>")
        rid = await g["send_email"](to=body.a.strip(), subject=f"Décompte de temps {body.debut} → {body.fin}", html=html_)
        if not rid:
            raise HTTPException(502, "L'e-mail n'a pas pu partir. Réessaie ou exporte le fichier.")
        return {"ok": True}

    @api.get("/entreprise/chrono")
    async def chrono_etat(db: AsyncSession = Depends(get_db)):
        m = await _membre_de(db, _uid())
        if not m:
            raise HTTPException(404, "Tu ne fais partie d'aucune équipe.")
        c = await db.get(EntChrono, m.id)
        return {"en_cours": bool(c), "debut": _aware(c.debut).isoformat() if c else None, "projet": c.projet if c else "",
                "dossier": c.dossier if c else None, "ticket": c.ticket if c else None, "libelle": c.libelle if c else None, "mode": await mode_de(db, m)}

    @api.post("/entreprise/chrono/demarrer")
    async def chrono_demarrer(body: ChronoIn, db: AsyncSession = Depends(get_db)):
        m = await _membre_de(db, _uid())
        if not m or m.role == "partenaire":
            raise HTTPException(403, "Ton rôle ne permet pas cette action.")
        return await demarrer(db, m, body.projet.strip(), body.dossier, body.ticket, body.referent, body.libelle)

    @api.post("/entreprise/chrono/arreter")
    async def chrono_arreter(db: AsyncSession = Depends(get_db)):
        m = await _membre_de(db, _uid())
        if not m:
            raise HTTPException(404, "Tu ne fais partie d'aucune équipe.")
        r = await arreter(db, m)
        if not r:
            raise HTTPException(409, "Aucun chronomètre en cours.")
        return r

    # ── Assistant de l'entreprise (le chatbot B2B de l'entreprise, relié aux données de la personne) ──────────────
    class AssistantIn(BaseModel):
        message: str = Field(min_length=1, max_length=2000)
        historique: list = Field(default_factory=list)  # [{role: "user"|"assistant", texte}]

    async def _contexte_membre(db, m: EntMembre) -> str:
        d0 = date.today().isoformat()
        d1 = (date.today() + timedelta(days=14)).isoformat()
        P, Pl, A = g["EntPiece"], g["EntPlanning"], g["EntAbsence"]
        pieces = (await db.execute(select(P).where(P.org_id == m.org_id, P.membre_id == m.id))).scalars().all()
        plan = [r for r in (await db.execute(select(Pl).where(Pl.org_id == m.org_id, Pl.debut <= d1, (Pl.membre_id == m.id) | (Pl.membre_id.is_(None))))).scalars() if (r.fin or r.debut) >= d0]
        abs_ = (await db.execute(select(A).where(A.org_id == m.org_id, A.membre_id == m.id, A.fin >= d0))).scalars().all()
        lib = {"a_fournir": "à fournir", "fournie": "déposée, en vérification", "validee": "validée", "refusee": "à refaire"}
        lignes = [f"Personne : {m.nom or m.email} ({m.poste or m.role})"]
        lignes.append("Pièces : " + ("; ".join(f"{p.titre} = {lib.get(p.statut, p.statut)}" + (f" (motif : {p.commentaire})" if p.commentaire else "") for p in pieces) or "aucune demandée"))
        lignes.append("Planning (14 jours) : " + ("; ".join(f"{r.debut} {r.titre}" for r in sorted(plan, key=lambda x: x.debut)[:15]) or "rien"))
        lignes.append("Absences à venir : " + ("; ".join(f"{a.type} du {a.debut} au {a.fin} ({a.statut})" for a in abs_) or "aucune"))
        c = await db.get(EntChrono, m.id)
        lignes.append(f"Chronomètre : {'en cours depuis ' + _aware(c.debut).strftime('%H:%M') + (' sur ' + c.projet if c.projet else '') if c else 'arrêté'}")
        mq = await g["_marque_entreprise"](db, m.org_id) if g.get("_marque_entreprise") else {}
        if mq.get("consignes"):
            lignes.append(f"Consignes de l'entreprise : {mq['consignes'][:1500]}")
        return "\n".join(lignes)

    @api.post("/entreprise/assistant")
    async def assistant(body: AssistantIn, db: AsyncSession = Depends(get_db)):
        m = await _membre_de(db, _uid())
        if not m:
            raise HTTPException(404, "Tu ne fais partie d'aucune équipe.")
        r = await traiter_chrono(db, m.user_id, body.message)
        if r:
            return {"reponse": r, "action": "chrono"}
        org = await db.get(g["Organisation"], m.org_id)
        dirigeant = (await db.execute(select(EntMembre).where(EntMembre.org_id == m.org_id, EntMembre.role == "proprietaire"))).scalars().first()
        AB = g.get("AgentBusiness")
        ab = None
        if AB is not None and dirigeant and dirigeant.user_id:
            ab = (await db.execute(select(AB).where(AB.user_id == dirigeant.user_id))).scalars().first()
        nom = (ab.nom_marque if ab and ab.nom_marque else None) or (org.nom if org else "l'entreprise")
        systeme = (
            f"Tu es l'assistant interne de {nom}, pour les membres de l'équipe (pas pour les clients). "
            f"Ton : {ab.ton if ab else 'chaleureux'}. Réponds en français, court et concret.\n"
            "Tu t'appuies UNIQUEMENT sur les connaissances de l'entreprise et les données de la personne ci-dessous ; "
            "si l'information n'y est pas, dis-le et oriente vers le responsable. N'invente jamais une règle, un chiffre ou une date.\n"
            "Tu sais piloter le chronomètre : la personne écrit « je commence … » ou « j'ai fini ». Rappelle-le si on te demande comment "
            "compter ses heures. Pour une absence, une pièce ou le planning, indique l'onglet de « Ton entreprise » à utiliser.\n\n"
            f"--- Connaissances de l'entreprise ---\n{(ab.connaissances if ab else '')[:12000] or '(aucune connaissance renseignée par le dirigeant)'}\n\n"
            f"--- Données de la personne ---\n{await _contexte_membre(db, m)}")
        hist = "\n".join(f"{'Membre' if h.get('role') == 'user' else 'Assistant'} : {str(h.get('texte', ''))[:600]}" for h in body.historique[-8:] if isinstance(h, dict))
        client = g["_client_llm"](f"ent-assistant-{m.id}", systeme)
        if client is None:
            raise HTTPException(503, "L'assistant n'est pas disponible pour le moment.")
        from llm_mammouth import UserMessage
        try:
            texte = await asyncio.wait_for(client.send_message(UserMessage(text=(f"Conversation :\n{hist}\n\n" if hist else "") + f"Message : {body.message}")), timeout=60)
        except Exception as e:  # noqa: BLE001
            log.warning("Assistant entreprise : %s", e)
            raise HTTPException(502, "L'assistant n'a pas répondu, réessaie dans un instant.")
        return {"reponse": (texte or "").strip(), "nom": nom, "connaissances": bool(ab and ab.connaissances)}

    # ── Reprise & cession en partenariat (dossier partagé par un conseiller Zayado avec l'entreprise cliente) ──────
    class PartageIn(BaseModel):
        email_dirigeant: str = Field(default="", max_length=255)  # vide = retirer le partage

    @api.put("/cession/dossiers/{did}/partage")
    async def partager_dossier(did: str, body: PartageIn, db: AsyncSession = Depends(get_db)):
        u = await db.get(g["User"], _uid())
        if not u or u.role not in ("admin", "vendeur"):
            raise HTTPException(403, "Réservé aux conseillers Zayado.")
        CD = g["CessionDossier"]
        d = await db.get(CD, did)
        if not d or d.user_id != _uid():
            raise HTTPException(404, "Dossier introuvable.")
        email = body.email_dirigeant.strip().lower()
        if not email:
            d.org_id = None
        else:
            prop = (await db.execute(select(EntMembre).where(EntMembre.email == email, EntMembre.role == "proprietaire", EntMembre.statut == "actif"))).scalars().first()
            if not prop:
                raise HTTPException(404, "Aucun espace « Ton entreprise » n'est ouvert à cette adresse. Le client doit d'abord activer son espace.")
            d.org_id = prop.org_id
            if g.get("notifier") and prop.user_id:
                await db.commit()
                try:
                    await g["notifier"](db, prop.user_id, "equipe", "Votre dossier de reprise est disponible",
                                        f"« {d.nom} » : suivez l'avancement dans Ton entreprise.", "/app/entreprise?vue=reprise", tag=f"cession-{d.id}")
                except Exception:  # noqa: BLE001
                    pass
        await db.commit()
        return {"ok": True, "partage": bool(d.org_id)}

    @api.get("/entreprise/reprise")
    async def reprise_partagee(db: AsyncSession = Depends(get_db)):
        """Les dossiers de reprise / cession que Zayado suit pour l'entreprise (gérants seulement)."""
        m = await _membre_de(db, _uid())
        if not m or m.role not in GERANTS:
            return {"dossiers": []}
        CD = g["CessionDossier"]
        rows = (await db.execute(select(CD).where(CD.org_id == m.org_id))).scalars().all()
        vue = g["_vue_cession"]
        return {"dossiers": [await vue(db, d) for d in rows]}
