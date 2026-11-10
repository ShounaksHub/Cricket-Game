import re

with open('packages/data-ingestion/src/data/cohort-domestic-india.ts', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'\{\s*id:\s*[\'"]f1e30000-0001-4000-8000-000000000001[\'"][\s\S]*?\n  \},?', text)
if m:
    print(m.group(0))
