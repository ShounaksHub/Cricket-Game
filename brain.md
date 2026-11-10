# Global Cricket Dream Team & Simulation Game — Master Project Brain (`brain.md`)

**Document Version:** 1.0.0  
**Current System Status:** Phases 0 through 6 fully built, verified, and running.  
**Active Working Tree:** Production-ready pnpm monorepo (Turborepo, Next.js 15, NestJS 11, PixiJS v8, PostgreSQL 16, Prisma v6).  
**Primary Services:**
- **Frontend App (Next.js 15):** `http://localhost:3000` (Playable Match Engine, Dream Team Builder, Player Catalogue)
- **Backend API (NestJS 11):** `http://localhost:4000` (REST API, Telemetry, Health, Replay Verification)

---

## 1. Executive Summary & Core Product Vision

The **Global Cricket Dream Team & Simulation Game** is an authoritative, data-driven, tactical cricket simulation platform designed to bridge the gap between deep statistical sports management simulators (such as *Football Manager* or *Out of the Park Baseball*) and high-polish, arcade-responsive web gaming experiences.

### The Problem It Solves
Traditional cricket video games either sacrifice statistical realism for reflex-driven button mashers (e.g., arcade console games) or sacrifice visual engagement for dry spreadsheet menus (e.g., text-only simulators). Furthermore, existing games suffer from:
1. **Arbitrary RNG & "Rubber-Banding":** Scripted momentum swings instead of true physical and psychological factors.
2. **Uncalibrated Historical Fantasy:** Pitches that treat 1930s Don Bradman and 2024 Heinrich Klaasen with unadjusted raw numbers, ignoring epochal rule changes, bat technology, boundary sizes, and protective gear.
3. **Lack of Cryptographic Determinism:** Inability to audit, verify, or replay matches bit-for-bit from an immutable seed.
4. **Disconnection from Official Laws:** Simplifying or ignoring intricate MCC cricket laws (dead ball nuances, free-hit restrictions, bowling quotas, and wicket types).

### The Core Vision
The platform allows cricket tacticians, gamers, and analysts to:
- Curate dream playing XIs from a verified global database of authentic cricketers spanning all historical eras.
- Configure authentic stadium dimensions, pitch types, atmospheric moisture, and pitch wear dynamics.
- Compete against intelligent AI captains calibrated by difficulty tiers (`EASY`, `MEDIUM`, `HARD`) without artificial probability manipulation.
- Experience a hybrid match loop: seamless switching between macroscopic phase-level strategic captaincy and microscopic ball-by-ball tactical control.
- Watch deliveries unfold in real-time on an interactive 2D top-down field canvas powered by PixiJS v8 with true ballistic trajectories, dynamic fielder positioning, and boundary FX.
- Audit, verify, export, and replay any match deterministically via seed-based event sourcing.

---

## 2. System Architecture & Technical Design

The codebase is structured as a **Modular Monolith** within a pnpm workspace orchestrated by Turborepo. Reusable domain packages have **zero dependencies** on UI or backend frameworks.

```
cricket-dream-game-monorepo/
├── apps/
│   ├── web/                         # Next.js 15 App Router, React 19, Tailwind CSS v4, PixiJS v8
│   └── api/                         # NestJS 11 modular REST & SSE streaming server
├── packages/
│   ├── simulation-engine/           # Pure TypeScript authoritative match engine (zero external dependencies)
│   ├── cricket-rules/               # MCC laws, fielding restrictions, quotas, squad validation
│   ├── player-ratings/              # 5-tier rating model, era normalization, Bayesian shrinkage
│   ├── data-ingestion/              # Cricsheet & Wikidata ETL, identity deduplication, seed datasets
│   ├── shared-types/                # Shared TypeScript contracts, DTOs, and event models
│   └── validation/                  # Strict runtime validation schemas (Zod)
├── database/
│   └── prisma/                      # PostgreSQL 16 schema, migrations, and seed scripts
└── docs/                            # Formal architectural specifications and audit reports
```

### Architectural Decision Records (ADRs) Summary
1. **ADR 001 — PixiJS v8 for 2D Match Visualization:** Chosen over Phaser 3 and Three.js for its lightweight bundle size (~120KB gzipped), WebGL/WebGPU pipeline, and zero conflict with React component lifecycles.
2. **ADR 002 — Hybrid Isomorphic Simulation Model:** The identical `@cricket/simulation-engine` TypeScript package runs in the browser Web Worker and on the NestJS backend. Local execution provides instantaneous UI updates, while seed-based event logs allow instant server verification.
3. **ADR 003 — SplitMix64 PRNG Determinism:** Replaces non-deterministic `Math.random()` with a 64-bit BigInt state transition generator. Initial seed + tactical actions produce identical ball-by-ball results across all devices.
4. **ADR 004 — Pure Functional Simulation Core:** Signature: `simulateDelivery(state, action, prng) -> (nextState, event, nextPrng)`. Zero browser globals, no `Date.now()`, no file/database I/O inside the simulation loop.

---

## 3. The 10-Stage Delivery Execution Pipeline

Every single delivery in a match progresses through a 10-stage physics, probability, and rules pipeline:

```
[1. Context Accumulator]
         │
         ▼
[2. Tactical Intention Resolution]
         │
         ▼
[3. Attribute Matrix Extraction]
         │
         ▼
[4. Environmental & Ball Modifiers]
         │
         ▼
[5. Batter-Bowler Matchup Resolution]
         │
         ▼
[6. Outcome Logit Calculation & Softmax]
         │
         ▼
[7. Deterministic PRNG Sampling]
         │
         ▼
[8. Physics & Ball Trajectory Resolution]
         │
         ▼
[9. Cricket Rule & State Transition]
         │
         ▼
[10. Immutable Event & Commentary Emission]
```

### Detailed Breakdown of Each Stage:
1. **Stage 1: Context Accumulator:** Gathers match state: format baseline, required run rate vs current run rate ($RRR - CRR$), innings resource remaining, ball age (0 to 80+ overs), pitch wear index, and bowler/batter spell fatigue.
2. **Stage 2: Tactical Intention Resolution:** Translates user or AI tactical inputs:
   - **Batter Intent:** `DEFEND` (-50% boundary, +70% defense), `ROTATE_STRIKE` (+40% 1s/2s), `BALANCED`, `AGGRESSIVE` (+50% boundaries, +35% risk), `MAXIMUM_POWER` (+100% boundary, +90% wicket risk).
   - **Bowler Line & Length:** Length (`YORKER`, `FULL`, `GOOD_LENGTH`, `BACK_OF_LENGTH`, `SHORT`), Line (`OUTSIDE_OFF`, `STUMPS`, `DOWN_LEG`), Variation (`STOCK`, `SLOWER_BALL`, `BOUNCER`, `GOOGLY/ARM_BALL`).
   - **Field Preset:** `ATTACKING_CLOSE_CATCHERS`, `BALANCED_RING`, `DEATH_BOUNDARY_DEFENSE`, `SPIN_CHOKE`.
3. **Stage 3: Attribute Matrix Extraction:** Fetches 0–100 scaled attributes for the active batter (Technique, Timing, Power, Short-Ball Handling, Yorker Handling) and active bowler (Line/Length, Pace/Turn Execution, Swing, Seam, Yorker, Death Bowling).
4. **Stage 4: Environmental & Ball Modifiers:**
   - **Swing Multiplier ($M_{\text{swing}}$):** Scales with cloud cover and humidity; decays after 15 overs until reverse swing threshold (>45 overs on abrasive surfaces).
   - **Seam & Bounce Multipliers ($M_{\text{seam}}, M_{\text{bounce}}$):** Governed by pitch type (Green = +35% seam, Hard & Bouncy = +40% bounce).
   - **Spin Multiplier ($M_{\text{spin}}$):** Amplifies dynamically as pitch wear and surface cracks develop.
   - **Dew Factor:** Dampens bowler grip in night matches, increasing wide rates and boundary percentages.
5. **Stage 5: Matchup Matrix Resolution:** Analyzes asymmetric advantages (e.g. Off-spinner vs. Left-hand batter increases wicket probability by +20%; express pace >145 km/h vs. low short-ball handling increases false-shot probability by +30%).
6. **Stage 6: Outcome Logit Calculation & Softmax:**
   For each outcome $k \in \{\text{DOT}, \text{RUN\_1}, \text{RUN\_2}, \text{RUN\_3}, \text{FOUR}, \text{SIX}, \text{WIDE}, \text{NO\_BALL}, \text{LEG\_BYE}, \text{BYE}, \text{WICKET}\}$:
   $$z_k = \beta_k^{(\text{format})} + \Delta \text{Bat}_k - \Delta \text{Bowl}_k + M_{\text{pitch}, k} + M_{\text{tactics}, k} + M_{\text{matchup}, k} + M_{\text{pressure}, k}$$
   $$P(k) = \frac{\exp(z_k / T)}{\sum_j \exp(z_j / T)}$$
   (where $T$ is temperature, elevated in chaotic death overs).
7. **Stage 7: Deterministic PRNG Sampling:** Cumulative distribution function (CDF) sampling using SplitMix64 PRNG output to select the exact outcome.
8. **Stage 8: Physics & Ball Trajectory Resolution:** Computes launch angle, exit velocity, polar flight coordinates $(r, \theta)$, apex height $z$, landing $(x,y)$, and nearest fielder intercept time.
9. **Stage 9: Cricket Rule Enforcement:** MCC Law compliance:
   - Free hit awarded after front-foot No-Ball (Law 21). On free hit, batter can only be dismissed via Run Out.
   - Wide ball re-bowled with 1 penalty run (Law 22).
   - Strike rotation on odd runs and at the end of each completed over.
   - Bowler quota enforcement (e.g. maximum 4 overs in T20, MCC Law 21.7 consecutive over prohibition).
10. **Stage 10: Event & Commentary Emission:** Emits immutable delivery payload: score update, batsman/bowler scorecard deltas, wagon wheel coordinates, dynamic contextual commentary string, and updated state hash.

---

## 4. Player Rating System & Era Normalization

To allow fair matches across historical eras (e.g., Don Bradman vs. Jasprit Bumrah), the rating engine employs a 5-tier architecture:

```
[Tier 1: Raw Career Statistics]
         │ (Batting avg, strike rate, bowling avg, economy, dismissals)
         ▼
[Tier 2: Era-Specific Baseline Normalization]
         │ (Adjusted against epochal runs/wicket and run rate baselines)
         ▼
[Tier 3: Empirical Bayesian Shrinkage]
         │ (Stabilizes small sample sizes toward population mean)
         ▼
[Tier 4: Sub-Attribute Mapping]
         │ (18 granular sub-attributes on 0–100 scale)
         ▼
[Tier 5: Role-Weighted Overall Ratings (OVR)]
```

### The 7 Historical Eras
1. **Golden Age (Pre-1914):** Uncovered wickets, low run rates, dominance of finger spin and medium pace.
2. **Interwar Era (1919–1939):** True batting paradises (Bradman, Hammond), long Test matches.
3. **Post-War Era (1946–1970):** Defensive re-emergence, tactical bowling (Sobers, Trueman).
4. **Pace Revolution (1971–1991):** Rise of West Indian express pace, helmets introduced, ODI cricket born.
5. **Globalized Era (1992–2007):** Modern batting bats, reverse swing, mystery spin (Tendulkar, Warne, Akram, Lara).
6. **T20 Revolution (2008–2020):** 360-degree batting, franchise leagues, specialist death bowling (Malinga, Dhoni, De Villiers).
7. **Contemporary Era (2021–Present):** Ultra-high strike rates, data analytics, hyper-athletic fielding (Kohli, Bumrah, Cummins, Rashid Khan).

### 47+ Curated Authentic Cricketers
The platform includes 47 meticulously researched, authentic cricketers across all roles:
- **Batters:** Don Bradman (99 OVR), Sachin Tendulkar (98 OVR), Virat Kohli (96 OVR), Brian Lara (97 OVR), Vivian Richards (97 OVR), Rohit Sharma (94 OVR), Babar Azam (91 OVR), Steve Smith (95 OVR), David Warner (92 OVR), Kane Williamson (92 OVR).
- **All-Rounders:** Garfield Sobers (99 OVR), Jacques Kallis (98 OVR), Imran Khan (97 OVR), Kapil Dev (94 OVR), Ben Stokes (92 OVR), Hardik Pandya (87 OVR), Andre Russell (88 OVR), Glenn Maxwell (89 OVR), Ravindra Jadeja (91 OVR), Shakib Al Hasan (90 OVR).
- **Wicketkeeper-Batters:** MS Dhoni (95 OVR), Adam Gilchrist (96 OVR), AB de Villiers (97 OVR), Kumar Sangakkara (96 OVR), Rishabh Pant (91 OVR), Jos Buttler (92 OVR).
- **Fast Bowlers:** Malcolm Marshall (98 OVR), Wasim Akram (98 OVR), Glenn McGrath (98 OVR), Jasprit Bumrah (97 OVR), Pat Cummins (95 OVR), Dale Steyn (97 OVR), Dennis Lillee (96 OVR), Shaheen Afridi (91 OVR), Kagiso Rabada (93 OVR), Mitchell Starc (93 OVR), Trent Boult (91 OVR), Lasith Malinga (95 OVR).
- **Spinners:** Shane Warne (99 OVR), Muttiah Muralitharan (99 OVR), Anil Kumble (95 OVR), Rashid Khan (94 OVR), Sunil Narine (91 OVR), Ravichandran Ashwin (93 OVR), Saqlain Mushtaq (93 OVR).

---

## 5. Stadiums, Pitch & Environment Engine

### Real-World Stadiums
1. **Melbourne Cricket Ground (MCG), Australia:** Giant boundary dimensions (85m straight, 78m square). Favors running between wickets and fast bowling bounce.
2. **Lord's Cricket Ground, England:** Historic ground with famous 2.5m slope. Enhances natural seam and swing movement.
3. **Eden Gardens, Kolkata, India:** High-capacity cauldron, spinning track that assists spinners as match progresses.
4. **Wankhede Stadium, Mumbai, India:** Compact coastal venue (65m square boundaries). High humidity introduces evening dew; batting paradise.
5. **The Gabba, Brisbane, Australia:** Fast, hard true pitch with steep bounce and carry.
6. **The Wanderers, Johannesburg, South Africa:** High-altitude venue (1,750m above sea level). Thin air reduces aerodynamic drag, yielding +15% longer sixes.

### 8 Pitch Profiles
- `GREEN`: High seam movement (+35%), early moisture, lower scores.
- `DRY`: Early turn, abrasive on ball, accelerates reverse swing.
- `DUSTY`: Extreme spin (+50%), low bounce, variable bounce.
- `FLAT_BATTING`: High run-rates, minimal lateral movement, true bounce.
- `HARD_BOUNCY`: Steep tennis-ball bounce, rewards pull and cut shots.
- `SLOW`: Low trajectory, timing difficulty, favors slower-ball variations.
- `TURNING`: Rapid deterioration for wrist and finger spinners.
- `BALANCED`: Equal contest between bat and ball.

---

## 6. Dream Team Builder & 8-Dimensional Analytics

The Dream Team Builder (`/dream-teams`) allows users to draft, organize, and inspect playing XIs:
- **MCC Squad Constraints:** Exactly 11 players, exactly 1 designated wicketkeeper, minimum 5 bowling options, unique batting order 1–11.
- **8-Dimensional Squad Analytics Radar:**
  1. *Pace Threat:* Average pace attributes of fast bowlers.
  2. *Spin Threat:* Quality and variation of spin bowlers.
  3. *Death Bowling:* Yorkers, slower balls, and economy under pressure.
  4. *Power Hitting:* Boundary strike capability across positions 1–7.
  5. *Batting Depth:* Run contribution expected from positions 8–11.
  6. *Strike Rotation:* Low dot-ball percentage against good bowling.
  7. *Boundary Prevention:* Outfield ground-fielding speed and arm strength.
  8. *Catching & Keeping:* Reflexes in slips and behind the stumps.
- **Persistence & Portability:** Saved locally in browser storage with instant export/import JSON capability and backend synchronization.

---

## 7. Interactive Visualizer (PixiJS v8 2D WebGL/WebGPU)

The visual match view (`/match`) renders an authentic top-down broadcast experience:
- **Field Rendering:** Ground boundary rope, 30-yard circle, pitch strip, bowling creases, and stumps.
- **Ball Flight Ballistics:** Parabolic flight simulation with shadow scaling for aerial elevation, ground skidding on bounce, and realistic decelerating roll.
- **Dynamic Fielder Nodes:** 11 fielders positioned according to active field presets (`ATTACKING`, `BALANCED`, `DEATH`, `SPIN_CHOKE`) with dynamic chase and intercept animations.
- **Visual FX:** Dynamic boundary ripple shockwaves, wicket shatter flashes, and ball trail particles.
- **Wagon Wheel & Radar:** Interactive radar diagram visualizing shot placement distribution, angles, and distances for any batsman.

---

## 8. What Has Been Built Till Now (Completed Phases)

Every phase from Phase 0 to Phase 6 has been designed, coded, rigorously tested, and verified.

### Phase 0: System Architecture & Technical Specifications
- Master architecture document (`docs/ARCHITECTURE.md`).
- Formal specifications for Cricket Rules, Database Schema, Simulation Engine, Player Ratings, AI Opponents, UI/UX Guidelines, and Test Strategies.
- 12 Architectural Decision Records (ADRs) approved.

### Phase 1: Foundations & Monorepo Infrastructure
- Configured Turborepo with pnpm workspaces.
- Established strict unidirectional package boundaries.
- Set up Docker environment (PostgreSQL 16, Redis 7).
- Normalized Prisma relational schema with 779 lines and 11 enumerated types.

### Phase 2: Verified Player Database & Ingestion Engine
- Built `@cricket/data-ingestion` with Cricsheet parser, Wikidata disambiguation, and provenance tracking.
- Implemented `@cricket/player-ratings` featuring empirical Bayesian shrinkage and era normalization.
- Seeded 47 benchmark cricketers across 7 eras with zero fabricated data.
- Built `/players` web interface with multi-attribute filtering and 5-layer rating explainability.

### Phase 3: Dream Team Builder & Squad Analytics
- Developed `/dream-teams` interactive squad builder with drag-and-drop batting order.
- Built `@cricket/cricket-rules` squad validation engine (Hard errors for illegal teams, advisory warnings for tactical imbalances).
- Implemented the 8-dimensional tactical radar analytics engine.
- Added bowling priority assignment (bowlers 1 through 7) and JSON import/export.

### Phase 4: Authoritative T20 Simulation Engine & Replay Verifier
- Built pure TypeScript `@cricket/simulation-engine` with the complete 10-stage delivery pipeline.
- Implemented SplitMix64 PRNG with cryptographic initial state hash ($H_0$).
- Built scorecard reconciler ensuring 100% mathematical consistency (balls, overs, runs, extras, wickets).
- Validated via 10,000-match Monte Carlo calibration test suite.
- Built `verifyMatchReplay` deterministic replay validator to detect any data tampering.

### Phase 5: Interactive 2D Visualizer with PixiJS v8
- Built PixiJS v8 2D WebGL/WebGPU canvas visualizer with responsive auto-resizing.
- Created field geometry (elliptical boundary, 30-yard circle, pitch creases).
- Created ballistic flight trajectory animator with elevation shadow scaling.
- Added boundary shockwaves, wicket visual bursts, and speed controls (1x, 2x, 5x, Instant).

### Phase 6: Playable End-to-End Game, AI Opponents & Match Vault
- Built intelligent AI opponent generator (`generateAIOpponentTeam`) across 3 difficulty tiers (`EASY`, `MEDIUM`, `HARD`) and 5 pitch presets.
- Implemented interactive coin toss with bat/bowl selection and AI tactical rationale.
- Connected true causal live stepping (`stepDelivery`) with in-match tactical controls (batter aggression, bowler length/line, field presets).
- Implemented dynamic event commentary and Player of the Match (POTM) formula.
- Added active match auto-save to `localStorage` with instant session resume and Match Vault archive.
- Created unified `Navbar` with mobile drawer and live backend status indicator.
- 100% tests passing (23/23 frontend Vitest tests, engine test suites green).
- Production build verified (`pnpm build` exited with code 0).

---

## 9. Current Application Inventory & Directory Map

```
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── health/              # GET /health - API & DB health checks
│   │   │   ├── modules/
│   │   │   │   ├── dream-teams/     # CRUD for user dream teams
│   │   │   │   ├── matches/         # Simulation runner, replay verify, SSE stream
│   │   │   │   └── players/         # Query and retrieve curated player catalogue
│   │   │   ├── prisma/              # PrismaService with resilient startup connection
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   └── test/
│   │
│   └── web/
│       ├── app/
│       │   ├── page.tsx             # Home landing dashboard & game hub
│       │   ├── layout.tsx           # Global root layout with Navbar
│       │   ├── players/page.tsx     # Player catalogue, filters & explainability
│       │   ├── dream-teams/page.tsx # Squad builder, 8D radar & validation
│       │   └── match/               # Match setup, interactive toss, live game loop
│       │       ├── page.tsx         # Complete match UI & state machine
│       │       └── visualizer/      # PixiJS v8 2D canvas, ball & player animators
│       ├── components/
│       │   └── Navbar.tsx           # Global responsive navigation header
│       └── test/                    # Vitest E2E game journey test suites
│
├── packages/
│   ├── simulation-engine/
│   │   ├── src/
│   │   │   ├── ai/                  # AI opponent generation & captaincy
│   │   │   ├── calibration/         # Monte Carlo calibration runner
│   │   │   ├── environment/         # Pitch types & stadium aerodynamics
│   │   │   ├── pipeline/            # 10-stage delivery pipeline & logits
│   │   │   ├── prng/                # SplitMix64 PRNG & SHA-256 state hashing
│   │   │   ├── rulesets/            # T20 ruleset & bowler quota enforcement
│   │   │   ├── runner/              # Match runner, reconciler & replay verifier
│   │   │   ├── state/               # Immutable MatchState interfaces
│   │   │   └── transition/          # Trajectory, commentary & delivery transitions
│   ├── cricket-rules/               # MCC law validators & 8D squad analytics
│   ├── player-ratings/              # 5-tier rating model & Bayesian normalizer
│   ├── data-ingestion/              # Curated seed data (47 authentic players)
│   ├── shared-types/                # Shared TypeScript models & contracts
│   └── validation/                  # Zod validation schemas
│
└── database/
    └── prisma/
        └── schema.prisma            # Normalized relational database schema
```

---

## 10. Master Roadmap: What We Are Building Next

The immediate priority was establishing an authoritative, complete, end-to-end playable T20 game (Phases 0–6). The upcoming phases expand format depth, community features, career modes, and immersive presentation:

```
[Phases 0–6: Complete Playable T20 Game & Foundations] (COMPLETED)
                          │
                          ▼
[Phase 7: Multi-Format Expansion (Test, ODI, T10)]
                          │
                          ▼
[Phase 8: Real-Time Online Multiplayer & Matchmaking]
                          │
                          ▼
[Phase 9: Franchise & Dynasty Career Mode]
                          │
                          ▼
[Phase 10: Immersive 3D Stadium Visualizer (WebGPU / Three.js)]
```

### Phase 7: Multi-Format Expansion (Test Matches, ODI, T10)
- **5-Day Test Cricket (Red Ball & Pink Ball Day/Night):**
  - Session mechanics: Morning, Afternoon, Evening sessions across 5 days (90 overs/day).
  - Multi-innings match state: First innings lead/deficit, follow-on enforcement logic (MCC Law 14).
  - Tactical declarations (MCC Law 15) and tactical nightwatchman strategies.
  - Multi-day pitch deterioration: Day 1 moisture turning into Day 4/5 rough patches and deep cracks.
  - Pink ball twilight visibility mechanics and floodlight swing variations.
  - Authentic result outcomes: Win, Loss, Tie, and Draw (time-expired).
- **One Day Internationals (ODI - 50 Overs):**
  - 3-tier fielding restrictions: Powerplay 1 (Overs 1–10: 2 fielders out), Powerplay 2 (Overs 11–40: 4 fielders out), Powerplay 3 (Overs 41–50: 5 fielders out).
  - 10-over bowler quota enforcement.
  - Middle-overs strike rotation and spin-choke meta.
- **T10 Sprint Cricket (10 Overs):**
  - High-octane format: 2-over bowler quota, 3-over powerplay, ultra-aggressive baseline logits.

### Phase 8: Real-Time Online Multiplayer & Tournaments
- **Authoritative WebSocket Match Gateway:** Real-time peer-to-peer or server-mediated live matches.
- **Live Head-to-Head Tactical Duel:** Simultaneous tactical choice submission (bowler selects line/length/variation; batter selects shot intent within a 10-second countdown clock).
- **Ranked Matchmaking & Elo Rating System:** Competitive leaderboard with anti-cheat state hash validation.
- **Custom Knockout & Round-Robin Tournaments:** User-organized leagues with group stages, playoffs, and shared tournament vaults.

### Phase 9: Franchise & Dynasty Career Mode
- **Franchise Management:** Salary cap auctions, multi-year contracts, and youth scouting.
- **Dynamic Player Progression & Aging Curves:** Young players developing skills with match experience; veterans declining in athletic attributes while retaining tactical composure.
- **Season Simulation Engine:** Fast-simulate entire multi-team league seasons with comprehensive statistical leaderboards (Orange Cap, Purple Cap, MVP awards).

### Phase 10: Immersive 3D Stadium Visualizer (WebGPU / Three.js)
- Optional 3D match viewing mode switching from top-down 2D canvas to a 3D isometric or broadcast TV camera view.
- Realistic lighting, stadium grandstands, crowd noise, and 3D ball arc rendering with Hawk-Eye style ball tracking.

