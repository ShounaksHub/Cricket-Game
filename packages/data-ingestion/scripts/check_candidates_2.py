import sys
sys.path.append('packages/data-ingestion/scripts')
from audit_database import all_records

batch2 = [
    'Pankaj Singh',
    'Sridharan Sriram',
    'Sitanshu Kotak',
    'Rashmi Parida',
    'Mithun Manhas',
    'Yere Goud',
    'Ranadeb Bose',
    'Vinay Kumar',
    'Abhimanyu Mithun',
    'Sreenath Aravind',
    'Siddharth Kaul',
    'Barinder Sran',
    'Pawan Negi',
    'Manpreet Gony',
    'Swapnil Asnodkar',
    'Paul Valthaty',
    'Shaun von Berg',
    'Umar Amin',
    'Aamer Yamin',
    'Smit Patel',
    'Nisarg Patel'
]

print("Checking presence of batch 2 candidates:")
for name in batch2:
    matches = [r for r in all_records if name.lower() in r['fullName'].lower()]
    print(f"  {name}: {'FOUND (' + matches[0]['fullName'] + ')' if matches else 'NOT FOUND'}")
