import re
import json
import uuid
import glob
from collections import defaultdict

cohort_files = [
    ('International Contemporary', 'packages/data-ingestion/src/data/cohort-international-contemporary.ts'),
    ('International Legends', 'packages/data-ingestion/src/data/cohort-international-legends.ts'),
    ('Domestic India', 'packages/data-ingestion/src/data/cohort-domestic-india.ts'),
    ('Domestic Australia', 'packages/data-ingestion/src/data/cohort-domestic-australia.ts'),
    ('Domestic England', 'packages/data-ingestion/src/data/cohort-domestic-england.ts'),
    ('Domestic World', 'packages/data-ingestion/src/data/cohort-domestic-world.ts'),
]

def parse_cohort_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the array content
    match = re.search(r'export const \w+:\s*RawPlayerIngestionInput\[\]\s*=\s*(\[[\s\S]*\]);', content)
    if not match:
        raise ValueError(f"Could not find array in {filepath}")
    
    array_str = match.group(1)
    
    # We can parse the individual object blocks
    # Split on `\n  {\n` or similar
    records = []
    # Use regex to extract each object
    object_matches = re.finditer(r'\{\s*id:\s*[\'"]([^\'"]+)[\'"]([\s\S]*?)\n  \},?', array_str)
    for m in object_matches:
        pid = m.group(1)
        body = m.group(2)
        
        # parse key fields
        def get_field(field_name, default=None):
            fm = re.search(r'\b' + field_name + r':\s*([^\n,]+)', body)
            if fm:
                val = fm.group(1).strip()
                if val.startswith("'") and val.endswith("'"):
                    return val[1:-1]
                if val.startswith('"') and val.endswith('"'):
                    return val[1:-1]
                if val == 'true': return True
                if val == 'false': return False
                try:
                    if '.' in val: return float(val)
                    return int(val)
                except:
                    return val
            return default

        # competitions array
        comp_m = re.search(r'competitions:\s*\[([^\]]*)\]', body)
        competitions = []
        if comp_m:
            competitions = [c.strip().strip("'\"") for c in comp_m.group(1).split(',') if c.strip()]

        rec = {
            'id': pid,
            'fullName': get_field('fullName'),
            'displayName': get_field('displayName'),
            'primaryNationality': get_field('primaryNationality'),
            'primaryRole': get_field('primaryRole'),
            'secondaryRole': get_field('secondaryRole'),
            'battingHand': get_field('battingHand'),
            'bowlingStyle': get_field('bowlingStyle'),
            'isWicketkeeper': get_field('isWicketkeeper', False),
            'careerDebutYear': get_field('careerDebutYear'),
            'careerRetirementYear': get_field('careerRetirementYear'),
            'isActive': get_field('isActive', False),
            'careerCategory': get_field('careerCategory'),
            'isDomesticOnly': get_field('isDomesticOnly', False),
            'competitions': competitions,
            'sourceName': get_field('sourceName'),
            'sourceUri': get_field('sourceUri'),
            'datasetVersion': get_field('datasetVersion'),
            'verificationStatus': get_field('verificationStatus'),
            'cricsheetId': get_field('cricsheetId'),
            'wikidataId': get_field('wikidataId'),
            'dateOfBirth': get_field('dateOfBirth'),
            'raw_body': body
        }
        records.append(rec)
    return records

all_records = []
by_cohort = {}

for name, path in cohort_files:
    recs = parse_cohort_file(path)
    by_cohort[name] = recs
    for r in recs:
        r['cohort'] = name
    all_records.extend(recs)

print(f"Total parsed records: {len(all_records)}")
for name, recs in by_cohort.items():
    print(f"  {name}: {len(recs)} records")

# 1. UUID Audit
invalid_uuids = []
uuid_counts = defaultdict(list)
for r in all_records:
    try:
        u = uuid.UUID(r['id'])
        if str(u) != r['id'].lower():
            invalid_uuids.append((r['id'], "Casing mismatch"))
    except Exception as e:
        invalid_uuids.append((r['id'], str(e)))
    uuid_counts[r['id']].append(r['fullName'])

dup_uuids = {k: v for k, v in uuid_counts.items() if len(v) > 1}
print(f"\n--- UUID Audit ---")
print(f"Invalid UUIDs: {len(invalid_uuids)}")
print(f"Duplicate UUIDs: {len(dup_uuids)}")

# 2. Duplicate Names / Identities Audit
def normalize_name(n):
    if not n: return ""
    n = n.lower().strip()
    n = re.sub(r'[^a-z0-9 ]', '', n)
    # normalize common nicknames/spellings
    replacements = {
        'mohammed': 'mohammad',
        'mohammad': 'mohammad',
        'muhammad': 'mohammad',
        'viv': 'vivian',
        'garry': 'garfield',
    }
    words = [replacements.get(w, w) for w in n.split()]
    return " ".join(words)

name_map = defaultdict(list)
norm_map = defaultdict(list)
cricsheet_map = defaultdict(list)

for r in all_records:
    name_map[r['fullName']].append(r)
    norm = normalize_name(r['fullName'])
    norm_map[norm].append(r)
    if r['cricsheetId']:
        cricsheet_map[r['cricsheetId']].append(r)

exact_dup_names = {k: v for k, v in name_map.items() if len(v) > 1}
norm_dup_names = {k: v for k, v in norm_map.items() if len(v) > 1}
dup_cricsheet = {k: v for k, v in cricsheet_map.items() if len(v) > 1}

print(f"\n--- Identity Duplication Audit ---")
print(f"Exact Duplicate Full Names: {len(exact_dup_names)}")
for k, v in exact_dup_names.items():
    print(f"  Exact dup: {k} -> {[x['cohort'] + ':' + x['id'] for x in v]}")

print(f"Normalized Duplicate Names (Fuzzy/Alias): {len(norm_dup_names)}")
for k, v in norm_dup_names.items():
    if len(v) > 1:
        print(f"  Norm dup: '{k}' -> {[x['fullName'] + ' (' + x['cohort'] + ')' for x in v]}")

print(f"Duplicate Cricsheet IDs: {len(dup_cricsheet)}")
for k, v in dup_cricsheet.items():
    print(f"  Cricsheet dup: {k} -> {[x['fullName'] for x in v]}")

# 3. Role and Bowling Style Audit
valid_roles = {'TOP_ORDER_BATTER', 'MIDDLE_ORDER_BATTER', 'WICKETKEEPER_BATTER', 'BATTING_ALL_ROUNDER', 'BOWLING_ALL_ROUNDER', 'FAST_BOWLER', 'SPIN_BOWLER'}
valid_batting_hands = {'RIGHT_HAND', 'LEFT_HAND'}
valid_bowling_styles = {'RIGHT_ARM_FAST', 'RIGHT_ARM_FAST_MEDIUM', 'RIGHT_ARM_MEDIUM_FAST', 'RIGHT_ARM_MEDIUM', 'RIGHT_ARM_OFF_BREAK', 'RIGHT_ARM_LEG_BREAK', 'LEFT_ARM_FAST', 'LEFT_ARM_FAST_MEDIUM', 'LEFT_ARM_MEDIUM', 'LEFT_ARM_ORTHODOX', 'LEFT_ARM_UNORTHODOX', 'NONE'}

invalid_roles = [r for r in all_records if r['primaryRole'] not in valid_roles]
invalid_hands = [r for r in all_records if r['battingHand'] not in valid_batting_hands]
invalid_bowling = [r for r in all_records if r['bowlingStyle'] not in valid_bowling_styles]

print(f"\n--- Role & Style Validity Audit ---")
print(f"Invalid primaryRole: {len(invalid_roles)}")
print(f"Invalid battingHand: {len(invalid_hands)}")
print(f"Invalid bowlingStyle: {len(invalid_bowling)}")
if invalid_bowling:
    for r in invalid_bowling[:5]:
        print(f"  Bad bowling style: {r['fullName']} -> {r['bowlingStyle']}")

# 4. Career Category & Domestic Flag Audit
cat_mismatches = []
for r in all_records:
    cat = r['careerCategory']
    dom = r['isDomesticOnly']
    if cat == 'DOMESTIC_ONLY' and not dom:
        cat_mismatches.append((r['fullName'], 'DOMESTIC_ONLY category but isDomesticOnly is False'))
    if dom and cat != 'DOMESTIC_ONLY':
        cat_mismatches.append((r['fullName'], f'isDomesticOnly is True but category is {cat}'))

print(f"\n--- Category & Domestic Flag Audit ---")
print(f"Category mismatches: {len(cat_mismatches)}")
for m in cat_mismatches[:5]:
    print(f"  {m[0]}: {m[1]}")

# 5. Active vs Retirement Status Audit
status_anomalies = []
for r in all_records:
    active = r['isActive']
    ret_year = r['careerRetirementYear']
    deb_year = r['careerDebutYear']
    if active and ret_year and ret_year < 2024:
        status_anomalies.append((r['fullName'], f'Active is True but retired in {ret_year}'))
    if not active and not ret_year and deb_year and deb_year < 2010:
        # Possibly retired without retirement year
        pass

print(f"\n--- Active vs Retirement Status Audit ---")
print(f"Status anomalies: {len(status_anomalies)}")
for a in status_anomalies[:5]:
    print(f"  {a[0]}: {a[1]}")

# 6. Country Representation
country_counts = defaultdict(int)
for r in all_records:
    country_counts[r['primaryNationality']] += 1

print(f"\n--- Country Distribution ({len(country_counts)} countries) ---")
for c, cnt in sorted(country_counts.items(), key=lambda x: -x[1]):
    print(f"  {c}: {cnt}")
