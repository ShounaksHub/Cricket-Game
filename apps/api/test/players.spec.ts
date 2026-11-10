import { describe, expect, it, beforeEach } from 'vitest';
import { PlayersService } from '../src/modules/players/players.service.js';
import { PlayersController } from '../src/modules/players/players.controller.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Players Module (API)', () => {
  let service: PlayersService;
  let controller: PlayersController;

  beforeEach(() => {
    // Provide a lightweight mock for PrismaService
    const mockPrisma = {
      player: {
        findMany: () => Promise.resolve([]),
        findUnique: () => Promise.resolve(null),
        count: () => Promise.resolve(0),
      },
      checkHealth: () => Promise.resolve({ status: 'up' }),
    } as unknown as PrismaService;

    service = new PlayersService(mockPrisma);
    controller = new PlayersController(service);
  });

  describe('GET /players (Search and Filtering)', () => {
    it('returns all verified players with pagination metadata', async () => {
      const result = await controller.searchPlayers({ limit: 10, offset: 0 });
      expect(result.items.length).toBe(10);
      expect(result.total).toBeGreaterThanOrEqual(15);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it('searches by player name with sub-50ms execution latency', async () => {
      const start = performance.now();
      const result = await controller.searchPlayers({ q: 'Kohli' });
      const durationMs = performance.now() - start;

      expect(durationMs).toBeLessThan(50); // Performance DoD requirement: sub-50ms search
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(result.items[0].fullName).toContain('Kohli');
    });

    it('filters players by primary role (PACE_BOWLER)', async () => {
      const result = await controller.searchPlayers({ role: 'PACE_BOWLER' });
      expect(result.items.length).toBeGreaterThanOrEqual(2);
      for (const p of result.items) {
        expect(p.primaryRole).toBe('PACE_BOWLER');
      }
    });

    it('filters players by historical era (INTERWAR_1919_1939)', async () => {
      const result = await controller.searchPlayers({ era: 'INTERWAR_1919_1939' });
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      const names = result.items.map((p) => p.fullName);
      expect(names.some((n) => n.includes('Bradman'))).toBe(true);
    });

    it('filters players by batting hand (LEFT_HAND)', async () => {
      const result = await controller.searchPlayers({ battingHand: 'LEFT_HAND' });
      expect(result.items.length).toBeGreaterThanOrEqual(5);
      for (const p of result.items) {
        expect(p.battingHand).toBe('LEFT_HAND');
      }
    });

    it('filters players by bowling style (RIGHT_ARM_FAST)', async () => {
      const result = await controller.searchPlayers({ bowlingStyle: 'RIGHT_ARM_FAST' });
      expect(result.items.length).toBeGreaterThanOrEqual(3);
      for (const p of result.items) {
        expect(p.bowlingStyle).toBe('RIGHT_ARM_FAST');
      }
    });

    it('filters players by active/retired career status', async () => {
      const activeResult = await controller.searchPlayers({ isActive: true });
      expect(activeResult.items.length).toBeGreaterThanOrEqual(5);
      for (const p of activeResult.items) {
        expect(p.isActive).toBe(true);
      }

      const retiredResult = await controller.searchPlayers({ isActive: false });
      expect(retiredResult.items.length).toBeGreaterThanOrEqual(5);
      for (const p of retiredResult.items) {
        expect(p.isActive).toBe(false);
      }
    });

    it('filters by nationality (India)', async () => {
      const result = await controller.searchPlayers({ nationality: 'India' });
      expect(result.items.length).toBeGreaterThanOrEqual(2);
      for (const p of result.items) {
        expect(p.primaryNationality).toBe('India');
      }
    });

    it('sorts players by rating descending', async () => {
      const result = await controller.searchPlayers({
        format: 'TEST_RED_BALL',
        sort: 'rating',
        order: 'desc',
        limit: 5,
      });

      expect(result.items.length).toBe(5);
      const firstRating = result.items[0].ratings.TEST_RED_BALL?.overallRating ?? 0;
      const secondRating = result.items[1].ratings.TEST_RED_BALL?.overallRating ?? 0;
      expect(firstRating).toBeGreaterThanOrEqual(secondRating);
    });
  });

  describe('GET /players/:id (Profile & Details)', () => {
    it('retrieves single player by ID with full identity and attributes', async () => {
      const list = await controller.searchPlayers({ limit: 1 });
      const id = list.items[0].id;

      const player = await controller.getPlayerById(id);
      expect(player.id).toBe(id);
      expect(player.attributes.ratingVersion).toBe('rate-1.0.0');
      expect(player.provenance).toBeDefined();
    });

    it('throws NotFoundException for non-existent player ID', async () => {
      await expect(
        controller.getPlayerById('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('was not found');
    });
  });

  describe('GET /players/:id/stats and /ratings', () => {
    it('retrieves format-segregated statistics', async () => {
      const list = await controller.searchPlayers({ q: 'Bradman' });
      const bradmanId = list.items[0].id;

      const stats = await controller.getPlayerStats(bradmanId);
      expect(stats.TEST_RED_BALL).toBeDefined();
      expect(stats.TEST_RED_BALL?.battingAverage).toBe(99.94);
      // Format segregation guarantee: Bradman has no T20 stats
      expect(stats.T20).toBeUndefined();
    });

    it('retrieves format ratings and explainable breakdown inspector data', async () => {
      const list = await controller.searchPlayers({ q: 'Kohli' });
      const kohliId = list.items[0].id;

      const { ratings, attributes } = await controller.getPlayerRatings(kohliId);
      expect(ratings.ODI).toBeDefined();
      expect(ratings.ODI?.explainability).toBeDefined();
      expect(ratings.ODI?.explainability.rawPrimaryMetric).toContain('Avg: 58.18');
      expect(ratings.ODI?.confidenceTier).toBe('MEASURED');
      expect(attributes.timing).toBeGreaterThanOrEqual(80);
    });
  });
});
