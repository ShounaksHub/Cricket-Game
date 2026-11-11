# Phase 9.9 — Final Visual Design and Anti-AI-Slop Audit

**Project:** Cricket Dream XI  
**Mode:** Audit only  
**Date:** November 2026  
**Application changes:** None

## Overall assessment

Cricket Dream XI has a strong product idea and a distinctive cricket-specific foundation. The field visualizer, real scorecard concepts, format coverage, player catalogue and captaincy depth are meaningful assets. The current interface does not yet feel consistently premium because it mixes three voices: a broadcast sports presentation, a dense analytics dashboard and a technical engine status page.

The biggest quality issue is prioritization. The interface often explains how the engine works when the player needs to know what to do next. The anti-AI-slop problem is therefore mostly a product editing problem: repeated badges, generic promotional copy, excessive uppercase, uniform cards and technical claims create a “generated dashboard” impression.

## Scores

These are audit judgments, not automated measurements.

| Dimension | Assessment | Reason |
|---|---:|---|
| Visual identity | 7/10 | Distinctive palette and cricket field identity; repetitive effects and duplicate shells reduce confidence. |
| Visual hierarchy | 5/10 | Important score and decisions compete with telemetry, badges and shortcuts. |
| Beginner UX | 5/10 | Rich functionality exists, but the first decision is not always obvious. |
| Advanced UX | 7/10 | The product exposes serious tactical depth and detailed scorecards. |
| Cricket communication | 6/10 | Concepts are authentic, but several are named in implementation language. |
| Content quality | 4/10 | Repeated technical claims and all-caps copy make the product feel promotional. |
| Accessibility confidence | 4/10 | Source review identifies areas needing keyboard, focus and responsive verification. |
| Product polish | 5/10 | Strong foundation with visible prototype and maintenance debt. |

## Strongest existing design elements

- The dark green cricket identity is recognizable.
- The PixiJS field remains a meaningful center of the match experience.
- Scorecard, innings, fall-of-wicket and player-performance concepts are appropriate for cricket.
- Manual, Assisted and Automatic management modes provide a good depth model.
- Deterministic avatars are more honest than unlicensed photographic claims.
- The product preserves advanced tactics instead of flattening the game into a generic arcade flow.

## Biggest weaknesses

1. The home screen has too many equal-weight entry points.
2. Match setup can lose the format selected in the URL according to existing source audit evidence.
3. Live-match controls expose too much implementation detail at once.
4. Repeated engine, offline, roster and determinism claims dominate the visual language.
5. The header identity is static while the application has local profile data.
6. Uppercase and mono styling is used beyond short telemetry labels.
7. Result and history surfaces foreground audit terminology over cricket meaning.
8. Navigation and modal systems need a single consistent interaction contract.

## Top 20 recommendations

The full register is in [PHASE_9_9_MASTER_ISSUE_REGISTER.md](PHASE_9_9_MASTER_ISSUE_REGISTER.md). In order:

1. Preserve home format intent in match setup.
2. Make Start Match the home primary action.
3. Make Continue the live-match primary action.
4. Move simulation speed shortcuts behind a secondary control.
5. Put Attack/Balanced/Defensive before advanced bowling fields.
6. Label the opening pair explicitly.
7. Show wicket context before choosing the next batter.
8. Explain bowler recommendations in one cricket sentence.
9. Localize squad validation to player slots.
10. Replace static header avatar with local manager identity.
11. Maintain one active navigation system.
12. Consolidate offline and engine status copy.
13. Limit all caps to short labels.
14. Limit mono to seeds, overs and technical audit values.
15. Move replay verification below the cricket result.
16. Rename Load Seed to Replay Match.
17. Reframe field legality as plain-language guidance.
18. Organize My Cricket around Continue, Results, Teams and Settings.
19. Standardize modal title, context, action, close and keyboard behavior.
20. Perform browser-based responsive and keyboard verification before cosmetic redesign.

## Recommended implementation order and effort

**Small, high value:** format hydration; copy consolidation; replay wording; manager avatar; toss wording; result metadata relocation.

**Medium, high value:** live progressive disclosure; slot-level validation; task-based My Cricket sections; modal accessibility; opening-pair and wicket-decision context.

**Later polish:** card reduction, glow restraint, typography tuning and decorative effect cleanup.

## Design elements that should not change

- Do not replace the PixiJS field with a generic dashboard graphic.
- Do not remove scorecard detail, cricket laws, workload or replay evidence.
- Do not remove manual, Assisted or Automatic modes.
- Do not replace the cricket phase model with generic sports terminology.
- Do not add more gradients, glows, badges or decorative telemetry to solve hierarchy problems.
- Do not change engine behavior as part of a visual audit.

## Evidence and limitations

Evidence was collected through repository source inspection, existing repository audit documents, and public competitor product pages. No browser session, screenshots, viewport matrix, keyboard pass, or competitor gameplay session was available in this audit. Therefore runtime claims about clipping, animation, focus, modal behavior and actual first-time completion are **NOT VERIFIED** and should be tested before implementation.

## Final disposition

The application is a promising, technically deep cricket management product with a visible presentation debt. The correct next step is a focused hierarchy and content pass, followed by browser verification. A broad visual rewrite or additional decorative treatment is not justified by this audit.

