# PHASE 6.0: INITIAL REPOSITORY AUDIT & GAP ANALYSIS

**Document Version:** 1.0.0  
**Date:** 2026-11-10  
**Status:** COMPLETE & AUTHORITATIVE  
**Lead Game Architect:** Principal Game Architect & Senior Simulation Systems Designer  
**Milestone Focus:** P6.0 Repository Audit & Architectural Gap Assessment  

---

## 1. Executive Summary

Phase 6 marks the transition from architectural components and standalone engines into an **end-to-end playable browser-based cricket game**.

The core requirement is playability over cosmetic polish: a real user must be able to open the application, explore real cricketers, build and validate an 11-player Dream XI, challenge an intelligent AI opponent with selectable difficulty, participate in an authoritative toss, play through an entire two-innings T20 match in either Mode A (Strategic Simulation) or Mode B (Interactive Ball-by-Ball), view reconciled scorecards and analytics, and safely resume or replay matches.

This audit evaluates the repository against these gameplay requirements, categorizing features into:
- **Implemented**
- **Partially Implemented**
- **Completely Missing**
- **Technical Debt & Playability Blockers**

---

## 2. Comprehensive Feature Matrix

| Feature Domain | Required Gameplay Capability | Current Status | Detailed Audit Findings |
| :--- | :--- | :---: | :--- |
| **Player Database** | Discovery of real cricketers across multiple eras & nations | **PARTIAL** | Only 15 verified players exist in `VERIFIED_BENCHMARK_PLAYERS`. Assembling two full 11-player squads (User XI vs AI XI) requires at least 22 players. With only 15, squads must duplicate players. |
| **Player Profiles** | 5-rating categories, 24 attributes, format stats, confidence | **IMPLEMENTED** | 4-layer rating engine (`packages/player-ratings`) computes authentic 0-100 attributes and format ratings. UI renders stats in modal. |
| **Player Search** | Multi-attribute search (role, era, nation, rating, style) | **PARTIAL** | Basic search by role/era/name exists on `/players`. Missing filters for batting hand, bowling style, and active/retired status. |
| **Dream Team Builder** | Custom 11-player squad creation, captain/keeper selection | **IMPLEMENTED** | `/dream-teams` enforces 11 players, 1 captain, 1 keeper, 1-11 batting order, and runs live 8-dimension analytics. |
| **Team Hand-Off** | Direct workflow to take a saved Dream Team into a match | **MISSING** | Saved teams in `/dream-teams` cannot be selected in `/match`; match setup hardcodes player IDs. |
| **AI Opponent** | Balanced team generation with counter-strategy | **PARTIAL** | Static 11-player lineup (`AI World Legends XI`) hardcoded in `matches.service.ts`. No dynamic counter-selection or difficulty levels. |
| **Match Setup** | Format, stadium, pitch condition, and environmental setup | **PARTIAL** | `/match` allows choosing stadium and pitch, but hardcodes squads and assumes T20 only. |
| **Toss Experience** | Authoritative toss, interactive coin flip, user decision | **PARTIAL** | UI shows coin selection, but toss outcome and BAT/BOWL decision are evaluated client-side without interactive coin animation or server authority. |
| **Match Simulation Core** | Deterministic ball-by-ball physics, MCC/ICC rules, replay | **IMPLEMENTED** | `packages/simulation-engine` passed P4.15 independent audit (`abfec8f`). 1,000-innings calibration verified. |
| **Interactive Gameplay** | Mode B (Ball-by-Ball) vs Mode A (Strategic Simulation) | **MISSING** | `/match` pre-computes all 40 overs via `simulateFullMatch`. In-game tactical controls are cosmetic and do not step deliveries interactively. |
| **AI Captaincy** | Contextual bowling rotations, intent, and field presets | **PARTIAL** | `resolveAITacticalAction` handles phase intents, but lacks difficulty scaling, quota tracking (max 4 overs/bowler), and bowler selection. |
| **PixiJS Visualizer** | 2D broadcast match view, player sprites, ball physics | **IMPLEMENTED** | 60 FPS PixiJS v8 canvas with procedural ground, left-hand mirroring, parabolic flight, wickets, and scoreboard HUD. |
| **Innings Transition** | Innings break, target calculation, chase dynamics | **PARTIAL** | Logic handles target chase, but UI lacks an informative innings break screen explaining target and required run rate. |
| **Commentary Engine** | Event-driven contextual commentary | **PARTIAL** | Basic template strings exist, but lack rich contextual depth for momentum shifts, milestones, and pressure overs. |
| **Scorecard Analytics** | Reconciled scorecards, partnerships, wagon wheel | **IMPLEMENTED** | Batting, bowling, fall of wickets, and partnerships tables reconcile bit-for-bit with the match state. |
| **Match Persistence** | Resume match on page refresh, completed match history | **MISSING** | Refreshing `/match` clears all state back to setup. No match history archive for review or replay. |
| **Results & Presentation** | Victory margin, Player of the Match, turning point | **PARTIAL** | Scorecard displays Player of the Match, but lacks a dedicated victory screen and rematch navigation. |
| **Navigation Journey** | End-to-end user flow: Home $\to$ Team $\to$ Match $\to$ Results | **PARTIAL** | Pages exist as independent silos rather than a cohesive guided game experience. |

---

## 3. Technical Debt Affecting Playability

### 3.1 Pre-Simulated Match vs Interactive Tactical Controls (Critical Blocker)
- **Current Behavior:** In `apps/web/app/match/page.tsx`, `handleStartMatch()` calls `simulateFullMatch(config)` upfront. All 240+ deliveries are computed before the first ball is bowled. The `stepToNextDelivery()` function merely advances an index through this pre-computed array.
- **Impact on Playability:** The user controls for Batter Intent, Bowling Length, Bowling Line, Variation, and Field Preset do not actually affect upcoming deliveries in Mode B. This violates Development Rule 8 (*"Never introduce placeholder buttons that appear functional but do nothing"*).
- **Remediation:** In Mode B (Ball-by-Ball Control), the match must advance using the authoritative `stepDelivery(state, tactics, prng)` function. Tactical decisions selected by the user must directly determine the delivery inputs and produce the resulting event.

### 3.2 Roster Size Bottleneck (Critical Blocker)
- **Current Behavior:** Only 15 players are defined in `VERIFIED_BENCHMARK_PLAYERS`.
- **Impact on Playability:** Two 11-player teams require 22 distinct cricketers. Consequently, Team 1 and Team 2 in `prepareSimulationSquads()` share 7 duplicate players (e.g., Steve Smith, Buttler, Sobers, Stokes, Bumrah, Warne, and Wasim Akram appear on both sides).
- **Remediation:** Expand the roster to at least 40 authentic cricketers with verified historical statistics, covering all 9 primary roles, various bowling styles, batting hands, and eras.

### 3.3 State Volatility on Page Refresh (High Impact)
- **Current Behavior:** Match state lives exclusively in ephemeral React component state in `apps/web/app/match/page.tsx`.
- **Impact on Playability:** If a user accidentally refreshes or navigates away in the 18th over of a tense chase, all progress is permanently lost.
- **Remediation:** Implement a client-side localStorage session persistence layer alongside backend match registration. On page load, detect active match state and display a "Resume Ongoing Match" prompt.

---

## 4. Required Database & API Changes

### 4.1 Database (Prisma)
The existing PostgreSQL schema (`database/prisma/schema.prisma`) is already comprehensive and models Users, Stadiums, Players, DreamTeams, Matches, Innings, Deliveries, Scorecards, Partnerships, and AI Decisions. No breaking schema migrations are required for MVP playability.

### 4.2 API Enhancements (`apps/api`)
1. **Player Search (`/players`):**
   - Extend `PlayerSearchQueryDto` to support filtering by `battingHand` (`RIGHT_HAND`, `LEFT_HAND`), `bowlingStyle`, and `isActive`.
2. **AI Team Generation (`/matches/ai-opponent`):**
   - Add endpoint returning a dynamically composed, role-balanced AI squad countering a given user squad at a specified difficulty (`EASY`, `MEDIUM`, `HARD`).
3. **Toss Execution (`/matches/toss`):**
   - Server-authoritative toss endpoint accepting user coin choice and returning the deterministic coin result and winner.
4. **Match State Persistence (`/matches/:id/save` & `resume`):**
   - Endpoints to store and retrieve in-flight match states.

---

## 5. Dependency-Aware Implementation Sequence

```
P6.0: Repository Audit & Implementation Plan (Current Gate)
  └── P6.1: Player Database Expansion (40+ verified players)
        └── P6.2: Dream XI Team Builder & Persistence
              └── P6.3: Intelligent AI Opponent & Strategy Engine
                    └── P6.4: Match Setup & Configuration
                          └── P6.5: Interactive Toss Experience
                                └── P6.6: Playable T20 Gameplay (Mode A & Mode B)
                                      └── P6.7: AI Captaincy & Bowler Rotation
                                            └── P6.8: Match UI & PixiJS Synchronization
                                                  └── P6.9: Event-Driven Commentary
                                                        └── P6.10: Scorecards & Analytics
                                                              └── P6.11: Match Persistence & Replay
                                                                    └── P6.12: Match Results Presentation
                                                                          └── P6.13: End-to-End User Flow
                                                                                └── P6.14: Security Audit
                                                                                      └── P6.15: Automated E2E Testing
                                                                                            └── P6.16: Final Verification
```

---

## 6. Risk Register & Solutions

| Risk ID | Description | Severity | Mitigation Strategy |
| :---: | :--- | :---: | :--- |
| **R-1** | Standalone environment lacks running PostgreSQL | **HIGH** | Ensure all services maintain dual-mode persistence: in-memory / LocalStorage fallback for standalone guest play, seamlessly synchronizing with Prisma when PostgreSQL is available. |
| **R-2** | Ball-by-ball stepping causes desynchronization | **HIGH** | Derive delivery PRNG seeds deterministically from the root seed, innings number, and delivery sequence: `seed ^ (inn * 1000003) ^ (ball * 7919)`. |
| **R-3** | Expanding roster introduces unverified stats | **MEDIUM** | Use only authentic historical data from Cricsheet and Wikidata; enforce null for missing historical fields rather than fabricating values. |
| **R-4** | Browser refresh wipes match state | **HIGH** | Persist serialized `MatchState` to `localStorage` after each completed over/ball; provide automatic resumption on mount. |
