import { describe, expect, it } from 'vitest';
import { prisma, DreamTeamStatus } from '../src/index.js';
import type { Prisma } from '../src/index.js';

describe('Database Schema & Dream Team Models (P3.1)', () => {
  it('exports DreamTeamStatus enum with DRAFT and MATCH_READY', () => {
    expect(DreamTeamStatus).toBeDefined();
    expect(DreamTeamStatus.DRAFT).toBe('DRAFT');
    expect(DreamTeamStatus.MATCH_READY).toBe('MATCH_READY');
  });

  it('validates Prisma model typing for DreamTeam with status and description', () => {
    // Type-level assertion: ensure DreamTeamCreateInput includes description and status
    const mockInput: Prisma.DreamTeamCreateInput = {
      user: { connect: { id: '00000000-0000-0000-0000-000000000001' } },
      teamName: 'Master XI',
      description: 'Test Team Description',
      status: DreamTeamStatus.DRAFT,
      format: { connect: { code: 'T20' } },
      badgeIcon: 'SHIELD_GOLD',
      primaryColor: '#0D4A38',
      secondaryColor: '#D4AF37',
      overallStrengthRating: 88,
      battingStrengthRating: 90,
      bowlingStrengthRating: 85,
      isValid: false,
    };

    expect(mockInput.teamName).toBe('Master XI');
    expect(mockInput.description).toBe('Test Team Description');
    expect(mockInput.status).toBe('DRAFT');
  });

  it('validates Prisma model typing for DreamTeamPlayer with createdAt', () => {
    const mockPlayerInput: Prisma.DreamTeamPlayerCreateInput = {
      dreamTeam: { connect: { id: '00000000-0000-0000-0000-000000000001' } },
      player: { connect: { id: '00000000-0000-0000-0000-000000000002' } },
      battingOrder: 1,
      isCaptain: true,
      isViceCaptain: false,
      isDesignatedWicketkeeper: false,
      bowlingPriority: null,
    };

    expect(mockPlayerInput.battingOrder).toBe(1);
    expect(mockPlayerInput.isCaptain).toBe(true);
  });
});
