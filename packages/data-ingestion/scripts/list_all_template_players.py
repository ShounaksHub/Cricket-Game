import re

with open('packages/data-ingestion/src/data/cohort-international-contemporary.ts', 'r', encoding='utf-8') as f:
    contemp_text = f.read()

with open('packages/data-ingestion/src/data/cohort-international-legends.ts', 'r', encoding='utf-8') as f:
    legends_text = f.read()

def list_template_players(text, name):
    blocks = re.findall(r'(\{\s*id:\s*[\'"][^\'"]+[\'"][\s\S]*?\n  \},?)', text)
    result = []
    for b in blocks:
        pid = re.search(r'id:\s*[\'"]([^\'"]+)[\'"]', b).group(1)
        pname = re.search(r'fullName:\s*[\'"]([^\'"]+)[\'"]', b).group(1)
        role = re.search(r'primaryRole:\s*[\'"]([^\'"]+)[\'"]', b).group(1)
        country = re.search(r'primaryNationality:\s*[\'"]([^\'"]+)[\'"]', b).group(1)
        is_template = (
            'battingAverage: 34.00' in b or 'battingAverage: 34.0,' in b or
            'battingAverage: 39.50' in b or 'battingAverage: 42.50' in b or
            'highestScore: 102' in b or 'highestScore: 150' in b or 'highestScore: 185' in b or
            'bowlingAverage: 22.00' in b or 'bowlingAverage: 26.50' in b
        )
        if is_template:
            result.append((pid, pname, role, country))
    return result

c_list = list_template_players(contemp_text, "Contemporary")
l_list = list_template_players(legends_text, "Legends")

print(f"Contemporary template count: {len(c_list)}")
for pid, name, role, country in c_list[:30]:
    print(f"  {pid} | {name:25} | {role:20} | {country}")

print(f"\nLegends template count: {len(l_list)}")
for pid, name, role, country in l_list[:30]:
    print(f"  {pid} | {name:25} | {role:20} | {country}")
