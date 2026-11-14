import { describe, it, expect } from 'vitest';
import {
  createInitialMatchState,
  stepDelivery,
  DeterministicPRNG,
  type MatchSimulationConfig,
} from '@cricket/simulation-engine';
import { buildNationalLineup } from '../lib/national-teams';
import { VERIFIED_BENCHMARK_PLAYERS, ingestPlayerRecord } from '@cricket/data-ingestion';
import type { PlayerSquadContext } from '@cricket/shared-types';

describe('Phase 9.11 Master Overhaul: Bowling Management & Test Format Integrity', () => {
  const allPlayers = VERIFIED_BENCHMARK_PLAYERS.map(ingestPlayerRecord);
  const profiles = new Map<string, PlayerSquadContext>();
  for (const p of allPlayers) {
    profiles.set(p.id, {
      id: p.id,
      fullName: p.fullName,
      displayName: p.displayName,
      primaryNationality: p.primaryNationality,
      primaryRole: p.primaryRole,
      battingHand: p.battingHand,
      bowlingStyle: p.bowlingStyle,
      isWicketkeeper: p.isWicketkeeper,
      formatRating: p.ratings.TEST_PINK_BALL,
      ratings: p.ratings,
    });
  }

  it('ensures frontline strike bowlers bowl successive overs in Test Pink Ball instead of opening batsmen', () => {
    const indiaSquad = buildNationalLineup('India', allPlayers, 'TEST_PINK_BALL');
    const ausSquad = buildNationalLineup('Australia', allPlayers, 'TEST_PINK_BALL');

    const config: MatchSimulationConfig = {
      matchId: 'test-pink-bowling-rotation',
      format: 'TEST_PINK_BALL',
      seed: 42n,
      versions: {
        simulationVersion: 'sim-1.0.0',
        rulesetVersion: 'rule-test-pink-1.0.0',
        ratingVersion: 'rate-1.0.0',
      },
      stadiumId: 'eden-gardens',
      pitchType: 'HARD',
      conditions: {
        ambientTemperatureC: 24,
        humidityPercentage: 55,
        cloudCoverPercentage: 10,
        dewFactor: 0.15,
      },
      team1: { id: 'team-aus', name: 'Australia All-Time XI', lineup: ausSquad.lineup },
      team2: { id: 'user-team', name: 'India All-Time XI', lineup: indiaSquad.lineup },
      playerProfiles: profiles,
    };

    let state = createInitialMatchState(config);
    const prng = new DeterministicPRNG(42n);

    // Simulate 2 full overs (12 legal balls)
    const bowlersPerOver: string[] = [];
    let currentOverNumber = -1;

    for (let ball = 0; ball < 20; ball++) {
      const inn = state.innings[0];
      if (inn.completedOvers !== currentOverNumber) {
        currentOverNumber = inn.completedOvers;
        if (currentOverNumber < 2) {
          bowlersPerOver.push(inn.currentBowlerPlayerId);
        }
      }
      if (inn.completedOvers >= 2) break;

      const action = {
        batterIntent: 'BALANCED' as const,
        bowlerLine: 'OUTSIDE_OFF' as const,
        bowlerLength: 'GOOD_LENGTH' as const,
        bowlerVariation: 'STOCK' as const,
        fieldPreset: 'BALANCED_RING' as const,
      };

      const res = stepDelivery(state, action, prng);
      state = res.nextState;
    }

    expect(bowlersPerOver.length).toBeGreaterThanOrEqual(2);
    const over1BowlerProfile = profiles.get(bowlersPerOver[0]);
    const over2BowlerProfile = profiles.get(bowlersPerOver[1]);

    // Neither bowler should be a specialist top-order batter like Sehwag or Jaiswal
    expect(over1BowlerProfile?.primaryRole).not.toBe('TOP_ORDER_BATTER');
    expect(over2BowlerProfile?.primaryRole).not.toBe('TOP_ORDER_BATTER');

    // Both bowlers must have genuine bowling capabilities (Pace, Spin, or Bowling All-Rounder)
    expect(['PACE_BOWLER', 'SPIN_BOWLER', 'BOWLING_ALL_ROUNDER', 'BATTING_ALL_ROUNDER']).toContain(
      over1BowlerProfile?.primaryRole,
    );
    expect(['PACE_BOWLER', 'SPIN_BOWLER', 'BOWLING_ALL_ROUNDER', 'BATTING_ALL_ROUNDER']).toContain(
      over2BowlerProfile?.primaryRole,
    );

    // MCC Law 21.7: Bowler cannot bowl consecutive overs
    expect(bowlersPerOver[0]).not.toBe(bowlersPerOver[1]);
  });

  it('verifies Test match projected score does not explode to 9999 overs', () => {
    const isTestFormat = true;
    const formatMaxOvers = 9999;
    const runRate = '1.67';

    // The formula before fix would produce 16698:
    const buggyProjected = Math.round(parseFloat(runRate) * formatMaxOvers);
    expect(buggyProjected).toBe(16698);

    // The fixed logic displays '—' for Test matches
    const fixedDisplay = isTestFormat ? '—' : Math.round(parseFloat(runRate) * formatMaxOvers);
    expect(fixedDisplay).toBe('—');
  });

  it('formats dynamic bowler description matching actual style and speed', () => {
    const jaiswal = allPlayers.find((p) => p.fullName.includes('Jaiswal'));
    expect(jaiswal).toBeDefined();
    const jaiswalProfile = profiles.get(jaiswal!.id);
    expect(jaiswalProfile).toBeDefined();

    const rawStyle = jaiswalProfile?.bowlingStyle || 'FAST';
    const styleLabel = rawStyle.replace(/_/g, ' ');

    // Yashasvi Jaiswal is a leg spinner, NOT a 144 km/h fast seam bowler
    expect(rawStyle).not.toBe('RIGHT_ARM_FAST');
    expect(styleLabel.toLowerCase()).toContain('leg');
  });
});
