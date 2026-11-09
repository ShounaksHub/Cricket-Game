import type { MatchSimulationConfig } from '../contracts/types.js';
import type { DreamTeamPlayerSlotInput, PlayerSquadContext } from '@cricket/shared-types';
import { simulateFullMatch } from '../runner/match-runner.js';

export interface CalibrationSummary {
  readonly totalMatchesSimulated: number;
  readonly totalInningsSimulated: number;
  readonly totalDeliveriesSimulated: number;
  readonly averageRunsPerInnings: number;
  readonly averageRunRate: number; // Target: 7.2 to 9.5
  readonly averageWicketsPerInnings: number; // Target: 5.2 to 8.0
  readonly boundaryPercentage: number; // Target: 13% to 23%
  readonly dotBallPercentage: number; // Target: 33% to 46%
  readonly extrasPercentage: number; // Target: 2.5% to 7.0%
  readonly dismissalDistribution: Record<string, number>;
  readonly isCalibrated: boolean;
  readonly anomalies: readonly string[];
}

function createCalibrationLineup(prefix: string): DreamTeamPlayerSlotInput[] {
  return Array.from({ length: 11 }, (_, i) => ({
    playerId: `${prefix}-p${i + 1}`,
    battingOrder: i + 1,
    isCaptain: i === 0,
    isDesignatedWicketkeeper: i === 6,
    bowlingPriority: i >= 5 ? i - 4 : null,
  }));
}

function createCalibrationProfiles(prefix: string): [string, PlayerSquadContext][] {
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
        battingHand: i % 3 === 0 ? 'LEFT_HAND' : 'RIGHT_HAND',
        bowlingStyle:
          isBowler && i % 2 === 0
            ? 'RIGHT_ARM_LEG_BREAK'
            : isBowler
              ? 'RIGHT_ARM_FAST'
              : 'RIGHT_ARM_MEDIUM',
        isWicketkeeper: i === 6,
        formatRating: {
          format: 'T20',
          overallRating: 82,
          battingRating: isBowler ? 35 : 85,
          bowlingRating: isBowler ? 88 : 30,
          fieldingRating: 78,
          confidenceTier: 'MEASURED',
          confidenceScore: 0.9,
          ratingVersion: 'rate-1.0.0',
          explainability: {
            rawPrimaryMetric: 'Avg: 38',
            eraPeerBaseline: 'T20',
            sampleSizeInnings: 50,
            shrinkageApplied: 0.02,
          },
        },
      },
    ];
  });
}

/**
 * Runs a batch of Monte Carlo T20 match simulations across varying seeds and stadiums
 * to verify statistical convergence against real-world cricket metrics.
 */
export function runMonteCarloCalibration(
  matchCount = 50,
  baseSeed = 5000000n,
): CalibrationSummary {
  const stadiums = [
    'stadium-mcg',
    'stadium-wankhede',
    'stadium-chinnaswamy',
    'stadium-eden',
    'stadium-lords',
  ];
  const pitches: ('FLAT' | 'HARD' | 'TURNING' | 'GREEN')[] = [
    'FLAT',
    'HARD',
    'TURNING',
    'GREEN',
  ];

  let totalRuns = 0;
  let totalBalls = 0;
  let totalWickets = 0;
  let totalFours = 0;
  let totalSixes = 0;
  let totalDots = 0;
  let totalExtras = 0;
  let totalDeliveries = 0;
  let totalInnings = 0;

  const dismissalCounts: Record<string, number> = {};

  for (let m = 0; m < matchCount; m++) {
    const seed = baseSeed + BigInt(m * 7919);
    const stadiumId = stadiums[m % stadiums.length];
    const pitchType = pitches[m % pitches.length];

    const config: MatchSimulationConfig = {
      matchId: `calib-match-${m + 1}`,
      format: 'T20',
      seed,
      versions: {
        simulationVersion: 'sim-1.0.0',
        rulesetVersion: 'rules-t20-icc-2026.1',
        ratingVersion: 'rate-1.0.0',
      },
      stadiumId,
      pitchType,
      conditions: {
        ambientTemperatureC: 25 + (m % 10),
        humidityPercentage: 45 + (m % 35),
        cloudCoverPercentage: (m * 7) % 80,
        dewFactor: m % 2 === 0 ? 0.4 : 0.0,
      },
      team1: {
        id: `team-a-${m}`,
        name: 'Team Alpha',
        lineup: createCalibrationLineup('a'),
      },
      team2: {
        id: `team-b-${m}`,
        name: 'Team Beta',
        lineup: createCalibrationLineup('b'),
      },
      playerProfiles: new Map([
        ...createCalibrationProfiles('a'),
        ...createCalibrationProfiles('b'),
      ]),
    };

    const result = simulateFullMatch(config);

    for (const inn of result.finalState.innings) {
      totalInnings++;
      totalRuns += inn.totalRuns;
      totalWickets += inn.totalWickets;
      const ballsInInn = inn.completedOvers * 6 + inn.legalBallsInCurrentOver;
      totalBalls += ballsInInn;

      for (const e of inn.events) {
        totalDeliveries++;
        if (e.outcome === 'FOUR') totalFours++;
        else if (e.outcome === 'SIX') totalSixes++;
        else if (e.outcome === 'DOT') totalDots++;

        const isExtra =
          e.extras.wides > 0 ||
          e.extras.noBalls > 0 ||
          e.extras.byes > 0 ||
          e.extras.legByes > 0;
        if (isExtra) totalExtras++;

        if (e.dismissal) {
          const mode = e.dismissal.mode;
          dismissalCounts[mode] = (dismissalCounts[mode] ?? 0) + 1;
        }
      }
    }
  }

  const averageRunsPerInnings = totalInnings > 0 ? totalRuns / totalInnings : 0;
  const averageRunRate = totalBalls > 0 ? (totalRuns / totalBalls) * 6 : 0;
  const averageWicketsPerInnings =
    totalInnings > 0 ? totalWickets / totalInnings : 0;
  const boundaryPercentage =
    totalDeliveries > 0 ? ((totalFours + totalSixes) / totalDeliveries) * 100 : 0;
  const dotBallPercentage =
    totalDeliveries > 0 ? (totalDots / totalDeliveries) * 100 : 0;
  const extrasPercentage =
    totalDeliveries > 0 ? (totalExtras / totalDeliveries) * 100 : 0;

  // Compute percentages of dismissal modes
  const totalDismissals = Object.values(dismissalCounts).reduce(
    (sum, c) => sum + c,
    0,
  );
  const dismissalDistribution: Record<string, number> = {};
  for (const [mode, count] of Object.entries(dismissalCounts)) {
    dismissalDistribution[mode] =
      totalDismissals > 0 ? Math.round((count / totalDismissals) * 1000) / 10 : 0;
  }

  // Anomaly Detection
  const anomalies: string[] = [];

  if (averageRunRate < 7.0 || averageRunRate > 10.0) {
    anomalies.push(
      `Average Run Rate (${averageRunRate.toFixed(2)}) is outside typical T20 range [7.0, 10.0]`,
    );
  }

  if (averageWicketsPerInnings < 4.8 || averageWicketsPerInnings > 8.5) {
    anomalies.push(
      `Average Wickets (${averageWicketsPerInnings.toFixed(2)}) is outside typical T20 range [4.8, 8.5]`,
    );
  }

  if (boundaryPercentage < 11.0 || boundaryPercentage > 25.0) {
    anomalies.push(
      `Boundary percentage (${boundaryPercentage.toFixed(2)}%) is outside expected range [11%, 25%]`,
    );
  }

  if (dotBallPercentage < 28.0 || dotBallPercentage > 50.0) {
    anomalies.push(
      `Dot ball percentage (${dotBallPercentage.toFixed(2)}%) is outside expected range [28%, 50%]`,
    );
  }

  return {
    totalMatchesSimulated: matchCount,
    totalInningsSimulated: totalInnings,
    totalDeliveriesSimulated: totalDeliveries,
    averageRunsPerInnings: Math.round(averageRunsPerInnings * 10) / 10,
    averageRunRate: Math.round(averageRunRate * 100) / 100,
    averageWicketsPerInnings: Math.round(averageWicketsPerInnings * 10) / 10,
    boundaryPercentage: Math.round(boundaryPercentage * 10) / 10,
    dotBallPercentage: Math.round(dotBallPercentage * 10) / 10,
    extrasPercentage: Math.round(extrasPercentage * 10) / 10,
    dismissalDistribution,
    isCalibrated: anomalies.length === 0,
    anomalies,
  };
}
