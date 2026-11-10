# PHASE 8.2: CRICKET RULES AND CONDITIONS VERIFICATION MATRIX

**Reference Date:** 10 November 2026  
**Auditing Standard:** MCC Laws of Cricket (3rd Edition - 2022/2026) & ICC Men's Playing Conditions (effective October 2026)  

---

## 1. OFFICIAL RULE PROVENANCE & IMPLEMENTATION AUDIT

### 1.1 MCC Law 14: Follow-On
- **Official Clause:** MCC Law 14.1 (5-day matches require a lead of 200 runs; 3 or 4-day matches require 150; 2-day matches require 100; 1-day matches require 75). Follow-on is an option exercisable by the captain of the fielding side.
- **Source Code:** `packages/simulation-engine/src/transition/delivery-transition.ts` (Lines 605–645) & `packages/simulation-engine/src/ai/ai-captain.ts` (Lines 260–275).
- **Implementation:**
  - Evaluated when Innings 2 terminates.
  - Deficit calculated: `inn1.totalRuns - inn2.totalRuns`.
  - If `deficit >= 200`, `isFollowOnEligible = true`.
  - Captain choice parsed via `action.enforceFollowOn`:
    - `true`: Team 2 bats again in Innings 3 (`isFollowOn: true`).
    - `false`: Team 1 bats again in Innings 3 (`isFollowOn: false`).
    - `undefined` (AI): Enforced if lead $\ge 250$ runs or bowlers bowled $< 90$ overs; otherwise declined to rest bowlers.
- **Test:** `packages/simulation-engine/tests/phase-8-1-engine-audit.test.ts` (Test: *"implements Follow-On as an optional captain decision (enforced vs declined)"*).
- **Discrepancy:** None. Conforms with Law 14.

---

### 1.2 ICC Men's Test Match Playing Conditions Clause 4.3: The Ball
- **Official Clause:** Clause 4.3.1 (A new ball may be demanded by the captain of the fielding side after 80 overs have been bowled with the previous ball).
- **Source Code:** `packages/simulation-engine/src/transition/delivery-transition.ts` (Lines 515–530) & `packages/simulation-engine/src/ai/ai-captain.ts` (Lines 240–250).
- **Implementation:**
  - When `oversSinceNewBall >= 80`, engine flags `isNewBallAvailable = true`.
  - Ball age continues incrementing and ball wear remains active if `action.takeNewBall === false`.
  - When `action.takeNewBall === true`, `oversSinceNewBall = 0`, `ballWearIndex = 0.05`, and `isNewBallAvailable = false`.
- **Test:** `packages/simulation-engine/tests/phase-8-1-engine-audit.test.ts` (Test: *"implements New Ball as an optional captain decision after 80 overs"*).
- **Discrepancy:** None. Conforms with ICC Test Clause 4.3.

---

### 1.3 MCC Law 28.4: Limitation of On-Side Fielders
- **Official Clause:**
  - Law 28.4.1: At the instant of the bowler's delivery, there shall not be more than 2 fielders on the leg side behind the popping crease.
  - Law 28.4.2: At the instant of the bowler's delivery, there shall not be more than 5 fielders on the leg side in total.
- **Source Code:** `packages/cricket-rules/src/validators.ts` (Lines 155–185).
- **Implementation:**
  Function `validateFieldingRestrictions(fielders)` inspects each fielder's coordinates and returns `isValid: false` with specific violation descriptions if either condition is breached.
- **Test:** `packages/cricket-rules/tests/rules.test.ts` (Test: *"should enforce MCC Law 28.4 fielding restrictions"*).
- **Discrepancy:** None. Algorithmic validator is compliant.

---

### 1.4 ICC Clause 28.7 & 28.4: Powerplay Fielding Restrictions vs. General MCC Restrictions
- **Official Clause:**
  - T20I: Powerplay (Overs 1–6): Maximum 2 fielders outside the 30-yard fielding circle. Non-powerplay: Maximum 5 outside.
  - ODI: 3-tier system: P1 (Overs 1–10, max 2 outside), P2 (Overs 11–40, max 4 outside), P3 (Overs 41–50, max 5 outside).
  - Test: Unrestricted fielding circle (9 fielders outside circle permitted), but MCC 28.4 leg-side limits still apply.
- **Source Code:** `packages/simulation-engine/src/rulesets/t20-ruleset.ts` (Lines 80–110, 175–185).
- **Implementation:**
  Each format ruleset overrides `maxFieldersOutsideCircle(currentOver)`. Separate from `validateFieldingRestrictions` (which governs on-side limits).
- **Test:** `packages/simulation-engine/tests/phase-8-1-engine-audit.test.ts` (Lines 120–145).
- **Discrepancy:** None. Powerplays and general restrictions are decoupled and properly enforced.

---

### 1.5 ICC Clause 21.19 / MCC Law 21: No-Ball, Free-Hit & Dismissal Interactions
- **Official Clause:**
  - ICC T20I/ODI Clause 21.19: The delivery following a No-Ball shall be a Free Hit.
  - ICC Test Clause 21.19: Free Hit is NOT in effect in Test matches.
  - MCC Law 21.18: On a No-Ball, a batter cannot be out Bowled, Caught, LBW, Stumped, or Hit Wicket; only Run Out is permissible.
- **Source Code:** `packages/simulation-engine/src/transition/delivery-transition.ts` (Lines 430–445) & `packages/simulation-engine/src/pipeline/dismissal-engine.ts` (Lines 125–150).
- **Remediation in Phase 8.2:**
  Ensured `ruleset.freeHitAfterNoBall` is evaluated before setting `nextIsFreeHit = true`, preventing Test matches from awarding Free Hits on No-Balls.
- **Test:** `packages/simulation-engine/tests/dismissal.test.ts` & `packages/simulation-engine/tests/transition.test.ts`.
- **Discrepancy:** Remediated in 8.2.

---

### 1.6 MCC Law 19.8: Overthrow Boundaries
- **Official Clause:** Law 19.8: If a boundary results from an overthrow, the runs scored shall be any runs completed by the batters, together with the run in progress if they have crossed, plus the boundary allowance (4 runs).
- **Source Code:** `packages/cricket-rules/src/validators.ts` (Lines 187–198).
- **Implementation:** `calculateOverthrowRuns(completedRuns, boundaryCrossed)` returns $R_{\text{completed}} + 4$ if `boundaryCrossed === true`.
- **Test:** `packages/cricket-rules/tests/rules.test.ts` (Lines 150–156).
- **Discrepancy:** None.

---

### 1.7 ICC Clause 41.9: Stop Clock Regulation
- **Official Clause:** In limited-overs international matches, a 60-second stop clock runs between overs. On the 3rd violation, a 5-run penalty is awarded to the batting side.
- **Source Code:** `packages/simulation-engine/src/rulesets/t20-ruleset.ts` (Lines 85–95) & `packages/simulation-engine/src/transition/delivery-transition.ts` (Lines 509–513).
- **Implementation:**
  `isStopClockEnforced()` returns `true` for T10, T20, and ODI; returns `false` for Test matches. State tracks `stopClockSeconds: 60`.
- **Test:** `packages/simulation-engine/tests/phase-8-1-engine-audit.test.ts` (Lines 147–155).
- **Discrepancy:** None.

---

### 1.8 T10 Ruleset Provenance & Competition Specification
- **Specification:** The T10 ruleset reflects the established standard codified by Emirates Cricket Board / Abu Dhabi T10 League and adopted by the European Cricket Championship (ECC):
  - 10 overs per side.
  - Maximum 2 overs per bowler.
  - 3-over mandatory powerplay (maximum 2 fielders outside 30-yard ring).
  - Stop clock between overs (60 seconds).
- **Source Code:** `packages/simulation-engine/src/rulesets/t20-ruleset.ts` (Lines 163–170).
- **Discrepancy:** None. Provenance clearly established.
