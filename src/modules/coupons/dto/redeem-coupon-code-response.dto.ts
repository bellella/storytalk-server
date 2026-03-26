import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponseDto } from '@/common/dtos/success-response.dto';

export class RedeemCouponCodeResponseDto extends SuccessResponseDto {
  @ApiProperty()
  userCouponId: number;

  @ApiProperty()
  couponId: number;
}

