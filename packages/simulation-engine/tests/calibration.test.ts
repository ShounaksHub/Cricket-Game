import { describe, it, expect } from 'vitest';
import { runMonteCarloCalibration } from '../src/index.js';

describe('Calibration Feature P4.11: Monte Carlo Calibration Suite', () => {
  it('should verify macro statistical convergence across 15 simulated T20 matches', () => {
    // 15 matches (30 innings, ~3,500 deliveries)
    const summary = runMonteCarloCalibration(15, 7777777n);

    expect(summary.totalMatchesSimulated).toBe(15);
    expect(summary.totalInningsSimulated).toBe(30);
    expect(summary.totalDeliveriesSimulated).toBeGreaterThan(2500);

    // Verify statistical convergence against cricket reality
    expect(summary.averageRunRate).toBeGreaterThanOrEqual(7.0);
    expect(summary.averageRunRate).toBeLessThanOrEqual(10.0);

    expect(summary.averageWicketsPerInnings).toBeGreaterThanOrEqual(4.8);
    expect(summary.averageWicketsPerInnings).toBeLessThanOrEqual(8.5);

    expect(summary.boundaryPercentage).toBeGreaterThanOrEqual(11.0);
    expect(summary.boundaryPercentage).toBeLessThanOrEqual(25.0);

    expect(summary.dotBallPercentage).toBeGreaterThanOrEqual(28.0);
    expect(summary.dotBallPercentage).toBeLessThanOrEqual(50.0);

    expect(summary.extrasPercentage).toBeGreaterThanOrEqual(1.5);
    expect(summary.extrasPercentage).toBeLessThanOrEqual(8.0);

    // Verify dismissal distribution: Caught must be highest
    expect(summary.dismissalDistribution['CAUGHT'] ?? 0).toBeGreaterThan(30.0);
    expect(summary.isCalibrated).toBe(true);
    expect(summary.anomalies.length).toBe(0);

    // Verify Confidence Intervals and Skill Tier Differentiation (Finding 7)
    expect(summary.confidenceIntervals).toBeDefined();
    expect(summary.confidenceIntervals?.runRate.lower95).toBeGreaterThan(6.5);
    expect(summary.confidenceIntervals?.runRate.upper95).toBeLessThan(10.5);

    expect(summary.skillTierMetrics).toBeDefined();
    expect(summary.skillTierMetrics?.skillDifferentiationVerified).toBe(true);
    expect(summary.skillTierMetrics!.goldBattingStrikeRate).toBeGreaterThan(
      summary.skillTierMetrics!.bronzeBattingStrikeRate,
    );
    expect(summary.skillTierMetrics!.goldBowlingEconomy).toBeLessThan(
      summary.skillTierMetrics!.bronzeBowlingEconomy,
    );
  });
});
