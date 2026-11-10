# Phase 9.8.1 Assisted Bowling Recommendation Audit

## Scope and findings

The recommendation panel in `apps/web/app/match/page.tsx` derives a plan from phase and wickets and a bowler from priority/quota. The specialist audit found its explanation prioritised wickets before death overs, so the text could recommend wicket-taking while the plan was defensive. The available-bowler ordering is shallow and is not a matchup or performance model. `resolveAITacticalAction` is a delivery AI function, not a complete assisted-captain recommendation interface.

The confirmed integration defect was in applying the recommendation: it changed the plan, bowler, and field React state, but all explicit line/length/variation/pace/intent values were still passed to the engine. `applyBowlingPlan` only fills omitted values, so Attack and Defensive did not reliably drive their intended delivery parameters.

## Fixes

- When beginner plan controls are active, Attack maps to full length, stump line, effort ball, and wicket-taking intent; Defensive maps to back-of-length, outside off, conserve, and containment. Balanced retains the player's selected advanced tactics.
- Advanced controls remain usable and explicitly override plan-derived delivery choices when expanded.
- Recommendation acceptance now passes plan, bowler, and field through the same persisted decision path as direct controls.
- Bowler/plan/field decisions are captured for later replay and review.
- Added an engine regression check that verifies plan defaults for Attack and Defensive.

## Verification

`pnpm --filter @cricket/simulation-engine test -- phase-9-7-bowling-plans.test.ts phase-9-8-readiness.test.ts` — 9 tests passed. Web typecheck passed.

## Remaining work

Recommendation intelligence is still heuristic: it does not yet rank bowling matchups using batter handedness/ratings, bowler recent figures, or pitch suitability. T10/ODI/Test contextual recommendation quality and the six requested match scenarios were inspected by code, not validated in a browser or scenario harness. No such quality claim is made here. This is a material release limitation.
