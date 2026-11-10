import re

with open('packages/data-ingestion/src/data/cohort-international-contemporary.ts', 'r', encoding='utf-8') as f:
    text = f.read()

blocks = re.findall(r'(\{\s*id:\s*[\'"][^\'"]+[\'"][\s\S]*?\n  \},?)', text)
for b in blocks:
    is_template = (
        'battingAverage: 34.00' in b or 'battingAverage: 34.0,' in b or
        'battingAverage: 39.50' in b or 'battingAverage: 39.5,' in b or
        'battingAverage: 42.50' in b or 'battingAverage: 42.5,' in b or
        'highestScore: 102' in b or 'highestScore: 150' in b or 'highestScore: 185' in b or
        'bowlingAverage: 22.00' in b or 'bowlingAverage: 22.0,' in b or
        'bowlingAverage: 26.50' in b or 'bowlingAverage: 26.5,' in b
    )
    if is_template:
        pid = re.search(r'id:\s*[\'"]([^\'"]+)[\'"]', b).group(1)
        name = re.search(r'fullName:\s*[\'"]([^\'"]+)[\'"]', b).group(1)
        print(f"{pid} | {name}")
