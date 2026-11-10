import type { MatchFormat, PlayerSquadContext } from '@cricket/shared-types';
import type {
  DeliveryOutcome,
  EnvironmentalConditions,
  TacticalDeliveryAction,
} from '../contracts/types.js';

export const ALL_DELIVERY_OUTCOMES: readonly DeliveryOutcome[] = [
  'DOT',
  'RUN_1',
  'RUN_2',
  'RUN_3',
  'FOUR',
  'SIX',
  'WIDE',
  'NO_BALL',
  'LEG_BYE',
  'BYE',
  'WICKET',
] as const;

export interface DeliveryContext {
  readonly format: MatchFormat;
  readonly inningsNumber: number;
  readonly overNumber: number; // 0-based over index
  readonly ballInOver: number; // 1 to 6
  readonly isPowerplay: boolean;
  readonly isDeathOvers: boolean;
  readonly isFreeHit: boolean;
  readonly totalRuns: number;
  readonly totalWickets: number;
  readonly currentRunRate: number;
  readonly targetRuns?: number;
  readonly requiredRunRate?: number;
  readonly ballsRemaining: number;
  readonly pitchWearIndex: number;
  readonly surfaceCracksIndex: number;
  readonly ballWearIndex: number;
  readonly fieldersOutsideRing: number;
  readonly pitchType?: 'FLAT' | 'GREEN' | 'DUSTY' | 'HARD' | 'TURNING';
  readonly stadiumId?: string;
  readonly currentSessionNumber?: number;
}

export type OutcomeLogits = Record<DeliveryOutcome, number>;
export type OutcomeProbabilities = Record<DeliveryOutcome, number>;

export interface OutcomeSamplingResult {
  readonly outcome: DeliveryOutcome;
  readonly probabilities: OutcomeProbabilities;
  readonly logits: OutcomeLogits;
  readonly randomRoll: number;
}

export interface OutcomeCalculationInput {
  readonly context: DeliveryContext;
  readonly batter: PlayerSquadContext;
  readonly bowler: PlayerSquadContext;
  readonly conditions: EnvironmentalConditions;
  readonly tactics: TacticalDeliveryAction;
}
