import type { MatchFormat, PrimaryRole, BowlingStyle, DreamTeamStatus, BattingHand } from './enums.js';
import type { PlayerFormatRating } from './player.js';

export type SquadValidationSeverity = 'HARD_ERROR' | 'ADVISORY_WARNING';

export type SquadValidationCode =
  | 'SQUAD_SIZE_INVALID'
  | 'DUPLICATE_PLAYER'
  | 'DUPLICATE_BATTING_ORDER'
  | 'INVALID_BATTING_ORDER_RANGE'
  | 'BATTING_ORDER_GAPS'
  | 'MISSING_WICKETKEEPER'
  | 'MULTIPLE_WICKETKEEPERS'
  | 'INSUFFICIENT_BOWLING_RESOURCES'
  | 'MISSING_FORMAT_RATING'
  | 'NO_CAPTAIN_DESIGNATED'
  | 'MULTIPLE_CAPTAINS_DESIGNATED'
  | 'TOP_ORDER_DEFICIT'
  | 'INSUFFICIENT_SPIN_OPTIONS'
  | 'INSUFFICIENT_PACE_OPTIONS'
  | 'TAIL_TOO_LONG';

export interface SquadValidationIssue {
  readonly code: SquadValidationCode;
  readonly message: string;
  readonly severity: SquadValidationSeverity;
  readonly playerId?: string;
  readonly battingOrder?: number;
  readonly suggestedCorrection?: string;
}

export interface SquadValidationResult {
  readonly isValid: boolean;
  readonly isMatchReady: boolean;
  readonly errors: readonly SquadValidationIssue[];
  readonly warnings: readonly SquadValidationIssue[];
  readonly summary: {
    readonly playerCount: number;
    readonly keeperCount: number;
    readonly bowlerCount: number;
    readonly captainCount: number;
  };
}

export interface DreamTeamPlayerSlotInput {
  readonly playerId: string;
  readonly battingOrder: number; // 1 to 11
  readonly isCaptain?: boolean;
  readonly isViceCaptain?: boolean;
  readonly isDesignatedWicketkeeper?: boolean;
  readonly bowlingPriority?: number | null;
}

export interface DreamTeamCreationInput {
  readonly teamName: string;
  readonly description?: string;
  readonly format: MatchFormat;
  readonly badgeIcon?: string;
  readonly primaryColor?: string;
  readonly secondaryColor?: string;
  readonly lineup: readonly DreamTeamPlayerSlotInput[];
}

export interface PlayerSquadContext {
  readonly id: string;
  readonly fullName: string;
  readonly displayName: string;
  readonly primaryRole: PrimaryRole;
  readonly battingHand: BattingHand;
  readonly bowlingStyle: BowlingStyle;
  readonly isWicketkeeper: boolean;
  readonly formatRating?: PlayerFormatRating;
  readonly ratings?: Partial<Record<MatchFormat, PlayerFormatRating>>;
}

export type SquadDimensionGrade = 'ELITE' | 'STRONG' | 'BALANCED' | 'VULNERABLE' | 'CRITICAL';

export interface SquadDimensionScore {
  readonly code: string;
  readonly name: string;
  readonly score: number; // 0 to 100
  readonly grade: SquadDimensionGrade;
  readonly description: string;
}

export interface SquadAnalyticsResult {
  readonly overallBalance: number;
  readonly dimensions: {
    readonly battingStrength: SquadDimensionScore;
    readonly paceThreat: SquadDimensionScore;
    readonly spinThreat: SquadDimensionScore;
    readonly bowlingDepth: SquadDimensionScore;
    readonly fieldingStrength: SquadDimensionScore;
    readonly allRounderBalance: SquadDimensionScore;
    readonly lowerOrderBatting: SquadDimensionScore;
    readonly overallSquadBalance: SquadDimensionScore;
  };
  readonly summary: string;
}
