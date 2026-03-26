import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class BuyPlayEpisodeDto {
  @IsInt()
  @Min(1)
  productId: number;

  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class BuyPlayEpisodeResponseDto {
  purchaseId: number;
  playEpisodeId: number;
  productId: number;
  coinSpent: number;
  coinBalanceAfter: number;
}
