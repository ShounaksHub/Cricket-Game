# Phase 9.9 — Cricket Gameplay UX Audit

**Status:** Audit only  
**Scope:** Cricket-specific communication and decision quality; no rules or engine changes

## Overall assessment

The product has unusually rich cricket concepts: batting order, opening pair, toss, opening bowler, field restrictions, bowling plans, innings transitions, scorecards and deterministic replay. The central UX risk is that the game names those concepts in technical or broadcast language before explaining the cricket decision itself.

## Domain findings

| ID | Area | Evidence | Finding | Priority | Recommendation |
|---|---|---|---|---:|---|
| CR-01 | Toss | Match setup and toss controls in `apps/web/app/match/page.tsx` | The toss action and call choice need to make the required user action explicit. Existing audit evidence describes “SPIN THE COIN” as ambiguous when the call has not been made. | P2 | Use “Call heads” / “Call tails”, then “Toss the coin”. |
| CR-02 | Opening pair | `PreInningsManagementModal.tsx` | Batting order management exists, but the first two batters are presented as a lineup operation rather than an explicit opening-pair decision. | P1 | Label the first two slots “Opening pair” and explain striker/non-striker order. |
| CR-03 | Incoming batter | `DecisionModal.tsx` | The modal supports `NEXT_BATTER`, but the decision must clearly state which batter was dismissed, who is currently at the non-striker’s end, and whether the incoming player takes striker. | P1 | Use a short wicket summary followed by “Choose the next batter”. |
| CR-04 | Opening bowler | `PreInningsManagementModal.tsx:217-276` | Opening bowler cards expose role and overs, but the user needs a reason to choose one: new ball, pace, swing, spin or matchup. | P2 | Add one recommendation sentence; keep detailed ratings available on demand. |
| CR-05 | Bowling plan | `apps/web/app/match/page.tsx` and engine plan types | Attack, Balanced and Defensive are meaningful plans, but the UI also exposes line, length, variation, pace and intent together. | P1 | Make plan the first decision; keep the rest under Advanced tactics. |
| CR-06 | Field placement | `InteractiveFieldEditor.tsx` | Field legality is technically visible, including MCC Law 28.4 counts, but the wording is diagnostic and dense. | P2 | Show “Legal” / “Needs one change” first; expose law counters as detail. |
| CR-07 | Modes | Match controls | Manual, Assisted and Automatic are good concepts, but the default behavior and pause points need a one-line explanation at selection time. | P1 | “Assisted recommends a bowler and plan; you approve at safe decision points.” |
| CR-08 | Over-end decisions | Match control sections | `SIM OVER`, `SIM INNINGS` and `SIM MATCH` make the simulation tool feel like a developer console beside captain decisions. | P1 | Put speed controls in a secondary menu and keep “Continue” as the main action. |
| CR-09 | Result language | `apps/web/app/match/page.tsx:3799-3812` | Result presentation foregrounds audit parity and seed data. | P2 | Lead with result, margin, innings and best performances; place audit details below. |
| CR-10 | Replay | `apps/web/lib/match-persistence.ts`, match history UI | “Load seed” describes the implementation rather than what the player wants to do. | P2 | Use “Replay match” and show “Recorded captain decisions” in details. |

## Cricket language recommendations

Prefer:

- “Opening pair” over “batting order management” when only the first two players are relevant.
- “Choose the next batter” over “incoming batter selection”.
- “Keep this bowler” over “retain current strategy” when the decision is a bowler change.
- “Protect the boundary” over “death boundary defense” in beginner mode.
- “What should we try next?” over “tactical delivery action”.
- “Replay the match” over “load seed”.

Retain technical terms when they are authentic cricket language: powerplay, required rate, yorker, field restriction, fall of wicket, strike rate and economy. Explain them contextually rather than replacing them with generic game language.

## Beginner versus expert presentation

Beginner default:

1. Score, overs, target and current batters.
2. Current bowler and one recommendation.
3. Attack / Balanced / Defensive.
4. Field preset.
5. Continue.

Advanced disclosure:

- Line and length.
- Variations.
- Pace intent.
- Custom field positions.
- Matchup and workload detail.
- Replay audit and seed information.

This keeps the engine depth while matching the user’s cricket decision hierarchy.

## What should remain unchanged

- Real field restrictions and legality feedback.
- Actual bowler eligibility and quotas.
- User selection of opening pair, next batter and next bowler.
- Over-end and wicket decision points.
- Detailed scorecard figures and fall-of-wicket information.

## Evidence limits

This report is based on source inspection and existing repository audit evidence. No live match was played in a browser during this phase, so the timing, modal interruption and mobile readability of these decisions are **NOT VERIFIED**.

