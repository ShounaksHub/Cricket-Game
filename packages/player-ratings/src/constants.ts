import type { MatchFormat } from '@cricket/shared-types';

/**
 * Current semver rating engine version.
 * Tracked on every calculated rating to guarantee deterministic replay.
 */
export const RATING_ENGINE_VERSION = 'rate-1.0.0';

/**
 * Empirical Bayes Shrinkage dampening constant K per format.
 * C = N / (N + K)
 * Calibrated so that full international careers (N >= 50 Test innings, N >= 85 ODI innings)
 * reach the MEASURED tier (C >= 0.85).
 */
export const SHRINKAGE_DAMPENING_K: Record<MatchFormat, number> = {
  TEST_RED_BALL: 8,
  TEST_PINK_BALL: 8,
  ODI: 15,
  T20: 18,
  T10: 18,
};

/**
 * Baseline cohort prior defaults when historical sample is small or unrecorded.
 */
export const COHORT_PRIOR_DEFAULTS = {
  BATTING_ATTRIBUTE: 50,
  BOWLING_ATTRIBUTE: 45,
  FIELDING_ATTRIBUTE: 52,
  TEMPERAMENT_ATTRIBUTE: 55,
  ADAPTABILITY_ATTRIBUTE: 50,
} as const;

/**
 * Confidence tier thresholds
 */
export const CONFIDENCE_THRESHOLDS = {
  MEASURED: 0.85,
  ESTIMATED: 0.50,
} as const;
