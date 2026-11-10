import re

for filename, cohort in [
    ('packages/data-ingestion/src/data/cohort-international-contemporary.ts', 'contemp'),
    ('packages/data-ingestion/src/data/cohort-international-legends.ts', 'legends')
]:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()
    
    for name in ['Virat Kohli', 'Donald Bradman', 'Shane Warne']:
        m = re.search(r'(\{\s*id:[^}]+fullName:\s*[\'"]' + name + r'[\'"][\s\S]*?\n  \},?)', text)
        if m:
            print(f"[{cohort}] Found {name}")
            print(m.group(1)[:400])
