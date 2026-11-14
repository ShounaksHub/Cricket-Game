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
import {
  getRulesetForFormat,
} from '../rulesets/t20-ruleset.js';
import {
  getActiveBowlingPhase,
  type BowlingPhase,
} from '../contracts/bowling-plans.js';

function isTestFormat(format: MatchState['config']['format']): boolean {
  return format === 'TEST_RED_BALL' || format === 'TEST_PINK_BALL';
}

function isBowlingEligible(
  state: MatchState,
  playerId: string,
  previousBowlerId: string,
): boolean {
  const innings = state.innings[state.currentInningsIndex];
  const profile = state.config.playerProfiles.get(playerId);
  if (!innings || (profile && profile.bowlingStyle === 'NONE')) return false;
  if (playerId === previousBowlerId) return false;

  const ruleset = getRulesetForFormat(state.config.format);
  const figures = innings.bowlers.get(playerId);
  const oversBowled = (figures?.ballsBowled ?? 0) / ruleset.legalBallsPerOver;
  return oversBowled < ruleset.maxOversPerBowler;
}

/**
 * Returns the deterministic, legal next-over candidates in captain priority order.
 * The transition layer remains the final authority and revalidates the choice.
 */
export function getEligibleNextBowlerIds(state: MatchState): string[] {
  const innings = state.innings[state.currentInningsIndex];
  if (!innings || innings.legalBallsInCurrentOver !== 5) return [];

  const bowlingTeam = innings.bowlingTeamId === state.config.team1.id
    ? state.config.team1
    : state.config.team2;

  return bowlingTeam.lineup
    .filter((slot) => isBowlingEligible(state, slot.playerId, innings.currentBowlerPlayerId))
    .sort((a, b) => {
      const priA = a.bowlingPriority != null ? a.bowlingPriority : 99;
      const priB = b.bowlingPriority != null ? b.bowlingPriority : 99;
      if (priA !== priB) return priA - priB;

      const profA = state.config.playerProfiles.get(a.playerId);
      const profB = state.config.playerProfiles.get(b.playerId);

      const isWkA = profA?.isWicketkeeper || profA?.primaryRole === 'WICKETKEEPER_BATTER';
      const isWkB = profB?.isWicketkeeper || profB?.primaryRole === 'WICKETKEEPER_BATTER';
      if (isWkA !== isWkB) return isWkA ? 1 : -1;

      const roleRank = (p?: { primaryRole?: string; bowlingStyle?: string }) => {
        if (!p) return 99;
        if (p.bowlingStyle === 'NONE') return 100;
        const r = p.primaryRole;
        if (r === 'BOWLER' || r === 'PACE_BOWLER' || r === 'SPIN_BOWLER') return 0;
        if (r === 'BOWLING_ALL_ROUNDER') return 1;
        if (r === 'ALL_ROUNDER') return 2;
        if (r === 'BATTING_ALL_ROUNDER') return 3;
        return 4;
      };
      const rankA = roleRank(profA);
      const rankB = roleRank(profB);
      if (rankA !== rankB) return rankA - rankB;

      const ratingA = profA?.ratings?.[state.config.format]?.bowlingRating ?? profA?.formatRating?.bowlingRating ?? 50;
      const ratingB = profB?.ratings?.[state.config.format]?.bowlingRating ?? profB?.formatRating?.bowlingRating ?? 50;
      if (ratingB !== ratingA) return ratingB - ratingA;

      return a.battingOrder - b.battingOrder;
    })
    .map((slot) => slot.playerId);
}

function planForPhase(
  phase: BowlingPhase,
  isNewBatter: boolean,
): NonNullable<TacticalDeliveryAction['bowlingPlan']> {
  if (phase.id === 'DEATH_OVERS' || phase.id === 'CONTAINMENT') return 'DEFENSIVE';
  if (
    isNewBatter ||
    phase.id === 'POWERPLAY' ||
    phase.id === 'FINAL_POWERPLAY' ||
    phase.id === 'NEW_BALL_ATTACK' ||
    phase.id === 'SWING_SEAM_ATTACK' ||
    phase.id === 'SPIN_ATTACK' ||
    phase.id === 'PARTNERSHIP_BREAKING' ||
    phase.id === 'TAIL_END_ATTACK'
  ) return 'ATTACK';
  return 'BALANCED';
}

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
  const isTest = isTestFormat(format);
  const isT10 = format === 'T10';
  const isODI = format === 'ODI';

  const activePhase = getActiveBowlingPhase(
    format,
    over,
    state.currentSessionNumber ?? 1,
    currentInnings.totalWickets,
  );
  const isPowerplay = !isTest && activePhase.id === 'POWERPLAY';
  const isDeath = activePhase.id === 'DEATH_OVERS';
  const isFinalPowerplay = activePhase.id === 'FINAL_POWERPLAY';
  const isAttackPhase = isTest && [
    'NEW_BALL_ATTACK',
    'SWING_SEAM_ATTACK',
    'SPIN_ATTACK',
    'PARTNERSHIP_BREAKING',
    'TAIL_END_ATTACK',
  ].includes(activePhase.id);
  const isContainmentPhase = isTest && activePhase.id === 'CONTAINMENT';
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

  if (isDeath || isContainmentPhase) {
    // Containment and death execution: protect the boundary with variation.
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
  } else if (isPowerplay || isFinalPowerplay || isAttackPhase) {
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
  } else if (isSpinner || activePhase.id === 'SPIN_ATTACK') {
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

  // 4. Resolve Tactical Captaincy Decisions (New Ball, Declaration, Follow-On)
  let takeNewBall: boolean | undefined = undefined;
  if (isTest && state.isNewBallAvailable) {
    // If pacers are operating or ball is excessively worn, claim the new cherry
    if (!isSpinner || state.ballWearIndex >= 0.8) {
      takeNewBall = true;
    } else {
      // Delay taking new ball if spinners are getting grip
      takeNewBall = false;
    }
  }

  let declareInnings: boolean | undefined = undefined;
  if (isTest && currentInnings.inningsNumber === 3) {
    const inn1 = state.innings[0];
    const inn2 = state.innings[1];
    if (inn1 && inn2 && !state.isFollowOnEnforced) {
      const overallLead = (inn1.totalRuns + currentInnings.totalRuns) - inn2.totalRuns;
      if (overallLead >= 400 || (overallLead >= 320 && currentInnings.totalWickets >= 6)) {
        declareInnings = true;
      }
    }
  }

  let enforceFollowOn: boolean | undefined = undefined;
  if (isTest && state.isFollowOnEligible) {
    const inn1 = state.innings[0];
    const inn2 = state.innings[1];
    if (inn1 && inn2) {
      const deficit = inn1.totalRuns - inn2.totalRuns;
      // Enforce if lead is commanding (250+), or rest bowlers if long previous innings
      if (deficit >= 250) {
        enforceFollowOn = true;
      } else if (inn2.completedOvers >= 90) {
        enforceFollowOn = false; // Give bowling attack rest
      } else {
        enforceFollowOn = true;
      }
    }
  }

  const bowlingPlan = planForPhase(activePhase, isNewBatter);

  // Recommend a legal next-over bowler from the actual bowling workload. The
  // transition layer remains the final authority and revalidates this choice.
  const nextBowlerPlayerId = getEligibleNextBowlerIds(state)[0];

  return {
    batterIntent,
    bowlerLine,
    bowlerLength,
    bowlerVariation,
    fieldPreset,
    takeNewBall,
    declareInnings,
    enforceFollowOn,
    bowlingPlan,
    activePhase: activePhase.id,
    nextBowlerPlayerId,
  };
}
