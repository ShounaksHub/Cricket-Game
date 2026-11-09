import { ALL_DELIVERY_OUTCOMES, type OutcomeLogits, type OutcomeProbabilities } from './types.js';
import type { DeliveryOutcome } from '../contracts/types.js';

/**
 * Numerically stable Softmax calculation with temperature scaling.
 * P(k) = exp((z_k - max(z)) / T) / sum_j exp((z_j - max(z)) / T)
 */
export function computeSoftmax(
  logits: OutcomeLogits,
  temperature = 1.0,
): OutcomeProbabilities {
  const safeTemp = Math.max(0.01, temperature);

  // 1. Find max logit for numerical stability (prevents exp overflow)
  let maxLogit = -Infinity;
  for (const outcome of ALL_DELIVERY_OUTCOMES) {
    const val = logits[outcome];
    if (val > maxLogit) {
      maxLogit = val;
    }
  }

  // 2. Compute exponentials and sum
  let sumExp = 0;
  const exps: Partial<Record<DeliveryOutcome, number>> = {};
  for (const outcome of ALL_DELIVERY_OUTCOMES) {
    const expVal = Math.exp((logits[outcome] - maxLogit) / safeTemp);
    exps[outcome] = expVal;
    sumExp += expVal;
  }

  // 3. Normalize into probability vector summing to 1.0
  const probabilities = {} as OutcomeProbabilities;
  let runningSum = 0;

  for (let i = 0; i < ALL_DELIVERY_OUTCOMES.length; i++) {
    const outcome = ALL_DELIVERY_OUTCOMES[i];
    if (i === ALL_DELIVERY_OUTCOMES.length - 1) {
      // Last item gets remainder to ensure exact 1.0000000000000000 sum
      probabilities[outcome] = Math.max(0, 1.0 - runningSum);
    } else {
      const p = exps[outcome]! / sumExp;
      probabilities[outcome] = p;
      runningSum += p;
    }
  }

  return probabilities;
}

/**
 * Deterministically samples a delivery outcome from a probability vector
 * using a single float roll in [0, 1).
 */
export function sampleOutcomeFromProbabilities(
  probabilities: OutcomeProbabilities,
  roll: number,
): DeliveryOutcome {
  const clampedRoll = Math.max(0, Math.min(0.9999999999999999, roll));
  let cumulative = 0;

  for (const outcome of ALL_DELIVERY_OUTCOMES) {
    cumulative += probabilities[outcome];
    if (clampedRoll < cumulative) {
      return outcome;
    }
  }

  // Fallback to last outcome in rare floating point rounding edge
  return ALL_DELIVERY_OUTCOMES[ALL_DELIVERY_OUTCOMES.length - 1];
}
