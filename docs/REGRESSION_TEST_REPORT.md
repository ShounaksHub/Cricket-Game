# Cricket Dream XI: Regression Test Report

**Execution Date:** November 14, 2026  
**Test Runner:** Vitest v3.2.7  
**Total Test Suites:** 36 suites (18 Simulation Engine + 18 Web)  
**Total Tests:** 226 tests  
**Pass Rate:** 100% (226 passed, 0 failed, 0 skipped)

---

## 1. Simulation Engine Test Suite (`@cricket/simulation-engine`)

```
 Test Files  18 passed (18)
      Tests  104 passed (104)
   Duration  4.80s
```

### Coverage by Capability:
1. **Deterministic PRNG (SplitMix64 / Mulberry32):** Bit-exact replay determinism across 10,000 deliveries.
2. **Multi-Format Simulation Engine:** Complete end-to-end match execution verified across all 5 cricket formats:
   - **T10:** 10-over hyper-aggressive calibration, powerplay restrictions, max 2 overs/bowler.
   - **T20:** 20-over standard league rules, 6-over powerplay, max 4 overs/bowler.
   - **ODI:** 50-over three-powerplay structure (1-10, 11-40, 41-50), max 10 overs/bowler.
   - **Test Red Ball:** 5-day match structure, 3 sessions/day, 90 overs/day, follow-on enforcement (200+ runs), new ball availability (80+ overs), declaration.
   - **Test Pink Ball:** Day-night session lighting transitions, pink ball wear, evening dew factor tracking.
3. **MCC Cricket Law Compliance:** Law 21.7 (no consecutive overs), Law 28.4 (maximum 2 fielders behind square leg), Law 36 (LBW trajectory simulation), Law 38/39 (Run-out / Stumping calculations).
4. **Bowling Tactical Plans:** Attack, Balanced, and Defensive plans verified across game phases (Powerplay, Middle, Death, Tail-End).

---

## 2. Web Application Test Suite (`@cricket/web`)

```
 Test Files  18 passed (18)
      Tests  122 passed (122)
   Duration  7.77s
```

### Suite Breakdown:
- `test/phase-9-11-bowling-management-and-overhaul.spec.ts` (3 tests) — Frontline bowling rotation, Test match projection integrity, dynamic bowler/striker data.
- `test/phase-9-10-1-sequential-selection.spec.ts` (15 tests) — Sequential opening pair nomination and replay determinism.
- `test/phase-9-2-independent-audit.spec.ts` (35 tests) — Full multi-format end-to-end simulation audits.
- `test/phase-9-6-post-toss-management.spec.ts` (9 tests) — Post-toss pre-match decision persistence and field editor integration.
- `test/dream-teams.spec.ts` (9 tests) — Lineup creation, role constraints, and validation feedback.
- `test/phase-9-3-match-integrity.spec.ts` (8 tests) — Match scoring integrity, scorecard reconciliation, and mathematical invariants.
- `test/phase6-e2e.spec.ts` (5 tests) — End-to-end gameplay, persistence, and 100% bit-exact replay verification.
- `test/match-gameplay.spec.ts` (5 tests) — Ball-by-ball interactive simulation controls.
- `test/match.spec.ts` (3 tests) — PixiJS visualizer field geometry and left-hand batter mirroring.
- `test/audio-tracks.spec.ts` (2 tests) — Stadium audio track playlist and volume controls.
- `test/player-image-resolver.spec.ts` (4 tests) — Sourced player portrait resolution.
- `test/players-archive-conversion.spec.ts` (2 tests) — 1,144 player database ingest and categorization.
- `test/page.spec.ts` (2 tests) — Home page cover rendering and navigation links.
- `test/phase-9-3-1-player-agency.spec.ts` (5 tests) — Player agency and manual tactical overrides.
- `test/phase-9-3-2-adversarial-audit.spec.ts` (4 tests) — Stress testing extreme score situations and boundary conditions.
- `test/phase-9-3-3-transparency.spec.ts` (4 tests) — Transparent rule disclosures.
- `test/phase-9-4-flow.spec.ts` (4 tests) — Flow progression across all match states.
- `test/phase-9-8-2-persistence-replay.spec.ts` (3 tests) — Session save, resume, and archive replay.

---

## 3. Regression Verdict

Zero regressions detected across all core packages. Build and test status are 100% green.

