import type { DeterministicPRNG } from '../prng/splitmix64.js';
import { calculateOutcomeLogits } from './outcome-logits.js';
import { computeSoftmax, sampleOutcomeFromProbabilities } from './softmax.js';
import type { OutcomeCalculationInput, OutcomeSamplingResult } from './types.js';

/**
 * Pure, deterministic delivery pipeline stage:
 * 1. Calculates outcome logits based on context, tactics, and ratings.
 * 2. Normalizes into a Softmax probability distribution.
 * 3. Samples discrete outcome using the deterministic PRNG float stream.
 */
export function executeDeliveryPipeline(
  input: OutcomeCalculationInput,
  prng: DeterministicPRNG,
  temperature = 1.0,
): OutcomeSamplingResult {
  const logits = calculateOutcomeLogits(input);
  const probabilities = computeSoftmax(logits, temperature);
  const randomRoll = prng.nextFloat();
  const outcome = sampleOutcomeFromProbabilities(probabilities, randomRoll);

  return {
    outcome,
    probabilities,
    logits,
    randomRoll,
  };
}
