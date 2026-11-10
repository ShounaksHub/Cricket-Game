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
  readonly format?: MatchFormat;
  readonly currentSessionNumber?: number; // 1: Afternoon/Morning, 2: Twilight/Afternoon, 3: Night/Evening
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
    format,
    currentSessionNumber,
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
    addDelta('FOUR', 0.4 * dew);
    addDelta('SIX', 0.3 * dew);
    addDelta('DOT', -0.18 * dew);

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

  // 3. Pink Ball Aerodynamics & Lighting Model (Day/Night Test)
  if (format === 'TEST_PINK_BALL') {
    const session = currentSessionNumber ?? 1;
    if (session === 1) {
      // Session 1: Afternoon / Daylight
      // Extra polyurethane coating protects shine; enhanced early swing/seam
      if (isPace && ballWearIndex < 0.4) {
        addDelta('DOT', 0.15);
        addDelta('WICKET', 0.12);
        addDelta('FOUR', -0.1);
      }
    } else if (session === 2) {
      // Session 2: Twilight (Purkinje Effect & Rapid Thermal Cooling)
      // Natural daylight drops, floodlights take over, contrast dips, ball swings pronouncedly
      if (isPace) {
        addDelta('WICKET', 0.38);
        addDelta('DOT', 0.28);
        addDelta('FOUR', -0.25);
        addDelta('SIX', -0.2);
      } else if (isSpin) {
        addDelta('DOT', 0.15);
        addDelta('WICKET', 0.1);
      }
    } else if (session === 3) {
      // Session 3: Night under floodlights & Outfield Dew
      if (isSpin) {
        // Spinners struggle with wet pink ball & dew
        addDelta('WICKET', -0.45);
        addDelta('FOUR', 0.3);
        addDelta('RUN_1', 0.15);
      }
      if (isPace) {
        // Wet seam can cause errant deliveries, but harsh shadows cause misjudged leaves
        addDelta('WIDE', 0.25);
        if (ballWearIndex > 0.4) {
          addDelta('WICKET', 0.18);
          addDelta('DOT', 0.15);
        }
      }
    }
  }

  // 4. Pitch Dynamics
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
      addDelta('FOUR', 0.35);
      addDelta('SIX', 0.25);
      addDelta('DOT', -0.18);
      addDelta('WICKET', -0.25);
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
