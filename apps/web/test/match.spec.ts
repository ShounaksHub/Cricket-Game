import { describe, expect, it } from 'vitest';
import {
  VERIFIED_STADIUMS,
  simulateFullMatch,
  verifyMatchReplay,
  reconcileMatchScorecard,
  calculatePlayerOfTheMatch,
  type MatchSimulationConfig,
} from '@cricket/simulation-engine';
import {
  VERIFIED_BENCHMARK_PLAYERS,
  ingestPlayerRecord,
} from '@cricket/data-ingestion';
import type { PlayerSquadContext, DreamTeamPlayerSlotInput } from '@cricket/shared-types';

describe('Web Match Simulation Integration Tests (Phase 4)', () => {
  it('verifies verified stadiums and boundary metadata in web environment', () => {
    expect(VERIFIED_STADIUMS.length).toBeGreaterThanOrEqual(5);

    const mcg = VERIFIED_STADIUMS.find((s) => s.id === 'stadium-mcg');
    expect(mcg).toBeDefined();
    expect(mcg?.averageBoundaryRadiusMeters).toBe(82);

    const wankhede = VERIFIED_STADIUMS.find((s) => s.id === 'stadium-wankhede');
    expect(wankhede).toBeDefined();
    expect(wankhede?.averageBoundaryRadiusMeters).toBe(64);
  });

  it('executes client-side deterministic T20 match simulation with reconciled scorecards', () => {
    const all = VERIFIED_BENCHMARK_PLAYERS.map(ingestPlayerRecord);
    const profiles = new Map<string, PlayerSquadContext>();

    for (const p of all) {
      profiles.set(p.id, {
        id: p.id,
        fullName: p.fullName,
        displayName: p.displayName,
        primaryRole: p.primaryRole,
        battingHand: p.battingHand,
        bowlingStyle: p.bowlingStyle,
        isWicketkeeper: p.isWicketkeeper,
        formatRating: p.ratings.T20,
      });
    }

    const t1Ids = [
      'f1e10001-0000-0000-0000-000000000001',
      'f2e20002-0000-0000-0000-000000000002',
      'f2e20002-0000-0000-0000-000000000001',
      'f1e10001-0000-0000-0000-000000000002',
      'f1e10001-0000-0000-0000-000000000006',
      'f1e10001-0000-0000-0000-000000000004',
      'f2e20002-0000-0000-0000-000000000003',
      'f2e20002-0000-0000-0000-000000000005',
      'f2e20002-0000-0000-0000-000000000004',
      'f1e10001-0000-0000-0000-000000000003',
      'f1e10001-0000-0000-0000-000000000005',
    ];

    const lineup: DreamTeamPlayerSlotInput[] = t1Ids.map((pid, idx) => ({
      playerId: pid,
      battingOrder: idx + 1,
      isCaptain: idx === 0,
      isDesignatedWicketkeeper: idx === 4,
      bowlingPriority: idx >= 7 ? idx - 6 : null,
    }));

    const config: MatchSimulationConfig = {
      matchId: 'web-test-match-1',
      format: 'T20',
      seed: 88888888n,
      versions: {
        simulationVersion: 'sim-1.0.0',
        rulesetVersion: 'rules-t20-icc-2026.1',
        ratingVersion: 'rate-1.0.0',
      },
      stadiumId: 'stadium-wankhede',
      pitchType: 'FLAT',
      conditions: {
        ambientTemperatureC: 28,
        humidityPercentage: 60,
        cloudCoverPercentage: 10,
        dewFactor: 0.3,
      },
      team1: { id: 'team-1', name: 'User Dream XI', lineup },
      team2: { id: 'team-2', name: 'AI Opponent XI', lineup },
      playerProfiles: profiles,
    };

    const result = simulateFullMatch(config);

    expect(result.matchId).toBe('web-test-match-1');
    expect(result.finalState.status).toBe('COMPLETED');
    expect(result.allEvents.length).toBeGreaterThan(120);

    // Verify reconciled scorecards
    expect(result.scorecard).toBeDefined();
    expect(result.scorecard.innings.length).toBe(2);
    expect(result.scorecard.innings[0].batters.length).toBeGreaterThan(0);
    expect(result.scorecard.innings[0].bowlers.length).toBeGreaterThan(0);

    // Verify bit-exact replay reproducibility
    const replayCheck = verifyMatchReplay(result);
    expect(replayCheck.isValid).toBe(true);
    expect(replayCheck.discrepancies.length).toBe(0);
  });
});
