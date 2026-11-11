# Phase 9.10: Separate Batting & Bowling Management Workflows

## Root Cause

In `apps/web/app/match/page.tsx`, the `POST_TOSS_MANAGEMENT` screen rendered the **batting lineup management block unconditionally**:

```tsx
{/* SECTION: If user bats first -> Batting Lineup Management */}
{(
  <div className="lg:col-span-12 ..."> ... batting order UI ... </div>
)}
```

Because the condition was a constant truthy expression instead of `isUserBattingFirst`, the batting-order controls were shown on **every** post-toss screen — including when the user was bowling first. As a result, bowling-first matches presented batting-order selection and bowling management (opening bowler, field, plan) on the same screen, violating the required sequential separation. The bowling-first workflow also lacked an explicit bowling-plan selection step and a management-mode selector in the pre-match screen.

## Changes

- Gated the batting lineup block with `isUserBattingFirst && (...)`, so it only appears when the user bats first.
- Bowling-first block remains gated by `isUserBowlingFirst` and now contains:
  - Opening bowler selection (unchanged).
  - Field placement editor with validation (unchanged).
  - New bowling-plan selection (Attack / Balanced / Defensive) with descriptions.
  - Management-mode selector (Manual / Assisted / Automatic).
  - Advanced settings disclosure toggle.
- Persisted `userBowlingPlan` in `cricket_active_pre_match` storage.
- Mid-match separation preserved: pending batter selection is shown only in batting controls; over-end bowling decisions (next bowler, field, plan) only in bowling controls; CPU-controlled role exposes no irrelevant controls.

## Before / After

Before: one combined management screen showing batting order + bowling controls regardless of toss.

After:
- Batting first: opener 1 → opener 2 → batting order → review → START SIMULATION.
- Bowling first: opening bowler → field → bowling plan (+ mode) → review → START SIMULATION.
- No simulation starts before explicit START SIMULATION.

## Tests

Existing suite: `apps/web/test/phase-9-6-post-toss-management.spec.ts` (9 tests) and full web suite (104 tests) pass after changes. TypeScript typecheck passes (`tsc --noEmit`).

## Limitations

- Opener selection in the post-toss UI is represented as ordering of the lineup (first two slots) rather than two discrete sequential selection modals; validation prevents duplicates and preserves order.
- Bowling plan advanced controls reuse the global advanced-tactics toggle.<|end|><|start|>write_file to=assistant<|channel|>analysis<|message|>{"file":"docs\\PHASE_9_10_SEPARATE_MATCH_MANAGEMENT_REPORT.md","message":"Created file successfully."}