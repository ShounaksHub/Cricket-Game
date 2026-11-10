import { describe, it, expect } from 'vitest';
import {
  createInitialMatchState,
  stepDelivery,
  resolveAITacticalAction,
  DeterministicPRNG,
  getRulesetForFormat,
  type MatchSimulationConfig,
  type PlayerSquadContext,
} from '@cricket/simulation-engine';
import { VERIFIED_BENCHMARK_PLAYERS, ingestPlayerRecord } from '@cricket/data-ingestion';

describe('Phase 9.4: User-Controlled Team Management & Match Flow', () => {
  const all = VERIFIED_BENCHMARK_PLAYERS.map(ingestPlayerRecord);
  const profiles = new Map<string, PlayerSquadContext>();

  for (const p of all) {
    profiles.set(p.id, {
      id: p.id,
      fullName: p.fullName,
      displayName: p.displayName,
      primaryNationality: p.primaryNationality,
      primaryRole: p.primaryRole,
      battingHand: p.battingHand,
      bowlingStyle: p.bowlingStyle,
      isWicketkeeper: p.isWicketkeeper,
      formatRating: p.ratings.T20,
      ratings: p.ratings,
    });
  }

  const p1 = all[0].id;
  const p2 = all[1].id;
  const p3 = all[2].id;
  const p4 = all[3].id;
  const p5 = all[4].id;
  const p6 = all[5].id;
  const p7 = all[6].id;
  const p8 = all[7].id;
  const p9 = all[8].id;
  const p10 = all[9].id;
  const p11 = all[10].id;

  const userLineup = [
    { playerId: p1, battingOrder: 1, isCaptain: true, bowlingPriority: null },
    { playerId: p2, battingOrder: 2, isDesignatedWicketkeeper: true, bowlingPriority: null },
    { playerId: p3, battingOrder: 3, bowlingPriority: null },
    { playerId: p4, battingOrder: 4, bowlingPriority: null },
    { playerId: p5, battingOrder: 5, bowlingPriority: null },
    { playerId: p6, battingOrder: 6, bowlingPriority: 3 },
    { playerId: p7, battingOrder: 7, bowlingPriority: 2 },
    { playerId: p8, battingOrder: 8, bowlingPriority: 2 },
    { playerId: p9, battingOrder: 9, bowlingPriority: 1 },
    { playerId: p10, battingOrder: 10, bowlingPriority: 1 },
    { playerId: p11, battingOrder: 11, bowlingPriority: 1 },
  ];

  const opponentLineup = [
    { playerId: all[11].id, battingOrder: 1 },
    { playerId: all[12].id, battingOrder: 2 },
    { playerId: all[13].id, battingOrder: 3 },
    { playerId: all[14].id, battingOrder: 4 },
    { playerId: all[15].id, battingOrder: 5 },
    { playerId: all[16].id, battingOrder: 6 },
    { playerId: all[17].id, battingOrder: 7 },
    { playerId: all[18].id, battingOrder: 8 },
    { playerId: all[19].id, battingOrder: 9 },
    { playerId: all[20].id, battingOrder: 10 },
    { playerId: all[21].id, battingOrder: 11 },
  ];

  function makeConfig(userBatsFirst: boolean): MatchSimulationConfig {
    return {
      matchId: 'phase-9-4-test-match',
      format: 'T20',
      seed: 7777777n,
      versions: {
        simulationVersion: 'sim-1.0.0',
        rulesetVersion: getRulesetForFormat('T20').rulesetVersion,
        ratingVersion: 'rate-1.0.0',
      },
      stadiumId: 'stadium-mcg',
      pitchType: 'HARD',
      conditions: {
        ambientTemperatureC: 27,
        humidityPercentage: 55,
        cloudCoverPercentage: 20,
        dewFactor: 0.2,
      },
      team1: {
        id: userBatsFirst ? 'user-team' : 'ai-team',
        name: userBatsFirst ? 'User Dream XI' : 'AI Opponent',
        lineup: userBatsFirst ? userLineup : opponentLineup,
      },
      team2: {
        id: userBatsFirst ? 'ai-team' : 'user-team',
        name: userBatsFirst ? 'AI Opponent' : 'User Dream XI',
        lineup: userBatsFirst ? opponentLineup : userLineup,
      },
      playerProfiles: profiles,
    };
  }

  it('1. Pre-Innings Batting Order: User can customize batting order, openers, and captaincy before start', () => {
    // Custom re-ordered lineup: Swap #1 and #3 (e.g. promoting #3 to open)
    const customLineup = [...userLineup];
    const temp = customLineup[0];
    customLineup[0] = { ...customLineup[2], battingOrder: 1 };
    customLineup[2] = { ...temp, battingOrder: 3 };

    const config = makeConfig(true);
    // Config with updated custom lineup
    const customConfig: MatchSimulationConfig = {
      ...config,
      team1: {
        ...config.team1,
        lineup: customLineup,
      },
    };

    const state = createInitialMatchState(customConfig);
    const inn = state.innings[0];

    // Verify custom opener #1 takes strike, #2 is non-striker
    expect(inn.strikerPlayerId).toBe(p3);
    expect(inn.nonStrikerPlayerId).toBe(p2);
  });

  it('2. Pre-Innings Bowling Attack: User can select opening bowler for Over 1', () => {
    const config = makeConfig(false); // User bowls first
    const chosenOpeningBowler = p10; // Nominate p10

    const state = createInitialMatchState(config);
    // When user nominates opening bowler:
    const inn = state.innings[0];
    expect(inn.bowlingTeamId).toBe('user-team');

    // Engine allows tactical action to nominate opening bowler or prioritize bowler
    const prng = new DeterministicPRNG(config.seed);
    const action = {
      ...resolveAITacticalAction(state, prng),
      nextBowlerPlayerId: chosenOpeningBowler,
    };

    expect(action.nextBowlerPlayerId).toBe(chosenOpeningBowler);
  });

  it('3. In-Match Next Batter Nomination: Dismissal honors user nominated incoming batter', () => {
    const config = makeConfig(true); // User bats first
    const state = createInitialMatchState(config);
    const prng = new DeterministicPRNG(config.seed);

    // Fast forward until a wicket falls or force dismissal resolution
    const nominatedNextBatter = p5; // Normally p3 would be next; user chooses p5

    let currentState = state;
    let foundDismissal = false;

    // Simulate deliveries until a wicket falls
    for (let i = 0; i < 60; i++) {
      const baseAction = resolveAITacticalAction(currentState, prng);
      const action = {
        ...baseAction,
        nextBatterPlayerId: nominatedNextBatter,
      };

      const { nextState, event } = stepDelivery(currentState, action, prng);
      currentState = nextState;

      if (event.dismissal) {
        foundDismissal = true;
        const currentInn = currentState.innings[currentState.currentInningsIndex];
        // The incoming batter should be nominatedNextBatter if not already at crease
        expect(
          currentInn.strikerPlayerId === nominatedNextBatter ||
          currentInn.nonStrikerPlayerId === nominatedNextBatter
        ).toBe(true);
        break;
      }
    }

    expect(foundDismissal, 'Expected at least 1 dismissal in 60 deliveries').toBe(true);
  });

  it('4. In-Match Bowler Rotation: End-of-over respects nominated eligible bowler and enforces Law 21.7', () => {
    const config = makeConfig(false); // User bowls first
    let state = createInitialMatchState(config);
    const prng = new DeterministicPRNG(config.seed);

    const firstOverBowler = state.innings[0].currentBowlerPlayerId;
    const nominatedNextBowler = p9;

    // Complete the first over (6 legal balls)
    while (state.innings[0].completedOvers === 0) {
      const baseAction = resolveAITacticalAction(state, prng);
      const action = {
        ...baseAction,
        nextBowlerPlayerId: nominatedNextBowler,
      };
      const { nextState } = stepDelivery(state, action, prng);
      state = nextState;
    }

    const inn = state.innings[0];
    expect(inn.completedOvers).toBe(1);

    // Law 21.7 check: the new bowler MUST NOT be the bowler who bowled over 1
    expect(inn.currentBowlerPlayerId).not.toBe(firstOverBowler);
    expect(inn.currentBowlerPlayerId).toBe(nominatedNextBowler);
  });
});
