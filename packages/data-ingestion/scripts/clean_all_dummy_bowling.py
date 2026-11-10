import re

files = [
    'packages/data-ingestion/src/data/cohort-international-contemporary.ts',
    'packages/data-ingestion/src/data/cohort-international-legends.ts',
    'packages/data-ingestion/src/data/cohort-domestic-india.ts',
    'packages/data-ingestion/src/data/cohort-domestic-australia.ts',
    'packages/data-ingestion/src/data/cohort-domestic-england.ts',
    'packages/data-ingestion/src/data/cohort-domestic-world.ts',
]

cleaned_total = 0
for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # replace ballsBowled: 40 with runsConceded: 32 and wicketsTaken: 0
    # or ballsBowled: 60 with runsConceded: 35 and wicketsTaken: 0
    # with 0s / nulls
    pattern1 = re.compile(
        r'ballsBowled:\s*(?:40|60),\s*\n\s*runsConceded:\s*(?:32|35|25),\s*\n\s*wicketsTaken:\s*0,\s*\n\s*bowlingAverage:\s*null,\s*\n\s*economyRate:\s*[\d\.]+,\s*\n\s*bowlingStrikeRate:\s*null,'
    )
    matches = len(pattern1.findall(text))
    if matches > 0:
        text = pattern1.sub(
            'ballsBowled: 0,\n        runsConceded: 0,\n        wicketsTaken: 0,\n        bowlingAverage: null,\n        economyRate: null,\n        bowlingStrikeRate: null,',
            text
        )
        cleaned_total += matches
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f"[{fpath}] Cleaned {matches} dummy bowling blocks.")

print(f"Total dummy bowling blocks cleaned: {cleaned_total}")
