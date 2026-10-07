from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

U = "https://images.unsplash.com"
IMG = {
    "desk_main": "https://images.pexels.com/photos/7057/desk-office-computer-imac.jpg?auto=compress&cs=tinysrgb&w=1200",
    "desk_monitor": f"{U}/photo-1570993492881-25240ce854f4?q=85&w=1200&auto=format&fit=crop",
    "wood_table": f"{U}/photo-1611269154421-4e27233ac5c7?q=85&w=1200&auto=format&fit=crop",
    "forest_calm": f"{U}/photo-1763713383838-5cd702c13160?q=85&w=1200&auto=format&fit=crop",
    "arch_light": f"{U}/photo-1567016376408-0226e4d0c1ea?q=85&w=1200&auto=format&fit=crop",
    "arch_beige": f"{U}/photo-1524228461686-3de5d5289d09?q=85&w=1200&auto=format&fit=crop",
}

SERVICES_SEED = [
    {
        "slug": "cockpit-ia",
        "kind": "cockpit",
        "title": "Cockpit IA Zayado",
        "tagline": "Piloter et développer son activité, dans un seul espace.",
        "intro": "Zayado à vos côtés chaque jour pour rassembler votre vision, vos priorités, vos prospects et votre énergie dans un seul espace. L'IA prépare, l'entrepreneur décide.",
        "price_summary": "dès 15 € / mois — 1 mois d'essai offert",
        "cta_label": "S'abonner ou essayer",
        "image": IMG["arch_light"],
        "sort": 1,
        "features": [
            {"name": "Clarté", "desc": "Vision Board, plan d'action, priorité du jour."},
            {"name": "Clients", "desc": "Le Radar trouve des prospects et prescripteurs, avec des messages prêts."},
            {"name": "Sérénité", "desc": "Suivi de l'énergie et de la charge mentale, exercices de mindset."},
            {"name": "Rentabilité", "desc": "Pouls business (trésorerie, chiffre d'affaires), revue hebdomadaire."},
            {"name": "Disponibilité", "desc": "Agent Business (assistant à votre marque) pour répondre aux clients."},
        ],
        "plans": [
            {"name": "Essai", "target": "Poser sa vision, nourrir ses idées", "price": "15 € / mois", "special": "1 mois offert, sans carte"},
            {"name": "Solo", "target": "Le solopreneur qui pilote seul", "price": "29 € / mois", "special": "2 mois pour 1 € — tarif fondateur 24 € / mois"},
            {"name": "Pro", "target": "L'indépendant qui a des clients", "price": "69 € / mois", "special": "Tarif fondateur 49 € / mois"},
            {"name": "Équipe", "target": "Petite équipe, jusqu'à 5 personnes", "price": "99 € / mois", "special": ""},
            {"name": "Entreprise", "target": "Plus de 5 personnes, installation Microsoft 365 complète", "price": "Sur devis, dès 299 € / mois", "special": ""},
        ],
        "rows": [],
        "steps": [],
        "notes": [
            "Facturation annuelle : environ 2 mois offerts.",
            "Membres TheSustain : -30 % (non cumulable avec le tarif fondateur).",
            "La grille tarifaire est affichée directement depuis l'application pour garantir l'uniformité des prix.",
        ],
    },
    {
        "slug": "optimisation-entreprise",
        "kind": "optimisation",
        "title": "Optimisation d'entreprise",
        "tagline": "Rendre l'activité plus rentable et plus légère.",
        "intro": "Analyse, propositions et aide à la mise en place pour améliorer la rentabilité et réduire la consommation d'énergie de l'entreprise. Chaque service commence par un diagnostic.",
        "price_summary": "sur devis, après diagnostic",
        "cta_label": "Demander un diagnostic",
        "image": IMG["desk_main"],
        "sort": 2,
        "features": [],
        "plans": [],
        "rows": [
            {"name": "Finance et pilotage", "target": "Dirigeant qui veut comprendre et maîtriser ses chiffres", "what": "Diagnostic de trésorerie et de rentabilité, tableau de bord simple, plan d'action chiffré, structuration de l'activité ou du patrimoine."},
            {"name": "Création et opérationnel", "target": "Créateur ou entreprise qui se structure", "what": "Lancement de l'activité, organisation, processus, choix des outils, priorités des 90 premiers jours."},
            {"name": "Organisation et outils numériques", "target": "TPE qui travaille encore avec des fichiers éparpillés", "what": "Installation et organisation de l'espace de travail (Google Drive, OneDrive, SharePoint, Teams), droits d'accès, automatisations utiles."},
            {"name": "Aménagement et travaux", "target": "Entreprise qui veut un espace de travail plus sain et plus efficace", "what": "Analyse des besoins (bureau, lumière, acoustique, ergonomie), puis mise en relation avec un partenaire sélectionné pour les travaux."},
            {"name": "TheSustain × Zayado", "target": "Entrepreneur qui veut décider en cohérence avec sa foi", "what": "Accompagnement entrepreneurial structuré, ancré dans des valeurs chrétiennes."},
        ],
        "steps": [],
        "notes": [
            "Le service d'optimisation pose le diagnostic et le plan ; le Cockpit IA aide à le tenir au quotidien.",
            "Pour les actes réglementés (comptabilité certifiée, juridique, fiscal), Zayado travaille avec des partenaires réglementés — expert-comptable, avocat, notaire, conseiller fiscal — et ne se substitue pas à eux.",
        ],
    },
    {
        "slug": "acquisition-transmission",
        "kind": "acquisition",
        "title": "Acquisition et transmission d'entreprise",
        "tagline": "Acheter au juste prix, vendre en toute lucidité.",
        "intro": "Accompagnement pour l'achat d'une entreprise, afin de ne pas la payer trop cher ni l'acquérir seul. Zayado défend les intérêts du repreneur, du premier rendez-vous à la promesse de vente.",
        "price_summary": "forfaits dès 1 990 € HT",
        "cta_label": "Demander un diagnostic",
        "image": IMG["wood_table"],
        "sort": 3,
        "features": [],
        "plans": [
            {"name": "1 · Évaluation seule", "target": "Analyse économique et financière, valorisation indicative de l'entreprise visée.", "price": "1 990 € HT", "special": ""},
            {"name": "2 · Évaluation et stratégie de reprise", "target": "Forfait 1, plus la stratégie d'offre et de négociation.", "price": "2 850 € HT", "special": ""},
            {"name": "3 · Accompagnement complet", "target": "Forfait 2, plus l'accompagnement jusqu'à la promesse.", "price": "2 850 € HT + 20 % de l'économie négociée", "special": "ou 3 300 € HT s'il n'y a pas de négociation"},
        ],
        "rows": [],
        "steps": [
            {"n": "1", "label": "Guide complet", "desc": "« Votre parcours d'acquisition de A à Z », en 14 étapes."},
            {"n": "2", "label": "Mandat", "desc": "Mandat de recherche et d'accompagnement."},
            {"n": "3", "label": "Fiche de proposition", "desc": "Fiche de proposition de vente signée par le cédant."},
            {"n": "4", "label": "Constat du prix", "desc": "Constat du prix final."},
        ],
        "notes": [
            "L'économie négociée = prix de la fiche de proposition de vente − prix final de la promesse. Zayado est rémunéré sur la baisse de prix obtenue.",
            "Côté cédant : la transmission prépare la vente de votre entreprise pour la rendre lisible et attractive — sur devis.",
            "Les honoraires des avocats, notaires et experts-comptables sont facturés à part et payés directement par le client.",
            "La valorisation Zayado est une analyse de conseil, sans certification des comptes.",
        ],
    },
]

PRODUCTS_SEED = [
    {"family": "pour_moi", "name": "Énergie et récupération", "description": "Ce qui aide à recharger les batteries entre deux journées chargées.", "price_status": "En cours", "proposed": False, "sort": 1},
    {"family": "pour_moi", "name": "Focus et clarté mentale", "description": "Outils pour se concentrer et sortir de la dispersion.", "price_status": "En cours", "proposed": False, "sort": 2},
    {"family": "pour_moi", "name": "Ancrage et recentrage", "description": "Carnets, journal, objets pour revenir à l'essentiel (mindset).", "price_status": "En cours", "proposed": False, "sort": 3},
    {"family": "pour_moi", "name": "Corps et posture", "description": "Ergonomie, soutien du dos, confort assis ou debout.", "price_status": "En cours", "proposed": False, "sort": 4},
    {"family": "pour_moi", "name": "Calme et rythme", "description": "Routines du matin et du soir, pauses, apaisement.", "price_status": "En cours", "proposed": False, "sort": 5},
    {"family": "pour_moi", "name": "Santé visuelle et concentration", "description": "Lunettes et lampes anti-lumière bleue.", "price_status": "En cours", "proposed": False, "sort": 6},
    {"family": "pour_moi", "name": "Liberté et mobilité", "description": "Équipement pour travailler bien, où que l'on soit.", "price_status": "En cours", "proposed": False, "sort": 7},
    {"family": "pour_moi", "name": "Sommeil et récupération", "description": "Mieux dormir pour mieux décider.", "price_status": "En cours", "proposed": True, "sort": 8},
    {"family": "pour_moi", "name": "Alimentation et hydratation", "description": "Bien manger et bien boire pendant les journées de travail.", "price_status": "En cours", "proposed": True, "sort": 9},
    {"family": "pour_moi", "name": "Micro-pauses et sport au bureau", "description": "Bouger un peu, souvent, sans quitter son poste.", "price_status": "En cours", "proposed": True, "sort": 10},
    {"family": "pour_entreprise", "name": "Espace et environnement", "description": "Décoration utile, plantes, lumière, mobilier de bureau.", "price_status": "En cours", "proposed": False, "sort": 1},
    {"family": "pour_entreprise", "name": "Organisation et efficacité", "description": "Planners, rangement, outils pour clarifier le travail.", "price_status": "En cours", "proposed": False, "sort": 2},
    {"family": "pour_entreprise", "name": "Clarté financière", "description": "Supports pour suivre ses chiffres et sa trésorerie.", "price_status": "En cours", "proposed": False, "sort": 3},
    {"family": "pour_entreprise", "name": "Optimisation opérationnelle", "description": "Équipements qui fluidifient le travail quotidien.", "price_status": "En cours", "proposed": False, "sort": 4},
    {"family": "pour_entreprise", "name": "Équipement du quotidien", "description": "Le matériel de base, bien choisi.", "price_status": "En cours", "proposed": False, "sort": 5},
    {"family": "pour_entreprise", "name": "Outils finance et tableaux de bord papier", "description": "Tableaux de bord et carnets de gestion à remplir.", "price_status": "En cours", "proposed": True, "sort": 6},
    {"family": "pour_entreprise", "name": "Automatisation et outils numériques", "description": "Logiciels partenaires sélectionnés, en complément du Cockpit IA.", "price_status": "En cours", "proposed": True, "sort": 7},
    {"family": "pour_entreprise", "name": "Aménagement et travaux", "description": "Réaménagement du bureau, lumière, acoustique, ergonomie — réalisés par des partenaires sélectionnés (par exemple Trouveton).", "price_status": "Sur devis", "proposed": False, "sort": 8},
    {"family": "pour_entreprise", "name": "Équipements spécialisés", "description": "Matériel propre à un métier, via des partenaires.", "price_status": "Sur devis", "proposed": False, "sort": 9},
    {"family": "transverse", "name": "Thés et infusions", "description": "Pour les pauses qui reposent vraiment.", "price_status": "En cours", "proposed": False, "sort": 1},
    {"family": "transverse", "name": "Idées cadeaux", "description": "Pour offrir à un entrepreneur, un associé, une équipe.", "price_status": "En cours", "proposed": False, "sort": 2},
    {"family": "transverse", "name": "Parcours complets (Packs)", "description": "Pack Repreneur, Pack Rentrée, Programme 90 jours : produits et accompagnement réunis.", "price_status": "En cours", "proposed": False, "sort": 3},
    {"family": "transverse", "name": "Cartes cadeaux", "description": "Offrir Zayado, à utiliser dans toute la marketplace.", "price_status": "En cours", "proposed": True, "sort": 4},
]


class AppointmentCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(min_length=2)
    email: EmailStr
    phone: Optional[str] = None
    request_type: str = "diagnostic"
    subject: Optional[str] = None
    preferred_date: Optional[str] = None
    message: Optional[str] = None


class Appointment(AppointmentCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "À confirmer"


@app.on_event("startup")
async def startup_seed():
    if await db.services.count_documents({}) == 0:
        await db.services.insert_many(SERVICES_SEED)
        logging.info("Seed: %d services insérés", len(SERVICES_SEED))
    if await db.products.count_documents({}) == 0:
        await db.products.insert_many(PRODUCTS_SEED)
        logging.info("Seed: %d rayons insérés", len(PRODUCTS_SEED))


@api_router.get("/")
async def root():
    return {"message": "Zayado — Maison des entrepreneurs apaisés. API en ligne."}


@api_router.get("/services")
async def list_services():
    docs = await db.services.find({}, {"_id": 0}).sort("sort", 1).to_list(20)
    return docs


@api_router.get("/services/{slug}")
async def get_service(slug: str):
    doc = await db.services.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Service introuvable")
    return doc


@api_router.get("/products")
async def list_products():
    docs = await db.products.find({}, {"_id": 0}).sort("sort", 1).to_list(100)
    return docs


@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(input: AppointmentCreate):
    appointment = Appointment(**input.model_dump())
    doc = appointment.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.appointments.insert_one(doc)
    return appointment


@api_router.get("/appointments", response_model=List[Appointment])
async def list_appointments():
    docs = await db.appointments.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [Appointment(**d) for d in docs]


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
