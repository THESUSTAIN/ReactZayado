"""Espace vendeur façon Dokan : tableau de bord, commission, suivi de commande,
actions produit (dupliquer, pause, stock bas), IBAN chiffré, reversements validés
par l'admin (pas de virement automatique : l'admin vire puis marque « payé »).

Chiffres : uniquement les commandes Shopify réellement payées du vendeur
(ShopifyOrder.financial_status). Rien n'est estimé.
Limite connue : la commission appliquée est le taux EN VIGUEUR (pas figé par vente).
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import JSON, DateTime, String, Text, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

PAYEES = ("paid", "partially_refunded")
ETAPES = ("preparee", "expediee", "livree")
STATUTS_REV = ("demande", "valide", "paye", "refuse")
TAUX_DEFAUT = 15.0
SEUIL_DEFAUT = 3


# ---------- Schémas ----------
class SuiviIn(BaseModel):
    etape: str
    transporteur: str = Field(default="", max_length=80)
    numero: str = Field(default="", max_length=120)


class IbanIn(BaseModel):
    titulaire: str = Field(min_length=2, max_length=120)
    iban: str = Field(min_length=15, max_length=40)


class ReversementIn(BaseModel):
    montant: float = Field(gt=0)


class TauxIn(BaseModel):
    taux: Optional[float] = Field(default=None, ge=0, le=100)


class SeuilIn(BaseModel):
    seuil: int = Field(ge=0, le=1000)


class ActionReversementIn(BaseModel):
    note: str = Field(default="", max_length=500)


def iban_valide(iban: str) -> str:
    s = re.sub(r"\s+", "", iban).upper()
    if not re.fullmatch(r"[A-Z]{2}\d{2}[A-Z0-9]{11,30}", s):
        raise HTTPException(422, "IBAN invalide")
    n = "".join(str(int(c, 36)) for c in s[4:] + s[:4])
    if int(n) % 97 != 1:
        raise HTTPException(422, "IBAN invalide (clé de contrôle)")
    return s


def masquer(iban: str) -> str:
    return f"{iban[:4]} •••• •••• {iban[-4:]}" if iban else ""


def install_vendeur_dokan(g: dict) -> None:
    api, get_db, Base, utcnow = g["api"], g["get_db"], g["Base"], g["utcnow"]
    User, ShopifyOrder, VendorProduct = g["User"], g["ShopifyOrder"], g["VendorProduct"]
    _uid, exiger_role, chiffrer, dechiffrer = g["_uid"], g["exiger_role"], g["_chiffrer"], g["_dechiffrer"]

    class VendeurParametre(Base):
        """Clé/valeur : commission_defaut, commission:{uid}, seuil_stock:{uid}, iban:{uid} (chiffré)."""
        __tablename__ = "vendeur_parametres"
        cle: Mapped[str] = mapped_column(String(120), primary_key=True)
        valeur: Mapped[dict] = mapped_column(JSON, default=dict)

    class VendeurSuivi(Base):
        __tablename__ = "vendeur_suivis"
        order_id: Mapped[str] = mapped_column(String(36), primary_key=True)  # ShopifyOrder.id
        vendor_user_id: Mapped[str] = mapped_column(String(36), index=True)
        etape: Mapped[str] = mapped_column(String(20), default="preparee")
        transporteur: Mapped[str] = mapped_column(String(80), default="")
        numero: Mapped[str] = mapped_column(String(120), default="")
        maj_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    class VendeurReversement(Base):
        __tablename__ = "vendeur_reversements"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
        user_id: Mapped[str] = mapped_column(String(36), index=True)
        montant: Mapped[str] = mapped_column(String(20), default="0.00")
        iban_masque: Mapped[str] = mapped_column(String(40), default="")
        statut: Mapped[str] = mapped_column(String(20), default="demande", index=True)
        note: Mapped[str] = mapped_column(Text, default="")
        demande_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
        traite_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    class VendeurCommissionVente(Base):
        """Taux de commission FIGÉ au moment où la vente devient payée."""
        __tablename__ = "vendeur_commissions_ventes"
        order_id: Mapped[str] = mapped_column(String(36), primary_key=True)  # ShopifyOrder.id
        taux: Mapped[str] = mapped_column(String(10), default="15")
        fige_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    async def _notifier(db, uid: str, titre: str, corps: str, cle: str) -> None:
        n = g.get("notifier")
        if n and uid:
            await n(db, uid, "vendeur", titre, corps, "/espace-vendeur", tag=cle, cle=cle)

    async def _taux_vente(db, o) -> float:
        row = await db.get(VendeurCommissionVente, o.id)
        if row is None:  # vente payée jamais figée (antérieure) : on fige au taux en vigueur aujourd'hui
            taux, _ = await _taux(db, o.vendor_user_id)
            row = VendeurCommissionVente(order_id=o.id, taux=f"{taux:g}")
            db.add(row)
        return float(row.taux)

    async def _alerte_stock(db, uid: str) -> None:
        seuil = await _param(db, f"seuil_stock:{uid}")
        seuil = int(seuil) if seuil is not None else SEUIL_DEFAUT
        for p in (await db.execute(select(VendorProduct).where(VendorProduct.user_id == uid))).scalars():
            if p.stock is not None and p.stock <= seuil and p.statut == "publie":
                await _notifier(db, uid, f"Stock bas : {p.titre}", f"Il reste {p.stock} exemplaire(s).", f"stock-bas-{p.id}-{p.stock}")

    async def on_vente_vendeur(db, o, ancien: str) -> None:
        if not o.vendor_user_id or (o.financial_status or "") not in PAYEES or ancien in PAYEES:
            return
        await _taux_vente(db, o)
        await _notifier(db, o.vendor_user_id, f"Nouvelle vente {o.name}", f"{float(o.montant or 0):.2f} € · {o.client or 'client'}", f"vente-{o.id}")
        await _alerte_stock(db, o.vendor_user_id)
        await db.commit()

    g["on_vente_vendeur"] = on_vente_vendeur

    async def _param(db, cle: str):
        row = await db.get(VendeurParametre, cle)
        return (row.valeur or {}).get("v") if row else None

    async def _set_param(db, cle: str, valeur) -> None:
        row = await db.get(VendeurParametre, cle)
        if valeur is None:
            if row:
                await db.delete(row)
            return
        if row:
            row.valeur = {"v": valeur}
        else:
            db.add(VendeurParametre(cle=cle, valeur={"v": valeur}))

    async def _vendeur(db) -> "User":
        u = await db.get(User, _uid())
        if not u or u.role not in ("vendeur", "admin"):
            raise HTTPException(403, "Réservé aux comptes vendeur.")
        return u

    async def _taux(db, uid: str) -> tuple[float, bool]:
        perso = await _param(db, f"commission:{uid}")
        if perso is not None:
            return float(perso), True
        defaut = await _param(db, "commission_defaut")
        return (float(defaut) if defaut is not None else TAUX_DEFAUT), False

    async def _bilan(db, uid: str) -> dict:
        ventes = (await db.execute(select(ShopifyOrder).where(ShopifyOrder.vendor_user_id == uid))).scalars().all()
        payees = [o for o in ventes if (o.financial_status or "") in PAYEES]
        brut = round(sum(float(o.montant or 0) for o in payees), 2)
        taux, perso = await _taux(db, uid)
        commission = 0.0
        for o in payees:  # chaque vente garde le taux en vigueur le jour où elle a été payée
            commission += float(o.montant or 0) * await _taux_vente(db, o) / 100
        commission = round(commission, 2)
        await db.commit()
        net = round(brut - commission, 2)
        revs = (await db.execute(select(VendeurReversement).where(VendeurReversement.user_id == uid))).scalars().all()
        paye = round(sum(float(r.montant) for r in revs if r.statut == "paye"), 2)
        en_cours = round(sum(float(r.montant) for r in revs if r.statut in ("demande", "valide")), 2)
        par_mois: dict[str, float] = {}
        for o in payees:
            if o.passee_le:
                k = o.passee_le.strftime("%Y-%m")
                par_mois[k] = round(par_mois.get(k, 0) + float(o.montant or 0), 2)
        return {"ventes_nb": len(payees), "commandes_nb": len(ventes), "ca_brut": brut, "commission_taux": taux,
                "commission_perso": perso, "commission_montant": commission, "net": net, "reverse": paye,
                "en_cours": en_cours, "solde_disponible": round(max(0.0, net - paye - en_cours), 2),
                "par_mois": [{"mois": k, "ca": v} for k, v in sorted(par_mois.items())[-12:]]}

    def _rev(r) -> dict:
        return {"id": r.id, "user_id": r.user_id, "montant": r.montant, "iban_masque": r.iban_masque, "statut": r.statut,
                "note": r.note, "demande_le": r.demande_le.isoformat() if r.demande_le else None,
                "traite_le": r.traite_le.isoformat() if r.traite_le else None}

    # ══════════ Vendeur ══════════
    @api.get("/vendeur/tableau-de-bord")
    async def vendeur_tableau(db: AsyncSession = Depends(get_db)):
        u = await _vendeur(db)
        bilan = await _bilan(db, u.id)
        seuil = await _param(db, f"seuil_stock:{u.id}")
        seuil = int(seuil) if seuil is not None else SEUIL_DEFAUT
        produits = (await db.execute(select(VendorProduct).where(VendorProduct.user_id == u.id))).scalars().all()
        bas = [{"id": p.id, "titre": p.titre, "stock": p.stock} for p in produits if p.stock is not None and p.stock <= seuil and p.statut != "pause"]
        if bas:
            await _alerte_stock(db, u.id)  # dédoublonné par (produit, stock) : une seule cloche par niveau
            await db.commit()
        iban = await _param(db, f"iban:{u.id}")
        return {**bilan, "seuil_stock": seuil, "stock_bas": bas,
                "iban_renseigne": bool(iban), "iban_masque": (iban or {}).get("masque", ""),
                "titulaire": (iban or {}).get("titulaire", "")}

    @api.put("/vendeur/seuil-stock")
    async def vendeur_seuil(body: SeuilIn, db: AsyncSession = Depends(get_db)):
        u = await _vendeur(db)
        await _set_param(db, f"seuil_stock:{u.id}", body.seuil)
        await db.commit()
        return {"ok": True}

    @api.put("/vendeur/iban")
    async def vendeur_iban(body: IbanIn, db: AsyncSession = Depends(get_db)):
        u = await _vendeur(db)
        iban = iban_valide(body.iban)
        await _set_param(db, f"iban:{u.id}", {"titulaire": body.titulaire.strip(), "chiffre": chiffrer(iban), "masque": masquer(iban)})
        await db.commit()
        return {"ok": True, "iban_masque": masquer(iban)}

    @api.get("/vendeur/reversements")
    async def vendeur_reversements(db: AsyncSession = Depends(get_db)):
        u = await _vendeur(db)
        rows = (await db.execute(select(VendeurReversement).where(VendeurReversement.user_id == u.id)
                                 .order_by(VendeurReversement.demande_le.desc()))).scalars().all()
        return {"items": [_rev(r) for r in rows]}

    @api.post("/vendeur/reversements")
    async def vendeur_demander(body: ReversementIn, db: AsyncSession = Depends(get_db)):
        u = await _vendeur(db)
        iban = await _param(db, f"iban:{u.id}")
        if not iban:
            raise HTTPException(409, "Renseignez votre IBAN avant de demander un reversement")
        bilan = await _bilan(db, u.id)
        montant = round(body.montant, 2)
        if montant > bilan["solde_disponible"]:
            raise HTTPException(409, f"Montant supérieur au solde disponible ({bilan['solde_disponible']:.2f} €)")
        r = VendeurReversement(user_id=u.id, montant=f"{montant:.2f}", iban_masque=iban.get("masque", ""))
        db.add(r)
        await db.commit()
        return _rev(r)

    @api.get("/vendeur/suivis")
    async def vendeur_suivis(db: AsyncSession = Depends(get_db)):
        u = await _vendeur(db)
        rows = (await db.execute(select(VendeurSuivi).where(VendeurSuivi.vendor_user_id == u.id))).scalars().all()
        return {"items": {r.order_id: {"etape": r.etape, "transporteur": r.transporteur, "numero": r.numero,
                                       "maj_le": r.maj_le.isoformat() if r.maj_le else None} for r in rows}}

    @api.put("/vendeur/commandes/{order_id}/suivi")
    async def vendeur_suivi(order_id: str, body: SuiviIn, db: AsyncSession = Depends(get_db)):
        u = await _vendeur(db)
        if body.etape not in ETAPES:
            raise HTTPException(422, "Étape inconnue")
        o = await db.get(ShopifyOrder, order_id)
        if not o or (o.vendor_user_id != u.id and u.role != "admin"):
            raise HTTPException(404, "Commande introuvable")
        if body.etape == "expediee" and not body.numero.strip():
            raise HTTPException(422, "Le numéro de suivi est obligatoire pour une commande expédiée")
        row = await db.get(VendeurSuivi, order_id) or VendeurSuivi(order_id=order_id, vendor_user_id=o.vendor_user_id)
        row.etape, row.transporteur, row.numero, row.maj_le = body.etape, body.transporteur.strip(), body.numero.strip(), utcnow()
        db.add(row)
        await db.commit()
        return {"ok": True}

    async def _mon_produit(db, pid: str):
        u = await _vendeur(db)
        p = await db.get(VendorProduct, pid)
        if not p or (p.user_id != u.id and u.role != "admin"):
            raise HTTPException(404, "Produit introuvable")
        return p

    @api.post("/vendeur/produits/{pid}/dupliquer")
    async def vendeur_dupliquer(pid: str, db: AsyncSession = Depends(get_db)):
        p = await _mon_produit(db, pid)
        copie = VendorProduct(user_id=p.user_id, titre=f"{p.titre} (copie)"[:255], description=p.description, prix=p.prix,
                              stock=p.stock, sku=None, categorie=p.categorie, images=list(p.images or []),
                              statut="brouillon", vendeur=p.vendeur)
        db.add(copie)
        await db.commit()
        return {"ok": True, "id": copie.id}

    async def _shopify_statut(p, statut: str) -> str:
        """Bascule le produit Shopify en DRAFT (masqué) ou ACTIVE. Renvoie 'ok' ou 'non_configure'."""
        gql = g.get("_shopify_graphql")
        if not p.shopify_id or not gql:
            return "non_publie"
        try:
            rep = await gql("mutation($input: ProductInput!) { productUpdate(input: $input) { product { id status } userErrors { message } } }",
                            {"input": {"id": p.shopify_id, "status": statut}})
        except HTTPException as e:
            if e.status_code == 503:
                return "non_configure"
            raise
        errs = (((rep.get("data") or {}).get("productUpdate") or {}).get("userErrors")) or []
        if errs:
            raise HTTPException(502, f"Shopify a refusé : {errs[0].get('message')}")
        return "ok"

    MSG_SHOPIFY = {"ok": "", "non_publie": "Ce produit n'est pas encore sur Shopify.",
                   "non_configure": "Shopify n'est pas configuré ici : seule la vitrine Zayado est concernée."}

    @api.post("/vendeur/produits/{pid}/pause")
    async def vendeur_pause(pid: str, db: AsyncSession = Depends(get_db)):
        p = await _mon_produit(db, pid)
        if p.statut != "publie":
            raise HTTPException(409, "Seul un produit publié peut être mis en pause")
        etat = await _shopify_statut(p, "DRAFT")  # masqué sur Shopify AVANT de changer l'état local
        p.statut = "pause"
        await db.commit()
        return {"ok": True, "shopify": etat, "message": MSG_SHOPIFY[etat]}

    @api.post("/vendeur/produits/{pid}/reprendre")
    async def vendeur_reprendre(pid: str, db: AsyncSession = Depends(get_db)):
        p = await _mon_produit(db, pid)
        if p.statut != "pause":
            raise HTTPException(409, "Ce produit n'est pas en pause")
        etat = await _shopify_statut(p, "ACTIVE")
        p.statut = "publie"
        await db.commit()
        return {"ok": True, "shopify": etat, "message": MSG_SHOPIFY[etat]}

    @api.get("/vendeur/releve.pdf")
    async def vendeur_releve(mois: str, db: AsyncSession = Depends(get_db)):
        if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", mois or ""):
            raise HTTPException(422, "Mois attendu au format AAAA-MM")
        u = await _vendeur(db)
        ventes = [o for o in (await db.execute(select(ShopifyOrder).where(ShopifyOrder.vendor_user_id == u.id))).scalars()
                  if (o.financial_status or "") in PAYEES and o.passee_le and o.passee_le.strftime("%Y-%m") == mois]
        lignes = []
        for o in sorted(ventes, key=lambda x: x.passee_le):
            t = await _taux_vente(db, o)
            m = float(o.montant or 0)
            lignes.append((o.passee_le.strftime("%d/%m/%Y"), o.name or "", m, t, round(m * t / 100, 2)))
        revs = [r for r in (await db.execute(select(VendeurReversement).where(VendeurReversement.user_id == u.id))).scalars()
                if r.statut == "paye" and r.traite_le and r.traite_le.strftime("%Y-%m") == mois]
        await db.commit()
        return Response(content=_releve_pdf(u.email, mois, lignes, revs), media_type="application/pdf",
                        headers={"Content-Disposition": f'attachment; filename="releve-zayado-{mois}.pdf"'})

    def _releve_pdf(email: str, mois: str, lignes: list, revs: list) -> bytes:
        from fpdf import FPDF

        def t(s: str) -> str:
            return s.replace("€", "EUR").replace("’", "'").encode("latin-1", "replace").decode("latin-1")

        def e(n: float) -> str:
            return f"{n:,.2f} EUR".replace(",", " ").replace(".", ",")

        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 16)
        pdf.cell(0, 10, t(f"Relevé vendeur Zayado - {mois[5:7]}/{mois[:4]}"), new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(0, 6, t(f"Vendeur : {email} · Source : commandes Shopify payées et reversements marqués payés"), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)
        pdf.set_font("Helvetica", "B", 9)
        for h, w in (("Date", 25), ("Commande", 35), ("Montant", 35), ("Taux", 20), ("Commission", 35), ("Net", 35)):
            pdf.cell(w, 7, t(h), border="B")
        pdf.ln()
        pdf.set_font("Helvetica", "", 9)
        tb = tc = 0.0
        for d, nom, m, tx, c in lignes:
            tb, tc = tb + m, tc + c
            for v, w in ((d, 25), (nom, 35), (e(m), 35), (f"{tx:g} %", 20), (e(c), 35), (e(m - c), 35)):
                pdf.cell(w, 6, t(str(v)))
            pdf.ln()
        if not lignes:
            pdf.cell(0, 6, t("Aucune vente payée ce mois-ci."), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)
        pdf.set_font("Helvetica", "B", 10)
        for lib, v in (("Ventes", tb), ("Commission Zayado", tc), ("Net vendeur", tb - tc)):
            pdf.cell(80, 7, t(lib))
            pdf.cell(0, 7, t(e(v)), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)
        pdf.cell(0, 7, t("Reversements payés ce mois-ci"), new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)
        for r in revs:
            pdf.cell(0, 6, t(f"{r.traite_le.strftime('%d/%m/%Y')} · {e(float(r.montant))} · {r.iban_masque}"), new_x="LMARGIN", new_y="NEXT")
        if not revs:
            pdf.cell(0, 6, t("Aucun reversement payé ce mois-ci."), new_x="LMARGIN", new_y="NEXT")
        return bytes(pdf.output())

    # ══════════ Admin ══════════
    @api.get("/admin/vendeurs/finances")
    async def admin_finances(db: AsyncSession = Depends(get_db), _r=Depends(exiger_role("admin"))):
        defaut = await _param(db, "commission_defaut")
        vendeurs = (await db.execute(select(User).where(User.role == "vendeur"))).scalars().all()
        lignes = []
        for v in vendeurs:
            b = await _bilan(db, v.id)
            lignes.append({"user_id": v.id, "email": v.email, **{k: b[k] for k in
                          ("ventes_nb", "ca_brut", "commission_taux", "commission_perso", "commission_montant", "net", "reverse", "en_cours", "solde_disponible")}})
        return {"taux_defaut": float(defaut) if defaut is not None else TAUX_DEFAUT, "vendeurs": lignes}

    @api.put("/admin/vendeurs/commission")
    async def admin_taux_defaut(body: TauxIn, db: AsyncSession = Depends(get_db), _r=Depends(exiger_role("admin"))):
        await _set_param(db, "commission_defaut", body.taux if body.taux is not None else TAUX_DEFAUT)
        await db.commit()
        return {"ok": True}

    @api.put("/admin/vendeurs/{uid}/commission")
    async def admin_taux_vendeur(uid: str, body: TauxIn, db: AsyncSession = Depends(get_db), _r=Depends(exiger_role("admin"))):
        await _set_param(db, f"commission:{uid}", body.taux)  # null = revenir au taux global
        await db.commit()
        return {"ok": True}

    @api.get("/admin/vendeurs/reversements")
    async def admin_reversements(statut: str = "", db: AsyncSession = Depends(get_db), _r=Depends(exiger_role("admin"))):
        q = select(VendeurReversement).order_by(VendeurReversement.demande_le.desc())
        if statut in STATUTS_REV:
            q = q.where(VendeurReversement.statut == statut)
        rows = (await db.execute(q.limit(200))).scalars().all()
        out = []
        for r in rows:
            u = await db.get(User, r.user_id)
            iban = await _param(db, f"iban:{r.user_id}") or {}
            clair = ""
            if r.statut in ("demande", "valide") and iban.get("chiffre"):
                try:
                    clair = dechiffrer(iban["chiffre"])  # visible par l'admin uniquement, pour faire le virement
                except Exception:
                    clair = ""
            out.append({**_rev(r), "email": u.email if u else "", "titulaire": iban.get("titulaire", ""), "iban": clair})
        return {"items": out}

    @api.post("/admin/vendeurs/reversements/{rid}/{action}")
    async def admin_reversement_action(rid: str, action: str, body: ActionReversementIn,
                                       db: AsyncSession = Depends(get_db), _r=Depends(exiger_role("admin"))):
        r = await db.get(VendeurReversement, rid)
        if not r:
            raise HTTPException(404, "Reversement introuvable")
        transitions = {"valider": ("demande", "valide"), "payer": ("valide", "paye"), "refuser": (None, "refuse")}
        if action not in transitions:
            raise HTTPException(422, "Action inconnue")
        depuis, vers = transitions[action]
        if (depuis and r.statut != depuis) or (action == "refuser" and r.statut not in ("demande", "valide")):
            raise HTTPException(409, f"Action impossible depuis le statut « {r.statut} »")
        if action == "refuser" and not body.note.strip():
            raise HTTPException(422, "Motif obligatoire pour refuser")
        r.statut, r.traite_le = vers, utcnow()
        if body.note.strip():
            r.note = body.note.strip()
        if vers == "paye":
            await _notifier(db, r.user_id, "Reversement payé", f"{float(r.montant):.2f} € viré sur {r.iban_masque}.", f"reversement-paye-{r.id}")
        elif vers == "refuse":
            await _notifier(db, r.user_id, "Reversement refusé", r.note or "", f"reversement-refuse-{r.id}")
        await db.commit()
        return _rev(r)
