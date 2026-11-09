import { describe, expect, it } from 'vitest';
import {
  createInitialMatchState,
  createInitialInningsState,
  verifyMatchInvariants,
  createBatterScorecardEntry,
  createBowlerScorecardEntry,
} from '../src/state/index.js';
import type { MatchSimulationConfig, MatchFormat } from '../src/contracts/types.js';

describe('Multi-Format Match & Innings State Foundation (P4.2)', () => {
  const createTestConfig = (format: MatchFormat): MatchSimulationConfig => ({
    matchId: `match-${format}-001`,
    format,
    seed: 987654321n,
    versions: {
      simulationVersion: 'sim-1.0.0',
      rulesetVersion: 'rules-t20-icc-2026.1',
      ratingVersion: 'rate-1.0.0',
    },
    stadiumId: 'stadium-eden',
    pitchType: 'FLAT',
    conditions: {
      ambientTemperatureC: 28,
      humidityPercentage: 60,
      cloudCoverPercentage: 10,
      dewFactor: 0.1,
    },
    team1: {
      id: 'team-ind',
      name: 'India XI',
      lineup: Array.from({ length: 11 }).map((_, i) => ({
        playerId: `ind-p${i + 1}`,
        battingOrder: i + 1,
        isCaptain: i === 0,
        isDesignatedWicketkeeper: i === 2,
      })),
    },
    team2: {
      id: 'team-aus',
      name: 'Australia XI',
      lineup: Array.from({ length: 11 }).map((_, i) => ({
        playerId: `aus-p${i + 1}`,
        battingOrder: i + 1,
        isCaptain: i === 0,
        isDesignatedWicketkeeper: i === 2,
      })),
    },
    playerProfiles: new Map(),
  });

  it('initializes pristine MatchState and validates initial invariants for T20, ODI, and Test', () => {
    const formats: MatchFormat[] = ['T20', 'ODI', 'TEST_RED_BALL', 'TEST_PINK_BALL', 'T10'];

    for (const fmt of formats) {
      const config = createTestConfig(fmt);
      const state = createInitialMatchState(config);

      expect(state.config.format).toBe(fmt);
      expect(state.status).toBe('IN_PROGRESS');
      expect(state.initialStateHash.length).toBe(64);
      expect(state.innings.length).toBe(1);

      const inn1 = state.innings[0];
      expect(inn1.inningsNumber).toBe(1);
      expect(inn1.totalRuns).toBe(0);
      expect(inn1.totalWickets).toBe(0);
      expect(inn1.completedOvers).toBe(0);
      expect(inn1.legalBallsInCurrentOver).toBe(0);
      expect(inn1.strikerPlayerId).toBe('ind-p1');
      expect(inn1.nonStrikerPlayerId).toBe('ind-p2');
      expect(inn1.batters.size).toBe(11);
      expect(inn1.bowlers.size).toBe(11);

      const check = verifyMatchInvariants(state);
      expect(check.isValid).toBe(true);
      expect(check.violations).toHaveLength(0);
    }
  });

  it('detects wickets ceiling violation when wickets exceed 10', () => {
    const state = createInitialMatchState(createTestConfig('T20'));
    // Artificially mutate state to simulate illegal condition
    (state.innings[0] as any).totalWickets = 11;

    const check = verifyMatchInvariants(state);
    expect(check.isValid).toBe(false);
    expect(check.violations.some((v) => v.includes('exceeds legal maximum (10)'))).toBe(true);
  });

  it('detects over bounds violation when legalBallsInCurrentOver exceeds 6', () => {
    const state = createInitialMatchState(createTestConfig('T20'));
    (state.innings[0] as any).legalBallsInCurrentOver = 7;

    const check = verifyMatchInvariants(state);
    expect(check.isValid).toBe(false);
    expect(check.violations.some((v) => v.includes('invalid (must be 0-6)'))).toBe(true);
  });

  it('detects runs conservation violation when recorded runs do not match bat runs + extras', () => {
    const state = createInitialMatchState(createTestConfig('T20'));
    const inn = state.innings[0] as any;
    inn.totalRuns = 50; // recorded
    inn.events = [
      {
        sequenceNumber: 1,
        inningsNumber: 1,
        overNumber: 0,
        ballInOver: 1,
        isLegalDelivery: true,
        bowlerPlayerId: 'b1',
        strikerPlayerId: 's1',
        nonStrikerPlayerId: 's2',
        outcome: 'FOUR',
        runsBat: 4,
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
        commentary: 'Cracking cover drive for four!',
        scorecardDelta: { totalRuns: 4, totalWickets: 0 },
      },
    ];
    // Batters have 0 runs recorded
    const check = verifyMatchInvariants(state);
    expect(check.isValid).toBe(false);
    expect(check.violations.some((v) => v.includes('Total runs mismatch'))).toBe(true);
  });

  it('detects fall of wickets count mismatch', () => {
    const state = createInitialMatchState(createTestConfig('T20'));
    const inn = state.innings[0] as any;
    inn.totalWickets = 2;
    inn.fallOfWickets = [
      { wicketNumber: 1, teamRuns: 15, oversElapsed: '2.1', dismissedPlayerId: 'ind-p1' },
    ]; // only 1 recorded for 2 wickets

    const check = verifyMatchInvariants(state);
    expect(check.isValid).toBe(false);
    expect(check.violations.some((v) => v.includes('Fall of wickets count'))).toBe(true);
  });
});
