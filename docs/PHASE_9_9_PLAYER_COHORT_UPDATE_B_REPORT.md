# Player Cohort Update B — International Legends

**Scope:** `packages/data-ingestion/src/data/cohort-international-legends.ts` only, plus a dedicated regression test.  
**Verification date:** 2026-11-11.  
**Other cohorts/UI/engine:** unchanged.

## Record changed

| Player | Stable UUID | Format | Field | Before | After | Authority |
|---|---|---|---|---:|---:|---|
| Shane Warne | `f1e20000-0003-4000-8000-000000000003` | ODI | `wicketsTaken` | 281 | 293 | ICC retired-player record |

ICC’s 4 March 2022 release records Warne’s career as 145 Tests with 708 wickets and 194 ODIs with 293 wickets. The existing Test values already matched; only the ODI wicket total was corrected. Source: [ICC, “ICC expresses sadness at the sudden passing of Shane Warne”](https://www.icc-cricket.com/media-releases/icc-expresses-sadness-at-the-sudden-passing-of-shane-warne), published 4 March 2022 and checked 11 November 2026.

## Cross-checks retained

- Donald Bradman: 52 Tests, 6,996 runs, 99.94 average, 29 centuries; matches ICC’s Hall of Fame record.
- Brian Lara: 131 Tests, 11,953 runs, 52.88 average; 299 ODIs, 10,405 runs; matches ICC’s Hall of Fame record.
- Glenn McGrath: 124 Tests, 563 wickets at 21.64; 250 ODIs, 381 wickets at 22.02; matches ICC’s Hall of Fame record.
- Muttiah Muralitharan: 133 Tests, 800 wickets; 350 ODIs, 534 wickets; matches ICC’s Hall of Fame record.
- Wasim Akram: 104 Tests, 414 wickets; 356 ODIs, 502 wickets; matches ICC’s Hall of Fame record.

Sources checked: [ICC Bradman profile](https://www.icc-cricket.com/rankings/644/don-bradman), [ICC Lara Hall of Fame](https://www.icc-cricket.com/hall-of-fame/hall-of-famers/hall-of-famer-brian-lara?appview=true), [ICC McGrath Hall of Fame](https://www.icc-cricket.com/hall-of-fame/hall-of-famers/hall-of-famer-glenn-mcgrath), [ICC Muralitharan profile](https://www.icc-cricket.com/rankings/2159/muttiah-muralitharan), and [ICC Akram profile](https://www.icc-cricket.com/rankings/3154/wasim-akram).

## Tests executed

- `pnpm --filter @cricket/data-ingestion test -- international-legends-update-b.test.ts --run` — passed.
- `pnpm --filter @cricket/data-ingestion test -- data-quality-audit.test.ts --run` — passed.

## Blockers and data limits

- This update was limited to retired international legends with a directly verifiable authoritative figure.
- No fields were filled from estimates or inferred from ratings.
- The shared schema has no dedicated ICC/ESPN source enum and no source-verification date field. The existing `sourceName`, `sourceUri`, `datasetVersion`, and `verificationStatus` fields were preserved.
- A complete 277-player field-by-field reconciliation against live Statsguru/ESPN pages was not claimed; only the records and fields listed above were changed or cross-checked.
