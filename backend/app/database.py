from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings

# Initialize the async SQLite engine
engine = create_async_engine(settings.DATABASE_URL, echo=False)

# Create a session factory for our background workers
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

# Base class for our database models
Base = declarative_base()