import re

valid_bowling_styles = {
    'RIGHT_ARM_FAST',
    'RIGHT_ARM_FAST_MEDIUM',
    'RIGHT_ARM_MEDIUM',
    'LEFT_ARM_FAST',
    'LEFT_ARM_FAST_MEDIUM',
    'LEFT_ARM_MEDIUM',
    'RIGHT_ARM_OFF_BREAK',
    'RIGHT_ARM_LEG_BREAK',
    'LEFT_ARM_ORTHODOX',
    'LEFT_ARM_UNORTHODOX',
    'NONE'
}

for fn in ['cohort-international-contemporary.ts', 'cohort-international-legends.ts']:
    fp = f'packages/data-ingestion/src/data/{fn}'
    with open(fp, 'r', encoding='utf-8') as f:
        c = f.read()

    c = c.replace('"RIGHT_ARM_MEDIUM_FAST"', '"RIGHT_ARM_FAST_MEDIUM"')
    c = c.replace('"LEFT_ARM_MEDIUM_FAST"', '"LEFT_ARM_FAST_MEDIUM"')
    c = c.replace('"RIGHT_ARM_SLOW"', '"RIGHT_ARM_OFF_BREAK"')
    c = c.replace('"LEFT_ARM_SLOW"', '"LEFT_ARM_ORTHODOX"')

    with open(fp, 'w', encoding='utf-8') as f:
        f.write(c)

    # Check remaining styles
    styles = set(re.findall(r'bowlingStyle:\s*"([^"]+)"', c))
    invalid = styles - valid_bowling_styles
    print(f"{fn} invalid bowling styles: {invalid}")
