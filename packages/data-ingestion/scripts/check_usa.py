import sys
sys.path.append('packages/data-ingestion/scripts')
from audit_database import all_records

for r in all_records:
    if r['primaryNationality'] in ('United States', 'USA'):
        print(f"{r['fullName']} ({r['id']}): nationality='{r['primaryNationality']}', cohort='{r['cohort']}'")
