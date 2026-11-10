import type {
  BattingHand,
  BowlingStyle,
  CareerCategory,
  ConfidenceTier,
  HistoricalEra,
  MatchFormat,
  PrimaryRole,
} from './enums.js';
import type { DataSourceProvenance, PlayerVisualAsset } from './provenance.js';

/**
 * Core Player Identity
 */
export interface PlayerIdentity {
  readonly id: string;
  readonly cricsheetId?: string;
  readonly wikidataId?: string;
  readonly fullName: string;
  readonly displayName: string;
  readonly dateOfBirth?: string;
  readonly primaryNationality: string;
  readonly primaryRole: PrimaryRole;
  readonly secondaryRole?: string;
  readonly battingHand: BattingHand;
  readonly bowlingStyle: BowlingStyle;
  readonly isWicketkeeper: boolean;
  readonly historicalEra: HistoricalEra;
  readonly careerDebutYear: number;
  readonly careerRetirementYear?: number;
  readonly isActive: boolean;
  readonly careerCategory?: CareerCategory;
  readonly isDomesticOnly?: boolean;
  readonly competitions?: readonly string[];
  readonly confidenceScore: number; // 0.0 to 1.0
  readonly visualAsset?: PlayerVisualAsset;
  readonly provenance: DataSourceProvenance;
}

/**
 * Layer 1: Raw Format-Specific Career Statistics
 * Unaltered real-world figures. Missing historical fields are explicitly null.
 */
export interface PlayerRawFormatStats {
  readonly format: MatchFormat;
  readonly matchesPlayed: number;
  readonly inningsBatted: number;
  readonly runsScored: number;
  readonly highestScore: number;
  readonly isHighestScoreNotOut: boolean;
  readonly battingAverage: number | null;
  readonly strikeRate: number | null;
  readonly centuries: number;
  readonly halfCenturies: number;
  readonly fours: number | null;
  readonly sixes: number | null;
  readonly ballsBowled: number;
  readonly runsConceded: number;
  readonly wicketsTaken: number;
  readonly bowlingAverage: number | null;
  readonly economyRate: number | null;
  readonly bowlingStrikeRate: number | null;
  readonly fiveWicketHauls: number;
  readonly catchesTaken: number;
  readonly stumpingsMade: number;
  readonly dataSourceId: string;
}

/**
 * Layer 2: Era-Adjusted Metrics
 * Normalized against contemporary 10-year peer cohorts.
 */
export interface PlayerEraMetrics {
  readonly format: MatchFormat;
  readonly eraBracket: HistoricalEra;
  readonly battingAvgZScore: number;
  readonly strikeRateZScore: number;
  readonly bowlingAvgZScore: number;
  readonly economyZScore: number;
  readonly eraPerformanceRatio: number;
  readonly peerCohortMeanBattingAvg: number;
  readonly peerCohortStdBattingAvg: number;
  readonly peerCohortMeanBowlingAvg: number;
  readonly peerCohortStdBowlingAvg: number;
  readonly normalizationVersion: string;
}

/**
 * Layer 3 & 4: 5-Factor Granular Attributes (0-100)
 */
export interface PlayerAttributes {
  // Batting (0-100)
  readonly technique: number;
  readonly timing: number;
  readonly power: number;
  readonly strikeRotation: number;
  readonly defensiveAbility: number;
  readonly againstPace: number;
  readonly againstSpin: number;
  readonly shortBallHandling: number;
  readonly yorkerHandling: number;
  readonly deathOverBatting: number;
  readonly powerplayBatting: number;
  readonly runningBetweenWickets: number;

  // Bowling (0-100)
  readonly lineAndLength: number;
  readonly paceOrSpinExecution: number;
  readonly swingOrDrift: number;
  readonly seamOrTurn: number;
  readonly accuracy: number;
  readonly variation: number;
  readonly yorkerExecution: number;
  readonly slowerBallExecution: number;
  readonly bouncerExecution: number;
  readonly deathOverBowling: number;
  readonly newBallEffectiveness: number;
  readonly stamina: number;

  // Fielding (0-100)
  readonly catching: number;
  readonly reflexes: number;
  readonly groundFielding: number;
  readonly throwingAccuracy: number;
  readonly throwingPower: number;
  readonly wicketkeeping: number;
  readonly athleticism: number;

  // Temperament (0-100)
  readonly pressureHandling: number;
  readonly consistency: number;
  readonly matchAwareness: number;
  readonly bigMatchTemperament: number;
  readonly recoveryResilience: number;

  // Adaptability (0-100)
  readonly formatAdaptability: number;
  readonly pitchAdaptability: number;
  readonly weatherAdaptability: number;
  readonly homeVsAwayNeutrality: number;

  readonly ratingVersion: string;
}

/**
 * Format-Specific Composite Ratings with Explainability Breakdown
 */
export interface PlayerFormatRating {
  readonly format: MatchFormat;
  readonly overallRating: number;
  readonly battingRating: number;
  readonly bowlingRating: number;
  readonly fieldingRating: number;
  readonly confidenceTier: ConfidenceTier;
  readonly confidenceScore: number; // 0.00 to 1.00
  readonly ratingVersion: string;
  readonly explainability: {
    readonly rawPrimaryMetric: string;
    readonly eraPeerBaseline: string;
    readonly sampleSizeInnings: number;
    readonly shrinkageApplied: number;
  };
}

/**
 * Complete Aggregated Player Profile
 */
export interface PlayerProfile extends PlayerIdentity {
  readonly formatStats: Partial<Record<MatchFormat, PlayerRawFormatStats>>;
  readonly eraMetrics: Partial<Record<MatchFormat, PlayerEraMetrics>>;
  readonly attributes: PlayerAttributes;
  readonly ratings: Partial<Record<MatchFormat, PlayerFormatRating>>;
}
