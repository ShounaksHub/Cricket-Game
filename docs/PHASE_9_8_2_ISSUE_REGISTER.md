# Phase 9.8.2 Consolidated Issue Register

| ID | Area | Finding | Disposition | Evidence |
|---|---|---|---|---|
| 9.8.2-01 | Calibration | T20 baseline produced 5.13 RPO and excessive dots | Fixed by baseline calibration | Full suite; final calibration 8.08 RPO |
| 9.8.2-02 | Phase logic | T10 death boundaries were hardcoded incorrectly | Fixed with shared phase definitions | T10 phase regression and full suite |
| 9.8.2-03 | Automatic captaincy | Next-bowler recommendation could be undefined | Fixed eligibility and deterministic selection | AI/readiness tests; full suite |
| 9.8.2-04 | Persistence | Resume could silently invent an AI action when a saved tactic was absent | Fixed: replay reports the exact missing delivery | Focused persistence tests |
| 9.8.2-05 | Persistence | Opening bowler and batting lineup were not saved in active sessions | Fixed | Focused persistence tests |
| 9.8.2-06 | Replay | Incoming batter choice lacked an independent decision event | Fixed with `BATTER_SELECTED` | Focused persistence tests |
| 9.8.2-07 | Match integrity | State totals could diverge from event-derived scorecard data | Fixed with expanded invariants | State/transition tests; 104 engine tests |
| 9.8.2-08 | Test quota | Risk of arbitrary quota sentinel | No defect found; retained `Infinity` | Ruleset and five-format tests |
| 9.8.2-09 | Browser | Browser acceptance and screenshots | Excluded by request | No browser claims made |

## Open risks

- Recommendation quality is not a full batter/bowler matchup model.
- Local storage is browser-owned and unencrypted by design.
- Fixtures with missing player profiles use legacy lineup eligibility.
