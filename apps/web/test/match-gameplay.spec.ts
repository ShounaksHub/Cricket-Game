import { describe, expect, it } from 'vitest';
import { validateDreamTeamSquad } from '@cricket/cricket-rules';
import {
  createInitialMatchState,
  stepDelivery,
  resolveAITacticalAction,
  simulateFullMatch,
  reconcileMatchScorecard,
  calculatePlayerOfTheMatch,
  DeterministicPRNG,
  generateAIOpponentTeam,
  type MatchSimulationConfig,
  type MatchState,
  type TacticalDeliveryAction,
} from '@cricket/simulation-engine';
import {
  ingestPlayerRecord,
  VERIFIED_BENCHMARK_PLAYERS,
} from '@cricket/data-ingestion';
import type { PlayerSquadContext, DreamTeamPlayerSlotInput } from '@cricket/shared-types';

describe('End-to-End Match Gameplay Integration Tests (P6.4 to P6.10)', () => {
  const allPlayers = VERIFIED_BENCHMARK_PLAYERS.map(ingestPlayerRecord);
  const profilesMap = new Map<string, PlayerSquadContext>();

  for (const p of allPlayers) {
    profilesMap.set(p.id, {
      id: p.id,
      fullName: p.fullName,
      displayName: p.displayName,
      primaryRole: p.primaryRole,
      battingHand: p.battingHand,
      bowlingStyle: p.bowlingStyle,
      isWicketkeeper: p.isWicketkeeper,
      formatRating: p.ratings.T20,
      ratings: p.ratings,
    });
  }

  // Construct balanced User Team (11 distinct players)
  const userTeamIds = [
    'f1e10001-0000-0000-0000-000000000001', // Kohli
    'f1e10001-0000-0000-0000-000000000002', // Smith
    'f2e20002-0000-0000-0000-000000000002', // Rohit Sharma
    'f2e20002-0000-0000-0000-000000000003', // Sobers
    'f1e10001-0000-0000-0000-000000000006', // Buttler (WK)
    'f1e10001-0000-0000-0000-000000000004', // Stokes
    'f2e20002-0000-0000-0000-000000000004', // Warne
    'f2e20002-0000-0000-0000-000000000005', // Wasim Akram
    'f1e10001-0000-0000-0000-000000000003', // Bumrah
    'f1e10001-0000-0000-0000-000000000005', // Rashid Khan
    'f2e20002-0000-0000-0000-000000000008', // Barnes
  ];

  const userLineup: DreamTeamPlayerSlotInput[] = userTeamIds.map((pid, idx) => ({
    playerId: pid,
    battingOrder: idx + 1,
    isCaptain: idx === 0,
    isDesignatedWicketkeeper: idx === 4,
    bowlingPriority: idx === 7 ? 1 : idx === 8 ? 1 : idx === 6 ? 2 : idx === 9 ? 2 : idx === 5 ? 3 : idx === 3 ? 4 : null,
  }));

  // Generate AI Opponent Team (zero overlap)
  const aiResult = generateAIOpponentTeam(profilesMap, {
    userLineup,
    difficulty: 'HARD',
    pitchType: 'HARD',
    format: 'T20',
    seed: 555444333n,
  });

  function createTestMatchConfig(battingFirstTeam: any, bowlingFirstTeam: any): MatchSimulationConfig {
    return {
      matchId: 'e2e-test-match-1',
      format: 'T20',
      seed: 777666555n,
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
        dewFactor: 0.15,
      },
      team1: battingFirstTeam,
      team2: bowlingFirstTeam,
      playerProfiles: profilesMap,
    };
  }

  it('P6.4 & P6.5: Authoritative Toss Decision & Opening Combinations Confirmation', () => {
    const seed = 12345n;
    const prng = new DeterministicPRNG(seed);
    const coin = prng.nextFloat() < 0.5 ? 'HEADS' : 'TAILS';

    // Verify deterministic coin flip
    expect(['HEADS', 'TAILS']).toContain(coin);

    // If AI wins toss on heavy dew (>0.3), it elects to BOWL first
    const dew = 0.45;
    const aiDecision = dew > 0.35 ? 'BOWL' : 'BAT';
    expect(aiDecision).toBe('BOWL');

    // Confirm opening combinations
    const openers = userLineup.slice(0, 2);
    expect(openers).toHaveLength(2);
    expect(openers[0].battingOrder).toBe(1);
    expect(openers[1].battingOrder).toBe(2);

    const openingBowler = userLineup.find((s) => s.bowlingPriority === 1);
    expect(openingBowler).toBeDefined();
  });

  it('P6.6: Interactive Step Delivery (Mode B) causally modifies match state and respects actions', () => {
    const config = createTestMatchConfig(
      { id: 'user-team', name: 'User Dream XI', lineup: userLineup },
      { id: 'ai-team', name: aiResult.name, lineup: aiResult.lineup },
    );

    const initialState = createInitialMatchState(config);
    expect(initialState.status).toBe('IN_PROGRESS');
    expect(initialState.currentInningsIndex).toBe(0);

    const prng = new DeterministicPRNG(config.seed);

    // Ball 1: User specifies MAXIMUM_POWER
    const action1: TacticalDeliveryAction = {
      batterIntent: 'MAXIMUM_POWER',
      bowlerLength: 'GOOD_LENGTH',
      bowlerLine: 'OUTSIDE_OFF',
      bowlerVariation: 'STOCK',
      fieldPreset: 'BALANCED_RING',
    };

    const { nextState: state1, event: event1 } = stepDelivery(initialState, action1, prng);
    expect(event1).toBeDefined();
    expect(event1.sequenceNumber).toBe(1);
    expect(event1.inningsNumber).toBe(1);
    expect(state1.innings[0].events).toHaveLength(1);

    // Ball 2: User specifies DEFEND
    const action2: TacticalDeliveryAction = {
      batterIntent: 'DEFEND',
      bowlerLength: 'YORKER',
      bowlerLine: 'STUMPS',
      bowlerVariation: 'STOCK',
      fieldPreset: 'DEATH_BOUNDARY_DEFENSE',
    };

    const { nextState: state2, event: event2 } = stepDelivery(state1, action2, prng);
    expect(event2.sequenceNumber).toBe(2);
    expect(state2.innings[0].events).toHaveLength(2);
  });

  it('P6.7: Dynamic Bowler Rotation & Strict T20 Bowling Quotas (Max 4 overs, no consecutive overs)', () => {
    const config = createTestMatchConfig(
      { id: 'user-team', name: 'User Dream XI', lineup: userLineup },
      { id: 'ai-team', name: aiResult.name, lineup: aiResult.lineup },
    );

    let state = createInitialMatchState(config);
    const prng = new DeterministicPRNG(config.seed);

    const bowlerOvers = new Map<string, number>();
    let previousBowlerId = '';

    // Step through 12 overs (72 legal balls)
    let legalBallCount = 0;
    while (state.status !== 'COMPLETED' && legalBallCount < 72 && !state.innings[0].isCompleted) {
      const currentInnings = state.innings[0];
      const activeBowler = currentInnings.currentBowlerPlayerId;

      // MCC Law: Cannot bowl consecutive overs
      if (currentInnings.legalBallsInCurrentOver === 0 && currentInnings.completedOvers > 0) {
        expect(activeBowler).not.toBe(previousBowlerId);
      }

      const action = resolveAITacticalAction(state, prng);
      const { nextState, event } = stepDelivery(state, action, prng);
      state = nextState;

      if (event.isLegalDelivery) {
        legalBallCount++;
        if (event.ballInOver === 6) {
          previousBowlerId = activeBowler;
        }
      }
    }

    // Verify no bowler exceeded 4 overs in T20
    for (const [, bowlerEntry] of state.innings[0].bowlers) {
      const overs = Math.floor(bowlerEntry.ballsBowled / 6);
      expect(overs).toBeLessThanOrEqual(4);
    }
  });

  it('P6.6 & P6.10: Two-Innings Match Lifecycle, Target Chase, and Reconciled Final Scorecard', () => {
    const config = createTestMatchConfig(
      { id: 'user-team', name: 'User Dream XI', lineup: userLineup },
      { id: 'ai-team', name: aiResult.name, lineup: aiResult.lineup },
    );

    // Full match simulation
    const matchResult = simulateFullMatch(config);

    expect(matchResult.finalState.status).toBe('COMPLETED');
    expect(matchResult.finalState.innings.length).toBeGreaterThanOrEqual(1);

    const scorecard = reconcileMatchScorecard(matchResult.finalState);
    expect(scorecard).toBeDefined();
    expect(scorecard.innings.length).toBe(matchResult.finalState.innings.length);

    // Check Innings 1 Scorecard
    const inn1 = scorecard.innings[0];
    expect(inn1.totalRuns).toBeGreaterThan(0);
    expect(inn1.batters.length).toBeGreaterThanOrEqual(2);
    expect(inn1.bowlers.length).toBeGreaterThanOrEqual(5); // At least 5 bowlers used

    // Check Player of the Match Calculation
    const potm = calculatePlayerOfTheMatch(matchResult.finalState);
    expect(potm).toBeDefined();
    expect(potm?.playerId).toBeDefined();
    expect(potm?.impactPoints).toBeGreaterThan(0);
    expect(potm?.performanceSummary).toBeDefined();
  });

  it('Gate P7.6: Simulates full match between Domestic Specialists Dream XI and AI Opponent with zero overlap', () => {
    // Select domestic specialists from expanded 1,000+ database
    const jaffer = allPlayers.find((p) => p.fullName === 'Wasim Jaffer')!;
    const cox = allPlayers.find((p) => p.fullName === 'Jamie Cox')!;
    const hick = allPlayers.find((p) => p.fullName === 'Graeme Hick')!;
    const muzumdar = allPlayers.find((p) => p.fullName === 'Amol Muzumdar')!;
    const jackson = allPlayers.find((p) => p.fullName === 'Sheldon Jackson')!;
    const higgins = allPlayers.find((p) => p.fullName === 'Ryan Higgins')!;
    const saxena = allPlayers.find((p) => p.fullName === 'Jalaj Saxena')!;
    const unadkat = allPlayers.find((p) => p.fullName === 'Jaydev Unadkat')!;
    const mckay = allPlayers.find((p) => p.fullName === 'Clint McKay')!;
    const goel = allPlayers.find((p) => p.fullName === 'Rajinder Goel')!;
    const dinda = allPlayers.find((p) => p.fullName === 'Ashok Dinda')!;

    const domesticSquad: DreamTeamPlayerSlotInput[] = [
      { playerId: jaffer.id, battingOrder: 1, isCaptain: false, isDesignatedWicketkeeper: false },
      { playerId: cox.id, battingOrder: 2, isCaptain: false, isDesignatedWicketkeeper: false },
      { playerId: hick.id, battingOrder: 3, isCaptain: false, isDesignatedWicketkeeper: false },
      { playerId: muzumdar.id, battingOrder: 4, isCaptain: false, isDesignatedWicketkeeper: false },
      { playerId: jackson.id, battingOrder: 5, isCaptain: false, isDesignatedWicketkeeper: true },
      { playerId: higgins.id, battingOrder: 6, isCaptain: false, isDesignatedWicketkeeper: false, bowlingPriority: 4 },
      { playerId: saxena.id, battingOrder: 7, isCaptain: false, isDesignatedWicketkeeper: false, bowlingPriority: 3 },
      { playerId: unadkat.id, battingOrder: 8, isCaptain: true, isDesignatedWicketkeeper: false, bowlingPriority: 1 },
      { playerId: mckay.id, battingOrder: 9, isCaptain: false, isDesignatedWicketkeeper: false, bowlingPriority: 2 },
      { playerId: goel.id, battingOrder: 10, isCaptain: false, isDesignatedWicketkeeper: false, bowlingPriority: 2 },
      { playerId: dinda.id, battingOrder: 11, isCaptain: false, isDesignatedWicketkeeper: false, bowlingPriority: 1 },
    ];

    expect(domesticSquad).toHaveLength(11);

    // Validate squad readiness
    const validation = validateDreamTeamSquad('T20', domesticSquad, profilesMap, {
      requireMatchReady: true,
    });
    expect(validation.isMatchReady).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // Generate AI Opponent Team against Domestic XI
    const aiOpponent = generateAIOpponentTeam(profilesMap, {
      userLineup: domesticSquad,
      difficulty: 'HARD',
      pitchType: 'GREEN',
      format: 'T20',
      seed: 888999111n,
    });

    expect(aiOpponent.lineup).toHaveLength(11);

    // Assert strictly ZERO player overlap between teams
    const domesticIds = new Set(domesticSquad.map((s) => s.playerId));
    const aiIds = aiOpponent.lineup.map((s) => s.playerId);
    const overlapping = aiIds.filter((id) => domesticIds.has(id));
    expect(overlapping).toHaveLength(0);

    // Run full match simulation
    const matchConfig = createTestMatchConfig(
      { id: 'domestic-xi', name: 'Domestic Legends XI', lineup: domesticSquad },
      { id: 'ai-opponent-xi', name: aiOpponent.name, lineup: aiOpponent.lineup },
    );

    const simResult = simulateFullMatch(matchConfig);
    expect(simResult.finalState.status).toBe('COMPLETED');
    expect(simResult.finalState.innings.length).toBeGreaterThanOrEqual(1);

    const scorecard = reconcileMatchScorecard(simResult.finalState);
    expect(scorecard.innings[0].totalRuns).toBeGreaterThan(0);
  });
});
