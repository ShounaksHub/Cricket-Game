import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@cricket/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to PostgreSQL database successfully.');
    } catch (error) {
      this.logger.warn(`Could not connect to PostgreSQL on startup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database.');
  }

  async checkHealth(): Promise<{ status: 'up' | 'down'; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      await this.$queryRaw`SELECT 1`;
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (err) {
      return { status: 'down', error: err instanceof Error ? err.message : String(err) };
    }
  }
}
