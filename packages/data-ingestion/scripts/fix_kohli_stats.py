fp = 'packages/data-ingestion/src/data/cohort-international-contemporary.ts'
with open(fp, 'r', encoding='utf-8') as f:
    c = f.read()

old_kohli_odi = """      ODI: {
        matchesPlayed: 295,
        inningsBatted: 271,
        runsScored: 9634,
        highestScore: 150,
        isHighestScoreNotOut: false,
        battingAverage: 39.50,
        strikeRate: 89.0,
        centuries: 24,
        halfCenturies: 77,
        fours: 867,
        sixes: 115,
        ballsBowled: 40,
        runsConceded: 32,
        wicketsTaken: 0,
        bowlingAverage: null,
        economyRate: 4.80,
        bowlingStrikeRate: null,
        fiveWicketHauls: 0,
        catchesTaken: 132,
        stumpingsMade: 0,
      },"""

new_kohli_odi = """      ODI: {
        matchesPlayed: 295,
        inningsBatted: 283,
        runsScored: 13906,
        highestScore: 183,
        isHighestScoreNotOut: false,
        battingAverage: 58.18,
        strikeRate: 93.5,
        centuries: 50,
        halfCenturies: 72,
        fours: 1302,
        sixes: 151,
        ballsBowled: 641,
        runsConceded: 680,
        wicketsTaken: 5,
        bowlingAverage: 136.00,
        economyRate: 6.36,
        bowlingStrikeRate: 128.2,
        fiveWicketHauls: 0,
        catchesTaken: 154,
        stumpingsMade: 0,
      },"""

if old_kohli_odi in c:
    c = c.replace(old_kohli_odi, new_kohli_odi)
    with open(fp, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated Virat Kohli ODI stats successfully.")
else:
    print("Error: Old Kohli ODI snippet not found!")
