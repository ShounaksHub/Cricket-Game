import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth() {
    const dbHealth = this.prisma ? await this.prisma.checkHealth() : { status: 'down', error: 'PrismaService uninitialized' };
    return {
      status: 'ok',
      service: 'cricket-game-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: dbHealth,
      memory: {
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    };
  }

  @Get('ping')
  ping() {
    return { status: 'pong', timestamp: Date.now() };
  }
}
