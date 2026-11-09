import type { MatchFormat, PlayerAttributes, PlayerSquadContext } from '@cricket/shared-types';
import type { DeliveryOutcome, TacticalDeliveryAction } from '../contracts/types.js';
import type { DeliveryContext, OutcomeLogits } from './types.js';

/**
 * Returns complete granular PlayerAttributes, gracefully falling back to
 * format composite ratings or 50.0 if granular attributes were omitted.
 */
export function extractPlayerAttributes(
  player: PlayerSquadContext,
  format: MatchFormat,
): PlayerAttributes {
  if (player.attributes) {
    return player.attributes;
  }

  const formatRating = player.formatRating ?? player.ratings?.[format];
  const batRating = formatRating?.battingRating ?? 50.0;
  const bowlRating = formatRating?.bowlingRating ?? 50.0;
  const fieldRating = formatRating?.fieldingRating ?? 50.0;
  const overall = formatRating?.overallRating ?? 50.0;

  return {
    // Batting
    technique: batRating,
    timing: batRating,
    power: batRating,
    strikeRotation: batRating,
    defensiveAbility: batRating,
    againstPace: batRating,
    againstSpin: batRating,
    shortBallHandling: batRating,
    yorkerHandling: batRating,
    deathOverBatting: batRating,
    powerplayBatting: batRating,
    runningBetweenWickets: 50.0,

    // Bowling
    lineAndLength: bowlRating,
    paceOrSpinExecution: bowlRating,
    swingOrDrift: bowlRating,
    seamOrTurn: bowlRating,
    accuracy: bowlRating,
    variation: bowlRating,
    yorkerExecution: bowlRating,
    slowerBallExecution: bowlRating,
    bouncerExecution: bowlRating,
    deathOverBowling: bowlRating,
    newBallEffectiveness: bowlRating,
    stamina: 50.0,

    // Fielding
    catching: fieldRating,
    reflexes: fieldRating,
    groundFielding: fieldRating,
    throwingAccuracy: fieldRating,
    throwingPower: fieldRating,
    wicketkeeping: player.isWicketkeeper ? 85.0 : 30.0,
    athleticism: fieldRating,

    // Temperament
    pressureHandling: overall,
    consistency: overall,
    matchAwareness: overall,
    bigMatchTemperament: overall,
    recoveryResilience: overall,

    // Adaptability
    formatAdaptability: overall,
    pitchAdaptability: overall,
    weatherAdaptability: overall,
    homeVsAwayNeutrality: overall,

    ratingVersion: 'rate-1.0.0',
  };
}

export function isPaceBowling(style: string): boolean {
  return (
    style.includes('FAST') ||
    style.includes('MEDIUM') ||
    style === 'RIGHT_ARM_FAST' ||
    style === 'LEFT_ARM_FAST'
  );
}

export function isSpinBowling(style: string): boolean {
  return (
    style.includes('BREAK') ||
    style.includes('SPIN') ||
    style.includes('ORTHODOX') ||
    style.includes('UNORTHODOX')
  );
}

/**
 * Calculates granular logit adjustments based on micro-level batter vs bowler skill matchups,
 * handedness asymmetries, line & length interactions, and phase execution.
 */
export function calculateMatchupLogitDeltas(
  batter: PlayerSquadContext,
  bowler: PlayerSquadContext,
  context: DeliveryContext,
  tactics: TacticalDeliveryAction,
): Partial<Record<DeliveryOutcome, number>> {
  const batAttr = extractPlayerAttributes(batter, context.format);
  const bowlAttr = extractPlayerAttributes(bowler, context.format);
  const deltas: Partial<Record<DeliveryOutcome, number>> = {};

  const addDelta = (outcome: DeliveryOutcome, value: number) => {
    deltas[outcome] = (deltas[outcome] ?? 0) + value;
  };

  const isPace = isPaceBowling(bowler.bowlingStyle);
  const isSpin = isSpinBowling(bowler.bowlingStyle);

  // 1. Pace Contest: AgainstPace & Technique vs Line/Length & Pace/Swing
  if (isPace) {
    const paceThreat =
      0.5 * bowlAttr.lineAndLength +
      0.3 * bowlAttr.paceOrSpinExecution +
      0.2 * bowlAttr.swingOrDrift;
    const paceDefence = 0.6 * batAttr.againstPace + 0.4 * batAttr.technique;
    const paceDiff = (paceDefence - paceThreat) / 100.0; // [-1.0, 1.0]

    if (paceDiff < 0) {
      // Bowler dominates pace contest
      const mag = Math.abs(paceDiff);
      addDelta('DOT', 0.45 * mag);
      addDelta('WICKET', 0.5 * mag);
      addDelta('FOUR', -0.4 * mag);
    } else {
      // Batter dominates pace
      addDelta('FOUR', 0.45 * paceDiff);
      addDelta('RUN_1', 0.25 * paceDiff);
      addDelta('DOT', -0.35 * paceDiff);
    }
  }

  // 2. Spin Contest: AgainstSpin & Footwork vs Turn/Drift & Accuracy
  if (isSpin) {
    const spinThreat =
      0.45 * bowlAttr.seamOrTurn +
      0.3 * bowlAttr.swingOrDrift +
      0.25 * bowlAttr.accuracy;
    const spinDefence = 0.7 * batAttr.againstSpin + 0.3 * batAttr.technique;
    const spinDiff = (spinDefence - spinThreat) / 100.0;

    if (spinDiff < 0) {
      // Bowler dominates spin
      const mag = Math.abs(spinDiff);
      addDelta('WICKET', 0.7 * mag);
      addDelta('DOT', 0.5 * mag);
      addDelta('RUN_1', -0.4 * mag);
    } else {
      // Batter reads and works spin
      addDelta('RUN_1', 0.6 * spinDiff);
      addDelta('RUN_2', 0.35 * spinDiff);
      addDelta('FOUR', 0.5 * spinDiff);
      addDelta('DOT', -0.4 * spinDiff);
    }
  }

  // 3. Yorker Contest: Yorker Handling & Death Batting vs Yorker Execution
  if (tactics.bowlerLength === 'YORKER' || context.isDeathOvers) {
    const yorkerMastery =
      0.65 * bowlAttr.yorkerExecution + 0.35 * bowlAttr.deathOverBowling;
    const yorkerDefence =
      0.65 * batAttr.yorkerHandling + 0.35 * batAttr.deathOverBatting;
    const yorkerDiff = (yorkerDefence - yorkerMastery) / 100.0;

    if (yorkerDiff < 0) {
      // Yorker beats bat (bowled or pinned LBW)
      const mag = Math.abs(yorkerDiff);
      addDelta('WICKET', 0.7 * mag);
      addDelta('DOT', 0.55 * mag);
      addDelta('FOUR', -0.6 * mag);
      addDelta('SIX', -0.8 * mag);
    } else {
      // Batter digs it out cleanly or executes ramp/helicopter
      addDelta('RUN_1', 0.45 * yorkerDiff);
      addDelta('FOUR', 0.4 * yorkerDiff);
      addDelta('WICKET', -0.35 * yorkerDiff);
    }
  }

  // 4. Short Ball Contest: Bouncer Execution vs Short Ball Handling
  if (tactics.bowlerLength === 'SHORT' || tactics.bowlerVariation === 'BOUNCER') {
    const bouncerPower =
      0.6 * bowlAttr.bouncerExecution + 0.4 * bowlAttr.paceOrSpinExecution;
    const bouncerDefence = batAttr.shortBallHandling;
    const shortDiff = (bouncerDefence - bouncerPower) / 100.0;

    if (shortDiff < 0) {
      // Batter vulnerable to short pitch bowling (top edge, fended off)
      const mag = Math.abs(shortDiff);
      addDelta('WICKET', 0.8 * mag);
      addDelta('DOT', 0.55 * mag);
      addDelta('FOUR', -0.4 * mag);
    } else {
      // Master puller / hooker (pulls for boundaries)
      addDelta('FOUR', 0.65 * shortDiff);
      addDelta('SIX', 0.85 * shortDiff);
      addDelta('DOT', -0.45 * shortDiff);
    }
  }

  // 5. Asymmetric Handedness Matchups
  // Left-Hand Batter vs Off-Break (ball turning away/in through gate)
  if (
    batter.battingHand === 'LEFT_HAND' &&
    bowler.bowlingStyle === 'RIGHT_ARM_OFF_BREAK'
  ) {
    addDelta('WICKET', 0.25);
    addDelta('DOT', 0.2);
  }

  // Right-Hand Batter vs Leg-Break (ball turning away from the bat)
  if (
    batter.battingHand === 'RIGHT_HAND' &&
    bowler.bowlingStyle === 'RIGHT_ARM_LEG_BREAK'
  ) {
    addDelta('WICKET', 0.2);
    addDelta('DOT', 0.15);
  }

  // Right-Hand Batter vs Left-Arm Pace (inswinging angle into pads/stumps)
  if (
    batter.battingHand === 'RIGHT_HAND' &&
    (bowler.bowlingStyle === 'LEFT_ARM_FAST' ||
      bowler.bowlingStyle === 'LEFT_ARM_FAST_MEDIUM')
  ) {
    if (context.isPowerplay || context.overNumber < 4) {
      // Lethal new ball inswing angle
      addDelta('WICKET', 0.3);
      addDelta('DOT', 0.25);
    }
  }

  // 6. Powerplay New-Ball Swing / Seam vs Batter Technique
  if (context.isPowerplay && isPace) {
    const newBallDiff = (batAttr.technique - bowlAttr.newBallEffectiveness) / 100.0;
    if (newBallDiff < 0) {
      addDelta('WICKET', 0.35 * Math.abs(newBallDiff));
      addDelta('DOT', 0.3 * Math.abs(newBallDiff));
    }
  }

  // 7. Slower Ball Deception vs Batter Timing & Match Awareness
  if (tactics.bowlerVariation === 'SLOWER_BALL') {
    const deceptionDiff =
      (bowlAttr.slowerBallExecution - (batAttr.timing * 0.6 + batAttr.matchAwareness * 0.4)) /
      100.0;

    if (deceptionDiff > 0) {
      // Batter early into stroke
      addDelta('WICKET', 0.5 * deceptionDiff);
      addDelta('DOT', 0.4 * deceptionDiff);
      addDelta('FOUR', -0.3 * deceptionDiff);
    } else {
      // Batter waits and punches it
      addDelta('FOUR', 0.4 * Math.abs(deceptionDiff));
      addDelta('SIX', 0.35 * Math.abs(deceptionDiff));
    }
  }

  return deltas;
}
