import sys
sys.path.append('packages/data-ingestion/scripts')
from audit_database import all_records

domestic_suffix_players = []
for r in all_records:
    if 'domestic' in r['fullName'].lower():
        domestic_suffix_players.append(r)

print(f"Total players with 'domestic' in name: {len(domestic_suffix_players)}")
for p in domestic_suffix_players:
    print(f"  {p['fullName']} ({p['id']}) | cohort: {p['cohort']} | country: {p['primaryNationality']}")
