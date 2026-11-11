# Phase 9.9 — Visual Design and Anti-AI-Slop Audit

**Status:** Audit only  
**Evidence level:** Source confirmed unless marked otherwise  
**Runtime/browser testing:** Not performed in this audit

## Executive assessment

Cricket Dream XI has a recognizable dark green broadcast identity, a coherent token vocabulary, deterministic player avatars, and a strong cricket field visualizer. The interface currently reads as a technically ambitious prototype because product copy, broadcast styling, engineering telemetry, and game controls compete for the same visual attention.

The dominant anti-AI-slop risk is repetition: repeated status badges, repeated uppercase labels, repeated rounded cards, repeated green glow treatments, and repeated claims about determinism, offline operation, player count, and engine readiness. These are confirmed source-level observations, not a claim about the authorship of the interface.

## Confirmed findings

| ID | Priority | Location | Evidence | Why it weakens the product | Recommendation |
|---|---|---|---|---|---|
| VD-01 | P1 | `apps/web/app/page.tsx:217-310`, `apps/web/components/EnterArenaSplash.tsx:53-88`, `apps/web/components/StitchHeader.tsx:143-165` | Multiple engine/offline/player-count status labels and badges use uppercase monospace treatment. | The product announces its implementation repeatedly before showing the game. This feels like a generated landing-page pattern rather than a confident game interface. | Keep one compact status in the header; remove duplicated platform claims from hero, splash, and footer. **MUST FIX / Medium** |
| VD-02 | P1 | `apps/web/app/page.tsx` and `apps/web/app/match/page.tsx` | Frequent `uppercase`, `tracking-wider`, `tracking-widest`, label-caps, glow shadows, and pill badges. | Short labels become visually loud and long labels become harder to read. The hierarchy collapses because headings, buttons, metadata and status chips share the same voice. | Reserve uppercase for short cricket telemetry labels. Use sentence case for headings, actions and explanations. **MUST FIX / Medium** |
| VD-03 | P1 | `apps/web/components/StitchHeader.tsx:106-113` | Header uses a hardcoded `/assets/stitch/asset-002.png` image with a fallback. | The manager identity is not connected to the active local profile. A static demo face makes the shell feel unfinished. | Use the existing authoritative avatar resolver or initials from the local manager profile. **MUST FIX / Small** |
| VD-04 | P1 | `apps/web/components/Navbar.tsx`, `apps/web/components/StitchHeader.tsx`, `apps/web/app/layout.tsx` | Two navigation components exist; `Navbar.tsx` is not connected to the layout while `StitchHeader` is active. | Two visual systems and two maintenance paths create inconsistent future behavior. | Establish one active shell and mark the legacy component for later removal after import verification. **MUST FIX / Small** |
| VD-05 | P2 | `apps/web/app/page.tsx`, `apps/web/app/match/page.tsx` | Many cards use dark surface layers, rounded corners, thin borders, green glow shadows and hover scaling. | Card treatment is consistent but monotonous. Every item looks equally important and interaction is signaled mainly by decoration. | Use fewer container boundaries; group related content with spacing and one primary emphasis. **SHOULD FIX / Medium** |
| VD-06 | P2 | `apps/web/app/match/page.tsx` | Live, setup, telemetry, advanced controls, scorecards and result cards share the same dense visual language. | The live match does not have a clear visual center. Tactical decisions compete with implementation telemetry and historical data. | Define three levels: match state, captain decision, optional detail. Hide engineering metadata by default. **MUST FIX / Medium** |
| VD-07 | P2 | `apps/web/components/InteractiveFieldEditor.tsx:260` | Law compliance is rendered as a compact all-caps engineering-style status line. | A useful cricket rule is presented as diagnostic output rather than guidance. | Use plain language such as “Legal field: 4 of 5 leg-side players” and expose the law reference on demand. **SHOULD FIX / Small** |
| VD-08 | P2 | `apps/web/app/players/page.tsx:286-459` | Search, sort, country, era and format controls are all rendered as dense caps labels and pills. | Player discovery feels like a filter console. New users must decode multiple controls before seeing the player. | Keep search and role/country filters prominent; move rare filters into a “More filters” disclosure. **SHOULD FIX / Medium** |
| VD-09 | P2 | `apps/web/app/match/page.tsx:3799-3812` | Result language includes “CHAMPIONSHIP MATCH FINISHED • OFFICIAL RESULT”, “100% Deterministic Parity Verified (Audit)” and a seed. | Technical proof is valuable, but it dominates the emotional result moment. | Lead with the cricket result and player performances; place verification and seed under “Match details”. **MUST FIX / Small** |
| VD-10 | P3 | `apps/web/components/EnterArenaSplash.tsx:63` | “1,144 international legends, deterministic ball physics, and genuine stadium soundtracks.” | It combines a roster claim, engine claim and audio claim in one marketing sentence. | Use one concrete promise: “Build a team, call the toss, and manage the match.” **SHOULD FIX / Small** |

## Typography and color

The font setup in `apps/web/app/layout.tsx` is intentional and potentially strong: Inter, Manrope and JetBrains Mono create useful roles. The problem is application, not the existence of three fonts. JetBrains Mono and all-caps tracking are applied to ordinary labels and controls, which makes the interface feel like a telemetry dashboard. Use mono for seeds, overs, balls and technical audit values only.

The green palette is distinctive and cricket-relevant. Lime green is currently used for primary actions, success, active state, links, highlights and engine status. That weakens semantic meaning. Keep one bright green for the primary action and use a quieter mint for secondary emphasis. Amber and red should remain reserved for warnings and wickets.

## What should remain unchanged

- The dark field-and-stadium identity.
- The central PixiJS field visualizer.
- Deterministic avatars when licensed photography is unavailable.
- Format-specific color cues where they help users distinguish T10, T20, ODI and Test.
- Real cricket scorecard structure and detailed statistics.
- Progressive disclosure of advanced captaincy controls.

## Evidence limits

No browser screenshots or live viewport checks were performed. Claims about clipping, animation smoothness, focus visibility and actual perceived contrast remain **NOT VERIFIED** here. The findings above are source-level observations and recommendations.

