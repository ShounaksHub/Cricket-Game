import re

cohorts = ['cohort-international-contemporary.ts', 'cohort-international-legends.ts']
player_map = {}

for fn in cohorts:
    with open(f'packages/data-ingestion/src/data/{fn}', 'r', encoding='utf-8') as f:
        content = f.read()
    
    matches = re.findall(r'id:\s*"([^"]+)"[\s\S]*?fullName:\s*"([^"]+)"', content)
    for pid, name in matches:
        player_map[name.strip().lower()] = (pid, name)

targets = [
  'sachin tendulkar',
  'vivian richards',
  'donald bradman',
  'steve smith',
  'jos buttler',
  'garfield sobers',
  'ben stokes',
  'wasim akram',
  'shane warne',
  'jasprit bumrah',
  'rashid khan',
]

for t in targets:
    found = False
    for k, (pid, orig_name) in player_map.items():
        if t in k or (t.split()[-1] in k and t.split()[0] in k):
            print(f"'{pid}', // {orig_name}")
            found = True
            break
    if not found:
        print(f"NOT FOUND: {t}")
