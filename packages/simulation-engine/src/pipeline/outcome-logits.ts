import type { DeliveryOutcome } from '../contracts/types.js';
import { calculateEnvironmentalDeltas } from '../environment/environmental-engine.js';
import { calculateStadiumDeltas, getStadiumById } from '../ai/stadium-specs.js';
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
      logits.DOT += 0.8;
      logits.RUN_1 -= 0.4;
      logits.RUN_2 -= 0.6;
      logits.RUN_3 -= 0.8;
      logits.FOUR -= 1.0;
      logits.SIX -= 1.8;
      logits.WICKET -= 0.3;
      break;

    case 'ROTATE_STRIKE':
      logits.RUN_1 += 0.4;
      logits.RUN_2 += 0.2;
      logits.DOT -= 0.35;
      logits.FOUR -= 0.3;
      logits.SIX -= 0.6;
      logits.WICKET -= 0.1;
      break;

    case 'BALANCED':
      // Neutral baseline
      break;

    case 'AGGRESSIVE':
      logits.FOUR += 0.3;
      logits.SIX += 0.35;
      logits.WICKET += 0.25;
      logits.DOT -= 0.2;
      logits.RUN_1 -= 0.1;
      break;

    case 'MAXIMUM_POWER':
      logits.FOUR += 0.45;
      logits.SIX += 0.65;
      logits.WICKET += 0.45;
      logits.DOT -= 0.3;
      logits.RUN_1 -= 0.2;
      break;
  }

  // 3. Free-Hit Rule (MCC Law 21.18 & ICC Playing Conditions Clause 21.19)
  // Standard dismissals (Bowled, Caught, LBW, Stumped, Hit Wicket) are legally impossible
  if (context.isFreeHit) {
    logits.WICKET = -Infinity; // Hard legal rule constraint: strictly 0.0 probability for standard wicket
    logits.FOUR += 0.4;
    logits.SIX += 0.6;
    logits.DOT -= 0.3;
  }

  // 4. Field Presets & Custom Field Positions
  if (tactics.customFieldPositions && tactics.customFieldPositions.length > 0) {
    // Dynamic calculation from user's manual field arrangement
    const slipsOrClose = tactics.customFieldPositions.filter(
      (f) => f.isSlipsOrGully || f.distanceMeters <= 18,
    ).length;
    const boundaryFielders = tactics.customFieldPositions.filter(
      (f) => f.isBoundary || f.distanceMeters >= 55,
    ).length;
    const ringFielders = tactics.customFieldPositions.filter(
      (f) => f.distanceMeters > 18 && f.distanceMeters < 55,
    ).length;

    // Granular regional coverage: Off-side vs Leg-side, Deep vs Close
    const deepSquareLegOrMidWicket = tactics.customFieldPositions.filter(
      (f) => f.distanceMeters >= 50 && f.angleDegrees >= 240 && f.angleDegrees <= 330,
    ).length;
    const shortFineLegOrLegSlip = tactics.customFieldPositions.filter(
      (f) => f.distanceMeters < 25 && f.angleDegrees >= 180 && f.angleDegrees < 240,
    ).length;
    const deepCoverOrPoint = tactics.customFieldPositions.filter(
      (f) => f.distanceMeters >= 50 && f.angleDegrees >= 50 && f.angleDegrees <= 120,
    ).length;

    // Deep on-side sweepers suppress pull/hook and leg-side lofted boundaries
    if (deepSquareLegOrMidWicket >= 1) {
      logits.SIX -= 0.12 * deepSquareLegOrMidWicket;
      logits.FOUR -= 0.1 * deepSquareLegOrMidWicket;
    }

    // Short fine leg catches glances/edges down leg and stops singles, but doesn't stop boundaries
    if (shortFineLegOrLegSlip >= 1) {
      logits.WICKET += 0.08 * shortFineLegOrLegSlip;
      logits.RUN_1 -= 0.05 * shortFineLegOrLegSlip;
    }

    // Deep cover/point stops square drives and cuts
    if (deepCoverOrPoint >= 1) {
      logits.FOUR -= 0.12 * deepCoverOrPoint;
      logits.RUN_1 += 0.06 * deepCoverOrPoint;
    }

    // Slips & Close catchers increase edge dismissals and dots, but concede boundaries
    if (slipsOrClose >= 3) {
      logits.WICKET += 0.1 * slipsOrClose;
      logits.DOT += 0.05 * slipsOrClose;
      logits.FOUR += 0.08 * slipsOrClose;
    } else if (slipsOrClose >= 1) {
      logits.WICKET += 0.08;
    }

    // Boundary protection suppresses 4s & 6s, but concedes easy singles/twos
    if (boundaryFielders >= 4) {
      logits.FOUR -= 0.08 * boundaryFielders;
      logits.SIX -= 0.05 * boundaryFielders;
      logits.RUN_1 += 0.08 * boundaryFielders;
      logits.RUN_2 += 0.04 * boundaryFielders;
    }

    // Ring fielders choke singles
    if (ringFielders >= 6) {
      logits.RUN_1 -= 0.3;
      logits.RUN_2 -= 0.2;
      logits.DOT += 0.3;
    }
  } else {
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
      default:
        // Neutral
        break;
    }
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

  // 5.1 Bowler Pace Strategy & Intensity
  if (tactics.bowlingPaceStrategy) {
    switch (tactics.bowlingPaceStrategy) {
      case 'FULL_PACE':
        logits.DOT += 0.25;
        logits.WICKET += 0.25;
        logits.FOUR += 0.15; // Edge carrying to boundary
        break;
      case 'EFFORT_BALL':
        logits.WICKET += 0.35;
        logits.NO_BALL += 0.1;
        logits.FOUR += 0.2;
        break;
      case 'CONTROLLED':
        logits.DOT += 0.3;
        logits.WIDE -= 0.2;
        logits.NO_BALL -= 0.15;
        logits.FOUR -= 0.2;
        break;
      case 'VARIATION_FOCUS':
        logits.DOT += 0.2;
        logits.WICKET += 0.2;
        logits.RUN_1 -= 0.15;
        break;
      case 'CONSERVE':
        logits.RUN_1 += 0.25;
        logits.DOT -= 0.15;
        logits.WICKET -= 0.2;
        break;
    }
  }

  // 5.2 Bowling Tactical Intent
  if (tactics.bowlingIntent) {
    switch (tactics.bowlingIntent) {
      case 'ATTACKING':
      case 'WICKET_TAKING':
        logits.WICKET += 0.35;
        logits.FOUR += 0.25;
        logits.SIX += 0.15;
        logits.DOT += 0.15;
        break;
      case 'CONTAINMENT':
      case 'DEFENSIVE':
        logits.FOUR -= 0.35;
        logits.SIX -= 0.3;
        logits.RUN_1 += 0.2;
        logits.DOT += 0.2;
        logits.WICKET -= 0.25;
        break;
      case 'BALANCED':
        break;
    }
  }

  // 6. Match Context Dynamics (Powerplay, Death Overs, Required Rate)
  if (context.isPowerplay) {
    logits.FOUR += 0.25;
    logits.SIX += 0.15;
    logits.DOT -= 0.08;
  }

  if (context.isDeathOvers) {
    logits.FOUR += 0.2;
    logits.SIX += 0.3;
    logits.WICKET += 0.3;
    logits.DOT -= 0.08;
  }

  if (context.requiredRunRate && context.requiredRunRate > 9.0) {
    const pressure = Math.min(1.0, (context.requiredRunRate - 9.0) * 0.05);
    logits.SIX += pressure * 0.4;
    logits.FOUR += pressure * 0.3;
    logits.WICKET += pressure * 0.4;
    logits.DOT -= pressure * 0.25;
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

  // 10. Environmental, Atmospheric Swing & Dew Modifiers (Feature P4.8)
  const envDeltas = calculateEnvironmentalDeltas({
    pitchType: context.pitchType ?? 'HARD',
    conditions,
    pitchWearIndex: context.pitchWearIndex,
    ballWearIndex: context.ballWearIndex,
    bowlerStyle: bowler.bowlingStyle,
    isPowerplay: context.isPowerplay,
    format: context.format,
    currentSessionNumber: context.currentSessionNumber,
  });
  for (const [outcomeKey, delta] of Object.entries(envDeltas)) {
    if (delta !== undefined) {
      logits[outcomeKey as DeliveryOutcome] += delta;
    }
  }

  // 11. Stadium Boundary & Altitude Modifiers (Feature P4.9)
  if (context.stadiumId) {
    const stadium = getStadiumById(context.stadiumId);
    const stadiumDeltas = calculateStadiumDeltas(stadium);
    for (const [outcomeKey, delta] of Object.entries(stadiumDeltas)) {
      if (delta !== undefined) {
        logits[outcomeKey as DeliveryOutcome] += delta;
      }
    }
  }

  return logits;
}
