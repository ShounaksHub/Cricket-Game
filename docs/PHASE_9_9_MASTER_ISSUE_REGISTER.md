# Phase 9.9 — Master Issue Register

**Status:** Audit-only register  
**Evidence convention:** CONFIRMED = source evidence; OBSERVED = existing repository audit evidence; POTENTIAL = requires runtime validation; SUBJECTIVE = design recommendation

| ID | Evidence | Priority | Classification | Area | Issue | Recommendation | Effort |
|---|---|---:|---|---|---|---|---|
| 9.9-01 | CONFIRMED | P1 | MUST FIX | Navigation | Active Stitch header and unused legacy Navbar represent competing shells | Establish one navigation contract | Small |
| 9.9-02 | CONFIRMED / existing audit | P1 | MUST FIX | Match setup | Home format query can be ignored by match page local format initialization | Hydrate and display query format | Small |
| 9.9-03 | CONFIRMED | P1 | MUST FIX | Visual identity | Header avatar is a static asset rather than the local manager identity | Use profile-backed avatar/initials | Small |
| 9.9-04 | CONFIRMED | P1 | MUST FIX | Live match | Advanced controls and simulation shortcuts compete with the primary captain action | Progressive disclosure and one primary Continue action | Medium |
| 9.9-05 | CONFIRMED | P1 | MUST FIX | Copy | Engine/offline/player-count claims repeat across shell, home and splash | Consolidate status language | Small |
| 9.9-06 | CONFIRMED | P1 | SHOULD FIX | Cricket UX | Opening pair is not presented as a distinct cricket decision | Name and explain striker/non-striker choice | Small |
| 9.9-07 | CONFIRMED | P1 | SHOULD FIX | Cricket UX | Wicket and over decisions expose implementation detail before cricket context | Lead with event, score and decision | Medium |
| 9.9-08 | CONFIRMED | P1 | SHOULD FIX | Player builder | Validation is not clearly localized to the offending slot | Highlight affected player/slot | Medium |
| 9.9-09 | CONFIRMED | P2 | SHOULD FIX | Typography | Uppercase tracking and mono labels are overused | Limit caps/mono to short telemetry | Medium |
| 9.9-10 | CONFIRMED | P2 | SHOULD FIX | Result | Audit parity and seed information are too prominent in result hero | Move to details | Small |
| 9.9-11 | CONFIRMED | P2 | SHOULD FIX | History | “Load seed” is implementation language | Rename to “Replay match” | Small |
| 9.9-12 | CONFIRMED | P2 | SHOULD FIX | Field editor | Law counts read like diagnostics | Add plain-language legality state | Small |
| 9.9-13 | OBSERVED | P2 | MUST VERIFY | Responsive | Player table, commentary and canvas have reported narrow/laptop risks | Verify at required viewports and capture evidence | Medium |
| 9.9-14 | CONFIRMED / existing audit | P2 | SHOULD FIX | Content | Static/future feature labels and status badges add noise | Keep only actionable roadmap states | Small |
| 9.9-15 | CONFIRMED | P2 | SHOULD FIX | My Cricket | Resume, history, squads and settings are mixed together | Use task-based sections | Medium |
| 9.9-16 | POTENTIAL | P2 | MUST VERIFY | Accessibility | Modal Escape, focus trap and return focus behavior are not established by source review | Keyboard audit in browser | Medium |
| 9.9-17 | CONFIRMED | P3 | OPTIONAL | Components | Repeated rounded card and glow treatments reduce hierarchy | Use spacing and fewer container boundaries | Medium |
| 9.9-18 | CONFIRMED | P3 | SHOULD FIX | Toss | “Spin the coin” may not communicate call selection | Split call and toss actions | Small |
| 9.9-19 | CONFIRMED | P3 | SHOULD FIX | Content | Technical phrases such as “broadcast-grade” and “deterministic physics” appear in onboarding metadata | Replace with player-facing benefits | Small |
| 9.9-20 | SUBJECTIVE | P4 | OPTIONAL | Visual polish | Some result and setup surfaces use high-intensity effects | Keep effects only where they mark state or reward | Small |

## Top five release priorities

1. Preserve format selection from home to match setup.
2. Make the live captain decision the only obvious primary action.
3. Remove duplicate shells and repeated engine-status copy.
4. Make opening pair, wicket and over decisions explicit in cricket language.
5. Verify responsive and keyboard behavior before visual polish work.

## Exclusions

No simulation, rules, persistence, player data, API or application code was changed. The register does not assert runtime failures where only source evidence exists.

