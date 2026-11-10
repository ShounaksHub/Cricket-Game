import re

with open('packages/data-ingestion/scripts/update_authentic_stats.py', 'r', encoding='utf-8') as f:
    text = f.read()

names = re.findall(r'fullName:\s*[\'"]([^\'"]+)[\'"]', text)
print(f"Total players updated in update_authentic_stats.py: {len(names)}")
for i, n in enumerate(names):
    print(f"{i+1:2d}. {n}")
