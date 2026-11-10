import re
import sys
from player_stats_db import KEY_PLAYERS
from player_stats_db_part2 import ADDITIONAL_PLAYERS

ALL_UPDATES = {**KEY_PLAYERS, **ADDITIONAL_PLAYERS}

print(f"Total curated players to update: {len(ALL_UPDATES)}")

def format_stat_block(stats):
    lines = []
    lines.append("    rawStatsByFormat: {")
    for fmt, d in stats.items():
        lines.append(f"      {fmt}: {{")
        for k, v in d.items():
            if v is None:
                val_str = "null"
            elif isinstance(v, bool):
                val_str = "true" if v else "false"
            elif isinstance(v, float):
                val_str = f"{v:.2f}"
            else:
                val_str = str(v)
            lines.append(f"        {k}: {val_str},")
        lines.append("      },")
    lines.append("    },")
    return "\n".join(lines)

def update_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    updated_count = 0
    for pid, data in ALL_UPDATES.items():
        if pid in content:
            # find player block
            pat = r'(\{\s*id:\s*[\'"]' + pid + r'[\'"][\s\S]*?\n  \},?)'
            m = re.search(pat, content)
            if not m:
                continue
            block = m.group(1)
            # update sourceUri if present
            if "sourceUri" in data:
                block = re.sub(r'sourceUri:\s*[\'"][^\'"]*[\'"]', f"sourceUri: '{data['sourceUri']}'", block)
            # update verificationStatus to EXPERT_AUDITED
            block = re.sub(r'verificationStatus:\s*[\'"][^\'"]*[\'"]', "verificationStatus: 'EXPERT_AUDITED'", block)
            
            # replace rawStatsByFormat
            new_stats_str = format_stat_block(data['rawStatsByFormat'])
            block = re.sub(r'    rawStatsByFormat:\s*\{[\s\S]*?\n    \},', new_stats_str, block)
            
            # replace in content
            content = content[:m.start()] + block + content[m.end():]
            updated_count += 1
            print(f"  Updated {pid}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"[{filepath}] Total updated: {updated_count}")

update_file('packages/data-ingestion/src/data/cohort-international-contemporary.ts')
update_file('packages/data-ingestion/src/data/cohort-international-legends.ts')
