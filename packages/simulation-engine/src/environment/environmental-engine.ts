import type { BowlingStyle, MatchFormat } from '@cricket/shared-types';
import type {
  DeliveryOutcome,
  EnvironmentalConditions,
} from '../contracts/types.js';
import { isPaceBowling, isSpinBowling } from '../pipeline/matchup-matrix.js';

export interface EnvironmentalImpactInput {
  readonly pitchType: 'FLAT' | 'GREEN' | 'DUSTY' | 'HARD' | 'TURNING';
  readonly conditions: EnvironmentalConditions;
  readonly pitchWearIndex: number; // 0.0 to 1.0
  readonly ballWearIndex: number; // 0.0 to 1.0
  readonly bowlerStyle: BowlingStyle;
  readonly isPowerplay: boolean;
}

/**
 * Calculates logit adjustments resulting from environmental conditions:
 * - Dew factor (slick ball, diminished spin grip, batting skid, boundary boost).
 * - Atmospheric swing (high humidity + cloud cover enhances new ball swing).
 * - Pitch characteristics (Green seam, Turning/Dusty wear scaling, Flat road belters, Hard bounce).
 */
export function calculateEnvironmentalDeltas(
  input: EnvironmentalImpactInput,
): Partial<Record<DeliveryOutcome, number>> {
  const {
    pitchType,
    conditions,
    pitchWearIndex,
    ballWearIndex,
    bowlerStyle,
    isPowerplay,
  } = input;

  const deltas: Partial<Record<DeliveryOutcome, number>> = {};
  const addDelta = (outcome: DeliveryOutcome, value: number) => {
    deltas[outcome] = (deltas[outcome] ?? 0) + value;
  };

  const isPace = isPaceBowling(bowlerStyle);
  const isSpin = isSpinBowling(bowlerStyle);

  // 1. Dew Factor Mechanics (Night / 2nd Innings Under Lights)
  if (conditions.dewFactor > 0.05) {
    const dew = Math.min(1.0, conditions.dewFactor);

    // Ball skids onto the bat, outfield gets slippery: batting becomes easier
    addDelta('FOUR', 0.45 * dew);
    addDelta('SIX', 0.35 * dew);
    addDelta('DOT', -0.4 * dew);

    if (isSpin) {
      // Spinners cannot grip the wet ball: severe reduction in spin & deception
      addDelta('WICKET', -0.5 * dew);
      addDelta('RUN_1', 0.35 * dew);
      addDelta('FOUR', 0.2 * dew);
    }

    if (isPace) {
      // Fast bowlers struggle with wet seam: higher risk of errant deliveries
      addDelta('WIDE', 0.35 * dew);
      addDelta('NO_BALL', 0.2 * dew);
    }
  }

  // 2. Atmospheric Swing (Humidity > 60% + Cloud Cover > 50%)
  if (isPace && ballWearIndex < 0.45) {
    const isOvercast =
      conditions.cloudCoverPercentage >= 50 &&
      conditions.humidityPercentage >= 60;

    if (isOvercast) {
      const swingMultiplier =
        (conditions.cloudCoverPercentage / 100) *
        (conditions.humidityPercentage / 100);

      // Pronounced conventional swing in overcast conditions
      addDelta('WICKET', 0.4 * swingMultiplier);
      addDelta('DOT', 0.35 * swingMultiplier);
      addDelta('FOUR', -0.3 * swingMultiplier);
    }
  }

  // 3. Pitch Dynamics
  switch (pitchType) {
    case 'GREEN':
      if (isPace && ballWearIndex < 0.6) {
        // Lateral seam movement off the grassy surface
        addDelta('WICKET', 0.45 * (1.0 - ballWearIndex));
        addDelta('DOT', 0.4 * (1.0 - ballWearIndex));
        addDelta('FOUR', -0.35 * (1.0 - ballWearIndex));
      }
      break;

    case 'TURNING':
    case 'DUSTY':
      if (isSpin) {
        // Spin threat compounds significantly with pitch wear and surface abrasion
        const wearMultiplier = Math.max(0.2, pitchWearIndex);
        addDelta('WICKET', 0.6 * wearMultiplier);
        addDelta('DOT', 0.5 * wearMultiplier);
        addDelta('FOUR', -0.45 * wearMultiplier);
        addDelta('SIX', -0.4 * wearMultiplier);
      } else {
        // Low and slow for pacers
        addDelta('RUN_1', 0.2);
        addDelta('FOUR', -0.2);
      }
      break;

    case 'FLAT':
      // True batting paradise / highway
      addDelta('FOUR', 0.4);
      addDelta('SIX', 0.3);
      addDelta('DOT', -0.35);
      addDelta('WICKET', -0.3);
      break;

    case 'HARD':
      // Steep bounce and good carry
      addDelta('FOUR', 0.25);
      addDelta('SIX', 0.2);
      if (isPace) {
        addDelta('WICKET', 0.2);
        addDelta('DOT', 0.15);
      }
      break;
  }

  return deltas;
}

/**
 * Calculates incremental wear applied to the ball and pitch after a delivery.
 */
export function calculateWearIncrement(
  format: MatchFormat,
  isLegalDelivery: boolean,
): { pitchWearDelta: number; ballWearDelta: number } {
  if (!isLegalDelivery) {
    return { pitchWearDelta: 0, ballWearDelta: 0 };
  }

  switch (format) {
    case 'T10':
      return { pitchWearDelta: 0.003, ballWearDelta: 0.015 };
    case 'T20':
      return { pitchWearDelta: 0.004, ballWearDelta: 0.008 };
    case 'ODI':
      return { pitchWearDelta: 0.002, ballWearDelta: 0.003 };
    case 'TEST_RED_BALL':
    case 'TEST_PINK_BALL':
      return { pitchWearDelta: 0.001, ballWearDelta: 0.002 };
  }
}
