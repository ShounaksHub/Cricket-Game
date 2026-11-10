for filename, cohort_name in [
    ('packages/data-ingestion/src/data/cohort-domestic-india.ts', 'Domestic India'),
    ('packages/data-ingestion/src/data/cohort-domestic-australia.ts', 'Domestic Australia'),
    ('packages/data-ingestion/src/data/cohort-domestic-england.ts', 'Domestic England'),
    ('packages/data-ingestion/src/data/cohort-domestic-world.ts', 'Domestic World'),
]:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # replace 'ballsBowled: 40,\n        runsConceded: 32,\n        wicketsTaken: 0,\n        bowlingAverage: null,\n        economyRate: 4.80,' with 0s
    # and similarly for ballsBowled: 40, runsConceded: 25...
    # Let's count how many ballsBowled: 40 or ballsBowled: 60 with wicketsTaken: 0 exist
    c40 = text.count('ballsBowled: 40')
    c60 = text.count('ballsBowled: 60')
    print(f"[{cohort_name}] ballsBowled: 40 count: {c40}, ballsBowled: 60 count: {c60}")
