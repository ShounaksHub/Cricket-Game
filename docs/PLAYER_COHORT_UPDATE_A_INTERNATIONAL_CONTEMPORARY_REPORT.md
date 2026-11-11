# Player Cohort Update A — International Contemporary

**Audit date:** 2026-11-11  
**Scope:** `packages/data-ingestion/src/data/cohort-international-contemporary.ts` only  
**Policy:** Update only figures directly verified from an authoritative source. Preserve UUIDs and schema.

## Result

No records were numerically updated.

This is an evidence-based block, not an assertion that every existing statistic is current. The cohort contains 304 records, but the source metadata does not provide a fetchable, player-specific authoritative source for most records:

| Audit item | Count |
|---|---:|
| Contemporary records audited for scope/provenance | 304 |
| Records with player-specific legacy ESPN Statsguru URI | 33 |
| Records with generic `https://cricsheet.org/matches/` URI | 271 |
| Records changed | 0 |
| UUIDs changed | 0 |
| Schema fields changed | 0 |
| Raw-stat values changed | 0 |
| Records blocked from a freshness update | 304 |

Verification-status counts are overlapping because they describe record history, not mutually exclusive source groups:

| Existing status | Count |
|---|---:|
| `EXPERT_AUDITED` | 33 |
| `STATSGURU_RECONCILED` | 194 |
| `COMMUNITY_VERIFIED` | 77 |

All 304 records currently use `sourceName: CRICSHEET` and `datasetVersion: cricsheet-2026-v1`.

## Sources attempted

| Source | Date attempted | Result | Use in update |
|---|---|---|---|
| ESPNcricinfo Statsguru player pages referenced by the 33 specific URIs | 2026-11-11 | Legacy endpoints were inaccessible to the verification client; requests returned unavailable/403 responses. | No values changed. |
| Cricsheet match index `https://cricsheet.org/matches/` | 2026-11-11 | Generic index is not a player-level career-stat record and does not identify the exact format totals for these 271 records. | Not sufficient to update values or provenance. |
| ICC/official-board summaries | 2026-11-11 | No single authoritative, machine-readable source covering all 304 records and all stored fields was available in the workspace audit. | No partial substitution from memory or secondary summaries. |

## Findings

1. The current `sourceUri` metadata is insufficient for a current-statistics audit for 271 records because it points to a generic match index.
2. The existing `STATSGURU_RECONCILED` and `EXPERT_AUDITED` labels cannot be reinterpreted as “verified as of 2026-11-11” without a fetchable source snapshot or dated evidence.
3. The current ingestion schema allows only `AUTOMATED_IMPORT`, `COMMUNITY_VERIFIED`, `EXPERT_AUDITED`, and `STATSGURU_RECONCILED`; there is no valid `BLOCKED`, `STALE`, or `SOURCE_UNAVAILABLE` value. I therefore did not downgrade or invent a verification status.
4. No UUID, player identity, format key, raw-stat field, source URI, dataset version, or verification status was changed.

## Narrow verification

Command:

```text
pnpm --filter @cricket/data-ingestion test -- tests/data-quality-audit.test.ts
```

Result: **8 tests passed, 1 test file passed**.

The existing audit covered cohort size, duplicate identity checks, enum validity, benchmark statistics, ingestion into ratings, and domestic replacement integrity. No dedicated freshness test was added because no record received a verified 2026-11-11 update.

## Follow-up required before changing values

- Obtain dated, player-specific Statsguru/ESPN or official-board exports for each record.
- Record a source URI that identifies the player and format query, not the generic Cricsheet index.
- Record the source snapshot date in the dataset version or an approved provenance field.
- Update only fields that reconcile exactly, then add player-level regression assertions for every changed record.

