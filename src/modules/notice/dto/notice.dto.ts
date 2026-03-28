import { NoticeType } from '@/generated/prisma/enums';
import { CursorResponseDto } from '@/common/dtos/cursor-response.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NoticeItemDto {
  id: number;
  title: string;
  content: string;

  @ApiProperty({ enum: NoticeType, enumName: 'NoticeType' })
  type: NoticeType;

  isPopup: boolean;
  version: number;

  @ApiPropertyOptional()
  startsAt: string | null;

  @ApiPropertyOptional()
  endsAt: string | null;

  createdAt: string;
  updatedAt: string;
}

export class NoticeListResponseDto implements CursorResponseDto<NoticeItemDto> {
  @ApiProperty({ type: [NoticeItemDto] })
  items: NoticeItemDto[];

  @ApiProperty({ type: Number, nullable: true })
  nextCursor?: number | null;
}

export class NoticePopupResponseDto {
  @ApiPropertyOptional({
    type: NoticeItemDto,
    nullable: true,
    description: '노출 기간·활성 조건에 맞는 최신 팝업 공지 (없으면 null)',
  })
  notice: NoticeItemDto | null;
}
