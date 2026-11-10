import re

names = set()
duplicates = []

for fn in ['cohort-international-contemporary.ts', 'cohort-international-legends.ts']:
    fp = f'packages/data-ingestion/src/data/{fn}'
    with open(fp, 'r', encoding='utf-8') as f:
        c = f.read()
    
    player_names = re.findall(r'fullName:\s*"([^"]+)"', c)
    for n in player_names:
        lower = n.strip().lower()
        if lower in names:
            duplicates.append(n)
        else:
            names.add(lower)

print(f"Total unique names: {len(names)}, Duplicates found: {len(duplicates)}")
if duplicates:
    print("Duplicates:", duplicates)
