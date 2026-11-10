import re

# Load international names
intl_names = set()
for fn in ['cohort-international-contemporary.ts', 'cohort-international-legends.ts']:
    fp = f'packages/data-ingestion/src/data/{fn}'
    with open(fp, 'r', encoding='utf-8') as f:
        names = re.findall(r'fullName:\s*"([^"]+)"', f.read())
        for n in names:
            intl_names.add(n.strip().lower())

print(f"Loaded {len(intl_names)} international names.")

# Deduplicate domestic cohorts
domestic_cohorts = [
    'cohort-domestic-india.ts',
    'cohort-domestic-australia.ts',
    'cohort-domestic-england.ts',
    'cohort-domestic-world.ts',
]

for dc in domestic_cohorts:
    fp = f'packages/data-ingestion/src/data/{dc}'
    with open(fp, 'r', encoding='utf-8') as f:
        text = f.read()

    # Split into individual player objects
    # Player blocks start with "  {\n" and end with "  }," or "  }\n];"
    parts = re.split(r'\n  \},?\n', text)
    header = parts[0] # contains imports and export const ...
    body_items = []

    # Regex to find individual records
    records = re.findall(r'(\s*\{\s*\n\s*id:.*?)(?=\n\s*\{|\s*\];)', text, re.DOTALL)
    
    kept = []
    removed = []
    for r in records:
        m = re.search(r'fullName:\s*"([^"]+)"', r)
        if m:
            name = m.group(1).strip()
            if name.lower() in intl_names:
                removed.append(name)
            else:
                kept.append(r.strip().rstrip(','))

    print(f"{dc}: Removed {len(removed)} duplicate international players, Kept {len(kept)} domestic players.")

    # Reconstruct file
    with open(fp, 'w', encoding='utf-8') as f:
        const_name = dc.replace('cohort-', 'COHORT_').replace('.ts', '').replace('-', '_').upper()
        f.write("import type { RawPlayerIngestionInput } from '../ingestion-pipeline.js';\n\n")
        f.write(f"export const {const_name}: RawPlayerIngestionInput[] = [\n")
        for i, k in enumerate(kept):
            f.write("  " + k)
            if i < len(kept) - 1:
                f.write(",\n")
            else:
                f.write("\n")
        f.write("];\n")
