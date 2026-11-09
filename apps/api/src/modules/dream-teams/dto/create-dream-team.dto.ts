import type { MatchFormat, DreamTeamStatus } from '@cricket/shared-types';
import type { DreamTeamPlayerSlotDto } from './squad-player-slot.dto.js';

export interface CreateDreamTeamDto {
  teamName: string;
  description?: string;
  format: MatchFormat;
  badgeIcon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  status?: DreamTeamStatus;
  lineup?: DreamTeamPlayerSlotDto[];
}
