# Phase 9.9 Cricket Gameplay UX Audit Report

## Scope

This is a report-only audit of the cricket gameplay experience. It covers the post-toss setup flow, opening batting and bowling decisions, wicket and over decision points, live captaincy controls, feedback language, and small-screen usability. No application code, tests, or unrelated documentation were changed for this audit.

Browser testing was not performed. Findings are based on static inspection of the current match page and the `PreInningsManagementModal` and `DecisionModal` components.

## Executive assessment

The gameplay flow has the essential captaincy decisions in place: the user can reorder the batting lineup, select the opening bowler, choose a field, select an incoming batter after a wicket, delegate a decision to the AI, and continue at the end of an over. The engine-facing state is also represented in the match page through persisted batting, bowling, field, mode, and decision state.

The main UX risk is density. The interface presents a large amount of match setup and technical information at once, while several important rules are expressed through implementation details or fallback behavior instead of plain user guidance. A beginner can complete the flow, but may not understand why a player is eligible, what decision is required next, or what the selected plan will change.

## Findings

### P1 — Post-toss setup asks for more information than the immediate decision requires

The post-toss screen presents the complete batting order, opener spotlight, opening bowler selection, field editor, field legality counters, opponent captain panel, and a mandatory start footer in one large cockpit. The page labels the stage as “MANDATORY PRE-MATCH CONFIGURATION” and uses dense uppercase labels throughout.

Evidence:

- `apps/web/app/match/page.tsx` renders the post-toss management screen with the full batting order and field setup in the same view.
- The screen exposes detailed field legality counts before the user has chosen whether to use a preset or custom field.

Impact: beginners must scan several tactical surfaces before finding the one decision that blocks the match from starting.

Recommendation: show a short “Your first decision” card first, then progressively reveal batting order, bowler details, and custom field rules. Keep the full editor available behind an advanced field action.

### P1 — Opening pair selection is visually clear but not expressed as a direct selection action

The opening pair is determined by the first two positions in the reorderable lineup. The UI labels those positions as striker and non-striker, but the user must infer that moving a player into position #1 or #2 is the selection mechanism.

Evidence:

- `apps/web/app/match/page.tsx` derives the opening pair from `activeLineup[0]` and `activeLineup[1]`.
- `PreInningsManagementModal.tsx` offers move up and move down controls rather than “Select opener” actions.

Impact: experienced players understand the batting-order model, while beginners may look for two explicit opener selectors.

Recommendation: retain reorder controls, but add a plain instruction such as “Move any two players into #1 and #2 to choose your opening pair,” plus a compact confirmation summary immediately above the start button.

### P1 — Bowler eligibility is not consistently communicated before selection

The post-toss page builds an eligible-bowler list from profile presence and excludes only a pure wicketkeeper role. The reusable engine AI eligibility logic is stricter about an explicit `NONE` bowling style, but the setup UI does not expose a reason when a player is unavailable or unsuitable.

Evidence:

- `apps/web/app/match/page.tsx` filters opening bowlers by profile and pure wicketkeeper role.
- `PreInningsManagementModal.tsx` renders the supplied lineup without an unavailable-state explanation.

Impact: a user can see a broad player list without understanding whether a part-time player is legal, recommended, or merely available through fallback behavior.

Recommendation: show “Eligible,” “Part-time,” or “Unavailable” states with a short reason. Use the same eligibility predicate as the engine wherever the UI creates a bowling choice.

### P1 — Important state transitions rely on technical or inconsistent wording

The experience uses labels such as “POST-TOSS MANAGEMENT,” “TACTICAL READINESS VERIFIED,” “BOWLING CHANGE REQUIRED,” “SIMULATION PAUSED,” and “DELEGATE TO AI.” These communicate system state to a technical reader, but do not always state the user’s next action in cricket language.

Evidence:

- `DecisionModal.tsx` uses “BOWLING CHANGE REQUIRED” and “Simulation paused until selection.”
- The same modal presents both “Auto (AI)” and “Let AI Choose (Auto-Manage)” for the same delegation concept.

Impact: users may not know whether they are approving a recommendation, changing the current tactic, or handing over the entire match.

Recommendation: standardize to one action vocabulary: “Choose a batter,” “Choose the next bowler,” “Keep current plan,” and “Let the captain decide.” Explain whether delegation applies to one decision or the rest of the innings.

### P2 — The live cockpit exposes advanced tactical controls alongside the primary decision

The live match page combines management mode, bowling plan, bowler selection, field selection, advanced controls, scoreboard data, and simulation actions in the same control zone. The page contains the correct progressive-disclosure concept, but the default surface still carries many technical controls and labels.

Evidence:

- `apps/web/app/match/page.tsx` renders management mode, plan, field, and advanced tactical controls in the live bowling section.
- The primary state and the technical action parameters are adjacent in the same region.

Impact: the captain’s next meaningful choice is harder to identify, especially on narrow screens.

Recommendation: make the primary card contain only plan, bowler, field, and one continue action. Put line, length, variation, pace, and intent behind an explicit “Advanced tactics” disclosure. Keep the advanced values synchronized with the selected plan.

### P2 — Over-end and wicket decisions are structurally correct but need stronger context

The decision modal pauses the simulation at valid points and supports direct selection or AI delegation. The modal title identifies the event, but the decision view does not appear to summarize enough immediate match context for a beginner to make a confident choice.

Evidence:

- `DecisionModal.tsx` receives title, subtitle, player options, recommendations, and secondary information.
- The footer confirms that the simulation is paused until selection.

Impact: the user can choose a player, but may lack the score, current over, batter situation, bowler workload, or reason for the recommendation at the moment of choice.

Recommendation: include a compact context strip: score, over, wickets, current batter situation, previous over result, and the reason for the recommendation. Keep it optional and short.

### P2 — The interface uses dense uppercase and telemetry styling for beginner decisions

The match page and modal components use frequent uppercase headings, monospace metadata, technical badges, and multiple status chips. This supports the existing design language but increases reading effort for simple cricket decisions.

Recommendation: reserve uppercase labels for status and phase markers. Use sentence case for instructions and button labels. Keep score and player names visually dominant over implementation-oriented metadata.

### P2 — Small-screen behavior needs explicit validation

The post-toss and decision surfaces use responsive grid classes and scrollable modal bodies, which is a good structural base. However, the number of controls, long labels, lineup cards, field rules, and footer actions create a material risk of excessive vertical scrolling and hidden primary actions at 360 px and 390 px widths.

No browser or viewport test was executed for this report. This remains an evidence gap rather than a pass.

Recommendation: perform a dedicated 360 × 800 and 390 × 844 interaction pass covering toss confirmation, opener selection, wicket replacement, over-end continuation, and start/resume actions.

## Existing strengths

- Opening batting order is represented as a real ordered lineup, so changing positions changes the actual first two batters.
- Opening bowler nomination is persisted into match initialization rather than being visual-only.
- Incoming-batter selection is presented as a dedicated decision point after a wicket.
- Over-end captaincy decisions are separated from delivery execution and can be delegated to AI.
- The field editor exposes legality feedback for powerplay and Law 28 constraints.
- The live page exposes a clear start gate and a visible current score, over, batter, and bowler context.

## Recommended Phase 9.9 acceptance checks

1. A new user can identify the next required action without reading technical labels.
2. The user can explicitly identify the opening pair and see a confirmation before starting.
3. Only legally eligible bowlers are selectable, with a plain-language reason for exclusions.
4. After a wicket, the replacement batter choice is visible, understandable, and persisted.
5. At over end, the user can keep the current plan with one obvious action.
6. A selected bowling plan visibly explains its tactical effect without promising a guaranteed outcome.
7. Advanced controls remain available without competing with the primary decision.
8. The full flow remains usable at 360 × 800 and 390 × 844.
9. Refresh and resume preserve the visible decision state and the selected player identities.

## Verification record

Checks performed:

- Static source inspection of `apps/web/app/match/page.tsx`.
- Static source inspection of `apps/web/components/PreInningsManagementModal.tsx`.
- Static source inspection of `apps/web/components/DecisionModal.tsx`.
- Review of Phase 9.8.2 reports for existing persistence and AI behavior.

Checks not performed:

- Browser interaction testing.
- Viewport screenshots.
- Automated UX tests.
- Changes to application code.

## Conclusion

The core cricket decisions are present and connected to match state. Phase 9.9 should focus on reducing the number of simultaneous choices, making eligibility and consequences understandable, and validating the complete interaction flow on small screens. This report intentionally contains findings and recommendations only; no implementation changes were made.
