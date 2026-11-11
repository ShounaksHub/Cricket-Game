# Phase 9.9 — Screen-by-Screen Recommendations

**Status:** Recommendations only; no implementation performed

| Element | Current implementation | Problem | Proposed improvement | Priority | Benefit |
|---|---|---|---|---:|---|
| Home hero | Three prominent actions in `apps/web/app/page.tsx:280-310` | New users must choose between match, squad and rules immediately | Make “Start a match” primary; keep squad secondary; move rules to help | P1 | Faster first success |
| Home status strip | Engine, roster and offline claims across home/header/splash | Repetition makes the page feel promotional and artificial | One concise “Offline match engine ready” status | P1 | Cleaner identity |
| Home format cards | Five format cards with similar card treatment | Important distinctions are visually equal to decorative content | Show format, duration, first decision and one action | P2 | Better scanning |
| Dream XI filters | Multiple caps chips and selectors | Player selection feels like a data console | Keep search, role and country; place era/format/sort under More filters | P1 | Lower cognitive load |
| Dream XI validation | Summary validation around squad state | User may not know which slot causes the issue | Inline slot highlighting plus one corrective instruction | P1 | Faster valid squad |
| Pre-innings modal | Batting order and opening bowler sections | The opening pair decision is not visually distinct enough | Add “Opening pair” step and striker/non-striker explanation | P1 | Better cricket comprehension |
| Toss | Toss controls in match flow | Call and toss action can be confused | Separate “Call heads/tails” from “Toss coin” | P2 | Fewer wrong actions |
| Match setup | Format is local state while home sends query format | User-selected format may be lost | Hydrate format from URL and show it in the setup heading | P1 | Preserves intent |
| Live scoreboard | Score, commentary, tactical controls and telemetry share the route | Current cricket state competes with secondary information | Scoreboard should occupy the first visual band and stay stable | P1 | Faster comprehension |
| Captain controls | Plan, bowler, field and advanced controls | Too many simultaneous decisions | Default to plan, bowler, field and Continue; disclose advanced tactics | P1 | Beginner usability |
| Simulation speed | `SIM OVER`, `SIM INNINGS`, `SIM MATCH` beside controls | Speed shortcuts look like competing actions | Put them under “Simulation speed” or “Skip to…” | P1 | Clear primary action |
| Field editor | Detailed field positions and MCC counts | Legal feedback reads like telemetry | Use plain-language legal state with a details link | P2 | Better learning |
| Wicket decision | `DecisionModal.tsx` supports next batter selection | The event context can be buried under a generic modal title | Show dismissed batter, score, over and striker position first | P1 | Better decision quality |
| Result hero | Result plus parity, seed and audit language | Technical proof competes with result | Result → key performers → scorecard → audit details | P1 | Stronger finish |
| Scorecard | Detailed innings tables | Useful detail is mixed with technical context elsewhere | Preserve tables; move engine metadata into a collapsible details panel | P2 | Maintains depth |
| My Cricket | Resume, history, squads, preferences, roadmap and reset | Several product layers share one dashboard | Four sections: Continue, Results, Teams, Settings | P1 | Easier return flow |
| Match history | “LOAD SEED” and “AUDIT PARITY” | Implementation vocabulary is exposed to ordinary players | “Replay match” primary; audit as secondary | P2 | More natural language |
| Header identity | Static Stitch image | Manager identity feels fake | Use local profile name and deterministic avatar | P1 | Personal ownership |
| Global shell | `Navbar.tsx` and `StitchHeader.tsx` coexist in source | Duplicate navigation system creates design drift | Maintain one active navigation contract | P1 | Long-term consistency |
| Modals | Welcome, upcoming feature and decision modals | Modal vocabulary and density vary | Standardize title, context, action, close and keyboard behavior | P2 | More predictable interaction |

## Implementation order

1. Preserve query intent and simplify the primary match action.
2. Clarify opening pair, toss, wicket and over-end decisions.
3. Reduce live-match control density through progressive disclosure.
4. Reorder result and history information around cricket tasks.
5. Consolidate global navigation and manager identity.
6. Tune typography, status copy and repeated card treatments.
7. Recheck responsive and keyboard behavior in a browser.

## Do not change

- The PixiJS field as the visual centerpiece.
- The actual cricket scorecard and detailed figures.
- Manual/Assisted/Automatic choices.
- Format-specific rules and field restrictions.
- Offline local match persistence.

