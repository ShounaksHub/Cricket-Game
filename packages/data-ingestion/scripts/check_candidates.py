import sys
sys.path.append('packages/data-ingestion/scripts')
from audit_database import all_records

test_names = [
    'Amol Muzumdar',
    'Devendra Bundela',
    'Paras Dogra',
    'Dhawal Kulkarni',
    'Piyush Chawla',
    'Tanmay Agarwal',
    'Akshath Reddy',
    'Arun Karthik',
    'Milind Kumar',
    'Hrishikesh Kanitkar',
    'Umesh Yadav',
    'Sisanda Magala',
    'Hardus Viljoen',
    'Shaun von Berg',
    'Umar Amin',
    'Bilawal Bhatti',
    'Aamer Yamin',
    'Smit Patel',
    'Nisarg Patel'
]

print("Checking presence of candidate replacements in current DB:")
for name in test_names:
    matches = [r for r in all_records if name.lower() in r['fullName'].lower()]
    print(f"  {name}: {'FOUND (' + matches[0]['fullName'] + ')' if matches else 'NOT FOUND'}")
