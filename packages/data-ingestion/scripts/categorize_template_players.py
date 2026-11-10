import sys
import re
from collections import defaultdict
sys.path.append('packages/data-ingestion/scripts')
from audit_database import all_records

print(f"Total parsed players: {len(all_records)}")

# Categorize players with realistic stats vs template stats
# A player has template stats if they have:
# - battingAverage: 34.00, 39.50, or 42.50
# - bowlingAverage: 22.00, 26.50, or 28.50
# - highestScore: 102, 150, or 185
# - ballsBowled: 40 or 60 in ODI/Test with 0 wickets

def is_template_stat_player(r):
    body = r['raw_body']
    markers = [
        'highestScore: 185',
        'highestScore: 150',
        'highestScore: 102',
        'battingAverage: 34.00',
        'battingAverage: 39.50',
        'battingAverage: 42.50',
        'bowlingAverage: 22.00',
        'bowlingAverage: 26.50',
        'ballsBowled: 60,',
        'ballsBowled: 40,',
    ]
    return any(m in body for m in markers)

template_players = [r for r in all_records if is_template_stat_player(r)]
authentic_players = [r for r in all_records if not is_template_stat_player(r)]

print(f"Players with template artifacts: {len(template_players)}")
print(f"Players with authentic/custom stats: {len(authentic_players)}")

by_cohort_template = defaultdict(int)
for r in template_players:
    by_cohort_template[r['cohort']] += 1

print("\nTemplate players by cohort:")
for c, cnt in by_cohort_template.items():
    print(f"  {c}: {cnt}")
