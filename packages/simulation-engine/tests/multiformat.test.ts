import { describe, it, expect } from 'vitest';
import {
  simulateFullMatch,
  verifyMatchReplay,
  getRulesetForFormat,
  type MatchSimulationConfig,
} from '../src/index.js';
import type { DreamTeamPlayerSlotInput, MatchFormat, PlayerSquadContext } from '@cricket/shared-types';

function createMockLineup(prefix: string): DreamTeamPlayerSlotInput[] {
  return Array.from({ length: 11 }, (_, i) => ({
    playerId: `${prefix}-p${i + 1}`,
    battingOrder: i + 1,
    isCaptain: i === 0,
    isDesignatedWicketkeeper: i === 6,
    bowlingPriority: i >= 5 ? i - 4 : null,
  }));
}

function createMockProfiles(prefix: string, format: MatchFormat): [string, PlayerSquadContext][] {
  return Array.from({ length: 11 }, (_, i) => {
    const id = `${prefix}-p${i + 1}`;
    const isBowler = i >= 5;
    return [
      id,
      {
        id,
        fullName: `${prefix.toUpperCase()} Player ${i + 1}`,
        displayName: `${prefix.toUpperCase()}-${i + 1}`,
        primaryRole: isBowler ? 'PACE_BOWLER' : 'TOP_ORDER_BATTER',
        battingHand: 'RIGHT_HAND',
        bowlingStyle: isBowler ? (i % 2 === 0 ? 'RIGHT_ARM_FAST' : 'RIGHT_ARM_LEG_SPIN') : 'RIGHT_ARM_MEDIUM',
        isWicketkeeper: i === 6,
        formatRating: {
          format,
          overallRating: 85,
          battingRating: isBowler ? 30 : 88,
          bowlingRating: isBowler ? 88 : 25,
          fieldingRating: 80,
          confidenceTier: 'GOLD',
          confidenceScore: 0.9,
          ratingVersion: 'rate-1.0.0',
          explainability: {
            rawPrimaryMetric: 'Avg: 42',
            eraPeerBaseline: format,
            sampleSizeInnings: 60,
            shrinkageApplied: 0.02,
          },
        },
      },
    ];
  });
}

function createMultiFormatConfig(format: MatchFormat, seed = 123456789n): MatchSimulationConfig {
  return {
    matchId: `mf-test-${format.toLowerCase()}`,
    format,
    seed: BigInt(seed),
    versions: {
      simulationVersion: 'sim-1.0.0',
      rulesetVersion: 'rules-multi-format-icc-2026.1',
      ratingVersion: 'rate-1.0.0',
    },
    stadiumId: 'stadium-mcg',
    pitchType: 'HARD',
    conditions: {
      ambientTemperatureC: 24,
      humidityPercentage: 55,
      cloudCoverPercentage: 20,
      dewFactor: format === 'TEST_PINK_BALL' ? 0.3 : 0.05,
    },
    team1: {
      id: 'team-alpha',
      name: 'Alpha XI',
      lineup: createMockLineup('t1'),
    },
    team2: {
      id: 'team-beta',
      name: 'Beta XI',
      lineup: createMockLineup('t2'),
    },
    playerProfiles: new Map([
      ...createMockProfiles('t1', format),
      ...createMockProfiles('t2', format),
    ]),
  };
}

describe('Multi-Format Cricket Simulation Engine (Phase 8)', () => {
  it('simulates a complete T10 match adhering to 10-over limit and 2-over bowler quota', () => {
    const config = createMultiFormatConfig('T10', 445566n);
    const result = simulateFullMatch(config);

    expect(result.finalState.status).toBe('COMPLETED');
    expect(result.finalState.config.format).toBe('T10');
    expect(result.scorecard.innings.length).toBeGreaterThanOrEqual(1);
    expect(result.scorecard.innings.length).toBeLessThanOrEqual(2);

    const inn1 = result.scorecard.innings[0];
    expect(inn1.totalRuns).toBeGreaterThan(0);

    // Innings 1 overs must never exceed 10
    const [inn1Overs] = inn1.oversCompletedFormatted.split('.').map(Number);
    expect(inn1Overs).toBeLessThanOrEqual(10);

    // Every bowler in T10 must respect 2 overs max
    for (const b of inn1.bowlers) {
      expect(b.ballsBowled).toBeLessThanOrEqual(12); // 2 overs = 12 legal balls
    }

    // Ruleset properties
    const ruleset = getRulesetForFormat('T10');
    expect(ruleset.maxOversPerInnings).toBe(10);
    expect(ruleset.maxOversPerBowler).toBe(2);
    expect(ruleset.isPowerplayActive(0)).toBe(true);
    expect(ruleset.isPowerplayActive(2)).toBe(true);
    expect(ruleset.isPowerplayActive(3)).toBe(false);
  });

  it('simulates a complete ODI match adhering to 50-over limit and 10-over bowler quota', () => {
    const config = createMultiFormatConfig('ODI', 778899n);
    const result = simulateFullMatch(config);

    expect(result.finalState.status).toBe('COMPLETED');
    expect(result.finalState.config.format).toBe('ODI');
    expect(result.scorecard.innings.length).toBeGreaterThanOrEqual(1);

    const inn1 = result.scorecard.innings[0];
    expect(inn1.totalRuns).toBeGreaterThan(50);

    const [inn1Overs] = inn1.oversCompletedFormatted.split('.').map(Number);
    expect(inn1Overs).toBeLessThanOrEqual(50);

    // Bowler quota in ODI: max 10 overs (60 legal balls)
    for (const b of inn1.bowlers) {
      expect(b.ballsBowled).toBeLessThanOrEqual(60);
    }

    // Check ODI 3-tier powerplays
    const ruleset = getRulesetForFormat('ODI');
    expect(ruleset.maxOversPerInnings).toBe(50);
    expect(ruleset.maxOversPerBowler).toBe(10);
    expect(ruleset.maxFieldersOutsideCircle(5)).toBe(2); // P1
    expect(ruleset.maxFieldersOutsideCircle(20)).toBe(4); // P2
    expect(ruleset.maxFieldersOutsideCircle(45)).toBe(5); // P3
  });

  it('simulates a Test Red Ball match across multiple innings with session and day accounting', () => {
    const config = createMultiFormatConfig('TEST_RED_BALL', 112233n);
    const result = simulateFullMatch(config);

    expect(result.finalState.status).toBe('COMPLETED');
    expect(result.finalState.config.format).toBe('TEST_RED_BALL');
    expect(result.scorecard.innings.length).toBeGreaterThanOrEqual(2);
    expect(result.scorecard.innings.length).toBeLessThanOrEqual(4);

    // Test matches carry Day and Session counters
    expect(result.finalState.currentDayNumber).toBeDefined();
    expect(result.finalState.currentDayNumber).toBeGreaterThanOrEqual(1);
    expect(result.finalState.currentDayNumber).toBeLessThanOrEqual(6); // 5 days, or 6 if draw triggered

    expect(result.finalState.currentSessionNumber).toBeDefined();
    expect(result.finalState.currentSessionNumber).toBeGreaterThanOrEqual(1);
    expect(result.finalState.currentSessionNumber).toBeLessThanOrEqual(3);

    // Reconciled scorecard has valid result
    expect(result.scorecard.result).toBeDefined();
    expect(result.scorecard.result?.summary).toBeTruthy();

    // Verify ruleset attributes
    const ruleset = getRulesetForFormat('TEST_RED_BALL');
    expect(ruleset.format).toBe('TEST_RED_BALL');
    expect(ruleset.freeHitAfterNoBall).toBe(false);
    expect(ruleset.maxOversPerBowler).toBe(Infinity); // Unlimited quota
    expect(ruleset.maxFieldersOutsideCircle(10)).toBe(9); // Unrestricted field
  });

  it('simulates a Test Pink Ball match with day-night condition tracking', () => {
    const config = createMultiFormatConfig('TEST_PINK_BALL', 554433n);
    const result = simulateFullMatch(config);

    expect(result.finalState.status).toBe('COMPLETED');
    expect(result.finalState.config.format).toBe('TEST_PINK_BALL');
    expect(result.scorecard.innings.length).toBeGreaterThanOrEqual(2);

    expect(result.finalState.currentDayNumber).toBeDefined();
    expect(result.finalState.currentSessionNumber).toBeDefined();

    // Ball wear should be tracked and stay within 0.0 to 1.0
    expect(result.finalState.ballWearIndex).toBeGreaterThanOrEqual(0);
    expect(result.finalState.ballWearIndex).toBeLessThanOrEqual(1.0);
  });

  it('verifies 100% bit-exact replay determinism across all formats', () => {
    const formats: MatchFormat[] = ['T10', 'T20', 'ODI', 'TEST_RED_BALL'];

    for (const fmt of formats) {
      const config = createMultiFormatConfig(fmt, 991122n);
      const run1 = simulateFullMatch(config);
      const replayReport = verifyMatchReplay(run1);

      expect(replayReport.isValid).toBe(true);
      expect(replayReport.discrepancies.length).toBe(0);
      expect(replayReport.replayedStateHash).toBe(run1.finalState.initialStateHash);
    }
  });
});
