"""Tunnel Zayado — capture → merci + tripwire (Kit Diagnostic Flash) → upsell
Fast-Track en un clic → confirmation.

Paiement : Mollie (REST, comme commerce_ext).
- Kit : 1er paiement CARTE avec `sequenceType: first` → Mollie enregistre un
  mandat (consentement affiché au client avant de payer).
- Fast-Track : paiement `sequenceType: recurring` sur ce mandat → un clic, sans
  ressaisir la carte. Mandat absent ou non valide → repli sur un checkout normal.
- Statuts : le webhook existant /api/mollie/webhook met à jour CommerceOrder
  (recherche par mollie_payment_id) ; on relit aussi Mollie à la demande.

Règles produit : aucun chiffre inventé (le Kit n'affiche que ce que contient le
FEC du client, avec sa source et sa date), pas de prix barré, pas de fausse
urgence. Prix pilotés par variables d'environnement.

SIMULATION : uniquement si MOLLIE_API_KEY est absente ET ENV=local (pod de
développement). Chaque réponse porte alors `simulation: true` et l'interface
affiche un badge « Paiement simulé ». Jamais actif en production.
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import JSON, DateTime, String, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

log = logging.getLogger("zayado.tunnel")
MOLLIE = "https://api.mollie.com/v2"
STATUTS = {"paid": "paid", "authorized": "authorized", "pending": "pending", "open": "pending",
           "failed": "failed", "canceled": "canceled", "expired": "expired"}

SITUATIONS = {"independant": "Indépendant·e", "tpe": "Dirigeant·e de TPE (1 à 10 personnes)",
              "creation": "En création ou en reprise", "reprise": "Projet : créer ou reprendre une entreprise"}
PRIORITES = {"tresorerie": "Trésorerie et chiffres", "equilibre": "Temps et équilibre",
             "clients": "Trouver des clients", "organisation": "Organisation et équipe",
             # Tunnel « Créer ou reprendre ? » : résultat du test
             "reprendre": "Profil repreneur", "creer": "Profil créateur", "les_deux": "Créer ou reprendre : les deux", "cession": "Cédant : vendre son entreprise"}


# ---------- Schémas (miroir : frontend/src/pages/tunnel/types.ts) ----------
class CaptureIn(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    prenom: str = Field(default="", max_length=120)
    situation: str = ""
    priorite: str = ""
    consentement: bool
    source: str = ""          # « tunnel-reprise » pour le tunnel Créer ou reprendre
    reponses_test: dict = {}  # réponses du test (tunnel reprise), gardées pour l'accompagnement


class CaptureOut(BaseModel):
    prospect_id: str


class ProspectOut(BaseModel):
    id: str
    prenom: str
    situation: str
    priorite: str


class OffreOut(BaseModel):
    titre: str
    prix: str  # "27.00"
    description: str
    livrables: list[str]


class OffresOut(BaseModel):
    kit: OffreOut
    fast_track: OffreOut
    essai_solo_prix: str
    essai_solo_jours: int
    solo_prix_ensuite: str
    rdv_url: str
    guide_reprise_url: str = ""  # PDF « Ton parcours d'acquisition de A à Z » (REPRISE_GUIDE_URL)
    simulation: bool


class CommandeIn(BaseModel):
    prospect_id: str


class RdvRepriseIn(BaseModel):
    prospect_id: str
    telephone: str = Field(default="", max_length=30)
    creneau: str = Field(default="", max_length=60)
    projet: str = Field(default="", max_length=400)


class CheckoutOut(BaseModel):
    commande_id: str
    checkout_url: str | None
    statut: str
    simulation: bool


class FastTrackEtat(BaseModel):
    id: str
    statut: str
    montant: str


class CommandeOut(BaseModel):
    id: str
    titre: str
    montant: str
    statut: str
    email: str
    fast_track: FastTrackEtat | None
    fast_track_refuse: bool
    analyse_disponible: bool
    simulation: bool


class MoisAnalyse(BaseModel):
    mois: str
    revenus: float
    charges: float
    resultat: float


class AnalyseOut(BaseModel):
    fichier: str
    analyse_le: str  # ISO
    format: str
    lignes: int
    periode_debut: str | None
    periode_fin: str | None
    mois: list[MoisAnalyse]
    total_revenus: float
    total_charges: float
    total_resultat: float
    charges_mensuelles_moyennes: float
    tresorerie: float | None
    autonomie_mois: float | None
    mois_deficitaires: int
    part_charges_fixes: float | None
    points: list[str]


def install_tunnel_zayado(g: dict) -> None:
    api, get_db, Base = g["api"], g["get_db"], g["Base"]
    CommerceOrder, utcnow, new_uuid = g["CommerceOrder"], g["utcnow"], g["new_uuid"]

    class TunnelProspect(Base):
        __tablename__ = "tunnel_prospects"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        email: Mapped[str] = mapped_column(String(255), index=True)
        prenom: Mapped[str] = mapped_column(String(120), default="")
        reponses: Mapped[dict] = mapped_column(JSON, default=dict)
        source: Mapped[str] = mapped_column(String(60), default="tunnel-zayado")
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    g["TunnelProspect"] = TunnelProspect

    # ---------- Configuration ----------
    def _cle() -> str:
        return os.environ.get("MOLLIE_API_KEY", "").strip()

    def _simulation() -> bool:
        return not _cle() and os.environ.get("ENV", "").lower() == "local"

    def _front() -> str:
        return os.environ.get("PUBLIC_FRONTEND_URL", "https://app.zayado.net").rstrip("/")

    def _prix(nom: str, defaut: str) -> str:
        # Prix saisi dans Admin › Prix (prix_ext.py) en priorité, puis la variable Railway, puis le défaut.
        surcharge = (g.get("PRIX_TUNNEL") or {}).get(nom)
        if surcharge:
            return f"{float(surcharge):.2f}"
        try:
            return f"{float(os.environ.get(nom, defaut).replace(',', '.')):.2f}"
        except ValueError:
            return defaut

    def _offres() -> OffresOut:
        return OffresOut(
            kit=OffreOut(
                titre="Kit Diagnostic Flash",
                prix=_prix("TUNNEL_KIT_PRIX", "27.00"),
                description="L'analyse automatique de ton FEC et ton rapport PDF, livrés tout de suite après le paiement.",
                livrables=[
                    "Analyse de ton FEC : recettes, charges et résultat, mois par mois",
                    "Ton autonomie de trésorerie, en mois",
                    "Les points d'attention tirés de tes propres chiffres",
                    "Un rapport PDF à garder, avec la source et la date de chaque chiffre",
                ],
            ),
            fast_track=OffreOut(
                titre="Fast-Track — diagnostic expert en 48 h",
                prix=_prix("TUNNEL_FAST_TRACK_PRIX", "97.00"),
                description="Ton diagnostic expert sous 48 h : une visio de 60 minutes et ton plan 90 jours écrit.",
                livrables=[
                    "Une visio de 60 minutes avec un expert Zayado",
                    "Ton plan 90 jours écrit, remis après la visio",
                    "Le Kit Diagnostic Flash sert de base à l'échange",
                ],
            ),
            essai_solo_prix=_prix("ESSAI_PRIX", "1.00"),
            essai_solo_jours=int(os.environ.get("ESSAI_JOURS", "60") or 60),
            solo_prix_ensuite=_prix("TUNNEL_SOLO_PRIX", "29.00"),
            rdv_url=os.environ.get("TUNNEL_RDV_URL", "").strip(),
            guide_reprise_url=os.environ.get("REPRISE_GUIDE_URL", "").strip(),
            simulation=_simulation(),
        )

    async def _mollie(methode: str, chemin: str, corps: dict | None = None) -> dict:
        if not _cle():
            raise HTTPException(503, "Paiement indisponible : MOLLIE_API_KEY manque côté serveur.")
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.request(methode, f"{MOLLIE}/{chemin}", json=corps,
                                     headers={"Authorization": f"Bearer {_cle()}"})
        if r.status_code >= 400:
            log.warning("Mollie %s %s → %s", methode, chemin, r.status_code)
            raise HTTPException(502, f"Mollie a refusé la requête ({r.status_code}).")
        return r.json()

    async def _commande(db: AsyncSession, cid: str, kind: str) -> "CommerceOrder":
        row = await db.get(CommerceOrder, cid)
        if not row or row.kind != kind:
            raise HTTPException(404, "Commande introuvable")
        return row

    async def _rafraichir(row) -> None:
        """Relit Mollie si la commande attend encore (le webhook peut être en retard)."""
        if row.status in ("pending", "authorized") and row.mollie_payment_id and not row.mollie_payment_id.startswith("sim_") and _cle():
            try:
                p = await _mollie("GET", f"payments/{row.mollie_payment_id}")
                row.status = STATUTS.get(p.get("status", ""), row.status)
                row.updated_at = utcnow()
            except HTTPException:
                pass

    # ---------- Routes publiques (préfixe déclaré dans _ROUTES_PUBLIQUES_PREFIXES) ----------
    @api.get("/tunnel-zayado/offres", response_model=OffresOut)
    async def tunnel_offres():
        return _offres()

    @api.post("/tunnel-zayado/capture", response_model=CaptureOut)
    async def tunnel_capture(body: CaptureIn, db: AsyncSession = Depends(get_db)):
        email = body.email.strip().lower()
        if "@" not in email or "." not in email.split("@")[-1]:
            raise HTTPException(422, "Adresse e-mail invalide")
        if not body.consentement:
            raise HTTPException(422, "Le consentement est nécessaire pour recevoir ton plan")
        p = TunnelProspect(
            email=email, prenom=body.prenom.strip()[:120],
            reponses={"situation": body.situation if body.situation in SITUATIONS else "",
                      "priorite": body.priorite if body.priorite in PRIORITES else "",
                      "consentement_le": datetime.now(timezone.utc).isoformat(),
                      **({"test": {str(k)[:40]: str(v)[:80] for k, v in list(body.reponses_test.items())[:10]}} if body.reponses_test else {})},
            source="tunnel-reprise" if body.source == "tunnel-reprise" else "tunnel-zayado",
        )
        db.add(p)
        await db.commit()
        return CaptureOut(prospect_id=p.id)

    @api.get("/tunnel-zayado/prospect/{pid}", response_model=ProspectOut)
    async def tunnel_prospect(pid: str, db: AsyncSession = Depends(get_db)):
        p = await db.get(TunnelProspect, pid)
        if not p:
            raise HTTPException(404, "Inscription introuvable")
        r = p.reponses or {}
        return ProspectOut(id=p.id, prenom=p.prenom, situation=r.get("situation", ""), priorite=r.get("priorite", ""))

    @api.post("/tunnel-zayado/reprise/rdv")
    async def tunnel_reprise_rdv(body: RdvRepriseIn, db: AsyncSession = Depends(get_db)):
        """Demande d'appel stratégique (tunnel Créer ou reprendre) : enregistrée sur l'inscription,
        visible côté admin. Sans prix : le prix se discute pendant l'appel."""
        p = await db.get(TunnelProspect, body.prospect_id)
        if not p:
            raise HTTPException(404, "Inscription introuvable")
        p.reponses = {**(p.reponses or {}), "rdv": {"telephone": body.telephone.strip(), "creneau": body.creneau.strip(),
                                                   "projet": body.projet.strip(), "le": datetime.now(timezone.utc).isoformat()}}
        await db.commit()
        # Les administrateurs sont prévenus tout de suite : un appel stratégique demandé se rappelle vite.
        if g.get("notifier") and g.get("User"):
            User = g["User"]
            cible = "cédant" if (p.reponses or {}).get("priorite") == "cession" else "repreneur / créateur"
            try:
                admins = (await db.execute(select(User.id).where(User.role == "admin"))).scalars().all()
                for aid in admins:
                    await g["notifier"](db, aid, "admin", f"Appel à rappeler : {p.prenom or p.email} ☎",
                                        f"{cible} · {body.telephone.strip() or 'pas de téléphone'} · {body.creneau.strip() or 'créneau libre'}"
                                        + (f" — « {body.projet.strip()[:90]} »" if body.projet.strip() else ""),
                                        "/admin", tag="tunnel-rdv", cle=f"rdv:{p.id}")
            except Exception as e:  # noqa: BLE001
                log.warning("Notification admin (rdv reprise) non envoyée : %s", e)
        return {"ok": True}

    @api.get("/admin/tunnel-zayado/inscrits")
    async def tunnel_inscrits(source: str = "", limite: int = 200, db: AsyncSession = Depends(get_db),
                              _role=Depends(g["exiger_role"]("admin"))):
        """Inscrits des tunnels Zayado (diagnostic, reprise, cession) et demandes d'appel, plus récents d'abord."""
        q = select(TunnelProspect).order_by(TunnelProspect.created_at.desc()).limit(max(1, min(limite, 1000)))
        if source:
            q = q.where(TunnelProspect.source == source)
        lignes = (await db.execute(q)).scalars().all()
        return [{"id": p.id, "email": p.email, "prenom": p.prenom, "source": p.source,
                 "situation": (p.reponses or {}).get("situation", ""), "priorite": (p.reponses or {}).get("priorite", ""),
                 "rdv": (p.reponses or {}).get("rdv"), "test": (p.reponses or {}).get("test"),
                 "le": p.created_at.isoformat() if p.created_at else None} for p in lignes]

    @api.post("/tunnel-zayado/kit/commande", response_model=CheckoutOut)
    async def tunnel_kit_commande(body: CommandeIn, db: AsyncSession = Depends(get_db)):
        p = await db.get(TunnelProspect, body.prospect_id)
        if not p:
            raise HTTPException(404, "Inscription introuvable — refais le diagnostic")
        offre = _offres().kit
        row = CommerceOrder(id=str(uuid.uuid4()), email=p.email, kind="tunnel_kit", title=offre.titre,
                            amount=offre.prix, status="pending",
                            metadata_json={"tunnel": "zayado", "prospect_id": p.id})
        db.add(row)
        # Tunnel reprise : le rendez-vous est déjà pris, on va droit à la confirmation (pas de Fast-Track).
        retour = (f"/public/tunnel/confirmation?commande={row.id}" if p.source == "tunnel-reprise"
                  else f"/public/tunnel/fast-track?commande={row.id}")
        if _simulation():
            row.status, row.mollie_payment_id = "paid", f"sim_{row.id}"
            row.metadata_json = {**row.metadata_json, "simulation": True}
            await db.commit()
            return CheckoutOut(commande_id=row.id, checkout_url=retour, statut="paid", simulation=True)
        client = await _mollie("POST", "customers", {"name": (p.prenom or p.email)[:100], "email": p.email})
        paiement = await _mollie("POST", "payments", {
            "amount": {"currency": "EUR", "value": offre.prix},
            "customerId": client["id"],
            "sequenceType": "first",  # crée le mandat carte → upsell en un clic
            "method": "creditcard",
            "description": f"Zayado · {offre.titre}",
            "redirectUrl": f"{_front()}{retour}",
            "webhookUrl": f"{_front()}/api/mollie/webhook",
            "metadata": {"order_id": row.id, "kind": "tunnel_kit", "email": p.email},
        })
        row.mollie_payment_id = paiement["id"]
        row.metadata_json = {**row.metadata_json, "mollie_customer_id": client["id"]}
        await db.commit()
        return CheckoutOut(commande_id=row.id, statut="pending", simulation=False,
                           checkout_url=paiement.get("_links", {}).get("checkout", {}).get("href"))

    @api.get("/tunnel-zayado/commande/{cid}", response_model=CommandeOut)
    async def tunnel_commande(cid: str, db: AsyncSession = Depends(get_db)):
        kit = await _commande(db, cid, "tunnel_kit")
        await _rafraichir(kit)
        meta = kit.metadata_json or {}
        ft = None
        if meta.get("fast_track_id"):
            fto = await db.get(CommerceOrder, meta["fast_track_id"])
            if fto:
                await _rafraichir(fto)
                ft = FastTrackEtat(id=fto.id, statut=fto.status, montant=fto.amount)
        await db.commit()
        return CommandeOut(id=kit.id, titre=kit.title, montant=kit.amount, statut=kit.status,
                           email=kit.email, fast_track=ft, fast_track_refuse=bool(meta.get("fast_track_refuse")),
                           analyse_disponible=bool(meta.get("analyse")), simulation=bool(meta.get("simulation")))

    @api.post("/tunnel-zayado/fast-track/{cid}/accepter", response_model=CheckoutOut)
    async def tunnel_fast_track(cid: str, db: AsyncSession = Depends(get_db)):
        kit = await _commande(db, cid, "tunnel_kit")
        await _rafraichir(kit)
        if kit.status != "paid":
            raise HTTPException(409, "Le Kit doit être payé avant d'ajouter le Fast-Track")
        meta = dict(kit.metadata_json or {})
        if meta.get("fast_track_id"):  # double clic / retour arrière : jamais deux débits
            fto = await db.get(CommerceOrder, meta["fast_track_id"])
            if fto and fto.status not in ("failed", "canceled", "expired"):
                return CheckoutOut(commande_id=kit.id, checkout_url=None, statut=fto.status, simulation=bool(meta.get("simulation")))
        offre = _offres().fast_track
        fto = CommerceOrder(id=str(uuid.uuid4()), email=kit.email, kind="tunnel_fasttrack", title=offre.titre,
                            amount=offre.prix, status="pending",
                            metadata_json={"tunnel": "zayado", "kit_id": kit.id})
        db.add(fto)
        meta["fast_track_id"], meta["fast_track_refuse"] = fto.id, False
        kit.metadata_json = meta
        if meta.get("simulation"):
            fto.status, fto.mollie_payment_id = "paid", f"sim_{fto.id}"
            await db.commit()
            return CheckoutOut(commande_id=kit.id, checkout_url=None, statut="paid", simulation=True)
        client_id = meta.get("mollie_customer_id")
        if not client_id:
            raise HTTPException(409, "Moyen de paiement introuvable pour ce Kit")
        mandats = (await _mollie("GET", f"customers/{client_id}/mandates")).get("_embedded", {}).get("mandates", [])
        mandat = next((m for m in mandats if m.get("status") == "valid"), None)
        corps = {
            "amount": {"currency": "EUR", "value": offre.prix},
            "customerId": client_id,
            "description": f"Zayado · {offre.titre}",
            "webhookUrl": f"{_front()}/api/mollie/webhook",
            "metadata": {"order_id": fto.id, "kind": "tunnel_fasttrack", "kit_id": kit.id},
        }
        checkout = None
        if mandat:
            corps.update({"sequenceType": "recurring", "mandateId": mandat["id"]})
        else:  # mandat absent ou en attente : checkout classique, rien n'est débité sans le client
            corps.update({"redirectUrl": f"{_front()}/public/tunnel/confirmation?commande={kit.id}"})
        paiement = await _mollie("POST", "payments", corps)
        fto.mollie_payment_id = paiement["id"]
        fto.status = STATUTS.get(paiement.get("status", ""), "pending")
        if not mandat:
            checkout = paiement.get("_links", {}).get("checkout", {}).get("href")
        await db.commit()
        return CheckoutOut(commande_id=kit.id, checkout_url=checkout, statut=fto.status, simulation=False)

    @api.post("/tunnel-zayado/fast-track/{cid}/refuser")
    async def tunnel_fast_track_refuser(cid: str, db: AsyncSession = Depends(get_db)):
        kit = await _commande(db, cid, "tunnel_kit")
        meta = dict(kit.metadata_json or {})
        if not meta.get("fast_track_id"):
            meta["fast_track_refuse"] = True
            kit.metadata_json = meta
            await db.commit()
        return {"ok": True}

    # ---------- Livraison du Kit : analyse FEC + rapport PDF ----------
    def _analyser(nom: str, donnees: bytes) -> AnalyseOut:
        from lib.fec import FichierIllisible, lire_fichier
        try:
            brut = lire_fichier(nom, donnees)
        except FichierIllisible as e:
            raise HTTPException(422, f"Fichier illisible : {e}")
        except Exception:
            raise HTTPException(422, "Fichier illisible : exporte le FEC depuis ton logiciel comptable")
        mois = []
        fixes = charges_tot = 0.0
        for cle in sorted(brut.get("mois", {})):
            m = brut["mois"][cle]
            charges = float(m.get("charges_fixes", 0)) + float(m.get("charges_variables", 0))
            fixes += float(m.get("charges_fixes", 0))
            charges_tot += charges
            rev = float(m.get("revenus", 0))
            mois.append(MoisAnalyse(mois=cle, revenus=round(rev, 2), charges=round(charges, 2), resultat=round(rev - charges, 2)))
        if not mois:
            raise HTTPException(422, "Aucune écriture exploitable dans ce fichier")
        tot_rev = round(sum(m.revenus for m in mois), 2)
        moyenne = round(charges_tot / len(mois), 2)
        treso = brut.get("tresorerie")
        autonomie = round(treso / moyenne, 1) if treso is not None and moyenne > 0 else None
        deficit = sum(1 for m in mois if m.resultat < 0)
        part_fixes = round(fixes / charges_tot * 100, 1) if charges_tot > 0 else None
        points: list[str] = []
        if autonomie is not None:
            points.append(f"Ta trésorerie couvre {autonomie:.1f} mois de charges moyennes"
                          + (" : c'est sous le seuil de 3 mois, la priorité est de la reconstituer." if autonomie < 3 else "."))
        if deficit:
            points.append(f"{deficit} mois sur {len(mois)} finissent en négatif sur la période du fichier.")
        if part_fixes is not None:
            points.append(f"Les charges fixes représentent {part_fixes:.1f} % de tes charges.")
        if len(mois) >= 6:
            avant = sum(m.revenus for m in mois[-6:-3]) / 3
            apres = sum(m.revenus for m in mois[-3:]) / 3
            if avant > 0:
                ecart = (apres - avant) / avant * 100
                points.append(f"Tes recettes des 3 derniers mois sont {'en hausse' if ecart >= 0 else 'en baisse'} de {abs(ecart):.1f} % par rapport aux 3 mois précédents.")
        return AnalyseOut(
            fichier=nom[:200], analyse_le=datetime.now(timezone.utc).isoformat(), format=str(brut.get("format", "")),
            lignes=int(brut.get("lignes", 0)), periode_debut=brut.get("periode_debut"), periode_fin=brut.get("periode_fin"),
            mois=mois, total_revenus=tot_rev, total_charges=round(charges_tot, 2), total_resultat=round(tot_rev - charges_tot, 2),
            charges_mensuelles_moyennes=moyenne, tresorerie=round(treso, 2) if treso is not None else None,
            autonomie_mois=autonomie, mois_deficitaires=deficit, part_charges_fixes=part_fixes, points=points,
        )

    @api.post("/tunnel-zayado/kit/{cid}/analyse", response_model=AnalyseOut)
    async def tunnel_kit_analyse(cid: str, fichier: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
        kit = await _commande(db, cid, "tunnel_kit")
        await _rafraichir(kit)
        if kit.status != "paid":
            raise HTTPException(402, "Le Kit n'est pas encore payé")
        donnees = await fichier.read()
        if len(donnees) > 15 * 1024 * 1024:
            raise HTTPException(413, "Fichier trop lourd (15 Mo maximum)")
        analyse = _analyser(fichier.filename or "fec.txt", donnees)
        kit.metadata_json = {**(kit.metadata_json or {}), "analyse": analyse.model_dump()}
        await db.commit()
        return analyse

    @api.get("/tunnel-zayado/kit/{cid}/analyse", response_model=AnalyseOut)
    async def tunnel_kit_analyse_lire(cid: str, db: AsyncSession = Depends(get_db)):
        kit = await _commande(db, cid, "tunnel_kit")
        a = (kit.metadata_json or {}).get("analyse")
        if not a:
            raise HTTPException(404, "Aucune analyse : importe ton FEC")
        return AnalyseOut(**a)

    @api.get("/tunnel-zayado/kit/{cid}/rapport.pdf")
    async def tunnel_kit_pdf(cid: str, db: AsyncSession = Depends(get_db)):
        kit = await _commande(db, cid, "tunnel_kit")
        a = (kit.metadata_json or {}).get("analyse")
        if kit.status != "paid" or not a:
            raise HTTPException(404, "Rapport indisponible : importe d'abord ton FEC")
        return Response(content=_pdf(AnalyseOut(**a), kit.email), media_type="application/pdf",
                        headers={"Content-Disposition": 'attachment; filename="zayado-kit-diagnostic-flash.pdf"'})

    def _pdf(a: AnalyseOut, email: str) -> bytes:
        from fpdf import FPDF

        def t(s: str) -> str:  # polices standard PDF = latin-1 ; « € » écrit « EUR »
            return s.replace("€", "EUR").replace("’", "'").replace("·", "-").encode("latin-1", "replace").decode("latin-1")

        def e(n: float | None) -> str:
            return "-" if n is None else f"{n:,.0f} EUR".replace(",", " ")

        def d(iso: str | None) -> str:
            return "-" if not iso else f"{iso[8:10]}/{iso[5:7]}/{iso[0:4]}"

        pdf = FPDF()
        pdf.set_auto_page_break(True, 15)
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 18)
        pdf.set_text_color(13, 31, 56)
        pdf.cell(0, 10, t("Kit Diagnostic Flash - Zayado"), new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(90, 90, 90)
        pdf.multi_cell(0, 5, t(f"Source : ton fichier « {a.fichier} » ({a.format}, {a.lignes} lignes), analysé le {d(a.analyse_le)}. "
                                f"Période couverte : {d(a.periode_debut)} au {d(a.periode_fin)}. Préparé pour {email}. "
                                "Aucun chiffre n'est estimé : tout provient de ce fichier."))
        pdf.ln(3)
        pdf.set_text_color(13, 31, 56)
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, t("Indicateurs clés"), new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 10)
        for lib, val in [("Recettes sur la période", e(a.total_revenus)), ("Charges sur la période", e(a.total_charges)),
                         ("Résultat sur la période", e(a.total_resultat)), ("Charges mensuelles moyennes", e(a.charges_mensuelles_moyennes)),
                         ("Trésorerie (comptes 5xx)", e(a.tresorerie)),
                         ("Autonomie de trésorerie", "-" if a.autonomie_mois is None else f"{a.autonomie_mois:.1f} mois")]:
            pdf.cell(95, 7, t(lib))
            pdf.cell(0, 7, t(val), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, t("Mois par mois"), new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "B", 9)
        for h, w in (("Mois", 40), ("Recettes", 50), ("Charges", 50), ("Résultat", 50)):
            pdf.cell(w, 7, t(h), border="B")
        pdf.ln()
        pdf.set_font("Helvetica", "", 9)
        for m in a.mois:
            pdf.cell(40, 6, t(f"{m.mois[5:7]}/{m.mois[0:4]}"))
            pdf.cell(50, 6, t(e(m.revenus)))
            pdf.cell(50, 6, t(e(m.charges)))
            pdf.cell(50, 6, t(e(m.resultat)), new_x="LMARGIN", new_y="NEXT")
        if a.points:
            pdf.ln(3)
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 8, t("Points d'attention"), new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "", 10)
            for p in a.points:
                pdf.multi_cell(0, 6, t(f"- {p}"), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(120, 120, 120)
        pdf.multi_cell(0, 4, t("Ce rapport est une lecture automatique de tes écritures comptables. Il ne remplace pas l'avis de ton expert-comptable."))
        return bytes(pdf.output())
