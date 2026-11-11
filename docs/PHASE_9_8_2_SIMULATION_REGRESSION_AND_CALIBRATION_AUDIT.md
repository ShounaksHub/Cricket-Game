# Phase 9.8.2 Simulation Regression and Calibration Audit

## Scope

The simulation specialist ran the complete engine suite, reviewed the Phase 9.8.1 failures, and checked format phase behavior, calibration, determinism, and regression assumptions.

## Findings and repairs

- T20 baseline delivery logits produced a genuinely low calibration result: 5.13 runs per over and 54.1% dot balls in the initial audit.
- Death phase detection duplicated hardcoded boundaries and was incorrect for T10.
- ODI score and runner delivery-count tests asserted absolute seeded outputs instead of legal engine invariants.

The repair calibrated the baseline logits, routed phase decisions through the shared format phase definitions, added T10 phase coverage, and changed brittle assertions to check legal format behavior and event consistency.

## Verification

- Full engine suite: 18 files, 104 tests passed.
- Engine typecheck: passed.
- Engine build: passed.
- Calibration result after repair: 8.08 runs per over, 35.4% dots, 19.2% boundaries, no anomalies.
- Deterministic replay and all five format tests passed.

## Remaining issue

Calibration remains a deterministic statistical target, so future rating or pipeline changes should rerun the Monte Carlo check rather than weakening its bounds.
