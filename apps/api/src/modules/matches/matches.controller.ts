import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Sse,
  Headers,
} from '@nestjs/common';
import { MatchesService } from './matches.service.js';
import { SimulateMatchDto, StepDeliveryDto } from './dto/simulate-match.dto.js';
import type { Observable } from 'rxjs';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  /**
   * Retrieves verified stadiums list with boundary radius and altitude dimensions.
   */
  @Get('stadiums')
  getStadiums() {
    return this.matchesService.getVerifiedStadiums();
  }

  /**
   * Simulates a full cricket match between two dream teams or against AI opponent.
   */
  @Post('simulate')
  async simulateMatch(
    @Body() dto: SimulateMatchDto,
    @Headers('x-user-id') userId?: string
  ) {
    return this.matchesService.simulateMatch(dto, userId);
  }

  /**
   * Interactive delivery stepping for manual/ball-by-ball match play.
   */
  @Post('step')
  async stepDelivery(@Body() dto: StepDeliveryDto) {
    return this.matchesService.stepDelivery(dto);
  }

  /**
   * Retrieves a completed match by ID with reconciled scorecards and state.
   */
  @Get(':id')
  async getMatchById(@Param('id') id: string) {
    return this.matchesService.getMatchById(id);
  }

  /**
   * Verifies bit-exact replay determinism for a stored match.
   */
  @Get(':id/verify')
  async verifyMatch(@Param('id') id: string) {
    return this.matchesService.verifyMatch(id);
  }

  /**
   * Streams match deliveries ball-by-ball via Server-Sent Events (SSE).
   */
  @Sse(':id/stream')
  streamMatch(
    @Param('id') id: string,
    @Query('speed') speed?: string
  ): Observable<MessageEvent> {
    const speedMs = speed === 'fast' ? 30 : speed === 'instant' ? 1 : 100;
    return this.matchesService.streamMatchDeliveries(id, speedMs);
  }
}
