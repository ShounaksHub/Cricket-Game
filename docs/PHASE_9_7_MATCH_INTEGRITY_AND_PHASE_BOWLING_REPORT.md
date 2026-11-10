# Phase 9.7 — Match Integrity, Beginner Bowling Management & Phase Captaincy

## Status

Implemented and verified at repository level. Existing deterministic simulation and PixiJS rendering were preserved.

## Root-cause findings

1. The interactive page precomputed a separate autonomous `simulationResult` before starting the live state. On completion it archived that precomputed result instead of the live state, allowing result/history data to disagree with the match watched.
2. The UI displayed `999` for Test quotas and the ruleset used `9999` as an unlimited sentinel.
3. Resume rebuilt state from current UI defaults and replayed AI decisions instead of restoring the exact persisted configuration and recorded tactics.
4. The engine already accepted tactical line, length, variation, field and intent; the missing integration was a beginner-level plan entering that same pipeline.

## Changes made

- Added `BowlingPlan` (`ATTACK`, `BALANCED`, `DEFENSIVE`) and format-aware phases in `packages/simulation-engine/src/contracts/bowling-plans.ts`.
- Added T10, T20, ODI and contextual Test phase definitions.
- Applied plans inside the existing outcome-logit path so they change wicket, dot-ball, boundary and single probabilities.
- Recorded active phase and effective tactical action on delivery events.
- Replaced Test quota sentinels with `Infinity`; the UI renders `∞` for Tests and numeric quotas for T10/T20/ODI.
- Filtered bowler choices to eligible bowling-style players.
- Added a beginner-first plan card, active phase text, management mode selector and collapsed advanced tactics.
- Fixed completion archival to reconcile the actual live `nextState` and events.
- Persisted a serializable match-config snapshot and restored recorded delivery tactics on resume.
- Added targeted Phase 9.7 tests for phase boundaries and plan-to-engine effects.

## Authoritative state architecture

`liveStateRef.current` is the authoritative interactive state. The scoreboard derives from its active innings. On completion, result and history are hydrated from the same final state via `reconcileMatchScorecard(nextState)`; the precomputed autonomous result is no longer written as the completed interactive result.

## Persistence and replay

Each active session includes the match ID, serializable config snapshot, visible events and recorded tactical actions. Resume recreates the initial state and replays those actions using the same seeded PRNG. Autonomous replay verification remains available for autonomous `simulateFullMatch` results.

## Verification executed

- `pnpm --filter @cricket/simulation-engine build` — passed.
- `pnpm --filter @cricket/web typecheck` — passed.
- Simulation engine: 16 test files, 90 tests passed.
- Web: 14 test files, 99 tests passed.

## Browser screenshots

No browser screenshot artifact was generated in this verification run. Visual QA is still required at 360×800, 390×844, 768×1024, 1280×720 and 1440×900 before screenshot-level acceptance can be claimed.

## Remaining limitations

- The existing replay UI still presents autonomous replay verification as the primary replay path; a follow-up should expose the recorded interactive action log directly.
- The over-end decision panel and complete assisted/automatic recommendation UX remain follow-up work. The management mode is persisted and surfaced, but automatic policy still needs a dedicated UX pass.
- No player ratings, UUIDs, cricket laws, PixiJS rendering, cloud services or offline architecture were changed.

## Final commit hash

`76991891a8d15a5546e759ddf6c787ccd21c30dc` (repository HEAD at verification time; implementation changes are uncommitted in the working tree).
