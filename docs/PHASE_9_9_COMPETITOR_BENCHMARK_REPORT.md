# Phase 9.9 — Competitor Benchmark Report

**Status:** Desk research and source comparison only  
**No competitor product was run locally and no screenshot was treated as inspected unless linked below.**

## Comparison principles

The benchmark compares patterns, not branding or layouts. Cricket Dream XI should not copy proprietary presentation. The useful question is which product behaviors help a player make a decision with less friction.

## Reference evidence

- [Cricket 24 — PlayStation product page](https://www.playstation.com/en-us/games/cricket-24/) describes broad licensed content, career mode and detailed stadium presentation. This supports a benchmark of breadth and immersion, not a claim about its exact in-game UI.
- [Cricbuzz](https://www.cricbuzz.com/) publicly presents live scores, commentary, highlights and match-oriented information architecture. Its public landing page supports the separation of score, commentary and news surfaces.
- [Football Manager 26 features](https://www.footballmanager.com/fm26/features) and [FM27 navigation upgrades](https://www.footballmanager.com/fm27/features/fm27-clearer-interface-smoother-navigation) describe a manager UI organized around navigation, match day, tactics and clearer information access.
- [Football Manager tactical effectiveness](https://www.footballmanager.com/fm27/features/fm27-training-and-tactical-effectiveness) describes tactical changes being connected to player performance and manager decisions. This is a useful model for explaining the effect of a choice without exposing engine internals.

## Matrix

| Area | Reference pattern | Cricket Dream XI source position | Gap | Worth improving? |
|---|---|---|---|---|
| Home | Clear entry into a broad game world, then deeper management | Home combines start, build, laws, formats, scenarios, system claims and status cards | Too many equal-weight entry points | Yes — P1 |
| Team building | Manager games generally expose role/context before deep detail | Dream XI builder has rich player data and validation | Dense filters and ratings compete with selection | Yes — P1 |
| Match setup | Manager products make the next decision obvious | Match page contains setup, toss, management and simulation controls | Technical shortcuts compete with the main flow | Yes — P1 |
| Live score | Score-first presentation is a standard live-sport pattern | Score, commentary, field and controls share a dense screen | Cricket state is diluted by telemetry and advanced controls | Yes — P1 |
| Tactical advice | Manager games explain why a recommendation exists | Assisted mode can recommend plan/bowler/field | Recommendation rationale is not consistently the primary message | Yes — P1 |
| Commentary | Live cricket sites separate score, commentary and supporting information | Commentary is part of a large live cockpit | It can be visually crowded by other telemetry | Yes — P2 |
| Statistics | Scorecards use stable tables and clear innings hierarchy | Detailed scorecard exists | Technical audit data competes with cricket result | Yes — P2 |
| Results | Sports products emphasize result and key performances first | Result includes audit parity and seed language near the hero | Emotional and technical priorities are reversed | Yes — P2 |
| Return flow | Manager products treat the hub as a clear continuation point | My Cricket mixes history, squads, settings and cloud roadmap | “Load seed” and “audit parity” are implementation-led | Yes — P2 |
| Identity | Premium sports products make player/team identity meaningful | Header uses a static asset while deterministic player avatars exist | Manager identity is disconnected from local profile | Yes — P1 |

## What Cricket Dream XI can learn

1. Keep a score-first live hierarchy like live cricket services.
2. Use manager-style contextual recommendations: state the recommendation and its reason in one line.
3. Separate the matchday decision surface from audit and engine diagnostics.
4. Give the home screen a clear “start here” route while retaining deeper paths.
5. Preserve the game’s distinctive field visualizer and deterministic offline architecture; these are product-specific strengths.

## What should not be copied

- Licensed broadcast branding or competitor-specific colors.
- Proprietary scoreboard layouts.
- A football-manager information architecture that ignores cricket’s over, wicket and innings rhythm.
- More dashboards merely because competitors have more dashboards.

## Evidence limits

The benchmark uses official product pages and publicly visible service pages. It does not claim hands-on inspection of EA SPORTS Cricket, Cricket 07, Real Cricket, WCC, or private in-game interfaces. Those comparisons are therefore **NOT VERIFIED** and are excluded from hard findings.

