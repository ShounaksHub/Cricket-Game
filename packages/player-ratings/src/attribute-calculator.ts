import type {
  BattingHand,
  BowlingStyle,
  HistoricalEra,
  MatchFormat,
  PlayerAttributes,
  PlayerEraMetrics,
  PlayerRawFormatStats,
  PrimaryRole,
} from '@cricket/shared-types';
import { applyBayesianShrinkage, calculateBayesianConfidence } from './bayesian-shrinkage.js';
import { COHORT_PRIOR_DEFAULTS, RATING_ENGINE_VERSION } from './constants.js';

export interface AttributeCalculationInput {
  readonly primaryRole: PrimaryRole;
  readonly battingHand: BattingHand;
  readonly bowlingStyle: BowlingStyle;
  readonly isWicketkeeper: boolean;
  readonly historicalEra: HistoricalEra;
  readonly formatStats: Partial<Record<MatchFormat, PlayerRawFormatStats>>;
  readonly eraMetrics: Partial<Record<MatchFormat, PlayerEraMetrics>>;
}

/**
 * Helper to clamp values to integer scale [min, max]
 */
function clamp(val: number, min = 1, max = 99): number {
  return Math.round(Math.max(min, Math.min(max, val)));
}

/**
 * Converts a Z-score to a 0-100 attribute centered at base with scale factor
 */
function zToRating(zScore: number, base = 50, scale = 16): number {
  return clamp(base + zScore * scale);
}

/**
 * Calculates all 5 categories of granular attributes (0-100) for a player.
 */
export function calculatePlayerAttributes(input: AttributeCalculationInput): PlayerAttributes {
  const { primaryRole, bowlingStyle, isWicketkeeper, historicalEra, formatStats, eraMetrics } = input;

  let totalInningsBatted = 0;
  let totalBallsBowled = 0;
  let totalWickets = 0;
  let totalCatches = 0;
  let totalStumpings = 0;
  let weightedBatAvgZ = 0;
  let weightedStrikeRateZ = 0;
  let weightedBowlAvgZ = 0;
  let weightedEconZ = 0;
  let totalBatWeight = 0;
  let totalBowlWeight = 0;

  for (const format of Object.keys(formatStats) as MatchFormat[]) {
    const stats = formatStats[format];
    const era = eraMetrics[format];
    if (stats) {
      totalInningsBatted += stats.inningsBatted;
      totalBallsBowled += stats.ballsBowled;
      totalWickets += stats.wicketsTaken;
      totalCatches += stats.catchesTaken;
      totalStumpings += stats.stumpingsMade;

      if (era) {
        const wBat = stats.inningsBatted;
        if (wBat > 0) {
          weightedBatAvgZ += era.battingAvgZScore * wBat;
          weightedStrikeRateZ += era.strikeRateZScore * wBat;
          totalBatWeight += wBat;
        }

        const wBowl = stats.ballsBowled;
        if (wBowl > 0) {
          weightedBowlAvgZ += era.bowlingAvgZScore * wBowl;
          weightedEconZ += era.economyZScore * wBowl;
          totalBowlWeight += wBowl;
        }
      }
    }
  }

  const avgBatZ = totalBatWeight > 0 ? weightedBatAvgZ / totalBatWeight : 0;
  const avgSrZ = totalBatWeight > 0 ? weightedStrikeRateZ / totalBatWeight : 0;
  const avgBowlZ = totalBowlWeight > 0 ? weightedBowlAvgZ / totalBowlWeight : 0;
  const avgEconZ = totalBowlWeight > 0 ? weightedEconZ / totalBowlWeight : 0;

  const batConfidence = calculateBayesianConfidence('TEST_RED_BALL', totalInningsBatted);
  const bowlConfidence = calculateBayesianConfidence('TEST_RED_BALL', Math.floor(totalBallsBowled / 6));

  const isBatter =
    primaryRole === 'TOP_ORDER_BATTER' ||
    primaryRole === 'MIDDLE_ORDER_BATTER' ||
    primaryRole === 'WICKETKEEPER_BATTER' ||
    primaryRole === 'BATTING_ALL_ROUNDER';

  const isBowler =
    primaryRole === 'PACE_BOWLER' ||
    primaryRole === 'SPIN_BOWLER' ||
    primaryRole === 'BOWLING_ALL_ROUNDER';

  const isPacer =
    bowlingStyle === 'RIGHT_ARM_FAST' ||
    bowlingStyle === 'RIGHT_ARM_FAST_MEDIUM' ||
    bowlingStyle === 'LEFT_ARM_FAST' ||
    bowlingStyle === 'LEFT_ARM_FAST_MEDIUM';

  const isSpinner =
    bowlingStyle === 'RIGHT_ARM_OFF_BREAK' ||
    bowlingStyle === 'RIGHT_ARM_LEG_BREAK' ||
    bowlingStyle === 'LEFT_ARM_ORTHODOX' ||
    bowlingStyle === 'LEFT_ARM_UNORTHODOX';

  // Era-specific playstyle modifiers (e.g. pre-1971 players had pure ground placement, minimal aerial hitting)
  const isPreWhiteBallEra =
    historicalEra === 'GOLDEN_AGE_PRE_1914' ||
    historicalEra === 'INTERWAR_1919_1939' ||
    historicalEra === 'POST_WAR_1946_1970';

  // Wicket longevity bonus for elite career bowlers (e.g. 500+ Test wickets)
  const bowlerVolumeBonus = isBowler ? Math.min(12, (totalWickets / 100) * 2.0) : 0;
  // Batter longevity bonus for elite career run-scorers
  const batterVolumeBonus = isBatter ? Math.min(8, (totalInningsBatted / 50) * 2.0) : 0;

  // --- Category A: Batting (12 attributes) ---
  const batBase = isBatter ? 72 : 40;
  const rawTechnique = zToRating(avgBatZ, batBase + batterVolumeBonus, 14);
  const rawTiming = zToRating(avgBatZ * 0.7 + avgSrZ * 0.3, batBase + batterVolumeBonus, 14);
  const rawPower = isPreWhiteBallEra
    ? clamp(zToRating(avgSrZ, 56, 10) - 6) // Pre-white-ball ground stroke play
    : zToRating(avgSrZ, isBatter ? 68 : 38, 16);
  const rawStrikeRotation = zToRating(avgBatZ * 0.5 + avgSrZ * 0.5, isBatter ? 68 : 38, 12);
  const rawDefensiveAbility = zToRating(avgBatZ, batBase + batterVolumeBonus, 15);
  const rawAgainstPace = clamp(rawTechnique + (isBatter ? 2 : -5));
  const rawAgainstSpin = clamp(rawTiming + (isBatter ? 3 : -4));
  const rawShortBall = clamp(rawTechnique * 0.6 + rawPower * 0.4);
  const rawYorkerHandling = clamp(rawTechnique * 0.7 + rawDefensiveAbility * 0.3);
  const rawDeathBatting = isPreWhiteBallEra
    ? clamp(rawTiming * 0.45 + rawPower * 0.30)
    : clamp(rawPower * 0.6 + rawTiming * 0.4);
  const rawPowerplayBatting = isPreWhiteBallEra
    ? clamp(rawTiming * 0.55 + rawTechnique * 0.30)
    : clamp(rawTiming * 0.5 + rawPower * 0.5);
  const rawRunning = clamp(55 + (isBatter ? 15 : 5));

  // Apply Bayesian Shrinkage on batting
  const cBat = batConfidence.confidenceScore;
  const pBat = avgBatZ > 2.5 ? 80 : COHORT_PRIOR_DEFAULTS.BATTING_ATTRIBUTE;
  const technique = applyBayesianShrinkage(rawTechnique, cBat, pBat);
  const timing = applyBayesianShrinkage(rawTiming, cBat, pBat);
  const power = applyBayesianShrinkage(rawPower, cBat, pBat);
  const strikeRotation = applyBayesianShrinkage(rawStrikeRotation, cBat, pBat);
  const defensiveAbility = applyBayesianShrinkage(rawDefensiveAbility, cBat, pBat);
  const againstPace = applyBayesianShrinkage(rawAgainstPace, cBat, pBat);
  const againstSpin = applyBayesianShrinkage(rawAgainstSpin, cBat, pBat);
  const shortBallHandling = applyBayesianShrinkage(rawShortBall, cBat, pBat);
  const yorkerHandling = applyBayesianShrinkage(rawYorkerHandling, cBat, pBat);
  const deathOverBatting = applyBayesianShrinkage(rawDeathBatting, cBat, pBat);
  const powerplayBatting = applyBayesianShrinkage(rawPowerplayBatting, cBat, pBat);
  const runningBetweenWickets = applyBayesianShrinkage(rawRunning, cBat, pBat);

  // --- Category B: Bowling (12 attributes) ---
  const bowlBase = isBowler ? 72 : 30;
  const rawLineAndLength = zToRating(
    avgBowlZ * 0.6 + avgEconZ * 0.4,
    bowlBase + bowlerVolumeBonus,
    14
  );
  const rawPaceOrSpin = zToRating(avgBowlZ, bowlBase + bowlerVolumeBonus, 15);
  const rawSwingOrDrift = isPacer
    ? clamp(rawPaceOrSpin + 4)
    : isSpinner
      ? clamp(rawPaceOrSpin + 2)
      : clamp(rawLineAndLength - 10);
  const rawSeamOrTurn = isSpinner
    ? clamp(rawPaceOrSpin + 6)
    : isPacer
      ? clamp(rawPaceOrSpin + 3)
      : clamp(rawLineAndLength - 10);
  const rawAccuracy = zToRating(avgEconZ, bowlBase + bowlerVolumeBonus, 13);
  const rawVariation = isSpinner
    ? clamp(rawPaceOrSpin + 5)
    : isBowler
      ? clamp(rawAccuracy + 2)
      : 25;
  const rawYorker = isPacer ? clamp(rawLineAndLength + 4) : clamp(rawLineAndLength - 15);
  const rawSlowerBall = isPacer ? clamp(rawAccuracy + 3) : 20;
  const rawBouncer = isPacer ? clamp(rawPaceOrSpin + 5) : 15;
  const rawDeathBowling = clamp(rawLineAndLength * 0.4 + rawAccuracy * 0.4 + rawYorker * 0.2);
  const rawNewBall = isPacer
    ? clamp(rawSwingOrDrift * 0.5 + rawLineAndLength * 0.5 + 4)
    : clamp(rawAccuracy);
  const rawStamina = isBowler ? clamp(72 + Math.min(22, totalBallsBowled / 1000)) : 45;

  // Apply Bayesian Shrinkage on bowling
  const cBowl = isBowler ? bowlConfidence.confidenceScore : 0.2;
  const pBowl = avgBowlZ > 2.0 ? 70 : isBowler ? 50 : 25;
  const lineAndLength = applyBayesianShrinkage(rawLineAndLength, cBowl, pBowl);
  const paceOrSpinExecution = applyBayesianShrinkage(rawPaceOrSpin, cBowl, pBowl);
  const swingOrDrift = applyBayesianShrinkage(rawSwingOrDrift, cBowl, pBowl);
  const seamOrTurn = applyBayesianShrinkage(rawSeamOrTurn, cBowl, pBowl);
  const accuracy = applyBayesianShrinkage(rawAccuracy, cBowl, pBowl);
  const variation = applyBayesianShrinkage(rawVariation, cBowl, pBowl);
  const yorkerExecution = applyBayesianShrinkage(rawYorker, cBowl, pBowl);
  const slowerBallExecution = applyBayesianShrinkage(rawSlowerBall, cBowl, pBowl);
  const bouncerExecution = applyBayesianShrinkage(rawBouncer, cBowl, pBowl);
  const deathOverBowling = applyBayesianShrinkage(rawDeathBowling, cBowl, pBowl);
  const newBallEffectiveness = applyBayesianShrinkage(rawNewBall, cBowl, pBowl);
  const stamina = applyBayesianShrinkage(rawStamina, cBowl, pBowl);

  // --- Category C: Fielding (7 attributes) ---
  const rawCatching = clamp(58 + Math.min(28, totalCatches * 0.3));
  const rawReflexes = isWicketkeeper ? 88 : clamp(62 + (isBatter ? 8 : 4));
  const rawGroundFielding = clamp(62 + (isWicketkeeper ? 15 : 0));
  const rawThrowingAccuracy = clamp(60 + (isBowler ? 5 : 8));
  const rawThrowingPower = clamp(isPacer ? 78 : 64);
  const rawWicketkeeping = isWicketkeeper ? clamp(84 + Math.min(14, totalStumpings * 0.8)) : 20;
  const rawAthleticism = clamp(64 + (isWicketkeeper ? 10 : 0));

  const cField = Math.min(1.0, (totalInningsBatted + Math.floor(totalBallsBowled / 6)) / 80);
  const pField = COHORT_PRIOR_DEFAULTS.FIELDING_ATTRIBUTE;
  const catching = applyBayesianShrinkage(rawCatching, cField, pField);
  const reflexes = isWicketkeeper ? rawReflexes : applyBayesianShrinkage(rawReflexes, cField, pField);
  const groundFielding = applyBayesianShrinkage(rawGroundFielding, cField, pField);
  const throwingAccuracy = applyBayesianShrinkage(rawThrowingAccuracy, cField, pField);
  const throwingPower = applyBayesianShrinkage(rawThrowingPower, cField, pField);
  const wicketkeeping = isWicketkeeper ? rawWicketkeeping : 20;
  const athleticism = applyBayesianShrinkage(rawAthleticism, cField, pField);

  // --- Category D: Temperament (5 attributes) ---
  const matchesCount = totalInningsBatted + Math.floor(totalBallsBowled / 200);
  const experienceBoost = Math.min(20, matchesCount * 0.15);
  const pressureHandling = clamp(58 + experienceBoost + (avgBatZ > 1.5 || avgBowlZ > 1.5 ? 12 : 0));
  const consistency = clamp(54 + experienceBoost * 0.8 + Math.max(-10, Math.min(15, avgBatZ * 5)));
  const matchAwareness = clamp(60 + experienceBoost);
  const bigMatchTemperament = clamp(pressureHandling + 2);
  const recoveryResilience = clamp(56 + experienceBoost * 0.6);

  // --- Category E: Adaptability (4 attributes) ---
  const formatCount = Object.keys(formatStats).length;
  const formatAdaptability = clamp(48 + formatCount * 12);
  const pitchAdaptability = clamp(54 + (avgBatZ > 1.0 || avgBowlZ > 1.0 ? 15 : 0));
  const weatherAdaptability = clamp(52 + experienceBoost * 0.5);
  const homeVsAwayNeutrality = clamp(54 + experienceBoost * 0.5);

  return {
    technique,
    timing,
    power,
    strikeRotation,
    defensiveAbility,
    againstPace,
    againstSpin,
    shortBallHandling,
    yorkerHandling,
    deathOverBatting,
    powerplayBatting,
    runningBetweenWickets,

    lineAndLength,
    paceOrSpinExecution,
    swingOrDrift,
    seamOrTurn,
    accuracy,
    variation,
    yorkerExecution,
    slowerBallExecution,
    bouncerExecution,
    deathOverBowling,
    newBallEffectiveness,
    stamina,

    catching,
    reflexes,
    groundFielding,
    throwingAccuracy,
    throwingPower,
    wicketkeeping,
    athleticism,

    pressureHandling,
    consistency,
    matchAwareness,
    bigMatchTemperament,
    recoveryResilience,

    formatAdaptability,
    pitchAdaptability,
    weatherAdaptability,
    homeVsAwayNeutrality,

    ratingVersion: RATING_ENGINE_VERSION,
  };
}
