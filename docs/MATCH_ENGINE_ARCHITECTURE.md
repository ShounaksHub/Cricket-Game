# Match Simulation Engine Architecture & Mathematics

**Document Version:** 1.0.0  
**Status:** APPROVED ARCHITECTURAL SPECIFICATION  
**Package:** `@cricket/simulation-engine`  
**Execution Runtime:** Pure TypeScript (Zero external dependencies; Web Worker & Node.js isomorphic)  

---

## 1. Core Architectural Paradigm

The cricket simulation engine operates as a **strictly deterministic, purely functional state transition machine**:

$$\text{simulateDelivery}(S_t, A_t, \text{PRNG}_t) \longrightarrow (S_{t+1}, E_t, \text{PRNG}_{t+1})$$

Where:
* $S_t$ is the immutable, freeze-protected match state at delivery sequence index $t$.
* $A_t$ is the combined tactical action profile (batter intent + bowler intent + field placement).
* $\text{PRNG}_t$ is the deterministic pseudo-random number generator state (SplitMix64).
* $S_{t+1}$ is the newly derived immutable match state.
* $E_t$ is the rich delivery event payload (telemetry, trajectory vector, scorecard delta, commentary token).
* $\text{PRNG}_{t+1}$ is the updated PRNG internal state.

Under no circumstances does the engine touch system clocks (`Date.now()`), browser globals (`window`), databases, or non-deterministic platform random sources (`Math.random()`, `crypto.getRandomValues`).

---

## 2. Versioning Triad & Deterministic Replay Guarantees

Every simulated match is permanently bound to a versioning triad to ensure 100% bit-exact replay reproducibility across all devices:

1. **Simulation Engine Version (`sim-1.0.0`):** Governs the 10-stage delivery execution pipeline, SplitMix64 PRNG algorithm, Softmax probability resolution, 2D trajectory physics, and ball dynamics.
2. **Ruleset Version (`rules-t20-icc-2026.1`):** Governs playing conditions, over quotas (e.g. 4 overs/bowler in T20), powerplay overs (1-6 in T20), fielding restrictions, no-ball free hits, and tie-breakers.
3. **Rating Engine Version (`rate-1.0.0`):** Governs raw stat normalization baselines, historical era multipliers, and 0–100 player skill attributes.

### Initial State Hash ($H_0$) & Monotonic Sequence
Before delivery $t=1$, an immutable SHA-256 hash $H_0$ is produced:
$$H_0 = \text{SHA-256}\left(\text{JSON.stringify}(\{ \text{seed}, \text{format}, \text{ruleset\_version}, \text{rating\_version}, \text{stadium}, \text{pitch}, \text{lineups} \})\right)$$

Given $(H_0, \text{MatchSeed}, \text{ActionLog})$, any client or server can replay the match delivery-by-delivery to verify scorecards:
$$\text{ReplayVerify}(H_0, \text{MatchSeed}, \text{ActionLog}) \equiv S_{\text{final}}$$

---

## 3. The 10-Stage Delivery Execution Pipeline

Every ball passes through 10 deterministic stages:

```
[1. Context Accumulator]
         │ (CRR, RRR, ball age, pitch wear index, batter/bowler fatigue)
         ▼
[2. Tactical Intention Resolution]
         │ (Batter: DEFEND/ROTATE/BALANCED/AGGRESSIVE/POWER; Bowler: Line, Length, Variation)
         ▼
[3. Attribute Matrix Extraction]
         │ (Batter: Technique, Timing, Power, Against Pace/Spin; Bowler: Line/Length, Seam, Pace)
         ▼
[4. Environmental & Ball Modifiers]
         │ (Pitch type, atmospheric swing, humidity, ball wear, dew factor)
         ▼
[5. Batter-Bowler Matchup Resolution]
         │ (LHB vs Off-spin, RHB vs Left-arm pace, bounce vulnerability)
         ▼
[6. Outcome Probability Vector Calculation]
         │ (Softmax log-odds over 11 discrete outcomes: DOT, 1, 2, 3, 4, 6, WIDE, NO_BALL, LB, BYE, WICKET)
         ▼
[7. Deterministic PRNG Sampling]
         │ (SplitMix64 random float roll against CDF)
         ▼
[8. Physics & Trajectory Resolution]
         │ (2D polar angle θ, elevation φ, ground landing distance d, fielder intercept test)
         ▼
[9. Cricket Rule & State Transition]
         │ (Extras accounting, legal ball check, batsman strike rotation, over completion)
         ▼
[10. Event & Scorecard Delta Emission]
           (Monotonic event sequencing, wagon wheel coordinates, scorecard update)
```

---

## 4. Multi-Format Domain Invariants

The match state machine natively supports all five formats without structural rewrites:

1. **Runs Conservation Invariant:**
   $$\text{TotalRuns} = \sum \text{BatRuns} + \text{Wides} + \text{NoBalls} + \text{Byes} + \text{LegByes} + \text{Penalties}$$
2. **Wickets Ceiling Invariant:**
   $$\text{TotalWickets} \le 10$$
3. **Over Accounting Invariant:**
   $$\text{LegalDeliveriesInOver} \le 6$$
   Wides and No-Balls do not consume legal delivery slots. An over terminates if and only if 6 legal deliveries are bowled.
4. **Striker Rotation Invariant:**
   - Batters rotate strike on odd runs scored off the bat ($1, 3, 5$) and odd byes/leg-byes.
   - Batters do NOT rotate strike on boundaries ($4, 6$), standard dots, or wides.
   - Batters rotate strike at the completion of an over (unless an intervening wicket fell on ball 6, in which case the incoming batter takes the non-striker position).
5. **Bowler Quota Invariant:**
   - T10: Maximum 2 overs per bowler.
   - T20: Maximum 4 overs per bowler.
   - ODI: Maximum 10 overs per bowler.
   - Test: Unlimited; consecutive overs from alternating ends only (MCC Law 21.7).
6. **Multi-Day Test Invariants:**
   - Innings 1 to 4 structure.
   - Follow-on option available if 1st innings deficit $\ge 200$ runs.
   - Declarations permitted between deliveries.
   - Match concludes as WIN (target overhauled or all out), DRAW (days/overs expire), or TIE (all out with level scores).
