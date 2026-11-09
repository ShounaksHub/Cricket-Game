import { Module } from '@nestjs/common';
import { DreamTeamsController } from './dream-teams.controller.js';
import { DreamTeamsService } from './dream-teams.service.js';
import { PlayersModule } from '../players/players.module.js';

@Module({
  imports: [PlayersModule],
  controllers: [DreamTeamsController],
  providers: [DreamTeamsService],
  exports: [DreamTeamsService],
})
export class DreamTeamsModule {}
