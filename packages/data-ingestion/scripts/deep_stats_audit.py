import sys
import re
from collections import defaultdict
sys.path.append('packages/data-ingestion/scripts')
from audit_database import all_records, parse_cohort_file, cohort_files

print("=== DEEP STATISTICAL AUDIT ACROSS ALL 1,144 PLAYERS ===")

# Audit template artifacts and anomalies across cohorts
anomalies = defaultdict(list)
stat_patterns = {
    'runsScored_8638': re.compile(r'runsScored:\s*8638'),
    'highestScore_185': re.compile(r'highestScore:\s*185'),
    'highestScore_150': re.compile(r'highestScore:\s*150'),
    'highestScore_102': re.compile(r'highestScore:\s*102'),
    'battingAvg_34': re.compile(r'battingAverage:\s*34\.00'),
    'battingAvg_39_5': re.compile(r'battingAverage:\s*39\.50'),
    'battingAvg_42_5': re.compile(r'battingAverage:\s*42\.50'),
    'bowlingAvg_26_5': re.compile(r'bowlingAverage:\s*26\.50'),
    'bowlingAvg_22_0': re.compile(r'bowlingAverage:\s*22\.00'),
    'ballsBowled_60_in_Test': re.compile(r'TEST_RED_BALL:[\s\S]*?ballsBowled:\s*60'),
    'ballsBowled_40_in_ODI': re.compile(r'ODI:[\s\S]*?ballsBowled:\s*40'),
}

cohort_anomalies = defaultdict(lambda: defaultdict(int))

for r in all_records:
    body = r['raw_body']
    cohort = r['cohort']
    has_anomaly = False
    for pat_name, pat in stat_patterns.items():
        if pat.search(body):
            cohort_anomalies[cohort][pat_name] += 1
            has_anomaly = True
    if has_anomaly:
        anomalies[cohort].append(r)

print(f"\nCohort breakdown of records containing template artifacts:")
for cohort, count_dict in cohort_anomalies.items():
    print(f"\nCohort: {cohort} ({len(anomalies[cohort])} players flagged)")
    for pat_name, count in sorted(count_dict.items(), key=lambda x: -x[1]):
        print(f"  {pat_name}: {count} occurrences")
