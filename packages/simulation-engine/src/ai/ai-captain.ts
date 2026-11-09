import type {
  BatterIntent,
  BowlingLength,
  BowlingLine,
  BowlingVariation,
  FieldPreset,
  MatchState,
  TacticalDeliveryAction,
} from '../contracts/types.js';
import type { DeterministicPRNG } from '../prng/splitmix64.js';
import { isSpinBowling } from '../pipeline/matchup-matrix.js';
import { getRulesetForFormat } from '../rulesets/t20-ruleset.js';

/**
 * Intelligent tactical decision engine simulating captaincy & player situational awareness:
 * - Situational batting intent (Powerplay aggression, collapse consolidation, death acceleration, RRR pressure).
 * - Bowler line, length, and variation matching the game phase and batter profile.
 * - Dynamic fielding presets (Attacking close catchers, Spin choke, Death boundary defense).
 */
export function resolveAITacticalAction(
  state: MatchState,
  prng: DeterministicPRNG,
): TacticalDeliveryAction {
  const currentInnings = state.innings[state.currentInningsIndex];
  if (!currentInnings) {
    return {
      batterIntent: 'BALANCED',
      bowlerLine: 'OUTSIDE_OFF',
      bowlerLength: 'GOOD_LENGTH',
      bowlerVariation: 'STOCK',
      fieldPreset: 'BALANCED_RING',
    };
  }

  const ruleset = getRulesetForFormat(state.config.format);
  const over = currentInnings.completedOvers;
  const isPowerplay = ruleset.isPowerplayActive(over);
  const isDeath =
    state.config.format === 'T20' ? over >= 15 : over >= 40;
  const isMiddle = !isPowerplay && !isDeath;

  const lastEvent = currentInnings.events[currentInnings.events.length - 1];
  const isFreeHit =
    currentInnings.isFreeHit || (lastEvent ? lastEvent.outcome === 'NO_BALL' : false);

  const currentBowler = state.config.playerProfiles.get(
    currentInnings.currentBowlerPlayerId,
  );
  const isSpinner = currentBowler
    ? isSpinBowling(currentBowler.bowlingStyle)
    : false;

  // 1. Resolve Batter Intent
  let batterIntent: BatterIntent = 'BALANCED';

  if (isFreeHit) {
    // Batter swings with zero dismissal fear off Free Hit
    batterIntent = 'MAXIMUM_POWER';
  } else if (
    currentInnings.targetRuns &&
    currentInnings.completedOvers > 5
  ) {
    // Chasing in 2nd innings
    const ballsRemaining = Math.max(
      1,
      ruleset.maxOversPerInnings * 6 -
        (currentInnings.completedOvers * 6 + currentInnings.legalBallsInCurrentOver),
    );
    const runsNeeded = Math.max(
      0,
      currentInnings.targetRuns - currentInnings.totalRuns,
    );
    const rrr = (runsNeeded / ballsRemaining) * 6;

    if (rrr >= 11.5) {
      batterIntent = prng.nextFloat() < 0.7 ? 'MAXIMUM_POWER' : 'AGGRESSIVE';
    } else if (rrr >= 9.0) {
      batterIntent = prng.nextFloat() < 0.6 ? 'AGGRESSIVE' : 'ROTATE_STRIKE';
    } else {
      batterIntent = prng.nextFloat() < 0.6 ? 'ROTATE_STRIKE' : 'BALANCED';
    }
  } else if (currentInnings.totalWickets >= 3 && over < 7) {
    // Top order collapse: consolidate innings
    batterIntent = prng.nextFloat() < 0.45 ? 'DEFEND' : 'ROTATE_STRIKE';
  } else if (isDeath) {
    // Death overs slog phase
    if (currentInnings.totalWickets <= 6) {
      batterIntent = prng.nextFloat() < 0.6 ? 'MAXIMUM_POWER' : 'AGGRESSIVE';
    } else {
      batterIntent = prng.nextFloat() < 0.5 ? 'AGGRESSIVE' : 'BALANCED';
    }
  } else if (isPowerplay) {
    // Powerplay: take advantage of 2 fielders outside circle
    batterIntent = prng.nextFloat() < 0.6 ? 'AGGRESSIVE' : 'BALANCED';
  } else if (isMiddle) {
    // Middle overs: rotate strike and pick boundaries
    const roll = prng.nextFloat();
    if (roll < 0.5) {
      batterIntent = 'ROTATE_STRIKE';
    } else if (roll < 0.8) {
      batterIntent = 'BALANCED';
    } else {
      batterIntent = 'AGGRESSIVE';
    }
  }

  // 2. Resolve Bowler Tactics (Length, Line, Variation)
  let bowlerLength: BowlingLength = 'GOOD_LENGTH';
  let bowlerLine: BowlingLine = 'OUTSIDE_OFF';
  let bowlerVariation: BowlingVariation = 'STOCK';

  if (isDeath) {
    // Death overs execution: Yorkers and cutters/slower balls
    const lengthRoll = prng.nextFloat();
    if (lengthRoll < 0.55) {
      bowlerLength = 'YORKER';
    } else if (lengthRoll < 0.8) {
      bowlerLength = 'SHORT';
    } else {
      bowlerLength = 'GOOD_LENGTH';
    }

    bowlerLine = prng.nextFloat() < 0.6 ? 'OUTSIDE_OFF' : 'STUMPS';

    const varRoll = prng.nextFloat();
    if (varRoll < 0.45) {
      bowlerVariation = 'SLOWER_BALL';
    } else if (varRoll < 0.7) {
      bowlerVariation = 'CUTTER';
    } else {
      bowlerVariation = 'STOCK';
    }
  } else if (isPowerplay) {
    // Powerplay execution: Test corridor of uncertainty, occasional bouncer
    const lengthRoll = prng.nextFloat();
    if (lengthRoll < 0.65) {
      bowlerLength = 'GOOD_LENGTH';
    } else if (lengthRoll < 0.85) {
      bowlerLength = 'FULL';
    } else {
      bowlerLength = 'SHORT';
    }

    bowlerLine = prng.nextFloat() < 0.65 ? 'OUTSIDE_OFF' : 'STUMPS';

    const varRoll = prng.nextFloat();
    if (varRoll < 0.15) {
      bowlerVariation = 'BOUNCER';
    } else {
      bowlerVariation = 'STOCK';
    }
  } else if (isSpinner) {
    // Spinner in middle overs
    bowlerLength = prng.nextFloat() < 0.75 ? 'GOOD_LENGTH' : 'FULL';
    bowlerLine = prng.nextFloat() < 0.55 ? 'STUMPS' : 'OUTSIDE_OFF';
    bowlerVariation = prng.nextFloat() < 0.35 ? 'GOOGLY' : 'STOCK';
  } else {
    // Standard pace middle overs
    bowlerLength = prng.nextFloat() < 0.6 ? 'GOOD_LENGTH' : 'BACK_OF_LENGTH';
    bowlerLine = 'OUTSIDE_OFF';
    bowlerVariation = prng.nextFloat() < 0.25 ? 'SLOWER_BALL' : 'STOCK';
  }

  // 3. Resolve Field Preset
  let fieldPreset: FieldPreset = 'BALANCED_RING';

  const strikerScore = currentInnings.batters.get(
    currentInnings.strikerPlayerId,
  );
  const isNewBatter = strikerScore ? strikerScore.ballsFaced <= 3 : true;

  if (isNewBatter && !isDeath) {
    // Put pressure on new batter
    fieldPreset = 'ATTACKING_CLOSE_CATCHERS';
  } else if (isDeath) {
    // Protect boundary in death
    fieldPreset = 'DEATH_BOUNDARY_DEFENSE';
  } else if (isSpinner && isMiddle) {
    // Squeeze singles in middle overs
    fieldPreset = 'SPIN_CHOKE';
  } else {
    fieldPreset = 'BALANCED_RING';
  }

  return {
    batterIntent,
    bowlerLine,
    bowlerLength,
    bowlerVariation,
    fieldPreset,
  };
}
