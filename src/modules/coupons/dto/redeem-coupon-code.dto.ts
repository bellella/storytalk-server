import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RedeemCouponCodeDto {
  @ApiProperty({ description: '유저가 입력하는 쿠폰 코드' })
  @IsString()
  @MinLength(1)
  code: string;
}

