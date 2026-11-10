import re
from collections import Counter

for path in [
    'packages/data-ingestion/src/data/cohort-international-contemporary.ts',
    'packages/data-ingestion/src/data/cohort-international-legends.ts',
    'packages/data-ingestion/src/data/cohort-domestic-india.ts',
    'packages/data-ingestion/src/data/cohort-domestic-australia.ts',
    'packages/data-ingestion/src/data/cohort-domestic-england.ts',
    'packages/data-ingestion/src/data/cohort-domestic-world.ts',
]:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    wids = re.findall(r"wikidataId:\s*['\"]([^'\"]+)['\"]", content)
    c = Counter(wids)
    dups = {k: v for k, v in c.items() if v > 1}
    if dups:
        print(path, 'dup wids:', dups)

# Also check canonical duplicate across combined
from audit_database import all_records

seen_canonical = {}
for p in all_records:
    norm = p['fullName'].lower().strip()
    norm = re.sub(r'[^a-z0-9 ]', '', norm)
    # simulate normalizePlayerName
    key = f"{norm}__{p['primaryNationality'].lower()}__{int(p['careerDebutYear']) // 10}"
    if key in seen_canonical:
        print(f"Canonical dup: {p['fullName']} [{p['id']}] vs {seen_canonical[key]} (key: {key})")
    else:
        seen_canonical[key] = f"{p['fullName']} [{p['id']}]"
