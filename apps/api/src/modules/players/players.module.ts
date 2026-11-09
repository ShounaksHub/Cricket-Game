import { Module } from '@nestjs/common';
import { PlayersController } from './players.controller.js';
import { PlayersService } from './players.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [PlayersController],
  providers: [PlayersService],
  exports: [PlayersService],
})
export class PlayersModule {}
