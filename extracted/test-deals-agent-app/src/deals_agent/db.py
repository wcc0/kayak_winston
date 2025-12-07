from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
import os

POSTGRES_DSN = os.environ.get('POSTGRES_DSN', 'postgresql+asyncpg://postgres:password@localhost:5432/deals')

engine = create_async_engine(POSTGRES_DSN, echo=False, future=True)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

async def get_session() -> AsyncSession:
    return async_session()
