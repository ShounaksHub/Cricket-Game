with open('packages/data-ingestion/src/data/cohort-domestic-world.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('"USA"', '"United States"').replace("'USA'", "'United States'")

with open('packages/data-ingestion/src/data/cohort-domestic-world.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Unified USA -> United States")
