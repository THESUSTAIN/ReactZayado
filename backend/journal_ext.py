"""Journal Zayado : articles préparés par l'IA et témoignages clients demandés automatiquement.

ARTICLES (Admin › Articles)
  1. « Proposer des sujets » : l'IA lit les newsletters reçues ces 30 derniers jours (Admin › Newsletters)
     et propose 5 sujets utiles aux clients Zayado, avec un angle, un mot-clé et la page Zayado à relier.
  2. « Rédiger » : brouillon complet (titre, titre SEO, méta-description, chapô, corps HTML avec intertitres
     et liens internes). Type « article » ou « note de la maison » (vos notes en vrac → mises en forme, à la 1re personne).
  3. Vous relisez, corrigez, puis « Créer sur Shopify » (brouillon non publié dans le blog « journal »,
     droit write_content requis) ou copiez le HTML.
  Rythme conseillé : 2 articles par mois + 1 note de la maison.

TÉMOIGNAGES (Admin › Témoignages)
  · Chaque demande a un lien personnel app.zayado.net/temoignage/<jeton> (formulaire public, consentement explicite).
  · Envoi par e-mail (Brevo) ou message WhatsApp préparé (lien wa.me, vous l'envoyez depuis votre téléphone).
  · Automatique si activé : un client abonné depuis 45 jours avec 3 victoires notées, ou un client dont un
    accompagnement payé date de 14 jours, reçoit UNE demande par e-mail (20 envois par jour au plus).
  · Rien n'est publié sans votre validation, et jamais sans l'accord écrit du client.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from html import escape
from typing import List, Optional
from urllib.parse import quote

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, DateTime, String, Text, func, select
from sqlalchemy.orm import Mapped, mapped_column

LIENS_ZAYADO = """Pages Zayado à relier (n'en invente aucune autre) :
- Diagnostic gratuit (2 min) : https://app.zayado.net/public/tunnel
- Reprendre une entreprise, même sans apport : https://app.zayado.net/public/reprise
- Le Cockpit IA (chiffres, prospects, plan, énergie) : https://zayado.net/pages/cockpit
- Accompagnement : https://zayado.net/collections/accompagnement
- Outils IA et offres : https://zayado.net/collections/outils-ia
- Produits bien-être et bureau : https://zayado.net/collections/produits"""

SYSTEME_IDEES = """Tu es la rédactrice en chef du Journal Zayado, « la maison des entrepreneurs apaisés ».
Lecteurs : indépendants, TPE et dirigeants francophones. Promesse : plus de clients, moins de charge mentale.
Thèmes Zayado : chiffres et trésorerie, prospection, plan d'action, reprise d'entreprise (même sans apport), bien-être du dirigeant.
À partir de l'actualité fournie, propose 5 sujets d'articles UTILES (un problème concret → une méthode).
Pas de sujet générique, pas de promesse chiffrée inventée. Vouvoiement.
""" + LIENS_ZAYADO + """
Réponds UNIQUEMENT en JSON : {"idees": [{"titre": "…", "angle": "… (1 phrase)", "mot_cle": "… (requête Google visée)", "lien": "une des pages ci-dessus"}]}"""

SYSTEME_ARTICLE = """Tu écris pour le Journal Zayado, « la maison des entrepreneurs apaisés ». Lecteurs : indépendants, TPE, dirigeants francophones.
Ton : clair, chaleureux, concret, vouvoiement. Phrases courtes. Aucun jargon non expliqué.
RÈGLES ABSOLUES :
- N'invente AUCUN chiffre, étude, citation, nom de client ou témoignage. Si un ordre de grandeur est utile, dis « souvent », « en général ».
- Pas de copie de la source : tout est reformulé.
- 700 à 900 mots. HTML simple uniquement : <p>, <h2>, <h3>, <ul>, <li>, <strong>, <blockquote>, <a>.
- 3 à 4 intertitres <h2>. Un encadré <blockquote> avec l'idée à retenir.
- 2 liens internes maximum, vers les pages ci-dessous, avec un texte d'ancre naturel.
- Finir par un paragraphe qui invite à une seule action.
""" + LIENS_ZAYADO + """
Réponds UNIQUEMENT en JSON :
{"titre": "…", "titre_seo": "… (60 caractères max)", "meta_description": "… (155 caractères max)", "extrait": "… (chapô, 2 phrases)", "handle": "slug-court-sans-accents", "html": "<p>…</p>"}"""

SYSTEME_NOTE = """Tu mets en forme une « note de la maison » du Journal Zayado : un texte court, personnel, à la première personne,
écrit par la fondatrice à partir de ses notes en vrac. Garde SA voix, ses idées et ses mots : tu corriges, ordonnes et resserres,
tu n'ajoutes ni idée, ni anecdote, ni chiffre. 250 à 450 mots. HTML simple (<p>, <strong>, <blockquote>). Vouvoiement du lecteur.
Réponds UNIQUEMENT en JSON : {"titre": "…", "titre_seo": "…", "meta_description": "…", "extrait": "… (1 à 2 phrases)", "handle": "slug", "html": "<p>…</p>"}"""


def _json_llm(raw: str) -> dict:
    txt = re.sub(r"^```(?:json)?|```$", "", (raw or "").strip(), flags=re.M).strip()
    debut, fin = txt.find("{"), txt.rfind("}")
    if debut < 0 or fin < 0:
        raise ValueError("Réponse IA sans JSON")
    return json.loads(txt[debut:fin + 1])


def _slug(t: str) -> str:
    import unicodedata
    t = unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:80] or "article"


BALISES_OK = re.compile(r"</?(p|h2|h3|ul|ol|li|strong|em|blockquote|a|br)(\s+href=\"https?://[^\"]+\")?\s*/?>", re.I)


def _nettoyer_html(html: str) -> str:
    """Garde seulement les balises simples prévues (et des liens http(s)) : rien d'exécutable ne part sur Shopify."""
    morceaux, pos = [], 0
    for m in re.finditer(r"<[^>]*>", html or ""):
        morceaux.append(html[pos:m.start()])
        if BALISES_OK.fullmatch(m.group(0)):
            morceaux.append(m.group(0))
        pos = m.end()
    morceaux.append((html or "")[pos:])
    return "".join(morceaux).strip()


class IdeesIn(BaseModel):
    theme: str = Field(default="", max_length=300)


class RedigerIn(BaseModel):
    type: str = Field(default="article", pattern="^(article|note)$")
    titre: str = Field(default="", max_length=200)
    angle: str = Field(default="", max_length=600)
    mot_cle: str = Field(default="", max_length=120)
    notes: str = Field(default="", max_length=6000)


class ArticleMaj(BaseModel):
    titre: Optional[str] = Field(default=None, max_length=200)
    titre_seo: Optional[str] = Field(default=None, max_length=120)
    meta_description: Optional[str] = Field(default=None, max_length=320)
    extrait: Optional[str] = Field(default=None, max_length=600)
    handle: Optional[str] = Field(default=None, max_length=100)
    html: Optional[str] = Field(default=None, max_length=60000)
    statut: Optional[str] = Field(default=None, pattern="^(brouillon|pret|publie)$")


class DemandeIn(BaseModel):
    email: str = Field(default="", max_length=255)
    prenom: str = Field(default="", max_length=80)
    telephone: str = Field(default="", max_length=40)
    contexte: str = Field(default="", max_length=300)
    canal: str = Field(default="email", pattern="^(email|whatsapp|lien)$")


class ReponseIn(BaseModel):
    texte: str = Field(min_length=30, max_length=1500)
    nom_affiche: str = Field(min_length=1, max_length=80)
    activite: str = Field(default="", max_length=120)
    accord_publication: bool
    accord_nom: bool = True


class TemoignageMaj(BaseModel):
    statut: Optional[str] = Field(default=None, pattern="^(demande|recu|valide|refuse|publie)$")
    texte: Optional[str] = Field(default=None, max_length=1500)
    nom_affiche: Optional[str] = Field(default=None, max_length=80)
    activite: Optional[str] = Field(default=None, max_length=120)


def install_journal(g: dict) -> None:
    api, app, Base, get_db = g["api"], g["app"], g["Base"], g["get_db"]
    utcnow, new_uuid, exiger_role = g["utcnow"], g["new_uuid"], g["exiger_role"]
    async_session, User = g["async_session"], g["User"]
    _client_llm, send_email, _email_wrap = g["_client_llm"], g["send_email"], g["_email_wrap"]
    log = g.get("logger")
    admin = Depends(exiger_role("admin"))

    class ArticleJournal(Base):
        """Brouillon d'article ou de note de la maison, préparé par l'IA, relu par l'admin."""
        __tablename__ = "journal_articles"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        type: Mapped[str] = mapped_column(String(20), default="article")  # article | note
        titre: Mapped[str] = mapped_column(String(200), default="")
        titre_seo: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
        meta_description: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)
        extrait: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
        handle: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
        html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
        mot_cle: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
        statut: Mapped[str] = mapped_column(String(20), default="brouillon")  # brouillon | pret | publie
        shopify_id: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
        cree_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
        maj_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    class Temoignage(Base):
        """Demande de témoignage puis réponse du client. Publication seulement avec accord explicite + validation admin."""
        __tablename__ = "temoignages"
        id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
        jeton: Mapped[str] = mapped_column(String(64), unique=True, index=True)
        user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
        email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
        prenom: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
        telephone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
        contexte: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
        canal: Mapped[str] = mapped_column(String(20), default="email")  # email | whatsapp | lien | auto
        motif: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)  # ex. auto:victoires, auto:accompagnement
        statut: Mapped[str] = mapped_column(String(20), default="demande")  # demande | recu | valide | refuse | publie
        texte: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
        nom_affiche: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
        activite: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
        accord_publication: Mapped[bool] = mapped_column(Boolean, default=False)
        accord_nom: Mapped[bool] = mapped_column(Boolean, default=False)
        demande_le: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
        recu_le: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
        shopify_id: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    class JournalReglage(Base):
        __tablename__ = "journal_reglages"
        cle: Mapped[str] = mapped_column(String(60), primary_key=True)
        valeur: Mapped[str] = mapped_column(String(255), default="")

    g["ArticleJournal"], g["Temoignage"] = ArticleJournal, Temoignage

    def _front() -> str:
        return os.environ.get("PUBLIC_FRONTEND_URL", "https://app.zayado.net").rstrip("/")

    async def _ia(session: str, systeme: str, texte: str, delai: int = 90) -> dict:
        client = _client_llm(session, systeme)
        if client is None:
            raise HTTPException(503, "IA non configurée (MAMMOTH_API_KEY absente sur Railway).")
        from llm_mammouth import UserMessage
        try:
            raw = await asyncio.wait_for(client.send_message(UserMessage(text=texte)), timeout=delai)
            return _json_llm(str(raw))
        except asyncio.TimeoutError:
            raise HTTPException(504, "L'IA a mis trop de temps à répondre. Réessayez.")
        except (ValueError, json.JSONDecodeError):
            raise HTTPException(502, "Réponse de l'IA illisible. Réessayez.")

    # ───────────────────────── Articles ─────────────────────────
    def _art(a: "ArticleJournal") -> dict:
        return {"id": a.id, "type": a.type, "titre": a.titre, "titre_seo": a.titre_seo, "meta_description": a.meta_description,
                "extrait": a.extrait, "handle": a.handle, "html": a.html, "mot_cle": a.mot_cle, "statut": a.statut,
                "shopify_id": a.shopify_id, "cree_le": a.cree_le.isoformat() if a.cree_le else None,
                "maj_le": a.maj_le.isoformat() if a.maj_le else None}

    @api.post("/admin/articles/idees")
    async def articles_idees(body: IdeesIn, db=Depends(get_db), _a=admin):
        Prep = g.get("PreparedNewsletter")
        Inc = g.get("IncomingNewsletter")
        depuis = utcnow() - timedelta(days=30)
        lignes = []
        if Inc is not None:
            rows = (await db.execute(select(Inc).where(Inc.received_at >= depuis).order_by(Inc.received_at.desc()).limit(25))).scalars().all()
            for r in rows:
                extrait = re.sub(r"\s+", " ", (r.text_body or ""))[:400]
                lignes.append(f"- {r.subject or '(sans sujet)'} : {extrait}")
        if Prep is not None and len(lignes) < 5:
            rows = (await db.execute(select(Prep).order_by(Prep.cree_le.desc()).limit(15))).scalars().all()
            lignes += [f"- {r.rewritten_subject} : {r.summary or ''}" for r in rows]
        if not lignes and not body.theme.strip():
            raise HTTPException(422, "Aucune newsletter reçue ces 30 derniers jours : indiquez un thème pour lancer les idées.")
        contexte = ("Thème demandé : " + body.theme.strip() + "\n\n") if body.theme.strip() else ""
        contexte += "Actualité reçue (newsletters des 30 derniers jours) :\n" + ("\n".join(lignes[:30]) or "(aucune)")
        data = await _ia("journal-idees", SYSTEME_IDEES, contexte[:9000], delai=60)
        idees = [i for i in (data.get("idees") or []) if isinstance(i, dict) and i.get("titre")][:6]
        return {"idees": idees, "sources": len(lignes)}

    @api.post("/admin/articles")
    async def articles_rediger(body: RedigerIn, db=Depends(get_db), _a=admin):
        if body.type == "note":
            if len(body.notes.strip()) < 40:
                raise HTTPException(422, "Écrivez vos notes (quelques lignes) : l'IA les met en forme sans rien inventer.")
            data = await _ia("journal-note", SYSTEME_NOTE, f"Titre envisagé : {body.titre or '(libre)'}\n\nNOTES :\n{body.notes}")
        else:
            if not body.titre.strip():
                raise HTTPException(422, "Donnez au moins un titre ou choisissez une idée.")
            demande = f"SUJET : {body.titre}\nANGLE : {body.angle or '(libre)'}\nMOT-CLÉ VISÉ : {body.mot_cle or '(libre)'}"
            if body.notes.strip():
                demande += f"\n\nÉLÉMENTS À INTÉGRER (de l'équipe Zayado, fiables) :\n{body.notes}"
            data = await _ia("journal-article", SYSTEME_ARTICLE, demande, delai=110)
        a = ArticleJournal(
            type=body.type, titre=(data.get("titre") or body.titre or "Sans titre")[:200],
            titre_seo=(data.get("titre_seo") or "")[:120] or None,
            meta_description=(data.get("meta_description") or "")[:320] or None,
            extrait=(data.get("extrait") or "")[:600] or None,
            handle=_slug(data.get("handle") or data.get("titre") or body.titre)[:100],
            html=_nettoyer_html(data.get("html") or ""), mot_cle=body.mot_cle[:120] or None)
        db.add(a)
        await db.commit()
        return _art(a)

    @api.get("/admin/articles")
    async def articles_liste(db=Depends(get_db), _a=admin):
        rows = (await db.execute(select(ArticleJournal).order_by(ArticleJournal.cree_le.desc()).limit(100))).scalars().all()
        return [_art(a) for a in rows]

    @api.put("/admin/articles/{aid}")
    async def articles_maj(aid: str, body: ArticleMaj, db=Depends(get_db), _a=admin):
        a = await db.get(ArticleJournal, aid)
        if not a:
            raise HTTPException(404, "Article introuvable.")
        for champ, v in body.model_dump(exclude_none=True).items():
            if champ == "html":
                v = _nettoyer_html(v)
            if champ == "handle":
                v = _slug(v)
            setattr(a, champ, v)
        await db.commit()
        return _art(a)

    @api.delete("/admin/articles/{aid}")
    async def articles_suppr(aid: str, db=Depends(get_db), _a=admin):
        a = await db.get(ArticleJournal, aid)
        if a:
            await db.delete(a)
            await db.commit()
        return {"ok": True}

    async def _blog_journal_id() -> str:
        gql = g.get("shopify_graphql")
        if not (gql and g.get("shopify_pret") and g["shopify_pret"]()):
            raise HTTPException(503, "Shopify n'est pas relié : SHOPIFY_SHOP_DOMAIN et SHOPIFY_ADMIN_TOKEN manquent sur Railway.")
        d = await gql("{blogs(first:20){nodes{id handle}}}")
        for b in (d.get("blogs") or {}).get("nodes") or []:
            if b.get("handle") == "journal":
                return b["id"]
        raise HTTPException(404, "Blog « journal » introuvable sur Shopify : créez-le (Contenu › Articles de blog › Gérer les blogs, adresse « journal »).")

    async def _creer_article_shopify(titre: str, html: str, extrait: str, handle: str, tags: list, auteur: str,
                                     metafields: Optional[list] = None, seo: Optional[tuple] = None) -> str:
        gql = g["shopify_graphql"]
        blog = await _blog_journal_id()
        art = {"blogId": blog, "title": titre, "body": html, "summary": extrait or "", "handle": handle,
               "tags": tags, "isPublished": False, "author": {"name": auteur}}
        mf = list(metafields or [])
        if seo:
            mf += [{"namespace": "global", "key": "title_tag", "type": "single_line_text_field", "value": seo[0]},
                   {"namespace": "global", "key": "description_tag", "type": "single_line_text_field", "value": seo[1]}]
        if mf:
            art["metafields"] = mf
        try:
            r = await gql("mutation($a:ArticleCreateInput!){articleCreate(article:$a){article{id} userErrors{field message}}}", {"a": art})
        except HTTPException as e:
            if "403" in str(e.detail) or "Droit manquant" in str(e.detail):
                raise HTTPException(502, "Droit write_content manquant sur l'application Shopify (Paramètres › Applications › Développer des applications).")
            raise
        res = r.get("articleCreate") or {}
        if res.get("userErrors"):
            raise HTTPException(502, "Shopify : " + "; ".join(e.get("message", "") for e in res["userErrors"])[:300])
        return (res.get("article") or {}).get("id") or ""

    @api.post("/admin/articles/{aid}/shopify")
    async def articles_shopify(aid: str, db=Depends(get_db), _a=admin):
        a = await db.get(ArticleJournal, aid)
        if not a:
            raise HTTPException(404, "Article introuvable.")
        seo = (a.titre_seo, a.meta_description) if a.titre_seo and a.meta_description else None
        a.shopify_id = await _creer_article_shopify(
            a.titre, a.html or "", a.extrait or "", a.handle or _slug(a.titre), ["article" if a.type == "article" else "note"],
            os.environ.get("JOURNAL_AUTEUR", "L'équipe Zayado"), seo=seo)
        a.statut = "pret"
        await db.commit()
        return _art(a)

    # ───────────────────────── Témoignages ─────────────────────────
    def _tem(t: "Temoignage") -> dict:
        return {"id": t.id, "email": t.email, "prenom": t.prenom, "telephone": t.telephone, "contexte": t.contexte,
                "canal": t.canal, "motif": t.motif, "statut": t.statut, "texte": t.texte, "nom_affiche": t.nom_affiche,
                "activite": t.activite, "accord_publication": t.accord_publication, "accord_nom": t.accord_nom,
                "demande_le": t.demande_le.isoformat() if t.demande_le else None,
                "recu_le": t.recu_le.isoformat() if t.recu_le else None, "shopify_id": t.shopify_id,
                "lien": f"{_front()}/temoignage/{t.jeton}"}

    def _message(prenom: str, lien: str, contexte: str = "") -> str:
        bonjour = f"Bonjour {prenom}," if prenom else "Bonjour,"
        pourquoi = f", et bravo pour {contexte} !" if contexte else "."
        return (f"{bonjour}\n\nMerci de faire un bout de chemin avec Zayado{pourquoi} Accepteriez-vous de nous dire, en deux ou trois phrases, "
                f"ce que cela a changé pour vous ? Cela aide d'autres dirigeants à se lancer.\n\n{lien}\n\n"
                "Rien n'est publié sans votre accord. Merci beaucoup,\nL'équipe Zayado")

    async def _envoyer_demande(t: "Temoignage") -> None:
        lien = f"{_front()}/temoignage/{t.jeton}"
        corps = "".join(f"<p>{escape(p)}</p>" for p in _message(t.prenom or "", "", t.contexte or "").split("\n\n") if p.strip())
        bouton = (f'<p style="margin:22px 0"><a href="{escape(lien, quote=True)}" style="background:#0B1F3A;color:#ffffff;'
                  'text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold;display:inline-block">Donner mon avis</a></p>')
        await send_email(to=t.email, subject="Deux minutes pour nous dire ce qui a changé ?", html=_email_wrap(corps + bouton))

    @api.get("/admin/temoignages")
    async def temoignages_liste(statut: Optional[str] = None, db=Depends(get_db), _a=admin):
        q = select(Temoignage).order_by(Temoignage.demande_le.desc()).limit(200)
        if statut:
            q = q.where(Temoignage.statut == statut)
        rows = (await db.execute(q)).scalars().all()
        auto = await db.get(JournalReglage, "temoignages_auto")
        return {"temoignages": [_tem(t) for t in rows], "auto": bool(auto and auto.valeur == "1"),
                "shopify_pret": bool(g.get("shopify_pret") and g["shopify_pret"]())}

    @api.put("/admin/temoignages/auto")
    async def temoignages_auto(actif: bool, db=Depends(get_db), _a=admin):
        r = await db.get(JournalReglage, "temoignages_auto")
        if r:
            r.valeur = "1" if actif else "0"
        else:
            db.add(JournalReglage(cle="temoignages_auto", valeur="1" if actif else "0"))
        await db.commit()
        return {"auto": actif}

    @api.post("/admin/temoignages")
    async def temoignages_demander(body: DemandeIn, db=Depends(get_db), _a=admin):
        email = body.email.strip().lower()
        if body.canal == "email" and "@" not in email:
            raise HTTPException(422, "Adresse e-mail invalide.")
        tel = re.sub(r"[^\d+]", "", body.telephone)
        if body.canal == "whatsapp" and len(re.sub(r"\D", "", tel)) < 9:
            raise HTTPException(422, "Numéro de téléphone requis pour WhatsApp (format international, ex. +33612345678).")
        user = (await db.execute(select(User).where(func.lower(User.email) == email))).scalar_one_or_none() if email else None
        t = Temoignage(jeton=secrets.token_urlsafe(24), user_id=user.id if user else None, email=email or None,
                       prenom=body.prenom.strip() or None, telephone=tel or None, contexte=body.contexte.strip() or None,
                       canal=body.canal)
        db.add(t)
        await db.flush()
        res = _tem(t)
        if body.canal == "email":
            await _envoyer_demande(t)
        elif body.canal == "whatsapp":
            numero = re.sub(r"\D", "", tel)
            if numero.startswith("0") and len(numero) == 10:
                numero = "33" + numero[1:]
            res["whatsapp"] = f"https://wa.me/{numero}?text={quote(_message(t.prenom or '', res['lien'], t.contexte or ''))}"
        res["message"] = _message(t.prenom or "", res["lien"], t.contexte or "")
        await db.commit()
        return res

    @api.put("/admin/temoignages/{tid}")
    async def temoignages_maj(tid: str, body: TemoignageMaj, db=Depends(get_db), _a=admin):
        t = await db.get(Temoignage, tid)
        if not t:
            raise HTTPException(404, "Témoignage introuvable.")
        if body.statut in ("valide", "publie") and not t.accord_publication:
            raise HTTPException(409, "Le client n'a pas donné son accord de publication : ce témoignage reste privé.")
        for champ, v in body.model_dump(exclude_none=True).items():
            setattr(t, champ, v)
        await db.commit()
        return _tem(t)

    @api.delete("/admin/temoignages/{tid}")
    async def temoignages_suppr(tid: str, db=Depends(get_db), _a=admin):
        t = await db.get(Temoignage, tid)
        if t:
            await db.delete(t)
            await db.commit()
        return {"ok": True}

    @api.post("/admin/temoignages/{tid}/shopify")
    async def temoignages_shopify(tid: str, db=Depends(get_db), _a=admin):
        t = await db.get(Temoignage, tid)
        if not t:
            raise HTTPException(404, "Témoignage introuvable.")
        if not t.accord_publication or t.statut not in ("valide", "publie"):
            raise HTTPException(409, "Validez d'abord ce témoignage (accord de publication requis).")
        personne = (t.nom_affiche or "Un client Zayado") + (f", {t.activite}" if t.activite and t.accord_nom else "")
        if not t.accord_nom:
            personne = "Un client Zayado" + (f", {t.activite}" if t.activite else "")
        phrase = re.split(r"(?<=[.!?])\s", (t.texte or "").strip())[0][:120]
        t.shopify_id = await _creer_article_shopify(
            phrase or "Témoignage", f"<p>{escape(t.texte or '')}</p>", t.texte or "",
            _slug(f"temoignage-{(t.nom_affiche or 'client')}-{t.id[:6]}"), ["temoignage"], "L'équipe Zayado",
            metafields=[{"namespace": "zayado", "key": "personne", "type": "single_line_text_field", "value": personne}])
        t.statut = "publie"
        await db.commit()
        return _tem(t)

    # ── Public : le formulaire du client (lien personnel) ──
    @api.get("/public/temoignage/{jeton}")
    async def temoignage_public(jeton: str, db=Depends(get_db)):
        t = (await db.execute(select(Temoignage).where(Temoignage.jeton == jeton))).scalar_one_or_none()
        if not t:
            raise HTTPException(404, "Ce lien n'est plus valable.")
        return {"prenom": t.prenom, "deja": t.statut != "demande", "texte": t.texte, "nom_affiche": t.nom_affiche, "activite": t.activite}

    @api.post("/public/temoignage/{jeton}")
    async def temoignage_repondre(jeton: str, body: ReponseIn, db=Depends(get_db)):
        t = (await db.execute(select(Temoignage).where(Temoignage.jeton == jeton))).scalar_one_or_none()
        if not t:
            raise HTTPException(404, "Ce lien n'est plus valable.")
        if t.statut in ("valide", "publie", "refuse"):
            raise HTTPException(409, "Merci, votre témoignage a déjà été pris en compte.")
        t.texte = body.texte.strip()
        t.nom_affiche = body.nom_affiche.strip()
        t.activite = body.activite.strip() or None
        t.accord_publication, t.accord_nom = body.accord_publication, body.accord_nom
        t.statut, t.recu_le = "recu", utcnow()
        await db.commit()
        return {"ok": True}

    # ── Demandes automatiques (après un succès) ──
    async def tour_temoignages() -> int:
        envoyes = 0
        async with async_session() as db:
            r = await db.get(JournalReglage, "temoignages_auto")
            if not (r and r.valeur == "1"):
                return 0
            deja = {e for (e,) in (await db.execute(select(func.lower(Temoignage.email)).where(Temoignage.email.isnot(None)))).all()}
            candidats: List[tuple] = []
            Abo, Vic = g.get("Abonnement"), g.get("VisionVictoire")
            maintenant = utcnow()
            if Abo is not None and Vic is not None:
                rows = (await db.execute(
                    select(User.email, User.id, Abo.updated_at).join(Abo, Abo.user_id == User.id)
                    .where(Abo.plan.notin_(["essentielle"]), Abo.fin > maintenant, Abo.resilie.isnot(True))
                )).all()
                for email, uid, _maj in rows:
                    if not email or email.lower() in deja:
                        continue
                    nb = (await db.execute(select(func.count()).select_from(Vic).where(Vic.user_id == uid))).scalar_one()
                    cree = (await db.execute(select(User.created_at).where(User.id == uid))).scalar_one_or_none()
                    if nb >= 3 and cree and (cree if cree.tzinfo else cree.replace(tzinfo=timezone.utc)) < maintenant - timedelta(days=45):
                        candidats.append((email.lower(), uid, "auto:victoires", "vos premières victoires notées dans le Cockpit"))
            Cmd = g.get("CommerceOrder")
            if Cmd is not None and hasattr(Cmd, "status"):
                rows = (await db.execute(select(Cmd).where(Cmd.kind == "service", Cmd.status == "paid",
                                                           Cmd.created_at < maintenant - timedelta(days=14)).limit(100))).scalars().all()
                for c in rows:
                    if c.email and c.email.lower() not in deja:
                        candidats.append((c.email.lower(), c.user_id, "auto:accompagnement",
                                          f"le chemin parcouru pendant votre accompagnement « {c.title} »" if c.title else "le chemin parcouru pendant votre accompagnement"))
            vus = set()
            for email, uid, motif, contexte in candidats:
                if email in vus or envoyes >= 20:
                    continue
                vus.add(email)
                t = Temoignage(jeton=secrets.token_urlsafe(24), user_id=uid, email=email, canal="auto", motif=motif, contexte=contexte)
                db.add(t)
                await db.flush()
                try:
                    await _envoyer_demande(t)
                    envoyes += 1
                except Exception as e:  # noqa: BLE001
                    if log:
                        log.warning("Demande de témoignage non envoyée à %s : %s", email, e)
                    await db.delete(t)
            await db.commit()
        return envoyes

    g["tour_temoignages"] = tour_temoignages

    @api.post("/admin/temoignages/tour")
    async def temoignages_tour(_a=admin):
        """Lance tout de suite la recherche des clients à solliciter (sinon : toutes les 6 h)."""
        return {"envoyes": await tour_temoignages()}

    @app.on_event("startup")
    async def _demarrer_temoignages():
        if os.environ.get("RUN_CRONS", "1").strip().lower() in ("0", "false", "non", "off"):
            return

        async def _boucle():
            await asyncio.sleep(300)
            while True:
                try:
                    await tour_temoignages()
                except Exception as e:  # noqa: BLE001
                    if log:
                        log.warning("Boucle témoignages : %s", e)
                await asyncio.sleep(6 * 3600)
        asyncio.create_task(_boucle())
