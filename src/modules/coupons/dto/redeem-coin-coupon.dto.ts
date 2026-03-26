import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RedeemCoinCouponDto {
  @ApiProperty({ description: '쿠폰 코드' })
  @IsString()
  @MinLength(1)
  code: string;
}

