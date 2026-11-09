# P4.15 INDEPENDENT CRICKET RULES AND STATISTICAL CALIBRATION AUDIT

**Date:** 2026-11-10  
**Target Milestone:** P4.15  
**Auditor:** Principal Game Architect & Independent Cricket Simulation Systems Auditor  
**Engine Version Triad Audited:**
- Simulation Engine: `sim-1.0.0`
- Ruleset Engine: `rules-t20-icc-2026.1`
- Player Rating Engine: `rate-1.0.0`

**Commit Audited:** `c133b6c` (`docs: P4.14 Phase 4 formal verification report and sign-off`)

---

## 1. Executive Summary & Audit Mandate

This document presents the independent formal audit of the cricket match simulation engine (`packages/simulation-engine`), rule enforcement layer (`packages/cricket-rules`), and supporting service infrastructure (`apps/api`). The audit was conducted across five foundational dimensions:

1. **Deterministic Reproducibility & Cryptographic Integrity**
2. **Cricket-Rule Correctness (MCC Laws of Cricket & ICC Men's T20I Playing Conditions 2024–2026)**
3. **Statistical Calibration & Skill-Tier Differentiation**
4. **Match-State & Scorecard Integrity**
5. **Server-Side Authority & Security**

### Audit Verdict
**CONDITIONAL PASS / DEFECTS REQUIRING REMEDIATION BEFORE PHASE 5 VISUALIZER AUTHORIZATION.**

While the core SplitMix64 PRNG, baseline probability distributions, and basic match loop are architecturally sound, **8 specific defects** (2 Critical, 4 High, 2 Medium) were uncovered during code inspection and scenario testing. Under the strict **Build → Test → Fix → Verify → Commit** protocol, these defects must be fully resolved with regression tests before Phase 5 visualizer development commences.

---

## 2. Comprehensive Defect Register & Audit Findings

### Finding 1 [CRITICAL]: Free-Hit Status Prematurely Lost on Non-Legal Deliveries (Wides & No-Balls)
- **Primary Source Law:** ICC Men's T20I Playing Conditions (2024–2026), Clause 21.19:
  > *"If the delivery for the free hit is not a legitimate delivery (any kind of No ball or a Wide ball) then the next delivery will become a free hit for whichever batter is facing it."*
- **Affected Code Locations:**
  - `packages/simulation-engine/src/ai/ai-captain.ts`: Line 43
  - `packages/simulation-engine/src/transition/delivery-transition.ts`: Line 88
- **Observed Implementation:**
  ```typescript
  // 2. Check previous delivery for Free Hit
  const lastEvent = currentInnings.events[currentInnings.events.length - 1];
  const isFreeHit = lastEvent ? lastEvent.outcome === 'NO_BALL' : false;
  ```
- **Failure Mode & Defect Analysis:**
  The engine evaluates `isFreeHit` purely by inspecting if the immediately preceding delivery event was `'NO_BALL'`.
  If a bowler delivers a No-Ball (granting a Free Hit), and then on the Free-Hit delivery bowls a Wide (`outcome === 'WIDE'`), the subsequent delivery inspects `lastEvent.outcome`. Because `lastEvent.outcome === 'WIDE'` (and not `'NO_BALL'`), `isFreeHit` incorrectly evaluates to `false`! The batter is prematurely stripped of their legal Free Hit entitlement.
- **Reproduction Scenario:**
  1. Ball 3.1 is a front-foot No-Ball (`isFreeHit` should be granted for Ball 3.2).
  2. Ball 3.2 is a Wide ball.
  3. Under ICC Clause 21.19, Ball 3.3 must remain a Free Hit. Under current engine logic, Ball 3.3 has `isFreeHit = false`.
- **Required Remediation:**
  1. Add persistent `isFreeHit: boolean` to `InningsState` in `packages/simulation-engine/src/contracts/types.ts`.
  2. In `delivery-transition.ts`:
     - When `isNoBall === true`, set `isFreeHit = true` for the subsequent delivery.
     - When `isFreeHit === true` and the delivery is illegal (`outcome === 'WIDE'` or `outcome === 'NO_BALL'`), keep `isFreeHit = true`.
     - When `isFreeHit === true` and a legal delivery is bowled (`isLegalDelivery === true`), reset `isFreeHit = false`.
     - Ensure `isFreeHit` never carries over across innings boundaries.

---

### Finding 2 [CRITICAL]: Softmax Logit Penalty (-6.0) Overriding Hard Legal Constraints on Dismissals
- **Primary Source Law:** MCC Law 21.18 & ICC T20 Playing Conditions Clause 21.19:
  > *"The striker is not out under any of the Laws except Law 37 (Obstructing the field), Law 38 (Run out)..."*
- **Affected Code Locations:**
  - `packages/simulation-engine/src/pipeline/outcome-logits.ts`: Line 61–66
  - `packages/simulation-engine/src/pipeline/dismissal-engine.ts`: Lines 220–243
- **Observed Implementation:**
  ```typescript
  // In outcome-logits.ts:
  if (context.isFreeHit) {
    logits.WICKET -= 6.0; // Virtually impossible to get standard wicket dismissal
    logits.FOUR += 0.4;
    logits.SIX += 0.6;
    logits.DOT -= 0.3;
  }
  ```
  ```typescript
  // In dismissal-engine.ts:
  if (outcome === 'WICKET') {
    if (isFreeHit) {
      // Off free hit, only RUN_OUT can dismiss a batter
      const isStrikerOut = prng.nextFloat() < 0.7;
      ...
      return {
        outcome: 'WICKET',
        runsBat: 0,
        extras: ZERO_EXTRAS,
        isLegalDelivery: true,
        dismissal: { mode: 'RUN_OUT', ... }
      };
    }
  ```
- **Failure Mode & Defect Analysis:**
  Subtracting `6.0` from `logits.WICKET` in softmax leaves a residual probability:
  $$\frac{e^{\text{logit}-6}}{\sum e^{\text{logit}_i}} \approx 0.009\% \text{ to } 0.05\%$$
  When this rare branch is sampled by the PRNG, `dismissal-engine.ts` intercepts it and artificially fabricates a `RUN_OUT` with 0 runs scored. This is legally and statistically invalid:
  - If a batter is caught on the boundary off a Free Hit, under cricket rules they are **NOT OUT**, the ball remains in play, and any runs completed count.
  - Fabricating a 0-run `RUN_OUT` when a batter miscues a free hit distorts the run-out frequency and unfairly penalizes the batting side.
- **Required Remediation:**
  1. Enforce hard rule constraints before or during outcome sampling. Under Free Hit conditions, standard wicket outcomes (Bowled, Caught, LBW, Stumped, Hit Wicket) must have probability identically zero ($\mathbf{P} \equiv 0.0$).
  2. In `outcome-logits.ts` / `delivery-pipeline.ts`: explicitly mask or redistribute standard wicket probabilities into scoring shots or dots, preserving authentic run-out probabilities only on attempted runs.

---

### Finding 3 [HIGH]: Non-Canonical Dismissal Taxonomy (`CAUGHT_BEHIND` vs MCC Law 32 `CAUGHT`)
- **Primary Source Law:** MCC Laws of Cricket (2017 Code 3rd Edition - 2022), Law 32 (Caught):
  > *"The striker is out Caught if a ball delivered by the bowler, not being a No ball, touches his/her bat without having previously been in contact with any fielder, and is subsequently held by a fielder as a fair catch..."*
- **Affected Code Locations:**
  - `packages/simulation-engine/src/contracts/types.ts`: Line 30–38 (`DismissalMode`)
  - `database/prisma/schema.prisma`: `enum DismissalType`
- **Observed Implementation:**
  In `packages/simulation-engine/src/contracts/types.ts`:
  ```typescript
  export type DismissalMode =
    | 'BOWLED'
    | 'CAUGHT'
    | 'CAUGHT_BEHIND'
    | 'LBW'
    | 'RUN_OUT'
    | 'STUMPED'
    | 'HIT_WICKET';
  ```
- **Failure Mode & Defect Analysis:**
  "Caught Behind" is not an independent MCC dismissal mode; it is a colloquial/broadcast designation for Law 32 (Caught) where the fielder is the designated wicketkeeper.
  In `database/prisma/schema.prisma`, `DismissalType` does not include `CAUGHT_BEHIND`. This creates an architectural impedance mismatch between the simulation engine events and the persistence schema.
- **Required Remediation:**
  1. Add `fielderRole?: 'WICKETKEEPER' | 'SLIP' | 'GULLY' | 'OUTFIELDER' | 'BOWLER'` to `DeliveryDismissal`.
  2. In `dismissal-engine.ts`, record caught behinds as `mode: 'CAUGHT'` with `fielderRole: 'WICKETKEEPER'`.
  3. Maintain backward-compatible parsing for existing fixtures that specify `CAUGHT_BEHIND`.

---

### Finding 4 [HIGH]: Missing `HIT_WICKET` Dismissal on Wide Deliveries
- **Primary Source Law:** MCC Laws of Cricket (2017 Code 3rd Edition - 2022), Law 22.17.1:
  > *"The striker is out under any of the Laws 35 (Hit wicket)... 37 (Obstructing the field)... 38 (Run out) or 39 (Stumped) if the ball was called a Wide..."*
- **Affected Code Locations:**
  - `packages/simulation-engine/src/pipeline/dismissal-engine.ts`: Lines 82–104
- **Observed Implementation:**
  ```typescript
  if (isWicket) {
    // MCC Law 22.17: On wide, only Stumped or Run Out possible
    const keeperId = getWicketkeeperId(bowlingTeamLineup);
    const isSpin = isSpinBowling(bowlerStyle);
    const roll = prng.nextFloat();

    if (isSpin && roll < 0.85) {
      dismissal = { mode: 'STUMPED', ... };
    } else {
      dismissal = { mode: 'RUN_OUT', ... };
    }
  }
  ```
- **Failure Mode & Defect Analysis:**
  The code comment explicitly states "On wide, only Stumped or Run Out possible", omitting Law 35 (`HIT_WICKET`). If a batter dislodges their bails with bat or person while attempting to play or evade a wide ball, they are legally out `HIT_WICKET` under Law 22.17.1.
- **Required Remediation:**
  Incorporate `HIT_WICKET` into the dismissal resolution for wide balls when `isWicket` is triggered (~2–5% of wide-ball dismissals).

---

### Finding 5 [HIGH]: Custom SHA-256 Non-ASCII / UTF-8 Character Failure
- **Primary Standard:** FIPS 180-4 Secure Hash Standard (SHA-256)
- **Affected Code Locations:**
  - `packages/simulation-engine/src/prng/state-hash.ts`: Lines 52–56
- **Observed Implementation:**
  ```typescript
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ''; // ASCII check
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  ```
- **Failure Mode & Defect Analysis:**
  If any cricketer name, stadium name, or commentary string contains non-ASCII characters (e.g. South Asian diacritics, accented letters like 'Müller', or typographical quotation marks/em-dashes), `j >> 8` evaluates to non-zero, causing `sha256` to abort and return an empty string `""`!
  This silently destroys match state verification and replay hashing whenever international player names or characters are ingested.
- **Required Remediation:**
  Implement universal UTF-8 byte serialization prior to word packing in `state-hash.ts` (using `TextEncoder` in modern browser/Node runtimes with fallback), and verify against NIST known-answer test vectors.

---

### Finding 6 [MEDIUM]: Unpopulated `partnerships` in Reconciled Scorecards
- **Primary Domain Standard:** Standard Cricket Scorecard Protocol
- **Affected Code Locations:**
  - `packages/simulation-engine/src/runner/scorecard-reconciler.ts`: Line 142
- **Observed Implementation:**
  ```typescript
  reconciledInnings.push({
    ...
    fallOfWickets: inn.fallOfWickets,
    partnerships: [], // Reconciled from fall of wickets
  });
  ```
- **Failure Mode & Defect Analysis:**
  `PartnershipEntry` is defined in the contracts, but `reconcileMatchScorecard` leaves the `partnerships` array empty. As a result, the frontend UI and match summaries cannot render batting partnership graphs, highest partnerships, or partnership milestone notifications.
- **Required Remediation:**
  Implement deterministic partnership reconstruction:
  Iterate through the sequential delivery events, partitioning by fall of wickets. Record `wicketNumber`, `batter1Id`, `batter1Runs`, `batter2Id`, `batter2Runs`, `totalRuns`, and `balls` for every completed and unbroken partnership.

---

### Finding 7 [HIGH]: Statistical Calibration Sample Size & Skill Differentiation
- **Primary Domain Standard:** Statistical convergence of cricket outcomes (MCC/ICC T20 empirical baselines)
- **Affected Code Locations:**
  - `packages/simulation-engine/src/calibration/monte-carlo.ts`
- **Observed Implementation:**
  Previous Phase 4 tests evaluated 15 matches (~3,650 deliveries). While sufficient for smoke testing, 15 matches lacks statistical power to detect:
  1. Skill-tier differentiation (e.g., Jasprit Bumrah rating 96 vs part-timer rating 55).
  2. Batter rating sensitivity (Kohli rating 94 vs bowler rating 32).
  3. Tail-risk anomalies (e.g. 0-ball collapses or 300+ run anomalies in standard T20).
- **Required Remediation:**
  Expand the Monte Carlo test harness to run 1,000 to 10,000 simulated innings across diversified pitch types, boundary configurations, and player skill tiers (Tier 1 Gold vs Tier 4 Bronze). Compute 95% confidence intervals for:
  - Run rate (ICC Men's T20I expected: $8.1 \pm 0.8$ RPO)
  - Dot ball percentage ($34\% - 44\%$)
  - Boundary percentage ($14\% - 21\%$)
  - Dismissal distribution (Caught $58-65\%$, Bowled $15-20\%$, LBW $9-14\%$, Run Out $4-7\%$, Stumped $2-4\%$)
  Publish results to `docs/MATCH_ENGINE_CALIBRATION_REPORT.md`.

---

### Finding 8 [HIGH]: Server-Side Authority & PRNG State Handling in REST/SSE APIs
- **Primary Security Standard:** Server-authoritative game architecture
- **Affected Code Locations:**
  - `apps/api/src/modules/matches/matches.service.ts`: Lines 359–370 (`stepDelivery`)
- **Observed Implementation:**
  ```typescript
  async stepDelivery(dto: StepDeliveryDto): Promise<any> {
    let state = hydrateMatchState(dto.currentState);
    ...
    const prng = new DeterministicPRNG(BigInt(Date.now()));
  ```
- **Failure Mode & Defect Analysis:**
  1. `dto.currentState` is provided by the client and accepted without verifying whether it matches a known server match state hash or cryptographic progression chain. A malicious client could manipulate wickets, runs, or overs.
  2. `const prng = new DeterministicPRNG(BigInt(Date.now()))` uses non-deterministic system time to step deliveries, destroying replay determinism for interactive matches.
- **Required Remediation:**
  1. Verify the client's current state hash against the server's registered match chain or reject state manipulation.
  2. Derive the step PRNG seed deterministically from `(match.seed, inningsIndex, eventSequence)`.

---

## 3. Audit Verification Matrix Across the 5 Dimensions

| Dimension | Scope / Requirement | Current Status | Remediation Required |
|---|---|---|---|
| **1. Determinism** | SplitMix64 PRNG, hierarchical seeds, SHA-256 state hashing | **Partial** | Fix SHA-256 UTF-8 handling; replace `Date.now()` in `stepDelivery` with deterministic seed derivation |
| **2. Cricket Rules** | MCC Laws & ICC T20 PCs (Free-Hit, Wide, Dismissals, Overflows) | **Defective** | Fix Free-Hit wide ball carryover, hard-mask illegal dismissals off free-hits, include `HIT_WICKET` on wides, canonicalize dismissal taxonomy |
| **3. Calibration** | 1,000+ innings, macro convergence, skill tier differentiation | **Partial** | Scale Monte Carlo to 1,000+ innings; verify skill sensitivity (Gold vs Bronze ratings); publish calibration report |
| **4. Integrity** | Scorecard reconciliation, cumulative consistency, partnerships | **Partial** | Implement deterministic partnership calculation from event stream |
| **5. Authority** | Server-authoritative APIs, anti-tampering state validation | **Partial** | Secure `POST /matches/step` with state hash validation and deterministic seed derivation |

---

## 4. Next Step Implementation Plan (P4.15 Execution)

In accordance with the **Build → Test → Fix → Verify → Commit** discipline:

1. **Phase 4.15.1: Rule Correctness & Dismissal Engine Hardening**
   - Implement persistent `isFreeHit` in `InningsState`.
   - Update `delivery-transition.ts` and `ai-captain.ts` for strict ICC Clause 21.19 compliance across wides/no-balls.
   - Enforce hard rule constraints eliminating illegal dismissal modes on Free Hits.
   - Update `dismissal-engine.ts` with `HIT_WICKET` on wides and canonicalize `CAUGHT` with `fielderRole`.
2. **Phase 4.15.2: Cryptographic Hash & Scorecard Fixes**
   - Implement universal UTF-8 byte encoding in `state-hash.ts` and add NIST test vectors.
   - Implement deterministic `calculatePartnerships` in `scorecard-reconciler.ts`.
3. **Phase 4.15.3: Server Authority & Deterministic Stepping**
   - Update `matches.service.ts` to derive delivery seeds deterministically and validate state transitions.
4. **Phase 4.15.4: Large-Scale Statistical Calibration Suite**
   - Run 1,000+ innings calibration across diverse conditions and skill tiers.
   - Generate `docs/MATCH_ENGINE_CALIBRATION_REPORT.md`.
5. **Phase 4.15.5: Formal Verification Report & Sign-off**
   - Run full monorepo test suite and typechecks.
   - Produce `docs/PHASE_4_15_VERIFICATION_REPORT.md` and commit.
