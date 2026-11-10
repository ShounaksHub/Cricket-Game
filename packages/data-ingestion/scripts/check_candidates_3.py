import sys
sys.path.append('packages/data-ingestion/scripts')
from audit_database import all_records

batch3 = [
    'Rajinder Goel',
    'Padmakar Shivalkar',
    'Jacob Martin',
    'Connor Williams',
    'Kulamani Parida',
    'Sunil Joshi'
]

print("Checking presence of batch 3 candidates:")
for name in batch3:
    matches = [r for r in all_records if name.lower() in r['fullName'].lower()]
    print(f"  {name}: {'FOUND (' + matches[0]['fullName'] + ')' if matches else 'NOT FOUND'}")
