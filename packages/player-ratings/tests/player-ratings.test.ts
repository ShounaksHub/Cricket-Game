import { describe, expect, it } from 'vitest';
import {
  applyBayesianShrinkage,
  calculateBayesianConfidence,
  calculateFormatRating,
  calculatePlayerAttributes,
  computeEraMetrics,
  eraNormalizedValue,
  RATING_ENGINE_VERSION,
} from '../src/index.js';
import type {
  PlayerEraMetrics,
  PlayerRawFormatStats,
} from '@cricket/shared-types';

describe('Player Ratings Engine (@cricket/player-ratings)', () => {
  describe('Layer 2: Era-Adjusted Metrics & Baselines', () => {
    it('computes positive Z-scores for players outperforming era peers', () => {
      // Golden age batter averaging 48 when peers averaged 24.5
      const eraMetrics = computeEraMetrics('TEST_RED_BALL', 'GOLDEN_AGE_PRE_1914', 48.0, 50.0, null, null);

      expect(eraMetrics.battingAvgZScore).toBeGreaterThan(3.0);
      expect(eraMetrics.eraPerformanceRatio).toBeGreaterThan(1.8);
      expect(eraMetrics.peerCohortMeanBattingAvg).toBe(24.5);
    });

    it('inverts bowling Z-score so lower bowling average yields positive Z', () => {
      // Pacer averaging 18.0 when era peer average was 28.5
      const eraMetrics = computeEraMetrics('TEST_RED_BALL', 'PACE_REVOLUTION_1971_1991', null, null, 18.0, 2.2);

      expect(eraMetrics.bowlingAvgZScore).toBeGreaterThan(1.5);
      expect(eraMetrics.economyZScore).toBeGreaterThan(1.0);
    });

    it('normalizes historical metrics to modern equivalent correctly', () => {
      // Metric: raw 45, peer 25 (std 7), modern 31 (std 7.5) -> Z = 2.857 -> modern ~ 52.4
      const normalized = eraNormalizedValue(45, 25, 7, 31, 7.5);
      expect(normalized).toBeGreaterThan(50);
      expect(normalized).toBeLessThan(55);
    });
  });

  describe('Layer 3: Empirical Bayes Shrinkage', () => {
    it('classifies small sample sizes (< 15 innings) as IMPUTED with heavy shrinkage', () => {
      const confTest = calculateBayesianConfidence('TEST_RED_BALL', 3);
      expect(confTest.confidenceTier).toBe('IMPUTED');
      expect(confTest.confidenceScore).toBeLessThan(0.35);
      expect(confTest.shrinkageWeight).toBeGreaterThan(0.65);

      // Shrunk value with observed 95 and prior 50 should regress below 65
      const effective = applyBayesianShrinkage(95, confTest.confidenceScore, 50);
      expect(effective).toBeLessThan(65);
    });

    it('classifies medium sample sizes as ESTIMATED', () => {
      const confODI = calculateBayesianConfidence('ODI', 20); // K=15 -> 20/(20+15) = 20/35 = 0.571
      expect(confODI.confidenceTier).toBe('ESTIMATED');
      expect(confODI.confidenceScore).toBeGreaterThanOrEqual(0.50);
      expect(confODI.confidenceScore).toBeLessThan(0.85);
    });

    it('classifies large sample sizes (N >= 50 in Tests) as MEASURED', () => {
      const confTest = calculateBayesianConfidence('TEST_RED_BALL', 80); // 80/(80+8) = 0.909
      expect(confTest.confidenceTier).toBe('MEASURED');
      expect(confTest.confidenceScore).toBeGreaterThanOrEqual(0.85);
      expect(confTest.shrinkageWeight).toBeLessThan(0.15);
    });
  });

  describe('Layer 4: 0-100 Attributes & Format Ratings', () => {
    it('evaluates Sir Donald Bradman with near-perfect Test rating and explainability', () => {
      const testStats: PlayerRawFormatStats = {
        format: 'TEST_RED_BALL',
        matchesPlayed: 52,
        inningsBatted: 80,
        runsScored: 6996,
        highestScore: 334,
        isHighestScoreNotOut: false,
        battingAverage: 99.94,
        strikeRate: 70.0,
        centuries: 29,
        halfCenturies: 13,
        fours: 618,
        sixes: 6,
        ballsBowled: 160,
        runsConceded: 72,
        wicketsTaken: 2,
        bowlingAverage: 36.0,
        economyRate: 2.7,
        bowlingStrikeRate: 80.0,
        fiveWicketHauls: 0,
        catchesTaken: 32,
        stumpingsMade: 0,
        dataSourceId: 'provenance-bradman-001',
      };

      const testEra: PlayerEraMetrics = computeEraMetrics(
        'TEST_RED_BALL',
        'INTERWAR_1919_1939',
        99.94,
        70.0,
        36.0,
        2.7
      );

      const attributes = calculatePlayerAttributes({
        primaryRole: 'TOP_ORDER_BATTER',
        battingHand: 'RIGHT_HAND',
        bowlingStyle: 'RIGHT_ARM_LEG_BREAK',
        isWicketkeeper: false,
        historicalEra: 'INTERWAR_1919_1939',
        formatStats: { TEST_RED_BALL: testStats },
        eraMetrics: { TEST_RED_BALL: testEra },
      });

      expect(attributes.ratingVersion).toBe(RATING_ENGINE_VERSION);
      expect(attributes.technique).toBeGreaterThanOrEqual(95);
      expect(attributes.defensiveAbility).toBeGreaterThanOrEqual(90);

      const testRating = calculateFormatRating({
        format: 'TEST_RED_BALL',
        primaryRole: 'TOP_ORDER_BATTER',
        isWicketkeeper: false,
        attributes,
        rawStats: testStats,
        eraMetrics: testEra,
      });

      expect(testRating.overallRating).toBeGreaterThanOrEqual(95);
      expect(testRating.confidenceTier).toBe('MEASURED');
      expect(testRating.explainability.rawPrimaryMetric).toContain('Avg: 99.94');
      expect(testRating.explainability.eraPeerBaseline).toContain('INTERWAR');

      // Bradman in T20 (not tested in format, prior interpolated with lower power weight)
      const t20Rating = calculateFormatRating({
        format: 'T20',
        primaryRole: 'TOP_ORDER_BATTER',
        isWicketkeeper: false,
        attributes,
      });

      expect(t20Rating.overallRating).toBeLessThan(testRating.overallRating);
      expect(t20Rating.confidenceTier).toBe('IMPUTED');
    });

    it('correctly separates pacer pink-ball rating advantage under lights', () => {
      const stats: PlayerRawFormatStats = {
        format: 'TEST_RED_BALL',
        matchesPlayed: 180,
        inningsBatted: 260,
        runsScored: 1350,
        highestScore: 81,
        isHighestScoreNotOut: false,
        battingAverage: 9.8,
        strikeRate: 35.0,
        centuries: 0,
        halfCenturies: 1,
        fours: 120,
        sixes: 4,
        ballsBowled: 40000,
        runsConceded: 18000,
        wicketsTaken: 700,
        bowlingAverage: 25.7,
        economyRate: 2.7,
        bowlingStrikeRate: 57.1,
        fiveWicketHauls: 32,
        catchesTaken: 110,
        stumpingsMade: 0,
        dataSourceId: 'provenance-pacer-001',
      };

      const era: PlayerEraMetrics = computeEraMetrics(
        'TEST_RED_BALL',
        'T20_REVOLUTION_2008_2020',
        9.8,
        35.0,
        25.7,
        2.7
      );

      const attributes = calculatePlayerAttributes({
        primaryRole: 'PACE_BOWLER',
        battingHand: 'LEFT_HAND',
        bowlingStyle: 'RIGHT_ARM_FAST_MEDIUM',
        isWicketkeeper: false,
        historicalEra: 'T20_REVOLUTION_2008_2020',
        formatStats: { TEST_RED_BALL: stats },
        eraMetrics: { TEST_RED_BALL: era },
      });

      const redBallRating = calculateFormatRating({
        format: 'TEST_RED_BALL',
        primaryRole: 'PACE_BOWLER',
        isWicketkeeper: false,
        attributes,
        rawStats: stats,
        eraMetrics: era,
      });

      const pinkBallRating = calculateFormatRating({
        format: 'TEST_PINK_BALL',
        primaryRole: 'PACE_BOWLER',
        isWicketkeeper: false,
        attributes,
        rawStats: stats,
        eraMetrics: era,
      });

      expect(redBallRating.overallRating).toBeGreaterThanOrEqual(85);
      // Pacer with high swing has boosted pink-ball effectiveness
      expect(pinkBallRating.bowlingRating).toBeGreaterThanOrEqual(redBallRating.bowlingRating);
    });
  });
});
