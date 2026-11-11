# Phase 9.8.2 Assisted Recommendations and Automatic Captaincy Audit

## Findings

The AI specialist reproduced the undefined next-bowler recommendation in the Phase 9.8 readiness test. The cause was fragile eligibility and duplicated phase logic around the recommendation boundary. The implementation also needed explicit format-aware Test plans and stronger filtering of unavailable bowlers.

## Repairs

- Shared format phase definitions now drive captaincy phase detection.
- AI actions carry the active phase.
- Test plans distinguish new-ball attack, swing/seam, containment, spin, partnership-breaking, and tail-end contexts.
- Next-bowler recommendations filter explicit non-bowlers, quota exhaustion, and consecutive-over violations while preserving deterministic bowling priority.

## Verification

- Focused AI and phase checks: 18/18 passed in the specialist workspace.
- Integrated engine suite after all repairs: 18 files, 104/104 passed.
- Engine typecheck and build passed.

## Remaining limitations

The transition layer remains the final legality authority. Fixtures with absent player profiles retain lineup-based eligibility behavior. Browser testing is excluded. The AI is context-aware at phase, workload, and legality level but is not a full statistical matchup optimizer.
