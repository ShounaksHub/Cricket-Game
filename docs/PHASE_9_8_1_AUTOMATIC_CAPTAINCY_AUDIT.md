# Phase 9.8.1 Automatic Captaincy Audit

## Scope and findings

The automatic mode routes delivery actions through `resolveAITacticalAction` and the existing `stepDelivery` engine path; it does not use a parallel simulator. The agent audit found that plan selection is coarse (death → Defensive, powerplay/new batter → Attack, otherwise Balanced), next-bowler choice is largely priority-based, and Test context is reduced to the three limited-overs plan labels. Some phase boundaries are repeated in AI code rather than consistently sourced from the phase contract.

The reported suspected sixth-ball-extra issue was not proven to be a defect: the next delivery action is recalculated while the legal-ball count remains at five, so the nomination can be recalculated after an illegal delivery. No change was made without a reproduction.

## Runtime and regression evidence

- Automatic mode uses the authoritative `stepDelivery` transition and existing format rules/quota validation.
- Existing readiness test exercises automatic legal next-bowler nomination at the five-legal-ball boundary.
- Five-format readiness test passes for T10, T20, ODI, Test Red Ball, and Test Pink Ball.
- Targeted command: `pnpm --filter @cricket/simulation-engine test -- phase-9-7-bowling-plans.test.ts phase-9-8-readiness.test.ts` — 9 passed.

## Remaining limitations

No full-innings context-diversity matrix was added for powerplay/middle/death/Test scenarios. AI does not yet use recent bowler performance, matchup strengths, workload suitability beyond eligibility, or a rich field recommendation model. Automatic-mode status and absence of popups were not browser-verified. The automatic captaincy scope therefore remains partially audited, not fully accepted.
