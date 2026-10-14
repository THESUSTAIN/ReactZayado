from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
import httpx
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# ---------- LEADS (Brevo) ----------
class LeadIn(BaseModel):
    email: str
    prenom: str = ""
    source: str = "site"


@api_router.post("/leads")
async def capture_lead(lead: LeadIn):
    email = lead.email.strip().lower()
    if "@" not in email or "." not in email.split("@")[1]:
        raise HTTPException(400, "Email invalide")
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "email": email,
        "prenom": lead.prenom.strip()[:100],
        "source": lead.source.strip()[:100],
        "updated_at": now,
    }
    await db.leads.update_one(
        {"email": email}, {"$set": doc, "$setOnInsert": {"created_at": now}}, upsert=True
    )

    api_key = os.environ.get("BREVO_API_KEY", "")
    if not api_key:
        return {"ok": True, "mode": "demo"}

    payload = {
        "email": email,
        "attributes": {"PRENOM": lead.prenom.strip()[:100], "SOURCE": lead.source.strip()[:100]},
        "updateEnabled": True,
    }
    list_id = os.environ.get("BREVO_LIST_ID", "")
    if list_id.isdigit():
        payload["listIds"] = [int(list_id)]
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(
                "https://api.brevo.com/v3/contacts",
                json=payload,
                headers={"accept": "application/json", "content-type": "application/json", "api-key": api_key},
            )
    except httpx.RequestError:
        raise HTTPException(502, "Brevo injoignable")
    if r.status_code not in (200, 201, 204):
        raise HTTPException(502, "Brevo a refusé le contact")
    await db.leads.update_one({"email": email}, {"$set": {"brevo_synced": True}})
    return {"ok": True, "mode": "brevo"}


# ---------- CHECKOUT (Mollie, repli démo simulée) ----------
CATALOGUE_PRIX = {
    "fauteuil": 349, "lampe": 89, "vegetal": 59, "carnet": 34,
    "plaid": 69, "casque": 199, "planner": 29, "mug": 18,
    "box-hiver": 49, "box-ete": 89,
}


class LigneIn(BaseModel):
    product_id: str
    quantity: int = Field(ge=1, le=10)


class CheckoutIn(BaseModel):
    items: List[LigneIn]
    client: dict = {}


@api_router.post("/checkout")
async def checkout(cin: CheckoutIn):
    lignes, total = [], 0
    for l in cin.items:
        prix = CATALOGUE_PRIX.get(l.product_id)
        if not prix:
            raise HTTPException(400, f"Produit inconnu : {l.product_id}")
        total += prix * l.quantity
        lignes.append({"product_id": l.product_id, "quantity": l.quantity, "prix": prix})

    ref = "ZYD-" + uuid.uuid4().hex[:6].upper()
    doc = {
        "ref": ref,
        "items": lignes,
        "total": total,
        "client": cin.client,
        "status": "created",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.orders.insert_one(doc)
    order_id = str(res.inserted_id)

    mollie_key = os.environ.get("MOLLIE_API_KEY", "")
    if not mollie_key:
        return {"mode": "simule", "ref": ref, "total": total}

    frontend = os.environ.get("FRONTEND_URL", "https://clarity-tunnel.preview.emergentagent.com").rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                "https://api.mollie.com/v2/payments",
                headers={"Authorization": f"Bearer {mollie_key}", "Content-Type": "application/json"},
                json={
                    "amount": {"currency": "EUR", "value": f"{total:.2f}"},
                    "description": f"Zayado — commande {ref}",
                    "redirectUrl": f"{frontend}/paiement/succes?order_id={order_id}",
                    "cancelUrl": f"{frontend}/paiement/annulation?order_id={order_id}",
                    "metadata": {"order_id": order_id, "ref": ref},
                    "locale": "fr_FR",
                },
            )
    except httpx.RequestError:
        raise HTTPException(502, "Mollie injoignable")
    if r.is_error:
        raise HTTPException(502, "Mollie a refusé le paiement")
    pay = r.json()
    await db.orders.update_one(
        {"_id": res.inserted_id}, {"$set": {"mollie_id": pay["id"], "status": pay.get("status", "open")}}
    )
    return {"mode": "mollie", "order_id": order_id, "ref": ref, "total": total,
            "checkout_url": pay["_links"]["checkout"]["href"]}


async def sync_paiement(payment_id: str):
    mollie_key = os.environ.get("MOLLIE_API_KEY", "")
    if not mollie_key:
        return None
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(
                f"https://api.mollie.com/v2/payments/{payment_id}",
                headers={"Authorization": f"Bearer {mollie_key}"},
            )
    except httpx.RequestError:
        return None
    if r.is_error:
        return None
    pay = r.json()
    status = pay.get("status")
    upd = {"status": status}
    if status == "paid":
        upd["paid_at"] = pay.get("paidAt")
    await db.orders.update_one(
        {"mollie_id": payment_id, "status": {"$nin": ["paid"]}}, {"$set": upd}
    )
    return pay


@api_router.post("/mollie/webhook")
async def mollie_webhook(request: Request):
    data = {}
    try:
        if "application/json" in request.headers.get("content-type", ""):
            data = await request.json()
        else:
            form = await request.form()
            data = dict(form)
    except Exception:
        pass
    payment_id = data.get("id")
    if not payment_id or not str(payment_id).startswith("tr_"):
        return JSONResponse({"error": "webhook invalide"}, status_code=400)
    await sync_paiement(str(payment_id))
    return {"ok": True}


@api_router.get("/orders/{order_id}/payment-status")
async def order_status(order_id: str):
    from bson import ObjectId

    try:
        oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(400, "Identifiant invalide")
    order = await db.orders.find_one({"_id": oid})
    if not order:
        raise HTTPException(404, "Commande introuvable")
    if order.get("mollie_id") and order.get("status") not in ("paid", "canceled", "failed", "expired"):
        await sync_paiement(order["mollie_id"])
        order = await db.orders.find_one({"_id": oid})
    return {"order_id": order_id, "status": order.get("status"), "total": order.get("total"), "ref": order.get("ref")}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()