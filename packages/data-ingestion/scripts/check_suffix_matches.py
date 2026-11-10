import sys
sys.path.append('packages/data-ingestion/scripts')
from audit_database import all_records

suffix_names = [
    'Shreyas Iyer domestic',
    'Suryakumar Yadav domestic',
    'Shubman Gill domestic',
    'Yashasvi Jaiswal domestic',
    'Arshdeep Singh domestic',
    'Wasim Jaffer domestic',
    'Nishant Sindhu domestic',
    'Mohammed Siraj domestic',
    'Chris Lynn domestic',
    'Nathan Bracken domestic',
    'Stuart Clark domestic',
    'Doug Bollinger domestic',
    'Ben Hilfenhaus domestic',
    'David Hussey domestic',
    'Brad Hodge domestic',
    'Simon Katich domestic',
    'Adam Voges domestic',
    'Nathan Coulter-Nile domestic',
    'Marcus Harris domestic',
    'Matt Renshaw domestic',
    'Steven Finn domestic',
    'Craig Overton domestic',
    'Jamie Overton domestic',
    'Ed Joyce domestic',
    'Keaton Jennings domestic',
    'Rory Burns domestic',
    'Dom Sibley domestic',
    'Fawad Alam domestic',
    'Kamran Akmal domestic',
    'Saim Ayub domestic',
    'Jeet Raval domestic',
    'David Wiese domestic',
    'Corey Anderson USA',
    'Harmeet Singh USA'
]

print("Comparing base names against the entire database:")
for sname in suffix_names:
    base = sname.replace(' domestic', '').replace(' USA', '').strip()
    matches = [r for r in all_records if r['fullName'].lower() == base.lower()]
    print(f"Base '{base}': found {len(matches)} matches in DB:")
    for m in matches:
        print(f"   -> [{m['cohort']}] {m['fullName']} ({m['id']}) - {m['primaryNationality']}, Debut: {m['careerDebutYear']}")
