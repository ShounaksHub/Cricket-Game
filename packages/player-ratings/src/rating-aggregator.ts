import type {
  MatchFormat,
  PlayerAttributes,
  PlayerEraMetrics,
  PlayerFormatRating,
  PlayerRawFormatStats,
  PrimaryRole,
} from '@cricket/shared-types';
import { calculateBayesianConfidence } from './bayesian-shrinkage.js';
import { RATING_ENGINE_VERSION } from './constants.js';

export interface RatingCalculationInput {
  readonly format: MatchFormat;
  readonly primaryRole: PrimaryRole;
  readonly isWicketkeeper: boolean;
  readonly attributes: PlayerAttributes;
  readonly rawStats?: PlayerRawFormatStats;
  readonly eraMetrics?: PlayerEraMetrics;
}

/**
 * Calculates format-specific composite rating and explainable breakdown.
 */
export function calculateFormatRating(input: RatingCalculationInput): PlayerFormatRating {
  const { format, primaryRole, isWicketkeeper, attributes, rawStats, eraMetrics } = input;

  const sampleSize =
    rawStats?.inningsBatted || (rawStats?.ballsBowled ? Math.floor(rawStats.ballsBowled / 6) : 0);
  const confidence = calculateBayesianConfidence(format, sampleSize);

  // Compute format-weighted Batting Rating (0-100)
  let battingRating = 50;
  switch (format) {
    case 'T10':
      battingRating = Math.round(
        attributes.power * 0.35 +
          attributes.strikeRotation * 0.15 +
          attributes.deathOverBatting * 0.25 +
          attributes.timing * 0.15 +
          attributes.technique * 0.10
      );
      break;
    case 'T20':
      battingRating = Math.round(
        attributes.power * 0.25 +
          attributes.powerplayBatting * 0.20 +
          attributes.deathOverBatting * 0.20 +
          attributes.timing * 0.20 +
          attributes.technique * 0.15
      );
      break;
    case 'ODI':
      battingRating = Math.round(
        attributes.technique * 0.25 +
          attributes.timing * 0.25 +
          attributes.strikeRotation * 0.25 +
          attributes.power * 0.15 +
          attributes.defensiveAbility * 0.10
      );
      break;
    case 'TEST_RED_BALL':
      battingRating = Math.round(
        attributes.technique * 0.35 +
          attributes.defensiveAbility * 0.30 +
          attributes.againstPace * 0.15 +
          attributes.againstSpin * 0.10 +
          attributes.timing * 0.10
      );
      break;
    case 'TEST_PINK_BALL':
      battingRating = Math.round(
        attributes.technique * 0.38 +
          attributes.defensiveAbility * 0.32 +
          attributes.againstPace * 0.15 +
          attributes.againstSpin * 0.05 +
          attributes.timing * 0.10
      );
      break;
  }

  // Compute format-weighted Bowling Rating (0-100)
  let bowlingRating = 30;
  switch (format) {
    case 'T10':
      bowlingRating = Math.round(
        attributes.yorkerExecution * 0.30 +
          attributes.deathOverBowling * 0.30 +
          attributes.variation * 0.20 +
          attributes.accuracy * 0.20
      );
      break;
    case 'T20':
      bowlingRating = Math.round(
        attributes.variation * 0.25 +
          attributes.deathOverBowling * 0.25 +
          attributes.accuracy * 0.20 +
          attributes.newBallEffectiveness * 0.15 +
          attributes.yorkerExecution * 0.15
      );
      break;
    case 'ODI':
      bowlingRating = Math.round(
        attributes.lineAndLength * 0.25 +
          attributes.accuracy * 0.25 +
          attributes.newBallEffectiveness * 0.20 +
          attributes.stamina * 0.15 +
          attributes.variation * 0.15
      );
      break;
    case 'TEST_RED_BALL':
      bowlingRating = Math.round(
        attributes.lineAndLength * 0.30 +
          attributes.stamina * 0.25 +
          attributes.accuracy * 0.20 +
          attributes.swingOrDrift * 0.15 +
          attributes.seamOrTurn * 0.10
      );
      break;
    case 'TEST_PINK_BALL':
      bowlingRating = Math.round(
        attributes.swingOrDrift * 0.30 +
          attributes.seamOrTurn * 0.20 +
          attributes.lineAndLength * 0.25 +
          attributes.newBallEffectiveness * 0.15 +
          attributes.stamina * 0.10
      );
      break;
  }

  // Compute Fielding Rating (0-100)
  const fieldingRating = isWicketkeeper
    ? Math.round(attributes.wicketkeeping * 0.70 + attributes.reflexes * 0.30)
    : Math.round(
        attributes.groundFielding * 0.25 +
          attributes.catching * 0.35 +
          attributes.throwingAccuracy * 0.20 +
          attributes.athleticism * 0.20
      );

  // Compute Overall Rating based on primary playing role (specialists rated 90% on primary craft)
  let overallRating = 50;
  switch (primaryRole) {
    case 'TOP_ORDER_BATTER':
    case 'MIDDLE_ORDER_BATTER':
      overallRating = Math.round(
        battingRating * 0.90 +
          fieldingRating * 0.05 +
          attributes.pressureHandling * 0.05
      );
      break;
    case 'WICKETKEEPER_BATTER':
      overallRating = Math.round(
        battingRating * 0.65 +
          fieldingRating * 0.30 +
          attributes.pressureHandling * 0.05
      );
      break;
    case 'BATTING_ALL_ROUNDER':
      overallRating = Math.round(
        battingRating * 0.55 +
          bowlingRating * 0.38 +
          fieldingRating * 0.07
      );
      break;
    case 'BOWLING_ALL_ROUNDER':
      overallRating = Math.round(
        bowlingRating * 0.55 +
          battingRating * 0.38 +
          fieldingRating * 0.07
      );
      break;
    case 'PACE_BOWLER':
    case 'SPIN_BOWLER':
      overallRating = Math.round(
        bowlingRating * 0.90 +
          fieldingRating * 0.05 +
          attributes.consistency * 0.05
      );
      break;
  }

  // Generate explainability breakdown for the UI inspector
  const rawPrimaryMetric = rawStats
    ? rawStats.battingAverage !== null
      ? `Avg: ${rawStats.battingAverage.toFixed(2)}, SR: ${rawStats.strikeRate?.toFixed(1) ?? 'N/A'} (${rawStats.matchesPlayed} matches, ${rawStats.inningsBatted} inn)`
      : rawStats.bowlingAverage !== null
        ? `Bowl Avg: ${rawStats.bowlingAverage.toFixed(2)}, Econ: ${rawStats.economyRate?.toFixed(2) ?? 'N/A'} (${rawStats.wicketsTaken} wkts)`
        : 'No direct format stats recorded'
    : 'No format match records (cohort interpolated)';

  const eraPeerBaseline = eraMetrics
    ? `${eraMetrics.eraBracket.replace(/_/g, ' ')} (Peer Bat: ${eraMetrics.peerCohortMeanBattingAvg.toFixed(1)}, Bowl: ${eraMetrics.peerCohortMeanBowlingAvg.toFixed(1)}, Z: ${eraMetrics.battingAvgZScore >= 0 ? '+' : ''}${eraMetrics.battingAvgZScore.toFixed(2)})`
    : 'Standard contemporary cohort baseline';

  return {
    format,
    overallRating: Math.max(1, Math.min(99, overallRating)),
    battingRating: Math.max(1, Math.min(99, battingRating)),
    bowlingRating: Math.max(1, Math.min(99, bowlingRating)),
    fieldingRating: Math.max(1, Math.min(99, fieldingRating)),
    confidenceTier: confidence.confidenceTier,
    confidenceScore: confidence.confidenceScore,
    ratingVersion: RATING_ENGINE_VERSION,
    explainability: {
      rawPrimaryMetric,
      eraPeerBaseline,
      sampleSizeInnings: sampleSize,
      shrinkageApplied: confidence.shrinkageWeight,
    },
  };
}
