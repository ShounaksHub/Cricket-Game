# Phase 9.8 — Interactive Captaincy & Beginner-First Bowling Management

## Phase 9.7 audit

The Phase 9.7 baseline already provided format-aware bowling plans, active phase calculation, Test quota cleanup, live-state completion authority, and recorded delivery tactics. The incomplete areas were the mode selector's runtime behaviour, over-end decisions, automatic next-bowler selection, contextual recommendations, and a visible assisted/automatic experience.

## Implemented

- Assisted remains the default for new matches.
- Automatic mode now uses AI tactical inputs for user bowling innings, including plan, field, intent, line, length, variation and legal next-bowler recommendation.
- Automatic mode shows a persistent active-status indicator and does not open over-end decision UI.
- AI captaincy now returns a phase/context-based bowling plan and a quota/consecutive-over-valid next bowler at the over boundary.
- Manual and Assisted modes pause once an over completes, after the authoritative state and scoreboard have updated.
- Added a concise over summary with runs, wickets, current run rate and phase transition messaging.
- Added Accept Recommendation, Customise and Keep Current Plan actions.
- Assisted recommendations use active phase, wicket situation, current bowler eligibility and bowling priority; the transition layer remains the final rules authority.
- Delivery actions now record management mode alongside tactical input, preserving the existing event-based replay architecture.
- Existing advanced controls remain behind the collapsed advanced-tactics disclosure.

## Files changed

- `apps/web/app/match/page.tsx`: runtime modes, over-end pause, recommendation card, automatic status and captaincy actions.
- `packages/simulation-engine/src/ai/ai-captain.ts`: plan and legal next-bowler recommendations.
- `packages/simulation-engine/src/contracts/types.ts`: management-mode action metadata.
- `packages/simulation-engine/tests/phase-9-8-readiness.test.ts`: readiness and automatic captaincy coverage.

## Synchronisation evidence

Manual/Assisted actions continue to flow through `TacticalDeliveryAction` and `stepDelivery`. Automatic mode substitutes the AI action at the same boundary; it does not use a second engine. The next bowler is validated by the existing transition rules, and each delivery records the effective tactical action.

## Tests

- `pnpm --filter @cricket/simulation-engine build` — passed.
- `pnpm --filter @cricket/web typecheck` — passed.
- `pnpm --filter @cricket/simulation-engine test -- phase-9-8-readiness.test.ts` — 6/6 passed.
- Existing focused web integrity tests — 17/17 passed.
- Prior full baseline: simulation engine 17 files / 91 tests; web 14 files / 99 tests.

## Browser verification and screenshots

Not completed in this environment. The local Next.js process started successfully, but the available in-app browser could not reach `localhost`, `127.0.0.1`, the host network address or `host.docker.internal`; all navigation attempts timed out. No screenshot is claimed. A browser with local-dev access must still verify 360×800, 390×844, 768×1024, 1280×720 and 1440×900.

## Known limitations

- The over-end panel is implemented in the live match page; full browser-level visual validation and complete end-to-end clicking remain outstanding.
- Assisted recommendation scoring is deterministic and context-aware but still intentionally lightweight; a later calibration pass can incorporate richer player form and pitch-condition weighting.
- Mode changes are recorded on subsequent delivery actions; a standalone no-delivery mode-change event is not yet persisted.

## Working tree and commit

This report is prepared for commit with the Phase 9.8 implementation. Unrelated pre-existing changes in `apps/web/context/AudioContext.tsx`, the shortcut, music directory and `docs/FINAL_WEBSITE_AUDIT_REPORT.md` are excluded.
