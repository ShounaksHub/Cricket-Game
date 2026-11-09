export interface DreamTeamPlayerSlotDto {
  playerId: string;
  battingOrder: number;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  isDesignatedWicketkeeper?: boolean;
  bowlingPriority?: number | null;
}
