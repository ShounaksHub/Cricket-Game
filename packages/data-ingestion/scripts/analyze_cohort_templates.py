import re

with open('packages/data-ingestion/src/data/cohort-international-contemporary.ts', 'r', encoding='utf-8') as f:
    contemp_text = f.read()

with open('packages/data-ingestion/src/data/cohort-international-legends.ts', 'r', encoding='utf-8') as f:
    legends_text = f.read()

def analyze_cohort(text, name):
    blocks = re.findall(r'(\{\s*id:\s*[\'"][^\'"]+[\'"][\s\S]*?\n  \},?)', text)
    template_count = 0
    clean_count = 0
    for b in blocks:
        pid = re.search(r'id:\s*[\'"]([^\'"]+)[\'"]', b).group(1)
        pname = re.search(r'fullName:\s*[\'"]([^\'"]+)[\'"]', b).group(1)
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
    print(f"[{name}] Total: {len(blocks)}, Clean: {clean_count}, Template: {template_count}")

analyze_cohort(contemp_text, "Contemporary")
analyze_cohort(legends_text, "Legends")
