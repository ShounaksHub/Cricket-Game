import type { DeliveryOutcome } from '../contracts/types.js';
import { getFormatBaselineLogits } from './baseline-logits.js';
import { calculateMatchupLogitDeltas } from './matchup-matrix.js';
import type { OutcomeCalculationInput, OutcomeLogits } from './types.js';

/**
 * Calculates raw logit scores for all 11 discrete delivery outcomes
 * based on match context, tactics, environmental modifiers, and baseline player ratings.
 */
export function calculateOutcomeLogits(input: OutcomeCalculationInput): OutcomeLogits {
  const { context, batter, bowler, conditions, tactics } = input;

  // 1. Start with baseline log-odds for the given format
  const logits = getFormatBaselineLogits(context.format);

  // 2. Batter Tactical Intention Adjustments
  switch (tactics.batterIntent) {
    case 'DEFEND':
      logits.DOT += 1.4;
      logits.RUN_1 -= 0.8;
      logits.RUN_2 -= 1.2;
      logits.RUN_3 -= 1.5;
      logits.FOUR -= 2.2;
      logits.SIX -= 3.5;
      logits.WICKET -= 0.5;
      break;

    case 'ROTATE_STRIKE':
      logits.RUN_1 += 0.65;
      logits.RUN_2 += 0.35;
      logits.DOT -= 0.55;
      logits.FOUR -= 0.5;
      logits.SIX -= 1.2;
      logits.WICKET -= 0.1;
      break;

    case 'BALANCED':
      // Neutral baseline
      break;

    case 'AGGRESSIVE':
      logits.FOUR += 0.55;
      logits.SIX += 0.75;
      logits.WICKET += 0.4;
      logits.DOT -= 0.35;
      logits.RUN_1 -= 0.2;
      break;

    case 'MAXIMUM_POWER':
      logits.FOUR += 0.85;
      logits.SIX += 1.3;
      logits.WICKET += 0.8;
      logits.DOT -= 0.55;
      logits.RUN_1 -= 0.4;
      break;
  }

  // 3. Free-Hit Rule (ICC Playing Conditions: Cannot be out except run-out)
  if (context.isFreeHit) {
    logits.WICKET -= 6.0; // Virtually impossible to get standard wicket dismissal
    logits.FOUR += 0.6;
    logits.SIX += 0.9;
    logits.DOT -= 0.5;
  }

  // 4. Field Presets
  switch (tactics.fieldPreset) {
    case 'ATTACKING_CLOSE_CATCHERS':
      logits.WICKET += 0.3;
      logits.DOT += 0.2;
      logits.FOUR += 0.25;
      logits.RUN_1 += 0.15;
      break;

    case 'DEATH_BOUNDARY_DEFENSE':
      logits.FOUR -= 0.35;
      logits.SIX -= 0.25;
      logits.RUN_1 += 0.35;
      logits.RUN_2 += 0.15;
      break;

    case 'SPIN_CHOKE':
      logits.RUN_1 -= 0.3;
      logits.RUN_2 -= 0.4;
      logits.DOT += 0.35;
      logits.SIX += 0.15;
      break;

    case 'BALANCED_RING':
      // Neutral
      break;
  }

  // 5. Bowler Line & Length Tactics
  switch (tactics.bowlerLength) {
    case 'YORKER':
      logits.DOT += 0.45;
      logits.WICKET += 0.35;
      logits.FOUR -= 0.6;
      logits.SIX -= 0.9;
      logits.WIDE += 0.2;
      logits.NO_BALL += 0.1;
      break;

    case 'SHORT':
      logits.SIX += 0.45;
      logits.FOUR += 0.3;
      logits.WICKET += 0.35;
      logits.DOT += 0.3;
      logits.RUN_1 -= 0.3;
      break;

    case 'FULL':
      logits.FOUR += 0.35;
      logits.WICKET += 0.2;
      logits.RUN_1 += 0.15;
      logits.DOT -= 0.2;
      break;

    case 'GOOD_LENGTH':
      logits.DOT += 0.35;
      logits.WICKET += 0.2;
      logits.FOUR -= 0.2;
      logits.SIX -= 0.3;
      break;

    case 'BACK_OF_LENGTH':
      logits.DOT += 0.2;
      logits.RUN_1 += 0.15;
      logits.SIX -= 0.2;
      break;
  }

  switch (tactics.bowlerVariation) {
    case 'SLOWER_BALL':
      logits.DOT += 0.3;
      logits.WICKET += 0.35;
      logits.SIX -= 0.2;
      break;

    case 'BOUNCER':
      logits.WICKET += 0.3;
      logits.DOT += 0.4;
      logits.WIDE += 0.2;
      break;

    case 'GOOGLY':
    case 'ARM_BALL':
    case 'FLIPPER':
      logits.WICKET += 0.35;
      logits.DOT += 0.25;
      break;

    case 'CUTTER':
      logits.DOT += 0.25;
      logits.FOUR -= 0.2;
      break;

    case 'STOCK':
      break;
  }

  switch (tactics.bowlerLine) {
    case 'OUTSIDE_OFF':
      logits.DOT += 0.25;
      logits.WIDE += 0.15;
      break;

    case 'DOWN_LEG':
      logits.WIDE += 0.5;
      logits.FOUR += 0.3;
      logits.LEG_BYE += 0.4;
      break;

    case 'STUMPS':
      logits.WICKET += 0.2;
      logits.DOT -= 0.1;
      break;
  }

  // 6. Match Context Dynamics (Powerplay, Death Overs, Required Rate)
  if (context.isPowerplay) {
    logits.FOUR += 0.45;
    logits.SIX += 0.25;
    logits.DOT -= 0.2;
  }

  if (context.isDeathOvers) {
    logits.FOUR += 0.35;
    logits.SIX += 0.5;
    logits.WICKET += 0.4;
    logits.DOT -= 0.3;
  }

  if (context.requiredRunRate && context.requiredRunRate > 9.0) {
    const pressure = Math.min(2.0, (context.requiredRunRate - 9.0) * 0.1);
    logits.SIX += pressure;
    logits.FOUR += pressure * 0.7;
    logits.WICKET += pressure * 0.8;
    logits.DOT -= pressure * 0.6;
  }

  // 7. Pitch & Ball Wear
  if (context.ballWearIndex > 0) {
    logits.FOUR -= 0.2 * context.ballWearIndex;
    logits.DOT += 0.2 * context.ballWearIndex;
  }

  if (context.pitchWearIndex > 0) {
    logits.WICKET += 0.3 * context.pitchWearIndex;
    logits.DOT += 0.25 * context.pitchWearIndex;
    logits.FOUR -= 0.25 * context.pitchWearIndex;
  }

  // 8. Player Rating Differential (Baseline Macro Balance)
  const batRating =
    batter.formatRating?.battingRating ??
    batter.ratings?.[context.format]?.battingRating ??
    50.0;
  const bowlRating =
    bowler.formatRating?.bowlingRating ??
    bowler.ratings?.[context.format]?.bowlingRating ??
    50.0;

  const ratingDiff = (batRating - bowlRating) / 100.0; // in [-1.0, 1.0]

  logits.FOUR += ratingDiff * 0.8;
  logits.SIX += ratingDiff * 0.6;
  logits.RUN_1 += ratingDiff * 0.3;
  logits.WICKET -= ratingDiff * 0.65;
  logits.DOT -= ratingDiff * 0.55;

  // 9. Granular Batter vs Bowler Matchup Dynamics (Feature P4.5)
  const matchupDeltas = calculateMatchupLogitDeltas(batter, bowler, context, tactics);
  for (const [outcomeKey, delta] of Object.entries(matchupDeltas)) {
    if (delta !== undefined) {
      logits[outcomeKey as DeliveryOutcome] += delta;
    }
  }

  return logits;
}
