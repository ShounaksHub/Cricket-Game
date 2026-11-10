import re

def check_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    # Find cases where a player doesn't have an apostrophe in cricsheetId or fullName
    # Let's find players with single O
    bad_o = re.findall(r"fullName:\s*['\"][^'\"]*?\bO\b['\"]", text)
    if bad_o:
        print(f"{filepath} has bad 'O': {bad_o}")

for path in [
    'packages/data-ingestion/src/data/cohort-international-contemporary.ts',
    'packages/data-ingestion/src/data/cohort-international-legends.ts',
    'packages/data-ingestion/src/data/cohort-domestic-india.ts',
    'packages/data-ingestion/src/data/cohort-domestic-australia.ts',
    'packages/data-ingestion/src/data/cohort-domestic-england.ts',
    'packages/data-ingestion/src/data/cohort-domestic-world.ts',
]:
    check_file(path)
