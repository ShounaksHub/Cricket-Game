with open('packages/data-ingestion/src/data/cohort-international-legends.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('Shane Warne')
part = text[idx:idx+2000]
new_part = part.replace('fiveWicketHauls: 26,', 'fiveWicketHauls: 37,')
text = text[:idx] + new_part + text[idx+2000:]

with open('packages/data-ingestion/src/data/cohort-international-legends.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated Shane Warne fiveWicketHauls to 37 successfully.")
