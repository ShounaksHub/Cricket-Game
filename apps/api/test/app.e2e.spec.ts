import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('API End-to-End & Integration Suite (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/ping -> should return pong with status 200', async () => {
    const res = await request(app.getHttpServer()).get('/health/ping').expect(200);
    expect(res.body.status).toBe('pong');
    expect(typeof res.body.timestamp).toBe('number');
  });

  it('GET /health -> should return complete healthcheck payload with status 200', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('cricket-game-api');
    expect(res.body.version).toBe('1.0.0');
    expect(res.body.database).toBeDefined();
    expect(res.body.memory).toBeDefined();
    expect(res.body.memory.heapUsedMb).toBeGreaterThan(0);
  });
});
