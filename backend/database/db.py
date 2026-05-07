import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Use DATABASE_URL from .env if it exists, otherwise fallback to local sqlite
SQLALCHEMY_DATABASE_URL = os.getenv('DATABASE_URL')

# Check if we are in production (e.g. Render)
IS_PRODUCTION = os.getenv('RENDER') is not None or os.getenv('PORT') is not None

if not SQLALCHEMY_DATABASE_URL:
    if IS_PRODUCTION:
        logger.error("[DB] CRITICAL: DATABASE_URL environment variable is MISSING on Render.")
        logger.error("[DB] Falling back to local SQLite, but data will NOT be saved to Supabase!")
    else:
        logger.info("[DB] No DATABASE_URL found, using local SQLite (development mode).")
    SQLALCHEMY_DATABASE_URL = 'sqlite:///./skincare.db'

logger.info(f"[DB] Initializing engine for: {'PostgreSQL' if 'postgresql' in SQLALCHEMY_DATABASE_URL.lower() else 'SQLite'}")

if SQLALCHEMY_DATABASE_URL.startswith('sqlite'):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={'check_same_thread': False})
else:
    # Supabase/Postgres — use connection pool settings suitable for a pooler
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={"connect_timeout": 10},
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def validate_db_connection():
    """Probe the database connection on startup. Logs clearly on failure."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("[DB] Database connection validated successfully.")
        return True
    except Exception as e:
        logger.error(f"[DB] Database connection FAILED: {e}")
        logger.warning("[DB] Falling back — application will attempt reconnect on first request.")
        return False


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()