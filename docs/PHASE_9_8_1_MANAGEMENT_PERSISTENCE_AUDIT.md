# Phase 9.8.1 Management Persistence Audit

## Scope and finding

The audit traced the selector in `apps/web/app/match/page.tsx` through active-session local storage, resume, delivery actions, and history. The mode selector originally only called React `setManagementMode`; the active session was written after deliveries or batter selection. A refresh directly after switching modes could therefore restore the previous mode. Plan, field, and nominated-bowler changes had the same immediate-save gap, and the nominated bowler was not part of the active-session shape.

## Fixes

- Added match-scoped `MatchDecisionEvent` records for mode, plan, bowler, and field changes. They carry match ID, innings, monotonic sequence, and delivery sequence.
- Mode changes immediately persist the active session with the new mode and decision event.
- Plan, field, and nominated bowler edits immediately persist their latest values and decision event. A ref prevents multiple changes in one React batch from overwriting each other.
- Resume restores the decision history and sequence counter as well as management mode and nominated bowler.
- Completed local history now retains the exact match configuration, profile map, delivery tactics, and decisions.
- Interactive result verification replays recorded tactical actions through `stepDelivery`; archived replay uses the stored match identity/configuration rather than synthesizing lineups.

## Evidence and verification

Reproduction before fix: start a live match, change Assisted to Manual or Automatic, refresh before another delivery, then resume. The mode change was not written by the selector handler. This was confirmed by tracing the save call sites and selector callback. The persisted event path is implemented; refresh automation was not available in a browser in this environment.

Executed: `pnpm --filter @cricket/web typecheck` — passed. Targeted simulation readiness tests — 9 passed. Full engine suite details are in the final acceptance report.

## Remaining limitation

Captain decisions are local browser persistence. Legacy history entries without `configSnapshot` and recorded events still use the historical fallback. Real-browser refresh/replay acceptance remains pending because no browser automation surface was attached.
