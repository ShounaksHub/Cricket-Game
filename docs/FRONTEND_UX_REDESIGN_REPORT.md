# Cricket Dream XI: Frontend & UX Redesign Report

**Focus Areas:** Information Architecture, User Journeys, Progressive Disclosure, Screen-by-Screen Refinements  
**Scope:** Home (`/`), Dream XI Builder (`/dream-teams`), Match Setup & Live Arena (`/match`), Player Archive (`/players`), My Cricket (`/my-cricket`).

---

## 1. User Journey Improvements

### A. Format Selection to Match Commencement
- **Previous Friction:** Clicking a format on the Home page navigated with query params (`?format=TEST_PINK_BALL`), but internal state could fail to hydrate reactively, falling back to T20.
- **Redesigned Flow:** Home format cards and direct URLs immediately hydrate the exact format across `SETUP`, configuring format-specific rules (e.g. Day-Night pink ball tracking, session accounting, unlimited overs) seamlessly.

### B. Post-Toss Decision Architecture
- **Previous Friction:** Coin toss was followed by an overwhelming multi-step screen mixing batting lineup reordering, bowling selection, and field placement simultaneously.
- **Redesigned Flow:**
  - Clear Coin Toss with distinct Call (Heads/Tails) and Toss action.
  - Distinct Opening Batter Selection (Step 1: Striker, Step 2: Non-Striker, Step 3: Confirmation).
  - Clear Strike Bowler selection with frontline pacer and spinner recommendations.
  - Clean field placement presets with visual pitch editor.

### C. Live Match Bowling Management (User's Primary Bug Request)
- **Previous Friction:**
  - In Test matches, only two batters bowled every over in tandem due to an engine fallback bug.
  - The bowler dropdown was flat, repetitive, displayed infinite quotas as `999 ov`, and locked onto the same bowler over after over.
- **Redesigned Experience:**
  - Frontline strike bowlers and spinners bowl naturally in tandem based on priority and format rating.
  - Bowling selector is split into authentic categories: **Frontline Pace Bowlers**, **Frontline Spin Bowlers**, **All-Rounders**, and **Part-Time Bowlers**.
  - Detailed figures displayed for each bowler: `O-M-R-W` and economy rate.
  - Direct **Quick Select Strike Bowler** cards allow 1-click nomination for the next over.
  - Active bowler and resting bowler (under MCC Law 21.7) are clearly badged.
  - Over completion resets nomination cleanly to enable smooth bowler rotation.

---

## 2. Screen-by-Screen Audit & Redesign

### 1. Home Screen (`/`)
- Art-directed publication masthead with genuine career statistics (total runs, matches played, win percentage).
- Transparent product roadmap replacing vague futuristic placeholders.
- 1-click quick action tiles for Saved Dream XI, Live Match Resume, and Match Archive Vault.

### 2. Dream XI Lineup Builder (`/dream-teams`)
- Visual squad formation board (11 players).
- Real-time role balance meter (Batters, Keepers, All-Rounders, Bowlers).
- Clear 1-Player-Per-Nation and IPL rule enforcement with localized slot indicators.
- Instant Auto-Fill Best XI feature.

### 3. Match Setup & Post-Toss (`/match`)
- 4-step progressive wizard:
  1. Match Format Selection (T10, T20, ODI, Test Red Ball, Test Pink Ball)
  2. Squad & Opponent Selection (Authentic Rivalry, 2026 IPL Franchises, World XI, Custom Dream Team)
  3. Stadium Venue & Conditions (Pitch type, temperature, humidity, dew, wind)
  4. Toss & Sequential Tactics
- Clear feedback on pitch wear, crack index, and ball degradation.

### 4. Live Match Simulation (`/match`)
- Prominent live scoreboard banner showing score, wickets, and overs with format-specific max overs.
- Live PixiJS 2D broadcast field visualizer with authentic fielder positions and delivery trajectories.
- Single dominant primary action: **Continue Delivery** / Playback Controls.
- Collapsible advanced tactical panel (Pace Strategy, Bowling Intent, Field Presets, Line & Length).

### 5. Player Archive (`/players`)
- Search by name across 1,144 historical and contemporary cricketers.
- Quick filter pills by primary role, nation, and cricket era.
- Detailed career profile cards with format ratings, batting hand, bowling style, and verified stats.

### 6. My Cricket Pavilion (`/my-cricket`)
- Local manager identity with customizable name and captain badge.
- Match history vault with full scorecard access and bit-exact replay verification.
- Offline-ready storage management.

