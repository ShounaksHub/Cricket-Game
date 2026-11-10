# PHASE 6: IMPLEMENTATION PLAN — PLAYABLE CRICKET GAME

**Document Version:** 1.0.0  
**Date:** 2026-11-10  
**Status:** APPROVED & ACTIVE  
**Engine Version Triad:**
- Simulation Engine: `sim-1.0.0`
- Cricket Ruleset: `rules-t20-icc-2026.1`
- Player Rating: `rate-1.0.0`

---

## 1. Core Mission & Philosophy

The objective of Phase 6 is to deliver a **fully playable, cohesive browser cricket game**.

Every feature gate must directly enhance gameplay. The user must experience an intuitive selector-to-captain journey:
1. Discover authentic cricketers across nations and eras.
2. Build, validate, and save custom 11-player Dream XIs.
3. Challenge an intelligent, context-aware AI opponent.
4. Set up conditions (venue, pitch type, weather).
5. Flip for the toss with authoritative outcomes.
6. Play a complete T20 match in either **Mode A (Strategic Simulation)** or **Mode B (Ball-by-Ball Tactical Control)**.
7. Make genuine tactical decisions (intent, line, length, variations, field presets, bowler changes).
8. Experience the match visually via the PixiJS v8 2D broadcast visualizer.
9. Inspect fully reconciled scorecards, wagon strips, and partnerships.
10. Resume interrupted matches seamlessly across browser refreshes and replay completed matches deterministically.

---

## 2. Feature Gates & Deliverables

### Gate P6.0: Repository Audit & Implementation Plan (Current Gate)
- Deliverables: `docs/PHASE_6_INITIAL_REPOSITORY_AUDIT.md`, `docs/PHASE_6_IMPLEMENTATION_PLAN.md`.
- Acceptance: Gap matrix approved; blockers identified and prioritized.

### Gate P6.1: Complete Player Database & Discovery Experience
- **Objective:** Expand the verified player pool from 15 to 40+ authentic cricketers across multiple nations and eras.
- **Requirements:**
  - Support two distinct 11-player squads (User XI and AI XI) with zero duplicate players.
  - Authentic records with Cricsheet and Wikidata IDs; strict no-hallucination policy (missing stats remain null).
  - All 9 primary roles covered: Opening Batter, Middle Order Batter, Wicketkeeper-Batter, Batting All-Rounder, Bowling All-Rounder, Fast Bowler, Medium Pacer, Spin Bowler (Off-spin, Leg-spin, Orthodox, Unorthodox).
  - Expanded search filters: Name, Role, Era, Nationality, Batting Hand, Bowling Style, Rating Range, Active/Retired.
  - Multi-attribute player profile modal with 5 rating categories and radar visualization.
- **Verification:** Unit tests for search filters, player ingestion tests, zero duplicate player verification.

### Gate P6.2: Dream XI Team Builder & Persistence
- **Objective:** Enable saving, editing, duplicating, and exporting dream squads.
- **Requirements:**
  - 11-player squad validation (1 captain, 1 wicketkeeper, valid batting order 1-11, minimum bowling options).
  - 8-dimension squad balance analytics.
  - Persistence in localStorage (guest mode) and backend REST API.
  - Direct "Take Team to Match" action routing from `/dream-teams` to `/match`.
- **Verification:** Squad validation tests, persistence tests, squad reordering tests.

### Gate P6.3: Intelligent AI Opponent & Strategy Engine
- **Objective:** Generate a balanced, competitive AI opponent tailored to match conditions.
- **Requirements:**
  - AI selection algorithm analyzing user team composition (pace/spin vulnerability, left-hand balance) and pitch conditions.
  - 3 difficulty levels: `EASY` (sub-optimal tactics), `MEDIUM` (balanced tactics), `HARD` (counter-selection and aggressive matchups).
  - Explainable selection rationale presented to the user.
- **Verification:** Opponent generation tests for all 3 difficulties and pitch conditions.

### Gate P6.4: Match Setup & Configuration
- **Objective:** Complete pre-match configuration workflow.
- **Requirements:**
  - Select User Dream Team, AI Opponent, AI Difficulty, Venue, Pitch Type, and Weather.
  - Display verified venue dimensions (MCG, Lord's, Eden Gardens, etc.) and pitch impact explanations.
  - Squad confirmation screen showing both starting XIs with designated captains and wicketkeepers.
- **Verification:** Setup state validation tests and venue modifier verification.

### Gate P6.5: Interactive Authoritative Toss Experience
- **Objective:** Complete pre-match toss sequence.
- **Requirements:**
  - User chooses Heads or Tails.
  - Authoritative coin flip using deterministic PRNG.
  - If User wins: modal to choose "Bat First" or "Bowl First".
  - If AI wins: context-aware decision (pitch, dew, format, squad) with brief explanation.
  - Innings order set and opening batters/bowlers confirmed.
- **Verification:** Toss determinism tests and AI decision tests.

### Gate P6.6: Playable T20 Match Engine (Mode A & Mode B)
- **Objective:** Complete two-innings playable T20 match.
- **Requirements:**
  - **Mode A (Strategic Simulation):** Advance over-by-over or innings-by-innings based on phase strategy.
  - **Mode B (Ball-by-Ball Control):** Interactive delivery stepping where user tactical inputs actively alter outcomes via `stepDelivery`.
  - Innings break screen displaying target, required run rate, and first innings summary.
  - 2nd innings target chase logic with win/loss/tie completion.
- **Verification:** Full match lifecycle integration tests; verification that Mode B tactical inputs actively modify delivery probabilities.

### Gate P6.7: AI Captaincy & Bowler Rotation
- **Objective:** Dynamic bowling changes and contextual tactical decisions.
- **Requirements:**
  - Over-by-over bowler selection prompt for the bowling captain.
  - Enforcement of T20 bowling limits (maximum 4 overs per bowler).
  - AI bowler selection based on matchup matrix and phase.
- **Verification:** Bowling quota enforcement tests; AI bowler selection tests.

### Gate P6.8: Match UI & PixiJS Synchronization
- **Objective:** Seamless synchronization between the simulation state and the visualizer.
- **Requirements:**
  - Synchronize delivery outcomes, boundary shockwaves, wickets, and scoreboard lower-third.
  - Play, pause, resume, step next delivery, and 5 speed presets (0.5x to 10x).
- **Verification:** Visualizer event listener tests; pause/resume state preservation tests.

### Gate P6.9: Event-Driven Commentary Engine
- **Objective:** Engaging, context-aware ball-by-ball commentary.
- **Requirements:**
  - Dynamic commentary reflecting shot angle, distance, fielding presets, and pressure situations.
  - Milestone alerts (50s, 100s, 5-wicket hauls) and over summary cards.
- **Verification:** Commentary generator tests for all outcome types.

### Gate P6.10: Reconciled Scorecards & Match Analytics
- **Objective:** Comprehensive post-match statistics.
- **Requirements:**
  - Batting scorecard (runs, balls, 4s, 6s, SR, dismissal mode, bowler, fielder).
  - Bowling scorecard (overs, maidens, runs, wickets, economy, extras).
  - Fall of wickets and partnerships breakdown.
  - Visual wagon strip and run progression.
- **Verification:** Scorecard reconciliation tests (runs sum to total, balls match over counts).

### Gate P6.11: Match Persistence, Resume & Deterministic Replay
- **Objective:** Guard against accidental page refreshes and support deterministic replay.
- **Requirements:**
  - Serialize active `MatchState` to `localStorage` on each ball.
  - Resume banner on app launch if an ongoing match is detected.
  - Completed match archive supporting bit-exact replay via `verifyMatchReplay`.
- **Verification:** Browser refresh simulation tests; replay verification tests.

### Gate P6.12: Match Results Presentation & Player of the Match
- **Objective:** Post-match celebration and analysis.
- **Requirements:**
  - Winner announcement with exact margin ("Won by 18 runs" / "Won by 6 wickets").
  - Player of the Match showcase based on performance points formula.
  - Actions: "Replay Match", "Play Another Match", "Return to Team Builder".
- **Verification:** POTM formula calculation tests; post-match routing tests.

### Gate P6.13: End-to-End Navigation & Mobile Responsiveness
- **Objective:** Unified user journey across the application.
- **Requirements:**
  - Cohesive global navigation bar linking all pages.
  - Responsive layouts on mobile, tablet, and desktop viewports.
- **Verification:** Responsive viewport render tests; full flow navigation tests.

### Gate P6.14: Security, Authority & Anti-Tamper Verification
- **Objective:** Ensure server-authoritative match integrity.
- **Requirements:**
  - Cryptographic state hash validation; rejection of invalid client tactical inputs.
- **Verification:** Anti-tamper test vectors and API validation tests.

### Gate P6.15: Automated E2E Testing Suite
- **Objective:** End-to-end verification of gameplay scenarios A through L.
- **Verification:** Automated Vitest test suite running complete game flows.

### Gate P6.16: Performance Profiling & Phase 6 Final Sign-Off
- **Objective:** Smooth 60 FPS performance and production readiness.
- **Deliverables:** `docs/PHASE_6_FINAL_COMPLETION_REPORT.md`.

---

## 3. Immediate Focus: Gates P6.0 & P6.1

1. **Commit Gate P6.0:** Commit audit and implementation plan documents.
2. **Execute Gate P6.1:**
   - Expand `VERIFIED_BENCHMARK_PLAYERS` in `packages/data-ingestion/src/curated-seed-data.ts` to 40+ authentic cricketers.
   - Balance player roles (Opening Batters, Middle Order Batters, Keepers, All-Rounders, Spinners, Fast Bowlers) and eras.
   - Update `apps/api/src/modules/players/` with extended search filters (batting hand, bowling style, active/retired).
   - Update `/players` frontend with new filters and rich profile details.
   - Verify with automated tests.
   - Document results in `docs/PHASE_6_PLAYER_CATALOGUE_REPORT.md` and commit P6.1.
