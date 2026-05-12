import re
import os

file_path = r"c:\Users\DELL\Downloads\SkinCare_Guru\frontend\style.css"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace hardcoded warm shadow RGBA values with the new gold RGBA (212, 175, 55)
content = re.sub(r'rgba\(180,\s*120,\s*60,', 'rgba(212, 175, 55,', content)
content = re.sub(r'rgba\(201,\s*169,\s*110,', 'rgba(212, 175, 55,', content)
content = re.sub(r'rgba\(180,\s*150,\s*110,', 'rgba(212, 175, 55,', content)
content = re.sub(r'rgba\(180,\s*140,\s*100,', 'rgba(212, 175, 55,', content)
content = re.sub(r'rgba\(180,\s*130,\s*80,', 'rgba(212, 175, 55,', content)

# Replace deep brown shadows with black for better contrast on dark mode
content = re.sub(r'rgba\(100,\s*60,\s*30,', 'rgba(0, 0, 0,', content)

# Replace white backgrounds that might be hardcoded to transparent dark variants
content = re.sub(r'background:\s*#fff;', 'background: rgba(40, 40, 40, 0.95);', content)
content = re.sub(r'background:\s*rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\);', 'background: rgba(40, 40, 40, 0.6);', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated colors successfully!")
