import re
from collections import Counter

with open('packages/data-ingestion/src/data/cohort-international-legends.ts', 'r', encoding='utf-8') as f:
    text = f.read()

matches = re.findall(r"fullName:\s*['\"]([^'\"]+)['\"]", text)
print(f'Total players in legends: {len(matches)}')
for i, m in enumerate(matches):
    if i < 40 or i > 250:
        print(f"{i+1}: {m}")
