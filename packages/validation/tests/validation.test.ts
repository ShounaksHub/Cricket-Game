import { describe, expect, it } from 'vitest';
import {
  CreateDreamTeamSchema,
  TacticalDeliveryActionSchema,
  TossActionSchema,
} from '../src/index.js';

describe('Validation Schemas: Dream Team Creation', () => {
  it('should validate a valid 11-player lineup with a designated wicketkeeper', () => {
    const validPayload = {
      teamName: 'Subcontinent Masters',
      badgeIcon: 'SHIELD_GOLD',
      primaryColor: '#0D4A38',
      secondaryColor: '#D4AF37',
      format: 'T20',
      lineup: Array.from({ length: 11 }, (_, i) => ({
        playerId: `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
        battingOrder: i + 1,
        isCaptain: i === 0,
        isViceCaptain: i === 1,
        isDesignatedWicketkeeper: i === 6,
        bowlingPriority: i >= 6 ? i - 5 : null,
      })),
    };

    const parsed = CreateDreamTeamSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
  });

  it('should reject a team with fewer than 11 players', () => {
    const invalidPayload = {
      teamName: 'Incomplete XI',
      primaryColor: '#0D4A38',
      secondaryColor: '#D4AF37',
      format: 'T20',
      lineup: [
        {
          playerId: '00000000-0000-0000-0000-000000000001',
          battingOrder: 1,
          isCaptain: true,
          isDesignatedWicketkeeper: true,
        },
      ],
    };

    const parsed = CreateDreamTeamSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
  });

  it('should reject a team with no designated wicketkeeper', () => {
    const noKeeperPayload = {
      teamName: 'No Keeper XI',
      primaryColor: '#0D4A38',
      secondaryColor: '#D4AF37',
      format: 'T20',
      lineup: Array.from({ length: 11 }, (_, i) => ({
        playerId: `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
        battingOrder: i + 1,
        isCaptain: i === 0,
        isViceCaptain: i === 1,
        isDesignatedWicketkeeper: false, // No keeper
      })),
    };

    const parsed = CreateDreamTeamSchema.safeParse(noKeeperPayload);
    expect(parsed.success).toBe(false);
  });
});

describe('Validation Schemas: Tactical Actions & Toss', () => {
  it('should validate legal tactical delivery choices', () => {
    const action = {
      batterIntent: 'AGGRESSIVE',
      bowlerLine: 'OUTSIDE_OFF',
      bowlerLength: 'GOOD_LENGTH',
      bowlerVariation: 'STOCK',
      fieldPreset: 'ATTACKING',
    };

    const parsed = TacticalDeliveryActionSchema.safeParse(action);
    expect(parsed.success).toBe(true);
  });

  it('should validate coin-toss calls and decisions', () => {
    const toss = {
      calledHeadsOrTails: 'HEADS',
      decision: 'BAT',
    };

    const parsed = TossActionSchema.safeParse(toss);
    expect(parsed.success).toBe(true);
  });
});
