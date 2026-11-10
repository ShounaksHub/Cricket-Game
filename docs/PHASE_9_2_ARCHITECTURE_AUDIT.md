# PHASE 9.2: ARCHITECTURE & END-TO-END DEPENDENCY AUDIT

**Audit Date:** 10 November 2026  
**Baseline Commit:** `94ebd77ba91b8e26b8ab9b71485a5f864a6dca92`  
**System Under Test:** Cricket Dream XI (Single-Project Monorepo)

---

## 1. System Topology & Data Flow Map

```mermaid
flowchart TD
    subgraph Client State & Storage
        UP["cricket_user_profile<br/>(Guest Manager Profile)"]
        SDT["cricket_dream_teams<br/>(Saved Custom Lineups)"]
        AUT["cricket_active_user_team<br/>(Active Lineup Bridge)"]
        AMS["cricket_active_match_session<br/>(Mid-Match Save/Resume)"]
        MH["cricket_match_history<br/>(Completed Matches Vault)"]
    end

    subgraph Roster & Identity Core
        VBP["VERIFIED_BENCHMARK_PLAYERS<br/>(1,144 Unique Records)"]
        DIR["Data Ingestion Pipeline<br/>(4-Layer Bayesian Ratings)"]
        PIR["player-image-resolver.ts<br/>(5-Tier Classification + Deterministic SVG)"]
    end

    subgraph Squad Architect
        SB["/dream-teams (Squad Architect)<br/>(Search, Filter, Role/Nation Rules)"]
        SV["@cricket/cricket-rules<br/>(validateDreamTeamSquad)"]
        SA["@cricket/cricket-rules<br/>(calculateSquadAnalytics)"]
    end

    subgraph Match Lifecycle
        MS["/match (Match Setup)<br/>(Format, Pitch, Stadium, Weather, Seed)"]
        OPP["Opponent Selector<br/>(Custom Dream XI / 1-Per-Nation / Rivalry)"]
        TOSS["Deterministic Coin Toss<br/>(SplitMix64 PRNG)"]
        SIM["@cricket/simulation-engine<br/>(10-Stage Deterministic Ball-by-Ball)"]
        PIXI["PixiJS v8 2D Visualizer<br/>(Hardware Accelerated Field View)"]
        SC["Reconciled Scorecard<br/>(reconcileMatchScorecard + POTM)"]
        REP["Replay Engine<br/>(verifyMatchReplay)"]
    end

    UP --> MS
    VBP --> DIR --> SB
    VBP --> PIR --> SB
    VBP --> PIR --> MS
    VBP --> PIR --> PIXI
    SB --> SV --> SDT
    SB --> SA --> SDT
    SDT --> AUT --> MS
    MS --> OPP --> TOSS --> SIM
    SIM <--> PIXI
    SIM --> SC
    SIM --> AMS
    AMS -.->|Resume Match| SIM
    SC --> MH
    SC --> REP
    MH --> UP
```

---

## 2. Component-by-Component Integration Audit

| Component | Upstream Dependency | Downstream Output | Storage Key | Integrity Status |
|---|---|---|---|---|
| **1. User Profile** | Local state / User edits | Display in Header & My Cricket | `cricket_user_profile` | **Verified**: Defaults to Guest Manager, zero fabricated data |
| **2. Player Database** | `VERIFIED_BENCHMARK_PLAYERS` | 1,144 Player profiles | In-memory bundle | **Verified**: 1,144 unique UUIDs, zero NaNs |
| **3. Dream XI Builder** | Ingestion pipeline + Filter UI | Validated Playing XI | In-memory state | **Verified**: Cross-era/cross-nation multi-selection supported |
| **4. Saved Squads** | Dream XI Builder save action | Match Setup / My Cricket | `cricket_dream_teams` & `cricket_active_user_team` | **Verified**: Saves 11 UUIDs, survives restarts |
| **5. Match Setup** | Saved squads / Presets | Match simulation config | State & storage | **Verified**: Passes selected UUIDs without substitution |
| **6. Opponent Selection** | National teams / AI generator | AI Lineup with 0 overlap | In-memory config | **Verified**: 0 player overlap enforced |
| **7. Toss Engine** | SplitMix64 PRNG + Seed | Batting/Bowling order | In-memory state | **Verified**: 100% deterministic, renders true captains |
| **8. Match Engine** | 10-stage physics simulation | Ball-by-ball delivery events | `MatchState` | **Verified**: All 5 formats (T10, T20, ODI, Test Red/Pink) |
| **9. PixiJS Visualizer** | Live delivery events | 60 FPS 2D canvas | Canvas context | **Verified**: Synchronized ballistics & fielder positions |
| **10. Scorecard** | `reconcileMatchScorecard` | Tabular stats + FOW | `ReconciledMatchScorecard` | **Verified**: 100% reconciliation with delivery events |
| **11. Match Result** | Innings completion check | Result summary + POTM | `PlayerOfTheMatch` | **Verified**: POTM derived from impact points |
| **12. Match History** | Post-match archive handler | My Cricket vault | `cricket_match_history` | **Verified**: Aggregates runs, wickets, win rates |
| **13. Replay Engine** | Initial state hash + seed | Replay verification report | Verification modal | **Verified**: 100% bit-exact parity across formats |
| **14. Local Persistence & Resume**| Active delivery step handler | In-progress state restoration | `cricket_active_match_session` | **Verified**: Resumes mid-match without event loss |

---

## 3. Discovered Vulnerabilities & Verification Results

1. **Hardcoded Fallbacks Eliminated:** In Phase 9.1, hardcoded template users ("Vikramaditya Sen") and mismatched headshots were removed. Stage B/C/D audits confirm no hardcoded player UUID substitutions occur.
2. **Deterministic Vector Avatars:** All 1,144 players resolve to deterministic SVG data URIs based on nationality palettes and role glyphs. No unverified third-party photographs are misrepresented as authentic.
3. **Single Source of Truth for Teams:** Custom squads created in `/dream-teams` synchronize to `cricket_dream_teams` and `cricket_active_user_team`. The match setup screen automatically detects and prioritizes saved user squads in `CUSTOM_DREAM_TEAM` mode.
