import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { PlayersModule } from './modules/players/players.module.js';
import { DreamTeamsModule } from './modules/dream-teams/dream-teams.module.js';
import { MatchesModule } from './modules/matches/matches.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    HealthModule,
    PlayersModule,
    DreamTeamsModule,
    MatchesModule,
  ],
})
export class AppModule {}
