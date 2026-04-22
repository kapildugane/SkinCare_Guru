import sys
import traceback
from rag_engine import retrieve_top_k

user_data_1 = {"routine": "Morning", "skin": "Oily"}
user_data_2 = {"routine": "Evening", "skin": "Dry"}

try:
    print("Test 1:")
    top_1 = retrieve_top_k(user_data_1, k=1)
    print(top_1[0]['record']['product_recommendations'])
    
    print("\nTest 2:")
    top_2 = retrieve_top_k(user_data_2, k=1)
    print(top_2[0]['record']['product_recommendations'])
except Exception as e:
    print("EXCEPTION OCCURRED:")
    traceback.print_exc()
