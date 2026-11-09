# Comprehensive Testing Strategy & Cricket Calibration

**Document Version:** 1.0.0  
**Status:** DRAFT - AWAITING PHASE 0 REVIEW  
**Test Frameworks:** Vitest, Playwright, fast-check (Property-Based Testing)  

---

## 1. Testing Pyramid & Verification Architecture

To guarantee strict cricket rule correctness, mathematical determinism, and realistic statistical outputs, testing is prioritized across five verification tiers:

```mermaid
pyramid
    title Test Verification Hierarchy
    E2E & UI Flows ["E2E & Browser UI Integration (Playwright)"]
    API & WebSocket ["API & Gateway Integration Tests (Vitest + Supertest)"]
    Statistical Calibration ["Monte Carlo Statistical Calibration (10,000 Matches/Format)"]
    Cricket Rules & State Invariants ["Cricket Law & Invariant Assertions (fast-check)"]
    Unit & Math Kernels ["Unit Tests: PRNG, Softmax, Rating Algorithms (Vitest)"]
```

---

## 2. Cricket Rule Invariant Test Suite

Rule assertions are verified using property-based testing (`fast-check`) across randomized action vectors:

| Invariant Category | Assertion & Validation Rule | Tool / Methodology |
|---|---|---|
| **Striker Rotation** | Striker switches if and only if: (a) odd runs scored off the bat, (b) odd byes/leg-byes, or (c) over completed. Striker does NOT switch on boundaries (4, 6) or even runs. | Deterministic sequence invariant tests. |
| **Extras Accounting** | $\text{TeamTotalRuns} = \sum \text{BatterRuns} + \text{Wides} + \text{NoBalls} + \text{Byes} + \text{LegByes} + \text{Penalties}$. Bowler conceded runs must exclude Byes and Leg-Byes. | Automated integrity check on every delivery. |
| **Over Completion** | An over terminates precisely when 6 legal deliveries have been bowled. Wides and No-Balls re-bowl without incrementing the legal ball counter. | Property-based testing with 10,000 random overs. |
| **Bowler Quota Enforcement** | No bowler may exceed the format maximum (T10: 2, T20: 4, ODI: 10). No bowler may bowl two consecutive overs from both ends. | State machine transition guard tests. |
| **Wickets Ceiling** | Innings terminates immediately upon 10 wickets falling. | Boundary state test. |
| **Free Hit Immunity** | Off a Free Hit delivery following a No-Ball, batter cannot be dismissed Bowled, Caught, LBW, or Stumped. | Specific scenario test suite. |
| **Target & Chase Termination** | In 2nd/4th innings chases, the match terminates immediately on the exact delivery when $\text{Runs} \ge \text{TargetRuns}$. | State boundary check. |

---

## 3. Deterministic Seed & Replay Verification Tests

Every match must be 100% reproducible:
$$\text{ReplayState}(S_0, \text{Seed}, \text{ActionLog}) \equiv S_{\text{recorded}}$$

### Automated Test Scenario:
1. Initialize a T20 match with seed `0x8a92fbc134d1n`.
2. Execute 240 deliveries with random user action inputs.
3. Record the final score, fall of wickets, bowling figures, and SHA-256 state hash.
4. Reset memory completely. Re-instantiate the simulation engine using the identical seed and feed the exact action log.
5. Assert that:
   - Every single ball outcome matches 1:1.
   - Final score, individual player runs, and balls faced are identical.
   - State hash matches byte-for-byte.

---

## 4. Statistical Calibration & Historical Tolerance Envelopes

To prevent unrealistic outputs (e.g., constant sixes or absurd collapse rates), the simulation engine runs **Monte Carlo batches of 10,000 matches per format** and validates outputs against empirical historical envelopes:

| Format | Metric | Historical Benchmark (2020–2024) | Simulation Acceptance Envelope |
|---|---|---|---|
| **T20** | Run Rate (Runs per Over) | 8.10 – 8.65 | **7.80 – 8.90** |
| **T20** | Boundary Percentage (% of runs from 4s/6s) | 56% – 64% | **52% – 68%** |
| **T20** | Dot-Ball Percentage | 34% – 40% | **32% – 42%** |
| **T20** | Wickets per Innings (Mean) | 6.2 – 7.1 | **5.8 – 7.5** |
| **ODI** | Run Rate (Runs per Over) | 5.30 – 5.80 | **5.00 – 6.10** |
| **ODI** | Complete Innings All-Out Frequency | 28% – 35% | **25% – 38%** |
| **Test Red Ball** | Run Rate (Runs per Over) | 3.10 – 3.50 | **2.80 – 3.80** |
| **Test Red Ball** | Draw Probability (Balanced pitch) | 16% – 22% | **14% – 25%** |
| **Test Red Ball** | Matches Lasting into Day 5 | 55% – 65% | **50% – 70%** |

If a Monte Carlo test run produces metrics outside these envelopes, the CI/CD pipeline fails, signaling that base probability weights or pitch modifiers require recalibration.

---

## 5. End-to-End & Performance Acceptance Criteria

* **Headless Simulation Speed:** The engine must simulate 1 complete 40-over T20 match in $< 20\text{ ms}$ on a standard x86 CPU core (enabling 10,000 matches in $< 3.5\text{ minutes}$).
* **Client UI Performance:** PixiJS canvas must maintain a consistent $\ge 58\text{ FPS}$ during ball delivery animations across Chrome, Safari, and Firefox.
* **Browser Memory:** Zero memory leaks across 5 consecutive matches in a single browser session (monitored via Chrome DevTools heap profiling).
