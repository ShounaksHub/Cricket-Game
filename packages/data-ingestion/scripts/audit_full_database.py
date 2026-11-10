import re
import uuid

cohorts = [
    'cohort-international-contemporary.ts',
    'cohort-international-legends.ts',
    'cohort-domestic-india.ts',
    'cohort-domestic-australia.ts',
    'cohort-domestic-england.ts',
    'cohort-domestic-world.ts',
]

all_ids = set()
all_names = set()
all_slugs = set()
duplicate_ids = []
duplicate_names = []
duplicate_slugs = []
total_count = 0

for c in cohorts:
    fp = f'packages/data-ingestion/src/data/{c}'
    with open(fp, 'r', encoding='utf-8') as f:
        content = f.read()

    ids = re.findall(r'id:\s*"([^"]+)"', content)
    names = re.findall(r'fullName:\s*"([^"]+)"', content)
    slugs = re.findall(r'cricsheetId:\s*"([^"]+)"', content)

    print(f"{c}: {len(ids)} players, {len(names)} names, {len(slugs)} slugs")
    total_count += len(ids)

    for i in ids:
        # Check UUID valid RFC 4122
        uuid.UUID(i)
        if i in all_ids:
            duplicate_ids.append(i)
        all_ids.add(i)

    for n in names:
        nl = n.strip().lower()
        if nl in all_names:
            duplicate_names.append(n)
        all_names.add(nl)

    for s in slugs:
        if s in all_slugs:
            duplicate_slugs.append(s)
        all_slugs.add(s)

print("=" * 60)
print(f"GRAND TOTAL PLAYERS ACROSS ALL COHORTS: {total_count}")
print(f"Total Unique UUIDs: {len(all_ids)} (Duplicate UUIDs: {len(duplicate_ids)})")
print(f"Total Unique Names: {len(all_names)} (Duplicate Names: {len(duplicate_names)})")
print(f"Total Unique Slugs: {len(all_slugs)} (Duplicate Slugs: {len(duplicate_slugs)})")

if duplicate_ids or duplicate_names or duplicate_slugs:
    print("DUPLICATE REPORT:")
    if duplicate_ids:
        print("Duplicate IDs:", duplicate_ids)
    if duplicate_names:
        print("Duplicate Names:", duplicate_names)
    if duplicate_slugs:
        print("Duplicate Slugs:", duplicate_slugs)
else:
    print("AUDIT SUCCESS: ZERO DUPLICATES FOUND! 100% CLEAN DATABASE.")
