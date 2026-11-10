import type { MatchFormat } from '@cricket/shared-types';
import type {
  BowlingIntent,
  BowlingLength,
  BowlingLine,
  BowlingPaceStrategy,
  BowlingVariation,
  FieldPreset,
  TacticalDeliveryAction,
  BowlingPlan,
} from './types.js';

export type LimitedOversPhase = 'POWERPLAY' | 'MIDDLE_OVERS' | 'FINAL_POWERPLAY' | 'DEATH_OVERS';
export type TestBowlingPhase =
  | 'NEW_BALL_ATTACK'
  | 'SWING_SEAM_ATTACK'
  | 'CONTAINMENT'
  | 'SPIN_ATTACK'
  | 'PARTNERSHIP_BREAKING'
  | 'TAIL_END_ATTACK';

export interface BowlingPhase {
  readonly id: LimitedOversPhase | TestBowlingPhase;
  readonly label: string;
  readonly startOver?: number;
  readonly endOver?: number;
}

export interface BowlingPlanConfig {
  readonly plan: BowlingPlan;
  readonly activePhase: BowlingPhase['id'];
  readonly selectedBowlerPlayerId?: string;
  readonly fieldPreset: FieldPreset;
  readonly activatedAt: { readonly inningsNumber: number; readonly overNumber: number };
}

const limitedPlanDefaults: Record<BowlingPlan, Pick<TacticalDeliveryAction, 'bowlerLine' | 'bowlerLength' | 'bowlerVariation' | 'bowlingPaceStrategy' | 'bowlingIntent' | 'fieldPreset'>> = {
  ATTACK: { bowlerLine: 'STUMPS', bowlerLength: 'FULL', bowlerVariation: 'STOCK', bowlingPaceStrategy: 'EFFORT_BALL', bowlingIntent: 'WICKET_TAKING', fieldPreset: 'ATTACKING_CLOSE_CATCHERS' },
  BALANCED: { bowlerLine: 'OUTSIDE_OFF', bowlerLength: 'GOOD_LENGTH', bowlerVariation: 'STOCK', bowlingPaceStrategy: 'CONTROLLED', bowlingIntent: 'BALANCED', fieldPreset: 'BALANCED_RING' },
  DEFENSIVE: { bowlerLine: 'OUTSIDE_OFF', bowlerLength: 'BACK_OF_LENGTH', bowlerVariation: 'SLOWER_BALL', bowlingPaceStrategy: 'CONSERVE', bowlingIntent: 'CONTAINMENT', fieldPreset: 'DEATH_BOUNDARY_DEFENSE' },
};

export function getBowlingPhases(format: MatchFormat): readonly BowlingPhase[] {
  if (format === 'T10') return [
    { id: 'POWERPLAY', label: 'Powerplay', startOver: 0, endOver: 2 },
    { id: 'MIDDLE_OVERS', label: 'Middle overs', startOver: 3, endOver: 6 },
    { id: 'DEATH_OVERS', label: 'Death overs', startOver: 7, endOver: 9 },
  ];
  if (format === 'T20') return [
    { id: 'POWERPLAY', label: 'Powerplay', startOver: 0, endOver: 5 },
    { id: 'MIDDLE_OVERS', label: 'Middle overs', startOver: 6, endOver: 14 },
    { id: 'DEATH_OVERS', label: 'Death overs', startOver: 15, endOver: 19 },
  ];
  if (format === 'ODI') return [
    { id: 'POWERPLAY', label: 'Powerplay 1', startOver: 0, endOver: 9 },
    { id: 'MIDDLE_OVERS', label: 'Middle overs', startOver: 10, endOver: 39 },
    { id: 'FINAL_POWERPLAY', label: 'Final powerplay', startOver: 40, endOver: 44 },
    { id: 'DEATH_OVERS', label: 'Death overs', startOver: 45, endOver: 49 },
  ];
  return [
    { id: 'NEW_BALL_ATTACK', label: 'New-ball attack' },
    { id: 'SWING_SEAM_ATTACK', label: 'Swing & seam attack' },
    { id: 'CONTAINMENT', label: 'Containment' },
    { id: 'SPIN_ATTACK', label: 'Spin attack' },
    { id: 'PARTNERSHIP_BREAKING', label: 'Partnership-breaking attack' },
    { id: 'TAIL_END_ATTACK', label: 'Tail-end attack' },
  ];
}

export function getActiveBowlingPhase(format: MatchFormat, overNumber: number, sessionNumber = 1, wickets = 0): BowlingPhase {
  if (format === 'TEST_RED_BALL' || format === 'TEST_PINK_BALL') {
    if (wickets >= 7) return { id: 'TAIL_END_ATTACK', label: 'Tail-end attack' };
    if (overNumber < 20 && sessionNumber === 1) return { id: 'NEW_BALL_ATTACK', label: 'New-ball attack' };
    if (sessionNumber === 1) return { id: 'SWING_SEAM_ATTACK', label: 'Swing & seam attack' };
    if (wickets >= 3) return { id: 'PARTNERSHIP_BREAKING', label: 'Partnership-breaking attack' };
    return { id: 'CONTAINMENT', label: 'Containment' };
  }
  return getBowlingPhases(format).find((phase) => overNumber >= (phase.startOver ?? 0) && overNumber <= (phase.endOver ?? Number.MAX_SAFE_INTEGER)) ?? getBowlingPhases(format)[0];
}

export function applyBowlingPlan(action: TacticalDeliveryAction, plan?: BowlingPlan): TacticalDeliveryAction {
  if (!plan) return action;
  const defaults = limitedPlanDefaults[plan];
  return {
    ...action,
    bowlerLine: action.bowlerLine ?? defaults.bowlerLine,
    bowlerLength: action.bowlerLength ?? defaults.bowlerLength,
    bowlerVariation: action.bowlerVariation ?? defaults.bowlerVariation,
    bowlingPaceStrategy: action.bowlingPaceStrategy ?? defaults.bowlingPaceStrategy,
    bowlingIntent: action.bowlingIntent ?? defaults.bowlingIntent,
    fieldPreset: action.fieldPreset ?? defaults.fieldPreset,
    bowlingPlan: plan,
  };
}
