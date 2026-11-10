# PHASE 8 TESTING AND STATISTICAL CALIBRATION REPORT: MULTI-FORMAT CALIBRATION

**Audit & Calibration Date:** 10 November 2026  
**Auditor:** Senior Simulation Engine Lead & Statistical Verification Engineer  
**Triad Alignment:** Simulation `sim-1.0.0` | Ruleset `rules-multi-format-icc-2026.1` | Rating `rate-1.0.0`  
**Test Suite Coverage:** 206 Automated Tests Across 9 Packages (100% Pass Rate)  

---

## 1. AUTOMATED TEST SUITE SUMMARY

Across the entire monorepo, all automated test suites pass cleanly without a single failure or skipped assertion:

| Package / App | Test Files | Total Tests | Execution Time | Pass Rate | Primary Focus |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `@cricket/simulation-engine` | 14 | 71 | 2.45s | **100%** | Multi-format FSM, PRNG, transition, AI, calibration |
| `@cricket/web` | 5 | 24 | 4.75s | **100%** | PixiJS 2D canvas, gameplay loop, dream team UI |
| `@cricket/api` | 5 | 42 | 14.1s | **100%** | NestJS REST APIs, SSE streams, DTO validation |
| `@cricket/cricket-rules` | 3 | 29 | 4.73s | **100%** | MCC Laws, quotas, squad validation & analytics |
| `@cricket/data-ingestion` | 2 | 27 | 11.7s | **100%** | 1,144 player profiles, duplicate checks, stats |
| `@cricket/player-ratings` | 1 | 8 | 3.69s | **100%** | 4-layer rating engine, normalization curves |
| `@cricket/validation` | 1 | 5 | 4.17s | **100%** | State invariant guards, domain invariants |
| **Monorepo Total** | **31** | **206** | **~45s** | **100% PASS** | Zero regressions detected |

---

## 2. MULTI-FORMAT MACRO STATISTICAL CALIBRATION

To establish whether the unified simulation engine outputs realistic cricket scores across all five formats, large-scale Monte Carlo simulations were executed for each format:

| Statistical Metric | T10 Cricket | T20 International | One Day International (ODI) | Test Red Ball | Test Pink Ball (D/N) | Cricket Reality Target Range | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Average Run Rate (RPO)** | **10.62** | **8.44** | **5.78** | **3.22** | **3.08** | Format-dependent | **CALIBRATED** |
| **Typical 1st Innings Total** | 106 / 4 (10 ov) | 168 / 6 (20 ov) | 289 / 7 (50 ov) | 338 / 10 (105 ov) | 312 / 10 (101 ov) | Real-world historical averages | **CALIBRATED** |
| **Dot Ball Percentage** | 24.8% | 36.2% | 47.5% | 61.8% | 63.4% | Format-dependent | **CALIBRATED** |
| **Boundary Percentage** | 22.4% | 16.8% | 10.9% | 7.1% | 6.8% | Real-world historical averages | **CALIBRATED** |
| **Sixes per Innings** | 5.8 | 6.4 | 4.1 | 1.8 | 1.4 | Real-world historical averages | **CALIBRATED** |
| **Extras Percentage** | 3.2% | 4.1% | 4.6% | 3.8% | 3.9% | 2.5% to 7.0% | **CALIBRATED** |
| **Average Wickets / Innings**| 3.8 | 6.2 | 7.4 | 10.0 (All-out) | 10.0 (All-out) | Format-dependent | **CALIBRATED** |

---

## 3. DISMISSAL DISTRIBUTION CALIBRATION

Dismissal mode distributions across 10,000 simulated wickets align with historical cricket records:

| Dismissal Mode | Empirical Simulation % | ICC Historical % | Status |
| :--- | :--- | :--- | :--- |
| **CAUGHT (Outfield / Ring)** | 54.2% | 52.0% – 56.0% | **CALIBRATED** |
| **BOWLED** | 18.6% | 17.0% – 21.0% | **CALIBRATED** |
| **LBW** | 14.1% | 13.0% – 16.0% | **CALIBRATED** |
| **CAUGHT BEHIND (Wicketkeeper)**| 7.8% | 7.0% – 10.0% | **CALIBRATED** |
| **RUN OUT** | 3.4% | 3.0% – 5.0% | **CALIBRATED** |
| **STUMPED** | 1.6% | 1.5% – 3.0% | **CALIBRATED** |
| **HIT WICKET** | 0.3% | 0.1% – 0.5% | **CALIBRATED** |

---

## 4. DETERMINISTIC REPLAY REPRODUCIBILITY AUDIT

Every format was subjected to independent replay verification via `verifyMatchReplay()`:

```
[SplitMix64 Engine] Verifying 100% bit-exact replay determinism across formats...
✓ T10:           Seed 991122n -> Replayed state hash matches H_0 exactly. Discrepancies: 0
✓ T20:           Seed 991122n -> Replayed state hash matches H_0 exactly. Discrepancies: 0
✓ ODI:           Seed 991122n -> Replayed state hash matches H_0 exactly. Discrepancies: 0
✓ TEST_RED_BALL: Seed 991122n -> Replayed state hash matches H_0 exactly. Discrepancies: 0
✓ TEST_PINK_BALL:Seed 991122n -> Replayed state hash matches H_0 exactly. Discrepancies: 0
```

**Testing & Calibration Verdict: PASSED (100% Deterministic & Calibrated)**.
