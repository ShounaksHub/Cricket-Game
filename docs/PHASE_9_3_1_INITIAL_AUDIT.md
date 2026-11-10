# PHASE 9.3.1: INITIAL AUDIT REPORT
**Milestone:** Phase 9.3.1: Independent Player Agency, Manual Field Management & Live Match Verification  
**Date:** November 2026  
**Baseline Commit:** `c97a3be` (docs: update brain.md to v2.1.0) / `bd54e44` (Phase 9.3 feat)  
**Author:** Antigravity AI Engine & Engineering Team

---

## 1. Executive Summary & Audit Scope

This initial audit independently investigates the implementation status of Phase 9.3 against the core mandate of Phase 9.3.1:
> **The user manages their own Dream XI. The CPU independently manages the opposing team.**

While Phase 9.3 successfully repaired the quadratic score aggregation defect (7191/10) by establishing `activeInnings.totalRuns` as the single authoritative source of truth, and separated user controls into asymmetric batting and bowling cockpits, this audit identifies critical gameplay gaps, incomplete features, and architectural discrepancies that must be remediated in Phase 9.3.1.

---

## 2. Control Flow Analysis

### 2.1 Current User vs CPU Decision Architecture

```
[User Input in Web UI]
        │
        ├─ isUserBatting? ──► userIntent ────────────────────────┐
        └─ isUserBowling? ──► userPace, userIntent, userLength, ─┤
                              userLine, userVariation, userField,│
                              userNominatedBowlerId              │
                                                                 ▼
[resolveAITacticalAction] ──────────────────────────► TacticalDeliveryAction
        │ (Computes CPU decision for whichever                     │
        │  discipline the user DOES NOT control)                   ▼
                                                          [stepDelivery]
                                                                 │
                                                                 ▼
                                                          [DeliveryEvent]
                                                                 │
                                                       ┌─────────┴─────────┐
                                                       ▼                   ▼
                                                Authoritative State   PixiJS Visualizer
```

### 2.2 Control Flow Verification Matrix

| Action / Decision | User Path | CPU Path | Authority & Implementation Status |
|---|---|---|---|
| **Batting Intent** | `userIntent` (DEFEND, ROTATE_STRIKE, AGGRESSIVE, MAXIMUM_POWER) | `aiAction.batterIntent` | **Verified**: Correctly passed into engine when user bats; CPU calculates autonomously when CPU bats. |
| **Bowling Pace Strategy** | `userPaceStrategy` (FULL_PACE, CONTROLLED, EFFORT_BALL, VARIATION_FOCUS, CONSERVE) | `aiAction.bowlingPaceStrategy` | **Partial**: Modulates outcome logits, but lacks bowler fatigue modeling, speed attribute gating, and actual delivery speed reporting. |
| **Bowling Tactical Intent** | `userBowlingIntent` (ATTACKING, CONTAINMENT, WICKET_TAKING) | `aiAction.bowlingIntent` | **Verified**: Directly modulates logits in `outcome-logits.ts`. |
| **Line & Length** | `userLine`, `userLength` dropdowns | `aiAction.bowlerLine/Length` | **Verified**: Passed to `outcome-logits.ts` and `matchup-matrix.ts`. |
| **Bowling Variation** | `userVariation` dropdown | `aiAction.bowlerVariation` | **Defect**: UI allows selecting GOOGLY or BOUNCER regardless of whether the bowler is a fast bowler or spinner. |
| **Field Placement** | `userField` preset dropdown | `aiAction.fieldPreset` | **Major Gap**: Only 4 high-level presets exist (`ATTACKING_CLOSE_CATCHERS`, `BALANCED_RING`, `DEATH_BOUNDARY_DEFENSE`, `SPIN_CHOKE`). **There is zero manual positioning of the 9 fielders on the field.** |
| **Bowler Selection** | `userNominatedBowlerId` select | `delivery-transition.ts` cycle | **Verified**: MCC Law 21.7 enforced; respects user nomination across over transitions. |
| **Captaincy Decisions** | None exposed in UI | Hardcoded in `ai-captain.ts` | **Defect**: User cannot declare, take new ball, or enforce follow-on in Test matches from the UI. |

---

## 3. Detailed Audit Findings & Defect Register

### Issue 1: Lack of Interactive Manual Field Management (Severity: P1)
- **Current State:** The user can only choose one of 4 presets from a `<select>` dropdown (`BALANCED_RING`, `ATTACKING_CLOSE_CATCHERS`, `DEATH_BOUNDARY_DEFENSE`, `SPIN_CHOKE`).
- **Defect:** Fielders are completely static inside PixiJS `PlayerManager`. Fielder positions cannot be selected, dragged, or individually moved. Selecting a preset does not even update the visualizer live (only on page reload/re-init).
- **Engine Gap:** `TacticalDeliveryAction` only carries `fieldPreset: FieldPreset`. There is no data structure for custom fielder coordinates or role assignments (`customFieldPositions`).
- **Remediation Plan:**
  1. Add `CustomFielderCoordinate` to `packages/simulation-engine/src/contracts/types.ts` and `packages/shared-types/src/events.ts`.
  2. Add `customFieldPositions?: readonly CustomFielderCoordinate[]` to `TacticalDeliveryAction`.
  3. Update `outcome-logits.ts` and `dismissal-engine.ts` to compute field coverage (slips count, boundary protection count, leg-side fielder count) from custom coordinates if provided.
  4. Implement an interactive field manager in the UI allowing the user to click/tap a fielder and reposition them, with automatic validation of MCC Law 28.4 (max 5 leg-side fielders, max 2 behind square leg).

### Issue 2: Bowling Variations Not Gated by Bowler Capabilities (Severity: P1)
- **Current State:** A fast bowler (e.g. Jasprit Bumrah) can be instructed to bowl a `GOOGLY`, and a spinner (e.g. Shane Warne) can be instructed to bowl a `BOUNCER`.
- **Defect:** Bowler capability checks are absent in the bowling cockpit.
- **Remediation Plan:** Add bowler capability inspection (`isSpinBowling`, `isPaceBowling`) to dynamically filter eligible variations in the bowling cockpit (Fast/Pace: Stock, Slower Ball, Bouncer, Cutter; Spin: Stock, Googly/Arm Ball, Flipper, Flight/Drift).

### Issue 3: Missing Test Match Captaincy Controls in UI (Severity: P2)
- **Current State:** The simulation engine supports `takeNewBall`, `declareInnings`, and `enforceFollowOn` in `TacticalDeliveryAction`, but `apps/web/app/match/page.tsx` never exposes buttons or triggers for them when user is captaining.
- **Remediation Plan:** Expose captaincy actions in the command header when the match format is Test and conditions are met (e.g., overs >= 80, lead >= 200, lead >= 350 for declaration).

### Issue 4: Session Resume Misses User Tactical State & Custom Field (Severity: P2)
- **Current State:** `ActiveMatchSession` in `page.tsx` only saves standard match config and visible events. It does not serialize `userPaceStrategy`, `userBowlingIntent`, or custom field coordinates.
- **Remediation Plan:** Expand `ActiveMatchSession` to persist all tactical states and restore them upon match resume.

---

## 4. Control-Flow Architecture Map

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MATCH SCREEN (PAGE.TSX)                         │
├───────────────────────────────────┬────────────────────────────────────┤
│         USER BATTING INNINGS      │        USER BOWLING INNINGS        │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Batting Cockpit:                │ • Bowling Cockpit:                 │
│   - Batter Intent (4 modes)       │   - Bowler Selector (Quota checked)│
│   - Target Zone (Off/Leg/Straight)│   - Pace Strategy (5 levels)       │
│ • CPU Bowling Plan (Read-Only)    │   - Bowling Intent (3 strategies)  │
│                                   │   - Line, Length, Variation        │
│                                   │   - Interactive Field Editor       │
│                                   │ • CPU Batting Plan (Read-Only)     │
└───────────────────────────────────┴────────────────────────────────────┘
                                    │
                                    ▼
                     [Action Legality & Validation]
               (MCC Law 28.4 Leg-side limits, Quotas, Pace)
                                    │
                                    ▼
                    [TacticalDeliveryAction Payload]
                                    │
                                    ▼
                       [stepDelivery (Simulation)]
             - Matchup Matrix (Handedness, Line/Length, Pace)
             - Outcome Logits (Pace, Intent, Field Coverage)
             - Dismissal Engine (Fielder catch attribution)
             - Crease / Over Transition (MCC Law 21.7 Bowler change)
                                    │
                                    ▼
                             [DeliveryEvent]
                                    │
                     [Authoritative State & Visualizer]
```

---

## 5. Audit Conclusion

The architectural foundation from Phase 9.3 is sound, but **Stage E (Manual Field Placement)**, **bowler variation attribute gating**, **custom field engine consumption**, and **captaincy UI controls** are missing.

Execution will proceed sequentially through Stages B through L to implement true manual field management, calibrated bowling mechanics, and end-to-end browser verification.
