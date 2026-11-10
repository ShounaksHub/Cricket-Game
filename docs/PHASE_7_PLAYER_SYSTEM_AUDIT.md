# Phase 7: Global Cricket Player Database Expansion
## Gate P7.0: Existing Player System Audit & Architecture Baseline

**Audit Date:** 2026-11-10T11:16:00+05:30  
**Status:** **GATE P7.0 COMPLETED**  
**Target:** 1,000+ Verified Players across International and Major Domestic Cricket  

---

## 1. Executive Summary

This audit assesses the state of the cricket player database, schemas, ingestion pipelines, rating engines, APIs, and gameplay integrations prior to executing **Phase 7: Global Cricket Player Database Expansion (1,000+ Players)**.

The existing system possesses a fully verified 4-layer rating engine and robust schema, but currently hosts only **47 benchmark cricketers**. The expansion to 1,000+ players requires modular data structures, enriched career classification (international vs domestic-only), and pagination/indexing optimizations without degrading 2D gameplay performance or altering the simulation engine.

---

## 2. Current Player Count & Coverage

| Metric | Current Count | Phase 7 Target | Gap |
|---|---|---|---|
| **Total Unique Verified Players** | **47** | **≥ 1,000** | +953 players |
| **Active International Players** | 22 | ≥ 300 | Extensive expansion across all ICC full & top associate nations |
| **Historical International Legends** | 25 | ≥ 300 | Multi-era coverage (Golden Age, Interwar, Post-War, Pace, Globalized) |
| **Domestic-Only & Franchise Specialists** | 0 | ≥ 400 | Ranji Trophy, Sheffield Shield, County Championship, BBL, IPL, PSL, etc. |
| **Represented Nations** | 10 | ≥ 18 | Full ICC Full Members + Associate Nations (NED, SCO, USA, NEP, OMA, UAE, etc.) |

---

## 3. Existing Data Fields & Schema Architecture

### A. Prisma Database Schema (`database/prisma/schema.prisma`)
- **Identity Model (`Player`):**
  - `id` (UUID), `cricsheetId` (VarChar 64, Unique), `fullName` (VarChar 128), `displayName` (VarChar 64).
  - `dateOfBirth` (Date), `primaryNationality` (VarChar 64), `primaryRole` (`PrimaryRole` enum: 7 roles).
  - `secondaryRole` (VarChar 64), `battingHand` (`BattingHand`: `RIGHT_HAND` | `LEFT_HAND`).
  - `bowlingStyle` (`BowlingStyle`: 11 styles including `NONE`).
  - `isWicketkeeper` (Boolean), `historicalEra` (`HistoricalEra`: 7 eras).
  - `careerDebutYear` (Int), `careerRetirementYear` (Int?), `isActive` (Boolean), `confidenceScore` (Decimal).
- **Relations:**
  - `aliases` (`PlayerAlias`), `photographs` (`PlayerPhotograph`), `dataSources` (`PlayerDataSource`).
  - `formatStatistics` (`PlayerFormatStatistic` per `MatchFormat`).
  - `eraMetrics` (`PlayerEraMetric` with z-scores & peer means).
  - `attributes` (`PlayerAttribute` with 30+ 0–100 attributes).
  - `ratings` (`PlayerRating` with format composite ratings & explainability).

### B. In-Memory & Shared Types Contract (`packages/shared-types/src/player.ts`)
- Strict type definitions for `PlayerIdentity`, `PlayerRawFormatStats`, `PlayerEraMetrics`, `PlayerAttributes`, `PlayerFormatRating`, and `PlayerProfile`.
- Zero-hallucination guarantee: unrecorded historical stats are strictly `null`, not zero.

---

## 4. Gap Analysis & Missing Fields

To satisfy the Phase 7 specifications for 1,000+ players covering both international and domestic ecosystems:

1. **Career Categorization:**
   - **Current:** Only `isActive` boolean exists. No field distinguishes an international legend from a domestic-only stalwart (e.g. Ranji Trophy or Sheffield Shield specialist).
   - **Required Addition:** `careerCategory?: 'INTERNATIONAL' | 'DOMESTIC_ONLY' | 'HISTORICAL_LEGEND'` or `isDomesticOnly: boolean`.
2. **Competition & League Provenance:**
   - **Current:** Only format-level stats exist (`T20`, `ODI`, `TEST_RED_BALL`, etc.).
   - **Required Addition:** `competitions?: string[]` (e.g., `['Ranji Trophy', 'IPL', 'County Championship', 'BBL', 'The Hundred', 'SA20', 'PSL', 'CPL']`) to allow filtering and discovery of players by their primary competitions.
3. **Fielding Statistics:**
   - **Current:** `catchesTaken`, `stumpingsMade`.
   - **Enhancement:** Optional `runOuts` where available from modern ball-by-ball records.

---

## 5. Existing Sources & Licensing Framework

| Source | Scope | License / Terms | Usage Strategy |
|---|---|---|---|
| **Cricsheet** | Ball-by-ball matches (2004–present) | CC-BY 4.0 | Format-specific batting & bowling aggregation for modern international & franchise players |
| **Wikidata** | Biographical dates, roles, nationalities | CC0 (Public Domain) | Biographical alignment, Q-IDs, era determination |
| **Open Cricket Archives** | Historical scorecards & domestic records | Permitted Open Research | Era averages, benchmark career figures for pre-2004 legends and domestic stalwarts |

---

## 6. Duplicate & Identity Resolution Baseline

- Existing identity resolver in `packages/data-ingestion/src/identity-resolution.ts`:
  - Tier 1: Exact `cricsheetId` match.
  - Tier 2: Exact `wikidataId` match.
  - Tier 3: Normalized canonical name equality (`normalizePlayerName`).
  - Tier 4: Exact alias match (`generateStandardAliases`).
  - Tier 5: Jaro-Winkler fuzzy matching with nationality & debut year penalties.
- **Audit Result:** Current 47 benchmark players have 0 duplicates and 100% unique IDs.
- For 1,000+ players, the identity resolver will run as an automated integrity check to prevent canonical duplicates or alias collisions.

---

## 7. Data Ingestion & Storage Strategy for 1,000+ Players

To prevent an unwieldy 100,000-line single file and ensure modular testability, the 1,000+ dataset will be structured into domain cohorts under `packages/data-ingestion/src/data/`:

```
packages/data-ingestion/src/
├── data/
│   ├── index.ts
│   ├── cohort-international-contemporary.ts   # Current international stars (~250 players)
│   ├── cohort-international-legends.ts        # Historical legends across 6 eras (~250 players)
│   ├── cohort-domestic-india.ts               # Ranji, SMAT, Vijay Hazare, IPL (~150 players)
│   ├── cohort-domestic-australia.ts           # Sheffield Shield, Marsh Cup, BBL (~120 players)
│   ├── cohort-domestic-england.ts             # County Championship, T20 Blast, Hundred (~120 players)
│   └── cohort-domestic-world.ts               # SA20, PSL, CPL, Super Smash, BPL, Associates (~130 players)
├── curated-seed-data.ts                       # Aggregates cohorts into master registry (1,000+ players)
```

Each player profile will pass through `ingestPlayerRecord()`, computing:
1. Era-adjusted peer baselines (`PlayerEraMetrics`).
2. 30+ 0-100 attributes (`PlayerAttributes`).
3. Format ratings across T20, ODI, Test, T10 with Bayesian shrinkage and confidence metrics (`PlayerFormatRating`).

---

## 8. Frontend Catalogue & Engine Performance Strategy

- **Pagination:** Implement true server/client-side chunked pagination (24 players per page) in `/players` to eliminate client DOM lags when searching across 1,000+ players.
- **Debounced Search:** 250ms debouncing for name, country, and role searches.
- **Fast In-Memory Maps:** Map-based index lookups (`playerLookup: Map<string, PlayerProfile>`) ensuring $O(1)$ player retrieval during Dream XI squad validation and match setup.
- **AI Selection Optimization:** AI opponent generator will filter by pitch suitability and role quotas from the 1,000+ player roster within <5ms.

---

## 9. Conclusion & Authorization to Proceed

The audit is complete and confirms that the existing architecture is fully equipped to support 1,000+ players with minor schema enhancements (`careerCategory`, `competitions`).

**Next Step:** Commit Gate P7.0 audit, then proceed to Gate P7.1 (Data Model & Schema Extensions).
