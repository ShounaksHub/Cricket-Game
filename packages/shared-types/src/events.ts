import type { ExtraType, TossDecision } from './enums.js';

export interface TacticalDeliveryAction {
  readonly batterIntent: 'DEFEND' | 'ROTATE_STRIKE' | 'BALANCED' | 'AGGRESSIVE' | 'MAXIMUM_POWER';
  readonly batterTargetZone?: 'OFF_SIDE' | 'LEG_SIDE' | 'V_STRAIGHT';
  readonly bowlerLine: 'OUTSIDE_OFF' | 'STUMPS' | 'DOWN_LEG';
  readonly bowlerLength: 'YORKER' | 'FULL' | 'GOOD_LENGTH' | 'BACK_OF_LENGTH' | 'SHORT';
  readonly bowlerVariation: 'STOCK' | 'SLOWER_BALL' | 'BOUNCER' | 'GOOGLY' | 'ARM_BALL';
  readonly fieldPreset: 'ATTACKING' | 'BALANCED' | 'BOUNDARY_DEFENSE' | 'SPIN_CHOKE';
}

export interface TossAction {
  readonly matchId: string;
  readonly calledHeadsOrTails: 'HEADS' | 'TAILS';
  readonly decision: TossDecision;
}

export interface DeliveryResolutionEvent {
  readonly matchId: string;
  readonly inningsNumber: number;
  readonly overNumber: number;
  readonly ballInOver: number;
  readonly deliverySequenceNumber: number;
  readonly isLegalDelivery: boolean;
  readonly runsOffBat: number;
  readonly extrasRuns: number;
  readonly extraType: ExtraType;
  readonly isWicket: boolean;
  readonly dismissal?: {
    readonly type: string;
    readonly dismissedPlayerId: string;
    readonly fielderPlayerId?: string;
  };
  readonly telemetry: {
    readonly pitchLandingX: number;
    readonly pitchLandingY: number;
    readonly shotAngleDegrees: number;
    readonly shotDistanceMeters: number;
    readonly shotLoftAngle: number;
    readonly releaseSpeedKmh: number;
  };
  readonly currentTotalRuns: number;
  readonly currentWickets: number;
  readonly commentaryText: string;
}
