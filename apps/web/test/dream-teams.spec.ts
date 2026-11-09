import { describe, expect, it } from 'vitest';
import {
  validateDreamTeamSquad,
  calculateSquadAnalytics,
} from '@cricket/cricket-rules';
import {
  ingestPlayerRecord,
  VERIFIED_BENCHMARK_PLAYERS,
} from '@cricket/data-ingestion';
import type { PlayerSquadContext, DreamTeamPlayerSlotInput } from '@cricket/shared-types';

describe('Web Dream Team Builder Integration Tests', () => {
  it('loads verified benchmark players and converts to squad context', () => {
    const players = VERIFIED_BENCHMARK_PLAYERS.map((raw) => ingestPlayerRecord(raw));
    expect(players.length).toBeGreaterThanOrEqual(15);

    const contextMap = new Map<string, PlayerSquadContext>();
    for (const p of players) {
      contextMap.set(p.id, {
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

    expect(contextMap.size).toBe(players.length);

    // Form an 11-player lineup
    const lineup: DreamTeamPlayerSlotInput[] = players.slice(0, 11).map((p, idx) => ({
      playerId: p.id,
      battingOrder: idx + 1,
      isCaptain: idx === 0,
      isDesignatedWicketkeeper: idx === 2,
    }));

    // Verify rules validator runs in web environment
    const validation = validateDreamTeamSquad('T20', lineup, contextMap, {
      requireMatchReady: true,
    });
    expect(validation).toBeDefined();
    expect(validation.summary.playerCount).toBe(11);

    // Verify analytics engine runs in web environment
    const analytics = calculateSquadAnalytics('T20', lineup, contextMap);
    expect(analytics).toBeDefined();
    expect(analytics.overallBalance).toBeGreaterThan(0);
    expect(analytics.dimensions.battingStrength.score).toBeGreaterThan(0);
    expect(analytics.dimensions.paceThreat.score).toBeGreaterThan(0);
    expect(analytics.dimensions.overallSquadBalance.score).toBeGreaterThan(0);
  });
});
