import type { DeliveryEvent, MatchSimulationConfig, MatchState } from '../contracts/types.js';
import { resolveAITacticalAction } from '../ai/ai-captain.js';
import { DeterministicPRNG } from '../prng/splitmix64.js';
import { createInitialMatchState } from '../state/match-state.js';
import { stepDelivery } from '../transition/delivery-transition.js';
import { reconcileMatchScorecard, type ReconciledMatchScorecard } from './scorecard-reconciler.js';

export interface SimulationRunOptions {
  readonly maxDeliveries?: number;
}

export interface MatchSimulationResult {
  readonly matchId: string;
  readonly initialStateHash: string;
  readonly finalState: MatchState;
  readonly scorecard: ReconciledMatchScorecard;
  readonly allEvents: readonly DeliveryEvent[];
  readonly totalDeliveriesSimulated: number;
}

/**
 * Autonomous full match simulator runner:
 * Simulates an entire cricket match from initial state hash H_0 through to completion,
 * driving situational AI tactical decisions on every ball and producing fully reconciled scorecards.
 */
export function simulateFullMatch(
  config: MatchSimulationConfig,
  options?: SimulationRunOptions,
): MatchSimulationResult {
  let state = createInitialMatchState(config);
  const prng = new DeterministicPRNG(config.seed);

  const maxBalls =
    options?.maxDeliveries ??
    (config.format === 'T10'
      ? 160
      : config.format === 'T20'
        ? 320
        : config.format === 'ODI'
          ? 700
          : 3000);

  let deliveryCount = 0;
  const allEvents: DeliveryEvent[] = [];

  while (state.status !== 'COMPLETED' && deliveryCount < maxBalls) {
    const action = resolveAITacticalAction(state, prng);
    const { nextState, event } = stepDelivery(state, action, prng);
    state = nextState;
    allEvents.push(event);
    deliveryCount++;
  }

  // Safety fallthrough only if loop was artificially truncated by options.maxDeliveries
  if (state.status !== 'COMPLETED') {
    if (config.format === 'TEST_RED_BALL' || config.format === 'TEST_PINK_BALL') {
      const day = state.currentDayNumber ?? 1;
      const dayDesc = day > 5 ? 'Day 5 overs concluded' : `Simulation truncated at ${deliveryCount} deliveries (Day ${day})`;
      state = {
        ...state,
        status: 'COMPLETED',
        result: {
          isTie: false,
          isDraw: true,
          summary: `Match drawn (${dayDesc})`,
        },
      };
    }
  }

  const scorecard = reconcileMatchScorecard(state);

  return {
    matchId: config.matchId,
    initialStateHash: state.initialStateHash,
    finalState: state,
    scorecard,
    allEvents,
    totalDeliveriesSimulated: deliveryCount,
  };
}
