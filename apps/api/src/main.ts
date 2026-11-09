import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
    credentials: true,
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`Cricket Game API is running on http://localhost:${port}`);
  logger.log(`Health endpoint: http://localhost:${port}/health`);
}

bootstrap().catch((err) => {
  console.error('Fatal error bootstrapping API:', err);
  process.exit(1);
});
