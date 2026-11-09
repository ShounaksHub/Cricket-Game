import type { MatchFormat } from './enums.js';

export interface PowerplayConfig {
  readonly phaseName: string;
  readonly startOver: number; // 1-indexed (e.g. 1)
  readonly endOver: number; // 1-indexed (e.g. 6)
  readonly maxFieldersOutsideCircle: number;
}

export interface TestSessionConfig {
  readonly sessionNumber: number; // e.g. 1, 2, 3
  readonly sessionName: string; // e.g. "Morning", "Afternoon", "Evening" or "Twilight"
  readonly scheduledDurationMinutes: number; // e.g. 120
  readonly scheduledMinimumOvers: number; // e.g. 30
  readonly intervalAfterSession?: {
    readonly intervalName: string; // e.g. "Lunch", "Tea", "Dinner"
    readonly durationMinutes: number; // e.g. 40, 20
  };
}

/**
 * Configurable Test Match Scheduling (Safeguard 3)
 * Supports non-standard 4-day Tests, modified session counts, or timeless historical fixtures.
 */
export interface TestMatchScheduleConfig {
  readonly scheduledDays: number; // Standard 5, or 4 for ICC 4-day tests
  readonly scheduledDailyOvers: number; // Standard 90, or 98 for 4-day tests
  readonly sessionsPerDay: number; // Standard 3
  readonly sessions: readonly TestSessionConfig[];
  readonly followOnDeficit: number; // Standard 200 for 5-day; 150 for 4-day; 100 for 2-day
  readonly newBallOverThreshold: number; // Standard 80 overs
  readonly allowDeclarations: boolean;
  readonly allowEnforceFollowOn: boolean;
}

/**
 * Comprehensive Versioned Ruleset Specification
 */
export interface CricketRuleset {
  readonly rulesetId: string;
  readonly format: MatchFormat;
  readonly version: string;
  readonly maxOversPerInnings?: number; // None for Test
  readonly maxOversPerBowler?: number; // None for Test
  readonly inningsPerTeam: number; // 1 for limited overs, 2 for Test
  readonly isMultiday: boolean;
  readonly powerplays: readonly PowerplayConfig[];
  readonly testScheduleConfig?: TestMatchScheduleConfig;
  readonly frontFootNoBallFreeHit: boolean;
  readonly superOverEnabled: boolean;
  readonly maxConsecutiveSuperOvers: number;
  readonly drsReviewsPerInnings: number;
  readonly allowsConcussionSubstitutes: boolean;
}
