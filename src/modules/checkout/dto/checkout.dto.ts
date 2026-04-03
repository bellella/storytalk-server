import { IsInt, IsOptional, Min } from 'class-validator';

export class BuyPlayEpisodeDto {
  @IsInt()
  @Min(1)
  productId: number;

  /** GET /coupons/available 등에서 받은 userCouponId */
  @IsOptional()
  @IsInt()
  @Min(1)
  userCouponId?: number;
}

export class BuyPlayEpisodeResponseDto {
  purchaseId: number;
  playEpisodeId: number;
  productId: number;
  coinSpent: number;
  coinBalanceAfter: number;
}
