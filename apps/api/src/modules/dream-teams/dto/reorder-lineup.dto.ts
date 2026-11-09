export interface ReorderBattingOrderItemDto {
  playerId: string;
  battingOrder: number;
}

export interface ReorderBattingOrderDto {
  orders: ReorderBattingOrderItemDto[];
}
