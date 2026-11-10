# Phase 9: Google Stitch Design Implementation & Frontend Architecture Audit

**Repository:** `ShounaksHub/Cricket-Game`  
**Target Branch:** `main`  
**Baseline Commit:** `1260becc6dd09bf3de4dee8f14986429ffb65070`  
**Application Stack:** Next.js 15.5.29 (App Router) + React 19 + TypeScript 5.7.3 + Tailwind CSS v4 + PixiJS v8.22  
**Design Reference:** `design-reference/stitch_cricket_dream_xi_redesign/`  

---

## 1. Executive Summary

This audit establishes the implementation blueprint for replacing the existing functional-prototype UI with pixel-faithful implementations of the 8 Google Stitch screens. The existing core engines (ICC simulation engine, 1,144-player benchmark database, PixiJS 2D canvas visualizer, deterministic PRNG replay, and localStorage persistence) represent the functional truth of the application, while the Stitch designs represent the visual truth.

---

## 2. Existing Route & Architecture Inventory

| Route | File Path | Current Purpose | Status & Transition Plan |
| :--- | :--- | :--- | :--- |
| `/` | `apps/web/app/page.tsx` | Overview landing page, backend health badge, rules preview, quick format list | **Replace UI completely** with `cricket_dream_xi_home` layout while maintaining dynamic format routing & offline status indicators. |
| `/dream-teams` | `apps/web/app/dream-teams/page.tsx` | 11-player squad builder with 1-team-per-nation rule, captaincy toggles, localStorage saving | **Replace UI completely** with `cricket_dream_xi_dream_xi_builder` split-view layout. Connect to real player registry and squad validation. |
| `/players` | `apps/web/app/players/page.tsx` | 1,144-player registry table with search, role filters, radar modal | **Replace UI completely** with `cricket_dream_xi_player_catalogue` master-detail split layout. Real-time telemetry dossier. |
| `/match` (`?stage=setup`) | `apps/web/app/match/page.tsx` | Match configuration, stadium selection, format selection (T10, T20, ODI, Test Red/Pink) | **Replace UI** with `cricket_dream_xi_match_setup` grid & tactile cards. |
| `/match` (`?stage=toss`) | `apps/web/app/match/page.tsx` | Coin toss modal/phase, heads/tails choice, batting/bowling election | **Replace UI** with `cricket_dream_xi_coin_toss` 3D ceremonial stage. |
| `/match` (`?stage=live`) | `apps/web/app/match/page.tsx` | Live match simulator, PixiJS visualizer canvas, ball progression, intent toggles | **Replace UI** with `cricket_dream_xi_live_match_interface` 3-column cockpit. **Embed existing PixiJS Canvas**. |
| `/match` (`?stage=completed`) | `apps/web/app/match/page.tsx` | Completed match results, POTM, scorecard tables, replay triggers | **Replace UI** with `cricket_dream_xi_scorecard_results` dual-innings bento & detailed tabs. |
| `/my-cricket` | *New Route* `apps/web/app/my-cricket/page.tsx` | (Previously fragmented across localStorage / match history) | **Implement New Route** using `cricket_dream_xi_my_cricket` manager profile, career records, and saved squads. |

---

## 3. Stitch Screen Mapping

| Stitch Screen Folder | Target Route / Component | Primary Responsibilities | Real Data Source |
| :--- | :--- | :--- | :--- |
| `cricket_dream_xi_home/` | `/` (`apps/web/app/page.tsx`) | Atmospheric hero, Play Cricket CTA, active squads, live match node, recent match win card, 5 format tiles, masterclass challenge bento, pitch composition matrix, telemetry footer. | Local active match session, saved squads, format configs, simulation telemetry. |
| `cricket_dream_xi_dream_xi_builder/` | `/dream-teams` (`apps/web/app/dream-teams/page.tsx`) | Split screen: Left talent pool (search, role chips, player cards with OVR & attributes) / Right squad deck (synergy gauge, team balance meters, slots 01-11 with C/VC badges, legal squad HUD). | Real 1,144 player database (`@cricket/data-ingestion`), squad rules (`@cricket/cricket-rules`), nation constraint. |
| `cricket_dream_xi_match_setup/` | `/match` (stage: `SETUP`) | Format selector (5 tactile cards with ball icons), opponent selection, stadium conditions, pitch telemetry, start match action. | `VERIFIED_STADIUMS`, `SUPPORTED_NATIONAL_TEAMS`, `@cricket/simulation-engine`. |
| `cricket_dream_xi_coin_toss/` | `/match` (stage: `TOSS`) | 3D gold coin ceremonial stage, captain portrait spotlight, heads/tails selection, coin spin animation, bat/bowl decision. | Live match configuration, match state initialization (`createInitialMatchState`). |
| `cricket_dream_xi_live_match_interface/` | `/match` (stage: `LIVE`) | 3-column cockpit: Left (striker, non-striker, bowler cards, win probability sparkline) / Center (MCG header, **PixiJS Canvas**, historical overs) / Right (4-level intent buttons, compass target sector, ball step trigger). | `@cricket/simulation-engine` `stepDelivery`, `CricketVisualizerCanvas` PixiJS v8.22 runtime. |
| `cricket_dream_xi_scorecard_results/` | `/match` (stage: `COMPLETED`) | Post-match headline, dual innings scoreboard bento, Player of the Match spotlight, multi-tab scorecard (Summary, Batting, Bowling, Partnerships, FOW, Overs). | `reconcileMatchScorecard`, `calculatePlayerOfTheMatch`, match simulation state history. |
| `cricket_dream_xi_player_catalogue/` | `/players` (`apps/web/app/players/page.tsx`) | Master-detail split: Left (search, country dropdown, era dropdown, format chips, 2-col player cards) / Right sticky dossier (portrait, OVR, Batting/Bowling radar bars, career stats, draft CTA). | 1,144-player benchmark registry (`@cricket/player-ratings`), search & filter hooks. |
| `cricket_dream_xi_my_cricket/` | `/my-cricket` (`apps/web/app/my-cricket/page.tsx`) | Manager profile card (level, XP progress, deployed squad), career pillars (record, runs, wickets, trophies), saved squads tab, match history tab, record book. | LocalStorage persisted match records, custom dream squads, player statistics cache. |

---

## 4. Design System Tokens & Asset Integration

### Colors & Surfaces
- Canvas Background: `#101410` (Surface foundation)
- Recessed Well: `#0C0F0C` (Tabular inputs and metric beds)
- Standard Card Surface: `#181F19` (Level 1 elevation)
- Elevated Surface: `#202920` (Level 2 active buttons and selected items)
- Floating / Modal Deck: `#263127` (Level 3 modals)
- Hairline Border: `#303A31`
- Active Focus Border: `#435144`
- Pitch Emerald (Primary): `#78DC77` / `#4CAF50`
- High-Energy Lime (Secondary): `#A9D55F` / `#B7E36B`
- Regal Trophy Gold (Tertiary): `#E9C349` / `#D4AF37`
- Dismissal / Wicket Red: `#C92A2A`
- Day/Night Test Pink: `#E64980`
- Telemetry Cyan/Blue: `#38BDF8`
- Warning Amber: `#F59E0B`
- Pure Text Chalk: `#F4F5F0`
- Slate Text: `#A2AAA1`
- Subdued Muted Text: `#6B756C`

### Typography Hierarchy
- Headings: `Manrope` (`display-lg`, `headline-lg`, `headline-md`, `title-md`)
- Body & UI: `Inter` (`body-base`, `body-bold`, `body-sm`)
- Scoreboards & Data: `JetBrains Mono` (`scoreboard-xl`, `scoreboard-md`, `label-caps` with `font-feature-settings: 'tnum'`)

### Icons & Imagery
- Google Material Symbols Outlined font integrated globally.
- Official logos, stadium visuals, trophy crests, and player portraits downloaded locally into `apps/web/public/assets/stitch/` for offline-first resilience.

---

## 5. Reusable Component Architecture

1. **`AppShell` / `AppHeader`:** Sticky 80px broadcast header with official logo, title, tab navigation (`HOME`, `DREAM XI`, `PLAYERS`, `MY CRICKET`), pulsing `OFFLINE READY` badge, audio toggle, settings button, and captain profile rank.
2. **`AppFooter`:** Fixed broadcast status bar with copyright, build tag, 60 FPS indicator, simulation status, and telemetry links.
3. **`PlayerCard`:** Standardized card displaying player image, country flag, role chip (`BATTER`, `BOWLER`, `ALL-ROUNDER`, `WK`), OVR rating pill, 3-metric matrix, and draft/action buttons.
4. **`ScoreboardBanner`:** Panoramic dual-innings scoreboard with large tabular monospace runs/wickets, overs, CRR, and RRR.
5. **`WelcomeModal`:** Rules guide and welcome modal preserving the 1-team-per-nation constraint documentation and quick start guide.

---

## 6. Reused vs. Replaced Component Inventory

### Components to Reuse Directly:
- `apps/web/app/match/visualizer/CricketVisualizerCanvas.tsx`: Retained and embedded into Stitch center field visualizer container.
- `apps/web/app/match/visualizer/*` (`pixi-cricket-visualizer.ts`, `field-geometry.ts`, `ball-animator.ts`, `player-manager.ts`): Retained completely; PixiJS v8.22 rendering intact.
- `apps/web/lib/national-teams.ts`: Retained for squad generation and national team presets.
- `@cricket/simulation-engine`: All simulation hooks (`stepDelivery`, `simulateFullMatch`, `reconcileMatchScorecard`, `DeterministicPRNG`).
- `@cricket/data-ingestion` / `@cricket/player-ratings`: Full 1,144-player benchmark database.

### Components to Replace:
- `apps/web/components/Navbar.tsx`: Replace with Stitch broadcast header specification.
- `apps/web/app/page.tsx`: Replace with Stitch Home screen.
- `apps/web/app/dream-teams/page.tsx`: Replace with Stitch Dream XI Builder.
- `apps/web/app/players/page.tsx`: Replace with Stitch Player Catalogue master-detail view.
- `apps/web/app/match/page.tsx`: Decompose and reconstruct using Stitch Setup, Toss, Live Cockpit, and Scorecard screens while keeping state machine and PixiJS canvas intact.

---

## 7. Integration Risks & Mitigation Strategies

1. **PixiJS Canvas Dimension Fitting:**
   - *Risk:* Stitch design uses a square/oval stadium container with overlay SVG fielders.
   - *Mitigation:* Mount `CricketVisualizerCanvas` inside the container with responsive sizing (`w-full aspect-square max-w-[480px]`), utilizing its responsive WebGL/canvas viewport.
2. **Offline Asset Resolution:**
   - *Risk:* External `lh3.googleusercontent.com` URLs failing in offline environments.
   - *Mitigation:* Download and host all core Stitch image assets inside `apps/web/public/assets/stitch/` with local fallbacks.
3. **State Integrity During Navigation:**
   - *Risk:* Transitioning between `/`, `/dream-teams`, `/match`, and `/my-cricket` losing unsaved squads.
   - *Mitigation:* Use synchronized `localStorage` adapters with automatic recovery.
