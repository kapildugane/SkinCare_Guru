import sys
import os
sys.path.append('c:\\Users\\DELL\\OneDrive\\Desktop\\SkinCare Guru\\backend')

from main import generate_routine
from database.db import SessionLocal

db = SessionLocal()

user_data_1 = {"routine": "Morning", "skin": "Oily", "focus": "Face Care"}
res1 = generate_routine(user_data_1, db)
print("Result 1:")
for p in res1['products']:
    print(p['name'])

user_data_2 = {"routine": "Evening", "skin": "Dry"}
res2 = generate_routine(user_data_2, db)
print("\nResult 2:")
for p in res2['products']:
    print(p['name'])
