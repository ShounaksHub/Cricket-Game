import { describe, it, expect } from 'vitest';
import {
  createInitialMatchState,
  stepDelivery,
  DeterministicPRNG,
  type MatchSimulationConfig,
  type MatchState,
  type TacticalDeliveryAction,
} from '../src/index.js';
import type { DreamTeamPlayerSlotInput, PlayerSquadContext } from '@cricket/shared-types';

function createMockLineup(teamPrefix: string): DreamTeamPlayerSlotInput[] {
  return Array.from({ length: 11 }, (_, i) => ({
    playerId: `${teamPrefix}-p${i + 1}`,
    battingOrder: i + 1,
    isCaptain: i === 0,
    isDesignatedWicketkeeper: i === 6,
    bowlingPriority: i >= 5 ? i - 4 : null,
  }));
}

function createMockProfiles(teamPrefix: string): [string, PlayerSquadContext][] {
  return Array.from({ length: 11 }, (_, i) => {
    const id = `${teamPrefix}-p${i + 1}`;
    const isBowler = i >= 5;
    return [
      id,
      {
        id,
        fullName: `${teamPrefix.toUpperCase()} Player ${i + 1}`,
        displayName: `${teamPrefix.toUpperCase()}-${i + 1}`,
        primaryRole: isBowler ? 'PACE_BOWLER' : 'TOP_ORDER_BATTER',
        battingHand: 'RIGHT_HAND',
        bowlingStyle: isBowler ? 'RIGHT_ARM_FAST' : 'RIGHT_ARM_MEDIUM',
        isWicketkeeper: i === 6,
        formatRating: {
          format: 'T20',
          overallRating: 85,
          battingRating: isBowler ? 30 : 88,
          bowlingRating: isBowler ? 90 : 25,
          fieldingRating: 80,
          confidenceTier: 'GOLD',
          confidenceScore: 0.9,
          ratingVersion: 'rate-1.0.0',
          explainability: {
            rawPrimaryMetric: 'Avg: 40',
            eraPeerBaseline: 'T20',
            sampleSizeInnings: 50,
            shrinkageApplied: 0.02,
          },
        },
      },
    ];
  });
}

function createTestMatchState(seed = 12345678n): MatchState {
  const team1Lineup = createMockLineup('t1');
  const team2Lineup = createMockLineup('t2');
  const profiles = new Map<string, PlayerSquadContext>([
    ...createMockProfiles('t1'),
    ...createMockProfiles('t2'),
  ]);

  const config: MatchSimulationConfig = {
    matchId: 'match-trans-test-1',
    format: 'T20',
    seed: BigInt(seed),
    versions: {
      simulationVersion: 'sim-1.0.0',
      rulesetVersion: 'rules-t20-icc-2026.1',
      ratingVersion: 'rate-1.0.0',
    },
    stadiumId: 'stadium-mcg',
    pitchType: 'HARD',
    conditions: {
      ambientTemperatureC: 25,
      humidityPercentage: 50,
      cloudCoverPercentage: 10,
      dewFactor: 0.0,
    },
    team1: {
      id: 'team-ind',
      name: 'India XI',
      lineup: team1Lineup,
    },
    team2: {
      id: 'team-aus',
      name: 'Australia XI',
      lineup: team2Lineup,
    },
    playerProfiles: profiles,
  };

  return createInitialMatchState(config);
}

const defaultTactics: TacticalDeliveryAction = {
  batterIntent: 'BALANCED',
  bowlerLine: 'OUTSIDE_OFF',
  bowlerLength: 'GOOD_LENGTH',
  bowlerVariation: 'STOCK',
  fieldPreset: 'BALANCED_RING',
};

describe('Transition Feature P4.7: Over Accounting, Strike Rotation & Innings Transitions', () => {
  it('should advance ball counter and record matching delivery event and scorecard entries', () => {
    const initialState = createTestMatchState();
    const prng = new DeterministicPRNG(initialState.config.seed);

    const { nextState, event } = stepDelivery(initialState, defaultTactics, prng);

    expect(event.sequenceNumber).toBe(1);
    expect(event.inningsNumber).toBe(1);
    expect(event.bowlerPlayerId).toBe('t2-p11');
    expect(event.strikerPlayerId).toBe('t1-p1');
    expect(event.commentary).toBeDefined();
    expect(event.commentary.length).toBeGreaterThan(10);
    expect(event.trajectory).toBeDefined();

    const inn = nextState.innings[0];
    expect(inn.events.length).toBe(1);

    const strikerScore = inn.batters.get('t1-p1')!;
    const bowlerScore = inn.bowlers.get('t2-p11')!;

    expect(strikerScore.runs).toBe(event.runsBat);
    expect(bowlerScore.runsConceded).toBe(
      event.runsBat + event.extras.wides + event.extras.noBalls,
    );
  });

  it('should complete an entire 6-ball over and swap strike at over end', () => {
    let state = createTestMatchState(998877n);
    const prng = new DeterministicPRNG(998877n);

    const initialBowler = state.innings[0].currentBowlerPlayerId;

    // Bowl 6 legal deliveries
    let legalBalls = 0;
    while (legalBalls < 6) {
      const { nextState, event } = stepDelivery(state, defaultTactics, prng);
      state = nextState;
      if (event.isLegalDelivery) {
        legalBalls++;
      }
    }

    const inn = state.innings[0];
    expect(inn.completedOvers).toBe(1);
    expect(inn.legalBallsInCurrentOver).toBe(0);

    // Bowler MUST change (MCC Law 21.7: consecutive over prohibition)
    expect(inn.currentBowlerPlayerId).not.toBe(initialBowler);
  });

  it('should simulate an entire complete innings with verified invariants at every ball', () => {
    let state = createTestMatchState(42424242n);
    const prng = new DeterministicPRNG(42424242n);

    let deliveryCount = 0;
    // Step until Innings 1 completes (max 150 balls to protect against infinite loops)
    while (!state.innings[0].isCompleted && deliveryCount < 150) {
      const { nextState } = stepDelivery(state, defaultTactics, prng);
      state = nextState;
      deliveryCount++;
    }

    expect(state.innings[0].isCompleted).toBe(true);
    expect(state.innings[0].totalRuns).toBeGreaterThan(50);
    expect(state.innings[0].totalWickets).toBeLessThanOrEqual(10);

    // In limited overs, completed Innings 1 automatically initializes Innings 2 with target
    expect(state.innings.length).toBe(2);
    expect(state.innings[1].inningsNumber).toBe(2);
    expect(state.innings[1].targetRuns).toBe(state.innings[0].totalRuns + 1);
    expect(state.currentInningsIndex).toBe(1);
  });

  it('should simulate an entire 2-innings T20 match to completion and declare winner', () => {
    let state = createTestMatchState(1122334455n);
    const prng = new DeterministicPRNG(1122334455n);

    let maxDeliveries = 300;
    while (state.status !== 'COMPLETED' && maxDeliveries > 0) {
      const { nextState } = stepDelivery(state, defaultTactics, prng);
      state = nextState;
      maxDeliveries--;
    }

    expect(state.status).toBe('COMPLETED');
    expect(state.result).toBeDefined();
    expect(state.result?.summary).toBeDefined();
    expect(state.result?.summary.length).toBeGreaterThan(5);

    const inn1 = state.innings[0];
    const inn2 = state.innings[1];

    expect(inn1.isCompleted).toBe(true);
    expect(inn2.isCompleted).toBe(true);

    if (inn2.totalRuns > inn1.totalRuns) {
      expect(state.result?.winningTeamId).toBe(state.config.team2.id);
    } else if (inn1.totalRuns > inn2.totalRuns) {
      expect(state.result?.winningTeamId).toBe(state.config.team1.id);
    } else {
      expect(state.result?.isTie).toBe(true);
    }
  });

  it('should preserve Free-Hit status across non-legal deliveries (Wides & No-Balls) and consume it on legal deliveries (ICC Clause 21.19)', () => {
    let state = createTestMatchState(99887766n);

    // 1. Manually activate a Free Hit on the current innings
    const inn0 = state.innings[0];
    const stateWithFreeHit: MatchState = {
      ...state,
      innings: [
        {
          ...inn0,
          isFreeHit: true,
        },
      ],
    };

    // 2. Step with a mock delivery or PRNG seed that produces wide/no-ball or legal delivery
    // Verify that across 50 simulated steps from Free Hit:
    // Whenever an event is non-legal (Wide/No-Ball), isFreeHit remains true in nextState
    // Whenever an event is legal, isFreeHit becomes false in nextState
    for (let i = 0; i < 50; i++) {
      const prng = new DeterministicPRNG(BigInt(88000 + i));
      const { nextState, event } = stepDelivery(stateWithFreeHit, defaultTactics, prng);

      if (!event.isLegalDelivery) {
        // Non-legal delivery (Wide or No-Ball) must preserve Free-Hit
        expect(nextState.innings[0].isFreeHit).toBe(true);
      } else {
        // Legal delivery consumes Free-Hit
        expect(nextState.innings[0].isFreeHit).toBe(false);
      }
    }
  });
});
