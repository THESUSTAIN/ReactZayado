"""
database.py — Connexion SQL async (migration Mongo → SQL).

Par défaut SQLite en local (aucune dépendance externe pour démarrer tout de
suite). En prod, définir DATABASE_URL vers votre vraie base (MySQL/Postgres) —
c'est la SEULE chose à changer, aucun code métier n'a besoin d'y toucher.

Exemples DATABASE_URL :
  - SQLite (défaut)     : sqlite+aiosqlite:///./cours.db
  - Postgres            : postgresql+asyncpg://user:pass@host:5432/dbname
  - MySQL               : mysql+aiomysql://user:pass@host:3306/dbname
"""
import os

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from models import Base

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./cours.db")

# Postgres fournit souvent une URL "postgres://" (Railway, Heroku...) —
# SQLAlchemy async veut explicitement le driver asyncpg dans le schéma.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(DATABASE_URL, echo=False)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def init_db():
    """Crée les tables si elles n'existent pas — idempotent, safe à appeler
    à chaque démarrage (pas de migration Alembic pour ce petit MVP, cf.
    modèles simples et stables ci-dessus)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with async_session_factory() as session:
        yield session
