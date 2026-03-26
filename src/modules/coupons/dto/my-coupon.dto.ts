import {
  CouponBenefitType,
  CouponStatus,
  CouponTargetType,
  UserCouponStatus,
} from '@/generated/prisma/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MyCouponItemDto {
  userCouponId: number;

  couponId: number;

  @ApiPropertyOptional({ description: '쿠폰 코드 (해당 유저 할당된 경우)' })
  code?: string | null;

  name?: string | null;
  description?: string | null;

  @ApiPropertyOptional({ enum: CouponStatus, enumName: 'CouponStatus' })
  couponStatus?: CouponStatus;

  @ApiProperty({ enum: CouponBenefitType, enumName: 'CouponBenefitType' })
  benefitType: CouponBenefitType;

  @ApiProperty({ enum: CouponTargetType, enumName: 'CouponTargetType' })
  targetType: CouponTargetType;

  targetId?: number | null;

  @ApiProperty({ enum: UserCouponStatus, enumName: 'UserCouponStatus' })
  status: UserCouponStatus;

  // validFrom?: string | null;

  // validUntil?: string | null;

  @ApiPropertyOptional()
  issuedAt?: string;

  @ApiPropertyOptional()
  usedAt?: string | null;

  @ApiPropertyOptional()
  expiredAt?: string | null;
}

export class AvailableCouponItemDto extends MyCouponItemDto {
  @ApiPropertyOptional({ description: '상품 가격 기준 예상 할인액(0 이상)' })
  discountPreviewAmount?: number;
}
