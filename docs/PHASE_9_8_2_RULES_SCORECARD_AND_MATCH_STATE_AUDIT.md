# Phase 9.8.2 Cricket Rules, Scorecard and Match-State Integrity Audit

## Findings and repairs

The rules specialist extended the invariant layer in `match-state.ts` to reconcile event-derived totals with state totals. It now validates legal-ball counts, wickets, extras, batter figures, bowler figures, delivery deltas, event sequencing, and result identity/margins. It also added a no-ball balls-faced regression test.

Test bowling quotas remain format-driven and serialize as `Infinity` in the Test ruleset; no arbitrary large quota sentinel was introduced.

## Verification

- Focused state and transition tests: 12 passed in the specialist workspace.
- Integrated engine suite: 18 files, 104 tests passed.
- Test Red Ball, Test Pink Ball, T10, T20, and ODI format checks passed.
- Deterministic replay checks passed.

## Remaining limitation

These checks validate the pure engine and serialized replay contracts. Browser rendering and user interaction were explicitly out of scope for Phase 9.8.2.
