with open('packages/data-ingestion/src/data/cohort-international-legends.ts', 'r', encoding='utf-8') as f:
    c = f.read()

# Replace Bradman's Test stats
old_bradman = """    rawStatsByFormat: {
      TEST_RED_BALL: {
        matchesPlayed: 52,
        inningsBatted: 88,
        runsScored: 3801,
        highestScore: 230,
        isHighestScoreNotOut: true,
        battingAverage: 48.00,
        strikeRate: 52.0,
        centuries: 12,
        halfCenturies: 20,
        fours: 418,
        sixes: 19,
        ballsBowled: 60,
        runsConceded: 35,
        wicketsTaken: 0,
        bowlingAverage: null,
        economyRate: 3.50,
        bowlingStrikeRate: null,
        fiveWicketHauls: 0,
        catchesTaken: 39,
        stumpingsMade: 0,
      },
    },"""

new_bradman = """    rawStatsByFormat: {
      TEST_RED_BALL: {
        matchesPlayed: 52,
        inningsBatted: 80,
        runsScored: 6996,
        highestScore: 334,
        isHighestScoreNotOut: false,
        battingAverage: 99.94,
        strikeRate: 70.0,
        centuries: 29,
        halfCenturies: 13,
        fours: 618,
        sixes: 6,
        ballsBowled: 160,
        runsConceded: 72,
        wicketsTaken: 2,
        bowlingAverage: 36.00,
        economyRate: 2.70,
        bowlingStrikeRate: 80.0,
        fiveWicketHauls: 0,
        catchesTaken: 32,
        stumpingsMade: 0,
      },
    },"""

if old_bradman in c:
    c = c.replace(old_bradman, new_bradman)
    print("Updated Bradman Test stats to historic 99.94 average.")
else:
    print("Could not find exact old Bradman snippet, searching substring...")
    # fallback regex replace for Bradman block
    import re
    p = re.compile(r'(cricsheetId:\s*"donald_bradman",.*?battingAverage:\s*)48\.00', re.DOTALL)
    c = p.sub(r'\g<1>99.94', c)
    p2 = re.compile(r'(cricsheetId:\s*"donald_bradman",.*?runsScored:\s*)\d+', re.DOTALL)
    c = p2.sub(r'\g<1>6996', c)
    p3 = re.compile(r'(cricsheetId:\s*"donald_bradman",.*?centuries:\s*)\d+', re.DOTALL)
    c = p3.sub(r'\g<1>29', c)
    p4 = re.compile(r'(cricsheetId:\s*"donald_bradman",.*?highestScore:\s*)\d+', re.DOTALL)
    c = p4.sub(r'\g<1>334', c)
    print("Applied regex update for Bradman.")

# Also update Shane Warne's wickets to 708
c = c.replace(
    'wicketsTaken: 551,\n        bowlingAverage: 24.50,',
    'wicketsTaken: 708,\n        bowlingAverage: 25.41,'
)

with open('packages/data-ingestion/src/data/cohort-international-legends.ts', 'w', encoding='utf-8') as f:
    f.write(c)

print("Saved cohort-international-legends.ts.")
