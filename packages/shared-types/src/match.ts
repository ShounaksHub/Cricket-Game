import type {
  DifficultyLevel,
  DismissalType,
  ExtraType,
  MatchFormat,
  MatchStatus,
  TossDecision,
} from './enums.js';
import type { PlayerAttributes, PlayerFormatRating } from './player.js';

export interface DreamTeamParticipant {
  readonly teamName: string;
  readonly isAi: boolean;
  readonly dreamTeamId?: string;
  readonly captainPlayerId: string;
  readonly wicketkeeperPlayerId: string;
  readonly lineup: readonly {
    readonly playerId: string;
    readonly battingOrder: number; // 1 to 11
    readonly isCaptain: boolean;
    readonly isWicketkeeper: boolean;
    readonly bowlingPriority?: number;
    readonly snapshotRating: PlayerFormatRating;
    readonly snapshotAttributes: PlayerAttributes;
  }[];
}

export interface FallOfWicket {
  readonly wicketNumber: number; // 1 to 10
  readonly runsAtFall: number;
  readonly oversAtFall: number;
  readonly dismissedPlayerId: string;
}

export interface Partnership {
  readonly player1Id: string;
  readonly player2Id: string;
  readonly runs: number;
  readonly balls: number;
}

export interface DeliveryState {
  readonly ballInOver: number; // 1 to 6
  readonly deliverySequenceNumber: number; // Monotonic ball counter
  readonly bowlerPlayerId: string;
  readonly strikerPlayerId: string;
  readonly nonStrikerPlayerId: string;
  readonly runsOffBat: number;
  readonly extrasRuns: number;
  readonly extraType: ExtraType;
  readonly isWicket: boolean;
  readonly dismissalType: DismissalType;
  readonly dismissedPlayerId?: string;
  readonly fielderPlayerId?: string;
  readonly commentaryText?: string;
  readonly telemetry?: {
    readonly pitchLandingX: number;
    readonly pitchLandingY: number;
    readonly shotAngleDegrees: number;
    readonly shotDistanceMeters: number;
    readonly shotLoftAngle: number;
  };
}

export interface OverState {
  readonly overNumber: number; // 0-indexed
  readonly bowlerPlayerId: string;
  readonly runsConceded: number;
  readonly wicketsLost: number;
  readonly isMaiden: boolean;
  readonly deliveries: readonly DeliveryState[];
}

export interface BattingScorecardRow {
  readonly playerId: string;
  readonly battingPosition: number;
  readonly runs: number;
  readonly ballsFaced: number;
  readonly fours: number;
  readonly sixes: number;
  readonly strikeRate: number;
  readonly dismissalType: DismissalType;
  readonly bowlerPlayerId?: string;
  readonly fielderPlayerId?: string;
  readonly dotBalls: number;
}

export interface BowlingScorecardRow {
  readonly playerId: string;
  readonly oversBowled: number;
  readonly legalBalls: number;
  readonly maidens: number;
  readonly runsConceded: number;
  readonly wickets: number;
  readonly economyRate: number;
  readonly wides: number;
  readonly noBalls: number;
  readonly dotBalls: number;
}

export interface InningsState {
  readonly inningsNumber: number; // 1 to 4
  readonly battingTeamId: string;
  readonly bowlingTeamId: string;
  readonly totalRuns: number;
  readonly totalWickets: number;
  readonly completedOvers: number;
  readonly legalBallsInCurrentOver: number;
  readonly byes: number;
  readonly legByes: number;
  readonly wides: number;
  readonly noBalls: number;
  readonly penaltyRuns: number;
  readonly targetRuns?: number;
  readonly leadOrDeficit: number;
  readonly isFollowOn: boolean;
  readonly isDeclared: boolean;
  readonly isCompleted: boolean;
  readonly strikerPlayerId: string;
  readonly nonStrikerPlayerId: string;
  readonly currentBowlerPlayerId: string;
  readonly overs: readonly OverState[];
  readonly fallOfWickets: readonly FallOfWicket[];
  readonly battingScorecards: readonly BattingScorecardRow[];
  readonly bowlingScorecards: readonly BowlingScorecardRow[];
}

export interface MatchResultSummary {
  readonly winningTeamId?: string;
  readonly isTie: boolean;
  readonly isDraw: boolean;
  readonly winMarginRuns?: number;
  readonly winMarginWickets?: number;
  readonly isInningsWin: boolean;
  readonly playerOfTheMatchId: string;
  readonly summaryStatement: string;
}

/**
 * Universal Multi-Format Authoritative Match State
 * Native support for T10, T20, ODI, Test Red Ball, and Test Pink Ball.
 */
export interface MatchState {
  readonly matchId: string;
  readonly format: MatchFormat;
  readonly rulesetId: string;
  readonly seed: bigint;
  readonly simulationVersion: string;
  readonly rulesetVersion: string;
  readonly ratingVersion: string;
  readonly initialStateHash: string;
  readonly status: MatchStatus;
  readonly difficulty: DifficultyLevel;

  // Toss
  readonly tossWinnerTeamId?: string;
  readonly tossDecision?: TossDecision;

  // Multi-Innings & Test Session State
  readonly currentInningsIndex: number; // 0 to 3
  readonly innings: readonly InningsState[];
  readonly currentDayNumber: number; // 1 to 5 (Test)
  readonly currentSessionNumber: number; // 1 to 3 (Test)
  readonly oversRemainingToday: number;
  readonly isFollowOnEnforced: boolean;

  // Stadium & Atmospheric Wear State
  readonly stadiumId: string;
  readonly pitchProfileId: string;
  readonly pitchWearIndex: number; // 0.00 to 1.00
  readonly surfaceCracksIndex: number; // 0.00 to 1.00
  readonly ambientTemperatureCelsius: number;
  readonly humidityPercentage: number;
  readonly cloudCoverPercentage: number;
  readonly dewFactor: number;

  readonly participants: {
    readonly userTeam: DreamTeamParticipant;
    readonly opponentTeam: DreamTeamParticipant;
  };

  readonly result?: MatchResultSummary;
}
