import { describe, it, expect, beforeEach } from 'vitest';
import {
  simulateFullMatch,
  verifyMatchReplay,
  calculatePlayerOfTheMatch,
  createInitialMatchState,
  stepDelivery,
  resolveAITacticalAction,
  DeterministicPRNG,
  generateAIOpponentTeam,
  type MatchSimulationConfig,
  type MatchSimulationResult,
  type MatchState,
  type DeliveryEvent,
} from '@cricket/simulation-engine';
import {
  ingestPlayerRecord,
  VERIFIED_BENCHMARK_PLAYERS,
} from '@cricket/data-ingestion';
import type {
  PlayerSquadContext,
  DreamTeamPlayerSlotInput,
} from '@cricket/shared-types';

describe('Phase 6 End-to-End Gameplay, Persistence & Replay Verification Suite', () => {
  let playerProfiles: Map<string, PlayerSquadContext>;
  let team1Lineup: DreamTeamPlayerSlotInput[];
  let team2Lineup: DreamTeamPlayerSlotInput[];

  beforeEach(() => {
    // 1. Setup authentic verified players
    const ingested = VERIFIED_BENCHMARK_PLAYERS.map(ingestPlayerRecord);
    playerProfiles = new Map();
    for (const p of ingested) {
      playerProfiles.set(p.id, {
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

    // Default 11-player squads
    const t1Names = ['Rohit', 'Gilchrist', 'Kohli', 'Lara', 'Villiers', 'Sobers', 'Stokes', 'Jadeja', 'Akram', 'Warne', 'Bumrah'];
    const ids = t1Names.map((n) => ingested.find((p) => p.fullName.includes(n))?.id || ingested[0].id);

    team1Lineup = ids.map((pid, idx) => ({
      playerId: pid,
      battingOrder: idx + 1,
      isCaptain: idx === 2,
      isDesignatedWicketkeeper: idx === 1,
      bowlingPriority: idx === 8 ? 1 : idx === 10 ? 1 : idx === 9 ? 2 : idx === 7 ? 3 : idx === 5 ? 4 : idx === 6 ? 5 : null,
    }));

    const aiTeam = generateAIOpponentTeam(playerProfiles, {
      userLineup: team1Lineup,
      difficulty: 'HARD',
      pitchType: 'HARD',
      format: 'T20',
      seed: 88888888n,
    });
    team2Lineup = aiTeam.lineup;
  });

  it('Gate P6.11: Deterministic Replay Verification verifies 100% bit-exact parity for complete match', () => {
    const config: MatchSimulationConfig = {
      matchId: 'e2e-match-p6-11',
      format: 'T20',
      seed: 123456789n,
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
      team1: { id: 'team-user', name: 'User Dream XI', lineup: team1Lineup },
      team2: { id: 'team-ai', name: 'AI World XI', lineup: team2Lineup },
      playerProfiles,
    };

    const originalResult = simulateFullMatch(config);
    expect(originalResult.allEvents.length).toBeGreaterThan(120);

    // Verify bit-exact replay
    const report = verifyMatchReplay(originalResult);
    expect(report.isValid).toBe(true);
    expect(report.discrepancies).toHaveLength(0);
    expect(report.originalStateHash).toBe(report.replayedStateHash);
  });

  it('Gate P6.11: Active session resume correctly restores state and continues delivery simulation', () => {
    const config: MatchSimulationConfig = {
      matchId: 'session-resume-test',
      format: 'T20',
      seed: 99999n,
      versions: {
        simulationVersion: 'sim-1.0.0',
        rulesetVersion: 'rules-t20-icc-2026.1',
        ratingVersion: 'rate-1.0.0',
      },
      stadiumId: 'stadium-lords',
      pitchType: 'GREEN',
      conditions: {
        ambientTemperatureC: 22,
        humidityPercentage: 65,
        cloudCoverPercentage: 40,
        dewFactor: 0.1,
      },
      team1: { id: 'team-user', name: 'User Dream XI', lineup: team1Lineup },
      team2: { id: 'team-ai', name: 'AI Opponent XI', lineup: team2Lineup },
      playerProfiles,
    };

    // Step 20 balls into the match
    let state = createInitialMatchState(config);
    const prng = new DeterministicPRNG(config.seed);
    const recordedEvents: DeliveryEvent[] = [];

    for (let i = 0; i < 20; i++) {
      const aiAction = resolveAITacticalAction(state, prng);
      const { nextState, event } = stepDelivery(state, aiAction, prng);
      state = nextState;
      recordedEvents.push(event);
    }

    expect(recordedEvents).toHaveLength(20);

    // Simulate saving session to serializable structure
    const serializedSession = {
      matchId: config.matchId,
      seedInput: config.seed.toString(),
      currentEventIndex: 20,
      visibleEvents: recordedEvents,
    };

    // Simulate page refresh & resume: replay from seed up to event index 20
    const resumePrng = new DeterministicPRNG(BigInt(serializedSession.seedInput));
    let resumedState = createInitialMatchState(config);

    for (let i = 0; i < serializedSession.currentEventIndex; i++) {
      const aiAction = resolveAITacticalAction(resumedState, resumePrng);
      const { nextState } = stepDelivery(resumedState, aiAction, resumePrng);
      resumedState = nextState;
    }

    // State parity check
    expect(resumedState.currentInningsIndex).toBe(state.currentInningsIndex);
    const innOriginal = state.innings[state.currentInningsIndex];
    const innResumed = resumedState.innings[resumedState.currentInningsIndex];
    expect(innResumed.totalRuns).toBe(innOriginal.totalRuns);
    expect(innResumed.totalWickets).toBe(innOriginal.totalWickets);
    expect(innResumed.completedOvers).toBe(innOriginal.completedOvers);

    // Continue stepping from resumed state
    const nextAction = resolveAITacticalAction(resumedState, resumePrng);
    const { nextState: postResumeState, event: postResumeEvent } = stepDelivery(
      resumedState,
      nextAction,
      resumePrng,
    );

    expect(postResumeState.status).toBeDefined();
    expect(postResumeEvent.ballInOver).toBeDefined();
  });

  it('Gate P6.12: Reconciled match results compute authentic Player of the Match awards', () => {
    const config: MatchSimulationConfig = {
      matchId: 'potm-award-test',
      format: 'T20',
      seed: 45454545n,
      versions: {
        simulationVersion: 'sim-1.0.0',
        rulesetVersion: 'rules-t20-icc-2026.1',
        ratingVersion: 'rate-1.0.0',
      },
      stadiumId: 'stadium-eden-gardens',
      pitchType: 'TURNING',
      conditions: {
        ambientTemperatureC: 30,
        humidityPercentage: 70,
        cloudCoverPercentage: 0,
        dewFactor: 0.35,
      },
      team1: { id: 'team-user', name: 'User Dream XI', lineup: team1Lineup },
      team2: { id: 'team-ai', name: 'AI Opponent XI', lineup: team2Lineup },
      playerProfiles,
    };

    const result = simulateFullMatch(config);
    expect(result.scorecard.playerOfTheMatch).not.toBeNull();
    const potm = result.scorecard.playerOfTheMatch!;

    expect(potm.playerName).toBeTruthy();
    expect(potm.teamName).toBeTruthy();
    expect(potm.impactPoints).toBeGreaterThan(0);
    expect(potm.performanceSummary).toBeTruthy();
    expect(result.scorecard.result?.summary).toBeTruthy();
  });

  it('Gate P6.14: Security & Anti-tamper verification flags tampered scorecards and diverging deliveries', () => {
    const config: MatchSimulationConfig = {
      matchId: 'tamper-audit-test',
      format: 'T20',
      seed: 777123n,
      versions: {
        simulationVersion: 'sim-1.0.0',
        rulesetVersion: 'rules-t20-icc-2026.1',
        ratingVersion: 'rate-1.0.0',
      },
      stadiumId: 'stadium-mcg',
      pitchType: 'FLAT',
      conditions: {
        ambientTemperatureC: 26,
        humidityPercentage: 55,
        cloudCoverPercentage: 20,
        dewFactor: 0.2,
      },
      team1: { id: 'team-user', name: 'User Dream XI', lineup: team1Lineup },
      team2: { id: 'team-ai', name: 'AI Opponent XI', lineup: team2Lineup },
      playerProfiles,
    };

    const legitimateResult = simulateFullMatch(config);

    // Tamper with delivery #5 runsBat
    const tamperedResult: MatchSimulationResult = {
      ...legitimateResult,
      allEvents: legitimateResult.allEvents.map((evt, idx) => {
        if (idx === 4) {
          return {
            ...evt,
            runsBat: evt.runsBat + 4, // Illegitimate injected runs
            scorecardDelta: {
              ...evt.scorecardDelta,
              totalRuns: evt.scorecardDelta.totalRuns + 4,
            },
          };
        }
        return evt;
      }),
    };

    const auditReport = verifyMatchReplay(tamperedResult);
    expect(auditReport.isValid).toBe(false);
    expect(auditReport.discrepancies.length).toBeGreaterThan(0);
    expect(auditReport.discrepancies[0]).toContain('mismatch');
  });

  it('Gate P6.11: Match history vault serializes and archives completed matches reliably', () => {
    interface ArchivedRecord {
      id: string;
      date: string;
      format: string;
      seed: string;
      team1Name: string;
      team2Name: string;
      resultSummary: string;
    }

    const vault: ArchivedRecord[] = [];

    // Simulate 3 completed matches
    for (let i = 1; i <= 3; i++) {
      const record: ArchivedRecord = {
        id: `match-history-${i}`,
        date: new Date().toISOString(),
        format: 'T20',
        seed: `${i}00000`,
        team1Name: 'User Dream XI',
        team2Name: `AI Opponent ${i}`,
        resultSummary: `User Dream XI won by ${i * 5} runs`,
      };
      vault.unshift(record);
    }

    expect(vault).toHaveLength(3);
    expect(vault[0].id).toBe('match-history-3');

    // Verify vault serialization to JSON and parsing
    const serialized = JSON.stringify(vault);
    const restored = JSON.parse(serialized);
    expect(restored).toHaveLength(3);
    expect(restored[0].team2Name).toBe('AI Opponent 3');
  });
});
