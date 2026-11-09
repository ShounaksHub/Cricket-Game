import { describe, expect, it } from 'vitest';
import {
  isLegalDelivery,
  shouldRotateStriker,
  isOverCompleted,
  isDismissalPermittedOnDelivery,
  isBowlerQuotaReached,
  isFollowOnEligible,
  validatePlayingXI,
} from '../src/validators.js';
import { STANDARD_RULESETS, PITCH_DIMENSIONS } from '../src/constants.js';

describe('Cricket Rules Engine: Dimensions & Formats', () => {
  it('should define accurate pitch dimensions conforming to MCC Laws', () => {
    expect(PITCH_DIMENSIONS.STUMPS_TO_STUMPS_METERS).toBe(20.12);
    expect(PITCH_DIMENSIONS.INNER_FIELDING_CIRCLE_RADIUS_METERS).toBe(27.43);
  });

  it('should configure all 5 formats accurately', () => {
    expect(STANDARD_RULESETS.T10.maxOversPerInnings).toBe(10);
    expect(STANDARD_RULESETS.T10.maxOversPerBowler).toBe(2);

    expect(STANDARD_RULESETS.T20.maxOversPerInnings).toBe(20);
    expect(STANDARD_RULESETS.T20.maxOversPerBowler).toBe(4);

    expect(STANDARD_RULESETS.ODI.maxOversPerInnings).toBe(50);
    expect(STANDARD_RULESETS.ODI.maxOversPerBowler).toBe(10);

    expect(STANDARD_RULESETS.TEST_RED_BALL.inningsPerTeam).toBe(2);
    expect(STANDARD_RULESETS.TEST_RED_BALL.testScheduleConfig?.followOnDeficit).toBe(200);

    expect(STANDARD_RULESETS.TEST_PINK_BALL.testScheduleConfig?.sessions[1]?.sessionName).toBe(
      'Twilight',
    );
  });
});

describe('Cricket Rules Engine: Delivery & Over Invariants', () => {
  it('should identify legal vs re-bowled deliveries (MCC Law 21 & 22)', () => {
    expect(isLegalDelivery('NONE')).toBe(true);
    expect(isLegalDelivery('BYE')).toBe(true);
    expect(isLegalDelivery('LEG_BYE')).toBe(true);
    expect(isLegalDelivery('WIDE')).toBe(false);
    expect(isLegalDelivery('NO_BALL')).toBe(false);
  });

  it('should enforce over completion at exactly 6 legal deliveries', () => {
    expect(isOverCompleted(5)).toBe(false);
    expect(isOverCompleted(6)).toBe(true);
    expect(isOverCompleted(7)).toBe(true);
  });

  it('should calculate striker rotation accurately on physical runs', () => {
    // 1 run off bat mid-over: rotate
    expect(shouldRotateStriker(1, 0, 'NONE', false)).toBe(true);
    // 2 runs off bat mid-over: do not rotate
    expect(shouldRotateStriker(2, 0, 'NONE', false)).toBe(false);
    // 4 boundary: do not rotate
    expect(shouldRotateStriker(4, 0, 'NONE', false)).toBe(false);
    // 6 boundary: do not rotate
    expect(shouldRotateStriker(6, 0, 'NONE', false)).toBe(false);
    // Dot ball at end of over: rotate due to over end
    expect(shouldRotateStriker(0, 0, 'NONE', true)).toBe(true);
    // 1 run on last ball of over: rotated by run then swapped by over = net no swap
    expect(shouldRotateStriker(1, 0, 'NONE', true)).toBe(false);
  });

  it('should restrict dismissal modes on No-Ball and Free Hit', () => {
    expect(isDismissalPermittedOnDelivery('NO_BALL', false, 'BOWLED')).toBe(false);
    expect(isDismissalPermittedOnDelivery('NO_BALL', false, 'CAUGHT')).toBe(false);
    expect(isDismissalPermittedOnDelivery('NO_BALL', false, 'LBW')).toBe(false);
    expect(isDismissalPermittedOnDelivery('NO_BALL', false, 'RUN_OUT')).toBe(true);

    expect(isDismissalPermittedOnDelivery('NONE', true, 'BOWLED')).toBe(false);
    expect(isDismissalPermittedOnDelivery('NONE', true, 'RUN_OUT')).toBe(true);
  });

  it('should restrict dismissal modes on Wide balls', () => {
    expect(isDismissalPermittedOnDelivery('WIDE', false, 'BOWLED')).toBe(false);
    expect(isDismissalPermittedOnDelivery('WIDE', false, 'LBW')).toBe(false);
    expect(isDismissalPermittedOnDelivery('WIDE', false, 'STUMPED')).toBe(true);
    expect(isDismissalPermittedOnDelivery('WIDE', false, 'RUN_OUT')).toBe(true);
    expect(isDismissalPermittedOnDelivery('WIDE', false, 'HIT_WICKET')).toBe(true);
  });
});

describe('Cricket Rules Engine: Quota, Follow-On & Squad Validation', () => {
  it('should enforce bowler quota limits', () => {
    expect(isBowlerQuotaReached(3, 4)).toBe(false);
    expect(isBowlerQuotaReached(4, 4)).toBe(true);
    // Test cricket (unlimited)
    expect(isBowlerQuotaReached(25, undefined)).toBe(false);
  });

  it('should evaluate follow-on eligibility', () => {
    expect(isFollowOnEligible(199, 200)).toBe(false);
    expect(isFollowOnEligible(200, 200)).toBe(true);
    expect(isFollowOnEligible(250, 200)).toBe(true);
  });

  it('should validate playing XI squad constraints', () => {
    const validLineup = Array.from({ length: 11 }, (_, i) => ({
      battingOrder: i + 1,
      isWicketkeeper: i === 6,
      bowlingPriority: i >= 6 ? i - 5 : undefined, // 5 bowling options
    }));

    const result = validatePlayingXI(validLineup, 5);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);

    // Invalid: no wicketkeeper
    const noKeeperLineup = validLineup.map((p) => ({ ...p, isWicketkeeper: false }));
    const invalidResult = validatePlayingXI(noKeeperLineup, 5);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors[0]).toContain('wicketkeeper');
  });
});
