import { describe, expect, it } from 'vitest';
import {
  generateAIOpponentTeam,
  type AIDifficulty,
  type PitchType,
} from '../src/ai/ai-opponent-generator.js';
import { validateDreamTeamSquad } from '@cricket/cricket-rules';
import type { PlayerSquadContext, DreamTeamPlayerSlotInput, PrimaryRole, BowlingStyle } from '@cricket/shared-types';

describe('AI Opponent & Strategy Engine (Gate P6.3)', () => {
  // Create 35 self-contained player profiles spanning all roles
  const mockProfiles: PlayerSquadContext[] = [];

  // 3 Keepers
  for (let i = 1; i <= 3; i++) {
    mockProfiles.push({
      id: `wk-${i}`,
      fullName: `Wicketkeeper ${i}`,
      displayName: `Keeper ${i}`,
      primaryRole: 'WICKETKEEPER_BATTER',
      battingHand: i % 2 === 0 ? 'LEFT_HAND' : 'RIGHT_HAND',
      bowlingStyle: 'NONE',
      isWicketkeeper: true,
      formatRating: { overallRating: 80 + i, battingRating: 80 + i, bowlingRating: 20, fieldingRating: 85 },
    });
  }

  // 8 Top/Middle Order Batters
  const batterRoles: PrimaryRole[] = ['TOP_ORDER_BATTER', 'MIDDLE_ORDER_BATTER'];
  for (let i = 1; i <= 8; i++) {
    mockProfiles.push({
      id: `bat-${i}`,
      fullName: `Batter ${i}`,
      displayName: `Bat ${i}`,
      primaryRole: batterRoles[i % 2],
      battingHand: i <= 2 ? 'LEFT_HAND' : 'RIGHT_HAND',
      bowlingStyle: 'NONE',
      isWicketkeeper: false,
      formatRating: { overallRating: 75 + i, battingRating: 78 + i, bowlingRating: 20, fieldingRating: 70 },
    });
  }

  // 6 All-Rounders
  for (let i = 1; i <= 6; i++) {
    mockProfiles.push({
      id: `ar-${i}`,
      fullName: `AllRounder ${i}`,
      displayName: `AR ${i}`,
      primaryRole: i % 2 === 0 ? 'BATTING_ALL_ROUNDER' : 'BOWLING_ALL_ROUNDER',
      battingHand: 'RIGHT_HAND',
      bowlingStyle: i % 2 === 0 ? 'RIGHT_ARM_FAST_MEDIUM' : 'RIGHT_ARM_OFF_BREAK',
      isWicketkeeper: false,
      formatRating: { overallRating: 82 + i, battingRating: 72 + i, bowlingRating: 75 + i, fieldingRating: 78 },
    });
  }

  // 10 Fast Bowlers
  for (let i = 1; i <= 10; i++) {
    mockProfiles.push({
      id: `pace-${i}`,
      fullName: `Pacer ${i}`,
      displayName: `Pace ${i}`,
      primaryRole: 'PACE_BOWLER',
      battingHand: 'RIGHT_HAND',
      bowlingStyle: i % 3 === 0 ? 'LEFT_ARM_FAST' : 'RIGHT_ARM_FAST',
      isWicketkeeper: false,
      formatRating: { overallRating: 78 + i, battingRating: 30 + i, bowlingRating: 80 + i, fieldingRating: 65 },
    });
  }

  // 8 Spin Bowlers
  for (let i = 1; i <= 8; i++) {
    mockProfiles.push({
      id: `spin-${i}`,
      fullName: `Spinner ${i}`,
      displayName: `Spin ${i}`,
      primaryRole: 'SPIN_BOWLER',
      battingHand: 'RIGHT_HAND',
      bowlingStyle: i % 2 === 0 ? 'RIGHT_ARM_LEG_BREAK' : 'RIGHT_ARM_OFF_BREAK',
      isWicketkeeper: false,
      formatRating: { overallRating: 77 + i, battingRating: 28 + i, bowlingRating: 81 + i, fieldingRating: 68 },
    });
  }

  const profilesMap = new Map<string, PlayerSquadContext>(mockProfiles.map((p) => [p.id, p]));

  // Sample user dream squad (11 players from mock pool)
  const userSquad: DreamTeamPlayerSlotInput[] = mockProfiles.slice(0, 11).map((p, idx) => ({
    playerId: p.id,
    battingOrder: idx + 1,
    isCaptain: idx === 0,
    isDesignatedWicketkeeper: idx === 0,
    bowlingPriority: idx >= 7 ? 1 : null,
  }));

  const userIds = new Set(userSquad.map((s) => s.playerId));

  it('generates a match-ready AI Opponent on MEDIUM difficulty with zero player overlap', () => {
    const result = generateAIOpponentTeam(profilesMap, {
      userLineup: userSquad,
      difficulty: 'MEDIUM',
      pitchType: 'HARD',
      format: 'T20',
      seed: 1234567n,
    });

    expect(result).toBeDefined();
    expect(result.difficulty).toBe('MEDIUM');
    expect(result.name).toBe('AI World XI');
    expect(result.lineup).toHaveLength(11);

    // Verify zero overlap with user squad
    for (const slot of result.lineup) {
      expect(userIds.has(slot.playerId)).toBe(false);
    }

    // Verify authoritative match readiness
    const validation = validateDreamTeamSquad('T20', result.lineup, profilesMap, {
      requireMatchReady: true,
    });
    expect(validation.isMatchReady).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(validation.summary.playerCount).toBe(11);
    expect(validation.summary.captainCount).toBe(1);
    expect(validation.summary.keeperCount).toBe(1);
    expect(validation.summary.bowlerCount).toBeGreaterThanOrEqual(5);

    // Verify strategy rationale
    expect(result.strategyRationale).toContain('MEDIUM');
    expect(result.strategyRationale).toContain('captain');
  });

  it('adapts tactical composition to pitch condition (GREEN pitch favors pace)', () => {
    const result = generateAIOpponentTeam(profilesMap, {
      userLineup: userSquad,
      difficulty: 'HARD',
      pitchType: 'GREEN',
      format: 'T20',
    });

    expect(result.difficulty).toBe('HARD');
    expect(result.name).toBe('Apex Legends XI');
    expect(result.tacticalTraits.paceEmphasis).toBeGreaterThanOrEqual(60);
    expect(result.strategyRationale).toContain('seam');

    // Verify bowling options in lineup include recognized pacers
    const pacerSlots = result.lineup.filter((s) => {
      const p = profilesMap.get(s.playerId);
      return p?.primaryRole === 'PACE_BOWLER' || p?.bowlingStyle.includes('FAST') || p?.bowlingStyle.includes('MEDIUM');
    });
    expect(pacerSlots.length).toBeGreaterThanOrEqual(3);
  });

  it('adapts tactical composition to pitch condition (TURNING pitch favors spin)', () => {
    const result = generateAIOpponentTeam(profilesMap, {
      userLineup: userSquad,
      difficulty: 'HARD',
      pitchType: 'TURNING',
      format: 'T20',
    });

    expect(result.tacticalTraits.spinEmphasis).toBeGreaterThanOrEqual(40);
    expect(result.strategyRationale).toContain('spin');

    // Verify spin options in lineup
    const spinnerSlots = result.lineup.filter((s) => {
      const p = profilesMap.get(s.playerId);
      return p?.primaryRole === 'SPIN_BOWLER' || p?.bowlingStyle.includes('BREAK') || p?.bowlingStyle.includes('ORTHODOX');
    });
    expect(spinnerSlots.length).toBeGreaterThanOrEqual(2);
  });

  it('generates distinct strategies across all 3 difficulty tiers (EASY, MEDIUM, HARD)', () => {
    const difficulties: AIDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

    for (const diff of difficulties) {
      const result = generateAIOpponentTeam(profilesMap, {
        userLineup: userSquad,
        difficulty: diff,
        pitchType: 'FLAT',
        format: 'T20',
      });

      expect(result.difficulty).toBe(diff);
      expect(result.lineup).toHaveLength(11);
      expect(result.strategyRationale).toContain(`[${diff} AI Strategy]`);

      const validation = validateDreamTeamSquad('T20', result.lineup, profilesMap, {
        requireMatchReady: true,
      });
      expect(validation.isMatchReady).toBe(true);
    }
  });

  it('guarantees deterministic reproducibility when supplied identical random seeds', () => {
    const seed = 999888777n;

    const run1 = generateAIOpponentTeam(profilesMap, {
      userLineup: userSquad,
      difficulty: 'HARD',
      pitchType: 'DUSTY',
      format: 'T20',
      seed,
    });

    const run2 = generateAIOpponentTeam(profilesMap, {
      userLineup: userSquad,
      difficulty: 'HARD',
      pitchType: 'DUSTY',
      format: 'T20',
      seed,
    });

    expect(run1.lineup.map((s) => s.playerId)).toEqual(run2.lineup.map((s) => s.playerId));
    expect(run1.captainPlayerId).toBe(run2.captainPlayerId);
    expect(run1.wicketkeeperPlayerId).toBe(run2.wicketkeeperPlayerId);
    expect(run1.strategyRationale).toBe(run2.strategyRationale);
  });
});
