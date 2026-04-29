import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Use DATABASE_URL from .env if it exists, otherwise fallback to local sqlite
SQLALCHEMY_DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./skincare.db')

if SQLALCHEMY_DATABASE_URL.startswith('sqlite'):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={'check_same_thread': False})
else:
    # Supabase/Postgres doesn't use connect_args={'check_same_thread': False}
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()