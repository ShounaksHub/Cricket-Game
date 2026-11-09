import type { ConfidenceTier, MatchFormat } from '@cricket/shared-types';
import { CONFIDENCE_THRESHOLDS, SHRINKAGE_DAMPENING_K } from './constants.js';

export interface BayesianShrinkageResult {
  readonly confidenceScore: number; // 0.00 to 1.00
  readonly confidenceTier: ConfidenceTier;
  readonly shrinkageWeight: number; // weight applied to prior: (1 - C)
}

/**
 * Calculates Empirical Bayes confidence coefficient C and tier.
 * C = N / (N + K_format)
 */
export function calculateBayesianConfidence(
  format: MatchFormat,
  sampleSize: number // innings batted or bowled
): BayesianShrinkageResult {
  const k = SHRINKAGE_DAMPENING_K[format] ?? 35;
  const n = Math.max(0, sampleSize);
  const confidenceScore = Number((n / (n + k)).toFixed(3));

  let confidenceTier: ConfidenceTier = 'IMPUTED';
  if (confidenceScore >= CONFIDENCE_THRESHOLDS.MEASURED) {
    confidenceTier = 'MEASURED';
  } else if (confidenceScore >= CONFIDENCE_THRESHOLDS.ESTIMATED) {
    confidenceTier = 'ESTIMATED';
  } else {
    confidenceTier = 'IMPUTED';
  }

  return {
    confidenceScore,
    confidenceTier,
    shrinkageWeight: Number((1 - confidenceScore).toFixed(3)),
  };
}

/**
 * Applies Empirical Bayes Shrinkage to an observed attribute:
 * Attr_effective = round(C * Attr_observed + (1 - C) * Prior)
 */
export function applyBayesianShrinkage(
  observedValue: number,
  confidenceScore: number,
  cohortPrior: number
): number {
  const clampedC = Math.max(0, Math.min(1, confidenceScore));
  const effective = clampedC * observedValue + (1 - clampedC) * cohortPrior;
  return Math.round(Math.max(1, Math.min(99, effective)));
}
