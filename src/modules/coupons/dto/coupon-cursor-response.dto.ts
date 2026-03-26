import { CursorResponseDto } from '@/common/dtos/cursor-response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { AvailableCouponItemDto, MyCouponItemDto } from './my-coupon.dto';

export class MyCouponsResponseDto implements CursorResponseDto<MyCouponItemDto> {
  @ApiProperty({ type: [MyCouponItemDto] })
  items: MyCouponItemDto[];

  @ApiProperty({ type: Number, nullable: true })
  nextCursor?: number | null;
}

export class AvailableCouponsResponseDto
  implements CursorResponseDto<AvailableCouponItemDto>
{
  @ApiProperty({ type: [AvailableCouponItemDto] })
  items: AvailableCouponItemDto[];

  @ApiProperty({ type: Number, nullable: true })
  nextCursor?: number | null;
}

