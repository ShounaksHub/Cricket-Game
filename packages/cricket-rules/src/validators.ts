import type { DismissalType, ExtraType } from '@cricket/shared-types';

/**
 * Checks whether an extra counts as a legal delivery in the over.
 * Wides and No-Balls must be re-bowled (MCC Law 21 & 22).
 */
export function isLegalDelivery(extraType: ExtraType): boolean {
  return extraType !== 'WIDE' && extraType !== 'NO_BALL';
}

/**
 * Determines whether the striker and non-striker change ends.
 * - Strikers swap on odd physical runs (1, 3, 5).
 * - Strikers swap at over completion (unless wicket intervention).
 * - Strikers do NOT swap on boundaries (4, 6) or even runs.
 */
export function shouldRotateStriker(
  runsOffBat: number,
  extrasRuns: number,
  extraType: ExtraType,
  isOverComplete: boolean,
): boolean {
  // Physical runs completed by running between wickets
  let physicalRuns = 0;
  if (runsOffBat === 1 || runsOffBat === 3 || runsOffBat === 5) {
    physicalRuns = runsOffBat;
  } else if (extraType === 'BYE' || extraType === 'LEG_BYE') {
    physicalRuns = extrasRuns;
  }

  const oddPhysicalRuns = physicalRuns % 2 === 1;

  // If over is complete, swap ends, unless odd runs were already run
  if (isOverComplete) {
    return !oddPhysicalRuns;
  }

  return oddPhysicalRuns;
}

/**
 * Checks if 6 legal deliveries have been bowled to conclude the over.
 */
export function isOverCompleted(legalBallsInCurrentOver: number): boolean {
  return legalBallsInCurrentOver >= 6;
}

/**
 * Validates whether a dismissal type is legally valid given the delivery state.
 * - On a No-Ball / Free Hit: ONLY Run Out, Obstructing the Field, and Timed Out are legal (MCC Law 21.18).
 * - On a Wide: Bowled, LBW, Caught are impossible; Stumped, Run Out, Hit Wicket are legal (MCC Law 22.17).
 */
export function isDismissalPermittedOnDelivery(
  extraType: ExtraType,
  isFreeHit: boolean,
  dismissalType: DismissalType,
): boolean {
  if (dismissalType === 'NOT_OUT') return true;

  if (isFreeHit || extraType === 'NO_BALL') {
    return (
      dismissalType === 'RUN_OUT' ||
      dismissalType === 'OBSTRUCTING_FIELD' ||
      dismissalType === 'TIMED_OUT' ||
      dismissalType === 'RETIRED_OUT'
    );
  }

  if (extraType === 'WIDE') {
    return (
      dismissalType === 'STUMPED' ||
      dismissalType === 'RUN_OUT' ||
      dismissalType === 'HIT_WICKET' ||
      dismissalType === 'OBSTRUCTING_FIELD' ||
      dismissalType === 'RETIRED_OUT'
    );
  }

  return true;
}

/**
 * Checks whether a bowler has reached the maximum permitted overs.
 */
export function isBowlerQuotaReached(
  completedOversByBowler: number,
  maxOversPerBowler?: number,
): boolean {
  if (maxOversPerBowler === undefined || maxOversPerBowler === null) {
    return false; // Unlimited for Test cricket
  }
  return completedOversByBowler >= maxOversPerBowler;
}

/**
 * Validates follow-on eligibility in Test cricket.
 */
export function isFollowOnEligible(
  leadOfTeamBattingFirst: number,
  followOnDeficitRequired: number,
): boolean {
  return leadOfTeamBattingFirst >= followOnDeficitRequired;
}

/**
 * Validates an active playing XI composition.
 */
export interface SquadValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
}

export function validatePlayingXI(
  lineup: readonly {
    readonly isWicketkeeper: boolean;
    readonly bowlingPriority?: number;
    readonly battingOrder: number;
  }[],
  minBowlingOptions: number,
): SquadValidationResult {
  const errors: string[] = [];

  if (lineup.length !== 11) {
    errors.push(`Playing XI must contain exactly 11 players. Found: ${lineup.length}.`);
  }

  const hasKeeper = lineup.some((p) => p.isWicketkeeper);
  if (!hasKeeper) {
    errors.push('At least one player in the starting XI must be a designated wicketkeeper.');
  }

  const bowlingOptionsCount = lineup.filter(
    (p) => p.bowlingPriority !== undefined && p.bowlingPriority !== null && p.bowlingPriority > 0,
  ).length;

  if (bowlingOptionsCount < minBowlingOptions) {
    errors.push(
      `Insufficient bowling resources. Requires at least ${minBowlingOptions} recognized bowling options. Found: ${bowlingOptionsCount}.`,
    );
  }

  // Check unique batting orders 1 to 11
  const orders = lineup.map((p) => p.battingOrder);
  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== lineup.length) {
    errors.push('Duplicate batting order slots detected in lineup.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
