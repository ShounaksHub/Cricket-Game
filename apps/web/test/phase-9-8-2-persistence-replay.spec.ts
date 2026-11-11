import { describe, expect, it } from 'vitest';
import {
  createInitialMatchState,
  getRulesetForFormat,
  selectIncomingBatter,
  stepDelivery,
  DeterministicPRNG,
  type MatchSimulationConfig,
  type TacticalDeliveryAction,
} from '@cricket/simulation-engine';
import type { MatchFormat } from '@cricket/shared-types';
import {
  parseMatchPersistence,
  replayRecordedDeliveryEvents,
  serializeMatchPersistence,
} from '../lib/match-persistence';

function makeConfig(format: MatchFormat = 'T20'): MatchSimulationConfig {
  const lineup = (prefix: string) => Array.from({ length: 11 }, (_, index) => ({
    playerId: `${prefix}-${index + 1}`,
    battingOrder: index + 1,
    isCaptain: index === 0,
    isDesignatedWicketkeeper: index === 1,
    bowlingPriority: index >= 6 ? index - 5 : null,
  }));
  return {
    matchId: 'phase-9-8-2-persistence',
    format,
    seed: 982026n,
    versions: {
      simulationVersion: 'sim-1.0.0',
      rulesetVersion: getRulesetForFormat(format).rulesetVersion,
      ratingVersion: 'rate-1.0.0',
    },
    stadiumId: 'stadium-mcg',
    pitchType: 'HARD',
    conditions: { ambientTemperatureC: 27, humidityPercentage: 55, cloudCoverPercentage: 20, dewFactor: 0.2 },
    team1: { id: 'user-team', name: 'User XI', lineup: lineup('user') },
    team2: { id: 'ai-team', name: 'AI XI', lineup: lineup('ai') },
    playerProfiles: new Map(),
  };
}

const action: TacticalDeliveryAction = {
  batterIntent: 'BALANCED',
  bowlerLine: 'OUTSIDE_OFF',
  bowlerLength: 'GOOD_LENGTH',
  bowlerVariation: 'STOCK',
  fieldPreset: 'BALANCED_RING',
  bowlingPaceStrategy: 'CONTROLLED',
  bowlingIntent: 'BALANCED',
  bowlingPlan: 'BALANCED',
  activePhase: 'POWERPLAY',
  managementMode: 'MANUAL',
  actionId: 'phase-9-8-2-action',
};

describe('Phase 9.8.2 persistence and replay', () => {
  it('round-trips mode, plan, bowler, field, and incoming-batter decision data', () => {
    const stored = serializeMatchPersistence({
      managementMode: 'ASSISTED',
      userBowlingPlan: 'ATTACK',
      userNominatedBowlerId: 'user-8',
      userField: 'ATTACKING_CLOSE_CATCHERS',
      decisionEvents: [{ type: 'BATTER_SELECTED', payload: { playerId: 'user-7' } }],
      seed: 982026n,
    });
    const restored = parseMatchPersistence<{
      managementMode: string;
      userBowlingPlan: string;
      userNominatedBowlerId: string;
      userField: string;
      decisionEvents: Array<{ type: string; payload: { playerId: string } }>;
      seed: string;
    }>(stored);

    expect(restored).toMatchObject({
      managementMode: 'ASSISTED',
      userBowlingPlan: 'ATTACK',
      userNominatedBowlerId: 'user-8',
      userField: 'ATTACKING_CLOSE_CATCHERS',
      seed: '982026',
    });
    expect(restored?.decisionEvents[0]).toEqual({ type: 'BATTER_SELECTED', payload: { playerId: 'user-7' } });
  });

  it('replays persisted delivery actions exactly, including a selected incoming batter', () => {
    const config = makeConfig();
    let state = createInitialMatchState(config);
    const prng = new DeterministicPRNG(config.seed);
    const events = [] as ReturnType<typeof stepDelivery>['event'][];
    let selectedIncomingBatter = false;

    for (let index = 0; index < 180 && !selectedIncomingBatter; index += 1) {
      const stepped = stepDelivery(state, { ...action, actionId: `phase-9-8-2-${index}`, pauseForBatterSelection: true }, prng);
      events.push(stepped.event);
      state = stepped.nextState;
      const pending = state.innings[state.currentInningsIndex]?.pendingBatterSelection;
      if (pending) {
        const innings = state.innings[state.currentInningsIndex];
        const incoming = config.team1.lineup
          .map((slot) => slot.playerId)
          .find((playerId) => playerId !== innings.strikerPlayerId && playerId !== innings.nonStrikerPlayerId && !innings.batters.get(playerId)?.isOut);
        expect(incoming).toBeDefined();
        const eventIndex = events.length - 1;
        events[eventIndex] = {
          ...events[eventIndex],
          tactics: { ...events[eventIndex].tactics!, nextBatterPlayerId: incoming },
        };
        state = selectIncomingBatter(state, incoming!);
        selectedIncomingBatter = true;
      }
    }

    expect(selectedIncomingBatter).toBe(true);
    const replay = replayRecordedDeliveryEvents(config, events);
    expect(replay.missingActionIndex).toBeNull();
    expect(replay.replayedEvents.map((event) => event.outcome)).toEqual(events.map((event) => event.outcome));
    expect(replay.state.innings[0].totalRuns).toBe(state.innings[0].totalRuns);
    expect(replay.state.innings[0].totalWickets).toBe(state.innings[0].totalWickets);
    expect(replay.state.innings[0].strikerPlayerId).toBe(state.innings[0].strikerPlayerId);
    expect(replay.state.innings[0].nonStrikerPlayerId).toBe(state.innings[0].nonStrikerPlayerId);
  });

  it('reports incomplete persistence instead of silently inventing an action', () => {
    const config = makeConfig();
    const state = createInitialMatchState(config);
    const replay = replayRecordedDeliveryEvents(config, [{
      ...stepDelivery(state, action, new DeterministicPRNG(config.seed)).event,
      tactics: undefined,
    }]);
    expect(replay.missingActionIndex).toBe(0);
    expect(replay.replayedEvents).toHaveLength(0);
  });
});
