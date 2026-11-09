import { describe, expect, it } from 'vitest';
import {
  DeterministicPRNG,
  deriveDeliverySeed,
  generateInitialStateHash,
  sha256,
} from '../src/prng/index.js';
import type { MatchSimulationConfig } from '../src/contracts/types.js';

describe('Deterministic PRNG (SplitMix64) & Replay Foundation (P4.1)', () => {
  it('generates identical float sequences from the same seed across runs', () => {
    const seed = 1234567890123456789n;
    const prng1 = new DeterministicPRNG(seed);
    const prng2 = new DeterministicPRNG(seed);

    const seq1: number[] = [];
    const seq2: number[] = [];

    for (let i = 0; i < 100; i++) {
      seq1.push(prng1.nextFloat());
      seq2.push(prng2.nextFloat());
    }

    expect(seq1).toEqual(seq2);
    expect(prng1.getState()).toBe(prng2.getState());
  });

  it('generates distinct sequences for different seeds', () => {
    const prng1 = new DeterministicPRNG(1111111111111111111n);
    const prng2 = new DeterministicPRNG(2222222222222222222n);

    const val1 = prng1.nextFloat();
    const val2 = prng2.nextFloat();

    expect(val1).not.toBe(val2);
  });

  it('verifies uniform distribution across 10,000 samples (mean ~0.5, variance ~1/12)', () => {
    const prng = new DeterministicPRNG(9876543210987654321n);
    const n = 10000;
    let sum = 0;
    let sumSq = 0;

    for (let i = 0; i < n; i++) {
      const val = prng.nextFloat();
      expect(val).toBeGreaterThanOrEqual(0.0);
      expect(val).toBeLessThan(1.0);
      sum += val;
      sumSq += val * val;
    }

    const mean = sum / n;
    const variance = sumSq / n - mean * mean;

    // Expected mean = 0.5, Expected variance = 1/12 ≈ 0.0833
    expect(mean).toBeGreaterThan(0.485);
    expect(mean).toBeLessThan(0.515);
    expect(variance).toBeGreaterThan(0.075);
    expect(variance).toBeLessThan(0.095);
  });

  it('generates integers within specified inclusive range [min, max]', () => {
    const prng = new DeterministicPRNG(42n);
    const min = 1;
    const max = 6;
    const counts = new Map<number, number>();

    for (let i = 0; i < 1200; i++) {
      const roll = prng.nextInt(min, max);
      expect(roll).toBeGreaterThanOrEqual(min);
      expect(roll).toBeLessThanOrEqual(max);
      expect(Number.isInteger(roll)).toBe(true);
      counts.set(roll, (counts.get(roll) ?? 0) + 1);
    }

    // Every value 1..6 must be generated
    for (let i = min; i <= max; i++) {
      expect(counts.get(i)).toBeGreaterThan(100);
    }
  });

  it('generates standard normal variates (Gaussian) with mean ~0 and stdDev ~1', () => {
    const prng = new DeterministicPRNG(5555555555555555555n);
    const n = 10000;
    let sum = 0;
    let sumSq = 0;

    for (let i = 0; i < n; i++) {
      const g = prng.nextGaussian(0, 1);
      sum += g;
      sumSq += g * g;
    }

    const mean = sum / n;
    const stdDev = Math.sqrt(sumSq / n - mean * mean);

    expect(Math.abs(mean)).toBeLessThan(0.06);
    expect(stdDev).toBeGreaterThan(0.95);
    expect(stdDev).toBeLessThan(1.05);
  });

  it('derives independent seeds for deliveries without cross-over collision', () => {
    const matchSeed = 0xabcdef1234567890n;

    const b1_1 = deriveDeliverySeed(matchSeed, 1, 0, 1);
    const b1_2 = deriveDeliverySeed(matchSeed, 1, 0, 2);
    const b2_1 = deriveDeliverySeed(matchSeed, 1, 1, 1);
    const b2_2 = deriveDeliverySeed(matchSeed, 2, 0, 1);

    const seeds = new Set([b1_1, b1_2, b2_1, b2_2]);
    expect(seeds.size).toBe(4); // All distinct
  });

  it('computes deterministic initial state hash (H0) and detects configuration alterations', () => {
    const baseConfig: MatchSimulationConfig = {
      matchId: 'match-001',
      format: 'T20',
      seed: 1234567890n,
      versions: {
        simulationVersion: 'sim-1.0.0',
        rulesetVersion: 'rules-t20-icc-2026.1',
        ratingVersion: 'rate-1.0.0',
      },
      stadiumId: 'stadium-mcg',
      pitchType: 'FLAT',
      conditions: {
        ambientTemperatureC: 24,
        humidityPercentage: 55,
        cloudCoverPercentage: 20,
        dewFactor: 0.0,
      },
      team1: {
        id: 'team-ind',
        name: 'India XI',
        lineup: [{ playerId: 'p1', battingOrder: 1, isCaptain: true }],
      },
      team2: {
        id: 'team-aus',
        name: 'Australia XI',
        lineup: [{ playerId: 'p2', battingOrder: 1, isCaptain: true }],
      },
      playerProfiles: new Map(),
    };

    const hash1 = generateInitialStateHash(baseConfig);
    const hash2 = generateInitialStateHash(baseConfig);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex string

    // Modify temperature
    const modifiedConfig: MatchSimulationConfig = {
      ...baseConfig,
      conditions: { ...baseConfig.conditions, ambientTemperatureC: 35 },
    };
    const hash3 = generateInitialStateHash(modifiedConfig);
    expect(hash3).not.toBe(hash1);
  });

  it('validates NIST FIPS 180-4 known-answer test vectors and UTF-8 encoding for SHA-256', () => {
    // NIST Known-Answer Test Vector 1: Empty string
    expect(sha256('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );

    // NIST Known-Answer Test Vector 2: "abc"
    expect(sha256('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );

    // NIST Known-Answer Test Vector 3: 56-byte message
    expect(
      sha256('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'),
    ).toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');

    // International cricketer names with non-ASCII and Unicode characters
    const unicodeHash1 = sha256('Colin Cowdrey & Müller & Ravindra Jadeja');
    expect(unicodeHash1.length).toBe(64);
    expect(unicodeHash1).not.toBe('');

    const unicodeHash2 = sha256('Virat Kohli 🏏');
    expect(unicodeHash2.length).toBe(64);
    expect(unicodeHash2).not.toBe('');
    expect(unicodeHash1).not.toBe(unicodeHash2);
  });
});
