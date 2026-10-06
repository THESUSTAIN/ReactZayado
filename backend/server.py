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

CATEGORIES = ["Juridique", "Comptabilité", "Bien-être", "Croissance"]

U = "https://images.unsplash.com"
IMG = {
    "desk_main": "https://images.pexels.com/photos/7057/desk-office-computer-imac.jpg?auto=compress&cs=tinysrgb&w=1200",
    "desk_monitor": f"{U}/photo-1570993492881-25240ce854f4?q=85&w=1200&auto=format&fit=crop",
    "wood_table": f"{U}/photo-1611269154421-4e27233ac5c7?q=85&w=1200&auto=format&fit=crop",
    "white_desk": f"{U}/photo-1449247709967-d4461a6a6103?q=85&w=1200&auto=format&fit=crop",
    "forest_calm": f"{U}/photo-1763713383838-5cd702c13160?q=85&w=1200&auto=format&fit=crop",
    "portrait_calm": f"{U}/photo-1438761681033-6461ffad8d80?q=85&w=1200&auto=format&fit=crop",
    "portrait_soft": f"{U}/photo-1674932668403-33398b81c92f?q=85&w=1200&auto=format&fit=crop",
    "arch_light": f"{U}/photo-1567016376408-0226e4d0c1ea?q=85&w=1200&auto=format&fit=crop",
    "arch_royal": f"{U}/photo-1597787427778-5bcd7be5bd37?q=85&w=1200&auto=format&fit=crop",
    "arch_beige": f"{U}/photo-1524228461686-3de5d5289d09?q=85&w=1200&auto=format&fit=crop",
    "door_pink": f"{U}/photo-1656383908989-bb1c4e9db214?q=85&w=1200&auto=format&fit=crop",
}


class Offer(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    category: str
    tagline: str
    description: str
    price: str
    duration: str
    format: str
    image: str
    featured: bool = False
    sort: int = 0


class AppointmentCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(min_length=2)
    email: EmailStr
    phone: Optional[str] = None
    offer_id: Optional[str] = None
    offer_title: Optional[str] = None
    preferred_date: Optional[str] = None
    message: Optional[str] = None


class Appointment(AppointmentCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "À confirmer"


OFFERS_SEED = [
    Offer(title="Création d'entreprise clé en main", category="Juridique",
          tagline="De la rédaction des statuts à l'immatriculation, vous n'avez rien à faire — sauf rêver.",
          description="Nous rédigeons vos statuts, déposons votre capital, publions votre annonce légale et complétons votre immatriculation. Vous repartez avec un Kbis, un compte bancaire pro ouvert et l'esprit léger.",
          price="dès 349 €", duration="2 semaines", format="En ligne & visio",
          image=IMG["desk_main"], featured=True, sort=1),
    Offer(title="Contrats sur mesure & avenants", category="Juridique",
          tagline="Contrats commerciaux, CGV, pactes d'associés : chaque engagement écrit avec vous, pas pour vous.",
          description="Un juriste dédié relit votre activité, identifie vos angles morts et rédige les documents qui vous protègent vraiment. Relecture illimitée pendant 30 jours.",
          price="dès 190 €", duration="5 jours", format="En ligne",
          image=IMG["white_desk"], sort=2),
    Offer(title="Transmission & cession d'entreprise", category="Juridique",
          tagline="Préparez votre sortie en douceur : audit, valorisation, négociation et formalités.",
          description="Un parcours complet pour céder votre entreprise sans brusquer ni vous-même ni vos équipes : audit de transmission, valorisation, accompagnement à la négociation et formalités de cession.",
          price="dès 890 €", duration="1 à 3 mois", format="Cabinet & visio",
          image=IMG["wood_table"], sort=3),
    Offer(title="Comptabilité sereine — abonnement", category="Comptabilité",
          tagline="Votre comptabilité tenue au fil de l'eau, un tableau de bord calmant chaque mois.",
          description="Un expert-comptable attitré tient votre comptabilité au fil de l'eau. Chaque mois, un tableau de bord simple : trésorerie, charges, points d'attention. Zéro surprise au moment du bilan.",
          price="89 € / mois", duration="En continu", format="En ligne",
          image=IMG["desk_monitor"], featured=True, sort=4),
    Offer(title="Bilan annuel & liasse fiscale", category="Comptabilité",
          tagline="Vos obligations annuelles bouclées sans jargon, avec une lecture humaine de vos chiffres.",
          description="Nous produisons votre bilan, votre liasse fiscale et vos déclarations sociales — puis nous les traduisons en une page de ce qui compte vraiment pour l'année suivante.",
          price="dès 540 €", duration="3 semaines", format="En ligne",
          image=IMG["white_desk"], sort=5),
    Offer(title="Mise en conformité express", category="Comptabilité",
          tagline="Redressements, retards, oublis : on remet vos comptes d'aplomb sans moralité.",
          description="Un chantier de remise en ordre : régularisation des déclarations en retard, dialogue avec l'administration et plan de rattrapage. Vous respirez, vos comptes aussi.",
          price="dès 320 €", duration="10 jours", format="En ligne",
          image=IMG["desk_monitor"], sort=6),
    Offer(title="Prévention du burn-out — 6 séances", category="Bien-être",
          tagline="Un programme progressif pour réapprendre la vitesse qui vous ressemble.",
          description="Six séances individuelles avec un coach certifié pour désamorcer la surcharge, réapprendre à couper et repartir avec un rythme tenable. Un programme confidentiel, facturé à l'entreprise jamais raconté.",
          price="480 € / programme", duration="6 semaines", format="Visio",
          image=IMG["forest_calm"], featured=True, sort=7),
    Offer(title="Sophrologie du dirigeant", category="Bien-être",
          tagline="Séances individuelles pour apaiser la charge mentale — avant les conseils d'administration.",
          description="Des outils concrets de respiration et de visualisation pour tenir les décisions lourdes, les pitchs stressants et les semaines à trois Conseil d'Administration.",
          price="75 € / séance", duration="45 minutes", format="Cabinet & visio",
          image=IMG["portrait_soft"], sort=8),
    Offer(title="Week-end déconnexion fondateurs", category="Bien-être",
          tagline="Deux jours hors ligne entre pairs, encadrés par un coach et un psychologue du travail.",
          description="Un rituel trimestriel : douze fondateurs, un lieu sans réseau, deux jours pour décharger, partager et repartir. Encadrement bienveillant, agenda volontairement vide.",
          price="690 € / personne", duration="2 jours", format="Résidentiel",
          image=IMG["portrait_calm"], sort=9),
    Offer(title="Plan de croissance 90 jours", category="Croissance",
          tagline="Un cap clair, trois priorités, des rituels simples : la stratégie qui tient au mur.",
          description="Trois mois pour transformer l'intuition en trajectoire : atelier de cadrage, priorisation sans complaisance, rituels d'équipe. Vous repartez avec un plan d'une page et des jalons mesurables.",
          price="1 200 €", duration="3 mois", format="Visio & cabinet",
          image=IMG["arch_light"], featured=True, sort=10),
    Offer(title="Préparation à la levée de pré-amorçage", category="Croissance",
          tagline="Pitch, modèle économique, chiffres : arrivez en salle avec la nuque droite.",
          description="Un parcours intensif avec un ex-investisseur : narrative, proforma, data room et répétitions. Pour pitcher sans improviser et négocier sans redouter.",
          price="dès 950 €", duration="4 semaines", format="Visio",
          image=IMG["arch_royal"], sort=11),
    Offer(title="Marque & storytelling de fondateur", category="Croissance",
          tagline="Une voix, un récit, une image : ce qui vous rendra cher et reconnaissable.",
          description="Nous écrivons votre histoire de fondateur, posons votre plateforme de marque et déclinons le tout en éléments concrets : page À propos, pitch deck, prise de parole.",
          price="dès 640 €", duration="3 semaines", format="En ligne",
          image=IMG["arch_beige"], sort=12),
]


@app.on_event("startup")
async def startup_seed():
    if await db.offers.count_documents({}) == 0:
        await db.offers.insert_many([o.model_dump() for o in OFFERS_SEED])
        logging.info("Seed: %d offres insérées", len(OFFERS_SEED))


@api_router.get("/")
async def root():
    return {"message": "Yori — Maison des entrepreneurs apaisés. API en ligne."}


@api_router.get("/offers", response_model=List[Offer])
async def list_offers(category: Optional[str] = None):
    query = {"category": category} if category in CATEGORIES else {}
    docs = await db.offers.find(query, {"_id": 0}).sort("sort", 1).to_list(200)
    return [Offer(**d) for d in docs]


@api_router.get("/offers/{offer_id}", response_model=Offer)
async def get_offer(offer_id: str):
    doc = await db.offers.find_one({"id": offer_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Offre introuvable")
    return Offer(**doc)


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
