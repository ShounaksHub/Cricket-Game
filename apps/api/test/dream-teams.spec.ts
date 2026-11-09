import { describe, expect, it, beforeEach } from 'vitest';
import { DreamTeamsService, DEFAULT_USER_ID } from '../src/modules/dream-teams/dream-teams.service.js';
import { DreamTeamsController } from '../src/modules/dream-teams/dream-teams.controller.js';
import { PlayersService } from '../src/modules/players/players.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import type { PlayerProfile } from '@cricket/shared-types';

describe('Dream Teams Module (API)', () => {
  let dreamTeamsService: DreamTeamsService;
  let dreamTeamsController: DreamTeamsController;
  let playersService: PlayersService;
  let samplePlayers: PlayerProfile[];

  beforeEach(async () => {
    const mockPrisma = {
      dreamTeam: {
        findMany: () => Promise.resolve([]),
        findUnique: () => Promise.resolve(null),
      },
    } as unknown as PrismaService;

    playersService = new PlayersService(mockPrisma);
    dreamTeamsService = new DreamTeamsService(mockPrisma, playersService);
    dreamTeamsController = new DreamTeamsController(dreamTeamsService);

    const result = await playersService.searchPlayers({ limit: 15 });
    samplePlayers = result.items;
  });

  describe('POST /dream-teams (Create Team)', () => {
    it('creates a draft dream team with zero or partial lineup', async () => {
      const response = await dreamTeamsController.createTeam(DEFAULT_USER_ID, {
        teamName: 'Mumbai Mavericks',
        description: 'T20 experimental lineup',
        format: 'T20',
        badgeIcon: 'SHIELD_CLASSIC',
        primaryColor: '#004BA0',
        secondaryColor: '#D4AF37',
        status: 'DRAFT',
        lineup: [],
      });

      expect(response.id).toBeDefined();
      expect(response.teamName).toBe('Mumbai Mavericks');
      expect(response.status).toBe('DRAFT');
      expect(response.isValid).toBe(false);
      expect(response.players.length).toBe(0);
      expect(response.formatCode).toBe('T20');
    });

    it('creates a MATCH_READY team when full 11-player compliant lineup is provided', async () => {
      // Build 11-player lineup using sample players
      const lineup = samplePlayers.slice(0, 11).map((p, idx) => ({
        playerId: p.id,
        battingOrder: idx + 1,
        isCaptain: idx === 0,
        isViceCaptain: idx === 1,
        isDesignatedWicketkeeper: idx === 2, // designate one keeper
      }));

      const response = await dreamTeamsController.createTeam(DEFAULT_USER_ID, {
        teamName: 'Thunderbolts XI',
        format: 'T20',
        primaryColor: '#123456',
        secondaryColor: '#654321',
        status: 'MATCH_READY',
        lineup,
      });

      expect(response.id).toBeDefined();
      expect(response.status).toBe('MATCH_READY');
      expect(response.players.length).toBe(11);
      expect(response.overallStrengthRating).toBeGreaterThan(0);
      expect(response.battingStrengthRating).toBeGreaterThan(0);
      expect(response.bowlingStrengthRating).toBeGreaterThan(0);
      expect(response.validation).toBeDefined();
    });

    it('rejects MATCH_READY creation if lineup contains fewer than 11 players', async () => {
      const partialLineup = samplePlayers.slice(0, 5).map((p, idx) => ({
        playerId: p.id,
        battingOrder: idx + 1,
        isCaptain: idx === 0,
        isViceCaptain: false,
        isDesignatedWicketkeeper: idx === 1,
      }));

      await expect(
        dreamTeamsController.createTeam(DEFAULT_USER_ID, {
          teamName: 'Short Squad',
          format: 'T20',
          primaryColor: '#111111',
          secondaryColor: '#222222',
          status: 'MATCH_READY',
          lineup: partialLineup,
        })
      ).rejects.toThrow('Invalid dream team data');
    });
  });

  describe('GET /dream-teams & GET /dream-teams/:id', () => {
    it('lists dream teams belonging to the requesting user and isolates other users', async () => {
      const userA = '11111111-1111-1111-1111-111111111111';
      const userB = '22222222-2222-2222-2222-222222222222';

      await dreamTeamsController.createTeam(userA, {
        teamName: 'Team Alpha',
        format: 'T20',
        primaryColor: '#111111',
        secondaryColor: '#222222',
        status: 'DRAFT',
      });

      await dreamTeamsController.createTeam(userB, {
        teamName: 'Team Beta',
        format: 'ODI',
        primaryColor: '#333333',
        secondaryColor: '#444444',
        status: 'DRAFT',
      });

      const listA = await dreamTeamsController.listTeams(userA);
      expect(listA.length).toBe(1);
      expect(listA[0].teamName).toBe('Team Alpha');

      const listB = await dreamTeamsController.listTeams(userB);
      expect(listB.length).toBe(1);
      expect(listB[0].teamName).toBe('Team Beta');
    });

    it('retrieves team by ID with enriched player profiles and format ratings', async () => {
      const team = await dreamTeamsController.createTeam(DEFAULT_USER_ID, {
        teamName: 'Detailed XI',
        format: 'T20',
        primaryColor: '#000000',
        secondaryColor: '#FFFFFF',
        status: 'DRAFT',
        lineup: [
          {
            playerId: samplePlayers[0].id,
            battingOrder: 1,
            isCaptain: true,
            isViceCaptain: false,
            isDesignatedWicketkeeper: false,
          },
        ],
      });

      const fetched = await dreamTeamsController.getTeamById(DEFAULT_USER_ID, team.id);
      expect(fetched.id).toBe(team.id);
      expect(fetched.players.length).toBe(1);
      expect(fetched.players[0].player.fullName).toBe(samplePlayers[0].fullName);
      expect(fetched.players[0].player.rating.overall).toBeGreaterThanOrEqual(1);
    });

    it('throws ForbiddenException (403) when accessing team belonging to another user', async () => {
      const owner = '11111111-1111-1111-1111-111111111111';
      const attacker = '99999999-9999-9999-9999-999999999999';

      const team = await dreamTeamsController.createTeam(owner, {
        teamName: 'Private Squad',
        format: 'T20',
        primaryColor: '#121212',
        secondaryColor: '#343434',
        status: 'DRAFT',
      });

      await expect(
        dreamTeamsController.getTeamById(attacker, team.id)
      ).rejects.toThrow('You do not have permission');
    });

    it('throws NotFoundException (404) for non-existent team ID', async () => {
      await expect(
        dreamTeamsController.getTeamById(DEFAULT_USER_ID, '00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('was not found');
    });
  });

  describe('PATCH /dream-teams/:id & DELETE /dream-teams/:id', () => {
    it('updates team metadata (name, badge, colors, description)', async () => {
      const team = await dreamTeamsController.createTeam(DEFAULT_USER_ID, {
        teamName: 'Old Name',
        format: 'T20',
        primaryColor: '#111111',
        secondaryColor: '#222222',
        status: 'DRAFT',
      });

      const updated = await dreamTeamsController.updateTeam(DEFAULT_USER_ID, team.id, {
        teamName: 'New Glorious Name',
        description: 'Updated description',
        primaryColor: '#AABBCC',
      });

      expect(updated.teamName).toBe('New Glorious Name');
      expect(updated.description).toBe('Updated description');
      expect(updated.primaryColor).toBe('#AABBCC');
    });

    it('rejects marking team as MATCH_READY if lineup is incomplete', async () => {
      const team = await dreamTeamsController.createTeam(DEFAULT_USER_ID, {
        teamName: 'Draft Squad',
        format: 'T20',
        primaryColor: '#111111',
        secondaryColor: '#222222',
        status: 'DRAFT',
      });

      await expect(
        dreamTeamsController.updateTeam(DEFAULT_USER_ID, team.id, {
          status: 'MATCH_READY',
        })
      ).rejects.toThrow('Cannot mark team as MATCH_READY');
    });

    it('deletes dream team', async () => {
      const team = await dreamTeamsController.createTeam(DEFAULT_USER_ID, {
        teamName: 'To Be Deleted',
        format: 'T20',
        primaryColor: '#111111',
        secondaryColor: '#222222',
        status: 'DRAFT',
      });

      const delRes = await dreamTeamsController.deleteTeam(DEFAULT_USER_ID, team.id);
      expect(delRes.success).toBe(true);
      expect(delRes.deletedId).toBe(team.id);

      await expect(
        dreamTeamsController.getTeamById(DEFAULT_USER_ID, team.id)
      ).rejects.toThrow('was not found');
    });
  });

  describe('POST /dream-teams/:id/duplicate', () => {
    it('duplicates team and lineup with independent IDs and (Copy) suffix', async () => {
      const team = await dreamTeamsController.createTeam(DEFAULT_USER_ID, {
        teamName: 'Original Warriors',
        format: 'T20',
        primaryColor: '#112233',
        secondaryColor: '#445566',
        status: 'DRAFT',
        lineup: [
          {
            playerId: samplePlayers[0].id,
            battingOrder: 1,
            isCaptain: true,
          },
          {
            playerId: samplePlayers[1].id,
            battingOrder: 2,
            isCaptain: false,
          },
        ],
      });

      const copy = await dreamTeamsController.duplicateTeam(DEFAULT_USER_ID, team.id);
      expect(copy.id).not.toBe(team.id);
      expect(copy.teamName).toBe('Original Warriors (Copy)');
      expect(copy.players.length).toBe(2);
      expect(copy.players[0].id).not.toBe(team.players[0].id);
      expect(copy.players[0].playerId).toBe(samplePlayers[0].id);
      expect(copy.players[0].isCaptain).toBe(true);
      expect(copy.status).toBe('DRAFT');
    });
  });

  describe('Lineup Management (Players, Slots & Reordering)', () => {
    it('adds and updates player slots in team lineup', async () => {
      const team = await dreamTeamsController.createTeam(DEFAULT_USER_ID, {
        teamName: 'Builder Team',
        format: 'T20',
        primaryColor: '#111111',
        secondaryColor: '#222222',
        status: 'DRAFT',
      });

      // Add player 1 at position 1
      const res1 = await dreamTeamsController.addOrUpdatePlayerSlot(DEFAULT_USER_ID, team.id, {
        playerId: samplePlayers[0].id,
        battingOrder: 1,
        isCaptain: true,
        isViceCaptain: false,
        isDesignatedWicketkeeper: false,
      });

      expect(res1.players.length).toBe(1);
      expect(res1.players[0].playerId).toBe(samplePlayers[0].id);
      expect(res1.players[0].isCaptain).toBe(true);

      // Add player 2 at position 2
      const res2 = await dreamTeamsController.addOrUpdatePlayerSlot(DEFAULT_USER_ID, team.id, {
        playerId: samplePlayers[1].id,
        battingOrder: 2,
        isCaptain: false,
        isViceCaptain: true,
        isDesignatedWicketkeeper: true,
      });

      expect(res2.players.length).toBe(2);
      expect(res2.players[1].playerId).toBe(samplePlayers[1].id);
      expect(res2.players[1].isDesignatedWicketkeeper).toBe(true);
    });

    it('removes player slot and downgrades status to DRAFT if < 11', async () => {
      const team = await dreamTeamsController.createTeam(DEFAULT_USER_ID, {
        teamName: 'Removal Test',
        format: 'T20',
        primaryColor: '#111111',
        secondaryColor: '#222222',
        status: 'DRAFT',
        lineup: [
          {
            playerId: samplePlayers[0].id,
            battingOrder: 1,
          },
        ],
      });

      const res = await dreamTeamsController.removePlayerSlot(
        DEFAULT_USER_ID,
        team.id,
        samplePlayers[0].id
      );

      expect(res.players.length).toBe(0);
      expect(res.status).toBe('DRAFT');
      expect(res.isValid).toBe(false);
    });

    it('atomically reorders batting order positions', async () => {
      const team = await dreamTeamsController.createTeam(DEFAULT_USER_ID, {
        teamName: 'Reorder Test',
        format: 'T20',
        primaryColor: '#111111',
        secondaryColor: '#222222',
        status: 'DRAFT',
        lineup: [
          { playerId: samplePlayers[0].id, battingOrder: 1 },
          { playerId: samplePlayers[1].id, battingOrder: 2 },
          { playerId: samplePlayers[2].id, battingOrder: 3 },
        ],
      });

      // Swap positions 1 and 2
      const reordered = await dreamTeamsController.reorderBattingOrder(
        DEFAULT_USER_ID,
        team.id,
        {
          orders: [
            { playerId: samplePlayers[0].id, battingOrder: 2 },
            { playerId: samplePlayers[1].id, battingOrder: 1 },
            { playerId: samplePlayers[2].id, battingOrder: 3 },
          ],
        }
      );

      expect(reordered.players[0].playerId).toBe(samplePlayers[1].id);
      expect(reordered.players[0].battingOrder).toBe(1);
      expect(reordered.players[1].playerId).toBe(samplePlayers[0].id);
      expect(reordered.players[1].battingOrder).toBe(2);
    });

    it('rejects reordering when player does not belong to team', async () => {
      const team = await dreamTeamsController.createTeam(DEFAULT_USER_ID, {
        teamName: 'Invalid Reorder',
        format: 'T20',
        primaryColor: '#111111',
        secondaryColor: '#222222',
        status: 'DRAFT',
        lineup: [{ playerId: samplePlayers[0].id, battingOrder: 1 }],
      });

      await expect(
        dreamTeamsController.reorderBattingOrder(DEFAULT_USER_ID, team.id, {
          orders: [{ playerId: samplePlayers[1].id, battingOrder: 1 }],
        })
      ).rejects.toThrow('does not belong to this dream team');
    });
  });

  describe('POST /dream-teams/:id/validate & GET /dream-teams/:id/analytics', () => {
    it('returns structured validation result with errors/warnings', async () => {
      const team = await dreamTeamsController.createTeam(DEFAULT_USER_ID, {
        teamName: 'Validation Check',
        format: 'T20',
        primaryColor: '#111111',
        secondaryColor: '#222222',
        status: 'DRAFT',
        lineup: [{ playerId: samplePlayers[0].id, battingOrder: 1 }],
      });

      const validation = await dreamTeamsController.validateTeam(DEFAULT_USER_ID, team.id);
      expect(validation).toBeDefined();
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
      expect(validation.summary).toBeDefined();
      expect(validation.summary.bowlerCount).toBeDefined();
      expect(validation.isMatchReady).toBe(false);
    });

    it('computes 8-dimension analytics profile for squad', async () => {
      const team = await dreamTeamsController.createTeam(DEFAULT_USER_ID, {
        teamName: 'Analytics Check',
        format: 'T20',
        primaryColor: '#111111',
        secondaryColor: '#222222',
        status: 'DRAFT',
        lineup: samplePlayers.slice(0, 11).map((p, idx) => ({
          playerId: p.id,
          battingOrder: idx + 1,
          isCaptain: idx === 0,
          isDesignatedWicketkeeper: idx === 2,
        })),
      });

      const analytics = await dreamTeamsController.getSquadAnalytics(DEFAULT_USER_ID, team.id);
      expect(analytics).toBeDefined();
      expect(analytics.overallBalance).toBeGreaterThan(0);
      expect(analytics.dimensions.battingStrength.score).toBeGreaterThan(0);
      expect(analytics.dimensions.paceThreat.score).toBeGreaterThan(0);
      expect(analytics.dimensions.spinThreat.score).toBeGreaterThan(0);
      expect(analytics.dimensions.bowlingDepth.score).toBeGreaterThan(0);
      expect(analytics.dimensions.fieldingStrength.score).toBeGreaterThan(0);
      expect(analytics.dimensions.allRounderBalance.score).toBeGreaterThan(0);
      expect(analytics.dimensions.lowerOrderBatting.score).toBeGreaterThan(0);
      expect(analytics.dimensions.overallSquadBalance.score).toBeGreaterThan(0);
      expect(analytics.summary).toBeDefined();
    });
  });
});
