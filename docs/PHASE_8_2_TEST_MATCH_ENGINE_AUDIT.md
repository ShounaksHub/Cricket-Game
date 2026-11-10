# PHASE 8.2: TEST MATCH ENGINE ARCHITECTURAL AUDIT

**Audit Date:** 10 November 2026  
**Subject:** Test Cricket State Machine & Scheduling  
**Files Audited:**  
- `packages/simulation-engine/src/rulesets/t20-ruleset.ts`
- `packages/simulation-engine/src/transition/delivery-transition.ts`
- `packages/simulation-engine/src/runner/match-runner.ts`
- `packages/simulation-engine/src/ai/ai-captain.ts`

---

## 1. TIME-BASED VS. FIXED-OVER TEST MATCH SCHEDULING

A critical requirement of Phase 8.2 is ensuring that a nominal 450-over ceiling is not treated as a fixed unconditional stop, and that the engine accurately simulates the flow of scheduled playing time, intervals, and session transitions:

### 1.1 Structural Configuration (`TestScheduleConfig`)
Both `TEST_RED_BALL` and `TEST_PINK_BALL` implement the `TestScheduleConfig` interface:
```typescript
readonly testScheduleConfig: TestScheduleConfig = {
  scheduledDays: 5,
  scheduledDailyOvers: 90,
  sessionsPerDay: 3,
  sessions: [
    { sessionNumber: 1, scheduledDurationMinutes: 120, scheduledMinimumOvers: 30, intervalAfterSession: { intervalName: 'Lunch', durationMinutes: 40 } },
    { sessionNumber: 2, scheduledDurationMinutes: 120, scheduledMinimumOvers: 30, intervalAfterSession: { intervalName: 'Tea', durationMinutes: 20 } },
    { sessionNumber: 3, scheduledDurationMinutes: 120, scheduledMinimumOvers: 30 }
  ],
  followOnDeficit: 200,
  newBallOverThreshold: 80,
  allowDeclarations: true,
  allowEnforceFollowOn: true,
  finalDayLastHourMinOvers: 15,
  permittedAdditionalTimeMinutes: 30,
};
```

### 1.2 Session Transition Flow & Additional Time (ICC Clause 16.2.2)
In `delivery-transition.ts` (Lines 485–514):
1. **Overs & Time Tracking:** Every completed over increments `sessionOvers` by 1 and `sessionElapsedMinutes` by 4.0 (conforming to the 15 overs/hour standard).
2. **Permitted Additional Time:** If 9 wickets are down when `sessionOvers >= 30`, `isAdditionalTimeActive` is set to `true`, extending the session ceiling from 30 to 38 overs (up to 30 minutes of extra play) to allow the fielding side to achieve a result.
3. **Natural Stumps Transition:** When the session concludes without additional time, `sessionOvers` and `sessionElapsedMinutes` reset, `currentSession` increments ($1 \to 2 \to 3$), and after Session 3, `currentDay` advances ($1 \to 2 \to 3 \to 4 \to 5 \to 6$).
4. **Day 5 Stumps Draw:**
   When `currentDay > 5`, the engine evaluates the final state:
   ```typescript
   if (isTest && currentDay && currentDay > 5 && matchStatus !== 'COMPLETED') {
     matchStatus = 'COMPLETED';
     result = {
       isTie: false,
       isDraw: true,
       summary: 'Match drawn (Day 5 overs concluded)',
     };
   }
   ```
   **Verification:** The match terminates only when Day 5 expires with incomplete innings or unachieved target, NOT due to an artificial counter.

---

## 2. INNINGS SEQUENCING & DECLARATIONS

### 2.1 Multi-Innings State Transitions
- **Innings 1 $\to$ Innings 2:** Initiated when Team 1 is all out or declares (`action.declareInnings === true`). Team 2 commences batting with clean scorecards.
- **Innings 2 $\to$ Innings 3:**
  - Evaluates follow-on lead: $\Delta = R_1 - R_2$.
  - If $\Delta \ge 200$: Captain makes decision (`action.enforceFollowOn`).
    - Enforced: Team 2 bats Innings 3; Team 1 retains lead.
    - Declined: Team 1 bats Innings 3 to set a 4th-innings target.
- **Innings 3 $\to$ Innings 4:**
  - If follow-on was enforced:
    - If $R_2 + R_3 < R_1$: **Innings win** (`Team 1 won by an innings and X runs`).
    - If $R_2 + R_3 \ge R_1$: Target set for Team 1 in Innings 4 ($R_2 + R_3 - R_1 + 1$).
  - If standard sequence:
    - Target set for Team 2 in Innings 4 ($R_1 + R_3 - R_2 + 1$).
- **Innings 4 Completion:**
  - Chasing team overhauls target $\to$ Win by wickets.
  - Defending team bowls out chasing team $\to$ Win by runs.
  - Chasing team finishes all-out with exact tied scores $\to$ Tie.
  - Overs/Day 5 expires $\to$ Draw.

---

## 3. AUDIT CONCLUSION

The Test Match Engine demonstrates high architectural fidelity. It correctly sequences multi-innings matches, respects declarations, models optional follow-ons and new-ball claims, and governs Day 5 draws through scheduled session/day progression rather than a blunt ball limit.
