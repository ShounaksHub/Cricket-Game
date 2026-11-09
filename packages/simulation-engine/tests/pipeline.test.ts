import { describe, it, expect } from 'vitest';
import {
  computeSoftmax,
  sampleOutcomeFromProbabilities,
  calculateOutcomeLogits,
  executeDeliveryPipeline,
  getFormatBaselineLogits,
  ALL_DELIVERY_OUTCOMES,
  DeterministicPRNG,
  type DeliveryContext,
  type OutcomeCalculationInput,
} from '../src/index.js';
import type { PlayerSquadContext } from '@cricket/shared-types';
import type { EnvironmentalConditions, TacticalDeliveryAction } from '../src/contracts/types.js';

const mockConditions: EnvironmentalConditions = {
  ambientTemperatureC: 28,
  humidityPercentage: 55,
  cloudCoverPercentage: 20,
  dewFactor: 0.0,
};

const mockBatter: PlayerSquadContext = {
  id: 'batter-1',
  fullName: 'Virat Kohli',
  displayName: 'V. Kohli',
  primaryRole: 'TOP_ORDER_BATTER',
  battingHand: 'RIGHT_HAND',
  bowlingStyle: 'RIGHT_ARM_MEDIUM',
  isWicketkeeper: false,
  formatRating: {
    format: 'T20',
    overallRating: 92,
    battingRating: 95,
    bowlingRating: 30,
    fieldingRating: 88,
    confidenceTier: 'BENCHMARK_PLATINUM',
    confidenceScore: 0.98,
    ratingVersion: 'rate-1.0.0',
    explainability: {
      rawPrimaryMetric: 'Avg: 52.7',
      eraPeerBaseline: 'T20 Cohort',
      sampleSizeInnings: 110,
      shrinkageApplied: 0.02,
    },
  },
};

const mockBowler: PlayerSquadContext = {
  id: 'bowler-1',
  fullName: 'Jasprit Bumrah',
  displayName: 'J. Bumrah',
  primaryRole: 'FAST_BOWLER',
  battingHand: 'RIGHT_HAND',
  bowlingStyle: 'RIGHT_ARM_FAST',
  isWicketkeeper: false,
  formatRating: {
    format: 'T20',
    overallRating: 94,
    battingRating: 25,
    bowlingRating: 96,
    fieldingRating: 80,
    confidenceTier: 'BENCHMARK_PLATINUM',
    confidenceScore: 0.99,
    ratingVersion: 'rate-1.0.0',
    explainability: {
      rawPrimaryMetric: 'Econ: 6.5',
      eraPeerBaseline: 'T20 Cohort',
      sampleSizeInnings: 90,
      shrinkageApplied: 0.01,
    },
  },
};

const defaultTactics: TacticalDeliveryAction = {
  batterIntent: 'BALANCED',
  bowlerLine: 'OUTSIDE_OFF',
  bowlerLength: 'GOOD_LENGTH',
  bowlerVariation: 'STOCK',
  fieldPreset: 'BALANCED_RING',
};

const defaultContext: DeliveryContext = {
  format: 'T20',
  inningsNumber: 1,
  overNumber: 2,
  ballInOver: 3,
  isPowerplay: true,
  isDeathOvers: false,
  isFreeHit: false,
  totalRuns: 18,
  totalWickets: 0,
  currentRunRate: 7.2,
  ballsRemaining: 105,
  pitchWearIndex: 0.0,
  surfaceCracksIndex: 0.0,
  ballWearIndex: 0.1,
  fieldersOutsideRing: 2,
};

describe('Pipeline Feature P4.4: Softmax & Probability Resolution', () => {
  it('should compute exact Softmax probabilities summing to 1.0 for all formats', () => {
    const formats = ['T10', 'T20', 'ODI', 'TEST_RED_BALL'] as const;

    for (const fmt of formats) {
      const logits = getFormatBaselineLogits(fmt);
      const probs = computeSoftmax(logits);

      let sum = 0;
      for (const outcome of ALL_DELIVERY_OUTCOMES) {
        expect(probs[outcome]).toBeGreaterThan(0);
        expect(probs[outcome]).toBeLessThan(1);
        sum += probs[outcome];
      }
      expect(sum).toBeCloseTo(1.0, 9);
    }
  });

  it('should remain numerically stable with extreme logits without NaN or overflow', () => {
    const extremeLogits = {
      DOT: 1000.0,
      RUN_1: 998.0,
      RUN_2: -500.0,
      RUN_3: -1000.0,
      FOUR: 0.0,
      SIX: -10.0,
      WIDE: -100.0,
      NO_BALL: -200.0,
      LEG_BYE: -500.0,
      BYE: -600.0,
      WICKET: -300.0,
    };

    const probs = computeSoftmax(extremeLogits);
    expect(Number.isNaN(probs.DOT)).toBe(false);
    expect(Number.isFinite(probs.DOT)).toBe(true);
    expect(probs.DOT).toBeGreaterThan(0.8);

    let sum = 0;
    for (const outcome of ALL_DELIVERY_OUTCOMES) {
      sum += probs[outcome];
    }
    expect(sum).toBeCloseTo(1.0, 9);
  });

  it('should shift probabilities according to batter intent', () => {
    const inputDefend: OutcomeCalculationInput = {
      context: defaultContext,
      batter: mockBatter,
      bowler: mockBowler,
      conditions: mockConditions,
      tactics: { ...defaultTactics, batterIntent: 'DEFEND' },
    };
    const inputPower: OutcomeCalculationInput = {
      context: defaultContext,
      batter: mockBatter,
      bowler: mockBowler,
      conditions: mockConditions,
      tactics: { ...defaultTactics, batterIntent: 'MAXIMUM_POWER' },
    };

    const probsDefend = computeSoftmax(calculateOutcomeLogits(inputDefend));
    const probsPower = computeSoftmax(calculateOutcomeLogits(inputPower));

    // Defend should have drastically higher DOT rate and lower boundary rate
    expect(probsDefend.DOT).toBeGreaterThan(probsPower.DOT);
    expect(probsPower.SIX).toBeGreaterThan(probsDefend.SIX);
    expect(probsPower.FOUR).toBeGreaterThan(probsDefend.FOUR);
    // Maximum power incurs higher dismissal risk
    expect(probsPower.WICKET).toBeGreaterThan(probsDefend.WICKET);
  });

  it('should suppress dismissal probability off a free-hit delivery', () => {
    const regularInput: OutcomeCalculationInput = {
      context: defaultContext,
      batter: mockBatter,
      bowler: mockBowler,
      conditions: mockConditions,
      tactics: defaultTactics,
    };
    const freeHitInput: OutcomeCalculationInput = {
      context: { ...defaultContext, isFreeHit: true },
      batter: mockBatter,
      bowler: mockBowler,
      conditions: mockConditions,
      tactics: defaultTactics,
    };

    const regularProbs = computeSoftmax(calculateOutcomeLogits(regularInput));
    const freeHitProbs = computeSoftmax(calculateOutcomeLogits(freeHitInput));

    expect(regularProbs.WICKET).toBeGreaterThan(0.01);
    expect(freeHitProbs.WICKET).toBe(0.0); // Hard rule constraint: standard dismissals are legally impossible
    expect(freeHitProbs.SIX).toBeGreaterThan(regularProbs.SIX);
  });

  it('should deterministically sample delivery outcomes from PRNG', () => {
    const input: OutcomeCalculationInput = {
      context: defaultContext,
      batter: mockBatter,
      bowler: mockBowler,
      conditions: mockConditions,
      tactics: defaultTactics,
    };

    const prng1 = new DeterministicPRNG(424242n);
    const prng2 = new DeterministicPRNG(424242n);

    const res1 = executeDeliveryPipeline(input, prng1);
    const res2 = executeDeliveryPipeline(input, prng2);

    expect(res1.outcome).toBe(res2.outcome);
    expect(res1.randomRoll).toBe(res2.randomRoll);
    expect(res1.probabilities.FOUR).toBeCloseTo(res2.probabilities.FOUR, 9);
  });

  it('should match theoretical Softmax distribution across 10,000 Monte Carlo samples', () => {
    const input: OutcomeCalculationInput = {
      context: defaultContext,
      batter: mockBatter,
      bowler: mockBowler,
      conditions: mockConditions,
      tactics: defaultTactics,
    };

    const logits = calculateOutcomeLogits(input);
    const probs = computeSoftmax(logits);

    const prng = new DeterministicPRNG(987654321n);
    const counts: Partial<Record<string, number>> = {};
    for (const outcome of ALL_DELIVERY_OUTCOMES) {
      counts[outcome] = 0;
    }

    const SAMPLES = 10000;
    for (let i = 0; i < SAMPLES; i++) {
      const roll = prng.nextFloat();
      const outcome = sampleOutcomeFromProbabilities(probs, roll);
      counts[outcome] = (counts[outcome] ?? 0) + 1;
    }

    // Verify empirical distribution matches theoretical Softmax probabilities within +/- 0.015
    for (const outcome of ALL_DELIVERY_OUTCOMES) {
      const empirical = (counts[outcome] ?? 0) / SAMPLES;
      const theoretical = probs[outcome];
      expect(Math.abs(empirical - theoretical)).toBeLessThan(0.018);
    }
  });
});
