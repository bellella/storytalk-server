import { IsInt, Min } from 'class-validator';

export class BuyPlayEpisodeDto {
  @IsInt()
  @Min(1)
  productId: number;
}

export class BuyPlayEpisodeResponseDto {
  purchaseId: number;
  productId: number;
  coinSpent: number;
  coinBalanceAfter: number;
}
