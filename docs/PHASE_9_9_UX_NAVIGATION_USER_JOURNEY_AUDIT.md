# Phase 9.9 UX, Navigation and User Journey Audit

**Date:** November 2026  
**Scope:** Static audit of the Next.js route structure, navigation components, deep links, onboarding, match setup, squad flow, active-session flow, history, and replay entry points.  
**Browser testing:** Not executed in this report-only pass.  
**Code changes:** None.

## Executive summary

The application has a coherent top-level journey—Home → Dream XI → Match Setup → Toss → Pre-Innings Management → Live Match → Result/History—and the primary routes exist. The main UX risk is that several user-facing links carry query parameters that are not consumed by the destination page. This makes resume, replay, format selection, and saved-squad play journeys fall back to generic screens instead of opening the requested context.

## Route and navigation inventory

| Route | Primary purpose | Entry points observed | Static result |
|---|---|---|---|
| `/` | Home / start point | Logo, header HOME, footer, CTAs | Available |
| `/dream-teams` | Build and save a Dream XI | Header, home CTA, match setup, career hub | Available |
| `/players` | Browse player registry | Header | Available |
| `/match` | Match setup, toss, management, live match, result | Home, Dream XI, header-adjacent match actions | Available |
| `/my-cricket` | Career metrics, active session, history, squads | Header profile, home career CTA | Available |

`apps/web/layout.tsx` renders `StitchHeader` and `StitchFooter`. `Navbar.tsx` contains a second, different navigation implementation but is not rendered by the root layout. This creates maintenance risk because labels, active-state rules, and API-status presentation can diverge between the two systems.

## Findings and severity

### P0 — Deep-link query parameters are not consumed by `/match`

Evidence:

- Home links to `/match?resume=true` for Quick Resume.
- Home format actions navigate to `/match?format=${format}`.
- My Cricket links to `/match?replayId=${fix.id}` for “REPLAY SIMULATION”.
- My Cricket links to `/match?squadId=${team.id}` for “PLAY”.
- `apps/web/app/match/page.tsx` has no `useSearchParams`, `searchParams` prop, or equivalent query handling.

Impact:

- A selected non-default format from a deep link is not applied; the match page initializes to T20.
- Quick Resume does not automatically resume. The user lands on Match Setup and must find the unfinished-match banner and click Resume.
- “REPLAY SIMULATION” does not select the requested history record.
- “PLAY” does not select the requested saved squad.

The destination page does load local storage on mount, so an active-session banner may still appear, but the URL intent itself is ignored and the journey is not direct or deterministic from the user’s action.

### P1 — Active-session format label reads the wrong property in Career Hub

Evidence: `apps/web/app/my-cricket/page.tsx` renders `{activeSession.config?.format || 'MATCH'}`. The active match session schema stores `format` at the top level and stores the serialized engine config under `configSnapshot`.

Impact: The in-progress banner can show `MATCH` instead of T10, T20, ODI, or Test, reducing confidence before resume.

### P1 — History replay call to action does not match its behavior

The Career Hub button is labelled “REPLAY SIMULATION” but only navigates to `/match?replayId=...`. Since the query is ignored, it does not open the selected record. The Match History drawer’s “LOAD SEED” action does load a stored record when the archived snapshot exists, but the label does not communicate that it restores a recorded match state rather than merely loading a seed.

### P1 — Saved squad play journey is incomplete

The Career Hub “PLAY” link carries `squadId`, but the match page does not consume it. The match setup page can read saved squads from local storage in its own selector, so the user can recover manually, but the explicit squad chosen in the previous screen is not carried into the match setup.

### P2 — Two navigation systems exist

`StitchHeader` is active in the root layout and uses `HOME`, `DREAM XI`, `PLAYERS`, and `MY CRICKET`. `Navbar` defines a separate set of labels—`Overview`, `Player Registry`, `Squad Builder`, `Match Simulator`, `Career Hub`, and `Roadmap`—and a separate rules modal and API status treatment. The unused component is not currently a runtime route defect, but it increases the chance that future changes update only one navigation model.

### P2 — Match format cards are mouse-oriented controls

In Match Setup, the five format choices are clickable `div` elements with `onClick` handlers. They do not expose native button semantics or an obvious keyboard interaction path. The Dream XI builder uses buttons for comparable selection controls, so the two setup journeys are inconsistent.

### P2 — Home quick-resume preview can be misleading

When no active session exists, the home CTA displays the literal fallback `QUICK RESUME (T20 16.2 OV)`. This looks like a real saved match even when there is none. When an active session exists, the home preview derives overs from `visibleEvents.length`, which can disagree with legal overs when wides or no-balls are present.

### P2 — First-use modal adds an unconditional interruption

`WelcomeModal` opens automatically unless `cricket_welcome_dismissed` is present. This is useful for orientation, but it blocks the first interaction on every fresh browser and presents a long technical guide before the user has chosen a journey. The header and footer both provide rules access after dismissal.

## Journey assessment

### New user: Home → first match

The primary CTA is visible and clear. The first-use modal may interrupt the action. Match Setup then exposes format, opponent, conditions, toss, and pre-innings decisions in a logical order. The journey is viable if the user follows the visible controls.

### New user: Home → build a squad → play

The home CTA reaches Dream XI and the builder saves locally. Returning to Match Setup is possible, but the builder’s selected format is passed through a query parameter that Match Setup does not read. The user must reselect or confirm the format manually.

### Returning user: Home/Career Hub → resume

The active session is detected from local storage and a resume banner is shown. The explicit `resume=true` intent is not consumed, so the user receives an intermediate setup screen instead of direct resume. Career Hub’s format label can also be incorrect.

### Returning user: Career Hub → replay history

The history record is displayed with a replay CTA, but the selected record ID is not consumed by Match Setup. Direct replay from that link is therefore not currently reliable. The in-match vault provides a separate record-loading path.

### Mobile navigation

`StitchHeader` includes a mobile drawer with the same four primary destinations and a rules action. The drawer closes on navigation. Static inspection confirms the implementation exists; viewport behavior was not visually tested in this report-only pass.

## Recommended repair order

1. Add one query-state entry point in `/match` for `format`, `resume`, `squadId`, and `replayId`, with explicit fallback behavior for missing or invalid IDs.
2. Make resume and replay links open their requested state directly, while preserving the visible confirmation step for destructive discard actions.
3. Correct the Career Hub active-session property path and use legal-ball state for preview overs.
4. Replace clickable format `div` elements with accessible buttons and selected-state semantics.
5. Retire or clearly mark the unused `Navbar` implementation so there is one navigation source of truth.
6. Replace the fabricated quick-resume fallback label with a neutral “No active match” or hide the action when no session exists.

## Verification record

This report was produced from source inspection with `rg` and targeted file reads. No product files, tests, browser sessions, screenshots, or runtime state were changed or executed.

## Acceptance checklist for a follow-up repair

- [ ] `/match?format=T10`, T20, ODI, and both Test formats select the requested format.
- [ ] `/match?resume=true` resumes the active session or explains that no session exists.
- [ ] `/match?squadId=...` loads the requested saved squad.
- [ ] `/match?replayId=...` opens the requested archived match.
- [ ] Career Hub displays the correct active-session format.
- [ ] Replay and resume labels match actual behavior.
- [ ] Format selection is keyboard accessible.
- [ ] Only one navigation implementation is maintained.
