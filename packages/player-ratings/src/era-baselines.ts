import type { HistoricalEra, MatchFormat, PlayerEraMetrics } from '@cricket/shared-types';

export interface EraPeerBenchmark {
  readonly battingAvgMean: number;
  readonly battingAvgStd: number;
  readonly strikeRateMean: number;
  readonly strikeRateStd: number;
  readonly bowlingAvgMean: number;
  readonly bowlingAvgStd: number;
  readonly economyMean: number;
  readonly economyStd: number;
}

/**
 * Historical peer benchmarks by format and era bracket.
 * Derived from peer cohorts of regular players (>10 matches in era).
 * Note: White-ball cricket formats (ODI, T20) did not exist in earlier eras;
 * fallback models represent theoretical inaugural baseline transitions.
 */
export const ERA_PEER_BENCHMARKS: Record<MatchFormat, Record<HistoricalEra, EraPeerBenchmark>> = {
  TEST_RED_BALL: {
    GOLDEN_AGE_PRE_1914: {
      battingAvgMean: 24.5,
      battingAvgStd: 6.8,
      strikeRateMean: 45.0,
      strikeRateStd: 8.0,
      bowlingAvgMean: 22.1,
      bowlingAvgStd: 5.2,
      economyMean: 2.35,
      economyStd: 0.45,
    },
    INTERWAR_1919_1939: {
      battingAvgMean: 31.8,
      battingAvgStd: 8.5,
      strikeRateMean: 48.0,
      strikeRateStd: 9.0,
      bowlingAvgMean: 27.4,
      bowlingAvgStd: 5.8,
      economyMean: 2.65,
      economyStd: 0.50,
    },
    POST_WAR_1946_1970: {
      battingAvgMean: 32.2,
      battingAvgStd: 8.2,
      strikeRateMean: 44.0,
      strikeRateStd: 7.5,
      bowlingAvgMean: 28.1,
      bowlingAvgStd: 5.6,
      economyMean: 2.50,
      economyStd: 0.45,
    },
    PACE_REVOLUTION_1971_1991: {
      battingAvgMean: 31.2,
      battingAvgStd: 7.8,
      strikeRateMean: 46.5,
      strikeRateStd: 8.5,
      bowlingAvgMean: 28.5,
      bowlingAvgStd: 5.4,
      economyMean: 2.75,
      economyStd: 0.40,
    },
    GLOBALIZED_1992_2007: {
      battingAvgMean: 33.4,
      battingAvgStd: 8.4,
      strikeRateMean: 52.0,
      strikeRateStd: 9.5,
      bowlingAvgMean: 30.2,
      bowlingAvgStd: 6.0,
      economyMean: 3.05,
      economyStd: 0.45,
    },
    T20_REVOLUTION_2008_2020: {
      battingAvgMean: 32.6,
      battingAvgStd: 7.9,
      strikeRateMean: 54.5,
      strikeRateStd: 10.0,
      bowlingAvgMean: 29.8,
      bowlingAvgStd: 5.5,
      economyMean: 3.15,
      economyStd: 0.40,
    },
    CONTEMPORARY_2021_PRESENT: {
      battingAvgMean: 30.8,
      battingAvgStd: 7.5,
      strikeRateMean: 53.0,
      strikeRateStd: 9.8,
      bowlingAvgMean: 27.6,
      bowlingAvgStd: 5.1,
      economyMean: 3.20,
      economyStd: 0.42,
    },
  },
  TEST_PINK_BALL: {
    // Pink ball follows Test benchmarks with slight downward tilt on batting avg and upward swing on bowling
    GOLDEN_AGE_PRE_1914: {
      battingAvgMean: 23.5,
      battingAvgStd: 6.5,
      strikeRateMean: 45.0,
      strikeRateStd: 8.0,
      bowlingAvgMean: 21.0,
      bowlingAvgStd: 5.0,
      economyMean: 2.30,
      economyStd: 0.45,
    },
    INTERWAR_1919_1939: {
      battingAvgMean: 30.5,
      battingAvgStd: 8.0,
      strikeRateMean: 48.0,
      strikeRateStd: 9.0,
      bowlingAvgMean: 26.2,
      bowlingAvgStd: 5.5,
      economyMean: 2.60,
      economyStd: 0.50,
    },
    POST_WAR_1946_1970: {
      battingAvgMean: 31.0,
      battingAvgStd: 8.0,
      strikeRateMean: 44.0,
      strikeRateStd: 7.5,
      bowlingAvgMean: 27.0,
      bowlingAvgStd: 5.4,
      economyMean: 2.45,
      economyStd: 0.45,
    },
    PACE_REVOLUTION_1971_1991: {
      battingAvgMean: 30.0,
      battingAvgStd: 7.5,
      strikeRateMean: 46.5,
      strikeRateStd: 8.5,
      bowlingAvgMean: 27.2,
      bowlingAvgStd: 5.2,
      economyMean: 2.70,
      economyStd: 0.40,
    },
    GLOBALIZED_1992_2007: {
      battingAvgMean: 32.0,
      battingAvgStd: 8.0,
      strikeRateMean: 52.0,
      strikeRateStd: 9.5,
      bowlingAvgMean: 28.8,
      bowlingAvgStd: 5.8,
      economyMean: 3.00,
      economyStd: 0.45,
    },
    T20_REVOLUTION_2008_2020: {
      battingAvgMean: 30.5,
      battingAvgStd: 7.6,
      strikeRateMean: 53.5,
      strikeRateStd: 9.8,
      bowlingAvgMean: 27.5,
      bowlingAvgStd: 5.2,
      economyMean: 3.10,
      economyStd: 0.40,
    },
    CONTEMPORARY_2021_PRESENT: {
      battingAvgMean: 28.5,
      battingAvgStd: 7.2,
      strikeRateMean: 52.0,
      strikeRateStd: 9.5,
      bowlingAvgMean: 25.8,
      bowlingAvgStd: 4.8,
      economyMean: 3.15,
      economyStd: 0.40,
    },
  },
  ODI: {
    GOLDEN_AGE_PRE_1914: {
      battingAvgMean: 22.0,
      battingAvgStd: 6.0,
      strikeRateMean: 55.0,
      strikeRateStd: 8.0,
      bowlingAvgMean: 24.0,
      bowlingAvgStd: 5.0,
      economyMean: 3.20,
      economyStd: 0.40,
    },
    INTERWAR_1919_1939: {
      battingAvgMean: 26.0,
      battingAvgStd: 7.0,
      strikeRateMean: 60.0,
      strikeRateStd: 9.0,
      bowlingAvgMean: 26.0,
      bowlingAvgStd: 5.2,
      economyMean: 3.50,
      economyStd: 0.45,
    },
    POST_WAR_1946_1970: {
      battingAvgMean: 27.5,
      battingAvgStd: 7.2,
      strikeRateMean: 62.0,
      strikeRateStd: 9.0,
      bowlingAvgMean: 27.0,
      bowlingAvgStd: 5.3,
      economyMean: 3.65,
      economyStd: 0.45,
    },
    PACE_REVOLUTION_1971_1991: {
      battingAvgMean: 29.5,
      battingAvgStd: 7.5,
      strikeRateMean: 68.0,
      strikeRateStd: 10.0,
      bowlingAvgMean: 28.5,
      bowlingAvgStd: 5.5,
      economyMean: 4.10,
      economyStd: 0.45,
    },
    GLOBALIZED_1992_2007: {
      battingAvgMean: 31.5,
      battingAvgStd: 8.0,
      strikeRateMean: 74.0,
      strikeRateStd: 11.0,
      bowlingAvgMean: 30.5,
      bowlingAvgStd: 5.8,
      economyMean: 4.75,
      economyStd: 0.50,
    },
    T20_REVOLUTION_2008_2020: {
      battingAvgMean: 33.2,
      battingAvgStd: 8.2,
      strikeRateMean: 82.5,
      strikeRateStd: 12.5,
      bowlingAvgMean: 32.0,
      bowlingAvgStd: 6.0,
      economyMean: 5.25,
      economyStd: 0.55,
    },
    CONTEMPORARY_2021_PRESENT: {
      battingAvgMean: 33.8,
      battingAvgStd: 8.4,
      strikeRateMean: 86.0,
      strikeRateStd: 13.0,
      bowlingAvgMean: 31.8,
      bowlingAvgStd: 5.9,
      economyMean: 5.45,
      economyStd: 0.58,
    },
  },
  T20: {
    GOLDEN_AGE_PRE_1914: {
      battingAvgMean: 18.0,
      battingAvgStd: 5.0,
      strikeRateMean: 95.0,
      strikeRateStd: 12.0,
      bowlingAvgMean: 22.0,
      bowlingAvgStd: 4.5,
      economyMean: 6.50,
      economyStd: 0.80,
    },
    INTERWAR_1919_1939: {
      battingAvgMean: 20.0,
      battingAvgStd: 5.5,
      strikeRateMean: 105.0,
      strikeRateStd: 13.0,
      bowlingAvgMean: 23.0,
      bowlingAvgStd: 4.8,
      economyMean: 6.80,
      economyStd: 0.85,
    },
    POST_WAR_1946_1970: {
      battingAvgMean: 21.0,
      battingAvgStd: 5.8,
      strikeRateMean: 110.0,
      strikeRateStd: 14.0,
      bowlingAvgMean: 23.5,
      bowlingAvgStd: 5.0,
      economyMean: 7.00,
      economyStd: 0.85,
    },
    PACE_REVOLUTION_1971_1991: {
      battingAvgMean: 22.5,
      battingAvgStd: 6.0,
      strikeRateMean: 115.0,
      strikeRateStd: 15.0,
      bowlingAvgMean: 24.0,
      bowlingAvgStd: 5.2,
      economyMean: 7.20,
      economyStd: 0.85,
    },
    GLOBALIZED_1992_2007: {
      battingAvgMean: 23.5,
      battingAvgStd: 6.2,
      strikeRateMean: 122.0,
      strikeRateStd: 16.0,
      bowlingAvgMean: 24.5,
      bowlingAvgStd: 5.4,
      economyMean: 7.45,
      economyStd: 0.88,
    },
    T20_REVOLUTION_2008_2020: {
      battingAvgMean: 24.2,
      battingAvgStd: 6.5,
      strikeRateMean: 128.5,
      strikeRateStd: 16.5,
      bowlingAvgMean: 24.8,
      bowlingAvgStd: 5.5,
      economyMean: 7.75,
      economyStd: 0.90,
    },
    CONTEMPORARY_2021_PRESENT: {
      battingAvgMean: 25.0,
      battingAvgStd: 6.8,
      strikeRateMean: 134.0,
      strikeRateStd: 17.5,
      bowlingAvgMean: 25.2,
      bowlingAvgStd: 5.6,
      economyMean: 8.10,
      economyStd: 0.95,
    },
  },
  T10: {
    GOLDEN_AGE_PRE_1914: {
      battingAvgMean: 15.0,
      battingAvgStd: 4.5,
      strikeRateMean: 130.0,
      strikeRateStd: 18.0,
      bowlingAvgMean: 20.0,
      bowlingAvgStd: 4.5,
      economyMean: 9.00,
      economyStd: 1.20,
    },
    INTERWAR_1919_1939: {
      battingAvgMean: 16.5,
      battingAvgStd: 5.0,
      strikeRateMean: 140.0,
      strikeRateStd: 20.0,
      bowlingAvgMean: 21.0,
      bowlingAvgStd: 4.8,
      economyMean: 9.30,
      economyStd: 1.25,
    },
    POST_WAR_1946_1970: {
      battingAvgMean: 17.0,
      battingAvgStd: 5.2,
      strikeRateMean: 145.0,
      strikeRateStd: 21.0,
      bowlingAvgMean: 21.5,
      bowlingAvgStd: 5.0,
      economyMean: 9.50,
      economyStd: 1.25,
    },
    PACE_REVOLUTION_1971_1991: {
      battingAvgMean: 18.0,
      battingAvgStd: 5.5,
      strikeRateMean: 152.0,
      strikeRateStd: 22.0,
      bowlingAvgMean: 22.0,
      bowlingAvgStd: 5.2,
      economyMean: 9.80,
      economyStd: 1.30,
    },
    GLOBALIZED_1992_2007: {
      battingAvgMean: 19.0,
      battingAvgStd: 5.8,
      strikeRateMean: 160.0,
      strikeRateStd: 24.0,
      bowlingAvgMean: 22.5,
      bowlingAvgStd: 5.3,
      economyMean: 10.10,
      economyStd: 1.35,
    },
    T20_REVOLUTION_2008_2020: {
      battingAvgMean: 20.2,
      battingAvgStd: 6.0,
      strikeRateMean: 172.0,
      strikeRateStd: 26.0,
      bowlingAvgMean: 23.0,
      bowlingAvgStd: 5.5,
      economyMean: 10.60,
      economyStd: 1.40,
    },
    CONTEMPORARY_2021_PRESENT: {
      battingAvgMean: 21.0,
      battingAvgStd: 6.2,
      strikeRateMean: 180.0,
      strikeRateStd: 28.0,
      bowlingAvgMean: 23.5,
      bowlingAvgStd: 5.6,
      economyMean: 11.00,
      economyStd: 1.45,
    },
  },
};

/**
 * Standard modern calibration benchmark cohort (Contemporary era).
 */
export const MODERN_BENCHMARKS: Record<MatchFormat, EraPeerBenchmark> = {
  TEST_RED_BALL: ERA_PEER_BENCHMARKS.TEST_RED_BALL.CONTEMPORARY_2021_PRESENT,
  TEST_PINK_BALL: ERA_PEER_BENCHMARKS.TEST_PINK_BALL.CONTEMPORARY_2021_PRESENT,
  ODI: ERA_PEER_BENCHMARKS.ODI.CONTEMPORARY_2021_PRESENT,
  T20: ERA_PEER_BENCHMARKS.T20.CONTEMPORARY_2021_PRESENT,
  T10: ERA_PEER_BENCHMARKS.T10.CONTEMPORARY_2021_PRESENT,
};

/**
 * Compute Era Normalized Metrics and Z-scores for a player.
 */
export function computeEraMetrics(
  format: MatchFormat,
  era: HistoricalEra,
  rawBattingAvg: number | null,
  rawStrikeRate: number | null,
  rawBowlingAvg: number | null,
  rawEconomy: number | null,
  normalizationVersion = 'era-1.0.0'
): PlayerEraMetrics {
  const peer = ERA_PEER_BENCHMARKS[format][era];
  const modern = MODERN_BENCHMARKS[format];

  // Batting Avg Z-score (higher is better)
  const battingAvgZScore =
    rawBattingAvg !== null
      ? Number(((rawBattingAvg - peer.battingAvgMean) / peer.battingAvgStd).toFixed(3))
      : 0.0;

  // Strike Rate Z-score (higher is better)
  const strikeRateZScore =
    rawStrikeRate !== null
      ? Number(((rawStrikeRate - peer.strikeRateMean) / peer.strikeRateStd).toFixed(3))
      : 0.0;

  // Bowling Avg Z-score (lower is better, so invert sign: positive Z means better than peers)
  const bowlingAvgZScore =
    rawBowlingAvg !== null && rawBowlingAvg > 0
      ? Number(((peer.bowlingAvgMean - rawBowlingAvg) / peer.bowlingAvgStd).toFixed(3))
      : 0.0;

  // Economy Z-score (lower is better, so invert sign)
  const economyZScore =
    rawEconomy !== null && rawEconomy > 0
      ? Number(((peer.economyMean - rawEconomy) / peer.economyStd).toFixed(3))
      : 0.0;

  // Era Performance Ratio (EPR): composite ratio against peer baseline
  let epr = 1.0;
  if (rawBattingAvg !== null && rawBowlingAvg !== null && rawBowlingAvg > 0) {
    const batRatio = rawBattingAvg / peer.battingAvgMean;
    const bowlRatio = peer.bowlingAvgMean / rawBowlingAvg;
    epr = Number(((batRatio + bowlRatio) / 2).toFixed(3));
  } else if (rawBattingAvg !== null) {
    epr = Number((rawBattingAvg / peer.battingAvgMean).toFixed(3));
  } else if (rawBowlingAvg !== null && rawBowlingAvg > 0) {
    epr = Number((peer.bowlingAvgMean / rawBowlingAvg).toFixed(3));
  }

  return {
    format,
    eraBracket: era,
    battingAvgZScore,
    strikeRateZScore,
    bowlingAvgZScore,
    economyZScore,
    eraPerformanceRatio: Math.max(0.2, Math.min(3.5, epr)),
    peerCohortMeanBattingAvg: peer.battingAvgMean,
    peerCohortStdBattingAvg: peer.battingAvgStd,
    peerCohortMeanBowlingAvg: peer.bowlingAvgMean,
    peerCohortStdBowlingAvg: peer.bowlingAvgStd,
    normalizationVersion,
  };
}

/**
 * Normalizes a raw metric to modern calibration equivalent using EPR and Z-scores:
 * M_norm = mu_modern + Z_raw * sigma_modern
 */
export function eraNormalizedValue(
  rawMetric: number,
  peerMean: number,
  peerStd: number,
  modernMean: number,
  modernStd: number,
  lowerIsBetter = false
): number {
  const z = lowerIsBetter ? (peerMean - rawMetric) / peerStd : (rawMetric - peerMean) / peerStd;
  const normalized = lowerIsBetter ? modernMean - z * modernStd : modernMean + z * modernStd;
  return Number(Math.max(0, normalized).toFixed(2));
}
