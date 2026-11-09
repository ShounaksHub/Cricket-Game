import { describe, expect, it, vi } from 'vitest';
import { HealthController } from '../src/health/health.controller.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';

describe('HealthController', () => {
  it('should return pong on ping', () => {
    const mockPrisma = {} as PrismaService;
    const controller = new HealthController(mockPrisma);
    const result = controller.ping();
    expect(result.status).toBe('pong');
    expect(typeof result.timestamp).toBe('number');
  });

  it('should return health status payload', async () => {
    const mockPrisma = {
      checkHealth: vi.fn().mockResolvedValue({ status: 'up', latencyMs: 2 }),
    } as unknown as PrismaService;

    const controller = new HealthController(mockPrisma);
    const health = await controller.getHealth();

    expect(health.status).toBe('ok');
    expect(health.service).toBe('cricket-game-api');
    expect(health.version).toBe('1.0.0');
    expect(health.database.status).toBe('up');
    expect((health.database as { latencyMs?: number }).latencyMs).toBe(2);
  });
});
