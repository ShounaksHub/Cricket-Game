import re

with open('packages/data-ingestion/src/data/cohort-international-contemporary.ts', 'r', encoding='utf-8') as f:
    text = f.read()

matches = re.findall(r"fullName:\s*['\"]([^'\"]+)['\"]", text)
print(f'Total players in contemporary: {len(matches)}')
for i, m in enumerate(matches):
    print(f"{i+1}: {m}")
