import { Module } from '@nestjs/common';
import { MatchesService } from './matches.service.js';
import { MatchesController } from './matches.controller.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { PlayersModule } from '../players/players.module.js';
import { DreamTeamsModule } from '../dream-teams/dream-teams.module.js';

@Module({
  imports: [PrismaModule, PlayersModule, DreamTeamsModule],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
