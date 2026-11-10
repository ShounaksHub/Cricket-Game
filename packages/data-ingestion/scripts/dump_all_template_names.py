import re

with open('packages/data-ingestion/src/data/cohort-international-contemporary.ts', 'r', encoding='utf-8') as f:
    contemp_text = f.read()

with open('packages/data-ingestion/src/data/cohort-international-legends.ts', 'r', encoding='utf-8') as f:
    legends_text = f.read()

def get_template_names(text):
    blocks = re.findall(r'(\{\s*id:\s*[\'"][^\'"]+[\'"][\s\S]*?\n  \},?)', text)
    result = []
    for b in blocks:
        pid = re.search(r'id:\s*[\'"]([^\'"]+)[\'"]', b).group(1)
        pname = re.search(r'fullName:\s*[\'"]([^\'"]+)[\'"]', b).group(1)
        role = re.search(r'primaryRole:\s*[\'"]([^\'"]+)[\'"]', b).group(1)
        is_template = (
            'battingAverage: 34.00' in b or 'battingAverage: 34.0,' in b or
            'battingAverage: 39.50' in b or 'battingAverage: 42.50' in b or
            'highestScore: 102' in b or 'highestScore: 150' in b or 'highestScore: 185' in b or
            'bowlingAverage: 22.00' in b or 'bowlingAverage: 26.50' in b
        )
        if is_template:
            result.append((pid, pname, role))
    return result

c_names = get_template_names(contemp_text)
l_names = get_template_names(legends_text)

print(f"Total Contemporary template players: {len(c_names)}")
print("All Contemporary template players:")
for i, (pid, name, role) in enumerate(c_names):
    print(f"  {i+1:3d}. {pid} | {name} ({role})")

print(f"\nTotal Legends template players: {len(l_names)}")
print("All Legends template players:")
for i, (pid, name, role) in enumerate(l_names):
    print(f"  {i+1:3d}. {pid} | {name} ({role})")
