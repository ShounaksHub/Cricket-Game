import sys
sys.path.append('packages/data-ingestion/scripts')
from audit_database import all_records
import difflib

print("Deep audit for subtle duplicate identities across cohorts...")

# Group by country
by_country = {}
for r in all_records:
    by_country.setdefault(r['primaryNationality'], []).append(r)

suspects = []

for country, players in by_country.items():
    for i in range(len(players)):
        p1 = players[i]
        n1 = p1['fullName'].lower().replace(' domestic', '').replace(' usa', '').strip()
        # split into last name
        last1 = n1.split()[-1]
        for j in range(i + 1, len(players)):
            p2 = players[j]
            n2 = p2['fullName'].lower().replace(' domestic', '').replace(' usa', '').strip()
            last2 = n2.split()[-1]
            
            # if same last name, check similarity
            sim = difflib.SequenceMatcher(None, n1, n2).ratio()
            if sim > 0.75:
                suspects.append((sim, p1, p2))

print(f"Total potential within-country suspects: {len(suspects)}")
for sim, p1, p2 in sorted(suspects, key=lambda x: -x[0]):
    print(f"[{sim:.2f}] {p1['fullName']} ({p1['cohort']}, {p1['id']}) vs {p2['fullName']} ({p2['cohort']}, {p2['id']})")
