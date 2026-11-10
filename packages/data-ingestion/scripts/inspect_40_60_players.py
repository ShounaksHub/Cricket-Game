import sys
import re
sys.path.append('packages/data-ingestion/scripts')
from audit_database import all_records

for r in all_records:
    body = r['raw_body']
    if 'ballsBowled: 60' in body or 'ballsBowled: 40' in body:
        # check wickets
        m_balls = re.search(r'ballsBowled:\s*(40|60)', body)
        m_wkts = re.search(r'wicketsTaken:\s*(\d+)', body)
        print(f"[{r['cohort']}] {r['fullName']} ({r['id']}): balls={m_balls.group(1)}, wkts={m_wkts.group(1) if m_wkts else 'N/A'}")
