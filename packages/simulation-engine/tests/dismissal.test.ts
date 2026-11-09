import { describe, it, expect } from 'vitest';
import {
  resolveDeliveryOutcome,
  getWicketkeeperId,
  DeterministicPRNG,
  type DismissalResolutionInput,
} from '../src/index.js';
import type { DreamTeamPlayerSlotInput } from '@cricket/shared-types';

const mockBowlingLineup: readonly DreamTeamPlayerSlotInput[] = [
  { playerId: 'player-1', battingOrder: 1 },
  { playerId: 'player-2', battingOrder: 2 },
  { playerId: 'player-3', battingOrder: 3 },
  { playerId: 'player-4', battingOrder: 4 },
  { playerId: 'player-5', battingOrder: 5 },
  { playerId: 'player-6', battingOrder: 6 },
  { playerId: 'player-7', battingOrder: 7, isDesignatedWicketkeeper: true }, // Keeper!
  { playerId: 'player-8', battingOrder: 8 },
  { playerId: 'player-9', battingOrder: 9 },
  { playerId: 'player-10', battingOrder: 10 },
  { playerId: 'player-11', battingOrder: 11 },
];

const defaultInput: DismissalResolutionInput = {
  outcome: 'WICKET',
  isNoBall: false,
  isFreeHit: false,
  isWide: false,
  strikerPlayerId: 'batter-striker',
  nonStrikerPlayerId: 'batter-nonstriker',
  bowlerPlayerId: 'player-10',
  bowlerStyle: 'RIGHT_ARM_FAST',
  bowlingTeamLineup: mockBowlingLineup,
  fieldPreset: 'BALANCED_RING',
  prng: new DeterministicPRNG(12345678n),
};

describe('Dismissal Feature P4.6: Extras & Wicket Dismissal Engine (MCC Laws)', () => {
  it('should identify designated wicketkeeper from bowling lineup', () => {
    const keeperId = getWicketkeeperId(mockBowlingLineup);
    expect(keeperId).toBe('player-7');
  });

  it('should enforce MCC Law 21.18 (No-Ball allows only RUN_OUT dismissal)', () => {
    // Run 50 samples with No-Ball and Wicket
    for (let i = 0; i < 50; i++) {
      const prng = new DeterministicPRNG(BigInt(1000 + i));
      const res = resolveDeliveryOutcome({
        ...defaultInput,
        isNoBall: true,
        prng,
      });

      expect(res.outcome).toBe('NO_BALL');
      expect(res.isLegalDelivery).toBe(false);
      expect(res.extras.noBalls).toBe(1);
      expect(res.dismissal).toBeDefined();
      expect(res.dismissal?.mode).toBe('RUN_OUT');
      expect(
        ['batter-striker', 'batter-nonstriker'].includes(
          res.dismissal!.dismissedPlayerId,
        ),
      ).toBe(true);
    }
  });

  it('should enforce Free-Hit dismissal protection (only RUN_OUT allowed)', () => {
    for (let i = 0; i < 50; i++) {
      const prng = new DeterministicPRNG(BigInt(5000 + i));
      const res = resolveDeliveryOutcome({
        ...defaultInput,
        isFreeHit: true,
        prng,
      });

      expect(res.outcome).toBe('WICKET');
      expect(res.dismissal).toBeDefined();
      expect(res.dismissal?.mode).toBe('RUN_OUT');
    }
  });

  it('should enforce MCC Law 22.17 (Wide allows only STUMPED or RUN_OUT)', () => {
    for (let i = 0; i < 50; i++) {
      const prng = new DeterministicPRNG(BigInt(7000 + i));
      const res = resolveDeliveryOutcome({
        ...defaultInput,
        outcome: 'WICKET',
        isWide: true,
        bowlerStyle: 'RIGHT_ARM_OFF_BREAK',
        prng,
      });

      expect(res.outcome).toBe('WIDE');
      expect(res.isLegalDelivery).toBe(false);
      expect(res.extras.wides).toBe(1);
      expect(res.dismissal).toBeDefined();
      expect(['STUMPED', 'RUN_OUT'].includes(res.dismissal!.mode)).toBe(true);

      if (res.dismissal?.mode === 'STUMPED') {
        expect(res.dismissal.fielderPlayerId).toBe('player-7'); // Keeper
        expect(res.dismissal.dismissedPlayerId).toBe('batter-striker');
      }
    }
  });

  it('should assign wicketkeeper for CAUGHT_BEHIND and leave fielder undefined for BOWLED/LBW', () => {
    let observedBowled = false;
    let observedLBW = false;
    let observedCaughtBehind = false;

    for (let i = 0; i < 200; i++) {
      const prng = new DeterministicPRNG(BigInt(20000 + i));
      const res = resolveDeliveryOutcome({
        ...defaultInput,
        prng,
      });

      if (res.dismissal?.mode === 'BOWLED') {
        observedBowled = true;
        expect(res.dismissal.fielderPlayerId).toBeUndefined();
      } else if (res.dismissal?.mode === 'LBW') {
        observedLBW = true;
        expect(res.dismissal.fielderPlayerId).toBeUndefined();
      } else if (res.dismissal?.mode === 'CAUGHT_BEHIND') {
        observedCaughtBehind = true;
        expect(res.dismissal.fielderPlayerId).toBe('player-7');
      }
    }

    expect(observedBowled).toBe(true);
    expect(observedLBW).toBe(true);
    expect(observedCaughtBehind).toBe(true);
  });

  it('should correctly account for legal balls and extras for all non-wicket outcomes', () => {
    const prng = new DeterministicPRNG(9999n);

    const wide = resolveDeliveryOutcome({ ...defaultInput, outcome: 'WIDE', prng });
    expect(wide.isLegalDelivery).toBe(false);
    expect(wide.extras.wides).toBe(1);
    expect(wide.runsBat).toBe(0);

    const noBall = resolveDeliveryOutcome({ ...defaultInput, outcome: 'NO_BALL', prng });
    expect(noBall.isLegalDelivery).toBe(false);
    expect(noBall.extras.noBalls).toBe(1);

    const legBye = resolveDeliveryOutcome({ ...defaultInput, outcome: 'LEG_BYE', prng });
    expect(legBye.isLegalDelivery).toBe(true);
    expect(legBye.extras.legByes).toBe(1);

    const four = resolveDeliveryOutcome({ ...defaultInput, outcome: 'FOUR', prng });
    expect(four.isLegalDelivery).toBe(true);
    expect(four.runsBat).toBe(4);
    expect(four.extras.wides).toBe(0);

    const six = resolveDeliveryOutcome({ ...defaultInput, outcome: 'SIX', prng });
    expect(six.isLegalDelivery).toBe(true);
    expect(six.runsBat).toBe(6);
  });
});
