# Phase 9.10.1: Sequential Opening Batter Selection & Management Flow Completion

## Summary

Phase 9.10 fixed the unconditional batting-management rendering bug. This phase completes the
missing requirement: opening batters are now selected through **two distinct sequential
confirmation steps** rather than lineup ordering, and the bowling-first setup is a **4-step
sequential flow** with explicit confirmations. Each confirmation is an independent state
transition and an independently recorded decision event. `START SIMULATION` remains gated until
every required decision is confirmed.

All changes are confined to `apps/web/app/match/page.tsx` (post-toss cockpit) plus new tests.
The simulation engine, rules, ratings, player identities and scoring are untouched.

## Exact State Transitions

### Batting-first (user bats first)

| Step | Screen / state | Required action | On confirm |
|---|---|---|---|
| 1 | `battingSetupStep = 1` — Opening Batter 1 | Select one of the 11 eligible batters, then `CONFIRM OPENING BATTER 1` | `openingBatter1Id` set, lineup reindexed with batter 1 at #1, step → 2 |
| 2 | `battingSetupStep = 2` — Opening Batter 2 | Batter 1 is shown as confirmed and **excluded** from the candidate list; `CONFIRM OPENING BATTER 2` | `openingBatter2Id` set, lineup reordered to `[opener1, opener2, ...rest]`, step → 3 |
| 3 | `battingSetupStep = 3` — Lower order | Reorder positions #3–#11 only (`moveSlot` rejects any target index < 2); `CONFIRM BATTING ORDER` | Validates 11 unique players, step → 4 |
| 4 | `battingSetupStep = 4` — Review | Read-only final lineup + management mode; `START SIMULATION` in the footer | `handleStartMatch()` |

Guards:
- `confirmOpener2` is a no-op unless `step === 2`, and rejects the first opener's ID (cannot select opener 1 twice).
- `moveSlot(currIdx, targetIdx)` returns early when `targetIdx < 2`, so the confirmed pair cannot be displaced while the lower order is rearranged.
- `confirmBattingOrder` requires exactly 11 unique player IDs and both openers present.
- `isReadyToStart` (batting) requires `openingBatter1Id && openingBatter2Id && opener1 !== opener2 && battingSetupStep === 4`.

### Bowling-first (user bowls first)

| Step | Screen / state | Required action | On confirm |
|---|---|---|---|
| 1 | `bowlingSetupStep = 1` — Opening bowler | Select an eligible bowler; `CONFIRM OPENING BOWLER` | `userOpeningBowlerId` set, step → 2 |
| 2 | `bowlingSetupStep = 2` — Field placement | Interactive field editor; `CONFIRM FIELD PLACEMENT` (disabled while `isFieldValid` is false) | step → 3 |
| 3 | `bowlingSetupStep = 3` — Bowling plan | Attack / Balanced / Defensive + management mode + advanced settings disclosure; `CONFIRM BOWLING PLAN` | `userBowlingPlan` + `managementMode` set, step → 4 |
| 4 | `bowlingSetupStep = 4` — Review | Compact review of bowler, field (with legality), plan and mode; `START SIMULATION` in the footer | `handleStartMatch()` |

Field validation enforces Powerplay circle limits (2 outside the 30-yard circle for T10/T20/ODI,
9 for Tests) and MCC Law 28.4 (≤5 leg-side, ≤2 behind square on the leg side). The field cannot
be confirmed while illegal, and the plan step is unreachable without it.

The advanced bowling controls no longer depend on a shared global toggle: the previous
`showAdvancedTactics` state was renamed to `showBowlingAdvanced`, and the delivery pipeline's
bowling branch now reads `showBowlingAdvanced` directly, so an unrelated UI toggle cannot
silently switch the bowling plan mapping.

## Persistence

`cricket_active_pre_match` (localStorage) is written on **every** confirmation via
`persistPreMatch()` and now carries:

- `openingBatter1Id`, `openingBatter2Id`
- `battingSetupStep`, `bowlingSetupStep`
- `userOpeningBowlerId`, `userField`, `customFielders`, `userBowlingPlan`, `managementMode`
- `userBattingLineup` (the confirmed order)
- `decisionLog` — ordered pre-match decision events `{ type, sequenceNumber, payload, timestamp }`

On reload, the pre-match loader restores all of the above and re-enters
`POST_TOSS_MANAGEMENT` at the saved step, so a refresh between opener 1 and opener 2 returns to
step 2 with opener 1 confirmed. `handleResumeMatch` also restores openers, steps and the decision
log from `ActiveMatchSession`.

On `START SIMULATION`, the pre-match decision log is converted into `MatchDecisionEvent` entries
(`type: 'BATTER_SELECTED'`, `inningsNumber: 1`, `deliverySequenceNumber: 0`) with their original
`sequenceNumber`, seeded into `decisionEventsRef`/`decisionEvents` and used as the sequence base
for the rest of the match. Nothing is silently reconstructed.

## Test Execution Report

New focused suite: `apps/web/test/phase-9-10-1-sequential-selection.spec.ts` — **15 tests, all passing**.

Covered:
- Opener 1 confirmed before opener 2 becomes selectable.
- Opener 1 cannot be selected twice.
- Opener 1 excluded from opener 2 candidates.
- Both openers remain fixed during lower-order rearrangement (including rejected swaps).
- Independent, ordered decision events per confirmation (`1, 2, 3`).
- Batting-order validation rejects duplicates.
- Refresh between the two selections restores step 2 + opener 1.
- Resume after both selections restores the pair and the engine opens with them.
- Both toss outcomes (user batting first vs user bowling first).
- Bowling cannot skip field confirmation; an illegal field cannot be confirmed.
- Bowling plan cannot be omitted; start requires bowler + field + plan.
- Confirmed opening bowler bowls over 1 in all five formats.
- START SIMULATION gating.
- Deterministic replay across T10, T20, ODI, Test Red Ball, Test Pink Ball.

TypeScript: `npx tsc --noEmit` passes. Full web suite re-run after the change: all existing tests
continue to pass (including `phase-9-6-post-toss-management.spec.ts`).

## Limitations

- The lower-order rearrangement uses up/down controls rather than drag-and-drop; the confirmed
  opening pair is locked out of those controls.
- Pre-match decision events are recorded with `type: 'BATTER_SELECTED'` because
  `MatchDecisionEvent` only defines that selection type; the specific step is carried in the
  payload (`openingSlot`, `battingOrder`, `phase: 'PRE_MATCH'`).
- The bowling review step reuses the existing single-screen card layout, gated by step, rather
  than introducing new routes.
