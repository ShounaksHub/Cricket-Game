import re

with open('packages/data-ingestion/src/data/cohort-international-contemporary.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect Rishabh Pant, KL Rahul, Pat Cummins
for name in ['Rishabh Pant', 'KL Rahul', 'Pat Cummins', 'Travis Head']:
    m = re.search(r'(\{\s*id:[^}]+fullName:\s*[\'"]' + name + r'[\'"][\s\S]*?\n  \},?)', text)
    if m:
        print(f"=== {name} ===")
        print(m.group(1)[:500])
