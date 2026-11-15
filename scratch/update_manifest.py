import json

with open('scratch/batch3_players.json', 'r', encoding='utf-8') as f:
    batch3 = json.load(f)

manifest_path = 'apps/web/lib/realistic-portrait-manifest.ts'
with open(manifest_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '  "f1e60000-005a-4000-8000-00000000005a": "/assets/players/realistic/f1e60000-005a-4000-8000-00000000005a.jpg"'

new_lines = []
for p in batch3:
    pid = p['id']
    name = p['fullName']
    if f'"{pid}"' not in content:
        new_lines.append(f'  "{pid}": "/assets/players/realistic/{pid}.jpg", // {name}')

print(f"Adding {len(new_lines)} entries to REALISTIC_INDIVIDUAL_PORTRAITS")
replacement = target + ",\n  // Batch 3 (100 Authentic Real-Photo Cartoon Portraits)\n" + ",\n".join(new_lines)

if target in content:
    updated = content.replace(target, replacement, 1)
    with open(manifest_path, 'w', encoding='utf-8') as f:
        f.write(updated)
    print("Successfully updated manifest!")
else:
    print("Could not find target line in manifest.")
