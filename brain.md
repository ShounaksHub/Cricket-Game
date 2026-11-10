# Global Cricket Dream Team & Simulation Game — Master Project Brain (`brain.md`)

**Document Version:** 2.1.0  
**Last Updated:** November 2026 (Post-Phase 9.3 Engine & UX Overhaul)  
**System Status:** Production-Ready Single-Project Monorepo (Next.js 15.5.29, NestJS 11, Turborepo 2.3, PixiJS v8.22, Prisma v6, PostgreSQL 16)  
**Deployment Target:** Unified Vercel Monorepo (`apps/web` + standalone `@cricket/simulation-engine` package)  
**Active Services & URLs:**
- **Web App & Game Client:** `http://localhost:3000` (Playable 2D Field, Stitch Design UI, Interactive Rules Modal, Squad Builder)
- **Backend API:** `http://localhost:4000` (Prisma ORM, SSE Streaming, Replay Auditing, Health Telemetry)
- **Official Brand Assets:** Production-grade vector SVGs, favicon suite (16x16, 32x32, 48x48, .ico, Apple Touch 180x180), PWA icons (192x192, 512x512), Open Graph metadata card (`/og-image.png`).

---

## Table of Contents
1. [Executive Summary & Core Product Vision](#1-executive-summary--core-product-vision)
2. [Architectural Blueprint & Monorepo Topology](#2-architectural-blueprint--monorepo-topology)
3. [Architecture Decision Records (ADRs 001–012)](#3-architecture-decision-records-adrs-001012)
4. [Complete 10-Stage Ball-by-Ball Simulation Engine](#4-complete-10-stage-ball-by-ball-simulation-engine)
5. [Multi-Format Engine & October 2026 ICC Laws](#5-multi-format-engine--october-2026-icc-laws)
6. [Comprehensive 1,144-Player Roster & Era Calibration](#6-comprehensive-1144-player-roster--era-calibration)
7. [Tactical Rules: One Team Per Nation & One Player Per Nation](#7-tactical-rules-one-team-per-nation--one-player-per-nation)
8. [Pitch Physics, Stadiums & Atmospheric Weather Engine](#8-pitch-physics-stadiums--atmospheric-weather-engine)
9. [Frontend Reconstruction: Google Stitch Design System](#9-frontend-reconstruction-google-stitch-design-system)
10. [Brand Identity: Official Cricket Dream XI Design System](#10-brand-identity-official-cricket-dream-xi-design-system)
11. [PixiJS v8 Visual Engine & 2D Canvas Simulator](#11-pixijs-v8-visual-engine--2d-canvas-simulator)
12. [Vercel Deployment Architecture & Next.js 15.5.29 Hotfix](#12-vercel-deployment-architecture--nextjs-15529-hotfix)
13. [Verification, Test Suites & CI/CD Benchmarks](#13-verification-test-suites--cicd-benchmarks)
14. [Master Repository Directory Map](#14-master-repository-directory-map)
15. [Future Roadmap (Phases 10+)](#15-future-roadmap-phases-10)

---

## 1. Executive Summary & Core Product Vision

The **Global Cricket Dream Team & Simulation Game** (officially branded as **Cricket Dream XI**) is an authoritative, data-driven, tactical cricket simulation platform and fantasy squad combat arena. It synthesizes deep statistical realism (*Football Manager*, *Out of the Park Baseball*) with an arcade-responsive, pixel-faithful web UI powered by Google Stitch design patterns and a hardware-accelerated PixiJS v8 2D field visualizer.

### The Problem It Solves
1. **Arbitrary RNG & Artificial Rubber-Banding:** Most cricket video games artificially manipulate difficulty curves via rubber-banding rather than simulating genuine physical and psychological ballistics.
2. **Uncalibrated Fantasy Cross-Era Matchups:** Comparing 1930s Sir Don Bradman directly against 2024 Jasprit Bumrah using unadjusted career averages ignores uncovered pitches, bat density changes, protective helmets, and white-ball restrictions.
3. **Black-Box Match Simulation:** Inability to inspect, audit, or deterministically replay matches ball-by-ball from an immutable PRNG seed.
4. **Simplification of Intricate Rules:** Omitting genuine MCC laws (e.g., MCC Law 41.9 stop clock warnings/penalty runs, Law 16.2.2 30-minute extra time allowances, Law 14 follow-on thresholds, Law 15 declarations, DLS par calculations, and bowler over-quotas).

### Core Pillars
- **Authoritative Determinism:** Every match runs off a 64-bit Mulberry32/SplitMix64 seed. A seed together with player lineups and stadium parameters guarantees bit-for-bit reproducible outcomes across Node.js, Vercel Serverless, and browser Web Workers.
- **Deep Era-Adjusted Player Database:** 1,144 fully rated cricketers spanning 1877 to 2026 across 7 distinct historical eras, normalized via Empirical Bayes Shrinkage and era calibration z-scores.
- **Pixel-Faithful Google Stitch UI:** An 8-screen responsive frontend built in Next.js 15.5.29 and Tailwind CSS, replicating Google Stitch specifications down to exact padding, hex gradients, and responsive breakpoints.
- **Official Brand Identity:** Custom SVG vectors featuring the distinctive split-letter 'D' and Roman numeral 'XI' with dynamic cricket ball trajectory swoosh, in deep forest green (`#002b1b`), pitch green (`#00472e`), and electric lime (`#00e676` / `#22c55e`).

---

## 2. Architectural Blueprint & Monorepo Topology

The project is structured as a pnpm workspace orchestrated by Turborepo 2.3:

```
Cricket-Game (Monorepo Root)
├── apps/
│   ├── web/                     # @cricket/web — Next.js 15.5.29 App Router Frontend (Stitch UI + PixiJS v8)
│   └── api/                     # @cricket/api — NestJS 11 Backend (Prisma ORM, SSE, Health, Analytics)
├── packages/
│   ├── simulation-engine/       # @cricket/simulation-engine — Pure TS deterministic 10-stage physics engine
│   ├── cricket-rules/           # @cricket/cricket-rules — ICC law enforcement & format rule sets
│   ├── player-ratings/          # @cricket/player-ratings — 5-tier Bayesian ratings & era-calibration engine
│   ├── data-ingestion/          # @cricket/data-ingestion — Ingestion pipelines for historical player metrics
│   ├── shared-types/            # @cricket/shared-types — Shared TypeScript domain models & DTOs
│   └── validation/              # @cricket/validation — Squad, roster & match configuration validators
├── docs/                        # Phase audit reports, architecture notes & verification logs
├── design-reference/            # Google Stitch UI reference screens & assets
├── brain.md                     # Master project architectural context (this document)
├── PLAYERS_ROSTER.md            # 1,144-player exhaustive database catalogue
├── pnpm-workspace.yaml          # Workspace definition
├── turbo.json                   # Turborepo task graph & caching policies
└── vercel.json                  # Unified single-project Vercel configuration
```

### Monorepo Dependency Graph
- `@cricket/shared-types` is the root contract package consumed by all services.
- `@cricket/simulation-engine` imports `@cricket/shared-types`, `@cricket/cricket-rules`, and `@cricket/player-ratings`. It has zero browser or Node-specific dependencies, running seamlessly in Node, Vercel Serverless, Web Workers, or client-side React state.
- `@cricket/validation` imports `@cricket/shared-types` for squad and match configuration validation.
- `@cricket/data-ingestion` imports `@cricket/player-ratings` and `@cricket/shared-types`.
- `@cricket/web` imports `@cricket/shared-types`, `@cricket/simulation-engine`, and `@cricket/validation`.
- `@cricket/api` imports `@cricket/shared-types`, `@cricket/simulation-engine`, and `@cricket/data-ingestion`.

---

## 3. Architecture Decision Records (ADRs 001–012)

| ADR ID | Decision Title | Status | Rationale & Trade-offs |
|---|---|---|---|
| **ADR-001** | Turborepo + pnpm Workspace | Accepted | Guarantees deterministic package linking, workspace dependency deduplication, and pipeline caching. |
| **ADR-002** | Isomorphic Deterministic Simulation Engine | Accepted | Separating `@cricket/simulation` from DOM, database, and network enables offline client simulation, instant UI replay, and server-side cheat-proof match verification. |
| **ADR-003** | SplitMix64 / Mulberry32 Seeded PRNG | Accepted | Replaces `Math.random()` to ensure deterministic replayability. Identical seeds and user decisions produce identical outcomes across platforms. |
| **ADR-004** | Empirical Bayes Shrinkage for Player Ratings | Accepted | Prevents small-sample distortion (e.g., a player with 1 match averaging 100) by shrinking estimates toward era-adjusted population priors. |
| **ADR-005** | Hybrid Rendering (PixiJS v8 + React 19 + Tailwind) | Accepted | React manages tactical forms, modals, scorecards, and HUD overlays; PixiJS v8 manages 60fps WebGL/WebGPU 2D field graphics, particle ballistics, and fielders. |
| **ADR-006** | Server-Sent Events (SSE) for Live Streaming | Accepted | SSE provides unidirectional, low-overhead ball-by-ball streaming from NestJS to Next.js without the complexity and connection state overhead of full-duplex WebSockets. |
| **ADR-007** | Unified Single-Project Vercel Deployment | Accepted | Configured root directory `apps/web` with internal package bundling via Turborepo. Eliminates multi-domain CORS and dual-project subscription overhead. |
| **ADR-008** | Next.js 15.5.29 Security Upgrade | Accepted | Directly remediates Next.js 15.1.7 CVE vulnerabilities while maintaining React 19 compatibility and TypeScript typecheck integrity. |
| **ADR-009** | One Team Per Nation & One Player Per Nation Rules | Accepted | Prevents mono-nation dream teams (e.g., all 11 players from 2000s Australia), forcing tactical diversity and authentic global balance. |
| **ADR-010** | October 2026 ICC Law Compliance | Accepted | First cricket simulation engine to encode the 60-second Stop Clock rule (Law 41.9), 30-minute extra time allowances (Law 16.2.2), follow-on thresholds (Law 14), and captain declarations (Law 15). |
| **ADR-011** | Google Stitch Design Language Integration | Accepted | Complete rebuild of frontend screens using Stitch design tokens, high-density telemetry tables, and green-lime pitch aesthetic. |
| **ADR-012** | Vector-Pure Brand Identity Architecture | Accepted | Replaced raster logos with clean SVG vectors, comprehensive multi-resolution favicons, web app manifest icons, and social Open Graph metadata. |
| **ADR-013** | Deterministic Vector Avatars & Strict Photo Attribution | Accepted | Mandates that zero unverified photos are claimed as authentic. All 1,144 players resolve to deterministic SVG data URIs based on nationality palettes, role glyphs, and initials. |
| **ADR-014** | Strict Asymmetric Player Agency & Authoritative Match State | Accepted | The user manages their own Dream XI (batting intent when batting, complete bowling/fielding cockpit when bowling). The opponent is managed autonomously by CPU AI. In-match scoreboards read directly from authoritative state, preventing score summation bugs. |

---

## 4. Complete 10-Stage Ball-by-Ball Simulation Engine

Every delivery in `@cricket/simulation` executes sequentially across 10 deterministic mathematical stages:

```
[1. Pitch & Weather Wear]
          ↓
[2. Bowler Delivery Choice & Fatigue]
          ↓
[3. Release Vector & Trajectory Physics]
          ↓
[4. Pitch Interaction (Seam, Cut, Bounce, Turn)]
          ↓
[5. Batter Reaction, Shot Choice & Timing]
          ↓
[6. Bat-Pad Collision & Edge Mechanics]
          ↓
[7. Ballistics, Field Vector & Elevation]
          ↓
[8. Fielder Interception & Catch / Ground Physics]
          ↓
[9. Running Between Wickets & Throw Mechanics]
          ↓
[10. Umpire Adjudication, DRS & Over State Accounting]
```

### Stage Details & Formulae

#### Stage 1: Pitch & Weather Modulation
Pitches dynamically evolve per over. Wear index $W_t \in [0, 1]$ increases as a function of total overs bowled, bowler footmarks, and dry atmospheric conditions:
$$\mu_{turn}(t) = \mu_{base} \cdot (1 + \kappa_{spin} \cdot W_t) \cdot (1 - \gamma_{dew})$$
$$\sigma_{bounce}(t) = \sigma_{base} \cdot (1 + \kappa_{wear} \cdot W_t)$$

#### Stage 2: Bowler Tactical Selection & Fatigue
Fatigue $F \in [0, 1]$ degrades pace, release height consistency, and accuracy:
$$V_{release} = V_{base} \cdot (1 - 0.12 \cdot F) \pm \epsilon_{control}$$
$$Control_{effective} = Rating_{control} \cdot (1 - 0.25 \cdot F) \cdot (1 - 0.15 \cdot Pressure)$$

#### Stage 3: Release Vector & Trajectory
Calculates release angle $\theta$, swing velocity $v_s$, and seam angle. Conventional swing operates below critical Reynolds number ($Re < 10^5$); reverse swing activates at high ball wear ($W_t > 0.65$) with dry conditions.

#### Stage 4: Surface Impact Dynamics
Calculates restitution coefficient $e_y$ and friction $\mu_x$ based on pitch profile (Green, Hard, Dusty, Cracking, Dead, Wet, Sticky, Hybrid):
$$v_{x, post} = v_{x, pre} - \mu_x \cdot (1 + e_y) \cdot v_{y, pre}$$
$$v_{y, post} = -e_y \cdot v_{y, pre}$$

#### Stage 5: Batter Perception, Decision & Execution
Batter footwork (Front Foot vs. Back Foot) is compared against delivery length. Execution quality $Q_{shot} \in [-3, +3]$ is sampled from:
$$Q_{shot} \sim \mathcal{N}\left( (Rating_{shot} - Rating_{ball}) \cdot 0.05 + Boost_{intent}, \sigma_{timing}^2 \right)$$

#### Stage 6: Bat-Ball Impact & Edge Probability
When shot execution falls below deviation threshold $\Delta_{sweet}$, contact shifts from the sweet spot to inner/outer edge or toe/shoulder:
$$P_{edge} = \frac{1}{1 + e^{-k \cdot (\text{Deviation} - \text{EdgeMargin})}}$$

#### Stage 7: Aerial Ballistics & Exit Velocity
Exit velocity $V_{exit}$, launch angle $\alpha$, and azimuthal heading $\phi$:
$$V_{exit} = e_{bat} \cdot V_{delivery} + (1 + e_{bat}) \cdot V_{bat\_swing}$$
Aerodynamic drag $F_d = \frac{1}{2} \rho C_d A v^2$ computes flight trajectory down to boundary fences.

#### Stage 8: Field Interception & Catching Engine
Ring and boundary fielders have reaction times $T_{react} \approx 0.25\text{s} - 0.40\text{s}$ and acceleration curves. If fielder intercept time $T_{arrive} \le T_{ball}$, intercept occurs. Catch difficulty determines catch probability:
$$P_{catch} = \Phi\left(\frac{Rating_{fielding} - Difficulty}{\sigma_{catch}}\right)$$

#### Stage 9: Running Between Wickets & Run Out Physics
Running speed, turn efficiency, and throw accuracy dictate run decisions. Direct hit probability scales with fielder throwing rating and distance to stumps.

#### Stage 10: Umpire Adjudication, DRS & Over Accounting
- Dead balls, no-balls (front foot, height above waist), and wides.
- LBW review protocol (Pitching In-Line/Outside Off, Impact In-Line, Wickets Hitting/Umpire's Call).
- Over progression, bowler quota exhaustion, bowling change enforcement, and innings closure.

---

## 5. Multi-Format Engine & October 2026 ICC Laws

The engine fully models **5 premier cricket formats** according to modern MCC laws and ICC playing conditions (effective October 2026):

| Match Format | Overs / Innings | Powerplays & Field Restrictions | Bowler Max Quota | Ball Type & Pitch Degradation |
|---|---|---|---|---|
| **T10 Blitz** | 10 overs (60 balls) | Overs 1–2 (2 outside ring) | 2 overs per bowler | White Kookaburra / Ultra-low wear |
| **T20 International** | 20 overs (120 balls) | P1: 1–6 (2 out), P2: 7–20 (5 out) | 4 overs per bowler | White Kookaburra / Low wear |
| **ODI (One Day)** | 50 overs (300 balls) | P1: 1–10 (2 out), P2: 11–40 (4 out), P3: 41–50 (5 out) | 10 overs per bowler | Two White Kookaburras (1 per end) |
| **Test Red Ball** | Unlimited (Target ~90/day, session-based) | Dynamic field placements (slips, gully, bat-pad) | Unlimited | Red Dukes / Kookaburra |
| **Test Pink Ball (Day-Night)** | Unlimited (session-based, mandatory 30-min extra time window) | Dynamic; twilight session dew-rule adjustments | Unlimited | Pink Kookaburra / Night dew degradation |

### October 2026 ICC Law Enforcements

1. **MCC Law 41.9 — Stop Clock Rule:**
   - In limited-overs matches (T20, ODI), the bowling side must start the next over within **60 seconds** of the previous ball becoming dead.
   - 1st & 2nd breach: Formal field warning issued to bowling captain.
   - 3rd & subsequent breaches: **5 penalty runs** awarded to batting team per occurrence.
2. **MCC Law 16.2.2 — 30-Minute Extra Time Allocation:**
   - To achieve an outright result, umpires can extend playing conditions by up to 30 minutes at scheduled close of play on final day if required wickets remain achievable.
3. **MCC Law 14 — Follow-On Calculations:**
   - 5-day Test: Minimum lead of **200 runs**.
   - 3 or 4-day match: Minimum lead of **150 runs**.
   - 2-day match: Minimum lead of **100 runs**.
   - 1-day two-innings match: Minimum lead of **75 runs**.
4. **MCC Law 15 — Captain Declarations:**
   - Batting captain can declare an innings closed at any stoppage of play when ball is dead in multi-innings cricket.
5. **Rain & Stoppage Calculations:**
   - Professional Duckworth-Lewis-Stern (DLS) resource tables for target recalibrations in interrupted white-ball matches.

---

## 6. Comprehensive 1,144-Player Roster & Era Calibration

The engine includes **1,144 unique historical and active cricketers** across all major nations (India, Australia, England, South Africa, Pakistan, West Indies, New Zealand, Sri Lanka, Afghanistan, Bangladesh, Netherlands, Ireland, Zimbabwe, Scotland, and historic composite teams).

The catalogue is catalogued with serial numbers in [`PLAYERS_ROSTER.md`](file:///c:/Users/shoun/OneDrive/Desktop/cricket%20game/PLAYERS_ROSTER.md).

### 7 Historical Eras & Normalization Factors
To enable fair cross-era fantasy battles, stats are calibrated through historical epochs:
1. **Pioneer Era (1877–1914):** Uncovered pitches, roundarm/early overarm, low boundary ropes.
2. **Golden Age & Inter-War (1919–1939):** Bradman, Hammond, Grimmett; high run volume on uncovered surfaces.
3. **Post-War & Rebuilding (1946–1969):** Sobers, Hutton, Trueman; emerging defensive strategies.
4. **Pace Quartet & Kerry Packer WSC (1970–1989):** West Indies fast bowling dominance, helmet introduction, ODI birth.
5. **Golden 90s & Early Modern (1990–2007):** Tendulkar, Warne, Akram, Lara, McGrath; reverse swing mastery.
6. **T20 Revolution (2008–2019):** IPL expansion, 360-degree batting, bowling variations (knuckleballs, carrom balls).
7. **Modern Data & Franchise Era (2020–2026):** Ultra-high power-hitting bat profiles, advanced analytics, Stop Clock rules.

### 5-Tier Empirical Bayes Rating Metric
Raw stats (Batting Average, Strike Rate, Bowling Average, Economy Rate) are transformed into normalized skill components on a $[0, 100]$ scale:
- **Tier 1 (Base Anchor):** Historical era average $\mu_{era}$ and variance $\sigma^2_{era}$.
- **Tier 2 (Bayesian Shrinkage):** Weighted prior $\alpha$ prevents sample noise for short-career phenoms:
  $$\hat{\theta}_i = \frac{\sigma_0^2}{\sigma_0^2 + \sigma_i^2/n_i} \bar{x}_i + \left(1 - \frac{\sigma_0^2}{\sigma_0^2 + \sigma_i^2/n_i}\right) \mu_0$$
- **Tier 3 (Opponent Quality Weighting):** Performances weighted by strength of opposing attack/batting lineup.
- **Tier 4 (Pitch & Condition Z-Scores):** Adjustments for home/away and bowling conditions.
- **Tier 5 (Clutch & Pressure Modulation):** Performance in tournament knockouts, 4th innings run chases, and death overs.

---

## 7. Tactical Rules: One Team Per Nation & One Player Per Nation

To elevate tactical gameplay beyond stacking monolithic single-country all-star squads, the platform enforces two specialized game modes:

### Feature A: "One Team Per Nation" (National Dream Battle)
- In this tournament/exhibition mode, the human player and both AI opponents can each select **at most one team representing any given nation**.
- Prevents redundant intra-nation matchups (e.g., India 2011 vs. India 2023 vs. India 1983 in the same mini-tournament).
- Supported National All-Time Squads:
  1. **India All-Time XI** (Tendulkar, Kohli, Gavaskar, Dhoni, Kapil Dev, Bumrah, Kumble...)
  2. **Australia All-Time XI** (Bradman, Ponting, Warne, McGrath, Gilchrist, Lillee...)
  3. **West Indies All-Time XI** (Richards, Lara, Sobers, Marshall, Holding, Garner...)
  4. **England All-Time XI** (Botham, Stokes, Anderson, Root, Pietersen, Cook...)
  5. **Pakistan All-Time XI** (Imran Khan, Wasim Akram, Waqar Younis, Inzamam, Babar...)
  6. **South Africa All-Time XI** (Kallis, de Villiers, Steyn, Donald, Pollock, Smith...)
  7. **New Zealand All-Time XI** (Hadlee, Williamson, McCullum, Vettori, Boult...)
  8. **Sri Lanka All-Time XI** (Muralitharan, Sangakkara, Jayawardene, Malinga, Jayasuriya...)

### Feature B: "One Player Per Nation" (World XI Roster Builder)
- In the flagship **World Dream XI** squad builder, a player's 11-man roster must feature **at most one player from any sovereign cricket nation**.
- Requires deep strategic composition: selecting Sachin Tendulkar (India) blocks Jasprit Bumrah; selecting Shane Warne (Australia) blocks Don Bradman; selecting Jacques Kallis (South Africa) blocks Dale Steyn.
- Real-time client validator highlights country flags and prevents illegal roster submissions.

### Interactive Welcome & Rules Modal
A responsive, high-contrast modal greets players on entry, detailing:
- Game Modes (Quick Match, World XI Builder, National Tournament).
- Tactical Formats (T10, T20, ODI, Test).
- Delivery Control (Pace, Length, Seam/Spin, Field Settings).
- Real-time batting decisions (Aggression slider, Shot direction, Running intent).

---

## 8. Pitch Physics, Stadiums & Atmospheric Weather Engine

### 8 Calibrated Pitch Profiles

1. **Subcontinent Dust Bowl (e.g., Chepauk, Eden Gardens):** Low bounce, sharp abrasive turn from Day 1, low seam movement.
2. **Perth / High-Pace Hard Bouncy (e.g., Optus Stadium, WACA):** High restitution ($e_y \approx 0.82$), steep bounce, rewards genuine pace and horizontal-bat pull shots.
3. **English Green Seamer (e.g., Lord's, Headingley):** High grass cover, pronounced late seam deviation, significant aerial swing when overcast.
4. **Adelaide Hybrid / Drop-in (e.g., Adelaide Oval, MCG):** True consistent bounce, high initial run-scoring, gradual reverse swing on days 4–5.
5. **Caribbean Sticky Surface (e.g., Kensington Oval, Sabina Park):** Spongy variable bounce, rewards cutters and deceptive pace changes.
6. **Subcontinent Dead Flat Track (e.g., Rawalpindi, Motera Flat):** Minimal seam, negligible spin, high batting run rates ($>3.8$ RPO in Tests).
7. **New Zealand Coastal Breeze (e.g., Basin Reserve):** Severe crosswinds up to 45 km/h altering swing aerodynamics and boundary distances.
8. **Day-Night Pink Ball Dew Pitch:** Heavy evening dew ($\gamma_{dew} > 0.40$) reducing ball grip, negating finger spin, and accelerating skid onto the bat.

---

## 9. Frontend Reconstruction: Google Stitch Design System

The frontend in `apps/web` has been reconstructed to mirror Google Stitch design specifications across all 8 screens. Key screens and features added through Phases 9.1–9.3 are listed below:

1. **Dashboard / Match Command Center (`/`):**
   - Active match live tickers, high-impact neon green action buttons (`#00e676`), dark obsidian card frames (`#001a10`), and quick-launch tournament carousels.
2. **Onboarding / Guest Profile (`/onboarding`):** *(Added Phase 9.1)*
   - Zero-registration guest play flow. Users create a display name and choose a favourite nation without any account requirement. No pre-populated fake accounts.
3. **Squad & Lineup Selection (`/builder`):**
   - 11-slot interactive team board with position badges (WK, BAT, ALL, BOWL), nationality quota badges, and live salary/rating cap indicators. Real cricket players only — zero fabricated identities.
4. **Live Match Simulator (`/match`):**
   - Real-time dual scoreboard header reading directly from authoritative `activeInnings.totalRuns` state (Phase 9.3 score-integrity fix). Delivery-by-delivery wagon wheel, live commentary ticker, PixiJS 2D pitch view.
   - **Asymmetric Tactical Cockpit (Phase 9.3):** When user's team bats → batting intent cockpit (shot selection, running intent, attack/defend). When user's team bowls → full bowling cockpit (next bowler selector, pace strategy, bowling intent, length, line, variation, field presets). CPU manages the opposing team entirely autonomously.
   - All tactical controls are disabled when match phase is `COMPLETED`.
5. **Full Match Scorecard (`/match/[id]/scorecard`):**
   - Traditional tabular layout (Batsman, Dismissal, Runs, Balls, 4s, 6s, SR; Bowler, Overs, Maidens, Runs, Wickets, Economy), extras breakdown, and Fall of Wickets (FOW) charts.
6. **Player Catalogue & Deep Stats (`/players`):**
   - Searchable, filterable directory of all 1,144 players with era filters, skill radar charts, and Bayesian rating badges. All 1,144 players resolve to deterministic SVG avatars — zero unverified portrait photos (Phase 9.1/9.2 identity repair).
7. **Pitch & Conditions Configurator (`/conditions`):**
   - Interactive sliders for grass cover, soil moisture, crack density, cloud cover, temperature, and day/night schedule.
8. **Tournament & Series Hub (`/tournaments`):**
   - Knockout brackets, round-robin points tables with Net Run Rate (NRR) calculations, and match scheduling.

---

## 10. Brand Identity: Official Cricket Dream XI Design System

The platform's visual identity incorporates the official **Cricket Dream XI** brand assets:

### Logo Variations & Usages
- **Primary Horizontal Logo:**
  - Distinctive monogram (split-letter 'D' housing the Roman numeral 'XI' with the upward-sweeping cricket ball seam) alongside the bold, modern **CRICKET DREAM XI** wordmark.
  - Used in top navigation bars, desktop headers, and marketing splash screens.
- **Stacked Logo:**
  - Vertically stacked monogram atop the bold wordmark.
  - Used on mobile navigation, compact card banners, and end-of-innings summary cards.
- **App Icon (Squircle Monogram):**
  - High-contrast white-and-lime monogram nested in a deep forest-green squircle (`#002b1b` / `#001a10`).
  - Used for browser favicons, iOS/Android PWA home screen icons, and application shortcuts.
- **Monochrome & Dark Mode Variations:**
  - Optimized pure-white and light-contrast variants for ultra-dark backgrounds.

### Color Palette
- **Deep Forest Green (Brand Dark):** `#002b1b` / `#001f13`
- **Turf Pitch Green (Card & Container Base):** `#00472e` / `#003824`
- **Electric Neon Lime (Primary Accent & Call to Action):** `#00e676` / `#22c55e`
- **Obsidian Black (Canvas Background):** `#0a0f0d` / `#0d1411`
- **Pristine White (High-Emphasis Text):** `#ffffff`
- **Subdued Mint Grey (Metadata & Secondary Text):** `#94a3b8` / `#86efac`

### Generated Production Brand Assets
- Vector Component: [`apps/web/components/CricketDreamXILogo.tsx`](file:///c:/Users/shoun/OneDrive/Desktop/cricket%20game/apps/web/components/CricketDreamXILogo.tsx)
- Standalone Vectors: `apps/web/public/logo-primary.svg`, `apps/web/public/logo-stacked.svg`, `apps/web/public/logo-icon.svg`
- Favicons: `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `apple-touch-icon.png` (180x180)
- PWA Icons: `icon-192x192.png`, `icon-512x512.png`
- Social Open Graph Card: `apps/web/public/og-image.png` (1200x630)

---

## 11. PixiJS v8 Visual Engine & 2D Canvas Simulator

The live match canvas in `apps/web/components/match/MatchFieldCanvas.tsx` runs hardware-accelerated PixiJS v8:
- **Pitch & Outfield Shaders:** Procedurally generated mowing strips, worn pitch crease marks, popping creases, stumps, and dynamic boundary rope geometry.
- **Physics Ballistics Particle Engine:** Simulates 60fps projectile motion, pitch bounce, spin drift, aerial drag, boundary roll friction, and boundary rebounds.
- **Dynamic Field Positioning:** Automatically updates 11 fielder coordinates based on chosen fielding presets (e.g., Attacking Ring, Slips & Gully, Deep Boundary Defense, Death Overs Yorker Guard).
- **Smooth Interpolation:** Dynamic interpolation for smooth, jitter-free ball flight and fielder interception trajectories.

---

## 12. Vercel Deployment Architecture & Next.js 15.5.29 Hotfix

### Single-Project Deployment Configuration
Rather than running multi-project setups with complex cross-domain CORS, the entire web application and deterministic simulation engine are deployed as a **single unified Vercel project**:
- **Vercel Root Directory:** `apps/web`
- **Build Command:** `cd ../.. && pnpm turbo run build --filter=@cricket/web...`
- **Output Directory:** `.next`
- **Install Command:** `pnpm install`

### Next.js 15.5.29 Security Hotfix
- Remediated Next.js 15.1.7 security advisories by upgrading to `15.5.29`.
- Verified compatibility with React 19, React DOM 19, and PixiJS v8.22.
- Ensured zero dependency conflicts in `pnpm-lock.yaml`.

---

## 13. Verification, Test Suites & CI/CD Benchmarks

All workspace verification commands execute cleanly with 100% passing results:

1. **Static Typing & Schema Check:**
   ```bash
   pnpm turbo run typecheck
   ```
   *Result:* 16/16 packages and applications passed with 0 TypeScript errors.

2. **Unit & Mathematical Test Suites:**
   ```bash
   pnpm turbo run test
   ```
   *Result:* 15/15 test suites passed (100% green, 258/258 tests passed). Covers:
   - Ballistics, swing, and spin physics calculations.
   - 10-stage execution pipeline determinism across all 5 formats (T10, T20, ODI, Test Red/Pink).
   - DLS target adjustment calculations.
   - Follow-on and declaration state machines.
   - Stop clock 60-second penalty run logic.
   - Bayesian player rating shrinkage validation.
   - Complete player image resolver & deterministic SVG avatar verification.
   - End-to-end match gameplay, session resume, and replay determinism.
   - Phase 9.3 match score integrity, single authoritative state, and asymmetric player agency.

3. **Production Build:**
   ```bash
   pnpm turbo run build
   ```
   *Result:* 9/9 packages built; all 8 Next.js App Router routes statically generated and prerendered.

---

## 14. Master Repository Directory Map

```
c:\Users\shoun\OneDrive\Desktop\cricket game\
├── apps/
│   ├── api/                                  # NestJS API backend
│   │   ├── src/
│   │   │   ├── match/                         # Match orchestration, SSE streams, state
│   │   │   ├── player/                        # Player catalog endpoints
│   │   │   └── telemetry/                     # Health, metrics, simulation logging
│   │   └── test/                             # E2E NestJS tests
│   └── web/                                  # Next.js 15.5.29 Frontend
│       ├── app/                              # App Router (8 Stitch pages + API routes)
│       ├── components/                       # Stitch UI components, rules modal, PixiJS canvas, cockpit
│       ├── hooks/                            # useMatchSimulation, useAudio, useField
│       └── public/                           # Official SVGs, favicons, PWA icons, OG card
├── packages/
│   ├── cricket-rules/                        # MCC / ICC playing conditions and rulesets
│   ├── data-ingestion/                       # CSV/JSON historical match ingestion
│   ├── player-ratings/                       # 5-tier Bayesian rating engine
│   ├── shared-types/                         # Universal domain types & DTOs
│   ├── simulation-engine/                    # Pure deterministic 10-stage simulation engine
│   └── validation/                           # Squad & match configuration validators
├── docs/                                     # Comprehensive audit reports (Phases 1 through 9.3)
├── brain.md                                 # Master System Architecture Brain (This document)
├── PLAYERS_ROSTER.md                         # 1,144-player exhaustive database catalogue
├── package.json                              # Root monorepo dependencies
├── pnpm-lock.yaml                           # Pnpm strict lockfile
├── pnpm-workspace.yaml                      # Pnpm workspace definition
└── turbo.json                               # Turborepo task pipeline configuration
```

---

## 15. Future Roadmap (Phases 10+)

- **Phase 10: Real-Time Multiplayer PvP (WebSockets + WebRTC):**
  - Peer-to-peer tactical battles with real-time captaincy decisions and 15-second shot clocks.
- **Phase 11: Franchise Manager & Career Mode:**
  - Multi-season franchise auctions, player contracts, injury rehabilitation, youth academy scouting, and tactical training drills.
- **Phase 12: 3D WebGPU Match Engine:**
  - Transition optional 2D PixiJS canvas to a lightweight WebGPU 3D rendering pipeline for realistic stadium atmosphere, dynamic lighting, and broadcast camera angles.
- **Phase 13: Community Modding & Custom Match Engine SDK:**
  - Community rosters, custom pitch profiles, and user-submitted historical commentary soundboards.

---
*End of Master Project Brain (`brain.md`) — Maintained by Antigravity AI Engine & Engineering Team.*
