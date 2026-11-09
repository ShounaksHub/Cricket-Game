import { describe, expect, it } from 'vitest';
import { calculateSquadAnalytics } from '../src/squad-analytics.js';
import type {
  DreamTeamPlayerSlotInput,
  PlayerSquadContext,
  MatchFormat,
} from '@cricket/shared-types';

describe('Squad Analytics Engine (8 Dimensions)', () => {
  const createPlayerContext = (
    id: string,
    role: string,
    style: string,
    bat: number,
    bowl: number,
    fld = 60,
    isKeeper = false
  ): [string, PlayerSquadContext] => [
    id,
    {
      id,
      fullName: `Player ${id}`,
      displayName: `P. ${id}`,
      primaryRole: role as any,
      battingHand: 'RIGHT_HAND',
      bowlingStyle: style as any,
      isWicketkeeper: isKeeper,
      formatRating: {
        id: `rating-${id}`,
        playerId: id,
        formatCode: 'T20',
        overallRating: Math.round((bat + bowl) / 2),
        battingRating: bat,
        bowlingRating: bowl,
        fieldingRating: fld,
        ratingVersion: 'rate-1.0.0',
        eraNormalizedMultiplier: 1.0,
        confidenceTier: 'TIER_1_EXEMPLAR',
        updatedAt: new Date(),
      },
    },
  ];

  it('computes 8-dimension analytics for a balanced World-Class T20 XI', () => {
    const contexts = new Map<string, PlayerSquadContext>([
      createPlayerContext('p1', 'OPENING_BATTER', 'NONE', 88, 20),
      createPlayerContext('p2', 'OPENING_BATTER', 'NONE', 85, 20),
      createPlayerContext('p3', 'TOP_ORDER_BATTER', 'RIGHT_ARM_LEG_BREAK', 92, 45),
      createPlayerContext('p4', 'WICKETKEEPER_BATTER', 'NONE', 84, 15, 85, true),
      createPlayerContext('p5', 'BATTING_ALL_ROUNDER', 'RIGHT_ARM_FAST_MEDIUM', 80, 78),
      createPlayerContext('p6', 'BOWLING_ALL_ROUNDER', 'LEFT_ARM_ORTHODOX', 70, 82),
      createPlayerContext('p7', 'BOWLING_ALL_ROUNDER', 'RIGHT_ARM_FAST', 65, 84),
      createPlayerContext('p8', 'PACE_BOWLER', 'LEFT_ARM_FAST', 45, 90),
      createPlayerContext('p9', 'PACE_BOWLER', 'RIGHT_ARM_FAST', 35, 92),
      createPlayerContext('p10', 'SPIN_BOWLER', 'RIGHT_ARM_OFF_BREAK', 25, 88),
      createPlayerContext('p11', 'SPIN_BOWLER', 'LEFT_ARM_UNORTHODOX', 20, 86),
    ]);

    const lineup: DreamTeamPlayerSlotInput[] = Array.from(contexts.keys()).map((id, idx) => ({
      playerId: id,
      battingOrder: idx + 1,
      isCaptain: idx === 0,
      isDesignatedWicketkeeper: idx === 3,
    }));

    const result = calculateSquadAnalytics('T20', lineup, contexts);

    expect(result.overallBalance).toBeGreaterThanOrEqual(75);
    expect(result.dimensions.battingStrength.score).toBeGreaterThan(80);
    expect(result.dimensions.paceThreat.score).toBeGreaterThan(80);
    expect(result.dimensions.spinThreat.score).toBeGreaterThan(80);
    expect(result.dimensions.bowlingDepth.score).toBeGreaterThan(70);
    expect(result.dimensions.allRounderBalance.score).toBeGreaterThanOrEqual(70);
    expect(result.summary).toContain('tactical equilibrium');
  });

  it('penalizes pace threat and overall balance when squad has zero pace bowlers', () => {
    // 11 spinners and batters, 0 pace
    const contexts = new Map<string, PlayerSquadContext>([
      createPlayerContext('p1', 'OPENING_BATTER', 'NONE', 80, 20),
      createPlayerContext('p2', 'OPENING_BATTER', 'NONE', 80, 20),
      createPlayerContext('p3', 'TOP_ORDER_BATTER', 'NONE', 80, 20),
      createPlayerContext('p4', 'WICKETKEEPER_BATTER', 'NONE', 80, 20, 80, true),
      createPlayerContext('p5', 'MIDDLE_ORDER_BATTER', 'NONE', 80, 20),
      createPlayerContext('p6', 'SPIN_BOWLER', 'RIGHT_ARM_OFF_BREAK', 30, 85),
      createPlayerContext('p7', 'SPIN_BOWLER', 'RIGHT_ARM_LEG_BREAK', 30, 85),
      createPlayerContext('p8', 'SPIN_BOWLER', 'LEFT_ARM_ORTHODOX', 30, 85),
      createPlayerContext('p9', 'SPIN_BOWLER', 'LEFT_ARM_UNORTHODOX', 30, 85),
      createPlayerContext('p10', 'SPIN_BOWLER', 'RIGHT_ARM_OFF_BREAK', 30, 85),
      createPlayerContext('p11', 'SPIN_BOWLER', 'LEFT_ARM_ORTHODOX', 30, 85),
    ]);

    const lineup: DreamTeamPlayerSlotInput[] = Array.from(contexts.keys()).map((id, idx) => ({
      playerId: id,
      battingOrder: idx + 1,
      isCaptain: idx === 0,
      isDesignatedWicketkeeper: idx === 3,
    }));

    const result = calculateSquadAnalytics('T20', lineup, contexts);

    expect(result.dimensions.paceThreat.score).toBeLessThanOrEqual(30);
    expect(result.dimensions.paceThreat.grade).toBe('CRITICAL');
    expect(result.dimensions.spinThreat.score).toBeGreaterThan(80);
    // Overall balance should receive penalty
    expect(result.overallBalance).toBeLessThan(70);
  });

  it('evaluates weak lower order tail realistically', () => {
    const contexts = new Map<string, PlayerSquadContext>([
      createPlayerContext('p1', 'OPENING_BATTER', 'NONE', 90, 10),
      createPlayerContext('p2', 'OPENING_BATTER', 'NONE', 90, 10),
      createPlayerContext('p3', 'TOP_ORDER_BATTER', 'NONE', 90, 10),
      createPlayerContext('p4', 'WICKETKEEPER_BATTER', 'NONE', 90, 10, 80, true),
      createPlayerContext('p5', 'MIDDLE_ORDER_BATTER', 'NONE', 90, 10),
      createPlayerContext('p6', 'MIDDLE_ORDER_BATTER', 'NONE', 90, 10),
      createPlayerContext('p7', 'MIDDLE_ORDER_BATTER', 'NONE', 90, 10),
      // Pure tail enders with 10 batting rating
      createPlayerContext('p8', 'PACE_BOWLER', 'RIGHT_ARM_FAST', 10, 90),
      createPlayerContext('p9', 'PACE_BOWLER', 'RIGHT_ARM_FAST', 10, 90),
      createPlayerContext('p10', 'SPIN_BOWLER', 'RIGHT_ARM_OFF_BREAK', 10, 90),
      createPlayerContext('p11', 'SPIN_BOWLER', 'RIGHT_ARM_LEG_BREAK', 10, 90),
    ]);

    const lineup: DreamTeamPlayerSlotInput[] = Array.from(contexts.keys()).map((id, idx) => ({
      playerId: id,
      battingOrder: idx + 1,
      isCaptain: idx === 0,
      isDesignatedWicketkeeper: idx === 3,
    }));

    const result = calculateSquadAnalytics('T20', lineup, contexts);

    expect(result.dimensions.battingStrength.score).toBeGreaterThan(80);
    expect(result.dimensions.lowerOrderBatting.score).toBeLessThanOrEqual(20);
    expect(result.dimensions.lowerOrderBatting.grade).toBe('CRITICAL');
  });

  it('handles empty lineup gracefully with default non-negative values and critical grades', () => {
    const result = calculateSquadAnalytics('T20', [], new Map());

    expect(result.overallBalance).toBeGreaterThanOrEqual(0);
    expect(result.dimensions.battingStrength.score).toBe(30);
    expect(result.dimensions.paceThreat.score).toBe(25);
    expect(result.dimensions.spinThreat.score).toBe(20);
    expect(result.dimensions.battingStrength.grade).toBe('CRITICAL');
  });
});
