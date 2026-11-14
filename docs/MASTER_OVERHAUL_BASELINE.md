# Cricket Dream XI: Master Overhaul Baseline Audit

**Date:** November 14, 2026  
**Repository:** Cricket Dream XI Monorepo  
**Environment:** Next.js 15.5.29, Node.js v22, React 19, TypeScript 5.7, Tailwind CSS v4, Vitest 3.2.7  

---

## 1. Executive Summary

This document establishes the official engineering and design baseline prior to the Master Project Overhaul. The platform was evaluated across six dimensions:
1. Application Routes & Screen Inventory
2. Component Architecture & Shell Navigation
3. Design System & CSS Token Hierarchy
4. Bundle Metrics & Production Build Footprint
5. Test Pass Rates & Mathematical Invariant Status
6. Master Issue Register (Phase 9.9 & Confirmed Runtime Defects)

---

## 2. Route & Screen Inventory

The application is structured under the Next.js App Router (`apps/web/app`):

| Route | Primary Responsibility | Key Sub-phases / States | Status |
|---|---|---|---|
| `/` | Editorial Home Cover & Hub | Hero Cover, Career Stats, Quick Access Cards, Format Showcase, Transparent Roadmap | Active |
| `/dream-teams` | Lineup Builder & Validation | 11-player squad builder, 1-per-nation / IPL checks, role balance meter, tactical radar | Active |
| `/match` | Complete Match Experience | `SETUP` (Format/Squad/Conditions) → `TOSS` (Coin toss & decision) → `POST_TOSS_MANAGEMENT` (Sequential opening pair & strike bowler) → `LIVE` (Ball-by-ball simulation, visualizer, tactical controls) → `COMPLETED` (Scorecard, POTM, Vault) | Active |
| `/players` | Comprehensive Player Archive | 1,144 historical & contemporary players, search, role/era/nation filters, career stat cards | Active |
| `/my-cricket` | Personal Pavilion & Profile | Local manager profile, match history vault, saved dream lineups, local persistence | Active |
| `/_not-found` | 404 Fallback Screen | Minimal fallback with editorial return navigation | Active |

---

## 3. Component Architecture & Shell Consolidation

Prior to this overhaul, a architectural redundancy existed:
- `apps/web/components/Navbar.tsx`: Legacy navigation bar with duplicated routes.
- `apps/web/components/StitchHeader.tsx`: Canonical global header integrated into `layout.tsx`.

**Resolution in Master Overhaul:**
`Navbar.tsx` confirmed completely unused across all route files. `StitchHeader.tsx` established as the single authoritative navigation shell, refactored to eliminate cyber neon glow effects (`shadow-[0_0_8px_rgba(233,195,73,0.4)]`) and robotic chips (`OFFLINE ENGINE v2.4`).

---

## 4. Design Tokens & Visual Hierarchy Baseline

### Palette Baseline (`globals.css` / Tailwind v4 `@theme`):
- **Base Canvas:** Deep pitch charcoal `--color-surface: #101410` / `--color-surface-card: #181f19`
- **Subtle Turf Accents:** Classic turf green `--color-primary: #78dc77` / Olive gold `--color-secondary: #a9d55f`
- **Hairline Borders:** `--color-border-hairline: #303a31` / `--color-border-focus: #435144`
- **Typography:**
  - Headlines: Manrope (`font-headline-lg`, `font-headline-md`)
  - Body: Inter (`font-body-md`, `font-body-sm`)
  - Scoreboard / Numerical: Tabular numbers (`tabular-nums`, `font-scoreboard-xl`, `font-scoreboard-md`)
- **Defects Identified:**
  - High-intensity atmospheric glow orbs (`w-[1200px] blur-[140px]`).
  - Sci-fi uppercase terminology (`COCKPIT`, `TELEMETRY`, `NODES`, `CALIBRATION`, `MATRIX`).
  - Double slash syntax (`//`) in UI headers.

---

## 5. Production Build & Bundle Metrics

Execution of `next build` on Next.js 15.5.29 produces the following production artifact footprint:

```
Route (app)                                 Size  First Load JS
┌ ○ /                                    13.4 kB         120 kB
├ ○ /_not-found                            998 B         104 kB
├ ○ /dream-teams                         11.8 kB         277 kB
├ ○ /match                               58.5 kB         324 kB
├ ○ /my-cricket                          8.79 kB         115 kB
└ ○ /players                              5.9 kB         263 kB
+ First Load JS shared by all             103 kB
  ├ chunks/70-ad1663d66282861a.js        46.6 kB
  ├ chunks/a9ea9537-0f3936cf873287d4.js  54.2 kB
  └ other shared chunks (total)           2.2 kB
```

All 6 routes prerender cleanly as static content.

---

## 6. Test Suite Baseline

- **`@cricket/simulation-engine`:** 18 test files, 104 tests passed.
  - Multi-format simulation verified across T10, T20, ODI, Test Red Ball, and Test Pink Ball.
  - Deterministic PRNG bit-exact replay verified across 10,000 deliveries.
- **`@cricket/web`:** 18 test files, 122 tests passed.
  - 100% parity across game engine, persistence, sequential selection, and UI rendering.
  - New test suite added: `test/phase-9-11-bowling-management-and-overhaul.spec.ts`.

---

## 7. Confirmed Runtime Defects Documented for Remediation

1. **DEF-01: Bowling Rotation Engine Bug (`delivery-transition.ts:457`)**
   Fallback bowler selection when `nextBowlerId === bowlerId` picked `eligibleBowlers[0]` without sorting, causing top-order batters (Sehwag, Jaiswal) to alternate bowling instead of frontline pacers (Bumrah, Unadkat) and spinners (Jadeja, Ashwin).
2. **DEF-02: Projected Score Test Match Explosion (`match/page.tsx:3515`)**
   Projected score multiplied run rate by `formatMaxOvers` (9999 in Test formats), displaying `16698`.
3. **DEF-03: Hardcoded Player Card Details (`match/page.tsx:3577, 3661`)**
   Bowler card hardcoded `FAST SEAM • 144 KM/H` for all bowlers (including leg spinners); striker card hardcoded `RHB • ANCHOR / ACCEL` for left-handed batters.
4. **DEF-04: Bowling Management Dropdown Duplicate & Stuck State (`match/page.tsx:3974`)**
   `userNominatedBowlerId` was not reset when an over completed, causing repeated nominations and duplicate active entries in the dropdown.
5. **DEF-05: Missing Bowler Categorization in Match Cockpit**
   Bowlers were displayed in a flat, unorganized dropdown without figures or distinction between frontline pacers, spinners, and part-timers.

