from sqlalchemy import Column, Integer, String, Text
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