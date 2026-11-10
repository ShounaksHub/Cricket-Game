import sys
import re
from collections import defaultdict
sys.path.append('packages/data-ingestion/scripts')
from audit_database import all_records

print(f"Total records: {len(all_records)}")

formats_found = defaultdict(int)
stats_counts = defaultdict(lambda: defaultdict(int))
provenance_sources = defaultdict(int)
provenance_versions = defaultdict(int)

for r in all_records:
    provenance_sources[r['sourceName']] += 1
    provenance_versions[r['datasetVersion']] += 1
    
    # check raw_body for formats
    body = r['raw_body']
    for fmt in ['T20', 'ODI', 'TEST_RED_BALL', 'TEST_PINK_BALL', 'T10']:
        if fmt + ':' in body:
            formats_found[fmt] += 1
            # check if runsScored, wicketsTaken, etc. exist
            m_runs = re.search(r'runsScored:\s*(\d+)', body)
            m_wkts = re.search(r'wicketsTaken:\s*(\d+)', body)
            m_avg = re.search(r'battingAverage:\s*([\d\.]+)', body)
            m_sr = re.search(r'strikeRate:\s*([\d\.]+)', body)
            if m_runs: stats_counts[fmt]['runsScored'] += 1
            if m_wkts: stats_counts[fmt]['wicketsTaken'] += 1
            if m_avg: stats_counts[fmt]['battingAverage'] += 1
            if m_sr: stats_counts[fmt]['strikeRate'] += 1

print("\n--- Formats Distribution across 1,144 players ---")
for fmt, count in sorted(formats_found.items()):
    print(f"  {fmt}: {count} players")

print("\n--- Key Statistical Fields presence ---")
for fmt in ['T20', 'ODI', 'TEST_RED_BALL']:
    print(f"  Format {fmt}:")
    for field, cnt in stats_counts[fmt].items():
        print(f"    {field}: {cnt}")

print("\n--- Provenance Source Names ---")
for src, cnt in provenance_sources.items():
    print(f"  {src}: {cnt}")

print("\n--- Dataset Versions ---")
for v, cnt in provenance_versions.items():
    print(f"  {v}: {cnt}")
