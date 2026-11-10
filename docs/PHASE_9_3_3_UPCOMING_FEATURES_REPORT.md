# PHASE 9.3.3: UPCOMING FEATURES EXPERIENCE & PLACEHOLDER TRANSPARENCY AUDIT & VERIFICATION REPORT

**Project:** Cricket Dream XI  
**Milestone:** Phase 9.3.3  
**Status:** COMPLETE & VERIFIED  
**Date:** 2026-11-10  
**Baseline:** `4b2e973`  

---

## 1. Executive Summary

Phase 9.3.3 establishes full architectural and user-facing transparency across Cricket Dream XI. In earlier iterations, several planned and aspirational features had placeholder UI elements or deceptive interactions (such as the "FORCE DATA SYNC" button displaying a fake success toast claiming "1,144 player vectors synchronized", and the Gabba Heist card leading to an unhandled query parameter `/match?scenario=gabba2021`).

In this phase, all placeholder interactions were audited, classified, and refactored under a centralized, typed feature registry (`apps/web/lib/feature-registry.ts`). Unimplemented or in-development systems are now honestly presented with consistent `COMING SOON` or `IN DEVELOPMENT` badges, detailed roadmap explanations, and interactive information modals.

No working simulation engine mechanics, cricket rules, local guest profile persistence, or Dream XI team-building capabilities were modified or degraded.

---

## 2. Feature Audit & Classification Matrix

Every capability in the application was evaluated against the strict rule: **Do not mark a feature Available based only on a UI component, database model, documentation, or placeholder function.**

| Feature Name | Category | Status | User Interaction | Verification Note |
|---|---|---|---|---|
| **Local Dream XI Squad Builder** | Squad Management | `AVAILABLE` | Interactive builder with 1,144 real international players | Fully playable offline via IndexedDB / localStorage. |
| **Match Simulation Engine** | Core Simulation | `AVAILABLE` | Ball-by-ball SplitMix64 engine, 5 formats, pitch wear, fatigue | Complete deterministic simulation across all formats. |
| **Interactive Field Editor** | Tactical Control | `AVAILABLE` | Polar-coordinate drag-and-drop, MCC Law 28.4 & Powerplay checks | Verified in Phase 9.3.1 and 9.3.2. |
| **Gated Bowling Variations** | Tactical Control | `AVAILABLE` | Style-restricted delivery variations (Doosra, Googly, Flipper, etc.) | Verified in Phase 9.3.1. |
| **Guest Profile & Local History** | Persistence | `AVAILABLE` | Persistent match logs, win rates, POTM awards, custom names | Verified offline; zero server dependency required. |
| **Gabba Heist 2021 Scenario** | Simulation Scenario | `COMING SOON` | Click opens detailed roadmap modal explaining Day 5 chase injection | Removed broken link to `/match?scenario=gabba2021`. |
| **Cloud Accounts & Cross-Device Sync** | Online Identity | `COMING SOON` | Click opens modal explaining encrypted sync vs. current offline storage | Removed fake "1,144 player vectors synchronized" toast. |
| **DRS / UltraEdge / Hawk-Eye** | Match Simulation | `COMING SOON` | Listed in Upcoming Updates section with roadmap modal | Explains planned 3D trajectory & snickometer integration. |
| **Rain Interruptions & DLS Method** | Match Simulation | `COMING SOON` | Listed in Upcoming Updates section with roadmap modal | Outlines Duckworth-Lewis-Stern resource table integration. |
| **Super Over Tiebreaker** | Match Simulation | `COMING SOON` | Listed in Upcoming Updates section with roadmap modal | Explains planned 3-batter, 1-bowler sudden-death innings. |
| **ICC Stop Clock & Penalties** | Match Simulation | `COMING SOON` | Listed in Upcoming Updates section with roadmap modal | Documents 60-second between-overs clock & field penalty. |
| **Cinematic Replay Viewer** | Presentation | `IN DEVELOPMENT` | Listed in Upcoming Updates section with roadmap modal | Clarifies IndexedDB event logs exist, playback UI being built. |
| **World Cup & Tournament Mode** | Career & Tournament | `COMING SOON` | Listed in Upcoming Updates section with roadmap modal | Documents bracket generator, round-robin, and NRR rules. |
| **Career Legacy & Progression** | Career & Tournament | `COMING SOON` | Listed in Upcoming Updates section with roadmap modal | Outlines form fluctuation curves & rating development. |
| **Head-to-Head Multiplayer PvP** | Online Identity | `COMING SOON` | Listed in Upcoming Updates section with roadmap modal | Details WebRTC/WebSocket simultaneous order broker. |
| **Commentary Audio & SFX** | Presentation & Audio | `COMING SOON` | Accessible from Career Hub settings & section modal | Clearly distinguishes current music OST from voice speech. |

---

## 3. Key Remediation Deliverables

### 3.1 Central Feature Registry (`apps/web/lib/feature-registry.ts`)
- Introduced typed data model: `PlannedFeature`, `FeatureCategory`, `FeatureStatus`.
- Categories:
  - `GAMEPLAY_SIMULATION`: Match rules, officiating tech, tactical controls, scenarios.
  - `CAREER_TOURNAMENT`: Knockout brackets, franchise leagues, player legacy.
  - `ONLINE_IDENTITY`: Cloud backup profiles, live PvP matchmaking.
  - `BROADCAST_AUDIO`: Ball-strike physics sound effects, commentary voice synthesis.
- Helper functions `getUpcomingFeatures()` and `getFeaturesByCategory()`.

### 3.2 Upcoming Features Section (`apps/web/components/UpcomingUpdatesSection.tsx`)
- Rendered on the homepage (`apps/web/app/page.tsx`) beneath the primary tactical bento grid.
- Styled according to the Google Stitch broadcast dark design language (`#0b1410`, emerald highlights, crisp borders).
- Displays cards grouped by category, badges for `COMING SOON` and `IN DEV`, and one-click access to the roadmap modal.

### 3.3 Transparency Modal (`apps/web/components/UpcomingFeatureModal.tsx`)
- Dialog showing feature overview, implementation roadmap, target release phase, and an explicit reminder that offline gameplay remains fully functional.

### 3.4 Elimination of Fake Actions
- **`apps/web/app/my-cricket/page.tsx`**:
  - Completely removed `handleForceSync` and the fake toast `"Data sync verified: 1,144 player vectors synchronized."`.
  - Replaced the button with an honest `CLOUD SYNC [SOON]` button triggering the roadmap modal explaining that cloud sync is an upcoming feature and all current squads are securely stored in local storage.
  - Replaced the commentary toggle with a `Coming Soon` badge and link to audio roadmap.
- **`apps/web/app/page.tsx`**:
  - Replaced the dead link `<Link href="/match?scenario=gabba2021">` on the Gabba Heist scenario card with an interactive button opening the roadmap explanation for scenario injection.

### 3.5 Secondary Navigation & Quick Links
- Updated `apps/web/components/Navbar.tsx` to include direct links to `Career Hub` and `#upcoming-roadmap`.

---

## 4. Test & Build Verification

1. **Unit & Integration Tests (`apps/web/test/phase-9-3-3-transparency.spec.ts`)**:
   - `4 passed (4)`:
     - Confirms all 11 required features exist in the registry with valid metadata.
     - Confirms categorization into the 4 engineering domains.
     - Asserts that no unfinished feature is marked `AVAILABLE`.
     - Confirms cloud-sync and commentary-audio convey honest offline status.
2. **Workspace Test Suite**:
   - Ran `pnpm turbo run test`: **15 passed, 15 total (271 tests passing across 16 suites)**.
3. **TypeScript Typecheck**:
   - Ran `pnpm turbo run typecheck`: **Clean pass across all 9 packages (0 errors)**.
4. **Production Build**:
   - Ran `pnpm --filter=@cricket/web build`: **Compiled successfully in 8.8s; all 8 static routes generated without errors**.

---

## 5. Conclusion

Cricket Dream XI now presents a completely honest, transparent product experience. Users enjoy an offline-capable cricket simulation game while having clear visibility into the engineering roadmap without deceptive buttons, fake sync indicators, or dead-end links.
