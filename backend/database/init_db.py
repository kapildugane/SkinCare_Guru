import sys
import os
import csv
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.db import engine, SessionLocal, Base
from database.models import Product

def init_db():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)

def seed_db():
    db = SessionLocal()
    
    csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'products.csv')
    if not os.path.exists(csv_path):
        print(f"Could not find {csv_path}")
        db.close()
        return

    print("Seeding database with products from CSV...")
    with open(csv_path, mode='r', encoding='utf-8', errors='replace') as f:
        # The CSV has each row entirely wrapped in a single set of double quotes.
        # Inside those rows, literal quotes are represented as double-double quotes ("").
        # We need to strip the outer quotes and then correctly parse the CSV content.
        
        lines = f.readlines()
        if not lines:
            return

        # Process the header
        header_line = lines[0].strip()
        if header_line.startswith('"') and header_line.endswith('"'):
            header_line = header_line[1:-1]
        header = header_line.replace('""', '"').split(',')

        for line in lines[1:]:
            line = line.strip()
            if not line: continue
            
            # Remove outer quotes if they exist
            if line.startswith('"') and line.endswith('"'):
                line = line[1:-1]
            
            # Replace double-double quotes with single quotes for standard CSV parsing
            processed_line = line.replace('""', '"')
            
            # Use csv.reader on a single line to respect quoted fields correctly
            row_reader = csv.reader([processed_line])
            try:
                row_data = next(row_reader)
                if len(row_data) < len(header):
                    continue
                
                row = dict(zip(header, row_data))
                
                existing = db.query(Product).filter(Product.product_id == row['product_id']).first()
                if not existing:
                    # Fix: Define the variables first
                    p_id = row.get('product_id')
                    p_name = row.get('product_name') or row.get('name')
                    p_price = row.get('price_gbp') or row.get('price') or "0"

                    # Map premium local images based on category
                    sub_cat = (row.get('sub_category') or "").lower()
                    if "cleanser" in sub_cat:
                        p_image = "images/cleanser.png"
                    elif "serum" in sub_cat or "essence" in sub_cat:
                        p_image = "images/serum.png"
                    elif "moisturizer" in sub_cat or "cream" in sub_cat:
                        p_image = "images/moisturizer.png"
                    else:
                        # Fallback to a reliable keyword-based service
                        keyword = sub_cat.replace(" ", "") or "skincare"
                        p_image = f"https://loremflickr.com/300/300/{keyword}"

                    product = Product(
                        product_id=p_id,
                        name=p_name,
                        category=row.get('category'),
                        sub_category=row.get('sub_category'),
                        skin_type=row.get('skin_type'),
                        concerns=row.get('concerns'),
                        ingredients=row.get('ingredients'),
                        ingredient_strength=row.get('ingredient_strength'),
                        routine_step=row.get('routine_step'),
                        time_of_use=row.get('time_of_use'),
                        age_group=row.get('age_group'),
                        experience_level=row.get('experience_level'),
                        pregnancy_safe=row.get('pregnancy_safe'),
                        beginner_friendly=row.get('beginner_friendly'),
                        travel_size_available=row.get('travel_size_available'),
                        bundle_tags=row.get('bundle_tags'),
                        price=f"£{p_price}" if p_price else "£0",
                        image=p_image
                    )
                    db.add(product)
            except Exception as e:
                print(f"Error parsing line: {e}")
                
    db.commit()
    print("Seeded database successfully!")
    db.close()

if __name__ == "__main__":
    init_db()
    seed_db()
