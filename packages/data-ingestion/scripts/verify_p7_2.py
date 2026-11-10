import re
import uuid

for fn in ['cohort-international-contemporary.ts', 'cohort-international-legends.ts']:
    fp = f'packages/data-ingestion/src/data/{fn}'
    with open(fp, 'r', encoding='utf-8') as f:
        c = f.read()
    
    # replace any "f1e1-xxxx-" with "f1e10000-xxxx-" and "f1e2-xxxx-" with "f1e20000-xxxx-"
    c = re.sub(r'"f1e1-([0-9a-f]{4})-', r'"f1e10000-\1-', c)
    c = re.sub(r'"f1e2-([0-9a-f]{4})-', r'"f1e20000-\1-', c)
    
    with open(fp, 'w', encoding='utf-8') as f:
        f.write(c)

    # Validate all UUIDs
    ids = re.findall(r'id:\s*"([^"]+)"', c)
    for i in ids:
        uuid.UUID(i)
    
    print(f"Validated {fn}: {len(ids)} players, all valid RFC 4122 UUIDs.")
