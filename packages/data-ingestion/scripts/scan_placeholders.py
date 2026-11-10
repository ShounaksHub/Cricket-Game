import os
import re
import sys

# Force utf-8 stdout
sys.stdout.reconfigure(encoding='utf-8')

PATTERNS = [
    'TODO', 'FIXME', 'HACK', 'PLACEHOLDER', 'MOCK', 'DUMMY', 'SAMPLE',
    'HARDCODED', 'Coming Soon', 'Lorem ipsum'
]

regex = re.compile(r'\b(' + '|'.join(PATTERNS) + r')\b', re.IGNORECASE)

EXCLUDE_DIRS = {'node_modules', '.git', '.next', 'dist', 'build', '.turbo', '.system_generated'}

findings = []

for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
    for file in files:
        if file.endswith(('.ts', '.tsx', '.js', '.jsx', '.json', '.prisma', '.md')):
            path = os.path.join(root, file)
            # exclude this script itself
            if 'scan_placeholders.py' in path:
                continue
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    for line_no, line in enumerate(f, 1):
                        match = regex.search(line)
                        if match:
                            findings.append((path, line_no, match.group(0), line.strip()))
            except Exception as e:
                pass

print(f"Total findings across codebase: {len(findings)}")
for path, line_no, term, text in findings:
    # sanitize characters for printing
    sanitized = text.encode('ascii', 'replace').decode('ascii')
    print(f"{path}:{line_no} [{term}] {sanitized[:120]}")
