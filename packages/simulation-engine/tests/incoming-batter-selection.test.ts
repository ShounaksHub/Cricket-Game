import { describe, expect, it } from 'vitest';
import { createInitialMatchState, selectIncomingBatter, type MatchSimulationConfig } from '../src/index.js';

const config: MatchSimulationConfig = {
  matchId: 'incoming-batter-selection',
  format: 'T20',
  seed: 42n,
  versions: { simulationVersion: 'sim-1.0.0', rulesetVersion: 'rules-t20-icc-2026.1', ratingVersion: 'rate-1.0.0' },
  stadiumId: 'stadium-eden',
  pitchType: 'FLAT',
  conditions: { ambientTemperatureC: 25, humidityPercentage: 50, cloudCoverPercentage: 10, dewFactor: 0 },
  team1: { id: 'user-team', name: 'User XI', lineup: Array.from({ length: 11 }, (_, index) => ({ playerId: `u-${index + 1}`, battingOrder: index + 1 })) },
  team2: { id: 'ai-team', name: 'AI XI', lineup: Array.from({ length: 11 }, (_, index) => ({ playerId: `a-${index + 1}`, battingOrder: index + 1 })) },
  playerProfiles: new Map(),
};

describe('post-wicket batter selection', () => {
  it('replaces the requested end without simulating another delivery', () => {
    const state = createInitialMatchState(config);
    const innings = {
      ...state.innings[0],
      pendingBatterSelection: { dismissedPlayerId: 'u-1', replacesAt: 'STRIKER' as const },
    };
    const pendingState = { ...state, innings: [innings] };
    const resolved = selectIncomingBatter(pendingState, 'u-6');

    expect(resolved.innings[0].strikerPlayerId).toBe('u-6');
    expect(resolved.innings[0].nonStrikerPlayerId).toBe('u-2');
    expect(resolved.innings[0].pendingBatterSelection).toBeUndefined();
    expect(resolved.innings[0].events).toHaveLength(0);
  });
});
