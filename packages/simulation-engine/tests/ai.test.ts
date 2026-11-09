import { describe, it, expect } from 'vitest';
import {
  getStadiumById,
  calculateStadiumDeltas,
  resolveAITacticalAction,
  createInitialMatchState,
  stepDelivery,
  DeterministicPRNG,
  type MatchSimulationConfig,
  type MatchState,
} from '../src/index.js';
import type { DreamTeamPlayerSlotInput, PlayerSquadContext } from '@cricket/shared-types';

function createMockLineup(prefix: string): DreamTeamPlayerSlotInput[] {
  return Array.from({ length: 11 }, (_, i) => ({
    playerId: `${prefix}-p${i + 1}`,
    battingOrder: i + 1,
    isCaptain: i === 0,
    isDesignatedWicketkeeper: i === 6,
    bowlingPriority: i >= 5 ? i - 4 : null,
  }));
}

function createMockProfiles(prefix: string): [string, PlayerSquadContext][] {
  return Array.from({ length: 11 }, (_, i) => {
    const id = `${prefix}-p${i + 1}`;
    const isBowler = i >= 5;
    return [
      id,
      {
        id,
        fullName: `${prefix.toUpperCase()} Player ${i + 1}`,
        displayName: `${prefix.toUpperCase()}-${i + 1}`,
        primaryRole: isBowler ? 'PACE_BOWLER' : 'TOP_ORDER_BATTER',
        battingHand: 'RIGHT_HAND',
        bowlingStyle: isBowler ? 'RIGHT_ARM_FAST' : 'RIGHT_ARM_MEDIUM',
        isWicketkeeper: i === 6,
      },
    ];
  });
}

function createMockMatchState(stadiumId = 'stadium-mcg'): MatchState {
  const config: MatchSimulationConfig = {
    matchId: 'ai-test-match-1',
    format: 'T20',
    seed: 5544332211n,
    versions: {
      simulationVersion: 'sim-1.0.0',
      rulesetVersion: 'rules-t20-icc-2026.1',
      ratingVersion: 'rate-1.0.0',
    },
    stadiumId,
    pitchType: 'FLAT',
    conditions: {
      ambientTemperatureC: 26,
      humidityPercentage: 55,
      cloudCoverPercentage: 15,
      dewFactor: 0.0,
    },
    team1: {
      id: 't1',
      name: 'Team 1',
      lineup: createMockLineup('t1'),
    },
    team2: {
      id: 't2',
      name: 'Team 2',
      lineup: createMockLineup('t2'),
    },
    playerProfiles: new Map([
      ...createMockProfiles('t1'),
      ...createMockProfiles('t2'),
    ]),
  };

  return createInitialMatchState(config);
}

describe('AI Feature P4.9: Stadium Integration & Tactical AI Captaincy', () => {
  it('should retrieve verified stadiums and model dimension impact correctly', () => {
    const mcg = getStadiumById('stadium-mcg');
    expect(mcg.name).toBe('Melbourne Cricket Ground');
    expect(mcg.averageBoundaryRadiusMeters).toBe(82);

    const mcgDeltas = calculateStadiumDeltas(mcg);
    // Huge ground suppresses sixes and rewards running between wickets
    expect(mcgDeltas.SIX).toBeLessThan(0);
    expect(mcgDeltas.RUN_2).toBeGreaterThan(0.3);
    expect(mcgDeltas.RUN_3).toBeGreaterThan(0.2);

    const chinnaswamy = getStadiumById('stadium-chinnaswamy');
    expect(chinnaswamy.averageBoundaryRadiusMeters).toBe(62);

    const chinDeltas = calculateStadiumDeltas(chinnaswamy);
    // Small ground with altitude boosts boundaries
    expect(chinDeltas.FOUR).toBeGreaterThanOrEqual(0.3);
    expect(chinDeltas.SIX).toBeGreaterThan(0.4);

    const wanderers = getStadiumById('stadium-wanderers');
    expect(wanderers.altitudeMeters).toBe(1750);
    const wanderersDeltas = calculateStadiumDeltas(wanderers);
    // High altitude thin air delivers significant aerodynamic flight bonus
    expect(wanderersDeltas.SIX).toBeGreaterThan(0.2);
  });

  it('should instruct MAXIMUM_POWER on Free-Hit delivery', () => {
    const state = createMockMatchState();
    const prng = new DeterministicPRNG(12345n);

    // Simulate state with previous event being a NO_BALL
    const stateWithNoBall: MatchState = {
      ...state,
      innings: [
        {
          ...state.innings[0],
          isFreeHit: true,
          events: [
            {
              sequenceNumber: 1,
              inningsNumber: 1,
              overNumber: 0,
              ballInOver: 1,
              isLegalDelivery: false,
              bowlerPlayerId: 't2-p11',
              strikerPlayerId: 't1-p1',
              nonStrikerPlayerId: 't1-p2',
              outcome: 'NO_BALL',
              runsBat: 0,
              extras: { wides: 0, noBalls: 1, byes: 0, legByes: 0, penalty: 0 },
              commentary: 'No ball!',
              scorecardDelta: { totalRuns: 1, totalWickets: 0 },
            },
          ],
        },
      ],
    };

    const action = resolveAITacticalAction(stateWithNoBall, prng);
    expect(action.batterIntent).toBe('MAXIMUM_POWER');
  });

  it('should adapt tactics for death overs (yorkers, cutters, boundary defense)', () => {
    const state = createMockMatchState();
    const prng = new DeterministicPRNG(54321n);

    // Move match into death overs (over 18)
    const deathState: MatchState = {
      ...state,
      innings: [
        {
          ...state.innings[0],
          completedOvers: 18,
          totalRuns: 165,
          totalWickets: 4,
        },
      ],
    };

    const action = resolveAITacticalAction(deathState, prng);

    // Death overs bowling tactics
    expect(['YORKER', 'SHORT', 'GOOD_LENGTH'].includes(action.bowlerLength)).toBe(true);
    expect(action.fieldPreset).toBe('DEATH_BOUNDARY_DEFENSE');
    expect(['MAXIMUM_POWER', 'AGGRESSIVE'].includes(action.batterIntent)).toBe(true);
  });

  it('should trigger consolidation tactics (DEFEND/ROTATE_STRIKE) on top-order collapse', () => {
    const state = createMockMatchState();
    const prng = new DeterministicPRNG(98765n);

    // Top order collapse: 3 wickets down in over 3
    const collapseState: MatchState = {
      ...state,
      innings: [
        {
          ...state.innings[0],
          completedOvers: 3,
          totalRuns: 19,
          totalWickets: 3,
        },
      ],
    };

    const action = resolveAITacticalAction(collapseState, prng);
    expect(['DEFEND', 'ROTATE_STRIKE'].includes(action.batterIntent)).toBe(true);
  });

  it('should integrate AI Captaincy seamlessly into autonomous match simulation', () => {
    let state = createMockMatchState();
    const prng = new DeterministicPRNG(112233n);

    // Simulate 12 balls using dynamic AI captaincy choices
    for (let i = 0; i < 12; i++) {
      const action = resolveAITacticalAction(state, prng);
      expect(action).toBeDefined();
      expect(action.batterIntent).toBeDefined();
      expect(action.bowlerLength).toBeDefined();

      const { nextState } = stepDelivery(state, action, prng);
      state = nextState;
    }

    expect(state.innings[0].events.length).toBe(12);
    expect(state.innings[0].completedOvers).toBeGreaterThanOrEqual(1);
  });
});
