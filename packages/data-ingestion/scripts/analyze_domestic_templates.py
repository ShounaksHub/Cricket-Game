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
    template_count = 0
    clean_count = 0
    for b in blocks:
        is_template = (
            'battingAverage: 34.00' in b or 'battingAverage: 34.0,' in b or
            'battingAverage: 39.50' in b or 'battingAverage: 42.50' in b or
            'highestScore: 102' in b or 'highestScore: 150' in b or 'highestScore: 185' in b or
            'bowlingAverage: 22.00' in b or 'bowlingAverage: 26.50' in b
        )
        if is_template:
            template_count += 1
        else:
            clean_count += 1
    print(f"[{cohort_name}] Total: {len(blocks)}, Clean: {clean_count}, Template: {template_count}")
