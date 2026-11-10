import sys
import re
sys.path.append('packages/data-ingestion/scripts')
from audit_database import all_records

key_names = [
    'Virat Kohli',
    'Rohit Sharma',
    'Jasprit Bumrah',
    'Joe Root',
    'Steve Smith',
    'Kane Williamson',
    'Babar Azam',
    'Pat Cummins',
    'Heinrich Klaasen',
    'Travis Head',
    'Nicholas Pooran',
    'Suryakumar Yadav',
    'Shubman Gill',
    'Yashasvi Jaiswal',
    'Rishabh Pant'
]

for name in key_names:
    matches = [r for r in all_records if r['fullName'] == name]
    if matches:
        p = matches[0]
        print(f"\n=== {p['fullName']} ({p['primaryNationality']}) ===")
        print(f"Role: {p['primaryRole']}, Active: {p['isActive']}, Debut: {p['careerDebutYear']}")
        print(f"Dataset Version: {p['datasetVersion']}, Source: {p['sourceName']}, SourceUri: {p['sourceUri']}")
        body = p['raw_body']
        for fmt in ['T20', 'ODI', 'TEST_RED_BALL']:
            m = re.search(r'\b' + fmt + r':\s*\{([^}]+)\}', body)
            if m:
                s = m.group(1).replace('\n', ' ').strip()
                s = re.sub(r'\s+', ' ', s)
                print(f"  {fmt}: {s}")
