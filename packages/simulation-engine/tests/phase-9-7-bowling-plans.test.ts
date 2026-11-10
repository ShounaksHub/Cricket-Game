import { describe, expect, it } from 'vitest';
import {
  calculateOutcomeLogits,
  getActiveBowlingPhase,
  getBowlingPhases,
  type TacticalDeliveryAction,
} from '../src/index.js';
import type { PlayerSquadContext } from '@cricket/shared-types';

const player = (id: string): PlayerSquadContext => ({
  id,
  fullName: id,
  displayName: id,
  primaryRole: 'PACE_BOWLER',
  battingHand: 'RIGHT_HAND',
  bowlingStyle: 'RIGHT_ARM_FAST',
  isWicketkeeper: false,
});

const action = (bowlingPlan: TacticalDeliveryAction['bowlingPlan']): TacticalDeliveryAction => ({
  batterIntent: 'BALANCED',
  bowlerLine: 'OUTSIDE_OFF',
  bowlerLength: 'GOOD_LENGTH',
  bowlerVariation: 'STOCK',
  fieldPreset: 'BALANCED_RING',
  bowlingPlan,
});

describe('Phase 9.7 phase-based bowling plans', () => {
  it('exposes format-specific phase boundaries without sentinel quotas', () => {
    expect(getBowlingPhases('T10').map((phase) => phase.id)).toEqual(['POWERPLAY', 'MIDDLE_OVERS', 'DEATH_OVERS']);
    expect(getActiveBowlingPhase('T20', 0).id).toBe('POWERPLAY');
    expect(getActiveBowlingPhase('T20', 6).id).toBe('MIDDLE_OVERS');
    expect(getActiveBowlingPhase('T20', 15).id).toBe('DEATH_OVERS');
    expect(getBowlingPhases('ODI')).toHaveLength(4);
    expect(getActiveBowlingPhase('TEST_RED_BALL', 1, 1).id).toBe('NEW_BALL_ATTACK');
  });

  it('maps the high-level plan into actual engine logits', () => {
    const context = {
      format: 'T20' as const,
      inningsNumber: 1,
      overNumber: 8,
      ballInOver: 1,
      isPowerplay: false,
      isDeathOvers: false,
      isFreeHit: false,
      totalRuns: 30,
      totalWickets: 1,
      currentRunRate: 7,
      ballsRemaining: 72,
      pitchWearIndex: 0.1,
      surfaceCracksIndex: 0,
      ballWearIndex: 0.1,
      fieldersOutsideRing: 5,
    };
    const attack = calculateOutcomeLogits({ context, batter: player('batter'), bowler: player('bowler'), conditions: { ambientTemperatureC: 25, humidityPercentage: 50, cloudCoverPercentage: 20, dewFactor: 0 }, tactics: action('ATTACK') });
    const defensive = calculateOutcomeLogits({ context, batter: player('batter'), bowler: player('bowler'), conditions: { ambientTemperatureC: 25, humidityPercentage: 50, cloudCoverPercentage: 20, dewFactor: 0 }, tactics: action('DEFENSIVE') });
    expect(attack.WICKET).toBeGreaterThan(defensive.WICKET);
    expect(attack.FOUR).toBeGreaterThan(defensive.FOUR);
    expect(defensive.SIX).toBeLessThan(attack.SIX);
  });
});
