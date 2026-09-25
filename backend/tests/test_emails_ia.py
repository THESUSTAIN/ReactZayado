import asyncio, sys, types, uuid, json
from datetime import datetime, timezone
import os as _o; sys.path.insert(0, _o.path.dirname(_o.path.dirname(_o.path.abspath(__file__))))
import httpx
from fastapi import APIRouter, FastAPI, HTTPException
from sqlalchemy import String, Text, DateTime, select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
import emails_ia_ext as m

class Base(DeclarativeBase): pass
new_uuid = lambda: str(uuid.uuid4())
utcnow = lambda: datetime.now(timezone.utc)
class User(Base):
    __tablename__="users"; id: Mapped[str]=mapped_column(String(36),primary_key=True,default=new_uuid)
    email: Mapped[str]=mapped_column(String(255)); role: Mapped[str]=mapped_column(String(20),default="client")
class UserConnection(Base):
    __tablename__="user_connections"; id: Mapped[str]=mapped_column(String(36),primary_key=True,default=new_uuid)
    user_id: Mapped[str]=mapped_column(String(36)); provider: Mapped[str]=mapped_column(String(30)); label: Mapped[str]=mapped_column(String(120),nullable=True)
    status: Mapped[str]=mapped_column(String(20),default="pending"); credentials_enc: Mapped[str]=mapped_column(Text,nullable=True)
    revoked_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),nullable=True)

eng = create_async_engine("sqlite+aiosqlite:///:memory:")
Sess = async_sessionmaker(eng, expire_on_commit=False)
api = APIRouter(prefix="/api")
async def get_db():
    async with Sess() as s: yield s
mails=[]
async def send_email(*, to, subject, html): mails.append((to,subject,html))
LLM_OUT = {"v": json.dumps({"sujet":"Bienvenue","html":"<div>Bonjour</div>","texte":"Bonjour","analyse":"ok"})}
class FakeClient:
    async def send_message(self, um): return LLM_OUT["v"]
def safe(subject, html):
    if "<form" in html: raise ValueError("form")
llm = types.ModuleType("llm_mammouth"); llm.UserMessage = lambda text: text; sys.modules["llm_mammouth"]=llm
g = dict(Base=Base, api=api, get_db=get_db, _uid=lambda:"adm", utcnow=utcnow, new_uuid=new_uuid, User=User,
         exiger_role=lambda *r: (lambda: "admin"), UserConnection=UserConnection, _dechiffrer=lambda x:x, _chiffrer=lambda x:x,
         _client_llm=lambda sid, s: FakeClient(), _assert_safe_email=safe, send_email=send_email, JWT_SECRET="s3cret")
m.install_emails_ia(g)
app = FastAPI(); app.include_router(api)

posted=[]
class FakeHttp:
    def __init__(self,*a,**k): pass
    async def __aenter__(self): return self
    async def __aexit__(self,*a): pass
    async def post(self,url,headers=None,json=None):
        posted.append(json["to"][0]["email"]); 
        return types.SimpleNamespace(status_code=(500 if json["to"][0]["email"]=="bad@x.fr" else 201), text="err")
RealClient = httpx.AsyncClient
m.httpx.AsyncClient = FakeHttp
import os; os.environ["BREVO_API_KEY"]="k"*30; os.environ["BACKEND_PUBLIC_URL"]="https://api.example.com"

async def main():
    async with eng.begin() as c: await c.run_sync(Base.metadata.create_all)
    async with Sess() as s:
        s.add(User(id="adm", email="me@x.fr", role="admin")); await s.commit()
    tr = httpx.ASGITransport(app=app)
    async with RealClient(transport=tr, base_url="http://t") as c:
        r = await c.post("/api/admin/emails-ia/brouillon", json={"intention":"Bienvenue clients","destinataires":"a@x.fr, b@x.fr; bad@x.fr\nnope, a@x.fr"})
        assert r.status_code==200, r.text; d=r.json(); assert d["destinataires"]==["a@x.fr","b@x.fr","bad@x.fr"], d
        assert d["apercu_envoye"] and d["alerte_apercu"] is None and "valider/" in mails[0][2] and mails[0][0]=="me@x.fr"
        sig = m.signer("s3cret", d["id"])
        r = await c.get(f"/api/webhooks/emails-ia/valider/{d['id']}/{sig}"); assert "Oui, envoyer" in r.text and not posted
        r = await c.get(f"/api/webhooks/emails-ia/valider/{d['id']}/bad"); assert "invalide" in r.text
        r = await c.post(f"/api/webhooks/emails-ia/valider/{d['id']}/{sig}"); assert "Envoyé" in r.text, r.text
        assert posted==["a@x.fr","b@x.fr","bad@x.fr"]
        r = await c.post(f"/api/webhooks/emails-ia/valider/{d['id']}/{sig}"); assert "Non envoyé" in r.text and len(posted)==3  # pas de double envoi
        lst = (await c.get("/api/admin/emails-ia")).json(); assert lst["brouillons"][0]["resultat"]["echecs"][0]["email"]=="bad@x.fr"
        LLM_OUT["v"]=json.dumps({"sujet":"x","html":"<form></form>","texte":""})
        r = await c.post("/api/admin/emails-ia/brouillon", json={"intention":"test test","destinataires":["a@x.fr"]}); assert r.status_code==422
        LLM_OUT["v"]=json.dumps({"sujet":"S","html":"<p>ok</p>","texte":"ok"})
        r = await c.post("/api/admin/emails-ia/brouillon", json={"intention":"test test","destinataires":["a@x.fr"]}); assert r.status_code==200
    async with Sess() as s:
        assert await g["traiter_ok_envoi"](s,"adm","bonjour") is None
        out = await g["traiter_ok_envoi"](s,"adm","Ok envoi !"); assert "1 destinataire" in out, out
        assert "Aucun brouillon" in await g["traiter_ok_envoi"](s,"adm","ok envoi")
        assert await g["traiter_ok_envoi"](s,"autre","ok envoi") is None
    print("TOUS LES TESTS OK")
asyncio.run(main())
