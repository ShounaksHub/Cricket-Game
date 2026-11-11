import { describe, it, expect } from 'vitest';
import {
  simulateFullMatch,
  verifyMatchReplay,
  type MatchSimulationConfig,
} from '../src/index.js';
import type { DreamTeamPlayerSlotInput, PlayerSquadContext } from '@cricket/shared-types';

function createMockLineup(prefix: string): DreamTeamPlayerSlotInput[] {
  return Array.from({ length: 11 }, (_, i) => ({
    playerId: `${prefix}-p${i + 1}`,
    battingOrder: i + 1,
    isCaptain: i === 0,
    isDesignatedWicketkeeper: i === 6,
    bowlingPriority: i >= 5 ? i - 4 : null,
  }));
}

function createMockProfiles(prefix: string): [string, PlayerSquadContext][] {
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
        bowlingStyle: isBowler ? 'RIGHT_ARM_FAST' : 'RIGHT_ARM_MEDIUM',
        isWicketkeeper: i === 6,
        formatRating: {
          format: 'T20',
          overallRating: 85,
          battingRating: isBowler ? 30 : 88,
          bowlingRating: isBowler ? 90 : 25,
          fieldingRating: 80,
          confidenceTier: 'GOLD',
          confidenceScore: 0.9,
          ratingVersion: 'rate-1.0.0',
          explainability: {
            rawPrimaryMetric: 'Avg: 40',
            eraPeerBaseline: 'T20',
            sampleSizeInnings: 50,
            shrinkageApplied: 0.02,
          },
        },
      },
    ];
  });
}

function createTestMatchConfig(seed = 987654321n): MatchSimulationConfig {
  return {
    matchId: 'runner-test-match-1',
    format: 'T20',
    seed: BigInt(seed),
    versions: {
      simulationVersion: 'sim-1.0.0',
      rulesetVersion: 'rules-t20-icc-2026.1',
      ratingVersion: 'rate-1.0.0',
    },
    stadiumId: 'stadium-eden',
    pitchType: 'HARD',
    conditions: {
      ambientTemperatureC: 27,
      humidityPercentage: 60,
      cloudCoverPercentage: 15,
      dewFactor: 0.1,
    },
    team1: {
      id: 'team-ind',
      name: 'India XI',
      lineup: createMockLineup('t1'),
    },
    team2: {
      id: 'team-aus',
      name: 'Australia XI',
      lineup: createMockLineup('t2'),
    },
    playerProfiles: new Map([
      ...createMockProfiles('t1'),
      ...createMockProfiles('t2'),
    ]),
  };
}

describe('Runner Feature P4.10: Reconciled Scorecard & Replay Verification', () => {
  it('should autonomously simulate a complete match and produce reconciled scorecards', () => {
    const config = createTestMatchConfig(123456789n);
    const result = simulateFullMatch(config);

    expect(result.finalState.status).toBe('COMPLETED');
    expect(result.initialStateHash.length).toBe(64); // SHA-256 hex string
    // A chase may finish before 100 deliveries. The runner contract is that
    // every simulated delivery is represented exactly once.
    expect(result.totalDeliveriesSimulated).toBeGreaterThan(0);
    expect(result.allEvents.length).toBe(result.totalDeliveriesSimulated);

    // Verify monotonic event sequencing
    for (let i = 0; i < result.allEvents.length; i++) {
      expect(result.allEvents[i].sequenceNumber).toBe(i + 1);
    }

    // Verify reconciled scorecard structure
    const scorecard = result.scorecard;
    expect(scorecard.innings.length).toBe(2);

    const inn1 = scorecard.innings[0];
    expect(inn1.inningsNumber).toBe(1);
    expect(inn1.battingTeamName).toBe('India XI');
    expect(inn1.bowlingTeamName).toBe('Australia XI');
    expect(inn1.totalRuns).toBeGreaterThanOrEqual(0);
    expect(inn1.totalWickets).toBeLessThanOrEqual(10);
    expect(inn1.batters.length).toBe(11);
    expect(inn1.bowlers.length).toBeGreaterThanOrEqual(4);
    expect(inn1.extras.total).toBeGreaterThanOrEqual(0);

    const inn2 = scorecard.innings[1];
    expect(inn2.inningsNumber).toBe(2);
    expect(inn2.battingTeamName).toBe('Australia XI');
    expect(inn2.totalRuns).toBeGreaterThan(0);

    // Verify Reconciled Partnerships (Finding 6)
    expect(inn1.partnerships.length).toBeGreaterThanOrEqual(1);
    const inn1PartnershipRuns = inn1.partnerships.reduce((sum, p) => sum + p.totalRuns, 0);
    expect(inn1PartnershipRuns).toBe(inn1.totalRuns);
    expect(inn1.partnerships[0].batter1Id).toBeDefined();
    expect(inn1.partnerships[0].batter2Id).toBeDefined();
    expect(inn1.partnerships[0].wicketNumber).toBe(1);

    expect(inn2.partnerships.length).toBeGreaterThanOrEqual(1);
    const inn2PartnershipRuns = inn2.partnerships.reduce((sum, p) => sum + p.totalRuns, 0);
    expect(inn2PartnershipRuns).toBe(inn2.totalRuns);

    // Verify Player of the Match
    expect(scorecard.playerOfTheMatch).toBeDefined();
    expect(scorecard.playerOfTheMatch?.playerId).toBeDefined();
    expect(scorecard.playerOfTheMatch?.impactPoints).toBeGreaterThan(0);
  });

  it('should verify 100% bit-exact replay reproducibility via verifyMatchReplay', () => {
    const config = createTestMatchConfig(4242424242n);
    const originalResult = simulateFullMatch(config);

    const replayReport = verifyMatchReplay(originalResult);

    expect(replayReport.isValid).toBe(true);
    expect(replayReport.discrepancies.length).toBe(0);
    expect(replayReport.originalStateHash).toBe(replayReport.replayedStateHash);
  });

  it('should detect discrepancies if replayed with a different seed', () => {
    const config1 = createTestMatchConfig(11111111n);
    const result1 = simulateFullMatch(config1);

    // Tamper with the config seed inside the result
    const tamperedResult = {
      ...result1,
      finalState: {
        ...result1.finalState,
        config: {
          ...result1.finalState.config,
          seed: 99999999n, // Different seed!
        },
      },
    };

    const replayReport = verifyMatchReplay(tamperedResult);
    expect(replayReport.isValid).toBe(false);
    expect(replayReport.discrepancies.length).toBeGreaterThan(0);
  });
});
