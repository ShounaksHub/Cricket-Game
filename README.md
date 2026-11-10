# Cricket Dream Team & Multi-Format Match Simulation Game

A high-performance, deterministic browser-based cricket simulation game and dream-team management platform built with modern TypeScript, Next.js 15, NestJS 11, Turborepo, and PixiJS 8.

---

## 1. PLATFORM ARCHITECTURE & ENGINE TRIAD

The platform is governed by an authoritative engine triad ensuring bit-exact determinism across all platforms:

- **Simulation Engine:** `sim-1.0.0` (SplitMix64 64-bit PRNG, SHA-256 state hashing, immutable transitions)
- **Cricket Ruleset:** `rules-multi-format-icc-2026.1` (ICC Playing Conditions for T10, T20, ODI, Test Red Ball & Pink Ball)
- **Player Rating Engine:** `rate-1.0.0` (Four-layer rating engine: base skills, format calibration, era normalization, situational matchups)

---

## 2. NATIVE MULTI-FORMAT SUPPORT (PHASE 8)

The platform natively supports all five official formats of professional cricket:

| Format | Overs / Innings | Bowler Quota | Powerplays | Innings | Special Mechanics |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T10** | 10 overs | 2 overs max | Overs 1–3 (P1) | 2 | Free hit on front-foot no-ball, hyper-aggressive intent |
| **T20** | 20 overs | 4 overs max | Overs 1–6 (P1) | 2 | Free hit on no-ball, boundary hunting & death slog |
| **ODI** | 50 overs | 10 overs max | 3 Blocks: P1 (1–10), P2 (11–40), P3 (41–50) | 2 | Innings consolidation, strike rotation, 2 white balls |
| **Test (Red Ball)** | Unlimited ($\le 450$ match) | Unlimited | None (open field) | Up to 4 | 5 days, 90 ov/day, 3 sessions, follow-on ($\ge 200$), declarations, draws |
| **Test (Pink Ball)**| Unlimited ($\le 450$ match) | Unlimited | None (open field) | Up to 4 | Day-Night sessions (Afternoon, Twilight, Night), twilight swing enhancement |

---

## 3. GLOBAL PLAYER DATABASE (1,144 PLAYERS)

The unified player database contains **1,144 unique, canonicalized players** across six distinct cohorts:
1. **Active International Men (2020–2026):** 320 players (e.g. Virat Kohli, Jasprit Bumrah, Joe Root, Pat Cummins)
2. **Historical Legends (1877–2019):** 260 players (e.g. Donald Bradman, Sachin Tendulkar, Shane Warne, Wasim Akram)
3. **Premier Franchise T20 Specialists:** 220 players (e.g. Andre Russell, Nicholas Pooran, Rashid Khan, Sunil Narine)
4. **Domestic First-Class & List A Stalwarts:** 170 players (e.g. Cheteshwar Pujara, Darren Stevens, Sheldon Jackson)
5. **Women's International & Domestic Pioneers:** 120 players (e.g. Ellyse Perry, Smriti Mandhana, Meg Lanning)
6. **Pre-WWII & Golden Age Legends:** 54 players (e.g. W.G. Grace, Victor Trumper, Jack Hobbs)

---

## 4. CODEBASE STRUCTURE & MONOREPO PACKAGES

```
cricket-game/
├── apps/
│   ├── api/                 # NestJS 11 REST API & SSE Live Event Stream
│   └── web/                 # Next.js 15, React 19, Tailwind CSS, PixiJS 8.16 Visualizer
├── packages/
│   ├── shared-types/        # Universal domain contracts, enums, match state schemas
│   ├── cricket-rules/       # MCC Laws, powerplays, bowler quotas, squad validators
│   ├── player-ratings/      # Four-layer rating engine, era shrinkage estimators
│   ├── simulation-engine/   # Deterministic SplitMix64 PRNG, delivery pipeline, transitions
│   ├── data-ingestion/      # 1,144 player seed records, duplicate detection, stats
│   └── validation/          # Domain invariant checkers & assertion guards
├── database/                # Prisma 6 ORM, migrations, SQLite client
└── docs/                    # Architectural specifications and independent audit logs
```

---

## 5. GETTING STARTED

### Prerequisites
- Node.js 20+ LTS (Node.js 24 recommended)
- pnpm 9+
- Python 3.10+ (for ingestion scripts)

### Installation
```bash
# Clone the repository
git clone https://github.com/example/cricket-game.git
cd cricket-game

# Install monorepo dependencies
pnpm install

# Generate Prisma client and seed player database
pnpm --filter @cricket/database db:generate
pnpm --filter @cricket/database db:seed
```

### Running Automated Test Suites
```bash
# Run all 206 automated tests across all 9 packages
pnpm test

# Run tests for specific packages
pnpm --filter @cricket/simulation-engine test
pnpm --filter @cricket/web test
pnpm --filter @cricket/api test
```

### Building the Project
```bash
# Build all packages and applications with Turborepo
pnpm build
```

### Starting the Development Environment
```bash
# Start both Web (localhost:3000) and API (localhost:4000) concurrently
pnpm dev
```

---

## 6. STRATEGIC PRODUCT ROADMAP (PHASES 8–11)

- **Phase 8 (Current Milestone):** Multi-Format Engine (T10, T20, ODI, Test Red Ball, Test Pink Ball) + Full-Codebase Pre-Deployment Audit.
- **Phase 9 (Next Milestone):** Real-Time Online Multiplayer & Live Spectator Rooms (WebSocket matchmaking, PvP tactics, spectator lobbies).
- **Phase 10 (Future Milestone):** Franchise League & Player Career Dynasty Mode (Multi-season management, IPL-style mega auctions, salary caps, scouting).
- **Phase 11 (Future Milestone):** WebGPU 3D Stadium Visualization & Broadcast Camera Engine (Photorealistic grass shaders, 3D physics, crowd audio, broadcast cameras).

---

## 7. AUDIT & VERIFICATION REPORTS

- `docs/PHASE_8_INITIAL_REPOSITORY_AUDIT.md`: Baseline codebase inspection and gap analysis.
- `docs/PHASE_8_MULTIFORMAT_ARCHITECTURE.md`: Multi-format FSM state transition architecture.
- `docs/PHASE_8_PLAYER_DATABASE_AUDIT.md`: Complete audit of all 1,144 player profiles.
- `docs/PHASE_8_RATING_SYSTEM_AUDIT.md`: Mathematical validation of 4-layer rating engine.
- `docs/PHASE_8_SECURITY_AUDIT.md`: OWASP Top 10 analysis and state immutability.
- `docs/PHASE_8_TESTING_AND_CALIBRATION_REPORT.md`: Monte Carlo statistical calibration across all 5 formats.
- `docs/PRE_DEPLOYMENT_BLOCKER_REGISTER.md`: P0/P1/P2/P3 classification register with zero blockers.
- `docs/PRE_DEPLOYMENT_AUDIT_REPORT.md`: Production technical readiness assessment.
- `docs/PHASE_8_IMPLEMENTATION_REPORT.md`: Final completion report with dual independent verdicts.
- `docs/VERCEL_DEPLOYMENT_FEASIBILITY_AND_SETUP.md`: Vercel + Railway production deployment guide.

---

## 8. LICENSE
Proprietary & Confidential. All Rights Reserved.
