# PHASE 9.3: CRITICAL MATCH INTEGRITY, PLAYER AGENCY & BOWLING CONTROL REPAIR REPORT

**Project:** Cricket Dream XI  
**Execution Date:** 10 November 2026  
**Baseline Commit:** `3574c00dd22451a7e45666de25ad1a7f407df5c2`  
**Core Product Principle:** **THE USER MANAGES THEIR OWN DREAM XI. THE OPPONENT IS MANAGED ENTIRELY BY CPU AI.**

---

## 1. Executive Summary

Phase 9.3 resolves the critical match integrity failures identified in the live match screen (impossible scores such as `7191/10` and `385.23` run rate alongside `121/10` main score) and completely redesigns player agency around the fundamental principle of asymmetric management:
1. **P0 Root Cause of Impossible Scores Diagnosed & Fixed:**
   - In `apps/web/app/match/page.tsx`, `scorecardDelta.totalRuns` represents the *cumulative innings score* at the end of each delivery, not the per-delivery delta.
   - The UI previously executed `currentInningsEvents.reduce((sum, e) => sum + e.scorecardDelta.totalRuns, 0)`, which summed cumulative progression scores across all deliveries in the innings ($\sum_{k=1}^N \text{cumulative\_runs}_k$), causing the score to quadratically inflate to `7191` and `7735` runs!
   - Remediated by binding all live scores directly to the authoritative state: `currentRuns = activeInnings.totalRuns` and `currentWickets = activeInnings.totalWickets`.
2. **P0 Separation Between User Team and CPU Opponent:**
   - Eliminated the `isAIOptimized` override switch that was forcing the user's manual inputs to be ignored in favor of AI actions.
   - Established explicit, asymmetric ownership:
     - **When User Bats:** User controls batter tactical intent (`DEFEND`, `ROTATE_STRIKE`, `AGGRESSIVE`, `MAXIMUM_POWER`). CPU AI autonomously controls bowling line, length, variation, and field presets. A read-only CPU bowling strategy plan is displayed.
     - **When User Bowls:** User manages bowling pace strategy (`FULL_PACE`, `CONTROLLED`, `EFFORT_BALL`, `VARIATION_FOCUS`, `CONSERVE`), bowling intent (`ATTACKING`, `CONTAINMENT`, `WICKET_TAKING`), length, line, variation, fielding presets, and bowler selection under MCC Law 21.7. CPU AI autonomously controls batter intent. A read-only CPU batting stance is displayed.
3. **P0 Match Completion Control State:**
   - Active delivery buttons (`TAKE STRIKE`, `SIM OVER`, `SIM INNINGS`, `SIM MATCH`) are disabled immediately upon match conclusion, preventing ghost deliveries or contradictory states post-match.

---

## 2. Before-and-After Technical Comparison

| Dimension | Previous Defective State (Phase 9.2 Baseline) | Repaired State (Phase 9.3) |
|---|---|---|
| **Live Innings Score Calculation** | `reduce((sum, e) => sum + e.scorecardDelta.totalRuns, 0)` (Quadratic summation of cumulative scores) | Derived directly from authoritative engine state: `activeInnings.totalRuns` |
| **Observed Score in T20 Innings** | `7191/10` (or `7735/10` on complete T20 match) | Exact realistic score (e.g., `114/10` or `164/5`) |
| **Current Run Rate** | Inflated to `385.23` | Accurately calculated: `(currentRuns / legalBalls) * 6` (e.g. `8.20`) |
| **Delivery Commentary** | Read cumulative score: `121 run(s) scored` on single ball | Calculates exact delivery runs: `runsBat + extras` (e.g., `4 run(s) scored`) |
| **Tactical Input Application** | Bypassed by `isAIOptimized = true` default state | Fully active: User inputs route directly into `TacticalDeliveryAction` |
| **Team Control Separation** | Both batting and bowling controls shown simultaneously | Asymmetric cockpit: Batting cockpit shown when user bats; Bowling cockpit shown when user bowls |
| **Bowling Pace & Energy** | Unexposed | 5 pace strategies implemented: `FULL_PACE`, `CONTROLLED`, `EFFORT_BALL`, `VARIATION_FOCUS`, `CONSERVE` |
| **Bowling Intent** | Unexposed | 3 tactical intents: `ATTACKING`, `CONTAINMENT`, `WICKET_TAKING` |
| **Bowler Changes** | Automatic only | User selects next bowler dropdown; respects MCC Law 21.7 (no consecutive overs) |
| **Match Completion** | Delivery buttons remained active and clickable | Stepper buttons disabled (`disabled={phase === 'COMPLETED'}`) |

---

## 3. Bowling Pace & Tempo Engine Mechanics

To fulfill Section 4 of the specification without introducing fake controls, the 10-stage physics engine in `@cricket/simulation-engine` was updated:
1. **Contract Types Extended (`TacticalDeliveryAction`):**
   - Added `bowlingPaceStrategy?: BowlingPaceStrategy`
   - Added `bowlingIntent?: BowlingIntent`
   - Added `nextBowlerPlayerId?: string`
2. **Outcome Logits Modulation (`outcome-logits.ts`):**
   - `FULL_PACE`: Boosts `DOT` (+0.25) and `WICKET` (+0.25) while slightly increasing boundary edges (`FOUR` +0.15).
   - `EFFORT_BALL`: Maximum aggression: `WICKET` (+0.35) with elevated risk of `NO_BALL` (+0.1) and `FOUR` (+0.2).
   - `CONTROLLED`: Economy focus: `DOT` (+0.3), `WIDE` (-0.2), `NO_BALL` (-0.15), and `FOUR` (-0.2).
   - `VARIATION_FOCUS`: Deception: `DOT` (+0.2), `WICKET` (+0.2), `RUN_1` (-0.15).
   - `CONSERVE`: Energy conservation / containment: reduces wicket threat (`WICKET` -0.2), encourages singles (`RUN_1` +0.25).
3. **Bowler Rotation Execution (`delivery-transition.ts`):**
   - At the conclusion of every over (6 legal deliveries), if the user has nominated `nextBowlerPlayerId`, the engine validates MCC Law 21.7 (cannot bowl consecutive overs) and format over quota. If legal, the nominated bowler takes the next over.

---

## 4. Verification & Automated Test Results

- **New Test Suite Authored:** `apps/web/test/phase-9-3-match-integrity.spec.ts` (6 comprehensive test scenarios covering score integrity, team separation, bowling pace modulation, and bowler nomination).
- **Workspace Test Execution:**
  - `@cricket/validation`: 5 / 5 passed
  - `@cricket/player-ratings`: 8 / 8 passed
  - `@cricket/cricket-rules`: 32 / 32 passed
  - `@cricket/simulation-engine`: 88 / 88 passed
  - `@cricket/data-ingestion`: 12 / 12 passed
  - `@cricket/api`: 42 / 42 passed
  - `@cricket/web`: 71 / 71 passed (including all Phase 9.1, 9.2, and 9.3 suites)
  - **Total:** 250 / 250 tests passed (100% green).
- **Typecheck & Production Build:**
  - Turborepo typecheck passed cleanly across all 16 tasks.
  - Production build compiled successfully across all 8 Next.js static routes.
