import json

with open('scratch/batch5_scan_results.json', 'r', encoding='utf-8') as f:
    batch5 = json.load(f)

manifest_path = 'apps/web/lib/realistic-portrait-manifest.ts'
with open(manifest_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Marker at the end of REALISTIC_INDIVIDUAL_PORTRAITS
# Look for the last player from batch 4 (f1e10000-00d9-4000-8000-0000000000d9 Prabath Jayasuriya)
target = '  "f1e10000-00d9-4000-8000-0000000000d9": "/assets/players/realistic/f1e10000-00d9-4000-8000-0000000000d9.jpg", // Prabath Jayasuriya'

new_lines = []
for p in batch5:
    pid = p['id']
    name = p['fullName']
    if f'"{pid}"' not in content:
        new_lines.append(f'  "{pid}": "/assets/players/realistic/{pid}.jpg", // {name}')

print(f"Adding {len(new_lines)} entries to REALISTIC_INDIVIDUAL_PORTRAITS")
replacement = target + ",\n  // Batch 5 (200 Authentic Real-Photo & Cartoon Portraits)\n" + ",\n".join(new_lines)

if target in content:
    updated = content.replace(target, replacement, 1)
    with open(manifest_path, 'w', encoding='utf-8') as f:
        f.write(updated)
    print("Successfully updated manifest with Batch 5!")
else:
    print("Could not find target line in manifest. Trying fallback closing brace...")
    idx = content.find('export const REALISTIC_INDIVIDUAL_PORTRAITS')
    brace_idx = content.find('};', idx)
    if brace_idx != -1:
        part1 = content[:brace_idx].rstrip()
        part2 = content[brace_idx:]
        addition = ",\n  // Batch 5 (200 Authentic Real-Photo & Cartoon Portraits)\n" + ",\n".join(new_lines) + "\n"
        with open(manifest_path, 'w', encoding='utf-8') as f:
            f.write(part1 + addition + part2)
        print("Updated manifest via fallback closing brace!")
