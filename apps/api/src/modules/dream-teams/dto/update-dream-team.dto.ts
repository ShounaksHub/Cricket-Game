import type { MatchFormat, DreamTeamStatus } from '@cricket/shared-types';

export interface UpdateDreamTeamDto {
  teamName?: string;
  description?: string;
  format?: MatchFormat;
  badgeIcon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  status?: DreamTeamStatus;
}
