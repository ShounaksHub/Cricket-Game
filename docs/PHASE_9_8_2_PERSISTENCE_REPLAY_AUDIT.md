# Phase 9.8.2 Persistence and Replay Audit

## Scope

This workstream audited the active match session, local history archive, serialized match configuration, and deterministic interactive replay paths in `apps/web` and the simulation contracts. Browser testing was excluded. Simulation AI files were not changed.

## Findings

1. Delivery actions were already persisted on `DeliveryEvent.tactics`, which is the correct replay authority.
2. Resume and archived replay had separate delivery replay loops. Resume could fall back to an AI action when a persisted tactic was absent, making a damaged or partial session appear to resume successfully with a different match path.
3. `userOpeningBowlerId` and `userBattingLineup` existed on `ActiveMatchSession` but were not included in active-session saves.
4. Incoming-batter selection was represented by mutating the wicket event tactic, but it was not separately recorded in the captain decision history.
5. Decision persistence could use a stale React state value during a same-turn save; the decision ref is now the write authority.

## Repairs

- Added `apps/web/lib/match-persistence.ts` with one recorded-action replay function used by refresh/resume and history replay.
- Missing delivery tactics now stop replay and report the exact delivery index instead of silently inventing an action.
- Replay compares outcome, cumulative score, wickets, bowler, striker, and non-striker identity for every recorded delivery.
- Active-session saves now include opening bowler and batting lineup selections.
- Added `BATTER_SELECTED` to `MatchDecisionEvent` and persist the selected incoming batter with match, innings, sequence, and delivery position.
- Completed-match archival reads decision events from the authoritative ref.

## Tests executed

- `pnpm --filter @cricket/simulation-engine build` — passed.
- `pnpm --filter @cricket/web typecheck` — passed.
- `pnpm --filter @cricket/web test -- phase-9-8-2-persistence-replay.spec.ts --run` — passed, 3 tests.

The focused tests cover serialized mode/plan/bowler/field state, incoming-batter selection, deterministic replay, and incomplete action detection.

## Remaining gaps

- No browser or refresh automation was run, per Phase 9.8.2 scope.
- Local storage remains browser-owned and unencrypted; this is existing offline architecture.
- The simulation engine's autonomous `verifyMatchReplay` remains separate from interactive action replay. Interactive records use the new recorded-action path.
- Full repository test suites were not run in this specialist workstream.
