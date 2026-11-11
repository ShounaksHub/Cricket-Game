# Phase 9.9 — UX and User Journey Audit

**Status:** Audit only  
**Runtime status:** Source inspection completed; browser behavior not verified

## Summary

The application contains the right major journeys, but the journey language is organized around implementation concepts as often as player intent. The first-time path exposes too many competing entry points, the match path contains several management layers, and the return path mixes local history, replay verification, active-session resume and “load seed” terminology.

## Journey A — First-time player

**Assessment: P1 friction, CONFIRMED from source.**

`apps/web/app/page.tsx` presents instant match, custom squad, laws, format cards, scenarios, system status and roster statistics in the same landing surface. The three hero actions around lines 280–310 compete for priority. The application also mounts `WelcomeModal` in `apps/web/app/layout.tsx`, while other components emit modal-opening events. This creates two onboarding concepts: a global welcome and page-level educational content.

Recommended path:

1. One primary action: “Start a match”.
2. One secondary action: “Build a Dream XI”.
3. Put rules and technical information behind help.
4. Ask for format only after the first action, or make the chosen format explicit on the button.

The first screen should explain the next decision in one sentence, not explain the engine.

## Journey B — Build Dream XI

`apps/web/app/dream-teams/page.tsx` exposes a large player pool, role/rating summaries, validation and a “LOCK IN SQUAD & PROCEED TO TOSS” action. This is a credible manager workflow, but its labels and filter chips are dense. The source also supports many player attributes without an obvious beginner path through them.

| Friction | Evidence | Priority | Recommendation |
|---|---|---:|---|
| Role and rating information compete with selection | `dream-teams/page.tsx:595-720` | P2 | Show role, rating and one fit signal in the default card; reveal deeper metrics on selection. |
| Validation is summarized more than localized | Existing validation panel and slot grid | P1 | Link each validation message to the affected slot and explain the correction. |
| Batting order changes are repetitive | `PreInningsManagementModal.tsx:112-209` | P2 | Add direct position selection or drag-and-drop after the core flow is stable. |
| The next step is all caps and overly formal | `dream-teams/page.tsx:952-956` | P3 | Use “Continue to toss”. |

## Journey C — Start a match

The intended sequence is present in `PreInningsManagementModal.tsx`, `DecisionModal.tsx` and `apps/web/app/match/page.tsx`: setup, toss, toss decision, batting or bowling management, then simulation. The conceptual order is good. The issue is that the screen also exposes simulation shortcuts, telemetry and advanced fields in the same match surface.

The existing source-level audit also identified a high-impact mismatch: homepage format links use `/match?format=...`, while the match page initializes format locally. This should be treated as **P1 CONFIRMED** until rechecked after any later changes. A player clicking “Play ODI” can arrive at a T20 default if the query is not hydrated.

## Journey D — Live match

The live route contains score state, commentary, recent balls, field visualizer, tactical controls, advanced controls, simulation shortcuts and pause/decision behavior. The desired captain cycle is understandable, but the interface presents too many controls at once. “SIM OVER”, “SIM INNINGS” and “SIM MATCH” are especially risky beside a primary continue action because they change the granularity of play.

Recommended priority order:

1. Score and current cricket context.
2. One next captain decision.
3. Keep/change plan, bowler and field.
4. Optional advanced tactics.
5. Simulation shortcuts under a clearly named “Simulation speed” menu.

## Journey E — Finish and review

The result screen does include innings summaries, scorecard tabs, player of the match, replay verification and history. Its weakness is emphasis: “OFFICIAL RESULT”, seed, parity and audit language appear beside the emotional result. A player should first see who won, by how much, key performances and the next choices: review scorecard, replay, play again.

## Journey F — Return to the game

`apps/web/app/my-cricket/page.tsx` supports active match resume, match history, saved squads, replay links and local reset. It is valuable functionality, but “LOAD SEED”, “AUDIT PARITY”, “CLOUD SYNC / SOON”, “OFFLINE PREFERENCES” and “RESET LOCAL DATA” mix user tasks with platform status.

Recommended information architecture:

- Continue match
- Recent results
- Saved teams
- Career summary
- Settings and data management

## Accessibility and feedback

Source review shows extensive icon-only buttons and modal controls with titles, but runtime keyboard and focus behavior was not tested. `DecisionModal.tsx` and `UpcomingFeatureModal.tsx` should be checked for Escape handling, focus trapping and return focus. Native `confirm()` usage in `my-cricket/page.tsx` is visually disconnected from the application shell. These are **CONFIRMED source observations**, with actual keyboard impact **NOT VERIFIED**.

## What should remain unchanged

- The staged toss → management → simulation structure.
- Local offline resume and history concepts.
- Manual, Assisted and Automatic management modes.
- The ability to inspect detailed scorecards after a match.

