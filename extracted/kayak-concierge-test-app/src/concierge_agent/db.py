from sqlmodel import SQLModel, create_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
import os

DB_PATH = os.environ.get('CONCIERGE_DB', '/app/data/concierge.db')
ASYNC_DSN = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(ASYNC_DSN, echo=False)

async def init_db():
    # create directories
    os.makedirs(os.path.dirname(DB_PATH) or '.', exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

def get_session() -> AsyncSession:
    return AsyncSession(engine)
