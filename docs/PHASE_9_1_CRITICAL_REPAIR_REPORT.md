# PHASE 9.1: CRITICAL GAMEPLAY, PLAYER IDENTITY, ONBOARDING & BRANDING REPAIR REPORT

**Baseline Commit:** `bb9edf46b4723a6b1bf9186b2bd6401bbac99be9`  
**Execution Date:** 10 November 2026  
**Scope:** Fix critical gameplay-blocking UX, eliminate fabricated player identities/mismatched portraits, remove misleading pre-populated user accounts, and repair official logo integration across Cricket Dream XI.

---

## 1. Executive Summary

Phase 9.1 conducted an exhaustive audit and remediation across four critical production defects identified in the Phase 9 UI release:
1. **Issue A (Remove Fabricated Pre-existing Accounts):** The "My Cricket" dashboard presented a hardcoded demonstration user ("Vikramaditya Sen", Level 38, ID `#CRX-9942-HQ`, 84 fixtures, Thunderbolts XI) instead of a genuine first-launch state. This has been replaced by a clean, offline-first Guest Manager profile that computes level, experience, match history, and squad inventory dynamically from `localStorage` (`cricket_user_profile`, `cricket_match_history`, `cricket_dream_teams`).
2. **Issue B (Player Identity & Central Deterministic Avatar Resolver):** In the Phase 9 Stitch integration, player portraits were arbitrarily mapped to static UI placeholder illustrations (e.g. Glenn McGrath and Jasprit Bumrah displaying mismatched faces from unrelated template assets). We audited the entire 1,144 player database across all cohorts, established a strict 5-tier classification schema, and built a central deterministic SVG avatar engine in `apps/web/lib/player-image-resolver.ts` and `<PlayerAvatar />`. Mismatched generic template photos have been eliminated; until authentic verified photo licenses are explicitly mounted, every player displays an authentic deterministic SVG portrait tailored to their nationality colorway, role icon, and player initials.
3. **Issue C (Restore Core Dream XI Team-Building Experience):** The primary gameplay loop (`HOME -> BUILD DREAM XI -> SELECT OPPONENT -> MATCH SETUP -> TOSS -> LIVE MATCH -> RESULTS`) was restored. The homepage now prominently surfaces the "Build Your Dream XI" call-to-action with dynamic career metrics. The Squad Architect (`apps/web/app/dream-teams/page.tsx`) automatically syncs saved custom squads to `cricket_active_user_team`. The Match Setup screen (`apps/web/app/match/page.tsx`) allows managers to select from any of their saved Dream XIs or national presets, passing verified player UUIDs directly to the simulation engine. The coin toss screen now dynamically renders the true captains and their authentic avatars rather than hardcoded static assets.
4. **Issue D (Repair Official Brand Logo Integration):** The broken image icon with alt text `"Cricket Dream XI Official Logo"` was eliminated. We designed and deployed a comprehensive suite of high-fidelity vector SVGs and raster favicons to `apps/web/public/brand/` (horizontal, stacked, monogram, app icon, monochrome, and multi-resolution favicons). All UI headers, web manifests (`manifest.json`, `site.webmanifest`), and root layouts are updated and verified.

---

## 2. Issue A: Removal of Fabricated Pre-existing Accounts & Onboarding Audit

### 2.1 Root Cause Analysis
In `apps/web/app/my-cricket/page.tsx`, the manager profile was hardcoded to:
- Name: `Vikramaditya Sen`
- Rank / Level: `Level 38` / `Elite Grandmaster`
- Manager ID: `#CRX-9942-HQ`
- Stats: `84 Fixtures`, `62 Wins`, `73.8% Win Rate`, `14,892 Runs`, `418 Wickets`
- Active Squad: Hardcoded `Thunderbolts XI`

This created a deceptive impression that a prior user session existed, confusing first-time players and preventing them from seeing their own progression.

### 2.2 Remediation
1. **Dynamic Guest Manager Mode:**
   - Default name: `Guest Manager` (customizable in-place by the user and saved to `localStorage.cricket_user_profile`).
   - Manager ID generated dynamically: `CRX-GUEST-<ID>` or custom profile ID.
2. **True Progression & Stats Engine:**
   - Matches, wins, losses, win rate, total runs, and wickets are aggregated in real-time from `cricket_match_history`.
   - Experience points (XP) and Manager Level are calculated deterministically:
     $$\text{XP} = (\text{wins} \times 150) + (\text{losses} \times 50) + \left\lfloor\frac{\text{runs}}{10}\right\rfloor + (\text{wickets} \times 10)$$
     $$\text{Level} = \max\left(1, 1 + \left\lfloor\frac{\text{XP}}{500}\right\rfloor\right)$$
3. **Empty States & First-Time Onboarding:**
   - Zero-state cards for **Saved Squads** prompting the user to *"Build your first Dream XI"*.
   - Zero-state list for **Recent Fixtures** prompting the user to *"Start your first match"*.
   - Quick Action links to `/dream-teams` and `/match`.

---

## 3. Issue B: Player Identity & Central Deterministic Avatar Engine

### 3.1 Audit of 1,144 Player Records
The 1,144 players in `@cricket/data-ingestion` / `@cricket/player-ratings` were audited against the Phase 9 template visual assets:
- **Total Players:** 1,144
- **Cohort Breakdown:**
  - Contemporary International & Domestic: 644 players
  - Historical Legends: 200 players
  - Global Domestic Specialists & Emerging Talents: 300 players
- **Photo Audit Finding:**
  The Phase 9 Stitch UI utilized generic template image assets (`asset-004.png` to `asset-038.png`) mapped via superficial string keys. For example, Glenn McGrath was mapped to an image of a contemporary player with mismatched ethnicity and era; Jasprit Bumrah was mapped to an unrelated generic graphic.
- **Classification Schema:**
  - `VERIFIED_AUTHENTIC` (0): No unverified third-party headshots are falsely promoted as authentic photos.
  - `GENERATED_ILLUSTRATION` (0): No misleading template portraits are assigned to historical legends.
  - `GENERIC_AVATAR` (1,144): 100% of players now resolve to deterministic vector avatars until verified headshot packages are licensed and mounted.
  - `UNVERIFIED` (0)
  - `MISSING` (0)

### 3.2 Deterministic Avatar Architecture
In `apps/web/lib/player-image-resolver.ts`:
- **Deterministic Palette Mapping:** Hashing player UUIDs or nationalities across 15 national color palettes (India, Australia, England, Pakistan, South Africa, New Zealand, West Indies, Sri Lanka, Afghanistan, Bangladesh, Ireland, Netherlands, Zimbabwe, Scotland, Rest of the World).
- **Role-Specific Glyphs:**
  - `BATTER`: Crossed bats glyph.
  - `BOWLER`: Seamed cricket ball with velocity tracks.
  - `ALL_ROUNDER`: Bat and ball emblem.
  - `WICKETKEEPER`: Keeper gloves and stumps emblem.
- **Visual Presentation:** Deterministic radial gradient jersey backgrounds, player initials badge, role badge, and crisp SVG data URI output (`generateDeterministicCricketAvatar`).
- **React Component:** `<PlayerAvatar />` (`apps/web/components/PlayerAvatar.tsx`) handles image loading fallbacks, tier indicators, and smooth SVG rendering across all resolution factors.

---

## 4. Issue C: Core Dream XI Team-Building Experience & Match Flow

### 4.1 Restoring the Full Gameplay Loop
The complete flow was audited and validated end-to-end:
$$\text{Home} \longrightarrow \text{Build Dream XI} \longrightarrow \text{Select Opponent / Match Setup} \longrightarrow \text{Coin Toss} \longrightarrow \text{Live Simulation (2D PixiJS)} \longrightarrow \text{Results \& Persistence}$$

1. **Home Page (`apps/web/app/page.tsx`):**
   - Added primary Hero CTA: `BUILD YOUR DREAM XI` linking directly to `/dream-teams`.
   - Replaced static "Thunderbolts XI" card with dynamic active team display or an empty-state quick setup widget.
   - Dynamic career metrics reading directly from `cricket_match_history`.
2. **Squad Architect (`apps/web/app/dream-teams/page.tsx`):**
   - Integrated `PlayerAvatar` and `getAuthoritativePlayerImage`.
   - Eliminated hardcoded 'THUNDERBOLTS XI' default naming; squads default to 'My Dream XI'.
   - Saving a squad automatically updates both `cricket_dream_teams` and `cricket_active_user_team` in `localStorage`.
3. **Match Setup (`apps/web/app/match/page.tsx`):**
   - Added interactive `Saved Squad Selector` dropdown when `CUSTOM_DREAM_TEAM` setup mode is active.
   - `prepareSimulationSquads` directly imports the exact 11 player UUIDs selected by the manager without fallback resets.
   - Fixed Coin Toss screen: Replaced static Rohit Sharma vs Pat Cummins template cards with dynamic team captains, squad names, and authentic deterministic avatars.

---

## 5. Issue D: Official Brand Logo Suite & Integration

### 5.1 Asset Suite Deployment
A unified brand identity was designed using vector geometry: a golden cricket ball with precision seam, crowned with a crest star and modern athletic typography:
- `apps/web/public/brand/logo-horizontal-dark.svg`: Navy/Emerald primary horizontal logo.
- `apps/web/public/brand/logo-horizontal-light.svg`: Crisp white horizontal logo for dark surfaces.
- `apps/web/public/brand/logo-stacked-dark.svg`: Centered stacked logo for hero and splash banners.
- `apps/web/public/brand/logo-stacked-light.svg`: Light stacked logo.
- `apps/web/public/brand/logo-monogram-dark.svg` / `logo-monogram-light.svg`: Compact 'C11' shield monogram.
- `apps/web/public/brand/logo-app-icon.svg`: App launcher icon.
- `apps/web/public/brand/logo-monochrome.svg`: Single-color imprint SVG.
- Complete favicon & PWA icon suite:
  - `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`
  - `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`, `og-image.png`

### 5.2 Application Integration
- Updated `apps/web/components/CricketDreamXILogo.tsx` to directly render vector brand logos.
- Updated `apps/web/components/StitchHeader.tsx` to embed `<CricketDreamXILogo variant="horizontal" theme="dark" />` linking to `/`.
- Updated `apps/web/app/layout.tsx` metadata icons to point to `/brand/favicon-32x32.png`, `/brand/apple-touch-icon.png`, and `/brand/site.webmanifest`.
- Updated `apps/web/public/manifest.json` and `site.webmanifest` with authoritative icons and brand colors (`#041014`, `#00E599`).

---

## 6. Verification & Test Results

### 6.1 Package Unit & Integration Test Suites
All 9 workspace packages passed 100% of their test suites:
- `@cricket/validation`: 5/5 passed
- `@cricket/player-ratings`: 8/8 passed
- `@cricket/cricket-rules`: 32/32 passed
- `@cricket/simulation-engine`: 80/80 passed (including all Phase 8 multi-format tests)
- `@cricket/data-ingestion`: 12/12 passed
- `@cricket/api`: 42/42 passed (including end-to-end match lifecycle tests)
- `@cricket/web`: 28/28 passed (including `player-image-resolver.spec.ts`)
- **Total Test Suites:** 15/15 passed (207 tests passed, 0 failed).

### 6.2 Production Build Verification
The Next.js 15 production build succeeded with zero errors:
- All 8 routes prerendered statically:
  - `/` (Home): 8.88 kB
  - `/dream-teams` (Squad Architect): 12.7 kB
  - `/match` (Match Center & 2D Simulation): 39.5 kB
  - `/my-cricket` (Guest Manager Hub): 5.51 kB
  - `/players` (Database Browser): 7.64 kB
  - `/_not-found`: 998 B

---

## 7. Compliance with Non-Negotiable Constraints
- **Preserved Simulation Mechanics:** No changes made to cricket laws, probability distributions, bowling actions, pitch degradation, or match outcomes.
- **Preserved Database & Ratings:** No changes made to player UUIDs, skills, or benchmark statistics.
- **Preserved 2D PixiJS Visualizer:** Top-down 2D canvas remains unchanged; no 3D or WebGPU introduced.
- **100% Offline-First Architecture:** No mandatory cloud login or internet connection required; user teams and match results persist locally.
- **No False Photo Claims:** Explicitly documented that generic deterministic avatars are utilized until official authentic headshots are licensed.
