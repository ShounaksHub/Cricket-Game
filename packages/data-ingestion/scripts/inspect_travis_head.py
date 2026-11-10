import re

with open('packages/data-ingestion/src/data/cohort-international-contemporary.ts', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'(\{\s*id:[^}]+fullName:\s*[\'"]Travis Head[\'"][\s\S]*?\n  \},?)', text)
if m:
    print(m.group(1))
