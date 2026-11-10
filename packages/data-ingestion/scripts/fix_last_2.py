import re

with open('packages/data-ingestion/src/data/cohort-international-contemporary.ts', 'r', encoding='utf-8') as f:
    text = f.read()

for name in ['Dinesh Chandimal', 'Craig Ervine']:
    m = re.search(r'(\{\s*id:[^}]+fullName:\s*[\'"]' + name + r'[\'"][\s\S]*?\n  \},?)', text)
    if m:
        b = m.group(1)
        # replace any remaining exact match
        b_new = b.replace('battingAverage: 34.00,', 'battingAverage: 31.85,')
        b_new = b_new.replace('battingAverage: 39.50,', 'battingAverage: 37.40,')
        b_new = b_new.replace('battingAverage: 42.50,', 'battingAverage: 43.15,')
        b_new = b_new.replace('highestScore: 102,', 'highestScore: 82,')
        b_new = b_new.replace('highestScore: 150,', 'highestScore: 147,')
        b_new = b_new.replace('highestScore: 185,', 'highestScore: 162,')
        text = text.replace(b, b_new)

with open('packages/data-ingestion/src/data/cohort-international-contemporary.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated Dinesh Chandimal and Craig Ervine")
