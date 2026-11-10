# Phase 9.8.1 Final Acceptance Report

## Executive summary

Four specialist workstreams were started concurrently: management persistence, Assisted recommendations, Automatic captaincy, and browser E2E. Confirmed persistence and plan-to-engine synchronization defects were fixed. Targeted tests and web typecheck pass. The milestone is **not fully accepted**: browser E2E/screenshots are blocked, assisted and automatic recommendation quality remain heuristic, and the full engine suite has three failing assertions in this run.

## Parallel execution evidence

The work was assigned concurrently to four independent agents with read-only investigation ownership; the lead integrated changes in shared files after receiving their findings. Specialist reports: [management persistence](PHASE_9_8_1_MANAGEMENT_PERSISTENCE_AUDIT.md), [Assisted recommendation](PHASE_9_8_1_ASSISTED_RECOMMENDATION_AUDIT.md), [Automatic captaincy](PHASE_9_8_1_AUTOMATIC_CAPTAINCY_AUDIT.md), and [browser E2E](PHASE_9_8_1_BROWSER_E2E_AND_RESPONSIVE_AUDIT.md).

## Root causes and fixes

1. **Mode refresh gap:** selector changed React state only; save occurred after a delivery. Added immediate active-session persistence and match-scoped mode decision events.
2. **Other captain decisions not durable:** plan, field, and selected bowler could likewise be lost before the next delivery; nominated bowler was omitted from session. They now persist immediately with ordered decision records.
3. **Plan UI/engine mismatch:** explicit UI tactics prevented `applyBowlingPlan` defaults from taking effect. Attack and Defensive now supply plan-derived delivery inputs in beginner controls; expanded advanced controls override them. Balanced preserves selected tactical values.
4. **Interactive history/replay mismatch:** history kept only a seed/score summary and replay rebuilt a synthetic match; interactive verification used the autonomous runner. New history records preserve exact config/profile data and recorded delivery actions, and interactive replay verification steps those actions through the same engine transition.

## Match and captaincy architecture

The delivery action stored on each `DeliveryEvent` remains the simulation input and replay authority. `MatchDecisionEvent` separately records mode/plan/bowler/field transitions with match ID, innings, sequence, and delivery position. Active sessions and completed local history store the same match identity and action sequence. This preserves deterministic `stepDelivery` replay without adding a second simulation engine.

## Files changed by this phase

- `apps/web/app/match/page.tsx`
- `packages/simulation-engine/src/contracts/types.ts`
- `packages/simulation-engine/tests/phase-9-7-bowling-plans.test.ts`
- `brain.md`
- Five Phase 9.8.1 reports under `docs/`

Pre-existing unrelated edits remain in `apps/web/context/AudioContext.tsx`, `New shortcut.lnk`, `docs/FINAL_WEBSITE_AUDIT_REPORT.md`, and `music of the game/`; they were not included in this phase's staging.

## Tests actually executed

- `pnpm --filter @cricket/simulation-engine build` — passed.
- `pnpm --filter @cricket/web typecheck` — passed (also rerun after final code edits below).
- `pnpm --filter @cricket/simulation-engine test -- phase-9-7-bowling-plans.test.ts phase-9-8-readiness.test.ts` — 2 files, 9 tests passed.
- `pnpm --filter @cricket/simulation-engine test` — 15 files passed, 3 files failed; 95 tests passed and 3 failed. Failures: calibration average run rate expected ≥7.0, got 5.13; ODI total runs expected >50, got 46; runner delivery count expected >100, got 93. These thresholds failed in the executed deterministic run and are not marked as passed. The run does not establish whether they predate this phase.

## Browser and responsive results

Blocked. The dev server started and a Brave window was available, but Windows computer-use stopped before navigation because it could not determine the current URL confidently enough to proceed. No screenshots exist. The five requested viewport checks, gameplay paths, console/network inspection, and actual refresh/replay checks remain open. See the dedicated browser report.

## Remaining risks and release gate

- Assisted recommendations do not yet reason deeply about batter/bowler matchup, recent figures, workload trends, or pitch suitability.
- Automatic captaincy remains coarse and needs context-diversity/scenario tests across all formats.
- Persistence and history paths are typechecked and engine replay tests pass, but refresh/resume and UI replay require browser execution.
- The three full-suite failures need baseline triage; they were not modified to conceal or relax their assertions.
- No screenshot-based responsive acceptance was possible.

**Acceptance status: partial; browser and full-suite gates remain open.**

**Phase 9.8.1 implementation commit hash:** `803c8f3` (`fix: persist and replay phase 9.8 captaincy decisions`).
**Working-tree status:** pending commit; unrelated pre-existing changes are intentionally excluded.
