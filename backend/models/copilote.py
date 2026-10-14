"""Contrat du Copilote (Aujourd'hui, Plan d'action, Radar, Tunnels) — miroir exact de
frontend/src/zayado/types.ts. Toute modification se fait des deux côtés dans le même lot."""

from typing import Literal, Optional

from pydantic import BaseModel, Field

Offre = Literal["Rêveur", "Solo", "Pro"]
Clientele = Literal["entreprises", "particuliers", "les_deux"]
ModeRadar = Literal["entreprises", "particuliers"]
EtapePipeline = Literal["nouveau", "contacte", "en_discussion", "signe", "ecarte"]
EtatTunnel = Literal["brouillon", "en_ligne", "en_veille"]
CleEtape = Literal["capture", "remerciement", "vente", "upsell"]
Parcours = Literal["produit", "rendez_vous"]
TypeUpsell = Literal["acceleration", "complementarite", "delegation"]
PlacementUpsell = Literal["post_reservation", "pendant_appel"]


class ProfilIn(BaseModel):
    prenom: str = Field(min_length=1, max_length=60)
    offre: Offre = "Rêveur"
    metier: str = Field(min_length=1, max_length=120)
    clientele: Clientele = "les_deux"
    zone: str = Field(default="", max_length=80)
    mots_cles: list[str] = []


class OffreIn(BaseModel):
    offre: Offre


class NiveauIn(BaseModel):
    niveau: int = Field(ge=1, le=5)


class TexteIn(BaseModel):
    texte: str = ""


class TitreIn(BaseModel):
    titre: str = ""


class ObjectifIn(BaseModel):
    titre: str
    cible: float
    unite: str


class AtteintIn(BaseModel):
    atteint: float


class ProcessusIn(BaseModel):
    titre: str
    rythme: str = "quotidien"


class ValeurIn(BaseModel):
    valeur: str


class EtapeIn(BaseModel):
    etape: EtapePipeline


class ReglagesIn(BaseModel):
    clientele: Optional[Clientele] = None
    zone: Optional[str] = None
    mots_cles: Optional[list[str]] = None


class ObjectifRadarIn(BaseModel):
    clients_vises: float


class SignalManuelIn(BaseModel):
    mode: ModeRadar
    categorie: str
    cible: str
    fait: str
    pourquoi: str = ""
    lien: Optional[str] = None


# ─────────── Tunnels ───────────
class EtapeTunnel(BaseModel):
    cle: CleEtape
    titre: str = ""
    accroche: str = ""
    contenu: str = ""
    bouton: str = ""
    offre_nom: str = ""
    prix: Optional[float] = None


class ContactTunnel(BaseModel):
    id: str
    nom: str
    email: str
    date: str


class OffreValeur(BaseModel):
    """Équation de valeur ($100M Offers, Hormozi) : ↑ résultat × probabilité, ↓ délai × effort."""
    resultat_reve: str = ""
    preuve: str = ""
    delai: str = ""
    effort: str = ""
    bonus: list[str] = []
    garantie: str = ""
    rarete: str = ""


class Upsell(BaseModel):
    type: TypeUpsell = "complementarite"
    placement: PlacementUpsell = "post_reservation"
    nom: str = ""
    prix: Optional[float] = None
    prix_barre: Optional[float] = None
    contenu: list[str] = []
    oui: str = ""
    non: str = ""
    script_appel: str = ""


class Downsell(BaseModel):
    nom: str = ""
    prix: Optional[float] = None
    mensualites: int = 0


class ContenuLancement(BaseModel):
    cle: str
    titre: str
    decalage: int
    date: Optional[str] = None
    texte: str = ""


class Lancement(BaseModel):
    """Séquence de lancement (Launch, Jeff Walker) : anticipation → valeur → éducation → portes."""
    ouverture: Optional[str] = None
    fermeture: Optional[str] = None
    contenus: list[ContenuLancement] = []
    programme: bool = False


class Tunnel(BaseModel):
    id: str
    nom: str
    sujet: str
    etat: EtatTunnel
    parcours: Parcours = "produit"
    etapes: list[EtapeTunnel]
    contacts: list[ContactTunnel] = []
    offre: OffreValeur = OffreValeur()
    upsell: Upsell = Upsell()
    downsell: Downsell = Downsell()
    lancement: Lancement = Lancement()
    cree_le: str
    origine: str
    # Publication : adresse publique /t/{slug} et référencement (titre, description, image de partage).
    slug: Optional[str] = None
    seo: dict = {}
    # Code personnalisé par l'admin (head, css, html_haut, html_bas, js) — injecté sur /t/{slug}.
    code: dict = {}


class TunnelIn(BaseModel):
    nom: str
    sujet: str = ""
    origine: Optional[str] = None
    parcours: Parcours = "produit"
    type_upsell: TypeUpsell = "complementarite"
    # Modèle « par douleur client » (routers/tunnels_douleurs.py) : impose parcours, option et textes.
    douleur: Optional[str] = None


class TunnelPatch(BaseModel):
    nom: Optional[str] = None
    etat: Optional[EtatTunnel] = None
    etapes: Optional[list[EtapeTunnel]] = None
    offre: Optional[OffreValeur] = None
    upsell: Optional[Upsell] = None
    downsell: Optional[Downsell] = None


class ModeleUpsellIn(BaseModel):
    type: TypeUpsell
    placement: PlacementUpsell


class ContactIn(BaseModel):
    nom: str
    email: str


class LancementIn(BaseModel):
    ouverture: str


class ModeleUpsell(BaseModel):
    type: TypeUpsell
    nom: str
    concept: str
    exemple: str


class SupprimeOut(BaseModel):
    id: str
    supprime: bool


# ---------- Vérification d'entreprise (Recherche d'entreprises + BODACC + INPI RNE) ----------
class FicheEntreprise(BaseModel):
    siren: str
    nom: str
    activite: str = ""
    date_creation: Optional[str] = None
    effectif: Optional[str] = None
    commune: str = ""
    dirigeants: list[str] = []
    lien: str
    etat: Literal["actif", "cesse"] = "actif"
    date_fermeture: Optional[str] = None


class AnnonceBodacc(BaseModel):
    id: str
    date: str
    famille: str
    nature: str = ""
    tribunal: str = ""
    lien: str
    alerte: bool = False


class FinanceAnnee(BaseModel):
    annee: str
    ca: Optional[float] = None
    resultat_net: Optional[float] = None


class SourceInpi(BaseModel):
    connecte: bool
    lien: str
    actes: Optional[int] = None
    bilans: Optional[int] = None


class FicheDetail(FicheEntreprise):
    adresse: str = ""
    categorie: str = ""
    etablissements_ouverts: Optional[int] = None
    finances: list[FinanceAnnee] = []
    annonces: list[AnnonceBodacc] = []
    procedure_collective: Optional[str] = None
    radiee: bool = False
    inpi: SourceInpi


# ---------- Tunnels : proposition IA (jamais enregistrée sans validation) ----------
class PropositionTunnel(BaseModel):
    etapes: list[EtapeTunnel]
    source: Literal["ia", "modele"]
    note: str
    # Rédigés par l'IA en même temps que les pages (None si gabarit) : l'utilisateur n'a plus qu'à relire.
    offre: Optional[OffreValeur] = None
    upsell: Optional[Upsell] = None
    downsell: Optional[Downsell] = None
