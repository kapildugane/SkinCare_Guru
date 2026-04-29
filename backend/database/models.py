from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from database.db import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String, unique=True, index=True)
    name = Column(String, index=True)
    category = Column(String)
    sub_category = Column(String)
    skin_type = Column(String)
    concerns = Column(String)
    ingredients = Column(Text)
    ingredient_strength = Column(String)
    routine_step = Column(String)
    time_of_use = Column(String)
    age_group = Column(String)
    experience_level = Column(String)
    pregnancy_safe = Column(String)
    beginner_friendly = Column(String)
    travel_size_available = Column(String)
    bundle_tags = Column(String)
    price = Column(String)
    image = Column(String)

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_active = Column(DateTime(timezone=True), onupdate=func.now())

class Consultation(Base):
    __tablename__ = "consultations"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("chat_sessions.session_id"))
    entry_card = Column(String) # e.g., "Build My Routine", "Help Me Fix a Concern"
    skin_type = Column(String)
    concerns = Column(String)
    routine_length = Column(Integer, default=0)
    products_recommended = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())