import re

for filename, cohort_name in [
    ('packages/data-ingestion/src/data/cohort-domestic-india.ts', 'Domestic India'),
    ('packages/data-ingestion/src/data/cohort-domestic-australia.ts', 'Domestic Australia'),
    ('packages/data-ingestion/src/data/cohort-domestic-england.ts', 'Domestic England'),
    ('packages/data-ingestion/src/data/cohort-domestic-world.ts', 'Domestic World'),
]:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    blocks = re.findall(r'(\{\s*id:\s*[\'"][^\'"]+[\'"][\s\S]*?\n  \},?)', text)
    for b in blocks:
        pid = re.search(r'id:\s*[\'"]([^\'"]+)[\'"]', b).group(1)
        name = re.search(r'fullName:\s*[\'"]([^\'"]+)[\'"]', b).group(1)
        # check flags
        flagged = []
        if 'ballsBowled: 60' in b and 'wicketsTaken: 0' in b:
            flagged.append('ballsBowled: 60')
        if 'ballsBowled: 40' in b and 'wicketsTaken: 0' in b:
            flagged.append('ballsBowled: 40')
        if 'battingAverage: 34.00' in b or 'battingAverage: 34.0,' in b or 'battingAverage: 34,' in b:
            flagged.append('battingAverage: 34')
        if 'highestScore: 102' in b:
            flagged.append('highestScore: 102')
        if 'highestScore: 150' in b:
            flagged.append('highestScore: 150')
        if 'highestScore: 185' in b:
            flagged.append('highestScore: 185')
        if flagged:
            print(f"[{cohort_name}] {name} ({pid}): {', '.join(flagged)}")
