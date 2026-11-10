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
  const format = state.config.format;
  const isTest = format === 'TEST_RED_BALL' || format === 'TEST_PINK_BALL';
  const isT10 = format === 'T10';
  const isODI = format === 'ODI';

  const isPowerplay = ruleset.isPowerplayActive(over);
  const isDeath = isT10 ? over >= 7 : isODI ? over >= 40 : over >= 15;
  const isMiddle = !isTest && !isPowerplay && !isDeath;

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
  } else if (isTest) {
    // Test Match Tactics: patience, crease occupation, partnership building & survival
    if (currentInnings.inningsNumber === 4 && currentInnings.targetRuns) {
      // 4th Innings Chasing
      const runsNeeded = Math.max(0, currentInnings.targetRuns - currentInnings.totalRuns);
      const isCollapse = currentInnings.totalWickets >= 6;
      const isDay5 = (state.currentDayNumber ?? 1) >= 5;

      if (isCollapse || (isDay5 && runsNeeded > 150)) {
        // Blockathon: Bat to save the Test match and secure a draw
        batterIntent = prng.nextFloat() < 0.75 ? 'DEFEND' : 'ROTATE_STRIKE';
      } else if (runsNeeded <= 100 && currentInnings.totalWickets <= 4) {
        // Target in sight: balance attack with rotation
        batterIntent = prng.nextFloat() < 0.5 ? 'BALANCED' : 'AGGRESSIVE';
      } else {
        batterIntent = prng.nextFloat() < 0.55 ? 'DEFEND' : 'ROTATE_STRIKE';
      }
    } else if (currentInnings.inningsNumber === 3 && currentInnings.leadOrDeficit > 300) {
      // Acceleration mode before declaration
      batterIntent = prng.nextFloat() < 0.6 ? 'AGGRESSIVE' : 'MAXIMUM_POWER';
    } else if (currentInnings.totalWickets >= 3 && over < 20) {
      // Rebuilding after top-order collapse
      batterIntent = prng.nextFloat() < 0.65 ? 'DEFEND' : 'ROTATE_STRIKE';
    } else {
      // Standard Test match rhythm: patient leave, defensive solidness, opportunistic scoring
      const roll = prng.nextFloat();
      if (roll < 0.45) {
        batterIntent = 'DEFEND';
      } else if (roll < 0.8) {
        batterIntent = 'ROTATE_STRIKE';
      } else {
        batterIntent = 'BALANCED';
      }
    }
  } else if (isT10) {
    // T10 Hyper-Power Tactics: constant aggressive slogging
    const roll = prng.nextFloat();
    if (roll < 0.45) {
      batterIntent = 'MAXIMUM_POWER';
    } else if (roll < 0.85) {
      batterIntent = 'AGGRESSIVE';
    } else {
      batterIntent = 'BALANCED';
    }
  } else if (
    currentInnings.targetRuns &&
    currentInnings.completedOvers > (isODI ? 15 : 5)
  ) {
    // Chasing in 2nd innings (T20 / ODI)
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

    if (rrr >= (isODI ? 8.5 : 11.5)) {
      batterIntent = prng.nextFloat() < 0.7 ? 'MAXIMUM_POWER' : 'AGGRESSIVE';
    } else if (rrr >= (isODI ? 6.5 : 9.0)) {
      batterIntent = prng.nextFloat() < 0.6 ? 'AGGRESSIVE' : 'ROTATE_STRIKE';
    } else {
      batterIntent = prng.nextFloat() < 0.6 ? 'ROTATE_STRIKE' : 'BALANCED';
    }
  } else if (currentInnings.totalWickets >= 3 && over < (isODI ? 15 : 7)) {
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
    // Powerplay: take advantage of field restrictions
    batterIntent = prng.nextFloat() < 0.6 ? 'AGGRESSIVE' : 'BALANCED';
  } else if (isMiddle) {
    // Middle overs: rotate strike and pick boundaries
    const roll = prng.nextFloat();
    if (roll < (isODI ? 0.6 : 0.5)) {
      batterIntent = 'ROTATE_STRIKE';
    } else if (roll < 0.85) {
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

  if (isTest) {
    if ((state.oversSinceNewBall ?? 0) < 35 || isNewBatter) {
      fieldPreset = 'ATTACKING_CLOSE_CATCHERS';
    } else if (isSpinner) {
      fieldPreset = prng.nextFloat() < 0.5 ? 'ATTACKING_CLOSE_CATCHERS' : 'SPIN_CHOKE';
    } else {
      fieldPreset = 'BALANCED_RING';
    }
  } else if (isNewBatter && !isDeath) {
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
