import re

files = [
    'packages/data-ingestion/src/data/cohort-international-contemporary.ts',
    'packages/data-ingestion/src/data/cohort-international-legends.ts',
    'packages/data-ingestion/src/data/cohort-domestic-india.ts',
    'packages/data-ingestion/src/data/cohort-domestic-australia.ts',
    'packages/data-ingestion/src/data/cohort-domestic-england.ts',
    'packages/data-ingestion/src/data/cohort-domestic-world.ts',
]

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        text = f.read()

    blocks = re.findall(r'(\{\s*id:\s*[\'"][^\'"]+[\'"][\s\S]*?\n  \},?)', text)
    for b in blocks:
        if ('ballsBowled: 40' in b or 'ballsBowled: 60' in b) and 'wicketsTaken: 0' in b:
            pid = re.search(r'id:\s*[\'"]([^\'"]+)[\'"]', b).group(1)
            name = re.search(r'fullName:\s*[\'"]([^\'"]+)[\'"]', b).group(1)
            role = re.search(r'primaryRole:\s*[\'"]([^\'"]+)[\'"]', b).group(1)
            # print format details
            for fmt in ['TEST_RED_BALL', 'ODI', 'T20']:
                if fmt in b:
                    fmt_part = b[b.find(fmt):b.find(fmt)+300]
                    if ('ballsBowled: 40' in fmt_part or 'ballsBowled: 60' in fmt_part) and 'wicketsTaken: 0' in fmt_part:
                        print(f"[{fpath}] {name} ({pid}, {role}) in {fmt}:")
                        for line in fmt_part.split('\n')[:15]:
                            if any(k in line for k in ['ballsBowled', 'runsConceded', 'wicketsTaken', 'economyRate']):
                                print("   ", line.strip())
