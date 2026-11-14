# Cricket Dream XI: Engineering Bug Register & Remediation Log

**Status:** Complete  
**Verification:** Automated unit tests, TypeScript compiler (`tsc --noEmit`), and production build (`next build`).

---

## 1. Summary of Resolved Defects

| Defect ID | Priority | Subsystem | Issue Summary | Root Cause | Fix Applied | Verification |
|---|---|---|---|---|---|---|
| **BUG-01** | P0 | Engine / Transition | Batsmen bowling all overs in Test format | `delivery-transition.ts:457` picked `eligibleBowlers[0]` without priority or role sorting | Added comprehensive sorting by `bowlingPriority`, specialist role rank (Pacers/Spinners > All-Rounders > Batters), and bowling rating | `phase-9-11-bowling-management-and-overhaul.spec.ts` (Passed) |
| **BUG-02** | P1 | Engine / AI Captain | Fallback candidates in AI Captain unordered | `ai-captain.ts:54` sorted only by `bowlingPriority` without role or rating fallback | Added role-ranking and format rating comparator for identical priorities | `ai.test.ts` & engine suite (18/18 passed) |
| **BUG-03** | P1 | Web UI / Scoreboard | Projected score showing `16698` in Test matches | `Math.round(runRate * formatMaxOvers)` multiplied by 9999 | Format check (`isTestFormat ? '—' : ...`) renders dash in Test matches | `phase-9-11-bowling-management-and-overhaul.spec.ts` (Passed) |
| **BUG-04** | P1 | Web UI / Scoreboard | Scoreboard header showed `/ 9999 OV` in Test | `oversFormatted / formatMaxOvers OV` did not branch for Test formats | Formatted as `${oversFormatted} OV` for Test matches | Manual audit & screenshot verification |
| **BUG-05** | P1 | Web UI / Match Cockpit | Bowler speed & style hardcoded to `144 KM/H FAST SEAM` | Line 3661 rendered static string regardless of player profile | Dynamically inspects player bowling style and event delivery speed | `phase-9-11-bowling-management-and-overhaul.spec.ts` (Passed) |
| **BUG-06** | P1 | Web UI / Match Cockpit | Striker stance hardcoded to `RHB • ANCHOR / ACCEL` | Line 3577 rendered static string | Dynamically inspects `battingHand` (LHB / RHB) and `primaryRole` | Unit test verified |
| **BUG-07** | P1 | Web UI / Bowling Selector | Bowler nomination locked onto same bowler | `userNominatedBowlerId` was not reset when an over completed | Reset `setUserNominatedBowlerId('')` when `overFinished === true` | Unit test verified |
| **BUG-08** | P1 | Web UI / Bowling Selector | Flat, unhelpful bowler dropdown with raw `(4/999 ov)` | Uncategorized list with infinite quota rendered as 999 | Categorized optgroups with figures (`O-M-R-W`) + Quick Select Strike Bowler buttons | Production build & typecheck (Passed) |
| **BUG-09** | P2 | Navigation | Redundant duplicate navbar component | `Navbar.tsx` existed alongside `StitchHeader.tsx` | Standardized on `StitchHeader.tsx`, verified zero usages of `Navbar.tsx` | `tsc --noEmit` clean |
| **BUG-10** | P2 | Routing | Search param format hydration | Query param format was not reactively syncing | Added reactive URLSearchParams hydration on mount | Route tests passing |

---

## 2. Deep-Dive: Root Cause Analysis of Bowling Rotation Defect (BUG-01)

### Symptom:
In Test Pink Ball matches, Yashasvi Jaiswal and Virender Sehwag bowled every single over in tandem (over 10.1 overs: Sehwag 5.0 overs, Jaiswal 4.1 overs), while specialist strike bowlers Jasprit Bumrah, Jaydev Unadkat, Abhimanyu Mithun, and Ravindra Jadeja bowled 0 overs.

### Cause:
When an over completed in `packages/simulation-engine/src/transition/delivery-transition.ts:457`:
```typescript
// Previous buggy implementation:
if (nextBowlerId === bowlerId) {
  const eligibleBowlers = bowlingTeam.lineup.filter((slot) => {
    if (slot.playerId === bowlerId) return false;
    const bowlerScore = bowlersMap.get(slot.playerId);
    const oversBowled = bowlerScore ? Math.floor(bowlerScore.ballsBowled / 6) : 0;
    return oversBowled < ruleset.maxOversPerBowler;
  });

  if (eligibleBowlers.length > 0) {
    nextBowlerId = eligibleBowlers[0].playerId; // BUG: Always took index 0!
  }
}
```
Because `eligibleBowlers` was never sorted, candidate `0` was always Slot 0 (V. Sehwag) when Jaiswal bowled, and Slot 1 (Y. Jaiswal) when Sehwag bowled. They formed an infinite alternating loop.

### Fix:
Engine now sorts `eligibleBowlers` using a strict hierarchy:
1. `bowlingPriority` (1 to 5 ascending)
2. Non-wicketkeeper check
3. Specialist bowling role rank: `PACE_BOWLER` / `SPIN_BOWLER` (0) → `BOWLING_ALL_ROUNDER` (1) → `BATTING_ALL_ROUNDER` (2) → `BATTER` (3)
4. Format-specific bowling rating
5. Batting order tiebreak

