import re

# 1. Strip ' (Domestic)' and ' (USA)' from displayNames in all cohort files
for path in [
    'packages/data-ingestion/src/data/cohort-domestic-india.ts',
    'packages/data-ingestion/src/data/cohort-domestic-australia.ts',
    'packages/data-ingestion/src/data/cohort-domestic-england.ts',
    'packages/data-ingestion/src/data/cohort-domestic-world.ts',
]:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace(' (Domestic)', '').replace('(Domestic)', '').replace(' (USA)', '').replace('(USA)', '')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
print("Stripped (Domestic) from all domestic cohort displayNames.")

# 2. Replace Ottniel Baartman with Shaun von Berg in cohort-domestic-world.ts
with open('packages/data-ingestion/src/data/cohort-domestic-world.ts', 'r', encoding='utf-8') as f:
    world_text = f.read()

vonberg_block = """{
    id: "f1e60000-0017-4000-8000-000000000017",
    cricsheetId: "world_dom_shaun_von_berg",
    fullName: "Shaun von Berg",
    displayName: "S. von Berg",
    primaryNationality: "South Africa",
    primaryRole: "SPIN_BOWLER",
    battingHand: "RIGHT_HAND",
    bowlingStyle: "RIGHT_ARM_LEG_BREAK",
    isWicketkeeper: false,
    careerDebutYear: 2008,
    isActive: true,
    careerCategory: "DOMESTIC_ONLY",
    isDomesticOnly: true,
    competitions: ["CSA_4_DAY", "SA20"],
    sourceName: "CRICSHEET",
    sourceUri: "https://cricsheet.org/matches/",
    datasetVersion: "cricsheet-2026-v1",
    verificationStatus: "EXPERT_AUDITED",
    rawStatsByFormat: {
      TEST_RED_BALL: {
        matchesPlayed: 138,
        inningsBatted: 195,
        runsScored: 3450,
        highestScore: 104,
        isHighestScoreNotOut: false,
        battingAverage: 24.50,
        strikeRate: 52.0,
        centuries: 1,
        halfCenturies: 14,
        fours: 380,
        sixes: 22,
        ballsBowled: 26800,
        runsConceded: 12900,
        wicketsTaken: 468,
        bowlingAverage: 27.60,
        economyRate: 2.88,
        bowlingStrikeRate: 57.2,
        fiveWicketHauls: 23,
        catchesTaken: 75,
        stumpingsMade: 0
      },
      T20: {
        matchesPlayed: 85,
        inningsBatted: 45,
        runsScored: 420,
        highestScore: 38,
        isHighestScoreNotOut: true,
        battingAverage: 15.00,
        strikeRate: 118.0,
        centuries: 0,
        halfCenturies: 0,
        fours: 32,
        sixes: 14,
        ballsBowled: 1740,
        runsConceded: 2088,
        wicketsTaken: 88,
        bowlingAverage: 23.70,
        economyRate: 7.20,
        bowlingStrikeRate: 19.7,
        fiveWicketHauls: 0,
        catchesTaken: 25,
        stumpingsMade: 0
      }
    }
  },"""

world_text = re.sub(
    r'\{\s*id:\s*["\']f1e60000-0017-4000-8000-000000000017["\'][\s\S]*?\n  \},?',
    vonberg_block,
    world_text
)
with open('packages/data-ingestion/src/data/cohort-domestic-world.ts', 'w', encoding='utf-8') as f:
    f.write(world_text)
print("Replaced Ottniel Baartman with Shaun von Berg in cohort-domestic-world.ts.")

# 3. Update Virat Kohli's Test stats in cohort-international-contemporary.ts
with open('packages/data-ingestion/src/data/cohort-international-contemporary.ts', 'r', encoding='utf-8') as f:
    contemp_text = f.read()

kohli_block = """{
    id: "f1e10000-0002-4000-8000-000000000002",
    cricsheetId: "vkohli_ind",
    wikidataId: "Q213854",
    fullName: "Virat Kohli",
    displayName: "V. Kohli",
    dateOfBirth: "1988-11-05",
    primaryNationality: "India",
    primaryRole: "TOP_ORDER_BATTER",
    battingHand: "RIGHT_HAND",
    bowlingStyle: "RIGHT_ARM_MEDIUM",
    isWicketkeeper: false,
    careerDebutYear: 2008,
    isActive: true,
    careerCategory: "INTERNATIONAL",
    isDomesticOnly: false,
    competitions: ["IPL", "T20_WORLD_CUP", "ODI_WORLD_CUP", "WTC"],
    sourceName: "CRICSHEET",
    sourceUri: "https://stats.espncricinfo.com/ci/engine/player/253802.html",
    datasetVersion: "cricsheet-2026-v1",
    verificationStatus: "EXPERT_AUDITED",
    rawStatsByFormat: {
      TEST_RED_BALL: {
        matchesPlayed: 118,
        inningsBatted: 201,
        runsScored: 9040,
        highestScore: 254,
        isHighestScoreNotOut: true,
        battingAverage: 48.34,
        strikeRate: 55.60,
        centuries: 29,
        halfCenturies: 31,
        fours: 1012,
        sixes: 26,
        ballsBowled: 175,
        runsConceded: 84,
        wicketsTaken: 0,
        bowlingAverage: null,
        economyRate: 2.88,
        bowlingStrikeRate: null,
        fiveWicketHauls: 0,
        catchesTaken: 115,
        stumpingsMade: 0,
      },
      ODI: {
        matchesPlayed: 295,
        inningsBatted: 283,
        runsScored: 13906,
        highestScore: 183,
        isHighestScoreNotOut: false,
        battingAverage: 58.18,
        strikeRate: 93.54,
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
      },
      T20: {
        matchesPlayed: 125,
        inningsBatted: 117,
        runsScored: 4188,
        highestScore: 122,
        isHighestScoreNotOut: true,
        battingAverage: 48.69,
        strikeRate: 137.04,
        centuries: 1,
        halfCenturies: 38,
        fours: 369,
        sixes: 124,
        ballsBowled: 146,
        runsConceded: 198,
        wicketsTaken: 4,
        bowlingAverage: 49.50,
        economyRate: 8.13,
        bowlingStrikeRate: 36.5,
        fiveWicketHauls: 0,
        catchesTaken: 54,
        stumpingsMade: 0,
      },
    },
  },"""

contemp_text = re.sub(
    r'\{\s*id:\s*["\']f1e10000-0002-4000-8000-000000000002["\'][\s\S]*?\n  \},?',
    kohli_block,
    contemp_text
)
with open('packages/data-ingestion/src/data/cohort-international-contemporary.ts', 'w', encoding='utf-8') as f:
    f.write(contemp_text)
print("Updated Virat Kohli's Test, ODI, and T20 career stats.")
