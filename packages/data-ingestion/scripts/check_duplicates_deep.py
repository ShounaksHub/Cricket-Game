import sys
sys.path.append('packages/data-ingestion/scripts')
from audit_database import all_records
from collections import defaultdict
import difflib

print("Checking for potential duplicates / aliases / splits...")

# 1. Check Corey Anderson
for r in all_records:
    if 'corey' in r['fullName'].lower() or 'anderson' in r['fullName'].lower():
        print(f"Anderson match: {r['fullName']} | {r['primaryNationality']} | {r['cohort']} | {r['id']}")

# 2. Check Harmeet Singh
for r in all_records:
    if 'harmeet' in r['fullName'].lower():
        print(f"Harmeet match: {r['fullName']} | {r['primaryNationality']} | {r['cohort']} | {r['id']}")

# 3. Check any name ending with country name or modifier like 'USA' or 'ENG'
for r in all_records:
    words = r['fullName'].split()
    if words[-1].upper() in ('USA', 'IND', 'AUS', 'ENG', 'SA', 'NZ', 'WI', 'PAK', 'SL'):
        print(f"Suspicious suffix: {r['fullName']} ({r['id']}) in {r['cohort']}")

# 4. Pairwise similarity search among all players
print("\nChecking pairwise high string similarity (> 0.85):")
seen_pairs = set()
for i in range(len(all_records)):
    r1 = all_records[i]
    name1 = r1['fullName'].lower()
    for j in range(i + 1, len(all_records)):
        r2 = all_records[j]
        name2 = r2['fullName'].lower()
        if name1 == name2:
            print(f"EXACT: {r1['fullName']} [{r1['cohort']}] == {r2['fullName']} [{r2['cohort']}]")
            continue
        # Check if one is substring of other or diff ratio > 0.85
        sim = difflib.SequenceMatcher(None, name1, name2).ratio()
        if sim > 0.82 or (len(name1) > 4 and name1 in name2) or (len(name2) > 4 and name2 in name1):
            pair_key = tuple(sorted([r1['id'], r2['id']]))
            if pair_key not in seen_pairs:
                seen_pairs.add(pair_key)
                print(f"SIMILAR ({sim:.2f}): '{r1['fullName']}' ({r1['cohort']}, {r1['primaryNationality']}) vs '{r2['fullName']}' ({r2['cohort']}, {r2['primaryNationality']})")
