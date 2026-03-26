import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponseDto } from '@/common/dtos/success-response.dto';

export class RedeemCoinCouponResponseDto extends SuccessResponseDto {
  @ApiProperty()
  couponId: number;

  @ApiProperty()
  couponCode: string;

  @ApiProperty()
  coinRewarded: number;

  @ApiProperty()
  coinBalanceAfter: number;
}

