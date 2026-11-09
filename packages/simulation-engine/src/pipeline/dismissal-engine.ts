import type { BowlingStyle, DreamTeamPlayerSlotInput } from '@cricket/shared-types';
import type {
  DeliveryDismissal,
  DeliveryExtras,
  DeliveryOutcome,
  DismissalMode,
  FieldPreset,
} from '../contracts/types.js';
import type { DeterministicPRNG } from '../prng/splitmix64.js';
import { isSpinBowling } from './matchup-matrix.js';

export interface DismissalResolutionInput {
  readonly outcome: DeliveryOutcome;
  readonly isNoBall: boolean;
  readonly isFreeHit: boolean;
  readonly isWide: boolean;
  readonly strikerPlayerId: string;
  readonly nonStrikerPlayerId: string;
  readonly bowlerPlayerId: string;
  readonly bowlerStyle: BowlingStyle;
  readonly bowlingTeamLineup: readonly DreamTeamPlayerSlotInput[];
  readonly fieldPreset: FieldPreset;
  readonly prng: DeterministicPRNG;
}

export interface DeliveryResolutionResult {
  readonly outcome: DeliveryOutcome;
  readonly runsBat: number;
  readonly extras: DeliveryExtras;
  readonly isLegalDelivery: boolean;
  readonly dismissal?: DeliveryDismissal;
}

const ZERO_EXTRAS: DeliveryExtras = {
  wides: 0,
  noBalls: 0,
  byes: 0,
  legByes: 0,
  penalty: 0,
};

/**
 * Finds the designated wicketkeeper from the bowling team's lineup.
 */
export function getWicketkeeperId(
  lineup: readonly DreamTeamPlayerSlotInput[],
): string {
  const keeper = lineup.find((slot) => slot.isDesignatedWicketkeeper);
  if (keeper) return keeper.playerId;
  // Fallback to slot 11 if no designated keeper specified
  return lineup[lineup.length - 1]?.playerId ?? 'keeper-fallback';
}

/**
 * Resolves dismissal mode and extras strictly adhering to MCC Laws of Cricket:
 * - MCC Law 21.18: No-ball allows only RUN_OUT dismissal.
 * - MCC Law 22.17: Wide allows only STUMPED or RUN_OUT dismissal.
 * - Free-Hit: Allows only RUN_OUT dismissal.
 */
export function resolveDeliveryOutcome(
  input: DismissalResolutionInput,
): DeliveryResolutionResult {
  const {
    outcome,
    isNoBall,
    isFreeHit,
    isWide,
    strikerPlayerId,
    nonStrikerPlayerId,
    bowlerPlayerId,
    bowlerStyle,
    bowlingTeamLineup,
    fieldPreset,
    prng,
  } = input;

  // 1. Extras and Legal Delivery Accounting
  if (outcome === 'WIDE' || isWide) {
    const isWicket = outcome === 'WICKET';
    let dismissal: DeliveryDismissal | undefined;

    if (isWicket) {
      // MCC Law 22.17: On wide, only Stumped or Run Out possible
      const keeperId = getWicketkeeperId(bowlingTeamLineup);
      const isSpin = isSpinBowling(bowlerStyle);
      const roll = prng.nextFloat();

      if (isSpin && roll < 0.85) {
        dismissal = {
          mode: 'STUMPED',
          dismissedPlayerId: strikerPlayerId,
          bowlerPlayerId,
          fielderPlayerId: keeperId,
        };
      } else {
        const isStrikerOut = prng.nextFloat() < 0.7;
        dismissal = {
          mode: 'RUN_OUT',
          dismissedPlayerId: isStrikerOut ? strikerPlayerId : nonStrikerPlayerId,
          bowlerPlayerId,
          fielderPlayerId: keeperId,
        };
      }
    }

    return {
      outcome: 'WIDE',
      runsBat: 0,
      extras: { ...ZERO_EXTRAS, wides: 1 },
      isLegalDelivery: false,
      dismissal,
    };
  }

  if (outcome === 'NO_BALL' || isNoBall) {
    let dismissal: DeliveryDismissal | undefined;
    if (outcome === 'WICKET') {
      // MCC Law 21.18: On no-ball, only Run Out is possible
      const isStrikerOut = prng.nextFloat() < 0.7;
      const otherFielders = bowlingTeamLineup.filter(
        (f) => f.playerId !== bowlerPlayerId,
      );
      const fielderId =
        otherFielders.length > 0
          ? otherFielders[prng.nextInt(0, otherFielders.length - 1)].playerId
          : undefined;

      dismissal = {
        mode: 'RUN_OUT',
        dismissedPlayerId: isStrikerOut ? strikerPlayerId : nonStrikerPlayerId,
        bowlerPlayerId,
        fielderPlayerId: fielderId,
      };
    }

    return {
      outcome: 'NO_BALL',
      runsBat: 0,
      extras: { ...ZERO_EXTRAS, noBalls: 1 },
      isLegalDelivery: false,
      dismissal,
    };
  }

  if (outcome === 'LEG_BYE') {
    return {
      outcome: 'LEG_BYE',
      runsBat: 0,
      extras: { ...ZERO_EXTRAS, legByes: 1 },
      isLegalDelivery: true,
    };
  }

  if (outcome === 'BYE') {
    return {
      outcome: 'BYE',
      runsBat: 0,
      extras: { ...ZERO_EXTRAS, byes: 1 },
      isLegalDelivery: true,
    };
  }

  if (outcome === 'RUN_1') {
    return {
      outcome: 'RUN_1',
      runsBat: 1,
      extras: ZERO_EXTRAS,
      isLegalDelivery: true,
    };
  }

  if (outcome === 'RUN_2') {
    return {
      outcome: 'RUN_2',
      runsBat: 2,
      extras: ZERO_EXTRAS,
      isLegalDelivery: true,
    };
  }

  if (outcome === 'RUN_3') {
    return {
      outcome: 'RUN_3',
      runsBat: 3,
      extras: ZERO_EXTRAS,
      isLegalDelivery: true,
    };
  }

  if (outcome === 'FOUR') {
    return {
      outcome: 'FOUR',
      runsBat: 4,
      extras: ZERO_EXTRAS,
      isLegalDelivery: true,
    };
  }

  if (outcome === 'SIX') {
    return {
      outcome: 'SIX',
      runsBat: 6,
      extras: ZERO_EXTRAS,
      isLegalDelivery: true,
    };
  }

  if (outcome === 'DOT') {
    return {
      outcome: 'DOT',
      runsBat: 0,
      extras: ZERO_EXTRAS,
      isLegalDelivery: true,
    };
  }

  // 2. Standard Wicket Resolution
  if (outcome === 'WICKET') {
    // Free-Hit Rule check
    if (isFreeHit) {
      // Off free hit, only RUN_OUT can dismiss a batter
      const isStrikerOut = prng.nextFloat() < 0.7;
      const otherFielders = bowlingTeamLineup.filter(
        (f) => f.playerId !== bowlerPlayerId,
      );
      const fielderId =
        otherFielders.length > 0
          ? otherFielders[prng.nextInt(0, otherFielders.length - 1)].playerId
          : undefined;

      return {
        outcome: 'WICKET',
        runsBat: 0,
        extras: ZERO_EXTRAS,
        isLegalDelivery: true,
        dismissal: {
          mode: 'RUN_OUT',
          dismissedPlayerId: isStrikerOut ? strikerPlayerId : nonStrikerPlayerId,
          bowlerPlayerId,
          fielderPlayerId: fielderId,
        },
      };
    }

    const keeperId = getWicketkeeperId(bowlingTeamLineup);
    const isSpin = isSpinBowling(bowlerStyle);
    const roll = prng.nextFloat();
    let mode: DismissalMode;
    let fielderPlayerId: string | undefined;

    if (isSpin) {
      // Spin dismissal distribution: Caught (40%), LBW (22%), Bowled (18%), Stumped (14%), Caught Behind (4%), Run Out (2%)
      if (roll < 0.4) {
        mode = 'CAUGHT';
        const catchers = bowlingTeamLineup.filter((f) => f.playerId !== keeperId);
        fielderPlayerId =
          catchers.length > 0
            ? catchers[prng.nextInt(0, catchers.length - 1)].playerId
            : bowlerPlayerId;
      } else if (roll < 0.62) {
        mode = 'LBW';
        fielderPlayerId = undefined;
      } else if (roll < 0.8) {
        mode = 'BOWLED';
        fielderPlayerId = undefined;
      } else if (roll < 0.94) {
        mode = 'STUMPED';
        fielderPlayerId = keeperId;
      } else if (roll < 0.98) {
        mode = 'CAUGHT_BEHIND';
        fielderPlayerId = keeperId;
      } else {
        mode = 'RUN_OUT';
        fielderPlayerId =
          bowlingTeamLineup[prng.nextInt(0, bowlingTeamLineup.length - 1)]?.playerId;
      }
    } else {
      // Pace dismissal distribution: Caught (44%), Caught Behind (22%), Bowled (18%), LBW (12%), Run Out (3%), Hit Wicket (1%)
      if (roll < 0.44) {
        mode = 'CAUGHT';
        const catchers = bowlingTeamLineup.filter((f) => f.playerId !== keeperId);
        fielderPlayerId =
          catchers.length > 0
            ? catchers[prng.nextInt(0, catchers.length - 1)].playerId
            : bowlerPlayerId;
      } else if (roll < 0.66) {
        mode = 'CAUGHT_BEHIND';
        fielderPlayerId = keeperId;
      } else if (roll < 0.84) {
        mode = 'BOWLED';
        fielderPlayerId = undefined;
      } else if (roll < 0.96) {
        mode = 'LBW';
        fielderPlayerId = undefined;
      } else if (roll < 0.99) {
        mode = 'RUN_OUT';
        fielderPlayerId =
          bowlingTeamLineup[prng.nextInt(0, bowlingTeamLineup.length - 1)]?.playerId;
      } else {
        mode = 'HIT_WICKET';
        fielderPlayerId = undefined;
      }
    }

    const dismissedPlayerId =
      mode === 'RUN_OUT' && prng.nextFloat() >= 0.7
        ? nonStrikerPlayerId
        : strikerPlayerId;

    return {
      outcome: 'WICKET',
      runsBat: 0,
      extras: ZERO_EXTRAS,
      isLegalDelivery: true,
      dismissal: {
        mode,
        dismissedPlayerId,
        bowlerPlayerId,
        fielderPlayerId,
      },
    };
  }

  // Default fallback
  return {
    outcome: 'DOT',
    runsBat: 0,
    extras: ZERO_EXTRAS,
    isLegalDelivery: true,
  };
}
