import sys
sys.path.append('packages/data-ingestion/scripts')
from audit_database import all_records
from collections import defaultdict

print("Checking cross-cohort identity collisions via initials + surname...")

by_surname = defaultdict(list)
for r in all_records:
    parts = r['fullName'].replace(' domestic', '').replace(' USA', '').strip().split()
    if len(parts) >= 2:
        surname = parts[-1].lower()
        initial = parts[0][0].lower()
        key = (r['primaryNationality'].lower(), surname, initial)
        by_surname[key].append(r)

print(f"Total (country, surname, initial) buckets: {len(by_surname)}")
collisions = {k: v for k, v in by_surname.items() if len(v) > 1}
print(f"Buckets with > 1 player: {len(collisions)}")

confirmed_dupes = []

for (nat, surname, init), plist in collisions.items():
    if len(plist) > 1:
        # compare names
        for i in range(len(plist)):
            for j in range(i + 1, len(plist)):
                p1, p2 = plist[i], plist[j]
                n1 = p1['fullName'].lower().replace(' domestic', '').replace(' usa', '').strip()
                n2 = p2['fullName'].lower().replace(' domestic', '').replace(' usa', '').strip()
                # if exact same name
                if n1 == n2:
                    confirmed_dupes.append((p1, p2, "EXACT_NAME"))
                elif n1.split()[0] == n2.split()[0] and n1.split()[-1] == n2.split()[-1]:
                    confirmed_dupes.append((p1, p2, "FIRST_AND_LAST_MATCH"))

print(f"\nConfirmed Duplicate Candidates ({len(confirmed_dupes)}):")
for p1, p2, reason in confirmed_dupes:
    print(f"[{reason}] '{p1['fullName']}' ({p1['cohort']}, {p1['id']}) == '{p2['fullName']}' ({p2['cohort']}, {p2['id']})")
