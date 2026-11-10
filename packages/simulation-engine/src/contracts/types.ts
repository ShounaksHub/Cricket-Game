import type {
  MatchFormat,
  PrimaryRole,
  BattingHand,
  BowlingStyle,
  DreamTeamPlayerSlotInput,
  PlayerSquadContext,
} from '@cricket/shared-types';

export type MatchStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'INNINGS_BREAK'
  | 'STUMPS'
  | 'COMPLETED';

export type DeliveryOutcome =
  | 'DOT'
  | 'RUN_1'
  | 'RUN_2'
  | 'RUN_3'
  | 'FOUR'
  | 'SIX'
  | 'WIDE'
  | 'NO_BALL'
  | 'LEG_BYE'
  | 'BYE'
  | 'WICKET';

export type DismissalMode =
  | 'BOWLED'
  | 'CAUGHT'
  | 'CAUGHT_BEHIND'
  | 'LBW'
  | 'RUN_OUT'
  | 'STUMPED'
  | 'HIT_WICKET';

export type BatterIntent =
  | 'DEFEND'
  | 'ROTATE_STRIKE'
  | 'BALANCED'
  | 'AGGRESSIVE'
  | 'MAXIMUM_POWER';

export type BowlingLine = 'OUTSIDE_OFF' | 'STUMPS' | 'DOWN_LEG';

export type BowlingLength =
  | 'YORKER'
  | 'FULL'
  | 'GOOD_LENGTH'
  | 'BACK_OF_LENGTH'
  | 'SHORT';

export type BowlingVariation =
  | 'STOCK'
  | 'SLOWER_BALL'
  | 'BOUNCER'
  | 'GOOGLY'
  | 'ARM_BALL'
  | 'FLIPPER'
  | 'CUTTER';

export type BowlingPaceStrategy =
  | 'FULL_PACE'
  | 'CONTROLLED'
  | 'EFFORT_BALL'
  | 'VARIATION_FOCUS'
  | 'CONSERVE';

export type BowlingIntent =
  | 'ATTACKING'
  | 'CONTAINMENT'
  | 'BALANCED'
  | 'WICKET_TAKING'
  | 'DEFENSIVE';

export type FieldPreset =
  | 'ATTACKING_CLOSE_CATCHERS'
  | 'BALANCED_RING'
  | 'DEATH_BOUNDARY_DEFENSE'
  | 'SPIN_CHOKE';

export interface TacticalDeliveryAction {
  readonly batterIntent: BatterIntent;
  readonly bowlerLine: BowlingLine;
  readonly bowlerLength: BowlingLength;
  readonly bowlerVariation: BowlingVariation;
  readonly fieldPreset: FieldPreset;
  readonly bowlingPaceStrategy?: BowlingPaceStrategy;
  readonly bowlingIntent?: BowlingIntent;
  readonly nextBowlerPlayerId?: string;
  readonly takeNewBall?: boolean;
  readonly declareInnings?: boolean;
  readonly enforceFollowOn?: boolean;
}

export interface Trajectory2D {
  readonly angleDegrees: number; // 0 to 360
  readonly elevationDegrees: number; // 0 to 85
  readonly distanceMeters: number;
  readonly isGroundStroke: boolean;
  readonly isAirborne: boolean;
}

export interface DeliveryExtras {
  readonly wides: number;
  readonly noBalls: number;
  readonly byes: number;
  readonly legByes: number;
  readonly penalty: number;
}

export interface DeliveryDismissal {
  readonly mode: DismissalMode;
  readonly dismissedPlayerId: string;
  readonly bowlerPlayerId: string;
  readonly fielderPlayerId?: string;
  readonly fielderRole?: 'WICKETKEEPER' | 'SLIP' | 'GULLY' | 'OUTFIELDER' | 'BOWLER';
}

export interface DeliveryEvent {
  readonly sequenceNumber: number; // 1-based monotonic event sequence
  readonly inningsNumber: number;
  readonly overNumber: number; // 0-based over index
  readonly ballInOver: number; // 1 to 6
  readonly isLegalDelivery: boolean;
  readonly bowlerPlayerId: string;
  readonly strikerPlayerId: string;
  readonly nonStrikerPlayerId: string;
  readonly outcome: DeliveryOutcome;
  readonly runsBat: number;
  readonly extras: DeliveryExtras;
  readonly dismissal?: DeliveryDismissal;
  readonly trajectory?: Trajectory2D;
  readonly commentary: string;
  readonly scorecardDelta: {
    readonly totalRuns: number;
    readonly totalWickets: number;
  };
}

export interface BatterScorecardEntry {
  readonly playerId: string;
  readonly runs: number;
  readonly ballsFaced: number;
  readonly fours: number;
  readonly sixes: number;
  readonly strikeRate: number;
  readonly isOut: boolean;
  readonly dismissal?: DeliveryDismissal;
}

export interface BowlerScorecardEntry {
  readonly playerId: string;
  readonly ballsBowled: number; // Total legal deliveries
  readonly oversBowledFormatted: string; // e.g. "3.4"
  readonly maidens: number;
  readonly runsConceded: number;
  readonly wickets: number;
  readonly economyRate: number;
  readonly wides: number;
  readonly noBalls: number;
  readonly dots: number;
}

export interface FallOfWicket {
  readonly wicketNumber: number;
  readonly teamRuns: number;
  readonly oversElapsed: string;
  readonly dismissedPlayerId: string;
}

export interface InningsState {
  readonly inningsNumber: number; // 1 to 4
  readonly battingTeamId: string;
  readonly bowlingTeamId: string;
  readonly totalRuns: number;
  readonly totalWickets: number;
  readonly completedOvers: number;
  readonly legalBallsInCurrentOver: number;
  readonly strikerPlayerId: string;
  readonly nonStrikerPlayerId: string;
  readonly currentBowlerPlayerId: string;
  readonly targetRuns?: number;
  readonly leadOrDeficit: number;
  readonly isFollowOn: boolean;
  readonly isDeclared: boolean;
  readonly isCompleted: boolean;
  readonly isFreeHit: boolean;
  readonly batters: ReadonlyMap<string, BatterScorecardEntry>;
  readonly bowlers: ReadonlyMap<string, BowlerScorecardEntry>;
  readonly fallOfWickets: readonly FallOfWicket[];
  readonly events: readonly DeliveryEvent[];
}

export interface SimulationVersionTriad {
  readonly simulationVersion: 'sim-1.0.0';
  readonly rulesetVersion: string;
  readonly ratingVersion: 'rate-1.0.0';
}

export interface EnvironmentalConditions {
  readonly ambientTemperatureC: number;
  readonly humidityPercentage: number;
  readonly cloudCoverPercentage: number;
  readonly dewFactor: number;
}

export interface MatchSimulationConfig {
  readonly matchId: string;
  readonly format: MatchFormat;
  readonly seed: bigint;
  readonly versions: SimulationVersionTriad;
  readonly stadiumId: string;
  readonly pitchType: 'FLAT' | 'GREEN' | 'DUSTY' | 'HARD' | 'TURNING';
  readonly conditions: EnvironmentalConditions;
  readonly team1: {
    readonly id: string;
    readonly name: string;
    readonly lineup: readonly DreamTeamPlayerSlotInput[];
  };
  readonly team2: {
    readonly id: string;
    readonly name: string;
    readonly lineup: readonly DreamTeamPlayerSlotInput[];
  };
  readonly playerProfiles: ReadonlyMap<string, PlayerSquadContext>;
}

export interface MatchState {
  readonly config: MatchSimulationConfig;
  readonly initialStateHash: string;
  readonly status: MatchStatus;
  readonly currentInningsIndex: number; // 0 to 3
  readonly innings: readonly InningsState[];
  readonly pitchWearIndex: number; // 0.0 to 1.0
  readonly surfaceCracksIndex: number; // 0.0 to 1.0
  readonly ballWearIndex: number; // 0.0 to 1.0
  readonly currentDayNumber?: number; // 1 to 5 (Test)
  readonly currentSessionNumber?: number; // 1 to 3 (Test)
  readonly sessionOversBowled?: number; // 0 to 30 (Test)
  readonly sessionElapsedMinutes?: number; // Playing time in current session
  readonly isAdditionalTimeActive?: boolean; // Permitted 30 mins additional time when 9 wickets down (ICC 16.2.2)
  readonly oversSinceNewBall?: number; // 0 to 80+ (Test)
  readonly isNewBallAvailable?: boolean; // True when oversSinceNewBall >= 80
  readonly isFollowOnEligible?: boolean; // True when 1st innings deficit >= 200
  readonly isFollowOnEnforced?: boolean; // True only if captain elected to enforce
  readonly stopClockSeconds?: number; // October 2026 Stop Clock timer (ICC 41.9)
  readonly stopClockWarnings?: number; // October 2026 Stop Clock warning counter
  readonly result?: {
    readonly winningTeamId?: string;
    readonly marginRuns?: number;
    readonly marginWickets?: number;
    readonly isInningsWin?: boolean;
    readonly isTie: boolean;
    readonly isDraw: boolean;
    readonly summary: string;
  };
}
